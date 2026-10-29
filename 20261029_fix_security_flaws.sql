-- ====================================================================
-- MIGRATION: 20261029_fix_security_flaws.sql
-- OBJETIVO: Fechamento de Brechas de Segurança e Endurecimento de RLS
-- NOTA: Totalmente idempotente — verifica a existência de cada tabela antes
-- de aplicar as políticas, evitando erro 42P01 caso alguma tabela não exista.
-- ====================================================================

-- ====================================================================
-- 1. TABELA: mercadolivre_integrations (Tokens OAuth e Segredos Meli)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.mercadolivre_integrations') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.mercadolivre_integrations ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Admins podem gerenciar integracoes mercadolivre" ON public.mercadolivre_integrations';
        EXECUTE 'DROP POLICY IF EXISTS "Permitir tudo mercadolivre_integrations" ON public.mercadolivre_integrations';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão mercadolivre_integrations restrita a service_role" ON public.mercadolivre_integrations';

        EXECUTE 'CREATE POLICY "Gestão mercadolivre_integrations restrita a service_role"
                 ON public.mercadolivre_integrations
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- ====================================================================
-- 2. TABELA: shipping_integrations (Credenciais de Acesso dos Correios)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.shipping_integrations') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.shipping_integrations ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Admins podem gerenciar integracoes de frete" ON public.shipping_integrations';
        EXECUTE 'DROP POLICY IF EXISTS "shipping_integrations_policy" ON public.shipping_integrations';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão shipping_integrations restrita a service_role" ON public.shipping_integrations';

        EXECUTE 'CREATE POLICY "Gestão shipping_integrations restrita a service_role"
                 ON public.shipping_integrations
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- ====================================================================
-- 3. TABELA: payment_orders (Mercado Pago - Pedidos)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.payment_orders') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Admins podem gerenciar payment_orders" ON public.payment_orders';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão payment_orders restrita a service_role" ON public.payment_orders';

        EXECUTE 'CREATE POLICY "Gestão payment_orders restrita a service_role"
                 ON public.payment_orders
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- ====================================================================
-- 4. TABELA: payment_webhook_events (Mercado Pago - Webhooks)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.payment_webhook_events') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Admins podem gerenciar payment_webhook_events" ON public.payment_webhook_events';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão payment_webhook_events restrita a service_role" ON public.payment_webhook_events';

        EXECUTE 'CREATE POLICY "Gestão payment_webhook_events restrita a service_role"
                 ON public.payment_webhook_events
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- ====================================================================
-- 5. TABELA: customer_audit_logs (Logs de Auditoria LGPD)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.customer_audit_logs') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.customer_audit_logs ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Acesso a logs de auditoria" ON public.customer_audit_logs';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão customer_audit_logs restrita a service_role" ON public.customer_audit_logs';

        EXECUTE 'CREATE POLICY "Gestão customer_audit_logs restrita a service_role"
                 ON public.customer_audit_logs
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- ====================================================================
-- 6. TABELA: customers (Proteção LGPD contra Varredura Pública)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.customers') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Acesso a clientes" ON public.customers';
        EXECUTE 'DROP POLICY IF EXISTS "Public read customers" ON public.customers';
        EXECUTE 'DROP POLICY IF EXISTS "Clientes públicos" ON public.customers';
        EXECUTE 'DROP POLICY IF EXISTS "Permitir cadastro de cliente" ON public.customers';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão completa de clientes via backend" ON public.customers';

        EXECUTE 'CREATE POLICY "Permitir cadastro de cliente"
                 ON public.customers
                 FOR INSERT
                 TO anon, authenticated
                 WITH CHECK (true)';

        EXECUTE 'CREATE POLICY "Gestão completa de clientes via backend"
                 ON public.customers
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;

-- ====================================================================
-- 7. TABELA: store_settings (Blindagem de Chaves com Sufixos de Loja)
-- ====================================================================
DO $$
BEGIN
    IF to_regclass('public.store_settings') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Configurações visíveis publicamente" ON public.store_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Admins podem atualizar configurações" ON public.store_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Public read settings" ON public.store_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Configurações públicas permitidas" ON public.store_settings';
        EXECUTE 'DROP POLICY IF EXISTS "Gestão de configurações via backend" ON public.store_settings';

        -- Cláusula robusta que bloqueia chaves exatas e com sufixos (ex: correios_config_default, admin_config_loja2)
        EXECUTE 'CREATE POLICY "Configurações públicas permitidas"
                 ON public.store_settings
                 FOR SELECT
                 TO anon, authenticated
                 USING (
                     key NOT LIKE ''admin_config%'' AND
                     key NOT LIKE ''correios_config%'' AND
                     key NOT LIKE ''mercado_pago%'' AND
                     key NOT LIKE ''%secret%'' AND
                     key NOT LIKE ''%token%'' AND
                     key NOT LIKE ''%credential%'' AND
                     key NOT LIKE ''%password%''
                 )';

        EXECUTE 'CREATE POLICY "Gestão de configurações via backend"
                 ON public.store_settings
                 FOR ALL
                 TO service_role
                 USING (true)
                 WITH CHECK (true)';
    END IF;
END $$;
