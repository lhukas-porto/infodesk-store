import React, { useState, useEffect } from 'react'
import { X, ShoppingCart, Star, ChevronLeft, ChevronRight, Truck, Package, Zap, MapPin } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { calcularFrete, cotarFreteOficial, formatCep, getProductWeight } from '../services/correiosService'

export default function ProductModal() {
  const {
    selectedProduct: product,
    setSelectedProduct,
    addToCart,
    globalCep,
    globalAddress,
    setShowCepModal
  } = useStore()

  const [currentImg, setCurrentImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [cep, setCep] = useState(globalCep || '')
  const [frete, setFrete] = useState(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [showSpecs, setShowSpecs] = useState(false)

  // Peso unitário e peso acumulado da quantidade selecionada
  const unitWeight = getProductWeight(product)
  const totalWeight = Math.max(0.5, Math.round(unitWeight * qty * 10) / 10)

  // Função assíncrona de cálculo de frete oficial
  const handleCalcFrete = async (cepVal = cep) => {
    const clean = (cepVal || '').replace(/\D/g, '')
    if (clean.length === 8 && product) {
      setIsCalculating(true)
      try {
        const result = await cotarFreteOficial(clean, [{ ...product, qty }], product.price * qty)
        setFrete(result)
      } finally {
        setIsCalculating(false)
      }
    }
  }

  // Auto-preenche e auto-calcula o frete caso haja um CEP global definido ou quantidade alterada
  useEffect(() => {
    const activeCep = cep || globalCep || ''
    if (activeCep) {
      setCep(activeCep)
      const clean = activeCep.replace(/\D/g, '')
      if (clean.length === 8 && product) {
        handleCalcFrete(clean)
      }
    }
  }, [product, globalCep, qty])

  // Suporte a fechar modal do produto com tecla ESC
  useEffect(() => {
    if (!product) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedProduct(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [product, setSelectedProduct])

  if (!product) return null

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0

  const handleCepInput = (val) => {
    const formatted = formatCep(val)
    setCep(formatted)
    if (formatted.replace(/\D/g, '').length === 8) {
      handleCalcFrete(formatted)
    }
  }

  const nextImg = () => setCurrentImg(i => (i + 1) % product.images.length)
  const prevImg = () => setCurrentImg(i => (i - 1 + product.images.length) % product.images.length)

  return (
    <div className="overlay">
      <div className="modal modal-lg">
        <button className="modal-close" onClick={() => setSelectedProduct(null)}>
          <X size={20} />
        </button>

        <div className="pm-content">
          {/* Image Gallery */}
          <div className="pm-gallery">
            <div className="pm-main-img">
              <img src={product.images[currentImg]} alt={product.name} />
              {product.images.length > 1 && (
                <>
                  <button className="pm-nav pm-nav-prev" onClick={prevImg}><ChevronLeft size={20} /></button>
                  <button className="pm-nav pm-nav-next" onClick={nextImg}><ChevronRight size={20} /></button>
                </>
              )}
              {discount > 0 && <span className="badge badge-red pm-discount">-{discount}%</span>}
            </div>
            <div className="pm-thumbs">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  className={`pm-thumb ${i === currentImg ? 'active' : ''}`}
                  onClick={() => setCurrentImg(i)}
                >
                  <img src={img} alt={`${product.name} ${i + 1}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="pm-details">
            <span className="product-card-brand">{product.brand}</span>
            <h2 className="pm-title">{product.name}</h2>

            <div className="product-card-rating" style={{ marginBottom: 'var(--space-2)' }}>
              <div className="stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < Math.round(product.rating) ? '#F59E0B' : 'none'} />
                ))}
              </div>
              <span className="product-card-reviews">{product.rating} ({product.reviews} avaliações) · {product.sold} vendidos</span>
            </div>

            <p className="pm-description">{product.description}</p>

            {/* Price */}
            <div className="pm-pricing">
              {(parseFloat(product.originalPrice) || 0) > (parseFloat(product.price) || 0) && (
                <span className="price-old">De R$ {(parseFloat(product.originalPrice) || 0).toFixed(2).replace('.', ',')}</span>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                <span className="price-current" style={{ fontSize: '2.2rem', color: '#15803d', fontWeight: 800 }}>
                  R$ {((parseFloat(product.price) || 0) * 0.97).toFixed(2).replace('.', ',')}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '4px' }}>
                  <Zap size={12} /> 3% NO PIX À VISTA
                </span>
              </div>
              <span className="price-installment">
                ou <strong>R$ {(parseFloat(product.price) || 0).toFixed(2).replace('.', ',')}</strong> em até {parseInt(product.installments) || 10}x de R$ {(parseFloat(product.installmentPrice) || ((parseFloat(product.price) || 0) / (parseInt(product.installments) || 10))).toFixed(2).replace('.', ',')} sem juros no cartão
              </span>
            </div>

            {/* Stock */}
            <div className="pm-stock">
              <Package size={16} />
              {(parseInt(product.stock) || 0) > 10 ? (
                <span className="pm-stock-ok">Em estoque — Envio imediato</span>
              ) : (
                <span className="pm-stock-low">Apenas {product.stock || 0} unidades restantes!</span>
              )}
            </div>

            {/* Quantity */}
            <div className="pm-qty-row">
              <span>Quantidade:</span>
              <div className="qty-selector">
                <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span>{qty}</span>
                <button onClick={() => setQty(q => Math.min(parseInt(product.stock) || 1, q + 1))}>+</button>
              </div>
            </div>

            {/* Add to Cart */}
            <button className="btn btn-primary btn-lg pm-add-btn" onClick={() => { addToCart(product, qty); setSelectedProduct(null) }}>
              <ShoppingCart size={20} />
              Adicionar ao Carrinho — R$ {((parseFloat(product.price) || 0) * qty).toFixed(2).replace('.', ',')}
            </button>

            {/* Freight */}
            <div className="pm-frete">
              <div className="pm-frete-header-row">
                <h4><Truck size={16} /> Envio dos Correios</h4>
                {globalAddress ? (
                  <span className="pm-frete-dest-badge" title="Endereço de entrega selecionado no topo">
                    <MapPin size={12} /> {globalAddress.cidade} - {globalAddress.estado}
                  </span>
                ) : (
                  <span className="pm-frete-dest-hint">Calcule para sua região</span>
                )}
              </div>

              <div className="pm-frete-package-tag">
                <Package size={13} style={{ color: '#0284c7' }} />
                <span>Pacote estimado: <strong>{totalWeight.toFixed(1)} kg</strong> ({qty} {qty > 1 ? 'unidades' : 'unidade'})</span>
              </div>

              <div className="pm-frete-input">
                <input
                  type="text"
                  className="input-field"
                  placeholder="00000-000"
                  value={cep}
                  onChange={e => handleCepInput(e.target.value)}
                  maxLength={9}
                />
                <button className="btn btn-outline btn-sm" onClick={() => handleCalcFrete(cep)} disabled={isCalculating}>
                  {isCalculating ? 'Calculando...' : (frete ? 'Recalcular' : 'Calcular')}
                </button>
              </div>

              {isCalculating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--dark-600)', padding: '8px 0' }}>
                  <span className="spinner" style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span>Consultando frete dos Correios...</span>
                </div>
              )}

              {!isCalculating && frete && !frete.error && (
                <div className="pm-frete-results">
                  {frete.opcoes.map(op => (
                    <div key={op.tipo} className="pm-frete-option">
                      <div>
                        <strong>{op.tipo}</strong>
                        {op.serviceCode && (
                          <span style={{ fontSize: '9px', background: 'var(--dark-200)', padding: '1px 4px', borderRadius: '3px', marginLeft: '6px', color: 'var(--dark-600)' }}>
                            {op.serviceCode}
                          </span>
                        )}
                      </div>
                      <span>{op.prazoLabel}</span>
                      <span className={op.preco === 0 ? 'pm-frete-free' : ''}>{op.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {!isCalculating && frete?.error && <p className="pm-frete-error">{frete.error}</p>}
            </div>

            {/* Specs Toggle */}
            <button className="btn btn-ghost pm-specs-toggle" onClick={() => setShowSpecs(!showSpecs)}>
              {showSpecs ? 'Ocultar' : 'Ver'} Ficha Técnica
            </button>
            {showSpecs && product.specs && (
              <div className="pm-specs">
                {product.specs.map((spec, i) => (
                  <div key={i} className="pm-spec-row">
                    <span className="pm-spec-label">{spec.label}</span>
                    <span className="pm-spec-value">{spec.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
          .modal-close {
            position: absolute;
            top: var(--space-4);
            right: var(--space-4);
            z-index: 10;
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            background: var(--dark-100);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--dark-600);
            transition: all var(--transition-fast);
          }
          .modal-close:hover { background: var(--dark-200); color: var(--dark-900); }
          .pm-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--space-6);
            padding: var(--space-6);
          }
          @media (min-width: 768px) {
            .pm-content { grid-template-columns: 1fr 1fr; }
          }
          .pm-gallery { display: flex; flex-direction: column; gap: var(--space-3); }
          .pm-main-img {
            position: relative;
            aspect-ratio: 1;
            border-radius: var(--radius-xl);
            overflow: hidden;
            background: var(--dark-50);
          }
          .pm-main-img img { width: 100%; height: 100%; object-fit: cover; }
          .pm-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            background: rgba(255,255,255,0.9);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-md);
            transition: all var(--transition-fast);
          }
          .pm-nav:hover { background: var(--white); transform: translateY(-50%) scale(1.1); }
          .pm-nav-prev { left: var(--space-3); }
          .pm-nav-next { right: var(--space-3); }
          .pm-discount { position: absolute; top: var(--space-3); left: var(--space-3); }
          .pm-thumbs { display: flex; gap: var(--space-2); }
          .pm-thumb {
            width: 64px;
            height: 64px;
            border-radius: var(--radius-md);
            overflow: hidden;
            border: 2px solid transparent;
            cursor: pointer;
            transition: border-color var(--transition-fast);
            padding: 0;
            background: none;
          }
          .pm-thumb.active { border-color: var(--lime); }
          .pm-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .pm-details { display: flex; flex-direction: column; gap: var(--space-3); }
          .pm-title { font-size: var(--text-xl); }
          .pm-description { font-size: var(--text-sm); color: var(--dark-600); line-height: 1.6; }
          .pm-pricing { display: flex; flex-direction: column; gap: 4px; padding: var(--space-4) 0; border-top: 1px solid var(--dark-100); border-bottom: 1px solid var(--dark-100); }
          .pm-pix-price { font-size: var(--text-sm); font-weight: 600; color: var(--lime-dark); }
          .pm-stock { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
          .pm-stock-ok { color: var(--lime-dark); font-weight: 500; }
          .pm-stock-low { color: var(--red); font-weight: 600; }
          .pm-qty-row { display: flex; align-items: center; gap: var(--space-4); font-size: var(--text-sm); font-weight: 500; }
          .pm-add-btn { width: 100%; }
          .pm-frete { padding: var(--space-4); background: var(--dark-50); border-radius: var(--radius-lg); }
          .pm-frete-header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); flex-wrap: wrap; gap: 6px; }
          .pm-frete h4 { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); margin-bottom: 0; }
          .pm-frete-dest-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
            background: #dcfce7;
            color: #166534;
            padding: 3px 8px;
            border-radius: var(--radius-full);
            border: 1px solid #86efac;
          }
          .pm-frete-dest-hint { font-size: 11px; color: var(--dark-400); }
          .pm-frete-package-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 11px;
            color: var(--dark-600);
            background: rgba(2, 132, 199, 0.08);
            border: 1px solid rgba(2, 132, 199, 0.2);
            padding: 4px 10px;
            border-radius: 6px;
            margin-bottom: var(--space-3);
          }
          .pm-frete-package-tag strong {
            color: #0284c7;
          }
          .pm-frete-input { display: flex; gap: var(--space-2); }
          .pm-frete-input .input-field { max-width: 160px; }
          .pm-frete-results { margin-top: var(--space-3); display: flex; flex-direction: column; gap: var(--space-2); }
          .pm-frete-option { display: flex; justify-content: space-between; font-size: var(--text-sm); padding: var(--space-2) 0; border-bottom: 1px solid var(--dark-200); }
          .pm-frete-free { color: var(--lime-dark); font-weight: 700; }
          .pm-frete-msg { color: var(--lime-dark); font-size: var(--text-sm); font-weight: 600; margin-top: var(--space-2); }
          .pm-frete-error { color: var(--red); font-size: var(--text-sm); margin-top: var(--space-2); }
          .pm-specs-toggle { width: 100%; justify-content: center; border: 1px dashed var(--dark-200); border-radius: var(--radius-lg); }
          .pm-specs { display: flex; flex-direction: column; }
          .pm-spec-row { display: flex; padding: var(--space-2) 0; border-bottom: 1px solid var(--dark-100); font-size: var(--text-sm); }
          .pm-spec-label { width: 40%; color: var(--dark-500); font-weight: 500; }
          .pm-spec-value { width: 60%; color: var(--dark-800); font-weight: 600; }
        `}</style>
      </div>
    </div>
  )
}
