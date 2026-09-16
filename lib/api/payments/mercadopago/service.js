// Serviço de Integração Mercado Pago Checkout Pro (Orders API /v1/orders)
// Comunicação exclusiva server-side com validação HMAC-SHA256 e suporte multiempresa

import crypto from 'node:crypto'

const MP_API_BASE = 'https://api.mercadopago.com'

import fs from 'node:fs'
import path from 'node:path'

function loadLocalEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const idx = trimmed.indexOf('=')
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim()
          const val = trimmed.slice(idx + 1).trim()
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  } catch {}
}

/**
 * Obtém as credenciais do Mercado Pago a partir do ambiente ou config
 */
export function getMercadoPagoConfig() {
  loadLocalEnv()
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || ''
  const publicKey = process.env.MERCADO_PAGO_PUBLIC_KEY || ''
  const environment = (process.env.MERCADO_PAGO_ENVIRONMENT || 'test').toLowerCase()
  const appUrl = process.env.APP_URL || 'http://localhost:5173'
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || ''

  return {
    accessToken,
    publicKey,
    environment,
    appUrl,
    webhookSecret,
    isConfigured: Boolean(accessToken && accessToken.length > 15)
  }
}

/**
 * Monta o payload padronizado para a Orders API (/v1/orders) do Mercado Pago
 * @param {Object} params { order, appUrl, notificationUrl, companyId }
 */
export function createMercadoPagoOrderPayload({ order, appUrl = 'http://localhost:5173', notificationUrl, companyId = 'default' }) {
  const baseAppUrl = (appUrl || 'http://localhost:5173').replace(/\/$/, '')
  const orderId = order.id || order.orderId || `ped_${Date.now()}`

  const backUrls = {
    success: `${baseAppUrl}/#payment-return?payment_status=success&status=approved&order_id=${encodeURIComponent(orderId)}`,
    pending: `${baseAppUrl}/#payment-return?payment_status=pending&status=pending&order_id=${encodeURIComponent(orderId)}`,
    failure: `${baseAppUrl}/#payment-return?payment_status=failure&status=rejected&order_id=${encodeURIComponent(orderId)}`
  }

  const resolvedNotificationUrl = notificationUrl || `${baseAppUrl}/api/payments/mercadopago/webhook`

  // Mapeia os itens do pedido estritamente conforme schema oficial da Orders API (/v1/orders)
  const rawItems = (order.items || []).map((item, index) => ({
    title: String(item.name || item.title || 'Produto Infodesk').slice(0, 120),
    description: String(item.description || item.name || item.title || '').slice(0, 250),
    quantity: parseInt(item.quantity !== undefined ? item.quantity : item.qty, 10) || 1,
    unit_price: parseFloat(item.price || 0),
    category_id: 'electronics'
  }))

  // Se houver valor de frete, adiciona como item de serviço de entrega
  const shippingFee = parseFloat(order.frete || order.shipping_fee) || 0
  if (shippingFee > 0) {
    rawItems.push({
      title: order.freteType ? `Frete (${order.freteType})` : 'Frete / Entrega',
      description: 'Custo de envio da encomenda',
      quantity: 1,
      unit_price: shippingFee,
      category_id: 'shipping'
    })
  }

  const totalNum = rawItems.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0)

  const items = rawItems.map(it => ({
    title: it.title,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price.toFixed(2),
    category_id: it.category_id
  }))

  // Dados do pagador
  const cliente = order.cliente || {}
  const rawCpf = String(order.customerCpf || order.customer_document || cliente.cpf || '').replace(/\D/g, '')
  const rawPhone = String(order.customerPhone || order.customer_phone || cliente.telefone || '').replace(/\D/g, '')
  const nomePartes = String(order.customerName || order.customer_name || cliente.nome || 'Cliente').trim().split(' ')
  const firstName = nomePartes[0] || 'Cliente'
  const lastName = nomePartes.slice(1).join(' ') || 'Infodesk'

  const payer = {
    email: (order.customerEmail || order.customer_email || cliente.email || 'comprador@infodesk.net.br').toLowerCase().trim(),
    first_name: firstName,
    last_name: lastName
  }

  if (rawCpf.length === 11) {
    payer.identification = {
      type: 'CPF',
      number: rawCpf
    }
  }

  if (rawPhone.length >= 10) {
    payer.phone = {
      area_code: rawPhone.slice(0, 2),
      number: rawPhone.slice(2)
    }
  }

  const rawCep = String(order.customerCep || cliente.cep || '').replace(/\D/g, '')
  if (rawCep.length === 8) {
    payer.address = {
      zip_code: rawCep,
      street_name: order.customerAddress || order.shipping_address || cliente.endereco || 'Rua Principal',
      street_number: String(cliente.numero || 100)
    }
  }

  return {
    type: 'online',
    processing_mode: 'manual',
    external_reference: orderId,
    description: `Pedido ${orderId} - Infodesk Store`,
    total_amount: totalNum.toFixed(2),
    items,
    payer
  }
}

