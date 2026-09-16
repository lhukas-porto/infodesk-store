// Normalizador Único e Canônico de Produtos (Compartilhado entre Código de Barras e Descrição IA)

/**
 * Normaliza qualquer resultado de produto (seja do lookup de código de barras ou do Gemini)
 * para a estrutura canônica exata consumida pela interface do Scanner e pelo Catálogo.
 */
export function normalizeProductResult(raw, fallbackSource = 'Base de Dados') {
  if (!raw) return null

  const cleanDigits = (raw.gtin || raw.ean || '').toString().replace(/\D/g, '')
  const gtin14 = raw.gtin14 || (cleanDigits.length >= 8 ? cleanDigits.padStart(14, '0') : '')

  // Extração segura de texto para campos que podem ser objetos ou strings
  const extractText = (val, fallback = '') => {
    if (!val) return fallback
    if (typeof val === 'string') return val.trim()
    if (typeof val === 'object') {
      return (val.name || val.code || val.description || val.title || fallback || '').toString().trim()
    }
    return String(val).trim()
  }

  const name = extractText(raw.name) || extractText(raw.description) || 'Produto Não Identificado'
  const brand = extractText(raw.brand) || extractText(raw.manufacturer) || 'Genérica'
  const manufacturer = extractText(raw.manufacturer) || extractText(raw.brand) || 'Fabricante Registrado'
  const category = extractText(raw.category) || extractText(raw.gpc) || 'Hardware'
  const ncm = extractText(raw.ncm)

  // Tratamento rigoroso de imagens: garante array de URLs válidas sem placeholders vazios
  let images = []
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    images = raw.images.filter(img => typeof img === 'string' && img.trim().length > 0)
  } else if (raw.image && typeof raw.image === 'string' && raw.image.trim().length > 0) {
    images = [raw.image.trim()]
  } else if (raw.thumbnail && typeof raw.thumbnail === 'string' && raw.thumbnail.trim().length > 0) {
    images = [raw.thumbnail.trim()]
  }
  if (images.length === 0) {
    images = ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600']
  }

  // Tratamento de especificações técnicas dinâmicas
  let specs = []
  if (Array.isArray(raw.specs)) {
    specs = raw.specs
      .filter(s => s && (s.label || s.name) && (s.value !== undefined && s.value !== null))
      .map(s => ({
        label: String(s.label || s.name).trim(),
        value: String(s.value).trim()
      }))
  } else if (Array.isArray(raw.specifications)) {
    specs = raw.specifications
      .filter(s => s && (s.label || s.name) && (s.value !== undefined && s.value !== null))
      .map(s => ({
        label: String(s.label || s.name).trim(),
        value: String(s.value).trim()
      }))
  } else if (raw.specifications && typeof raw.specifications === 'object') {
    specs = Object.entries(raw.specifications).map(([key, val]) => ({
      label: key.trim(),
      value: String(val).trim()
    }))
  }

  // Preço de venda sugerido e preço de custo estimado
  const priceVal = parseFloat(raw.suggestedPrice || raw.avg_price || raw.price || 0)
  const suggestedPrice = !isNaN(priceVal) && priceVal > 0 ? Math.round(priceVal * 100) / 100 : 99.90
  
  const costVal = parseFloat(raw.costPrice || 0)
  const costPrice = !isNaN(costVal) && costVal > 0 
    ? Math.round(costVal * 100) / 100 
    : Math.round(suggestedPrice * 0.7 * 100) / 100

  // Tratamento de peso e dimensões para o padrão legível
  let weight = raw.weight || ''
  if (typeof weight === 'number') {
    weight = `${weight.toFixed(3)} kg`
  } else if (typeof weight === 'string' && weight.trim()) {
    weight = weight.replace(/\s*kg\s*kg/gi, ' kg').trim()
    if (!weight.toLowerCase().includes('kg') && !weight.toLowerCase().includes('g')) {
      const num = parseFloat(weight.replace(',', '.'))
      weight = !isNaN(num) ? `${num.toFixed(3)} kg` : weight
    }
  }

  let dimensions = raw.dimensions || ''
  if (typeof dimensions === 'object' && dimensions !== null) {
    const l = dimensions.length || dimensions.comprimento || 20
    const w = dimensions.width || dimensions.largura || 15
    const h = dimensions.height || dimensions.altura || 5
    dimensions = `${l}cm x ${w}cm x ${h}cm`
  } else if (!dimensions && (raw.length || raw.width || raw.height)) {
    const l = raw.length || 20
    const w = raw.width || 15
    const h = raw.height || 5
    dimensions = `${l}cm x ${w}cm x ${h}cm`
  }

  return {
    name,
    brand,
    manufacturer,
    model: extractText(raw.model),
    partNumber: extractText(raw.partNumber || raw.mpn),
    category,
    gtin: cleanDigits,
    ean: cleanDigits,
    gtin14,
    ncm,
    weight: String(weight).trim(),
    dimensions: String(dimensions).trim(),
    description: extractText(raw.description),
    specs,
    suggestedPrice,
    costPrice,
    images,
    source: raw.source || fallbackSource,
    confidence: raw.confidence || 'Identificação Estruturada',
    status: raw.status || 'confirmado'
  }
}
