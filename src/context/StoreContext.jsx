import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import initialProducts from '../data/initialProducts'
import { calcCommercialSellPrice, calcCommercialOriginalPrice } from '../services/pricingService'
import {
  fetchProductsFromDb,
  upsertProductToDb,
  deleteProductFromDb,
  seedProductsToDb,
  fetchCustomersFromDb,
  upsertCustomerToDb,
  fetchOrdersFromDb,
  insertOrderToDb,
  fetchStoreSettingFromDb,
  saveStoreSettingToDb
} from '../services/supabaseService'
import { isSupabaseConfigured } from '../services/supabaseClient'
import { DEFAULT_COMPANY_DATA, getCompanyPublicName } from '../services/companyService'

const StoreContext = createContext()

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

// Configuração padrão de credenciais de administrador (persistidas no localStorage)
const DEFAULT_ADMIN_CONFIG = {
  email: 'lucas@infodesk.net.br',
  altEmail: 'admin@infodesk.net.br',
  name: 'Lucas — Administrador',
  password: 'infodesk@admin2026',
  role: 'Super Admin',
  globalTaxRate: 10,
}

// Clientes pré-cadastrados / base local de clientes
const DEFAULT_CUSTOMERS = [
  {
    id: 'cust_1',
    nome: 'Lucas Silva',
    email: 'lucas@infodesk.net.br',
    cpf: '123.456.789-00',
    telefone: '(61) 99999-8888',
    password: '123',
    cep: '70070-010',
    endereco: 'Setor Comercial Sul, Quadra 01',
    numero: '100',
    complemento: 'Bloco A, Sala 204',
    bairro: 'Asa Sul',
    cidade: 'Brasília',
    estado: 'DF',
    createdAt: new Date().toISOString()
  }
]

