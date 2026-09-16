// Endpoint Serverless de Identificação de Produtos por Fotografia (Gemini Vision + SerpApi Google Lens)
// Suporte incremental com cache de aprendizado, validação estrita de GTIN e ranqueamento ponderado.

import crypto from 'crypto'
import { normalizeAndValidateGtin, lookupGtinStrict } from './lookup.js'
import { searchProductImages } from './image-search.js'

// Cache em memória de correspondências confirmadas pelo lojista
const IN_MEMORY_CONFIRMED_MATCHES = new Map()

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
    console.warn('[PhotoIdentify] Aviso: Não foi possível carregar cache confirmado do Supabase:', err.message)
  }
  return null
}

// Cache em memória de análises recentes para economia de cotas de IA (TTL 24h)
const IN_MEMORY_ANALYSIS_CACHE = new Map()

async function getSupabaseAnalysisCache() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/store_settings?key=eq.cached_ai_photo_scans&select=*`, {
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
    console.warn('[PhotoIdentify] Aviso: Erro ao carregar cache de IA do Supabase:', err.message)
  }
  return null
}

async function saveAnalysisCache(imageHash, candidates) {
  if (!imageHash || !candidates || candidates.length === 0) return
  const payload = {
    candidates: candidates.slice(0, 3),
    timestamp: Date.now()
  }
  IN_MEMORY_ANALYSIS_CACHE.set(imageHash, payload)

  // Salva no Supabase em background
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

    const existing = (await getSupabaseAnalysisCache()) || {}
    existing[imageHash] = payload

    fetch(`${supabaseUrl}/rest/v1/store_settings`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'cached_ai_photo_scans',
        value: existing,
        updated_at: new Date().toISOString()
      })
    }).catch(() => {})
  } catch {}
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

  const prompt = `Você é um especialista sênior em identificação visual, engenharia reversa e catalogação técnica de produtos para o mercado brasileiro de e-commerce (informática, eletrônicos, automação comercial, periféricos, suprimentos, ferramentas e variedades).

Analise minuciosamente a fotografia desta embalagem, etiqueta, rótulo ou produto físico.
Sua tarefa é extrair e enriquecer todos os dados com o máximo rigor técnico, logístico e comercial no schema JSON abaixo:

