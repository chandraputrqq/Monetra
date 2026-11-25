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
// Mesin arcade pixel-art (viewBox 400x880, 1 sel = 4 satuan). Layar 9:16 ada di x72 y116 w256 h456. Bagian bergerak diberi kelas: joy, bA, bB, bS, coinfx, slotfx, klg, insc, mq.
const cellR = (x: number, y: number, w: number, h: number, f: string) => R(x * 4, y * 4, w * 4, h * 4, f)
type Slab = { out: string; base: string; hi?: string; sh?: string }
// Balok pixel dengan sudut bersusun (chamfer), garis tepi 1 sel, sorot atas-kiri dan bayangan bawah-kanan
function slab(x: number, y: number, w: number, h: number, o: Slab) {
  let s = cellR(x + 1, y, w - 2, 1, o.out) + cellR(x + 1, y + h - 1, w - 2, 1, o.out) + cellR(x, y + 1, 1, h - 2, o.out) + cellR(x + w - 1, y + 1, 1, h - 2, o.out)
  s += cellR(x + 1, y + 1, w - 2, h - 2, o.base)
  s += cellR(x + 1, y + 1, 1, 1, o.out) + cellR(x + w - 2, y + 1, 1, 1, o.out) + cellR(x + 1, y + h - 2, 1, 1, o.out) + cellR(x + w - 2, y + h - 2, 1, 1, o.out)
  if (o.hi) s += cellR(x + 2, y + 1, w - 4, 1, o.hi) + cellR(x + 1, y + 2, 1, h - 4, o.hi)
  if (o.sh) s += cellR(x + 2, y + h - 2, w - 4, 1, o.sh) + cellR(x + w - 2, y + 2, 1, h - 4, o.sh)
  return s
}
// Lingkaran pixel (dirasterisasi ke sel 4x4)
function disc(cx: number, cy: number, r: number, f: string) {
  let s = ''
  for (let y = Math.floor((cy - r) / 4) * 4; y < cy + r; y += 4) {
    let x0: number | null = null, x1 = 0
    for (let x = Math.floor((cx - r) / 4) * 4; x < cx + r; x += 4) if (Math.hypot(x + 2 - cx, y + 2 - cy) <= r) { if (x0 === null) x0 = x; x1 = x + 4 }
    if (x0 !== null) s += R(x0, y, x1 - x0, 4, f)
  }
  return s
}
// Tangan pixel menjepit koin (titik jepit di (0,0)); lengan baju hijau memanjang ke kanan keluar kanvas
function handSVG(): string {
  const O = '#6e3b20', K = '#ffcf9f', D = '#e3a577', N = '#fff1e0', SL = '#34d399', SD = '#0f8f63', CF = '#a7f3d0'
  // Telunjuk (atas) dan jempol (bawah) mencubit koin, tiga jari lain menekuk ke telapak, lalu pergelangan dan lengan baju
  const sil: [number, number, number, number][] = [[16, -28, 24, 16], [0, -24, 20, 12], [-8, -20, 12, 12], [16, 12, 24, 16], [0, 12, 20, 12], [-8, 8, 12, 12], [24, -8, 20, 16], [40, -32, 40, 64], [80, -20, 16, 40], [96, -24, 1100, 48]]
  const fills: [number, number, number, number, string][] = [[16, -28, 24, 16, K], [0, -24, 20, 12, K], [-8, -20, 12, 12, K], [16, 12, 24, 16, K], [0, 12, 20, 12, K], [-8, 8, 12, 12, K], [24, -8, 20, 16, K], [40, -32, 40, 64, K], [80, -20, 16, 40, K],
    [16, -16, 24, 4, D], [0, -16, 20, 4, D], [-8, -12, 12, 4, D], [16, 24, 24, 4, D], [0, 20, 20, 4, D], [-8, 16, 12, 4, D], [24, 0, 20, 4, D], [24, 4, 4, 4, D], [40, 24, 40, 8, D], [80, 12, 16, 8, D],
    [-4, -20, 8, 4, N], [-4, 12, 8, 4, N], [20, -24, 4, 4, D], [36, -4, 4, 4, D],
    [96, -24, 1100, 48, SL], [96, 8, 1100, 16, SD], [96, -24, 8, 48, CF]]
  const shapes = sil.map(([x, y, w, h]) => R(x - 4, y - 4, w + 8, h + 8, O)).join('') + fills.map(([x, y, w, h, c]) => R(x, y, w, h, c)).join('')
  return `<g class="hand"><g class="cface">${sprite(COIN, 3, -12, -12, CC)}</g><g class="cedge">${sprite(COIN_T, 3, -6, -12, CC)}</g>${shapes}</g>`
}
// Judul marquee "MONETRA": huruf pixel tebal 6x8 bergaya 3D (wajah mosaik kuning-oranye ke pink-magenta, garis tepi terang, bevel, ekstrusi ungu).
// Animasi bergaya arcade dan halus (SMIL dengan kurva spline): tiap huruf jatuh memantul bergantian, lalu bergoyang naik-turun
// bergelombang, kilau diagonal lewat terpotong bentuk huruf, dan glow neon berdenyut (CSS .mqt).
const GLYPH: Record<string, string[]> = {
  M: ['11000011', '11100111', '11111111', '11011011', '11000011', '11000011', '11000011', '11000011'],
  O: ['011110', '111111', '110011', '110011', '110011', '110011', '111111', '011110'],
  N: ['110011', '111011', '111111', '111111', '110111', '110011', '110011', '110011'],
  E: ['111111', '111111', '110000', '111100', '111100', '110000', '111111', '111111'],
  T: ['111111', '111111', '001100', '001100', '001100', '001100', '001100', '001100'],
  R: ['111110', '111111', '110011', '111110', '111100', '110110', '110011', '110011'],
  A: ['011110', '111111', '110011', '110011', '111111', '111111', '110011', '110011']
}
function pixelTitle(word: string, cx: number, y0: number, cell: number): string {
  const GH = 8, n = word.length, wds = word.split('').map(ch => GLYPH[ch][0].length), offs = wds.map((_, i) => wds.slice(0, i).reduce((a, b) => a + b + 1, 0)), w = wds.reduce((a, b) => a + b + 1, -1), x0 = Math.round(cx - (w * cell) / 2), H = GH * cell
  const on = (li: number, r: number, c: number) => (GLYPH[word[li]]?.[r]?.[c] === '1')
  // Persegi satu huruf (digabung per baris) dengan offset dx,dy dan warna tetap
  const rects = (li: number, dx: number, dy: number, f: string) => {
    let s = ''
    GLYPH[word[li]].forEach((row, r) => {
      for (let i = 0; i < wds[li];) {
        if (row[i] !== '1') { i++; continue }
        let j = i; while (j < wds[li] && row[j] === '1') j++
        s += R(x0 + (offs[li] + i) * cell + dx, y0 + r * cell + dy, (j - i) * cell, cell, f); i = j
      }
    })
    return s
  }
  const rnd = rng(11), stops = ['#fff07a', '#ffc24a', '#ff8f6a', '#ff5fa2', '#f02fb8'], sub = cell / 2
  const rowColor = (y: number) => { const t = Math.min(0.999, Math.max(0, (y - y0) / H)) * (stops.length - 1), k = Math.floor(t); return mix(stops[k], stops[k + 1], t - k) }
  const face = (li: number) => {
    let f = ''
    for (let r = 0; r < GH; r++) for (let c = 0; c < wds[li]; c++) {
      if (!on(li, r, c)) continue
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const y = y0 + r * cell + sy * sub, j = (rnd() - .5) * .16, base = rowColor(y + sub / 2)
        f += R(x0 + (offs[li] + c) * cell + sx * sub, y, sub, sub, j > 0 ? mix(base, '#ffffff', j) : mix(base, '#7a1a8c', -j))
      }
      const px = x0 + (offs[li] + c) * cell, py = y0 + r * cell
      if (!on(li, r - 1, c)) f += R(px, py, cell, 1, 'rgba(255,255,255,.8)')
      if (!on(li, r, c - 1)) f += R(px, py, 1, cell, 'rgba(255,255,255,.55)')
      if (!on(li, r + 1, c)) f += R(px, py + cell - 1, cell, 1, 'rgba(120,10,110,.55)')
      if (!on(li, r, c + 1)) f += R(px + cell - 1, py, 1, cell, 'rgba(120,10,110,.4)')
    }
    return f
  }
  // Partikel halus: butiran kecil pastel yang melayang pelan ke atas dan memudar di dalam bentuk huruf (terpotong clipPath huruf)
  const pr = rng(23), pcols = ['#fff3c4', '#ffe9f6', '#ffffff', '#ffd9a0']
  const particles = (li: number) => {
    const gw = wds[li] * cell, gx = x0 + offs[li] * cell
    let q = ''
    for (let k = 0; k < 26; k++) {
      const px = gx + pr() * (gw - 2), py = y0 + H * (.2 + pr() * .8), dy = -(8 + pr() * 12), dx = (pr() - .5) * 4, sz = +(k % 4 === 0 ? sub : sub * .65).toFixed(2), dur = (3.4 + pr() * 2.6).toFixed(2), dl = (-pr() * 6).toFixed(2)
      q += `<rect x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${sz}" height="${sz}" fill="${pcols[k % pcols.length]}" style="--dy:${dy.toFixed(1)}px;--dx:${dx.toFixed(1)}px;animation-duration:${dur}s;animation-delay:${dl}s"/>`
    }
    return `<g clip-path="url(#mqG${li})" class="mqp">${q}</g>`
  }
  const es = cell / 4, ext = ([[6, 6, '#2a0a4a'], [5, 5, '#3b0f5e'], [4, 4, '#5a1470'], [3, 3, '#7a1a8c'], [2, 2, '#9a2a9c'], [1, 1, '#b83aa8']] as [number, number, string][]).map(([dx, dy, f]) => [dx * es, dy * es, f] as [number, number, string])
  const W = w * cell, L = x0 - 8
  let defs = '', body = ''
  for (let li = 0; li < n; li++) {
    const d0 = (li * 0.09).toFixed(2), idle = (1.3 + li * 0.13).toFixed(2), gl = x0 + offs[li] * cell
    defs += `<clipPath id="mqG${li}">${rects(li, 0, 0, '#000')}</clipPath>`
    const outline = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1]].map(([dx, dy]) => rects(li, dx, dy, '#ffd6f4')).join('')
    const extrude = ext.map(([dx, dy, f]) => rects(li, dx, dy, f)).join('')
    // Kilau: pita diagonal yang bergerak mulus melintasi seluruh judul (waktu sama di tiap huruf, jadi tampak satu sapuan)
    const bx = L - gl, shine = `<g clip-path="url(#mqG${li})" class="mqs"><g><polygon points="${bx - 6},${y0 + H} ${bx + 44},${y0 + H} ${bx + 70},${y0} ${bx + 20},${y0}" fill="url(#mqShine)" opacity=".4"/><polygon points="${bx + 8},${y0 + H} ${bx + 28},${y0 + H} ${bx + 52},${y0} ${bx + 32},${y0}" fill="url(#mqShine)" opacity=".18"/><animateTransform attributeName="transform" type="translate" dur="6.5s" begin="1.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.4;0.8;1" keySplines=".4 0 .6 1;.45 0 .55 1;0 0 1 1" values="0 0;0 0;${W + 60} 0;${W + 60} 0"/></g></g>`
    body += `<g opacity="0">` +
      `<animate attributeName="opacity" from="0" to="1" dur="0.08s" begin="${d0}s" fill="freeze"/>` +
      // Masuk: jatuh dari atas, memantul sekali (overshoot) lalu mendarat
      `<animateTransform attributeName="transform" type="translate" dur="0.75s" begin="${d0}s" fill="freeze" calcMode="spline" keyTimes="0;0.55;0.78;1" keySplines=".3 0 .7 1;.3 0 .5 1;.3 0 .5 1" values="0 -36;0 5;0 -2;0 0"/>` +
      `<g><animateTransform attributeName="transform" type="translate" additive="sum" dur="2.6s" begin="${idle}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.25;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1;0 0 1 1" values="0 0;0 -2.5;0 0;0 0"/>` +
      `${extrude}${outline}${face(li)}${shine}${particles(li)}</g></g>`
  }
  // Huruf yang jatuh dipotong di dalam bingkai neon marquee
  return `<defs>${defs}<linearGradient id="mqShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff" stop-opacity=".25"/><stop offset=".5" stop-color="#fff" stop-opacity=".8"/><stop offset=".75" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="mqBox"><rect x="66" y="27" width="268" height="46"/></clipPath></defs><g clip-path="url(#mqBox)"><g class="mqt">${body}</g></g>`
}
// Lantai kayu: papan horizontal dengan sambungan berselang-seling, serat, dan sorot tipis; dinding gelap dengan plint di atasnya
function woodFloor() {
  const r = rng(21), tones = ['#8f5d36', '#a06a3c', '#83532f', '#a97244']
  let s = R(0, 784, 400, 16, '#241540') + R(0, 784, 400, 4, '#3d2766') + R(0, 800, 400, 4, '#150c28')
  let y = 201
  ;[3, 3, 4, 4, 5].forEach((h, k) => {
    const base = tones[k % 4]
    s += cellR(0, y, 100, h - 1, base) + cellR(0, y, 100, 1, mix(base, '#ffffff', .16)) + cellR(0, y + h - 1, 100, 1, '#4a2a14')
    const len = 30 + k * 2, off = (k * 13) % len
    for (let x = off; x < 100; x += len) s += cellR(x, y + 1, 1, h - 2, '#5a331a')
    for (let g = 0; g < 6; g++) s += cellR(Math.floor(r() * 92), y + 1 + Math.floor(r() * Math.max(1, h - 3)), 3 + Math.floor(r() * 5), 1, r() > .5 ? '#79492a' : '#b57d49')
    y += h
  })
  return s + R(40, 800, 320, 4, 'rgba(15,6,0,.5)') + R(56, 804, 288, 4, 'rgba(15,6,0,.36)') + R(76, 808, 248, 4, 'rgba(15,6,0,.22)')
}
// Langit malam mini di dalam marquee (di belakang teks MONETRA): gradasi, bulan sabit pixel, bintang berkelip, dan bintang jatuh
function marqueeSky(): string {
  const r = rng(9), X = 68, Y = 28, W = 264, H = 44
  const bands = ['#050b26', '#08103a', '#0c1546', '#13194f', '#1b1b58', '#2a1f60']
  let s = bands.map((c, k) => R(X, Y + (k * H) / 6, W, H / 6 + 1, c)).join('') + R(X, Y + H - 8, W, 8, 'rgba(255,95,184,.14)')
  for (let k = 0; k < 34; k++) {
    const x = X + 3 + Math.floor(r() * (W / 2 - 3)) * 2, y = Y + 3 + Math.floor(r() * (H / 2 - 3)) * 2, big = k % 7 === 0
    s += `<rect x="${x}" y="${y}" width="${big ? 3 : 2}" height="${big ? 3 : 2}" fill="${big ? '#fff' : '#cfdcff'}" opacity="${big ? 1 : .75}" class="tw${k % 3}"/>`
  }
  const rows: string[] = []
  for (let y = 0; y < 16; y++) { let row = ''; for (let x = 0; x < 16; x++) { const d = (x - 7.5) ** 2 + (y - 7.5) ** 2, a = d <= 7.4 ** 2, b = (x - 10.5) ** 2 + (y - 5.5) ** 2 <= 6.3 ** 2; row += a && !b ? (d > 5.6 ** 2 ? 'o' : 'm') : '.' } rows.push(row) }
  s += `<g transform="translate(76 34)">${sprite(rows, 1.5, 0, 0, { m: '#fff1b8', o: '#ffd978' })}</g>`
  s += `<g class="mqshoot">${[[0, 0, .95], [3, -2, .6], [6, -4, .35], [9, -6, .18]].map(([dx, dy, o]) => R(318 + dx, 32 + dy + 2, 2, 2, '#fff', '').replace('/>', ` opacity="${o}"/>`)).join('')}</g>`
  return `<defs><clipPath id="mqSkyBox"><rect x="${X}" y="${Y}" width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#mqSkyBox)">${s}</g>`
}
// ---- Ruang arcade pixel (tampilan desktop): dinding biru malam, papan marquee, deretan mesin, tanaman, bangku, lampu gantung, lantai ubin ----
type Kind = 'invaders' | 'fight' | 'race' | 'crystal' | 'maze'
type RCab = { body: string; accent: string; screen: string; lit: string; mq: string; kind: Kind; crt?: boolean; flick?: string; skew?: number; ball?: boolean }
// Isi layar: adegan game pixel kecil yang berbeda untuk tiap mesin
function screenArt(kind: Kind, x: number, y: number, w: number, h: number, c: RCab): string {
  const cx = x + Math.round(w / 2)
  let t = ''
  if (kind === 'invaders') {
    const gap = Math.floor((w - 24) / 5)
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) { const ax = x + 10 + col * gap, ay = y + 10 + row * 14; t += R(ax, ay, 8, 4, c.lit) + R(ax + 2, ay + 4, 4, 2, c.lit) + R(ax - 2, ay + 2, 2, 4, c.lit) + R(ax + 8, ay + 2, 2, 4, c.lit) + R(ax + 2, ay + 1, 2, 2, c.screen) + R(ax + 5, ay + 1, 2, 2, c.screen) }
    for (let k = 0; k < 4; k++) t += R(x + 10 + k * Math.floor((w - 30) / 3), y + h - 30, 12, 6, mix(c.lit, '#000000', .4))
    t += R(cx - 5, y + h - 14, 10, 4, '#fff') + R(cx - 2, y + h - 18, 4, 4, '#fff') + R(cx - 1, y + h - 42, 2, 8, '#ffe45e')
  } else if (kind === 'fight') {
    t += R(x + 6, y + 6, Math.round(w / 2) - 10, 4, '#7be07b') + R(cx + 4, y + 6, Math.round(w / 2) - 10, 4, '#ff5f6d') + R(cx - 3, y + 5, 6, 6, '#fff')
    t += R(x, y + h - 16, w, 2, c.lit) + R(x, y + h - 14, w, 14, mix(c.screen, '#000000', .35))
    const fig = (fx: number, col: string) => R(fx, y + h - 54, 8, 8, col) + R(fx - 2, y + h - 46, 12, 16, col) + R(fx - 4, y + h - 44, 4, 10, col) + R(fx + 10, y + h - 42, 6, 4, col) + R(fx, y + h - 30, 4, 14, mix(col, '#000000', .35)) + R(fx + 6, y + h - 30, 4, 14, mix(col, '#000000', .35))
    t += fig(cx - 34, c.lit) + fig(cx + 20, '#ff5f6d')
  } else if (kind === 'race') {
    const hz = y + Math.round(h * .42)
    t += R(x, hz - 14, w, 14, '#ffb36b') + R(cx - 8, hz - 22, 16, 10, '#fff1b8') + R(x, hz, w, h * .58, '#2a8a4a')
    t += `<polygon points="${cx - 4},${hz} ${cx + 4},${hz} ${x + w},${y + h} ${x},${y + h}" fill="#4a5078"/>`
    for (let k = 0; k < 5; k++) { const yy = hz + 6 + k * k * 4 + k * 4; t += R(cx - 1 - k, yy, 2 + k * 2, 3 + k, '#fff') }
    t += R(cx - 8, y + h - 20, 16, 8, '#ff5f6d') + R(cx - 6, y + h - 24, 12, 4, '#ff9aa0') + R(cx - 10, y + h - 14, 4, 4, '#000') + R(cx + 6, y + h - 14, 4, 4, '#000')
  } else if (kind === 'crystal') {
    t += R(x, y, w, Math.round(h / 2), mix(c.screen, '#000000', .25))
    t += `<polygon points="${cx},${y + 16} ${cx + 22},${y + 44} ${cx},${y + h - 18} ${cx - 22},${y + 44}" fill="#d8f0ff"/><polygon points="${cx},${y + 16} ${cx + 22},${y + 44} ${cx},${y + 44}" fill="#fff"/><polygon points="${cx},${y + 44} ${cx + 22},${y + 44} ${cx},${y + h - 18}" fill="#8fc8f0"/><polygon points="${cx - 22},${y + 44} ${cx},${y + 44} ${cx},${y + h - 18}" fill="#b4dcf8"/>`
    t += R(cx - 36, y + 24, 4, 4, '#fff') + R(cx + 30, y + 34, 4, 4, '#fff') + R(cx - 28, y + h - 30, 2, 2, '#fff') + R(cx + 26, y + h - 36, 2, 2, '#fff')
  } else {
    for (let k = 0; k < 2; k++) t += R(x + 6, y + 14 + k * 46, w - 12, 4, '#3a62c8') + R(x + 6, y + 14 + k * 46, 4, 36, '#3a62c8') + R(x + w - 10, y + 14 + k * 46, 4, 36, '#3a62c8')
    for (let k = 0; k < 8; k++) t += R(x + 14 + k * 10, y + 30, 3, 3, c.lit) + R(x + 14 + k * 10, y + 76, 3, 3, c.lit)
    t += R(cx - 8, y + h - 34, 12, 12, '#ffe45e') + R(cx - 2, y + h - 30, 6, 4, c.screen) + R(cx + 12, y + h - 34, 12, 12, '#ff5f6d') + R(cx + 14, y + h - 30, 3, 3, '#fff')
  }
  return t
}
let rcId = 0
// Gradasi vertikal halus (terang di atas, makin gelap ke bawah) dari beberapa pita transparan
function shade(x: number, y: number, w: number, h: number, n = 8, a0 = .1, a1 = .34): string {
  const bh = Math.ceil(h / n)
  let t = ''
  for (let k = 0; k < n; k++) t += R(x, y + k * bh, w, bh + 1, k === 0 ? `rgba(255,255,255,${(a0 * .8).toFixed(3)})` : k === 1 ? `rgba(255,255,255,${(a0 * .35).toFixed(3)})` : `rgba(0,0,0,${(a0 * .2 + ((a1 - a0 * .2) * (k - 2)) / (n - 3)).toFixed(3)})`)
  return t
}
function rcab(x: number, y: number, w: number, h: number, c: RCab, r: () => number): string {
  const id = `rcb${rcId++}`
  const hi = mix(c.body, '#ffffff', .28), mid = mix(c.body, '#ffffff', .12), lo = mix(c.body, '#000000', .36), dk = mix(c.body, '#000000', .66)
  const mqH = 32, monH = Math.round((h * 0.37) / 2) * 2, sy = y + mqH + 2, py = sy + monH, bz = c.crt ? 10 : 6, by0 = y + mqH, bh = h - mqH
  let s = R(x - 12, y + h - 2, w + 24, 10, 'rgba(0,0,0,.42)') + R(x - 6, y + h - 2, w + 12, 4, 'rgba(0,0,0,.25)')
  // badan meruncing dengan gradasi, sisi bertingkat berdither, dan garis tepi (T-molding) beraksen
  const pts = `${x + 4},${by0} ${x + w - 4},${by0} ${x + w},${y + h} ${x},${y + h}`
  s += `<defs><clipPath id="${id}"><polygon points="${pts}"/></clipPath></defs><polygon points="${pts}" fill="${c.body}"/><g clip-path="url(#${id})">${shade(x, by0, w, bh)}`
  s += R(x + 3, by0 + 2, 5, bh - 4, hi) + R(x + 8, by0 + 2, 3, bh - 4, mid) + R(x + w - 12, by0 + 2, 3, bh - 4, 'rgba(0,0,0,.14)') + R(x + w - 9, by0 + 2, 5, bh - 4, lo) + R(x + w - 4, by0 + 2, 4, bh - 4, dk)
  for (let yy = by0 + 2, k = 0; yy < y + h - 10; yy += 4, k++) s += R(x + 11 + (k % 2) * 2, yy, 2, 2, mid) + R(x + w - 14 - (k % 2) * 2, yy, 2, 2, 'rgba(0,0,0,.16)')
  s += R(x + 4, y + h - 22, w - 8, 18, 'rgba(0,0,0,.18)') + `</g>`
  s += R(x, by0 + 6, 2, bh - 6, c.accent) + R(x + w - 2, by0 + 6, 2, bh - 6, c.accent)
  for (let yy = py + 30; yy < y + h - 20; yy += 12) s += R(x + 5, yy, 3, 6, c.accent) + R(x + w - 8, yy, 3, 6, c.accent)
  // marquee dengan sudut bertingkat (membulat), grafik batang, kilap, dan lampu
  s += R(x + 8, y, w - 16, 2, dk) + R(x + 6, y + 2, w - 12, 2, dk) + R(x + 4, y + 4, w - 8, mqH - 4, dk) + R(x + 8, y + 4, w - 16, mqH - 8, c.mq) + R(x + 8, y + mqH - 12, w - 16, 4, 'rgba(0,0,0,.18)')
  for (let k = 0; k < 6; k++) s += R(x + 12 + Math.floor((r() * (w - 44)) / 4) * 4, y + 8 + (k % 3) * 6, 10 + Math.floor(r() * 5) * 4, 4, [c.lit, c.accent, '#fff'][k % 3])
  s += R(x + 8, y + 4, w - 16, 2, 'rgba(255,255,255,.4)') + R(x + 8, y - 8, w - 16, 8, 'rgba(255,214,140,.08)') + R(x + 10, y - 4, w - 20, 4, 'rgba(255,214,140,.06)')
  for (let k = 0; k < Math.floor((w - 20) / 10); k++) s += R(x + 11 + k * 10, y + mqH - 6, 4, 2, k % 2 ? '#fff' : c.lit)
  // monitor: bezel berlapis dengan sudut membulat, layar bervinyet, isi game, garis pindai, dan kilap lembut
  s += R(x - 4, sy + 2, w + 8, monH - 4, dk) + R(x - 2, sy, w + 4, monH, dk) + R(x - 2, sy + 2, w + 4, 2, mix(dk, '#ffffff', .25)) + R(x - 4 + (c.crt ? 2 : 0), sy + 6, 2, monH - 12, mix(dk, '#ffffff', .12))
  const sx = x + bz, sw = w - bz * 2, syy = sy + bz + 2, sh = monH - bz * 2 - 4
  s += `<g class="${c.flick || ''}">` + R(sx, syy, sw, sh, c.screen) + R(sx, syy, sw, Math.round(sh / 3), mix(c.screen, '#ffffff', .12)) + screenArt(c.kind, sx, syy, sw, sh, c)
  for (let yy = syy; yy < syy + sh; yy += 4) s += R(sx, yy, sw, 2, 'rgba(0,0,0,.2)')
  s += R(sx, syy, sw, 4, 'rgba(0,0,0,.2)') + R(sx, syy + sh - 4, sw, 4, 'rgba(0,0,0,.26)') + R(sx, syy, 4, sh, 'rgba(0,0,0,.2)') + R(sx + sw - 4, syy, 4, sh, 'rgba(0,0,0,.2)')
  s += `<polygon points="${sx + 6},${syy + 2} ${sx + 30},${syy + 2} ${sx + 16},${syy + sh - 2} ${sx + 2},${syy + sh - 2}" fill="rgba(255,255,255,.07)"/><polygon points="${sx + 34},${syy + 2} ${sx + 40},${syy + 2} ${sx + 26},${syy + sh - 2} ${sx + 20},${syy + sh - 2}" fill="rgba(255,255,255,.05)"/></g>`
  s += R(sx, syy, 4, 4, dk) + R(sx + sw - 4, syy, 4, 4, dk) + R(sx, syy + sh - 4, 4, 4, dk) + R(sx + sw - 4, syy + sh - 4, 4, 4, dk)
  if (c.crt) s += R(x - 6, sy, 4, 4, c.body) + R(x + w + 2, sy, 4, 4, c.body) + R(x - 6, py - 4, 4, 4, c.body) + R(x + w + 2, py - 4, 4, 4, c.body)
  // panel kontrol miring dengan tepi bergradasi dan bayangan lembut di bawahnya
  s += `<polygon points="${x - 8},${py} ${x + w + 8},${py} ${x + w + 14},${py + 16} ${x - 14},${py + 16}" fill="${hi}"/>` + R(x - 8, py, w + 16, 2, 'rgba(255,255,255,.3)') + R(x - 14, py + 16, w + 28, 10, lo) + R(x - 14, py + 16, w + 28, 2, 'rgba(255,255,255,.25)') + R(x - 14, py + 22, w + 28, 4, 'rgba(0,0,0,.2)')
  s += R(x - 12, py + 26, w + 24, 4, 'rgba(0,0,0,.34)') + R(x - 10, py + 30, w + 20, 4, 'rgba(0,0,0,.2)') + R(x - 8, py + 34, w + 16, 4, 'rgba(0,0,0,.1)')
  s += R(x + 12, py + 7, 12, 5, '#06060e') + R(x + 17, py - 6, 3, 13, '#d5dcf5') + R(x + 19, py - 6, 1, 13, '#8a92b8') + R(x + 14, py - 12, 9, 8, '#e8445a') + R(x + 14, py - 6, 9, 2, '#a82438') + R(x + 15, py - 11, 3, 3, '#ffd0d4')
  const bc = ['#ffe45e', '#5ef2ff', '#ff5f6d', '#7be07b'], b0 = c.ball ? 64 : 38
  if (c.ball) s += R(x + 44, py + 4, 14, 9, '#06060e') + R(x + 46, py + 2, 10, 8, '#e04848') + R(x + 46, py + 8, 10, 2, '#a02a2a') + R(x + 47, py + 3, 3, 3, '#ffb0b0')
  for (let k = 0; k < 4; k++) { const bx = x + b0 + k * 11, byy = py + 5 + (k % 2) * 3; s += R(bx - 1, byy + 1, 10, 6, '#06060e') + R(bx, byy, 8, 6, bc[k]) + R(bx, byy + 4, 8, 2, mix(bc[k], '#000000', .3)) + R(bx + 1, byy, 3, 2, '#fff') }
  s += R(x + w - 22, py + 6, 10, 5, '#fff') + R(x + w - 22, py + 9, 10, 2, '#b8bcd0') + R(x + w - 20, py + 7, 6, 2, '#ff5f6d')
  // pintu koin yang lebih realistis: dua mekanisme koin berbingkai logam, cawan pengembali, kunci, dan ventilasi
  const dx = x + Math.round(w / 2) - 22, dy = py + 40
  s += R(dx, dy, 44, 66, dk) + R(dx + 2, dy + 2, 40, 62, mix(dk, '#ffffff', .07)) + R(dx + 2, dy + 2, 40, 2, 'rgba(255,255,255,.2)') + R(dx, dy + 62, 44, 4, 'rgba(0,0,0,.3)')
  for (const [mx, col, col2] of [[dx + 5, '#ffd36b', c.accent], [dx + 25, '#ff5f6d', '#cfd6f5']] as [number, string, string][]) s += R(mx, dy + 8, 14, 24, '#262634') + R(mx + 1, dy + 9, 12, 22, '#555570') + R(mx + 1, dy + 9, 12, 2, 'rgba(255,255,255,.3)') + R(mx + 3, dy + 11, 8, 14, '#10101a') + R(mx + 6, dy + 13, 2, 9, col) + R(mx + 3, dy + 26, 8, 3, col2)
  s += R(dx + 10, dy + 38, 24, 14, lo) + R(dx + 12, dy + 40, 20, 10, '#08080f') + R(dx + 10, dy + 38, 24, 2, 'rgba(255,255,255,.22)') + R(dx + 19, dy + 56, 6, 4, '#cfd6f5')
  for (let k = 0; k < 4; k++) s += R(x + 10, dy + 6 + k * 6, 20, 2, dk) + R(x + w - 30, dy + 6 + k * 6, 20, 2, dk)
  s += R(x + 2, y + h - 14, w - 4, 10, dk) + R(x + 2, y + h - 14, w - 4, 2, 'rgba(255,255,255,.1)') + R(x + 6, y + h - 4, 14, 4, '#05050c') + R(x + w - 20, y + h - 4, 14, 4, '#05050c')
  return c.skew ? `<g transform="translate(${x} ${y + h}) skewY(${c.skew}) translate(${-x} ${-(y + h)})">${s}</g>` : s
}
export function roomScene(): string {
  const r = rng(77)
  let s = ''
  // dinding bergradasi + garis panel
  const wall = ['#0d1330', '#0f1637', '#121a3e', '#141e44', '#172249', '#1a264e', '#1c2852', '#1e2b56']
  wall.forEach((c, k) => { s += R(0, 54 + k * 61, 1280, 62, c) })
  for (let y = 120; y < 540; y += 44) s += R(0, y, 1280, 2, 'rgba(0,0,0,.2)')
  for (let x = 0; x < 1280; x += 160) s += R(x, 54, 2, 490, 'rgba(0,0,0,.14)')
  // langit-langit dan balok
  s += R(0, 0, 1280, 44, '#080c20') + R(0, 44, 1280, 10, '#1b2350') + R(0, 54, 1280, 4, '#0a0f28')
  for (let x = 80; x < 1280; x += 200) s += R(x, 0, 6, 44, '#141a3c')
  // papan marquee oranye bercahaya di dinding
  const sign = (x: number, w: number) => {
    let t = R(x - 8, 62, w + 16, 84, 'rgba(255,170,60,.1)') + R(x, 68, w, 68, '#6b2f14') + R(x + 6, 74, w - 12, 56, '#ffb347')
    for (let k = 0; k < 9; k++) t += R(x + 12 + Math.floor((r() * (w - 44)) / 4) * 4, 80 + Math.floor((r() * 32) / 4) * 4, 12 + Math.floor(r() * 4) * 4, 8, ['#7a2d3a', '#2a6f7a', '#ff6a3c', '#fff1b8'][k % 4])
    return t
  }
  s += sign(100, 370) + sign(810, 370) + R(100, 136, 370, 8, 'rgba(255,170,60,.16)') + R(810, 136, 370, 8, 'rgba(255,170,60,.16)')
  // poster di dinding kanan
  const posters: [number, number, number, number, string][] = [[1204, 172, 48, 64, '#c9d6ff'], [1212, 248, 40, 40, '#ffd9a0'], [1204, 300, 48, 52, '#7fb6ff']]
  posters.forEach(([x, y, w, h, c]) => { s += R(x, y, w, h, '#0b1030') + R(x + 4, y + 4, w - 8, h - 8, c) + R(x + 10, y + 12, w - 20, 6, 'rgba(0,0,0,.35)') + R(x + 10, y + 24, w - 28, 4, 'rgba(0,0,0,.25)') })
  // lantai ubin berperspektif (titik hilang di tengah)
  const ys = [540, 566, 598, 636, 680, 720], tc = ['#2c4aa0', '#1d3170', '#3a62c8', '#25397f']
  s += R(0, 534, 1280, 8, '#0a0f28')
  for (let j = 0; j < ys.length - 1; j++) {
    const xr = (k: number, y: number) => (640 + (k * 120 * (y - 330)) / 390).toFixed(1)
    for (let k = -14; k < 14; k++) {
      const c = tc[(j + k + 28) % 2 + (r() > .86 ? 2 : 0)]
      s += `<polygon points="${xr(k, ys[j])},${ys[j]} ${xr(k + 1, ys[j])},${ys[j]} ${xr(k + 1, ys[j + 1])},${ys[j + 1]} ${xr(k, ys[j + 1])},${ys[j + 1]}" fill="${c}"/>`
    }
  }
  // tanaman palem dan semak di kiri
  const frond = (pts: string, c: string) => `<polygon points="${pts}" fill="${c}"/>`
  s += frond('0,170 70,176 130,236 78,222 30,214 0,228', '#0e3a3f') + frond('0,236 64,248 120,330 70,306 24,290 0,300', '#145057') + frond('10,120 56,150 96,206 52,190 14,170', '#0b2f36') + frond('0,300 50,330 84,400 40,380 0,372', '#0e3a3f')
  s += R(54, 188, 6, 140, '#0a2a30') + R(0, 500, 90, 112, '#1b2350') + R(6, 480, 78, 40, '#26356e') + R(20, 462, 52, 26, '#2f4288') + R(30, 448, 30, 18, '#26356e')
  // mesin-mesin
  const A: RCab = { body: '#3a4a7c', accent: '#ff8a4a', screen: '#ff8a4a', lit: '#ffe0a8', mq: '#1e274c', kind: 'invaders', crt: true, flick: 'rm-scr' }
  const B: RCab = { body: '#a8344a', accent: '#ffd36b', screen: '#ffd36b', lit: '#fffbe0', mq: '#5e1a2a', kind: 'fight', ball: true }
  const C: RCab = { body: '#1d2550', accent: '#5ef2ff', screen: '#4f8a72', lit: '#cdf0b8', mq: '#2a1d5a', kind: 'maze' }
  const D: RCab = { body: '#2f4fa6', accent: '#ff5fb8', screen: '#2f8fe0', lit: '#bfe8ff', mq: '#1a2f6e', kind: 'crystal', flick: 'rm-scr2' }
  const E: RCab = { body: '#dc6a2a', accent: '#ffe45e', screen: '#ffb347', lit: '#fff1b8', mq: '#8c3a14', kind: 'race' }
  const put = (cx: number, w: number, h: number, c: RCab) => `<g transform="translate(${cx} 612) scale(1.38)">${rcab(-w / 2, -h, w, h, c, r)}</g>`
  s += put(178, 112, 328, A) + put(407, 116, 342, B) + put(867, 108, 326, C) + put(1088, 112, 336, D)
  // bayangan dan pantulan cahaya di lantai di bawah mesin tengah
  s += R(480, 606, 320, 10, 'rgba(0,0,0,.4)') + R(500, 616, 280, 18, 'rgba(255,95,184,.14)') + R(530, 634, 220, 14, 'rgba(255,95,184,.08)')
  s += R(130, 616, 96, 22, 'rgba(255,138,74,.14)') + R(1040, 616, 96, 22, 'rgba(58,168,255,.16)')
  // lampu gantung teal tepat di atas mesin Wrapped
  s += `<polygon points="596,100 684,100 840,545 440,545" fill="rgba(120,220,255,.07)"/>` + R(638, 44, 4, 52, '#0a0f28') + `<polygon points="602,100 678,100 658,74 622,74" fill="#2f9fa0"/>` + R(602, 100, 76, 6, '#7fe0d8') + `<g class="rm-lamp">${R(626, 106, 28, 8, '#fff6c2')}</g>`
  // vinyet tepi
  s += R(0, 0, 60, 720, 'rgba(0,0,0,.22)') + R(1220, 0, 60, 720, 'rgba(0,0,0,.22)')
  return `<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${s}</svg>`
}

