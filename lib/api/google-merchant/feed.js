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
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle inválidos em XML
}

export default async function handler(req, res) {
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'infodesk.net.br'
  let host = String(rawHost).trim().toLowerCase().split(':')[0]
  if (host.startsWith('www.')) host = host.slice(4)

  let primaryDomain = host.includes('localhost') ? 'infodesk.net.br' : host
  let storeName = 'Infodesk Store'
  let storeDescription = 'Catálogo Oficial de Produtos e Eletrônicos'
  let merchantEnabled = true

  try {
    // 1. Carrega dados da empresa e marketing
    const { data: mktSetting } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'marketing_settings')
      .maybeSingle()

    if (mktSetting?.value) {
      if (mktSetting.value.primary_domain) {
        primaryDomain = String(mktSetting.value.primary_domain).trim().toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '')
      }
      if (mktSetting.value.merchant_enabled !== undefined) {
        merchantEnabled = Boolean(mktSetting.value.merchant_enabled)
      }
      if (mktSetting.value.default_seo_title) {
        storeName = mktSetting.value.default_seo_title
      }
      if (mktSetting.value.default_seo_description) {
        storeDescription = mktSetting.value.default_seo_description
      }
    }

    const { data: compSetting } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', 'company_data')
      .maybeSingle()

    if (compSetting?.value?.nomeFantasia) {
      storeName = compSetting.value.nomeFantasia
    }

    if (!merchantEnabled) {
      res.statusCode = 403
      res.setHeader('Content-Type', 'application/xml; charset=utf-8')
      return res.end(`<?xml version="1.0" encoding="UTF-8"?>
<feed_disabled>
  <message>O Feed do Google Merchant Center está desativado para esta loja.</message>
</feed_disabled>`)
    }

    // 2. Busca produtos ativos elegíveis
    const { data: rawProducts, error: prodsErr } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('updated_at', { ascending: false })

    const products = (rawProducts || []).filter(p => {
      const price = parseFloat(p.price) || 0
      const hasImage = Boolean(p.images?.[0] || p.image)
      const notExcluded = p.merchant_include !== false
      return price > 0 && hasImage && notExcluded
    })

    const baseUrl = `https://${primaryDomain}`

    // 3. Montagem dos itens XML
    const itemsXml = products.map(p => {
      const pId = escapeXml(p.id)
      const pTitle = escapeXml(p.seo_title || p.name)
      const pDesc = escapeXml(p.seo_description || p.description || p.name)
      const pSlug = p.slug || p.id
      const pLink = `${baseUrl}/produto/${encodeURIComponent(pSlug)}?utm_source=google_shopping&amp;utm_medium=organic_merchant`
      const pImg = escapeXml(p.images?.[0] || p.image || `${baseUrl}/favicon.jpg`)
      const pPrice = `${(parseFloat(p.price) || 0).toFixed(2)} BRL`
      const pBrand = escapeXml(p.brand || storeName)
      const inStock = (parseInt(p.stock) || 0) > 0

      let xml = `    <item>
      <g:id>${pId}</g:id>
      <g:title>${pTitle}</g:title>
      <g:description>${pDesc}</g:description>
      <g:link>${pLink}</g:link>
      <g:image_link>${pImg}</g:image_link>
      <g:availability>${inStock ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${pPrice}</g:price>
      <g:brand>${pBrand}</g:brand>
      <g:condition>new</g:condition>`

      if (p.ean && String(p.ean).length >= 8) {
        xml += `\n      <g:gtin>${escapeXml(p.ean)}</g:gtin>`
      }

      if (p.mpn) {
        xml += `\n      <g:mpn>${escapeXml(p.mpn)}</g:mpn>`
      }

      if (p.google_category) {
        xml += `\n      <g:google_product_category>${escapeXml(p.google_category)}</g:google_product_category>`
      } else if (p.category) {
        xml += `\n      <g:product_type>${escapeXml(p.category)}</g:product_type>`
      }

      xml += '\n    </item>'
      return xml
    }).join('\n')

    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeName)}</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>${escapeXml(storeDescription)}</description>
${itemsXml}
  </channel>
</rss>`

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600')
    return res.end(rssXml)
  } catch (err) {
    console.error('Google Merchant Feed: Erro ao gerar XML:', err)
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain')
    return res.end('Erro interno ao gerar Feed do Google Merchant.')
  }
}
