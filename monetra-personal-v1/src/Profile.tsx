// Profil Hewan Keuangan: kepribadian keuangan dihitung otomatis dari data nyata
// (transaksi, anggaran, target tabungan, utang), lalu bisa dikustomisasi pengguna.
import { Check, Sparkles, ShieldAlert, Lightbulb, TrendingUp, Flame } from 'lucide-react'
import { getLang } from './i18n'

type Tx = { amount: number; type: 'income' | 'expense'; category: string; date: string }
type Bud = { category: string; limit: number }
type GoalLite = { target: number; saved: number; completed?: boolean; contributions?: { type: string }[] }
type DebtLite = { direction: 'lent' | 'borrowed'; amount: number; due?: string; payments: { amount: number }[] }

export type AnimalKey = 'ant' | 'squirrel' | 'owl' | 'lion' | 'cat' | 'butterfly' | 'fox' | 'turtle' | 'chick'
export type ProfilePrefs = { name: string; motto: string; mode: 'auto' | 'manual'; animal: AnimalKey; accent: string; frame: 'ring' | 'glow' | 'none' }
export const DEFAULT_PROFILE: ProfilePrefs = { name: '', motto: '', mode: 'auto', animal: 'ant', accent: '#9bd6a5', frame: 'ring' }

type S = [string, string] // [Indonesia, English]
const pick = (s: S) => (getLang() === 'id' ? s[0] : s[1])
const L = (id: string, en: string) => (getLang() === 'id' ? id : en)

