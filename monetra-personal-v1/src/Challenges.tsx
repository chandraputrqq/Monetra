import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Trash2, Flame, Trophy, Target, Check, X, Circle, CalendarDays } from 'lucide-react'
import { getLang } from './i18n'
import { addDays, challengeBadges, challengeRule, challengeTitle, evaluateChallenge } from './features'
import type { Challenge, ChallengeKind } from './features'

type Tx = { id: string; amount: number; type: 'income' | 'expense'; category: string; date: string; recurringId?: string }
type Props = {
  challenges: Challenge[]; transactions: Tx[]; today: string; money: (n: number) => string
  onSave: (c: Challenge) => void; onDelete: (id: string) => void
}
const L = (id: string, en: string) => (getLang() === 'id' ? id : en)
const KINDS: { key: ChallengeKind; icon: string; name: () => string; desc: () => string }[] = [
  { key: 'nospend', icon: '🚫', name: () => L('Hari Tanpa Belanja', 'No-Spend Days'), desc: () => L('Tidak keluar uang sama sekali.', 'Spend nothing at all.') },
  { key: 'nowants', icon: '🛍️', name: () => L('Tanpa Belanja & Hiburan', 'No Shopping & Fun'), desc: () => L('Tahan jajan belanja dan hiburan.', 'Skip shopping and entertainment.') },
  { key: 'dailycap', icon: '🎯', name: () => L('Batas Harian', 'Daily Limit'), desc: () => L('Belanja harian di bawah batasmu.', 'Keep daily spending under your cap.') }
]
const DURATIONS: { days: number; level: number; name: () => string; desc: () => string; level_label: () => string; tag?: () => string }[] = [
  { days: 3, level: 1, name: () => L('Pemanasan', 'Warm-up'), desc: () => L('Coba dulu, cocok untuk pemula.', 'Try it out, great for beginners.'), level_label: () => L('Mudah', 'Easy') },
  { days: 7, level: 2, name: () => L('Seminggu Penuh', 'A Full Week'), desc: () => L('Langkah awal yang pas.', 'A solid first step.'), level_label: () => L('Sedang', 'Medium') },
  { days: 14, level: 3, name: () => L('Dua Minggu', 'Two Weeks'), desc: () => L('Kebiasaan mulai terbentuk.', 'A habit starts to form.'), level_label: () => L('Menantang', 'Challenging') },
  { days: 30, level: 4, name: () => L('Sebulan Penuh', 'A Full Month'), desc: () => L('Untuk yang benar-benar serius.', 'For the truly committed.'), level_label: () => L('Sulit', 'Hard'), tag: () => L('⭐ Master', '⭐ Master') }
]
const fmtWeekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(getLang() === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' })
const uid = () => Math.random().toString(36).slice(2, 10)
const fmtDay = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(getLang() === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })
const digits = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 9)
const group = (v: string) => (v ? new Intl.NumberFormat('id-ID').format(Number(v)) : '')

