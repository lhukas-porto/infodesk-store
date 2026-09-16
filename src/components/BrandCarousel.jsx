import React, { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import { Award, ChevronRight, CheckCircle2 } from 'lucide-react'

const BrandCarousel = React.memo(function BrandCarousel() {
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
    </section>
  )
})

export default BrandCarousel

