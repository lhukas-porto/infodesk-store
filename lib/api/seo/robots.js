import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function handler(req, res) {
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'infodesk.net.br'
  let host = String(rawHost).trim().toLowerCase().split(':')[0]
  if (host.startsWith('www.')) host = host.slice(4)

  let primaryDomain = host.includes('localhost') ? 'infodesk.net.br' : host

  try {
    const { data: storeSetting } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'marketing_settings')
      .maybeSingle()

    if (storeSetting?.value?.primary_domain) {
      primaryDomain = String(storeSetting.value.primary_domain).trim().toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '')
    }
  } catch (err) {
    console.warn('Robots: Falha ao buscar primary domain:', err)
  }

  const robotsTxt = `# Robots.txt oficial gerado dinamicamente para ${primaryDomain}
User-agent: *
Allow: /
Allow: /#products
Allow: /#produto/
Disallow: /admin
Disallow: /#admin
Disallow: /checkout
Disallow: /#checkout
Disallow: /carrinho
Disallow: /#cart
Disallow: /conta
Disallow: /#account
Disallow: /api/

Sitemap: https://${primaryDomain}/sitemap.xml
`

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
  return res.end(robotsTxt)
}
