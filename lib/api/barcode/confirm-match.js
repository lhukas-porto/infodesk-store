// Endpoint Serverless de Registro e Aprendizado de Correspondência Confirmada pelo Usuário
// Salva no Supabase (tabela store_settings, chave 'confirmed_image_matches') para reaproveitamento futuro sem custo de API.

const IN_MEMORY_CONFIRMED_MATCHES = new Map()

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
    res.end(JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }))
    return
  }

  try {
    const body = await parseRequestBody(req)

    const {
      imageHash,
      ean,
      brand,
      model,
      partNumber,
      name,
      selectedResult
    } = body || {}

    if (!imageHash && !ean) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'É obrigatório fornecer o hash da imagem ou código EAN.' }))
      return
    }

    const confirmationRecord = {
      imageHash: imageHash || '',
      ean: (ean || '').replace(/\D/g, ''),
      brand: brand || selectedResult?.brand || '',
      model: model || selectedResult?.model || '',
      partNumber: partNumber || selectedResult?.partNumber || '',
      name: name || selectedResult?.name || 'Produto Confirmado',
      selectedResult: selectedResult || {},
      confirmedAt: new Date().toISOString()
    }

    // 1. Salva em cache de memória
    if (imageHash) {
      IN_MEMORY_CONFIRMED_MATCHES.set(imageHash, confirmationRecord)
    }

    // 2. Persiste no Supabase na tabela store_settings
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

    let persisted = false
    try {
      // Busca dicionário existente
      const getRes = await fetch(`${supabaseUrl}/rest/v1/store_settings?key=eq.confirmed_image_matches&select=*`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      })

      let existingMap = {}
      if (getRes.ok) {
        const rows = await getRes.json()
        if (rows && rows.length > 0 && rows[0].value) {
          existingMap = typeof rows[0].value === 'string' ? JSON.parse(rows[0].value) : rows[0].value
        }
      }

      // Adiciona o novo aprendizado indexado por imageHash e por ean
      if (imageHash) existingMap[imageHash] = confirmationRecord
      if (confirmationRecord.ean) existingMap[`ean_${confirmationRecord.ean}`] = confirmationRecord

      // Atualiza ou insere (upsert)
      const upsertRes = await fetch(`${supabaseUrl}/rest/v1/store_settings`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          key: 'confirmed_image_matches',
          value: existingMap,
          updated_at: new Date().toISOString()
        })
      })

      persisted = upsertRes.ok
    } catch (dbErr) {
      console.warn('[ConfirmMatch] Falha não impeditiva ao gravar no Supabase:', dbErr.message)
    }

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      message: 'Correspondência salva no histórico de aprendizado da loja com sucesso!',
      persisted,
      record: confirmationRecord
    }))
  } catch (err) {
    console.error('[ConfirmMatch] Erro interno:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: 'Erro ao registrar aprendizado de imagem.' }))
  }
}
