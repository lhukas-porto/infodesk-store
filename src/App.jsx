import React from 'react'
import { Zap, Flame, Star, ArrowRight } from 'lucide-react'
import { useStore } from './context/StoreContext'
import { categories as categoryList } from './data/initialProducts'
import { getCompanyPublicName } from './services/companyService'
import Header from './components/Header'
import Footer from './components/Footer'
import ProductCard from './components/ProductCard'
import ProductModal from './components/ProductModal'
import CartDrawer from './components/CartDrawer'
import CheckoutModal from './components/CheckoutModal'
import CustomerAccountModal from './components/CustomerAccountModal'
import AdminLoginModal from './components/AdminLoginModal'
import AdminDashboard from './components/AdminDashboard'
import BarcodeScannerModal from './components/BarcodeScannerModal'
import TrustBar from './components/TrustBar'
import BrandCarousel from './components/BrandCarousel'
import ProductSortFilter from './components/ProductSortFilter'
import CepModal from './components/CepModal'
import TrackingModal from './components/TrackingModal'
import PaymentReturnModal from './components/PaymentReturnModal'
import { resolveCurrentTenant } from './services/tenantResolver'
import { getMarketingSettings } from './services/marketingService'
import { applyStoreSeo } from './services/seoManager'
import { initGoogleAnalytics } from './services/analyticsService'
import { captureUtmParameters } from './services/utmTracker'

