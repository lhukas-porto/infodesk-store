-- ==========================================================
-- SCRIPT DE LIMPEZA TOTAL (RESET DO ZERO) — INFODESK STORE
-- Cole e execute no Supabase SQL Editor se desejar truncar todas as tabelas
-- ==========================================================

-- 1. Habilita política de DELETE para a tabela de pedidos
DROP POLICY IF EXISTS "Permitir deletar pedidos" ON public.orders;
CREATE POLICY "Permitir deletar pedidos" ON public.orders FOR ALL USING (true);

-- 2. Limpeza em cascata de pedidos, produtos, clientes e pagamentos
TRUNCATE TABLE public.payment_orders CASCADE;
TRUNCATE TABLE public.payment_webhook_events CASCADE;
TRUNCATE TABLE public.orders CASCADE;
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.customers CASCADE;
TRUNCATE TABLE public.customer_audit_logs CASCADE;
