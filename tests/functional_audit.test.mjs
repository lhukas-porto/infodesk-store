import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// Carrega variáveis do .env
let url = process.env.VITE_SUPABASE_URL
let key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  try {
    const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) url = trimmed.split('=')[1].trim()
      if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim()
    }
  } catch {}
}

const supabase = createClient(url, key)

// Serviços do sistema
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
  fetchStoreSettingFromDb,
  saveStoreSettingToDb
} from '../src/services/supabaseService.js'

import {
  maskCpf,
  maskPhone,
  getCustomerOrderMetrics,
  generatePasswordResetLink,
  createAnonymizedCustomerPayload,
  exportCustomersToCsv
} from '../src/services/customerService.js'

import {
  calcCommercialSellPrice,
  calcCommercialOriginalPrice,
  roundCommercialPrice
} from '../src/services/pricingService.js'

import {
  isValidCnpj,
  formatCnpj,
  isValidEmail,
  formatPhone,
  formatCep,
  getCompanyPublicName
} from '../src/services/companyService.js'

const TEST_RUN_ID = `TEST_AUDIT_${Date.now()}`
console.log(`\n======================================================`)
console.log(`INICIANDO AUDITORIA FUNCIONAL CONTROLADA — INFODESK STORE`)
console.log(`TEST_RUN_ID: ${TEST_RUN_ID}`)
console.log(`Timestamp: ${new Date().toISOString()}`)
console.log(`======================================================\n`)

const createdTestIds = {
  products: [],
  customers: [],
  orders: [],
  settings: []
}

const auditResults = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
}

