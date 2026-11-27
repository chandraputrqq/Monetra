import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Sparkles, X, ArrowUp, Trash2, Mic } from 'lucide-react'
import { t, getLang } from './i18n'
import { answerQuestion, dailyInsight, greeting, postSaveInsight } from './natasya-brain'
import type { BotAction, BotResult, Budget, DebtLite, Draft, GoalLite, Tx } from './natasya-brain'
import type { Challenge } from './features'
import { parseVoice } from './insights'
import type { Plan, Rec } from './insights'

type Msg = { id: number; from: 'bot' | 'me'; text?: string; draft?: Draft; status?: 'pending' | 'saved' | 'cancelled'; followUps?: string[]; action?: BotAction; actionStatus?: 'pending' | 'done' | 'cancelled' }

// Cadangan teks: kalau i18n.ts di perangkat belum terbarui, kunci mentah (mis. "n.q15") tidak pernah tampil.
const FB: Record<string, [string, string]> = {
  'n.q15': ['Cari pengeluaran janggal.', 'Find unusual spending.'], 'n.q16': ['Langganan saya.', 'My subscriptions.'],
  'n.q17': ['Bagi gaji ke amplop.', 'Split my salary into envelopes.'], 'n.q18': ['Bulatkan jadi tabungan.', 'Round up into savings.'],
  'n.mic': ['Catat lewat suara', 'Log by voice'], 'n.micStop': ['Berhenti merekam', 'Stop recording'],
  'n.listening': ['Mendengarkan… sebutkan transaksinya', 'Listening… say your transaction'],
  'n.noMic': ['Browser ini belum mendukung suara. Ketik saja kalimatnya.', 'This browser has no speech support. Type the sentence instead.'],
  'n.micErr': ['Mikrofon tidak bisa dipakai. Izinkan akses mikrofon atau ketik kalimatnya.', 'Microphone unavailable. Allow access or type the sentence.'],
  'n.voiceFail': ['Nominalnya belum terdengar. Coba: “kopi dua puluh lima ribu”.', 'Could not catch an amount. Try: “coffee 25k”.'],
  'n.confirm': ['Ya, lakukan', 'Yes, do it'], 'n.done': ['Sudah dilakukan', 'Done'], 'n.moved': ['Dipindahkan ke tabungan', 'Moved to savings'],
  'n.planSet': ['Pembagian amplop diperbarui', 'Envelope split updated'], 'n.markSet': ['Langganan ditandai', 'Subscription marked'],
}
const tn = (k: string): string => { const v = t(k); return v === k && FB[k] ? FB[k][getLang() === 'id' ? 0 : 1] : v }
const QUICK: { icon: string; key: string }[] = [
  { icon: '👋', key: 'n.q9' }, { icon: '✨', key: 'n.q10' },
  { icon: '💡', key: 'n.q1' }, { icon: '📊', key: 'n.q2' }, { icon: '💰', key: 'n.q3' }, { icon: '🎯', key: 'n.q4' },
  { icon: '⚠️', key: 'n.q5' }, { icon: '📅', key: 'n.q6' }, { icon: '📉', key: 'n.q7' },
  { icon: '🔎', key: 'n.q15' }, { icon: '🔁', key: 'n.q16' }, { icon: '💌', key: 'n.q17' }, { icon: '🪙', key: 'n.q18' },
  { icon: '🔮', key: 'n.q11' }, { icon: '🆚', key: 'n.q12' }, { icon: '🗓️', key: 'n.q13' }, { icon: '🏆', key: 'n.q14' }, { icon: '❓', key: 'n.q8' }
]
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// 1.2 to 2 seconds: ~1.5s by default, a little longer for long answers (never feels sluggish).
const typingDelay = (len: number) => (len < 160 ? 1200 : len < 450 ? 1500 : 1900)

// **bold** inside one line
const inline = (line: string): ReactNode[] => line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part)
// Each line fades in with a tiny stagger (capped) so long answers stay pleasant without feeling slow.
const RichText = ({ text }: { text: string }) => <>{text.split('\n').map((line, i) => line === '' ? <div key={i} className="nat-gap" /> : <div key={i} className="nat-line" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>{inline(line)}</div>)}</>