export function ChallengesPage({ challenges, transactions, today, money, onSave, onDelete }: Props) {
  const [kind, setKind] = useState<ChallengeKind>('nospend')
  const [days, setDays] = useState(7)
  const [cap, setCap] = useState('50000')
  const [error, setError] = useState('')

  const rows = useMemo(() => challenges.map(c => ({ c, r: evaluateChallenge(c, transactions, today) })).sort((a, b) => {
    const rank = (s: string) => (s === 'active' ? 0 : s === 'won' ? 1 : 2)
    return rank(a.r.status) - rank(b.r.status) || b.c.start.localeCompare(a.c.start)
  }), [challenges, transactions, today])
  const badges = useMemo(() => challengeBadges(challenges, transactions, today), [challenges, transactions, today])
  const activeCount = rows.filter(x => x.r.status === 'active').length
  const wonCount = rows.filter(x => x.r.status === 'won').length
  const bestStreak = rows.reduce((m, x) => Math.max(m, x.r.streak), 0)

  const start = () => {
    const capNum = Number(cap)
    if (kind === 'dailycap' && !capNum) { setError(L('Isi batas belanja harian dulu.', 'Enter a daily spending limit first.')); return }
    setError('')
    onSave({ id: uid(), kind, days, start: today, cap: kind === 'dailycap' ? capNum : undefined, createdAt: today })
  }
  const restart = (c: Challenge) => onSave({ ...c, id: uid(), start: today, createdAt: today })

  return <div className="page-stack chl-page">
    <div className="page-heading page-enter"><div><div className="eyebrow"><span />{L('JADIKAN HEMAT SEBAGAI GAME', 'MAKE SAVING A GAME')}</div><h1>{L('Tantangan Hemat', 'Saving Challenges')}</h1><p>{L('Pilih tantangan, catat transaksi seperti biasa, dan MONETRA menghitung streakmu otomatis.', 'Pick a challenge, log transactions as usual, and MONETRA tracks your streak automatically.')}</p></div></div>

    <section className="chl-stats page-enter">
      <div className="panel chl-stat"><Flame size={18} /><strong>{bestStreak}</strong><span>{L('streak terbaik (hari)', 'best streak (days)')}</span></div>
      <div className="panel chl-stat"><Target size={18} /><strong>{activeCount}</strong><span>{L('sedang berjalan', 'in progress')}</span></div>
      <div className="panel chl-stat"><Trophy size={18} /><strong>{wonCount}</strong><span>{L('selesai', 'completed')}</span></div>
    </section>

    <section className="panel chl-new page-enter">
      <div className="panel-heading"><div><span className="panel-kicker">{L('MULAI BARU', 'START NEW')}</span><h2>{L('Pilih tantanganmu', 'Choose your challenge')}</h2></div></div>
      <div className="chl-step first">{L('Langkah 1 — pilih aturan mainnya', 'Step 1 — pick the rules')}</div>
      <div className="chl-kinds" role="radiogroup" aria-label={L('Jenis tantangan', 'Challenge type')}>
        {KINDS.map(k => <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} className={kind === k.key ? 'active' : ''} onClick={() => setKind(k.key)}>
          <span aria-hidden="true">{k.icon}</span><strong>{k.name()}</strong><small>{k.desc()}</small>
        </button>)}
      </div>
      <div className="chl-step">{L('Langkah 2 — berapa lama kamu sanggup?', 'Step 2 — how long can you commit?')}</div>
      <div className="chl-durs" role="radiogroup" aria-label={L('Durasi', 'Duration')}>
        {DURATIONS.map(d => <button key={d.days} type="button" role="radio" aria-checked={days === d.days} className={`chl-dur${days === d.days ? ' active' : ''}`} onClick={() => setDays(d.days)}>
          {days === d.days ? <span className="chl-dur-check"><Check size={13} strokeWidth={3.5} /></span> : d.tag ? <span className="chl-dur-tag">{d.tag()}</span> : null}
          <span className="chl-dur-num">{d.days}<small>{L('hari', 'days')}</small></span>
          <strong>{d.name()}</strong><span className="chl-dur-desc">{d.desc()}</span>
          <span className="chl-lvl" aria-hidden="true">{[1, 2, 3, 4].map(i => <i key={i} className={i <= d.level ? 'f' : ''} />)}<b>{d.level_label()}</b></span>
        </button>)}
      </div>
      {kind === 'dailycap' && <label className="chl-field chl-cap"><span>{L('Batas belanja per hari (Rp)', 'Spending limit per day (Rp)')}</span>
        <input inputMode="numeric" value={group(cap)} onChange={e => setCap(digits(e.target.value))} placeholder="50.000" />
      </label>}
      <div className="chl-summary">
        <span><CalendarDays size={16} /> {L('Mulai', 'Starts')} <b>{L('hari ini', 'today')}, {fmtDay(today)}</b> → {L('selesai', 'ends')} <b>{fmtDay(addDays(today, days - 1))}</b>. {L(`Kamu perlu menang ${days} hari berturut-turut.`, `You need to win ${days} days in a row.`)} {challengeRule({ id: '', kind, days, start: today, cap: Number(cap) }, money)}</span>
        <button type="button" className="primary-button" onClick={start}><Plus size={16} /> {L('Mulai tantangan', 'Start challenge')}</button>
      </div>
      {error && <p className="chl-error" role="alert">{error}</p>}
    </section>

    <section className="chl-list">
      {rows.length === 0 && <div className="panel chl-empty page-enter"><span aria-hidden="true">🌱</span><h2>{L('Belum ada tantangan', 'No challenges yet')}</h2><p>{L('Mulai dengan “7 hari tanpa belanja”. Kecil tapi terasa.', 'Start with “7 no-spend days”. Small but noticeable.')}</p></div>}
      {rows.map(({ c, r }) => <article key={c.id} className={`panel chl-card ${r.status}`}>
        <div className="chl-card-top">
          <div><span className={`chl-status ${r.status}`}>{r.status === 'active' ? L('Berjalan', 'Active') : r.status === 'won' ? L('Selesai 🎉', 'Completed 🎉') : L('Gagal', 'Failed')}</span>
            <h3>{challengeTitle(c, money)}</h3><p>{challengeRule(c, money)}</p></div>
          <div className="chl-card-actions">
            {r.status !== 'active' && <button type="button" className="secondary-button" onClick={() => restart(c)}><RotateCcw size={14} /> {L('Mulai ulang', 'Restart')}</button>}
            <button type="button" className="icon-button" aria-label={L('Hapus tantangan', 'Delete challenge')} onClick={() => { if (window.confirm(L('Hapus tantangan ini?', 'Delete this challenge?'))) onDelete(c.id) }}><Trash2 size={15} /></button>
          </div>
        </div>
        <div className="chl-progress"><div className="chl-bar" aria-hidden="true"><span style={{ width: `${Math.round(r.doneDays / c.days * 100)}%` }} /></div><span className="chl-ratio"><b>{r.doneDays}</b> / {c.days} <small>{L('hari berhasil', 'days won')}</small></span></div>
        <ol className={`chl-track${c.days > 7 ? ' compact' : ''}`} aria-label={L(`${r.doneDays} dari ${c.days} hari berhasil`, `${r.doneDays} of ${c.days} days succeeded`)}>
          {r.days.map((d, i) => {
            const cls = d.state === 'todayfail' ? 'fail' : d.state
            return <li key={d.date} className={`chl-day ${cls}`}>
              <span className="chl-tile">{d.state === 'ok' ? <Check size={22} strokeWidth={3} /> : d.state === 'today' ? <Flame size={22} /> : d.state === 'fail' || d.state === 'todayfail' ? <X size={22} strokeWidth={3} /> : <Circle size={18} strokeDasharray="3 4" />}</span>
              <b>{L(`Hari ${i + 1}`, `Day ${i + 1}`)}{d.date === today ? <em> · {L('Hari ini', 'Today')}</em> : null}</b><small>{fmtWeekday(d.date)}</small>
            </li>
          })}
          <li className={`chl-day goal${r.status === 'won' ? ' reached' : ''}`}><span className="chl-tile"><Trophy size={22} /></span><b>{L('Selesai!', 'Finish!')}</b><small>{L('Dapat lencana', 'Earn a badge')}</small></li>
        </ol>
        {(() => {
          const t = r.days.find(d => d.date === today)
          const [tone, ttl, txt] = r.status === 'won'
            ? ['won', L('Selamat, tantangan selesai! 🎉', 'Congrats, challenge complete! 🎉'), L('Semua hari berhasil kamu lewati. Cek lencana barumu di bawah.', 'You cleared every day. Check your new badges below.')]
            : r.status === 'failed'
              ? ['failed', L(`Streak berhenti di ${r.failedOn ? fmtDay(r.failedOn) : ''}.`, `Streak stopped on ${r.failedOn ? fmtDay(r.failedOn) : ''}.`), L('Tidak apa-apa, semua orang pernah gagal. Tekan “Mulai ulang” untuk mencoba lagi dari hari pertama.', 'No worries, everyone slips. Press “Restart” to try again from day one.')]
              : t?.state === 'today'
                ? ['today', L('Hari ini masih aman — belum ada pelanggaran aturan.', 'Today is still safe — no rule broken yet.'), L('Jaga sampai tengah malam, lalu kotak hari ini otomatis menjadi centang ✓. Kalau kamu mencatat transaksi yang melanggar aturan, kotak berubah merah dan streak berhenti.', 'Hold on until midnight and today turns into a ✓. Log a transaction that breaks the rule and it turns red and the streak stops.')]
                : ['today', L('Tantangan sedang berjalan.', 'Challenge in progress.'), L('Catat transaksimu seperti biasa, streak dihitung otomatis.', 'Log your transactions as usual; the streak is tracked automatically.')]
          return <div className={`chl-say ${tone}`}><div><b>{ttl}</b><p>{txt}</p></div></div>
        })()}
        <div className="chl-legend" aria-hidden="true"><span><i className="ok" />{L('Berhasil', 'Won')}</span><span><i className="today" />{L('Hari ini (sedang dijaga)', 'Today (in progress)')}</span><span><i className="future" />{L('Belum tiba', 'Upcoming')}</span><span><i className="fail" />{L('Gagal (melanggar aturan)', 'Failed (rule broken)')}</span></div>
        <div className="chl-meta">
          <span>{L(`Hari ke-${r.dayNumber} dari ${c.days}`, `Day ${r.dayNumber} of ${c.days}`)}</span>
          <span><Flame size={13} /> {L(`Streak ${r.streak} hari`, `${r.streak}-day streak`)}</span>
          <span>{r.status === 'failed' && r.failedOn ? L(`Terhenti ${fmtDay(r.failedOn)}`, `Stopped ${fmtDay(r.failedOn)}`) : L(`Berakhir ${fmtDay(r.end)}`, `Ends ${fmtDay(r.end)}`)}</span>
        </div>
      </article>)}
    </section>

    <section className="panel page-enter">
      <div className="panel-heading"><div><span className="panel-kicker">{L('KOLEKSI', 'COLLECTION')}</span><h2>{L('Lencana', 'Badges')}</h2></div><span className="chl-count">{badges.filter(b => b.earned).length}/{badges.length}</span></div>
      {(['streak', 'win'] as const).map(g => <div key={g}>
        <div className="chl-sec"><b>{g === 'streak' ? L('JALUR STREAK', 'STREAK PATH') : L('JALUR KEMENANGAN', 'VICTORY PATH')}</b><span>{g === 'streak' ? L('Berhasil berturut-turut tanpa putus', 'Succeed in a row without a break') : L('Selesaikan tantangan sampai akhir', 'Finish challenges to the end')}</span></div>
        <div className="chl-badges">{badges.filter(b => b.group === g).map(b => <div key={b.key} className={b.earned ? 'earned' : ''}>
          <span className="chl-badge-ic" aria-hidden="true">{b.earned || b.cur > 0 ? b.icon : '🔒'}</span><strong>{b.name}</strong><small>{b.hint}</small>
          <div className="chl-bprog"><span style={{ width: `${b.cur / b.tot * 100}%` }} /></div><em>{b.earned ? L('Diraih ✓', 'Earned ✓') : `${b.cur}/${b.tot}`}</em>
        </div>)}</div>
      </div>)}
    </section>
  </div>
}
