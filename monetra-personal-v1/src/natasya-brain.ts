// Natasya's brain: a local, rule-based financial analyst. No network, no external AI.
// Everything is derived from the MONETRA app state that is passed in (transactions, budgets, goals, debts).
import { getLang } from './i18n'

export type TxType = 'income' | 'expense'
export type Tx = { id: string; name: string; amount: number; type: TxType; category: string; date: string; notes?: string; recurringId?: string }
export type Budget = { category: string; limit: number }
export type GoalLite = { id: string; name: string; target: number; saved: number; date: string; paused?: boolean; completed?: boolean }
export type DebtLite = { id: string; person: string; direction: 'lent' | 'borrowed'; amount: number; date: string; due?: string; payments: { amount: number }[] }
export type Draft = { name: string; amount: number; type: TxType; category: string; date: string }

export type Ctx = {
  transactions: Tx[]; budgets: Budget[]; goals: GoalLite[]; debts: DebtLite[]
  month: string            // selected month, YYYY-MM
  today: string            // YYYY-MM-DD
  money: (n: number) => string
  expenseCats: string[]; incomeCats: string[]
}
export type BotResult = { text?: string; draft?: Draft; followUps?: string[] }

const tr = (id: string, en: string) => (getLang() === 'id' ? id : en)
const monthShift = (key: string, offset: number) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + offset, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sumBy = (xs: Tx[], type: TxType) => xs.filter(x => x.type === type).reduce((a, x) => a + x.amount, 0)
const pct = (n: number) => `${Math.round(n)}%`

// ---------------------------------------------------------------- parsing helpers (shared with the chat UI)
// "25rb" -> 25000, "1,5jt" -> 1500000, "32.000" -> 32000
export const parseAmount = (text: string): { amount: number; matched: string } | null => {
  // Localized thousands: 4.000 / 4,000 => 4000; decimals: 4,5 => 4.5
  const m = text.match(/(?<![\w])(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*)(rb|ribu|k|jt|juta)?(?!\w)/i)
  if (!m) return null
  const raw = m[1]
  const unit = (m[2] || '').toLowerCase()
  const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw)
  let n = grouped ? Number(raw.replace(/[.,]/g, '')) : Number(raw.replace(',', '.'))
  if (unit === 'rb' || unit === 'ribu' || unit === 'k') n *= 1000
  else if (unit === 'jt' || unit === 'juta') n *= 1_000_000
  if (!Number.isFinite(n) || n <= 0) return null
  return { amount: Math.round(n), matched: m[0] }
}
const AMT = String.raw`(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k|jt|juta)?`
const toNumber = (s: string) => parseAmount(s)?.amount || 0

export const guessCategory = (q: string, type: TxType, expenseCats: string[], incomeCats: string[]): string => {
  const pick = (name: string, list: string[]) => (list.includes(name) ? name : list[list.length - 1])
  if (type === 'income') {
    if (/gaji|salary/i.test(q)) return pick('Salary', incomeCats)
    if (/freelance|proyek|project/i.test(q)) return pick('Freelance', incomeCats)
    if (/bisnis|jual|business|sales/i.test(q)) return pick('Business', incomeCats)
    if (/investasi|dividen|investment/i.test(q)) return pick('Investment Returns', incomeCats)
    return pick('Other Income', incomeCats)
  }
  const rules: [RegExp, string][] = [
    [/makan|kopi|minum|jajan|nasi|ayam|bakso|snack|lunch|dinner|coffee|food|resto|warteg|boba/i, 'Food & Beverages'],
    [/bensin|ojek|gojek|grab|parkir|tol|bus|kereta|transport|fuel|taxi|angkot/i, 'Transportation'],
    [/netflix|spotify|langganan|subscription|youtube/i, 'Subscriptions'],
    [/listrik|internet|wifi|pulsa|tagihan|bill|electric/i, 'Bills & Utilities'],
    [/nonton|bioskop|game|film|konser|movie/i, 'Entertainment'],
    [/buku|kursus|kuliah|sekolah|spp|course|book|tuition/i, 'Education'],
    [/obat|dokter|apotek|rumah sakit|health|medicine/i, 'Health'],
    [/kos|sewa|kontrakan|rent|housing/i, 'Housing'],
    [/belanja|baju|sepatu|shop|tas\b/i, 'Shopping']
  ]
  for (const [re, cat] of rules) if (re.test(q)) return pick(cat, expenseCats)
  return pick('Other', expenseCats)
}

// ---------------------------------------------------------------- derived numbers
const NEEDS = ['Housing', 'Bills & Utilities', 'Food & Beverages', 'Transportation', 'Health', 'Education']
const WANTS = ['Shopping', 'Entertainment', 'Subscriptions', 'Other']

type BudgetRow = { category: string; limit: number; actual: number; pct: number }
type D = ReturnType<typeof derive>

function derive(c: Ctx) {
  const mtx = c.transactions.filter(x => x.date.slice(0, 7) === c.month)
  const income = sumBy(mtx, 'income')
  const expList = mtx.filter(x => x.type === 'expense')
  const expenses = sumBy(mtx, 'expense')
  const balance = income - expenses
  const savingsRate = income > 0 ? (balance / income) * 100 : 0
  const catMap = new Map<string, number>()
  expList.forEach(x => catMap.set(x.category, (catMap.get(x.category) || 0) + x.amount))
  const cats = [...catMap.entries()].sort((a, b) => b[1] - a[1])
  const allocated = c.budgets.reduce((a, b) => a + b.limit, 0)
  const util = allocated > 0 ? (expenses / allocated) * 100 : 0
  const budgetRows: BudgetRow[] = c.budgets.filter(b => b.limit > 0).map(b => {
    const actual = catMap.get(b.category) || 0
    return { category: b.category, limit: b.limit, actual, pct: (actual / b.limit) * 100 }
  }).sort((a, b) => b.pct - a.pct)
  const prevKey = monthShift(c.month, -1)
  const prevTx = c.transactions.filter(x => x.date.slice(0, 7) === prevKey)
  const prevExpenses = sumBy(prevTx, 'expense')
  const prevIncome = sumBy(prevTx, 'income')
  const prevCats = new Map<string, number>()
  prevTx.filter(x => x.type === 'expense').forEach(x => prevCats.set(x.category, (prevCats.get(x.category) || 0) + x.amount))
  const isCurrent = c.month === c.today.slice(0, 7)
  const [y, m] = c.month.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const dayOfMonth = isCurrent ? Number(c.today.slice(8, 10)) : daysInMonth
  const daysLeft = isCurrent ? daysInMonth - dayOfMonth : 0
  const dailyAvg = dayOfMonth > 0 ? expenses / dayOfMonth : 0
  const projected = isCurrent ? dailyAvg * daysInMonth : expenses
  // average monthly surplus over the last 3 months that actually have transactions
  const surpluses: number[] = []
  for (let i = 0; i < 3; i++) {
    const k = monthShift(c.month, -i)
    const tx = c.transactions.filter(x => x.date.slice(0, 7) === k)
    if (tx.length) surpluses.push(sumBy(tx, 'income') - sumBy(tx, 'expense'))
  }
  const capacity = surpluses.length ? Math.max(0, surpluses.reduce((a, b) => a + b, 0) / surpluses.length) : 0
  const monthName = new Date(y, m - 1, 1).toLocaleDateString(getLang() === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })
  const when = isCurrent ? tr('bulan ini', 'this month') : monthName
  const owed = debtTotals(c.debts, c.today)
  const activeGoals = c.goals.filter(g => !g.completed && !g.paused && g.target > 0)
  return { mtx, income, expList, expenses, balance, savingsRate, cats, allocated, util, budgetRows, prevKey, prevExpenses, prevIncome, prevCats, isCurrent, daysInMonth, dayOfMonth, daysLeft, dailyAvg, projected, capacity, monthName, when, owed, activeGoals, hasAny: c.transactions.length > 0 }
}

const remainingOf = (d: DebtLite) => Math.max(0, d.amount - d.payments.reduce((a, p) => a + p.amount, 0))
function debtTotals(debts: DebtLite[], today: string) {
  const borrowed = debts.filter(d => d.direction === 'borrowed' && remainingOf(d) > 0)
  const lent = debts.filter(d => d.direction === 'lent' && remainingOf(d) > 0)
  const overdueB = borrowed.filter(d => d.due && d.due < today)
  const overdueL = lent.filter(d => d.due && d.due < today)
  return {
    borrowed, lent, overdueB, overdueL,
    iOwe: borrowed.reduce((a, d) => a + remainingOf(d), 0),
    owedToMe: lent.reduce((a, d) => a + remainingOf(d), 0)
  }
}

