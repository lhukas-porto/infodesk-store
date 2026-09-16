-- ==========================================================
-- SCRIPT DE ZERAMENTO TOTAL DE PEDIDOS — INFODESK STORE
-- Cole e execute no Supabase SQL Editor para limpar fisicamente todos os pedidos
-- ==========================================================

-- 1. Habilita política de DELETE permissiva para a tabela de pedidos
DROP POLICY IF EXISTS "Permitir deletar pedidos" ON public.orders;
CREATE POLICY "Permitir deletar pedidos" ON public.orders FOR ALL USING (true);

-- 2. Limpeza em cascata das tabelas de pedidos e transações vinculadas
TRUNCATE TABLE public.payment_orders CASCADE;
TRUNCATE TABLE public.payment_webhook_events CASCADE;
TRUNCATE TABLE public.orders CASCADE;
