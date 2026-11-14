// Desain PDF laporan bulanan MONETRA — versi Siang (kertas putih, hemat tinta) dan Malam (hitam + emerald).
// Hanya menggambar; semua angka dihitung di App.tsx. Memakai font bawaan PDF (Helvetica) agar file tetap kecil.

export type ReportTheme = 'light' | 'dark'

export type ReportInput = {
  theme: ReportTheme
  lang: 'id' | 'en'
  monthLabel: string
  income: number
  expenses: number
  balance: number
  savingsRate: number
  prevIncome: number
  prevExpenses: number
  categories: { name: string; value: number; color: string }[]
  months: { month: string; income: number; expenses: number }[]
  budgets: { category: string; limit: number; spent: number }[]
  topExpenses: { date: string; name: string; category: string; amount: number }[]
  goals: { name: string; saved: number; target: number }[]
  txCount: number
  fmt: (n: number) => string
  fileName: string
}

const PALETTE = {
  dark: {
    paper: '#060a08', card: '#0d1511', line: '#1f2d25', text: '#e8f0eb', soft: '#b4c2b9', muted: '#7f9187',
    accent: '#34d399', income: '#34d399', expense: '#d6a45a', danger: '#e07a6a',
    band: '#0b1d15', bandText: '#f1f7f3', bandSub: '#6ee7b7', bandRing: '#16352a', track: '#17231d',
  },
  light: {
    paper: '#ffffff', card: '#f4f8f6', line: '#dbe6e0', text: '#0e1a14', soft: '#3f4f46', muted: '#66766c',
    accent: '#059669', income: '#10b981', expense: '#c98a1b', danger: '#c0564a',
    band: '#065f46', bandText: '#ffffff', bandSub: '#a7f3d0', bandRing: '#0b7a59', track: '#e3ece7',
  },
} as const

const L = 16, R = 194, W = R - L, BOTTOM = 280
const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
// Font standar PDF hanya mengenal Latin-1: emoji & simbol lain dibuang agar tidak berubah jadi karakter rusak.
const clean = (s: string) =>
  String(s ?? '').replace(/\u00A0/g, ' ').replace(/[^\u0020-\u007E\u00A1-\u00FF\u2018\u2019\u201C\u201D\u2013\u2014\u2022\u2026]/g, '').trim()

const niceMax = (v: number) => {
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 8 ? 8 : 10) * p
}

