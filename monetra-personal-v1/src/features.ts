// Fitur tambahan MONETRA: tantangan hemat + rekap bulanan. Murni lokal, dihitung dari data transaksi.
import { getLang } from './i18n'

export type ChallengeKind = 'nospend' | 'nowants' | 'dailycap'
export type Challenge = { id: string; kind: ChallengeKind; days: number; start: string; cap?: number; createdAt?: string }
type Tx = { id: string; amount: number; type: 'income' | 'expense'; category: string; date: string; recurringId?: string }

const L = (id: string, en: string) => (getLang() === 'id' ? id : en)
export const WANTS_CATEGORIES = ['Shopping', 'Entertainment']

export const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const challengeTitle = (c: Challenge, money: (n: number) => string) => {
  if (c.kind === 'nospend') return L(`${c.days} hari tanpa belanja`, `${c.days} no-spend days`)
  if (c.kind === 'nowants') return L(`${c.days} hari tanpa belanja & hiburan`, `${c.days} days without shopping & fun spending`)
  return L(`${c.days} hari di bawah ${money(c.cap || 0)}/hari`, `${c.days} days under ${money(c.cap || 0)}/day`)
}
export const challengeRule = (c: Challenge, money: (n: number) => string) => {
  if (c.kind === 'nospend') return L('Tidak ada pengeluaran sama sekali dalam sehari (tagihan otomatis tidak dihitung).', 'No spending at all in a day (automatic bills do not count).')
  if (c.kind === 'nowants') return L('Tidak ada pengeluaran kategori Belanja atau Hiburan.', 'No spending in the Shopping or Entertainment categories.')
  return L(`Total pengeluaran sehari tidak lebih dari ${money(c.cap || 0)} (tagihan otomatis tidak dihitung).`, `Total daily spending stays within ${money(c.cap || 0)} (automatic bills do not count).`)
}

export type DayState = 'ok' | 'fail' | 'today' | 'todayfail' | 'future'
export type ChallengeResult = {
  status: 'active' | 'won' | 'failed'
  days: { date: string; state: DayState }[]
  streak: number          // hari berhasil berturut-turut sejak mulai (termasuk hari ini jika masih aman)
  doneDays: number        // hari yang sudah lewat dan berhasil
  failedOn?: string
  dayNumber: number       // hari ke-berapa sekarang (1..days)
  end: string
}

const dayOk = (c: Challenge, txs: Tx[]) => {
  const spend = txs.filter(t => t.type === 'expense' && !t.recurringId)
  if (c.kind === 'nospend') return spend.length === 0
  if (c.kind === 'nowants') return !spend.some(t => WANTS_CATEGORIES.includes(t.category))
  return spend.reduce((a, t) => a + t.amount, 0) <= (c.cap || 0)
}

export function evaluateChallenge(c: Challenge, all: Tx[], today: string): ChallengeResult {
  const byDate = new Map<string, Tx[]>()
  all.forEach(t => { const a = byDate.get(t.date); if (a) a.push(t); else byDate.set(t.date, [t]) })
  const days: ChallengeResult['days'] = []
  let failedOn: string | undefined
  let doneDays = 0
  for (let i = 0; i < c.days; i++) {
    const date = addDays(c.start, i)
    let state: DayState
    if (date > today) state = 'future'
    else {
      const ok = dayOk(c, byDate.get(date) || [])
      if (date === today) state = ok ? 'today' : 'todayfail'
      else state = ok ? 'ok' : 'fail'
    }
    if ((state === 'fail' || state === 'todayfail') && !failedOn) failedOn = date
    if (state === 'ok') doneDays++
    days.push({ date, state })
  }
  const end = addDays(c.start, c.days - 1)
  let streak = 0
  for (const d of days) { if (d.state === 'ok' || d.state === 'today') streak++; else break }
  const status: ChallengeResult['status'] = failedOn ? 'failed' : today > end ? 'won' : 'active'
  const dayNumber = Math.max(1, Math.min(c.days, days.filter(d => d.date <= today).length))
  return { status, days, streak, doneDays, failedOn, dayNumber, end }
}

