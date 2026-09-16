import React, { useState } from 'react'
import { ShoppingCart, Star, Eye, Heart, Zap, Flame, Truck } from 'lucide-react'
import { useStore } from '../context/StoreContext'

const ProductCard = React.memo(function ProductCard({ product }) {
  const { addToCart, setSelectedProduct } = useStore()
  const [imgLoaded, setImgLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)

  const price = parseFloat(product.price) || 0
  const originalPrice = parseFloat(product.originalPrice) || 0
  const installments = parseInt(product.installments) || 10
  const installmentPrice = parseFloat(product.installmentPrice) || (price > 0 ? price / installments : 0)

  // 3% de desconto real à vista no Pix (KaBuM! / Magalu pattern)
  const pixPrice = price * 0.97

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
          referrerPolicy="no-referrer"
        />

        {/* Badges de Alta Conversão */}
        <div className="product-card-badges">
          {discount > 0 && (
            <span className="badge badge-red">-{discount}% OFF</span>
          )}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="badge badge-urgent">
              <Flame size={12} className="badge-flame-icon" /> Restam {product.stock} un!
            </span>
          )}
          {product.featured && (
            <span className="badge badge-featured">Destaque</span>
          )}
        </div>

        {/* Quick Actions (hover) */}
        <div className={`product-card-actions ${hovered ? 'visible' : ''}`}>
          <button className="product-card-action-btn" onClick={e => { e.stopPropagation(); setSelectedProduct(product) }} title="Ver detalhes rápidos">
            <Eye size={18} />
          </button>
          <button className="product-card-action-btn" onClick={e => e.stopPropagation()} title="Salvar nos favoritos">
            <Heart size={18} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="product-card-body">
        <div className="product-card-header-row">
          <span className="product-card-brand">{product.brand}</span>
          <span className="product-card-shipping-tag">
            <Truck size={11} /> Envio 24h
          </span>
        </div>

        <h3 className="product-card-name" onClick={() => setSelectedProduct(product)} title={product.name}>
          {product.name}
        </h3>

        {/* Rating */}
        <div className="product-card-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={13} fill={i < Math.round(product.rating || 5) ? '#F59E0B' : 'none'} stroke="#F59E0B" />
            ))}
          </div>
          <span className="product-card-reviews">({product.reviews || 0})</span>
        </div>

        {/* Dual-Price de Alta Conversão (Mercado Livre + KaBuM!) */}
        <div className="product-card-pricing">
          {originalPrice > price && (
            <span className="price-old">De R$ {originalPrice.toFixed(2).replace('.', ',')}</span>
          )}

          {/* Preço Principal no Pix */}
          <div className="price-pix-row">
            <span className="price-pix-val">R$ {pixPrice.toFixed(2).replace('.', ',')}</span>
            <span className="badge-pix-discount">
              <Zap size={11} /> 3% NO PIX
            </span>
          </div>

          {/* Preço Parcelado */}
          <span className="price-installment">
            ou <strong>R$ {price.toFixed(2).replace('.', ',')}</strong> em até {installments}x de R$ {installmentPrice.toFixed(2).replace('.', ',')} no cartão
          </span>
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary product-card-cta"
          onClick={() => addToCart(product)}
        >
          <ShoppingCart size={16} />
          Adicionar ao Carrinho
        </button>
      </div>
    </div>
  )
})

export default ProductCard

