// Endpoint de Diagnóstico e Teste de Conexão com os Correios
// POST /api/shipping/test-connection
import { diagnoseCorreiosConnection } from '../../server/correios/correiosDiagnosis.js'

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
    const storeId = body.storeId || 'default'

    const diagnosis = await diagnoseCorreiosConnection(body, storeId)

    res.statusCode = 200
    res.end(JSON.stringify(diagnosis))
  } catch (err) {
    console.error('[API /api/shipping/test-connection] Erro inesperado:', err)
    res.statusCode = 500
    res.end(JSON.stringify({
      success: false,
      message: 'Erro interno ao executar teste de conexão com os Correios.',
      results: []
    }))
  }
}
