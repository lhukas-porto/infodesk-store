import { createClient } from '@supabase/supabase-js'

const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : null
const envKey = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : null
const procUrl = typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL : null
const procKey = typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY : null

const supabaseUrl = envUrl || procUrl || 'https://wcddxzbjttfxrercadlb.supabase.co'
const supabaseAnonKey = envKey || procKey || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://sua-url-aqui.supabase.co'
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
