// Endpoint Serverless: Teste de Conexão com Mercado Pago para o Painel Administrativo
import { getMercadoPagoConfig } from './service.js'

export default async function handler(req, res) {
  try {
    const config = getMercadoPagoConfig()

    if (!config.isConfigured) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: false,
        configured: false,
        environment: config.environment,
        message: 'MERCADO_PAGO_ACCESS_TOKEN não está definido nas variáveis de ambiente.',
        webhookUrl: `${config.appUrl.replace(/\/$/, '')}/api/payments/mercadopago/webhook`
      }))
      return
    }

    // Faz uma requisição de teste para validar o token na API do Mercado Pago
    const testResponse = await fetch('https://api.mercadopago.com/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    })

    if (!testResponse.ok) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: false,
        configured: true,
        environment: config.environment,
        message: `Token rejeitado pela API do Mercado Pago (HTTP ${testResponse.status}). Verifique o Access Token.`,
        webhookUrl: `${config.appUrl.replace(/\/$/, '')}/api/payments/mercadopago/webhook`
      }))
      return
    }

    const userData = await testResponse.json()
    const maskedToken = config.accessToken.slice(0, 7) + '...' + config.accessToken.slice(-4)

    // Consulta métodos de pagamento habilitados para esta conta de vendedor
    let hasPix = false
    try {
      const pmRes = await fetch('https://api.mercadopago.com/v1/payment_methods', {
        headers: { 'Authorization': `Bearer ${config.accessToken}` }
      })
      if (pmRes.ok) {
        const methods = await pmRes.json()
        hasPix = Array.isArray(methods) && methods.some(m => m.id === 'pix')
      }
    } catch {}

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: true,
      configured: true,
      environment: config.environment,
      siteId: userData.site_id || 'MLB',
      nickname: userData.nickname || 'Infodesk Loja',
      email: userData.email || '',
      maskedToken,
      hasPix,
      hasWebhookSecret: Boolean(config.webhookSecret),
      webhookUrl: `${config.appUrl.replace(/\/$/, '')}/api/payments/mercadopago/webhook`,
      testedAt: new Date().toISOString()
    }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      error: err.message
    }))
  }
}
