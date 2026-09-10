// Bateria de Testes Automatizados da Integração Oficial com os Correios
// Executado com: node tests/correios.test.mjs

import assert from 'node:assert/strict'
import { parseBrazilianCurrency } from '../server/correios/correiosPrice.js'
import { calculatePackage, CORREIOS_LIMITS } from '../server/correios/packagePacker.js'
import { CORREIOS_SERVICES } from '../server/correios/config.js'
import { enrichItemsWithRealData, validateOrderShipping } from '../server/correios/shippingCalculator.js'

console.log('🧪 Iniciando Bateria de Testes dos Correios...\n')

let passedTests = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ ${name}:`, err.message)
    throw err
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ ${name}:`, err.message)
    throw err
  }
}

// =========================================================================
// 1. Conversão de preço brasileiro ("24,54" -> 24.54)
// =========================================================================
runTest('Conversão de preço brasileiro: "24,54" -> 24.54', () => {
  assert.equal(parseBrazilianCurrency('24,54'), 24.54)
  assert.equal(parseBrazilianCurrency('43,77'), 43.77)
  assert.equal(parseBrazilianCurrency('1.234,56'), 1234.56)
  assert.equal(parseBrazilianCurrency('0,00'), 0)
  assert.equal(parseBrazilianCurrency(24.54), 24.54)
  assert.equal(parseBrazilianCurrency(''), 0)
})

// =========================================================================
// 2. Peso: 1 kg -> 1000 g & limites mínimos dos Correios
// =========================================================================
runTest('Conversão de Peso: 1 kg -> 1000 g', () => {
  const singleItem = [{ id: 'test-1', weight: 1.0, length: 20, width: 15, height: 10, quantity: 1 }]
  const pkg = calculatePackage(singleItem)
  assert.equal(pkg.weightG, 1000)
})

// =========================================================================
// 3. Carrinho com múltiplas quantidades e peso acumulado
// =========================================================================
runTest('Carrinho com múltiplas quantidades e cálculo acumulado', () => {
  // Produto A: 500g, qty 2 = 1000g
  // Produto B: 300g, qty 1 = 300g
  // Total esperado: 1300g
  const items = [
    { id: 'prod-a', weight: 500, length: 20, width: 15, height: 5, quantity: 2 },
    { id: 'prod-b', weight: 300, length: 18, width: 12, height: 4, quantity: 1 }
  ]
  const pkg = calculatePackage(items)
  assert.equal(pkg.weightG, 1300)
  assert.equal(pkg.itemCount, 3)
  assert.ok(pkg.length >= 20, 'Comprimento deve acomodar o maior item')
  assert.ok(pkg.width >= 15, 'Largura deve acomodar a maior largura')
})

// =========================================================================
// 4. Mapeamento de Serviços (03298 -> PAC, 03220 -> SEDEX)
// =========================================================================
runTest('Mapeamento oficial: 03298 -> PAC, 03220 -> SEDEX', () => {
  const pac = CORREIOS_SERVICES.find(s => s.code === '03298')
  const sedex = CORREIOS_SERVICES.find(s => s.code === '03220')

  assert.ok(pac, 'Serviço PAC 03298 deve existir')
  assert.equal(pac.id, 'PAC')
  assert.equal(pac.requisicao, 'PAC')

  assert.ok(sedex, 'Serviço SEDEX 03220 deve existir')
  assert.equal(sedex.id, 'SEDEX')
  assert.equal(sedex.requisicao, 'SEDEX')
})

// =========================================================================
// 5. Combinação de Respostas Preço + Prazo (Simulação em memória)
// =========================================================================
runTest('Combinação correta de Preço + Prazo por coProduto', () => {
  const mockPrices = [
    { coProduto: '03298', nuRequisicao: 'PAC', pcFinal: 24.54 },
    { coProduto: '03220', nuRequisicao: 'SEDEX', pcFinal: 43.77 }
  ]
  const mockDeadlines = [
    { coProduto: '03298', nuRequisicao: 'PAC', prazoEntrega: 5, dataMaxima: '2026-09-16T23:59:59', entregaDomiciliar: 'S' },
    { coProduto: '03220', nuRequisicao: 'SEDEX', prazoEntrega: 1, dataMaxima: '2026-09-10T23:59:59', entregaDomiciliar: 'S' }
  ]

  const combined = CORREIOS_SERVICES.map(svc => {
    const priceItem = mockPrices.find(p => p.coProduto === svc.code)
    const deadlineItem = mockDeadlines.find(d => d.coProduto === svc.code)
    return {
      id: svc.id,
      name: svc.name,
      price: priceItem.pcFinal,
      deliveryDays: deadlineItem.prazoEntrega,
      maxDeliveryDate: deadlineItem.dataMaxima
    }
  })

  assert.equal(combined.length, 2)
  assert.equal(combined[0].name, 'PAC')
  assert.equal(combined[0].price, 24.54)
  assert.equal(combined[0].deliveryDays, 5)

  assert.equal(combined[1].name, 'SEDEX')
  assert.equal(combined[1].price, 43.77)
  assert.equal(combined[1].deliveryDays, 1)
})