export function cabinet(): string {
  const PK = '#ff5fb8', CY = '#5ef2ff', DK = '#0b0914'
  const body: Slab = { out: '#2d2950', base: '#1c1a2e', hi: '#2b2848', sh: '#0f0d1c' }
  const deck: Slab = { out: '#4a4478', base: '#241f40', hi: '#34305c', sh: '#13102a' }
  const st = slab(18, 197, 12, 4, { out: '#2d2950', base: DK }) + slab(70, 197, 12, 4, { out: '#2d2950', base: DK }) +
    slab(14, 176, 72, 23, body) +
    [0, 1, 2].map(k => cellR(17, 182 + k * 3, 10, 1, DK) + cellR(73, 182 + k * 3, 10, 1, DK)).join('') +
    slab(37, 177, 26, 18, { out: '#3a3560', base: '#07060f', sh: '#04030a' }) + slab(48, 180, 4, 7, { out: PK, base: '#000' }) +
    slab(12, 22, 76, 6, body) + slab(8, 26, 84, 122, body) +
    slab(15, 26, 70, 120, { out: '#2f2b52', base: '#05040b', sh: '#02020a' }) +
    slab(13, 3, 74, 19, body) + slab(16, 6, 68, 13, { out: '#c93e90', base: '#050b26' }) +
    slab(10, 148, 80, 5, { out: '#4a4478', base: '#3a3470', hi: '#5a54a0' }) + slab(5, 152, 90, 25, deck) +
    slab(19, 156, 12, 12, { out: '#0d0b18', base: '#06050c' })
  // Aksen tunggal: garis neon pink tipis di sisi badan dan tepi atas panel kontrol
  const accents = R(38, 112, 2, 464, 'rgba(255,95,184,.8)') + R(360, 112, 2, 464, 'rgba(255,95,184,.8)') + R(28, 614, 344, 2, PK)
  // Penghalusan: gradasi vertikal di sisi badan dan badan bawah, dither tepi, dan kilap tipis di bezel
  let soft = shade(34, 108, 24, 480, 10, .1, .3) + shade(342, 108, 24, 480, 10, .1, .3) + shade(62, 712, 276, 82, 4, .04, .22)
  for (let yy = 112, k = 0; yy < 584; yy += 4, k++) soft += R(48 + (k % 2) * 2, yy, 2, 2, 'rgba(255,255,255,.07)') + R(350 - (k % 2) * 2, yy, 2, 2, 'rgba(0,0,0,.14)')
  soft += `<polygon points="64,108 110,108 74,584 64,584" fill="rgba(255,255,255,.05)"/>` + R(34, 596, 332, 4, 'rgba(0,0,0,.25)') + R(34, 600, 332, 4, 'rgba(0,0,0,.12)')
  const btn = (cls: string, cx: number, r: number, c: string) => `<g class="${cls}">${disc(cx, 652, r + 5, '#0d0b18')}${disc(cx, 648, r + 2, mix(c, '#000000', .45))}${disc(cx, 646, r, c)}${R(cx - r / 2 - 2, 646 - r / 2 - 4, 4, 4, '#fff')}</g>`
  return `<g class="wfloor">${woodFloor()}</g><g class="neon">${st}${accents}${soft}</g>` +
    `${marqueeSky()}<g class="mq">${pixelTitle('MONETRA', 200, 34, 3.5)}</g>` +
    `<text class="insc" x="200" y="768" font-size="6" text-anchor="middle" fill="#9a94c8">INSERT COIN</text><rect class="slotfx" x="192" y="720" width="16" height="28" fill="${PK}"/>` +
    `<g class="joy">${R(96, 612, 8, 40, '#aab4d8')}${R(100, 612, 4, 40, '#6c7299')}${disc(100, 608, 14, '#b0306f')}${disc(100, 606, 13, PK)}${R(92, 598, 4, 4, '#ffc2e4')}${R(96, 594, 4, 4, '#ffc2e4')}</g>` +
    btn('bA', 232, 12, PK) + btn('bB', 272, 12, CY) + btn('bS', 318, 8, '#cfe6ff') +
    `<g class="cin"><g transform="translate(194 722)">${sprite(COIN_T, 3, 0, 0, CC)}</g></g><text class="klg" x="200" y="704" font-size="10" text-anchor="middle" fill="#ffe45e">KLING!</text>` + handSVG() +
    `<g transform="translate(202 734)"><g class="dcoin"><g class="dface">${sprite(COIN, 3, -12, -12, CC)}</g><g class="dedge">${sprite(COIN_T, 3, -6, -12, CC)}</g></g></g>`
}
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