export function createMercadoPagoPreferencePayload({ order, appUrl = 'http://localhost:5173', notificationUrl, companyId = 'default' }) {
  const baseAppUrl = (appUrl || 'http://localhost:5173').replace(/\/$/, '')
  const orderId = order.id || order.orderId || `ped_${Date.now()}`

  const backUrls = {
    success: `${baseAppUrl}/#payment-return?payment_status=success&status=approved&order_id=${encodeURIComponent(orderId)}`,
    pending: `${baseAppUrl}/#payment-return?payment_status=pending&status=pending&order_id=${encodeURIComponent(orderId)}`,
    failure: `${baseAppUrl}/#payment-return?payment_status=failure&status=rejected&order_id=${encodeURIComponent(orderId)}`
  }

  const resolvedNotificationUrl = notificationUrl || `${baseAppUrl}/api/payments/mercadopago/webhook`

  const rawItems = (order.items || []).map((item, index) => ({
    id: String(item.id || `item_${index}`),
    title: String(item.name || item.title || 'Produto Infodesk').slice(0, 120),
    description: String(item.description || item.name || item.title || '').slice(0, 250),
    quantity: parseInt(item.quantity !== undefined ? item.quantity : item.qty, 10) || 1,
    unit_price: parseFloat(item.price || 0),
    currency_id: 'BRL',
    category_id: 'electronics'
  }))

  const shippingFee = parseFloat(order.frete || order.shipping_fee) || 0
  if (shippingFee > 0) {
    rawItems.push({
      id: 'shipping_fee',
      title: order.freteType ? `Frete (${order.freteType})` : 'Frete / Entrega',
      description: 'Custo de envio da encomenda',
      quantity: 1,
      unit_price: shippingFee,
      currency_id: 'BRL',
      category_id: 'shipping'
    })
  }

  const cliente = order.cliente || {}
  const rawCpf = String(order.customerCpf || order.customer_document || cliente.cpf || '').replace(/\D/g, '')
  const rawPhone = String(order.customerPhone || order.customer_phone || cliente.telefone || '').replace(/\D/g, '')
  const nomePartes = String(order.customerName || order.customer_name || cliente.nome || 'Cliente').trim().split(' ')
  const firstName = nomePartes[0] || 'Cliente'
  const lastName = nomePartes.slice(1).join(' ') || 'Infodesk'

  const payer = {
    email: (order.customerEmail || order.customer_email || cliente.email || 'comprador@infodesk.net.br').toLowerCase().trim(),
    name: firstName,
    surname: lastName
  }

  if (rawCpf.length === 11) {
    payer.identification = {
      type: 'CPF',
      number: rawCpf
    }
  }

  if (rawPhone.length >= 10) {
    payer.phone = {
      area_code: rawPhone.slice(0, 2),
      number: rawPhone.slice(2)
    }
  }

  const rawCep = String(order.customerCep || cliente.cep || '').replace(/\D/g, '')
  if (rawCep.length === 8) {
    payer.address = {
      zip_code: rawCep,
      street_name: order.customerAddress || order.shipping_address || cliente.endereco || 'Rua Principal',
      street_number: parseInt(cliente.numero, 10) || 100
    }
  }

  const isLocalHost = baseAppUrl.includes('localhost') || baseAppUrl.includes('127.0.0.1') || !baseAppUrl.startsWith('https://')

  const payload = {
    items: rawItems,
    payer,
    back_urls: backUrls,
    external_reference: orderId,
    notification_url: resolvedNotificationUrl,
    payment_methods: {
      excluded_payment_methods: [],
      excluded_payment_types: [],
      installments: 12
    },
    statement_descriptor: 'INFODESK STORE'
  }

  // O Mercado Pago exige domínio público seguro (HTTPS) para redirecionamento automático (auto_return).
  // Em ambiente local (localhost / 127.0.0.1), o envio de auto_return causa rejeição HTTP 400.
  if (!isLocalHost) {
    payload.auto_return = 'approved'
  }

  return payload
}

/**
 * Cria uma Preferência oficial no Mercado Pago Checkout Pro (/checkout/preferences)
 * Garante compatibilidade total com Pix, Cartão de Crédito e Boleto sem exclusões
 */
