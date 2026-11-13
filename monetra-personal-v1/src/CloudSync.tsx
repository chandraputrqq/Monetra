import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { Cloud, LogOut, RefreshCw } from 'lucide-react'
import { supabase, cloudEnabled } from './supabase'
import { getLang } from './i18n'

const L = (id: string, en: string) => (getLang() === 'id' ? id : en)

export type CloudStatus = 'off' | 'idle' | 'syncing' | 'synced' | 'error'
export type CloudApi = {
  enabled: boolean; ready: boolean; user: User | null; status: CloudStatus; error: string; lastSync: string | null
  signIn: (email: string, password: string) => Promise<{ ok: boolean; msg: string }>
  signUp: (email: string, password: string) => Promise<{ ok: boolean; msg: string }>
  resetPassword: (email: string) => Promise<{ ok: boolean; msg: string }>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

const KEYS = ['transactions', 'budgets', 'goals', 'recurring', 'debts', 'challenges']
const hasRecords = (s: any) => !!s && KEYS.some(k => Array.isArray(s[k]) && s[k].length > 0)
const normalize = (d: any) => ({ transactions: [], budgets: [], goals: [], recurring: [], debts: [], challenges: [], currency: 'IDR', demo: false, ...(d || {}) })
// JSON dengan urutan key tetap: jsonb di Postgres mengurutkan ulang key, jadi perbandingan harus stabil.
const stable = (v: any): string => {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']'
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}'
  return JSON.stringify(v)
}
const friendly = (m: string) => {
  const s = (m || '').toLowerCase()
  if (s.includes('invalid login')) return L('Email atau kata sandi salah.', 'Wrong email or password.')
  if (s.includes('already registered')) return L('Email ini sudah terdaftar. Silakan masuk.', 'This email is already registered. Please sign in.')
  if (s.includes('not confirmed')) return L('Email belum dikonfirmasi. Cek kotak masukmu.', 'Email not confirmed yet. Check your inbox.')
  if (s.includes('password') && s.includes('least')) return L('Kata sandi minimal 6 karakter.', 'Password must be at least 6 characters.')
  if (s.includes('rate limit')) return L('Terlalu banyak percobaan. Coba lagi sebentar lagi.', 'Too many attempts. Try again shortly.')
  if (s.includes('fetch') || s.includes('network')) return L('Tidak bisa terhubung ke server. Periksa internetmu.', 'Cannot reach the server. Check your connection.')
  return m || L('Terjadi kesalahan.', 'Something went wrong.')
}

