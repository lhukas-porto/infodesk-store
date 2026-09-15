// Endpoint Serverless: Criar Pedido e Order no Mercado Pago (Orders API)
// Validação server-side de preços, integridade de estoque e idempotência

import { createMercadoPagoOrder, getMercadoPagoConfig } from './service.js'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: false, error: 'Método não permitido. Utilize POST.' }))
    return
  }

  try {
    const body = await parseRequestBody(req)
    const incomingData = body?.orderData || body || {}
    const orderData = {
      ...incomingData,
      id: incomingData.id || incomingData.orderId || `ped_${Date.now()}`
    }
    const companyId = body?.companyId || incomingData.companyId || 'default'

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, error: 'Dados do pedido incompletos ou sem itens.' }))
      return
    }

    const config = getMercadoPagoConfig()
    const supabase = getSupabaseClient()

    // 1. Validação Server-Side de Preços e Estoque contra o Supabase (se configurado)
    let validatedItems = []
    let serverSubtotal = 0

    if (supabase) {
      const productIds = orderData.items.map(i => i.id).filter(Boolean)
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, price, stock, active')
        .in('id', productIds)

      const dbMap = new Map((dbProducts || []).map(p => [p.id, p]))

      for (const item of orderData.items) {
        const dbProd = dbMap.get(item.id)
        const qty = parseInt(item.quantity !== undefined ? item.quantity : item.qty, 10) || 1
        
        // Se o produto existir no banco oficial, usa o preço oficial do banco
        const unitPrice = dbProd ? parseFloat(dbProd.price) : parseFloat(item.price) || 0
        const prodName = dbProd ? dbProd.name : (item.name || 'Produto')

        if (dbProd && dbProd.stock < qty) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            success: false,
            error: `Estoque insuficiente para o produto "${prodName}". Disponível: ${dbProd.stock}.`
          }))
          return
        }

        serverSubtotal += unitPrice * qty
        validatedItems.push({
          ...item,
          name: prodName,
          price: unitPrice,
          quantity: qty
        })
      }
    } else {
      // Fallback quando offline
      validatedItems = orderData.items.map(i => ({
        ...i,
        price: parseFloat(i.price) || 0,
        quantity: parseInt(i.quantity !== undefined ? i.quantity : i.qty, 10) || 1
      }))
      serverSubtotal = validatedItems.reduce((acc, i) => acc + i.price * i.quantity, 0)
    }

    const freteVal = parseFloat(orderData.frete) || 0
    const calculatedTotal = Math.round((serverSubtotal + freteVal) * 100) / 100

    // 2. Chave de Idempotência única para impedir duplicidade de cobrança
    const idempotencyKey = `idemp_${orderData.id}_${Math.round(calculatedTotal * 100)}`

    // 3. Monta o objeto de pedido seguro
    const cliente = orderData.cliente || {}
    const safeOrder = {
      ...orderData,
      items: validatedItems,
      subtotal: Math.round(serverSubtotal * 100) / 100,
      frete: freteVal,
      total: calculatedTotal,
      company_id: companyId,
      status: 'Pendente',
      paymentMethod: 'mercadopago_checkout_pro'
    }

    // 4. Grava ou atualiza o pedido no Supabase
    if (supabase) {
      const orderPayload = {
        id: safeOrder.id,
        customer_name: safeOrder.customerName || cliente.nome || 'Cliente',
        customer_email: safeOrder.customerEmail || cliente.email || '',
        customer_cpf: safeOrder.customerCpf || cliente.cpf || '',
        customer_phone: safeOrder.customerPhone || cliente.telefone || '',
        customer_address: safeOrder.customerAddress || `${cliente.endereco || ''}, ${cliente.numero || ''}`,
        customer_city: safeOrder.customerCity || cliente.cidade || '',
        customer_state: safeOrder.customerState || cliente.estado || '',
        customer_cep: safeOrder.customerCep || cliente.cep || '',
        items: safeOrder.items,
        subtotal: safeOrder.subtotal,
        frete: safeOrder.frete,
        frete_type: safeOrder.freteType || 'PAC',
        total: safeOrder.total,
        payment_method: 'mercadopago_checkout_pro',
        status: 'Pendente',
        company_id: companyId
      }

      try {
        await supabase.from('orders').upsert(orderPayload)
      } catch (err) {
        console.warn('Erro ao salvar order no Supabase:', err.message)
      }
    }

    // 5. Se o Access Token estiver configurado, cria a Order no Mercado Pago via Orders API
    if (config.isConfigured) {
      const mpOrderResult = await createMercadoPagoOrder(safeOrder, {
        idempotencyKey,
        companyId
      })

      // Grava registro na tabela payment_orders no Supabase
      if (supabase) {
        try {
          await supabase.from('payment_orders').insert([{
            company_id: companyId,
            order_id: safeOrder.id,
            mp_order_id: String(mpOrderResult.id || ''),
            external_reference: safeOrder.id,
            checkout_url: mpOrderResult.checkoutUrl,
            environment: config.environment,
            amount: safeOrder.total,
            status: 'pending_payment',
            payment_method: 'mercadopago_checkout_pro',
            idempotency_key: idempotencyKey,
            metadata: {
              payer_email: cliente.email,
              items_count: safeOrder.items.length
            }
          }])
        } catch (err) {
          console.warn('Supabase payment_orders insert warning:', err.message)
        }
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: true,
        orderId: safeOrder.id,
        order_id: safeOrder.id,
        mp_order_id: String(mpOrderResult.id || ''),
        checkout_url: mpOrderResult.checkoutUrl,
        environment: config.environment
      }))
      return
    }

    // 6. Modo Simulação / Sandbox de Desenvolvimento se credencial ainda não foi cadastrada no .env
    const simulatedCheckoutUrl = `${config.appUrl.replace(/\/$/, '')}/#payment-return?status=approved&order_id=${encodeURIComponent(safeOrder.id)}&simulated=true`

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: true,
      orderId: safeOrder.id,
      checkout_url: simulatedCheckoutUrl,
      isSimulated: true,
      message: 'Modo demonstração/simulação: adicione MERCADO_PAGO_ACCESS_TOKEN no .env para checkout oficial ao vivo.'
    }))
  } catch (error) {
    console.error('Erro em create-order do Mercado Pago:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno ao processar pedido com o Mercado Pago.'
    }))
  }
}
