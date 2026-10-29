-- =============================================================================
-- INFODESK STORE — Migration: Integração com Mercado Livre
-- Execute este script no SQL Editor do Supabase (Dashboard -> SQL Editor -> New Query)
-- =============================================================================

-- 1. Tabela para armazenar as credenciais OAuth e status da conta Mercado Livre
CREATE TABLE IF NOT EXISTS public.mercadolivre_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id VARCHAR(100) NOT NULL DEFAULT 'default',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    user_id BIGINT,
    nickname VARCHAR(100),
    email VARCHAR(150),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meli_integrations_store ON public.mercadolivre_integrations (store_id);

-- Row Level Security (RLS)
ALTER TABLE public.mercadolivre_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar integracoes mercadolivre"
ON public.mercadolivre_integrations FOR ALL USING (true);

-- 2. Colunas na tabela products para vínculo com o Mercado Livre
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS mercadolivre_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS mercadolivre_status VARCHAR(50) DEFAULT 'unlinked',
ADD COLUMN IF NOT EXISTS mercadolivre_permalink TEXT,
ADD COLUMN IF NOT EXISTS mercadolivre_sync_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mercadolivre_markup_percent NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS mercadolivre_category_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS mercadolivre_last_synced_at TIMESTAMP WITH TIME ZONE;