function testCase(name, fn) {
  auditResults.total++
  return Promise.resolve()
    .then(fn)
    .then(() => {
      auditResults.passed++
      console.log(`  ✅ [PASS] ${name}`)
    })
    .catch(err => {
      auditResults.failed++
      auditResults.failures.push({ name, error: err.message, stack: err.stack })
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`)
    })
}

async function runAudit() {
  // -------------------------------------------------------------
  // SEÇÃO 1: SEGURANÇA E AMBIENTE
  // -------------------------------------------------------------
  console.log(`\n--- 1. IDENTIFICAÇÃO DE AMBIENTE E PROTEÇÃO DE DADOS ---`)
  
  await testCase('Verificar integridade da conexão Supabase', async () => {
    assert(url && url.startsWith('https://'), 'URL do Supabase inválida')
    assert(key && key.length > 20, 'Anon Key do Supabase inválida')
  })

  await testCase('Verificar existência e integridade dos dados reais de produção', async () => {
    const { data: realProds, error: pErr } = await supabase.from('products').select('id, name').limit(10)
    assert(!pErr, 'Erro ao ler produtos reais: ' + pErr?.message)
    assert(realProds && realProds.length >= 2, 'Produtos reais da Infodesk devem existir')
    
    const { data: realCusts, error: cErr } = await supabase.from('customers').select('id, email').limit(10)
    assert(!cErr, 'Erro ao ler clientes reais: ' + cErr?.message)
    assert(realCusts && realCusts.length >= 1, 'Cliente real da Infodesk deve existir')
  })

  // -------------------------------------------------------------
  // SEÇÃO 2: BANCO DE DADOS — PRODUTOS (CRUD, RECALCULOS E INTEGRIDADE)
  // -------------------------------------------------------------
  console.log(`\n--- 2. TESTES DE BANCO DE DADOS: PRODUTOS (CRUD COMPLETO) ---`)

  let testProductDb = null

  await testCase('Criação de Produto Sintético no Supabase', async () => {
    const syntheticProduct = {
      name: `[${TEST_RUN_ID}] Teclado Mecânico RGB Test`,
      brand: 'Infodesk Tech',
      category: 'Periféricos',
      description: 'Produto sintético para testes automatizados',
      costPrice: 100.00,
      taxRate: 10.00,
      marginRate: 30.00,
      price: 159.90,
      originalPrice: 199.90,
      stock: 25,
      weight: 850,
      ean: `TEST_${Date.now().toString().slice(-8)}`,
      featured: true
    }

    testProductDb = await upsertProductToDb(syntheticProduct)
    assert(testProductDb, 'Falha ao gravar produto sintético no Supabase')
    assert(testProductDb.id, 'Produto gravado deve retornar UUID')
    assert.strictEqual(testProductDb.name, syntheticProduct.name, 'Nome do produto gravado confere')
    createdTestIds.products.push(testProductDb.id)
    console.log(`     -> Gravado produto ID: ${testProductDb.id}`)
  })

  await testCase('Confirmação de Persistência Direta no Banco (SELECT)', async () => {
    const { data, error } = await supabase.from('products').select('*').eq('id', testProductDb.id).single()
    assert(!error, 'Erro ao buscar produto persistido: ' + error?.message)
    assert.strictEqual(data.id, testProductDb.id, 'ID coincide no banco')
    assert.strictEqual(data.stock, 25, 'Estoque de 25 peças persistido')
    assert.strictEqual(parseFloat(data.price), 159.90, 'Preço de 159.90 persistido')
  })

  await testCase('Atualização do Produto no Banco (Estoque e Preço)', async () => {
    const updatedProduct = {
      ...testProductDb,
      stock: 18,
      price: 149.90,
      description: 'Descrição atualizada em teste de auditoria'
    }

    const saved = await upsertProductToDb(updatedProduct)
    assert(saved, 'Falha ao atualizar produto')
    assert.strictEqual(saved.stock, 18, 'Estoque deve ser atualizado para 18')
    assert.strictEqual(saved.price, 149.90, 'Preço deve ser atualizado para 149.90')

    // Confirma no banco real
    const { data } = await supabase.from('products').select('stock, price').eq('id', testProductDb.id).single()
    assert.strictEqual(data.stock, 18, 'Estoque no banco confirmado em 18')
    assert.strictEqual(parseFloat(data.price), 149.90, 'Preço no banco confirmado em 149.90')
  })

  await testCase('Validação de Precificação Comercial e Margens', async () => {
    const cost = 120.00
    const tax = 9.05
    const margin = 35.00
    const sellPrice = calcCommercialSellPrice(cost, tax, margin)
    assert(sellPrice > cost, 'Preço de venda deve cobrir o custo')
    // Deve terminar em 5 ou 9 no valor inteiro comercial
    const lastDigit = Math.round(sellPrice) % 10
    assert([5, 9].includes(lastDigit), `Preço ${sellPrice} deve terminar em 5 ou 9 comercial (terminou em ${lastDigit})`)
  })

  // -------------------------------------------------------------
  // SEÇÃO 3: BANCO DE DADOS — CLIENTES (CRUD, LGPD E MÁSCARAS)
  // -------------------------------------------------------------
  console.log(`\n--- 3. TESTES DE BANCO DE DADOS: CLIENTES (CRUD & LGPD) ---`)

  let testCustomerDb = null
  const testCustomerEmail = `test_${Date.now()}@infodesk-audit.test`

  await testCase('Criação de Cliente Sintético no Supabase', async () => {
    const syntheticCustomer = {
      nome: `Cliente Auditoria ${TEST_RUN_ID}`,
      email: testCustomerEmail,
      cpf: '123.456.789-00',
      telefone: '(61) 99999-8888',
      password: 'hash_sintetico_teste',
      cep: '70673-631',
      endereco: 'CLSW 304 Bloco A',
      numero: '108',
      bairro: 'Setor Sudoeste',
      cidade: 'Brasília',
      estado: 'DF',
      company_id: 'emp_infodesk',
      status: 'Ativo',
      internal_notes: 'Cliente teste criado para auditoria funcional'
    }

    testCustomerDb = await upsertCustomerToDb(syntheticCustomer, 'emp_infodesk')
    assert(testCustomerDb, 'Falha ao gravar cliente sintético no Supabase')
    assert(testCustomerDb.id, 'Cliente gravado deve possuir UUID')
    assert.strictEqual(testCustomerDb.email, testCustomerEmail, 'Email coincide')
    createdTestIds.customers.push(testCustomerDb.id)
    console.log(`     -> Gravado cliente ID: ${testCustomerDb.id}`)
  })

  await testCase('Confirmação de Persistência Direta do Cliente no Banco', async () => {
    const { data, error } = await supabase.from('customers').select('*').eq('id', testCustomerDb.id).single()
    assert(!error, 'Erro ao consultar cliente: ' + error?.message)
    assert.strictEqual(data.id, testCustomerDb.id, 'ID coincide')
    assert.strictEqual(data.email, testCustomerEmail, 'Email persistido corretamente')
    assert.strictEqual(data.cidade, 'Brasília', 'Cidade gravada')
  })

  await testCase('Atualização Cadastral e Inclusão de Notas Internas', async () => {
    const updateOk = await updateCustomerInDb(testCustomerDb.id, {
      telefone: '(61) 98888-7777',
      internal_notes: 'Observação interna atualizada pelo teste'
    })
    assert(updateOk, 'Falha ao executar updateCustomerInDb')

    // Confirmação no Supabase do dado básico persistido
    const { data } = await supabase.from('customers').select('telefone').eq('id', testCustomerDb.id).single()
    assert.strictEqual(data.telefone, '(61) 98888-7777', 'Telefone atualizado no banco')
  })

  await testCase('Mascaramento LGPD de CPF e Telefone', async () => {
    const maskedCpf = maskCpf('12345678900')
    assert.strictEqual(maskedCpf, '123.***.***-00', 'Máscara LGPD de CPF deve manter 3 primeiros e 2 últimos')

    const maskedPhone = maskPhone('61999998888')
    assert.strictEqual(maskedPhone, '(61) 9****-8888', 'Máscara LGPD de telefone deve preservar DDD e final')
  })

  await testCase('Geração Segura de Link de Redefinição de Senha (Sem expor senha)', async () => {
    const reset = generatePasswordResetLink(testCustomerDb, 'https://infodesk.net.br')
    assert(reset.token && reset.token.length >= 20, 'Token seguro deve ser gerado')
    assert(reset.link.includes(reset.token), 'Link deve conter o token gerado')
    assert(new Date(reset.expiresAt) > new Date(), 'Data de expiração deve ser futura (24 horas)')
  })

  await testCase('Anonimização LGPD (Art. 18) Preservando Chave de Integridade', async () => {
    const anon = createAnonymizedCustomerPayload(testCustomerDb)
    assert(anon.nome.includes('Anonimizado'), 'Nome deve ser ofuscado')
    assert(anon.email.includes('@lgpd.privado'), 'Email pessoal deve ser substituído por domínio lgpd.privado')
    assert.strictEqual(anon.cpf, '000.000.000-00', 'CPF deve ser zerado/mascarado')
    assert.strictEqual(anon.telefone, '', 'Telefone pessoal deve ser removido')
    assert(anon.anonymized_at, 'Timestamp de anonimização deve ser preenchido')
  })

  // -------------------------------------------------------------
  // SEÇÃO 4: BANCO DE DADOS — PEDIDOS (CRIAÇÃO, ITENS, STATUS E IDEMPOTÊNCIA)
  // -------------------------------------------------------------
  console.log(`\n--- 4. TESTES DE BANCO DE DADOS: PEDIDOS ---`)

  const testOrderId = `ORD-${Date.now()}`

  await testCase('Criação de Pedido Sintético Vinculado a Produto e Cliente', async () => {
    const orderPayload = {
      id: testOrderId,
      customerName: testCustomerDb.nome,
      customerEmail: testCustomerDb.email,
      customerCpf: testCustomerDb.cpf,
      customerPhone: testCustomerDb.telefone,
      customerAddress: `${testCustomerDb.endereco}, ${testCustomerDb.numero}`,
      customerCity: testCustomerDb.cidade,
      customerState: testCustomerDb.estado,
      customerCep: testCustomerDb.cep,
      items: [
        {
          id: testProductDb.id,
          name: testProductDb.name,
          price: 149.90,
          quantity: 2
        }
      ],
      subtotal: 299.80,
      frete: 25.50,
      freteType: 'SEDEX',
      total: 325.30,
      paymentMethod: 'pix',
      paymentData: { qr_code: '00020126580014br.gov.bcb.pix...', txid: `TX_${TEST_RUN_ID}` },
      status: 'Pendente',
      trackingCode: null
    }

    const inserted = await insertOrderToDb(orderPayload)
    assert(inserted, 'Falha ao inserir pedido sintético no Supabase')
    assert.strictEqual(inserted.id, testOrderId, 'ID do pedido conferido')
    createdTestIds.orders.push(testOrderId)
    console.log(`     -> Gravado pedido ID: ${testOrderId}`)
  })

  await testCase('Confirmação de Persistência e Integridade do Pedido (JSONB Items e Totais)', async () => {
    const { data, error } = await supabase.from('orders').select('*').eq('id', testOrderId).single()
    assert(!error, 'Erro ao consultar pedido no banco: ' + error?.message)
    assert.strictEqual(data.id, testOrderId, 'ID do pedido gravado corretamente')
    assert.strictEqual(parseFloat(data.total), 325.30, 'Total do pedido de 325.30 persistido')
    assert.strictEqual(data.frete_type, 'SEDEX', 'Tipo de frete persistido')
    assert(Array.isArray(data.items), 'Itens armazenados como JSONB Array')
    assert.strictEqual(data.items.length, 1, '1 item registrado')
    assert.strictEqual(data.items[0].quantity, 2, 'Quantidade correta no JSONB')
  })

  await testCase('Atualização de Status de Pedido e Código de Rastreio', async () => {
    const updated = await updateOrderInDb(testOrderId, {
      status: 'Pago',
      trackingCode: 'NL123456789BR'
    })
    assert(updated, 'Falha ao atualizar pedido')

    const { data } = await supabase.from('orders').select('status, tracking_code').eq('id', testOrderId).single()
    assert.strictEqual(data.status, 'Pago', 'Status do pedido atualizado para Pago')
    assert.strictEqual(data.tracking_code, 'NL123456789BR', 'Código de rastreio persistido')
  })

  await testCase('Cálculo Dinâmico de Métricas e Produtos Mais Comprados', async () => {
    const ordersList = [
      {
        id: testOrderId,
        customerEmail: testCustomerDb.email,
        customerCpf: testCustomerDb.cpf,
        total: 325.30,
        status: 'Pago',
        date: new Date().toISOString(),
        items: [{ id: testProductDb.id, name: testProductDb.name, price: 149.90, quantity: 2 }]
      }
    ]

    const metrics = getCustomerOrderMetrics(testCustomerDb, ordersList)
    assert.strictEqual(metrics.orderCount, 1, 'Deve identificar 1 pedido para o cliente')
    assert.strictEqual(metrics.totalSpent, 325.30, 'Total gasto de R$ 325,30')
    assert.strictEqual(metrics.averageTicket, 325.30, 'Ticket médio confere')
    assert(metrics.topProducts.length >= 1, 'Identificou produto mais comprado')
    assert.strictEqual(metrics.topProducts[0].quantity, 2, 'Quantidade comprada confere')
  })

  // -------------------------------------------------------------
  // SEÇÃO 5: ISOLAMENTO MULTIEMPRESA (EMPRESA A vs EMPRESA B)
  // -------------------------------------------------------------
  console.log(`\n--- 5. TESTES DE ISOLAMENTO MULTIEMPRESA (EMPRESA A vs EMPRESA B) ---`)

  const companyA = `emp_teste_a_${Date.now()}`
  const companyB = `emp_teste_b_${Date.now()}`

  let custA = null
  let custB = null

  await testCase('Criação de Clientes em Empresas Distintas (Company A e Company B)', async () => {
    custA = await upsertCustomerToDb({
      nome: `Cliente Empresa A`,
      email: `cli_a_${Date.now()}@teste-a.com`,
      cpf: '111.222.333-44',
      telefone: '(11) 91111-1111',
      password: 'pass',
      company_id: companyA,
      status: 'Ativo'
    }, companyA)
    assert(custA?.id, 'Cliente A criado')
    createdTestIds.customers.push(custA.id)

    custB = await upsertCustomerToDb({
      nome: `Cliente Empresa B`,
      email: `cli_b_${Date.now()}@teste-b.com`,
      cpf: '555.666.777-88',
      telefone: '(21) 92222-2222',
      password: 'pass',
      company_id: companyB,
      status: 'Ativo'
    }, companyB)
    assert(custB?.id, 'Cliente B criado')
    createdTestIds.customers.push(custB.id)
  })

  await testCase('Validação de Isolamento de Leitura: Empresa A NÃO Acessa Empresa B', async () => {
    // Simula consulta como Administrador da Empresa A (role: 'company_admin')
    const listForCompanyA = await fetchCustomersFromDb(companyA, 'company_admin')
    assert(Array.isArray(listForCompanyA), 'Deve retornar array de clientes')
    
    // Verifica se os clientes da empresa B vazaram para a empresa A
    const leakedCustomerB = listForCompanyA.find(c => c.company_id === companyB || c.id === custB.id)
    assert(!leakedCustomerB, 'Vazamento Crítico Detectado! Empresa A leu dados da Empresa B!')

    // Simula consulta como Administrador da Empresa B
    const listForCompanyB = await fetchCustomersFromDb(companyB, 'company_admin')
    const leakedCustomerA = listForCompanyB.find(c => c.company_id === companyA || c.id === custA.id)
    assert(!leakedCustomerA, 'Vazamento Crítico Detectado! Empresa B leu dados da Empresa A!')
  })

  // -------------------------------------------------------------
  // SEÇÃO 6: CONFIGURAÇÕES DA LOJA E INTEGRAÇÕES EXTERNAS
  // -------------------------------------------------------------
  console.log(`\n--- 6. TESTES DE CONFIGURAÇÕES DA LOJA & INTEGRAÇÕES ---`)

  const testSettingKey = `test_setting_${Date.now()}`

  await testCase('Gravação e Leitura de Configuração da Loja (store_settings)', async () => {
    const payload = { testRunId: TEST_RUN_ID, enabled: true, valor: 42 }
    const saved = await saveStoreSettingToDb(testSettingKey, payload)
    assert(saved, 'Falha ao gravar store_settings')
    createdTestIds.settings.push(testSettingKey)

    const retrieved = await fetchStoreSettingFromDb(testSettingKey)
    assert(retrieved, 'Falha ao recuperar store_settings gravado')
    assert.strictEqual(retrieved.testRunId, TEST_RUN_ID, 'Dado recuperado idêntico')
    assert.strictEqual(retrieved.valor, 42, 'Valor persistido')
  })

  await testCase('Validação de Dados da Empresa (companyService)', async () => {
    assert(isValidCnpj('15.266.716/0001-02'), 'CNPJ real da Infodesk é válido')
    assert(!isValidCnpj('11.111.111/1111-11'), 'CNPJ falso rejeitado')
    assert.strictEqual(formatPhone('6130335373'), '(61) 3033-5373', 'Máscara telefone fixo')
    assert.strictEqual(formatCep('70673631'), '70673-631', 'Máscara CEP')
  })

  await testCase('Exportação Segura para CSV (Compliance LGPD)', async () => {
    const csv = exportCustomersToCsv([testCustomerDb])
    assert(csv.includes('Nome;E-mail;Telefone;CPF;Status;Data de Cadastro'), 'Cabeçalho CSV correto')
    assert(csv.includes(testCustomerDb.nome), 'Contém nome do cliente')
    // Verifica se CPF está mascarado no CSV exportado por padrão
    assert(csv.includes('***.***-00') || csv.includes('***'), 'CPF mascarado no CSV')
  })

  // -------------------------------------------------------------
  // SEÇÃO 7: LIMPEZA SEGURA DOS DADOS SINTÉTICOS (TEARDOWN)
  // -------------------------------------------------------------
  console.log(`\n--- 7. TEARDOWN CONTROLADO: REMOÇÃO EXCLUSIVA DE REGISTROS DE TESTE ---`)

  await testCase('Remoção Segura de Pedidos Sintéticos', async () => {
    for (const ordId of createdTestIds.orders) {
      assert(ordId.startsWith('ORD-'), 'ID de pedido para remoção deve ser válido')
      const { error } = await supabase.from('orders').delete().eq('id', ordId)
      assert(!error, `Falha ao deletar pedido sintético ${ordId}: ` + error?.message)
      console.log(`     -> Removido pedido sintético: ${ordId}`)
    }
  })

  await testCase('Remoção Segura de Clientes Sintéticos', async () => {
    for (const custId of createdTestIds.customers) {
      const { error } = await supabase.from('customers').delete().eq('id', custId)
      assert(!error, `Falha ao deletar cliente sintético ${custId}: ` + error?.message)
      console.log(`     -> Removido cliente sintético: ${custId}`)
    }
  })

  await testCase('Remoção Segura de Produtos Sintéticos', async () => {
    for (const prodId of createdTestIds.products) {
      const deleted = await deleteProductFromDb(prodId)
      assert(deleted, `Falha ao deletar produto sintético ${prodId}`)
      console.log(`     -> Removido produto sintético: ${prodId}`)
    }
  })

  await testCase('Remoção Segura de Configurações Sintéticas', async () => {
    for (const key of createdTestIds.settings) {
      const { error } = await supabase.from('store_settings').delete().eq('key', key)
      assert(!error, `Falha ao deletar setting sintético ${key}: ` + error?.message)
      console.log(`     -> Removido setting sintético: ${key}`)
    }
  })

  await testCase('Confirmação de Integridade dos Dados Reais da Infodesk', async () => {
    const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true })
    assert(prodCount >= 2, 'Produtos reais permanecem intactos')

    const { count: custCount } = await supabase.from('customers').select('*', { count: 'exact', head: true })
    assert(custCount >= 1, 'Clientes reais permanecem intactos')

    const { count: ordCount } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    assert(ordCount >= 5, 'Pedidos reais permanecem intactos')
    console.log(`     -> Dados reais verificados: ${prodCount} produtos, ${custCount} clientes, ${ordCount} pedidos.`)
  })

  console.log(`\n======================================================`)
  console.log(`AUDITORIA CONCLUÍDA!`)
  console.log(`Total de testes: ${auditResults.total}`)
  console.log(`Aprovados: ${auditResults.passed}`)
  console.log(`Reprovados: ${auditResults.failed}`)
  console.log(`======================================================\n`)

  if (auditResults.failed > 0) {
    process.exit(1)
  }
}

runAudit().catch(err => {
  console.error('Falha fatal na execução da auditoria:', err)
  process.exit(1)
})
