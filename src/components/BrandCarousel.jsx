import React from 'react'
import { useStore } from '../context/StoreContext'
import { Award, ChevronRight } from 'lucide-react'

const BRANDS = [
  { name: 'ASUS', logo: 'ASUS', badge: 'Placas & Monitores' },
  { name: 'Logitech', logo: 'LOGITECH', badge: 'Periféricos Pro' },
  { name: 'Kingston', logo: 'KINGSTON', badge: 'Memórias & SSDs' },
  { name: 'AMD', logo: 'AMD', badge: 'Ryzen & Radeon' },
  { name: 'Intel', logo: 'INTEL', badge: 'Processadores Core' },
  { name: 'Corsair', logo: 'CORSAIR', badge: 'Fontes & Gabinetes' },
  { name: 'Redragon', logo: 'REDRAGON', badge: 'Setup Gamer' },
  { name: 'TP-Link', logo: 'TP-LINK', badge: 'Redes & Wi-Fi' }
]

export default function BrandCarousel() {
  const { setSearchQuery } = useStore()

  const handleBrandClick = (brandName) => {
    setSearchQuery(brandName)
    const element = document.getElementById('products')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <section className="brands-section">
      <div className="container">
        <div className="brands-header">
          <div className="brands-title-wrap">
            <Award size={20} className="brands-header-icon" />
            <h3>Marcas Oficiais & Autorizadas</h3>
          </div>
          <span className="brands-sub">Produtos 100% autênticos com suporte e garantia nacional</span>
        </div>

        <div className="brands-grid">
          {BRANDS.map((b) => (
            <button
              key={b.name}
              className="brand-pill"
              onClick={() => handleBrandClick(b.name)}
              title={`Ver todos os produtos ${b.name}`}
            >
              <div className="brand-pill-top">
                <span className="brand-logo-text">{b.logo}</span>
                <ChevronRight size={14} className="brand-arrow" />
              </div>
              <span className="brand-badge-tag">{b.badge}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .brands-section {
          padding: 32px 0;
          background: #0f172a;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .brands-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 20px;
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
        }
        .brands-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .brands-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .brands-grid {
            grid-template-columns: repeat(8, 1fr);
            gap: 12px;
          }
        }
        .brand-pill {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          padding: 12px 14px;
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
          font-size: 10px;
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