// ---------------------------------------------------------------- financial health score
type Part = { name: string; got: number; max: number; note: string }
export function healthScore(c: Ctx) {
  const d = derive(c)
  const parts: Part[] = []
  // 1. savings rate (30)
  if (d.income > 0) {
    const got = Math.max(0, Math.min(30, (d.savingsRate / 20) * 30))
    parts.push({ name: tr('Tabungan', 'Savings'), got, max: 30, note: d.savingsRate >= 20 ? tr(`rasio tabungan ${pct(d.savingsRate)} (target ≥ 20%)`, `savings rate ${pct(d.savingsRate)} (target ≥ 20%)`) : tr(`rasio tabungan baru ${pct(Math.max(0, d.savingsRate))}, targetnya ≥ 20%`, `savings rate is only ${pct(Math.max(0, d.savingsRate))}, aim for ≥ 20%`) })
  } else parts.push({ name: tr('Tabungan', 'Savings'), got: 0, max: 30, note: tr('belum ada pemasukan tercatat', 'no income recorded') })
  // 2. spending vs income (20)
  if (d.income > 0) {
    const ratio = d.expenses / d.income
    const got = ratio <= 0.7 ? 20 : ratio >= 1 ? 0 : ((1 - ratio) / 0.3) * 20
    parts.push({ name: tr('Arus kas', 'Cash flow'), got, max: 20, note: ratio <= 0.7 ? tr(`pengeluaran ${pct(ratio * 100)} dari pemasukan`, `spending is ${pct(ratio * 100)} of income`) : tr(`pengeluaran sudah ${pct(ratio * 100)} dari pemasukan`, `spending is already ${pct(ratio * 100)} of income`) })
  } else parts.push({ name: tr('Arus kas', 'Cash flow'), got: 0, max: 20, note: tr('belum ada pemasukan untuk dibandingkan', 'no income to compare against') })
  // 3. budget discipline (20)
  if (d.allocated > 0) {
    const over = d.budgetRows.filter(r => r.pct > 100).length
    let got = d.util <= 80 ? 20 : d.util <= 100 ? 20 - ((d.util - 80) / 20) * 12 : 4
    got = Math.max(0, got - over * 2)
    parts.push({ name: tr('Anggaran', 'Budget'), got, max: 20, note: over ? tr(`${over} kategori melewati batas, pemakaian total ${pct(d.util)}`, `${over} categories over limit, total usage ${pct(d.util)}`) : tr(`terpakai ${pct(d.util)} dari total anggaran`, `${pct(d.util)} of total budget used`) })
  } else parts.push({ name: tr('Anggaran', 'Budget'), got: 8, max: 20, note: tr('belum ada anggaran bulanan', 'no monthly budget set yet') })
  // 4. savings goals (15)
  if (d.activeGoals.length) {
    const avg = d.activeGoals.reduce((a, g) => a + Math.min(1, g.saved / g.target), 0) / d.activeGoals.length
    parts.push({ name: tr('Target tabungan', 'Savings goals'), got: 6 + avg * 9, max: 15, note: tr(`rata-rata progres ${pct(avg * 100)}`, `average progress ${pct(avg * 100)}`) })
  } else parts.push({ name: tr('Target tabungan', 'Savings goals'), got: 4, max: 15, note: tr('belum ada target tabungan aktif', 'no active savings goal') })
  // 5. debt (15)
  let debtGot = 15, debtNote = tr('tidak ada utang berjalan', 'no outstanding debt')
  if (d.owed.iOwe > 0) {
    if (d.owed.overdueB.length) { debtGot = 3; debtNote = tr(`${d.owed.overdueB.length} utang lewat jatuh tempo`, `${d.owed.overdueB.length} overdue debt(s)`) }
    else if (d.income > 0 && d.owed.iOwe > d.income) { debtGot = 7; debtNote = tr('total utang melebihi pemasukan bulanan', 'total debt exceeds monthly income') }
    else { debtGot = 12; debtNote = tr('ada utang, tapi belum jatuh tempo', 'you have debt, none overdue') }
  }
  parts.push({ name: tr('Utang', 'Debt'), got: debtGot, max: 15, note: debtNote })

  const score = Math.round(parts.reduce((a, p) => a + p.got, 0))
  const label = score >= 80 ? tr('Sangat sehat', 'Very healthy') : score >= 60 ? tr('Cukup sehat', 'Fairly healthy') : score >= 40 ? tr('Perlu perhatian', 'Needs attention') : tr('Waspada', 'Warning')
  return { score, label, parts, d }
}

// ---------------------------------------------------------------- daily insight / greeting / proactive alerts
export function dailyInsight(c: Ctx): string {
  const d = derive(c)
  if (!d.hasAny) return tr('Belum ada transaksi. Coba ketik “kopi 25rb” untuk mencatat yang pertama.', 'No transactions yet. Try typing “coffee 25k” to log your first one.')
  if (!d.mtx.length) return tr(`Belum ada transaksi ${d.when}. Catat pengeluaran hari ini supaya analisisku akurat.`, `No transactions ${d.when}. Log today's spending so my analysis stays accurate.`)
  const over = d.budgetRows.find(r => r.pct >= 100)
  if (over) return tr(`Anggaran ${over.category} sudah terlewati (${pct(over.pct)}). Tahan dulu pengeluaran di kategori ini.`, `Your ${over.category} budget is exceeded (${pct(over.pct)}). Hold off on that category.`)
  const near = d.budgetRows.find(r => r.pct >= 80)
  if (near) return tr(`Anggaran ${near.category} sudah terpakai ${pct(near.pct)}. Sisa ${c.money(near.limit - near.actual)}.`, `Your ${near.category} budget is ${pct(near.pct)} used. ${c.money(near.limit - near.actual)} left.`)
  if (d.income > 0 && d.expenses > d.income) return tr(`Pengeluaran ${d.when} sudah melebihi pemasukan sebesar ${c.money(d.expenses - d.income)}.`, `Spending ${d.when} already exceeds income by ${c.money(d.expenses - d.income)}.`)
  if (d.owed.overdueB.length) return tr(`Ada ${d.owed.overdueB.length} utang yang lewat jatuh tempo. Cek menu Utang ya.`, `You have ${d.owed.overdueB.length} overdue debt(s). Check the Debts menu.`)
  if (d.owed.overdueL.length) return tr(`Ada ${d.owed.overdueL.length} piutang yang sudah lewat jatuh tempo. Mungkin saatnya menagih.`, `${d.owed.overdueL.length} money owed to you is past due. Maybe time to follow up.`)
  const top = d.cats[0]
  if (top && d.expenses > 0 && top[1] / d.expenses >= 0.4) return tr(`${top[0]} menyumbang ${pct((top[1] / d.expenses) * 100)} dari pengeluaran ${d.when}. Layak dievaluasi.`, `${top[0]} is ${pct((top[1] / d.expenses) * 100)} of spending ${d.when}. Worth a review.`)
  if (d.income > 0 && d.savingsRate >= 20) return tr(`Rasio tabunganmu ${pct(d.savingsRate)}, bagus! Pertahankan, dan pindahkan sebagian sisa ke target tabungan.`, `Your savings rate is ${pct(d.savingsRate)}, nice! Keep it up and move part of the surplus into a goal.`)
  if (!d.allocated) return tr('Kamu belum mengatur anggaran. Batas per kategori membantu menahan pengeluaran.', 'No budget set yet. Category limits help keep spending in check.')
  if (!d.activeGoals.length) return tr('Belum ada target tabungan. Tentukan satu target kecil untuk mulai.', 'No savings goal yet. Set one small goal to get started.')
  return tr(`Pengeluaranmu ${d.when} masih terkendali. Sisihkan sebagian sisa saldo untuk tabungan.`, `Your spending ${d.when} is under control. Set part of the remaining balance aside as savings.`)
}

export function greeting(c: Ctx): string {
  return [
    tr('Halo, aku **Natasya**, teman keuanganmu di MONETRA. 👋', 'Hi, I am **Natasya**, your financial companion in MONETRA. 👋'),
    tr('Aku bisa menganalisis keuanganmu, memberi saran hemat, membantu target tabungan, dan memandu fitur MONETRA. Untuk mencatat, ketik misalnya “beli kopi 25rb tadi pagi”.', 'I can analyze your finances, suggest savings, help with goals, and guide you through MONETRA. To log something, type e.g. “coffee 25k this morning”.'),
    '',
    tr('💡 **Insight hari ini**', '💡 **Today\'s insight**'),
    dailyInsight(c)
  ].join('\n')
}

