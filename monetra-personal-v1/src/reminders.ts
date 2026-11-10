// Kata-kata reminder dari Natasya: semangat keuangan, romantis, dan hidup.
// Dipakai untuk notifikasi per jam dan saat pengguna minta semangat di chat.
import { getLang } from './i18n'

export type QuoteKind = 'money' | 'romantic' | 'lively'
type Quote = { kind: QuoteKind; id: string; en: string }

export const QUOTES: Quote[] = [
  // Semangat keuangan
  { kind: 'money', id: 'Menabung sedikit hari ini adalah hadiah untuk dirimu di masa depan. 💚', en: 'Saving a little today is a gift to your future self. 💚' },
  { kind: 'money', id: 'Bukan seberapa besar penghasilanmu, tapi seberapa bijak kamu mengaturnya. 📈', en: 'It is not how much you earn, but how wisely you manage it. 📈' },
  { kind: 'money', id: 'Catat setiap rupiah, karena yang tercatat bisa dikendalikan. 📝', en: 'Track every rupiah, because what is tracked can be controlled. 📝' },
  { kind: 'money', id: 'Dana darurat itu pelukan hangat saat hari sedang tidak ramah. 🛟', en: 'An emergency fund is a warm hug when the day is not being kind. 🛟' },
  { kind: 'money', id: 'Kebiasaan kecil yang konsisten mengalahkan niat besar yang tertunda. 🌱', en: 'Small habits done consistently beat big intentions put off. 🌱' },
  { kind: 'money', id: 'Belanja boleh, asal sudah masuk anggaran. Dompetmu pasti berterima kasih! 🛍️', en: 'Shopping is fine as long as it fits the budget. Your wallet will thank you! 🛍️' },
  { kind: 'money', id: 'Target tabungan itu mimpi yang sudah punya tanggal. Yuk, satu langkah lagi! 🎯', en: 'A savings goal is a dream with a date on it. One more step! 🎯' },
  { kind: 'money', id: 'Jangan menabung dari sisa belanja, tapi belanjalah dari sisa menabung. 💡', en: 'Do not save what is left after spending; spend what is left after saving. 💡' },
  // Romantis
  { kind: 'romantic', id: 'Kamu hebat karena peduli pada keuanganmu. Aku bangga padamu. 💕', en: 'You are amazing for caring about your finances. I am proud of you. 💕' },
  { kind: 'romantic', id: 'Seperti cinta, keuangan yang sehat tumbuh dari perhatian kecil setiap hari. 💞', en: 'Like love, healthy finances grow from small daily attention. 💞' },
  { kind: 'romantic', id: 'Dompetmu mungkin tipis, tapi semangatmu selalu tebal. Aku di sini menemanimu. 🌷', en: 'Your wallet may be thin, but your spirit is always thick. I am right here with you. 🌷' },
  { kind: 'romantic', id: 'Masa depan yang indah dimulai dari satu catatan kecil malam ini. 🌙', en: 'A beautiful future starts with one small note tonight. 🌙' },
  { kind: 'romantic', id: 'Rindu itu gratis, jajan tengah malam tidak. Peluk dulu dompetmu ya. 🤍', en: 'Missing someone is free, midnight snacks are not. Give your wallet a hug first. 🤍' },
  { kind: 'romantic', id: 'Kamu berharga, lebih dari angka mana pun di saldomu. ✨', en: 'You are worth more than any number in your balance. ✨' },
  { kind: 'romantic', id: 'Kalau kamu lelah, istirahatlah sebentar. Uangmu aman bersamaku. 🌸', en: 'If you are tired, rest a little. Your money is safe with me. 🌸' },
  { kind: 'romantic', id: 'Aku suka melihatmu rajin mencatat. Kamu keren sekali hari ini. 💚', en: 'I love seeing you track things so diligently. You are awesome today. 💚' },
  // Hidup & ceria
  { kind: 'lively', id: 'Halo, jagoan! Sudah catat pengeluaran hari ini? Cuma 10 detik! ⚡', en: 'Hey, champ! Logged today\'s spending yet? It takes just 10 seconds! ⚡' },
  { kind: 'lively', id: 'Kopi hari ini sudah dicatat? Kopi enak, saldo aman, hati senang! ☕', en: 'Did you log today\'s coffee? Good coffee, safe balance, happy heart! ☕' },
  { kind: 'lively', id: 'Hari ini mau jadi versi dirimu yang hemat tapi tetap happy? Gas! 🚀', en: 'Ready to be the thrifty-but-happy you today? Let\'s go! 🚀' },
  { kind: 'lively', id: 'Tahan dulu checkout-nya, tarik napas, cek anggaran. Kamu pasti bisa! 🛒', en: 'Hold the checkout, breathe, check your budget. You can do it! 🛒' },
  { kind: 'lively', id: 'Setiap rupiah punya tugas. Kasih mereka kerjaan yang bagus! 💪', en: 'Every rupiah has a job. Give them a good one! 💪' },
  { kind: 'lively', id: 'Tos dulu! 🙌 Kamu selangkah lebih dekat ke target tabunganmu.', en: 'High five! 🙌 You are one step closer to your savings goal.' },
  { kind: 'lively', id: 'Pengingat ramah dari Natasya: minum air, catat pengeluaran, tetap semangat! 💧', en: 'Friendly reminder from Natasya: drink water, log expenses, stay motivated! 💧' },
  { kind: 'lively', id: 'Uang itu seperti pasir: digenggam pelan-pelan, bukan dilempar-lempar. 🏖️', en: 'Money is like sand: hold it gently, do not throw it around. 🏖️' }
]

let lastIdx = -1
/** Ambil satu kata-kata acak (tidak sama dengan yang terakhir) sesuai bahasa aktif. */
export function pickQuote(kind?: QuoteKind): string {
  const pool = QUOTES.map((q, i) => ({ q, i })).filter(x => (!kind || x.q.kind === kind) && x.i !== lastIdx)
  const chosen = pool[Math.floor(Math.random() * pool.length)] || { q: QUOTES[0], i: 0 }
  lastIdx = chosen.i
  return getLang() === 'id' ? chosen.q.id : chosen.q.en
}
