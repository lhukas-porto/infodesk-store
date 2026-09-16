// Endpoint Serverless: Webhook de Notificações do Mercado Pago (Orders API)
// Validação HMAC-SHA256 (x-signature), idempotência e atualização no Supabase

import { getMercadoPagoConfig, verifyWebhookSignature, mapMercadoPagoStatus, getMercadoPagoOrder } from './service.js'
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
    const config = getMercadoPagoConfig()
    const supabase = getSupabaseClient()
    const body = await parseRequestBody(req)

    const signatureHeader = req.headers['x-signature'] || ''
    const requestId = req.headers['x-request-id'] || ''
    const dataId = body?.data?.id || body?.id || ''
    const action = body?.action || body?.type || 'payment.updated'
    const eventId = String(body?.id || dataId || `${Date.now()}_${Math.random()}`)

    const companyId = body?.company_id || body?.data?.company_id || 'default'
    let isSigValid = true

    // 1. Validação da Assinatura HMAC-SHA256 (x-signature)
    if (config.webhookSecret) {
      const sigVerification = verifyWebhookSignature({
        signatureHeader,
        requestId,
        dataId,
        secret: config.webhookSecret
      })
      isSigValid = Boolean(sigVerification.valid)

      if (!isSigValid) {
        console.warn('Mercado Pago Webhook: Assinatura inválida rejeitada.')
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: false, error: 'Assinatura inválida (x-signature).' }))
        return
      }
    }

    // 2. Verificação de Idempotência: Evita processar o mesmo evento múltiplas vezes
    if (supabase && eventId) {
      const { data: existingEvent } = await supabase
        .from('payment_webhook_events')
        .select('id, processed')
        .eq('event_id', eventId)
        .single()

      if (existingEvent && existingEvent.processed) {
        // Evento já processado anteriormente com sucesso
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: true, message: 'Evento já processado anteriormente (idempotente).' }))
        return
      }

      // Registra o evento recebido na tabela
      try {
        await supabase.from('payment_webhook_events').insert({
          company_id: companyId,
          event_id: eventId,
          action,
          resource_id: String(dataId || ''),
          signature_valid: isSigValid,
          processed: false,
          payload: {
            action,
            dataId,
            received_at: new Date().toISOString()
          }
        })
      } catch (err) {
        console.warn('Supabase webhook event log warning:', err.message)
      }
    }

    // 3. Consulta a Order ou Pagamento diretamente na API do Mercado Pago para obter o estado real
    let realOrderData = null
    let externalReference = ''
    let mpStatus = 'pending'

    if (config.isConfigured && dataId) {
      try {
        if (action.startsWith('order') || body?.topic === 'merchant_order') {
          realOrderData = await getMercadoPagoOrder(dataId)
          externalReference = realOrderData?.external_reference || ''
          mpStatus = realOrderData?.status || 'pending'
        } else {
          // Para notificações de payment, consulta o endpoint de pagamentos
          const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { 'Authorization': `Bearer ${config.accessToken}` }
          })
          if (pRes.ok) {
            const pData = await pRes.json()
            externalReference = pData?.external_reference || ''
            mpStatus = pData?.status || 'pending'
          }
        }
      } catch (err) {
        console.warn('Mercado Pago: Aviso ao consultar recurso na API oficial:', err.message)
      }
    }

    // Se não obtiver external_reference na API, usa o que veio no body (fallback seguro)
    if (!externalReference) {
      externalReference = body?.external_reference || body?.data?.external_reference || ''
    }

    // 4. Mapeamento de status e atualização no Supabase
    if (externalReference && supabase) {
      const { internalStatus, paymentStatus } = mapMercadoPagoStatus(mpStatus)

      // Atualiza o pedido na tabela orders
      await supabase
        .from('orders')
        .update({ status: internalStatus })
        .eq('id', externalReference)

      // Se o pagamento foi aprovado, realiza baixa de estoque no catálogo
      if (paymentStatus === 'approved' || internalStatus === 'Pago') {
        try {
          const { data: orderRecord } = await supabase
            .from('orders')
            .select('items')
            .eq('id', externalReference)
            .single()

          if (orderRecord && Array.isArray(orderRecord.items)) {
            for (const item of orderRecord.items) {
              const qty = parseInt(item.quantity || item.qty || 1) || 1
              if (item.id) {
                const { data: prod } = await supabase
                  .from('products')
                  .select('stock, sold')
                  .eq('id', item.id)
                  .single()

                if (prod) {
                  const newStock = Math.max(0, (prod.stock || 0) - qty)
                  const newSold = (prod.sold || 0) + qty
                  await supabase
                    .from('products')
                    .update({ stock: newStock, sold: newSold })
                    .eq('id', item.id)
                }
              }
            }
          }
        } catch (stockErr) {
          console.warn('[Webhook] Aviso ao baixar estoque pós-pagamento:', stockErr.message)
        }
      }

      // Atualiza na tabela payment_orders
      await supabase
        .from('payment_orders')
        .update({
          status: paymentStatus,
          metadata: {
            last_webhook_action: action,
            updated_at: new Date().toISOString()
          }
        })
        .eq('external_reference', externalReference)

      // Marca o evento de webhook como processado
      if (eventId) {
        try {
          await supabase
            .from('payment_webhook_events')
            .update({ processed: true })
            .eq('event_id', eventId)
        } catch {}
      }
    }

    // Responde rapidamente com HTTP 200
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: true,
      received: true,
      action,
      dataId,
      status: mpStatus
    }))
  } catch (error) {
    console.error('Erro no processamento do webhook do Mercado Pago:', error)
    // Retorna 200 para evitar que o Mercado Pago reenvie indefinidamente se for erro de payload
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: false, error: error.message }))
  }
}
