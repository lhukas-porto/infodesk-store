/**
 * Unified API Router — Vercel Hobby Plan Compatible (1 Serverless Function)
 * Todos os handlers ficam em lib/api/ e são roteados aqui por path.
 */

async function getHandler(path) {
  if (path.startsWith('/api/payments/mercadopago/create-order')) {
    return (await import('../lib/api/payments/mercadopago/create-order.js')).default
  }
  if (path.startsWith('/api/payments/mercadopago/webhook')) {
    return (await import('../lib/api/payments/mercadopago/webhook.js')).default
  }
  if (path.startsWith('/api/payments/mercadopago/status')) {
    return (await import('../lib/api/payments/mercadopago/status.js')).default
  }
  if (path.startsWith('/api/payments/mercadopago/test-connection')) {
    return (await import('../lib/api/payments/mercadopago/test-connection.js')).default
  }
  if (path.startsWith('/api/shipping/quote')) {
    return (await import('../lib/api/shipping/quote.js')).default
  }
  if (path.startsWith('/api/shipping/track')) {
    return (await import('../lib/api/shipping/track.js')).default
  }
  if (path.startsWith('/api/shipping/validate')) {
    return (await import('../lib/api/shipping/validate.js')).default
  }
  if (path.startsWith('/api/shipping/test-connection')) {
    return (await import('../lib/api/shipping/test-connection.js')).default
  }
  if (path.startsWith('/api/shipping/config')) {
    return (await import('../lib/api/shipping/config.js')).default
  }
  if (path.startsWith('/api/barcode/lookup')) {
    return (await import('../lib/api/barcode/lookup.js')).default
  }
  if (path.startsWith('/api/barcode/identify-photo')) {
    return (await import('../lib/api/barcode/identify-photo.js')).default
  }
  if (path.startsWith('/api/barcode/confirm-match')) {
    return (await import('../lib/api/barcode/confirm-match.js')).default
  }
  if (path.startsWith('/api/company/config')) {
    return (await import('../lib/api/company/config.js')).default
  }
  if (path.startsWith('/api/seo/sitemap') || path === '/sitemap.xml') {
    return (await import('../lib/api/seo/sitemap.js')).default
  }
  if (path.startsWith('/api/seo/robots') || path === '/robots.txt') {
    return (await import('../lib/api/seo/robots.js')).default
  }
  if (path.startsWith('/api/seo/tenant-lookup')) {
    return (await import('../lib/api/seo/tenant-lookup.js')).default
  }
  if (path.startsWith('/api/google-merchant/feed') || path === '/api/google-merchant/feed.xml') {
    return (await import('../lib/api/google-merchant/feed.js')).default
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
