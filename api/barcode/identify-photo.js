// Endpoint Serverless de Identificação de Produtos por Fotografia (Gemini Vision + SerpApi Google Lens)
// Suporte incremental com cache de aprendizado, validação estrita de GTIN e ranqueamento ponderado.

import crypto from 'crypto'
import { normalizeAndValidateGtin, lookupGtinStrict } from './lookup.js'

// Cache em memória de correspondências confirmadas
const IN_MEMORY_CONFIRMED_MATCHES = new Map()

// Supabase REST Helper para cache de aprendizado
async function getSupabaseConfirmedMatches() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/store_settings?key=eq.confirmed_image_matches&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    if (res.ok) {
      const data = await res.json()
      if (data && data.length > 0 && data[0].value) {
        return typeof data[0].value === 'string' ? JSON.parse(data[0].value) : data[0].value
      }
    }
  } catch (err) {
    console.warn('[PhotoIdentify] Aviso: Não foi possível carregar cache do Supabase:', err.message)
  }
  return null
}

// Normaliza strings para comparação textual
function normalizeString(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
}

// Calcula similaridade de palavras
function containsTerms(target, source) {
  if (!target || !source) return false
  const t = normalizeString(target)
  const s = normalizeString(source)
  return s.includes(t) || t.includes(s)
}

// 1. Chamada ao Google Gemini Vision para extração estruturada
async function analyzeImageWithGemini(base64Data, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'Chave GEMINI_API_KEY não configurada no ambiente.',
      configMissing: true
    }
  }

  const prompt = `Analise detalhadamente a fotografia desta embalagem ou produto de tecnologia/informática.
Extraia com o mais alto rigor técnico apenas as informações visíveis.
NUNCA invente marca, modelo, código ou especificação que não estejam visíveis ou claramente identificáveis.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "productType": "tipo do produto (ex: SSD M.2, Mouse Sem Fio, Pilhas Recarregáveis)",
  "brand": "marca oficial legível (ex: Kingston, Logitech, Panasonic)",
  "model": "modelo específico (ex: NV2, G305, Eneloop)",
  "partNumber": "part number ou código do fabricante exato (ex: SNV2S/1000G, BK-4MCCA12FA)",
  "gtinCandidates": ["códigos de barras numéricos EAN/UPC/GTIN visíveis legíveis sem traços"],
  "specifications": [
    { "label": "nome da spec", "value": "valor da spec" }
  ],
  "visibleTexts": ["frases ou termos técnicos mais marcantes impressos na caixa"],
  "searchQuery": "termo ideal e específico para busca técnica de mercado",
  "confidence": 85
}
Se não for possível identificar um campo, deixe em branco ou vazio. Não insira blocos markdown extras além do JSON válido.`

  // Tenta modelos em ordem de disponibilidade e suporte ativo
  const models = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest']
  let lastError = null

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 12000)

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1
          }
        }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const json = await response.json()
        const textResponse = json?.candidates?.[0]?.content?.parts?.[0]?.text
        if (textResponse) {
          const cleanText = textResponse.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
          const parsed = JSON.parse(cleanText)
          return { success: true, data: parsed, modelUsed: model }
        }
      } else {
        const errText = await response.text()
        lastError = `HTTP ${response.status} (${model}): ${errText}`
      }
    } catch (err) {
      lastError = err.message
    }
  }

  return {
    success: false,
    error: `Falha ao processar imagem no Gemini: ${lastError}`
  }
}

