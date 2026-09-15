import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Middleware local para desenvolvimento que serve as API Routes Serverless dos Correios
function correiosApiPlugin() {
  return {
    name: 'correios-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''
        if (url === '/api/shipping/quote') {
          try {
            const { default: handler } = await import('./api/shipping/quote.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/shipping/quote:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/shipping/validate') {
          try {
            const { default: handler } = await import('./api/shipping/validate.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/shipping/validate:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/shipping/config') {
          try {
            const { default: handler } = await import('./api/shipping/config.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/shipping/config:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/shipping/test-connection') {
          try {
            const { default: handler } = await import('./api/shipping/test-connection.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/shipping/test-connection:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/shipping/track') {
          try {
            const { default: handler } = await import('./api/shipping/track.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/shipping/track:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/company/config') {
          try {
            const { default: handler } = await import('./api/company/config.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/company/config:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/barcode/lookup') {
          try {
            const { default: handler } = await import('./api/barcode/lookup.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/barcode/lookup:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/barcode/identify-photo') {
          try {
            const { default: handler } = await import('./api/barcode/identify-photo.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/barcode/identify-photo:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/barcode/confirm-match') {
          try {
            const { default: handler } = await import('./api/barcode/confirm-match.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/barcode/confirm-match:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        // Mercado Pago Checkout Pro (Orders API)
        if (url === '/api/payments/mercadopago/create-order') {
          try {
            const { default: handler } = await import('./api/payments/mercadopago/create-order.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/payments/mercadopago/create-order:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/payments/mercadopago/webhook') {
          try {
            const { default: handler } = await import('./api/payments/mercadopago/webhook.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/payments/mercadopago/webhook:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/payments/mercadopago/status') {
          try {
            const { default: handler } = await import('./api/payments/mercadopago/status.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/payments/mercadopago/status:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        if (url === '/api/payments/mercadopago/test-connection') {
          try {
            const { default: handler } = await import('./api/payments/mercadopago/test-connection.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/payments/mercadopago/test-connection:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        // SEO & Divulgação Orgânica Multiloja
        if (url === '/sitemap.xml') {
          try {
            const { default: handler } = await import('./api/seo/sitemap.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /sitemap.xml:', err)
            res.statusCode = 500
            res.end('Erro interno ao gerar sitemap.')
            return
          }
        }
        if (url === '/robots.txt') {
          try {
            const { default: handler } = await import('./api/seo/robots.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /robots.txt:', err)
            res.statusCode = 500
            res.end('Erro interno ao gerar robots.')
            return
          }
        }
        if (url === '/api/google-merchant/feed.xml') {
          try {
            const { default: handler } = await import('./api/google-merchant/feed.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/google-merchant/feed.xml:', err)
            res.statusCode = 500
            res.end('Erro interno ao gerar feed do Google Merchant.')
            return
          }
        }
        if (url === '/api/seo/tenant-lookup') {
          try {
            const { default: handler } = await import('./api/seo/tenant-lookup.js')
            return await handler(req, res)
          } catch (err) {
            console.error('Erro no middleware local /api/seo/tenant-lookup:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
            return
          }
        }
        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), correiosApiPlugin()],
  server: {
    port: 5173,
    open: true
  }
})