/** Sinkronisasi data MONETRA ke Supabase. Data lokal (localStorage) tetap jadi sumber utama; cloud = cadangan + sinkron antar perangkat. */
export function useCloudSync(store: any, setStore: (s: any) => void): CloudApi {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!cloudEnabled)
  const [status, setStatus] = useState<CloudStatus>(cloudEnabled ? 'idle' : 'off')
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState<string | null>(null)
  const storeRef = useRef(store); storeRef.current = store
  const lastJson = useRef('')        // state terakhir yang diketahui sama dengan cloud
  const pulled = useRef(false)
  const timer = useRef<number | null>(null)
  const lastPushAt = useRef(0)
  const uid = user?.id

  const fail = useCallback((m: string) => { setStatus('error'); setError(friendly(m)) }, [])

  const pushNow = useCallback(async (id: string, s: any) => {
    if (!supabase) return
    const { error: err } = await supabase.from('monetra_data').upsert({ user_id: id, data: s, updated_at: new Date().toISOString() })
    if (err) { fail(err.message); return }
    lastJson.current = stable(s); lastPushAt.current = Date.now()
    setStatus('synced'); setError(''); setLastSync(new Date().toISOString())
  }, [fail])

  // 1) sesi login
  useEffect(() => {
    if (!supabase) return
    let alive = true
    supabase.auth.getSession().then(({ data }) => { if (alive) { setUser(data.session?.user ?? null); setReady(true) } })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  // 2) setelah login: ambil data cloud dan gabungkan dengan data perangkat ini
  useEffect(() => {
    pulled.current = false
    if (!supabase || !uid) { setStatus(cloudEnabled ? 'idle' : 'off'); return }
    let cancelled = false
    ;(async () => {
      setStatus('syncing'); setError('')
      const { data, error: err } = await supabase!.from('monetra_data').select('data,updated_at').eq('user_id', uid).maybeSingle()
      if (cancelled) return
      if (err) { fail(err.message); return }
      const local = storeRef.current
      if (!data || !hasRecords(data.data)) { pulled.current = true; await pushNow(uid, local); return }
      const remote = normalize(data.data)
      if (stable(remote) === stable(normalize(local))) { pulled.current = true; lastJson.current = stable(local); setStatus('synced'); setLastSync(data.updated_at); return }
      let useCloud = true
      if (hasRecords(local)) {
        useCloud = window.confirm(L(
          'Data di cloud berbeda dengan data di perangkat ini.\n\nOK = pakai data CLOUD (data di perangkat ini diganti).\nBatal = pakai data PERANGKAT INI (data cloud ditimpa).',
          'The cloud data differs from the data on this device.\n\nOK = use CLOUD data (this device\'s data is replaced).\nCancel = use THIS DEVICE\'s data (cloud is overwritten).'))
      }
      pulled.current = true
      if (useCloud) { lastJson.current = stable(remote); setStore(remote); setStatus('synced'); setLastSync(data.updated_at) }
      else await pushNow(uid, local)
    })()
    return () => { cancelled = true }
  }, [uid, fail, pushNow, setStore])

  // 3) setiap data berubah: kirim ke cloud (ditunda 1,5 detik supaya tidak boros)
  useEffect(() => {
    if (!supabase || !uid || !pulled.current) return
    if (stable(store) === lastJson.current) return
    setStatus('syncing')
    timer.current = window.setTimeout(() => { timer.current = null; pushNow(uid, storeRef.current) }, 1500)
    return () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null } }
  }, [store, uid, pushNow])

  // 4) perubahan dari perangkat lain muncul otomatis (Realtime)
  useEffect(() => {
    if (!supabase || !uid) return
    const client = supabase
    const channel = client.channel('monetra-' + uid).on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'monetra_data', filter: `user_id=eq.${uid}` },
      (payload: any) => {
        if (timer.current || Date.now() - lastPushAt.current < 4000) return   // abaikan gema dari tulisan kita sendiri
        const incoming = normalize(payload?.new?.data)
        const j = stable(incoming)
        if (j === lastJson.current || j === stable(storeRef.current)) return
        lastJson.current = j; setStore(incoming); setLastSync(new Date().toISOString()); setStatus('synced')
      }).subscribe()
    return () => { client.removeChannel(channel) }
  }, [uid, setStore])

  const signIn: CloudApi['signIn'] = async (email, password) => {
    if (!supabase) return { ok: false, msg: '' }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    return err ? { ok: false, msg: friendly(err.message) } : { ok: true, msg: '' }
  }
  const signUp: CloudApi['signUp'] = async (email, password) => {
    if (!supabase) return { ok: false, msg: '' }
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
    if (err) return { ok: false, msg: friendly(err.message) }
    return { ok: true, msg: data.session ? '' : L('Pendaftaran berhasil. Cek emailmu untuk konfirmasi, lalu masuk.', 'Signed up. Check your email to confirm, then sign in.') }
  }
  const resetPassword: CloudApi['resetPassword'] = async (email) => {
    if (!supabase) return { ok: false, msg: '' }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    return err ? { ok: false, msg: friendly(err.message) } : { ok: true, msg: L('Tautan reset kata sandi sudah dikirim ke emailmu.', 'A password reset link was sent to your email.') }
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut() }
  const syncNow = async () => { if (uid) { setStatus('syncing'); await pushNow(uid, storeRef.current) } }

  return { enabled: cloudEnabled, ready, user, status, error, lastSync, signIn, signUp, resetPassword, signOut, syncNow }
}

