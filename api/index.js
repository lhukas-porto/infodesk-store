/**
 * Unified API Router — Vercel Hobby Plan Compatible
 * Concentra todas as rotas em uma única Serverless Function
 * para respeitar o limite de 12 funções do plano Hobby.
 */

// ── Lazy imports (evita carregar módulos desnecessários) ──────────────────────
async function getHandler(path) {
  if (path.startsWith('/api/payments/mercadopago/create-order')) {
    return (await import('./payments/mercadopago/create-order.js')).default
  }
  if (path.startsWith('/api/payments/mercadopago/webhook')) {
    return (await import('./payments/mercadopago/webhook.js')).default
  }
  if (path.startsWith('/api/payments/mercadopago/status')) {
    return (await import('./payments/mercadopago/status.js')).default
  }
  if (path.startsWith('/api/payments/mercadopago/test-connection')) {
    return (await import('./payments/mercadopago/test-connection.js')).default
  }
  if (path.startsWith('/api/shipping/quote')) {
    return (await import('./shipping/quote.js')).default
  }
  if (path.startsWith('/api/shipping/track')) {
    return (await import('./shipping/track.js')).default
  }
  if (path.startsWith('/api/shipping/validate')) {
    return (await import('./shipping/validate.js')).default
  }
  if (path.startsWith('/api/shipping/test-connection')) {
    return (await import('./shipping/test-connection.js')).default
  }
  if (path.startsWith('/api/shipping/config')) {
    return (await import('./shipping/config.js')).default
  }
  if (path.startsWith('/api/barcode/lookup')) {
    return (await import('./barcode/lookup.js')).default
  }
  if (path.startsWith('/api/barcode/identify-photo')) {
    return (await import('./barcode/identify-photo.js')).default
  }
  if (path.startsWith('/api/barcode/confirm-match')) {
    return (await import('./barcode/confirm-match.js')).default
  }
  if (path.startsWith('/api/company/config')) {
    return (await import('./company/config.js')).default
  }
  if (path.startsWith('/api/seo/sitemap') || path === '/sitemap.xml') {
    return (await import('./seo/sitemap.js')).default
  }
  if (path.startsWith('/api/seo/robots') || path === '/robots.txt') {
    return (await import('./seo/robots.js')).default
  }
  if (path.startsWith('/api/seo/tenant-lookup')) {
    return (await import('./seo/tenant-lookup.js')).default
  }
  if (path.startsWith('/api/google-merchant/feed') || path === '/api/google-merchant/feed.xml') {
    return (await import('./google-merchant/feed.js')).default
  }
  return null
}

export default async function handler(req, res) {
  const path = req.url?.split('?')[0] || '/'

  try {
    const routeHandler = await getHandler(path)
    if (!routeHandler) {
      return res.status(404).json({ error: 'Route not found', path })
    }
    return await routeHandler(req, res)
  } catch (err) {
    console.error(`[API Router] Error on ${path}:`, err)
    return res.status(500).json({ error: 'Internal server error', message: err.message })
  }
}
