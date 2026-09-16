import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { slugify } from './seoManager.js'
import { hashCustomerPassword } from './customerService.js'

// Conversores snake_case <-> camelCase para Produtos (com suporte a SEO e Multiempresa)
export function mapDbProductToApp(dbProd) {
  if (!dbProd) return null
  const slug = dbProd.slug || slugify(dbProd.name)
  return {
    id: dbProd.id,
    companyId: dbProd.company_id || 'default',
    name: dbProd.name,
    slug,
    brand: dbProd.brand || '',
    category: dbProd.category || 'Outros',
    description: dbProd.description || '',
    specs: Array.isArray(dbProd.specs) ? dbProd.specs : [],
    images: Array.isArray(dbProd.images) ? dbProd.images : [],
    costPrice: parseFloat(dbProd.cost_price) || 0,
    taxRate: parseFloat(dbProd.tax_rate) || 9.05,
    marginRate: parseFloat(dbProd.margin_rate) || 30,
    price: parseFloat(dbProd.price) || 0,
    originalPrice: dbProd.original_price ? parseFloat(dbProd.original_price) : null,
    installments: parseInt(dbProd.installments) || 6,
    installmentPrice: parseFloat(dbProd.installment_price) || 0,
    stock: parseInt(dbProd.stock) || 0,
    rating: parseFloat(dbProd.rating) || 5.0,
    reviews: parseInt(dbProd.reviews) || 0,
    sold: parseInt(dbProd.sold) || 0,
    featured: Boolean(dbProd.featured),
    ean: dbProd.ean || '',
    active: dbProd.active !== false,
    weight: parseInt(dbProd.weight_g, 10) || 500,
    length: parseInt(dbProd.length_cm, 10) || 20,
    width: parseInt(dbProd.width_cm, 10) || 15,
    height: parseInt(dbProd.height_cm, 10) || 10,
    // Campos de SEO & Divulgação Orgânica
    seo_title: dbProd.seo_title || `${dbProd.name}`,
    seo_description: dbProd.seo_description || dbProd.description || '',
    image_alt: dbProd.image_alt || dbProd.name,
    primary_keyword: dbProd.primary_keyword || '',
    mpn: dbProd.mpn || '',
    google_category: dbProd.google_category || '',
    is_anchor: Boolean(dbProd.is_anchor),
    weekly_offer: Boolean(dbProd.weekly_offer),
    merchant_include: dbProd.merchant_include !== false,
    merchant_status: dbProd.merchant_status || 'eligible',
    merchant_exclusion_reason: dbProd.merchant_exclusion_reason || '',
    createdAt: dbProd.created_at,
    updatedAt: dbProd.updated_at
  }
}

export function mapAppProductToDb(appProd) {
  if (!appProd) return null

  // Preserva especificações e dimensões dentro de specs JSONB
  const specs = Array.isArray(appProd.specs) ? [...appProd.specs] : []
  if (appProd.weight && !specs.some(s => s.label?.toLowerCase().includes('peso'))) {
    specs.push({ label: 'Peso', value: `${appProd.weight}g` })
  }

  const slug = appProd.slug || slugify(appProd.name)

  return {
    company_id: appProd.companyId || appProd.company_id || 'default',
    name: appProd.name,
    slug,
    brand: appProd.brand || '',
    category: appProd.category || 'Outros',
    description: appProd.description || '',
    specs,
    images: Array.isArray(appProd.images) ? appProd.images : [],
    cost_price: parseFloat(appProd.costPrice) || 0,
    tax_rate: parseFloat(appProd.taxRate) || 9.05,
    margin_rate: parseFloat(appProd.marginRate) || 30,
    price: parseFloat(appProd.price) || 0,
    original_price: appProd.originalPrice ? parseFloat(appProd.originalPrice) : null,
    installments: parseInt(appProd.installments) || 6,
    installment_price: parseFloat(appProd.installmentPrice) || 0,
    stock: parseInt(appProd.stock) || 0,
    rating: parseFloat(appProd.rating) || 5.0,
    reviews: parseInt(appProd.reviews) || 0,
    sold: parseInt(appProd.sold) || 0,
    featured: Boolean(appProd.featured),
    ean: appProd.ean || '',
    active: appProd.active !== false,
    // Campos de SEO & Divulgação Orgânica
    seo_title: appProd.seo_title || appProd.name,
    seo_description: appProd.seo_description || appProd.description || '',
    image_alt: appProd.image_alt || appProd.name,
    primary_keyword: appProd.primary_keyword || '',
    mpn: appProd.mpn || '',
    google_category: appProd.google_category || '',
    is_anchor: Boolean(appProd.is_anchor),
    weekly_offer: Boolean(appProd.weekly_offer),
    merchant_include: appProd.merchant_include !== false,
    merchant_status: appProd.merchant_status || 'eligible',
    merchant_exclusion_reason: appProd.merchant_exclusion_reason || ''
  }
}

