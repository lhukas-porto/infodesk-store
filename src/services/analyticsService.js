// Serviço Dinâmico do Google Analytics 4 (GA4) com Eventos de E-commerce Oficiais
// Carrega o script SOMENTE quando o tenant ativar o recurso com ID válido.

let currentMeasurementId = null
const firedPurchaseOrders = new Set()

/**
 * Inicializa ou atualiza o Google Analytics dinamicamente para o tenant
 */
export function initGoogleAnalytics(measurementId, isEnabled = true) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // Se estiver desativado ou sem ID
  if (!isEnabled || !measurementId || !/^G-[A-Z0-9]{6,14}$/i.test(measurementId)) {
    unloadGoogleAnalytics()
    return
  }

  // Se já estiver carregado com o mesmo ID
  if (currentMeasurementId === measurementId && window.gtag) {
    return
  }

  // Se mudou de ID, descarrega o antigo primeiro
  if (currentMeasurementId && currentMeasurementId !== measurementId) {
    unloadGoogleAnalytics()
  }

  currentMeasurementId = measurementId

  // Injeta o script gtag.js
  const scriptId = 'ga4-gtag-script'
  let existingScript = document.getElementById(scriptId)
  if (!existingScript) {
    const script = document.createElement('script')
    script.id = scriptId
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
    document.head.appendChild(script)
  }

  // Configura dataLayer e função gtag
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: true,
    anonymize_ip: true
  })
}

/**
 * Descarrega o script e listeners do Google Analytics caso desativado
 */
export function unloadGoogleAnalytics() {
  if (typeof document === 'undefined') return
  currentMeasurementId = null
  const existingScript = document.getElementById('ga4-gtag-script')
  if (existingScript) existingScript.remove()
}

/**
 * Envio seguro de eventos para o gtag (sem PII)
 */
function sendGaEvent(eventName, params = {}) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function' && currentMeasurementId) {
    try {
      window.gtag('event', eventName, params)
    } catch (err) {
      console.warn('Analytics: Erro ao disparar evento:', err)
    }
  }
}

// =============================================================================
// Eventos Oficiais de E-commerce GA4
// =============================================================================

export function trackViewItem(product) {
  if (!product) return
  sendGaEvent('view_item', {
    currency: 'BRL',
    value: parseFloat(product.price) || 0,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_brand: product.brand || 'Infodesk',
        item_category: product.category || 'Geral',
        price: parseFloat(product.price) || 0,
        quantity: 1
      }
    ]
  })
}

export function trackViewItemList(products, category = 'Todos') {
  if (!products?.length) return
  sendGaEvent('view_item_list', {
    item_list_name: category,
    items: products.slice(0, 10).map((p, idx) => ({
      item_id: String(p.id),
      item_name: p.name,
      item_brand: p.brand || 'Infodesk',
      item_category: p.category || 'Geral',
      index: idx + 1,
      price: parseFloat(p.price) || 0
    }))
  })
}

export function trackSearch(searchTerm) {
  if (!searchTerm) return
  sendGaEvent('search', {
    search_term: searchTerm.trim()
  })
}

export function trackAddToCart(product, quantity = 1) {
  if (!product) return
  sendGaEvent('add_to_cart', {
    currency: 'BRL',
    value: (parseFloat(product.price) || 0) * quantity,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_brand: product.brand || 'Infodesk',
        item_category: product.category || 'Geral',
        price: parseFloat(product.price) || 0,
        quantity
      }
    ]
  })
}

export function trackRemoveFromCart(product, quantity = 1) {
  if (!product) return
  sendGaEvent('remove_from_cart', {
    currency: 'BRL',
    value: (parseFloat(product.price) || 0) * quantity,
    items: [
      {
        item_id: String(product.id),
        item_name: product.name,
        item_brand: product.brand || 'Infodesk',
        item_category: product.category || 'Geral',
        price: parseFloat(product.price) || 0,
        quantity
      }
    ]
  })
}

export function trackViewCart(cartItems = [], total = 0) {
  sendGaEvent('view_cart', {
    currency: 'BRL',
    value: parseFloat(total) || 0,
    items: cartItems.map(item => ({
      item_id: String(item.id),
      item_name: item.name,
      item_brand: item.brand || 'Infodesk',
      item_category: item.category || 'Geral',
      price: parseFloat(item.price) || 0,
      quantity: item.qty || 1
    }))
  })
}

export function trackBeginCheckout(cartItems = [], total = 0) {
  sendGaEvent('begin_checkout', {
    currency: 'BRL',
    value: parseFloat(total) || 0,
    items: cartItems.map(item => ({
      item_id: String(item.id),
      item_name: item.name,
      item_brand: item.brand || 'Infodesk',
      item_category: item.category || 'Geral',
      price: parseFloat(item.price) || 0,
      quantity: item.qty || 1
    }))
  })
}

export function trackAddShippingInfo(shippingType, shippingPrice = 0) {
  sendGaEvent('add_shipping_info', {
    currency: 'BRL',
    value: parseFloat(shippingPrice) || 0,
    shipping_tier: shippingType || 'Correios'
  })
}

export function trackAddPaymentInfo(paymentMethod, total = 0) {
  sendGaEvent('add_payment_info', {
    currency: 'BRL',
    value: parseFloat(total) || 0,
    payment_type: paymentMethod || 'mercadopago'
  })
}

/**
 * Dispara evento purchase exatamente UMA vez por pedido confirmado.
 * NUNCA envia nome, CPF, e-mail, telefone, endereço ou dados bancários.
 */
export function trackPurchase(order) {
  if (!order || !order.id) return

  // Proteção contra disparos duplicados
  if (firedPurchaseOrders.has(order.id)) {
    return
  }

  // Verifica persistência de compras já notificadas nesta sessão
  try {
    const savedFired = JSON.parse(sessionStorage.getItem('ga_fired_purchases') || '[]')
    if (savedFired.includes(order.id)) {
      firedPurchaseOrders.add(order.id)
      return
    }
    savedFired.push(order.id)
    sessionStorage.setItem('ga_fired_purchases', JSON.stringify(savedFired))
  } catch {}

  firedPurchaseOrders.add(order.id)

  const rawItems = order.items || []
  const items = rawItems.map(it => ({
    item_id: String(it.id || it.product_id),
    item_name: it.name || it.title || 'Produto',
    item_brand: it.brand || 'Infodesk',
    item_category: it.category || 'Geral',
    price: parseFloat(it.price) || 0,
    quantity: it.qty || it.quantity || 1
  }))

  sendGaEvent('purchase', {
    transaction_id: String(order.id),
    value: parseFloat(order.total) || 0,
    tax: 0,
    shipping: parseFloat(order.frete) || 0,
    currency: 'BRL',
    coupon: order.coupon || undefined,
    items
  })
}
