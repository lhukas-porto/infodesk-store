-- ====================================================================
-- MIGRATION: 20260916_add_product_slug_column.sql
-- OBJETIVO: Adicionar coluna slug na tabela products para URLs amigáveis e SEO
-- ====================================================================

-- 1. Adiciona a coluna slug se não existir
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- 2. Cria índice de unicidade para buscas rápidas por slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);

-- 3. Popula slugs para produtos existentes que estejam sem slug
UPDATE public.products 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || substring(id::text from 1 for 8)
WHERE slug IS NULL OR slug = '';
