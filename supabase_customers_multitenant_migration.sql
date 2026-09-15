-- ==========================================================
-- INFODESK STORE — Migração Multiempresa & Gestão de Clientes
-- ==========================================================

-- 1. Extensão da tabela de Clientes (customers)
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS company_id VARCHAR(50) DEFAULT 'emp_infodesk' NOT NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Ativo' NOT NULL, -- 'Ativo', 'Inativo', 'Bloqueado'
  ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS consent_marketing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_whatsapp BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMP WITH TIME ZONE;

-- Índices para performance e isolamento
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers (company_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers (status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);

-- 2. Extensão da tabela de Pedidos (orders) com company_id
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS company_id VARCHAR(50) DEFAULT 'emp_infodesk' NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_company_id ON public.orders (company_id);

-- 3. Tabela de Logs de Auditoria Administrativa de Clientes (LGPD & Segurança)
CREATE TABLE IF NOT EXISTS public.customer_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    actor_name VARCHAR(255) NOT NULL,
    actor_email VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'VIEW_SENSITIVE_DATA', 'UPDATE_PROFILE', 'TOGGLE_STATUS', 'RESET_PASSWORD', 'ANONYMIZE', 'EXPORT'
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_audit_logs_company ON public.customer_audit_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_customer_audit_logs_customer ON public.customer_audit_logs (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_audit_logs_created_at ON public.customer_audit_logs (created_at DESC);

-- 4. Atualização das Políticas RLS
ALTER TABLE public.customer_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de clientes: Acesso garantido
DROP POLICY IF EXISTS "Acesso a clientes" ON public.customers;
CREATE POLICY "Acesso a clientes" ON public.customers FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso a logs de auditoria" ON public.customer_audit_logs;
CREATE POLICY "Acesso a logs de auditoria" ON public.customer_audit_logs FOR ALL USING (true);

-- 5. Garantir que os registros existentes de customers e orders estejam associados à empresa atual
UPDATE public.customers SET company_id = 'emp_infodesk' WHERE company_id IS NULL OR company_id = '';
UPDATE public.orders SET company_id = 'emp_infodesk' WHERE company_id IS NULL OR company_id = '';
