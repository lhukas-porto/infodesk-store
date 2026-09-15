-- ==========================================================
-- INFODESK STORE — Migração Mercado Pago Orders API & Multiempresa
-- ==========================================================

-- 1. Tabela de Ordens de Pagamento (Mercado Pago Orders API)
CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'emp_infodesk' NOT NULL,
    order_id VARCHAR(50) NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    mp_order_id VARCHAR(100),
    external_reference VARCHAR(100) NOT NULL,
    checkout_url TEXT,
    environment VARCHAR(20) DEFAULT 'test' NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment' NOT NULL, -- pending_payment, in_process, approved, rejected, cancelled, refunded, charged_back
    payment_method VARCHAR(50) DEFAULT 'mercadopago_checkout_pro',
    idempotency_key VARCHAR(100) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices de busca e unicidade
CREATE INDEX IF NOT EXISTS idx_payment_orders_company_id ON public.payment_orders (company_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON public.payment_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_mp_order_id ON public.payment_orders (mp_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_external_reference ON public.payment_orders (external_reference);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders (status);

-- 2. Tabela de Eventos de Webhook (Mercado Pago Notifications)
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id VARCHAR(50) DEFAULT 'emp_infodesk' NOT NULL,
    event_id VARCHAR(100) UNIQUE NOT NULL, -- Identificador da notificação para idempotência
    action VARCHAR(50) NOT NULL, -- payment.created, payment.updated, order.created, order.updated, etc.
    resource_id VARCHAR(100) NOT NULL,
    signature_valid BOOLEAN DEFAULT TRUE NOT NULL,
    processed BOOLEAN DEFAULT FALSE NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_company_id ON public.payment_webhook_events (company_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_event_id ON public.payment_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at ON public.payment_webhook_events (created_at DESC);

-- 3. Trigger para atualização automática de updated_at
DROP TRIGGER IF EXISTS tr_payment_orders_updated_at ON public.payment_orders;
CREATE TRIGGER tr_payment_orders_updated_at
    BEFORE UPDATE ON public.payment_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Habilitação de Row Level Security (RLS)
ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso aberto controlado para ordens e webhooks
DROP POLICY IF EXISTS "Acesso a ordens de pagamento" ON public.payment_orders;
CREATE POLICY "Acesso a ordens de pagamento" ON public.payment_orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso a eventos de webhook" ON public.payment_webhook_events;
CREATE POLICY "Acesso a eventos de webhook" ON public.payment_webhook_events FOR ALL USING (true);
