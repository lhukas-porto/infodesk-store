// Endpoint Serverless: Consultar Status da Conexão com Mercado Livre
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
  return createClient(url, key)
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      res.statusCode = 200
      res.end(JSON.stringify({ connected: false, error: 'Supabase não conectado' }))
      return
    }

    const { data: config, error } = await supabase
      .from('mercadolivre_integrations')
      .select('enabled, user_id, nickname, email, expires_at, updated_at')
      .eq('store_id', 'default')
      .maybeSingle()

    if (error || !config || !config.enabled) {
      res.statusCode = 200
      res.end(JSON.stringify({ connected: false }))
      return
    }

    const isExpired = config.expires_at ? new Date(config.expires_at) < new Date() : false

    res.statusCode = 200
    res.end(JSON.stringify({
      connected: true,
      nickname: config.nickname || 'Conta Vinculada',
      email: config.email,
      userId: config.user_id,
      expiresAt: config.expires_at,
      isExpired,
      updatedAt: config.updated_at
    }))
  } catch (error) {
    res.statusCode = 500
    res.end(JSON.stringify({ connected: false, error: error.message }))
  }
}

