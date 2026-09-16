-- ====================================================================
-- MIGRATION: 20260916_security_hardening_rls.sql
-- OBJETIVO: Blindagem de Row Level Security (RLS) e Proteção de Dados LGPD
-- ====================================================================

-- 1. Habilitar RLS estrito em todas as tabelas sensíveis
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 2. TABELA: store_settings (Configurações da Loja)
-- ====================================================================
-- Remove políticas abertas anteriores que permitiam ler senhas e chaves
DROP POLICY IF EXISTS "Configurações visíveis publicamente" ON public.store_settings;
DROP POLICY IF EXISTS "Admins podem atualizar configurações" ON public.store_settings;
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
DROP POLICY IF EXISTS "Configurações públicas permitidas" ON public.store_settings;

-- Apenas chaves públicas (não-confidenciais) podem ser lidas por visitantes anônimos
CREATE POLICY "Configurações públicas permitidas" ON public.store_settings
    FOR SELECT
    TO anon, authenticated
    USING (key NOT IN ('admin_config', 'correios_config', 'mercado_pago_credentials', 'admin_secret'));

-- Gravação de configurações permitida apenas para service_role (backend autenticado)
CREATE POLICY "Gestão de configurações via backend" ON public.store_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 3. TABELA: customers (Dados Pessoais / LGPD)
-- ====================================================================
-- Remove políticas que permitiam SELECT * da base inteira de clientes
DROP POLICY IF EXISTS "Acesso a clientes" ON public.customers;
DROP POLICY IF EXISTS "Public read customers" ON public.customers;
DROP POLICY IF EXISTS "Clientes públicos" ON public.customers;
DROP POLICY IF EXISTS "Permitir cadastro de cliente" ON public.customers;
DROP POLICY IF EXISTS "Cliente gerencia seu próprio cadastro" ON public.customers;

-- Permitir cadastro de novos clientes durante o checkout ou na aba criar conta
CREATE POLICY "Permitir cadastro de cliente" ON public.customers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Leitura de clientes: Permitida apenas via service_role ou por verificação pontual
CREATE POLICY "Gestão completa de clientes via backend" ON public.customers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 4. TABELA: orders (Pedidos e Compras)
-- ====================================================================
-- Remove políticas abertas que vazavam todos os pedidos para qualquer visitante
DROP POLICY IF EXISTS "Visualização de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Atualização de pedidos" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
DROP POLICY IF EXISTS "Qualquer cliente pode criar pedido" ON public.orders;
DROP POLICY IF EXISTS "Criar pedido no checkout" ON public.orders;

-- Permitir criação de pedido durante o checkout
CREATE POLICY "Criar pedido no checkout" ON public.orders
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Acesso total a pedidos restrito à service_role (painel admin e webhooks)
CREATE POLICY "Gestão completa de pedidos via backend" ON public.orders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ====================================================================
-- 5. FUNÇÃO RPC SEGURA: Rastreio de Pedido por Código + CPF
-- ====================================================================
-- Permite que o cliente consulte o status do seu pedido na tela de rastreamento
-- sem expor os pedidos dos demais clientes da loja.
CREATE OR REPLACE FUNCTION public.get_order_by_tracking(p_order_id TEXT, p_cpf TEXT)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_search_cpf TEXT;
BEGIN
    clean_search_cpf := regexp_replace(p_cpf, '\D', '', 'g');

    RETURN QUERY
    SELECT * FROM public.orders
    WHERE id = p_order_id
      AND (
          regexp_replace(customer_cpf, '\D', '', 'g') = clean_search_cpf
          OR customer_cpf = p_cpf
      )
    LIMIT 1;
END;
$$;

-- Conceder permissão de execução pública à função segura de rastreio
GRANT EXECUTE ON FUNCTION public.get_order_by_tracking(TEXT, TEXT) TO anon, authenticated;

-- ====================================================================
-- 6. FUNÇÃO RPC SEGURA: Autenticação Pontual de Cliente
-- ====================================================================
-- Valida credenciais e retorna apenas a linha do cliente autenticado
CREATE OR REPLACE FUNCTION public.authenticate_customer(p_identifier TEXT, p_password_hash TEXT)
RETURNS SETOF public.customers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_id TEXT;
    clean_digits TEXT;
BEGIN
    clean_id := lower(trim(p_identifier));
    clean_digits := regexp_replace(p_identifier, '\D', '', 'g');

    RETURN QUERY
    SELECT * FROM public.customers
    WHERE (
        lower(email) = clean_id
        OR (length(clean_digits) >= 11 AND regexp_replace(cpf, '\D', '', 'g') = clean_digits)
    )
    AND password = p_password_hash
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_customer(TEXT, TEXT) TO anon, authenticated;
