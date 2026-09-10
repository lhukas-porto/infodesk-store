import React from 'react'
import { ArrowUpDown, SlidersHorizontal, MapPin, X, Sparkles } from 'lucide-react'
import { useStore } from '../context/StoreContext'

export default function ProductSortFilter() {
  const {
    sortBy, setSortBy,
    priceFilter, setPriceFilter,
    filteredProducts,
    globalAddress,
    setShowCepModal
  } = useStore()

  const priceRanges = [
    { id: 'all', label: 'Todos os preços' },
    { id: 'under300', label: 'Até R$ 300' },
    { id: '300to1000', label: 'R$ 300 a R$ 1.000' },
    { id: '1000to3000', label: 'R$ 1.000 a R$ 3.000' },
    { id: 'above3000', label: 'Acima de R$ 3.000' }
  ]

  const hasActiveFilters = priceFilter !== 'all' || sortBy !== 'relevance'

  const handleReset = () => {
    setSortBy('relevance')
    setPriceFilter('all')
  }

  return (
    <div className="product-sort-filter-bar">
      {/* Top row: Fast Price Filter Chips */}
      <div className="psf-top-row">
        <div className="psf-filter-group">
          <span className="psf-label">
            <SlidersHorizontal size={14} /> Faixa de preço:
          </span>
          <div className="psf-chips">
            {priceRanges.map(range => (
              <button
                key={range.id}
                type="button"
                className={`psf-chip ${priceFilter === range.id ? 'active' : ''}`}
                onClick={() => setPriceFilter(range.id)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            className="psf-reset-btn"
            onClick={handleReset}
            title="Limpar filtros"
          >
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      {/* Bottom row: Counter, CEP Quick Status & Sort Selector */}
      <div className="psf-bottom-row">
        <div className="psf-status">
          <span className="psf-count">
            <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </span>

          {globalAddress ? (
            <button
              type="button"
              className="psf-location-badge active"
              onClick={() => setShowCepModal(true)}
              title="Alterar CEP de entrega"
            >
              <MapPin size={13} />
              <span>Entrega em: <strong>{globalAddress.cidade} - {globalAddress.estado}</strong></span>
            </button>
          ) : (
            <button
              type="button"
              className="psf-location-badge"
              onClick={() => setShowCepModal(true)}
              title="Calcular frete para sua cidade"
            >
              <MapPin size={13} />
              <span>Calcular frete para sua região</span>
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <div className="psf-sort">
          <label htmlFor="sort-select" className="psf-sort-label">
            <ArrowUpDown size={14} /> Ordenar por:
          </label>
          <div className="psf-select-wrapper">
            <select
              id="sort-select"
              className="psf-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="relevance">Mais relevantes</option>
              <option value="price_asc">Menor preço</option>
              <option value="price_desc">Maior preço</option>
              <option value="sold">Mais vendidos</option>
              <option value="rating">Melhores avaliados</option>
            </select>
          </div>
        </div>
      </div>

      <style>{`
        .product-sort-filter-bar {
          background: #ffffff;
          border: 1px solid var(--dark-200);
          border-radius: 14px;
          padding: 14px 18px;
          margin-top: 14px;
          margin-bottom: 22px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .psf-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--dark-100);
        }

        .psf-filter-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .psf-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--dark-600);
          display: flex;
          align-items: center;
          gap: 5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .psf-chips {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .psf-chip {
          font-size: 12px;
          font-weight: 500;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          border: 1px solid var(--dark-200);
          background: var(--dark-50);
          color: var(--dark-700);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .psf-chip:hover {
          border-color: #38bdf8;
          color: #0284c7;
          background: #f0f9ff;
        }

        .psf-chip.active {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
        }

        .psf-reset-btn {
          font-size: 12px;
          color: var(--red);
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .psf-reset-btn:hover {
          background: #fee2e2;
          border-color: var(--red);
        }

        .psf-bottom-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .psf-status {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .psf-count {
          font-size: 13px;
          color: var(--dark-600);
        }

        .psf-count strong {
          color: var(--dark-900);
          font-weight: 700;
        }

        .psf-location-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--dark-600);
          background: var(--dark-100);
          border: 1px dashed var(--dark-300);
          padding: 4px 10px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .psf-location-badge:hover {
          border-color: #38bdf8;
          color: #0284c7;
          background: #f0f9ff;
        }

        .psf-location-badge.active {
          background: #f0fdf4;
          border: 1px solid #86efac;
          color: #166534;
        }

        .psf-location-badge.active strong {
          color: #15803d;
        }

        .psf-sort {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .psf-sort-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--dark-600);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .psf-select-wrapper {
          position: relative;
        }

        .psf-select {
          font-size: 13px;
          font-weight: 600;
          padding: 6px 28px 6px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--dark-200);
          background: #ffffff;
          color: var(--dark-800);
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 14px;
          transition: border-color 0.2s ease;
        }

        .psf-select:focus {
          outline: none;
          border-color: #38bdf8;
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
        }

        @media (max-width: 640px) {
          .product-sort-filter-bar {
            padding: 12px;
          }
          .psf-bottom-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .psf-sort {
            width: 100%;
            justify-content: space-between;
          }
          .psf-select {
            flex: 1;
          }
        }
      `}</style>
    </div>
  )
}
