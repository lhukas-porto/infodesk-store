import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function normalizeHost(rawHost) {
  if (!rawHost) return 'infodesk.net.br'
  let host = String(rawHost).trim().toLowerCase()
  if (host.includes(':')) host = host.split(':')[0]
  if (host.startsWith('www.')) host = host.slice(4)
  return host
}

export default async function handler(req, res) {
  const host = normalizeHost(req.headers['x-forwarded-host'] || req.headers.host || req.query?.host)

  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'marketing_settings')
      .maybeSingle()

    const primaryDomain = data?.value?.primary_domain || host || 'infodesk.net.br'

    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({
      success: true,
      tenant_id: 'default',
      hostname: host,
      primary_domain: primaryDomain,
      is_dev: host === 'localhost' || host === '127.0.0.1'
    }))
  } catch (err) {
    console.warn('API store lookup warning:', err)
  }

  // Fallback seguro White-Label
  res.setHeader('Content-Type', 'application/json')
  return res.end(JSON.stringify({
    success: true,
    tenant_id: 'default',
    hostname: host,
    primary_domain: host || 'infodesk.net.br',
    is_dev: host === 'localhost' || host === '127.0.0.1'
  }))
}