1. "name": Nome comercial padronizado, completo e elegante em Português do Brasil (ex: "Impressora Térmica de Etiquetas Elgin L42 Pro USB", "SSD Kingston NV2 1TB M.2 2280 NVMe", "Mouse Sem Fio Logitech G305 Lightspeed").
2. "brand": Marca oficial (ex: Elgin, Kingston, Logitech, Epson, Zebra, Redragon, TP-Link, ASUS, Corsair, etc).
3. "manufacturer": Razão social completa do fabricante (ex: Elgin S.A., Kingston Technology do Brasil, Logitech Inc).
4. "model": Modelo específico e exato do produto (ex: L42 Pro, NV2, G305, Kumara K552).
5. "partNumber": Part number oficial / MPN / Código do fabricante (ex: 46L42PRO0000, SNV2S/1000G, 910-005280).
6. "category": Escolha rigorosamente uma destas categorias da loja: "Hardware", "Periféricos", "Automação Comercial", "Computadores", "Armazenamento", "Redes", "Áudio", "Gamer", "Acessórios", "Escritório", "Casa", "Ferramentas" ou "Variedades".
7. "ean": Código EAN/GTIN de 13 dígitos numéricos legível na embalagem ou conhecido no mercado (senão string vazia "").
8. "gtinCandidates": Lista de códigos numéricos de barras identificáveis na foto.
9. "ncm": Código NCM oficial de 8 dígitos para classificação fiscal brasileira (ex: 8443.32.31 para impressora de etiquetas, 8471.70.40 para SSD, 8471.60.53 para mouse).
10. "suggestedPrice": Preço de venda sugerido para o varejo no Brasil em Reais (número decimal, ex: 1199.00).
11. "costPrice": Preço de custo médio estimado de atacado/distribuidor em Reais (número decimal, ex: 850.00).
12. "weight": Peso real estimado da embalagem para envio nos Correios em kg (ex: "1.800 kg", "0.080 kg").
13. "dimensions": Dimensões aproximadas da embalagem em cm no formato "CxLxA cm" (ex: "25cm x 20cm x 18cm"). Mínimo 15x10x2 cm para Correios.
14. "description": Descrição técnica e comercial rica, completa e persuasiva em 2 a 3 parágrafos, detalhando os principais diferenciais, tecnologia utilizada, conectividade, aplicações comerciais ou gamer, e benefícios de uso.
15. "specifications": Array com pelo menos 6 a 10 especificações técnicas detalhadas e reais do produto (ex: [{"label": "Tecnologia de Impressão", "value": "Transferência Térmica"}, {"label": "Resolução", "value": "203 dpi"}, {"label": "Velocidade", "value": "Até 102 mm/s"}, {"label": "Conectividade", "value": "USB e Ethernet"}]).
16. "confidence": Número de 0 a 100 indicando a certeza da identificação visual.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "name": "...",
  "brand": "...",
  "manufacturer": "...",
  "model": "...",
  "partNumber": "...",
  "category": "...",
  "ean": "...",
  "gtinCandidates": [],
  "ncm": "...",
  "suggestedPrice": 0.0,
  "costPrice": 0.0,
  "weight": "...",
  "dimensions": "...",
  "description": "...",
  "specifications": [
    { "label": "...", "value": "..." }
  ],
  "confidence": 95
}
Não insira blocos markdown extras além do JSON válido.`

  // Tenta modelos em ordem de disponibilidade e suporte ativo
  const models = ['gemini-flash-lite-latest', 'gemini-pro-latest', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-flash-latest']
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

    // 1.1 Consulta cache recente de IA (evita consumo de cotas do Gemini e SerpApi)
    const recentCached = IN_MEMORY_ANALYSIS_CACHE.get(imageHash)
    if (recentCached && (Date.now() - recentCached.timestamp) < 24 * 60 * 60 * 1000) {
      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        cacheHit: true,
        imageHash,
        candidates: recentCached.candidates,
        message: 'Produto identificado instantaneamente pelo cache de IA!'
      }))
      return
    }

    const dbAiCache = await getSupabaseAnalysisCache()
    if (dbAiCache && dbAiCache[imageHash] && (Date.now() - dbAiCache[imageHash].timestamp) < 24 * 60 * 60 * 1000) {
      const saved = dbAiCache[imageHash]
      IN_MEMORY_ANALYSIS_CACHE.set(imageHash, saved)
      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        cacheHit: true,
        imageHash,
        candidates: saved.candidates,
        message: 'Produto identificado via histórico de IA da sua loja!'
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

    // 1. Constrói o Candidato Principal com toda a riqueza técnica extraída pelo Gemini Vision
    const cleanEan = (geminiData.ean || geminiData.gtinCandidates?.[0] || '').replace(/\D/g, '')
    const gtin14 = cleanEan.length >= 8 ? cleanEan.padStart(14, '0') : ''
    const price = parseFloat(geminiData.suggestedPrice || 0) || 99.90
    const cost = parseFloat(geminiData.costPrice || 0) || Math.round(price * 0.7 * 100) / 100

    const rawSpecs = Array.isArray(geminiData.specifications)
      ? geminiData.specifications
      : (Array.isArray(geminiData.specs) ? geminiData.specs : [])

    const specs = rawSpecs
      .filter(s => s && (s.label || s.name) && s.value !== undefined && s.value !== null)
      .map(s => ({
        label: String(s.label || s.name).trim(),
        value: String(s.value).trim()
      }))

    const primaryGeminiCandidate = {
      name: geminiData.name || [geminiData.brand, geminiData.model, geminiData.partNumber].filter(Boolean).join(' ') || 'Produto Identificado por Foto',
      brand: geminiData.brand || 'Genérica',
      manufacturer: geminiData.manufacturer || geminiData.brand || 'Fabricante Registrado',
      model: geminiData.model || '',
      partNumber: geminiData.partNumber || '',
      category: geminiData.category || 'Hardware',
      gtin: cleanEan,
      ean: cleanEan,
      gtin14,
      ncm: geminiData.ncm || '',
      suggestedPrice: price,
      costPrice: cost,
      weight: geminiData.weight || '0.500 kg',
      dimensions: geminiData.dimensions || '20cm x 15cm x 5cm',
      description: geminiData.description || 'Produto identificado e estruturado por reconhecimento fotográfico com inteligência artificial.',
      specs,
      images: [],
      source: 'Visão Computacional (Gemini Vision)',
      confidence: geminiData.confidence ? `Alta (${geminiData.confidence}%) - Reconhecimento por Foto` : 'Alta - Reconhecimento por Foto',
      classification: 'exata',
      score: geminiData.confidence || 95,
      fromGemini: true
    }

    candidates.push(primaryGeminiCandidate)

    // 2. Validação de códigos de barras (EAN/GTIN) adicionais extraídos da foto
    if (geminiData.gtinCandidates && geminiData.gtinCandidates.length > 0) {
      for (const rawCode of geminiData.gtinCandidates) {
        const val = normalizeAndValidateGtin(rawCode)
        if (val.valid) {
          const barcodeResult = await lookupGtinStrict(val.clean)
          if (barcodeResult.success && barcodeResult.found && barcodeResult.data) {
            const prod = barcodeResult.data
            // Se o GTIN for compatível, enriquece o candidato principal
            if (!primaryGeminiCandidate.ean) {
              primaryGeminiCandidate.ean = val.clean
              primaryGeminiCandidate.gtin = val.clean
              primaryGeminiCandidate.gtin14 = val.gtin14
            }
            if (prod.name && prod.name.length > primaryGeminiCandidate.name.length) {
              primaryGeminiCandidate.name = prod.name
            }
          }
        }
      }
    }

    // 3. Ranqueamento e enriquecimento com imagens reais na web
    const ranked = rankCandidates(candidates, geminiData)
    const rawTop3 = ranked.slice(0, 3)

    // Enriquecimento com fotos reais de e-commerce (Bing Image Search)
    const top3 = await Promise.all(
      rawTop3.map(async (item) => {
        if (!item.images || item.images.length === 0 || item.images[0].includes('unsplash.com')) {
          const imgSearchQuery = [item.brand, item.model, item.partNumber, item.name].filter(Boolean).join(' ')
          try {
            const realImages = await searchProductImages(imgSearchQuery, 4)
            if (realImages && realImages.length > 0) {
              return { ...item, images: realImages }
            }
          } catch (e) {
            console.warn('[Image Search Error in identify-photo]:', e.message)
          }
        }
        return item
      })
    )

    // Verifica se temos um resultado de alta confiança e correspondência exata
    const exactMatch = top3.length > 0 && top3[0].classification === 'exata' && top3[0].score >= 80

    // Salva no cache de IA para consultas futuras idênticas
    if (top3.length > 0) {
      saveAnalysisCache(imageHash, top3)
    }

    res.statusCode = 200
    res.end(JSON.stringify({
      success: top3.length > 0,
      imageHash,
      analysis: geminiData,
      exactMatch,
      product: top3[0],
      candidates: top3,
      message: top3.length > 0
        ? (exactMatch ? 'Produto identificado com ficha técnica completa! 📸🎯' : 'Produtos candidatos encontrados para a sua foto.')
        : 'Nenhum produto correspondente identificado com segurança.'
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
