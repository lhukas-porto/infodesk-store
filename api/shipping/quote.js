// Endpoint Oficial de Cotação de Frete — Vercel Serverless Function & Vite Dev Server
// POST /api/shipping/quote
import { calculateShippingForCart } from '../../server/correios/shippingCalculator.js'

/**
 * Lê o corpo da requisição suportando tanto Vercel Serverless (req.body já parseado) quanto Node.js puro
 */
async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  // CORS e Headers de Segurança
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
    res.end(JSON.stringify({ success: false, error: 'Método não permitido. Utilize POST.' }))
    return
  }

  try {
    const body = await parseRequestBody(req)
    const { cepDestino, items } = body

    if (!cepDestino) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'O parâmetro cepDestino é obrigatório.' }))
      return
    }

    const cleanCep = String(cepDestino).replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'CEP inválido. Deve conter 8 dígitos.' }))
      return
    }

    const result = await calculateShippingForCart(cleanCep, items || [])

    res.statusCode = result.success ? 200 : 422
    res.end(JSON.stringify(result))
  } catch (error) {
    console.error('[API /api/shipping/quote] Erro inesperado:', error)
    res.statusCode = 500
    res.end(JSON.stringify({
      success: false,
      error: 'Erro interno ao processar cotação de frete. Tente novamente mais tarde.'
    }))
  }
}
