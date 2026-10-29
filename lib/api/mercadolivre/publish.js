// Endpoint Serverless: Publicar ou Atualizar Anúncio no Mercado Livre
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

// Renova o token se estiver prestes a expirar
async function getValidAccessToken(supabase) {
  const { data: config, error } = await supabase
    .from('mercadolivre_integrations')
    .select('*')
    .eq('store_id', 'default')
    .single()

  if (error || !config || !config.access_token) {
    throw new Error('Conta do Mercado Livre não está conectada. Conecte pelo painel primeiro.')
  }

  const now = new Date()
  const expiresAt = config.expires_at ? new Date(config.expires_at) : new Date(0)
  const isStillValid = (expiresAt.getTime() - now.getTime()) > (10 * 60 * 1000)

  if (isStillValid) {
    return config.access_token
  }

  if (!config.refresh_token) {
    throw new Error('Token expirado e refresh_token ausente. Reconecte a conta do Mercado Livre.')
  }

  const clientId = process.env.MERCADOLIVRE_CLIENT_ID || '7098003394262901'
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET

  const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: config.refresh_token
    }).toString()
  })

  const refreshData = await refreshRes.json()
  if (!refreshRes.ok || !refreshData.access_token) {
    throw new Error(`Falha ao renovar token do Mercado Livre: ${refreshData.message || 'desconhecido'}`)
  }

  const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 21600) * 1000).toISOString()

  await supabase
    .from('mercadolivre_integrations')
    .update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString()
    })
    .eq('store_id', 'default')

  return refreshData.access_token
}

// Descobrir categoria inteligente pelo título
async function predictCategory(title) {
  try {
    const res = await fetch(`https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(title)}`)
    if (!res.ok) return null
    const list = await res.json()
    if (Array.isArray(list) && list.length > 0 && list[0].category_id) {
      return list[0].category_id
    }
  } catch (e) {
    console.warn('[MercadoLivre PredictCategory] Falha na busca de categoria:', e.message)
  }
  return null
}

