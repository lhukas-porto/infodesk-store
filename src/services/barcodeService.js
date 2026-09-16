// Serviço de Geração de Código de Barras EAN-13 e Etiquetas Infodesk
import jsPDF from 'jspdf'
import { getCompanyPublicName } from './companyService.js'
import { normalizeProductResult } from './productNormalizer.js'

function getCompanyDataLocal() {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('infodesk_company_data') : null
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

// Calcula o dígito verificador módulo 10 para código EAN-13
export function calculateEanChecksum(code12) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10) || 0
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  return (10 - (sum % 10)) % 10
}

// Gera um código EAN-13 válido (padrão Brasil 789 ou Interno 200)
export function generateValidEan13(prefix = '789') {
  const base9 = Math.floor(100000000 + Math.random() * 900000000).toString()
  const code12 = (prefix + base9).slice(0, 12)
  const check = calculateEanChecksum(code12)
  return code12 + check
}

// Padrões de codificação de barras EAN-13
const L_CODE = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
]
const G_CODE = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
]
const R_CODE = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
]

const FIRST_DIGIT_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
]

// Converte EAN-13 de 13 dígitos em sequência binária de barras (0 e 1)
export function encodeEan13ToPattern(ean) {
  const digits = ean.replace(/\D/g, '').padStart(13, '0').slice(0, 13)
  const first = parseInt(digits[0], 10)
  const parity = FIRST_DIGIT_PARITY[first] || 'LLLLLL'

  let pattern = '101' // Guard bar inicial

  // Primeiros 6 dígitos
  for (let i = 1; i <= 6; i++) {
    const d = parseInt(digits[i], 10)
    const type = parity[i - 1]
    pattern += type === 'L' ? L_CODE[d] : G_CODE[d]
  }

  pattern += '01010' // Center guard bar

  // Últimos 6 dígitos
  for (let i = 7; i <= 12; i++) {
    const d = parseInt(digits[i], 10)
    pattern += R_CODE[d]
  }

  pattern += '101' // Guard bar final
  return { pattern, ean: digits }
}

// Gera PDF com etiqueta térmica padrão para impressão
export function generateBarcodeLabelPDF({ product, ean, price }) {
  // Tamanho padrão de etiqueta de gondola / produto (60mm x 40mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [60, 40]
  })

  // Cabeçalho da Loja
  const storeHeader = getCompanyPublicName(getCompanyDataLocal()).toUpperCase()
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(storeHeader, 30, 5, { align: 'center' })

  // Nome do produto (truncado para caber)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const name = (product?.name || 'PRODUTO').toUpperCase()
  const splitName = doc.splitTextToSize(name, 54)
  doc.text(splitName.slice(0, 2), 30, 9, { align: 'center' })

  // Marca / Categoria
  if (product?.brand) {
    doc.setFontSize(6)
    doc.text(`Marca: ${product.brand}`, 30, 15, { align: 'center' })
  }

  // Desenhar barras do EAN-13
  const { pattern, ean: cleanEan } = encodeEan13ToPattern(ean)
  const startX = 6
  const barY = 17
  const barHeight = 12
  const barWidth = 48 / pattern.length

  doc.setFillColor(0, 0, 0)
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      const isGuard = i < 3 || (i >= 45 && i < 50) || i >= pattern.length - 3
      const h = isGuard ? barHeight + 1.5 : barHeight
      doc.rect(startX + (i * barWidth), barY, barWidth, h, 'F')
    }
  }

  // Código numérico
  doc.setFontSize(8)
  doc.setFont('courier', 'bold')
  doc.text(cleanEan, 30, 32.5, { align: 'center' })

  // Preço de Venda
  if (price || product?.price) {
    const val = parseFloat(price || product?.price || 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`R$ ${val.toFixed(2).replace('.', ',')}`, 30, 37.5, { align: 'center' })
  }

  return doc
}

// Consulta dados do produto na internet pelo código de barras
export async function fetchProductByBarcode(ean) {
  const cleanEan = (ean || '').replace(/\D/g, '')
  if (!cleanEan || cleanEan.length < 6) {
    return { success: false, error: 'Código de barras deve conter pelo menos 6 dígitos numéricos.' }
  }

  try {
    const res = await fetch(`/api/barcode/lookup?ean=${encodeURIComponent(cleanEan)}`)
    const data = await res.json()
    if (data.success) {
      if (data.found && data.data) {
        const normalized = normalizeProductResult(data.data, 'Base de Dados GTIN')
        return {
          success: true,
          found: true,
          product: normalized,
          ean: data.ean || cleanEan,
          gtin14: data.gtin14 || normalized.gtin14
        }
      } else {
        return {
          success: true,
          found: false,
          ean: data.ean || cleanEan,
          gtin14: data.gtin14,
          message: data.message || 'Produto não identificado'
        }
      }
    }
    return {
      success: false,
      found: false,
      error: data.error || 'Produto não encontrado na internet.',
      ean: cleanEan
    }
  } catch (err) {
    console.error('Erro ao consultar código de barras na internet:', err)
    return {
      success: false,
      found: false,
      error: 'Falha de conexão com a base de códigos de barras.',
      ean: cleanEan
    }
  }
}

