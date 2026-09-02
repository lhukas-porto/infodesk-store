-- ==========================================================
-- INFODESK STORE — Esquema Completo de Banco de Dados (Supabase PostgreSQL)
-- ==========================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 2. Tabela de Categorias
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- 3. Tabela de Produtos (Catálogo, Estoque e Precificação)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    specs JSONB DEFAULT '[]'::jsonb,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    cost_price NUMERIC(10, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 9.05,
    margin_rate NUMERIC(5, 2) DEFAULT 30.00,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    installments INT DEFAULT 6,
    installment_price NUMERIC(10, 2),
    stock INT NOT NULL DEFAULT 0,
    rating NUMERIC(2, 1) DEFAULT 5.0,
    reviews INT DEFAULT 0,
    sold INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    ean VARCHAR(30),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_ean ON public.products (ean);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock ON public.products (stock);

-- ==========================================================
-- 4. Tabela de Clientes da Loja
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(20) NOT NULL UNIQUE,
    telefone VARCHAR(30),
    password VARCHAR(255) NOT NULL,
    cep VARCHAR(10),
    endereco TEXT,
    numero VARCHAR(50),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_cpf ON public.customers (cpf);

-- ==========================================================
-- 5. Tabela de Pedidos (Compras e Rastreio dos Correios)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id VARCHAR(50) PRIMARY KEY, -- ex: ORD-1741234567890
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_cpf VARCHAR(20) NOT NULL,
    customer_phone VARCHAR(30),
    customer_address TEXT NOT NULL,
    customer_city VARCHAR(100) NOT NULL,
    customer_state VARCHAR(2) NOT NULL,
    customer_cep VARCHAR(10) NOT NULL,
    items JSONB NOT NULL, -- Lista dos produtos comprados com quantidade e preço no momento
    subtotal NUMERIC(10, 2) NOT NULL,
    frete NUMERIC(10, 2) DEFAULT 0.00,
    frete_type VARCHAR(20), -- 'SEDEX' ou 'PAC'
    total NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL, -- 'boleto', 'pix', 'link'
    payment_data JSONB, -- Dados do boleto Itaú, linha digitável ou link de pagamento
    status VARCHAR(30) DEFAULT 'Pendente' NOT NULL, -- 'Pendente', 'Pago', 'Em Separação', 'Enviado', 'Entregue', 'Cancelado'
    tracking_code VARCHAR(50), -- Código de rastreamento dos Correios (ex: AA123456789BR)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- ==========================================================
-- 6. Tabela de Configurações Globais da Loja
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.store_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================================
-- 7. Trigger para atualizar updated_at automaticamente
-- ==========================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tr_products_updated_at ON public.products;
CREATE TRIGGER tr_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_customers_updated_at ON public.customers;
CREATE TRIGGER tr_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_orders_updated_at ON public.orders;
CREATE TRIGGER tr_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==========================================================
-- 8. Políticas de Segurança (Row Level Security - RLS)
-- ==========================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Categorias & Produtos & Configs: Leitura pública
CREATE POLICY "Categorias visíveis publicamente" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Produtos ativos visíveis para todos" ON public.products FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins podem gerenciar produtos" ON public.products FOR ALL USING (true);
CREATE POLICY "Configurações visíveis publicamente" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins podem atualizar configurações" ON public.store_settings FOR ALL USING (true);

-- Clientes: Leitura e escrita para autenticação e perfil
CREATE POLICY "Acesso a clientes" ON public.customers FOR ALL USING (true);

-- Pedidos: Criação pública e consulta
CREATE POLICY "Qualquer cliente pode criar pedido" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Visualização de pedidos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Atualização de pedidos" ON public.orders FOR UPDATE USING (true);

-- ==========================================================
-- 9. Carga Inicial de Categorias
-- ==========================================================
INSERT INTO public.categories (name, slug, icon, display_order)
VALUES 
    ('Hardware', 'hardware', 'Cpu', 1),
    ('Periféricos', 'perifericos', 'Mouse', 2),
    ('Monitores', 'monitores', 'Monitor', 3),
    ('Notebooks', 'notebooks', 'Laptop', 4),
    ('Redes', 'redes', 'Wifi', 5),
    ('Acessórios', 'acessorios', 'Headphones', 6)
ON CONFLICT (name) DO NOTHING;

-- Configuração inicial de imposto global
INSERT INTO public.store_settings (key, value)
VALUES ('global_tax_rate', '{"rate": 9.05}'::jsonb)
ON CONFLICT (key) DO NOTHING;