type ChatProps = {
  open: boolean; onClose: () => void; onOpen: () => void
  transactions: Tx[]; budgets: Budget[]; goals?: GoalLite[]; debts?: DebtLite[]; challenges?: Challenge[]; month: string
  money: (n: number) => string
  expenseCats: string[]; incomeCats: string[]
  onSave: (tx: Tx) => void
  // Fitur pintar (dulu halaman Asisten Pintar) dan suara kini ada di chat ini.
  recurring?: Rec[]; plan?: Plan; subMarks?: Record<string, 'used' | 'unused'>; roundStep?: number; roundDone?: Record<string, number>
  cat?: (c: string) => string
  onPatch?: (key: string, value: unknown) => void
  onDeposit?: (goalId: string, amount: number) => void
  onToast?: (m: string) => void
}

export function NatasyaChat(props: ChatProps) {
  const { open, onClose, onOpen, money, expenseCats, incomeCats, onSave } = props
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [teaser, setTeaser] = useState('')
  // Tetap ter-mount ±220ms setelah ditutup supaya transisi keluar (fade/slide) bisa tampil.
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const id = window.setTimeout(() => setMounted(false), 220)
    return () => window.clearTimeout(id)
  }, [open])
  const idRef = useRef(1)
  const timerRef = useRef<number | null>(null)
  const tokenRef = useRef(0)
  const endRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  propsRef.current = props

  const ctx = useCallback(() => {
    const p = propsRef.current
    return { transactions: p.transactions, budgets: p.budgets, goals: p.goals || [], debts: p.debts || [], challenges: p.challenges || [], recurring: p.recurring || [], plan: p.plan, subMarks: p.subMarks, roundStep: p.roundStep, roundDone: p.roundDone, cat: p.cat, month: p.month, today: todayIso(), money: p.money, expenseCats: p.expenseCats, incomeCats: p.incomeCats }
  }, [])

  const cancelPending = useCallback(() => {
    tokenRef.current++
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null }
    setTyping(false)
  }, [])

  // Cleanup on unmount: no timer survives the component.
  useEffect(() => () => { tokenRef.current++; if (timerRef.current !== null) window.clearTimeout(timerRef.current) }, [])
  // Closing the chat cancels any answer that is still "being typed".
  useEffect(() => { if (!open) { cancelPending(); setConfirmClear(false) } }, [open, cancelPending])

  // Fokus ke chat: halaman di belakang tidak bisa di-scroll/diklik selama chat terbuka.
  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const gap = window.innerWidth - root.clientWidth
    const prevOverflow = root.style.overflow, prevPad = document.body.style.paddingRight
    root.style.overflow = 'hidden'
    if (gap > 0) document.body.style.paddingRight = gap + 'px'
    root.classList.add('chat-open')
    const bg = Array.from(document.querySelectorAll<HTMLElement>('.sidebar, .main-area, .bottom-nav'))
    bg.forEach(el => el.setAttribute('inert', ''))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') propsRef.current.onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      root.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPad
      root.classList.remove('chat-open')
      bg.forEach(el => el.removeAttribute('inert'))
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Opening: greeting with today's insight (also after Clear chat).
  useEffect(() => {
    if (open && msgs.length === 0) setMsgs([{ id: idRef.current++, from: 'bot', text: greeting(ctx()) }])
  }, [open, msgs.length, ctx])
  useEffect(() => {
    if (!open) return
    try { window.localStorage.setItem('monetra-natasya-seen-' + todayIso(), '1') } catch { /* storage unavailable */ }
    setTeaser('')
  }, [open])

  // Daily insight teaser next to the button, once per day, when MONETRA opens.
  useEffect(() => {
    if (open) return
    let seen = false
    try { seen = !!window.localStorage.getItem('monetra-natasya-seen-' + todayIso()) } catch { /* ignore */ }
    if (seen) return
    const show = window.setTimeout(() => setTeaser(dailyInsight(ctx())), 1800)
    const hide = window.setTimeout(() => setTeaser(''), 12000)
    return () => { window.clearTimeout(show); window.clearTimeout(hide) }
  }, [open, ctx])

  // Always scroll to the newest message (also while the typing indicator is visible).
  useEffect(() => {
    const body = endRef.current?.parentElement
    if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' })
  }, [msgs, typing, open])

  const botReply = (compute: () => BotResult) => {
    cancelPending()                       // a newer message cancels the older pending answer
    const token = tokenRef.current
    setTyping(true)
    const result = compute()
    const delay = typingDelay((result.text || '').length)
    timerRef.current = window.setTimeout(() => {
      if (token !== tokenRef.current) return
      timerRef.current = null
      setMsgs(m => [...m, { id: idRef.current++, from: 'bot', text: result.text, draft: result.draft, status: result.draft ? 'pending' : undefined, followUps: result.followUps, action: result.action, actionStatus: result.action ? 'pending' : undefined }])
      setTyping(false)
    }, delay)
  }

  const send = (text: string, fromVoice = false) => {
    const q = text.trim()
    if (!q) return
    const previousMessages = msgs
    setMsgs(m => [...m, { id: idRef.current++, from: 'me', text: q }])
    setInput('')

    let local = answerQuestion(ctx(), q)
    // Ucapan seperti “kopi dua puluh lima ribu” (angka berupa kata) dibaca parser suara.
    if (fromVoice && !local.draft) {
      const v = parseVoice(q)
      if (v) local = { draft: { name: v.name, amount: v.amount, type: v.type, category: v.category, date: v.date } }
      else if (!local.action && !local.followUps?.length) { propsRef.current.onToast?.(tn('n.voiceFail')) }
    }
    // Pencatatan transaksi tetap memakai parser lokal dan selalu meminta konfirmasi.
    if (local.draft) {
      botReply(() => ({ ...local, text: tn('n.draft') }))
      return
    }

    botReply(() => ({ ...local, text: local.text || tn('n.aiFallback') }))
  }
  const submit = (e: FormEvent) => { e.preventDefault(); send(input) }
  const patchMsg = (id: number, p: Partial<Msg>) => setMsgs(m => m.map(x => (x.id === id ? { ...x, ...p } : x)))
  const patchDraft = (id: number, p: Partial<Draft>) => setMsgs(m => m.map(x => (x.id === id && x.draft ? { ...x, draft: { ...x.draft, ...p } } : x)))
  const saveDraft = (msg: Msg) => {
    if (!msg.draft || msg.status !== 'pending') return
    const d = msg.draft
    const tx: Tx = { id: Math.random().toString(36).slice(2, 10), name: d.name.trim() || tn('n.defName'), amount: d.amount, type: d.type, category: d.category, date: d.date, notes: 'Natasya' }
    onSave(tx)
    patchMsg(msg.id, { status: 'saved' })
    // Proactive heads-up using the data including the new transaction.
    const heads = postSaveInsight({ ...ctx(), transactions: [tx, ...propsRef.current.transactions] }, tx)
    if (heads) botReply(() => heads)
  }

  // ---- suara (Web Speech API, tanpa server) ----
  const [live, setLive] = useState(false)
  const recRef = useRef<any>(null)
  useEffect(() => () => { try { recRef.current?.abort() } catch { /* abaikan */ } }, [])
  useEffect(() => { if (!open) { try { recRef.current?.abort() } catch { /* abaikan */ } setLive(false) } }, [open])
  const listen = () => {
    if (live) { try { recRef.current?.stop() } catch { /* abaikan */ } return }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { propsRef.current.onToast?.(tn('n.noMic')); return }
    const r = new SR(); r.lang = getLang() === 'id' ? 'id-ID' : 'en-US'; r.interimResults = true; r.continuous = false
    r.onresult = (e: any) => {
      const txt = Array.from(e.results).map((x: any) => x[0].transcript).join(' ')
      setInput(txt)
      if (e.results[e.results.length - 1].isFinal) send(txt, true)
    }
    r.onend = () => setLive(false)
    r.onerror = () => { setLive(false); propsRef.current.onToast?.(tn('n.micErr')) }
    recRef.current = r; setLive(true)
    try { r.start() } catch { setLive(false) }
  }

  // ---- aksi dari fitur pintar: selalu lewat konfirmasi ----
  const runAction = (msg: Msg) => {
    const a = msg.action, p = propsRef.current
    if (!a || msg.actionStatus !== 'pending') return
    if (a.kind === 'roundup') {
      p.onDeposit?.(a.goalId, a.amount)
      p.onPatch?.('roundDone', { ...(p.roundDone || {}), [p.month]: ((p.roundDone || {})[p.month] || 0) + a.amount })
      p.onToast?.(tn('n.moved'))
    } else if (a.kind === 'plan') {
      p.onPatch?.('plan', { needs: a.needs, wants: a.wants })
      p.onToast?.(tn('n.planSet'))
    } else {
      const marks = p.subMarks || {}
      p.onPatch?.('subMarks', { ...marks, [a.name]: a.mark })
      p.onToast?.(tn('n.markSet'))
    }
    setMsgs(m => m.map(x => (x.id === msg.id ? { ...x, actionStatus: 'done' } : x)))
  }

  const clearChat = () => {
    cancelPending()
    idRef.current = 1
    setInput('')
    setConfirmClear(false)
    setMsgs([{ id: idRef.current++, from: 'bot', text: greeting(ctx()) }])
  }

  if (!open && !mounted) return <>
    {teaser && <button className="nat-teaser" onClick={onOpen} aria-label={tn('n.open')}><strong>Natasya</strong><span>{teaser}</span></button>}
    <button className="natasya-fab" onClick={onOpen} aria-label={tn('n.open')}><Sparkles size={22} />{teaser && <i className="nat-dot" />}</button>
  </>

  const last = [...msgs].reverse().find(m => m.from === 'bot')
  const onlyGreeting = msgs.length <= 1
  const strip = !onlyGreeting && last?.followUps?.length ? last.followUps : null
  const canClear = msgs.length > 1 || typing

  return <>
    <button className={`natasya-backdrop ${open ? '' : 'closing'}`} aria-label={tn('n.close')} onClick={onClose} />
    <aside className={`natasya-drawer ${open ? '' : 'closing'}`} aria-label="Natasya">
    <div className="nat-head">
      <div className="nat-avatar">N</div>
      <div><strong>{tn('n.title')}</strong><span>{tn('n.sub')}</span></div>
      <button className="icon-button nat-clear" onClick={() => setConfirmClear(true)} disabled={!canClear} aria-label={tn('n.clear')} title={tn('n.clear')}><Trash2 size={17} /></button>
      <button className="icon-button" onClick={onClose} aria-label={tn('n.close')}><X size={18} /></button>
    </div>
    {confirmClear && <div className="nat-confirm" role="alertdialog" aria-label={tn('n.clearTitle')}>
      <div><strong>{tn('n.clearTitle')}</strong><p>{tn('n.clearBody')}</p></div>
      <div className="nat-actions"><button className="secondary-button" onClick={() => setConfirmClear(false)}>{tn('n.clearNo')}</button><button className="danger-button" onClick={clearChat}>{tn('n.clearYes')}</button></div>
    </div>}
    <div className="nat-body" role="log" aria-live="polite">
      {msgs.map(m => <div key={m.id} className={`nat-msg ${m.from}`}>
        {m.text && <RichText text={m.text} />}
        {m.draft && <>
          <div className="nat-draft">
            {m.status === 'pending' ? <>
              <label>{tn('n.name')}<input value={m.draft.name} onChange={e => patchDraft(m.id, { name: e.target.value })} /></label>
              <label>{tn('n.category')}<select value={m.draft.category} onChange={e => patchDraft(m.id, { category: e.target.value })}>{(m.draft.type === 'income' ? incomeCats : expenseCats).map(c => <option key={c}>{c}</option>)}</select></label>
            </> : <div className="row"><span>{tn('n.name')}</span><span>{m.draft.name}</span></div>}
            <div className="row"><span>{tn('n.amount')}</span><strong>{money(m.draft.amount)}</strong></div>
            {m.status !== 'pending' && <div className="row"><span>{tn('n.category')}</span><span>{m.draft.category}</span></div>}
            <div className="row"><span>{tn('n.date')}</span><span>{m.draft.date}</span></div>
            {m.status === 'pending' && <div className="nat-actions"><button className="primary-button" onClick={() => saveDraft(m)}>{tn('n.save')}</button><button className="secondary-button" onClick={() => patchMsg(m.id, { status: 'cancelled' })}>{tn('n.cancel')}</button></div>}
            {m.status === 'saved' && <span className="nat-state">{tn('n.saved')}</span>}
            {m.status === 'cancelled' && <span className="nat-state off">{tn('n.cancelled')}</span>}
          </div>
          {m.status === 'pending' && <small className="nat-hint">{tn('n.safe')}</small>}
        </>}
        {m.action && <div className="nat-actions">
          {m.actionStatus === 'pending' && <><button className="primary-button" onClick={() => runAction(m)}>{tn('n.confirm')}</button><button className="secondary-button" onClick={() => setMsgs(ms => ms.map(x => (x.id === m.id ? { ...x, actionStatus: 'cancelled' } : x)))}>{tn('n.cancel')}</button></>}
          {m.actionStatus === 'done' && <span className="nat-state">{tn('n.done')}</span>}
          {m.actionStatus === 'cancelled' && <span className="nat-state off">{tn('n.cancelled')}</span>}
        </div>}
      </div>)}
      {onlyGreeting && !typing && <div className="nat-quick" aria-label={tn('n.quickLabel')}>
        {QUICK.map(q => <button key={q.key} onClick={() => send(tn(q.key))}><span aria-hidden="true">{q.icon}</span>{tn(q.key)}</button>)}
      </div>}
      {typing && <div className="nat-msg bot nat-typing" role="status" aria-live="polite">
        <span className="nat-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="nat-typing-text">{tn('n.typing')}</span>
      </div>}
      <div ref={endRef} />
    </div>
    {!onlyGreeting && <div className="nat-chips" aria-label={tn('n.quickLabel')}>
      {strip ? strip.map(f => <button key={f} onClick={() => send(f)}>{f}</button>) : QUICK.map(q => <button key={q.key} onClick={() => send(tn(q.key))}><span aria-hidden="true">{q.icon}</span> {tn(q.key)}</button>)}
    </div>}
    <form className="nat-form" onSubmit={submit}>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder={live ? tn('n.listening') : tn('n.placeholder')} aria-label={tn('n.placeholder')} />
      <button type="button" className={`nat-mic ${live ? 'xt-live' : ''}`} onClick={listen} aria-pressed={live} aria-label={live ? tn('n.micStop') : tn('n.mic')} title={live ? tn('n.micStop') : tn('n.mic')}><Mic size={18} /></button>
      <button type="submit" aria-label={tn('n.send')} disabled={!input.trim()}><ArrowUp size={18} /></button>
    </form>
    <p className="nat-note">{tn('n.privacy')}</p>
  </aside>
  </>
}

