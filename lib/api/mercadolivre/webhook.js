// Endpoint Serverless: Webhook de Notificações do Mercado Livre
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default async function handler(req, res) {
  // O Mercado Livre exige HTTP 200 rápido para confirmar recebimento
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ received: true }))

  if (req.method !== 'POST') return

  try {
    let body = {}
    if (typeof req.body === 'object' && req.body !== null) {
      body = req.body
    } else if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body) } catch (_) {}
    }

    console.log('[MercadoLivre Webhook] Notificação recebida:', body.topic, body.resource)

    // Tópico de Pedidos (venda realizada)
    if (body.topic === 'orders_v2' || body.topic === 'orders') {
      // Processamento em background de baixa de estoque futura
    }

    // Tópico de Itens (mudança de status de anúncio)
    if (body.topic === 'items') {
      // Atualizar status do produto se necessário
    }
  } catch (err) {
    console.error('[MercadoLivre Webhook] Erro no processamento assíncrono:', err.message)
  }
}