type Animal = { key: AnimalKey; emoji: string; name: S; title: S; trait: S; strength: S; watch: S; tip: S; how: S }
export const ANIMALS: Animal[] = [
  { key: 'ant', emoji: '🐜', name: ['Semut', 'Ant'], title: ['Si Penabung Disiplin', 'The Disciplined Saver'],
    trait: ['Rajin mencatat dan konsisten menyisihkan uang sedikit demi sedikit, sama seperti semut yang menimbun makanan sebelum musim sulit.', 'Diligent at logging and steadily setting money aside, like an ant stockpiling food before the lean season.'],
    strength: ['Konsisten, rapi, dan tidak mudah tergoda belanja impulsif.', 'Consistent, tidy, and hard to tempt into impulse buys.'],
    watch: ['Kadang terlalu hemat sampai lupa menikmati hasil kerja kerasmu.', 'Sometimes so thrifty you forget to enjoy your hard work.'],
    tip: ['Sisihkan 5% dari tabungan untuk hadiah kecil bagi dirimu sendiri.', 'Set aside 5% of your savings as a small reward for yourself.'],
    how: ['Tingkat tabung tinggi + rajin mencatat hampir tiap hari.', 'High savings rate + logging almost every day.'] },
  { key: 'squirrel', emoji: '🐿️', name: ['Tupai', 'Squirrel'], title: ['Penimbun Dana Masa Depan', 'The Future Hoarder'],
    trait: ['Fokus mengumpulkan cadangan untuk target besar. Setiap setoran ke target terasa seperti menyimpan biji untuk musim dingin.', 'Focused on stockpiling for big goals. Every deposit feels like burying acorns for winter.'],
    strength: ['Punya tujuan jelas dan progres target tabungan yang nyata.', 'Clear goals and real progress on savings targets.'],
    watch: ['Bisa lupa mengatur pengeluaran harian karena terlalu fokus pada target.', 'May neglect daily spending while fixated on goals.'],
    tip: ['Pecah target besar jadi tonggak 25% agar tetap termotivasi.', 'Split big goals into 25% milestones to stay motivated.'],
    how: ['Punya beberapa target tabungan dengan progres tinggi.', 'Several savings goals with strong progress.'] },
  { key: 'owl', emoji: '🦉', name: ['Burung Hantu', 'Owl'], title: ['Perencana Bijak', 'The Wise Planner'],
    trait: ['Selalu berpikir sebelum bertindak. Anggaran sudah disusun dan dipantau, jadi jarang ada kejutan di akhir bulan.', 'Thinks before acting. Budgets are set and watched, so there are few surprises at month-end.'],
    strength: ['Anggaran lengkap, pengeluaran terkendali, utang terkelola.', 'Complete budgets, controlled spending, managed debts.'],
    watch: ['Terlalu banyak menganalisis bisa membuatmu menunda mengambil peluang.', 'Over-analysing can make you postpone opportunities.'],
    tip: ['Tinjau anggaran tiap minggu, bukan hanya akhir bulan.', 'Review your budget weekly, not just at month-end.'],
    how: ['Anggaran terisi di banyak kategori dan pemakaian terkendali.', 'Budgets across many categories with controlled usage.'] },
  { key: 'lion', emoji: '🦁', name: ['Singa', 'Lion'], title: ['Pemimpin Arus Kas', 'The Cash-Flow Leader'],
    trait: ['Arus kasmu positif secara konsisten dan kamu memegang kendali penuh atas uangmu. Utang kecil, surplus rutin.', 'Your cash flow is consistently positive and you are firmly in control. Small debts, regular surplus.'],
    strength: ['Surplus bulanan stabil dan posisi utang sehat.', 'Stable monthly surplus and healthy debt position.'],
    watch: ['Percaya diri berlebihan bisa membuat dana darurat terlupakan.', 'Overconfidence can make you overlook the emergency fund.'],
    tip: ['Alihkan sebagian surplus ke dana darurat atau investasi.', 'Move part of the surplus into an emergency fund or investments.'],
    how: ['Pemasukan lebih besar dari pengeluaran di hampir semua bulan.', 'Income exceeds spending in nearly every month.'] },
  { key: 'cat', emoji: '🐱', name: ['Kucing', 'Cat'], title: ['Santai tapi Cerdas', 'Relaxed but Smart'],
    trait: ['Pengeluaranmu stabil dan tidak berlebihan. Tenang, fleksibel, dan jarang panik soal uang.', 'Your spending is steady and moderate. Calm, flexible, and rarely panicking about money.'],
    strength: ['Pola pengeluaran stabil dari bulan ke bulan.', 'Spending pattern stays steady month to month.'],
    watch: ['Terlalu santai bisa membuat tabungan jalan di tempat.', 'Being too relaxed can leave savings standing still.'],
    tip: ['Aktifkan transaksi berulang untuk menabung otomatis tiap bulan.', 'Set up a recurring entry to save automatically each month.'],
    how: ['Pengeluaran tiga bulan terakhir sangat stabil.', 'Very stable spending over the last three months.'] },
  { key: 'butterfly', emoji: '🦋', name: ['Kupu-kupu', 'Butterfly'], title: ['Penikmat Hidup', 'The Life Enjoyer'],
    trait: ['Kamu menikmati hidup: makan enak, belanja, dan hiburan. Seru dan ekspresif, tetapi tabungan sering jadi korban.', 'You enjoy life: good food, shopping, and fun. Lively and expressive, but savings are often the casualty.'],
    strength: ['Hidupmu berwarna dan kamu tahu apa yang membuatmu bahagia.', 'Your life is colourful and you know what makes you happy.'],
    watch: ['Porsi gaya hidup besar dan tabungan tipis. Hati-hati pengeluaran impulsif.', 'Big lifestyle share and thin savings. Watch out for impulse spending.'],
    tip: ['Pakai aturan 50/30/20 dan tetapkan batas bulanan untuk Hiburan dan Belanja.', 'Try the 50/30/20 rule and set monthly caps for Entertainment and Shopping.'],
    how: ['Porsi Makanan, Belanja, Hiburan, dan Langganan besar; tabungan rendah.', 'Large share on Food, Shopping, Entertainment, Subscriptions; low savings.'] },
  { key: 'fox', emoji: '🦊', name: ['Rubah', 'Fox'], title: ['Pemburu Peluang', 'The Opportunity Hunter'],
    trait: ['Cerdik mencari banyak sumber penghasilan: freelance, bisnis, atau investasi. Kamu tidak bergantung pada satu pintu rezeki.', 'Clever at finding multiple income streams: freelance, business, or investing. You never rely on a single source.'],
    strength: ['Pemasukan beragam sehingga lebih tahan guncangan.', 'Diverse income that withstands shocks.'],
    watch: ['Pemasukan tidak tetap bisa membuat perencanaan sulit.', 'Irregular income can make planning difficult.'],
    tip: ['Tentukan gaji pribadi tetap tiap bulan dari penghasilan tak tentu.', 'Pay yourself a fixed monthly salary out of irregular income.'],
    how: ['Punya 2+ sumber pemasukan, termasuk freelance, bisnis, atau investasi.', '2+ income sources, including freelance, business, or investment.'] },
  { key: 'turtle', emoji: '🐢', name: ['Kura-kura', 'Turtle'], title: ['Pelan tapi Pasti', 'Slow and Steady'],
    trait: ['Kamu tidak terburu-buru, tetapi arahnya benar. Tabunganmu kecil namun tumbuh tanpa putus.', 'You are never in a rush but you head the right way. Savings are small yet grow without pause.'],
    strength: ['Sabar, stabil, dan jarang mengambil risiko berlebihan.', 'Patient, stable, and seldom takes excessive risks.'],
    watch: ['Kecepatan menabung mungkin terlalu lambat untuk mencapai target tepat waktu.', 'Your saving pace may be too slow to hit goals on time.'],
    tip: ['Naikkan setoran 1% tiap bulan, nyaris tidak terasa tapi berdampak besar.', 'Raise deposits by 1% each month: barely noticeable, big impact.'],
    how: ['Tingkat tabung kecil tetapi positif, dengan target tabungan aktif.', 'Small but positive savings rate with an active goal.'] },
  { key: 'chick', emoji: '🐣', name: ['Anak Ayam', 'Chick'], title: ['Pemula yang Baru Menetas', 'Freshly Hatched Beginner'],
    trait: ['Perjalanan keuanganmu baru dimulai. Catat beberapa transaksi dan hewanmu akan segera menetas menjadi kepribadian aslinya.', 'Your money journey has just begun. Log a few transactions and your animal will soon hatch into its true personality.'],
    strength: ['Masih bersih, semua kebiasaan baik bisa dibentuk dari nol.', 'A clean slate: every good habit can be built from zero.'],
    watch: ['Belum cukup data untuk membaca pola keuanganmu.', 'Not enough data yet to read your money pattern.'],
    tip: ['Catat minimal 5 transaksi untuk membuka hewan keuanganmu.', 'Log at least 5 transactions to unlock your money animal.'],
    how: ['Kurang dari 5 transaksi tercatat.', 'Fewer than 5 recorded transactions.'] }
]
export const animalOf = (k: AnimalKey) => ANIMALS.find(a => a.key === k) || ANIMALS[0]

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const mk = (d: string) => d.slice(0, 7)
const shiftMonth = (key: string, off: number) => { const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + off, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export type Analysis = {
  key: AnimalKey
  scores: { key: AnimalKey; score: number }[]
  health: number
  savingsRate: number
  budgetUtil: number | null
  trackDays: number
  incomeSources: number
  lifestyle: number
  overdue: number
  goalPct: number
  level: number; levelName: S; xp: number; xpFrom: number; xpTo: number
  alerts: S[]
}

const LEVELS = [0, 10, 30, 60, 100, 160, 240, 350, 500]
const LEVEL_NAMES: S[] = [['Telur', 'Egg'], ['Menetas', 'Hatching'], ['Pemula', 'Novice'], ['Berkembang', 'Growing'], ['Terampil', 'Skilled'], ['Mahir', 'Adept'], ['Ahli', 'Expert'], ['Master', 'Master'], ['Legenda', 'Legend']]

/** Hitung hewan keuangan dari 3 bulan terakhir (sampai bulan terpilih). */
export function analyze(transactions: Tx[], budgets: Bud[], goals: GoalLite[], debts: DebtLite[], month: string): Analysis {
  const months = [shiftMonth(month, -2), shiftMonth(month, -1), month]
  const win = transactions.filter(t => months.includes(mk(t.date)))
  const inc = win.filter(t => t.type === 'income'), exp = win.filter(t => t.type === 'expense')
  const income = inc.reduce((a, t) => a + t.amount, 0), expenses = exp.reduce((a, t) => a + t.amount, 0)
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
  const allocated = budgets.reduce((a, b) => a + b.limit, 0)
  const spentNow = transactions.filter(t => t.type === 'expense' && mk(t.date) === month).reduce((a, t) => a + t.amount, 0)
  const budgetUtil = allocated > 0 ? (spentNow / allocated) * 100 : null
  const trackDays = new Set(win.map(t => t.date)).size
  const incomeCats = new Set(inc.map(t => t.category))
  const incomeSources = incomeCats.size
  const hasSide = ['Freelance', 'Business', 'Investment Returns'].some(c => incomeCats.has(c))
  const lifestyleCats = ['Entertainment', 'Shopping', 'Food & Beverages', 'Subscriptions']
  const lifestyle = expenses > 0 ? exp.filter(t => lifestyleCats.includes(t.category)).reduce((a, t) => a + t.amount, 0) / expenses : 0
  const perMonth = months.map(m => win.filter(t => t.type === 'expense' && mk(t.date) === m).reduce((a, t) => a + t.amount, 0)).filter(v => v > 0)
  const mean = perMonth.length ? perMonth.reduce((a, v) => a + v, 0) / perMonth.length : 0
  const cv = perMonth.length >= 2 && mean > 0 ? Math.sqrt(perMonth.reduce((a, v) => a + (v - mean) ** 2, 0) / perMonth.length) / mean : 0.5
  const positiveMonths = months.filter(m => { const l = win.filter(t => mk(t.date) === m); const i = l.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0); const e = l.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0); return l.length > 0 && i >= e && i > 0 }).length
  const monthsWithData = months.filter(m => win.some(t => mk(t.date) === m)).length
  const today = todayISO()
  const remainingOf = (d: DebtLite) => Math.max(0, d.amount - d.payments.reduce((a, p) => a + p.amount, 0))
  const overdue = debts.filter(d => remainingOf(d) > 0 && d.due && d.due < today).length
  const owe = debts.filter(d => d.direction === 'borrowed').reduce((a, d) => a + remainingOf(d), 0)
  const goalPct = goals.length ? goals.reduce((a, g) => a + (g.target > 0 ? clamp((g.saved / g.target) * 100) : 0), 0) / goals.length : 0

  const sc: Record<AnimalKey, number> = {
    ant: 0.45 * clamp((savingsRate / 30) * 100) + 0.35 * clamp((trackDays / 25) * 100) + 0.2 * (budgets.length > 0 ? 100 : 0),
    squirrel: 0.6 * goalPct + 0.25 * clamp((goals.length / 3) * 100) + 0.15 * clamp((savingsRate / 20) * 100),
    owl: 0.5 * clamp((budgets.length / 4) * 100) + 0.35 * (budgetUtil === null ? 0 : clamp(100 - Math.max(0, budgetUtil - 85) * 4)) + 0.15 * (overdue === 0 ? 100 : 0),
    lion: 0.5 * (monthsWithData ? (positiveMonths / monthsWithData) * 100 : 0) + 0.3 * clamp((savingsRate / 25) * 100) + 0.2 * (income > 0 && owe < income * 0.1 ? 100 : 30),
    cat: 0.6 * (100 - clamp(cv * 200)) + 0.2 * (lifestyle >= 0.2 && lifestyle <= 0.5 ? 100 : 50) + 0.2 * (savingsRate >= 0 ? 100 : 0),
    butterfly: 0.6 * clamp((lifestyle / 0.6) * 100) + 0.4 * clamp(((20 - savingsRate) / 20) * 100),
    fox: 0.55 * clamp(((incomeSources - 1) / 2) * 100) + 0.45 * (hasSide ? 100 : 0),
    turtle: 0.4 * (savingsRate > 0 ? clamp(100 - Math.abs(savingsRate - 10) * 6) : 0) + 0.3 * clamp((trackDays / 15) * 100) + 0.3 * (goals.length > 0 ? 100 : 0),
    chick: 0
  }
  const scores = (Object.keys(sc) as AnimalKey[]).filter(k => k !== 'chick').map(k => ({ key: k, score: Math.round(clamp(sc[k])) })).sort((a, b) => b.score - a.score)
  const key: AnimalKey = transactions.length < 5 ? 'chick' : scores[0].key

  const health = Math.round(clamp(
    0.35 * clamp((savingsRate / 20) * 100) + 0.25 * (budgetUtil === null ? 40 : clamp(100 - Math.max(0, budgetUtil - 80) * 5)) + 0.2 * (overdue === 0 ? 100 : 30) + 0.2 * (goals.length ? goalPct : 40)
  ))

  const xp = transactions.length + goals.reduce((a, g) => a + (g.contributions || []).filter(c => c.type === 'deposit').length * 5 + (g.completed ? 10 : 0), 0) + debts.reduce((a, d) => a + d.payments.length * 3, 0)
  let level = 0; LEVELS.forEach((v, i) => { if (xp >= v) level = i })
  const xpFrom = LEVELS[level], xpTo = LEVELS[Math.min(level + 1, LEVELS.length - 1)]

  const alerts: S[] = []
  if (budgetUtil !== null && budgetUtil >= 90) alerts.push([`Anggaran bulan ini sudah terpakai ${budgetUtil.toFixed(0)}%.`, `This month's budget is already ${budgetUtil.toFixed(0)}% used.`])
  if (overdue > 0) alerts.push([`${overdue} utang sudah lewat jatuh tempo.`, `${overdue} debt(s) are past due.`])
  if (income > 0 && savingsRate < 0) alerts.push(['Pengeluaran 3 bulan terakhir lebih besar dari pemasukan.', 'Your spending over 3 months exceeded income.'])
  return { key, scores, health, savingsRate, budgetUtil, trackDays, incomeSources, lifestyle, overdue, goalPct, level, levelName: LEVEL_NAMES[level], xp, xpFrom, xpTo, alerts }
}

