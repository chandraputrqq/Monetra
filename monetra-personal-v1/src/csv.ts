// Pembuat CSV rapi untuk MONETRA: aman dibuka di Excel/Google Sheets, termasuk Excel berbahasa Indonesia.
// - BOM UTF-8 agar huruf/emoji tidak rusak
// - pemisah titik koma (;) untuk bahasa Indonesia (Excel Indonesia memakai ; sebagai pemisah daftar), koma (,) untuk English
// - semua sel diberi tanda kutip dengan escape yang benar, baris diakhiri CRLF
// - sel teks yang diawali = + - @ diberi apostrof agar tidak dijalankan sebagai rumus
export type CsvCell = string | number | null | undefined
export const csvDelimiter = (lang: string) => (lang === 'id' ? ';' : ',')

const cell = (v: CsvCell): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : ''
  let s = String(v).replace(/\r?\n/g, ' ').trim()
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export const buildCsv = (rows: CsvCell[][], delimiter = ';'): string =>
  '\uFEFF' + rows.map(r => r.map(cell).join(delimiter)).join('\r\n') + '\r\n'