// 2. Chamada à SerpApi (Google Lens) para correspondências visuais
async function searchVisualWithSerpApi(imageBuffer, mimeType) {
  const apiKey = process.env.SERPAPI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'Chave SERPAPI_API_KEY não configurada no ambiente.',
      configMissing: true
    }
  }

  try {
    // Passo 1: Upload temporário da imagem na SerpApi
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2)
    const ext = (mimeType || 'image/jpeg').includes('png') ? 'png' : 'jpg'
    const filename = `product_upload_${Date.now()}.${ext}`

    const headerPart = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    )
    const footerPart = Buffer.from(`\r\n--${boundary}--\r\n`)
    const bodyBuffer = Buffer.concat([headerPart, imageBuffer, footerPart])

    const uploadRes = await fetch(`https://serpapi.com/image?api_key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: bodyBuffer
    })

    if (!uploadRes.ok) {
      const errTxt = await uploadRes.text()
      return { success: false, error: `Upload SerpApi falhou (${uploadRes.status}): ${errTxt}` }
    }

    const uploadData = await uploadRes.json()
    const imageId = uploadData.image_id
    if (!imageId) {
      return { success: false, error: 'SerpApi não retornou image_id.' }
    }

    // Passo 2: Busca no Google Lens via SerpApi
    const lensUrl = `https://serpapi.com/search.json?engine=google_lens&image_id=${encodeURIComponent(imageId)}&api_key=${apiKey}&hl=pt-br&country=br`
    const searchRes = await fetch(lensUrl)
    if (!searchRes.ok) {
      const errTxt = await searchRes.text()
      return { success: false, error: `Google Lens search falhou: ${errTxt}` }
    }

    const searchData = await searchRes.json()
    return {
      success: true,
      visualMatches: searchData.visual_matches || [],
      exactMatches: searchData.exact_matches || []
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// 3. Motor de Ranqueamento e Pontuação
function rankCandidates(candidates, geminiData) {
  const targetPn = normalizeString(geminiData.partNumber)
  const targetModel = normalizeString(geminiData.model)
  const targetBrand = normalizeString(geminiData.brand)
  const targetGtinList = (geminiData.gtinCandidates || []).map(g => g.replace(/\D/g, '')).filter(Boolean)
  const visibleTexts = (geminiData.visibleTexts || []).map(t => normalizeString(t)).filter(Boolean)

  const scored = candidates.map(c => {
    let score = 0
    const reasons = []

    const nameNorm = normalizeString(c.name)
    const brandNorm = normalizeString(c.brand)
    const modelNorm = normalizeString(c.model)
    const pnNorm = normalizeString(c.partNumber)
    const eanClean = (c.ean || '').replace(/\D/g, '')

    // EAN/GTIN Exato (peso máximo: 45)
    if (eanClean && targetGtinList.some(g => g === eanClean || g.padStart(14, '0') === eanClean.padStart(14, '0'))) {
      score += 45
      reasons.push('Código de barras GTIN/EAN correspondente')
    }

    // Part Number Exato (peso muito alto: 35)
    if (targetPn && (pnNorm === targetPn || nameNorm.includes(targetPn))) {
      score += 35
      reasons.push(`Part Number ${geminiData.partNumber} identificado`)
    }

    // Modelo Exato (peso muito alto: 30)
    if (targetModel && (modelNorm.includes(targetModel) || nameNorm.includes(targetModel))) {
      score += 30
      reasons.push(`Modelo ${geminiData.model} correspondente`)
    }

    // Marca Exata (peso alto: 20)
    if (targetBrand && (brandNorm.includes(targetBrand) || nameNorm.includes(targetBrand))) {
      score += 20
      reasons.push(`Marca ${geminiData.brand} confirmada`)
    }

    // Especificações ou textos da embalagem (peso médio: 10)
    if (visibleTexts.length > 0) {
      const matchCount = visibleTexts.filter(vt => vt.length > 3 && nameNorm.includes(vt)).length
      if (matchCount > 0) {
        score += Math.min(15, matchCount * 5)
        reasons.push('Textos técnicos da caixa coincidem')
      }
    }

    // Semelhança visual complementar (peso complementar: 5 a 10)
    if (c.fromVisual) {
      score += 5
    }

    // Loja brasileira ou oficial (+5)
    const sourceNorm = normalizeString(c.source)
    if (sourceNorm.includes('kabum') || sourceNorm.includes('mercadolivre') || sourceNorm.includes('amazon') || sourceNorm.includes('oficial')) {
      score += 5
    }

    // Limita entre 0 e 99 (100 apenas se EAN + PN baterem 100%)
    score = Math.min(score, 100)

    let classification = 'insuficiente'
    let confidenceLabel = 'Baixa - Correspondência Insuficiente'
    if (score >= 80) {
      classification = 'exata'
      confidenceLabel = 'Alta - Correspondência Exata'
    } else if (score >= 45) {
      classification = 'provavel'
      confidenceLabel = 'Média - Correspondência Provável'
    }

    return {
      ...c,
      score,
      classification,
      confidence: confidenceLabel,
      matchReason: reasons.join(' • ') || 'Correspondência geral de tecnologia'
    }
  })

  // Ordena pelo maior score
  scored.sort((a, b) => b.score - a.score)
  return scored
}

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
    const { image } = body || {}
    if (!image) {
      res.statusCode = 400
      res.end(JSON.stringify({
        success: false,
        error: 'Nenhuma imagem foi enviada. Por favor, tire uma foto ou selecione um arquivo.'
      }))
      return
    }

    // Extrai mime-type e base64
    let mimeType = 'image/jpeg'
    let base64Clean = image
    if (image.includes(';base64,')) {
      const parts = image.split(';base64,')
      mimeType = parts[0].replace('data:', '') || 'image/jpeg'
      base64Clean = parts[1]
    }

    const imageBuffer = Buffer.from(base64Clean, 'base64')
    if (imageBuffer.length > 6 * 1024 * 1024) {
      res.statusCode = 400
      res.end(JSON.stringify({
        success: false,
        error: 'A imagem enviada é muito grande. O limite máximo permitido é 6MB.'
      }))
      return
    }

    // Calcula Hash SHA-256 da imagem para o cache de aprendizado
    const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex')

    // 1. Consulta se esta imagem já foi confirmada anteriormente no banco de aprendizado
    if (IN_MEMORY_CONFIRMED_MATCHES.has(imageHash)) {
      const cached = IN_MEMORY_CONFIRMED_MATCHES.get(imageHash)
      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        cacheHit: true,
        exactMatch: true,
        candidates: [{ ...cached, score: 100, confidence: 'Alta - Confirmado Anteriormente (Cache)' }],
        message: 'Produto reconhecido instantaneamente pelo histórico de aprendizado!'
      }))
      return
    }

    const dbMatches = await getSupabaseConfirmedMatches()
    if (dbMatches && dbMatches[imageHash]) {
      const saved = dbMatches[imageHash]
      IN_MEMORY_CONFIRMED_MATCHES.set(imageHash, saved)
      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        cacheHit: true,
        exactMatch: true,
        candidates: [{ ...saved, score: 100, confidence: 'Alta - Confirmado Anteriormente (Banco de Dados)' }],
        message: 'Produto reconhecido pelo histórico de aprendizado da sua loja!'
      }))
      return
    }

    // 2. Análise Visual com Google Gemini Vision
    const geminiResult = await analyzeImageWithGemini(base64Clean, mimeType)
    if (!geminiResult.success && geminiResult.configMissing) {
      res.statusCode = 200
      res.end(JSON.stringify({
        success: false,
        error: 'Chave GEMINI_API_KEY não configurada no servidor (.env).',
        configMissing: true,
        allowManual: true
      }))
      return
    }

    if (!geminiResult.success) {
      res.statusCode = 200
      res.end(JSON.stringify({
        success: false,
        error: geminiResult.error || 'Não foi possível analisar os detalhes desta foto. Certifique-se de que a imagem esteja nítida e bem iluminada.',
        allowManual: true
      }))
      return
    }

    const geminiData = geminiResult.data
    const candidates = []

    // 3. Validação de códigos de barras (EAN/GTIN) extraídos pelo Gemini
    if (geminiData.gtinCandidates && geminiData.gtinCandidates.length > 0) {
      for (const rawCode of geminiData.gtinCandidates) {
        const val = normalizeAndValidateGtin(rawCode)
        if (val.valid) {
          const barcodeResult = await lookupGtinStrict(val.clean)
          if (barcodeResult.success && barcodeResult.found && barcodeResult.data) {
            const prod = barcodeResult.data
            // Verifica compatibilidade com a marca/modelo analisados
            const brandMatches = !geminiData.brand || containsTerms(geminiData.brand, prod.brand || prod.name)
            if (brandMatches) {
              candidates.push({
                name: prod.name,
                brand: prod.brand || geminiData.brand || 'Marca Oficial',
                model: prod.model || geminiData.model || '',
                partNumber: prod.partNumber || geminiData.partNumber || '',
                ean: val.clean,
                gtin14: val.gtin14,
                category: prod.category || geminiData.productType || 'Hardware',
                images: prod.images || [],
                suggestedPrice: prod.suggestedPrice || 149.90,
                specs: prod.specs || geminiData.specifications || [],
                source: prod.source || 'Catálogo Oficial GTIN',
                link: '',
                fromGtin: true
              })
              break // Encontrou código exato compatível
            }
          }
        }
      }
    }

    // 4. Se não achou correspondência exata via GTIN, faz busca visual no Google Lens (SerpApi)
    const needVisualSearch = candidates.length === 0
    if (needVisualSearch) {
      const serpResult = await searchVisualWithSerpApi(imageBuffer, mimeType)
      if (serpResult.success) {
        const visualMatches = [...(serpResult.exactMatches || []), ...(serpResult.visualMatches || [])]
        for (const item of visualMatches.slice(0, 10)) {
          if (!item.title) continue

          const priceMatch = (item.price?.value || item.price?.extracted_value || 0)
          const price = parseFloat(priceMatch) || 0

          candidates.push({
            name: item.title,
            brand: geminiData.brand || item.source || 'Marca de Hardware',
            model: geminiData.model || '',
            partNumber: geminiData.partNumber || '',
            ean: '',
            category: geminiData.productType || 'Informática',
            images: item.thumbnail ? [item.thumbnail] : [],
            suggestedPrice: price > 0 ? price : 99.90,
            specs: geminiData.specifications || [],
            source: item.source || 'Google Lens / Loja Online',
            link: item.link || '',
            fromVisual: true
          })
        }
      }
    }

    // 5. Fallback com os dados estruturados do próprio Gemini se nenhuma API externa retornou
    if (candidates.length === 0 && (geminiData.brand || geminiData.model || geminiData.partNumber || geminiData.productType)) {
      const generatedName = [geminiData.brand, geminiData.model, geminiData.partNumber].filter(Boolean).join(' ') || geminiData.productType || 'Produto de Informática'
      candidates.push({
        name: generatedName,
        brand: geminiData.brand || 'Infodesk',
        model: geminiData.model || '',
        partNumber: geminiData.partNumber || '',
        ean: geminiData.gtinCandidates?.[0] || '',
        category: geminiData.productType || 'Hardware',
        images: [],
        suggestedPrice: 199.90,
        specs: geminiData.specifications || [],
        source: 'Análise Visual Gemini IA',
        link: '',
        fromGemini: true
      })
    }

    // 6. Ranqueamento das opções encontradas
    const ranked = rankCandidates(candidates, geminiData)
    const top3 = ranked.slice(0, 3)

    // Verifica se temos um resultado de alta confiança e correspondência exata
    const exactMatch = top3.length > 0 && top3[0].classification === 'exata' && top3[0].score >= 80

    res.statusCode = 200
    res.end(JSON.stringify({
      success: top3.length > 0,
      imageHash,
      analysis: geminiData,
      exactMatch,
      candidates: top3,
      message: top3.length > 0
        ? (exactMatch ? 'Correspondência exata identificada!' : 'Produtos candidatos encontrados para a sua foto.')
        : 'Nenhum produto correspondente identificado com segurança nesta imagem.'
    }))
  } catch (err) {
    console.error('[PhotoIdentify] Erro interno:', err)
    res.statusCode = 500
    res.end(JSON.stringify({
      success: false,
      error: 'Erro interno ao processar a identificação por fotografia.'
    }))
  }
}