// === PRODUTOS ===
export async function fetchProductsFromDb(companyId = 'default') {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    let query = supabase.from('products').select('*')
    // Se a tabela já tiver company_id, podemos filtrar ou trazer tudo para o catálogo
    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase: Erro ao buscar produtos:', error.message)
      return null
    }
    return data && data.length > 0 ? data.map(mapDbProductToApp) : []
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao buscar produtos:', err)
    return null
  }
}

export async function upsertProductToDb(product) {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const payload = mapAppProductToDb(product)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(product.id)

    if (isUuid) {
      payload.id = product.id
    }

    let res = await supabase
      .from('products')
      .upsert(payload)
      .select()
      .single()

    // Fallback gracioso caso colunas novas de SEO ainda não tenham sido migradas no Supabase
    if (res.error && res.error.message?.includes('column')) {
      const basicPayload = {
        name: payload.name,
        brand: payload.brand,
        category: payload.category,
        description: payload.description,
        specs: payload.specs,
        images: payload.images,
        cost_price: payload.cost_price,
        tax_rate: payload.tax_rate,
        margin_rate: payload.margin_rate,
        price: payload.price,
        original_price: payload.original_price,
        installments: payload.installments,
        installment_price: payload.installment_price,
        stock: payload.stock,
        rating: payload.rating,
        reviews: payload.reviews,
        sold: payload.sold,
        featured: payload.featured,
        ean: payload.ean,
        active: payload.active
      }
      if (isUuid) basicPayload.id = product.id
      res = await supabase
        .from('products')
        .upsert(basicPayload)
        .select()
        .single()
    }

    const { data, error } = res

    if (error) {
      console.warn('Supabase: Erro ao salvar produto:', error.message)
      return null
    }
    return mapDbProductToApp(data)
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao salvar produto:', err)
    return null
  }
}

export async function deleteProductFromDb(productId, productEan = null, productName = null) {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productId)

    if (isUuid) {
      const { error } = await supabase.from('products').delete().eq('id', productId)
      if (error) {
        console.warn('Supabase: Erro ao deletar produto por ID:', error.message)
        return false
      }
    }

    // Limpeza complementar para garantir que duplicatas órfãs com o mesmo EAN não persistam no banco
    if (productEan && String(productEan).trim().length > 3) {
      await supabase.from('products').delete().eq('ean', String(productEan).trim())
    } else if (productName && !isUuid) {
      await supabase.from('products').delete().eq('name', productName.trim())
    }

    return true
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao deletar produto:', err)
    return false
  }
}

export async function clearAllProductsFromDb() {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const { data: all, error: fetchErr } = await supabase.from('products').select('id')
    if (fetchErr) return false
    if (all && all.length > 0) {
      const ids = all.map(p => p.id)
      for (let i = 0; i < ids.length; i += 20) {
        await supabase.from('products').delete().in('id', ids.slice(i, i + 20))
      }
    }
    return true
  } catch (err) {
    console.warn('Supabase: Falha ao zerar produtos:', err)
    return false
  }
}

