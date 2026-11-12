import { supabase } from './supabase'

export type NatasyaAIContext = {
  month: string
  today: string
  transactions: Array<Pick<{ name: string; amount: number; type: string; category: string; date: string }, 'name' | 'amount' | 'type' | 'category' | 'date'>>
  budgets: Array<{ category: string; limit: number }>
  goals: Array<{ name: string; target: number; saved: number; date: string; paused?: boolean; completed?: boolean }>
  debts: Array<{ direction: string; amount: number; payments: Array<{ amount: number }>; due?: string }>
}

export type NatasyaAIMessage = { role: 'user' | 'assistant'; content: string }

/**
 * Memanggil Supabase Edge Function. Kunci OpenAI tidak pernah dikirim ke browser.
 * Jika belum login / Edge Function belum dipasang, pemanggil dapat memakai otak lokal.
 */
export async function askNatasyaAI(input: {
  message: string
  history: NatasyaAIMessage[]
  context: NatasyaAIContext
}): Promise<string | null> {
  if (!supabase) return null

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.access_token) return null

  const { data, error } = await supabase.functions.invoke('natasya-ai', {
    body: input,
  })
  if (error || typeof data?.reply !== 'string') return null
  const reply = data.reply.trim()
  return reply.length ? reply : null
}
