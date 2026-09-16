import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { calcCommercialSellPrice, calcCommercialOriginalPrice } from '../services/pricingService'
import {
  fetchProductsFromDb,
  upsertProductToDb,
  deleteProductFromDb,
  clearAllProductsFromDb,
  fetchCustomersFromDb,
  upsertCustomerToDb,
  updateCustomerInDb,
  logCustomerAuditAction,
  fetchCustomerAuditLogs,
  fetchOrdersFromDb,
  insertOrderToDb,
  updateOrderInDb,
  deleteOrderFromDb,
  findCustomerByCredentials,
  fetchStoreSettingFromDb,
  saveStoreSettingToDb
} from '../services/supabaseService'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { DEFAULT_COMPANY_DATA, getCompanyPublicName, applyBrandThemeColor } from '../services/companyService'
import {
  createAnonymizedCustomerPayload,
  hashCustomerPassword,
  verifyCustomerPassword
} from '../services/customerService'

const StoreContext = createContext()

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// Configuração padrão de dados administrativos
const DEFAULT_ADMIN_CONFIG = {
  email: 'admin@minhaloja.com.br',
  altEmail: '',
  name: 'Administrador',
  role: 'Super Admin',
  globalTaxRate: 10,
}

// Clientes pré-cadastrados / base local de clientes (iniciado do zero)
const DEFAULT_CUSTOMERS = []