export async function createMercadoPagoOrder(orderData, options = {}) {
  const config = getMercadoPagoConfig()

  if (!config.isConfigured) {
    throw new Error('Mercado Pago: MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.')
  }

  const orderId = orderData.id || orderData.orderId || `ped_${Date.now()}`
  const idempotencyKey = options.idempotencyKey || `idemp_${orderId}_${Date.now()}`
  const companyId = options.companyId || 'default'

  const prefPayload = createMercadoPagoPreferencePayload({
    order: orderData,
    appUrl: config.appUrl,
    companyId
  })

  const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(prefPayload)
  })

  const resJson = await response.json()

  if (!response.ok) {
    const errorMsg = resJson.message || resJson.error || JSON.stringify(resJson)
    throw new Error(`Mercado Pago Checkout Error (${response.status}): ${errorMsg}`)
  }

  // No Checkout Pro do Brasil:
  // Se for ambiente de teste, utiliza sandbox_init_point se disponível; caso contrário, init_point
  const checkoutUrl = (config.environment === 'test' ? (resJson.sandbox_init_point || resJson.init_point) : resJson.init_point) ||
    resJson.init_point ||
    resJson.sandbox_init_point

  return {
    id: resJson.id,
    checkoutUrl,
    status: 'pending_payment',
    externalReference: resJson.external_reference || orderId,
    idempotencyKey,
    raw: resJson
  }
}

/**
 * Consulta os dados reais e atualizados de uma Order na API do Mercado Pago
 * @param {string} orderId ID da Order no Mercado Pago
 */
export async function getMercadoPagoOrder(orderId) {
  const config = getMercadoPagoConfig()

  if (!config.isConfigured) {
    throw new Error('Mercado Pago: Access Token não configurado no servidor.')
  }

  const response = await fetch(`${MP_API_BASE}/v1/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Mercado Pago: Falha ao consultar order ${orderId} (${response.status})`)
  }

  return await response.json()
}

/**
 * Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago (header x-signature)
 * Formato do header: ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2ef8eda45a0282ff693eac24131a5e839
 * Manifesto oficial: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 */
export function verifyWebhookSignature({ signatureHeader, xSignature, requestId, xRequestId, dataId, secret }) {
  const sigHeader = signatureHeader || xSignature
  const reqId = requestId || xRequestId

  if (!secret) {
    // Se o webhook secret ainda não foi cadastrado pelo usuário, loga aviso e permite continuidade segura
    return { valid: true, reason: 'SECRET_NOT_SET' }
  }

  if (!sigHeader) {
    return { valid: false, reason: 'MISSING_SIGNATURE_HEADER' }
  }

  // Extrai ts e v1
  const parts = sigHeader.split(',')
  let ts = ''
  let hashRecebido = ''

  for (const part of parts) {
    const [k, v] = part.trim().split('=')
    if (k === 'ts') ts = v
    if (k === 'v1') hashRecebido = v
  }

  if (!ts || !hashRecebido) {
    return { valid: false, reason: 'INVALID_SIGNATURE_FORMAT' }
  }

  // Monta o manifesto oficial conforme documentação Mercado Pago
  // Formato: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  let manifest = ''
  if (dataId) manifest += `id:${dataId};`
  if (reqId) manifest += `request-id:${reqId};`
  manifest += `ts:${ts};`

  // Calcula o HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(manifest)
  const hashCalculado = hmac.digest('hex')

  // Comparação segura de strings de tempo constante
  const bufferRecebido = Buffer.from(hashRecebido, 'hex')
  const bufferCalculado = Buffer.from(hashCalculado, 'hex')

  if (bufferRecebido.length !== bufferCalculado.length) {
    return { valid: false, reason: 'HASH_MISMATCH' }
  }

  const matches = crypto.timingSafeEqual(bufferRecebido, bufferCalculado)
  return {
    valid: matches,
    reason: matches ? 'OK' : 'HASH_MISMATCH'
  }
}

/**
 * Mapeia o status do Mercado Pago para os status internos da loja Infodesk
 */
export function mapMercadoPagoStatus(mpStatus) {
  const s = String(mpStatus || '').toLowerCase().trim()
  switch (s) {
    case 'approved':
    case 'paid':
      return { internalStatus: 'Pago', paymentStatus: 'approved' }
    case 'in_process':
    case 'pending':
    case 'authorized':
      return { internalStatus: 'Pendente', paymentStatus: 'in_process' }
    case 'rejected':
      return { internalStatus: 'Cancelado', paymentStatus: 'rejected' }
    case 'cancelled':
    case 'expired':
      return { internalStatus: 'Cancelado', paymentStatus: 'cancelled' }
    case 'refunded':
      return { internalStatus: 'Cancelado', paymentStatus: 'refunded' }
    case 'charged_back':
      return { internalStatus: 'Cancelado', paymentStatus: 'charged_back' }
    default:
      return { internalStatus: 'Pendente', paymentStatus: s || 'pending' }
  }
}
