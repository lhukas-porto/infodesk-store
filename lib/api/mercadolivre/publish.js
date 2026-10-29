// Endpoint Serverless: Publicar ou Atualizar Anúncio no Mercado Livre
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
  return createClient(url, key)
}

// Gera código EAN-13 válido com dígito verificador módulo 10
function generateValidEan13(prefix = '789') {
  const base9 = Math.floor(100000000 + Math.random() * 900000000).toString()
  const code12 = (prefix + base9).slice(0, 12)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10) || 0
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return code12 + check
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
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET || 'wQWQf2CuCDHITOhP381cIpy37ygPUsoh'

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

// Preenche atributos obrigatórios e técnicos da categoria
async function fillCategoryRequiredAttributes(categoryId, attributes, product) {
  try {
    const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`)
    if (!res.ok) return attributes
    const categoryAttrs = await res.json()
    if (!Array.isArray(categoryAttrs)) return attributes

    const existingIds = new Set(attributes.map(a => a.id))
    const fullText = `${product.name || ''} ${product.description || ''}`

    // 1. Verificar se MODEL é read_only nesta categoria — se for, remove para não dar erro
    const modelAttr = categoryAttrs.find(a => a.id === 'MODEL')
    if (modelAttr && modelAttr.tags && modelAttr.tags.read_only) {
      const idx = attributes.findIndex(a => a.id === 'MODEL')
      if (idx !== -1) {
        attributes.splice(idx, 1)
        existingIds.delete('MODEL')
      }
    }

    // 2. Tratar atributos específicos de cabos elétricos
    if (!existingIds.has('SECTION_SIZE')) {
      const secMatch = fullText.match(/(\d+[.,]?\d*)\s*mm/i)
      if (secMatch) {
        attributes.push({ id: 'SECTION_SIZE', value_name: `${secMatch[1].replace(',', '.')} mm²` })
        existingIds.add('SECTION_SIZE')
      }
    }
    if (!existingIds.has('CABLE_LENGTH')) {
      const lenMatch = fullText.match(/(\d+)\s*(m|metros?)\b/i)
      if (lenMatch) {
        attributes.push({ id: 'CABLE_LENGTH', value_name: `${lenMatch[1]} m` })
        existingIds.add('CABLE_LENGTH')
      }
    }
    if (!existingIds.has('ELECTRIC_CABLE_TYPE')) {
      const isFlex = fullText.toLowerCase().includes('flex')
      attributes.push({ id: 'ELECTRIC_CABLE_TYPE', value_name: isFlex ? 'Cordão flexível' : 'Instalação predial' })
      existingIds.add('ELECTRIC_CABLE_TYPE')
    }
    if (!existingIds.has('CONDUCTORS_NUMBER')) {
      attributes.push({ id: 'CONDUCTORS_NUMBER', value_name: '1' })
      existingIds.add('CONDUCTORS_NUMBER')
    }

    // 3. Varrer todos os atributos obrigatórios ou de catálogo da categoria
    for (const attr of categoryAttrs) {
      if (attr.tags && attr.tags.read_only) continue // NUNCA enviar atributos read_only
      if (existingIds.has(attr.id)) continue

      if (attr.tags && (attr.tags.required || attr.tags.catalog_required)) {
        if (attr.id === 'BRAND') {
          attributes.push({ id: 'BRAND', value_name: product.brand || 'Genérica' })
          existingIds.add('BRAND')
        } else if (attr.id === 'MODEL') {
          attributes.push({ id: 'MODEL', value_name: (product.name || 'Padrão').slice(0, 30) })
          existingIds.add('MODEL')
        } else if (attr.id === 'PEAK_POWER' || attr.id.includes('POWER')) {
          const match = fullText.match(/(\d+)\s*(VA|va|W|watts?|kVA)/i)
          const val = match ? `${match[1]} ${match[2].toUpperCase()}` : `1000 ${attr.default_unit || 'VA'}`
          attributes.push({ id: attr.id, value_name: val })
          existingIds.add(attr.id)
        } else if (attr.values && attr.values.length > 0) {
          attributes.push({ id: attr.id, value_id: attr.values[0].id, value_name: attr.values[0].name })
          existingIds.add(attr.id)
        } else if (attr.value_type === 'number_unit') {
          const unit = attr.default_unit || (attr.allowed_units && attr.allowed_units[0]?.name) || ''
          const matchNum = fullText.match(new RegExp(`(\\d+)\\s*${unit}`, 'i'))
          const numVal = matchNum ? matchNum[1] : '100'
          attributes.push({ id: attr.id, value_name: `${numVal} ${unit}`.trim() })
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

    // 2. Obter token válido do Mercado Livre
    const accessToken = await getValidAccessToken(supabase)

    // 3. Determinar Categoria
    let categoryId = customCategoryId || product.mercadolivre_category_id
    if (!categoryId) {
      categoryId = await predictCategory(product.name)
    }
    if (!categoryId) {
      categoryId = 'MLB1055' // Informática e periféricos
    }

    // 4. Calcular preço com markup (Mercado Livre exige preço mínimo viável)
    const basePrice = Number(product.price) || 15
    const markup = Number(markupPercent) || Number(product.mercadolivre_markup_percent) || 0
    const calculatedPrice = Math.round((basePrice * (1 + (markup / 100))) * 100) / 100
    const finalPrice = Math.max(12, calculatedPrice) // Garante patamar mínimo aceito pelo Meli

    // 5. Frete Grátis Obrigatório no Mercado Livre para itens >= R$ 79,00
    const isFreeShipping = finalPrice >= 79

    // 6. Título do Anúncio (máx 60 caracteres no Meli)
    const title = (product.name || 'Produto Infodesk').trim().slice(0, 60)

    // 7. SE O ITEM JÁ EXISTE NO MERCADO LIVRE: Re-sincronizar via PUT /items/{id} ou Relist
    const existingMeliId = product.mercadolivre_id
    if (existingMeliId) {
      const updatePayload = {
        price: finalPrice,
        available_quantity: Math.max(1, Number(product.stock) || 1)
      }

      let updateRes = await fetch(`https://api.mercadolibre.com/items/${existingMeliId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      })

      let updateData = await updateRes.json()

      // Se o anúncio estiver com status 'closed' (encerrado), tenta relist (reativação de anúncio finalizado)
      const isClosed = updateData.message && updateData.message.includes('status:closed')
      if (isClosed) {
        console.log(`[MercadoLivre Sync] Anúncio ${existingMeliId} está fechado/encerrado. Tentando relist...`)
        const relistRes = await fetch(`https://api.mercadolibre.com/items/${existingMeliId}/relist`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            price: finalPrice,
            quantity: Math.max(1, Number(product.stock) || 1),
            listing_type_id: listingType
          })
        })

        const relistData = await relistRes.json()
        if (relistRes.ok && relistData.id) {
          await supabase
            .from('products')
            .update({
              mercadolivre_id: relistData.id,
              mercadolivre_permalink: relistData.permalink,
              mercadolivre_status: relistData.status || 'active',
              mercadolivre_markup_percent: markup,
              mercadolivre_last_synced_at: new Date().toISOString()
            })
            .eq('id', productId)

          res.statusCode = 200
          res.end(JSON.stringify({
            success: true,
            relisted: true,
            itemId: relistData.id,
            permalink: relistData.permalink,
            title: relistData.title || title,
            price: relistData.price,
            categoryId: relistData.category_id
          }))
          return
        }
        console.warn(`[MercadoLivre Sync] Relist não aceito. Prosseguindo para criar nova publicação ativa...`)
      } else if (updateRes.ok) {
        // Atualização bem-sucedida de anúncio existente ativo
        await supabase
          .from('products')
          .update({
            mercadolivre_status: updateData.status || 'active',
            mercadolivre_markup_percent: markup,
            mercadolivre_last_synced_at: new Date().toISOString()
          })
          .eq('id', productId)

        res.statusCode = 200
        res.end(JSON.stringify({
          success: true,
          updated: true,
          itemId: updateData.id,
          permalink: updateData.permalink,
          title: updateData.title || title,
          price: updateData.price,
          categoryId: updateData.category_id
        }))
        return
      } else {
        console.warn(`[MercadoLivre Sync] PUT não aceito no item ${existingMeliId}: ${updateData.message}. Recriando publicação...`)
      }
      // Se não conseguiu dar PUT nem relist (anúncio expirado/fechado), o fluxo continua naturalmente abaixo para POST /items e gera um novo anúncio ativo!
    }

    // 8. Preparar fotos (Meli exige URLs públicas)
    let pictures = []
    if (Array.isArray(product.images)) {
      pictures = product.images
        .filter(url => typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://')))
        .map(source => ({ source }))
    }
    if (pictures.length === 0) {
      pictures = [{ source: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800' }]
    }

    // 9. Código de Barras (GTIN/EAN)
    let ean = product.barcode ? String(product.barcode).trim() : ''
    if (!ean || ean.length < 8) {
      ean = generateValidEan13('789')
    }

    // 10. Atributos base e Dimensões do Pacote (Obrigatório para Mercado Envios)
    let attributes = [
      { id: 'BRAND', value_name: product.brand ? String(product.brand).trim() : 'Genérica' },
      { id: 'GTIN', value_name: ean },
      { id: 'SELLER_PACKAGE_HEIGHT', value_name: `${product.height || 10} cm` },
      { id: 'SELLER_PACKAGE_WIDTH', value_name: `${product.width || 15} cm` },
      { id: 'SELLER_PACKAGE_LENGTH', value_name: `${product.length || 20} cm` },
      { id: 'SELLER_PACKAGE_WEIGHT', value_name: `${product.weight ? Math.round(product.weight * 1000) : 400} g` }
    ]

    if (product.sku) {
      attributes.push({ id: 'SELLER_SKU', value_name: String(product.sku).trim() })
    }

    // Completa outros atributos obrigatórios específicos da categoria (pulando read_only)
    attributes = await fillCategoryRequiredAttributes(categoryId, attributes, product)

    // 11. Montar Payload Completo do Novo Anúncio
    const itemPayload = {
      title,
      family_name: title,
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
        free_shipping: isFreeShipping
      },
      pictures,
      attributes
    }

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

    // 12. Adicionar Descrição ao Anúncio
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

    // 13. Atualizar o produto no Supabase
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
      title: publishData.title || title,
      price: publishData.price,
      categoryId
    }))
  } catch (error) {
    console.error('[MercadoLivre Publish] Exceção:', error)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: error.message }))
  }
}
