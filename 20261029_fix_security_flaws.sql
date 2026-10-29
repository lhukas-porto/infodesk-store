-- ====================================================================
-- MIGRATION: 20261029_fix_security_flaws.sql
-- OBJETIVO: Fechamento de Brechas de Segurança e Endurecimento de RLS
-- ====================================================================

-- 1. Habilitar RLS em todas as tabelas sensíveis
ALTER TABLE IF EXISTS public.mercadolivre_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shipping_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customer_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 2. TABELA: mercadolivre_integrations (Tokens OAuth e Segredos Meli)
-- ====================================================================
DROP POLICY IF EXISTS "Admins podem gerenciar integracoes mercadolivre" ON public.mercadolivre_integrations;
DROP POLICY IF EXISTS "Permitir tudo mercadolivre_integrations" ON public.mercadolivre_integrations;
DROP POLICY IF EXISTS "Gestão mercadolivre_integrations restrita a service_role" ON public.mercadolivre_integrations;

-- Bloqueia 100% de acesso anônimo/público. Apenas funções de backend (service_role) podem acessar.
CREATE POLICY "Gestão mercadolivre_integrations restrita a service_role"
    ON public.mercadolivre_integrations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 3. TABELA: shipping_integrations (Credenciais de Acesso dos Correios)
-- ====================================================================
DROP POLICY IF EXISTS "Admins podem gerenciar integracoes de frete" ON public.shipping_integrations;
DROP POLICY IF EXISTS "shipping_integrations_policy" ON public.shipping_integrations;
DROP POLICY IF EXISTS "Gestão shipping_integrations restrita a service_role" ON public.shipping_integrations;

-- Bloqueia acesso público a credenciais de frete
CREATE POLICY "Gestão shipping_integrations restrita a service_role"
    ON public.shipping_integrations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 4. TABELAS: payment_orders & payment_webhook_events (Mercado Pago)
-- ====================================================================
DROP POLICY IF EXISTS "Admins podem gerenciar payment_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "Admins podem gerenciar payment_webhook_events" ON public.payment_webhook_events;
DROP POLICY IF EXISTS "Gestão payment_orders restrita a service_role" ON public.payment_orders;
DROP POLICY IF EXISTS "Gestão payment_webhook_events restrita a service_role" ON public.payment_webhook_events;

CREATE POLICY "Gestão payment_orders restrita a service_role"
    ON public.payment_orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Gestão payment_webhook_events restrita a service_role"
    ON public.payment_webhook_events
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 5. TABELA: customer_audit_logs (Logs de Auditoria LGPD)
-- ====================================================================
DROP POLICY IF EXISTS "Acesso a logs de auditoria" ON public.customer_audit_logs;
DROP POLICY IF EXISTS "Gestão customer_audit_logs restrita a service_role" ON public.customer_audit_logs;

CREATE POLICY "Gestão customer_audit_logs restrita a service_role"
    ON public.customer_audit_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 6. TABELA: customers (Proteção LGPD contra Varredura Pública)
-- ====================================================================
DROP POLICY IF EXISTS "Acesso a clientes" ON public.customers;
DROP POLICY IF EXISTS "Public read customers" ON public.customers;
DROP POLICY IF EXISTS "Clientes públicos" ON public.customers;
DROP POLICY IF EXISTS "Permitir cadastro de cliente" ON public.customers;
DROP POLICY IF EXISTS "Gestão completa de clientes via backend" ON public.customers;

-- Inserção permitida para checkout / cadastro
CREATE POLICY "Permitir cadastro de cliente"
    ON public.customers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Gestão completa restrita a service_role
CREATE POLICY "Gestão completa de clientes via backend"
    ON public.customers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 7. TABELA: store_settings (Blindagem de Chaves com Sufixos de Loja)
-- ====================================================================
DROP POLICY IF EXISTS "Configurações visíveis publicamente" ON public.store_settings;
DROP POLICY IF EXISTS "Admins podem atualizar configurações" ON public.store_settings;
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
DROP POLICY IF EXISTS "Configurações públicas permitidas" ON public.store_settings;
DROP POLICY IF EXISTS "Gestão de configurações via backend" ON public.store_settings;

-- Cláusula robusta que bloqueia não apenas a chave exata, mas qualquer variação com sufixo (ex: correios_config_default, admin_config_loja2)
CREATE POLICY "Configurações públicas permitidas"
    ON public.store_settings
    FOR SELECT
    TO anon, authenticated
    USING (
        key NOT LIKE 'admin_config%' AND
        key NOT LIKE 'correios_config%' AND
        key NOT LIKE 'mercado_pago%' AND
        key NOT LIKE '%secret%' AND
        key NOT LIKE '%token%' AND
        key NOT LIKE '%credential%' AND
        key NOT LIKE '%password%'
    );

CREATE POLICY "Gestão de configurações via backend"
    ON public.store_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
