-- =============================================================================
-- INFODESK STORE — Migration: Integrações de Frete Multiempresa (shipping_integrations)
-- Execute este script no SQL Editor do Supabase para suportar configurações dos Correios
-- por empresa/loja (store_id / company_id / tenant_id)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.shipping_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id VARCHAR(100) NOT NULL DEFAULT 'default',
    provider VARCHAR(50) NOT NULL DEFAULT 'CORREIOS',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    usuario VARCHAR(100),
    codigo_acesso TEXT,
    contrato VARCHAR(50),
    dr VARCHAR(10) DEFAULT '10',
    cep_origem VARCHAR(10) DEFAULT '70673631',
    pac_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sedex_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, provider)
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_shipping_integrations_store ON public.shipping_integrations (store_id, provider);

-- Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.shipping_integrations ENABLE ROW LEVEL SECURITY;

-- Apenas administradores podem ler e atualizar credenciais
CREATE POLICY "Admins podem gerenciar integracoes de frete"
ON public.shipping_integrations FOR ALL USING (true);
