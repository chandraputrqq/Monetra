// Adegan pixel-art untuk Monetra Wrapped (langit malam, bulan, gedung, sprite). Murni string SVG, tanpa emoji.
export const PAL = [
  { a: '#1b1a4a', b: '#2b2f8f', c: '#b04aa8', d: '#ff6fa8', moon: '#ffe27a' },
  { a: '#2a1650', b: '#7a2a8c', c: '#ff6f61', d: '#ffb35c', moon: '#fff1a0' },
  { a: '#0f2a4a', b: '#1f5fa8', c: '#3ac3c8', d: '#8af0d0', moon: '#e6fff5' },
  { a: '#240f4a', b: '#4b2a9c', c: '#c24ab8', d: '#ff8fd0', moon: '#ffe27a' },
  { a: '#1a2a5a', b: '#3a6fd0', c: '#ff9a6c', d: '#ffd36a', moon: '#fff1a0' },
  { a: '#2a0f2a', b: '#6a1f5a', c: '#d03a6a', d: '#ff7a5c', moon: '#ffd0a0' },
  { a: '#052e1f', b: '#0f7a5a', c: '#34d399', d: '#d9f99d', moon: '#ecfccb' }
]
const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('') }
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
const R = (x: number, y: number, w: number, h: number, f: string, c = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"${c ? ` class="${c}"` : ''}/>`
export function sprite(rows: string[], cell: number, x: number, y: number, col: Record<string, string>, cls = '') {
  let s = ''
  rows.forEach((row, r) => { for (let i = 0; i < row.length;) { const ch = row[i]; let j = i; while (j < row.length && row[j] === ch) j++; if (ch !== '.' && col[ch]) s += R(x + i * cell, y + r * cell, (j - i) * cell, cell, col[ch]); i = j } })
  return cls ? `<g class="${cls}">${s}</g>` : s
}
const COIN = ['..####..', '.#oooo#.', '#oo##oo#', '#oo##oo#', '#oo##oo#', '#oo##oo#', '.#oooo#.', '..####..']
const BOSS = ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...']
const SHIELD = ['###########', '#ooooooooo#', '#ooo###ooo#', '#oo#ooo#oo#', '#oo#ooo#oo#', '#ooo###ooo#', '#ooooooooo#', '.#ooooooo#.', '.#ooooooo#.', '..#ooooo#..', '...#ooo#...', '....###....']
const RUN_A = ['..####..', '..####..', '...##...', '.######.', '#.####.#', '..####..', '..#..#..', '.##..##.', '.#....#.', '##....##']
const RUN_B = ['..####..', '..####..', '...##...', '.######.', '#.####.#', '..####..', '...##...', '..####..', '..#..#..', '.##..##.']
export function scene(p: number) {
  const P = PAL[p % PAL.length], dark = mix(P.a, '#000000', .55), r = rng(7 + p * 13)
  let s = R(0, 0, 400, 300, P.a)
  const cols = [P.a, P.b, P.c, P.d]
  for (let k = 0; k < 12; k++) { const t = k / 11, seg = t * 3, ci = Math.min(2, Math.floor(seg)); s += R(0, 300 + k * 22, 400, 22, mix(cols[ci], cols[ci + 1], seg - ci)) }
  for (let k = 0; k < 28; k++) { const x = Math.floor(r() * 78) * 5, y = Math.floor(r() * 56) * 5 + 20, big = r() > .72, c = `tw${k % 3}`
    s += big ? `<g class="${c}">${R(x, y + 5, 15, 5, '#fff')}${R(x + 5, y, 5, 15, '#fff')}</g>` : R(x, y, 5, 5, '#d6e4ff', c) }
  const mx = 330, my = 112, cell = 5
  for (let gy = -12; gy <= 12; gy++) for (let gx = -12; gx <= 12; gx++) {
    const x = gx * cell, y = gy * cell, d = Math.hypot(x, y), cut = Math.hypot(x + 12, y + 6)
    if (d <= 30 && cut > 27) s += R(mx + x, my + y, cell, cell, P.moon)
    else if (d > 30 && d <= 46 && (gx + gy) % 2 === 0) s += R(mx + x, my + y, cell, cell, P.moon, 'halo')
  }
  const back = mix(P.c, dark, .62)
  for (let x = 0, k = 0; x < 400; k++) { const w = 28 + Math.floor(r() * 4) * 8, h = 70 + Math.floor(r() * 7) * 12; s += R(x, 711 - h - 40, w, h + 40, back); x += w - 6 }
  for (let x = 0; x < 400;) { const w = 32 + Math.floor(r() * 4) * 8, h = 44 + Math.floor(r() * 9) * 14, top = 711 - h - 24; s += R(x, top, w, h + 24, dark)
    for (let wy = top + 10; wy < top + h - 6; wy += 14) for (let wx = x + 8; wx < x + w - 8; wx += 12) if (r() > .55) s += R(wx, wy, 5, 7, r() > .85 ? '#5ef2ff' : '#ffd84a', r() > .8 ? 'wa' : r() > .6 ? 'wb' : '')
    x += w + 2 }
  return s
}
const T = (x: number, y: number, t: string, f: string, size = 11, a = 'middle') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${a}" fill="${f}" font-family="'Press Start 2P',monospace">${t}</text>`
export type ArtOpt = { pct?: number; by?: number[]; best?: number; letters?: string[] }
const CC = { '#': '#c98a00', o: '#ffd84a' }
const COIN_M = ['.####.', '#oooo#', '#o##o#', '#o##o#', '#o##o#', '#o##o#', '#oooo#', '.####.']
const COIN_T = ['.##.', '#oo#', '#oo#', '#oo#', '#oo#', '#oo#', '#oo#', '.##.']
// Koin berputar 4 frame (lebar, sedang, tipis, sedang)
const coinSpin = (cell: number, phase = 0) => [COIN, COIN_M, COIN_T, COIN_M].map((rows, n) => `<g class="cf" style="animation-duration:.6s;animation-delay:${(n * .15 - .6 + phase).toFixed(2)}s">${sprite(rows, cell, ((8 - rows[0].length) / 2) * cell, 0, CC)}</g>`).join('')
// Karakter orang berlari: 4 frame (kontak, melayang, kontak, melayang). Anggota badan sisi jauh dibuat lebih gelap agar terasa 3D.
const PCOL = { h: '#4a2f1d', s: '#ffcf9f', S: '#e3a577', e: '#1d1250', t: '#34d399', T: '#0f8f63', p: '#4a4ab8', P: '#2e2e82', b: '#ffffff' }
function person(k: number): string[] {
  const g: string[][] = Array.from({ length: 17 }, () => Array(12).fill('.'))
  const r = (x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[y + j] && x + i >= 0 && x + i < 12) g[y + j][x + i] = c }
  const oy = k === 4 ? 0 : k % 2 ? 0 : 1
  const far = [
    () => { r(3, 14, 2, 2, 'P'); r(1, 15, 2, 1, 'P'); r(0, 16, 3, 1, 'b'); r(6, 8, 2, 2, 'T'); r(8, 7, 2, 2, 'S') },
    () => { r(3, 13, 2, 2, 'P'); r(2, 14, 2, 2, 'P'); r(0, 15, 3, 1, 'b'); r(5, 7, 2, 2, 'T'); r(6, 9, 2, 2, 'S') },
    () => { r(6, 14, 2, 2, 'P'); r(8, 15, 2, 1, 'P'); r(9, 16, 3, 1, 'b'); r(4, 8, 2, 2, 'T'); r(2, 9, 2, 2, 'S') },
    () => { r(4, 13, 2, 3, 'P'); r(4, 16, 3, 1, 'b'); r(5, 7, 2, 2, 'T'); r(4, 9, 2, 2, 'S') },
    () => { r(3, 13, 2, 3, 'P'); r(2, 16, 3, 1, 'b'); r(1, 5, 2, 2, 'T'); r(0, 2, 2, 3, 'T'); r(0, 1, 2, 1, 'S') }
  ][k]
  const near = [
    () => { r(6, 14, 2, 2, 'p'); r(8, 15, 2, 1, 'p'); r(9, 16, 3, 1, 'b'); r(4, 8, 2, 2, 't'); r(2, 9, 2, 2, 's') },
    () => { r(5, 13, 2, 3, 'p'); r(5, 16, 3, 1, 'b'); r(5, 7, 2, 2, 't'); r(4, 9, 2, 2, 's') },
    () => { r(3, 14, 2, 2, 'p'); r(1, 15, 2, 1, 'p'); r(0, 16, 3, 1, 'b'); r(6, 8, 2, 2, 't'); r(8, 7, 2, 2, 's') },
    () => { r(6, 13, 2, 2, 'p'); r(7, 14, 2, 2, 'p'); r(8, 15, 3, 1, 'b'); r(5, 7, 2, 2, 't'); r(6, 9, 2, 2, 's') },
    () => { r(5, 13, 2, 3, 'p'); r(5, 16, 3, 1, 'b'); r(9, 5, 2, 2, 't'); r(10, 2, 2, 3, 't'); r(10, 1, 2, 1, 's') }
  ][k]
  far()
  r(3, 0 + oy, 6, 1, 'h'); r(2, 1 + oy, 8, 1, 'h'); r(2, 2 + oy, 3, 2, 'h'); r(5, 2 + oy, 5, 3, 's'); r(8, 3 + oy, 1, 1, 'e'); r(5, 5 + oy, 3, 1, 's')
  r(3, 6 + oy, 6, 5, 't'); r(3, 10 + oy, 6, 1, 'T'); r(3, 11 + oy, 6, 2, 'p')
  near()
  return g.map(row => row.join(''))
}
const frames = (cls: string, dur: number, make: (n: number) => string, count = 4) => Array.from({ length: count }, (_, n) => `<g class="${cls}" style="animation-duration:${dur}s;animation-delay:${(n * (dur / count) - dur).toFixed(3)}s">${make(n)}</g>`).join('')
const CLOUDS: string[][] = [
  ['............WWWWWLM.........................................................', '...........WWWWWWLLMM.......................................................', '..........WWWWWWLLLMMM......................................................', '..........WWWWWLLLLLMMM.....................................................', '.........WWWWWLLLLLLLMMM..........WWWWWWWWW.................................', '........WWWWWLLLLLLLLMMM.MLWWW..WWWWWWWWWWWWW..WWWWWWWL.....................', '........WWWWLLLLLLLLLLLLLLLLWWWWWWWWWWWLWWWWW.WWWWWWLLLL....................', '.......WWWWLLLLLLLLLLLLLLLLLLWWWWWWWWLLLLLWWWWWWWWWLLLLLL...................', '.......WWWWLLLLLLLWLLLLLLLLLLLLWWWLLLLLLLLLLLWWWLLLLLLLWL.LLLLWWW...........', '.......WWWLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLWWWW..........', '...WWWWWWWLLLLLLLLLLLWWWWWWLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLWWWWWWW......', '..WWWWWWWLLLLWLLLLLLWWWWWWWWLLMLLLLLLLLLLWLLLLLLLLLLLLLLLLLLWLLLLLWWWWWWW...', '.WWWWWLLLLLLLLLLLLLWWWWWWWWWLMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLWWWWWW..', 'WWWWWLLLLLLLLLLLLLLWWWWWWLLLLLMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLL.', 'WWWWWLLLLLLLLLLLLLLLLLLLLLLLLLLMMMMLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLMMLLLLLLL', 'SSSSLLLLLLLLLLLLLLLLLMMMMMMMLLLMMMMMMMLLLLLLLLLLLLMMMMMMMLLLMMMMMMMMMMMMMMML', 'SSSSSSLLLLLLLLLMMMMMSSSSSSSSMMMMMSSSSSSMMMMMMMMMMMMMMMMMMMMMSSSSSSSSSMMMMMMM', 'SSSSSSSSSSMMMMMMMMMSSSSSSSSSSSSSSSSSSSSSSMMMMMMMMMMMMMMMMMSSSSS....SSSS.....', '........................SSSSSSSSSSSSSSSSSMMMMMMMMMMM........................', '......................................SSSMMMMM..............................'],
  ['.............WL..................MMSSSS', '...........WWLLLLMM....................', '..........WWWLLLLLMM...................', '.........WWWWLLLLLMM...................', '.........WWWWLLLLLMSS..................', '.........WWWWLLLLLLSS..................', '........WWWWWLLLLLLSS..................', '........WWWWLLLLLLLMS..................', '......WWWWWLLLLLLLLMS..................', '.....WWWLLLLLLWLLLLMMSSSS..............', '.....WWWLLLLLLLLLLLLLLMMMM.............', '....WWWLLLLLLLLLLLLLLLLLMM.............', '....WWWLLLLLLLLLLLLLLLLLLMM............', '....WWWLLLLLLLLLLLLLLLLLLLM............', '...WWWLLLLLLLLLLLLLLLLLLLLM............', '...WWWLLLLLLLLLWWWWWWLLLLLL............', '...WWWLLLLLLLLWWWWWWWWWLLLL............', '...WWWLLLLLLLWWWWWWWWWMMLLLL...........', '...WWLLLLLLLLWWWWWWWMMMMMLLLLLLM.......', '.WWWWLWLLLLLLWWWLLLLMMMMMLLLLLLMM......', 'WWWWLLLLLLLLLLLLLLLLMMMMMMLLLLLLML.....', 'WWLLLLLLLLLLLLLLLLLLMMMMMMLLLLLMMM.....', 'WLLLLLLLLLWLLLLLLLLLMMMMMLLLLLLMMMMMS..', 'LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLMMMMMMSS.', 'MLLLLLLLLLLLLLLLLLLLLLLLLLLLLLMMMMSSSSS', 'MMMMMMMMMMMMMMLLLLLLLLLLLSSSSSSSSSSSSSS', 'SSSSSSSSSSSSSSMMLLLLLLSSSSSSSSSSSSSSS..', '..SSS......SSSMMLLLLLSSSSSSS...........', '.............SSMMMLLLSSSS..............'],
  ['..........................WWWWWWW..........', '........................WWWWWWWWWWWW.......', '......................WWWWWWWWWWWWWWW......', '.....................WWWWWWWWWWWWWWWWW.....', '....................WWWWWWLLLLLWWWWWWW.....', '...................WWWWWLLLLLLLLLLLLLL.....', '.............WWWS.SWWWLLLLLLLLLLLLLLLL.....', '...........WWWWWSSSLLLLLLLLLLLLLLLMMMM.....', '...........WWWWWLSSLLLLLLWLLLLLLLMMMSS.....', '...........WWWLLLLLLLLLLLLLLLLWLLMMMSS.....', '..........WWLLLLLLLLLLLLLLLLLLLLLMMMMMSS...', '..........WWLLLLLLLLLLLLLLLLLLLLLLLLLLMMMM.', '..........WWLLLLLLLLLLLLLWWWWWWWLLLLLLLLMMM', '..........WWLLLLLLWLLLWWWWWWWWWWWWLLLLLLLLL', '..........WWLLLLLLLLLLWWWWWWWWWWWWLLLLLLLLL', '.........WWWLLLLLLLLLLWWWWWWWWWWWWWLLLLLLLL', '.......WWWWWLLLLLLLLLLWWWLLLLWWWWWWLLLLLLLL', '.......WWWMMMMMMLLLLLLLLLLLMMMMWWWLLLLLLLLL', '.......WWMMMMMMMMLLLLLLLMMMMMMMMMLLLLLLLLLL', '......WMMMMMMMMMMMLLLLMMMMMMMMMMMMMMLLMMMMM', '...WLLLMMSSSSMMMMMMMMMMMMSSSSMMMMMMMMMMSSSS', '.LLLMMMSSSSSSSMMMMMMMMMSSSSSSSSMMMMMMMSSSSS', 'MMMMMSSSSSSSSSMMMMMMMMSSSSSSSSSSSMMSSSSSSS.', 'MMSSSSSSSSSSSMMMMMMMMMSSSSSSSSSSSSSSSSSSS..', '............MMMMMMMMMSSSSS.SSSSSSSSSSSS....', '...............MMMMMMSSSS..................'],
  ['........WWWWW..................', '.....WWWWWWWWLMM...............', '...WWWWWWWWLLLLMM..............', '..WWWWWWLLLLLLLMMM.............', '..WWWWLLLLLLLLLLMM.............', '.WWWLLLLLLLLLLLLMMM............', '.WWWLLLLLLLLLLLLLMMWWWWW.......', '.WWLLLLLLLLLLWLLLLLWWWWWW......', '.WLLLWLLLLLLLLLLLLLLLLLWWW.....', '.WLLLLLLLLLWWLLLLLLLLLLLLL.....', '.WWLLLLLLWWWWWLLLLLLLWLLLLLLWW.', 'WWWLLLLLLWWWWMMMMLLLLLLLLLLLWWW', 'WWWLLLLLMMWMMMMMMMMLLLLLLLLLLWW', 'WLLLLMMMMMMMMMMMMMMLLLLLLLLLLLW', 'LLLLMMMMMMMMMSSSMMMMMMMMMLLLLLL', 'MMMMMMMMMMSSSSSSSSMMMMMMMMMMLLL', 'SSSSSMSSSSSSSSSSSSSMMSSSSSSSSMM', '.SSSSSSSSSSSSSSSSSSSSSSSSSSSS..'],
  ['.......WWWWWWWWW............', '......WWWWWWWWWWW...........', '.....WWWWWWWWWWWWM..........', '....WWWWWWWWWWWLLM..........', '....WWWLLLLLLLLLLMM.........', '....WWWLLLLLLLWLLMM.........', '...WWWLLLLLLLLLLLLMMMMMMM...', '...WWWLLLLLLLLLLLLLLLLLLLL..', '...WWLLLWLLLLLLLLWWWWWLLLLL.', '.WWWWLLLLLLLLLLLLWWWWWWLLLLL', '.WWWWLLLLLLLLLLLLLWWWWWLMMMM', 'WWWWLLLLLLLLSSSSLLLLLLLMMMMM', 'LLLLLLLLLLLSSSSSSLLLLLMMMMMM', 'MLLLLLLLLLLSSSSSSLLLMMMMSSSS', 'SSSSMMLLLLLMMMMMMMMMMMMSSSSS', '..SSSSMMMMMM...MMMMMMMSSSS..'],
  ['...WWWWL..', '..WWWWWLLL', 'WWWWWWLLSS', 'WWWWWLLSSS', '.WWLLLLSS.', '..LLMMM...']
]
const CL = { W: '#ffffff', L: '#dbe9fa', M: '#c3dbfa', S: '#abc9f3' }
// Awan transisi: sprite awan diekstrak dari gambar referensi (4 warna: putih, terang, sedang, bayangan), disusun jadi gumpalan setinggi 2 layar (viewBox 400x1424).
export function cloudBank(): string {
  const cell = 5, mir = (rows: string[]) => rows.map(r => [...r].reverse().join(''))
  const put = (i: number, x: number, y: number, flip = false) => sprite(flip ? mir(CLOUDS[i]) : CLOUDS[i], cell, x, y, CL)
  const wide = CLOUDS[0], bodyTop = 250 + 14 * cell, bodyEnd = 1130
  return put(3, -20, 30) + put(2, 200, 60, true) + put(4, 30, 150, true) + put(5, 190, 205) +
    R(0, bodyTop, 400, bodyEnd - bodyTop, CL.L) +
    put(1, 20, 420) + put(2, 190, 560, true) + put(3, 30, 740, true) + put(4, 235, 850) + put(1, 215, 340, true) + put(4, 10, 960) +
    sprite(wide.slice(0, 15), cell, 10, 250, CL) + sprite(mir(wide.slice(15)), cell, 10, bodyEnd, CL) +
    put(1, 10, 1190, true) + put(4, 225, 1225) + put(3, 140, 1300, true) + put(5, 60, 1385) + put(2, 190, 1280)
}
const grid = (w: number, h: number) => Array.from({ length: h }, () => Array(w).fill('.'))
const fillR = (g: string[][], x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (g[y + j] && x + i >= 0 && x + i < g[0].length) g[y + j][x + i] = c }
const PIGC = { p: '#ff8fb8', P: '#d9487f', s: '#ffb8d1', e: '#1d1250', n: '#8a2250', k: '#1d1250', h: '#ffd1e3' }
function pigRows(): string[] {
  const g = grid(18, 12), r = (x: number, y: number, w: number, h: number, c: string) => fillR(g, x, y, w, h, c)
  r(2, 2, 16, 8, 'p'); g[2][2] = '.'; g[9][2] = '.'; g[2][17] = '.'; g[9][17] = '.'
  r(0, 5, 3, 3, 's'); r(0, 6, 1, 1, 'n'); r(4, 0, 3, 2, 'P'); r(4, 4, 1, 1, 'e'); r(5, 3, 4, 1, 'h'); r(9, 2, 5, 1, 'k'); r(3, 9, 14, 1, 'P'); r(4, 10, 3, 2, 'P'); r(13, 10, 3, 2, 'P'); r(17, 3, 1, 2, 'P')
  return g.map(x => x.join(''))
}
const HAMC = { H: '#e6ecff', G: '#8d9be0', w: '#c98a5a', W: '#8a5a34' }
function hammerRows(): string[] {
  const g = grid(8, 17), r = (x: number, y: number, w: number, h: number, c: string) => fillR(g, x, y, w, h, c)
  r(0, 0, 8, 5, 'H'); r(0, 3, 8, 2, 'G'); r(3, 5, 2, 12, 'w'); r(4, 5, 1, 12, 'W')
  return g.map(x => x.join(''))
}
const CROWN = ['#..#..#', '##.#.##', '#######', '#o#o#o#']
const PIG = pigRows(), HAMMER = hammerRows()
export function art(kind: string, o: ArtOpt = {}) {
  if (kind === 'total') { let s = ''; for (let k = 0; k < 7; k++) s += `<g transform="translate(${28 + k * 50} 200)"><g class="fall" style="animation-duration:${(3.6 + (k % 3) * .7).toFixed(1)}s;animation-delay:-${(k * .83).toFixed(2)}s"><g class="sway" style="animation-delay:-${(k * .4).toFixed(1)}s">${coinSpin(5, k * .11)}</g></g></g>`; return s }
  if (kind === 'cat') { const n = 20, f = Math.round(((o.pct || 0) / 100) * n); let s = R(36, 300, 328, 40, '#0b0a2a') + R(40, 304, 320, 32, '#ffffff')
    for (let k = 0; k < n; k++) s += R(44 + k * 15.6, 308, 12, 24, k < f ? (k > n * .66 ? '#ff5fa2' : '#5ef2ff') : '#2b2a6e', k < f ? 'seg' : '')
    return s + T(40, 292, 'HP', '#fff', 12, 'start') }
  if (kind === 'month') { const by = o.by || [], n = by.length || 1, mx = Math.max(...by, 1), hi = by.indexOf(Math.max(...by)), w = Math.min(26, 340 / n - 4), x0 = (400 - n * (w + 4)) / 2; let s = ''
    by.forEach((v, i) => { const blocks = Math.max(1, Math.round((v / mx) * 12)); for (let b = 0; b < blocks; b++) s += R(x0 + i * (w + 4), 470 - (b + 1) * (w * .7), w, w * .7 - 3, i === hi ? (b % 2 ? '#ffe45e' : '#ff5fa2') : '#5ef2ff', 'blk'); s += T(x0 + i * (w + 4) + w / 2, 492, (o.letters || [])[i] || '', '#cfe6ff', 8) })
    return s }
  if (kind === 'nospend') {
    const dashes = Array.from({ length: 18 }, (_, k) => R(k * 50, 458, 24, 4, '#4a4ab8')).join('')
    // Dua koin bergantian: muncul (pop) di kanan, meluncur ke pelari, diambil (melompat ke tangan, memudar), lalu muncul lagi.
    const coin = (d: number) => `<g class="pk" style="animation-delay:${d}s"><g transform="translate(0 378)">${coinSpin(4, d)}</g></g>`
    const sparks = (d: number) => [[-28, -30], [26, -36], [-8, -50], [16, -16]].map(([dx, dy]) => `<g transform="translate(208 396)"><g class="spk" style="--dx:${dx}px;--dy:${dy}px;animation-delay:${d}s">${R(-4, -1, 8, 2, '#fff')}${R(-1, -4, 2, 8, '#fff')}</g></g>`).join('') +
      `<g transform="translate(200 366)"><g class="pkt" style="animation-delay:${d}s">${T(0, 0, '+1', '#ffe45e', 11, 'start')}</g></g>`
    return R(0, 446, 400, 8, '#cfe6ff') + R(0, 454, 400, 40, '#1d1b5c') + `<g class="scrl">${dashes}</g>` + coin(0) + coin(-1.2) +
      `<g class="hop"><g transform="translate(120 ${446 - 17 * 7})">${frames('rf', .48, n => sprite(person(n), 7, 0, 0, PCOL))}</g></g>` +
      R(120, 448, 96, 3, 'rgba(0,0,0,.25)') + sparks(0) + sparks(-1.2)
  }
  if (kind === 'big') {
    // Celengan dipalu sampai pecah, koinnya berhamburan (menggambarkan pengeluaran terbesar).
    const L = PIG.map(r => r.slice(0, 9) + '.'.repeat(9)), Rr = PIG.map(r => '.'.repeat(9) + r.slice(9))
    const dxs = [-130, -90, -50, -10, 35, 80, 125]
    const coins = dxs.map((dx, k) => `<g transform="translate(168 368)"><g class="bx" style="--dx:${dx}px"><g class="by" style="--pk:${70 + (k % 3) * 22}px"><g transform="translate(-16 -16)">${coinSpin(4, k * .07)}</g></g></g></g>`).join('')
    const burst = R(-3, -26, 6, 52, '#fff') + R(-26, -3, 52, 6, '#fff') + [[-14, -14], [14, -14], [-14, 14], [14, 14]].map(([x, y]) => R(x - 4, y - 4, 8, 8, '#ffe45e')).join('')
    return `<g class="shk">${R(70, 424, 260, 8, '#8d9be0')}${R(70, 432, 260, 16, '#1d1b5c')}` +
      `<g class="pgi">${sprite(PIG, 8, 96, 328, PIGC)}</g><g class="pgl">${sprite(L, 8, 96, 328, PIGC)}</g><g class="pgr">${sprite(Rr, 8, 96, 328, PIGC)}</g></g>` +
      `<g class="ham"><g transform="translate(266 318)">${sprite(HAMMER, 6, 0, 0, HAMC)}</g></g>` + coins +
      `<g transform="translate(232 382)"><g class="imp">${burst}</g></g>` +
      `<g transform="translate(250 300)"><g class="ptx">${T(2, 2, 'PRANG!', '#ff5fa2', 16, 'start')}${T(0, 0, 'PRANG!', '#ffe45e', 16, 'start')}</g></g>`
  }
  if (kind === 'persona') {
    // Pelari yang sama naik podium juara: mahkota, sinar berputar, konfeti jatuh.
    const rays = Array.from({ length: 12 }, (_, i) => `<g transform="rotate(${i * 30})">${R(-5, -150, 10, 70, i % 2 ? '#ff5fa2' : '#ffe45e')}</g>`).join('')
    const cols = ['#ff5fa2', '#5ef2ff', '#ffe45e', '#a3e635', '#ffffff']
    const conf = Array.from({ length: 16 }, (_, k) => `<g transform="translate(${14 + k * 24} 140)"><g class="fall" style="animation-duration:${(3 + (k % 4) * .55).toFixed(2)}s;animation-delay:-${(k * .41).toFixed(2)}s"><g class="sway" style="animation-delay:-${(k * .3).toFixed(1)}s">${R(0, 0, 6, 6, cols[k % 5])}</g></g></g>`).join('')
    return `<g transform="translate(200 372)" opacity=".5"><g class="spinp">${rays}</g></g>` + R(118, 440, 164, 10, '#ffe45e') + R(118, 450, 164, 64, '#c98a00') + R(118, 450, 164, 4, '#a67000') + T(200, 498, '1', '#fff', 30) +
      `<g class="vic"><g transform="translate(158 321)">${sprite(person(4), 7, 0, 0, PCOL)}</g><g transform="translate(179 297)">${sprite(CROWN, 6, 0, 0, { '#': '#ffe45e', o: '#ff5fa2' })}</g></g>` + conf +
      [[84, 290], [310, 270], [96, 420], [296, 410]].map(([x, y], k) => `<g class="tw${k % 3}">${R(x, y + 5, 15, 5, '#fff')}${R(x + 5, y, 5, 15, '#fff')}</g>`).join('')
  }
  return `<g transform="translate(176 180)"><g class="fall" style="animation-duration:5s"><g class="sway">${coinSpin(8)}</g></g></g>`
}
