import crypto from 'node:crypto';

async function runTests() {
  console.log('🚀 Iniciando verificação de ponta a ponta dos endpoints do Mercado Pago...\n');

  // 1. Testar Conexão
  console.log('1. Testando endpoint: /api/payments/mercadopago/test-connection');
  try {
    const connRes = await fetch('http://localhost:5173/api/payments/mercadopago/test-connection');
    const connData = await connRes.json();
    console.log('Resposta status:', connRes.status, connData);
  } catch (err) {
    console.error('Erro no test-connection:', err.message);
  }

  // 2. Testar Criação de Order
  console.log('\n2. Testando endpoint: /api/payments/mercadopago/create-order');
  const testOrderId = `ped_test_${Date.now()}`;
  const mockOrderPayload = {
    orderId: testOrderId,
    cliente: {
      nome: 'Comprador Teste Infodesk',
      email: 'teste_comprador@infodesk.com.br',
      cpf: '00000000191',
      telefone: '11988887777',
      endereco: 'Av Paulista',
      numero: '1000',
      cep: '01310100'
    },
    items: [
      {
        id: 'item_1',
        title: 'Teclado Mecânico RGB',
        quantity: 1,
        price: 199.90
      }
    ],
    frete: 25.00,
    freteType: 'Sedex'
  };

  try {
    const orderRes = await fetch('http://localhost:5173/api/payments/mercadopago/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockOrderPayload)
    });
    const orderData = await orderRes.json();
    console.log('Resposta status:', orderRes.status);
    console.log('Order Data:', {
      success: orderData.success,
      order_id: orderData.order_id,
      checkout_url: orderData.checkout_url,
      mp_order_id: orderData.mp_order_id,
      error: orderData.error
    });

    if (orderData.checkout_url) {
      console.log('✅ URL de checkout gerada com sucesso:', orderData.checkout_url);
    }
  } catch (err) {
    console.error('Erro no create-order:', err.message);
  }

  // 3. Testar Status
  console.log('\n3. Testando endpoint: /api/payments/mercadopago/status');
  try {
    const statusRes = await fetch(`http://localhost:5173/api/payments/mercadopago/status?order_id=${testOrderId}`);
    const statusData = await statusRes.json();
    console.log('Resposta status:', statusRes.status, statusData);
  } catch (err) {
    console.error('Erro no status:', err.message);
  }

  console.log('\n🏁 Verificação dos endpoints concluída!');
}

runTests();
