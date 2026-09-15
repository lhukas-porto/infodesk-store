# Tarefas: Mercado Pago Checkout Pro (Orders API)

- [x] 1. Criar migration SQL `supabase_mercadopago_orders_migration.sql` (tabelas `payment_orders`, `payment_webhook_events` e RLS)
- [x] 2. Atualizar `.env.example` com as variáveis necessárias
- [x] 3. Implementar serviço de backend `api/payments/mercadopago/service.js` (Orders API /v1/orders, HMAC-SHA256 x-signature, idempotência)
- [x] 4. Implementar rotas de API: `create-order.js`, `webhook.js`, `status.js` e `test-connection.js`
- [x] 5. Registrar endpoints no middleware local de desenvolvimento em `vite.config.js`
- [x] 6. Integrar Checkout Pro no `src/components/CheckoutModal.jsx` (opção de pagamento, loading e redirecionamento)
- [x] 7. Criar componente de retorno `src/components/PaymentReturnModal.jsx` e plugar no `src/App.jsx`
- [x] 8. Implementar seção "Pagamentos" no `src/components/AdminDashboard.jsx` (status, teste de conexão, URL de webhook)
- [x] 9. Criar e executar suíte de testes automatizados `tests/mercadopago.test.mjs`
- [x] 10. Validar compilação com `npm run build` e gerar relatório de entrega
