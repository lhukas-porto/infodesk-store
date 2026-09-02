// Serviço de Geração de Código de Barras EAN-13 e Etiquetas Infodesk
import jsPDF from 'jspdf'

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

  // Cabeçalho da Infodesk
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('INFODESK INFORMÁTICA', 30, 5, { align: 'center' })

  // Nome do produto (truncado para caber)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  const name = (product?.name || 'PRODUTO INFODESK').toUpperCase()
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
