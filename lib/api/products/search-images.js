import { searchProductImages } from '../barcode/image-search.js'

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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  try {
    let query = ''
    if (req.method === 'GET') {
      const urlObj = new URL(req.url, 'http://localhost')
      query = urlObj.searchParams.get('q') || urlObj.searchParams.get('query') || ''
    } else {
      const body = await parseRequestBody(req)
      query = body?.query || body?.q || body?.name || ''
    }

    const cleanQuery = query.trim()
    if (!cleanQuery) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'Parâmetro de busca não informado.' }))
      return
    }

    const images = await searchProductImages(cleanQuery, 6)

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      query: cleanQuery,
      images,
      count: images.length
    }))
  } catch (err) {
    console.error('[API search-images Error]:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: 'Erro ao buscar imagens na internet.' }))
  }
}
