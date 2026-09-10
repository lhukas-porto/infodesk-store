import React from 'react'
import { X, Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react'
import { useStore } from '../context/StoreContext'

export default function CartDrawer() {
  const {
    cart, cartTotal, cartCount,
    cartOpen, setCartOpen,
    updateCartQty, removeFromCart,
    setShowCheckout,
  } = useStore()

  if (!cartOpen) return null

  return (
    <>
      <div className="drawer-overlay" onClick={() => setCartOpen(false)} />
      <div className="drawer">
        {/* Header */}
        <div className="cart-header">
          <h3><ShoppingBag size={20} /> Carrinho ({cartCount})</h3>
          <button className="btn btn-ghost btn-icon" onClick={() => setCartOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={48} />
              <p>Seu carrinho está vazio</p>
              <button className="btn btn-outline" onClick={() => setCartOpen(false)}>
                Continuar comprando
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.images[0]} alt={item.name} className="cart-item-img" />
                <div className="cart-item-info">
                  <span className="cart-item-brand">{item.brand}</span>
                  <p className="cart-item-name">{item.name}</p>
                  <span className="cart-item-price">
                    R$ {(item.price * item.qty).toFixed(2).replace('.', ',')}
                  </span>
                  <div className="cart-item-controls">
                    <div className="qty-selector">
                      <button onClick={() => updateCartQty(item.id, item.qty - 1)}>
                        <Minus size={14} />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateCartQty(item.id, Math.min(item.qty + 1, item.stock))}>
                        <Plus size={14} />
                      </button>
                    </div>
                    <button className="btn btn-ghost" onClick={() => removeFromCart(item.id)} style={{ color: 'var(--red)' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="cart-summary-row cart-total">
                <span>Total</span>
                <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="cart-pix-discount">
                ⚡ No Pix: <strong>R$ {(cartTotal * 0.97).toFixed(2).replace('.', ',')}</strong> (3% OFF à vista)
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg cart-checkout-btn"
              onClick={() => { setCartOpen(false); setShowCheckout(true) }}
            >
              Finalizar Compra <ArrowRight size={18} />
            </button>
          </div>
        )}

        <style>{`
          .cart-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-4) var(--space-5);
            border-bottom: 1px solid var(--dark-100);
          }
          .cart-header h3 {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            font-size: var(--text-lg);
          }
          .cart-items {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-4);
          }
          .cart-item {
            display: flex;
            gap: var(--space-3);
            padding: var(--space-3) 0;
            border-bottom: 1px solid var(--dark-100);
          }
          .cart-item-img {
            width: 80px;
            height: 80px;
            border-radius: var(--radius-lg);
            object-fit: cover;
            flex-shrink: 0;
          }
          .cart-item-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
          .cart-item-brand { font-size: var(--text-xs); color: var(--dark-400); text-transform: uppercase; }
          .cart-item-name {
            font-size: var(--text-sm);
            font-weight: 500;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .cart-item-price { font-weight: 700; color: var(--lime-dark); font-size: var(--text-sm); }
          .cart-item-controls { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
          .cart-footer {
            padding: var(--space-4) var(--space-5);
            border-top: 1px solid var(--dark-100);
            background: var(--dark-50);
          }
          .cart-summary { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-4); }
          .cart-summary-row { display: flex; justify-content: space-between; font-size: var(--text-sm); }
          .cart-free-shipping { color: var(--lime-dark); font-weight: 600; }
          .cart-total { font-size: var(--text-lg); font-weight: 700; padding-top: var(--space-2); border-top: 1px solid var(--dark-200); }
          .cart-pix-discount { font-size: var(--text-xs); color: var(--lime-dark); font-weight: 600; text-align: center; }
          .cart-checkout-btn { width: 100%; }
        `}</style>
      </div>
    </>
  )
}