export async function seedProductsToDb(initialList) {
  if (!isSupabaseConfigured || !supabase || !initialList?.length) return []
  try {
    const payloads = initialList.map(p => {
      const dbObj = mapAppProductToDb(p)
      return dbObj
    })

    const { data, error } = await supabase
      .from('products')
      .insert(payloads)
      .select()

    if (error) {
      console.warn('Supabase: Erro na carga inicial de produtos:', error.message)
      return null
    }
    return data ? data.map(mapDbProductToApp) : []
  } catch (err) {
    console.warn('Supabase: Falha de conexão na carga inicial:', err)
    return null
  }
}

// === CLIENTES ===
export async function fetchCustomersFromDb(companyId = 'default', role = 'super_admin') {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    let query = supabase.from('customers').select('*').order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.warn('Supabase: Erro ao buscar clientes:', error.message)
      return null
    }

    // Normaliza os dados e aplica fallback seguro
    const list = (data || []).map(c => ({
      ...c,
      company_id: c.company_id || 'default',
      status: c.status || 'Ativo',
      internal_notes: c.internal_notes || '',
      consent_marketing: Boolean(c.consent_marketing),
      consent_whatsapp: c.consent_whatsapp !== false,
      last_login_at: c.last_login_at || null,
      anonymized_at: c.anonymized_at || null
    }))

    if (role === 'super_admin' || !companyId || companyId === 'default') {
      return list
    }

    return list.filter(c => c.company_id === companyId)
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao buscar clientes:', err)
    return null
  }
}

/**
 * Busca estritamente apenas o cliente tentando logar, sem expor os demais
 */
export async function findCustomerByCredentials(loginIdentifier) {
  if (!isSupabaseConfigured || !supabase || !loginIdentifier) return null
  const cleanId = (loginIdentifier || '').trim().toLowerCase()
  const cleanDigits = (loginIdentifier || '').replace(/\D/g, '')

  try {
    let query = supabase.from('customers').select('*')
    if (cleanDigits && cleanDigits.length >= 11) {
      query = query.or(`email.eq.${cleanId},cpf.eq.${cleanDigits}`)
    } else {
      query = query.eq('email', cleanId)
    }
    const { data, error } = await query.limit(1).maybeSingle()
    if (error || !data) return null
    return data
  } catch (err) {
    console.warn('Supabase: Erro ao buscar cliente específico para login:', err)
    return null
  }
}

export async function upsertCustomerToDb(customer, companyId = 'default') {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    let safePassword = customer.password || 'default_hash_guest'
    if (safePassword && !safePassword.startsWith('sha256_')) {
      safePassword = await hashCustomerPassword(safePassword)
    }

    const payload = {
      nome: customer.nome,
      email: customer.email?.toLowerCase()?.trim(),
      cpf: customer.cpf,
      telefone: customer.telefone,
      password: safePassword,
      cep: customer.cep,
      endereco: customer.endereco,
      numero: customer.numero,
      complemento: customer.complemento,
      bairro: customer.bairro,
      cidade: customer.cidade,
      estado: customer.estado,
      company_id: customer.company_id || companyId || 'default',
      status: customer.status || 'Ativo',
      internal_notes: customer.internal_notes || '',
      consent_marketing: Boolean(customer.consent_marketing),
      consent_whatsapp: customer.consent_whatsapp !== false
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customer.id)
    if (isUuid) {
      payload.id = customer.id
    }

    let res = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .single()

    // Fallback gracioso se colunas novas ainda não tiverem sido migradas no banco
    if (res.error && res.error.message?.includes('column')) {
      const basicPayload = {
        nome: customer.nome,
        email: customer.email?.toLowerCase()?.trim(),
        cpf: customer.cpf,
        telefone: customer.telefone,
        password: customer.password,
        cep: customer.cep,
        endereco: customer.endereco,
        numero: customer.numero,
        complemento: customer.complemento,
        bairro: customer.bairro,
        cidade: customer.cidade,
        estado: customer.estado
      }
      if (isUuid) basicPayload.id = customer.id
      res = await supabase.from('customers').upsert(basicPayload, { onConflict: 'email' }).select().single()
    }

    if (res.error) {
      console.warn('Supabase: Erro ao salvar cliente:', res.error.message)
      return null
    }
    return res.data
  } catch (err) {
    console.warn('Supabase: Falha ao salvar cliente:', err)
    return null
  }
}

