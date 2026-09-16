/**
 * Utilitário de Busca Automatizada de Imagens Reais de Produtos na Web
 * Utiliza motor resiliente com Bing Image Search (alta disponibilidade e qualidade de e-commerce)
 * + Fallback para DuckDuckGo e simplificação heurística inteligente de termos.
 * Retorna URLs diretas, públicas e em alta resolução prontas para o catálogo.
 */

function cleanSearchQuery(query) {
  if (!query) return ''
  // Remove aspas, caracteres especiais e pontuações que quebram buscas
  const cleaned = query
    .replace(/["'()[\]{}#*]/g, ' ')
    .replace(/[,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Remove repetição de palavras idênticas (ex: se marca já estiver no título)
  const words = cleaned.split(' ')
  const seen = new Set()
  const uniqueWords = []
  for (const w of words) {
    const lower = w.toLowerCase()
    if (!seen.has(lower)) {
      seen.add(lower)
      uniqueWords.push(w)
    }
  }
  return uniqueWords.join(' ')
}

async function searchBing(query, maxResults = 6) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6500)

    const res = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      signal: controller.signal
    })

    clearTimeout(timeout)
    if (!res.ok) return []

    const html = await res.text()
    // O Bing embute a URL direta em alta resolução em murl&quot;:&quot;https://...&quot;
    const matches = [...html.matchAll(/murl&quot;:&quot;(https?:\/\/[^&"]+)&quot;/g)].map(m => m[1])

    const filtered = []
    const seen = new Set()

    for (const url of matches) {
      if (!url.startsWith('https://')) continue
      if (url.includes('.svg') || url.includes('placeholder') || url.includes('data:image')) continue
      if (seen.has(url)) continue
      seen.add(url)
      filtered.push(url)
      if (filtered.length >= maxResults) break
    }

    return filtered
  } catch (err) {
    console.warn('[Bing Image Search Warning]:', err.message)
    return []
  }
}

async function searchDuckDuckGo(query, maxResults = 6) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const initRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal
    })

    clearTimeout(timeout)
    if (!initRes.ok) return []

    const html = await initRes.text()
    const vqdMatch = html.match(/vqd=([a-zA-Z0-9_-]+)/) || html.match(/vqd=["']([a-zA-Z0-9_-]+)["']/)
    if (!vqdMatch) return []

    const vqd = vqdMatch[1]
    const controller2 = new AbortController()
    const timeout2 = setTimeout(() => controller2.abort(), 5000)

    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/'
        },
        signal: controller2.signal
      }
    )

    clearTimeout(timeout2)
    if (!imgRes.ok) return []

    const data = await imgRes.json()
    if (!data?.results || !Array.isArray(data.results)) return []

    const filtered = []
    const seen = new Set()

    for (const item of data.results) {
      const u = item.image
      if (!u || typeof u !== 'string' || !u.startsWith('https://')) continue
      if (u.includes('placeholder') || u.includes('.svg') || u.includes('data:image')) continue
      if (seen.has(u)) continue
      seen.add(u)
      filtered.push(u)
      if (filtered.length >= maxResults) break
    }

    return filtered
  } catch (err) {
    return []
  }
}

export async function searchProductImages(query, maxResults = 6) {
  const clean = cleanSearchQuery(query)
  if (!clean || clean.length < 2) return []

  // 1. Motor Primário: Bing Images (Alta res, produtos reais de e-commerce)
  let images = await searchBing(clean, maxResults)

  // 2. Motor Secundário: Fallback DuckDuckGo se Bing não retornar nada
  if (images.length === 0) {
    images = await searchDuckDuckGo(clean, maxResults)
  }

  // 3. Heurística de Resiliência: Se a query for longa/específica demais e não achou nada,
  // tenta com termos principais simplificados (marca + modelo ou primeiros 3 termos)
  if (images.length === 0) {
    const words = clean.split(' ')
    if (words.length > 3) {
      const simplified = words.slice(0, 3).join(' ')
      images = await searchBing(simplified, maxResults)
      if (images.length === 0) {
        images = await searchDuckDuckGo(simplified, maxResults)
      }
    }
  }

  return images
}