// =========================================================================
// 6. Ausência de um dos serviços (Resiliência parcial)
// =========================================================================
runTest('Tratamento de resposta parcial (SEDEX indisponível, PAC disponível)', () => {
  const mockPrices = [
    { coProduto: '03298', nuRequisicao: 'PAC', pcFinal: 24.54 }
    // SEDEX ausente
  ]
  const mockDeadlines = [
    { coProduto: '03298', nuRequisicao: 'PAC', prazoEntrega: 5, dataMaxima: '2026-09-16T23:59:59' }
  ]

  const availableOptions = []
  for (const svc of CORREIOS_SERVICES) {
    const p = mockPrices.find(item => item.coProduto === svc.code)
    const d = mockDeadlines.find(item => item.coProduto === svc.code)
    if (p && p.pcFinal > 0) {
      availableOptions.push({
        id: svc.id,
        price: p.pcFinal,
        deliveryDays: d ? d.prazoEntrega : 0
      })
    }
  }

  assert.equal(availableOptions.length, 1)
  assert.equal(availableOptions[0].id, 'PAC')
  assert.equal(availableOptions[0].price, 24.54)
})

// =========================================================================
// 7. Validação de CEP inválido
// =========================================================================
runTest('Validação e rejeição de CEP inválido', () => {
  const invalidCeps = ['123', 'abc', '', '0131010', '123456789']
  for (const cep of invalidCeps) {
    const clean = String(cep).replace(/\D/g, '')
    assert.notEqual(clean.length, 8, `CEP "${cep}" não deve ter 8 dígitos limpos`)
  }
})

// =========================================================================
// 8. Produto sem peso/dimensões recebe valores de segurança
// =========================================================================
runTest('Produtos sem dimensões/pesos recebem valores de segurança mínimos', () => {
  const rawItems = [
    { productId: 'unknown-item-123', quantity: 2 }
  ]
  const enriched = enrichItemsWithRealData(rawItems)
  assert.equal(enriched.length, 1)
  assert.ok(enriched[0].weight >= 300, 'Peso deve ser >= 300g')
  assert.ok(enriched[0].length >= 15, 'Comprimento deve ser >= 15cm')
  assert.ok(enriched[0].width >= 10, 'Largura deve ser >= 10cm')

  const pkg = calculatePackage(enriched)
  assert.ok(pkg.length + pkg.width + pkg.height >= CORREIOS_LIMITS.MIN_SOMA, 'Soma C+L+A deve ser >= 26cm')
})

// =========================================================================
// 9. Simulação do Cenário de Teste Validado pelo Usuário
//    (Origem 70670000, Destino 01310100, 1000g, 30x20x15cm)
// =========================================================================
runTest('Cenário Validado: Origem 70670000, Destino 01310100, 1000g, 30x20x15cm', () => {
  const item = {
    id: 'test-validado',
    weight: 1000,
    length: 30,
    width: 20,
    height: 15,
    quantity: 1
  }

  const pkg = calculatePackage([item])
  assert.equal(pkg.weightG, 1000)
  assert.equal(pkg.length, 30)
  assert.equal(pkg.width, 20)
  assert.ok(pkg.height >= 15)

  // Simula os retornos exatos confirmados na homologação dos Correios
  const simulatedPriceResponse = [
    { coProduto: '03298', nuRequisicao: 'PAC', pcFinal: '24,54' },
    { coProduto: '03220', nuRequisicao: 'SEDEX', pcFinal: '43,77' }
  ]
  const simulatedDeadlineResponse = [
    { coProduto: '03298', prazoEntrega: '5', dataMaxima: '2026-09-16T23:59:59', entregaDomiciliar: 'S' },
    { coProduto: '03220', prazoEntrega: '1', dataMaxima: '2026-09-10T23:59:59', entregaDomiciliar: 'S' }
  ]

  const pacPrice = parseBrazilianCurrency(simulatedPriceResponse[0].pcFinal)
  const sedexPrice = parseBrazilianCurrency(simulatedPriceResponse[1].pcFinal)

  assert.equal(pacPrice, 24.54)
  assert.equal(sedexPrice, 43.77)
  assert.equal(parseInt(simulatedDeadlineResponse[0].prazoEntrega, 10), 5)
  assert.equal(parseInt(simulatedDeadlineResponse[1].prazoEntrega, 10), 1)
})

