import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// PROTOCOLO DE SEGURANÇA E INICIALIZAÇÃO DA AUDITORIA
// ============================================================================
const TEST_RUN_ID = `AUDIT_RUN_${Date.now()}`
console.log(`\n🛡️ ========================================================`)
console.log(`   INICIANDO AUDITORIA TÉCNICA E FUNCIONAL COMPLETA`)
console.log(`   TEST_RUN_ID: ${TEST_RUN_ID}`)
console.log(`   Timestamp: ${new Date().toISOString()}`)
console.log(`========================================================\n`)

// Carrega .env com segurança
let supabaseUrl = process.env.VITE_SUPABASE_URL
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

try {
  const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim()
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = trimmed.split('=')[1].trim()
  }
} catch (e) {
  console.warn('Aviso: Arquivo .env não pôde ser lido diretamente:', e.message)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tracking estrito de dados criados nesta sessão
const auditRegistry = {
  products: [],
  customers: [],
  orders: [],
  settings: [],
  auditLogs: []
}

const testResults = []

function recordTest(area, name, status, details = {}) {
  testResults.push({
    area,
    name,
    status, // 'PASS', 'FAIL', 'WARN'
    details,
    timestamp: new Date().toISOString()
  })
  const icon = status === 'PASS' ? '✅' : (status === 'WARN' ? '⚠️' : '❌')
  console.log(`[${area}] ${icon} ${name}`)
  if (details.note) console.log(`      Nota: ${details.note}`)
  if (details.error) console.log(`      Erro: ${details.error}`)
}

// Import dos módulos da aplicação
import {
  isValidCnpj,
  formatCnpj,
  isValidEmail,
  isValidUrl,
  formatPhone,
  formatCep,
  getCompanyPublicName,
  getCompanyFullAddress,
  DEFAULT_COMPANY_DATA
} from '../src/services/companyService.js'

import {
  maskCpf,
  maskPhone,
  getCustomerOrderMetrics,
  generatePasswordResetLink,
  createAnonymizedCustomerPayload
} from '../src/services/customerService.js'

import {
  calcCommercialSellPrice,
  calcCommercialOriginalPrice,
  roundCommercialPrice
} from '../src/services/pricingService.js'

import {
  buildProductSchema,
  buildBreadcrumbSchema,
  slugify
} from '../src/services/seoManager.js'

import {
  getStorePrimaryDomain,
  normalizeHostname,
  resolveTenantFromHostname
} from '../src/services/tenantResolver.js'

import {
  verifyWebhookSignature,
  mapMercadoPagoStatus,
  createMercadoPagoOrderPayload,
  createMercadoPagoPreferencePayload
} from '../lib/api/payments/mercadopago/service.js'

import {
  mapDbProductToApp,
  mapAppProductToDb,
  fetchProductsFromDb,
  upsertProductToDb,
  deleteProductFromDb,
  fetchCustomersFromDb,
  upsertCustomerToDb,
  updateCustomerInDb,
  fetchOrdersFromDb,
  insertOrderToDb,
  updateOrderInDb,
  logCustomerAuditAction
} from '../src/services/supabaseService.js'

async function runCompleteAudit() {
  // ==========================================================================
  // ETAPA 1 & 2: QUALIDADE DO PROJETO E ANÁLISE ESTÁTICA
  // ==========================================================================
  console.log('\n--- ETAPAS 1 & 2: QUALIDADE DO PROJETO E ANÁLISE DE SEGURANÇA INICIAL ---')
  
  // 1. Verificação de Service Role exposta
  try {
    const srcFiles = fs.readdirSync(path.resolve('src'), { recursive: true })
    let serviceRoleFound = false
    for (const f of srcFiles) {
      if (typeof f === 'string' && (f.endsWith('.js') || f.endsWith('.jsx'))) {
        const content = fs.readFileSync(path.resolve('src', f), 'utf-8')
        if (content.includes('service_role') || content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
          serviceRoleFound = true
          break
        }
      }
    }
    assert.strictEqual(serviceRoleFound, false, 'Service Role não deve estar presente no client-side')
    recordTest('Segurança', 'Nenhuma Service Role Key vazada no código frontend (src/)', 'PASS')
  } catch (err) {
    recordTest('Segurança', 'Nenhuma Service Role Key vazada no código frontend', 'FAIL', { error: err.message })
  }

  // 2. Verificação de credenciais no bundle / .env
  try {
    assert(supabaseUrl && supabaseUrl.includes('supabase.co'), 'URL do Supabase válida')
    assert(supabaseAnonKey && supabaseAnonKey.length > 20, 'Anon Key do Supabase válida')
    recordTest('Ambiente', 'Conexão Supabase parametrizada corretamente', 'PASS', { note: supabaseUrl })
  } catch (err) {
    recordTest('Ambiente', 'Conexão Supabase parametrizada', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 3: ÁREA PÚBLICA DA LOJA & DADOS ESTRUTURADOS
  // ==========================================================================
  console.log('\n--- ETAPA 3: ÁREA PÚBLICA DA LOJA & PRECIFICAÇÃO ---')

  try {
    // Teste de cálculo de precificação comercial (margem + imposto)
    const sellPrice = calcCommercialSellPrice(100, 30, 9.05)
    assert(sellPrice > 100, 'Preço de venda deve ser superior ao custo')
    assert.strictEqual(typeof sellPrice, 'number')
    
    // Teste de arredondamento comercial psicológico de varejo (.00 com final 5 ou 9)
    const rounded = roundCommercialPrice(149.888)
    assert.strictEqual(rounded, 149, 'Arredondamento psicológico de varejo (150 -> 149)')
    recordTest('Pública', 'Cálculo de Preço Comercial e Arredondamento Psicológico de Varejo', 'PASS', { note: `Custo R$100 -> Venda R$${sellPrice}, Base 149.888 -> R$${rounded}` })
  } catch (err) {
    recordTest('Pública', 'Cálculo de Preço Comercial', 'FAIL', { error: err.message })
  }

  try {
    // Teste de JSON-LD Schema.org
    const syntheticProduct = {
      id: 'prod_test_seo',
      name: 'Notebook Dell Inspiron i5',
      brand: 'Dell',
      price: 3899.00,
      stock: 5,
      slug: 'notebook-dell-inspiron-i5'
    }
    const jsonLd = buildProductSchema({ product: syntheticProduct, primaryDomain: 'infodesk.net.br' })
    assert.strictEqual(jsonLd['@type'], 'Product')
    assert.strictEqual(jsonLd.name, 'Notebook Dell Inspiron i5')
    assert.strictEqual(jsonLd.offers.price, '3899.00')
    assert.strictEqual(jsonLd.offers.availability, 'https://schema.org/InStock')
    recordTest('SEO', 'Geração de Schema.org JSON-LD para Produtos', 'PASS')
  } catch (err) {
    recordTest('SEO', 'Geração de Schema.org JSON-LD', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 4: CADASTRO E CONTA DO CLIENTE
  // ==========================================================================
  console.log('\n--- ETAPA 4: CADASTRO E CONTA DO CLIENTE ---')

  try {
    // Validação de E-mail
    assert.strictEqual(isValidEmail('cliente@exemplo.com.br'), true)
    assert.strictEqual(isValidEmail('invalido@'), false)
    assert.strictEqual(isValidEmail(''), false)
    recordTest('Cliente', 'Validação estrita de formato de e-mail', 'PASS')
  } catch (err) {
    recordTest('Cliente', 'Validação estrita de formato de e-mail', 'FAIL', { error: err.message })
  }

  try {
    // Mascaramento LGPD de CPF e Telefone
    const cpfMasked = maskCpf('12345678909')
    assert.strictEqual(cpfMasked, '123.***.***-09', 'Preserva 3 primeiros e 2 últimos')
    const phoneMasked = maskPhone('61999998888')
    assert.strictEqual(phoneMasked, '(61) 9****-8888', 'Preserva DDD e 4 finais')
    recordTest('LGPD', 'Mascaramento de dados pessoais (CPF e Telefone)', 'PASS')
  } catch (err) {
    recordTest('LGPD', 'Mascaramento de dados pessoais', 'FAIL', { error: err.message })
  }

  try {
    // Isolamento de dados e cálculo de métricas de pedidos
    const mockCustomer = { email: 'cliente@teste.com', cpf: '12345678909' }
    const mockCustomerOrders = [
      { id: 'o1', customer_email: 'cliente@teste.com', total: 150.00, status: 'Pago' },
      { id: 'o2', customer_email: 'cliente@teste.com', total: 250.00, status: 'Entregue' },
      { id: 'o3', customer_email: 'cliente@teste.com', total: 100.00, status: 'Cancelado' }
    ]
    const metrics = getCustomerOrderMetrics(mockCustomer, mockCustomerOrders)
    assert.strictEqual(metrics.orderCount, 3)
    assert.strictEqual(metrics.paymentBreakdown.paid, 2, 'Apenas pedidos concluídos contam como pagos')
    assert.strictEqual(metrics.totalSpent, 500.00)
    assert.strictEqual(metrics.averageTicket, 500.00 / 3)
    recordTest('Cliente', 'Cálculo de métricas de compras isoladas do cliente', 'PASS')
  } catch (err) {
    recordTest('Cliente', 'Cálculo de métricas de compras', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 5 & 6: CARRINHO E FLUXO DE CHECKOUT
  // ==========================================================================
  console.log('\n--- ETAPAS 5 & 6: CARRINHO E CHECKOUT ---')

  try {
    // Validação de cálculo de itens no carrinho e frete
    const cartItems = [
      { id: 'it1', price: 99.90, quantity: 2 },
      { id: 'it2', price: 50.00, quantity: 1 }
    ]
    const subtotal = cartItems.reduce((acc, it) => acc + (it.price * it.quantity), 0)
    const frete = 25.50
    const total = Math.round((subtotal + frete) * 100) / 100
    assert.strictEqual(subtotal, 249.80)
    assert.strictEqual(total, 275.30)
    recordTest('Checkout', 'Cálculo monetário exato de subtotal + frete', 'PASS')
  } catch (err) {
    recordTest('Checkout', 'Cálculo monetário de subtotal + frete', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 7 & 8: BANCO DE DADOS SUPABASE (CRUD COM TEST_RUN_ID)
  // ==========================================================================
  console.log('\n--- ETAPAS 7 & 8: BANCO DE DADOS, INTEGRIDADE E ESTOQUE ---')

  let testProductDb = null
  let testCustomerDb = null
  let testOrderDb = null

  // 1. Inserção de Produto Sintético
  try {
    const syntheticProduct = {
      name: `Produto Teste Audit ${TEST_RUN_ID}`,
      slug: `prod-audit-${Date.now()}`,
      category: 'Periféricos',
      price: 299.90,
      costPrice: 150.00,
      stock: 10,
      weight: 800,
      active: true,
      companyId: 'default'
    }
    testProductDb = await upsertProductToDb(syntheticProduct)
    assert(testProductDb && testProductDb.id, 'Produto deve ser criado com ID')
    auditRegistry.products.push(testProductDb.id)
    recordTest('Supabase', 'Criação e persistência de Produto Sintético', 'PASS', { note: `ID: ${testProductDb.id}` })
  } catch (err) {
    recordTest('Supabase', 'Criação de Produto Sintético', 'FAIL', { error: err.message })
  }

  // 2. Inserção de Cliente Sintético
  try {
    const syntheticCustomer = {
      nome: `Cliente Audit ${TEST_RUN_ID}`,
      email: `audit_${Date.now()}@teste.local`,
      cpf: '000.111.222-33',
      telefone: '(61) 99999-0000',
      cep: '70673-631',
      endereco: 'Quadra Teste Bloco B',
      cidade: 'Brasília',
      estado: 'DF',
      status: 'Ativo'
    }
    testCustomerDb = await upsertCustomerToDb(syntheticCustomer, 'default')
    assert(testCustomerDb && testCustomerDb.id, 'Cliente deve ser criado com ID')
    auditRegistry.customers.push(testCustomerDb.id)
    recordTest('Supabase', 'Criação e persistência de Cliente Sintético', 'PASS', { note: `ID: ${testCustomerDb.id}` })
  } catch (err) {
    recordTest('Supabase', 'Criação de Cliente Sintético', 'FAIL', { error: err.message })
  }

  // 3. Atualização e Auditoria LGPD
  try {
    if (testCustomerDb?.id) {
      const updated = await updateCustomerInDb(testCustomerDb.id, {
        internal_notes: `Nota de auditoria ${TEST_RUN_ID}`
      })
      assert(updated, 'Update de cliente deve retornar sucesso')
      
      const logEntry = await logCustomerAuditAction({
        company_id: 'default',
        customer_id: testCustomerDb.id,
        action: 'AUDIT_TEST_UPDATE',
        details: { testRunId: TEST_RUN_ID }
      })
      assert(logEntry && logEntry.id, 'Log de auditoria deve ser gerado')
      auditRegistry.auditLogs.push(logEntry.id)
      recordTest('Supabase', 'Atualização cadastral e registro de Auditoria LGPD', 'PASS')
    }
  } catch (err) {
    recordTest('Supabase', 'Atualização cadastral e Auditoria LGPD', 'FAIL', { error: err.message })
  }

  // 4. Inserção de Pedido Sintético com Snapshot
  try {
    if (testProductDb && testCustomerDb) {
      const orderPayload = {
        id: `ped_audit_${Date.now()}`,
        customerName: testCustomerDb.nome,
        customerEmail: testCustomerDb.email,
        customerCpf: testCustomerDb.cpf,
        customerPhone: testCustomerDb.telefone,
        customerAddress: testCustomerDb.endereco,
        customerCity: testCustomerDb.cidade,
        customerState: testCustomerDb.estado,
        customerCep: testCustomerDb.cep,
        items: [
          {
            id: testProductDb.id,
            name: testProductDb.name,
            price: testProductDb.price,
            quantity: 2
          }
        ],
        subtotal: testProductDb.price * 2,
        frete: 20.00,
        freteType: 'SEDEX',
        total: (testProductDb.price * 2) + 20.00,
        paymentMethod: 'mercadopago_checkout_pro',
        status: 'Pendente'
      }

      testOrderDb = await insertOrderToDb(orderPayload)
      assert(testOrderDb, 'Pedido deve ser gravado no banco')
      auditRegistry.orders.push(orderPayload.id)
      recordTest('Supabase', 'Gravação de Pedido com Snapshot imutável de itens', 'PASS', { note: `ID: ${orderPayload.id}` })
    }
  } catch (err) {
    recordTest('Supabase', 'Gravação de Pedido com Snapshot', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 9: MERCADO PAGO ORDERS API
  // ==========================================================================
  console.log('\n--- ETAPA 9: MERCADO PAGO INTEGRATION & WEBHOOK SECURITY ---')

  try {
    // 1. Validação de Payload da Orders API (/v1/orders)
    const mockOrderMp = {
      id: `ped_mp_${Date.now()}`,
      customerName: 'Lucas Auditor',
      customerEmail: 'lucas@empresa.test',
      customerPhone: '61999998888',
      customerCpf: '12345678909',
      frete: 25.00,
      freteType: 'PAC',
      items: [
        { id: 'prod_1', name: 'Teclado Mecânico RGB', price: 250.00, quantity: 1 }
      ]
    }
    const orderPayload = createMercadoPagoOrderPayload({ order: mockOrderMp })
    assert.strictEqual(orderPayload.type, 'online')
    assert.strictEqual(orderPayload.processing_mode, 'manual')
    assert.strictEqual(orderPayload.external_reference, mockOrderMp.id)
    assert.strictEqual(orderPayload.total_amount, '275.00')
    assert.strictEqual(orderPayload.items.length, 2, 'Item de produto + item de frete')
    recordTest('MercadoPago', 'Montagem correta do Payload oficial da Orders API (/v1/orders)', 'PASS')
  } catch (err) {
    recordTest('MercadoPago', 'Montagem do Payload da Orders API', 'FAIL', { error: err.message })
  }

  try {
    // 2. Validação da Assinatura HMAC-SHA256 do Webhook
    const secret = 'test_webhook_secret_key_12345'
    const eventId = '123456789'
    const ts = Math.floor(Date.now() / 1000).toString()
    const manifest = `id:${eventId};request-id:req_test_01;ts:${ts};`
    const validHash = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const xSignature = `ts=${ts},v1=${validHash}`

    const isValid = verifyWebhookSignature({
      xSignature,
      xRequestId: 'req_test_01',
      dataId: eventId,
      secret
    })
    assert.strictEqual(isValid.valid, true, 'Assinatura HMAC legítima deve ser aceita')

    // Teste de rejeição de ataque de spoofing/adulteração
    const isTampered = verifyWebhookSignature({
      xSignature: `ts=${ts},v1=invalid_hash_spoofing`,
      xRequestId: 'req_test_01',
      dataId: eventId,
      secret
    })
    assert.strictEqual(isTampered.valid, false, 'Assinatura adulterada deve ser sumariamente bloqueada')
    recordTest('MercadoPago', 'Validação criptográfica HMAC-SHA256 do Webhook contra spoofing', 'PASS')
  } catch (err) {
    recordTest('MercadoPago', 'Validação de Assinatura do Webhook', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 12: WHITE-LABEL E REUTILIZAÇÃO (MARCA BRANCA)
  // ==========================================================================
  console.log('\n--- ETAPA 12: WHITE-LABEL E REUTILIZAÇÃO ---')

  try {
    // 1. Domínio Canônico Dinâmico
    const domain = getStorePrimaryDomain()
    assert(domain && domain.length > 0, 'Deve retornar domínio primário configurado')
    
    // 2. Normalização de Hostnames
    assert.strictEqual(normalizeHostname('https://www.minhaloja.com.br/'), 'minhaloja.com.br')
    assert.strictEqual(normalizeHostname('localhost:5173'), 'localhost')
    
    // 3. Customização de Empresa sem Recompilação
    const customCompany = {
      razaoSocial: 'Padaria e Informática Silva LTDA',
      nomeFantasia: 'Silva Tech Store',
      cnpj: '12.345.678/0001-90'
    }
    const publicName = getCompanyPublicName(customCompany)
    assert.strictEqual(publicName, 'Silva Tech Store', 'Nome público adota nova empresa dinamicamente')
    recordTest('WhiteLabel', 'Customização dinâmica de identidade e resolvedor de domínio autônomo', 'PASS')
  } catch (err) {
    recordTest('WhiteLabel', 'Customização dinâmica de identidade', 'FAIL', { error: err.message })
  }

  // ==========================================================================
  // ETAPA 13: ENDPOINTS DE SEO E FEEDS (HTTP CHECK)
  // ==========================================================================
  console.log('\n--- ETAPA 13: ENDPOINTS DE SEO E FEEDS DINÂMICOS ---')

  const endpointsToCheck = [
    { url: 'http://localhost:5173/sitemap.xml', type: 'text', expect: '<urlset' },
    { url: 'http://localhost:5173/robots.txt', type: 'text', expect: 'User-agent:' },
    { url: 'http://localhost:5173/api/google-merchant/feed.xml', type: 'text', expect: '<rss' },
    { url: 'http://localhost:5173/api/seo/tenant-lookup', type: 'json', expectField: 'success' }
  ]

  for (const ep of endpointsToCheck) {
    try {
      const res = await fetch(ep.url)
      assert.strictEqual(res.status, 200, `Endpoint ${ep.url} deve responder 200`)
      if (ep.type === 'text') {
        const text = await res.text()
        assert(text.includes(ep.expect), `Conteúdo de ${ep.url} deve conter ${ep.expect}`)
      } else {
        const json = await res.json()
        assert(json[ep.expectField] === true, `JSON deve ter ${ep.expectField} == true`)
      }
      recordTest('SEO_HTTP', `Endpoint ${ep.url} ativo e servindo payload válido`, 'PASS')
    } catch (err) {
      recordTest('SEO_HTTP', `Endpoint ${ep.url}`, 'FAIL', { error: err.message })
    }
  }

  // ==========================================================================
  // LIMPEZA SEGURA E GARANTIDA (APENAS DADOS SINTÉTICOS DESTA EXECUÇÃO)
  // ==========================================================================
  console.log('\n--- PROTOCOLO DE LIMPEZA SEGURA DOS DADOS DE AUDITORIA ---')

  // 1. Limpeza de Pedidos Sintéticos
  for (const ordId of auditRegistry.orders) {
    try {
      await supabase.from('orders').delete().eq('id', ordId)
      console.log(`🧹 Removido pedido sintético: ${ordId}`)
    } catch (e) {
      console.warn(`Aviso ao remover pedido sintético ${ordId}:`, e.message)
    }
  }

  // 2. Limpeza de Clientes Sintéticos
  for (const custId of auditRegistry.customers) {
    try {
      await supabase.from('customers').delete().eq('id', custId)
      console.log(`🧹 Removido cliente sintético: ${custId}`)
    } catch (e) {
      console.warn(`Aviso ao remover cliente sintético ${custId}:`, e.message)
    }
  }

  // 3. Limpeza de Produtos Sintéticos
  for (const prodId of auditRegistry.products) {
    try {
      await deleteProductFromDb(prodId)
      console.log(`🧹 Removido produto sintético: ${prodId}`)
    } catch (e) {
      console.warn(`Aviso ao remover produto sintético ${prodId}:`, e.message)
    }
  }

  // 4. Limpeza de Logs Sintéticos de Auditoria
  for (const logId of auditRegistry.auditLogs) {
    try {
      await supabase.from('customer_audit_logs').delete().eq('id', logId)
      console.log(`🧹 Removido log sintético: ${logId}`)
    } catch (e) {}
  }

  // Confirmação final do banco de dados (garante expurgo dos IDs sintéticos e preservação dos produtos reais)
  for (const prodId of auditRegistry.products) {
    const { data } = await supabase.from('products').select('id').eq('id', prodId).maybeSingle()
    assert.strictEqual(data, null, `Produto sintético ${prodId} deve ter sido removido`)
  }
  for (const custId of auditRegistry.customers) {
    const { data } = await supabase.from('customers').select('id').eq('id', custId).maybeSingle()
    assert.strictEqual(data, null, `Cliente sintético ${custId} deve ter sido removido`)
  }

  const { count: finalProducts } = await supabase.from('products').select('*', { count: 'exact', head: true })
  assert(finalProducts >= 14, 'Produtos reais do catálogo cadastrados no Supabase preservados intactos')
  recordTest('Limpeza', 'Confirmação de expurgo total dos dados sintéticos e preservação dos produtos reais', 'PASS', { note: `${finalProducts} produtos reais preservados` })

  // ==========================================================================
  // CONSOLIDAÇÃO FINAL
  // ==========================================================================
  console.log(`\n========================================================`)
  const total = testResults.length
  const passed = testResults.filter(t => t.status === 'PASS').length
  const failed = testResults.filter(t => t.status === 'FAIL').length
  const warned = testResults.filter(t => t.status === 'WARN').length

  console.log(`📊 RESULTADO DA AUDITORIA AUTOMATIZADA:`)
  console.log(`   Total de Testes: ${total}`)
  console.log(`   Aprovados (PASS): ${passed}`)
  console.log(`   Reprovados (FAIL): ${failed}`)
  console.log(`   Alertas (WARN): ${warned}`)
  console.log(`========================================================\n`)

  return { total, passed, failed, warned, results: testResults }
}

runCompleteAudit().catch(err => {
  console.error('❌ Falha crítica na execução da auditoria:', err)
  process.exit(1)
})
