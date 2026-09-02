import React, { useState } from 'react'
import { ShoppingCart, Star, Eye, Heart } from 'lucide-react'
import { useStore } from '../context/StoreContext'

export default function ProductCard({ product }) {
  const { addToCart, setSelectedProduct } = useStore()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const price = parseFloat(product.price) || 0
  const originalPrice = parseFloat(product.originalPrice) || 0
  const installments = parseInt(product.installments) || 10
  const installmentPrice = parseFloat(product.installmentPrice) || (price > 0 ? price / installments : 0)

  const discount = (originalPrice > price && originalPrice > 0)
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  return (
    <div
      className="product-card card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="product-card-img-wrap" onClick={() => setSelectedProduct(product)}>
        {!imgLoaded && <div className="product-card-skeleton animate-shimmer" />}
        <img
          src={product.images?.[0] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80'}
          alt={product.name || 'Produto'}
          className={`product-card-img ${imgLoaded ? 'loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />

        {/* Badges */}
        <div className="product-card-badges">
          {discount > 0 && (
            <span className="badge badge-red">-{discount}%</span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="badge badge-amber">Últimas {product.stock} un.</span>
          )}
        </div>

        {/* Quick Actions (hover) */}
        <div className={`product-card-actions ${hovered ? 'visible' : ''}`}>
          <button className="product-card-action-btn" onClick={e => { e.stopPropagation(); setSelectedProduct(product) }}>
            <Eye size={18} />
          </button>
          <button className="product-card-action-btn" onClick={e => e.stopPropagation()}>
            <Heart size={18} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="product-card-body">
        <span className="product-card-brand">{product.brand}</span>
        <h3 className="product-card-name" onClick={() => setSelectedProduct(product)}>
          {product.name}
        </h3>

        {/* Rating */}
        <div className="product-card-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={i < Math.round(product.rating || 5) ? '#F59E0B' : 'none'} />
            ))}
          </div>
          <span className="product-card-reviews">({product.reviews || 0})</span>
        </div>

        {/* Price */}
        <div className="product-card-pricing">
          {originalPrice > price && (
            <span className="price-old">R$ {originalPrice.toFixed(2).replace('.', ',')}</span>
          )}
          <span className="price-current">R$ {price.toFixed(2).replace('.', ',')}</span>
          {installments > 1 && (
            <span className="price-installment">
              ou {installments}x de R$ {installmentPrice.toFixed(2).replace('.', ',')}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary product-card-cta"
          onClick={() => addToCart(product)}
        >
          <ShoppingCart size={16} />
          Adicionar
        </button>
      </div>

      <style>{`
        .product-card {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--dark-100);
          transition: all var(--transition-base);
        }
        .product-card:hover {
          border-color: var(--lime-glow-strong);
          box-shadow: var(--shadow-lg), 0 0 0 1px var(--lime-glow);
        }
        .product-card-img-wrap {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          background: var(--dark-50);
          cursor: pointer;
        }
        .product-card-skeleton {
          position: absolute;
          inset: 0;
          border-radius: 0;
        }
        .product-card-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .product-card-img.loaded { opacity: 1; }
        .product-card:hover .product-card-img { transform: scale(1.05); }
        .product-card-badges {
          position: absolute;
          top: var(--space-3);
          left: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .product-card-actions {
          position: absolute;
          top: var(--space-3);
          right: var(--space-3);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          opacity: 0;
          transform: translateX(10px);
          transition: all var(--transition-base);
        }
        .product-card-actions.visible {
          opacity: 1;
          transform: translateX(0);
        }
        .product-card-action-btn {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-lg);
          background: var(--white);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--dark-600);
          box-shadow: var(--shadow-md);
          transition: all var(--transition-fast);
        }
        .product-card-action-btn:hover {
          color: var(--red);
          transform: scale(1.1);
        }
        .product-card-body {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }
        .product-card-brand {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--dark-400);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .product-card-name {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--dark-800);
          line-height: 1.4;
          cursor: pointer;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color var(--transition-fast);
        }
        .product-card-name:hover { color: var(--lime-dark); }
        .product-card-rating {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .product-card-reviews {
          font-size: var(--text-xs);
          color: var(--dark-400);
        }
        .product-card-pricing {
          display: flex;
          flex-direction: column;
          gap: 2px;
          margin-top: auto;
        }
        .product-card-cta {
          margin-top: var(--space-2);
          width: 100%;
        }
      `}</style>
    </div>
  )
}