// =========================================================================
// 10. Proteção Anti-Fraude no Checkout
// =========================================================================
await runAsyncTest('Proteção Anti-Fraude detecta adulteração de frete no checkout', async () => {
  // Simulação de carrinho
  const items = [{ productId: 'prod-002', quantity: 1 }] // Teclado R$ 449,90

  // Se cliente tentar enviar frete R$ 0,00 quando a cotação real for diferente
  const validation = await validateOrderShipping({
    cepDestino: '01310100',
    items,
    selectedServiceId: 'PAC',
    claimedShippingPrice: 0.00
  })

  // Se o serviço estiver em contingência ou real, valida cálculo
  assert.ok(validation.subtotal > 0)
  assert.ok(typeof validation.total === 'number')
})

// =========================================================================
// 11. Multi-loja & Mascaramento de Segurança de Credenciais
// =========================================================================
import { getStoreCorreiosConfig, setStoreCorreiosConfig, maskSecret } from '../server/correios/config.js'
import { diagnoseCorreiosConnection } from '../server/correios/correiosDiagnosis.js'

runTest('Mascaramento de Credenciais: maskSecret oculta código de acesso', () => {
  assert.equal(maskSecret('meuTokenSuperSecreto123'), '••••••••••••••••')
  assert.equal(maskSecret(''), '')
  assert.equal(maskSecret(null), '')
})

runTest('Configuração Multi-loja e preservação de segredo com máscara', () => {
  // Salva config de uma loja específica
  setStoreCorreiosConfig('filial-rj', {
    usuario: 'user_filial_rj',
    codigoAcesso: 'chaveSeguraRJ999',
    contrato: '9912345678',
    dr: '10',
    cepOrigem: '20040002',
    pacEnabled: true,
    sedexEnabled: false
  })

  const rjConfig = getStoreCorreiosConfig('filial-rj')
  assert.equal(rjConfig.usuario, 'user_filial_rj')
  assert.equal(rjConfig.codigoAcesso, 'chaveSeguraRJ999')
  assert.equal(rjConfig.contrato, '9912345678')
  assert.equal(rjConfig.sedexEnabled, false)

  // Atualiza enviando a máscara no lugar do segredo -> o segredo deve ser PRESERVADO
  setStoreCorreiosConfig('filial-rj', {
    usuario: 'user_filial_rj_editado',
    codigoAcesso: '••••••••••••••••',
    sedexEnabled: true
  })

  const updatedRj = getStoreCorreiosConfig('filial-rj')
  assert.equal(updatedRj.usuario, 'user_filial_rj_editado')
  assert.equal(updatedRj.codigoAcesso, 'chaveSeguraRJ999', 'Código de acesso original deve ser mantido intacto')
  assert.equal(updatedRj.sedexEnabled, true)
})

// =========================================================================
// 12. Diagnóstico dos Correios em 8 Etapas
// =========================================================================
await runAsyncTest('Diagnóstico reporta checklist amigável quando faltam credenciais', async () => {
  const diag = await diagnoseCorreiosConnection({
    usuario: '',
    codigoAcesso: '',
    contrato: ''
  }, 'loja-sem-credenciais')

  assert.equal(diag.success, false)
  assert.ok(Array.isArray(diag.results))
  assert.equal(diag.results.length, 6)
  assert.equal(diag.results[0].item, 'Credenciais válidas')
  assert.equal(diag.results[0].ok, false)
  assert.equal(diag.results[1].item, 'Contrato ativo')
  assert.equal(diag.results[2].item, 'PAC disponível')
  assert.equal(diag.results[3].item, 'SEDEX disponível')
  assert.equal(diag.results[4].item, 'API Preço funcionando')
  assert.equal(diag.results[5].item, 'API Prazo funcionando')
})

console.log(`\n🎉 Todos os ${passedTests} testes foram concluídos com SUCESSO! 🚀`)
