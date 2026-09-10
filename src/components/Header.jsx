import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  Shield,
  Zap,
  Truck,
  CreditCard,
  ShieldCheck,
  MapPin,
  Flame,
  ArrowRight,
  PackageCheck,
  History
} from 'lucide-react'
import InfodeskLogo from '../assets/brand/InfodeskLogo'
import { useStore } from '../context/StoreContext'

export default function Header() {
  const {
    products,
    searchQuery,
    setSearchQuery,
    cartCount,
    setCartOpen,
    isAdmin,
    setShowAdminDashboard,
    customerProfile,
    isCustomerLoggedIn,
    setShowCustomerAccount,
    setSelectedProduct,
    // Fase 3
    globalCep,
    globalAddress,
    setShowCepModal,
  } = useStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [mobileSearchFocused, setMobileSearchFocused] = useState(false)
  const searchContainerRef = useRef(null)
  const mobileSearchContainerRef = useRef(null)

  // Memória viva: buscas recentes do usuário
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_recent_searches')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Memória viva: frequência real dos termos buscados
  const [searchCounts, setSearchCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_search_counts')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Registra um termo na memória viva
  const recordSearch = (term) => {
    if (!term || term.trim().length < 2) return
    const clean = term.trim()

    // Atualiza buscas recentes (mantém as últimas 5)
    setRecentSearches(prev => {
      const updated = [clean, ...prev.filter(t => t.toLowerCase() !== clean.toLowerCase())].slice(0, 5)
      localStorage.setItem('infodesk_recent_searches', JSON.stringify(updated))
      return updated
    })

    // Incrementa contador de tendências
    setSearchCounts(prev => {
      const key = clean.toLowerCase()
      const updated = { ...prev, [key]: (prev[key] || 0) + 1 }
      localStorage.setItem('infodesk_search_counts', JSON.stringify(updated))
      return updated
    })
  }

  const handleClearRecents = (e) => {
    e.stopPropagation()
    setRecentSearches([])
    localStorage.removeItem('infodesk_recent_searches')
  }

  const handleRemoveRecent = (e, termToRemove) => {
    e.stopPropagation()
    setRecentSearches(prev => {
      const updated = prev.filter(t => t !== termToRemove)
      localStorage.setItem('infodesk_recent_searches', JSON.stringify(updated))
      return updated
    })
  }

  // Gera os termos mais buscados reais ordenados pela frequência com ranking visual
  const trendingTerms = useMemo(() => {
    const initialSeed = {
      'Monitor Gamer': 42,
      'Cadeira Ergonômica': 35,
      'Mouse Sem Fio': 28,
      'SSD Kingston': 25,
      'Notebook': 20,
      'Samsung': 17,
      'Parafusadeira': 14,
      'Cafeteira': 11
    }

    const mergedCounts = { ...initialSeed }
    Object.entries(searchCounts).forEach(([term, count]) => {
      const matchKey = Object.keys(mergedCounts).find(k => k.toLowerCase() === term.toLowerCase())
      if (matchKey) {
        mergedCounts[matchKey] = Math.max(mergedCounts[matchKey], count)
      } else {
        const capitalized = term.charAt(0).toUpperCase() + term.slice(1)
        mergedCounts[capitalized] = count
      }
    })

    return Object.entries(mergedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([term, count], index) => ({
        rank: index + 1,
        term,
        count
      }))
  }, [searchCounts])

  // Extrai resultados preditivos em tempo real
  const predictiveResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return []
    const q = searchQuery.toLowerCase().trim()

    return products.filter(p => {
      const name = (p.name || '').toLowerCase()
      const brand = (p.brand || '').toLowerCase()
      const cat = (p.category || '').toLowerCase()
      return name.includes(q) || brand.includes(q) || cat.includes(q)
    }).slice(0, 5)
  }, [products, searchQuery])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false)
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(e.target)) {
        setMobileSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectPredictive = (prod) => {
    recordSearch(prod.name)
    setSelectedProduct(prod)
    setSearchFocused(false)
    setMobileSearchFocused(false)
  }

  const handleSelectTerm = (term) => {
    recordSearch(term)
    setSearchQuery(term)
    setSearchFocused(false)
    setMobileSearchFocused(false)
    const element = document.getElementById('products')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Renderiza o Dropdown Preditivo Inteligente com Memória Viva e Ranking
  const renderPredictiveDropdown = () => (
    <div className="predictive-dropdown">
      {predictiveResults.length > 0 ? (
        <div className="predictive-results">
          <div className="predictive-header">
            <span>Produtos sugeridos ({predictiveResults.length})</span>
            <a href="#products" onClick={() => { setSearchFocused(false); setMobileSearchFocused(false) }}>
              Ver todos os resultados
            </a>
          </div>

          {predictiveResults.map(p => {
            const pixPrice = (parseFloat(p.price) || 0) * 0.97
            return (
              <div
                key={p.id}
                className="predictive-item"
                onClick={() => handleSelectPredictive(p)}
              >
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&fit=crop'}
                  alt={p.name}
                  className="predictive-img"
                />
                <div className="predictive-info">
                  <div className="predictive-brand-row">
                    <span className="predictive-brand">{p.brand}</span>
                    <span className="predictive-cat">• {p.category}</span>
                  </div>
                  <strong className="predictive-name">{p.name}</strong>
                  <div className="predictive-price-row">
                    <span className="predictive-price-pix">
                      R$ {pixPrice.toFixed(2).replace('.', ',')} <small>no Pix (3% OFF)</small>
                    </span>
                    {p.stock > 0 ? (
                      <span className="predictive-stock-ok">
                        <PackageCheck size={12} /> Em estoque
                      </span>
                    ) : (
                      <span className="predictive-stock-out">Indisponível</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : searchQuery.trim().length >= 2 ? (
        <div className="predictive-empty">
          <p>Nenhum produto encontrado para "<strong>{searchQuery}</strong>".</p>
          <span>Tente buscar por termos mais genéricos ou marcas.</span>
        </div>
      ) : (
        <div className="predictive-suggestions">
          {recentSearches.length > 0 && (
            <div className="predictive-recent-block">
              <div className="predictive-suggestions-title" style={{ justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <History size={14} style={{ color: '#0284c7' }} /> Suas buscas recentes
                </span>
                <button
                  type="button"
                  className="predictive-clear-history-btn"
                  onClick={handleClearRecents}
                  title="Limpar histórico de buscas"
                >
                  Limpar histórico
                </button>
              </div>
              <div className="predictive-tags" style={{ marginBottom: '16px' }}>
                {recentSearches.map(term => (
                  <div key={term} className="predictive-recent-chip-wrap">
                    <button
                      type="button"
                      className="predictive-tag-chip recent"
                      onClick={() => handleSelectTerm(term)}
                    >
                      <History size={11} style={{ opacity: 0.7 }} /> {term}
                    </button>
                    <button
                      type="button"
                      className="predictive-recent-del"
                      onClick={(e) => handleRemoveRecent(e, term)}
                      title="Excluir do histórico"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="predictive-suggestions-title">
            <Flame size={15} className="text-amber" />
            <span>Ranking Real de Tendências</span>
          </div>
          <div className="predictive-tags">
            {trendingTerms.map(item => (
              <button
                key={item.term}
                type="button"
                className={`predictive-tag-chip trending-rank ${item.rank <= 3 ? 'top-rank' : ''}`}
                onClick={() => handleSelectTerm(item.term)}
              >
                <span className="rank-num">#{item.rank}</span>
                <span className="rank-title">{item.term}</span>
                {item.count > 0 && (
                  <span className="rank-count">{item.count} buscas</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <header className="header">
      {/* Top Trust Bar */}
      <div className="header-topbar">
        <div className="container header-topbar-inner">
          <div className="topbar-items">
            <span className="topbar-item highlight">
              <Zap size={13} className="topbar-icon" />
              <strong>3% OFF</strong> no Pix à vista
            </span>
            <span className="topbar-sep hide-mobile">•</span>
            <span className="topbar-item hide-mobile">
              <Truck size={13} className="topbar-icon" />
              Envio em até 24h via Correios
            </span>
            <span className="topbar-sep hide-mobile">•</span>
            <span className="topbar-item hide-mobile">
              <CreditCard size={13} className="topbar-icon" />
              Até 12x no Cartão
            </span>
            <span className="topbar-sep hide-mobile">•</span>
            <span className="topbar-item">
              <ShieldCheck size={13} className="topbar-icon" />
              Garantia Oficial com NF
            </span>
          </div>
          <div className="topbar-right hide-mobile">
            <span>Suporte Especializado: <strong>contato@infodesk.net.br</strong></span>
          </div>
        </div>
      </div>

      <div className="header-inner container">
        {/* Logo */}
        <div className="header-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <InfodeskLogo size={130} />
        </div>

        {/* Global CEP Button (Mercado Livre / Amazon Pattern) */}
        <button
          type="button"
          className="header-cep-btn hide-mobile"
          onClick={() => setShowCepModal(true)}
          title="Definir endereço para cálculo de frete e prazos"
        >
          <MapPin size={20} className="header-cep-icon" />
          <div className="header-cep-info">
            <span className="header-cep-sub">Enviar para</span>
            <strong className="header-cep-city">
              {globalAddress?.cidade ? `${globalAddress.cidade} - ${globalAddress.estado}` : 'Informe seu CEP'}
            </strong>
          </div>
        </button>

        {/* Search Bar - Desktop with Predictive Search */}
        <div className="header-search hide-mobile" ref={searchContainerRef}>
          <Search size={18} className="header-search-icon" />
          <input
            type="text"
            className="header-search-input"
            placeholder="O que você procura hoje? Busque por produto, marca ou departamento..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={e => {
              if (e.key === 'Escape') setSearchFocused(false)
              if (e.key === 'Enter' && searchQuery.trim()) {
                recordSearch(searchQuery)
                setSearchFocused(false)
                const element = document.getElementById('products')
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }
            }}
          />
          {searchQuery && (
            <button
              type="button"
              className="header-search-clear"
              onClick={() => setSearchQuery('')}
              title="Limpar busca"
            >
              <X size={14} />
            </button>
          )}

          {/* Predictive Search Dropdown */}
          {searchFocused && renderPredictiveDropdown()}
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

          {/* Admin Fast Button */}
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

      {/* Mobile Bar: CEP and Search */}
      <div className="header-mobile-bar hide-desktop">
        <div className="container">
          <button
            type="button"
            className="header-mobile-cep-btn"
            onClick={() => setShowCepModal(true)}
          >
            <MapPin size={15} style={{ color: '#0284c7' }} />
            <span>
              Enviar para: <strong>{globalAddress?.cidade ? `${globalAddress.cidade}/${globalAddress.estado}` : 'Informe seu CEP'}</strong>
            </span>
          </button>

          <div className="header-search" ref={mobileSearchContainerRef}>
            <Search size={18} className="header-search-icon" />
            <input
              type="text"
              className="header-search-input"
              placeholder="O que você procura hoje?..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setMobileSearchFocused(true)}
              onKeyDown={e => {
                if (e.key === 'Escape') setMobileSearchFocused(false)
                if (e.key === 'Enter' && searchQuery.trim()) {
                  recordSearch(searchQuery)
                  setMobileSearchFocused(false)
                  const element = document.getElementById('products')
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' })
                  }
                }
              }}
            />
            {searchQuery && (
              <button
                type="button"
                className="header-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}

            {/* Mobile Predictive Dropdown */}
            {mobileSearchFocused && renderPredictiveDropdown()}
          </div>
        </div>
      </div>

      <style>{`
        .header {
          position: sticky;
          top: 0;
          z-index: var(--z-sticky);
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--dark-100);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }
        .header-topbar {
          background: #090e1a;
          color: #94a3b8;
          font-size: 11.5px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 6px 0;
        }
        .header-topbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .topbar-items {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .topbar-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #cbd5e1;
        }
        .topbar-item.highlight {
          color: #38bdf8;
        }
        .topbar-item.highlight strong {
          color: #4ade80;
        }
        .topbar-icon {
          flex-shrink: 0;
        }
        .topbar-sep {
          color: #475569;
          font-size: 10px;
        }
        .topbar-right {
          color: #94a3b8;
          font-size: 11px;
        }
        .topbar-right strong {
          color: #e2e8f0;
        }
        .header-inner {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          height: 68px;
        }
        .header-logo {
          cursor: pointer;
          flex-shrink: 0;
          transition: opacity var(--transition-fast);
        }
        .header-logo:hover { opacity: 0.85; }

        /* Global CEP Button (Mercado Livre style) */
        .header-cep-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(15, 23, 42, 0.04);
          border: 1px solid var(--dark-200);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          flex-shrink: 0;
        }
        .header-cep-btn:hover {
          background: #ffffff;
          border-color: #38bdf8;
          box-shadow: 0 2px 8px rgba(56, 189, 248, 0.15);
        }
        .header-cep-icon {
          color: #0284c7;
        }
        .header-cep-info {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .header-cep-sub {
          font-size: 10px;
          color: var(--dark-400);
        }
        .header-cep-city {
          font-size: 12px;
          color: var(--dark-800);
          font-weight: 700;
          white-space: nowrap;
        }

        /* Search Bar & Predictive Dropdown */
        .header-search {
          flex: 1;
          position: relative;
          max-width: 540px;
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
          padding: 11px 40px 11px 42px;
          border: 1.5px solid var(--dark-200);
          border-radius: var(--radius-full);
          background: var(--dark-50);
          font-size: var(--text-sm);
          color: var(--dark-800);
          transition: all var(--transition-fast);
        }
        .header-search-input:focus {
          outline: none;
          border-color: #38bdf8;
          box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.15);
          background: #ffffff;
        }
        .header-search-input::placeholder { color: var(--dark-400); font-size: 13px; }
        .header-search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: var(--dark-200);
          border: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--dark-600);
        }

        /* Predictive Dropdown */
        .predictive-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid var(--dark-200);
          border-radius: 14px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          z-index: 1000;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .predictive-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: var(--dark-50);
          border-bottom: 1px solid var(--dark-100);
          font-size: 11px;
          color: var(--dark-500);
          font-weight: 600;
        }
        .predictive-header a {
          color: #0284c7;
          text-decoration: none;
        }
        .predictive-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--dark-50);
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .predictive-item:last-child { border-bottom: none; }
        .predictive-item:hover {
          background: #f8fafc;
        }
        .predictive-img {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          object-fit: cover;
          background: var(--dark-100);
          flex-shrink: 0;
        }
        .predictive-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }
        .predictive-brand-row {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
        }
        .predictive-brand {
          font-weight: 700;
          color: var(--dark-400);
          text-transform: uppercase;
        }
        .predictive-cat {
          color: var(--dark-400);
        }
        .predictive-name {
          font-size: 13px;
          color: var(--dark-800);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .predictive-price-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .predictive-price-pix {
          font-size: 13px;
          font-weight: 800;
          color: #15803d;
        }
        .predictive-price-pix small {
          font-size: 10px;
          font-weight: 500;
          color: #166534;
        }
        .predictive-stock-ok {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          color: #059669;
          font-weight: 600;
        }
        .predictive-stock-out {
          font-size: 10px;
          color: #ef4444;
          font-weight: 600;
        }
        .predictive-empty {
          padding: 24px 16px;
          text-align: center;
          color: var(--dark-500);
          font-size: 13px;
        }
        .predictive-suggestions {
          padding: 16px;
        }
        .predictive-suggestions-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: var(--dark-600);
          margin-bottom: 10px;
        }
        .predictive-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .predictive-tag-chip {
          padding: 5px 12px;
          border-radius: var(--radius-full);
          background: var(--dark-100);
          border: 1px solid var(--dark-200);
          font-size: 12px;
          color: var(--dark-700);
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .predictive-tag-chip:hover {
          background: #38bdf8;
          color: #ffffff;
          border-color: #38bdf8;
        }
        
        /* Recent Searches with individual delete */
        .predictive-recent-chip-wrap {
          display: inline-flex;
          align-items: center;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: var(--radius-full);
          padding-right: 6px;
          transition: all 0.15s ease;
        }
        .predictive-recent-chip-wrap:hover {
          border-color: #38bdf8;
          box-shadow: 0 2px 6px rgba(56, 189, 248, 0.15);
        }
        .predictive-tag-chip.recent {
          background: none;
          border: none;
          color: #0369a1;
          padding: 5px 6px 5px 10px;
        }
        .predictive-recent-del {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          background: rgba(3, 105, 161, 0.1);
          color: #0369a1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .predictive-recent-del:hover {
          background: #ef4444;
          color: #ffffff;
        }
        .predictive-clear-history-btn {
          font-size: 11px;
          color: var(--dark-400);
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 0 4px;
        }
        .predictive-clear-history-btn:hover {
          color: var(--red);
        }

        /* Trending Ranking */
        .predictive-tag-chip.trending-rank {
          background: #ffffff;
          border: 1px solid var(--dark-200);
          padding: 4px 10px;
        }
        .predictive-tag-chip.trending-rank.top-rank {
          border-color: #fdba74;
          background: #fff7ed;
        }
        .predictive-tag-chip.trending-rank.top-rank .rank-num {
          background: #ea580c;
          color: #ffffff;
        }
        .rank-num {
          font-size: 10px;
          font-weight: 800;
          background: var(--dark-200);
          color: var(--dark-700);
          padding: 1px 5px;
          border-radius: 4px;
        }
        .rank-title {
          font-weight: 600;
          color: var(--dark-800);
        }
        .rank-count {
          font-size: 10px;
          color: var(--dark-400);
          margin-left: 2px;
        }
        .predictive-tag-chip.trending-rank:hover .rank-title {
          color: #ffffff;
        }
        .predictive-tag-chip.trending-rank:hover .rank-count {
          color: rgba(255, 255, 255, 0.8);
        }

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
        }
        .header-admin-btn {
          color: #0284c7 !important;
          font-weight: 600;
        }

        /* Mobile Search & CEP */
        .header-mobile-bar {
          padding: 6px 0 10px;
          border-top: 1px solid var(--dark-100);
        }
        .header-mobile-cep-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--dark-700);
          padding: 6px 0;
          background: none;
          border: none;
          cursor: pointer;
          margin-bottom: 6px;
        }
        .header-mobile-cep-btn strong {
          color: #0284c7;
        }
        @media (min-width: 768px) {
          .header-inner { height: 72px; }
          .header-mobile-bar { display: none; }
        }
      `}</style>
    </header>
  )
}
