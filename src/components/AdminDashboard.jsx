import React, { useState, useEffect } from 'react'
import {
  X, Package, DollarSign, ShoppingCart, BarChart3, Plus,
  Pencil, Trash2, Camera, LogOut, TrendingUp, AlertTriangle, Search,
  Shield, KeyRound, User, Lock, CheckCircle2, AlertCircle, Image as ImageIcon,
  Layers, Sliders, Eye, RefreshCw, Printer, Sparkles
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { generateValidEan13 } from '../services/barcodeService'
import {
  roundCommercialPrice,
  calcCommercialSellPrice,
  calcCommercialOriginalPrice
} from '../services/pricingService'

export default function AdminDashboard() {
  const {
    showAdminDashboard, setShowAdminDashboard,
    products, orders, logoutAdmin,
    addProduct, updateProduct, deleteProduct,
    updateOrderStatus, setShowScanner, showToast,
    adminSession, adminConfig, changeAdminPassword,
    globalTaxRate, updateGlobalTaxRate,
  } = useStore()

  const [tab, setTab] = useState('overview')
  const [editingProduct, setEditingProduct] = useState(null)
  const [labelProduct, setLabelProduct] = useState(null)
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
  })

  // Password change form state
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' })
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')

  if (!showAdminDashboard) return null

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const totalOrders = orders.length
  const totalProducts = products.length
  const lowStock = products.filter(p => (parseInt(p.stock) || 0) <= 5).length
  // Lista dinâmica e unificada de marcas salvas (existentes no catálogo + marcas de tecnologia)
  const existingBrands = Array.from(
    new Set([
      'ASUS', 'Logitech', 'Corsair', 'Kingston', 'Samsung', 'Dell', 'Intel', 'AMD',
      'Razer', 'HyperX', 'NVIDIA', 'Western Digital', 'Seagate', 'TP-Link', 'LG',
      'Acer', 'Lenovo', 'Redragon', 'Crucial', 'Gigabyte', 'MSI',
      ...products.map(p => p.brand).filter(Boolean)
    ])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))

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
    })
    setTab('products')
  }

  // --- Edit Product Handlers ---
  const handleStartEdit = (product) => {
    setEditingProduct({
      ...product,
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

  // Filter products for admin table
  const filteredAdminProducts = products.filter(p => {
    if (!productSearch) return true
    const q = productSearch.toLowerCase()
    return p.name.toLowerCase().includes(q) ||
           p.brand.toLowerCase().includes(q) ||
           p.category.toLowerCase().includes(q) ||
           (p.ean && p.ean.includes(q))
  })

  return (
    <div className="overlay" onClick={() => setShowAdminDashboard(false)}>
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

      <div className="modal modal-xl" style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>

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
                if (window.confirm('Deseja realmente encerrar a sessão de administrador?')) {
                  logoutAdmin()
                }
              }}
              style={{ color: 'var(--red)' }}
              title="Desconectar a conta administrativa"
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
            { id: 'add', icon: <Plus size={16} />, label: 'Cadastrar Produto' },
            { id: 'security', icon: <KeyRound size={16} />, label: 'Segurança & Senha' },
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

          {/* Products List */}
          {tab === 'products' && (
            <div className="adm-products">
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
                <button className="btn btn-primary btn-sm" onClick={() => setTab('add')}>
                  <Plus size={16} /> Novo Produto
                </button>
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
                                style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', background: 'var(--dark-100)' }}
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
                                onClick={() => {
                                  if (confirm(`Deseja realmente excluir "${p.name}" do catálogo?`)) deleteProduct(p.id)
                                }}
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
                            {o.status === 'Enviado' && (
                              <button className="btn btn-outline btn-sm" onClick={() => {
                                const code = prompt('Código de rastreamento dos Correios:', o.trackingCode || '')
                                if (code !== null) updateOrderStatus(o.id, 'Enviado', code.trim())
                              }}>
                                {o.trackingCode ? `📦 ${o.trackingCode}` : 'Inserir Rastreio'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Add Product */}
          {tab === 'add' && (
            <div className="adm-editor-form">
              <div className="adm-editor-header">
                <h3>Cadastrar Novo Produto</h3>
                <p>Preencha os dados completos para disponibilizar o item na loja.</p>
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
                      <label>Categoria *</label>
                      <select
                        className="input-field"
                        value={newProduct.category}
                        onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                      >
                        <option>Hardware</option>
                        <option>Periféricos</option>
                        <option>Monitores</option>
                        <option>Notebooks</option>
                        <option>Redes</option>
                        <option>Acessórios</option>
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
                      <label>Categoria *</label>
                      <select
                        className="input-field"
                        value={editingProduct.category}
                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                      >
                        <option>Hardware</option>
                        <option>Periféricos</option>
                        <option>Monitores</option>
                        <option>Notebooks</option>
                        <option>Redes</option>
                        <option>Acessórios</option>
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

                {/* Modal Footer Actions */}
                <div className="adm-edit-modal-footer">
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
            display: flex; gap: var(--space-1); padding: 0 var(--space-6);
            border-bottom: 1px solid var(--dark-100); overflow-x: auto;
          }
          .adm-tab {
            display: flex; align-items: center; gap: var(--space-2);
            padding: var(--space-3) var(--space-4); font-size: var(--text-sm); font-weight: 500;
            color: var(--dark-500); border-bottom: 2px solid transparent;
            transition: all var(--transition-fast); cursor: pointer; background: none; border-top: none; border-left: none; border-right: none;
            white-space: nowrap;
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
            object-fit: cover; border: 1px solid var(--dark-200); flex-shrink: 0;
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
