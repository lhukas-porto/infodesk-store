import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  X, Package, DollarSign, ShoppingCart, BarChart3, Plus, ArrowLeft,
  Pencil, Trash2, Camera, LogOut, TrendingUp, AlertTriangle, Search,
  Shield, KeyRound, User, Users, Lock, CheckCircle2, AlertCircle, Image as ImageIcon,
  Layers, Sliders, Eye, EyeOff, RefreshCw, Printer, Sparkles, Truck, Loader2,
  MessageCircle, Send, Building2, Upload, Globe, MapPin, Phone, Mail, Briefcase, CreditCard
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { generateValidEan13 } from '../services/barcodeService'
import {
  roundCommercialPrice,
  calcCommercialSellPrice,
  calcCommercialOriginalPrice
} from '../services/pricingService'
import { formatCep, consultarCep } from '../services/correiosService'
import ShippingLabelModal from './ShippingLabelModal'
import BarcodeLabel from './BarcodeLabel'
import AdminCustomersSection from './admin/AdminCustomersSection'
import AdminPaymentsSection from './admin/AdminPaymentsSection'
import AdminMarketingSection from './admin/AdminMarketingSection'
import { slugify } from '../services/seoManager'
import {
  createWhatsAppLink,
  buildPaymentReminderMessage,
  buildShippingNotificationMessage,
  buildDeliveredNotificationMessage
} from '../services/whatsappService'
import {
  formatCnpj,
  formatPhone as formatCompanyPhone,
  formatCep as formatCompanyCep,
  isValidCnpj,
  isValidEmail,
  isValidUrl,
  getCompanyPublicName
} from '../services/companyService'

