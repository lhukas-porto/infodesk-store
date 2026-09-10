// Endpoint de Validação de Segurança Anti-Fraude no Checkout
// POST /api/shipping/validate
import { validateOrderShipping } from '../../server/correios/shippingCalculator.js'

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ success: false, error: 'Método não permitido.' }))
    return
  }

  try {
    const body = await parseRequestBody(req)
    const { cepDestino, items, selectedServiceId, claimedShippingPrice } = body

    if (!cepDestino || !selectedServiceId) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'Parâmetros obrigatórios ausentes.' }))
      return
    }

    const validation = await validateOrderShipping({
      cepDestino,
      items: items || [],
      selectedServiceId,
      claimedShippingPrice: parseFloat(claimedShippingPrice) || 0
    })

    res.statusCode = validation.valid ? 200 : 400
    res.end(JSON.stringify(validation))
  } catch (error) {
    console.error('[API /api/shipping/validate] Erro inesperado:', error)
    res.statusCode = 500
    res.end(JSON.stringify({
      valid: false,
      error: 'Erro interno ao validar integridade do frete.'
    }))
  }
}
