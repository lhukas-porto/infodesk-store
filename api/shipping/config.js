// Endpoint de Gestão de Configurações dos Correios (Multiempresa)
// GET /api/shipping/config — Retorna configurações com código de acesso mascarado
// POST /api/shipping/config — Atualiza configurações preservando chaves existentes
import { getStoreCorreiosConfig, setStoreCorreiosConfig, maskSecret } from '../../server/correios/config.js'

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
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  // GET: Obter configurações (sem expor o segredo completo)
  if (req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost')
    const storeId = urlObj.searchParams.get('storeId') || 'default'

    const cfg = getStoreCorreiosConfig(storeId)

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      storeId: cfg.storeId,
      enabled: cfg.enabled,
      usuario: cfg.usuario,
      contrato: cfg.contrato,
      dr: cfg.dr,
      cepOrigem: cfg.cepOrigem,
      pacEnabled: cfg.pacEnabled,
      sedexEnabled: cfg.sedexEnabled,
      hasCodigoAcesso: Boolean(cfg.codigoAcesso),
      maskedCodigoAcesso: maskSecret(cfg.codigoAcesso)
    }))
    return
  }

  // POST: Atualizar configurações
  if (req.method === 'POST') {
    try {
      const body = await parseRequestBody(req)
      const storeId = body.storeId || 'default'

      const updated = setStoreCorreiosConfig(storeId, {
        enabled: body.enabled,
        usuario: body.usuario,
        codigoAcesso: body.codigoAcesso,
        contrato: body.contrato,
        dr: body.dr,
        cepOrigem: body.cepOrigem,
        pacEnabled: body.pacEnabled,
        sedexEnabled: body.sedexEnabled
      })

      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        message: 'Configurações dos Correios atualizadas com sucesso!',
        storeId: updated.storeId,
        enabled: updated.enabled,
        usuario: updated.usuario,
        contrato: updated.contrato,
        dr: updated.dr,
        cepOrigem: updated.cepOrigem,
        pacEnabled: updated.pacEnabled,
        sedexEnabled: updated.sedexEnabled,
        hasCodigoAcesso: Boolean(updated.codigoAcesso),
        maskedCodigoAcesso: maskSecret(updated.codigoAcesso)
      }))
    } catch (err) {
      console.error('[API /api/shipping/config] Erro ao salvar configurações:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ success: false, error: 'Erro ao salvar configurações dos Correios.' }))
    }
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ success: false, error: 'Método não permitido.' }))
}