export async function updateCustomerInDb(customerId, updates) {
  if (!isSupabaseConfigured || !supabase || !customerId) return false
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customerId)
    let query = supabase.from('customers').update(updates)
    if (isUuid) {
      query = query.eq('id', customerId)
    } else {
      query = query.eq('email', updates.email || '')
    }
    const { error } = await query
    if (error) {
      console.warn('Supabase: Erro ao atualizar cliente:', error.message)
      if (error.message?.includes('column') || error.message?.includes('schema cache')) {
        const basicUpdates = { ...updates }
        delete basicUpdates.internal_notes
        delete basicUpdates.company_id
        delete basicUpdates.status
        delete basicUpdates.consent_marketing
        delete basicUpdates.consent_whatsapp
        delete basicUpdates.anonymized_at

        if (Object.keys(basicUpdates).length > 0) {
          let retryQuery = supabase.from('customers').update(basicUpdates)
          if (isUuid) retryQuery = retryQuery.eq('id', customerId)
          else retryQuery = retryQuery.eq('email', updates.email || '')
          const retryRes = await retryQuery
          return !retryRes.error
        }
        return true
      }
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao atualizar cliente:', err)
    return false
  }
}

// === AUDITORIA ADMINISTRATIVA (LGPD) ===
export async function logCustomerAuditAction(logData) {
  const fullLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    company_id: logData.company_id || 'default',
    customer_id: logData.customer_id,
    actor_name: logData.actor_name || 'Administrador',
    actor_email: logData.actor_email || 'admin@infodesk.net.br',
    actor_role: logData.actor_role || 'super_admin',
    action: logData.action,
    details: logData.details || {},
    created_at: new Date().toISOString()
  }

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('customer_audit_logs').insert([{
        company_id: fullLog.company_id,
        customer_id: fullLog.customer_id,
        actor_name: fullLog.actor_name,
        actor_email: fullLog.actor_email,
        actor_role: fullLog.actor_role,
        action: fullLog.action,
        details: fullLog.details
      }])
    } catch (err) {
      console.warn('Supabase audit log warning:', err)
    }
  }

  try {
    const saved = localStorage.getItem('infodesk_customer_audit_logs')
    const list = saved ? JSON.parse(saved) : []
    const updated = [fullLog, ...list].slice(0, 300)
    localStorage.setItem('infodesk_customer_audit_logs', JSON.stringify(updated))
  } catch {}

  return fullLog
}

export async function fetchCustomerAuditLogs(customerId = null, companyId = 'default') {
  let cloudLogs = []
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('customer_audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      if (customerId) query = query.eq('customer_id', customerId)
      const { data, error } = await query
      if (!error && data) cloudLogs = data
    } catch {}
  }

  try {
    const saved = localStorage.getItem('infodesk_customer_audit_logs')
    const localLogs = saved ? JSON.parse(saved) : []
    const all = [...cloudLogs, ...localLogs]
    const seen = new Set()
    return all.filter(l => {
      const key = l.id || (l.action + l.created_at)
      if (seen.has(key)) return false
      seen.add(key)
      if (customerId && l.customer_id !== customerId) return false
      return true
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } catch {
    return cloudLogs
  }
}

// === PEDIDOS ===
export async function fetchOrdersFromDb() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'Deletado')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase: Erro ao buscar pedidos:', error.message)
      return null
    }
    return data ? data.map(o => ({
      id: o.id,
      customerName: o.customer_name,
      customerEmail: o.customer_email,
      customerCpf: o.customer_cpf,
      customerPhone: o.customer_phone,
      customerAddress: o.customer_address,
      customerCity: o.customer_city,
      customerState: o.customer_state,
      customerCep: o.customer_cep,
      cliente: {
        nome: o.customer_name || '',
        email: o.customer_email || '',
        cpf: o.customer_cpf || '',
        telefone: o.customer_phone || '',
        endereco: o.customer_address || '',
        cidade: o.customer_city || '',
        estado: o.customer_state || '',
        cep: o.customer_cep || ''
      },
      items: o.items,
      subtotal: parseFloat(o.subtotal),
      frete: parseFloat(o.frete),
      freteType: o.frete_type,
      total: parseFloat(o.total),
      paymentMethod: o.payment_method,
      paymentData: o.payment_data,
      status: o.status,
      trackingCode: o.tracking_code,
      date: o.created_at
    })) : []
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao buscar pedidos:', err)
    return null
  }
}

