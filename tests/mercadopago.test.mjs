import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyWebhookSignature,
  mapMercadoPagoStatus,
  createMercadoPagoOrderPayload
} from '../api/payments/mercadopago/service.js';

console.log('🧪 Iniciando suíte de testes unitários do Mercado Pago Orders API...\n');

// Teste 1: Construção do Payload da Orders API (/v1/orders)
console.log('1. Testando montagem do payload da Orders API...');
const mockOrder = {
  id: 'ped_test_123',
  customer_name: 'Lucas Teste',
  customer_email: 'lucas@exemplo.com',
  customer_phone: '11999999999',
  customer_document: '12345678909',
  shipping_address: 'Rua Teste, 100 - Centro, São Paulo - SP, CEP 01001-000',
  shipping_fee: 15.50,
  company_id: 'comp_infodesk_default',
  items: [
    {
      id: 'prod_1',
      name: 'Mouse Gamer RGB',
      description: 'Mouse óptico 16000 DPI',
      category: 'Periféricos',
      quantity: 2,
      price: 150.00
    }
  ]
};

const payload = createMercadoPagoOrderPayload({
  order: mockOrder,
  appUrl: 'https://infodesk.com.br',
  notificationUrl: 'https://infodesk.com.br/api/payments/mercadopago/webhook'
});

assert.equal(payload.type, 'online');
assert.equal(payload.processing_mode, 'manual');
assert.equal(payload.external_reference, 'ped_test_123');
assert.equal(payload.items.length, 2, 'Deve conter o item e o frete como item separado');
assert.equal(payload.items[0].title, 'Mouse Gamer RGB');
assert.equal(payload.items[0].quantity, 2);
assert.equal(payload.items[0].unit_price, '150.00');
assert.equal(payload.items[1].title, 'Frete / Entrega');
assert.equal(payload.items[1].unit_price, '15.50');
assert.equal(payload.total_amount, '315.50');
assert.equal(payload.payer.email, 'lucas@exemplo.com');
assert.equal(payload.payer.identification.type, 'CPF');
assert.equal(payload.payer.identification.number, '12345678909');
console.log('✅ Payload da Orders API gerado com conformidade total!');

// Teste 2: Mapeamento de Status do Mercado Pago para o Supabase
console.log('\n2. Testando mapeamento de status...');
assert.deepEqual(mapMercadoPagoStatus('approved'), { internalStatus: 'Pago', paymentStatus: 'approved' });
assert.deepEqual(mapMercadoPagoStatus('paid'), { internalStatus: 'Pago', paymentStatus: 'approved' });
assert.deepEqual(mapMercadoPagoStatus('pending'), { internalStatus: 'Pendente', paymentStatus: 'in_process' });
assert.deepEqual(mapMercadoPagoStatus('in_process'), { internalStatus: 'Pendente', paymentStatus: 'in_process' });
assert.deepEqual(mapMercadoPagoStatus('rejected'), { internalStatus: 'Cancelado', paymentStatus: 'rejected' });
assert.deepEqual(mapMercadoPagoStatus('cancelled'), { internalStatus: 'Cancelado', paymentStatus: 'cancelled' });
assert.deepEqual(mapMercadoPagoStatus('refunded'), { internalStatus: 'Cancelado', paymentStatus: 'refunded' });
console.log('✅ Mapeamento de status validado com sucesso!');

// Teste 3: Validação da Assinatura HMAC-SHA256 (x-signature)
console.log('\n3. Testando validação de segurança HMAC-SHA256 do Webhook...');
const testSecret = 'mp_secret_teste_super_seguro_12345';
const dataId = 'order_987654321';
const requestId = 'req_abc123xyz';
const ts = String(Math.floor(Date.now() / 1000));

// Conforme especificação oficial do Mercado Pago: id:[data.id];request-id:[x-request-id];ts:[ts];
const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
const validHash = crypto.createHmac('sha256', testSecret).update(manifest).digest('hex');
const validHeader = `ts=${ts},v1=${validHash}`;

const validResult = verifyWebhookSignature({
  signatureHeader: validHeader,
  requestId: requestId,
  dataId: dataId,
  secret: testSecret
});
assert.equal(validResult.valid, true, 'Assinatura válida deve ser aceita');
assert.equal(validResult.reason, 'OK');
console.log('✅ Assinatura HMAC-SHA256 legítima aceita com sucesso!');

// Teste 4: Rejeição de Assinatura Inválida / Adulterada
console.log('\n4. Testando rejeição de tentativa de spoofing/adulteração...');
const forgedHeader = `ts=${ts},v1=hash_falso_injetado_por_atacante`;
const invalidResult = verifyWebhookSignature({
  signatureHeader: forgedHeader,
  requestId: requestId,
  dataId: dataId,
  secret: testSecret
});
assert.equal(invalidResult.valid, false, 'Assinatura forjada DEVE ser rejeitada');

const tamperedDataResult = verifyWebhookSignature({
  signatureHeader: validHeader,
  requestId: requestId,
  dataId: 'order_hacked_id',
  secret: testSecret
});
assert.equal(tamperedDataResult.valid, false, 'Payload com data.id adulterado DEVE ser rejeitado');
console.log('✅ Tentativas de adulteração e assinaturas falsas foram bloqueadas com sucesso!');

console.log('\n🎉 TODOS OS TESTES DO MERCADO PAGO ORDERS API PASSARAM COM 100% DE SUCESSO!\n');
