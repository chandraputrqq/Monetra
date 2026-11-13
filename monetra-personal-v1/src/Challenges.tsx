import { useMemo, useState } from 'react'
import { Plus, RotateCcw, Trash2, Flame, Trophy, Target } from 'lucide-react'
import { getLang } from './i18n'
import { challengeBadges, challengeRule, challengeTitle, evaluateChallenge } from './features'
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
const DURATIONS = [3, 7, 14, 30]
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
      <div className="chl-kinds" role="radiogroup" aria-label={L('Jenis tantangan', 'Challenge type')}>
        {KINDS.map(k => <button key={k.key} type="button" role="radio" aria-checked={kind === k.key} className={kind === k.key ? 'active' : ''} onClick={() => setKind(k.key)}>
          <span aria-hidden="true">{k.icon}</span><strong>{k.name()}</strong><small>{k.desc()}</small>
        </button>)}
      </div>
      <div className="chl-row">
        <div className="chl-field"><span>{L('Durasi', 'Duration')}</span>
          <div className="chl-days" role="radiogroup" aria-label={L('Durasi', 'Duration')}>{DURATIONS.map(d => <button key={d} type="button" role="radio" aria-checked={days === d} className={days === d ? 'active' : ''} onClick={() => setDays(d)}>{d} {L('hari', 'days')}</button>)}</div>
        </div>
        {kind === 'dailycap' && <label className="chl-field"><span>{L('Batas per hari (Rp)', 'Limit per day (Rp)')}</span>
          <input inputMode="numeric" value={group(cap)} onChange={e => setCap(digits(e.target.value))} placeholder="50.000" />
        </label>}
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
        <div className="chl-dots" aria-label={L(`${r.doneDays} dari ${c.days} hari berhasil`, `${r.doneDays} of ${c.days} days succeeded`)}>
          {r.days.map(d => <i key={d.date} className={d.state} title={`${fmtDay(d.date)}`} />)}
        </div>
        <div className="chl-meta">
          <span>{L(`Hari ke-${r.dayNumber} dari ${c.days}`, `Day ${r.dayNumber} of ${c.days}`)}</span>
          <span><Flame size={13} /> {L(`Streak ${r.streak} hari`, `${r.streak}-day streak`)}</span>
          <span>{r.status === 'failed' && r.failedOn ? L(`Terhenti ${fmtDay(r.failedOn)}`, `Stopped ${fmtDay(r.failedOn)}`) : L(`Berakhir ${fmtDay(r.end)}`, `Ends ${fmtDay(r.end)}`)}</span>
        </div>
      </article>)}
    </section>

    <section className="panel page-enter">
      <div className="panel-heading"><div><span className="panel-kicker">{L('KOLEKSI', 'COLLECTION')}</span><h2>{L('Lencana', 'Badges')}</h2></div><span className="chl-count">{badges.filter(b => b.earned).length}/{badges.length}</span></div>
      <div className="chl-badges">{badges.map(b => <div key={b.key} className={b.earned ? 'earned' : ''}><span aria-hidden="true">{b.earned ? b.icon : '🔒'}</span><strong>{b.name}</strong><small>{b.hint}</small></div>)}</div>
    </section>
  </div>
}
