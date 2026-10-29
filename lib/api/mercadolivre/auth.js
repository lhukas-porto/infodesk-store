// Endpoint Serverless: Iniciar Fluxo de Autenticação OAuth do Mercado Livre
export default async function handler(req, res) {
  try {
    const clientId = process.env.MERCADOLIVRE_CLIENT_ID || '7098003394262901'
    const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI || 'https://infodesk.net.br/api/mercadolivre/callback'

    if (!clientId) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, error: 'MERCADOLIVRE_CLIENT_ID não configurado no ambiente.' }))
      return
    }

    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`

    // Se chamado via AJAX (quer o JSON da URL)
    if (req.headers.accept?.includes('application/json')) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: true, authUrl }))
      return
    }

    // Redireciona o navegador direto para o Mercado Livre
    res.statusCode = 302
    res.setHeader('Location', authUrl)
    res.end()
  } catch (error) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: false, error: error.message }))
  }
}

