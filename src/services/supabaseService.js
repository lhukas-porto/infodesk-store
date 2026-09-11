import { supabase, isSupabaseConfigured } from './supabaseClient.js'

// Conversores snake_case <-> camelCase para Produtos
export function mapDbProductToApp(dbProd) {
  if (!dbProd) return null
  return {
    id: dbProd.id,
    name: dbProd.name,
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

  return {
    name: appProd.name,
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
    active: appProd.active !== false
  }
}

// === PRODUTOS ===
export async function fetchProductsFromDb() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

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

    let query
    if (isUuid) {
      payload.id = product.id
      query = await supabase
        .from('products')
        .upsert(payload)
        .select()
        .single()
    } else {
      query = await supabase
        .from('products')
        .insert(payload)
        .select()
        .single()
    }

    const { data, error } = query

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
    let query = supabase.from('products').delete()

    if (isUuid) {
      query = query.eq('id', productId)
    } else if (productEan) {
      query = query.eq('ean', productEan)
    } else if (productName) {
      query = query.eq('name', productName)
    } else {
      return false
    }

    const { error } = await query

    if (error) {
      console.warn('Supabase: Erro ao deletar produto:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao deletar produto:', err)
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
export async function fetchCustomersFromDb() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase: Erro ao buscar clientes:', error.message)
      return null
    }
    return data || []
  } catch (err) {
    console.warn('Supabase: Falha de conexão ao buscar clientes:', err)
    return null
  }
}

export async function upsertCustomerToDb(customer) {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const payload = {
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
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(customer.id)
    if (isUuid) {
      payload.id = customer.id
    }

    const { data, error } = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .single()

    if (error) {
      console.warn('Supabase: Erro ao salvar cliente:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('Supabase: Falha ao salvar cliente:', err)
    return null
  }
}

// === PEDIDOS ===
export async function fetchOrdersFromDb() {
  if (!isSupabaseConfigured || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
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