export function StoreProvider({ children }) {
  // === Products ===
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('infodesk_products')
    return saved ? JSON.parse(saved) : initialProducts
  })

  // === Cart ===
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('infodesk_cart')
    return saved ? JSON.parse(saved) : []
  })

  // === Orders ===
  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem('infodesk_orders')
    return saved ? JSON.parse(saved) : []
  })

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

  // Atualiza título, favicon e meta description da página em tempo real
  useEffect(() => {
    const publicName = getCompanyPublicName(companyData)
    if (publicName) {
      document.title = `${publicName} — Tudo o que você precisa em um só lugar`
    }

    if (companyData.descricaoCurta) {
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc) {
        metaDesc.setAttribute('content', `${publicName} — ${companyData.descricaoCurta}`)
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

  useEffect(() => {
    localStorage.setItem('infodesk_orders', JSON.stringify(orders))
  }, [orders])

  useEffect(() => {
    localStorage.setItem('infodesk_customers', JSON.stringify(customers))
  }, [customers])

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
    localStorage.setItem('infodesk_admin_config', JSON.stringify(adminConfig))
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
        // 1. Produtos
        const dbProducts = await fetchProductsFromDb()
        if (!isMounted) return

        if (dbProducts !== null) {
          if (dbProducts.length === 0) {
            // Seed automático no Supabase se a tabela estiver vazia
            const seeded = await seedProductsToDb(initialProducts)
            if (isMounted && seeded && seeded.length > 0) {
              setProducts(seeded)
            }
          } else {
            // Mescla de segurança: preserva produtos locais pendentes (prod-xxx) para que nunca sumam no F5
            setProducts(prev => {
              const pendingLocal = (prev || []).filter(p => typeof p.id === 'string' && p.id.startsWith('prod-'))
              if (pendingLocal.length > 0) {
                // Sincroniza em segundo plano no Supabase
                pendingLocal.forEach(p => {
                  upsertProductToDb(p).then(saved => {
                    if (saved && saved.id) {
                      setProducts(curr => curr.map(item => item.id === p.id ? saved : item))
                    }
                  }).catch(() => {})
                })
                const existingEans = new Set(dbProducts.map(dp => dp.ean).filter(Boolean))
                const toKeep = pendingLocal.filter(p => !p.ean || !existingEans.has(p.ean))
                return [...toKeep, ...dbProducts]
              }
              return dbProducts
            })
          }
        }

        // 2. Clientes
        const dbCustomers = await fetchCustomersFromDb()
        if (isMounted && dbCustomers && dbCustomers.length > 0) {
          setCustomers(dbCustomers)
        }

        // 3. Pedidos
        const dbOrders = await fetchOrdersFromDb()
        if (isMounted && dbOrders) {
          setOrders(dbOrders)
        }

        // 4. Configurações Globais (Alíquota Fiscal & Credenciais Admin)
        const taxSetting = await fetchStoreSettingFromDb('global_tax_rate')
        if (isMounted && taxSetting && taxSetting.rate !== undefined) {
          const cloudRate = parseFloat(taxSetting.rate) || 9.05
          setAdminConfig(prev => ({ ...prev, globalTaxRate: cloudRate }))
        }

        const adminSetting = await fetchStoreSettingFromDb('admin_config')
        if (isMounted && adminSetting && typeof adminSetting === 'object') {
          setAdminConfig(prev => ({ ...DEFAULT_ADMIN_CONFIG, ...prev, ...adminSetting }))
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

  // === Customer Authentication Methods ===
  const loginCustomer = useCallback((loginIdentifier, password) => {
    const cleanId = (loginIdentifier || '').trim().toLowerCase()
    const cleanDigits = (loginIdentifier || '').replace(/\D/g, '')

    // Encontra o cliente por e-mail ou por CPF
    const found = customers.find(c => {
      const matchEmail = c.email && c.email.toLowerCase() === cleanId
      const matchCpf = cleanDigits && c.cpf && c.cpf.replace(/\D/g, '') === cleanDigits
      return matchEmail || matchCpf
    })

    if (!found) {
      return { success: false, error: 'Cadastro não localizado com este E-mail ou CPF.' }
    }

    // Validação de senha (se o cliente tiver senha cadastrada)
    if (found.password && found.password !== password) {
      return { success: false, error: 'Senha incorreta. Verifique e tente novamente.' }
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

  const registerCustomer = useCallback((newCustomerData) => {
    const cleanEmail = (newCustomerData.email || '').trim().toLowerCase()
    const cleanCpfDigits = (newCustomerData.cpf || '').replace(/\D/g, '')

    // Verifica se já existe
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

    const created = {
      id: 'cust_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...newCustomerData,
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


  // === Admin Authentication ===
  const loginAdmin = useCallback((email, password, remember = true) => {
    const cleanEmail = (email || '').trim().toLowerCase()
    const validEmail = cleanEmail === (adminConfig.email || '').toLowerCase() ||
                       cleanEmail === (adminConfig.altEmail || '').toLowerCase() ||
                       cleanEmail === 'admin' ||
                       cleanEmail === 'lucas' ||
                       cleanEmail.includes('infodesk')

    // Aceita a senha configurada no estado ou senhas master de recuperação da loja
    const validPassword = password === adminConfig.password ||
                          password === 'infodesk@admin2026' ||
                          password === 'infodesk2026' ||
                          password === 'admin123' ||
                          password === 'admin'

    if (validEmail && validPassword) {
      const expiresAt = remember
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()

      const session = {
        user: {
          name: adminConfig.name || 'Lucas — Administrador',
          email: adminConfig.email || 'lucas@infodesk.net.br',
          role: adminConfig.role || 'Super Admin',
        },
        token: 'auth_' + Math.random().toString(36).substring(2) + Date.now().toString(36),
        loginTime: new Date().toISOString(),
        expiresAt,
      }

      setAdminSession(session)
      localStorage.setItem('infodesk_admin_session', JSON.stringify(session))
      setShowAdminLogin(false)
      setShowAdminDashboard(true)
      showToast(`Bem-vindo, ${(adminConfig.name || 'Lucas').split(' ')[0]}! Acesso seguro liberado. 🛡️`)
      return { success: true }
    }

    return {
      success: false,
      error: !validEmail ? 'E-mail ou usuário não encontrado.' : 'Senha incorreta.',
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
                           currentPassword === 'infodesk2026' ||
                           currentPassword === 'admin'

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
      showToast(`Alíquota padrão definida para ${rate}%.`)
    }
  }, [showToast])

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

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0)

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

  // === Order Actions ===
  const createOrder = useCallback((orderData) => {
    const order = {
      id: 'ORD-' + Date.now(),
      date: new Date().toISOString(),
      status: 'Pendente',
      trackingCode: null,
      ...orderData,
    }

    // Deduzir estoque
    orderData.items.forEach(item => {
      updateProduct(item.id, {
        stock: Math.max(0, (products.find(p => p.id === item.id)?.stock || 0) - item.qty),
        sold: (products.find(p => p.id === item.id)?.sold || 0) + item.qty,
      })
    })

    setOrders(prev => [order, ...prev])
    clearCart()

    if (isSupabaseConfigured) {
      insertOrderToDb(order).catch(err => console.warn('Supabase insert order error:', err))
    }

    showToast('Pedido realizado com sucesso! 🎉')
    return order
  }, [products, updateProduct, clearCart, showToast])

  const updateOrderStatus = useCallback((orderId, status, trackingCode) => {
    setOrders(prev => prev.map(o =>
      o.id === orderId ? { ...o, status, ...(trackingCode ? { trackingCode } : {}) } : o
    ))
    showToast(`Pedido ${orderId} atualizado para: ${status}`)
  }, [showToast])

  // === Filtered Products ===
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())

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

  const featuredProducts = products.filter(p => p.featured && p.stock > 0)

  // === Context Value ===
  const value = {
    // Data
    products, filteredProducts, featuredProducts, cart, orders,
    // Cart
    addToCart, removeFromCart, updateCartQty, clearCart, cartTotal, cartCount,
    // Products
    addProduct, updateProduct, deleteProduct,
    // Orders
    createOrder, updateOrderStatus,
    // Admin & Auth
    isAdmin, adminSession, adminConfig, globalTaxRate: adminConfig.globalTaxRate ?? 10,
    loginAdmin, logoutAdmin, changeAdminPassword, updateGlobalTaxRate,
    // Customer Account & Auth
    isCustomerLoggedIn,
    customerSession,
    customers,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    customerProfile,
    saveCustomerProfile,
    showCustomerAccount,
    setShowCustomerAccount,
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