export type Badge = { key: string; icon: string; name: string; hint: string; earned: boolean }
export function challengeBadges(list: Challenge[], all: Tx[], today: string): Badge[] {
  const results = list.map(c => evaluateChallenge(c, all, today))
  const won = results.filter(r => r.status === 'won').length
  const best = results.reduce((m, r) => Math.max(m, r.streak), 0)
  return [
    { key: 'first', icon: '🌱', name: L('Langkah Pertama', 'First Step'), hint: L('Mulai tantangan pertamamu.', 'Start your first challenge.'), earned: list.length > 0 },
    { key: 's3', icon: '🔥', name: L('Streak 3 Hari', '3-Day Streak'), hint: L('Berhasil 3 hari berturut-turut.', 'Succeed 3 days in a row.'), earned: best >= 3 },
    { key: 's7', icon: '⚡', name: L('Streak 7 Hari', '7-Day Streak'), hint: L('Berhasil 7 hari berturut-turut.', 'Succeed 7 days in a row.'), earned: best >= 7 },
    { key: 'w1', icon: '🏅', name: L('Pemenang', 'Winner'), hint: L('Selesaikan 1 tantangan.', 'Finish 1 challenge.'), earned: won >= 1 },
    { key: 'w3', icon: '🏆', name: L('Hemat Sejati', 'True Saver'), hint: L('Selesaikan 3 tantangan.', 'Finish 3 challenges.'), earned: won >= 3 },
    { key: 's30', icon: '👑', name: L('Streak 30 Hari', '30-Day Streak'), hint: L('Berhasil 30 hari berturut-turut.', 'Succeed 30 days in a row.'), earned: best >= 30 }
  ]
}

// ---------------------------------------------------------------- rekap bulanan
export type Recap = {
  month: string; hasData: boolean; isCurrent: boolean
  expenses: number; prevExpenses: number; deltaPct: number | null; diff: number
  topCategory?: { name: string; value: number }
  priciestDay?: { date: string; amount: number }
  noSpendDays: number; daysCounted: number; avgDaily: number
}
const shiftMonth = (key: string, n: number) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export function monthRecap(all: Tx[], month: string, today: string): Recap {
  const inMonth = all.filter(t => t.date.slice(0, 7) === month)
  const exp = inMonth.filter(t => t.type === 'expense')
  const expenses = exp.reduce((a, t) => a + t.amount, 0)
  const cat = new Map<string, number>()
  exp.forEach(t => cat.set(t.category, (cat.get(t.category) || 0) + t.amount))
  const top = [...cat.entries()].sort((a, b) => b[1] - a[1])[0]
  const perDay = new Map<string, number>()
  exp.forEach(t => perDay.set(t.date, (perDay.get(t.date) || 0) + t.amount))
  const pr = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]
  const isCurrent = month === today.slice(0, 7)
  const [y, m] = month.split('-').map(Number)
  const daysCounted = isCurrent ? Number(today.slice(8, 10)) : new Date(y, m, 0).getDate()
  // Bulan berjalan dibandingkan dengan periode tanggal yang sama di bulan lalu, supaya adil.
  const prevKey = shiftMonth(month, -1)
  const prevExpenses = all.filter(t => t.type === 'expense' && t.date.slice(0, 7) === prevKey && Number(t.date.slice(8, 10)) <= daysCounted).reduce((a, t) => a + t.amount, 0)
  let noSpendDays = 0
  for (let d = 1; d <= daysCounted; d++) {
    const iso = `${month}-${String(d).padStart(2, '0')}`
    if (!exp.some(t => t.date === iso && !t.recurringId)) noSpendDays++
  }
  return {
    month, hasData: exp.length > 0, isCurrent, expenses, prevExpenses,
    deltaPct: prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null,
    diff: prevExpenses - expenses,
    topCategory: top ? { name: top[0], value: top[1] } : undefined,
    priciestDay: pr ? { date: pr[0], amount: pr[1] } : undefined,
    noSpendDays, daysCounted, avgDaily: daysCounted > 0 ? expenses / daysCounted : 0
  }
}
