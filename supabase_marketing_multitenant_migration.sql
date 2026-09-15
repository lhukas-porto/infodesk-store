-- =============================================================================
-- INFODESK STORE — Migração de SEO & Divulgação Orgânica Multiloja / Multiempresa
-- =============================================================================

-- 1. Extensão de UUID se ainda não estiver criada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 2. Tabela de Domínios por Empresa / Tenant (tenant_domains)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(50) NOT NULL,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    is_primary BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL, -- 'active', 'pending', 'error'
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tenant_domains_tenant_id ON public.tenant_domains (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_domains_hostname ON public.tenant_domains (hostname);

-- =============================================================================
-- 3. Tabela de Configurações de Marketing e SEO por Empresa (tenant_marketing_settings)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_marketing_settings (
    tenant_id VARCHAR(50) PRIMARY KEY,
    default_seo_title VARCHAR(255),
    default_seo_description TEXT,
    default_share_image TEXT,
    analytics_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    analytics_measurement_id VARCHAR(50), -- G-XXXXXXXXXX
    analytics_status VARCHAR(20) DEFAULT 'disabled' NOT NULL, -- 'disabled', 'pending', 'active', 'error'
    search_console_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    search_console_verification TEXT, -- Conteúdo da meta tag
    search_console_status VARCHAR(20) DEFAULT 'disabled' NOT NULL,
    merchant_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    merchant_status VARCHAR(20) DEFAULT 'disabled' NOT NULL,
    merchant_auto_include BOOLEAN DEFAULT TRUE NOT NULL,
    merchant_require_approval BOOLEAN DEFAULT FALSE NOT NULL,
    whatsapp_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    whatsapp_number VARCHAR(30),
    whatsapp_message TEXT,
    social_sharing_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    social_links JSONB DEFAULT '{}'::jsonb NOT NULL, -- { instagram, tiktok, youtube, facebook }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- 4. Extensão da Tabela de Produtos (public.products)
-- =============================================================================
ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS company_id VARCHAR(50) DEFAULT 'emp_infodesk' NOT NULL,
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_description TEXT,
    ADD COLUMN IF NOT EXISTS image_alt VARCHAR(255),
    ADD COLUMN IF NOT EXISTS primary_keyword VARCHAR(100),
    ADD COLUMN IF NOT EXISTS mpn VARCHAR(100),
    ADD COLUMN IF NOT EXISTS google_category VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_anchor BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS weekly_offer BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS merchant_include BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS merchant_status VARCHAR(20) DEFAULT 'eligible', -- 'eligible', 'excluded', 'pending_approval'
    ADD COLUMN IF NOT EXISTS merchant_exclusion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_products_company_id ON public.products (company_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_is_anchor ON public.products (is_anchor) WHERE is_anchor = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_weekly_offer ON public.products (weekly_offer) WHERE weekly_offer = TRUE;

-- =============================================================================
-- 5. Extensão da Tabela de Pedidos para Rastreamento de Origem (public.orders)
-- =============================================================================
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
    ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
    ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100),
    ADD COLUMN IF NOT EXISTS utm_content VARCHAR(100),
    ADD COLUMN IF NOT EXISTS utm_term VARCHAR(100),
    ADD COLUMN IF NOT EXISTS referrer TEXT,
    ADD COLUMN IF NOT EXISTS landing_page TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_utm_campaign ON public.orders (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_orders_utm_source ON public.orders (utm_source);

-- =============================================================================
-- 6. Tabela de Rastreamento de Acessos & Métricas (tenant_analytics_events)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(50) NOT NULL,
    session_id VARCHAR(100),
    event_name VARCHAR(50) NOT NULL, -- 'page_view', 'view_item', 'add_to_cart', 'purchase'
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    referrer TEXT,
    landing_page TEXT,
    product_id UUID,
    order_id VARCHAR(50),
    value NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant_id ON public.tenant_analytics_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.tenant_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.tenant_analytics_events (event_name);

-- =============================================================================
-- 7. Tabela de Conteúdos, Guias e Artigos SEO (tenant_articles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    image TEXT,
    category VARCHAR(100),
    related_product_ids JSONB DEFAULT '[]'::jsonb,
    seo_title VARCHAR(255),
    seo_description TEXT,
    status VARCHAR(20) DEFAULT 'draft' NOT NULL, -- 'draft', 'published'
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_tenant_articles_tenant ON public.tenant_articles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_articles_slug ON public.tenant_articles (slug);

-- =============================================================================
-- 8. Row Level Security (RLS)
-- =============================================================================
ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_marketing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_articles ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública necessária para renderização e SEO
DROP POLICY IF EXISTS "Dominios leitura publica" ON public.tenant_domains;
CREATE POLICY "Dominios leitura publica" ON public.tenant_domains FOR SELECT USING (true);

DROP POLICY IF EXISTS "Marketing settings leitura publica" ON public.tenant_marketing_settings;
CREATE POLICY "Marketing settings leitura publica" ON public.tenant_marketing_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Artigos publicados leitura publica" ON public.tenant_articles;
CREATE POLICY "Artigos publicados leitura publica" ON public.tenant_articles FOR SELECT USING (status = 'published');

-- Políticas de gestão administrativa aberta (ou por autenticação de tenant)
DROP POLICY IF EXISTS "Admins gerenciam dominios" ON public.tenant_domains;
CREATE POLICY "Admins gerenciam dominios" ON public.tenant_domains FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins gerenciam marketing" ON public.tenant_marketing_settings;
CREATE POLICY "Admins gerenciam marketing" ON public.tenant_marketing_settings FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins gerenciam eventos" ON public.tenant_analytics_events;
CREATE POLICY "Admins gerenciam eventos" ON public.tenant_analytics_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins gerenciam artigos" ON public.tenant_articles;
CREATE POLICY "Admins gerenciam artigos" ON public.tenant_articles FOR ALL USING (true);

-- =============================================================================
-- 9. Inicialização e Preservação dos Dados da Infodesk (emp_infodesk)
-- =============================================================================

-- Domínios da Infodesk
INSERT INTO public.tenant_domains (tenant_id, hostname, is_primary, status)
VALUES 
    ('emp_infodesk', 'infodesk.net.br', true, 'active'),
    ('emp_infodesk', 'www.infodesk.net.br', false, 'active'),
    ('emp_infodesk', 'localhost', false, 'active')
ON CONFLICT (hostname) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    is_primary = EXCLUDED.is_primary,
    status = EXCLUDED.status;

-- Configurações de Marketing padrão da Infodesk
INSERT INTO public.tenant_marketing_settings (
    tenant_id,
    default_seo_title,
    default_seo_description,
    whatsapp_enabled,
    whatsapp_number,
    whatsapp_message,
    social_sharing_enabled,
    social_links
) VALUES (
    'emp_infodesk',
    'Infodesk Store — Variedades, Eletrônicos, Escritório e Tecnologia',
    'Compre com frete rápido e seguro dos Correios, parcelamento facilitado em até 12x e pagamento com desconto no Pix. Confira nossas ofertas exclusivas!',
    true,
    '5561996272630',
    'Olá! Estava navegando na Infodesk Store e gostaria de tirar uma dúvida.',
    true,
    '{"instagram": "https://instagram.com/infodesk", "facebook": "https://facebook.com/infodesk", "youtube": "", "tiktok": ""}'::jsonb
) ON CONFLICT (tenant_id) DO NOTHING;

-- Garante que todos os produtos existentes estejam associados à emp_infodesk
UPDATE public.products 
SET company_id = 'emp_infodesk' 
WHERE company_id IS NULL OR company_id = '';

-- Gera slugs para produtos que não possuem slug preenchido
UPDATE public.products
SET slug = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            TRANSLATE(name, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'),
            '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
    )
) || '-' || SUBSTRING(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';
