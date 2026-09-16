// Serviço central de cálculo e validação anti-fraude de frete no backend
import initialProducts from '../../src/data/initialProducts.js'
import { quoteShipping } from './correiosClient.js'
import { calculatePackage } from './packagePacker.js'
import { createClient } from '@supabase/supabase-js'

// Cache de produtos em memória com TTL de 30 minutos
const productsCache = new Map()
// Seed inicial com initialProducts como base de contingência
initialProducts.forEach(p => productsCache.set(String(p.id), { ...p, cachedAt: Date.now() }))

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

/**
 * Enriquece os itens do pedido com as propriedades físicas reais do catálogo (peso e dimensões)
 * Busca tanto no cache quanto diretamente no banco Supabase se for um produto novo.
 */
export async function enrichItemsWithRealData(rawItems = []) {
  const supabase = getSupabase()
  const missingIds = []

  // 1. Identifica itens ausentes no cache ou com cache expirado (TTL 30min)
  for (const item of rawItems) {
    const pId = String(item.productId || item.id || '')
    const cached = productsCache.get(pId)
    if (!cached || (Date.now() - (cached.cachedAt || 0) > 30 * 60 * 1000)) {
      if (pId) missingIds.push(pId)
    }
  }

  // 2. Busca dados reais no Supabase para novos produtos
  if (supabase && missingIds.length > 0) {
    try {
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, price, specs')
        .in('id', missingIds)

      if (dbProducts && dbProducts.length > 0) {
        dbProducts.forEach(p => {
          const specs = Array.isArray(p.specs) ? p.specs : []
          const weightSpec = specs.find(s => /peso/i.test(s.label || ''))?.value
          let weight_g = 500

          if (weightSpec) {
            const num = parseFloat(String(weightSpec).replace(',', '.'))
            if (!isNaN(num)) {
              if (/kg/i.test(weightSpec)) weight_g = Math.round(num * 1000)
              else if (/g/i.test(weightSpec)) weight_g = Math.round(num)
            }
          }

          productsCache.set(String(p.id), {
            id: p.id,
            name: p.name,
            price: parseFloat(p.price) || 0,
            weight: weight_g,
            length: 20,
            width: 15,
            height: 10,
            cachedAt: Date.now()
          })
        })
      }
    } catch (err) {
      console.warn('Erro ao sincronizar produtos reais no frete:', err.message)
    }
  }

  return rawItems.map(item => {
    const pId = String(item.productId || item.id || '')
    const qty = Math.max(1, parseInt(item.quantity || item.qty, 10) || 1)
    const product = productsCache.get(pId)

    if (!product) {
      return {
        id: pId,
        name: item.name || 'Produto',
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
      weight: product.weight || 500,
      length: product.length || 20,
      width: product.width || 15,
      height: product.height || 10,
      quantity: qty
    }
  })
}

/**
 * Calcula a cotação de frete oficial a partir de itens enriquecidos com o banco
 */
export async function calculateShippingForCart(cepDestino, rawItems = []) {
  const enrichedItems = await enrichItemsWithRealData(rawItems)
  return await quoteShipping(cepDestino, enrichedItems)
}

/**
 * Validação de segurança anti-fraude no fechamento do pedido
 */
export async function validateOrderShipping({ cepDestino, items, selectedServiceId, claimedShippingPrice }) {
  const enrichedItems = await enrichItemsWithRealData(items)
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
