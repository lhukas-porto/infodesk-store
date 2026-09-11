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
