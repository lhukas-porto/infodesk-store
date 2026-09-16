import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Middleware local para desenvolvimento que serve as API Routes Serverless dos Correios
function correiosApiPlugin() {
  return {
    name: 'correios-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''
        if (
          url.startsWith('/api/') ||
          url === '/sitemap.xml' ||
          url === '/robots.txt'
        ) {
          try {
            const { default: handler } = await import('./api/index.js')
            return await handler(req, res)
          } catch (err) {
            console.error(`Erro no middleware local [${url}]:`, err)
            res.statusCode = 500
            res.setHeader?.('Content-Type', 'application/json')
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
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules/html5-qrcode')) {
            return 'vendor-scanner'
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase'
          }
        }
      }
    }
  }
})
