import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

function escapeHtml(text) {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const BOT_USER_AGENTS = [
  'whatsapp',
  'facebookexternalhit',
  'facebot',
  'twitterbot',
  'telegrambot',
  'slackbot',
  'linkedinbot',
  'discordbot',
  'pinterest',
  'googlebot',
  'bingbot',
  'applebot'
]

export default async function handler(req, res) {
  const urlObj = new URL(req.url, 'http://localhost')
  const pathname = urlObj.pathname
  const userAgent = (req.headers['user-agent'] || '').toLowerCase()
  const rawHost = req.headers['x-forwarded-host'] || req.headers.host || 'infodesk.net.br'
  const proto = req.headers['x-forwarded-proto'] || 'https'
  const baseUrl = `${proto}://${rawHost}`

  // Extrair ID ou Slug da URL (ex: /p/123, /produto/notebook-gamer ou /api/seo/share?id=123)
  let identifier = urlObj.searchParams.get('id') || urlObj.searchParams.get('slug')
  if (!identifier) {
    const parts = pathname.split('/').filter(Boolean)
    // Se a rota for /p/xyz ou /produto/xyz
    if (parts.length >= 2 && (parts[0] === 'p' || parts[0] === 'produto')) {
      identifier = decodeURIComponent(parts[1])
    }
  }

  if (!identifier) {
    return res.writeHead(302, { Location: '/' }).end()
  }

  // Buscar produto no Supabase com fallback defensivo
  let product = null
  try {
    let query = supabase
      .from('products')
      .select('id, name, slug, price, original_price, description, images, brand, category, active')
      .limit(1)

    if (/^\d+$/.test(identifier) || /^[0-9a-fA-F-]{36}$/.test(identifier)) {
      query = query.or(`id.eq.${identifier},slug.eq.${identifier}`)
    } else {
      query = query.eq('slug', identifier)
    }

    const { data: prods, error } = await query
    if (!error && prods?.[0]) {
      product = prods[0]
    } else if (error) {
      // Fallback seguro se a coluna slug não existir
      let fallback = supabase
        .from('products')
        .select('id, name, price, original_price, description, images, brand, category, active')
        .limit(1)

      if (/^[0-9a-fA-F-]{36}$/.test(identifier)) {
        fallback = fallback.eq('id', identifier)
      } else {
        fallback = fallback.ilike('name', `%${identifier.replace(/-/g, ' ')}%`)
      }
      const { data: fbProds } = await fallback
      product = fbProds?.[0] || null
    }
  } catch (err) {
    console.warn('[OG Injector] Aviso na consulta:', err.message)
  }

  const destinationUrl = product
    ? `${baseUrl}/#product-${product.slug || product.id}`
    : `${baseUrl}/`

  const isSocialBot = BOT_USER_AGENTS.some(bot => userAgent.includes(bot))

  // Se não for um crawler de rede social, redireciona o usuário comum direto para a SPA
  if (!isSocialBot) {
    res.writeHead(302, { Location: destinationUrl })
    return res.end()
  }

  // Se o produto não existir, redireciona para a home
  if (!product) {
    res.writeHead(302, { Location: '/' })
    return res.end()
  }

  // Prepara metadados para WhatsApp, Facebook, Twitter, Telegram
  const title = escapeHtml(`${product.name} | Oferta Especial`)
  const priceFormatted = Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const desc = escapeHtml(
    `Apenas ${priceFormatted} à vista! ${product.description ? product.description.slice(0, 140) + '...' : 'Confira os detalhes e garanta o seu com frete rápido.'}`
  )

  let image = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80'
  if (Array.isArray(product.images) && product.images.length > 0) {
    image = product.images[0]
  } else if (typeof product.images === 'string' && product.images.startsWith('http')) {
    image = product.images
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">

  <!-- Open Graph / WhatsApp / Facebook -->
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="Infodesk Store">
  <meta property="og:url" content="${destinationUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="product:price:amount" content="${product.price}">
  <meta property="product:price:currency" content="BRL">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${image}">

  <!-- Redirecionamento instantâneo se um humano abrir -->
  <meta http-equiv="refresh" content="0;url=${destinationUrl}">
  <script>
    window.location.replace("${destinationUrl}");
  </script>
</head>
<body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #fff;">
  <p>Redirecionando para a loja...</p>
  <a href="${destinationUrl}" style="color: #a3e635;">Clique aqui se você não for redirecionado automaticamente</a>
</body>
</html>`

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
  return res.end(html)
}
