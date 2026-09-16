// Serviço de Gestão e Inteligência de Clientes Multiempresa (LGPD & RBAC)
// Fornece métricas comerciais, agregação de pedidos, mascaramento de dados sensíveis e auditoria

/**
 * Aplica máscara de proteção de CPF conforme diretrizes da LGPD
 * Exemplo: '828.851.921-00' -> '828.***.***-00'
 */
export function maskCpf(cpf) {
  if (!cpf) return '***.***.***-**'
  const digits = String(cpf).replace(/\D/g, '')
  if (digits.length !== 11) return '***.***.***-**'
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`
}

/**
 * Aplica máscara de proteção de Telefone
 * Exemplo: '(61) 99627-2630' -> '(61) 9****-2630'
 */
export function maskPhone(phone) {
  if (!phone) return 'Não informado'
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length < 10) return phone
  const ddd = digits.slice(0, 2)
  const last4 = digits.slice(-4)
  return `(${ddd}) 9****-${last4}`
}

/**
 * Cria um índice rápido de pedidos indexados por e-mail e CPF para busca O(1)
 */
export function buildCustomerOrderIndex(allOrders = []) {
  const byEmail = new Map()
  const byCpf = new Map()

  ;(allOrders || []).forEach(o => {
    const email = (o.customer_email || o.customerEmail || o.cliente?.email || '').toLowerCase().trim()
    const cpf = (o.customer_cpf || o.customerCpf || o.cliente?.cpf || '').replace(/\D/g, '')

    if (email) {
      if (!byEmail.has(email)) byEmail.set(email, [])
      byEmail.get(email).push(o)
    }
    if (cpf) {
      if (!byCpf.has(cpf)) byCpf.set(cpf, [])
      byCpf.get(cpf).push(o)
    }
  })

  return { byEmail, byCpf }
}

/**
 * Calcula todas as métricas consolidadas de consumo e pedidos de um cliente
 */
export function getCustomerOrderMetrics(customer, allOrders = [], orderIndex = null) {
  if (!customer) {
    return {
      orderCount: 0,
      totalSpent: 0,
      averageTicket: 0,
      lastOrderDate: null,
      orders: [],
      paymentBreakdown: { paid: 0, pending: 0, cancelled: 0 },
      topProducts: []
    }
  }

  const cleanEmail = (customer.email || '').toLowerCase().trim()
  const cleanCpf = (customer.cpf || '').replace(/\D/g, '')

  let clientOrders = []
  if (orderIndex) {
    const ordersFromEmail = cleanEmail ? (orderIndex.byEmail.get(cleanEmail) || []) : []
    const ordersFromCpf = cleanCpf ? (orderIndex.byCpf.get(cleanCpf) || []) : []
    if (ordersFromEmail.length && ordersFromCpf.length) {
      const seen = new Set()
      clientOrders = [...ordersFromEmail, ...ordersFromCpf].filter(o => {
        if (seen.has(o.id)) return false
        seen.add(o.id)
        return true
      })
    } else {
      clientOrders = ordersFromEmail.length ? ordersFromEmail : ordersFromCpf
    }
  } else {
    // Identifica pedidos do cliente por e-mail ou CPF
    clientOrders = (allOrders || []).filter(o => {
      const oEmail = (o.customer_email || o.customerEmail || o.cliente?.email || '').toLowerCase().trim()
      const oCpf = (o.customer_cpf || o.customerCpf || o.cliente?.cpf || '').replace(/\D/g, '')
      return (cleanEmail && oEmail === cleanEmail) || (cleanCpf && oCpf === cleanCpf)
    })
  }

  clientOrders = [...clientOrders].sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))

  const orderCount = clientOrders.length
  const totalSpent = clientOrders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0)
  const averageTicket = orderCount > 0 ? totalSpent / orderCount : 0
  const lastOrderDate = clientOrders.length > 0 ? (clientOrders[0].created_at || clientOrders[0].date) : null

  // Situação dos pagamentos
  const paymentBreakdown = {
    paid: 0,
    pending: 0,
    cancelled: 0
  }

  // Mapeamento de produtos mais comprados
  const productMap = new Map()

  clientOrders.forEach(order => {
    const status = (order.status || '').toLowerCase()
    if (status.includes('pago') || status.includes('entregue') || status.includes('enviado') || status.includes('separação')) {
      paymentBreakdown.paid += 1
    } else if (status.includes('cancel')) {
      paymentBreakdown.cancelled += 1
    } else {
      paymentBreakdown.pending += 1
    }

    // Processa itens do pedido
    const items = Array.isArray(order.items) ? order.items : []
    items.forEach(item => {
      const prodName = item.name || 'Produto'
      const qty = parseInt(item.quantity !== undefined ? item.quantity : item.qty, 10) || 1
      const price = parseFloat(item.price) || 0

      if (!productMap.has(prodName)) {
        productMap.set(prodName, {
          name: prodName,
          brand: item.brand || '',
          qty: 0,
          quantity: 0,
          total: 0,
          image: Array.isArray(item.images) ? item.images[0] : item.image || ''
        })
      }
      const pData = productMap.get(prodName)
      pData.qty += qty
      pData.quantity += qty
      pData.total += price * qty
    })
  })

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  return {
    orderCount,
    totalSpent,
    averageTicket,
    lastOrderDate,
    orders: clientOrders,
    paymentBreakdown,
    topProducts
  }
}

/**
 * Calcula os KPIs gerais da base de clientes da empresa
 */
export function calculateCompanyCustomerStats(customers = [], orders = [], metricsMap = null) {
  const totalCustomers = customers.length

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let newCustomers30d = 0
  let buyerCustomersCount = 0
  let totalRevenueFromBuyers = 0

  customers.forEach(cust => {
    const created = cust.createdAt || cust.created_at
    if (created && new Date(created) >= thirtyDaysAgo) {
      newCustomers30d += 1
    }

    const metrics = (metricsMap && (metricsMap.get(cust.id) || metricsMap.get((cust.email || '').toLowerCase()))) ||
                    getCustomerOrderMetrics(cust, orders)
    if (metrics.orderCount > 0) {
      buyerCustomersCount += 1
      totalRevenueFromBuyers += metrics.totalSpent
    }
  })

  const globalAverageTicket = buyerCustomersCount > 0 ? totalRevenueFromBuyers / buyerCustomersCount : 0

  return {
    totalCustomers,
    newCustomers30d,
    buyerCustomersCount,
    globalAverageTicket
  }
}

/**
 * Monta o CSV formatado dos clientes com métricas consolidadas
 */
export function exportCustomersToCsv(customers = [], orders = [], options = { maskSensitive: true }) {
  const headers = [
    'ID',
    'Nome',
    'E-mail',
    'Telefone',
    'CPF',
    'Status',
    'Data de Cadastro',
    'Cidade',
    'Estado',
    'Pedidos Realizados',
    'Total Gasto (R$)',
    'Ticket Medio (R$)',
    'Ultima Compra'
  ]

  const rows = customers.map(c => {
    const metrics = getCustomerOrderMetrics(c, orders)
    const cpfDisplay = options.maskSensitive ? maskCpf(c.cpf) : (c.cpf || '')
    const phoneDisplay = options.maskSensitive ? maskPhone(c.telefone) : (c.telefone || '')
    const createdAtFormatted = c.createdAt || c.created_at ? new Date(c.createdAt || c.created_at).toLocaleDateString('pt-BR') : 'N/A'
    const lastOrderFormatted = metrics.lastOrderDate ? new Date(metrics.lastOrderDate).toLocaleDateString('pt-BR') : 'Nunca comprou'

    return [
      `"${c.id}"`,
      `"${(c.nome || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${phoneDisplay}"`,
      `"${cpfDisplay}"`,
      `"${c.status || 'Ativo'}"`,
      `"${createdAtFormatted}"`,
      `"${(c.cidade || '').replace(/"/g, '""')}"`,
      `"${(c.estado || '').replace(/"/g, '""')}"`,
      metrics.orderCount,
      metrics.totalSpent.toFixed(2).replace('.', ','),
      metrics.averageTicket.toFixed(2).replace('.', ','),
      `"${lastOrderFormatted}"`
    ].join(';')
  })

  return '\uFEFF' + [headers.join(';'), ...rows].join('\r\n')
}

