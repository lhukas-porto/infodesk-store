/**
 * Serviço de Importação e Exportação de Produtos via Planilhas CSV / Excel
 * Compatível com Microsoft Excel, Google Planilhas e LibreOffice Calc (UTF-8 com BOM).
 */

/**
 * Exporta o catálogo completo de produtos para um arquivo CSV formatado para Excel
 */
export function exportProductsToCsv(products = []) {
  if (!products || products.length === 0) {
    throw new Error('Nenhum produto disponível para exportação.')
  }

  const headers = [
    'ID',
    'Nome do Produto',
    'Marca',
    'Categoria',
    'Preco Custo',
    'Preco Venda',
    'Preco Original',
    'Estoque',
    'Codigo de Barras (EAN)',
    'Peso (kg)',
    'Comprimento (cm)',
    'Largura (cm)',
    'Altura (cm)',
    'Descricao Curta',
    'Origem'
  ]

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const rows = products.map(p => [
    escapeCsv(p.id || ''),
    escapeCsv(p.name || ''),
    escapeCsv(p.brand || ''),
    escapeCsv(p.category || 'Variedades'),
    escapeCsv(p.costPrice !== undefined ? Number(p.costPrice).toFixed(2) : ''),
    escapeCsv(p.price !== undefined ? Number(p.price).toFixed(2) : '0.00'),
    escapeCsv(p.originalPrice !== undefined ? Number(p.originalPrice).toFixed(2) : ''),
    escapeCsv(p.stock !== undefined ? parseInt(p.stock, 10) : 0),
    escapeCsv(p.ean || p.barcode || ''),
    escapeCsv(p.weight !== undefined ? Number(p.weight).toFixed(3) : '0.500'),
    escapeCsv(p.length || 20),
    escapeCsv(p.width || 15),
    escapeCsv(p.height || 10),
    escapeCsv(p.description || ''),
    escapeCsv(p.origin || 'Nacional')
  ].join(';'))

  // \uFEFF adiciona o BOM UTF-8 para o Excel abrir sem quebrar acentos
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const dateStr = new Date().toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `catalogo_produtos_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  return { total: products.length }
}

/**
 * Gera e baixa uma planilha modelo (template) para preenchimento de novos produtos
 */
export function downloadCsvTemplate() {
  const sampleProducts = [
    {
      id: '',
      name: 'Fone de Ouvido Bluetooth Sem Fio',
      brand: 'AudioTech',
      category: 'Periféricos',
      costPrice: 45.00,
      price: 89.90,
      originalPrice: 119.90,
      stock: 25,
      ean: '7891234567890',
      weight: 0.250,
      length: 18,
      width: 14,
      height: 6,
      description: 'Fone com cancelamento de ruído e bateria de até 20 horas.',
      origin: 'Nacional'
    },
    {
      id: '',
      name: 'Teclado Mecânico Gamer RGB',
      brand: 'Redragon',
      category: 'Gamer',
      costPrice: 110.00,
      price: 219.90,
      originalPrice: 259.90,
      stock: 12,
      ean: '7899876543210',
      weight: 0.850,
      length: 36,
      width: 15,
      height: 5,
      description: 'Switch azul tátil e iluminação RGB customizável.',
      origin: 'Importado'
    }
  ]

  return exportProductsToCsv(sampleProducts)
}

/**
 * Processa e analisa um arquivo CSV enviado pelo usuário
 */
export function parseProductsCsv(csvText) {
  if (!csvText || typeof csvText !== 'string') {
    throw new Error('Conteúdo do arquivo CSV está vazio ou inválido.')
  }

  // Remove BOM se presente
  let cleanText = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0)

  if (lines.length < 2) {
    throw new Error('O arquivo CSV deve conter um cabeçalho e pelo menos 1 linha de produto.')
  }

  // Detecta delimitador (; ou , ou \t)
  const firstLine = lines[0]
  let delimiter = ';'
  if (firstLine.split(';').length < 3 && firstLine.split(',').length >= 3) {
    delimiter = ','
  } else if (firstLine.split('\t').length >= 3) {
    delimiter = '\t'
  }

  // Parser robusto que respeita aspas duplas e quebras internas
  const parseLine = (line) => {
    const values = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    return values
  }

  const rawHeaders = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const items = []
  const errors = []

  // Mapeamento flexível de índices
  const findIndex = (terms) => rawHeaders.findIndex(h => terms.some(t => h.includes(t)))

  const idxId = findIndex(['id', 'codigo'])
  const idxName = findIndex(['nome', 'produto', 'titulo', 'name'])
  const idxBrand = findIndex(['marca', 'fabricante', 'brand'])
  const idxCat = findIndex(['categoria', 'departamento', 'category'])
  const idxCost = findIndex(['custo', 'precocusto', 'cost'])
  const idxPrice = findIndex(['preco', 'venda', 'precovenda', 'price'])
  const idxOrigPrice = findIndex(['original', 'de'])
  const idxStock = findIndex(['estoque', 'qtd', 'quantidade', 'stock'])
  const idxEan = findIndex(['ean', 'barras', 'barcode'])
  const idxWeight = findIndex(['peso', 'weight'])
  const idxLength = findIndex(['comprimento', 'length'])
  const idxWidth = findIndex(['largura', 'width'])
  const idxHeight = findIndex(['altura', 'height'])
  const idxDesc = findIndex(['descricao', 'detalhes', 'description'])

  if (idxName === -1 || idxPrice === -1) {
    throw new Error('A planilha precisa conter pelo menos as colunas "Nome do Produto" e "Preço de Venda".')
  }

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i])
    if (row.length === 0 || (row.length === 1 && !row[0])) continue

    const name = row[idxName]?.trim()
    if (!name) continue

    const parseNum = (val, fallback = 0) => {
      if (!val) return fallback
      const clean = String(val).replace(',', '.').replace(/[^\d.]/g, '')
      const n = parseFloat(clean)
      return isNaN(n) ? fallback : n
    }

    const price = parseNum(row[idxPrice], 0)
    const costPrice = idxCost !== -1 ? parseNum(row[idxCost], 0) : 0
    const originalPrice = idxOrigPrice !== -1 ? parseNum(row[idxOrigPrice], 0) : 0
    const stock = idxStock !== -1 ? parseInt(parseNum(row[idxStock], 0), 10) : 10
    const brand = idxBrand !== -1 ? (row[idxBrand]?.trim() || 'Genérica') : 'Genérica'
    const category = idxCat !== -1 ? (row[idxCat]?.trim() || 'Variedades') : 'Variedades'
    const ean = idxEan !== -1 ? (row[idxEan]?.trim().replace(/\D/g, '') || '') : ''
    const weight = idxWeight !== -1 ? parseNum(row[idxWeight], 0.5) : 0.5
    const length = idxLength !== -1 ? parseInt(parseNum(row[idxLength], 20), 10) : 20
    const width = idxWidth !== -1 ? parseInt(parseNum(row[idxWidth], 15), 10) : 15
    const height = idxHeight !== -1 ? parseInt(parseNum(row[idxHeight], 10), 10) : 10
    const description = idxDesc !== -1 ? (row[idxDesc]?.trim() || '') : ''
    const id = idxId !== -1 ? row[idxId]?.trim() : ''

    items.push({
      id: id || undefined,
      name,
      brand,
      category,
      costPrice,
      price,
      originalPrice: originalPrice > price ? originalPrice : 0,
      stock: Math.max(0, stock),
      ean,
      barcode: ean,
      weight,
      length,
      width,
      height,
      description,
      status: 'active'
    })
  }

  return {
    total: items.length,
    products: items,
    errors
  }
}
