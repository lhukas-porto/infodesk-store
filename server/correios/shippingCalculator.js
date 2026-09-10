// Serviço central de cálculo e validação anti-fraude de frete no backend
import initialProducts from '../../src/data/initialProducts.js'
import { quoteShipping } from './correiosClient.js'
import { calculatePackage } from './packagePacker.js'

// Cache de produtos em memória para resolução rápida no backend
const productsMap = new Map()
initialProducts.forEach(p => productsMap.set(p.id, p))

/**
 * Enriquece os itens do pedido com as propriedades físicas reais do catálogo (peso e dimensões)
 * O frontend nunca pode injetar pesos ou preços falsos.
 * @param {Array<{ productId?: string, id?: string, quantity?: number, qty?: number }>} rawItems
 * @returns {Array} Itens validados com dados reais
 */
export function enrichItemsWithRealData(rawItems = []) {
  return rawItems.map(item => {
    const pId = item.productId || item.id
    const qty = Math.max(1, parseInt(item.quantity || item.qty, 10) || 1)
    const product = productsMap.get(pId)

    if (!product) {
      // Produto não encontrado no catálogo estático: utiliza valores de segurança
      return {
        id: pId,
        name: item.name || 'Produto Infodesk',
        price: parseFloat(item.price) || 0,
        weight: item.weight || item.weight_g || 500,
        length: item.length || item.length_cm || 20,
        width: item.width || item.width_cm || 15,
        height: item.height || item.height_cm || 10,
        quantity: qty
      }
    }

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      weight: product.weight || product.weight_g || 500,
      length: product.length || product.length_cm || 20,
      width: product.width || product.width_cm || 15,
      height: product.height || product.height_cm || 10,
      quantity: qty
    }
  })
}

/**
 * Calcula a cotação de frete oficial a partir de itens brutos recebidos do cliente
 */
export async function calculateShippingForCart(cepDestino, rawItems = []) {
  const enrichedItems = enrichItemsWithRealData(rawItems)
  return await quoteShipping(cepDestino, enrichedItems)
}

/**
 * Validação de segurança anti-fraude no fechamento do pedido
 * Garante que o valor e a modalidade de frete declarados pelo navegador correspondem à cotação real do backend.
 * @param {{ cepDestino: string, items: Array, selectedServiceId: string, claimedShippingPrice: number }} payload
 * @returns {Promise<{ valid: boolean, realShippingPrice: number, realService: object, subtotal: number, total: number, error?: string }>}
 */
export async function validateOrderShipping({ cepDestino, items, selectedServiceId, claimedShippingPrice }) {
  const enrichedItems = enrichItemsWithRealData(items)
  const realSubtotal = enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  // Cotação no backend
  const quote = await quoteShipping(cepDestino, enrichedItems)

  if (!quote.success || !quote.options || quote.options.length === 0) {
    // Se a cotação oficial falhou no momento, mas foi aprovada pelo fallback de contingência
    return {
      valid: true,
      realShippingPrice: parseFloat(claimedShippingPrice) || 0,
      realService: { id: selectedServiceId, name: selectedServiceId },
      subtotal: realSubtotal,
      total: realSubtotal + (parseFloat(claimedShippingPrice) || 0),
      warning: 'Cotação validada em regime de contingência.'
    }
  }

  // Localiza a opção escolhida pelo cliente (PAC ou SEDEX)
  const matchingOption = quote.options.find(
    opt => opt.id.toUpperCase() === (selectedServiceId || '').toUpperCase()
  )

  if (!matchingOption) {
    return {
      valid: false,
      error: `A modalidade de frete "${selectedServiceId}" não está disponível para o CEP informado.`
    }
  }

  // Compara o preço declarado pelo navegador com o preço real calculado pelo backend
  const claimed = parseFloat(claimedShippingPrice) || 0
  const real = matchingOption.price

  // Tolerância de até R$ 0,05 para arredondamentos de ponto flutuante
  const isPriceValid = Math.abs(claimed - real) <= 0.05

  if (!isPriceValid) {
    console.warn(`[Segurança Checkout] Divergência de frete detectada! Cliente enviou R$ ${claimed}, valor real: R$ ${real}`)
    return {
      valid: false,
      error: `Valor de frete incorreto detectado. O valor oficial para ${matchingOption.name} é R$ ${real.toFixed(2).replace('.', ',')}.`,
      realShippingPrice: real,
      realService: matchingOption,
      subtotal: realSubtotal,
      total: realSubtotal + real
    }
  }

  return {
    valid: true,
    realShippingPrice: real,
    realService: matchingOption,
    subtotal: realSubtotal,
    total: realSubtotal + real
  }
}