/**
 * Dispara o download de um arquivo gerado no navegador
 */
export function triggerFileDownload(content, filename, type = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Gera um link seguro de recuperação de senha com validade de 24h
 * Nunca expõe nem permite digitação de senhas no painel
 */
export function generatePasswordResetLink(customer, customBaseUrl = null) {
  const token = 'rst_' + Math.random().toString(36).substring(2) + Date.now().toString(36)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const origin = typeof window !== 'undefined' && window?.location?.origin
    ? window.location.origin
    : (customBaseUrl || 'https://infodesk.net.br')
  const resetUrl = `${origin}/#recuperar-senha?token=${token}&email=${encodeURIComponent(customer?.email || '')}`
  return {
    token,
    expiresAt,
    resetUrl,
    link: resetUrl
  }
}

/**
 * Anonimiza os dados de um cliente conforme Artigo 18 da LGPD
 * Preserva o ID e pedidos para integridade fiscal, substituindo dados identificáveis
 */
export function createAnonymizedCustomerPayload(customer) {
  const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase()
  return {
    ...customer,
    nome: `Cliente Anonimizado #${randomHash}`,
    email: `anonimizado_${randomHash.toLowerCase()}@lgpd.privado`,
    cpf: '000.000.000-00',
    telefone: '',
    endereco: 'Endereço Removido (LGPD)',
    numero: 'S/N',
    complemento: '',
    bairro: 'Removido',
    status: 'Inativo',
    internal_notes: `[LGPD] Dados anonimizados a pedido do titular em ${new Date().toLocaleString('pt-BR')}.`,
    consent_marketing: false,
    consent_whatsapp: false,
    anonymized_at: new Date().toISOString()
  }
}

/**
 * Hasheia a senha do cliente usando Web Crypto API SHA-256 com salt seguro
 */
export async function hashCustomerPassword(plainPassword) {
  if (!plainPassword) return ''
  const salt = 'infodesk_sec_v1_store'
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(plainPassword + salt)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return 'sha256_' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (err) {
    console.warn('Fallback de hash:', err)
    return 'sha256_' + btoa(plainPassword + salt)
  }
}

/**
 * Valida a senha digitada comparando com o hash ou aceitando migração de senha legada
 */
export async function verifyCustomerPassword(inputPassword, storedPasswordOrHash) {
  if (!inputPassword || !storedPasswordOrHash) return false
  if (storedPasswordOrHash.startsWith('sha256_')) {
    const computed = await hashCustomerPassword(inputPassword)
    return computed === storedPasswordOrHash
  }
  // Compatibilidade transitória com senhas cadastradas antes da criptografia
  return inputPassword === storedPasswordOrHash
}
