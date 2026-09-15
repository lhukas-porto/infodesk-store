import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function escapeXml(unsafe) {
  if (!unsafe) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default async function handler(req, res) {
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'infodesk.net.br'
  let host = String(rawHost).trim().toLowerCase().split(':')[0]
  if (host.startsWith('www.')) host = host.slice(4)

  let primaryDomain = host.includes('localhost') ? 'infodesk.net.br' : host

  try {
    // 1. Tenta carregar domínio das configurações da loja (store_settings)
    const { data: storeSetting } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'marketing_settings')
      .maybeSingle()

    if (storeSetting?.value?.primary_domain) {
      primaryDomain = String(storeSetting.value.primary_domain).trim().toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '')
    }

    // 2. Busca produtos ativos da loja
    let products = []
    const { data: prodsData, error: prodsErr } = await supabase
      .from('products')
      .select('id, name, slug, updated_at, created_at, active')
      .eq('active', true)
      .order('updated_at', { ascending: false })

    if (!prodsErr && prodsData) {
      products = prodsData
    }

    const baseUrl = `https://${primaryDomain}`
    const now = new Date().toISOString().split('T')[0]

    // Categorias padrão da vitrine
    const categories = ['Hardware', 'Periféricos', 'Monitores', 'Notebooks', 'Redes', 'Acessórios']

    const urls = []

    // 1. Home
    urls.push(`  <url>
    <loc>${escapeXml(baseUrl)}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`)

    // 2. Vitrine de Produtos / Catálogo
    urls.push(`  <url>
    <loc>${escapeXml(baseUrl)}/#products</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`)

    // 3. Categorias
    categories.forEach(cat => {
      const catSlug = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      urls.push(`  <url>
    <loc>${escapeXml(baseUrl)}/#category-${encodeURIComponent(catSlug)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    })

    // 4. Produtos individuais (com URL amigável e canônica)
    products.forEach(p => {
      const pSlug = p.slug || p.id
      const pMod = (p.updated_at || p.created_at || now).split('T')[0]
      urls.push(`  <url>
    <loc>${escapeXml(baseUrl)}/#product-${escapeXml(pSlug)}</loc>
    <lastmod>${pMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`)
    })

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    return res.end(sitemapXml)
  } catch (err) {
    console.error('Sitemap: Erro ao gerar XML:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain')
    return res.end('Erro interno ao gerar Sitemap.')
  }
}
