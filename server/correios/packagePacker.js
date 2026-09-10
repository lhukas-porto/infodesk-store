// Algoritmo determinístico de empacotamento e cálculo de cubagem para os Correios
// Regras oficiais dos Correios para encomenda tipo pacote/caixa (tpObjeto = "2"):
// - Comprimento (C): 15 cm a 100 cm
// - Largura (L): 10 cm a 100 cm
// - Altura (A): 1 cm a 100 cm (recomendado mín. 2 cm para caixas)
// - Soma (C + L + A): 26 cm a 200 cm
// - Peso máximo: 30.000 g (30 kg)

export const CORREIOS_LIMITS = {
  MIN_COMPRIMENTO: 15,
  MIN_LARGURA: 10,
  MIN_ALTURA: 2,
  MIN_SOMA: 26,
  MAX_DIMENSAO: 100,
  MAX_SOMA: 200,
  MIN_PESO_GRAMAS: 300,
  MAX_PESO_GRAMAS: 30000
}

/**
 * Calcula o pacote de remessa ideal para os itens do pedido
 * @param {Array} items - Lista de itens [{ id, name, weight, length, width, height, quantity, qty }]
 * @returns {{ weightG: number, length: number, width: number, height: number, volumeCm3: number }}
 */
export function calculatePackage(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      weightG: CORREIOS_LIMITS.MIN_PESO_GRAMAS,
      length: CORREIOS_LIMITS.MIN_COMPRIMENTO,
      width: CORREIOS_LIMITS.MIN_LARGURA,
      height: CORREIOS_LIMITS.MIN_ALTURA,
      volumeCm3: CORREIOS_LIMITS.MIN_COMPRIMENTO * CORREIOS_LIMITS.MIN_LARGURA * CORREIOS_LIMITS.MIN_ALTURA
    }
  }

  let totalWeightG = 0
  let maxItemLength = 0
  let maxItemWidth = 0
  let totalVolumeCm3 = 0
  let totalItemCount = 0

  items.forEach(item => {
    const qty = Math.max(1, parseInt(item.quantity || item.qty, 10) || 1)
    totalItemCount += qty

    // Extrai peso em gramas
    let itemWeightG = 500
    if (item.weight !== undefined && item.weight !== null) {
      const parsedWeight = parseFloat(item.weight)
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        // Se menor que 50, assume que foi passado em kg (ex: 0.5 kg -> 500 g)
        itemWeightG = parsedWeight < 50 ? Math.round(parsedWeight * 1000) : Math.round(parsedWeight)
      }
    } else if (item.weight_g) {
      itemWeightG = parseInt(item.weight_g, 10) || 500
    }
    totalWeightG += itemWeightG * qty

    // Dimensões em centímetros
    const length = Math.max(5, parseFloat(item.length || item.length_cm) || 20)
    const width = Math.max(5, parseFloat(item.width || item.width_cm) || 15)
    const height = Math.max(1, parseFloat(item.height || item.height_cm) || 10)

    maxItemLength = Math.max(maxItemLength, length)
    maxItemWidth = Math.max(maxItemWidth, width)
    totalVolumeCm3 += (length * width * height) * qty
  })

  // Estratégia de cubagem e dimensões da caixa:
  // 1. O comprimento e a largura da embalagem devem acomodar o maior item do lote.
  let packageLength = Math.max(maxItemLength, CORREIOS_LIMITS.MIN_COMPRIMENTO)
  let packageWidth = Math.max(maxItemWidth, CORREIOS_LIMITS.MIN_LARGURA)

  // 2. Altura calculada pelo volume total com folga de acomodação de 15% (material de proteção/enchimento)
  const baseArea = packageLength * packageWidth
  const volumeComFolga = totalVolumeCm3 * 1.15
  let packageHeight = Math.ceil(volumeComFolga / baseArea)

  // Garantir altura mínima dos Correios
  packageHeight = Math.max(packageHeight, CORREIOS_LIMITS.MIN_ALTURA)

  // 3. Validação dos limites mínimos dos Correios (Soma C + L + A >= 26)
  let sumDimensions = packageLength + packageWidth + packageHeight
  if (sumDimensions < CORREIOS_LIMITS.MIN_SOMA) {
    const diff = CORREIOS_LIMITS.MIN_SOMA - sumDimensions
    packageHeight += diff
  }

  // 4. Validação dos limites máximos dos Correios
  packageLength = Math.min(packageLength, CORREIOS_LIMITS.MAX_DIMENSAO)
  packageWidth = Math.min(packageWidth, CORREIOS_LIMITS.MAX_DIMENSAO)
  packageHeight = Math.min(packageHeight, CORREIOS_LIMITS.MAX_DIMENSAO)

  if (packageLength + packageWidth + packageHeight > CORREIOS_LIMITS.MAX_SOMA) {
    // Reduz altura para encaixar no limite máximo de 200cm
    packageHeight = Math.max(CORREIOS_LIMITS.MIN_ALTURA, CORREIOS_LIMITS.MAX_SOMA - packageLength - packageWidth)
  }

  // 5. Peso final com validação de limites
  const finalWeightG = Math.min(
    CORREIOS_LIMITS.MAX_PESO_GRAMAS,
    Math.max(CORREIOS_LIMITS.MIN_PESO_GRAMAS, Math.round(totalWeightG))
  )

  return {
    weightG: finalWeightG,
    length: Math.round(packageLength),
    width: Math.round(packageWidth),
    height: Math.round(packageHeight),
    volumeCm3: Math.round(packageLength * packageWidth * packageHeight),
    itemCount: totalItemCount
  }
}