// Otimiza, redimensiona e comprime imagem no cliente mantendo nitidez de textos
export async function optimizeImageForAnalysis(imageSource, maxDimension = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      // Renderização com alta nitidez
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      // Retorna em JPEG com compressão equilibrada (88% de qualidade)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88)
      resolve(dataUrl)
    }
    img.onerror = (err) => reject(new Error('Falha ao processar arquivo de imagem.'))

    if (typeof imageSource === 'string') {
      img.src = imageSource
    } else if (imageSource instanceof Blob || imageSource instanceof File) {
      const reader = new FileReader()
      reader.onload = (e) => { img.src = e.target.result }
      reader.onerror = (e) => reject(new Error('Falha ao ler arquivo.'))
      reader.readAsDataURL(imageSource)
    } else {
      reject(new Error('Formato de imagem não suportado.'))
    }
  })
}

// Identifica produto por fotografia no backend inteligente
export async function identifyProductByPhoto(imageSource) {
  try {
    const optimizedImage = await optimizeImageForAnalysis(imageSource)

    const res = await fetch('/api/barcode/identify-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: optimizedImage })
    })

    const data = await res.json()
    if (data.success && (data.product || data.data || (data.candidates && data.candidates.length > 0))) {
      const rawProduct = data.product || data.data || data.candidates[0]
      const normalized = normalizeProductResult(rawProduct, 'Visão Computacional (Gemini AI)')

      const normalizedCandidates = Array.isArray(data.candidates)
        ? data.candidates.map(c => normalizeProductResult(c, 'Visão Computacional (Gemini AI)'))
        : [normalized]

      return {
        ...data,
        found: true,
        product: normalized,
        exactMatch: Boolean(data.exactMatch ?? (normalizedCandidates.length === 1)),
        candidates: normalizedCandidates
      }
    }
    return data
  } catch (err) {
    console.error('Erro na identificação por fotografia:', err)
    return {
      success: false,
      error: 'Não foi possível conectar ao serviço de reconhecimento visual. Verifique sua conexão de internet.'
    }
  }
}

// Salva correspondência confirmada no histórico de aprendizado
export async function confirmProductPhotoMatch(matchData) {
  try {
    const res = await fetch('/api/barcode/confirm-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matchData)
    })
    return await res.json()
  } catch (err) {
    console.warn('Erro ao registrar confirmação:', err)
    return { success: false, error: err.message }
  }
}

// Identifica e estrutura dados do produto por descrição textual utilizando IA Gemini
export async function fetchProductByDescription(descriptionText) {
  const clean = (descriptionText || '').trim()
  if (!clean || clean.length < 3) {
    return {
      success: false,
      error: 'Por favor, informe ao menos 3 caracteres da descrição do produto.'
    }
  }

  try {
    const res = await fetch('/api/barcode/identify-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ queryText: clean })
    })

    const data = await res.json()
    if (data.success && (data.data || (data.candidates && data.candidates.length > 0))) {
      const rawProduct = data.data || data.candidates[0]
      const normalized = normalizeProductResult(rawProduct, 'Inteligência Artificial (Gemini AI)')

      const normalizedCandidates = Array.isArray(data.candidates)
        ? data.candidates.map(c => normalizeProductResult(c, 'Inteligência Artificial (Gemini AI)'))
        : [normalized]

      return {
        success: true,
        found: true,
        product: normalized,
        exactMatch: Boolean(data.exactMatch ?? (normalizedCandidates.length === 1)),
        candidates: normalizedCandidates,
        cacheHit: Boolean(data.cacheHit)
      }
    }

    return {
      success: false,
      found: false,
      error: data.error || 'Não foi possível estruturar o produto a partir da descrição.'
    }
  } catch (err) {
    console.error('Erro na identificação por descrição:', err)
    return {
      success: false,
      found: false,
      error: 'Falha de conexão com o serviço de identificação inteligente.'
    }
  }
}

// Busca imagens de alta resolução na web para o produto
export async function searchProductImagesWeb(query) {
  const clean = (query || '').trim()
  if (!clean || clean.length < 2) return []

  try {
    const res = await fetch('/api/products/search-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: clean })
    })

    const data = await res.json()
    if (data.success && Array.isArray(data.images)) {
      return data.images
    }
    return []
  } catch (err) {
    console.error('Erro ao buscar fotos na web:', err)
    return []
  }
}


