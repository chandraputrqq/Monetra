// Halaman & komponen tambahan MONETRA: Wrapped, Asisten Pintar (anomali, langganan, amplop gaji, pembulatan), dan catat lewat suara.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Send, ChevronLeft, ChevronRight, AlertTriangle, Repeat, PiggyBank, Wallet } from 'lucide-react'
import { DEFAULT_PLAN, L, envelope, findAnomalies, parseVoice, roundUp, subscriptions, todayISO, wrapped } from './insights'
import type { Plan, Rec, Tx, VoiceDraft } from './insights'
import { getLang } from './i18n'
import { scene, art, cloudBank } from './pixelScene'
import type { ArtOpt } from './pixelScene'
import './wrapped-pixel.css'

type Fmt = { money: (n: number) => string; cat: (c: string) => string }
const monthName = (i: number) => new Date(2000, i, 1).toLocaleDateString(getLang() === 'id' ? 'id-ID' : 'en-US', { month: 'long' })

/* ------------------------------ MONETRA WRAPPED (pixel-art, gaya game retro) ------------------------------ */
type PCard = { art: string; label?: string; title?: string; count?: { to: number; pre?: string; suf?: string; money?: boolean }; cls?: string; sub: string; opt?: ArtOpt; again?: boolean }
const KIND_PAL: Record<string, number> = { intro: 0, total: 1, cat: 2, month: 3, nospend: 4, big: 5, persona: 6 }
function Count({ to, pre = '', suf = '' }: { to: number; pre?: string; suf?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(to); return }
    let raf = 0; const t0 = performance.now() + 450
    const f = (t: number) => { const p = Math.max(0, Math.min(1, (t - t0) / 1300)); setV(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(f) }
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{pre}{v.toLocaleString('id-ID')}{suf}</>
}
function useTyped(text: string, key: string) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(text.length); return }
    let k = 0, id = 0; const to = window.setTimeout(() => { id = window.setInterval(() => { k++; setN(k); if (k >= text.length) clearInterval(id) }, 28) }, 450)
    return () => { clearTimeout(to); clearInterval(id) }
  }, [text, key])
  return text.slice(0, n)
}
const SR_ONLY = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const
export function WrappedPage({ transactions, goals, money, cat }: Fmt & { transactions: Tx[]; goals: { saved: number }[] }) {
  const now = new Date().getFullYear()
  const years = [...new Set([now, ...transactions.map(t => Number(t.date.slice(0, 4)))])].sort((a, b) => b - a)
  const [year, setYear] = useState(now), [i, setI] = useState(0), [paused, setPaused] = useState(false)
  const down = useRef(0), busy = useRef(false), timers = useRef<number[]>([]), [tr, setTr] = useState(0)
  useEffect(() => () => timers.current.forEach(t => clearTimeout(t)), [])
  const cloud = useMemo(() => `<svg viewBox="0 0 400 1424" preserveAspectRatio="none" aria-hidden="true">${cloudBank()}</svg>`, [])
  const w = useMemo(() => wrapped(transactions, year, todayISO()), [transactions, year])
  const hidden = !/\d/.test(money(1)), saved = goals.reduce((a, g) => a + g.saved, 0)
  const last = year === now ? new Date().getMonth() : 11
  const cards: PCard[] = w ? [
    { art: 'intro', title: `Wrapped ${year}`, sub: L(`${w.count} transaksi tercatat. Siap lihat petualangan uangmu?`, `${w.count} transactions logged. Ready to see your money adventure?`) },
    { art: 'total', label: L('Total pengeluaran', 'Total spending'), count: { to: w.expense, pre: 'Rp ', money: true }, cls: 'm', sub: L(`Pemasukanmu ${money(w.income)}, jadi kamu menyisihkan ${w.rate}%.`, `You earned ${money(w.income)}, so you kept ${w.rate}%.`) },
    ...(w.top ? [{ art: 'cat', label: cat(w.top.name), count: { to: w.top.share, suf: '%' }, sub: L(`Kategori favoritmu: ${money(w.top.value)} dari seluruh pengeluaran.`, `Your top category: ${money(w.top.value)} of all spending.`), opt: { pct: w.top.share } }] : []),
    ...(w.hi && w.lo ? [{ art: 'month', label: L('Boss bulan', 'Boss month'), title: monthName(w.hi.i), sub: L(`Pengeluaran ${money(w.hi.v)}. Paling hemat: ${monthName(w.lo.i)} (${money(w.lo.v)}).`, `Spent ${money(w.hi.v)}. Thriftiest: ${monthName(w.lo.i)} (${money(w.lo.v)}).`), opt: { by: w.byMonth.slice(0, last + 1), letters: Array.from({ length: 12 }, (_, m) => monthName(m)[0].toUpperCase()) } }] : []),
    { art: 'nospend', label: L('Hari tanpa belanja', 'No-spend days'), count: { to: w.noSpend, suf: L(' hari', ' days') }, sub: L(`Combo terbaikmu ${w.best} hari tanpa pengeluaran.`, `Your best combo is ${w.best} days without spending.`), opt: { best: w.best } },
    ...(w.biggest ? [{ art: 'big', label: L('Pengeluaran terbesar', 'Biggest purchase'), count: { to: w.biggest.amount, pre: 'Rp ', money: true }, cls: 'm', sub: `${w.biggest.name}, ${w.biggest.date}.${w.day ? L(` Hari paling boros: ${money(w.day.amount)}.`, ` Priciest day: ${money(w.day.amount)}.`) : ''}` }] : []),
    { art: 'persona', label: L('Level up!', 'Level up!'), title: w.persona.title, cls: 's', again: true, sub: `${w.persona.desc}${saved > 0 ? L(` Total tabunganmu kini ${money(saved)}.`, ` Your savings now hold ${money(saved)}.`) : ''}` }
  ] : []
  const idx = Math.min(i, Math.max(0, cards.length - 1)), c = cards[idx]
  const typed = useTyped(c?.sub || '', `${idx}${year}`)
  const go = (n: number) => {
    const t = Math.max(0, Math.min(cards.length - 1, n))
    if (t === idx || busy.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setI(t); return }
    busy.current = true; setTr(v => v + 1)
    timers.current.push(window.setTimeout(() => setI(t), 600), window.setTimeout(() => { busy.current = false }, 1200))
  }
  return <div className="page-stack">
    <div className="page-heading"><h1>Monetra Wrapped</h1><p>{L('Rekap tahunanmu, dihitung dari transaksi di perangkat ini.', 'Your year in review, calculated from the transactions on this device.')}</p></div>
    <div className="xt-years" role="group" aria-label={L('Pilih tahun', 'Choose year')}>{years.map(y => <button key={y} className={`secondary-button ${y === year ? 'selected' : ''}`} aria-pressed={y === year} onClick={() => { setYear(y); setI(0) }}>{y}</button>)}</div>
    {!c || !w ? <section className="panel"><p>{L(`Belum ada transaksi di ${year}. Catat beberapa transaksi dulu, lalu Wrapped-mu akan muncul di sini.`, `No transactions in ${year} yet. Log a few and your Wrapped will appear here.`)}</p></section>
      : <div className="px-wrap">
        <div className={`px-stage ${paused ? 'paused' : ''}`} tabIndex={0} role="group" aria-label={`Monetra Wrapped ${year}`}
          onKeyDown={e => { if (e.key === 'ArrowRight') go(idx + 1); else if (e.key === 'ArrowLeft') go(idx - 1); else if (e.key === ' ') { e.preventDefault(); setPaused(p => !p) } }}
          onPointerDown={() => { down.current = Date.now() }}
          onPointerUp={e => { if ((e.target as HTMLElement).closest('button')) return; if (Date.now() - down.current < 260) { const r = e.currentTarget.getBoundingClientRect(); go(e.clientX - r.left < r.width * .33 ? idx - 1 : idx + 1) } }}>
          <div className="px-bars" aria-hidden="true">{cards.map((_, k) => <b key={k} className={k < idx ? 'done' : k === idx ? 'cur' : ''}><i onAnimationEnd={k === idx ? () => go(idx + 1) : undefined} /></b>)}</div>
          <div className="px-art" key={`a${idx}${year}`}><svg viewBox="0 0 400 711" preserveAspectRatio="xMidYMid slice" aria-hidden="true" dangerouslySetInnerHTML={{ __html: scene(KIND_PAL[c.art] ?? 0) + art(c.art, c.opt) }} /></div>
          {tr > 0 ? <div className="px-cloud run" key={`c${tr}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: cloud }} /> : null}
          <div className="px-head" key={`h${idx}${year}`}>
            <div className="px-stagel">STAGE {String(idx + 1).padStart(2, '0')}</div>
            {c.label ? <div className="px-label">{c.label}</div> : null}
            <div className={`px-title ${c.cls || ''}`}>{c.count ? (c.count.money && hidden ? money(0) : <Count {...c.count} />) : c.title}</div>
          </div>
          <div className="px-dlg"><span className="px-tag">PLAYER 1</span>
            <span style={SR_ONLY}>{c.sub}</span><p className="px-sub" aria-hidden="true">{typed}</p>
            {c.again ? <button className="px-again" onClick={e => { e.stopPropagation(); go(0) }}>{L('MAIN LAGI', 'PLAY AGAIN')}</button> : null}
            <i className="px-caret" aria-hidden="true" /></div>
        </div>
        <div className="px-ctl"><button className="secondary-button" aria-label={L('Sebelumnya', 'Back')} disabled={idx === 0} onClick={() => go(idx - 1)}><ChevronLeft size={16} /></button><span>{idx + 1}/{cards.length}</span>
          <button className="secondary-button" onClick={() => setPaused(p => !p)}>{paused ? L('Putar', 'Play') : L('Jeda', 'Pause')}</button><button className="primary-button" aria-label={L('Lanjut', 'Next')} disabled={idx === cards.length - 1} onClick={() => go(idx + 1)}><ChevronRight size={16} /></button></div>
      </div>}
  </div>
}

/* ------------------------------ ASISTEN PINTAR ------------------------------ */
type Goal = { id: string; name: string; saved: number; target: number }
export function SmartPage({ transactions, recurring, goals, month, money, cat, plan, subMarks, roundStep, roundDone, onPatch, onDeposit }: Fmt & {
  transactions: Tx[]; recurring: Rec[]; goals: Goal[]; month: string; plan?: Plan; subMarks?: Record<string, 'used' | 'unused'>
  roundStep?: number; roundDone?: Record<string, number>; onPatch: (key: string, value: unknown) => void; onDeposit: (goalId: string, amount: number) => void
}) {
  const today = todayISO(), p = plan || DEFAULT_PLAN, marks = subMarks || {}, step = roundStep || 5000
  const anomalies = useMemo(() => findAnomalies(transactions, today, money, cat), [transactions, today, money, cat])
  const subs = useMemo(() => subscriptions(transactions, recurring), [transactions, recurring])
  const env = useMemo(() => envelope(transactions, month, p), [transactions, month, p])
  const ru = useMemo(() => roundUp(transactions, month, step), [transactions, month, step])
  const open = goals.filter(g => g.saved < g.target)
  const [goalId, setGoalId] = useState(''), gid = goalId || open[0]?.id || ''
  const avail = Math.max(0, ru.total - ((roundDone || {})[month] || 0))
  const unusedYear = subs.rules.filter(s => marks[s.name] === 'unused').reduce((a, s) => a + s.monthly * 12, 0)
  const mark = (name: string, v: 'used' | 'unused') => onPatch('subMarks', { ...marks, [name]: marks[name] === v ? undefined : v })
  return <div className="page-stack">
    <div className="page-heading"><h1>{L('Asisten Pintar', 'Smart Assistant')}</h1><p>{L('Natasya membaca polamu secara lokal: tanpa server, datamu tetap di perangkat ini.', 'Natasya reads your patterns locally: no server, your data stays on this device.')}</p></div>
    <section className="panel"><h2><AlertTriangle size={16} /> {L('Pengeluaran janggal', 'Unusual spending')}</h2>
      {anomalies.length === 0 ? <p className="xt-mute">{L('Belum ada yang janggal. Pengeluaranmu terlihat wajar. 💚', 'Nothing unusual. Your spending looks normal. 💚')}</p>
        : <ul className="xt-list">{anomalies.map((a, n) => <li key={n}><b>{a.title}</b><span>{a.detail}</span></li>)}</ul>}
      <p className="xt-mute xt-note">{L('Butuh minimal 5 transaksi per kategori dalam 4 bulan terakhir agar perbandingannya adil.', 'Needs at least 5 transactions per category in the last 4 months for a fair comparison.')}</p></section>
    <section className="panel"><h2><Repeat size={16} /> {L('Langganan', 'Subscriptions')}</h2>
      {subs.rules.length === 0 && subs.detected.length === 0 && <p className="xt-mute">{L('Belum ada langganan. Tambahkan transaksi berulang untuk tagihan rutin.', 'No subscriptions yet. Add recurring transactions for regular bills.')}</p>}
      <ul className="xt-list">{subs.rules.map(s => <li key={s.name}><b>{s.name}</b><span>{money(s.monthly)}/{L('bln', 'mo')} · {money(s.monthly * 12)}/{L('thn', 'yr')} · {cat(s.category)}</span>
        <div className="xt-actions"><button className={`secondary-button ${marks[s.name] === 'used' ? 'selected' : ''}`} aria-pressed={marks[s.name] === 'used'} onClick={() => mark(s.name, 'used')}>{L('Masih dipakai', 'Still using')}</button>
          <button className={`secondary-button ${marks[s.name] === 'unused' ? 'selected' : ''}`} aria-pressed={marks[s.name] === 'unused'} onClick={() => mark(s.name, 'unused')}>{L('Tidak dipakai', 'Not using')}</button></div></li>)}</ul>
      {unusedYear > 0 && <p className="xt-hl">{L(`Kalau yang tidak dipakai dihentikan, kamu hemat ${money(unusedYear)} per tahun.`, `Cancelling what you don’t use saves ${money(unusedYear)} a year.`)}</p>}
      {subs.detected.length > 0 && <><h3 className="xt-sub">{L('Terdeteksi berulang, belum jadi transaksi berulang', 'Looks recurring, not set up yet')}</h3>
        <ul className="xt-list">{subs.detected.map(d => <li key={d.name}><b>{d.name}</b><span>{L(`≈ ${money(d.monthly)} tiap bulan selama ${d.months} bulan`, `≈ ${money(d.monthly)} monthly for ${d.months} months`)}</span></li>)}</ul></>}</section>
    <section className="panel"><h2><Wallet size={16} /> {L('Amplop gaji', 'Salary envelopes')}</h2>
      <p className="xt-mute">{env.income > 0 ? L(`Dari pemasukan bulan ini ${money(env.income)}:`, `From this month’s income of ${money(env.income)}:`) : L('Belum ada pemasukan bulan ini. Catat gaji dulu agar amplopnya terhitung.', 'No income this month yet. Log your salary to fill the envelopes.')}</p>
      <div className="xt-split"><label>{L('Kebutuhan', 'Needs')} {p.needs}%<input type="range" min={0} max={100} value={p.needs} onChange={e => onPatch('plan', { needs: Number(e.target.value), wants: Math.min(p.wants, 100 - Number(e.target.value)) })} /></label>
        <label>{L('Keinginan', 'Wants')} {p.wants}%<input type="range" min={0} max={100 - p.needs} value={p.wants} onChange={e => onPatch('plan', { ...p, wants: Number(e.target.value) })} /></label></div>
      {env.rows.map(r => { const pct = r.planned > 0 ? Math.min(100, (r.actual / r.planned) * 100) : 0; const over = r.key !== 'save' && r.actual > r.planned && r.planned > 0
        return <div className="xt-env" key={r.key}><div><b>{r.label} {r.pct}%</b><span className={over ? 'xt-over' : ''}>{money(r.actual)} / {money(r.planned)}</span></div><div className="progress-track"><span className={over ? 'warn' : ''} style={{ width: `${pct}%` }} /></div></div> })}</section>
    <section className="panel"><h2><PiggyBank size={16} /> {L('Pembulatan tabungan', 'Round-up savings')}</h2>
      <p className="xt-mute">{L('Setiap pengeluaran dibulatkan ke atas; selisihnya bisa kamu pindahkan ke target tabungan.', 'Each expense is rounded up; you can move the difference into a savings goal.')}</p>
      <div className="xt-actions">{[1000, 5000, 10000].map(s => <button key={s} className={`secondary-button ${s === step ? 'selected' : ''}`} aria-pressed={s === step} onClick={() => onPatch('roundStep', s)}>{L('Bulatkan ke', 'Round to')} {money(s)}</button>)}</div>
      <p className="xt-hl">{L(`${ru.count} pengeluaran bulan ini menghasilkan ${money(ru.total)}. Siap dipindahkan: ${money(avail)}.`, `${ru.count} expenses this month make ${money(ru.total)}. Ready to move: ${money(avail)}.`)}</p>
      {open.length === 0 ? <p className="xt-mute">{L('Buat target tabungan dulu untuk menampung pembulatan.', 'Create a savings goal first to receive the round-up.')}</p>
        : <div className="xt-actions"><select value={gid} onChange={e => setGoalId(e.target.value)} aria-label={L('Target tujuan', 'Target goal')}>{open.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          <button className="primary-button" disabled={avail <= 0} onClick={() => { onDeposit(gid, avail); onPatch('roundDone', { ...(roundDone || {}), [month]: ((roundDone || {})[month] || 0) + avail }) }}>{L('Pindahkan ke tabungan', 'Move to savings')}</button></div>}</section>
  </div>
}

/* ------------------------------ CATAT LEWAT SUARA ------------------------------ */
export function VoiceButton({ onDraft, onToast }: { onDraft: (d: VoiceDraft & { raw: string }) => void; onToast: (m: string) => void }) {
  const [openPop, setOpenPop] = useState(false), [text, setText] = useState(''), [live, setLive] = useState(false)
  const rec = useRef<any>(null)
  const SR = typeof window !== 'undefined' ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null
  useEffect(() => () => { try { rec.current?.abort() } catch { /* abaikan */ } }, [])
  const submit = (raw: string) => {
    const d = parseVoice(raw)
    if (!d) { onToast(L('Nominalnya belum terdengar. Coba: “kopi dua puluh lima ribu”.', 'Couldn’t catch an amount. Try: “coffee 25k”.')); return }
    onDraft({ ...d, raw }); setOpenPop(false); setText('')
  }
  const listen = () => {
    if (!SR) { onToast(L('Browser ini belum mendukung suara. Ketik saja kalimatnya di kolom.', 'This browser has no speech support. Type the sentence instead.')); return }
    const r = new SR(); r.lang = getLang() === 'id' ? 'id-ID' : 'en-US'; r.interimResults = true; r.continuous = false
    r.onresult = (e: any) => { const t = Array.from(e.results).map((x: any) => x[0].transcript).join(' '); setText(t); if (e.results[e.results.length - 1].isFinal) submit(t) }
    r.onend = () => setLive(false)
    r.onerror = () => { setLive(false); onToast(L('Mikrofon tidak bisa dipakai. Izinkan akses mikrofon atau ketik kalimatnya.', 'Microphone unavailable. Allow access or type the sentence.')) }
    rec.current = r; setLive(true); try { r.start() } catch { setLive(false) }
  }
  return <div className="xt-voice">
    <button className={`icon-button ${live ? 'xt-live' : ''}`} aria-label={L('Catat lewat suara', 'Log by voice')} title={L('Catat lewat suara', 'Log by voice')} aria-expanded={openPop} onClick={() => setOpenPop(o => !o)}><Mic size={17} /></button>
    {openPop && <form className="xt-pop" onSubmit={e => { e.preventDefault(); if (text.trim()) submit(text) }}>
      <strong>{L('Catat lewat suara', 'Log by voice')}</strong>
      <p>{L('Ucapkan atau ketik, misalnya “bensin lima puluh ribu kemarin”. Kamu tetap bisa memeriksa dulu sebelum disimpan.', 'Say or type, e.g. “petrol 50k yesterday”. You can review it before it is saved.')}</p>
      <div><input autoFocus value={text} onChange={e => setText(e.target.value)} placeholder={L('kopi dua puluh lima ribu', 'coffee 25k')} aria-label={L('Kalimat transaksi', 'Transaction sentence')} />
        <button type="button" className={`icon-button ${live ? 'xt-live' : ''}`} onClick={listen} aria-label={L('Mulai bicara', 'Start speaking')}><Mic size={16} /></button>
        <button type="submit" className="icon-button" aria-label={L('Buat draf', 'Create draft')}><Send size={16} /></button></div>
    </form>}
  </div>
}