export default function AdminDashboard() {
  const {
    showAdminDashboard, setShowAdminDashboard,
    products, orders, customers = [], logoutAdmin,
    addProduct, updateProduct, deleteProduct, clearAllProducts,
    updateOrderStatus, setShowScanner, showToast,
    adminSession, adminConfig, changeAdminPassword,
    globalTaxRate, updateGlobalTaxRate,
    openTrackingModal,
    companyData, updateCompanyData
  } = useStore()

  const [tab, setTabState] = useState(() => {
    try {
      return localStorage.getItem('infodesk_admin_active_tab') || 'overview'
    } catch {
      return 'overview'
    }
  })

  const [productViewMode, setProductViewMode] = useState('list') // 'list' | 'add'

  const setTab = useCallback((newTab) => {
    if (newTab === 'add') {
      setTabState('products')
      setProductViewMode('add')
      try {
        localStorage.setItem('infodesk_admin_active_tab', 'products')
      } catch {}
      return
    }
    if (newTab === 'products') {
      setProductViewMode('list')
    }
    setTabState(newTab)
    try {
      localStorage.setItem('infodesk_admin_active_tab', newTab)
    } catch {}
  }, [])
  const [editingProduct, setEditingProduct] = useState(null)
  const [labelProduct, setLabelProduct] = useState(null)
  const [labelOrderToPrint, setLabelOrderToPrint] = useState(null)
  const [productToDelete, setProductToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showClearCatalogModal, setShowClearCatalogModal] = useState(false)
  const [isClearingCatalog, setIsClearingCatalog] = useState(false)
  const [orderToEditTracking, setOrderToEditTracking] = useState(null)
  const [trackingCodeInput, setTrackingCodeInput] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Global tax input state
  const [taxInput, setTaxInput] = useState(globalTaxRate ?? 10)

  // Sincroniza o input com o valor global do store
  useEffect(() => {
    setTaxInput(globalTaxRate ?? 10)
  }, [globalTaxRate])

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: '',
    category: 'Hardware',
    costPrice: '',
    taxRate: globalTaxRate ?? 10,
    marginRate: 30,
    price: '',
    originalPrice: '',
    stock: '',
    ean: '',
    featured: false,
    description: '',
    images: [''],
    specs: [{ label: '', value: '' }],
    slug: '',
    seo_title: '',
    seo_description: '',
    image_alt: '',
    primary_keyword: '',
    mpn: '',
    google_category: '',
    is_anchor: false,
    weekly_offer: false,
    merchant_include: true,
  })

  // Password change form state
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')

  // Correios Multiempresa Settings State (com persistência híbrida: localStorage + Backend File)
  const [correiosForm, setCorreiosForm] = useState(() => {
    try {
      const saved = localStorage.getItem('infodesk_correios_config')
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          storeId: parsed.storeId || 'default',
          enabled: parsed.enabled !== undefined ? parsed.enabled : true,
          usuario: parsed.usuario || '',
          codigoAcesso: parsed.codigoAcesso || '',
          contrato: parsed.contrato || '',
          dr: parsed.dr || '10',
          cepOrigem: parsed.cepOrigem || '70673-631',
          pacEnabled: parsed.pacEnabled !== undefined ? parsed.pacEnabled : true,
          sedexEnabled: parsed.sedexEnabled !== undefined ? parsed.sedexEnabled : true,
          hasCodigoAcesso: Boolean(parsed.hasCodigoAcesso || parsed.codigoAcesso)
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar configurações dos Correios do localStorage:', e)
    }
    return {
      storeId: 'default',
      enabled: true,
      usuario: '',
      codigoAcesso: '',
      contrato: '',
      dr: '10',
      cepOrigem: '70673-631',
      pacEnabled: true,
      sedexEnabled: true,
      hasCodigoAcesso: false,
    }
  })
  const [showCodigoAcesso, setShowCodigoAcesso] = useState(false)
  const [isSavingCorreios, setIsSavingCorreios] = useState(false)
  const [isTestingCorreios, setIsTestingCorreios] = useState(false)
  const [testResults, setTestResults] = useState(null)

  // === Estado da Aba "Dados da Empresa" ===
  const [companyForm, setCompanyForm] = useState(companyData || {})
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [logoPreview, setLogoPreview] = useState(companyData?.logo || '')
  const [logoError, setLogoError] = useState('')
  const [isSearchingCompanyCep, setIsSearchingCompanyCep] = useState(false)

  useEffect(() => {
    if (companyData) {
      setCompanyForm(companyData)
      setLogoPreview(companyData.logo || '')
    }
  }, [companyData])

  const handleCompanyLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoError('')

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setLogoError('Formato inválido. Selecione um arquivo PNG, JPG, JPEG ou WEBP.')
      showToast('Formato inválido. Use PNG, JPG ou WEBP.', 'error')
      return
    }

    const maxSize = 2 * 1024 * 1024 // 2 MB
    if (file.size > maxSize) {
      setLogoError(`Arquivo excede 2 MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`)
      showToast('O arquivo excede o limite de 2 MB.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result
      if (base64) {
        setLogoPreview(base64)
        setCompanyForm(prev => ({ ...prev, logo: base64 }))
        showToast('Nova logo carregada com sucesso! Clique em Salvar para aplicar.')
      }
    }
    reader.onerror = () => {
      setLogoError('Erro ao ler a imagem. A logo anterior foi preservada.')
      showToast('Falha no upload. A logo anterior foi mantida.', 'error')
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveCompanyLogo = () => {
    setLogoPreview('')
    setCompanyForm(prev => ({ ...prev, logo: '' }))
    setLogoError('')
    showToast('Logo removida. A loja passará a exibir o Nome Fantasia em texto.')
  }

  const handleCompanyCepChange = async (val) => {
    const formatted = formatCompanyCep(val)
    setCompanyForm(prev => ({ ...prev, cep: formatted }))

    const clean = formatted.replace(/\D/g, '')
    if (clean.length === 8) {
      setIsSearchingCompanyCep(true)
      try {
        const data = await consultarCep(clean)
        if (data && !data.erro) {
          setCompanyForm(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado
          }))
          showToast(`Endereço localizado: ${data.localidade} - ${data.uf} 📍`)
        }
      } catch {
        // Silencioso se der erro na busca
      } finally {
        setIsSearchingCompanyCep(false)
      }
    }
  }

  const handleSaveCompany = async (e) => {
    e?.preventDefault()

    if (!companyForm.razaoSocial?.trim()) {
      showToast('Por favor, informe a Razão Social da empresa.', 'error')
      return
    }
    if (!companyForm.nomeFantasia?.trim()) {
      showToast('Por favor, informe o Nome Fantasia da empresa.', 'error')
      return
    }
    if (companyForm.cnpj && !isValidCnpj(companyForm.cnpj)) {
      showToast('O CNPJ informado possui dígitos inválidos. Verifique.', 'error')
      return
    }
    if (companyForm.emailPrincipal && !isValidEmail(companyForm.emailPrincipal)) {
      showToast('E-mail institucional/contato inválido.', 'error')
      return
    }

    setIsSavingCompany(true)
    try {
      const res = await updateCompanyData(companyForm)
      if (res.success) {
        showToast('Dados da empresa salvos e atualizados na loja com sucesso! 🏢✅')
      } else {
        showToast(res.error || 'Erro ao salvar dados da empresa.', 'error')
      }
    } catch {
      showToast('Erro de conexão ao salvar dados da empresa.', 'error')
    } finally {
      setIsSavingCompany(false)
    }
  }

  // Carrega configurações persistidas dos Correios do backend (com cache-busting)
  const syncCorreiosFromBackend = useCallback((storeIdToFetch = 'default') => {
    fetch(`/api/shipping/config?storeId=${encodeURIComponent(storeIdToFetch)}&_t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setCorreiosForm(prev => {
            const updated = {
              ...prev,
              storeId: data.storeId || storeIdToFetch,
              enabled: data.enabled !== undefined ? data.enabled : prev.enabled,
              usuario: data.usuario || prev.usuario || '',
              codigoAcesso: (data.codigoAcesso !== undefined && data.codigoAcesso !== '') ? data.codigoAcesso : (data.maskedCodigoAcesso || prev.codigoAcesso || ''),
              contrato: data.contrato || prev.contrato || '',
              dr: data.dr || prev.dr || '10',
              cepOrigem: data.cepOrigem ? formatCep(data.cepOrigem) : prev.cepOrigem || '70673-631',
              pacEnabled: data.pacEnabled !== undefined ? data.pacEnabled : prev.pacEnabled,
              sedexEnabled: data.sedexEnabled !== undefined ? data.sedexEnabled : prev.sedexEnabled,
              hasCodigoAcesso: data.hasCodigoAcesso ?? Boolean(prev.hasCodigoAcesso || prev.codigoAcesso)
            }
            try {
              localStorage.setItem('infodesk_correios_config', JSON.stringify(updated))
            } catch (e) {
              console.warn('Erro ao salvar no localStorage:', e)
            }
            return updated
          })
        }
      })
      .catch(err => console.warn('Erro ao carregar configurações dos Correios do backend:', err))
  }, [])

  // Sincroniza apenas quando o usuário selecionar a aba de frete
  useEffect(() => {
    if (tab === 'shipping') {
      syncCorreiosFromBackend(correiosForm.storeId || 'default')
    }
  }, [tab, correiosForm.storeId, syncCorreiosFromBackend])

  // Suporte global para sair/fechar pelo ESC (fecha modais aninhados primeiro)
  useEffect(() => {
    if (!showAdminDashboard) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (orderToEditTracking) {
          setOrderToEditTracking(null)
        } else if (productToDelete) {
          setProductToDelete(null)
        } else if (labelOrderToPrint) {
          setLabelOrderToPrint(null)
        } else if (labelProduct) {
          setLabelProduct(null)
        } else if (editingProduct) {
          setEditingProduct(null)
        } else {
          setShowAdminDashboard(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAdminDashboard, orderToEditTracking, productToDelete, labelOrderToPrint, labelProduct, editingProduct, setShowAdminDashboard])

  // Stats e filtros memoizados no topo incondicional (Rules of Hooks)
  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + (o.total || 0), 0), [orders])
  const totalOrders = orders.length
  const totalProducts = products.length
  const lowStock = useMemo(() => products.filter(p => (parseInt(p.stock) || 0) <= 5).length, [products])

  const existingBrands = useMemo(() => {
    return Array.from(
      new Set([
        'ASUS', 'Logitech', 'Corsair', 'Kingston', 'Samsung', 'Dell', 'Intel', 'AMD',
        'Razer', 'HyperX', 'NVIDIA', 'Western Digital', 'Seagate', 'TP-Link', 'LG',
        'Acer', 'Lenovo', 'Redragon', 'Crucial', 'Gigabyte', 'MSI',
        ...products.map(p => p.brand).filter(Boolean)
      ])
    ).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  }, [products])

  const filteredAdminProducts = useMemo(() => {
    if (!productSearch.trim()) return products
    const q = productSearch.toLowerCase().trim()
    return products.filter(p => {
      return (p.name || '').toLowerCase().includes(q) ||
             (p.brand || '').toLowerCase().includes(q) ||
             (p.category || '').toLowerCase().includes(q) ||
             (p.ean && p.ean.includes(q))
    })
  }, [products, productSearch])

  const handleSaveCorreios = async (e) => {
    e?.preventDefault()
    setIsSavingCorreios(true)
    try {
      const res = await fetch('/api/shipping/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correiosForm)
      })
      const data = await res.json()
      if (data.success) {
        showToast('Configurações dos Correios salvas com sucesso! 🚚✅')
        const updated = {
          ...correiosForm,
          usuario: data.usuario || correiosForm.usuario,
          codigoAcesso: data.codigoAcesso || correiosForm.codigoAcesso,
          contrato: data.contrato || correiosForm.contrato,
          dr: data.dr || correiosForm.dr,
          cepOrigem: data.cepOrigem ? formatCep(data.cepOrigem) : correiosForm.cepOrigem,
          pacEnabled: data.pacEnabled !== undefined ? data.pacEnabled : correiosForm.pacEnabled,
          sedexEnabled: data.sedexEnabled !== undefined ? data.sedexEnabled : correiosForm.sedexEnabled,
          hasCodigoAcesso: data.hasCodigoAcesso ?? Boolean(correiosForm.codigoAcesso)
        }
        setCorreiosForm(updated)
        try {
          localStorage.setItem('infodesk_correios_config', JSON.stringify(updated))
        } catch (e) {
          console.warn('Erro ao salvar no localStorage:', e)
        }
      } else {
        showToast(data.error || 'Erro ao salvar configurações.', 'error')
      }
    } catch {
      showToast('Erro de conexão ao salvar configurações.', 'error')
    } finally {
      setIsSavingCorreios(false)
    }
  }

  const handleTestCorreios = async () => {
    setIsTestingCorreios(true)
    setTestResults(null)
    try {
      const res = await fetch('/api/shipping/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correiosForm)
      })
      const data = await res.json()
      setTestResults(data)
      if (data.success) {
        showToast('Conexão com os Correios validada com sucesso! 🎉')
      } else {
        showToast(data.message || 'Falha no teste de conexão com os Correios.', 'error')
      }
    } catch {
      setTestResults({
        success: false,
        message: 'Erro ao conectar no endpoint de teste dos Correios.',
        results: []
      })
      showToast('Não foi possível realizar o teste no momento.', 'error')
    } finally {
      setIsTestingCorreios(false)
    }
  }

  if (!showAdminDashboard) return null

  // Auto price calculation formula: Custo * (1 + Imposto%) * (1 + Margem%) com arredondamento comercial (final 5 ou 9)
  const calcSellPrice = (cost, tax, margin) => {
    return calcCommercialSellPrice(cost, tax, margin)
  }

  // --- Handlers de Cálculo Automático em Tempo Real (Cadastrar) ---
  const handleNewCostChange = (val) => {
    const calculated = calcSellPrice(val, newProduct.taxRate, newProduct.marginRate)
    const calculatedOriginal = calculated > 0 ? calcCommercialOriginalPrice(calculated) : ''
    setNewProduct({
      ...newProduct,
      costPrice: val,
      price: calculated > 0 ? calculated : '',
      originalPrice: calculatedOriginal,
    })
  }

  const handleNewTaxChange = (val) => {
    const calculated = calcSellPrice(newProduct.costPrice, val, newProduct.marginRate)
    const calculatedOriginal = calculated > 0 ? calcCommercialOriginalPrice(calculated) : ''
    setNewProduct({
      ...newProduct,
      taxRate: val,
      price: calculated > 0 ? calculated : '',
      originalPrice: calculatedOriginal,
    })
  }

  const handleNewMarginChange = (val) => {
    const calculated = calcSellPrice(newProduct.costPrice, newProduct.taxRate, val)
    const calculatedOriginal = calculated > 0 ? calcCommercialOriginalPrice(calculated) : ''
    setNewProduct({
      ...newProduct,
      marginRate: val,
      price: calculated > 0 ? calculated : '',
      originalPrice: calculatedOriginal,
    })
  }

  // --- Handlers de Cálculo Automático em Tempo Real (Editar) ---
  const handleEditCostChange = (val) => {
    const calculated = calcSellPrice(val, editingProduct.taxRate, editingProduct.marginRate)
    const calculatedOriginal = calculated > 0 ? calcCommercialOriginalPrice(calculated) : (editingProduct.originalPrice || '')
    setEditingProduct({
      ...editingProduct,
      costPrice: val,
      price: calculated > 0 ? calculated : '',
      originalPrice: calculatedOriginal,
    })
  }

  const handleEditTaxChange = (val) => {
    const calculated = calcSellPrice(editingProduct.costPrice, val, editingProduct.marginRate)
    const calculatedOriginal = calculated > 0 ? calcCommercialOriginalPrice(calculated) : (editingProduct.originalPrice || '')
    setEditingProduct({
      ...editingProduct,
      taxRate: val,
      price: calculated > 0 ? calculated : '',
      originalPrice: calculatedOriginal,
    })
  }

  const handleEditMarginChange = (val) => {
    const calculated = calcSellPrice(editingProduct.costPrice, editingProduct.taxRate, val)
    const calculatedOriginal = calculated > 0 ? calcCommercialOriginalPrice(calculated) : (editingProduct.originalPrice || '')
    setEditingProduct({
      ...editingProduct,
      marginRate: val,
      price: calculated > 0 ? calculated : '',
      originalPrice: calculatedOriginal,
    })
  }

  // --- Add Product Handlers ---
  const handleAddProduct = () => {
    const calculatedPrice = calcSellPrice(newProduct.costPrice, newProduct.taxRate, newProduct.marginRate)
    const finalPrice = roundCommercialPrice(parseFloat(newProduct.price) || calculatedPrice)
    const origPrice = newProduct.originalPrice
      ? roundCommercialPrice(newProduct.originalPrice)
      : (finalPrice > 0 ? calcCommercialOriginalPrice(finalPrice) : 0)
    const installments = finalPrice > 300 ? 12 : 6

    addProduct({
      name: newProduct.name.trim(),
      brand: newProduct.brand.trim() || 'Genérica',
      category: newProduct.category,
      costPrice: parseFloat(newProduct.costPrice) || 0,
      taxRate: parseFloat(newProduct.taxRate) || 0,
      marginRate: parseFloat(newProduct.marginRate) || 0,
      price: finalPrice,
      originalPrice: origPrice,
      installments,
      installmentPrice: Math.round((finalPrice / installments) * 100) / 100,
      stock: parseInt(newProduct.stock) || 0,
      ean: newProduct.ean.trim(),
      featured: Boolean(newProduct.featured),
      description: newProduct.description.trim(),
      images: newProduct.images.filter(img => img.trim().length > 0),
      specs: newProduct.specs.filter(s => s.label.trim() && s.value.trim()),
      // Campos de SEO & Divulgação Orgânica
      slug: newProduct.slug ? slugify(newProduct.slug) : slugify(newProduct.name),
      seo_title: newProduct.seo_title?.trim() || newProduct.name.trim(),
      seo_description: newProduct.seo_description?.trim() || newProduct.description?.trim() || '',
      image_alt: newProduct.image_alt?.trim() || newProduct.name.trim(),
      primary_keyword: newProduct.primary_keyword?.trim() || '',
      mpn: newProduct.mpn?.trim() || '',
      google_category: newProduct.google_category?.trim() || '',
      is_anchor: Boolean(newProduct.is_anchor),
      weekly_offer: Boolean(newProduct.weekly_offer),
      merchant_include: newProduct.merchant_include !== false,
    })

    setNewProduct({
      name: '',
      brand: '',
      category: 'Hardware',
      costPrice: '',
      taxRate: globalTaxRate ?? 10,
      marginRate: 30,
      price: '',
      originalPrice: '',
      stock: '',
      ean: '',
      featured: false,
      description: '',
      images: [''],
      specs: [{ label: '', value: '' }],
      slug: '',
      seo_title: '',
      seo_description: '',
      image_alt: '',
      primary_keyword: '',
      mpn: '',
      google_category: '',
      is_anchor: false,
      weekly_offer: false,
      merchant_include: true,
    })
    setProductViewMode('list')
    setTab('products')
  }

  // --- Edit Product Handlers ---
  const handleStartEdit = (product) => {
    setEditingProduct({
      ...product,
      slug: product.slug || slugify(product.name),
      seo_title: product.seo_title || product.name,
      seo_description: product.seo_description || product.description || '',
      image_alt: product.image_alt || product.name,
      primary_keyword: product.primary_keyword || '',
      mpn: product.mpn || '',
      google_category: product.google_category || '',
      is_anchor: Boolean(product.is_anchor),
      weekly_offer: Boolean(product.weekly_offer),
      merchant_include: product.merchant_include !== false,
      images: product.images?.length ? [...product.images] : [''],
      specs: product.specs?.length ? product.specs.map(s => ({ ...s })) : [{ label: '', value: '' }],
    })
  }

  const handleSaveEdit = (e) => {
    e?.preventDefault()
    if (!editingProduct) return

    const finalPrice = roundCommercialPrice(parseFloat(editingProduct.price) || calcSellPrice(editingProduct.costPrice, editingProduct.taxRate, editingProduct.marginRate))
    const origPrice = editingProduct.originalPrice ? roundCommercialPrice(editingProduct.originalPrice) : null
    const installments = finalPrice > 300 ? 12 : 6

    updateProduct(editingProduct.id, {
      name: editingProduct.name.trim(),
      brand: editingProduct.brand.trim(),
      category: editingProduct.category,
      costPrice: parseFloat(editingProduct.costPrice) || 0,
      taxRate: parseFloat(editingProduct.taxRate) || 0,
      marginRate: parseFloat(editingProduct.marginRate) || 0,
      price: finalPrice,
      originalPrice: origPrice,
      installments,
      installmentPrice: Math.round((finalPrice / installments) * 100) / 100,
      stock: parseInt(editingProduct.stock) || 0,
      ean: editingProduct.ean?.trim() || '',
      featured: Boolean(editingProduct.featured),
      description: editingProduct.description?.trim() || '',
      images: editingProduct.images.filter(img => img.trim().length > 0),
      specs: editingProduct.specs.filter(s => s.label.trim() && s.value.trim()),
      // Campos de SEO & Divulgação Orgânica
      slug: editingProduct.slug ? slugify(editingProduct.slug) : slugify(editingProduct.name),
      seo_title: editingProduct.seo_title?.trim() || editingProduct.name.trim(),
      seo_description: editingProduct.seo_description?.trim() || editingProduct.description?.trim() || '',
      image_alt: editingProduct.image_alt?.trim() || editingProduct.name.trim(),
      primary_keyword: editingProduct.primary_keyword?.trim() || '',
      mpn: editingProduct.mpn?.trim() || '',
      google_category: editingProduct.google_category?.trim() || '',
      is_anchor: Boolean(editingProduct.is_anchor),
      weekly_offer: Boolean(editingProduct.weekly_offer),
      merchant_include: editingProduct.merchant_include !== false,
    })

    showToast(`Produto "${editingProduct.name}" atualizado com sucesso! ✅`)
    setEditingProduct(null)
  }

  // Password change
  const handlePasswordChangeSubmit = (e) => {
    e.preventDefault()
    setPassError('')
    setPassSuccess('')

    if (!passForm.current) {
      setPassError('Informe a senha atual.')
      return
    }
    if (passForm.newPass.length < 6) {
      setPassError('A nova senha deve conter no mínimo 6 caracteres.')
      return
    }
    if (passForm.newPass !== passForm.confirm) {
      setPassError('A confirmação da nova senha não confere.')
      return
    }

    const res = changeAdminPassword(passForm.current, passForm.newPass)
    if (res.success) {
      setPassSuccess('Senha alterada com sucesso!')
      setPassForm({ current: '', newPass: '', confirm: '' })
    } else {
      setPassError(res.error)
    }
  }

  // Formulário inteligente e reutilizável de cadastro de novo produto
  const renderAddProductForm = () => (
    <div className="adm-editor-form" style={{ marginTop: 'var(--space-2)' }}>
      <div className="adm-editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3>Cadastrar Novo Produto</h3>
          <p>Preencha os dados completos para disponibilizar o item na loja.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setProductViewMode('list')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--dark-600)' }}
        >
          <ArrowLeft size={16} /> Voltar para Lista de Produtos
        </button>
      </div>

      <div className="adm-editor-grid">
        {/* Section 1: Basic Info */}
        <div className="adm-editor-section">
          <h4 className="adm-section-title"><Package size={16} /> Informações Básicas</h4>
          <div className="ck-form-grid">
            <div className="ck-field ck-field-full">
              <label>Nome do Produto *</label>
              <input
                className="input-field"
                value={newProduct.name}
                onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Ex: Monitor Gamer 27 165Hz IPS"
              />
            </div>
            <div className="ck-field">
              <label>Marca / Fabricante *</label>
              <input
                className="input-field"
                list="brand-suggestions-list"
                value={newProduct.brand}
                onChange={e => setNewProduct({ ...newProduct, brand: e.target.value })}
                placeholder="Selecione ou digite a marca..."
                autoComplete="off"
              />
            </div>
            <div className="ck-field">
              <label>Categoria / Departamento *</label>
              <select
                className="input-field"
                value={newProduct.category}
                onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
              >
                <option>Eletrônicos & Tecnologia</option>
                <option>Informática & Periféricos</option>
                <option>Escritório & Suprimentos</option>
                <option>Casa & Utilidades</option>
                <option>Ferramentas & Acessórios</option>
                <option>Hardware</option>
                <option>Periféricos</option>
                <option>Monitores</option>
                <option>Notebooks</option>
                <option>Redes</option>
                <option>Acessórios</option>
                <option>Outros</option>
              </select>
            </div>
            <div className="ck-field">
              <label>Código EAN-13 / Barras</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="input-field"
                  value={newProduct.ean}
                  onChange={e => setNewProduct({ ...newProduct, ean: e.target.value })}
                  placeholder="7891234567890"
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const autoEan = generateValidEan13('789')
                    setNewProduct({ ...newProduct, ean: autoEan })
                    showToast(`Código EAN-13 gerado: ${autoEan} 🎲`)
                  }}
                  title="Gerar código de barras EAN-13 válido"
                >
                  <Sparkles size={14} /> Gerar
                </button>
              </div>
            </div>
            <div className="ck-field">
              <label>Quantidade em Estoque *</label>
              <input
                className="input-field"
                type="number"
                min="0"
                value={newProduct.stock}
                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="ck-field ck-field-full">
              <label className="adm-checkbox-label">
                <input
                  type="checkbox"
                  checked={newProduct.featured}
                  onChange={e => setNewProduct({ ...newProduct, featured: e.target.checked })}
                />
                <span>⭐ Destacar este produto na vitrine principal da loja</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Pricing */}
        <div className="adm-editor-section">
          <h4 className="adm-section-title"><DollarSign size={16} /> Precificação & Lucratividade</h4>
          <div className="ck-form-grid">
            <div className="ck-field">
              <label>💰 Preço de Custo (R$) *</label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                value={newProduct.costPrice}
                onChange={e => handleNewCostChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="ck-field">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Alíquota / Imposto (%) *</span>
                <span className="badge badge-lime" style={{ fontSize: 10 }}>Padrão Global: {globalTaxRate}%</span>
              </label>
              <input
                className="input-field"
                type="number"
                step="0.1"
                value={newProduct.taxRate}
                onChange={e => handleNewTaxChange(e.target.value)}
                required
              />
            </div>
            <div className="ck-field">
              <label>📈 Margem de Lucro Desejada (%)</label>
              <input
                className="input-field"
                type="number"
                step="0.1"
                value={newProduct.marginRate}
                onChange={e => handleNewMarginChange(e.target.value)}
              />
            </div>
            <div className="ck-field">
              <label>🏷️ Preço de Venda Final (R$) *</label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                placeholder="Calculado automaticamente"
              />
            </div>
            <div className="ck-field">
              <label>Preço "De" Riscado (R$)</label>
              <input
                className="input-field"
                type="number"
                step="0.01"
                value={newProduct.originalPrice}
                onChange={e => setNewProduct({ ...newProduct, originalPrice: e.target.value })}
                placeholder="Para simular promoção"
              />
            </div>
            <div className="ck-field">
              <label>Sugestão Calculada:</label>
              <div className="adm-auto-price">
                R$ {calcSellPrice(newProduct.costPrice, newProduct.taxRate, newProduct.marginRate).toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Description */}
        <div className="adm-editor-section">
          <h4 className="adm-section-title"><Layers size={16} /> Descrição do Produto</h4>
          <div className="ck-field">
            <textarea
              className="input-field"
              rows={4}
              value={newProduct.description}
              onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Descreva as características técnicas, diferenciais, compatibilidade e garantia..."
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Section 4: Images */}
        <div className="adm-editor-section">
          <div className="adm-section-header-flex">
            <h4 className="adm-section-title"><ImageIcon size={16} /> Galeria de Fotos (URLs)</h4>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setNewProduct({ ...newProduct, images: [...newProduct.images, ''] })}
            >
              <Plus size={14} /> Adicionar Foto
            </button>
          </div>

          <div className="adm-images-list">
            {newProduct.images.map((img, idx) => (
              <div key={idx} className="adm-image-row">
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={img}
                  onChange={e => {
                    const updated = [...newProduct.images]
                    updated[idx] = e.target.value
                    setNewProduct({ ...newProduct, images: updated })
                  }}
                />
                {img && (
                  <img src={img} alt="Preview" className="adm-img-preview" />
                )}
                {newProduct.images.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => {
                      const updated = newProduct.images.filter((_, i) => i !== idx)
                      setNewProduct({ ...newProduct, images: updated })
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Specs */}
        <div className="adm-editor-section">
          <div className="adm-section-header-flex">
            <h4 className="adm-section-title"><Sliders size={16} /> Especificações Técnicas (Ficha)</h4>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setNewProduct({ ...newProduct, specs: [...newProduct.specs, { label: '', value: '' }] })}
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>

          <div className="adm-specs-list">
            {newProduct.specs.map((spec, idx) => (
              <div key={idx} className="adm-spec-edit-row">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Conectividade, Capacidade, Resolução..."
                  value={spec.label}
                  onChange={e => {
                    const updated = [...newProduct.specs]
                    updated[idx].label = e.target.value
                    setNewProduct({ ...newProduct, specs: updated })
                  }}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: USB-C, 1TB NVMe, 4K UHD..."
                  value={spec.value}
                  onChange={e => {
                    const updated = [...newProduct.specs]
                    updated[idx].value = e.target.value
                    setNewProduct({ ...newProduct, specs: updated })
                  }}
                />
                {newProduct.specs.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => {
                      const updated = newProduct.specs.filter((_, i) => i !== idx)
                      setNewProduct({ ...newProduct, specs: updated })
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: SEO & Google Merchant Center */}
        <div className="adm-editor-section" style={{ gridColumn: '1 / -1', background: 'var(--dark-50)', border: '1px solid var(--dark-200)', borderRadius: 12, padding: 16 }}>
          <h4 className="adm-section-title"><Globe size={16} /> SEO & Divulgação no Google (Shopping / Merchant)</h4>
          <div className="adm-form-grid" style={{ marginTop: 12 }}>
            <div className="ck-field adm-col-6">
              <label>Slug da URL (URL Amigável):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: teclado-gamer-rgb-infodesk"
                value={newProduct.slug || ''}
                onChange={e => setNewProduct({ ...newProduct, slug: slugify(e.target.value) })}
              />
              <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>Deixe em branco para gerar automaticamente pelo nome</small>
            </div>

            <div className="ck-field adm-col-6">
              <label>Palavra-Chave Principal:</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: teclado gamer mecânico"
                value={newProduct.primary_keyword || ''}
                onChange={e => setNewProduct({ ...newProduct, primary_keyword: e.target.value })}
              />
            </div>

            <div className="ck-field adm-col-6">
              <label>Título SEO (&lt;title&gt;):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Título otimizado para o Google"
                value={newProduct.seo_title || ''}
                onChange={e => setNewProduct({ ...newProduct, seo_title: e.target.value })}
              />
            </div>

            <div className="ck-field adm-col-6">
              <label>Texto Alternativo da Foto (Alt Text):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Descrição da foto para Google Imagens e Acessibilidade"
                value={newProduct.image_alt || ''}
                onChange={e => setNewProduct({ ...newProduct, image_alt: e.target.value })}
              />
            </div>

            <div className="ck-field adm-col-6">
              <label>Part Number / MPN do Fabricante:</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: KB-RGB-01"
                value={newProduct.mpn || ''}
                onChange={e => setNewProduct({ ...newProduct, mpn: e.target.value })}
              />
            </div>

            <div className="ck-field adm-col-6">
              <label>Categoria do Google Shopping:</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Eletrônicos > Computadores > Periféricos"
                value={newProduct.google_category || ''}
                onChange={e => setNewProduct({ ...newProduct, google_category: e.target.value })}
              />
            </div>

            <div className="ck-field adm-col-12">
              <label>Meta Description SEO:</label>
              <textarea
                className="input-field"
                rows={2}
                placeholder="Resumo que aparecerá nos resultados de busca do Google (140-160 caracteres)"
                value={newProduct.seo_description || ''}
                onChange={e => setNewProduct({ ...newProduct, seo_description: e.target.value })}
                maxLength={160}
              />
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={newProduct.is_anchor}
                  onChange={e => setNewProduct({ ...newProduct, is_anchor: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--amber)' }}
                />
                ⭐ Produto-Âncora (Destaque SEO)
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={newProduct.weekly_offer}
                  onChange={e => setNewProduct({ ...newProduct, weekly_offer: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
                />
                🔥 Oferta da Semana
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={newProduct.merchant_include}
                  onChange={e => setNewProduct({ ...newProduct, merchant_include: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#15803d' }}
                />
                🛒 Incluir no Google Merchant Center
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="adm-editor-actions">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleAddProduct}
          disabled={!newProduct.name || !newProduct.costPrice}
        >
          <Plus size={18} /> Cadastrar Produto no Catálogo
        </button>
      </div>
    </div>
  )

  return (
    <div className="overlay">
      <button
        className="modal-close-floating"
        onClick={(e) => {
          e.stopPropagation()
          setShowAdminDashboard(false)
        }}
        title="Fechar Painel e Voltar à Loja"
        aria-label="Fechar Janela"
      >
        <X size={22} />
      </button>

      <div className="modal modal-admin" style={{ maxWidth: '1280px', width: '96vw', maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>

        {/* Admin Header */}
        <div className="adm-header">
          <div className="adm-header-title">
            <h2>📊 Painel de Controle</h2>
            <div className="adm-user-badge">
              <Shield size={14} className="adm-shield-icon" />
              <span>{adminSession?.user?.name || adminConfig?.name}</span>
              <span className="adm-user-email">({adminSession?.user?.email || adminConfig?.email})</span>
            </div>
          </div>
          <div className="adm-header-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => { setShowScanner(true); setShowAdminDashboard(false) }}
              title="Abrir scanner de código de barras"
            >
              <Camera size={16} /> Scanner
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setShowAdminDashboard(false)}
              title="Fechar painel e voltar à loja"
            >
              Voltar à Loja
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                logoutAdmin()
              }}
              style={{ color: 'var(--red)', fontWeight: 600 }}
              title="Desconectar e encerrar a sessão administrativa"
            >
              <LogOut size={16} /> Encerrar Sessão
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="adm-tabs">
          {[
            { id: 'overview', icon: <BarChart3 size={16} />, label: 'Visão Geral' },
            { id: 'products', icon: <Package size={16} />, label: `Produtos (${products.length})` },
            { id: 'orders', icon: <ShoppingCart size={16} />, label: `Pedidos (${orders.length})` },
            { id: 'customers', icon: <Users size={16} />, label: `Clientes (${customers.length})` },
            { id: 'marketing', icon: <Globe size={16} />, label: 'SEO e Divulgação' },
            { id: 'company', icon: <Building2 size={16} />, label: 'Dados da Empresa' },
            { id: 'shipping', icon: <Truck size={16} />, label: 'Entregas' },
            { id: 'payments', icon: <CreditCard size={16} />, label: 'Pagamentos' },
            { id: 'security', icon: <KeyRound size={16} />, label: 'Senhas' },
          ].map(t => (
            <button key={t.id} className={`adm-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="adm-body">
          {/* Overview */}
          {tab === 'overview' && (
            <div className="adm-overview">
              <div className="adm-stat-grid">
                <div className="adm-stat" style={{ '--accent': 'var(--lime)' }}>
                  <DollarSign size={24} />
                  <div>
                    <span className="adm-stat-value">R$ {totalRevenue.toFixed(2).replace('.', ',')}</span>
                    <span className="adm-stat-label">Receita Total</span>
                  </div>
                </div>
                <div className="adm-stat" style={{ '--accent': 'var(--amber)' }}>
                  <ShoppingCart size={24} />
                  <div>
                    <span className="adm-stat-value">{totalOrders}</span>
                    <span className="adm-stat-label">Pedidos</span>
                  </div>
                </div>
                <div className="adm-stat" style={{ '--accent': '#8B5CF6' }}>
                  <Package size={24} />
                  <div>
                    <span className="adm-stat-value">{totalProducts}</span>
                    <span className="adm-stat-label">Produtos Cadastrados</span>
                  </div>
                </div>
                <div className="adm-stat" style={{ '--accent': 'var(--red)' }}>
                  <AlertTriangle size={24} />
                  <div>
                    <span className="adm-stat-value">{lowStock}</span>
                    <span className="adm-stat-label">Estoque Baixo (&le; 5)</span>
                  </div>
                </div>
              </div>

              {/* Card de Configuração Fiscal Unificada (Alíquota Global) */}
              <div className="adm-tax-card" style={{ marginTop: 'var(--space-6)' }}>
                <div className="adm-tax-header">
                  <div className="adm-tax-icon-wrap">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 700, margin: 0 }}>
                      Alíquota Fiscal & Impostos Globais
                    </h4>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)', margin: '2px 0 0 0' }}>
                      Imposto unificado padrão aplicado automaticamente em todos os produtos da loja
                    </p>
                  </div>
                </div>

                <div className="adm-tax-control">
                  <div className="adm-tax-input-group">
                    <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--dark-600)', marginBottom: 4, display: 'block' }}>
                      Alíquota Geral de Imposto (%):
                    </label>
                    <div className="adm-tax-field-flex">
                      <div className="input-wrap" style={{ maxWidth: 160 }}>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          className="input-field"
                          value={taxInput}
                          onChange={e => setTaxInput(e.target.value)}
                          placeholder="Ex: 10"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => updateGlobalTaxRate(taxInput, true)}
                      >
                        <Sparkles size={14} /> Atualizar em Todos os Produtos ({products.length})
                      </button>
                    </div>
                  </div>
                  <span className="adm-tax-helper-text">
                    💡 Ao atualizar, os preços de venda e preços riscados de todos os <strong>{products.length} produtos</strong> são recalculados automaticamente com base no custo, margem e no novo imposto de <strong>{taxInput}%</strong>, aplicando o arredondamento comercial (terminação em 5 ou 9).
                  </span>
                </div>
              </div>

              {/* Recent orders */}
              <h3 style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>Pedidos Recentes</h3>
              {orders.length === 0 ? (
                <p style={{ color: 'var(--dark-400)', fontSize: 'var(--text-sm)' }}>Nenhum pedido realizado ainda.</p>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>
                      {orders.slice(0, 5).map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong></td>
                          <td>{o.cliente?.nome || 'N/A'}</td>
                          <td>R$ {(o.total || 0).toFixed(2).replace('.', ',')}</td>
                          <td><span className={`badge badge-${o.status === 'Pendente' ? 'amber' : o.status === 'Pago' ? 'lime' : 'dark'}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Clientes */}
          {tab === 'customers' && (
            <AdminCustomersSection />
          )}

          {/* SEO e Divulgação Multiloja */}
          {tab === 'marketing' && (
            <AdminMarketingSection
              products={products}
              orders={orders}
              companyData={companyData}
              showToast={showToast}
              onEditProduct={(prod) => {
                setEditingProduct(prod)
              }}
            />
          )}

          {/* Products Management (Catálogo & Cadastro Inteligente) */}
          {(tab === 'products' || tab === 'add') && (
            <div className="adm-products">
              {/* Header inteligente de alternância interna */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: 'var(--space-4)',
                borderBottom: '1px solid var(--dark-200)',
                paddingBottom: '12px'
              }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${productViewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setProductViewMode('list')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Package size={16} /> Catálogo de Produtos ({products.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${productViewMode === 'add' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setProductViewMode('add')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={16} /> Cadastrar Produto
                  </button>
                  {products.length > 0 && productViewMode === 'list' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowClearCatalogModal(true)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--red)', color: 'var(--red)' }}
                      title="Apagar todos os produtos do catálogo e do banco de dados"
                    >
                      <Trash2 size={14} /> Zerar Catálogo
                    </button>
                  )}
                </div>

                {productViewMode === 'add' && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setProductViewMode('list')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--dark-600)' }}
                  >
                    <ArrowLeft size={16} /> Voltar para Lista
                  </button>
                )}
              </div>

              {productViewMode === 'add' ? (
                renderAddProductForm()
              ) : (
                <>
                  {/* Product Search & Quick Actions */}
                  <div className="adm-products-bar">
                    <div className="adm-search-input-wrap">
                      <Search size={16} className="adm-search-icon" />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Buscar por nome, marca, categoria ou EAN..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                      <th>Marca / Cat.</th>
                      <th>Custo</th>
                      <th>Preço de Venda</th>
                      <th>Estoque</th>
                      <th>Destaque</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminProducts.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--dark-400)' }}>
                          Nenhum produto encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredAdminProducts.map(p => (
                        <tr key={p.id}>
                          <td style={{ minWidth: 220 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img
                                src={p.images?.[0] || 'https://via.placeholder.com/60'}
                                alt=""
                                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'contain', background: '#ffffff', border: '1px solid var(--dark-200)', padding: 2 }}
                              />
                              <div>
                                <strong style={{ fontSize: 'var(--text-sm)', display: 'block' }}>{p.name}</strong>
                                {p.ean && <span style={{ fontSize: '11px', color: 'var(--dark-400)', fontFamily: 'monospace' }}>EAN: {p.ean}</span>}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'block', fontWeight: 600 }}>{p.brand}</span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)' }}>{p.category}</span>
                          </td>
                          <td style={{ color: 'var(--dark-500)' }}>
                            R$ {(parseFloat(p.costPrice) || 0).toFixed(2).replace('.', ',')}
                          </td>
                          <td>
                            <strong className="price-current" style={{ fontSize: 'var(--text-sm)' }}>
                              R$ {(parseFloat(p.price) || 0).toFixed(2).replace('.', ',')}
                            </strong>
                            {p.originalPrice && (
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--dark-400)', textDecoration: 'line-through' }}>
                                R$ {(parseFloat(p.originalPrice) || 0).toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={p.stock <= 0 ? 'badge badge-red' : p.stock <= 5 ? 'badge badge-amber' : 'badge badge-lime'}>
                              {p.stock} un.
                            </span>
                          </td>
                          <td>
                            {p.featured ? (
                              <span className="badge badge-amber">★ Destaque</span>
                            ) : (
                              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-400)' }}>Normal</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleStartEdit(p)}
                                title="Editar todas as informações do produto"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              >
                                <Pencil size={14} />
                                <span>Editar</span>
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setLabelProduct(p)}
                                title="Imprimir Etiqueta de Código de Barras"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: 'var(--lime)', color: 'var(--lime-dark)' }}
                              >
                                <Printer size={14} />
                                <span>Etiqueta</span>
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--red)' }}
                                onClick={() => setProductToDelete(p)}
                                title="Excluir produto"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

          {/* Orders */}
          {tab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <div className="empty-state">
                  <ShoppingCart size={48} />
                  <p>Nenhum pedido registrado</p>
                </div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Pagamento</th><th>Total</th><th>Status</th><th>Ações</th></tr></thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o.id}>
                          <td><strong>{o.id}</strong></td>
                          <td>{new Date(o.date).toLocaleDateString('pt-BR')}</td>
                          <td>
                            <div>
                              <strong>{o.cliente?.nome || 'N/A'}</strong>
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--dark-400)' }}>{o.cliente?.cidade}/{o.cliente?.estado}</span>
                            </div>
                          </td>
                          <td><span className="badge badge-dark">{o.paymentMethod || 'N/A'}</span></td>
                          <td><strong>R$ {(o.total || 0).toFixed(2).replace('.', ',')}</strong></td>
                          <td>
                            <select
                              value={o.status}
                              onChange={e => updateOrderStatus(o.id, e.target.value)}
                              className="input-field"
                              style={{ padding: '4px 8px', fontSize: 'var(--text-xs)', width: 'auto' }}
                            >
                              <option>Pendente</option>
                              <option>Pago</option>
                              <option>Em Separação</option>
                              <option>Enviado</option>
                              <option>Entregue</option>
                              <option>Cancelado</option>
                            </select>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {/* Botão de Etiqueta e Declaração de Conteúdo */}
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() => setLabelOrderToPrint(o)}
                                title="Imprimir Etiqueta Oficial dos Correios e Declaração de Conteúdo"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: '#0284c7', color: '#0284c7' }}
                              >
                                <Printer size={13} />
                                <span>Etiqueta</span>
                              </button>

                              {/* Botão de Rastreamento dos Correios */}
                              {o.trackingCode ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                                  <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => openTrackingModal(o.trackingCode)}
                                    title={`Rastrear objeto ${o.trackingCode} em tempo real`}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: 'var(--amber)', color: '#b45309' }}
                                  >
                                    <Truck size={13} />
                                    <span>{o.trackingCode}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                      setOrderToEditTracking(o)
                                      setTrackingCodeInput(o.trackingCode || '')
                                    }}
                                    title="Editar código de rastreamento"
                                    style={{ padding: '4px', color: 'var(--dark-500)' }}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => {
                                    setOrderToEditTracking(o)
                                    setTrackingCodeInput(o.trackingCode || '')
                                  }}
                                  title="Adicionar código de rastreamento dos Correios"
                                  style={{ fontSize: '11px', color: 'var(--dark-500)' }}
                                >
                                  + Rastreio
                                </button>
                              )}

                              {/* Botão WhatsApp 1-Click para comunicação com o cliente */}
                              {o.cliente?.telefone && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  onClick={() => {
                                    let msg = ''
                                    const publicStoreName = getCompanyPublicName(companyData)
                                    if (o.status === 'Pendente') {
                                      msg = buildPaymentReminderMessage(o, companyData)
                                    } else if (o.status === 'Enviado') {
                                      msg = buildShippingNotificationMessage(o, companyData)
                                    } else if (o.status === 'Entregue') {
                                      msg = buildDeliveredNotificationMessage(o, companyData)
                                    } else {
                                      msg = `Olá ${o.cliente?.nome || ''}! Aqui é da *${publicStoreName}* referente ao seu Pedido *#${o.id}*. Status atual: *${o.status}*. Se tiver qualquer dúvida, estamos à disposição!`
                                    }
                                    const link = createWhatsAppLink(o.cliente.telefone, msg)
                                    window.open(link, '_blank', 'noopener,noreferrer')
                                  }}
                                  title={`Enviar notificação via WhatsApp (${o.status === 'Pendente' ? 'Lembrete de Pagamento' : o.status === 'Enviado' ? 'Código de Rastreio' : 'Atualização'})`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    background: '#25D366',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <MessageCircle size={13} />
                                  <span>WhatsApp</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Shipping & Delivery Tab (Correios Multiempresa) */}
          {tab === 'shipping' && (
            <div className="adm-shipping-tab">
              <div className="adm-sec-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div className="adm-sec-header">
                  <Truck size={26} className="adm-sec-icon" style={{ color: '#0284c7', background: '#e0f2fe' }} />
                  <div>
                    <h3>Configurações de Frete & Entregas — Correios</h3>
                    <p>Gerencie o contrato comercial dos Correios, credenciais de API e modalidades ativas para sua loja.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveCorreios} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                  {/* Status Geral */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--dark-50)', borderRadius: '10px', border: '1px solid var(--dark-200)' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: 'var(--text-md)' }}>Integração Oficial dos Correios</strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)' }}>
                        Quando ativada, o cálculo de frete no carrinho e checkout consultará seu contrato dos Correios em tempo real.
                      </span>
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={correiosForm.enabled}
                        onChange={e => setCorreiosForm({ ...correiosForm, enabled: e.target.checked })}
                        style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                      />
                      <span>{correiosForm.enabled ? 'Ativada' : 'Desativada'}</span>
                    </label>
                  </div>

                  {/* Multiempresa / Loja */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                    <div className="ck-field">
                      <label>Identificador da Loja / Empresa (Store ID):</label>
                      <input
                        type="text"
                        className="input-field"
                        value={correiosForm.storeId}
                        onChange={e => setCorreiosForm({ ...correiosForm, storeId: e.target.value })}
                        placeholder="default"
                      />
                      <small style={{ color: 'var(--dark-400)', fontSize: '11px' }}>Permite configurações de frete isoladas por empresa/filial</small>
                    </div>

                    <div className="ck-field">
                      <label>CEP de Origem das Encomendas:</label>
                      <input
                        type="text"
                        className="input-field"
                        value={correiosForm.cepOrigem}
                        onChange={e => setCorreiosForm({ ...correiosForm, cepOrigem: formatCep(e.target.value) })}
                        placeholder="70673-631"
                        maxLength={9}
                      />
                      <small style={{ color: 'var(--dark-400)', fontSize: '11px' }}>CEP de onde saem as mercadorias</small>
                    </div>
                  </div>

                  {/* Credenciais Oficiais */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                    <div className="ck-field">
                      <label>Usuário / ID Correios:</label>
                      <input
                        type="text"
                        className="input-field"
                        value={correiosForm.usuario}
                        onChange={e => setCorreiosForm({ ...correiosForm, usuario: e.target.value })}
                        placeholder="Ex: seu-usuario ou CNPJ"
                      />
                    </div>

                    <div className="ck-field">
                      <label>Código de Acesso às APIs (Token/Senha):</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showCodigoAcesso ? 'text' : 'password'}
                          className="input-field"
                          value={correiosForm.codigoAcesso || ''}
                          onChange={e => setCorreiosForm({ ...correiosForm, codigoAcesso: e.target.value })}
                          placeholder="Insira o código de acesso às APIs"
                          style={{ paddingRight: '40px' }}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCodigoAcesso(!showCodigoAcesso)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-500)' }}
                          title={showCodigoAcesso ? 'Ocultar Código' : 'Exibir Código'}
                        >
                          {showCodigoAcesso ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <small style={{ color: 'var(--dark-400)', fontSize: '11px' }}>
                        {correiosForm.codigoAcesso ? '🔒 Token salvo e protegido. Clique no olho para visualizar ou digite para alterar.' : 'Chave gerada no portal Meu Correios'}
                      </small>
                    </div>
                  </div>

                  {/* Contrato e DR */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
                    <div className="ck-field">
                      <label>Número do Contrato:</label>
                      <input
                        type="text"
                        className="input-field"
                        value={correiosForm.contrato}
                        onChange={e => setCorreiosForm({ ...correiosForm, contrato: e.target.value })}
                        placeholder="Ex: 9912345678"
                      />
                    </div>

                    <div className="ck-field">
                      <label>DR / Superintendência Estadual:</label>
                      <input
                        type="text"
                        className="input-field"
                        value={correiosForm.dr}
                        onChange={e => setCorreiosForm({ ...correiosForm, dr: e.target.value })}
                        placeholder="Ex: 10 (DF)"
                      />
                      <small style={{ color: 'var(--dark-400)', fontSize: '11px' }}>Ex: 10 para DF, 04 para SP, etc.</small>
                    </div>
                  </div>

                  {/* Modalidades de Entrega */}
                  <div style={{ padding: '16px', background: 'var(--dark-50)', borderRadius: '10px', border: '1px solid var(--dark-200)' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600 }}>Modalidades Habilitadas na Loja:</label>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={correiosForm.pacEnabled}
                          onChange={e => setCorreiosForm({ ...correiosForm, pacEnabled: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                        />
                        <span><strong>PAC</strong> (Encomenda Econômica)</span>
                      </label>

                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={correiosForm.sedexEnabled}
                          onChange={e => setCorreiosForm({ ...correiosForm, sedexEnabled: e.target.checked })}
                          style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
                        />
                        <span><strong>SEDEX</strong> (Encomenda Expressa)</span>
                      </label>
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSavingCorreios}
                    >
                      {isSavingCorreios ? 'Salvando...' : 'Salvar Configurações'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleTestCorreios}
                      disabled={isTestingCorreios}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: '#0284c7', color: '#0284c7' }}
                    >
                      {isTestingCorreios ? (
                        <><Loader2 size={16} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> Testando Conexão...</>
                      ) : (
                        <><RefreshCw size={16} /> Testar Conexão</>
                      )}
                    </button>
                  </div>

                  {/* Painel de Resultados do Teste */}
                  {testResults && (
                    <div style={{ marginTop: 'var(--space-4)', padding: '20px', borderRadius: '10px', background: testResults.success ? '#f0fdf4' : '#fff7ed', border: `1px solid ${testResults.success ? '#bbf7d0' : '#fed7aa'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        {testResults.success ? (
                          <CheckCircle2 size={24} style={{ color: '#16a34a' }} />
                        ) : (
                          <AlertCircle size={24} style={{ color: '#ea580c' }} />
                        )}
                        <div>
                          <strong style={{ fontSize: '1rem', color: testResults.success ? '#166534' : '#9a3412', display: 'block' }}>
                            {testResults.success ? 'Diagnóstico Concluído com Sucesso' : 'Diagnóstico dos Correios'}
                          </strong>
                          <span style={{ fontSize: '12px', color: testResults.success ? '#15803d' : '#c2410c' }}>
                            {testResults.message} {testResults.drIdentificada && `(DR Confirmada: ${testResults.drIdentificada})`}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                        {testResults.results?.map((res, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              padding: '10px 12px',
                              background: '#fff',
                              borderRadius: '6px',
                              border: `1px solid ${res.ok ? '#dcfce7' : '#fee2e2'}`
                            }}
                          >
                            <span style={{ color: res.ok ? '#16a34a' : '#ef4444', fontWeight: 'bold', fontSize: '16px' }}>
                              {res.ok ? '✓' : '✗'}
                            </span>
                            <div>
                              <strong style={{ fontSize: '12px', color: 'var(--dark-800)', display: 'block' }}>{res.item}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>{res.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Company Data Tab */}
          {tab === 'company' && (
            <div className="adm-editor-form">
              <div className="adm-editor-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--lime-glow)', color: 'var(--lime-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Dados da Empresa & Identidade Visual</h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--dark-500)' }}>
                      Personalize os dados cadastrais, fiscais e a marca do seu e-commerce. As alterações são sincronizadas automaticamente em toda a loja pública.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCompany} className="adm-editor-grid">
                {/* Linha Superior: Fiscal & Jurídica (Esquerda) + Contatos (Direita) */}
                <div className="adm-company-two-col">
                  {/* 1. Identificação Fiscal & Jurídica */}
                  <div className="adm-editor-section" style={{ height: '100%' }}>
                    <h4 className="adm-section-title">
                      <Briefcase size={16} /> Identificação Fiscal & Jurídica
                    </h4>
                    <div className="adm-form-grid">
                      <div className="ck-field adm-col-12">
                        <label>Razão Social *</label>
                        <input
                          className="input-field"
                          value={companyForm.razaoSocial || ''}
                          onChange={e => setCompanyForm({ ...companyForm, razaoSocial: e.target.value })}
                          placeholder="Ex: Minha Empresa Comercial Ltda"
                          required
                        />
                      </div>
                      <div className="ck-field adm-col-12">
                        <label>Nome Fantasia (Nome Público da Loja) *</label>
                        <input
                          className="input-field"
                          value={companyForm.nomeFantasia || ''}
                          onChange={e => setCompanyForm({ ...companyForm, nomeFantasia: e.target.value })}
                          placeholder="Ex: Minha Loja Store"
                          required
                        />
                        <span style={{ fontSize: '11px', color: 'var(--dark-500)', marginTop: '2px', display: 'block' }}>
                          💡 Exibido no cabeçalho, título do navegador e rodapé.
                        </span>
                      </div>
                      <div className="ck-field adm-col-4">
                        <label>CNPJ *</label>
                        <input
                          className="input-field"
                          value={companyForm.cnpj || ''}
                          onChange={e => setCompanyForm({ ...companyForm, cnpj: formatCnpj(e.target.value) })}
                          placeholder="00.000.000/0000-00"
                          maxLength={18}
                        />
                      </div>
                      <div className="ck-field adm-col-4">
                        <label>Inscrição Estadual (IE)</label>
                        <input
                          className="input-field"
                          value={companyForm.inscricaoEstadual || ''}
                          onChange={e => setCompanyForm({ ...companyForm, inscricaoEstadual: e.target.value })}
                          placeholder="Ex: 07.123.456/001-00 ou Isento"
                        />
                      </div>
                      <div className="ck-field adm-col-4">
                        <label>Inscrição Municipal (IM)</label>
                        <input
                          className="input-field"
                          value={companyForm.inscricaoMunicipal || ''}
                          onChange={e => setCompanyForm({ ...companyForm, inscricaoMunicipal: e.target.value })}
                          placeholder="Ex: 12345678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Contatos & Canais de Atendimento */}
                  <div className="adm-editor-section" style={{ height: '100%' }}>
                    <h4 className="adm-section-title">
                      <Phone size={16} /> Contatos & Canais Oficiais de Atendimento
                    </h4>
                    <div className="adm-form-grid">
                      <div className="ck-field adm-col-12">
                        <label>E-mail de Contato / Institucional *</label>
                        <input
                          type="email"
                          className="input-field"
                          value={companyForm.emailPrincipal || ''}
                          onChange={e => setCompanyForm({ ...companyForm, emailPrincipal: e.target.value })}
                          placeholder="contato@suaempresa.com.br"
                          required
                        />
                      </div>
                      <div className="ck-field adm-col-6">
                        <label>Telefone Fixo</label>
                        <input
                          className="input-field"
                          value={companyForm.telefone || ''}
                          onChange={e => setCompanyForm({ ...companyForm, telefone: formatCompanyPhone(e.target.value) })}
                          placeholder="(61) 3033-0000"
                          maxLength={15}
                        />
                      </div>
                      <div className="ck-field adm-col-6">
                        <label>WhatsApp Oficial da Loja *</label>
                        <input
                          className="input-field"
                          value={companyForm.whatsapp || ''}
                          onChange={e => setCompanyForm({ ...companyForm, whatsapp: formatCompanyPhone(e.target.value) })}
                          placeholder="(61) 9 9999-9999"
                          maxLength={16}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--dark-500)', marginTop: '2px', display: 'block' }}>
                          💬 Utilizado nos botões de contato do rodapé e checkout.
                        </span>
                      </div>
                      <div className="ck-field adm-col-12">
                        <label>Site Oficial / Domínio</label>
                        <input
                          type="url"
                          className="input-field"
                          value={companyForm.site || ''}
                          onChange={e => setCompanyForm({ ...companyForm, site: e.target.value })}
                          placeholder="https://suaempresa.com.br"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Endereço da Sede & Expedição */}
                <div className="adm-editor-section">
                  <h4 className="adm-section-title">
                    <MapPin size={16} /> Endereço da Sede & Centro de Distribuição
                  </h4>
                  <div className="adm-form-grid">
                    <div className="ck-field adm-col-3">
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>CEP da Sede *</span>
                        {isSearchingCompanyCep && (
                          <span style={{ fontSize: '11px', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Loader2 size={11} className="spin" /> Buscando...
                          </span>
                        )}
                      </label>
                      <input
                        className="input-field"
                        value={companyForm.cep || ''}
                        onChange={e => handleCompanyCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                      />
                    </div>
                    <div className="ck-field adm-col-6">
                      <label>Logradouro / Endereço *</label>
                      <input
                        className="input-field"
                        value={companyForm.endereco || ''}
                        onChange={e => setCompanyForm({ ...companyForm, endereco: e.target.value })}
                        placeholder="Ex: Av. Paulista ou CLSW 304 Bloco A"
                        required
                      />
                    </div>
                    <div className="ck-field adm-col-3">
                      <label>Número *</label>
                      <input
                        className="input-field"
                        value={companyForm.numero || ''}
                        onChange={e => setCompanyForm({ ...companyForm, numero: e.target.value })}
                        placeholder="Ex: 108 ou S/N"
                        required
                      />
                    </div>
                    <div className="ck-field adm-col-3">
                      <label>Complemento</label>
                      <input
                        className="input-field"
                        value={companyForm.complemento || ''}
                        onChange={e => setCompanyForm({ ...companyForm, complemento: e.target.value })}
                        placeholder="Ex: Sala 108, Andar 2, Galpão B"
                      />
                    </div>
                    <div className="ck-field adm-col-3">
                      <label>Bairro *</label>
                      <input
                        className="input-field"
                        value={companyForm.bairro || ''}
                        onChange={e => setCompanyForm({ ...companyForm, bairro: e.target.value })}
                        placeholder="Ex: Sudoeste ou Centro"
                        required
                      />
                    </div>
                    <div className="ck-field adm-col-3">
                      <label>Cidade *</label>
                      <input
                        className="input-field"
                        value={companyForm.cidade || ''}
                        onChange={e => setCompanyForm({ ...companyForm, cidade: e.target.value })}
                        placeholder="Ex: Brasília"
                        required
                      />
                    </div>
                    <div className="ck-field adm-col-1">
                      <label>UF *</label>
                      <input
                        className="input-field"
                        value={companyForm.estado || ''}
                        onChange={e => setCompanyForm({ ...companyForm, estado: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="DF"
                        maxLength={2}
                        required
                        style={{ textAlign: 'center' }}
                      />
                    </div>
                    <div className="ck-field adm-col-2">
                      <label>País</label>
                      <input
                        className="input-field"
                        value={companyForm.pais || 'Brasil'}
                        onChange={e => setCompanyForm({ ...companyForm, pais: e.target.value })}
                        placeholder="Brasil"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Identidade Visual & Logotipo */}
                <div className="adm-editor-section">
                  <h4 className="adm-section-title">
                    <ImageIcon size={16} /> Identidade Visual & Logotipo da Loja
                  </h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {/* Área de Upload e Prévia da Logo */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 'var(--space-4)',
                      alignItems: 'start'
                    }}>
                      {/* Box de Prévia */}
                      <div style={{
                        padding: 'var(--space-4)',
                        border: '1px solid var(--dark-200)',
                        borderRadius: 'var(--radius-lg)',
                        background: '#ffffff',
                        textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--dark-500)', fontWeight: 700, letterSpacing: '0.5px' }}>
                            PRÉVIA DA LOGO
                          </span>
                        </div>
                        
                        <div style={{
                          minHeight: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                          backgroundSize: '16px 16px',
                          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          padding: '16px',
                          marginBottom: '10px'
                        }}>
                          {logoPreview ? (
                            <img
                              src={logoPreview}
                              alt={companyForm.logoAlt || 'Logo da Empresa'}
                              style={{
                                maxHeight: '60px',
                                maxWidth: '100%',
                                objectFit: 'contain'
                              }}
                            />
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', fontWeight: 500 }}>
                              Nenhuma logo enviada (exibindo nome em texto)
                            </span>
                          )}
                        </div>

                        {logoPreview && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={handleRemoveCompanyLogo}
                            style={{ color: 'var(--red)', fontSize: '12px' }}
                          >
                            <Trash2 size={13} /> Remover Logo Atual
                          </button>
                        )}
                      </div>

                      {/* Box de Envio de Arquivo */}
                      <div style={{
                        padding: 'var(--space-4)',
                        border: '2px dashed var(--dark-200)',
                        borderRadius: 'var(--radius-lg)',
                        background: '#ffffff',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}>
                        <Upload size={28} style={{ color: 'var(--dark-400)' }} />
                        <strong style={{ fontSize: '13px', color: 'var(--dark-800)' }}>
                          Enviar Nova Logo
                        </strong>
                        <p style={{ fontSize: '11px', color: 'var(--dark-500)', margin: 0, maxWidth: '240px' }}>
                          Aceita formatos <strong>PNG, JPG, JPEG ou WEBP</strong> de até <strong>2 MB</strong>.
                        </p>

                        <label
                          className="btn btn-outline btn-sm"
                          style={{ cursor: 'pointer', marginTop: '4px' }}
                        >
                          <span>Selecionar Arquivo</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            onChange={handleCompanyLogoUpload}
                            style={{ display: 'none' }}
                          />
                        </label>

                        {logoError && (
                          <span style={{ color: 'var(--red)', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
                            ⚠️ {logoError}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ck-form-grid">
                      <div className="ck-field">
                        <label>Texto Alternativo da Logo (SEO & Acessibilidade)</label>
                        <input
                          className="input-field"
                          value={companyForm.logoAlt || ''}
                          onChange={e => setCompanyForm({ ...companyForm, logoAlt: e.target.value })}
                          placeholder="Ex: Minha Loja - Variedades e Tecnologia"
                        />
                      </div>
                      <div className="ck-field">
                        <label>Caminho ou URL do Favicon (Ícone do Navegador)</label>
                        <input
                          className="input-field"
                          value={companyForm.favicon || ''}
                          onChange={e => setCompanyForm({ ...companyForm, favicon: e.target.value })}
                          placeholder="/favicon.jpg"
                        />
                      </div>
                      <div className="ck-field ck-field-full">
                        <label>Descrição Curta da Empresa (Meta Description & SEO)</label>
                        <textarea
                          className="input-field"
                          rows={2}
                          value={companyForm.descricaoCurta || ''}
                          onChange={e => setCompanyForm({ ...companyForm, descricaoCurta: e.target.value })}
                          placeholder="Breve resumo da loja exibido nas buscas do Google e no rodapé."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações de Salvamento */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: 'var(--space-4)' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={isSavingCompany}
                    style={{ minWidth: '220px' }}
                  >
                    {isSavingCompany ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        <span>Salvando e Atualizando Loja...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Salvar Dados da Empresa</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mercado Pago Payments Configuration & History */}
          {tab === 'payments' && (
            <AdminPaymentsSection />
          )}

          {/* Security & Password Tab */}
          {tab === 'security' && (
            <div className="adm-security-tab">
              <div className="adm-sec-card">
                <div className="adm-sec-header">
                  <KeyRound size={24} className="adm-sec-icon" />
                  <div>
                    <h3>Alteração de Senha de Administrador</h3>
                    <p>Atualize a senha de acesso para manter a segurança do seu painel e dados.</p>
                  </div>
                </div>

                <form className="adm-sec-form" onSubmit={handlePasswordChangeSubmit}>
                  <div className="ck-field">
                    <label>Senha Atual</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Digite a senha atual"
                      value={passForm.current}
                      onChange={e => setPassForm({ ...passForm, current: e.target.value })}
                    />
                  </div>
                  <div className="ck-field">
                    <label>Nova Senha (mínimo 6 caracteres)</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Nova senha segura"
                      value={passForm.newPass}
                      onChange={e => setPassForm({ ...passForm, newPass: e.target.value })}
                    />
                  </div>
                  <div className="ck-field">
                    <label>Confirmar Nova Senha</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Repita a nova senha"
                      value={passForm.confirm}
                      onChange={e => setPassForm({ ...passForm, confirm: e.target.value })}
                    />
                  </div>

                  {passError && (
                    <div className="adm-sec-alert error">
                      <AlertCircle size={16} />
                      <span>{passError}</span>
                    </div>
                  )}

                  {passSuccess && (
                    <div className="adm-sec-alert success">
                      <CheckCircle2 size={16} />
                      <span>{passSuccess}</span>
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }}>
                    <Lock size={16} />
                    Salvar Nova Senha
                  </button>
                </form>
              </div>

              {/* Security info card */}
              <div className="adm-sec-card" style={{ marginTop: 'var(--space-4)' }}>
                <div className="adm-sec-header">
                  <Shield size={24} className="adm-sec-icon" />
                  <div>
                    <h3>Status da Conta</h3>
                    <p>Detalhes e auditoria de segurança da sessão ativa.</p>
                  </div>
                </div>
                <div className="adm-sec-info-grid">
                  <div>
                    <span className="adm-sec-label">Administrador:</span>
                    <strong>{adminConfig.name}</strong>
                  </div>
                  <div>
                    <span className="adm-sec-label">E-mail Principal:</span>
                    <strong>{adminConfig.email}</strong>
                  </div>
                  <div>
                    <span className="adm-sec-label">Perfil de Acesso:</span>
                    <span className="badge badge-lime">{adminConfig.role}</span>
                  </div>
                  <div>
                    <span className="adm-sec-label">Proteção Ativa:</span>
                    <span className="badge badge-lime">Rate-limiting + Criptografia</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================
            MODAL COMPLETO DE EDIÇÃO DE PRODUTO
           ========================================================= */}
        {editingProduct && (
          <div className="overlay" style={{ zIndex: 600 }}>
            <div className="modal modal-lg adm-edit-modal">
              <div className="adm-edit-modal-header">
                <div>
                  <span className="badge badge-lime" style={{ marginBottom: 6 }}>Modo Edição Completa</span>
                  <h2>Editar: {editingProduct.name}</h2>
                </div>
                <button className="modal-close" onClick={() => setEditingProduct(null)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="adm-edit-modal-body">
                {/* 1. Informações Básicas */}
                <div className="adm-editor-section">
                  <h4 className="adm-section-title"><Package size={16} /> Dados Cadastrais</h4>
                  <div className="ck-form-grid">
                    <div className="ck-field ck-field-full">
                      <label>Nome do Produto *</label>
                      <input
                        className="input-field"
                        value={editingProduct.name}
                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="ck-field">
                      <label>Marca / Fabricante *</label>
                      <input
                        className="input-field"
                        list="brand-suggestions-list"
                        value={editingProduct.brand}
                        onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                        placeholder="Selecione ou digite a marca..."
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="ck-field">
                      <label>Categoria / Departamento *</label>
                      <select
                        className="input-field"
                        value={editingProduct.category}
                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      >
                        <option>Eletrônicos & Tecnologia</option>
                        <option>Informática & Periféricos</option>
                        <option>Escritório & Suprimentos</option>
                        <option>Casa & Utilidades</option>
                        <option>Ferramentas & Acessórios</option>
                        <option>Hardware</option>
                        <option>Periféricos</option>
                        <option>Monitores</option>
                        <option>Notebooks</option>
                        <option>Redes</option>
                        <option>Acessórios</option>
                        <option>Outros</option>
                      </select>
                    </div>
                    <div className="ck-field">
                      <label>Código EAN-13 / Barras</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          className="input-field"
                          value={editingProduct.ean || ''}
                          onChange={e => setEditingProduct({ ...editingProduct, ean: e.target.value })}
                          placeholder="7891234567890"
                        />
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            const autoEan = generateValidEan13('789')
                            setEditingProduct({ ...editingProduct, ean: autoEan })
                            showToast(`Código EAN-13 gerado: ${autoEan} 🎲`)
                          }}
                          title="Gerar novo código de barras EAN-13"
                        >
                          <Sparkles size={14} /> Gerar
                        </button>
                      </div>
                    </div>
                    <div className="ck-field">
                      <label>Estoque Atual (unidades) *</label>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        value={editingProduct.stock}
                        onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                        required
                      />
                    </div>
                    <div className="ck-field ck-field-full">
                      <label className="adm-checkbox-label">
                        <input
                          type="checkbox"
                          checked={editingProduct.featured || false}
                          onChange={e => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                        />
                        <span>⭐ Produto em Destaque na Vitrine Principal</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Preços & Margens */}
                <div className="adm-editor-section">
                  <div className="adm-section-header-flex">
                    <h4 className="adm-section-title"><DollarSign size={16} /> Precificação & Custos</h4>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        const calculated = calcSellPrice(editingProduct.costPrice, editingProduct.taxRate, editingProduct.marginRate)
                        const calculatedOriginal = calcCommercialOriginalPrice(calculated)
                        setEditingProduct({
                          ...editingProduct,
                          price: calculated,
                          originalPrice: calculatedOriginal
                        })
                        showToast(`Preço recalculado para R$ ${calculated.toFixed(2).replace('.', ',')}`)
                      }}
                      title="Recalcular Preço de Venda com base no Custo, Alíquota e Margem"
                    >
                      <RefreshCw size={14} /> Recalcular Preço
                    </button>
                  </div>
                  <div className="ck-form-grid">
                    <div className="ck-field">
                      <label>Preço de Custo (R$) *</label>
                      <input
                        className="input-field"
                        type="number"
                        step="0.01"
                        value={editingProduct.costPrice}
                        onChange={e => handleEditCostChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="ck-field">
                      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Alíquota / Impostos (%)</span>
                        <span className="badge badge-lime" style={{ fontSize: 10 }}>Padrão Global: {globalTaxRate}%</span>
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        step="0.1"
                        value={editingProduct.taxRate || 0}
                        onChange={e => handleEditTaxChange(e.target.value)}
                      />
                    </div>
                    <div className="ck-field">
                      <label>Margem de Lucro (%)</label>
                      <input
                        className="input-field"
                        type="number"
                        step="0.1"
                        value={editingProduct.marginRate || 0}
                        onChange={e => handleEditMarginChange(e.target.value)}
                      />
                    </div>
                    <div className="ck-field">
                      <label>Preço de Venda ao Cliente (R$) *</label>
                      <input
                        className="input-field"
                        type="number"
                        step="0.01"
                        value={editingProduct.price}
                        onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })}
                        required
                      />
                    </div>
                    <div className="ck-field">
                      <label>Preço "De" Riscado (R$)</label>
                      <input
                        className="input-field"
                        type="number"
                        step="0.01"
                        value={editingProduct.originalPrice || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, originalPrice: e.target.value })}
                        placeholder="Opcional: preço antigo"
                      />
                    </div>
                    <div className="ck-field">
                      <label>Margem Bruta Unitária Estimada:</label>
                      <div className="adm-auto-price" style={{ fontSize: 'var(--text-sm)' }}>
                        + R$ {Math.max(0, (parseFloat(editingProduct.price) || 0) - (parseFloat(editingProduct.costPrice) || 0)).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Descrição */}
                <div className="adm-editor-section">
                  <h4 className="adm-section-title"><Layers size={16} /> Descrição Detalhada</h4>
                  <div className="ck-field">
                    <textarea
                      className="input-field"
                      rows={4}
                      value={editingProduct.description || ''}
                      onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                      placeholder="Descrição técnica e comercial do produto..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* 4. Fotos / Imagens */}
                <div className="adm-editor-section">
                  <div className="adm-section-header-flex">
                    <h4 className="adm-section-title"><ImageIcon size={16} /> Fotos do Produto (URLs)</h4>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingProduct({ ...editingProduct, images: [...editingProduct.images, ''] })}
                    >
                      <Plus size={14} /> Adicionar Foto
                    </button>
                  </div>

                  <div className="adm-images-list">
                    {editingProduct.images.map((img, idx) => (
                      <div key={idx} className="adm-image-row">
                        <input
                          type="text"
                          className="input-field"
                          placeholder="URL da imagem (ex: https://...)"
                          value={img}
                          onChange={e => {
                            const updated = [...editingProduct.images]
                            updated[idx] = e.target.value
                            setEditingProduct({ ...editingProduct, images: updated })
                          }}
                        />
                        {img && (
                          <img src={img} alt="Preview" className="adm-img-preview" />
                        )}
                        {editingProduct.images.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => {
                              const updated = editingProduct.images.filter((_, i) => i !== idx)
                              setEditingProduct({ ...editingProduct, images: updated })
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Ficha Técnica */}
                <div className="adm-editor-section">
                  <div className="adm-section-header-flex">
                    <h4 className="adm-section-title"><Sliders size={16} /> Ficha Técnica / Especificações</h4>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setEditingProduct({
                        ...editingProduct,
                        specs: [...(editingProduct.specs || []), { label: '', value: '' }]
                      })}
                    >
                      <Plus size={14} /> Adicionar Atributo
                    </button>
                  </div>

                  <div className="adm-specs-list">
                    {(editingProduct.specs || []).map((spec, idx) => (
                      <div key={idx} className="adm-spec-edit-row">
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Atributo (ex: Conectividade)"
                          value={spec.label}
                          onChange={e => {
                            const updated = [...editingProduct.specs]
                            updated[idx].label = e.target.value
                            setEditingProduct({ ...editingProduct, specs: updated })
                          }}
                        />
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Valor (ex: USB-C, Wi-Fi 6)"
                          value={spec.value}
                          onChange={e => {
                            const updated = [...editingProduct.specs]
                            updated[idx].value = e.target.value
                            setEditingProduct({ ...editingProduct, specs: updated })
                          }}
                        />
                        {editingProduct.specs.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => {
                              const updated = editingProduct.specs.filter((_, i) => i !== idx)
                              setEditingProduct({ ...editingProduct, specs: updated })
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. SEO & Divulgação no Google (Shopping / Merchant) */}
                <div className="adm-editor-section" style={{ background: 'var(--dark-50)', border: '1px solid var(--dark-200)', borderRadius: 12, padding: 16 }}>
                  <h4 className="adm-section-title"><Globe size={16} /> SEO & Divulgação no Google (Shopping / Merchant)</h4>
                  <div className="adm-form-grid" style={{ marginTop: 12 }}>
                    <div className="ck-field adm-col-6">
                      <label>Slug da URL (URL Amigável):</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: teclado-gamer-rgb-infodesk"
                        value={editingProduct.slug || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, slug: slugify(e.target.value) })}
                      />
                      <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>Identificador único para a URL pública do produto</small>
                    </div>

                    <div className="ck-field adm-col-6">
                      <label>Palavra-Chave Principal:</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: teclado gamer mecânico"
                        value={editingProduct.primary_keyword || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, primary_keyword: e.target.value })}
                      />
                    </div>

                    <div className="ck-field adm-col-6">
                      <label>Título SEO (&lt;title&gt;):</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Título otimizado para o Google"
                        value={editingProduct.seo_title || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, seo_title: e.target.value })}
                      />
                    </div>

                    <div className="ck-field adm-col-6">
                      <label>Texto Alternativo da Foto (Alt Text):</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Descrição da foto para Google Imagens e Acessibilidade"
                        value={editingProduct.image_alt || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, image_alt: e.target.value })}
                      />
                    </div>

                    <div className="ck-field adm-col-6">
                      <label>Part Number / MPN do Fabricante:</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: KB-RGB-01"
                        value={editingProduct.mpn || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, mpn: e.target.value })}
                      />
                    </div>

                    <div className="ck-field adm-col-6">
                      <label>Categoria do Google Shopping:</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Eletrônicos > Computadores > Periféricos"
                        value={editingProduct.google_category || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, google_category: e.target.value })}
                      />
                    </div>

                    <div className="ck-field adm-col-12">
                      <label>Meta Description SEO:</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Resumo que aparecerá nos resultados de busca do Google (140-160 caracteres)"
                        value={editingProduct.seo_description || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, seo_description: e.target.value })}
                        maxLength={160}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={editingProduct.is_anchor || false}
                          onChange={e => setEditingProduct({ ...editingProduct, is_anchor: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: 'var(--amber)' }}
                        />
                        ⭐ Produto-Âncora (Destaque SEO)
                      </label>

                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={editingProduct.weekly_offer || false}
                          onChange={e => setEditingProduct({ ...editingProduct, weekly_offer: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: 'var(--red)' }}
                        />
                        🔥 Oferta da Semana
                      </label>

                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={editingProduct.merchant_include !== false}
                          onChange={e => setEditingProduct({ ...editingProduct, merchant_include: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: 'var(--lime)' }}
                        />
                        📦 Incluir no Feed do Google Shopping
                      </label>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="adm-edit-modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ color: 'var(--red)', borderColor: 'var(--red)', marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => {
                      const target = editingProduct
                      setEditingProduct(null)
                      setProductToDelete(target)
                    }}
                  >
                    <Trash2 size={16} /> Excluir Produto
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setEditingProduct(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                  >
                    <CheckCircle2 size={18} /> Salvar Todas as Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE PRODUTO
           ========================================================= */}
        {productToDelete && (
          <div className="overlay" style={{ zIndex: 750 }}>
            <div className="modal" style={{ maxWidth: 440, textAlign: 'center', padding: 'var(--space-6)' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Excluir Produto?</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-600)', marginBottom: 'var(--space-5)', lineHeight: 1.5 }}>
                Tem certeza que deseja remover <strong>"{productToDelete.name}"</strong> do catálogo e do banco de dados? Esta ação não pode ser desfeita.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isDeleting}
                  onClick={() => setProductToDelete(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={isDeleting}
                  style={{ background: 'var(--red)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={async () => {
                    setIsDeleting(true)
                    try {
                      const target = productToDelete
                      setProductToDelete(null)
                      await deleteProduct(target.id, target.ean, target.name)
                    } finally {
                      setIsDeleting(false)
                    }
                  }}
                >
                  <Trash2 size={16} /> Sim, Excluir Produto
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL DE CONFIRMAÇÃO DE ZERAR CATÁLOGO COMPLETO
           ========================================================= */}
        {showClearCatalogModal && (
          <div className="overlay" style={{ zIndex: 760 }}>
            <div className="modal" style={{ maxWidth: 460, textAlign: 'center', padding: 'var(--space-6)' }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--red)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <AlertTriangle size={32} />
              </div>
              <h3 style={{ marginBottom: 'var(--space-2)' }}>Zerar Todos os Produtos?</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-600)', marginBottom: 'var(--space-5)', lineHeight: 1.5 }}>
                Esta ação vai remover permanentemente todos os <strong>{products.length} produtos</strong> do catálogo e do banco de dados na nuvem (Supabase). O catálogo ficará 100% zerado para você cadastrar seus novos produtos do zero.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isClearingCatalog}
                  onClick={() => setShowClearCatalogModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={isClearingCatalog}
                  style={{ background: 'var(--red)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={async () => {
                    setIsClearingCatalog(true)
                    try {
                      await clearAllProducts()
                      setShowClearCatalogModal(false)
                    } finally {
                      setIsClearingCatalog(false)
                    }
                  }}
                >
                  <Trash2 size={16} /> {isClearingCatalog ? 'Apagando...' : 'Sim, Zerar Tudo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL DE VINCULAÇÃO DE CÓDIGO DE RASTREIO DOS CORREIOS
           ========================================================= */}
        {orderToEditTracking && (
          <div className="overlay" style={{ zIndex: 750 }}>
            <div className="modal" style={{ maxWidth: 440, padding: 'var(--space-6)' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(234, 179, 8, 0.1)',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <Truck size={24} />
              </div>
              <h3 style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>Código de Rastreamento</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-600)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                Vincule o código dos Correios ao pedido <strong>#{orderToEditTracking.id}</strong> para que o cliente acompanhe a entrega em tempo real.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault()
                const code = trackingCodeInput.trim().toUpperCase()
                await updateOrderStatus(orderToEditTracking.id, orderToEditTracking.status, code)
                showToast(code ? `Código ${code} vinculado ao pedido #${orderToEditTracking.id}! 🚚` : 'Código de rastreio removido.')
                setOrderToEditTracking(null)
              }}>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--dark-700)', marginBottom: 6 }}>
                    Código do Objeto (ex: AA123456789BR)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="AA123456789BR"
                    value={trackingCodeInput}
                    autoFocus
                    maxLength={13}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 600 }}
                    onChange={e => setTrackingCodeInput(e.target.value.toUpperCase())}
                  />
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setOrderToEditTracking(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Salvar Rastreio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL DE IMPRESSÃO DE ETIQUETA DE CÓDIGO DE BARRAS
           ========================================================= */}
        {labelProduct && (
          <div className="overlay" style={{ zIndex: 650 }}>
            <div className="modal" style={{ maxWidth: 460 }}>
              <button className="modal-close" onClick={() => setLabelProduct(null)}>
                <X size={20} />
              </button>
              <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <div className="badge badge-lime" style={{ marginBottom: 6 }}>
                  <Printer size={12} /> Impressão de Etiquetas
                </div>
                <h3 style={{ marginBottom: 4 }}>Etiqueta de Código de Barras</h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)', marginBottom: 'var(--space-4)' }}>
                  Padrão para gôndola, caixa ou impressora térmica (60x40mm).
                </p>

                <BarcodeLabel
                  product={labelProduct}
                  ean={labelProduct.ean || generateValidEan13('789')}
                  price={labelProduct.price}
                />

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setLabelProduct(null)}
                  style={{ marginTop: 'var(--space-4)', width: '100%' }}
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            MODAL DE IMPRESSÃO DE ETIQUETA E DECLARAÇÃO DOS CORREIOS
           ========================================================= */}
        {labelOrderToPrint && (
          <ShippingLabelModal
            order={labelOrderToPrint}
            onClose={() => setLabelOrderToPrint(null)}
          />
        )}

        {/* Lista de sugestões de marcas para autocompletar */}
        <datalist id="brand-suggestions-list">
          {existingBrands.map(brand => (
            <option key={brand} value={brand} />
          ))}
        </datalist>

        <style>{`
          .modal-close {
            position: absolute; top: var(--space-4); right: var(--space-4); z-index: 10;
            width: 36px; height: 36px; border-radius: var(--radius-full);
            background: var(--dark-100); border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: var(--dark-600); transition: all var(--transition-fast);
          }
          .modal-close:hover { background: var(--dark-200); color: var(--dark-900); }
          .adm-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--dark-100);
          }
          .adm-header-title { display: flex; flex-direction: column; gap: 4px; }
          .adm-header h2 { font-size: var(--text-xl); }
          .adm-user-badge {
            display: flex; align-items: center; gap: 6px;
            font-size: var(--text-xs); color: var(--dark-500); font-weight: 500;
          }
          .adm-shield-icon { color: var(--lime-dark); }
          .adm-user-email { color: var(--dark-400); }
          .adm-header-actions { display: flex; gap: var(--space-2); }
          .adm-tabs {
            display: flex; gap: 4px; padding: 0 var(--space-6);
            border-bottom: 1px solid var(--dark-100); overflow-x: auto;
            scrollbar-width: none;
          }
          .adm-tabs::-webkit-scrollbar {
            display: none;
          }
          .adm-tab {
            display: flex; align-items: center; gap: 6px;
            padding: var(--space-3) 14px; font-size: var(--text-sm); font-weight: 500;
            color: var(--dark-500); border-bottom: 2px solid transparent;
            transition: all var(--transition-fast); cursor: pointer; background: none; border-top: none; border-left: none; border-right: none;
            white-space: nowrap; flex-shrink: 0;
          }
          .adm-tab:hover { color: var(--dark-800); }
          .adm-tab.active { color: var(--lime-dark); border-bottom-color: var(--lime); }
          .adm-body { padding: var(--space-6); overflow-y: auto; max-height: 65vh; }
          .adm-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
          @media (min-width: 768px) { .adm-stat-grid { grid-template-columns: repeat(4, 1fr); } }
          .adm-stat {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-4); background: var(--dark-50);
            border-radius: var(--radius-xl); border-left: 4px solid var(--accent, var(--lime));
          }
          .adm-stat svg { color: var(--accent, var(--lime)); }
          .adm-stat-value { display: block; font-size: var(--text-xl); font-weight: 800; font-family: var(--font-display); }
          .adm-stat-label { font-size: var(--text-xs); color: var(--dark-500); }
          
          /* Products Tab */
          .adm-products-bar {
            display: flex; justify-content: space-between; align-items: center; gap: var(--space-3);
            margin-bottom: var(--space-4); flex-wrap: wrap;
          }
          .adm-search-input-wrap {
            position: relative; flex: 1; min-width: 260px;
          }
          .adm-search-icon {
            position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
            color: var(--dark-400); pointer-events: none;
          }
          .adm-search-input-wrap .input-field {
            padding-left: 40px;
          }
          .adm-table-wrap { overflow-x: auto; }
          .adm-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
          .adm-table th {
            text-align: left; padding: var(--space-3); font-weight: 600;
            color: var(--dark-500); font-size: var(--text-xs); text-transform: uppercase;
            letter-spacing: 0.05em; border-bottom: 2px solid var(--dark-200);
          }
          .adm-table td { padding: var(--space-3); border-bottom: 1px solid var(--dark-100); vertical-align: middle; }
          .adm-auto-price {
            padding: var(--space-3) var(--space-4); background: var(--lime-glow);
            border-radius: var(--radius-lg); font-weight: 800; font-size: var(--text-lg);
            color: var(--lime-dark); font-family: var(--font-display);
          }

          /* Editor Sections */
          .adm-editor-form { display: flex; flex-direction: column; gap: var(--space-5); }
          .adm-editor-header h3 { font-size: var(--text-lg); margin-bottom: 2px; }
          .adm-editor-header p { font-size: var(--text-xs); color: var(--dark-500); }
          .adm-editor-grid { display: flex; flex-direction: column; gap: var(--space-5); }
          .adm-company-two-col {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--space-4);
          }
          @media (max-width: 960px) {
            .adm-company-two-col {
              grid-template-columns: 1fr;
            }
          }
          .adm-form-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 12px;
          }
          .adm-col-12 { grid-column: span 12; }
          .adm-col-8 { grid-column: span 8; }
          .adm-col-6 { grid-column: span 6; }
          .adm-col-4 { grid-column: span 4; }
          .adm-col-3 { grid-column: span 3; }
          .adm-col-2 { grid-column: span 2; }
          .adm-col-1 { grid-column: span 1; }
          @media (max-width: 768px) {
            .adm-col-4, .adm-col-3, .adm-col-2, .adm-col-1 { grid-column: span 6; }
          }
          @media (max-width: 540px) {
            .adm-col-6, .adm-col-4, .adm-col-3, .adm-col-2, .adm-col-1 { grid-column: span 12; }
          }
          .adm-editor-section {
            padding: var(--space-5); background: var(--dark-50);
            border-radius: var(--radius-xl); border: 1px solid var(--dark-200);
            display: flex; flex-direction: column; gap: var(--space-3);
          }
          .adm-section-title {
            display: flex; align-items: center; gap: 8px;
            font-size: var(--text-sm); color: var(--dark-800); font-weight: 700;
          }
          .adm-section-header-flex {
            display: flex; justify-content: space-between; align-items: center;
          }
          .adm-images-list, .adm-specs-list {
            display: flex; flex-direction: column; gap: 8px;
          }
          .adm-image-row, .adm-spec-edit-row {
            display: flex; align-items: center; gap: 8px;
          }
          .adm-image-row .input-field { flex: 1; }
          .adm-img-preview {
            width: 42px; height: 42px; border-radius: var(--radius-md);
            object-fit: contain; background: #ffffff; border: 1px solid var(--dark-200); padding: 2px; flex-shrink: 0;
          }
          .adm-spec-edit-row .input-field { flex: 1; }
          .adm-editor-actions { display: flex; justify-content: flex-end; margin-top: var(--space-3); }

          /* Edit Modal */
          .adm-edit-modal {
            max-height: 90vh; display: flex; flex-direction: column;
          }
          .adm-edit-modal-header {
            display: flex; justify-content: space-between; align-items: flex-start;
            padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--dark-100);
          }
          .adm-edit-modal-header h2 { font-size: var(--text-lg); }
          .adm-edit-modal-body {
            padding: var(--space-6); overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-5);
          }
          .adm-edit-modal-footer {
            display: flex; justify-content: flex-end; gap: var(--space-3);
            padding-top: var(--space-4); border-top: 1px solid var(--dark-100);
          }

          /* Security Tab */
          .adm-security-tab { display: flex; flex-direction: column; gap: var(--space-4); }
          .adm-sec-card {
            padding: var(--space-5); background: var(--dark-50); border-radius: var(--radius-xl);
            border: 1px solid var(--dark-200);
          }
          .adm-sec-header {
            display: flex; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-4);
          }
          .adm-sec-icon { color: var(--lime-dark); flex-shrink: 0; margin-top: 2px; }
          .adm-sec-header h3 { font-size: var(--text-base); margin-bottom: 2px; }
          .adm-sec-header p { font-size: var(--text-xs); color: var(--dark-500); }
          .adm-sec-form { display: flex; flex-direction: column; gap: var(--space-3); max-width: 480px; }
          .adm-sec-alert {
            display: flex; align-items: center; gap: 8px; padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md); font-size: var(--text-xs); font-weight: 600;
          }
          .adm-sec-alert.error { background: var(--red-glow); color: var(--red); }
          .adm-sec-alert.success { background: var(--lime-glow); color: var(--lime-dark); }
          .adm-sec-info-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4);
            font-size: var(--text-sm); padding-top: var(--space-2);
          }
          /* Tax Card Styles */
          .adm-tax-card {
            background: var(--white);
            border: 1.5px solid var(--lime);
            border-radius: var(--radius-xl);
            padding: var(--space-5);
            box-shadow: 0 4px 12px var(--lime-glow);
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .adm-tax-header {
            display: flex;
            align-items: center;
            gap: var(--space-3);
          }
          .adm-tax-icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: var(--radius-lg);
            background: var(--lime-glow);
            color: var(--lime-dark);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .adm-tax-control {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }
          .adm-tax-field-flex {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            flex-wrap: wrap;
          }
          .adm-tax-helper-text {
            font-size: var(--text-xs);
            color: var(--dark-500);
            line-height: 1.5;
            background: var(--dark-50);
            padding: var(--space-2) var(--space-3);
            border-radius: var(--radius-md);
            border: 1px solid var(--dark-100);
          }
        `}</style>
      </div>
    </div>
  )
}