export const resolveAnimal = (prefs: ProfilePrefs | undefined, a: Analysis): Animal => animalOf((prefs?.mode === 'manual' ? prefs.animal : a.key) || a.key)

export function AnimalAvatar({ animal, accent, frame = 'ring', size = 30 }: { animal: Animal; accent: string; frame?: ProfilePrefs['frame']; size?: number }) {
  return <span className={`pf-avatar pf-frame-${frame}`} style={{ width: size, height: size, fontSize: size * 0.56, ['--pf-accent' as string]: accent, ['--pf-glow' as string]: `${accent}8c` }} aria-hidden="true">{animal.emoji}</span>
}

const ACCENTS = ['#9bd6a5', '#c4a46a', '#88a9b8', '#d18b7e', '#b79fd8', '#e0c36a']
const healthLabel = (h: number): S => h >= 75 ? ['Sangat sehat', 'Very healthy'] : h >= 50 ? ['Cukup sehat', 'Fairly healthy'] : ['Perlu perhatian', 'Needs attention']

type PageProps = { analysis: Analysis; prefs: ProfilePrefs; onChange: (p: ProfilePrefs) => void; txCount: number }

export function ProfilePage({ analysis: a, prefs, onChange, txCount }: PageProps) {
  const animal = resolveAnimal(prefs, a)
  const auto = animalOf(a.key)
  const set = (patch: Partial<ProfilePrefs>) => onChange({ ...prefs, ...patch })
  const xpPct = a.xpTo > a.xpFrom ? clamp(((a.xp - a.xpFrom) / (a.xpTo - a.xpFrom)) * 100) : 100
  const metrics: { label: string; value: string }[] = [
    { label: L('Tingkat tabung (3 bln)', 'Savings rate (3 mo)'), value: `${a.savingsRate.toFixed(0)}%` },
    { label: L('Pemakaian anggaran', 'Budget used'), value: a.budgetUtil === null ? '—' : `${a.budgetUtil.toFixed(0)}%` },
    { label: L('Hari aktif mencatat', 'Active logging days'), value: `${a.trackDays}` },
    { label: L('Sumber pemasukan', 'Income sources'), value: `${a.incomeSources}` },
    { label: L('Porsi gaya hidup', 'Lifestyle share'), value: `${(a.lifestyle * 100).toFixed(0)}%` },
    { label: L('Progres target', 'Goal progress'), value: `${a.goalPct.toFixed(0)}%` }
  ]
  return <div className="page-stack pf-page">
    <div className="page-heading page-enter"><div><div className="eyebrow"><span />{L('KEPRIBADIAN KEUANGAN', 'MONEY PERSONALITY')}</div><h1>{L('Profil Hewan Keuangan', 'Money Animal Profile')}</h1><p>{L('Hewan pendampingmu dibaca dari kebiasaan uangmu yang nyata, lalu bisa kamu kustomisasi.', 'Your companion animal is read from your real money habits, then fully customisable.')}</p></div></div>

    <section className="panel pf-hero page-enter" style={{ ['--pf-accent' as string]: prefs.accent, backgroundColor: '#171a17', backgroundImage: `radial-gradient(ellipse at 90% 0%, ${prefs.accent}38, transparent 55%), linear-gradient(130deg, #1d251e, #171a17)` }}>
      <AnimalAvatar animal={animal} accent={prefs.accent} frame={prefs.frame} size={104} />
      <div className="pf-hero-main">
        <span className="panel-kicker">{pick(animal.name).toUpperCase()} · {prefs.mode === 'auto' ? L('OTOMATIS', 'AUTO') : L('PILIHANMU', 'YOUR PICK')}</span>
        <h2>{prefs.name.trim() || L('Pemilik Monetra', 'Monetra Owner')}</h2>
        <strong className="pf-title" style={{ color: prefs.accent }}>{pick(animal.title)}</strong>
        <p className="pf-motto">{prefs.motto.trim() ? `“${prefs.motto.trim()}”` : L('Tambahkan motto keuanganmu di bawah.', 'Add your money motto below.')}</p>
        <div className="pf-level"><span><Flame size={13} /> {L('Level', 'Level')} {a.level + 1} · {pick(a.levelName)}</span><div className="progress-track"><span style={{ width: `${xpPct}%` }} /></div><small>{a.xp} XP{a.xpTo > a.xpFrom ? ` / ${a.xpTo}` : ` · ${L('maksimal', 'max')}`}</small></div>
      </div>
      <div className="pf-health"><span className="panel-kicker">{L('SKOR KESEHATAN', 'HEALTH SCORE')}</span><strong style={{ color: prefs.accent }}>{a.health}</strong><small>{pick(healthLabel(a.health))}</small></div>
    </section>

    <div className="pf-grid">
      <section className="panel pf-read page-enter">
        <div className="panel-heading"><div><span className="panel-kicker">{L('SIFAT HEWANMU', 'YOUR ANIMAL TRAITS')}</span><h2>{animal.emoji} {pick(animal.name)}: {pick(animal.title)}</h2></div></div>
        <p className="pf-trait">{pick(animal.trait)}</p>
        <div className="pf-points">
          <div><span><Check size={14} /> {L('Kekuatan', 'Strength')}</span><p>{pick(animal.strength)}</p></div>
          <div className="warn"><span><ShieldAlert size={14} /> {L('Waspadai', 'Watch out')}</span><p>{pick(animal.watch)}</p></div>
          <div className="tip"><span><Lightbulb size={14} /> {L('Saran Natasya', "Natasya's tip")}</span><p>{pick(animal.tip)}</p></div>
        </div>
        {prefs.mode === 'manual' && animal.key !== auto.key && <p className="pf-note"><Sparkles size={13} /> {L(`Menurut datamu, hewan aslimu adalah ${pick(auto.name)} ${auto.emoji}. Kamu memakai pilihan manual.`, `Based on your data, your true animal is the ${pick(auto.name)} ${auto.emoji}. You are using a manual pick.`)}</p>}
        {a.alerts.length > 0 && <div className="pf-alerts">{a.alerts.map((x, i) => <p key={i}><ShieldAlert size={13} /> {pick(x)}</p>)}</div>}
      </section>

      <section className="panel pf-match page-enter">
        <div className="panel-heading"><div><span className="panel-kicker">{L('KECOCOKAN DATA', 'DATA MATCH')}</span><h2>{L('Kemiripanmu dengan tiap hewan', 'Your similarity to each animal')}</h2></div><TrendingUp size={17} className="muted-icon" /></div>
        {txCount < 5 ? <p className="muted-note">{L('Catat minimal 5 transaksi untuk membuka analisis hewan.', 'Log at least 5 transactions to unlock the animal analysis.')}</p> : <div className="pf-bars">{a.scores.slice(0, 5).map(s => { const an = animalOf(s.key); return <div key={s.key}><span>{an.emoji} {pick(an.name)}</span><div className="progress-track"><span style={{ width: `${s.score}%` }} /></div><strong>{s.score}%</strong></div> })}</div>}
        <div className="pf-metrics">{metrics.map(m => <div key={m.label}><small>{m.label}</small><strong>{m.value}</strong></div>)}</div>
      </section>
    </div>

    <section className="panel pf-custom page-enter">
      <div className="panel-heading"><div><span className="panel-kicker">{L('KUSTOMISASI', 'CUSTOMISE')}</span><h2>{L('Atur profilmu', 'Make it yours')}</h2></div><span className="autosave-indicator">{L('Tersimpan otomatis', 'Auto-saved')}</span></div>
      <div className="form-row">
        <label>{L('Nama panggilan', 'Nickname')}<input maxLength={24} value={prefs.name} onChange={e => set({ name: e.target.value })} placeholder={L('mis. Nesy', 'e.g. Alex')} /></label>
        <label>{L('Motto keuangan', 'Money motto')}<input maxLength={60} value={prefs.motto} onChange={e => set({ motto: e.target.value })} placeholder={L('mis. Catat dulu, jajan kemudian', 'e.g. Log first, spend later')} /></label>
      </div>
      <div className="pf-row"><span className="pf-label">{L('Warna aksen', 'Accent colour')}</span><div className="pf-swatches">{ACCENTS.map(c => <button key={c} type="button" className={prefs.accent === c ? 'on' : ''} style={{ background: c }} onClick={() => set({ accent: c })} aria-label={c} aria-pressed={prefs.accent === c} />)}</div></div>
      <div className="pf-row"><span className="pf-label">{L('Bingkai', 'Frame')}</span><div className="lang-switch">{(['ring', 'glow', 'none'] as const).map(f => <button key={f} type="button" className={`secondary-button ${prefs.frame === f ? 'selected' : ''}`} aria-pressed={prefs.frame === f} onClick={() => set({ frame: f })}>{f === 'ring' ? L('Cincin', 'Ring') : f === 'glow' ? L('Bercahaya', 'Glow') : L('Polos', 'Plain')}</button>)}</div></div>
      <div className="pf-row"><span className="pf-label">{L('Pilih hewan', 'Choose animal')}</span><div className="lang-switch">
        <button type="button" className={`secondary-button ${prefs.mode === 'auto' ? 'selected' : ''}`} aria-pressed={prefs.mode === 'auto'} onClick={() => set({ mode: 'auto' })}><Sparkles size={14} /> {L('Otomatis dari datamu', 'Auto from my data')}</button>
        <button type="button" className={`secondary-button ${prefs.mode === 'manual' ? 'selected' : ''}`} aria-pressed={prefs.mode === 'manual'} onClick={() => set({ mode: 'manual', animal: animal.key })}>{L('Pilih sendiri', 'Pick myself')}</button>
      </div></div>
    </section>

    <section className="panel pf-catalog page-enter">
      <div className="panel-heading"><div><span className="panel-kicker">{L('KATALOG HEWAN', 'ANIMAL CATALOGUE')}</span><h2>{L('9 hewan keuangan', '9 money animals')}</h2></div></div>
      <div className="pf-cards">{ANIMALS.map(an => { const active = an.key === animal.key, mine = an.key === a.key; return <button type="button" key={an.key} className={`pf-card ${active ? 'active' : ''}`} onClick={() => set({ mode: 'manual', animal: an.key })} aria-pressed={active}>
        <span className="pf-card-emoji">{an.emoji}</span><strong>{pick(an.name)}</strong><em>{pick(an.title)}</em><small>{L('Cara mendapatkan: ', 'How to earn: ')}{pick(an.how)}</small>{mine && <i className="pf-badge">{L('Hewan aslimu', 'Your true animal')}</i>}</button> })}</div>
    </section>
  </div>
}