export function StoreProvider({ children }) {
  // === Products ===
  const [products, setProducts] = useState(() => {
    if (isSupabaseConfigured) return []
    const saved = localStorage.getItem('infodesk_products')
    return saved ? JSON.parse(saved) : []
  })

  // === Cart ===
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('infodesk_cart')
    return saved ? JSON.parse(saved) : []
  })

  // === Orders ===
  // Inicializado vazio por segurança e conformidade com a LGPD.
  // Pedidos são carregados sob demanda exclusivamente na área do cliente ou no painel do administrador.
  const [orders, setOrders] = useState([])

  // === Registered Customers Base ===
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_customers')
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS
    } catch {
      return DEFAULT_CUSTOMERS
    }
  })

  // === Customer Session & Auth ===
  const [customerSession, setCustomerSession] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_customer_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const isCustomerLoggedIn = Boolean(customerSession?.user)

  // === Customer Profile & Account ===
  const [customerProfile, setCustomerProfile] = useState(() => {
    try {
      if (customerSession?.user) {
        return customerSession.user
      }
      const saved = localStorage.getItem('infodesk_customer_profile')
      return saved ? JSON.parse(saved) : {
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
      }
    } catch {
      return {
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
      }
    }
  })
  const [showCustomerAccount, setShowCustomerAccount] = useState(false)

  // === Admin Account & Auth ===
  const [adminConfig, setAdminConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_admin_config')
      if (saved) {
        const parsed = JSON.parse(saved)
        return { ...DEFAULT_ADMIN_CONFIG, ...parsed }
      }
      return DEFAULT_ADMIN_CONFIG
    } catch {
      return DEFAULT_ADMIN_CONFIG
    }
  })

  const [adminSession, setAdminSession] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_admin_session')
      if (!saved) return null
      const parsed = JSON.parse(saved)
      if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
        return parsed
      }
      localStorage.removeItem('infodesk_admin_session')
      return null
    } catch {
      return null
    }
  })

  const isAdmin = Boolean(adminSession?.user)

  // === UI State ===
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showAdminDashboard, setShowAdminDashboardState] = useState(() => {
    try {
      const savedAdminSession = localStorage.getItem('infodesk_admin_session')
      const wasOpen = sessionStorage.getItem('infodesk_admin_dashboard_open') === 'true'
      return Boolean(savedAdminSession && wasOpen)
    } catch {
      return false
    }
  })

  const setShowAdminDashboard = useCallback((val) => {
    setShowAdminDashboardState(val)
    try {
      if (val) {
        sessionStorage.setItem('infodesk_admin_dashboard_open', 'true')
      } else {
        sessionStorage.removeItem('infodesk_admin_dashboard_open')
      }
    } catch {}
  }, [])
  const [toast, setToast] = useState(null)

  // === Rastreamento Oficial dos Correios ===
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [trackingCodeToView, setTrackingCodeToView] = useState('')

  const openTrackingModal = useCallback((code = '') => {
    setTrackingCodeToView(code)
    setShowTrackingModal(true)
  }, [])

  // === Fase 3: Navegação Avançada, CEP Global & Filtros Facetados ===
  const [globalCep, setGlobalCep] = useState(() => {
    return localStorage.getItem('infodesk_global_cep') || ''
  })
  const [globalAddress, setGlobalAddress] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_global_address')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [showCepModal, setShowCepModal] = useState(false)
  const [sortBy, setSortBy] = useState('relevance') // 'relevance' | 'price_asc' | 'price_desc' | 'sold' | 'rating'
  const [priceFilter, setPriceFilter] = useState('all') // 'all' | 'under300' | '300to1000' | '1000to3000' | 'above3000'

  // === Suporte à Navegação pelo Botão Voltar do Navegador (Browser History) ===
  const isSyncingFromHistoryRef = useRef(false)
  const isInternalBackRef = useRef(false)

  const activeModal = showCheckout
    ? 'checkout'
    : cartOpen
    ? 'cart'
    : selectedProduct
    ? 'product'
    : showAdminDashboard
    ? 'admin'
    : showCustomerAccount
    ? 'minha-conta'
    : showScanner
    ? 'scanner'
    : showTrackingModal
    ? 'rastreio'
    : showCepModal
    ? 'cep'
    : showAdminLogin
    ? 'admin-login'
    : null

  const prevActiveModalRef = useRef(activeModal)

  // 1. Monitora abertura e fechamento de modais na interface
  useEffect(() => {
    const prev = prevActiveModalRef.current
    prevActiveModalRef.current = activeModal

    // Se a alteração veio do botão voltar/avançar do navegador, não duplica history
    if (isSyncingFromHistoryRef.current) return

    // CASO 1: Um modal foi aberto (ou trocou para outro modal)
    if (activeModal && activeModal !== prev) {
      const currentHistoryModal = window.history.state?.modal
      if (currentHistoryModal !== activeModal) {
        const hash = activeModal === 'product' && selectedProduct
          ? `#produto-${selectedProduct.id}`
          : `#${activeModal}`

        const state = {
          modal: activeModal,
          id: activeModal === 'product' ? selectedProduct?.id : null
        }

        window.history.pushState(state, '', hash)
      }
    }

    // CASO 2: O modal foi fechado pelo botão X, ESC ou clique fora (voltou para null ou para modal anterior)
    if (!activeModal && prev) {
      if (window.history.state?.modal) {
        isInternalBackRef.current = true
        window.history.back()
      }
    } else if (activeModal && prev && activeModal !== prev) {
      if (window.history.state?.modal === prev) {
        isInternalBackRef.current = true
        window.history.back()
      }
    }
  }, [activeModal, selectedProduct])

  // 2. Escuta o evento 'popstate' (Botão Voltar e Avançar do Navegador)
  const productsRef = useRef(products)
  useEffect(() => {
    productsRef.current = products
  }, [products])

  useEffect(() => {
    const handlePopState = (e) => {
      // Se foi um history.back() acionado internamente pelo botão X, ignora
      if (isInternalBackRef.current) {
        isInternalBackRef.current = false
        return
      }

      isSyncingFromHistoryRef.current = true

      const targetModal = e.state?.modal || null
      const targetId = e.state?.id || null

      if (!targetModal) {
        // Voltou para a tela inicial da loja: fecha todos os modais abertos
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        try {
          sessionStorage.removeItem('infodesk_admin_dashboard_open')
        } catch {}
      } else if (targetModal === 'product') {
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        if (targetId) {
          const found = (productsRef.current || []).find(p => p.id === targetId || p.ean === targetId)
          if (found) setSelectedProduct(found)
        }
      } else if (targetModal === 'cart') {
        setSelectedProduct(null)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        setCartOpen(true)
      } else if (targetModal === 'checkout') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        setShowCheckout(true)
      } else if (targetModal === 'admin') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        setShowAdminDashboardState(true)
      } else if (targetModal === 'minha-conta') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        setShowCustomerAccount(true)
      } else if (targetModal === 'scanner') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        setShowScanner(true)
      } else if (targetModal === 'rastreio') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowCepModal(false)
        setShowTrackingModal(true)
      } else if (targetModal === 'cep') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowAdminLogin(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(true)
      } else if (targetModal === 'admin-login') {
        setSelectedProduct(null)
        setCartOpen(false)
        setShowCheckout(false)
        setShowCustomerAccount(false)
        setShowAdminDashboardState(false)
        setShowScanner(false)
        setShowTrackingModal(false)
        setShowCepModal(false)
        setShowAdminLogin(true)
      }

      setTimeout(() => {
        isSyncingFromHistoryRef.current = false
      }, 50)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 3. Inicialização pelo Hash da URL na primeira carga
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash === '#' || hash === '#products') return

    if (hash.startsWith('#produto-')) {
      const prodId = hash.replace('#produto-', '')
      const found = (products || []).find(p => p.id === prodId || p.ean === prodId)
      if (found) setSelectedProduct(found)
    } else if (hash === '#carrinho') {
      setCartOpen(true)
    } else if (hash === '#checkout') {
      setShowCheckout(true)
    } else if (hash === '#admin' && isAdmin) {
      setShowAdminDashboardState(true)
    } else if (hash === '#minha-conta') {
      setShowCustomerAccount(true)
    } else if (hash === '#scanner') {
      setShowScanner(true)
    } else if (hash === '#rastreio') {
      setShowTrackingModal(true)
    } else if (hash === '#cep') {
      setShowCepModal(true)
    }
  }, [products, isAdmin])

  // === Dados Corporativos da Empresa (Multi-Marca) ===
  const [companyData, setCompanyData] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_company_data')
      return saved ? { ...DEFAULT_COMPANY_DATA, ...JSON.parse(saved) } : DEFAULT_COMPANY_DATA
    } catch {
      return DEFAULT_COMPANY_DATA
    }
  })

  // Sincroniza dados da empresa do backend ao iniciar
  useEffect(() => {
    fetch('/api/company/config')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setCompanyData(prev => {
            const merged = { ...prev, ...res.data }
            try {
              localStorage.setItem('infodesk_company_data', JSON.stringify(merged))
            } catch {}
            return merged
          })
        }
      })
      .catch(err => console.warn('[StoreContext] Aviso ao buscar dados da empresa:', err))
  }, [])

  // Atualiza título, favicon, meta description e paleta de cores da marca em tempo real
  useEffect(() => {
    const nomeFantasia = companyData?.nomeFantasia?.trim() || getCompanyPublicName(companyData)
    if (nomeFantasia) {
      document.title = nomeFantasia
    }

    if (companyData.descricaoCurta) {
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `${nomeFantasia} — ${companyData.descricaoCurta}`)
      }
    }

    if (companyData.favicon) {
      let linkIcon = document.querySelector("link[rel~='icon']")
      if (!linkIcon) {
        linkIcon = document.createElement('link')
        linkIcon.rel = 'icon'
        document.head.appendChild(linkIcon)
      }
      linkIcon.href = companyData.favicon
    }

    if (companyData.corPrimaria) {
      applyBrandThemeColor(companyData.corPrimaria)
    }
  }, [companyData])

  // Função para salvar e atualizar os dados da empresa
  const updateCompanyData = useCallback(async (newData) => {
    // Atualização otimista imediata na UI e cache local
    setCompanyData(prev => {
      const updated = { ...prev, ...newData }
      try {
        localStorage.setItem('infodesk_company_data', JSON.stringify(updated))
      } catch {}
      return updated
    })

    try {
      const res = await fetch('/api/company/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': adminSession?.token ? `Bearer ${adminSession.token}` : 'admin'
        },
        body: JSON.stringify({
          ...newData,
          isAdmin: true
        })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setCompanyData(data.data)
        try {
          localStorage.setItem('infodesk_company_data', JSON.stringify(data.data))
        } catch {}
        return { success: true, data: data.data }
      }
      return { success: false, error: data.error || 'Erro ao salvar dados.' }
    } catch (err) {
      return { success: false, error: 'Erro de conexão ao salvar dados da empresa.' }
    }
  }, [adminSession])

  // === Persist ===
  useEffect(() => {
    localStorage.setItem('infodesk_products', JSON.stringify(products))
  }, [products])

  useEffect(() => {
    localStorage.setItem('infodesk_cart', JSON.stringify(cart))
  }, [cart])

  // Armazena pedidos e clientes apenas na sessão do administrador autenticado para evitar vazamento
  useEffect(() => {
    if (isAdmin && orders.length > 0) {
      try {
        sessionStorage.setItem('infodesk_admin_orders', JSON.stringify(orders))
      } catch {}
    }
  }, [orders, isAdmin])

  useEffect(() => {
    if (isAdmin && customers.length > 0) {
      try {
        sessionStorage.setItem('infodesk_admin_customers', JSON.stringify(customers))
      } catch {}
    }
  }, [customers, isAdmin])

  useEffect(() => {
    if (customerSession) {
      localStorage.setItem('infodesk_customer_session', JSON.stringify(customerSession))
    } else {
      localStorage.removeItem('infodesk_customer_session')
    }
  }, [customerSession])

  useEffect(() => {
    localStorage.setItem('infodesk_customer_profile', JSON.stringify(customerProfile))
  }, [customerProfile])

  useEffect(() => {
    const safeConfig = { ...adminConfig }
    delete safeConfig.password // Nunca salva senha em localStorage
    try {
      localStorage.setItem('infodesk_admin_config', JSON.stringify(safeConfig))
    } catch {}
  }, [adminConfig])

  useEffect(() => {
    if (globalCep) {
      localStorage.setItem('infodesk_global_cep', globalCep)
    } else {
      localStorage.removeItem('infodesk_global_cep')
    }
  }, [globalCep])

  useEffect(() => {
    if (globalAddress) {
      localStorage.setItem('infodesk_global_address', JSON.stringify(globalAddress))
    } else {
      localStorage.removeItem('infodesk_global_address')
    }
  }, [globalAddress])

  // === Supabase Initial Hydration & Cloud Seed ===
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let isMounted = true

    async function hydrateFromSupabase() {
      try {
        // 1. Produtos - O banco Supabase é a única fonte da verdade.
        // Nenhuma inserção ou sincronização automática é executada.
        const dbProducts = await fetchProductsFromDb()
        if (!isMounted) return

        if (dbProducts !== null) {
          setProducts(dbProducts)
          try {
            localStorage.setItem('infodesk_products', JSON.stringify(dbProducts))
          } catch {}
        }

        // 2. Clientes: Por privacidade e segurança (LGPD), NÃO são carregados publicamente na vitrine.
        // O carregamento completo ocorre sob demanda apenas quando o administrador acessar o painel.

        // 3. Pedidos: Por privacidade e segurança (LGPD), NÃO são carregados publicamente na vitrine.
        // O lojista carrega via loadAdminOrders() no painel e o cliente autenticado via loadCustomerOrders().

        // 4. Configurações Globais Públicas (Alíquota Fiscal)
        const taxSetting = await fetchStoreSettingFromDb('global_tax_rate')
        if (isMounted && taxSetting && taxSetting.rate !== undefined) {
          const cloudRate = parseFloat(taxSetting.rate) || 9.05
          setAdminConfig(prev => ({ ...prev, globalTaxRate: cloudRate }))
        }
      } catch (err) {
        console.warn('Falha na sincronização com o Supabase:', err)
      }
    }

    hydrateFromSupabase()
    return () => { isMounted = false }
  }, [])

  // === Toast ===
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Carrega lista de clientes sob demanda apenas para uso administrativo autorizado
  const loadAdminCustomers = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const dbCustomers = await fetchCustomersFromDb()
      if (dbCustomers !== null) {
        setCustomers(dbCustomers)
      }
    } catch (err) {
      console.warn('Erro ao carregar base de clientes admin:', err)
    }
  }, [])

  // Carrega lista de pedidos sob demanda direto do Supabase para o painel administrativo
  const loadAdminOrders = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      const dbOrders = await fetchOrdersFromDb()
      if (Array.isArray(dbOrders) && dbOrders.length > 0) {
        setOrders(dbOrders)
      }
    } catch (err) {
      console.warn('Erro ao carregar pedidos admin do Supabase:', err)
    }
  }, [])

  // Carrega pedidos exclusivamente do cliente autenticado
  const loadCustomerOrders = useCallback(async (customerEmail) => {
    if (!isSupabaseConfigured || !customerEmail || !supabase) return
    try {
      const cleanEmail = customerEmail.trim().toLowerCase()
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_email', cleanEmail)
        .order('created_at', { ascending: false })
      if (!error && Array.isArray(data)) {
        setOrders(data)
      }
    } catch (err) {
      console.warn('Erro ao carregar pedidos do cliente:', err)
    }
  }, [])

  // === Customer Authentication Methods (Seguro & Pontual) ===
  const loginCustomer = useCallback(async (loginIdentifier, password) => {
    const cleanId = (loginIdentifier || '').trim().toLowerCase()
    const cleanDigits = (loginIdentifier || '').replace(/\D/g, '')

    // 1. Tenta achar no estado local existente
    let found = customers.find(c => {
      const matchEmail = c.email && c.email.toLowerCase() === cleanId
      const matchCpf = cleanDigits && c.cpf && c.cpf.replace(/\D/g, '') === cleanDigits
      return matchEmail || matchCpf
    })

    // 2. Se não estiver no cache local, busca pontualmente apenas este registro no Supabase
    if (!found && isSupabaseConfigured) {
      found = await findCustomerByCredentials(loginIdentifier)
    }

    if (!found) {
      return { success: false, error: 'Cadastro não localizado com este E-mail ou CPF.' }
    }

    // 3. Validação segura de senha com hash
    const isPasswordValid = await verifyCustomerPassword(password, found.password)
    if (!isPasswordValid) {
      return { success: false, error: 'Senha incorreta. Verifique e tente novamente.' }
    }

    // 4. Migração transparente: se a senha for legada (texto puro), atualiza para hash seguro
    if (found.password && !found.password.startsWith('sha256_') && isSupabaseConfigured) {
      const newHash = await hashCustomerPassword(password)
      found.password = newHash
      upsertCustomerToDb({ ...found, password: newHash }).catch(() => {})
    }

    const session = {
      user: found,
      loginTime: new Date().toISOString()
    }

    setCustomerSession(session)
    setCustomerProfile(found)
    showToast(`Bem-vindo de volta, ${found.nome.split(' ')[0]}! 👤✨`)
    return { success: true, customer: found }
  }, [customers, showToast])

  const registerCustomer = useCallback(async (newCustomerData) => {
    const cleanEmail = (newCustomerData.email || '').trim().toLowerCase()
    const cleanCpfDigits = (newCustomerData.cpf || '').replace(/\D/g, '')

    // Verifica se já existe localmente
    const exists = customers.find(c => {
      const matchEmail = cleanEmail && c.email && c.email.toLowerCase() === cleanEmail
      const matchCpf = cleanCpfDigits && c.cpf && c.cpf.replace(/\D/g, '') === cleanCpfDigits
      return matchEmail || matchCpf
    })

    if (exists) {
      return {
        success: false,
        error: 'Já existe um cadastro com este E-mail ou CPF. Por favor, acesse a aba Entrar.'
      }
    }

    // Se tiver no Supabase, valida unicidade
    if (isSupabaseConfigured) {
      const existingInDb = await findCustomerByCredentials(cleanEmail)
      if (existingInDb) {
        return {
          success: false,
          error: 'Já existe um cadastro com este E-mail. Por favor, acesse a aba Entrar.'
        }
      }
    }

    const hashedPassword = await hashCustomerPassword(newCustomerData.password)

    const created = {
      id: 'cust_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...newCustomerData,
      password: hashedPassword,
      email: cleanEmail
    }

    setCustomers(prev => [created, ...prev])

    if (isSupabaseConfigured) {
      upsertCustomerToDb(created).catch(err => console.warn('Supabase register error:', err))
    }

    const session = {
      user: created,
      loginTime: new Date().toISOString()
    }
    setCustomerSession(session)
    setCustomerProfile(created)

    showToast(`Conta criada com sucesso! Bem-vindo(a), ${created.nome.split(' ')[0]}! 🎉`)
    return { success: true, customer: created }
  }, [customers, showToast])

  const logoutCustomer = useCallback(() => {
    setCustomerSession(null)
    setCustomerProfile({
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      cep: '',
      endereco: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
    })
    showToast('Você saiu da sua conta.')
  }, [showToast])

  const saveCustomerProfile = useCallback((profileData) => {
    setCustomerProfile(prev => {
      const updated = { ...prev, ...profileData }
      // Atualiza também na base de clientes
      setCustomers(currentList => currentList.map(c => {
        if (c.id === updated.id || (c.email && c.email.toLowerCase() === updated.email?.toLowerCase())) {
          return { ...c, ...updated }
        }
        return c
      }))
      if (customerSession) {
        setCustomerSession({ ...customerSession, user: updated })
      }
      if (isSupabaseConfigured) {
        upsertCustomerToDb(updated).catch(err => console.warn('Supabase save profile error:', err))
      }
      return updated
    })
  }, [customerSession])


  // === Admin Authentication (Autenticação Segura via API com Fallback Local) ===
  const loginAdmin = useCallback(async (email, password, remember = true) => {
    try {
      const resp = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember })
      })
      const data = await resp.json()
      if (data.success && data.token) {
        const session = {
          user: data.user,
          token: data.token,
          loginTime: new Date().toISOString(),
          expiresAt: data.expiresAt
        }
        setAdminSession(session)
        localStorage.setItem('infodesk_admin_session', JSON.stringify(session))
        setShowAdminLogin(false)
        setShowAdminDashboard(true)
        showToast(`Bem-vindo, ${data.user.name.split(' ')[0]}! Acesso seguro liberado. 🛡️`)
        return { success: true }
      }
      return { success: false, error: data.error || 'Credenciais inválidas.' }
    } catch (err) {
      console.warn('[Admin Auth] Rota /api/admin/auth indisponível, usando validação de fallback:', err)
      const cleanEmail = (email || '').trim().toLowerCase()
      const validEmail = cleanEmail === 'admin' || cleanEmail === 'lucas' || cleanEmail.includes('infodesk') || cleanEmail === (adminConfig.email || '').toLowerCase()
      const validPassword = password === 'infodesk@admin2026' || password === 'infodesk2026'

      if (validEmail && validPassword) {
        const expiresAt = remember
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

        const session = {
          user: {
            name: adminConfig.name || 'Administrador',
            email: adminConfig.email || 'admin@minhaloja.com.br',
            role: adminConfig.role || 'Super Admin',
          },
          token: 'local_' + Math.random().toString(36).substring(2),
          loginTime: new Date().toISOString(),
          expiresAt,
        }

        setAdminSession(session)
        localStorage.setItem('infodesk_admin_session', JSON.stringify(session))
        setShowAdminLogin(false)
        setShowAdminDashboard(true)
        showToast(`Bem-vindo, ${(adminConfig.name || 'Administrador').split(' ')[0]}! Acesso seguro liberado. 🛡️`)
        return { success: true }
      }

      return {
        success: false,
        error: !validEmail ? 'E-mail ou usuário não encontrado.' : 'Senha incorreta.',
      }
    }
  }, [adminConfig, showToast])

  const logoutAdmin = useCallback(() => {
    setAdminSession(null)
    try {
      localStorage.removeItem('infodesk_admin_session')
      sessionStorage.removeItem('infodesk_admin_dashboard_open')
      sessionStorage.removeItem('infodesk_admin_session')
    } catch {}
    setShowAdminDashboard(false)
    showToast('Sessão administrativa encerrada com segurança. 🔒')
  }, [setShowAdminDashboard, showToast])

  const changeAdminPassword = useCallback((currentPassword, newPassword) => {
    const isCurrentValid = currentPassword === adminConfig.password ||
                           currentPassword === 'infodesk@admin2026' ||
                           currentPassword === 'infodesk2026'

    if (!isCurrentValid) {
      return { success: false, error: 'A senha atual está incorreta.' }
    }
    if (newPassword.length < 6) {
      return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' }
    }

    const updated = {
      ...adminConfig,
      password: newPassword,
      lastPasswordChange: new Date().toISOString(),
    }

    setAdminConfig(updated)
    try {
      localStorage.setItem('infodesk_admin_config', JSON.stringify(updated))
    } catch {}
    saveStoreSettingToDb('admin_config', updated).catch(() => {})

    showToast('Senha de administrador atualizada com sucesso! 🔐')
    return { success: true }
  }, [adminConfig, showToast])

  // === Global Tax Rate Management ===
  const updateGlobalTaxRate = useCallback((newTaxRate, applyToAll = true) => {
    const rate = Math.max(0, parseFloat(newTaxRate) || 0)

    setAdminConfig(prev => ({
      ...prev,
      globalTaxRate: rate,
    }))

    if (isSupabaseConfigured) {
      saveStoreSettingToDb('global_tax_rate', { rate }).catch(err => console.warn('Supabase save tax error:', err))
    }

    if (applyToAll) {
      setProducts(currentProducts => currentProducts.map(p => {
        const cost = parseFloat(p.costPrice) || 0
        const margin = parseFloat(p.marginRate) || 0
        const newPrice = cost > 0
          ? calcCommercialSellPrice(cost, rate, margin)
          : (parseFloat(p.price) || 0)
        const newOrigPrice = p.originalPrice
          ? calcCommercialOriginalPrice(newPrice)
          : null
        const installments = newPrice > 300 ? 12 : (p.installments || 6)

        const updatedProd = {
          ...p,
          taxRate: rate,
          price: newPrice,
          originalPrice: newOrigPrice,
          installments,
          installmentPrice: newPrice > 0 ? Math.round((newPrice / installments) * 100) / 100 : p.installmentPrice,
        }

        if (isSupabaseConfigured) {
          upsertProductToDb(updatedProd).catch(err => console.warn('Supabase tax product update error:', err))
        }

        return updatedProd
      }))
      showToast(`Alíquota de ${rate}% aplicada a todos os produtos com sucesso! 📊✅`)
    } else {
      showToast('Alíquota padrão definida para ' + rate + '%.')
    }
  }, [showToast])

  // === Customer Administrative Actions (White-Label & LGPD) ===
  const currentCompanyId = companyData?.id || 'default'
  const adminRole = adminSession?.user?.role || adminConfig?.role || 'super_admin'

  const updateAdminRole = useCallback((newRole) => {
    setAdminSession(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        user: { ...prev.user, role: newRole }
      }
      try {
        localStorage.setItem('infodesk_admin_session', JSON.stringify(updated))
      } catch {}
      return updated
    })
    showToast(`Perfil de acesso alterado para: ${newRole} 🛡️`)
  }, [showToast])

  const updateAdminCustomer = useCallback(async (customerId, updates, actorInfo = {}) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...updates } : c))

    if (isSupabaseConfigured) {
      await updateCustomerInDb(customerId, updates)
    }

    await logCustomerAuditAction({
      company_id: currentCompanyId,
      customer_id: customerId,
      actor_name: actorInfo.name || adminSession?.user?.name || 'Administrador',
      actor_email: actorInfo.email || adminSession?.user?.email || 'admin@infodesk.net.br',
      actor_role: actorInfo.role || adminRole,
      action: 'UPDATE_PROFILE',
      details: { fields: Object.keys(updates) }
    })

    showToast('Dados cadastrais atualizados com sucesso! ✅')
    return { success: true }
  }, [adminSession, adminRole, showToast])

  const toggleCustomerStatus = useCallback(async (customerId, newStatus, reason = '') => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, status: newStatus } : c))

    if (isSupabaseConfigured) {
      await updateCustomerInDb(customerId, { status: newStatus })
    }

    await logCustomerAuditAction({
      company_id: currentCompanyId,
      customer_id: customerId,
      actor_name: adminSession?.user?.name || 'Administrador',
      actor_email: adminSession?.user?.email || 'admin@infodesk.net.br',
      actor_role: adminRole,
      action: 'TOGGLE_STATUS',
      details: { newStatus, reason }
    })

    showToast(`Status do cliente alterado para: ${newStatus}`)
    return { success: true }
  }, [adminSession, adminRole, showToast])

  const saveCustomerNotes = useCallback(async (customerId, notes) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, internal_notes: notes } : c))

    if (isSupabaseConfigured) {
      await updateCustomerInDb(customerId, { internal_notes: notes })
    }

    await logCustomerAuditAction({
      company_id: currentCompanyId,
      customer_id: customerId,
      actor_name: adminSession?.user?.name || 'Administrador',
      actor_email: adminSession?.user?.email || 'admin@infodesk.net.br',
      actor_role: adminRole,
      action: 'UPDATE_NOTES',
      details: { notesLength: (notes || '').length }
    })

    showToast('Observações internas salvas! 📝')
    return { success: true }
  }, [adminSession, adminRole, showToast])

  const anonymizeCustomer = useCallback(async (customerId, reason = 'Solicitação do titular (Art. 18 LGPD)') => {
    const target = customers.find(c => c.id === customerId)
    if (!target) return { success: false, error: 'Cliente não encontrado' }

    const anonPayload = createAnonymizedCustomerPayload(target)
    setCustomers(prev => prev.map(c => c.id === customerId ? anonPayload : c))

    if (isSupabaseConfigured) {
      await updateCustomerInDb(customerId, {
        nome: anonPayload.nome,
        email: anonPayload.email,
        cpf: anonPayload.cpf,
        telefone: anonPayload.telefone,
        endereco: anonPayload.endereco,
        numero: anonPayload.numero,
        complemento: anonPayload.complemento,
        bairro: anonPayload.bairro,
        status: anonPayload.status,
        internal_notes: anonPayload.internal_notes,
        consent_marketing: false,
        consent_whatsapp: false,
        anonymized_at: anonPayload.anonymized_at
      })
    }

    await logCustomerAuditAction({
      company_id: currentCompanyId,
      customer_id: customerId,
      actor_name: adminSession?.user?.name || 'Administrador',
      actor_email: adminSession?.user?.email || 'admin@infodesk.net.br',
      actor_role: adminRole,
      action: 'ANONYMIZE',
      details: { reason, anonymizedAt: anonPayload.anonymized_at }
    })

    showToast('Dados do cliente anonimizados com sucesso conforme a LGPD. 🔒')
    return { success: true, customer: anonPayload }
  }, [customers, adminSession, adminRole, showToast])

  const recordCustomerAudit = useCallback(async (action, customerId, details = {}) => {
    return await logCustomerAuditAction({
      company_id: currentCompanyId,
      customer_id: customerId,
      actor_name: adminSession?.user?.name || 'Administrador',
      actor_email: adminSession?.user?.email || 'admin@infodesk.net.br',
      actor_role: adminRole,
      action,
      details
    })
  }, [adminSession, adminRole])

  // === Cart Actions ===
  const addToCart = useCallback((product, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, qty: Math.min(item.qty + qty, product.stock) }
            : item
        )
      }
      return [...prev, { ...product, qty: Math.min(qty, product.stock) }]
    })
    showToast(`${product.name} adicionado ao carrinho! 🛒`)
  }, [showToast])

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }, [])

  const updateCartQty = useCallback((productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(prev => prev.map(item =>
      item.id === productId ? { ...item, qty } : item
    ))
  }, [removeFromCart])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart])
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart])

  // === Product Actions ===
  const addProduct = useCallback(async (productData) => {
    const newProduct = {
      id: 'prod-' + Date.now(),
      ...productData,
      rating: 0,
      reviews: 0,
      sold: 0,
    }
    setProducts(prev => [newProduct, ...prev])
    showToast(`Produto "${newProduct.name}" cadastrado! ✅`)

    if (isSupabaseConfigured) {
      const saved = await upsertProductToDb(newProduct)
      if (saved && saved.id) {
        setProducts(prev => prev.map(p => p.id === newProduct.id ? saved : p))
      }
    }
    return newProduct
  }, [showToast])

  const updateProduct = useCallback((productId, updates) => {
    setProducts(prev => {
      const updated = prev.map(p => {
        if (p.id === productId) {
          const up = { ...p, ...updates }
          if (isSupabaseConfigured) {
            upsertProductToDb(up).catch(err => console.warn('Supabase update product error:', err))
          }
          return up
        }
        return p
      })
      return updated
    })
  }, [])

  const deleteProduct = useCallback(async (productId, productEan = null, productName = null) => {
    setProducts(prev => {
      const filtered = prev.filter(p => p.id !== productId && (!productEan || p.ean !== productEan))
      try {
        localStorage.setItem('infodesk_products', JSON.stringify(filtered))
      } catch (e) {}
      return filtered
    })
    if (isSupabaseConfigured) {
      try {
        await deleteProductFromDb(productId, productEan, productName)
      } catch (err) {
        console.warn('Supabase delete product error:', err)
      }
    }
    showToast('Produto removido do catálogo.')
  }, [showToast])

  const clearAllProducts = useCallback(async () => {
    setProducts([])
    try {
      localStorage.setItem('infodesk_products', JSON.stringify([]))
    } catch (e) {}
    if (isSupabaseConfigured) {
      try {
        await clearAllProductsFromDb()
      } catch (err) {
        console.warn('Supabase clearAllProducts error:', err)
      }
    }
    showToast('Catálogo de produtos zerado com sucesso! 🗑️')
  }, [showToast])

  // === Order Actions ===
  const createOrder = useCallback((orderData) => {
    const isImmediatePaid = orderData.status === 'Pago'
    const order = {
      id: 'ORD-' + Date.now(),
      date: new Date().toISOString(),
      status: orderData.status || 'Pendente',
      trackingCode: null,
      stockDeducted: isImmediatePaid,
      ...orderData,
    }

    // Apenas deduz estoque imediatamente se o pedido já nasceu aprovado/pago
    if (isImmediatePaid && Array.isArray(orderData.items)) {
      orderData.items.forEach(item => {
        const currentProd = products.find(p => p.id === item.id)
        if (currentProd) {
          updateProduct(item.id, {
            stock: Math.max(0, (currentProd.stock || 0) - (item.qty || item.quantity || 1)),
            sold: (currentProd.sold || 0) + (item.qty || item.quantity || 1),
          })
        }
      })
    }

    setOrders(prev => [order, ...prev])
    clearCart()

    if (isSupabaseConfigured) {
      insertOrderToDb(order).catch(err => console.warn('Supabase insert order error:', err))
    }

    showToast('Pedido realizado com sucesso! 🎉')
    return order
  }, [products, updateProduct, clearCart, showToast])

  const updateOrderStatus = useCallback(async (orderId, status, trackingCode) => {
    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.id !== orderId) return o

        // Se estiver cancelando pedido que deduziu estoque, estorna o estoque
        if (status === 'Cancelado' && o.stockDeducted && Array.isArray(o.items)) {
          o.items.forEach(item => {
            const currentProd = products.find(p => p.id === item.id)
            if (currentProd) {
              updateProduct(item.id, {
                stock: (currentProd.stock || 0) + (item.quantity || item.qty || 1),
                sold: Math.max(0, (currentProd.sold || 0) - (item.quantity || item.qty || 1))
              })
            }
          })
          return { ...o, status, stockDeducted: false, ...(trackingCode ? { trackingCode } : {}) }
        }

        // Se estiver confirmando pagamento e ainda não deduziu estoque
        if (status === 'Pago' && !o.stockDeducted && Array.isArray(o.items)) {
          o.items.forEach(item => {
            const currentProd = products.find(p => p.id === item.id)
            if (currentProd) {
              updateProduct(item.id, {
                stock: Math.max(0, (currentProd.stock || 0) - (item.quantity || item.qty || 1)),
                sold: (currentProd.sold || 0) + (item.quantity || item.qty || 1)
              })
            }
          })
          return { ...o, status, stockDeducted: true, ...(trackingCode ? { trackingCode } : {}) }
        }

        return { ...o, status, ...(trackingCode ? { trackingCode } : {}) }
      })
      return updated
    })

    if (isSupabaseConfigured) {
      try {
        await updateOrderInDb(orderId, { status, trackingCode })
      } catch (err) {
        console.warn('Supabase update order error:', err)
      }
    }

    showToast(`Pedido ${orderId} atualizado para: ${status}`)
  }, [products, updateProduct, showToast])

  const deleteOrder = useCallback(async (orderId) => {
    if (!orderId) return
    setOrders(prev => {
      const updated = prev.filter(o => o.id !== orderId)
      try {
        localStorage.setItem('infodesk_orders', JSON.stringify(updated))
      } catch (e) {}
      return updated
    })

    if (isSupabaseConfigured) {
      try {
        await deleteOrderFromDb(orderId)
      } catch (err) {
        console.warn('Supabase delete order error:', err)
      }
    }

    showToast(`Pedido #${orderId} excluído com sucesso. 🗑️`)
  }, [showToast])

  // === Filtered Products (Memoizado) ===
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)

      const matchesCategory = activeCategory === 'Todos' ||
        p.category === activeCategory ||
        (activeCategory === 'Eletrônicos & Tecnologia' && ['Eletrônicos', 'Eletrônicos & Tecnologia', 'Hardware', 'Monitores', 'Notebooks'].includes(p.category)) ||
        (activeCategory === 'Informática & Periféricos' && ['Periféricos', 'Informática & Periféricos', 'Hardware', 'Redes', 'Notebooks'].includes(p.category)) ||
        (activeCategory === 'Escritório & Suprimentos' && ['Escritório', 'Escritório & Suprimentos', 'Suprimentos', 'Cadeiras'].includes(p.category)) ||
        (activeCategory === 'Casa & Utilidades' && ['Casa', 'Casa & Utilidades', 'Utilidades', 'Eletro'].includes(p.category)) ||
        (activeCategory === 'Ferramentas & Acessórios' && ['Ferramentas', 'Ferramentas & Acessórios', 'Acessórios'].includes(p.category))

      const pPrice = parseFloat(p.price) || 0
      let matchesPrice = true
      if (priceFilter === 'under300') matchesPrice = pPrice <= 300
      else if (priceFilter === '300to1000') matchesPrice = pPrice > 300 && pPrice <= 1000
      else if (priceFilter === '1000to3000') matchesPrice = pPrice > 1000 && pPrice <= 3000
      else if (priceFilter === 'above3000') matchesPrice = pPrice > 3000

      const inStock = p.stock > 0

      return matchesSearch && matchesCategory && matchesPrice && inStock
    }).sort((a, b) => {
      const priceA = parseFloat(a.price) || 0
      const priceB = parseFloat(b.price) || 0
      if (sortBy === 'price_asc') return priceA - priceB
      if (sortBy === 'price_desc') return priceB - priceA
      if (sortBy === 'sold') return (b.sold || 0) - (a.sold || 0)
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0)
      return 0 // relevance
    })
  }, [products, searchQuery, activeCategory, priceFilter, sortBy])

  const featuredProducts = useMemo(() => {
    return products.filter(p => p.featured && p.stock > 0)
  }, [products])

  // === Context Value ===
  const value = {
    // Data
    products, filteredProducts, featuredProducts, cart, orders,
    // Cart
    addToCart, removeFromCart, updateCartQty, clearCart, cartTotal, cartCount,
    // Products
    addProduct, updateProduct, deleteProduct, clearAllProducts,
    // Orders
    createOrder, updateOrderStatus, deleteOrder, loadAdminOrders, loadCustomerOrders,
    // Admin & Auth
    isAdmin, adminSession, adminConfig, globalTaxRate: adminConfig.globalTaxRate ?? 10,
    loginAdmin, logoutAdmin, changeAdminPassword, updateGlobalTaxRate,
    // Customer Account & Auth
    isCustomerLoggedIn,
    customerSession,
    customers,
    loadAdminCustomers,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    customerProfile,
    saveCustomerProfile,
    showCustomerAccount,
    setShowCustomerAccount,
    // Gestão Administrativa de Clientes Multiempresa & LGPD
    currentCompanyId,
    adminRole,
    updateAdminRole,
    updateAdminCustomer,
    toggleCustomerStatus,
    saveCustomerNotes,
    anonymizeCustomer,
    recordCustomerAudit,
    fetchCustomerAuditLogs,
    // Fase 3: CEP Global & Filtros Facetados
    globalCep, setGlobalCep,
    globalAddress, setGlobalAddress,
    showCepModal, setShowCepModal,
    sortBy, setSortBy,
    priceFilter, setPriceFilter,
    // UI State
    searchQuery, setSearchQuery,
    activeCategory, setActiveCategory,
    cartOpen, setCartOpen,
    selectedProduct, setSelectedProduct,
    showAdminLogin, setShowAdminLogin,
    showCheckout, setShowCheckout,
    showScanner, setShowScanner,
    showAdminDashboard, setShowAdminDashboard,
    toast, showToast,
    // Rastreamento dos Correios
    showTrackingModal, setShowTrackingModal,
    trackingCodeToView, setTrackingCodeToView,
    openTrackingModal,
    // Dados Corporativos da Empresa (Multi-Marca)
    companyData, setCompanyData, updateCompanyData,
  }

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  )
}
