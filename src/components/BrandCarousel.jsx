import React, { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { Award, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function BrandCarousel() {
  const { products, setSearchQuery, searchQuery } = useStore()

  // Extrai dinamicamente as TOP 6 marcas com maior quantidade de produtos em estoque
  const topBrands = useMemo(() => {
    if (!Array.isArray(products)) return []

    const map = new Map()

    products.forEach(p => {
      const brandName = (p.brand || '').trim()
      const stock = parseInt(p.stock, 10) || 0

      if (brandName && stock > 0) {
        const key = brandName.toLowerCase()
        if (!map.has(key)) {
          map.set(key, {
            name: brandName,
            productsCount: 1,
            totalStock: stock,
            sampleCategory: p.category || 'Disponível'
          })
        } else {
          const entry = map.get(key)
          entry.productsCount += 1
          entry.totalStock += stock
        }
      }
    })

    // Ordena do maior para o menor volume de estoque e seleciona exatamente as Top 6
    return Array.from(map.values())
      .sort((a, b) => b.totalStock - a.totalStock || b.productsCount - a.productsCount)
      .slice(0, 6)
  }, [products])

  if (topBrands.length === 0) {
    return null
  }

  const handleBrandClick = (brandName) => {
    if (searchQuery.toLowerCase() === brandName.toLowerCase()) {
      setSearchQuery('')
    } else {
      setSearchQuery(brandName)
      const element = document.getElementById('products')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <section className="brands-section">
      <div className="container">
        <div className="brands-header">
          <div className="brands-title-wrap">
            <Award size={20} className="brands-header-icon" />
            <h3>Top 6 Marcas em Estoque</h3>
          </div>
          <span className="brands-sub">
            <CheckCircle2 size={13} style={{ color: '#4ade80', display: 'inline', marginRight: 4 }} />
            Marcas com maior disponibilidade para envio imediato
          </span>
        </div>

        <div className="brands-grid">
          {topBrands.map((b) => {
            const isSelected = searchQuery.toLowerCase() === b.name.toLowerCase()
            return (
              <button
                key={b.name}
                className={`brand-pill ${isSelected ? 'selected' : ''}`}
                onClick={() => handleBrandClick(b.name)}
                title={`Ver produtos da marca ${b.name} (${b.totalStock} unidades em estoque)`}
              >
                <div className="brand-pill-top">
                  <span className="brand-logo-text">{b.name.toUpperCase()}</span>
                  <ChevronRight size={14} className="brand-arrow" />
                </div>
                <span className="brand-badge-tag">
                  {b.totalStock} {b.totalStock === 1 ? 'unidade' : 'unidades'} em estoque
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        .brands-section {
          padding: 28px 0;
          background: #0f172a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .brands-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 18px;
        }
        @media (min-width: 768px) {
          .brands-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }
        .brands-title-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brands-header-icon {
          color: #38bdf8;
        }
        .brands-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }
        .brands-sub {
          font-size: 13px;
          color: #94a3b8;
          display: flex;
          align-items: center;
        }
        .brands-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .brands-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .brands-grid {
            grid-template-columns: repeat(6, 1fr);
            gap: 14px;
          }
        }
        .brand-pill {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          width: 100%;
        }
        .brand-pill:hover {
          background: rgba(37, 99, 235, 0.15);
          border-color: rgba(96, 165, 250, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
        }
        .brand-pill.selected {
          background: rgba(37, 99, 235, 0.25);
          border-color: #38bdf8;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.3);
        }
        .brand-pill-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 4px;
        }
        .brand-logo-text {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: #f1f5f9;
        }
        .brand-arrow {
          color: #64748b;
          transition: transform 0.2s ease, color 0.2s ease;
        }
        .brand-pill:hover .brand-arrow {
          color: #38bdf8;
          transform: translateX(3px);
        }
        .brand-badge-tag {
          font-size: 11px;
          color: #94a3b8;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
      `}</style>
    </section>
  )
}
