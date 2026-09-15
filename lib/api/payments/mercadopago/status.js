// Endpoint Serverless: Consultar Status de Pagamento de um Pedido
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export default async function handler(req, res) {
  try {
    const urlObj = new URL(req.url, 'http://localhost')
    const orderId = urlObj.searchParams.get('order_id') || req.query?.order_id

    if (!orderId) {
      res.statusCode = 400
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, error: 'Parâmetro order_id é obrigatório.' }))
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        success: true,
        orderId,
        status: 'Pendente',
        paymentStatus: 'pending'
      }))
      return
    }

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, total, payment_method, created_at')
      .eq('id', orderId)
      .single()

    const { data: paymentOrder } = await supabase
      .from('payment_orders')
      .select('status, environment, amount, mp_order_id, updated_at')
      .eq('order_id', orderId)
      .single()

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: true,
      orderId,
      status: order?.status || 'Pendente',
      total: order?.total || paymentOrder?.amount || 0,
      paymentMethod: order?.payment_method || 'mercadopago_checkout_pro',
      paymentStatus: paymentOrder?.status || 'pending',
      environment: paymentOrder?.environment || 'test',
      updatedAt: paymentOrder?.updated_at || order?.created_at
    }))
  } catch (err) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ success: false, error: err.message }))
  }
}
