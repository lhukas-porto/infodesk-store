// Endpoint de Rastreamento de Encomendas dos Correios
// GET /api/shipping/track?code=NL123456789BR
// POST /api/shipping/track { trackingCode: "NL123456789BR" }

import { trackCorreiosPackage } from '../../../server/correios/correiosTracking.js'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  let trackingCode = ''
  let storeId = 'default'

  if (req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost')
    trackingCode = urlObj.searchParams.get('code') || urlObj.searchParams.get('trackingCode') || ''
    storeId = urlObj.searchParams.get('storeId') || 'default'
  } else if (req.method === 'POST') {
    const body = await parseRequestBody(req)
    trackingCode = body.code || body.trackingCode || ''
    storeId = body.storeId || 'default'
  } else {
    res.statusCode = 405
    res.end(JSON.stringify({ success: false, error: 'Método não permitido.' }))
    return
  }

  if (!trackingCode) {
    res.statusCode = 400
    res.end(JSON.stringify({ success: false, error: 'Informe o código de rastreamento do pacote.' }))
    return
  }

  try {
    const trackingData = await trackCorreiosPackage(trackingCode, storeId)
    res.statusCode = trackingData.success ? 200 : 400
    res.end(JSON.stringify(trackingData))
  } catch (err) {
    console.error('[API /api/shipping/track] Erro ao rastrear encomenda:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: 'Erro interno ao consultar rastreamento.' }))
  }
}