// After the user saves a transaction: a short proactive heads-up if it pushed something over a limit.
export function postSaveInsight(c: Ctx, tx: Tx): BotResult | null {
  const d = derive(c)
  if (tx.type !== 'expense') return null
  let warn = ''
  const row = d.budgetRows.find(r => r.category === tx.category)
  if (row && row.pct >= 100) warn = tr(`⚠️ Anggaran **${row.category}** sekarang ${pct(row.pct)}, sudah melewati batas ${c.money(row.limit)}.`, `⚠️ Your **${row.category}** budget is now ${pct(row.pct)}, past the ${c.money(row.limit)} limit.`)
  else if (row && row.pct >= 80) warn = tr(`⚠️ Anggaran **${row.category}** sudah terpakai ${pct(row.pct)}. Sisa ${c.money(row.limit - row.actual)}.`, `⚠️ Your **${row.category}** budget is ${pct(row.pct)} used. ${c.money(row.limit - row.actual)} left.`)
  else if (d.allocated > 0 && d.util >= 80) warn = tr(`⚠️ Total anggaran bulan ini sudah terpakai ${pct(d.util)}.`, `⚠️ ${pct(d.util)} of your total budget is used.`)
  else if (d.income > 0 && d.expenses > d.income) warn = tr('⚠️ Pengeluaran bulan ini sekarang melebihi pemasukan.', '⚠️ Spending now exceeds income this month.')
  if (!warn) return null
  return { text: warn, followUps: [tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?'), tr('Anggaran saya', 'My budget')] }
}

// ---------------------------------------------------------------- feature guide
type Guide = { re: RegExp; title: [string, string]; what: [string, string]; steps: [string, string][]; benefit: [string, string] }
const GUIDES: Guide[] = [
  {
    re: /dashboard|dasbor|beranda/i, title: ['Dasbor', 'Dashboard'],
    what: ['Ringkasan keuangan bulan yang dipilih: total pemasukan, pengeluaran, sisa saldo, total tabungan, dan rasio tabung.', 'A summary of the selected month: total income, expenses, remaining balance, total savings, and savings rate.'],
    steps: [['Pilih bulan lewat kontrol bulan di bagian atas.', 'Pick a month with the month control at the top.'], ['Lihat kartu ringkasan, grafik arus kas, komposisi pengeluaran, dan “Denyut anggaran”.', 'Read the summary cards, cash-flow chart, spending mix, and the budget pulse.'], ['Tekan “Tambah transaksi” untuk mencatat langsung dari sini.', 'Press “Add transaction” to log one right from here.']],
    benefit: ['Kamu langsung tahu posisi uangmu tanpa membuka banyak menu.', 'You see where your money stands without opening several menus.']
  },
  {
    re: /scanner|scan|pindai|pemindai|struk|receipt|ocr/i, title: ['Pemindai Pintar (Smart Scanner)', 'Smart Scanner'],
    what: ['Mengubah foto struk menjadi transaksi. Teksnya dibaca (OCR) langsung di browser, tanpa dikirim ke server.', 'Turns a receipt photo into a transaction. Text is read (OCR) in your browser, nothing is uploaded.'],
    steps: [['Buka menu Pemindai Pintar, lalu pilih “Scan with Camera” atau “Upload Image”.', 'Open Smart Scanner, then choose “Scan with Camera” or “Upload Image”.'], ['Tunggu proses membaca gambar (scan pertama bisa lebih lama karena data OCR diunduh).', 'Wait while the image is read (the first scan can take longer while OCR data downloads).'], ['Periksa nama toko, tanggal, jenis, kategori, dan jumlah. Hasil OCR bisa keliru, jadi koreksi bila perlu.', 'Check merchant, date, type, category, and amount. OCR can misread, so fix anything wrong.'], ['Tekan “Confirm & Save”. Jika mirip transaksi yang sudah ada, kamu akan diminta konfirmasi dulu.', 'Press “Confirm & Save”. If it looks like an existing record you will be asked to confirm first.']],
    benefit: ['Mencatat lebih cepat dan tidak ada yang tersimpan tanpa persetujuanmu.', 'Faster logging, and nothing is saved without your approval.']
  },
  {
    re: /transaksi|transaction|riwayat|history|catat|mencatat|recurring|berulang|rutin/i, title: ['Transaksi', 'Transactions'],
    what: ['Tempat mencatat dan mengelola semua pemasukan dan pengeluaran, termasuk transaksi berulang otomatis.', 'Where you record and manage all income and expenses, including automatic recurring ones.'],
    steps: [['Tekan “Tambah transaksi”, isi nama, jumlah, jenis, kategori, dan tanggal, lalu simpan.', 'Press “Add transaction”, fill in name, amount, type, category, and date, then save.'], ['Gunakan pencarian dan filter bulan, jenis, atau kategori untuk menemukan riwayat.', 'Use search and the month, type, or category filters to find history.'], ['Ikon pensil untuk mengedit, ikon tempat sampah untuk menghapus (ada konfirmasi dulu).', 'Use the pencil to edit and the trash icon to delete (you are asked to confirm).'], ['Di panel “Recurring transactions”, atur transaksi mingguan atau bulanan seperti sewa atau langganan, agar tercatat otomatis.', 'In “Recurring transactions”, set weekly or monthly items like rent or subscriptions so they are recorded automatically.'], ['“Export CSV” mengunduh daftar yang sedang ditampilkan.', '“Export CSV” downloads the list currently shown.']],
    benefit: ['Semua analisis, grafik, dan saranku bersumber dari data di sini, jadi makin lengkap catatanmu makin akurat hasilnya.', 'Every chart and piece of advice comes from this data, so the fuller your records, the better the results.']
  },
  {
    re: /budget|anggaran/i, title: ['Anggaran Bulanan (Monthly Budget)', 'Monthly Budget'],
    what: ['Menetapkan batas pengeluaran per kategori dan memantau seberapa jauh kamu sudah memakainya.', 'Sets a spending limit per category and tracks how much of it you have used.'],
    steps: [['Buka Anggaran Bulanan dan isi batas di tiap kategori (tersimpan otomatis saat kamu mengetik).', 'Open Monthly Budget and enter a limit for each category (saved automatically as you type).'], ['Perhatikan bar progres dan statusnya: terkendali, mendekati batas, atau terlewati.', 'Watch the progress bar and status: under control, approaching, or exceeded.'], ['Kosongkan angka untuk menghapus batas sebuah kategori.', 'Clear the number to remove a category limit.']],
    benefit: ['Pengeluaran tidak terasa “bocor”, dan aku bisa memperingatkanmu sebelum anggaran habis.', 'Spending stops quietly leaking, and I can warn you before a budget runs out.']
  },
  {
    re: /analytics|analitik|grafik|chart/i, title: ['Analitik', 'Analytics'],
    what: ['Grafik dan analisis kondisi keuanganmu: pemasukan vs pengeluaran, rincian kategori, tren pengeluaran, kategori terbesar, dan arus kas bersih bulanan.', 'Charts and analysis of your finances: income vs expenses, category breakdown, spending trend, top categories, and monthly net cash flow.'],
    steps: [['Buka Analitik dan pilih bulan.', 'Open Analytics and choose a month.'], ['Baca tiap grafik, arahkan kursor atau sentuh untuk melihat angka detail.', 'Read each chart; hover or tap for exact figures.'], ['Cari lonjakan atau kategori yang mendominasi, lalu tanyakan padaku untuk saran penghematannya.', 'Look for spikes or dominant categories, then ask me for ways to cut back.']],
    benefit: ['Pola yang sulit terlihat dari daftar transaksi jadi mudah dikenali.', 'Patterns that are hard to see in a list become easy to spot.']
  },
  {
    re: /kalender|calendar/i, title: ['Kalender Keuangan (Financial Calendar)', 'Financial Calendar'],
    what: ['Kalender bulanan yang menandai hari-hari saat uangmu masuk dan keluar.', 'A monthly calendar showing the days your money moved.'],
    steps: [['Buka Kalender Keuangan dan pilih bulan.', 'Open Financial Calendar and pick a month.'], ['Lihat total harian pada tiap tanggal.', 'See the daily totals on each date.'], ['Pilih sebuah tanggal untuk melihat rincian transaksinya.', 'Select a date to open its transaction detail.']],
    benefit: ['Kamu bisa melihat hari mana yang paling boros dan kapan pemasukan biasanya datang.', 'You can spot your costliest days and when income usually arrives.']
  },
  {
    re: /savings? goals?|target tabungan|tujuan tabungan|goals?\b|target/i, title: ['Target Tabungan (Savings Goals)', 'Savings Goals'],
    what: ['Membuat tujuan menabung (misalnya dana darurat atau laptop), mencatat setoran, dan melihat progres serta proyeksi pencapaiannya.', 'Create savings goals (e.g. emergency fund or a laptop), record deposits, and track progress and projections.'],
    steps: [['Buka Target Tabungan dan buat target baru: nama, kategori, jumlah target, tanggal tujuan, dan prioritas.', 'Open Savings Goals and create a goal: name, category, target amount, deadline, and priority.'], ['Tambah setoran (atau catat penarikan) pada target tersebut. Riwayat kontribusi tersimpan.', 'Add a deposit (or record a withdrawal) on the goal. Contribution history is kept.'], ['Lihat proyeksi harian, mingguan, atau bulanan untuk tahu berapa yang perlu disisihkan.', 'Check the daily, weekly, or monthly projection to see how much to set aside.']],
    benefit: ['Menabung jadi punya tujuan dan tenggat yang jelas, dan aku bisa menghitung strategi pencapaiannya.', 'Saving gets a clear aim and deadline, and I can work out a plan to reach it.']
  },
  {
    re: /utang|hutang|piutang|debt/i, title: ['Utang (Debts)', 'Debts'],
    what: ['Mencatat utang (kamu berutang) dan piutang (orang berutang padamu), pembayarannya, dan sisa kewajiban.', 'Tracks money you owe and money owed to you, the payments, and what remains.'],
    steps: [['Buka Utang, tekan tambah, lalu isi nama orang, arah (meminjamkan atau meminjam), jumlah, tanggal, dan jatuh tempo.', 'Open Debts, add a record, and enter the person, direction (lent or borrowed), amount, date, and due date.'], ['Saat ada cicilan, pilih catatan itu lalu catat pembayaran. Sisa kewajiban dihitung otomatis.', 'When a payment happens, open the record and log it. The remaining balance updates automatically.'], ['Gunakan filter untuk melihat yang masih terbuka, lewat jatuh tempo, atau lunas.', 'Use the filters for open, overdue, or settled records.']],
    benefit: ['Tidak ada kewajiban yang terlupa, dan aku bisa membantu menentukan urutan pembayaran.', 'Nothing gets forgotten, and I can help prioritize repayments.']
  },
  {
    re: /laporan|report|pdf|csv|ekspor|export|unduh|download/i, title: ['Laporan Bulanan (Monthly Reports)', 'Monthly Reports'],
    what: ['Laporan keuangan satu bulan penuh: pemasukan, pengeluaran, arus kas bersih, rasio tabung, rincian kategori, dan perbandingan dengan bulan lalu.', 'A full-month financial statement: income, expenses, net cash flow, savings rate, category breakdown, and comparison to last month.'],
    steps: [['Buka Laporan Bulanan dan pilih bulan.', 'Open Monthly Reports and choose a month.'], ['Tekan “Export CSV” untuk data tabel, atau “Download PDF” untuk laporan siap simpan.', 'Press “Export CSV” for spreadsheet data, or “Download PDF” for a ready-to-keep report.']],
    benefit: ['Bukti catatan keuanganmu rapi untuk arsip pribadi atau evaluasi akhir bulan.', 'A tidy record for your archive or month-end review.']
  },
  {
    re: /pengaturan|settings?|backup|cadangan|restore|pulihkan|bahasa|language|hapus data|clear data|demo|mata uang|currency/i, title: ['Pengaturan (Settings)', 'Settings'],
    what: ['Mengatur bahasa (Indonesia atau English), mencadangkan dan memulihkan data, mencoba data demo, dan menghapus data lokal.', 'Lets you set the language (Indonesian or English), back up and restore data, try demo data, and clear local data.'],
    steps: [['Pilih bahasa di bagian Bahasa. Pilihan tersimpan di browser.', 'Choose a language under Language. It is saved in this browser.'], ['“Download backup” menyimpan file JSON berisi transaksi, anggaran, target, dan utang.', '“Download backup” saves a JSON file of transactions, budgets, goals, and debts.'], ['Untuk memulihkan, pilih file cadangan. Data lama diganti hanya setelah kamu mengonfirmasi.', 'To restore, pick a backup file. Existing data is replaced only after you confirm.'], ['“Hapus data lokal” menghapus semuanya dan tidak bisa dibatalkan, jadi buat cadangan dulu.', '“Clear local data” removes everything and cannot be undone, so back up first.']],
    benefit: ['Datamu tetap milikmu: tersimpan di perangkat ini dan bisa dipindahkan lewat cadangan.', 'Your data stays yours: stored on this device and portable through backups.']
  }
]

const HOWTO = /cara|fungsi|kegunaan|guna\b|manfaat|apa itu|apa saja|how to|what is|what does|what's|how do i use|how does|use\b|panduan|membuat|buat |bikin|menambah|tambah|langkah|step|menggunakan|pakai|pake\b|gunakan|explain|jelaskan|setup|set up|create|add\b/i

export function guideFor(q: string): BotResult | null {
  const overview = /panduan|fitur|features?|menu|guide|tour|apa saja yang bisa/i.test(q)
  const hit = GUIDES.find(g => g.re.test(q))
  if (hit && HOWTO.test(q) && !/(panduan|guide).*(fitur|monetra|features?)/i.test(q)) {
    const lines = [
      `📖 **${tr(hit.title[0], hit.title[1])}**`,
      tr(hit.what[0], hit.what[1]),
      '',
      tr('**Langkah penggunaan**', '**How to use it**'),
      ...hit.steps.map((s, i) => `${i + 1}. ${tr(s[0], s[1])}`),
      '',
      `✨ **${tr('Manfaat', 'Benefit')}:** ${tr(hit.benefit[0], hit.benefit[1])}`
    ]
    return { text: lines.join('\n'), followUps: [tr('Panduan fitur MONETRA', 'MONETRA feature guide'), tr('Berikan saran keuangan saya', 'Give me financial advice')] }
  }
  if (overview) {
    return {
      text: [
        tr('❓ **Panduan fitur MONETRA**', '❓ **MONETRA feature guide**'),
        tr('Tanyakan “apa fungsi …” untuk penjelasan tiap menu:', 'Ask “what does … do” for any menu:'),
        ...GUIDES.map(g => `• **${tr(g.title[0], g.title[1])}**: ${tr(g.what[0], g.what[1]).split(/[:.] /)[0].replace(/\.$/, '')}`),
        tr('• **Natasya**: chat ini. Mencatat lewat draf + tombol Simpan, analisis, dan saran.', '• **Natasya**: this chat. Log via draft + Save button, analysis, and advice.')
      ].join('\n'),
      followUps: [tr('Apa fungsi Analytics?', 'What does Analytics do?'), tr('Bagaimana cara menggunakan Smart Scanner?', 'How do I use Smart Scanner?'), tr('Bagaimana cara mengatur budget?', 'How do I set a budget?')]
    }
  }
  return null
}

// ---------------------------------------------------------------- analysis answers
const needData = (d: D): BotResult | null => {
  if (!d.hasAny) return { text: tr('Aku belum punya data untuk dianalisis. Catat beberapa transaksi dulu, misalnya “makan siang 32rb” atau “gaji 5jt”, atau coba data demo di Pengaturan.', 'I do not have data to analyze yet. Log a few transactions first, e.g. “lunch 32k” or “salary 5m”, or try demo data in Settings.'), followUps: [tr('Panduan fitur MONETRA', 'MONETRA feature guide')] }
  if (!d.mtx.length) return { text: tr(`Belum ada transaksi ${d.when}, jadi belum ada yang bisa kuanalisis. Catat dulu atau ganti bulan di dasbor.`, `No transactions ${d.when} yet, so there is nothing to analyze. Log some or switch the month on the dashboard.`), followUps: [tr('Panduan fitur MONETRA', 'MONETRA feature guide')] }
  return null
}

function overview(c: Ctx, d: D): string[] {
  return [
    `${tr('Pemasukan', 'Income')}: **${c.money(d.income)}**`,
    `${tr('Pengeluaran', 'Spending')}: **${c.money(d.expenses)}**`,
    `${tr('Sisa dana', 'Balance')}: **${c.money(d.balance)}**`
  ]
}

function financialSummary(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  const adv: string[] = []
  if (d.income > 0 && d.expenses > d.income) adv.push(tr('Pengeluaran melebihi pemasukan. Prioritaskan memangkas keinginan dulu, jangan menambah utang.', 'Spending exceeds income. Trim wants first and avoid taking on debt.'))
  const over = d.budgetRows.filter(r => r.pct >= 90)
  if (over.length) adv.push(tr(`Awasi anggaran ${over.map(r => r.category).join(', ')} yang sudah ≥ 90%.`, `Watch the ${over.map(r => r.category).join(', ')} budget(s) at ≥ 90%.`))
  if (d.cats[0]) adv.push(tr(`Evaluasi kategori terbesar: ${d.cats[0][0]} (${c.money(d.cats[0][1])}).`, `Review your biggest category: ${d.cats[0][0]} (${c.money(d.cats[0][1])}).`))
  if (d.balance > 0) adv.push(tr(`Sisihkan sebagian dari sisa ${c.money(d.balance)} ke tabungan, idealnya di awal, bukan menunggu akhir bulan.`, `Move part of the ${c.money(d.balance)} left into savings, ideally early rather than at month-end.`))
  if (!d.allocated) adv.push(tr('Atur anggaran per kategori di menu Anggaran Bulanan.', 'Set per-category limits in Monthly Budget.'))
  if (d.balance > 0 || d.income > 0) adv.push(tr('Siapkan dana cadangan untuk kebutuhan mendadak (targetnya 3 hingga 6 kali pengeluaran bulanan).', 'Build an emergency fund (aim for 3 to 6 months of expenses).'))
  return {
    text: [tr(`Berdasarkan catatan ${d.when}, ini kondisimu:`, `Based on your records for ${d.when}:`), '', ...overview(c, d), '', tr('💡 **Saran Natasya**', '💡 **Natasya\'s advice**'), ...adv.slice(0, 5).map(a => `• ${a}`),
      '', d.savingsRate >= 20 ? tr('Kondisimu sehat. Yuk kita optimalkan bersama!', 'You are in good shape. Let\'s optimize together!') : tr('Masih ada ruang untuk membaik, dan kita bisa mulai dari langkah kecil.', 'There is room to improve, and we can start with small steps.')].join('\n'),
    followUps: [tr('Apakah keuangan saya sehat?', 'Is my financial health good?'), tr('Analisis pengeluaran saya', 'Analyze my spending'), tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?')]
  }
}

function spendingAnalysis(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  if (!d.expenses) return { text: tr(`Belum ada pengeluaran ${d.when}.`, `No expenses ${d.when} yet.`) }
  const lines: string[] = [tr(`📊 **Analisis pengeluaran ${d.when}**`, `📊 **Spending analysis, ${d.when}**`), `${tr('Total', 'Total')}: **${c.money(d.expenses)}** (${d.expList.length} ${tr('transaksi', 'transactions')})`, '', tr('**Kategori terbesar**', '**Top categories**')]
  d.cats.slice(0, 4).forEach(([name, amt], i) => lines.push(`${i + 1}. ${name}: ${c.money(amt)} (${pct((amt / d.expenses) * 100)})`))
  if (d.prevExpenses > 0) {
    const diff = ((d.expenses - d.prevExpenses) / d.prevExpenses) * 100
    lines.push('', tr(`**Dibanding bulan sebelumnya**: ${diff >= 0 ? 'naik' : 'turun'} ${pct(Math.abs(diff))} (${c.money(d.prevExpenses)} → ${c.money(d.expenses)})`, `**Vs previous month**: ${diff >= 0 ? 'up' : 'down'} ${pct(Math.abs(diff))} (${c.money(d.prevExpenses)} → ${c.money(d.expenses)})`))
    let biggest: [string, number] | null = null
    d.cats.forEach(([name, amt]) => { const delta = amt - (d.prevCats.get(name) || 0); if (!biggest || delta > biggest[1]) biggest = [name, delta] })
    const bg = biggest as [string, number] | null
    if (bg && bg[1] > 0) lines.push(tr(`Kenaikan terbesar ada di ${bg[0]} (+${c.money(bg[1])}).`, `The biggest rise is in ${bg[0]} (+${c.money(bg[1])}).`))
  }
  const rec = recurringItems(c, d)
  if (rec.length) { lines.push('', tr('**Pengeluaran berulang**', '**Recurring expenses**'), ...rec.slice(0, 4).map(r => `• ${r.name}: ~${c.money(r.avg)}/${tr('bulan', 'month')}`)) }
  const wants = d.cats.filter(([n]) => WANTS.includes(n)).reduce((a, [, v]) => a + v, 0)
  if (wants > 0 && d.expenses > 0) lines.push('', tr(`💡 Pengeluaran keinginan (belanja, hiburan, langganan, lainnya) ${pct((wants / d.expenses) * 100)}. Memangkas 15% saja menghemat sekitar ${c.money(wants * 0.15)}.`, `💡 Wants (shopping, entertainment, subscriptions, other) are ${pct((wants / d.expenses) * 100)} of spending. Cutting just 15% saves about ${c.money(wants * 0.15)}.`))
  if (d.isCurrent && d.daysLeft > 0) lines.push(tr(`Dengan laju ${c.money(d.dailyAvg)}/hari, pengeluaran akhir bulan diperkirakan ${c.money(d.projected)}.`, `At ${c.money(d.dailyAvg)}/day, month-end spending projects to ${c.money(d.projected)}.`))
  return { text: lines.join('\n'), followUps: [tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?'), tr('Bandingkan dengan bulan lalu', 'Compare with last month'), tr('Buatkan strategi keuangan bulan ini', 'Plan my finances this month')] }
}

function recurringItems(c: Ctx, d: D): { name: string; avg: number }[] {
  const keys = [d.prevKey, c.month, monthShift(c.month, -2)]
  const groups = new Map<string, { months: Set<string>; total: number; label: string }>()
  c.transactions.filter(x => x.type === 'expense' && keys.includes(x.date.slice(0, 7))).forEach(x => {
    const k = x.name.trim().toLowerCase()
    const g = groups.get(k) || { months: new Set<string>(), total: 0, label: x.name.trim() }
    g.months.add(x.date.slice(0, 7)); g.total += x.amount; groups.set(k, g)
  })
  return [...groups.values()].filter(g => g.months.size >= 2).map(g => ({ name: g.label, avg: g.total / g.months.size })).sort((a, b) => b.avg - a.avg)
}

function reduceSpending(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  if (!d.expenses) return { text: tr('Belum ada pengeluaran untuk dipangkas. Bagus!', 'No spending to cut yet. Nice!') }
  const lines: string[] = [tr('📉 **Cara mengurangi pengeluaran, berdasarkan datamu**', '📉 **Ways to cut spending, based on your data**')]
  let total = 0
  d.cats.filter(([n]) => WANTS.includes(n) || n === 'Food & Beverages').slice(0, 3).forEach(([name, amt]) => {
    const cut = amt * (WANTS.includes(name) ? 0.2 : 0.1); total += cut
    lines.push(tr(`• **${name}** (${c.money(amt)}): coba pangkas ${WANTS.includes(name) ? '20%' : '10%'}, hemat ~${c.money(cut)}.`, `• **${name}** (${c.money(amt)}): try trimming ${WANTS.includes(name) ? '20%' : '10%'}, saving ~${c.money(cut)}.`))
  })
  const rec = recurringItems(c, d).filter(r => /langganan|netflix|spotify|youtube|subscription/i.test(r.name))
  if (rec.length) lines.push(tr(`• Cek langganan rutin (${rec.map(r => r.name).join(', ')}). Masih dipakai semua?`, `• Review recurring subscriptions (${rec.map(r => r.name).join(', ')}). Still using all of them?`))
  const big = [...d.expList].sort((a, b) => b.amount - a.amount)[0]
  if (big) lines.push(tr(`• Transaksi terbesar: ${big.name} (${c.money(big.amount)}). Apakah ini kebutuhan atau keinginan?`, `• Biggest single expense: ${big.name} (${c.money(big.amount)}). Need or want?`))
  if (total > 0) lines.push('', tr(`Potensi hemat sekitar **${c.money(total)}** per bulan. Itu bisa langsung masuk tabungan.`, `Potential savings of about **${c.money(total)}** a month, ready to move into savings.`))
  lines.push(tr('Tips praktis: tunda belanja non-esensial 24 jam, dan pasang batas anggaran per kategori.', 'Practical tips: wait 24 hours before non-essential purchases, and set category budget limits.'))
  return { text: lines.join('\n'), followUps: [tr('Bagaimana cara mengatur budget?', 'How do I set a budget?'), tr('Bagaimana cara meningkatkan tabungan?', 'How can I increase my savings?')] }
}

function budgetAdvice(c: Ctx): BotResult {
  const d = derive(c)
  if (!d.allocated) {
    const nd = needData(d)
    if (nd) return nd
    const suggestions = d.cats.slice(0, 3).map(([n, a]) => `• ${n}: ${c.money(Math.ceil((a * 0.95) / 1000) * 1000)}`)
    return { text: [tr('Kamu belum mengatur anggaran bulanan. Dari pola pengeluaranmu, batas awal yang realistis:', 'You have not set a monthly budget yet. Based on your spending, realistic starting limits:'), ...suggestions, tr('Atur di menu **Anggaran Bulanan**. Mulai dari kategori terbesar.', 'Set them in **Monthly Budget**, starting with your biggest categories.')].join('\n'), followUps: [tr('Bagaimana cara mengatur budget?', 'How do I set a budget?')] }
  }
  const lines: string[] = [tr(`💳 **Anggaran ${d.when}**`, `💳 **Budget, ${d.when}**`), tr(`Terpakai **${pct(d.util)}** (${c.money(d.expenses)} dari ${c.money(d.allocated)}). Sisa ${c.money(Math.max(0, d.allocated - d.expenses))}.`, `**${pct(d.util)}** used (${c.money(d.expenses)} of ${c.money(d.allocated)}). ${c.money(Math.max(0, d.allocated - d.expenses))} left.`), '']
  const over = d.budgetRows.filter(r => r.pct >= 100), near = d.budgetRows.filter(r => r.pct >= 80 && r.pct < 100)
  if (over.length) { lines.push(tr('🔴 **Melewati batas**', '🔴 **Over limit**')); over.forEach(r => lines.push(`• ${r.category}: ${c.money(r.actual)} / ${c.money(r.limit)} (${pct(r.pct)})`)) }
  if (near.length) { lines.push(tr('🟠 **Hampir habis**', '🟠 **Almost used up**')); near.forEach(r => lines.push(`• ${r.category}: ${pct(r.pct)}, ${tr('sisa', 'left')} ${c.money(r.limit - r.actual)}`)) }
  if (!over.length && !near.length) lines.push(tr('🟢 Semua kategori masih aman.', '🟢 All categories are still safe.'))
  const unbudgeted = d.cats.filter(([n]) => !d.budgetRows.some(r => r.category === n))
  if (unbudgeted.length) lines.push('', tr(`Belum ada batas untuk: ${unbudgeted.slice(0, 3).map(([n]) => n).join(', ')}.`, `No limit set for: ${unbudgeted.slice(0, 3).map(([n]) => n).join(', ')}.`))
  if (over.length) lines.push('', tr('💡 **Solusi**: hentikan pengeluaran non-esensial di kategori itu, atau geser anggaran dari kategori yang masih longgar. Jangan menutupnya dengan utang.', '💡 **Fix**: pause non-essential spending there, or shift budget from a category with room. Do not cover it with debt.'))
  if (d.isCurrent && d.daysLeft > 0 && d.allocated > d.expenses) lines.push(tr(`Sisa anggaran bisa dipakai ~${c.money((d.allocated - d.expenses) / d.daysLeft)}/hari sampai akhir bulan (${d.daysLeft} hari).`, `The remaining budget allows ~${c.money((d.allocated - d.expenses) / d.daysLeft)}/day for the last ${d.daysLeft} days.`))
  return { text: lines.join('\n'), followUps: [tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?'), tr('Buatkan strategi keuangan bulan ini', 'Plan my finances this month')] }
}

function allocationAdvice(c: Ctx, q: string): BotResult {
  const d = derive(c)
  const given = parseAmount(q.replace(/50\/30\/20/g, ''))
  const base = given && given.amount >= 100000 ? given.amount : d.income
  if (!base) return { text: tr('Supaya saranku tepat, berapa gaji atau pemasukan bulananmu? Contoh: “gajiku 5jt, bagaimana membaginya?”. Atau catat pemasukanmu dulu di MONETRA.', 'To give precise advice, what is your monthly income? Example: “my salary is 5m, how should I split it?”. Or log your income in MONETRA first.'), followUps: [tr('Panduan fitur MONETRA', 'MONETRA feature guide')] }
  const lines: string[] = [tr(`🧮 **Pembagian ideal untuk ${c.money(base)}** (aturan 50/30/20)`, `🧮 **Ideal split for ${c.money(base)}** (50/30/20 rule)`),
    tr(`• 50% kebutuhan (makan, transport, tagihan, tempat tinggal): **${c.money(base * 0.5)}**`, `• 50% needs (food, transport, bills, housing): **${c.money(base * 0.5)}**`),
    tr(`• 30% keinginan & hiburan: **${c.money(base * 0.3)}**`, `• 30% wants & fun: **${c.money(base * 0.3)}**`),
    tr(`• 20% tabungan / dana darurat / cicilan utang: **${c.money(base * 0.2)}**`, `• 20% savings / emergency fund / debt repayment: **${c.money(base * 0.2)}**`)]
  if (/sehari|harian|daily|hari/i.test(q)) {
    const days = d.daysInMonth
    lines.push('', tr(`Kebutuhan harian (makan + transport) wajarnya sekitar 25 hingga 30% dari pemasukan, yaitu **${c.money((base * 0.25) / days)} sampai ${c.money((base * 0.3) / days)} per hari**.`, `Daily essentials (food + transport) typically take 25 to 30% of income: **${c.money((base * 0.25) / days)} to ${c.money((base * 0.3) / days)} per day**.`))
  }
  if (d.income > 0 && !given) {
    const needs = d.cats.filter(([n]) => NEEDS.includes(n)).reduce((a, [, v]) => a + v, 0)
    const wants = d.cats.filter(([n]) => WANTS.includes(n)).reduce((a, [, v]) => a + v, 0)
    lines.push('', tr('**Kondisimu sekarang**', '**Where you stand**'), tr(`• Kebutuhan ${pct((needs / d.income) * 100)} · Keinginan ${pct((wants / d.income) * 100)} · Sisa/tabungan ${pct(d.savingsRate)}`, `• Needs ${pct((needs / d.income) * 100)} · Wants ${pct((wants / d.income) * 100)} · Left/savings ${pct(d.savingsRate)}`))
    if (wants / d.income > 0.3) lines.push(tr('Keinginan melebihi 30%, jadi di situlah ruang penghematannya.', 'Wants exceed 30%, so that is where to trim.'))
  }
  lines.push('', tr('Sesuaikan persentasenya dengan situasimu. Kalau kebutuhan pokok sudah besar, pertahankan tabungan minimal 10%.', 'Adjust the percentages to your situation. If essentials are already large, keep savings at 10% minimum.'))
  return { text: lines.join('\n'), followUps: [tr('Bagaimana cara meningkatkan tabungan?', 'How can I increase my savings?'), tr('Analisis pengeluaran saya', 'Analyze my spending')] }
}

function monthStrategy(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  const lines: string[] = [tr(`📅 **Strategi keuangan ${d.when}**`, `📅 **Financial plan, ${d.when}**`), ...overview(c, d), '']
  const steps: string[] = []
  if (d.allocated > 0) {
    if (d.isCurrent && d.daysLeft > 0) steps.push(tr(`Sisa anggaran ${c.money(Math.max(0, d.allocated - d.expenses))} untuk ${d.daysLeft} hari: batas harian ~${c.money(Math.max(0, d.allocated - d.expenses) / d.daysLeft)}.`, `${c.money(Math.max(0, d.allocated - d.expenses))} budget left for ${d.daysLeft} days: ~${c.money(Math.max(0, d.allocated - d.expenses) / d.daysLeft)}/day.`))
    const hot = d.budgetRows.filter(r => r.pct >= 80)
    if (hot.length) steps.push(tr(`Kunci dulu kategori yang hampir habis: ${hot.map(r => r.category).join(', ')}.`, `Lock down the almost-full categories first: ${hot.map(r => r.category).join(', ')}.`))
  } else steps.push(tr('Pasang anggaran per kategori, mulai dari kategori terbesarmu.', 'Set per-category budgets, starting with your biggest categories.'))
  if (d.isCurrent && d.income > 0 && d.projected > d.income) steps.push(tr(`Laju sekarang memproyeksikan ${c.money(d.projected)} di akhir bulan, melebihi pemasukan. Kurangi ~${c.money((d.projected - d.income) / Math.max(1, d.daysLeft))}/hari.`, `Current pace projects ${c.money(d.projected)} at month-end, above income. Trim ~${c.money((d.projected - d.income) / Math.max(1, d.daysLeft))}/day.`))
  if (d.income > 0) steps.push(tr(`Targetkan menabung minimal ${c.money(d.income * 0.2)} (20% pemasukan). Pindahkan lebih awal, bukan menunggu sisa.`, `Aim to save at least ${c.money(d.income * 0.2)} (20% of income). Move it early rather than waiting for leftovers.`))
  const goal = d.activeGoals[0]
  if (goal) steps.push(tr(`Alokasikan setoran untuk target “${goal.name}” (sisa ${c.money(Math.max(0, goal.target - goal.saved))}).`, `Allocate a deposit to your “${goal.name}” goal (${c.money(Math.max(0, goal.target - goal.saved))} to go).`))
  if (d.owed.iOwe > 0) steps.push(tr(`Jadwalkan pembayaran utang (sisa ${c.money(d.owed.iOwe)}), utamakan yang jatuh tempo.`, `Schedule debt payments (${c.money(d.owed.iOwe)} left), due ones first.`))
  steps.push(tr('Catat setiap pengeluaran di hari yang sama agar analisis tetap akurat.', 'Log every expense the same day to keep the analysis accurate.'))
  lines.push(tr('**Langkah yang kusarankan**', '**Suggested steps**'), ...steps.slice(0, 6).map((s, i) => `${i + 1}. ${s}`))
  return { text: lines.join('\n'), followUps: [tr('Apakah keuangan saya sehat?', 'Is my financial health good?'), tr('Evaluasi target tabungan saya', 'Evaluate my savings goals')] }
}

function weeklyEval(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d)
  if (!d.hasAny) return nd!
  const end = new Date(`${c.today}T12:00:00`)
  const iso = (n: number) => { const x = new Date(end); x.setDate(x.getDate() - n); return isoOf(x) }
  const inRange = (t: Tx, from: string, to: string) => t.date >= from && t.date <= to
  const thisW = c.transactions.filter(t => inRange(t, iso(6), c.today)), lastW = c.transactions.filter(t => inRange(t, iso(13), iso(7)))
  const e1 = sumBy(thisW, 'expense'), e0 = sumBy(lastW, 'expense'), i1 = sumBy(thisW, 'income')
  if (!thisW.length) return { text: tr('Belum ada transaksi dalam 7 hari terakhir. Catat dulu supaya evaluasi mingguannya bisa kubuat.', 'No transactions in the last 7 days. Log some so I can build the weekly review.') }
  const cat = new Map<string, number>(); thisW.filter(t => t.type === 'expense').forEach(t => cat.set(t.category, (cat.get(t.category) || 0) + t.amount))
  const top = [...cat.entries()].sort((a, b) => b[1] - a[1])[0]
  const lines = [tr('🗓️ **Evaluasi 7 hari terakhir**', '🗓️ **Last 7 days review**'), `${tr('Pemasukan', 'Income')}: ${c.money(i1)}`, `${tr('Pengeluaran', 'Spending')}: **${c.money(e1)}** (${c.money(e1 / 7)}/${tr('hari', 'day')})`]
  if (e0 > 0) { const diff = ((e1 - e0) / e0) * 100; lines.push(tr(`Dibanding 7 hari sebelumnya: ${diff >= 0 ? 'naik' : 'turun'} ${pct(Math.abs(diff))}.`, `Vs the previous 7 days: ${diff >= 0 ? 'up' : 'down'} ${pct(Math.abs(diff))}.`)) }
  if (top) lines.push(tr(`Kategori terbesar minggu ini: ${top[0]} (${c.money(top[1])}).`, `Top category this week: ${top[0]} (${c.money(top[1])}).`))
  lines.push(e0 > 0 && e1 > e0 * 1.2 ? tr('💡 Pengeluaran minggu ini cukup naik. Coba tahan belanja non-esensial beberapa hari.', '💡 Spending jumped this week. Try pausing non-essentials for a few days.') : tr('💡 Ritme pengeluaranmu minggu ini stabil. Pertahankan!', '💡 Your pace is steady this week. Keep going!'))
  return { text: lines.join('\n'), followUps: [tr('Analisis pengeluaran saya', 'Analyze my spending'), tr('Buatkan strategi keuangan bulan ini', 'Plan my finances this month')] }
}

function compareMonths(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  if (!d.prevExpenses) return { text: tr('Belum ada data pengeluaran bulan sebelumnya untuk dibandingkan.', 'No spending data from the previous month to compare yet.') }
  const diff = ((d.expenses - d.prevExpenses) / d.prevExpenses) * 100
  const lines = [tr(`📊 **${d.monthName} vs bulan sebelumnya**`, `📊 **${d.monthName} vs previous month**`), tr(`Pengeluaran: ${c.money(d.expenses)} vs ${c.money(d.prevExpenses)} (${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%)`, `Spending: ${c.money(d.expenses)} vs ${c.money(d.prevExpenses)} (${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%)`)]
  if (d.prevIncome > 0) lines.push(tr(`Pemasukan: ${c.money(d.income)} vs ${c.money(d.prevIncome)}`, `Income: ${c.money(d.income)} vs ${c.money(d.prevIncome)}`))
  const moves = [...new Set([...d.cats.map(x => x[0]), ...d.prevCats.keys()])].map(n => [n, (d.cats.find(x => x[0] === n)?.[1] || 0) - (d.prevCats.get(n) || 0)] as [string, number]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3)
  moves.forEach(([n, v]) => lines.push(`• ${n}: ${v >= 0 ? '+' : '−'}${c.money(Math.abs(v))}`))
  return { text: lines.join('\n'), followUps: [tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?')] }
}

function balanceAnswer(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  const tail = d.balance < 0 ? tr('Saldomu negatif bulan ini. Kurangi pengeluaran dan hindari menambah utang.', 'Your balance is negative this month. Cut spending and avoid new debt.') : d.savingsRate >= 20 ? tr('Bagus, sisa dananya sehat. Sisihkan sebagian untuk tabungan.', 'Nice, a healthy surplus. Set part of it aside as savings.') : tr('Sisa dana cukup tipis, jaga laju pengeluaranmu.', 'The surplus is thin, watch your spending pace.')
  return { text: [tr(`💵 **Ringkasan ${d.when}**`, `💵 **Summary, ${d.when}**`), ...overview(c, d), tr(`Rasio tabung: ${pct(Math.max(0, d.savingsRate))}`, `Savings rate: ${pct(Math.max(0, d.savingsRate))}`), '', tail].join('\n'), followUps: [tr('Berikan saran keuangan saya', 'Give me financial advice'), tr('Analisis pengeluaran saya', 'Analyze my spending')] }
}

function healthAnswer(c: Ctx): BotResult {
  const d0 = derive(c); const nd = needData(d0); if (nd) return nd
  const h = healthScore(c)
  const icon = h.score >= 80 ? '🟢' : h.score >= 60 ? '🟡' : h.score >= 40 ? '🟠' : '🔴'
  const lines = [tr(`⚠️ **Skor kesehatan keuangan ${h.d.when}**`, `⚠️ **Financial health score, ${h.d.when}**`), `${icon} **${h.score}/100** · ${h.label}`, '', tr('**Rincian**', '**Breakdown**'), ...h.parts.map(p => `• ${p.name}: ${Math.round(p.got)}/${p.max} (${p.note})`)]
  const weakest = [...h.parts].sort((a, b) => (b.max - b.got) - (a.max - a.got)).filter(p => p.max - p.got >= 3).slice(0, 2)
  if (weakest.length) {
    lines.push('', tr('**Cara menaikkan skor**', '**How to raise it**'))
    weakest.forEach(p => {
      const how: Record<string, string> = {
        [tr('Tabungan', 'Savings')]: tr('Sisihkan minimal 20% pemasukan di awal bulan.', 'Set aside at least 20% of income early in the month.'),
        [tr('Arus kas', 'Cash flow')]: tr('Jaga pengeluaran di bawah 70% dari pemasukan.', 'Keep spending under 70% of income.'),
        [tr('Anggaran', 'Budget')]: tr('Atur batas tiap kategori dan jangan sampai melewatinya.', 'Set a limit per category and stay inside it.'),
        [tr('Target tabungan', 'Savings goals')]: tr('Buat satu target tabungan dan setor rutin.', 'Create one savings goal and deposit regularly.'),
        [tr('Utang', 'Debt')]: tr('Lunasi utang yang jatuh tempo lebih dulu.', 'Pay off due debts first.')
      }
      lines.push(`• ${p.name}: ${how[p.name] || ''}`)
    })
  }
  lines.push('', tr('Skor ini estimasi dari data MONETRA-mu, bukan penilaian resmi.', 'This score is an estimate from your MONETRA data, not an official rating.'))
  return { text: lines.join('\n'), followUps: [tr('Buatkan strategi keuangan bulan ini', 'Plan my finances this month'), tr('Bagaimana cara meningkatkan tabungan?', 'How can I increase my savings?')] }
}

// ---------------------------------------------------------------- savings advisor
const goalMath = (c: Ctx, g: GoalLite) => {
  const remaining = Math.max(0, g.target - g.saved)
  const days = g.date ? Math.ceil((new Date(`${g.date}T12:00:00`).getTime() - new Date(`${c.today}T12:00:00`).getTime()) / 864e5) : null
  return { remaining, days, perDay: days && days > 0 ? remaining / days : null, perWeek: days && days > 0 ? remaining / (days / 7) : null, perMonth: days && days > 0 ? remaining / (days / 30.44) : null }
}

function goalsEval(c: Ctx): BotResult {
  const d = derive(c)
  if (!c.goals.length) return { text: tr('Kamu belum punya target tabungan. Buat satu di menu **Target Tabungan** (nama, jumlah target, tanggal tujuan), lalu aku bantu hitung berapa yang perlu disisihkan.', 'You have no savings goals yet. Create one in **Savings Goals** (name, target, deadline) and I will work out how much to set aside.'), followUps: [tr('Bagaimana membuat target tabungan?', 'How do I create a savings goal?')] }
  const lines: string[] = [tr('🎯 **Evaluasi target tabungan**', '🎯 **Savings goals review**')]
  if (d.capacity > 0) lines.push(tr(`Kemampuan menabungmu rata-rata ~**${c.money(d.capacity)}/bulan**.`, `Your average saving capacity is ~**${c.money(d.capacity)}/month**.`))
  c.goals.forEach(g => {
    const p = g.target > 0 ? (g.saved / g.target) * 100 : 0
    if (g.completed || p >= 100) { lines.push('', `✅ **${g.name}**: ${tr('tercapai!', 'achieved!')} ${c.money(g.saved)}`); return }
    const m = goalMath(c, g)
    lines.push('', `**${g.name}**${g.paused ? tr(' (dijeda)', ' (paused)') : ''}: ${c.money(g.saved)} / ${c.money(g.target)} (${pct(p)})`, tr(`Sisa ${c.money(m.remaining)}`, `${c.money(m.remaining)} to go`))
    if (m.days !== null && m.days <= 0) lines.push(tr('⏰ Tanggal tujuan sudah lewat. Pertimbangkan memperpanjang tenggat.', '⏰ The deadline has passed. Consider extending it.'))
    else if (m.perMonth !== null) {
      lines.push(tr(`Agar tepat waktu: ${c.money(m.perMonth)}/bulan · ${c.money(m.perWeek!)}/minggu · ${c.money(m.perDay!)}/hari`, `To hit the deadline: ${c.money(m.perMonth)}/month · ${c.money(m.perWeek!)}/week · ${c.money(m.perDay!)}/day`))
      if (d.capacity > 0) lines.push(d.capacity >= m.perMonth ? tr('Sesuai kemampuanmu, tetap konsisten ya 💪', 'Within your capacity, keep it consistent 💪') : tr(`Kurang ~${c.money(m.perMonth - d.capacity)}/bulan dari kemampuanmu. Tambah penghasilan, pangkas keinginan, atau perpanjang tenggat.`, `~${c.money(m.perMonth - d.capacity)}/month short of your capacity. Boost income, trim wants, or extend the deadline.`))
    }
  })
  const motiv = c.goals.some(g => g.target > 0 && g.saved / g.target >= 0.5 && g.saved < g.target) ? tr('Kamu sudah melewati separuh jalan di salah satu target. Terus lanjut!', 'You are past halfway on a goal. Keep going!') : tr('Mulai kecil tidak apa-apa. Yang penting rutin.', 'Starting small is fine. Consistency matters most.')
  lines.push('', `✨ ${motiv}`)
  return { text: lines.join('\n'), followUps: [tr('Bagaimana cara meningkatkan tabungan?', 'How can I increase my savings?'), tr('Buatkan strategi keuangan bulan ini', 'Plan my finances this month')] }
}

function savingsSim(c: Ctx, q: string): BotResult | null {
  const per = q.match(new RegExp(`${AMT}\\s*(?:per|/|tiap|setiap|sebulan|seminggu|sehari)\\s*(bulan|minggu|hari|month|week|day)?`, 'i'))
  const perUnit = per ? (/minggu|seminggu|week/i.test(per[0]) ? 'week' : /hari|sehari|day/i.test(per[0]) ? 'day' : 'month') : null
  const tgt = q.match(new RegExp(`(?:target|untuk|ingin|mau|beli|capai|goal)\\s*(?:sebesar|senilai|rp\\.?)?\\s*${AMT}`, 'i'))
  const monthlyOf = (n: number, u: string) => (u === 'week' ? n * 4.345 : u === 'day' ? n * 30.44 : n)
  if (!per && !tgt) return null
  const lines: string[] = [tr('🧮 **Simulasi tabungan**', '🧮 **Savings simulation**')]
  const target = tgt ? toNumber(tgt[0].replace(/^[^\d]*/, '')) : 0
  const contribution = per && perUnit ? monthlyOf(toNumber(per[0]), perUnit) : 0
  if (target > 0 && contribution > 0) {
    const months = Math.ceil(target / contribution)
    lines.push(tr(`Menabung ${c.money(contribution)}/bulan untuk target ${c.money(target)} butuh sekitar **${months} bulan** (${(months / 12).toFixed(1)} tahun).`, `Saving ${c.money(contribution)}/month toward ${c.money(target)} takes about **${months} months** (${(months / 12).toFixed(1)} years).`))
  } else if (target > 0) {
    lines.push(tr(`Untuk mengumpulkan ${c.money(target)}, kamu perlu menyisihkan:`, `To build ${c.money(target)} you would need to set aside:`))
    ;[6, 12, 24].forEach(m => lines.push(tr(`• ${m} bulan: ${c.money(target / m)}/bulan · ${c.money(target / (m * 4.345))}/minggu · ${c.money(target / (m * 30.44))}/hari`, `• ${m} months: ${c.money(target / m)}/month · ${c.money(target / (m * 4.345))}/week · ${c.money(target / (m * 30.44))}/day`)))
    const cap = derive(c).capacity
    if (cap > 0) lines.push('', tr(`Dengan kemampuan menabungmu ~${c.money(cap)}/bulan, estimasinya **${Math.ceil(target / cap)} bulan**.`, `At your capacity of ~${c.money(cap)}/month, about **${Math.ceil(target / cap)} months**.`))
  } else if (contribution > 0) {
    lines.push(tr(`Menabung ${c.money(contribution)}/bulan terkumpul **${c.money(contribution * 6)}** dalam 6 bulan dan **${c.money(contribution * 12)}** dalam 1 tahun.`, `Saving ${c.money(contribution)}/month builds **${c.money(contribution * 6)}** in 6 months and **${c.money(contribution * 12)}** in a year.`))
  }
  lines.push(tr('Ini hitungan sederhana tanpa bunga atau imbal hasil.', 'This is a simple calculation without interest or returns.'))
  return { text: lines.join('\n'), followUps: [tr('Evaluasi target tabungan saya', 'Evaluate my savings goals'), tr('Bagaimana cara meningkatkan tabungan?', 'How can I increase my savings?')] }
}

function savingsImprove(c: Ctx): BotResult {
  const d = derive(c); const nd = needData(d); if (nd) return nd
  const lines: string[] = [tr('💰 **Cara meningkatkan tabunganmu**', '💰 **Ways to grow your savings**')]
  if (d.income > 0) lines.push(tr(`Rasio tabungmu ${d.when}: **${pct(Math.max(0, d.savingsRate))}** (${c.money(Math.max(0, d.balance))}). Targetnya 20% atau ${c.money(d.income * 0.2)}.`, `Your savings rate ${d.when}: **${pct(Math.max(0, d.savingsRate))}** (${c.money(Math.max(0, d.balance))}). Target is 20%, or ${c.money(d.income * 0.2)}.`))
  if (d.capacity > 0) lines.push(tr(`Kemampuan menabung rata-rata: ~${c.money(d.capacity)}/bulan (${c.money(d.capacity / 4.345)}/minggu, ${c.money(d.capacity / 30.44)}/hari).`, `Average saving capacity: ~${c.money(d.capacity)}/month (${c.money(d.capacity / 4.345)}/week, ${c.money(d.capacity / 30.44)}/day).`))
  lines.push('', tr('**Strategi**', '**Strategies**'), tr('1. Bayar dirimu dulu: pindahkan tabungan begitu pemasukan masuk.', '1. Pay yourself first: move savings as soon as income arrives.'))
  const gap = d.income > 0 ? d.income * 0.2 - Math.max(0, d.balance) : 0
  const topWant = d.cats.find(([n]) => WANTS.includes(n))
  if (gap > 0 && topWant) lines.push(tr(`2. Untuk menutup selisih ${c.money(gap)}, mulai dari ${topWant[0]} (${c.money(topWant[1])}).`, `2. To close the ${c.money(gap)} gap, start with ${topWant[0]} (${c.money(topWant[1])}).`))
  else lines.push(tr('2. Pertahankan kebiasaan sekarang dan naikkan setoran sedikit demi sedikit.', '2. Keep your current habit and raise deposits a little at a time.'))
  lines.push(tr('3. Beri tujuan pada tabunganmu lewat menu Target Tabungan.', '3. Give your savings a purpose in Savings Goals.'), tr('4. Pakai kenaikan penghasilan atau bonus untuk tabungan, bukan gaya hidup.', '4. Put raises and bonuses toward savings, not lifestyle.'))
  return { text: lines.join('\n'), followUps: [tr('Evaluasi target tabungan saya', 'Evaluate my savings goals'), tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?')] }
}

// ---------------------------------------------------------------- debt manager
function debtAdvice(c: Ctx, q: string): BotResult {
  const d = derive(c); const o = d.owed
  const edu = /edukasi|apa itu|belajar|tips|learn|educat|manage|kelola|mengelola/i.test(q)
  if (!c.debts.length && !edu) return { text: tr('Belum ada catatan utang atau piutang. Catat di menu **Utang** (nama, jumlah, jatuh tempo), lalu aku bisa membantu menyusun prioritas dan simulasi pembayaran.', 'No debt records yet. Add them in **Debts** (person, amount, due date) and I can help prioritize and simulate repayments.'), followUps: [tr('Bagaimana cara menggunakan menu Utang?', 'How do I use Debts?')] }
  const lines: string[] = [tr('🧾 **Manajemen utang**', '🧾 **Debt management**')]
  if (c.debts.length) {
    lines.push(tr(`Utangmu: **${c.money(o.iOwe)}** (${o.borrowed.length} catatan) · Piutang: **${c.money(o.owedToMe)}** (${o.lent.length} catatan)`, `You owe: **${c.money(o.iOwe)}** (${o.borrowed.length}) · Owed to you: **${c.money(o.owedToMe)}** (${o.lent.length})`))
    if (o.borrowed.length) {
      const order = [...o.borrowed].sort((a, b) => ((a.due && a.due < c.today ? 0 : 1) - (b.due && b.due < c.today ? 0 : 1)) || (a.due || '9999').localeCompare(b.due || '9999') || remainingOf(a) - remainingOf(b))
      lines.push('', tr('**Urutan pembayaran yang disarankan**', '**Suggested repayment order**'))
      order.slice(0, 5).forEach((x, i) => lines.push(`${i + 1}. ${x.person}: ${c.money(remainingOf(x))}${x.due ? ` · ${tr('jatuh tempo', 'due')} ${x.due}${x.due < c.today ? ' ⚠️' : ''}` : ''}`))
      lines.push(tr('Dahulukan yang lewat atau paling dekat jatuh tempo, lalu yang nominalnya terkecil agar beban cepat berkurang.', 'Pay overdue or nearest-due first, then the smallest balance to clear obligations quickly.'))
      const pay = parseAmount(q)
      const budget = pay && pay.amount >= 10000 ? pay.amount : d.capacity * 0.5
      if (budget > 0) {
        const months = Math.ceil(o.iOwe / budget)
        lines.push('', tr(`**Simulasi**: dengan ${c.money(budget)}/bulan${pay ? '' : ' (50% kemampuan menabungmu)'}, seluruh utang lunas sekitar **${months} bulan**.`, `**Simulation**: at ${c.money(budget)}/month${pay ? '' : ' (50% of your saving capacity)'}, all debt clears in about **${months} months**.`), tr('Hitungan ini tanpa bunga, karena MONETRA tidak mencatat bunga.', 'No interest is included, since MONETRA does not record interest.'))
      } else lines.push('', tr('Aku belum bisa menyimulasikan karena belum ada sisa dana bulanan. Sebutkan nominal cicilan, misalnya “simulasi bayar utang 500rb per bulan”.', 'I cannot simulate yet as there is no monthly surplus. Give an amount, e.g. “simulate paying 500k a month”.'))
      if (d.income > 0 && o.iOwe > d.income * 0.3) lines.push('', tr('⚠️ Total utang sudah di atas 30% pemasukan bulanan. Hindari utang baru sampai turun.', '⚠️ Total debt is over 30% of monthly income. Avoid new debt until it drops.'))
    }
    if (o.overdueL.length) lines.push('', tr(`📩 ${o.overdueL.length} piutang sudah lewat jatuh tempo. Pertimbangkan menagihnya.`, `📩 ${o.overdueL.length} receivable(s) are past due. Consider following up.`))
  }
  if (edu || !c.debts.length) lines.push('', tr('**Prinsip dasar**', '**Basics**'), tr('• Utang untuk kebutuhan produktif lebih aman daripada untuk gaya hidup.', '• Debt for productive needs is safer than for lifestyle.'), tr('• Cicilan total sebaiknya di bawah 30% pemasukan.', '• Keep total repayments under 30% of income.'), tr('• Jangan menutup utang dengan utang baru.', '• Never cover debt with new debt.'))
  return { text: lines.join('\n'), followUps: [tr('Apakah keuangan saya sehat?', 'Is my financial health good?'), tr('Berikan saran keuangan saya', 'Give me financial advice')] }
}

function savingTips(c: Ctx): BotResult {
  const d = derive(c)
  const base: string[] = [tr('Catat setiap pengeluaran, sekecil apa pun.', 'Log every expense, however small.'), tr('Pisahkan tabungan di awal bulan (bayar dirimu dulu).', 'Separate savings at the start of the month (pay yourself first).'), tr('Bedakan kebutuhan dan keinginan sebelum membeli; tunda 24 jam untuk keinginan.', 'Separate needs from wants before buying; wait 24 hours on wants.'), tr('Pasang batas anggaran per kategori di Anggaran Bulanan.', 'Set per-category limits in Monthly Budget.'), tr('Tinjau langganan rutin tiap bulan.', 'Review recurring subscriptions monthly.')]
  const lines = [tr('💡 **Cara menghemat uang**', '💡 **How to save money**'), ...base.map(b => `• ${b}`)]
  if (d.hasAny && d.cats[0]) lines.push('', tr(`Dari datamu, titik awal terbaik adalah **${d.cats[0][0]}** (${c.money(d.cats[0][1])}).`, `From your data, the best place to start is **${d.cats[0][0]}** (${c.money(d.cats[0][1])}).`))
  return { text: lines.join('\n'), followUps: [tr('Analisis pengeluaran saya', 'Analyze my spending'), tr('Bagaimana mengurangi pengeluaran?', 'How can I reduce spending?'), tr('Bagaimana membagi uang untuk kebutuhan, tabungan, dan hiburan?', 'How should I split money between needs, savings, and fun?')] }
}

// ---------------------------------------------------------------- the router
const QUESTION = /\?|\b(apa|apakah|bagaimana|gimana|berapa|kapan|kenapa|mengapa|bisakah|bolehkah|how|what|when|why|can i|should|is my|do i)\b/i

export function answerQuestion(c: Ctx, raw: string): BotResult {
  const q = raw.trim(), l = q.toLowerCase()
  const amt = parseAmount(q)

  if (/^(hai|halo|hi|hello|hey|pagi|siang|sore|malam)\b/.test(l) && q.length < 20) return { text: tr('Halo! Ada yang bisa kubantu soal keuanganmu hari ini?', 'Hello! How can I help with your finances today?'), followUps: [tr('Berikan saran keuangan saya', 'Give me financial advice'), tr('Panduan fitur MONETRA', 'MONETRA feature guide')] }
  if (/^(terima kasih|makasih|thanks|thank you|thx)/.test(l)) return { text: tr('Sama-sama! Senang bisa membantu 😊', 'You are welcome! Happy to help 😊') }
  if (/(hapus|bersihkan|clear|reset|delete).{0,10}(chat|percakapan|obrolan)/.test(l)) return { text: tr('Untuk menghapus percakapan, tekan ikon tempat sampah di kanan atas chat ini. Transaksi yang sudah tersimpan tidak ikut terhapus.', 'To clear the conversation, press the trash icon at the top right of this chat. Saved transactions are not affected.') }

  const g = guideFor(l); if (g) return g

  // Transaction draft: an amount, not phrased as a question or a savings/planning request.
  if (amt && amt.amount > 0 && !QUESTION.test(q) && !/target|nabung|menabung|simulasi|simulate|savings?\b|save\b/i.test(l)) {
    const type: TxType = /gaji|terima|dapat|bonus|salary|received|income|earned|freelance|masuk/i.test(q) ? 'income' : 'expense'
    const date = /kemarin|yesterday/i.test(q) ? isoOf(new Date(Date.now() - 864e5)) : c.today
    let name = q.replace(amt.matched, ' ').replace(/\b(tadi|pagi|siang|malam|sore|kemarin|barusan|yesterday|today|hari ini|this morning|just now|rp|idr)\b/gi, ' ').replace(/\s+/g, ' ').trim()
    name = name ? name.charAt(0).toUpperCase() + name.slice(1) : tr('Transaksi', 'Transaction')
    return { draft: { name, amount: amt.amount, type, category: guessCategory(q, type, c.expenseCats, c.incomeCats), date } }
  }

  if (/(evaluasi|evaluate|review|progres|progress|cek|check).*(target|goal|tabungan|saving)|target tabungan saya|my (savings )?goals?/i.test(l)) return goalsEval(c)
  if (/utang|hutang|piutang|cicil|debt|loan|pinjam/i.test(l)) return debtAdvice(c, q)
  if (amt && /nabung|menabung|tabung|target|simulasi|simulate|save|saving/i.test(l)) { const s = savingsSim(c, q); if (s) return s }
  if (/(meningkatkan|tingkatkan|menambah|naikkan|memperbesar|increase|improve|boost|grow).*(tabungan|menabung|saving)|kemampuan menabung|berapa.*(bisa )?(nabung|menabung|save)|saving capacity/i.test(l)) return savingsImprove(c)
  if (/sehat|health|skor|score/i.test(l)) return healthAnswer(c)
  if (/strateg|rencana|plan\b|planning|buatkan.*bulan|make.*month/i.test(l)) return monthStrategy(c)
  if (/mingguan|minggu ini|seminggu|weekly|this week|7 hari|7 days/i.test(l)) return weeklyEval(c)
  if (/bulan lalu|banding|compare|last month|previous month|bulan sebelumnya/i.test(l)) return compareMonths(c)
  if (/anggaran|budget|batas pengeluaran|spending limit/i.test(l)) return budgetAdvice(c)
  if (/(urang|turun|pangkas|potong|irit|reduce|cut|lower|trim).*(pengeluaran|belanja|spending|expense|cost)|boros|hemat.*(pengeluaran)|potensi penghematan|penghematan/i.test(l)) return reduceSpending(c)
  if (/analis|analy[sz]e|kebiasaan|pola|habit|pattern|berulang|recurring|terbesar|paling (banyak|besar)|biggest|highest|most|top\b|kategori/i.test(l)) return spendingAnalysis(c)
  if (/gaji|salary|membagi|bagi uang|pembagian|alokasi|split|allocate|50\/30\/20|kebutuhan sehari|sehari-hari|daily (needs|expenses)|ideal/i.test(l)) return allocationAdvice(c, q)
  if (/hemat|menghemat|tips|irit|save money|saving tips|cara menabung/i.test(l)) return savingTips(c)
  if (/sisa|saldo|balance|remaining|left|kondisi|ringkasan|summary/i.test(l)) return balanceAnswer(c)
  if (/saran|advice|advis|rekomendasi|recommend|konsultasi|insight|suggest/i.test(l)) return financialSummary(c)
  if (/tabungan|menabung|saving/i.test(l)) return savingsImprove(c)

  return {
    text: tr('Aku belum menangkap maksudmu. Kamu bisa mencatat transaksi (mis. “makan siang 32rb”), meminta analisis dan saran, atau menanyakan fungsi menu MONETRA. Pilih salah satu di bawah ya.', 'I did not quite get that. You can log a transaction (e.g. “lunch 32k”), ask for analysis and advice, or ask what a MONETRA menu does. Pick one below.'),
    followUps: [tr('Berikan saran keuangan saya', 'Give me financial advice'), tr('Analisis pengeluaran saya', 'Analyze my spending'), tr('Panduan fitur MONETRA', 'MONETRA feature guide')]
  }
}
