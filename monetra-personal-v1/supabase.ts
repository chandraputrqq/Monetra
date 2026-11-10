import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** true jika VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diisi. */
export const cloudEnabled = !!(url && key)

/** Klien Supabase. null jika belum dikonfigurasi, sehingga aplikasi tetap jalan 100% lokal. */
export const supabase = cloudEnabled
  ? createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true } })
  : null
