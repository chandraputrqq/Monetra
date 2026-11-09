import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Sparkles, X, ArrowUp } from 'lucide-react'
import { t } from './i18n'

type TxType = 'income' | 'expense'
type Tx = { id: string; name: string; amount: number; type: TxType; category: string; date: string; notes?: string }
type Budget = { category: string; limit: number }
type Draft = { name: string; amount: number; type: TxType; category: string; date: string }
type Msg = { id: number; from: 'bot' | 'me'; text?: string; draft?: Draft; status?: 'pending' | 'saved' | 'cancelled' }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// "25rb" -> 25000, "1,5jt" -> 1500000, "32.000" -> 32000
const parseAmount = (text: string): { amount: number; matched: string } | null => {
  const m = text.match(/(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?\b/i)
  if (!m) return null
  const unit = (m[2] || '').toLowerCase()
  let n = /^\d{1,3}([.,]\d{3})+$/.test(m[1]) ? Number(m[1].replace(/[.,]/g, '')) : Number(m[1].replace(',', '.'))
  if (unit === 'rb' || unit === 'ribu' || unit === 'k') n *= 1000
  else if (unit === 'jt' || unit === 'juta') n *= 1_000_000
  return { amount: Math.round(n), matched: m[0] }
}

const guessCategory = (q: string, type: TxType, expenseCats: string[], incomeCats: string[]): string => {
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

type ChatProps = {
  open: boolean; onClose: () => void; onOpen: () => void
  transactions: Tx[]; budgets: Budget[]; month: string
  money: (n: number) => string
  expenseCats: string[]; incomeCats: string[]
  onSave: (tx: Tx) => void
}

export function NatasyaChat({ open, onClose, onOpen, transactions, budgets, month, money, expenseCats, incomeCats, onSave }: ChatProps) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const idRef = useRef(1)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && msgs.length === 0) setMsgs([{ id: idRef.current++, from: 'bot', text: t('n.greet') }])
  }, [open, msgs.length])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open])

  const answer = (q: string): { text?: string; draft?: Draft } => {
    const amt = parseAmount(q)
    if (amt && amt.amount > 0 && !q.includes('?')) {
      const type: TxType = /gaji|terima|dapat|bonus|salary|received|income|earned|freelance/i.test(q) ? 'income' : 'expense'
      const date = /kemarin|yesterday/i.test(q) ? iso(new Date(Date.now() - 864e5)) : iso(new Date())
      let name = q.replace(amt.matched, ' ').replace(/\b(tadi|pagi|siang|malam|sore|kemarin|barusan|yesterday|today|hari ini|this morning|just now|rp|idr)\b/gi, ' ').replace(/\s+/g, ' ').trim()
      name = name ? name.charAt(0).toUpperCase() + name.slice(1) : t('n.defName')
      return { draft: { name, amount: amt.amount, type, category: guessCategory(q, type, expenseCats, incomeCats), date } }
    }
    const mtx = transactions.filter(x => x.date.slice(0, 7) === month)
    const income = mtx.filter(x => x.type === 'income').reduce((a, x) => a + x.amount, 0)
    const exp = mtx.filter(x => x.type === 'expense')
    const expenses = exp.reduce((a, x) => a + x.amount, 0)
    const cats = new Map<string, number>()
    exp.forEach(x => cats.set(x.category, (cats.get(x.category) || 0) + x.amount))
    const top = [...cats.entries()].sort((a, b) => b[1] - a[1])[0]
    const allocated = budgets.reduce((a, b) => a + b.limit, 0)
    const util = allocated > 0 ? (expenses / allocated) * 100 : 0

    if (/hemat|saran|tips|advice|saving/i.test(q)) {
      if (allocated > 0 && util >= 80) return { text: t('n.tipHigh', { cat: top ? top[0] : '-' }) }
      if (top) return { text: t('n.tipTop', { cat: top[0] }) }
      return { text: t('n.tipOk') }
    }
    if (/bulan lalu|banding|compare|last month|previous/i.test(q)) {
      const [y, m] = month.split('-').map(Number)
      const pk = iso(new Date(y, m - 2, 1)).slice(0, 7)
      const prev = transactions.filter(x => x.type === 'expense' && x.date.slice(0, 7) === pk).reduce((a, x) => a + x.amount, 0)
      if (!prev) return { text: t('n.compareNone') }
      const diff = ((expenses - prev) / prev) * 100
      return { text: t('n.compare', { cur: money(expenses), prev: money(prev), diff: `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}%` }) }
    }
    if (/anggaran|budget/i.test(q)) {
      if (!allocated) return { text: t('n.noBudget') }
      return { text: t('n.budget', { pct: util.toFixed(0), used: money(expenses), limit: money(allocated), left: money(Math.max(0, allocated - expenses)) }) }
    }
    if (/sisa|saldo|balance|remaining|left/i.test(q)) {
      if (!mtx.length) return { text: t('n.noData') }
      return { text: t('n.balance', { bal: money(income - expenses), inc: money(income), exp: money(expenses) }) }
    }
    if (/boros|terbesar|paling banyak|biggest|most|highest|top/i.test(q)) {
      if (!top) return { text: t('n.noData') }
      return { text: t('n.top', { cat: top[0], amt: money(top[1]), pct: expenses ? ((top[1] / expenses) * 100).toFixed(0) : '0' }) }
    }
    return { text: t('n.fallback') }
  }

  const send = (text: string) => {
    const q = text.trim()
    if (!q) return
    const r = answer(q)
    setMsgs(m => [...m, { id: idRef.current++, from: 'me', text: q }, { id: idRef.current++, from: 'bot', text: r.text, draft: r.draft, status: r.draft ? 'pending' : undefined }])
    setInput('')
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(input) }
  const patchMsg = (id: number, p: Partial<Msg>) => setMsgs(m => m.map(x => (x.id === id ? { ...x, ...p } : x)))
  const patchDraft = (id: number, p: Partial<Draft>) => setMsgs(m => m.map(x => (x.id === id && x.draft ? { ...x, draft: { ...x.draft, ...p } } : x)))
  const saveDraft = (msg: Msg) => {
    if (!msg.draft) return
    const d = msg.draft
    onSave({ id: Math.random().toString(36).slice(2, 10), name: d.name.trim() || t('n.defName'), amount: d.amount, type: d.type, category: d.category, date: d.date, notes: 'Natasya' })
    patchMsg(msg.id, { status: 'saved' })
  }

  if (!open) return <button className="natasya-fab" onClick={onOpen} aria-label={t('n.open')}><Sparkles size={22} /></button>

  return <aside className="natasya-drawer" aria-label="Natasya">
    <div className="nat-head">
      <div className="nat-avatar">N</div>
      <div><strong>{t('n.title')}</strong><span>{t('n.sub')}</span></div>
      <button className="icon-button" onClick={onClose} aria-label={t('n.close')}><X size={18} /></button>
    </div>
    <div className="nat-body">
      {msgs.map(m => <div key={m.id} className={`nat-msg ${m.from}`}>
        {m.text}
        {m.draft && <>
          <div>{t('n.draft')}</div>
          <div className="nat-draft">
            {m.status === 'pending' ? <>
              <label>{t('n.name')}<input value={m.draft.name} onChange={e => patchDraft(m.id, { name: e.target.value })} /></label>
              <label>{t('n.category')}<select value={m.draft.category} onChange={e => patchDraft(m.id, { category: e.target.value })}>{(m.draft.type === 'income' ? incomeCats : expenseCats).map(c => <option key={c}>{c}</option>)}</select></label>
            </> : <div className="row"><span>{t('n.name')}</span><span>{m.draft.name}</span></div>}
            <div className="row"><span>{t('n.amount')}</span><strong>{money(m.draft.amount)}</strong></div>
            {m.status !== 'pending' && <div className="row"><span>{t('n.category')}</span><span>{m.draft.category}</span></div>}
            <div className="row"><span>{t('n.date')}</span><span>{m.draft.date}</span></div>
            {m.status === 'pending' && <div className="nat-actions"><button className="primary-button" onClick={() => saveDraft(m)}>{t('n.save')}</button><button className="secondary-button" onClick={() => patchMsg(m.id, { status: 'cancelled' })}>{t('n.cancel')}</button></div>}
            {m.status === 'saved' && <span className="nat-state">{t('n.saved')}</span>}
            {m.status === 'cancelled' && <span className="nat-state off">{t('n.cancelled')}</span>}
          </div>
          {m.status === 'pending' && <small className="nat-hint">{t('n.safe')}</small>}
        </>}
      </div>)}
      <div ref={endRef} />
    </div>
    <div className="nat-chips">{['n.chip1', 'n.chip2', 'n.chip3', 'n.chip4'].map(k => <button key={k} onClick={() => send(t(k))}>{t(k)}</button>)}</div>
    <form className="nat-form" onSubmit={submit}>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('n.placeholder')} aria-label={t('n.placeholder')} />
      <button type="submit" aria-label={t('n.send')}><ArrowUp size={18} /></button>
    </form>
    <p className="nat-note">{t('n.privacy')}</p>
  </aside>
}

export function NesyNotice({ percent, left, onClose, onChat }: { percent: number; left: string; onClose: () => void; onChat: () => void }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const id = window.setTimeout(() => closeRef.current(), 15000)
    return () => window.clearTimeout(id)
  }, [])
  const over = percent >= 100
  return <div className="nesy-notice" role="status">
    <div className="nesy-avatar">N</div>
    <div className="nesy-copy">
      <strong>Nesy Meviani</strong> <small>{t('nesy.when')}</small>
      <p>{over ? t('nesy.over', { pct: Math.round(percent) }) : t('nesy.warn', { pct: Math.round(percent), left })}</p>
      <button className="text-link" onClick={onChat}>{t('nesy.btn')}</button>
    </div>
    <button className="icon-button" onClick={onClose} aria-label={t('n.close')}><X size={16} /></button>
  </div>
}