export async function buildReportPdf(inp: ReportInput) {
  const { jsPDF } = await import('jspdf')
  const P = PALETTE[inp.theme]
  const id = inp.lang === 'id'
  const Lx = (a: string, b: string) => (id ? a : b)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  let y = 0

  const fill = (c: string) => { const [r, g, b] = rgb(c); doc.setFillColor(r, g, b) }
  const stroke = (c: string) => { const [r, g, b] = rgb(c); doc.setDrawColor(r, g, b) }
  const ink = (c: string) => { const [r, g, b] = rgb(c); doc.setTextColor(r, g, b) }
  const font = (bold: boolean, size: number) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size) }
  const fit = (s: string, maxW: number) => {
    let t = clean(s)
    if (doc.getTextWidth(t) <= maxW) return t
    while (t.length > 1 && doc.getTextWidth(t + '...') > maxW) t = t.slice(0, -1)
    return t.trimEnd() + '...'
  }
  const compact = (n: number) => {
    const t = (v: number, u: string) => `${(Math.round(v * 10) / 10).toString().replace(/\.0$/, '')} ${u}`
    if (n >= 1e9) return t(n / 1e9, id ? 'M' : 'B')
    if (n >= 1e6) return t(n / 1e6, id ? 'jt' : 'M')
    if (n >= 1e3) return t(n / 1e3, id ? 'rb' : 'K')
    return String(Math.round(n))
  }
  const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)
  const shortDate = (iso: string) => `${iso.slice(8, 10)} ${(id ? MONTHS_ID : MONTHS_EN)[Number(iso.slice(5, 7)) - 1] || ''}`
  const today = new Date().toLocaleDateString(id ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  const paintPage = () => { fill(P.paper); doc.rect(0, 0, 210, 297, 'F') }
  const newPage = () => { doc.addPage(); paintPage(); y = 20 }
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage() }
  const roundBar = (x: number, by: number, w: number, h: number, color: string) => {
    const r = Math.min(0.9, h / 2, w / 2)
    fill(color); doc.roundedRect(x, by, w, h, r, r, 'F')
  }
  const heading = (kicker: string, title: string) => {
    ensure(18)
    font(true, 6.8); ink(P.accent); doc.text(clean(kicker).toUpperCase(), L, y)
    font(true, 12.5); ink(P.text); doc.text(clean(title), L, y + 6.2)
    y += 12.5
  }

  // ---------- Halaman 1: kop ----------
  paintPage()
  fill(P.band); doc.rect(0, 0, 210, 56, 'F')
  stroke(P.bandRing); doc.setLineWidth(0.3)
  ;[18, 30, 42].forEach(r => doc.circle(196, 6, r, 'S'))
  fill(P.accent); doc.roundedRect(L, 13, 9, 9, 2.2, 2.2, 'F')
  stroke(P.band); doc.setLineWidth(0.7); doc.rect(L + 2.6, 15.6, 3.8, 3.8, 'S')
  font(true, 16); ink(P.bandText); doc.text('monetra', L + 12.5, 19.6)
  font(false, 7.5); ink(P.bandSub); doc.text(Lx('LAPORAN KEUANGAN BULANAN', 'MONTHLY FINANCIAL STATEMENT'), R, 19, { align: 'right' })
  font(true, 27); ink(P.bandText); doc.text(clean(inp.monthLabel), L, 42)
  font(false, 9.5); ink(P.bandSub); doc.text(Lx('Uangmu, tercatat rapi.', 'Your money, accounted for.'), L, 49.5)
  font(false, 8); ink(P.bandText); doc.text(`${inp.txCount} ${Lx('transaksi tercatat', 'recorded transactions')}`, R, 42, { align: 'right' })
  ink(P.bandSub); doc.text(`${Lx('Dibuat', 'Generated')} ${clean(today)}`, R, 49.5, { align: 'right' })

  // ---------- Kartu ringkasan ----------
  y = 64
  const gap = 4, cw = (W - gap * 3) / 4
  const vs = Lx('dibanding bulan lalu', 'vs last month')
  const delta = (cur: number, prev: number, upIsGood: boolean) => {
    const d = pctChange(cur, prev)
    if (d === null) return { text: Lx('Belum ada data bulan lalu', 'No prior month data'), color: P.muted }
    const good = d === 0 ? true : (d > 0) === upIsGood
    return { text: `${d >= 0 ? '+' : '-'}${Math.abs(d).toFixed(0)}% ${vs}`, color: good ? P.accent : P.danger }
  }
  const dInc = delta(inp.income, inp.prevIncome, true)
  const dExp = delta(inp.expenses, inp.prevExpenses, false)
  const kpi = (i: number, label: string, value: string, sub: string, subColor: string, accent: string) => {
    const x = L + i * (cw + gap)
    fill(P.card); stroke(P.line); doc.setLineWidth(0.25); doc.roundedRect(x, y, cw, 27, 2.5, 2.5, 'FD')
    fill(accent); doc.roundedRect(x + 4, y + 4.5, 6, 1.1, 0.5, 0.5, 'F')
    font(false, 6.8); ink(P.muted); doc.text(clean(label).toUpperCase(), x + 4, y + 11)
    let fs = 12.5; font(true, fs)
    while (doc.getTextWidth(clean(value)) > cw - 8 && fs > 8) { fs -= 0.5; font(true, fs) }
    ink(P.text); doc.text(clean(value), x + 4, y + 18.5)
    font(false, 6.6); ink(subColor); doc.text(fit(sub, cw - 8), x + 4, y + 23.6)
  }
  kpi(0, Lx('Pemasukan', 'Income'), inp.fmt(inp.income), dInc.text, dInc.color, P.income)
  kpi(1, Lx('Pengeluaran', 'Expenses'), inp.fmt(inp.expenses), dExp.text, dExp.color, P.expense)
  kpi(2, Lx('Arus kas bersih', 'Net cash flow'), inp.fmt(inp.balance), Lx('Masuk dikurangi keluar', 'Income minus expenses'), P.muted, inp.balance >= 0 ? P.accent : P.danger)
  kpi(3, Lx('Tingkat tabungan', 'Savings rate'), `${inp.savingsRate.toFixed(1)}%`, Lx('dari total pemasukan', 'of total income'), P.muted, P.accent)
  y += 27 + 8

  // ---------- Ringkasan ----------
  const notes: string[] = []
  if (inp.income > 0) {
    notes.push(Lx(
      `Kamu menyisihkan ${inp.savingsRate.toFixed(1)}% dari pemasukan bulan ini, sisa arus kas ${inp.fmt(inp.balance)}.`,
      `You kept ${inp.savingsRate.toFixed(1)}% of this month's income; net cash flow is ${inp.fmt(inp.balance)}.`))
  } else {
    notes.push(Lx('Belum ada pemasukan tercatat bulan ini.', 'No income has been recorded this month yet.'))
  }
  const top = inp.categories[0]
  if (top && inp.expenses > 0) {
    notes.push(Lx(
      `Pengeluaran terbesar ada di ${top.name}: ${inp.fmt(top.value)} (${((top.value / inp.expenses) * 100).toFixed(0)}% dari total pengeluaran).`,
      `Your largest expense is ${top.name}: ${inp.fmt(top.value)} (${((top.value / inp.expenses) * 100).toFixed(0)}% of total spending).`))
  }
  const dE = pctChange(inp.expenses, inp.prevExpenses)
  if (dE !== null) {
    notes.push(Lx(
      `Pengeluaran ${dE > 0 ? 'naik' : dE < 0 ? 'turun' : 'sama'} ${Math.abs(dE).toFixed(0)}% dibanding bulan lalu.`,
      `Spending ${dE > 0 ? 'rose' : dE < 0 ? 'fell' : 'was flat'} ${Math.abs(dE).toFixed(0)}% compared with last month.`))
  }
  font(false, 9)
  const wrapped = notes.map(n => doc.splitTextToSize(clean(n), W - 14) as string[])
  const lineCount = wrapped.reduce((a, w) => a + w.length, 0)
  const boxH = 13 + lineCount * 4.4 + (wrapped.length - 1) * 1.8
  fill(P.card); stroke(P.line); doc.setLineWidth(0.25); doc.roundedRect(L, y, W, boxH, 2.5, 2.5, 'FD')
  fill(P.accent); doc.rect(L, y + 3, 1.2, boxH - 6, 'F')
  font(true, 6.8); ink(P.accent); doc.text(Lx('RINGKASAN BULAN INI', 'THIS MONTH AT A GLANCE'), L + 6, y + 7)
  font(false, 9); ink(P.soft)
  let ty = y + 12.8
  wrapped.forEach(lines => { lines.forEach(l => { doc.text(l, L + 6, ty); ty += 4.4 }); ty += 1.8 })
  y += boxH + 9

  // ---------- Pengeluaran per kategori ----------
  const MAX_ROWS = 7
  const cats = inp.categories.slice(0, MAX_ROWS).map(c => ({ ...c }))
  const rest = inp.categories.slice(MAX_ROWS).reduce((a, c) => a + c.value, 0)
  if (rest > 0) cats.push({ name: Lx('Lainnya', 'Other'), value: rest, color: P.muted })
  ensure(12.5 + (cats.length ? 11 + cats.length * 8.2 : 10) + 4)
  heading(Lx('Distribusi pengeluaran', 'Spending distribution'), Lx('Pengeluaran per kategori', 'Expenses by category'))
  if (!cats.length || inp.expenses <= 0) {
    font(false, 9); ink(P.muted); doc.text(Lx('Belum ada pengeluaran tercatat bulan ini.', 'No expenses recorded this month yet.'), L, y + 2)
    y += 10
  } else {
    let sx = L
    cats.forEach((c, i) => {
      const w = (c.value / inp.expenses) * W
      fill(c.color); doc.rect(sx, y, w, 5, 'F')
      if (i > 0) { fill(P.paper); doc.rect(sx - 0.2, y, 0.4, 5, 'F') }
      sx += w
    })
    y += 5 + 7
    cats.forEach((c, i) => {
      const share = c.value / inp.expenses
      const rel = c.value / cats.reduce((m, x) => Math.max(m, x.value), 1)
      fill(c.color); doc.circle(L + 1.6, y - 1, 1.3, 'F')
      font(false, 9); ink(P.text); doc.text(fit(c.name, 58), L + 6, y)
      roundBar(84, y - 2.2, 52, 1.8, P.track)
      roundBar(84, y - 2.2, Math.max(1.8, 52 * rel), 1.8, c.color)
      font(true, 8.5); ink(P.soft); doc.text(`${(share * 100).toFixed(1)}%`, 152, y, { align: 'right' })
      font(true, 9); ink(P.text); doc.text(clean(inp.fmt(c.value)), R, y, { align: 'right' })
      if (i < cats.length - 1) { stroke(P.line); doc.setLineWidth(0.15); doc.line(L, y + 3.3, R, y + 3.3) }
      y += 8.2
    })
    y += 3
  }

  // ---------- Arus kas 6 bulan ----------
  const H = 42
  ensure(12.5 + H + 18)
  heading(Lx('Tren 6 bulan', '6-month trend'), Lx('Pemasukan vs pengeluaran', 'Income vs expenses'))
  {
    const x0 = 32, x1 = R, base = y + H + 2
    const maxV = niceMax(Math.max(1, ...inp.months.flatMap(m => [m.income, m.expenses])))
    for (let k = 0; k <= 2; k++) {
      const gy = base - (H * k) / 2
      stroke(P.line); doc.setLineWidth(0.2); doc.line(x0, gy, x1, gy)
      font(false, 6.5); ink(P.muted); doc.text(compact((maxV * k) / 2), x0 - 2.5, gy + 1.1, { align: 'right' })
    }
    const n = Math.max(1, inp.months.length)
    const gw = (x1 - x0) / n, bw = Math.min(8.5, gw * 0.28)
    inp.months.forEach((m, i) => {
      const cx = x0 + gw * i + gw / 2
      const hi = (H * m.income) / maxV, he = (H * m.expenses) / maxV
      if (hi > 0.3) roundBar(cx - bw - 0.6, base - hi, bw, hi, P.income)
      if (he > 0.3) roundBar(cx + 0.6, base - he, bw, he, P.expense)
      font(false, 7); ink(P.muted); doc.text(clean(m.month), cx, base + 5, { align: 'center' })
    })
    y = base + 11
    fill(P.income); doc.roundedRect(L, y - 2.3, 2.6, 2.6, 0.6, 0.6, 'F')
    font(false, 7.5); ink(P.soft); doc.text(Lx('Pemasukan', 'Income'), L + 4.2, y)
    fill(P.expense); doc.roundedRect(L + 30, y - 2.3, 2.6, 2.6, 0.6, 0.6, 'F')
    doc.text(Lx('Pengeluaran', 'Expenses'), L + 34.2, y)
    y += 9
  }

  // ---------- Anggaran ----------
  if (inp.budgets.length) {
    ensure(12.5 + 14)
    heading(Lx('Anggaran', 'Budget'), Lx('Pemakaian anggaran bulan ini', 'Budget usage this month'))
    const totalLimit = inp.budgets.reduce((a, b) => a + b.limit, 0)
    const totalSpent = inp.budgets.reduce((a, b) => a + b.spent, 0)
    font(false, 8); ink(P.muted)
    doc.text(Lx(
      `Terpakai ${clean(inp.fmt(totalSpent))} dari ${clean(inp.fmt(totalLimit))} (${totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(0) : 0}%)`,
      `Used ${clean(inp.fmt(totalSpent))} of ${clean(inp.fmt(totalLimit))} (${totalLimit > 0 ? ((totalSpent / totalLimit) * 100).toFixed(0) : 0}%)`), L, y)
    y += 6.5
    inp.budgets.slice(0, 10).forEach(b => {
      ensure(9)
      const ratio = b.limit > 0 ? b.spent / b.limit : 0
      const color = ratio < 0.75 ? P.accent : ratio < 1 ? P.expense : P.danger
      font(false, 9); ink(P.text); doc.text(fit(b.category, 50), L, y)
      roundBar(70, y - 2.4, 68, 2.4, P.track)
      roundBar(70, y - 2.4, Math.max(2.4, 68 * Math.min(1, ratio)), 2.4, color)
      font(true, 8); ink(P.soft); doc.text(`${(ratio * 100).toFixed(0)}%`, 150, y, { align: 'right' })
      font(false, 7.6); ink(P.muted); doc.text(fit(`${inp.fmt(b.spent)} / ${inp.fmt(b.limit)}`, 42), R, y, { align: 'right' })
      y += 8
    })
    y += 4
  }

  // ---------- Pengeluaran terbesar ----------
  if (inp.topExpenses.length) {
    ensure(12.5 + 8 + 8 * 3)
    heading(Lx('Transaksi', 'Transactions'), Lx('Pengeluaran terbesar', 'Largest expenses'))
    font(true, 6.8); ink(P.muted)
    doc.text(Lx('TANGGAL', 'DATE'), L + 3, y)
    doc.text(Lx('NAMA', 'NAME'), L + 24, y)
    doc.text(Lx('KATEGORI', 'CATEGORY'), 118, y)
    doc.text(Lx('JUMLAH', 'AMOUNT'), R - 3, y, { align: 'right' })
    y += 3
    inp.topExpenses.forEach((t, i) => {
      ensure(8.5)
      if (i % 2 === 0) { fill(P.card); doc.rect(L, y, W, 8, 'F') }
      font(false, 8.2); ink(P.muted); doc.text(shortDate(t.date), L + 3, y + 5.3)
      ink(P.text); doc.text(fit(t.name, 88), L + 24, y + 5.3)
      ink(P.soft); doc.text(fit(t.category, 38), 118, y + 5.3)
      font(true, 8.4); ink(P.text); doc.text(clean(inp.fmt(t.amount)), R - 3, y + 5.3, { align: 'right' })
      y += 8
    })
    y += 8
  }

  // ---------- Target tabungan ----------
  if (inp.goals.length) {
    ensure(12.5 + 16)
    heading(Lx('Target tabungan', 'Savings goals'), Lx('Progres target', 'Goal progress'))
    inp.goals.forEach(g => {
      ensure(9)
      const ratio = g.target > 0 ? Math.min(1, g.saved / g.target) : 0
      font(false, 9); ink(P.text); doc.text(fit(g.name, 50), L, y)
      roundBar(70, y - 2.4, 68, 2.4, P.track)
      roundBar(70, y - 2.4, Math.max(2.4, 68 * ratio), 2.4, P.accent)
      font(true, 8); ink(P.soft); doc.text(`${(ratio * 100).toFixed(0)}%`, 150, y, { align: 'right' })
      font(false, 7.6); ink(P.muted); doc.text(fit(`${inp.fmt(g.saved)} / ${inp.fmt(g.target)}`, 42), R, y, { align: 'right' })
      y += 8
    })
    y += 4
  }

  // ---------- Catatan kaki di setiap halaman ----------
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    stroke(P.line); doc.setLineWidth(0.2); doc.line(L, 285, R, 285)
    font(false, 7); ink(P.muted)
    doc.text('MONETRA  \u00B7  Know your money. Control your future.', L, 290.5)
    doc.text(`${Lx('Halaman', 'Page')} ${i} / ${total}`, R, 290.5, { align: 'right' })
  }

  doc.setProperties({
    title: `MONETRA - ${clean(inp.monthLabel)}`,
    subject: Lx('Laporan keuangan bulanan', 'Monthly financial statement'),
    author: 'MONETRA',
    creator: 'MONETRA',
  })
  doc.save(inp.fileName)
}
