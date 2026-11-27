// Halaman & komponen tambahan MONETRA: Wrapped. (Asisten Pintar dan suara kini bagian dari chat Natasya.)
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { L, todayISO, wrapped } from './insights'
import type { Tx } from './insights'
import { getLang } from './i18n'
import { scene, art, cloudBank, cabinet, roomScene } from './pixelScene'
import type { ArtOpt } from './pixelScene'
import './wrapped-pixel.css'
import './extras.css'

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
  const [phase, setPhase] = useState<'off' | 'coin' | 'on' | 'down'>('off'), [hit, setHit] = useState(false), [zoom, setZoom] = useState(false), [collapse, setCollapse] = useState(false)
  const cab = useMemo(() => cabinet(), []), room = useMemo(() => roomScene(), [])
  const insert = () => { if (phase !== 'off') return; setPhase('coin'); const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches, desk = window.matchMedia('(min-width: 1000px) and (min-height: 520px) and (orientation: landscape)').matches; timers.current.push(window.setTimeout(() => { setPhase('on'); setZoom(true) }, rm ? 200 : desk ? 3400 : 1800)) }
  const powerOff = () => {
    if (phase !== 'on') return
    timers.current.forEach(t => clearTimeout(t)); timers.current = []; busy.current = false; setHit(false)
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setPhase('down')
    timers.current.push(
      window.setTimeout(() => { setCollapse(true); setZoom(false) }, rm ? 0 : 900),
      window.setTimeout(() => { setPhase('off'); setCollapse(false); setI(0); setPaused(false) }, rm ? 100 : 1500))
  }
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
    setHit(true); timers.current.push(window.setTimeout(() => setHit(false), 260))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setI(t); return }
    busy.current = true; setTr(v => v + 1)
    timers.current.push(window.setTimeout(() => setI(t), 600), window.setTimeout(() => { busy.current = false }, 1200))
  }
  return <div className="page-stack">
    <div className="page-heading"><h1>Monetra Wrapped</h1><p>{L('Rekap tahunanmu, dihitung dari transaksi di perangkat ini.', 'Your year in review, calculated from the transactions on this device.')}</p></div>
    <div className="xt-years" role="group" aria-label={L('Pilih tahun', 'Choose year')}>{years.map(y => <button key={y} className={`secondary-button ${y === year ? 'selected' : ''}`} aria-pressed={y === year} onClick={() => { setYear(y); setI(0) }}>{y}</button>)}</div>
    {!c || !w ? <section className="panel"><p>{L(`Belum ada transaksi di ${year}. Catat beberapa transaksi dulu, lalu Wrapped-mu akan muncul di sini.`, `No transactions in ${year} yet. Log a few and your Wrapped will appear here.`)}</p></section>
      : <div className="px-wrap">
        <div className="arc-roomwrap"><div className={`arc-camera ${zoom ? 'zoom' : ''} ${phase === 'coin' ? 'slot' : ''}`}><div className="arc-room" aria-hidden="true" dangerouslySetInnerHTML={{ __html: room }} />
        <div className="arc-cam"><div className={`arc ${phase} ${zoom ? 'zoom' : ''} ${collapse ? 'collapse' : ''} ${hit ? 'hit' : ''}`}>
          <svg className="arc-svg" viewBox="0 0 400 880" aria-hidden="true" dangerouslySetInnerHTML={{ __html: cab }} />
          <div className="arc-screen">
            {phase === 'on' || phase === 'down' ? (
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
        ) : <div className="arc-attract"><span className="arc-a1">STAGE 00</span><strong className="arc-a2">INSERT COIN</strong><button className="px-again" onClick={insert}>{L('MASUKKAN KOIN', 'INSERT COIN')}</button><span className="arc-a3">{L('Ketuk koin atau tombol ini', 'Tap the coin or this button')}</span></div>}
            {phase === 'down' ? <div className="arc-err" aria-hidden="true"><b>ERROR</b><span>{L('DAYA PADAM', 'POWER LOSS')}</span></div> : null}
            <div className="arc-glass" aria-hidden="true" />
          </div>
          <button className="arc-slot" aria-label={L('Masukkan koin', 'Insert coin')} onClick={insert} tabIndex={phase === 'off' ? 0 : -1} />
        </div></div></div></div>
        {phase === 'on' ? (<div className="px-ctl"><button className="secondary-button" aria-label={L('Sebelumnya', 'Back')} disabled={idx === 0} onClick={() => go(idx - 1)}><ChevronLeft size={16} /></button><span>{idx + 1}/{cards.length}</span>
          <button className="secondary-button" onClick={() => setPaused(p => !p)}>{paused ? L('Putar', 'Play') : L('Jeda', 'Pause')}</button><button className="primary-button" aria-label={L('Lanjut', 'Next')} disabled={idx === cards.length - 1} onClick={() => go(idx + 1)}><ChevronRight size={16} /></button><button className="secondary-button" onClick={powerOff}>{L('Matikan', 'Power off')}</button></div>) : null}
      </div>}
  </div>
}