// Preenche atributos obrigatórios da categoria para evitar recusa do Mercado Livre
async function fillCategoryRequiredAttributes(categoryId, attributes, product) {
  try {
    const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`)
    if (!res.ok) return attributes
    const categoryAttrs = await res.json()
    if (!Array.isArray(categoryAttrs)) return attributes

    const existingIds = new Set(attributes.map(a => a.id))

    for (const attr of categoryAttrs) {
      const isRequired = attr.tags && attr.tags.required
      if (isRequired && !existingIds.has(attr.id)) {
        if (attr.id === 'BRAND') {
          attributes.push({ id: 'BRAND', value_name: product.brand || 'Genérica' })
          existingIds.add('BRAND')
        } else if (attr.id === 'MODEL') {
          attributes.push({ id: 'MODEL', value_name: (product.name || 'Padrão').slice(0, 30) })
          existingIds.add('MODEL')
        } else if (attr.values && attr.values.length > 0) {
          attributes.push({ id: attr.id, value_id: attr.values[0].id, value_name: attr.values[0].name })
          existingIds.add(attr.id)
        } else if (attr.value_type === 'string') {
          attributes.push({ id: attr.id, value_name: 'Padrão' })
          existingIds.add(attr.id)
        } else if (attr.value_type === 'boolean') {
          attributes.push({ id: attr.id, value_name: 'Não' })
          existingIds.add(attr.id)
        } else if (attr.value_type === 'number') {
          attributes.push({ id: attr.id, value_name: '1' })
          existingIds.add(attr.id)
        }
      }
    }
  } catch (e) {
    console.warn('[MercadoLivre Attributes] Falha ao preencher atributos obrigatórios:', e.message)
  }
  return attributes
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }))
    return
  }

  try {
    let body = {}
    if (typeof req.body === 'object' && req.body !== null) {
      body = req.body
    } else if (typeof req.body === 'string') {
      try { body = JSON.parse(req.body) } catch (_) {}
    } else {
      const buffers = []
      for await (const chunk of req) buffers.push(chunk)
      const dataStr = Buffer.concat(buffers).toString()
      if (dataStr) {
        try { body = JSON.parse(dataStr) } catch (_) {}
      }
    }

    const { productId, markupPercent = 0, listingType = 'gold_special', customCategoryId } = body

    if (!productId) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'productId é obrigatório.' }))
      return
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      res.statusCode = 500
      res.end(JSON.stringify({ success: false, error: 'Supabase indisponível.' }))
      return
    }

    // 1. Buscar produto no banco
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (prodErr || !product) {
      res.statusCode = 404
      res.end(JSON.stringify({ success: false, error: 'Produto não encontrado.' }))
      return
    }

    // 2. Obter token do Mercado Livre
    const accessToken = await getValidAccessToken(supabase)

    // 3. Determinar Categoria
    let categoryId = customCategoryId || product.mercadolivre_category_id
    if (!categoryId) {
      categoryId = await predictCategory(product.name)
    }
    if (!categoryId) {
      categoryId = 'MLB418472' // Periféricos/Informática
    }

    // 4. Calcular preço com markup
    const basePrice = Number(product.price) || 10
    const markup = Number(markupPercent) || Number(product.mercadolivre_markup_percent) || 0
    const finalPrice = Math.round((basePrice * (1 + (markup / 100))) * 100) / 100

    // 5. Preparar fotos (Meli exige URLs públicas)
    let pictures = []
    if (Array.isArray(product.images)) {
      pictures = product.images
        .filter(url => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')))
        .map(source => ({ source }))
    }
    if (pictures.length === 0) {
      pictures = [{ source: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' }]
    }

    // 6. Atributos base
    let attributes = []
    if (product.barcode) {
      attributes.push({ id: 'GTIN', value_name: String(product.barcode).trim() })
    }
    if (product.brand) {
      attributes.push({ id: 'BRAND', value_name: String(product.brand).trim() })
    } else {
      attributes.push({ id: 'BRAND', value_name: 'Genérica' })
    }
    if (product.sku) {
      attributes.push({ id: 'SELLER_SKU', value_name: String(product.sku).trim() })
    }
    attributes.push({ id: 'MODEL', value_name: (product.name || 'Padrão').slice(0, 30) })

    // Completa outros atributos obrigatórios específicos da categoria
    attributes = await fillCategoryRequiredAttributes(categoryId, attributes, product)

    // 7. Montar Payload Completo do Anúncio
    const title = (product.name || 'Produto Infodesk').trim().slice(0, 60)
    const itemPayload = {
      title,
      category_id: categoryId,
      price: finalPrice,
      currency_id: 'BRL',
      available_quantity: Math.max(1, Number(product.stock) || 1),
      buying_mode: 'buy_it_now',
      listing_type_id: listingType, // gold_special (Clássico) ou gold_pro (Premium)
      condition: 'new',
      channels: ['marketplace'],
      shipping: {
        mode: 'me2',
        local_pick_up: false,
        free_shipping: false
      },
      pictures,
      attributes
    }

    // 8. Fazer a publicação (POST /items)
    const publishRes = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(itemPayload)
    })

    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      console.error('[MercadoLivre Publish] Falha na criação do item:', publishData)
      let errorMsg = publishData.message || 'Erro ao publicar no Mercado Livre'
      if (Array.isArray(publishData.cause) && publishData.cause.length > 0) {
        const causes = publishData.cause.map(c => c.message || c.code).filter(Boolean).join(' | ')
        if (causes) errorMsg = `${errorMsg} (${causes})`
      }
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: errorMsg, details: publishData }))
      return
    }

    // 9. Adicionar Descrição ao Anúncio
    if (product.description) {
      try {
        await fetch(`https://api.mercadolibre.com/items/${publishData.id}/description`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ plain_text: product.description.trim() })
        })
      } catch (e) {
        console.warn('[MercadoLivre Description] Falha ao salvar descrição:', e.message)
      }
    }

    // 10. Atualizar o produto no Supabase
    await supabase
      .from('products')
      .update({
        mercadolivre_id: publishData.id,
        mercadolivre_permalink: publishData.permalink,
        mercadolivre_status: 'active',
        mercadolivre_category_id: categoryId,
        mercadolivre_markup_percent: markup,
        mercadolivre_last_synced_at: new Date().toISOString()
      })
      .eq('id', productId)

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      itemId: publishData.id,
      permalink: publishData.permalink,
      title: publishData.title,
      price: publishData.price,
      categoryId
    }))
  } catch (error) {
    console.error('[MercadoLivre Publish] Exceção:', error)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: error.message }))
  }
}
