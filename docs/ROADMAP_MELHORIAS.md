# 📋 Infodesk Store — Roadmap de Melhorias Futuras

> Documento de planejamento técnico e arquitetural consolidado em 09/09/2026 para execução sob demanda do Lucas.

Este documento cataloga todas as melhorias mapeadas para a evolução da **Infodesk Store** da fase de homologação/validação para o ambiente de produção em escala.

---

## 🚀 1. Otimização de Performance & Carregamento (Code Splitting / Lazy Loading)
- [ ] **Importação Dinâmica no Admin (`AdminDashboard.jsx`)**:
  - **Objetivo**: Evitar que visitantes comuns da loja baixem as bibliotecas pesadas de geração de PDF (`jspdf`, `html2canvas`) na página inicial.
  - **Ação**: Implementar `React.lazy(() => import('./components/AdminDashboard'))` com `<Suspense>`.
- [ ] **Importação Dinâmica no Scanner de Código de Barras (`BarcodeScannerModal.jsx`)**:
  - **Objetivo**: Baixar a biblioteca de câmera (`html5-qrcode`) apenas quando o botão de bipar produto for clicado.
  - **Ação**: Implementar `React.lazy()` para o modal do scanner.
- [ ] **Configuração de Chunks no Vite (`vite.config.js`)**:
  - Configurar `manualChunks` no Rollup para segmentar bibliotecas de terceiros (`vendor-react`, `vendor-pdf`, `vendor-scanner`), reduzindo o bundle principal para menos de 150 kB e acelerando o carregamento no 4G de smartphones.

---

## 🔒 2. Blindagem de Segurança & RLS (Supabase)
- [ ] **Refinamento de Row Level Security (RLS)**:
  - **Objetivo**: Restringir operações críticas de escrita (`INSERT`, `UPDATE`, `DELETE`) nas tabelas `products`, `store_settings` e `categories`.
  - **Ação**: Criar políticas que exijam autenticação de usuário com perfil de administrador via Supabase Auth (`auth.uid() IS NOT NULL` com role `admin`), garantindo que a chave pública (`anon key`) apenas execute `SELECT` em produtos ativos.
- [ ] **Proteção de Pedidos e Clientes**:
  - Garantir que clientes consigam consultar apenas os seus próprios pedidos vinculados ao seu e-mail/ID.

---

## 🔑 3. Autenticação Administrativa em Nuvem (Supabase Auth)
- [ ] **Migração do Login Local para Supabase Auth**:
  - **Objetivo**: Permitir que o Lucas acesse o Painel Administrativo de qualquer dispositivo com sessão JWT segura, recuperação de senha e 2FA opcional.
  - **Ação**: Integrar `supabase.auth.signInWithPassword()` na tela de login administrativo (`AdminLoginModal.jsx`), aposentando a checagem manual via `localStorage`.

---

## 💳 4. Integração com Gateway de Pagamento Real (Webhooks)
- [ ] **Escolha do Gateway Oficial (Itaú Shop / Rede / Asaas / Mercado Pago)**:
  - **Objetivo**: Automatizar a confirmação de pagamentos Pix e Boleto sem necessidade de baixa manual.
  - **Ação**:
    1. Criar endpoint / Edge Function no Supabase para receber o Webhook de notificação bancária.
    2. Atualizar automaticamente o status do pedido de `Pendente` para `Pago` e disparar e-mail de confirmação ao cliente.
    3. Manter a geração de Boleto e Pix integrada diretamente às APIs da instituição financeira.

---

## 🚚 5. Integração com API Oficial dos Correios / Logística
- [ ] **Cotação em Tempo Real via Contrato dos Correios / Melhor Envio**:
  - **Objetivo**: Obter cotações com descontos corporativos de frete e gerar etiquetas de postagem oficiais com código de rastreio automático diretamente na transportadora.
  - **Ação**: Conectar o cálculo de frete a uma API de logística (ex: Correios WebService, Melhor Envio ou Frenet).

---

## 📌 Como Executar
Quando quiser iniciar qualquer um dos tópicos acima, basta chamar o time com uma instrução direta:
- *"Execute o item 1 do roadmap de melhorias"* (Atlas cuidará do Code Splitting)
- *"Execute o item 2 do roadmap"* (Kerberos e Hades farão a blindagem do banco)
- *"Execute o item 3 do roadmap"* (Implementação do Supabase Auth)