export default function App() {
  const {
    products,
    filteredProducts, featuredProducts,
    activeCategory, setActiveCategory,
    selectedProduct, setSelectedProduct,
    toast,
    companyData,
  } = useStore()

  const [paymentReturnInfo, setPaymentReturnInfo] = React.useState(null)
  const [marketingSettings, setMarketingSettings] = React.useState(null)

  // 1. Captura inicial de UTMs e resolução de tenant
  React.useEffect(() => {
    // Captura parâmetros de campanhas orgânicas/pagas na sessão
    captureUtmParameters()

    // Resolve o tenant atual e inicializa SEO e GA4
    async function initStoreMarketing() {
      try {
        const tenant = await resolveCurrentTenant()
        const settings = await getMarketingSettings(tenant.tenantId)
        setMarketingSettings(settings)

        // Aplica SEO padrão da loja (Meta tags, Open Graph, Twitter Cards, Schema.org)
        applyStoreSeo({
          ...settings,
          storeName: getCompanyPublicName(companyData),
          companyData
        })

        // Inicializa GA4 se configurado e ativado pelo tenant
        initGoogleAnalytics(settings.analytics_measurement_id, settings.analytics_enabled)
      } catch (err) {
        console.warn('Falha na inicialização do marketing/SEO:', err)
      }
    }

    initStoreMarketing()
  }, [companyData])

  // 2. Sincroniza SEO de volta para a vitrine quando o produto é fechado
  React.useEffect(() => {
    if (!selectedProduct && marketingSettings) {
      applyStoreSeo({
        ...marketingSettings,
        storeName: getCompanyPublicName(companyData),
        companyData
      })
    }
  }, [selectedProduct, marketingSettings, companyData])

  // 3. Suporte a URLs amigáveis com hash: #product-[slug_ou_id]
  React.useEffect(() => {
    function handleProductHashRoute() {
      const hash = window.location.hash || ''
      if (hash.startsWith('#product-') && products?.length > 0) {
        const identifier = hash.replace('#product-', '')
        const found = products.find(p => (p.slug && p.slug === identifier) || String(p.id) === identifier)
        if (found) {
          setSelectedProduct(found)
        }
      }
    }

    handleProductHashRoute()
    window.addEventListener('hashchange', handleProductHashRoute)
    return () => window.removeEventListener('hashchange', handleProductHashRoute)
  }, [products, setSelectedProduct])

  React.useEffect(() => {
    function checkPaymentReturn() {
      const hash = window.location.hash || ''
      const search = window.location.search || ''

      let params = null
      if (hash.includes('payment-return')) {
        const queryStr = hash.split('?')[1] || ''
        params = new URLSearchParams(queryStr)
      } else if (search.includes('order_id') || search.includes('collection_status') || search.includes('status')) {
        params = new URLSearchParams(search)
      }

      if (params) {
        const orderId = params.get('order_id') || params.get('external_reference')
        const status = params.get('status') || params.get('collection_status')
        if (orderId || status) {
          setPaymentReturnInfo({
            orderId: orderId || 'ORD-RECENT',
            status: status || 'pending'
          })
        }
      }
    }

    checkPaymentReturn()
    window.addEventListener('hashchange', checkPaymentReturn)
    return () => window.removeEventListener('hashchange', checkPaymentReturn)
  }, [])

  const publicName = getCompanyPublicName(companyData)

  return (
    <div className="app">
      <Header />

      <main>
        {/* Hero Banner */}
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <div className="hero-badge">
                <Zap size={14} /> Sua Loja Completa · Tudo em um só lugar
              </div>
              <h1 className="hero-title">
                Tudo o que você precisa com a <span className="hero-highlight">qualidade e agilidade</span> que você merece
              </h1>
              <p className="hero-subtitle">
                Eletrônicos, tecnologia, escritório, utilidades, ferramentas e variedades. Se você precisa, a {publicName} tem — com frete rápido dos Correios e pagamento facilitado no Pix, Cartão ou Boleto.
              </p>
              <div className="hero-cta">
                <a href="#products" className="btn btn-primary btn-lg">
                  Explorar Catálogo <ArrowRight size={18} />
                </a>
                <div className="hero-stat">
                  <Flame size={18} />
                  <span><strong>{filteredProducts.length}</strong> produtos disponíveis</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Barra de Confiança & Benefícios (Pilar 1) */}
        <TrustBar />

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="section-featured">
            <div className="container">
              <div className="section-header">
                <h2><Star size={24} /> Destaques da Semana</h2>
                <span className="badge badge-red"><Flame size={12} /> HOT</span>
              </div>
              <div className="featured-scroll">
                {featuredProducts.slice(0, 6).map(product => (
                  <div key={product.id} className="featured-item">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Carrossel de Marcas Oficiais da Informática */}
        <BrandCarousel />

        {/* Category Filter + Product Grid */}
        <section id="products" className="section-products">
          <div className="container">
            <div className="section-header">
              <h2>Nossos Produtos</h2>
              <span className="products-count">{filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Category Chips */}
            <div className="category-chips">
              {categoryList.map(cat => (
                <button
                  key={cat}
                  className={`category-chip ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Barra de Ordenação e Filtros Facetados (Fase 3) */}
            <ProductSortFilter />

            {/* Grid */}
            {filteredProducts.length > 0 ? (
              <div className="product-grid" style={{ marginTop: 'var(--space-2)' }}>
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Nenhum produto encontrado nesta categoria ou faixa de preço.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {/* Modals & Drawers */}
      <ProductModal />
      <CartDrawer />
      <CheckoutModal />
      <CustomerAccountModal />
      <AdminLoginModal />
      <AdminDashboard />
      <BarcodeScannerModal />
      <CepModal />
      <TrackingModal />
      {paymentReturnInfo && (
        <PaymentReturnModal
          orderId={paymentReturnInfo.orderId}
          statusParam={paymentReturnInfo.status}
          onClose={() => {
            setPaymentReturnInfo(null)
            window.location.hash = ''
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
          {toast.message}
        </div>
      )}

      <style>{`
        .app { min-height: 100vh; display: flex; flex-direction: column; }
        main { flex: 1; }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, var(--dark-950) 0%, var(--dark-900) 50%, #1a2744 100%);
          padding: var(--space-16) 0;
          overflow: hidden;
          position: relative;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -20%;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--lime-glow-strong), transparent 70%);
          pointer-events: none;
        }
        .hero::after {
          content: '';
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--red-glow), transparent 70%);
          pointer-events: none;
        }
        .hero-content { position: relative; z-index: 1; max-width: 640px; }
        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: var(--lime-glow);
          color: var(--lime);
          border-radius: var(--radius-full);
          font-size: var(--text-sm);
          font-weight: 600;
          margin-bottom: var(--space-4);
          animation: float 3s ease-in-out infinite;
        }
        .hero-title {
          font-size: var(--text-4xl);
          color: var(--white);
          margin-bottom: var(--space-4);
          line-height: 1.15;
        }
        @media (min-width: 768px) {
          .hero-title { font-size: var(--text-5xl); }
        }
        .hero-highlight {
          background: linear-gradient(135deg, var(--lime), var(--lime-light));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-subtitle {
          font-size: var(--text-lg);
          color: var(--dark-400);
          margin-bottom: var(--space-6);
          line-height: 1.6;
        }
        .hero-cta {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          flex-wrap: wrap;
        }
        .hero-stat {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--dark-400);
          font-size: var(--text-sm);
        }
        .hero-stat svg { color: var(--amber); }
        .hero-stat strong { color: var(--white); }

        /* Sections */
        .section-featured {
          padding: var(--space-12) 0;
        }
        .section-products {
          padding: var(--space-8) 0 var(--space-16);
        }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-6);
        }
        .section-header h2 {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-2xl);
        }
        .products-count {
          font-size: var(--text-sm);
          color: var(--dark-400);
        }
        .featured-scroll {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: var(--space-5);
        }

        .toast-error {
          background: var(--red) !important;
        }
      `}</style>
    </div>
  )
}