/** Panel "Akun & sinkronisasi cloud" untuk halaman Pengaturan. */
export function CloudPanel({ cloud }: { cloud: CloudApi }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const run = async (fn: () => Promise<{ ok: boolean; msg: string }>) => {
    setBusy(true); setMsg(null)
    const r = await fn()
    setBusy(false)
    if (r.msg) setMsg({ ok: r.ok, text: r.msg })
    if (r.ok) setPassword('')
  }
  const submit = (e: FormEvent) => { e.preventDefault(); run(() => cloud.signIn(email.trim(), password)) }
  const statusText = cloud.status === 'syncing' ? L('Menyinkronkan…', 'Syncing…')
    : cloud.status === 'synced' ? L('Tersinkron', 'Synced')
    : cloud.status === 'error' ? L('Gagal sinkron', 'Sync failed') : L('Siap', 'Ready')
  const when = cloud.lastSync ? new Date(cloud.lastSync).toLocaleString(getLang() === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }) : ''

  return <section className="panel settings-panel page-enter"><div className="settings-section">
    <div className="settings-icon"><Cloud size={18} /></div>
    <div className="settings-copy">
      <h2>{L('Akun & sinkronisasi cloud', 'Account & cloud sync')}</h2>
      {!cloud.enabled && <p>{L('Cloud belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY (lihat README), lalu build ulang. Sementara itu, datamu tetap tersimpan di browser ini.', 'Cloud is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README) and rebuild. Meanwhile your data stays in this browser.')}</p>}
      {cloud.enabled && !cloud.ready && <p>{L('Memeriksa sesi…', 'Checking session…')}</p>}
      {cloud.enabled && cloud.ready && !cloud.user && <>
        <p>{L('Masuk untuk mencadangkan datamu ke cloud dan membukanya di perangkat lain. Tanpa masuk, MONETRA tetap berjalan lokal.', 'Sign in to back up your data to the cloud and open it on other devices. Without signing in, MONETRA keeps working locally.')}</p>
        <form className="cloud-form" onSubmit={submit}>
          <input type="email" required autoComplete="email" placeholder="email@contoh.com" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" />
          <input type="password" required minLength={6} autoComplete="current-password" placeholder={L('Kata sandi (min. 6 karakter)', 'Password (min. 6 characters)')} value={password} onChange={e => setPassword(e.target.value)} aria-label={L('Kata sandi', 'Password')} />
          <div className="cloud-actions">
            <button type="submit" className="primary-button" disabled={busy}>{L('Masuk', 'Sign in')}</button>
            <button type="button" className="secondary-button" disabled={busy || !email || password.length < 6} onClick={() => run(() => cloud.signUp(email.trim(), password))}>{L('Daftar', 'Sign up')}</button>
            <button type="button" className="text-link" disabled={busy || !email} onClick={() => run(() => cloud.resetPassword(email.trim()))}>{L('Lupa kata sandi?', 'Forgot password?')}</button>
          </div>
          {msg && <p className={`cloud-msg ${msg.ok ? 'ok' : 'err'}`} role="status">{msg.text}</p>}
        </form>
      </>}
      {cloud.enabled && cloud.user && <>
        <p>{L('Masuk sebagai', 'Signed in as')} <strong>{cloud.user.email}</strong>. {L('Perubahan disimpan otomatis ke cloud.', 'Changes are saved to the cloud automatically.')}</p>
        <div className="cloud-status"><span className={`cloud-badge ${cloud.status}`}>{statusText}</span>{when && <small>{L('Terakhir', 'Last')}: {when}</small>}</div>
        {cloud.error && <p className="cloud-msg err" role="alert">{cloud.error}</p>}
        <div className="cloud-actions">
          <button className="secondary-button" onClick={() => cloud.syncNow()} disabled={cloud.status === 'syncing'}><RefreshCw size={14} /> {L('Sinkronkan sekarang', 'Sync now')}</button>
          <button className="secondary-button" onClick={() => cloud.signOut()}><LogOut size={14} /> {L('Keluar', 'Sign out')}</button>
        </div>
        <p className="cloud-note">{L('Catatan: riwayat pindai struk tidak ikut disinkronkan. "Hapus semua data" juga akan menghapus data cloud saat kamu masih masuk.', 'Note: receipt scan history is not synced. "Clear all data" also clears cloud data while you are signed in.')}</p>
      </>}
    </div>
  </div></section>
}