export async function insertOrderToDb(order) {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const payload = {
      id: order.id,
      customer_name: order.customerName || order.cliente?.nome || 'Cliente',
      customer_email: order.customerEmail || order.cliente?.email || '',
      customer_cpf: order.customerCpf || order.cliente?.cpf || '',
      customer_phone: order.customerPhone || order.cliente?.telefone || '',
      customer_address: order.customerAddress || `${order.cliente?.endereco || ''}, ${order.cliente?.numero || ''}`,
      customer_city: order.customerCity || order.cliente?.cidade || '',
      customer_state: order.customerState || order.cliente?.estado || '',
      customer_cep: order.customerCep || order.cliente?.cep || '',
      items: order.items || [],
      subtotal: order.subtotal || 0,
      frete: order.frete || 0,
      frete_type: order.freteType || 'PAC',
      total: order.total || 0,
      payment_method: order.paymentMethod || 'pix',
      payment_data: order.paymentData || order.boleto || null,
      status: order.status || 'Pendente',
      tracking_code: order.trackingCode || null
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.warn('Supabase: Erro ao registrar pedido:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('Supabase: Falha ao inserir pedido:', err)
    return null
  }
}

export async function updateOrderInDb(orderId, updates) {
  if (!isSupabaseConfigured || !supabase || !orderId) return false
  try {
    const payload = {}
    if (updates.status !== undefined) payload.status = updates.status
    if (updates.trackingCode !== undefined) payload.tracking_code = updates.trackingCode
    if (updates.tracking_code !== undefined) payload.tracking_code = updates.tracking_code

    const { error } = await supabase
      .from('orders')
      .update(payload)
      .eq('id', orderId)

    if (error) {
      console.warn('Supabase: Erro ao atualizar pedido:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase: Falha ao atualizar pedido:', err)
    return false
  }
}

export async function deleteOrderFromDb(orderId) {
  if (!isSupabaseConfigured || !supabase || !orderId) return false
  try {
    // 1. Marca como Deletado (soft delete compatível com RLS e neq status Deletado)
    const { error: softErr } = await supabase
      .from('orders')
      .update({ status: 'Deletado' })
      .eq('id', orderId)

    // 2. Tenta também exclusão física se houver privilégio no RLS
    try {
      await supabase.from('payment_orders').delete().eq('order_id', orderId)
      await supabase.from('orders').delete().eq('id', orderId)
    } catch {}

    if (softErr) {
      console.warn('Supabase: Erro ao deletar pedido:', softErr.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase: Falha ao deletar pedido:', err)
    return false
  }
}

// === CONFIGURAÇÕES GLOBAIS ===
export async function fetchStoreSettingFromDb(key) {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) return null
    return data.value
  } catch {
    return null
  }
}

export async function saveStoreSettingToDb(key, value) {
  if (!isSupabaseConfigured || !supabase) return false
  try {
    const { error } = await supabase
      .from('store_settings')
      .upsert({ key, value })

    return !error
  } catch {
    return false
  }
}