export function ReminderNotice({ percent, left, onClose, onChat }: { percent: number; left: string; onClose: () => void; onChat: () => void }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const id = window.setTimeout(() => closeRef.current(), 15000)
    return () => window.clearTimeout(id)
  }, [])
  const over = percent >= 100
  return <div className="reminder-notice" role="status">
    <div className="reminder-avatar">N</div>
    <div className="reminder-copy">
      <strong>{t('rem.title')}</strong> <small>{t('rem.when')}</small>
      <p>{over ? t('rem.over', { pct: Math.round(percent) }) : t('rem.warn', { pct: Math.round(percent), left })}</p>
      <button className="text-link" onClick={onChat}>{t('rem.btn')}</button>
    </div>
    <button className="icon-button" onClick={onClose} aria-label={tn('n.close')}><X size={16} /></button>
  </div>
}

// Reminder per jam: kata-kata semangat dari Natasya.
export function QuoteNotice({ text, onClose, onChat }: { text: string; onClose: () => void; onChat: () => void }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const id = window.setTimeout(() => closeRef.current(), 20000)
    return () => window.clearTimeout(id)
  }, [text])
  return <div className="reminder-notice quote" role="status">
    <div className="reminder-avatar">N</div>
    <div className="reminder-copy">
      <strong>{t('rem.title')}</strong> <small>{t('rem.when')}</small>
      <p>{text}</p>
      <button className="text-link" onClick={onChat}>{t('rem.hi')}</button>
    </div>
    <button className="icon-button" onClick={onClose} aria-label={tn('n.close')}><X size={16} /></button>
  </div>
}
