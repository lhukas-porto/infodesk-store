-- =============================================================================
-- INFODESK STORE — Migration: Dimensões Físicas e Pesos dos Produtos para Correios
-- Execute este script no SQL Editor do Supabase para atualizar a tabela products
-- =============================================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS weight_g INT DEFAULT 500,
ADD COLUMN IF NOT EXISTS length_cm INT DEFAULT 20,
ADD COLUMN IF NOT EXISTS width_cm INT DEFAULT 15,
ADD COLUMN IF NOT EXISTS height_cm INT DEFAULT 10;

-- Comentários descritivos
COMMENT ON COLUMN public.products.weight_g IS 'Peso físico em gramas (psObjeto nos Correios)';
COMMENT ON COLUMN public.products.length_cm IS 'Comprimento da embalagem individual em cm';
COMMENT ON COLUMN public.products.width_cm IS 'Largura da embalagem individual em cm';
COMMENT ON COLUMN public.products.height_cm IS 'Altura da embalagem individual em cm';
