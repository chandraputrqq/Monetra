// Fitur pintar MONETRA — semua dihitung lokal dari data transaksi (tanpa server, tanpa API key).
import { getLang } from './i18n'
export type Tx = { id: string; name: string; amount: number; type: 'income' | 'expense'; category: string; date: string; notes?: string; recurringId?: string }
export type Rec = { id: string; name: string; amount: number; type: 'income' | 'expense'; category: string; frequency: 'weekly' | 'monthly'; active: boolean }
export const L = (id: string, en: string) => (getLang() === 'id' ? id : en)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const todayISO = () => iso(new Date())
const shift = (date: string, n: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + n); return iso(d) }
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

/* ============================ CATAT LEWAT SUARA ============================ */
const UNIT: Record<string, number> = { nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11 }
const NUMW = new Set([...Object.keys(UNIT), 'belas', 'puluh', 'ratus', 'ribu', 'juta', 'seratus', 'seribu', 'sejuta', 'setengah', 'ribuan'])
const evalRun = (ws: string[]) => {
  let total = 0, cur = 0, last = 0
  for (const w of ws) {
    if (w in UNIT) { last = UNIT[w]; cur += last }
    else if (w === 'belas') cur += 10
    else if (w === 'puluh') { cur += last * 9; last = 0 }
    else if (w === 'ratus') { cur += last * 99; last = 0 }
    else if (w === 'seratus') { cur += 100; last = 0 }
    else if (w === 'setengah') { cur += 0.5; last = 0 }
    else if (w === 'ribu' || w === 'ribuan') { total += (cur || 1) * 1e3; cur = 0; last = 0 }
    else if (w === 'seribu') { total += 1e3; last = 0 }
    else if (w === 'juta') { total += (cur || 1) * 1e6; cur = 0; last = 0 }
    else if (w === 'sejuta') { total += 1e6; last = 0 }
  }
  return Math.round(total + cur)
}
const STOP = /\b(beli|membeli|bayar|membayar|habis|buat|untuk|tadi|hari|ini|catat|tambah|tambahkan|pengeluaran|pemasukan|dapat|terima|dari|sebesar|seharga|senilai|sebanyak|rupiah|rp|saya|aku|ya|dong|sama|di|ke|dan)\b/g
const CATS: [RegExp, string, 'expense' | 'income'][] = [
  [/\b(gaji|salary)\b/, 'Salary', 'income'], [/\b(freelance|proyek|project)\b/, 'Freelance', 'income'],
  [/\b(jualan|usaha|dagang|bisnis)\b/, 'Business', 'income'], [/\b(dividen|bunga|investasi|saham|reksadana)\b/, 'Investment Returns', 'income'],
  [/\b(kopi|makan|minum|nasi|ayam|bakso|mie|jajan|snack|warteg|boba|teh|sarapan|bubur|roti|sate|pizza|burger|resto|restoran)\b/, 'Food & Beverages', 'expense'],
  [/\b(bensin|parkir|tol|ojek|gojek|grab|bus|kereta|krl|mrt|taksi|angkot|bbm|pertamax|transport)\b/, 'Transportation', 'expense'],
  [/\b(nonton|bioskop|game|konser|film|karaoke|hiburan)\b/, 'Entertainment', 'expense'],
  [/\b(buku|kursus|kuliah|sekolah|les|spp|ujian)\b/, 'Education', 'expense'],
  [/\b(listrik|air|pulsa|internet|wifi|token|tagihan|pdam|paket data)\b/, 'Bills & Utilities', 'expense'],
  [/\b(obat|dokter|apotek|klinik|vitamin|bpjs)\b/, 'Health', 'expense'],
  [/\b(kos|kost|sewa|kontrakan)\b/, 'Housing', 'expense'],
  [/\b(netflix|spotify|youtube|langganan|premium|disney)\b/, 'Subscriptions', 'expense'],
  [/\b(belanja|baju|sepatu|tas|shopee|tokopedia|lazada)\b/, 'Shopping', 'expense']
]
export type VoiceDraft = { name: string; amount: number; type: 'income' | 'expense'; category: string; date: string }
/** Ubah ucapan seperti "kopi dua puluh lima ribu" / "bensin 50rb kemarin" / "gaji 6,5 juta" menjadi draf transaksi. */
export function parseVoice(text: string): VoiceDraft | null {
  let s = ` ${text.toLowerCase().replace(/rp\.?\s*/g, ' ')} `
  const cands: { v: number; src: string; words?: string[] }[] = []
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)*)\s*(juta|jt|ribu|rb|k)?(?![a-z])/g)) {
    const raw = m[1]; const mult = m[2] ? (/^(juta|jt)$/.test(m[2]) ? 1e6 : 1e3) : 1
    const n = /^\d{1,3}(\.\d{3})+$/.test(raw) ? Number(raw.replace(/\./g, '')) : parseFloat(raw.replace(',', '.'))
    const v = Math.round(n * mult)
    if (Number.isFinite(v) && (m[2] || v >= 500)) cands.push({ v, src: m[0] })
  }
  let sw = s; cands.forEach(c => { sw = sw.replace(c.src, ' # ') })
  const toks = sw.trim().split(/\s+/)
  for (let i = 0; i < toks.length; i++) {
    if (!NUMW.has(toks[i])) continue
    let j = i; while (j < toks.length && NUMW.has(toks[j])) j++
    const run = toks.slice(i, j); const v = evalRun(run)
    if (v >= 500) cands.push({ v, src: '', words: run })
    i = j
  }
  const best = cands.sort((a, b) => b.v - a.v)[0]
  if (!best) return null
  if (best.words) { const w = best.words; const k = toks.findIndex((_, i) => w.every((x, o) => toks[i + o] === x)); s = ` ${toks.filter((_, i) => i < k || i >= k + w.length).join(' ')} ` }
  else s = s.replace(best.src, ' ')
  const hit = CATS.find(c => c[0].test(s))
  const type = hit ? hit[2] : /\b(terima|dapat|bonus|masuk|dibayar)\b/.test(text.toLowerCase()) ? 'income' : 'expense'
  const category = hit ? hit[1] : type === 'income' ? 'Other Income' : 'Other'
  const rest = s.replace(/\bkemarin\b/g, ' ').replace(STOP, ' ').replace(/[#,.]/g, ' ').replace(/\s+/g, ' ').trim()
  const name = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : type === 'income' ? L('Pemasukan', 'Income') : L('Pengeluaran', 'Expense')
  const date = /\bkemarin\b/.test(text.toLowerCase()) ? shift(todayISO(), -1) : todayISO()
  return { name, amount: best.v, type, category, date }
}

/* ============================ ANOMALI PENGELUARAN ============================ */
export type Anomaly = { kind: 'tx' | 'cat'; title: string; detail: string; ratio: number }
export function findAnomalies(all: Tx[], today: string, money: (n: number) => string, cat: (c: string) => string): Anomaly[] {
  const out: Anomaly[] = []
  const exp = all.filter(t => t.type === 'expense' && !t.recurringId)
  const since = shift(today, -120), recent = shift(today, -14)
  const cats = [...new Set(exp.map(t => t.category))]
  const mk = (n: number) => { const d = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
  for (const c of cats) {
    const base = exp.filter(t => t.category === c && t.date >= since && t.date < recent).map(t => t.amount)
    if (base.length >= 5) {
      const med = median(base), mean = sum(base) / base.length, sd = Math.sqrt(sum(base.map(x => (x - mean) ** 2)) / base.length)
      exp.filter(t => t.category === c && t.date >= recent && t.date <= today && t.amount > mean + 2 * sd && t.amount >= 1.8 * med).forEach(t =>
        out.push({ kind: 'tx', ratio: t.amount / med, title: `${t.name} · ${money(t.amount)}`, detail: L(`Sekitar ${(t.amount / med).toFixed(1)}× lebih besar dari biasanya untuk ${cat(c)} (umumnya ${money(med)}).`, `About ${(t.amount / med).toFixed(1)}× your usual ${cat(c)} spend (typically ${money(med)}).`) }))
    }
    const cur = sum(exp.filter(t => t.category === c && t.date.slice(0, 7) === today.slice(0, 7)).map(t => t.amount))
    const hist = [mk(-1), mk(-2), mk(-3)].map(p => sum(exp.filter(t => t.category === c && t.date.slice(0, 7) === p).map(t => t.amount))).filter(v => v > 0)
    if (hist.length >= 2) {
      const avg = sum(hist) / hist.length
      if (cur >= avg * 1.3 && cur - avg >= 50000) out.push({ kind: 'cat', ratio: cur / avg, title: `${cat(c)} · ${money(cur)}`, detail: L(`Bulan ini sudah ${Math.round((cur / avg - 1) * 100)}% di atas rata-rata 3 bulan terakhir (${money(avg)}).`, `This month is already ${Math.round((cur / avg - 1) * 100)}% above your 3-month average (${money(avg)}).`) })
    }
  }
  return out.sort((a, b) => b.ratio - a.ratio).slice(0, 6)
}

/* ============================ LANGGANAN ============================ */
export function subscriptions(all: Tx[], rules: Rec[]) {
  const names = new Set(rules.map(r => r.name.trim().toLowerCase()))
  const list = rules.filter(r => r.active && r.type === 'expense').map(r => ({ name: r.name, category: r.category, monthly: r.frequency === 'weekly' ? (r.amount * 52) / 12 : r.amount }))
  const by = new Map<string, Tx[]>()
  all.filter(t => t.type === 'expense' && !t.recurringId).forEach(t => { const k = t.name.trim().toLowerCase(); by.set(k, [...(by.get(k) || []), t]) })
  const detected: { name: string; monthly: number; months: number }[] = []
  by.forEach((l, k) => {
    if (names.has(k)) return
    const months = new Set(l.map(t => t.date.slice(0, 7))).size
    const med = median(l.map(t => t.amount))
    if (months >= 3 && l.every(t => Math.abs(t.amount - med) <= med * 0.1)) detected.push({ name: l[0].name, monthly: med, months })
  })
  return { rules: list, detected }
}

/* ============================ PEMBULATAN TABUNGAN ============================ */
export const roundUp = (all: Tx[], month: string, step: number) => {
  const l = all.filter(t => t.type === 'expense' && !t.recurringId && t.date.slice(0, 7) === month)
  return { count: l.length, total: Math.round(sum(l.map(t => Math.ceil(t.amount / step) * step - t.amount))) }
}

/* ============================ AMPLOP GAJI ============================ */
export const NEEDS = ['Food & Beverages', 'Transportation', 'Bills & Utilities', 'Health', 'Housing', 'Education']
export const WANTS = ['Shopping', 'Entertainment', 'Subscriptions', 'Other']
export type Plan = { needs: number; wants: number }
export const DEFAULT_PLAN: Plan = { needs: 50, wants: 30 }
export function envelope(all: Tx[], month: string, plan: Plan) {
  const m = all.filter(t => t.date.slice(0, 7) === month)
  const income = sum(m.filter(t => t.type === 'income').map(t => t.amount))
  const spent = (cs: string[]) => sum(m.filter(t => t.type === 'expense' && cs.includes(t.category)).map(t => t.amount))
  const needs = spent(NEEDS), wants = spent(WANTS)
  const savePct = Math.max(0, 100 - plan.needs - plan.wants)
  return { income, rows: [
    { key: 'needs', label: L('Kebutuhan', 'Needs'), pct: plan.needs, planned: income * plan.needs / 100, actual: needs },
    { key: 'wants', label: L('Keinginan', 'Wants'), pct: plan.wants, planned: income * plan.wants / 100, actual: wants },
    { key: 'save', label: L('Tabungan', 'Savings'), pct: savePct, planned: income * savePct / 100, actual: Math.max(0, income - needs - wants) }
  ] }
}

/* ============================ MONETRA WRAPPED ============================ */
export function wrapped(all: Tx[], year: number, today: string) {
  const ys = String(year); const yt = all.filter(t => t.date.startsWith(ys))
  const exp = yt.filter(t => t.type === 'expense')
  if (!yt.length) return null
  const income = sum(yt.filter(t => t.type === 'income').map(t => t.amount)), expense = sum(exp.map(t => t.amount))
  const byMonth = Array.from({ length: 12 }, (_, i) => sum(exp.filter(t => Number(t.date.slice(5, 7)) === i + 1).map(t => t.amount)))
  const act = byMonth.map((v, i) => ({ i, v })).filter(x => x.v > 0)
  const cat = new Map<string, number>(); exp.forEach(t => cat.set(t.category, (cat.get(t.category) || 0) + t.amount))
  const top = [...cat.entries()].sort((a, b) => b[1] - a[1])[0]
  const perDay = new Map<string, number>(); exp.forEach(t => perDay.set(t.date, (perDay.get(t.date) || 0) + t.amount))
  const day = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]
  const biggest = [...exp].sort((a, b) => b.amount - a.amount)[0]
  const spendDays = new Set(exp.filter(t => !t.recurringId).map(t => t.date))
  const start = yt.map(t => t.date).sort()[0], cap = `${ys}-12-31`, end = today < cap ? today : cap
  let noSpend = 0, streak = 0, best = 0
  for (let d = start; d <= end; d = shift(d, 1)) { if (!spendDays.has(d)) { noSpend++; streak++; best = Math.max(best, streak) } else streak = 0 }
  const rate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0
  const share = (cs: string[]) => expense > 0 ? sum(cs.map(c => cat.get(c) || 0)) / expense : 0
  const topShare = top && expense > 0 ? top[1] / expense : 0
  const persona = rate >= 30 ? { icon: '🛡️', title: L('Si Penabung Tangguh', 'The Steady Saver'), desc: L('Kamu menyisihkan lebih dari 30% pemasukan. Dompetmu sehat!', 'You kept over 30% of your income. Healthy wallet!') }
    : share(WANTS) >= 0.4 ? { icon: '🎉', title: L('Si Penikmat Hidup', 'The Life Enjoyer'), desc: L('Keinginan mengambil porsi besar. Seru, asal tetap terkontrol.', 'Wants take a big share. Fun, as long as it stays in check.') }
    : top && top[0] === 'Food & Beverages' && topShare >= 0.35 ? { icon: '🍜', title: L('Pemburu Kuliner', 'The Food Hunter'), desc: L('Makanan jadi pos terbesarmu. Selera tinggi, catatan rapi.', 'Food is your biggest line. Great taste, tidy records.') }
    : top && top[0] === 'Transportation' && topShare >= 0.3 ? { icon: '🛵', title: L('Si Mobile', 'The Commuter'), desc: L('Banyak uang mengalir ke perjalanan. Selalu bergerak!', 'A lot of money goes to getting around. Always moving!') }
    : { icon: '⚖️', title: L('Si Seimbang', 'The Balanced One'), desc: L('Pengeluaranmu merata di banyak pos. Pola yang stabil.', 'Your spending is spread evenly. A stable pattern.') }
  return { byMonth, count: yt.length, income, expense, rate, top: top ? { name: top[0], value: top[1], share: Math.round(topShare * 100) } : null,
    hi: [...act].sort((a, b) => b.v - a.v)[0], lo: [...act].sort((a, b) => a.v - b.v)[0], day: day ? { date: day[0], amount: day[1] } : null,
    biggest: biggest ? { name: biggest.name, amount: biggest.amount, date: biggest.date } : null, noSpend, best, persona }
}
