import React, { useState } from 'react'
import { Search, ShoppingCart, User, Menu, X, Shield } from 'lucide-react'
import InfodeskLogo from '../assets/brand/InfodeskLogo'
import { useStore } from '../context/StoreContext'

export default function Header() {
  const {
    searchQuery, setSearchQuery,
    cartCount, setCartOpen,
    isAdmin, setShowAdminLogin, setShowAdminDashboard, logoutAdmin,
    customerProfile, isCustomerLoggedIn, setShowCustomerAccount,
  } = useStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="header">
      <div className="header-inner container">
        {/* Logo */}
        <div className="header-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <InfodeskLogo size={130} />
        </div>

        {/* Search Bar - Desktop */}
        <div className="header-search hide-mobile">
          <Search size={18} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="Buscar produtos, marcas, categorias..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="header-actions">
          {/* Customer Account */}
          <button
            className="btn btn-ghost header-user-btn"
            onClick={() => setShowCustomerAccount(true)}
            title={isCustomerLoggedIn ? `Conta de ${customerProfile?.nome || 'Cliente'}` : "Entrar ou Criar Conta"}
            aria-label="Minha Conta"
          >
            <User size={20} />
            <span className="hide-mobile" style={{ fontSize: '13px', fontWeight: 600 }}>
              {isCustomerLoggedIn && customerProfile?.nome
                ? `Olá, ${customerProfile.nome.split(' ')[0]}`
                : 'Entrar / Cadastrar'}
            </span>
          </button>

          {/* Admin Fast Button (Only visible if Admin is already authenticated) */}
          {isAdmin && (
            <button
              className="btn btn-ghost header-admin-btn"
              onClick={() => setShowAdminDashboard(true)}
              title="Painel Administrativo"
            >
              <Shield size={18} />
              <span className="hide-mobile">Admin</span>
            </button>
          )}

          {/* Cart */}
          <button
            className="header-cart-btn"
            onClick={() => setCartOpen(true)}
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="header-cart-badge">{cartCount}</span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            className="btn btn-ghost hide-desktop"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="header-mobile-search hide-desktop">
        <div className="container">
          <div className="header-search">
            <Search size={18} className="header-search-icon" />
            <input
              type="text"
              className="header-search-input"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <style>{`
        .header {
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--dark-100);
        }
        .header-inner {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          height: 64px;
        }
        .header-logo {
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity var(--transition-fast);
        }
        .header-logo:hover { opacity: 0.8; }
        .header-search {
          flex: 1;
          position: relative;
          max-width: 500px;
        }
        .header-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--dark-400);
          pointer-events: none;
        }
        .header-search-input {
          width: 100%;
          padding: 10px 16px 10px 42px;
          border: 1.5px solid var(--dark-200);
          border-radius: var(--radius-full);
          background: var(--dark-50);
          font-size: var(--text-sm);
          color: var(--dark-800);
          transition: all var(--transition-fast);
        }
        .header-search-input:focus {
          outline: none;
          border-color: var(--lime);
          box-shadow: 0 0 0 3px var(--lime-glow);
          background: var(--white);
        }
        .header-search-input::placeholder { color: var(--dark-400); }
        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-shrink: 0;
        }
        .header-cart-btn {
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
          color: var(--dark-700);
          transition: all var(--transition-fast);
          background: none;
          border: none;
          cursor: pointer;
        }
        .header-cart-btn:hover {
          background: var(--dark-100);
          color: var(--dark-900);
        }
        .header-cart-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--red);
          color: var(--white);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: slideUp 0.3s ease-out;
        }
        .header-admin-btn {
          color: var(--lime-dark) !important;
          font-weight: 600;
        }
        .header-mobile-search {
          padding: var(--space-2) 0 var(--space-3);
          border-top: 1px solid var(--dark-100);
        }
        .header-mobile-search .header-search {
          max-width: none;
        }
        @media (min-width: 768px) {
          .header-inner { height: 72px; }
          .header-mobile-search { display: none; }
        }
      `}</style>
    </header>
  )
}
