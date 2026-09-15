import React, { useState, useMemo, useEffect } from 'react'
import {
  Users, Search, Filter, ArrowUpDown, Eye, EyeOff, Shield,
  ShieldAlert, Lock, Key, Trash2, Edit3, Download, Plus,
  CheckCircle2, AlertCircle, Clock, ShoppingCart, DollarSign,
  TrendingUp, Calendar, MapPin, Phone, Mail, FileText,
  UserCheck, UserX, ChevronLeft, ChevronRight, X, Sparkles,
  ExternalLink, Copy, Check, MessageSquare, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import {
  maskCpf,
  maskPhone,
  getCustomerOrderMetrics,
  calculateCompanyCustomerStats,
  exportCustomersToCsv,
  triggerFileDownload,
  generatePasswordResetLink
} from '../../services/customerService'
import { formatCep, formatPhone as formatDisplayPhone } from '../../services/companyService'

export default function AdminCustomersSection() {
  const {
    customers = [],
    orders = [],
    adminSession,
    adminConfig,
    adminRole,
    updateAdminRole,
    currentCompanyId,
    updateAdminCustomer,
    toggleCustomerStatus,
    saveCustomerNotes,
    anonymizeCustomer,
    recordCustomerAudit,
    fetchCustomerAuditLogs,
    showToast
  } = useStore()

  // Papel do administrador atual (RBAC)
  const currentRole = adminSession?.user?.role || adminRole || 'super_admin'

  // Permissões por papel
  const canExport = currentRole === 'super_admin' || currentRole === 'company_admin'
  const canEdit = currentRole === 'super_admin' || currentRole === 'company_admin' || currentRole === 'support'
  const canBlock = currentRole === 'super_admin' || currentRole === 'company_admin'
  const canAnonymize = currentRole === 'super_admin' || currentRole === 'company_admin'
  const canRevealCpf = currentRole === 'super_admin' || currentRole === 'company_admin'
  const canResetPassword = currentRole === 'super_admin' || currentRole === 'company_admin' || currentRole === 'support'

  // Estados de busca, filtros e ordenação
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'Ativo' | 'Inativo' | 'Bloqueado'
  const [ordersFilter, setOrdersFilter] = useState('all') // 'all' | 'with_orders' | 'no_orders'
  const [periodFilter, setPeriodFilter] = useState('all') // 'all' | '7d' | '30d' | 'year'
  const [sortBy, setSortBy] = useState('created_desc') // 'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'orders_desc' | 'spent_desc'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Estado de controle de dados sensíveis revelados nesta sessão
  const [revealedCpfs, setRevealedCpfs] = useState(new Set())

  // Modal / Drawer de Detalhes do Cliente
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [detailTab, setDetailTab] = useState('profile') // 'profile' | 'orders' | 'intelligence' | 'notes' | 'audit'

  // Edição de cadastro do cliente
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFormData, setEditFormData] = useState({})

  // Observações internas do cliente
  const [notesDraft, setNotesDraft] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)

  // Logs de auditoria do cliente selecionado
  const [customerLogs, setCustomerLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Modais de ação crítica
  const [customerToBlock, setCustomerToBlock] = useState(null)
  const [blockReason, setBlockReason] = useState('')

  const [customerToAnonymize, setCustomerToAnonymize] = useState(null)
  const [anonymizeReason, setAnonymizeReason] = useState('')

  const [resetPassData, setResetPassData] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // KPIs gerais da empresa
  const stats = useMemo(() => {
    return calculateCompanyCustomerStats(customers, orders)
  }, [customers, orders])

  // Filtragem e busca avançada
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      // 1. Busca textual
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const qDigits = searchTerm.replace(/\D/g, '')
        const matchName = (c.nome || '').toLowerCase().includes(q)
        const matchEmail = (c.email || '').toLowerCase().includes(q)
        const matchPhone = (c.telefone || '').replace(/\D/g, '').includes(qDigits)
        const matchCpf = (c.cpf || '').replace(/\D/g, '').includes(qDigits)
        if (!matchName && !matchEmail && !matchPhone && !matchCpf) return false
      }

      // 2. Filtro de Status
      if (statusFilter !== 'all') {
        const currentStatus = c.status || 'Ativo'
        if (currentStatus !== statusFilter) return false
      }

      // 3. Filtro de Pedidos
      const metrics = getCustomerOrderMetrics(c, orders)
      if (ordersFilter === 'with_orders' && metrics.orderCount === 0) return false
      if (ordersFilter === 'no_orders' && metrics.orderCount > 0) return false

      // 4. Filtro de Período de Cadastro
      if (periodFilter !== 'all') {
        const createdDate = new Date(c.createdAt || c.created_at || Date.now())
        const now = new Date()
        if (periodFilter === '7d' && (now - createdDate > 7 * 24 * 60 * 60 * 1000)) return false
        if (periodFilter === '30d' && (now - createdDate > 30 * 24 * 60 * 60 * 1000)) return false
        if (periodFilter === 'year' && createdDate.getFullYear() !== now.getFullYear()) return false
      }

      return true
    }).sort((a, b) => {
      const metricsA = getCustomerOrderMetrics(a, orders)
      const metricsB = getCustomerOrderMetrics(b, orders)

      if (sortBy === 'name_asc') return (a.nome || '').localeCompare(b.nome || '')
      if (sortBy === 'name_desc') return (b.nome || '').localeCompare(a.nome || '')
      if (sortBy === 'orders_desc') return metricsB.orderCount - metricsA.orderCount
      if (sortBy === 'spent_desc') return metricsB.totalSpent - metricsA.totalSpent
      if (sortBy === 'created_asc') return new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0)
      return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0) // default created_desc
    })
  }, [customers, orders, searchTerm, statusFilter, ordersFilter, periodFilter, sortBy])

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage))
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredCustomers.slice(start, start + itemsPerPage)
  }, [filteredCustomers, currentPage])

  // Reseta página ao mudar filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, ordersFilter, periodFilter, sortBy])

  // Ao selecionar cliente, carrega detalhes e observações
  useEffect(() => {
    if (selectedCustomer) {
      setNotesDraft(selectedCustomer.internal_notes || '')
      setEditFormData({ ...selectedCustomer })
      setIsEditingProfile(false)

      if (detailTab === 'audit') {
        loadAuditLogs(selectedCustomer.id)
      }
    }
  }, [selectedCustomer, detailTab])

  const loadAuditLogs = async (customerId) => {
    setLoadingLogs(true)
    try {
      const logs = await fetchCustomerAuditLogs(customerId, currentCompanyId)
      setCustomerLogs(logs)
    } finally {
      setLoadingLogs(false)
    }
  }

  // Ação de Revelar CPF com log de auditoria
  const handleToggleRevealCpf = async (customer) => {
    if (!canRevealCpf) {
      showToast('Seu perfil de acesso não tem permissão para desmascarar dados sensíveis.', 'error')
      return
    }

    const isCurrentlyRevealed = revealedCpfs.has(customer.id)
    const nextSet = new Set(revealedCpfs)

    if (isCurrentlyRevealed) {
      nextSet.delete(customer.id)
      setRevealedCpfs(nextSet)
    } else {
      nextSet.add(customer.id)
      setRevealedCpfs(nextSet)
      // Grava log de auditoria obrigatório por compliance LGPD
      await recordCustomerAudit('VIEW_SENSITIVE_DATA', customer.id, {
        sensitiveField: 'cpf',
        customerEmail: customer.email
      })
      showToast('Visualização de dado sensível registrada no log de auditoria. 🛡️')
    }
  }

  // Ação de Exportar para CSV
  const handleExportCsv = async () => {
    if (!canExport) {
      showToast('Seu perfil não possui permissão para exportar dados.', 'error')
      return
    }
    const csvContent = exportCustomersToCsv(filteredCustomers, orders, { maskSensitive: currentRole !== 'super_admin' })
    const filename = `clientes_${currentCompanyId}_${new Date().toISOString().slice(0, 10)}.csv`
    triggerFileDownload(csvContent, filename)

    await recordCustomerAudit('EXPORT', null, {
      count: filteredCustomers.length,
      format: 'csv'
    })
    showToast(`Lista de ${filteredCustomers.length} clientes exportada com sucesso! 📊`)
  }

  // Ação de Salvar Edição do Perfil do Cliente
  const handleSaveProfileEdit = async (e) => {
    e?.preventDefault()
    if (!editFormData.nome?.trim()) {
      showToast('O nome do cliente é obrigatório.', 'error')
      return
    }

    await updateAdminCustomer(selectedCustomer.id, {
      nome: editFormData.nome.trim(),
      email: editFormData.email?.trim()?.toLowerCase(),
      telefone: editFormData.telefone?.trim(),
      cep: editFormData.cep?.trim(),
      endereco: editFormData.endereco?.trim(),
      numero: editFormData.numero?.trim(),
      complemento: editFormData.complemento?.trim(),
      bairro: editFormData.bairro?.trim(),
      cidade: editFormData.cidade?.trim(),
      estado: editFormData.estado?.trim()
    })

    setSelectedCustomer(prev => ({ ...prev, ...editFormData }))
    setIsEditingProfile(false)
  }

  // Ação de Salvar Observações Internas
  const handleSaveNotes = async () => {
    setIsSavingNotes(true)
    try {
      await saveCustomerNotes(selectedCustomer.id, notesDraft)
      setSelectedCustomer(prev => ({ ...prev, internal_notes: notesDraft }))
    } finally {
      setIsSavingNotes(false)
    }
  }

  // Ação de Bloquear/Desbloquear Conta
  const handleConfirmToggleStatus = async () => {
    if (!customerToBlock) return
    const newStatus = (customerToBlock.status || 'Ativo') === 'Bloqueado' ? 'Ativo' : 'Bloqueado'
    await toggleCustomerStatus(customerToBlock.id, newStatus, blockReason || 'Decisão administrativa')

    if (selectedCustomer && selectedCustomer.id === customerToBlock.id) {
      setSelectedCustomer(prev => ({ ...prev, status: newStatus }))
    }
    setCustomerToBlock(null)
    setBlockReason('')
  }

  // Ação de Anonimizar Cliente (LGPD Art. 18)
  const handleConfirmAnonymize = async () => {
    if (!customerToAnonymize) return
    const res = await anonymizeCustomer(customerToAnonymize.id, anonymizeReason || 'Solicitação do titular (Art. 18 LGPD)')
    if (res.success && res.customer) {
      if (selectedCustomer && selectedCustomer.id === customerToAnonymize.id) {
        setSelectedCustomer(res.customer)
      }
    }
    setCustomerToAnonymize(null)
    setAnonymizeReason('')
  }

  // Ação de Redefinição de Senha
  const handleTriggerResetPassword = (customer) => {
    if (!canResetPassword) {
      showToast('Seu perfil não possui permissão para redefinir senhas.', 'error')
      return
    }
    const resetInfo = generatePasswordResetLink(customer)
    setResetPassData({
      customer,
      ...resetInfo
    })
    setCopiedLink(false)

    recordCustomerAudit('RESET_PASSWORD', customer.id, {
      requestedBy: currentRole
    })
  }

  return (
    <div className="adm-customers-section">
      {/* 4 Cards de Estatísticas no Topo */}
      <div className="adm-stat-grid" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="adm-stat" style={{ '--accent': 'var(--cyan, #06b6d4)' }}>
          <Users size={24} />
          <div>
            <span className="adm-stat-value">{stats.totalCustomers}</span>
            <span className="adm-stat-label">Total de Clientes</span>
          </div>
        </div>

        <div className="adm-stat" style={{ '--accent': 'var(--lime, #84cc16)' }}>
          <UserCheck size={24} />
          <div>
            <span className="adm-stat-value">+{stats.newCustomers30d}</span>
            <span className="adm-stat-label">Novos nos últimos 30 dias</span>
          </div>
        </div>

        <div className="adm-stat" style={{ '--accent': 'var(--amber, #f59e0b)' }}>
          <ShoppingCart size={24} />
          <div>
            <span className="adm-stat-value">{stats.buyerCustomersCount}</span>
            <span className="adm-stat-label">Clientes Compradores</span>
          </div>
        </div>

        <div className="adm-stat" style={{ '--accent': '#a855f7' }}>
          <DollarSign size={24} />
          <div>
            <span className="adm-stat-value">R$ {stats.globalAverageTicket.toFixed(2).replace('.', ',')}</span>
            <span className="adm-stat-label">Ticket Médio Geral</span>
          </div>
        </div>
      </div>

      {/* Barra de Ações e Filtros */}
      <div className="adm-table-toolbar" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Busca Preditiva */}
          <div className="adm-search-wrap" style={{ flex: '1 1 300px', maxWidth: '420px', position: 'relative' }}>
            <Search size={16} className="adm-search-icon" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por Nome, E-mail, Telefone ou CPF..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--dark-400)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Botão de Exportação */}
          {canExport && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleExportCsv}
              title="Exportar clientes em formato CSV para Excel"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--lime)', color: 'var(--lime-dark)' }}
            >
              <Download size={15} />
              <span>Exportar CSV</span>
            </button>
          )}
        </div>

        {/* Linha de Filtros Facetados e Ordenação */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Status */}
          <select
            className="input-field"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
          >
            <option value="all">Status: Todos</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
            <option value="Bloqueado">Bloqueados</option>
          </select>

          {/* Compras */}
          <select
            className="input-field"
            value={ordersFilter}
            onChange={e => setOrdersFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
          >
            <option value="all">Compras: Todas</option>
            <option value="with_orders">Com Compras</option>
            <option value="no_orders">Sem Compras</option>
          </select>

          {/* Período de Cadastro */}
          <select
            className="input-field"
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto' }}
          >
            <option value="all">Cadastro: Todo período</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="year">Este Ano</option>
          </select>

          {/* Ordenação */}
          <select
            className="input-field"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ padding: '6px 12px', fontSize: '13px', width: 'auto', marginLeft: 'auto' }}
          >
            <option value="created_desc">Mais Recentes Primeiro</option>
            <option value="created_asc">Mais Antigos Primeiro</option>
            <option value="name_asc">Nome (A - Z)</option>
            <option value="name_desc">Nome (Z - A)</option>
            <option value="orders_desc">Mais Pedidos</option>
            <option value="spent_desc">Maior Total Gasto</option>
          </select>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>CPF</th>
              <th>Cadastro</th>
              <th>Pedidos</th>
              <th>Total Gasto</th>
              <th>Ticket Médio</th>
              <th>Última Compra</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dark-400)' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Nenhum cliente encontrado com os filtros atuais.</p>
                  {(searchTerm || statusFilter !== 'all' || ordersFilter !== 'all' || periodFilter !== 'all') && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSearchTerm('')
                        setStatusFilter('all')
                        setOrdersFilter('all')
                        setPeriodFilter('all')
                      }}
                      style={{ marginTop: 10, color: 'var(--cyan)' }}
                    >
                      Limpar Filtros de Busca
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedCustomers.map(customer => {
                const metrics = getCustomerOrderMetrics(customer, orders)
                const isCpfRevealed = revealedCpfs.has(customer.id)
                const displayCpf = isCpfRevealed ? (customer.cpf || 'Não informado') : maskCpf(customer.cpf)
                const displayPhone = maskPhone(customer.telefone)
                const initials = (customer.nome || 'Cliente')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map(p => p[0].toUpperCase())
                  .join('')

                return (
                  <tr key={customer.id} className={customer.status === 'Bloqueado' ? 'row-blocked' : ''}>
                    {/* Cliente (Nome + Avatar) */}
                    <td style={{ minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: customer.status === 'Bloqueado' ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #0284c7, #06b6d4)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <strong style={{ fontSize: 'var(--text-sm)', display: 'block', color: 'var(--dark-900)' }}>
                            {customer.nome || customer.name || 'Cliente'}
                          </strong>
                          <span style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                            ID: {customer.id?.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contato (Email + Tel) */}
                    <td>
                      <span style={{ display: 'block', fontSize: '13px', color: 'var(--dark-800)', fontWeight: 500 }}>{customer.email}</span>
                      <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>{displayPhone}</span>
                    </td>

                    {/* CPF (com ação de revelar segura) */}
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--dark-800)', fontWeight: 500 }}>{displayCpf}</span>
                        {canRevealCpf && (
                          <button
                            type="button"
                            className="btn-icon-subtle"
                            onClick={() => handleToggleRevealCpf(customer)}
                            title={isCpfRevealed ? 'Ocultar CPF' : 'Revelar CPF (registra log LGPD)'}
                            style={{ background: 'none', border: 'none', color: isCpfRevealed ? 'var(--lime-dark)' : 'var(--dark-400)', cursor: 'pointer', padding: 2 }}
                          >
                            {isCpfRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Data Cadastro */}
                    <td style={{ fontSize: '12px', color: 'var(--dark-600)' }}>
                      {customer.createdAt || customer.created_at ? new Date(customer.createdAt || customer.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>

                    {/* Pedidos */}
                    <td>
                      <span className={metrics.orderCount > 0 ? 'badge badge-lime' : 'badge badge-dark'}>
                        {metrics.orderCount} ped.
                      </span>
                    </td>

                    {/* Total Gasto */}
                    <td>
                      <strong style={{ color: metrics.totalSpent > 0 ? 'var(--lime-dark)' : 'var(--dark-500)', fontWeight: 700 }}>
                        R$ {metrics.totalSpent.toFixed(2).replace('.', ',')}
                      </strong>
                    </td>

                    {/* Ticket Médio */}
                    <td style={{ fontSize: '13px', color: 'var(--dark-700)', fontWeight: 600 }}>
                      R$ {metrics.averageTicket.toFixed(2).replace('.', ',')}
                    </td>

                    {/* Última Compra */}
                    <td style={{ fontSize: '12px', color: 'var(--dark-600)' }}>
                      {metrics.lastOrderDate ? new Date(metrics.lastOrderDate).toLocaleDateString('pt-BR') : '—'}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={
                        (customer.status || 'Ativo') === 'Ativo' ? 'badge badge-lime' :
                        customer.status === 'Bloqueado' ? 'badge badge-red' : 'badge badge-amber'
                      }>
                        {customer.status || 'Ativo'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setDetailTab('profile')
                          }}
                          title="Ver dossiê completo do cliente"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <FileText size={14} />
                          <span>Detalhes</span>
                        </button>

                        {canBlock && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setCustomerToBlock(customer)}
                            title={(customer.status || 'Ativo') === 'Bloqueado' ? 'Desbloquear conta' : 'Bloquear conta'}
                            style={{ color: (customer.status || 'Ativo') === 'Bloqueado' ? 'var(--lime)' : 'var(--red)' }}
                          >
                            {(customer.status || 'Ativo') === 'Bloqueado' ? <UserCheck size={16} /> : <UserX size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="adm-pagination-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid var(--dark-800)', marginTop: 'var(--space-4)' }}>
          <span style={{ fontSize: '13px', color: 'var(--dark-400)' }}>
            Mostrando <strong>{paginatedCustomers.length}</strong> de <strong>{filteredCustomers.length}</strong> clientes
          </span>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span style={{ fontSize: '13px', padding: '0 8px', color: 'var(--dark-300)' }}>
              Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          DRAWER / MODAL COMPLETO DE DETALHES DO CLIENTE
         ========================================================= */}
      {selectedCustomer && (
        <div className="overlay" style={{ zIndex: 700 }} onClick={() => setSelectedCustomer(null)}>
          <div
            className="modal modal-lg"
            style={{ maxWidth: '980px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header do Drawer */}
            <div className="adm-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--dark-800)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #06b6d4)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px'
                }}>
                  {(selectedCustomer.nome || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--dark-900)' }}>
                      {selectedCustomer.nome || selectedCustomer.name || 'Cliente'}
                    </h3>
                    <span className={
                      (selectedCustomer.status || 'Ativo') === 'Ativo' ? 'badge badge-lime' :
                      selectedCustomer.status === 'Bloqueado' ? 'badge badge-red' : 'badge badge-amber'
                    }>
                      {selectedCustomer.status || 'Ativo'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                    Empresa Vinculada: <strong>{selectedCustomer.company_id || currentCompanyId}</strong> · Cadastrado em: {selectedCustomer.createdAt || selectedCustomer.created_at ? new Date(selectedCustomer.createdAt || selectedCustomer.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {canResetPassword && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleTriggerResetPassword(selectedCustomer)}
                    title="Enviar link seguro de redefinição de senha"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Key size={14} /> Redefinir Senha
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => setSelectedCustomer(null)}
                  aria-label="Fechar Detalhes"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Abas Internas do Detalhe */}
            <div className="adm-tabs" style={{ padding: '0 24px', borderBottom: '1px solid var(--dark-800)', background: 'var(--dark-900)' }}>
              {[
                { id: 'profile', label: 'Dados Cadastrais', icon: <Users size={15} /> },
                { id: 'orders', label: `Pedidos (${getCustomerOrderMetrics(selectedCustomer, orders).orderCount})`, icon: <ShoppingCart size={15} /> },
                { id: 'intelligence', label: 'Inteligência de Compras', icon: <TrendingUp size={15} /> },
                { id: 'notes', label: 'Observações Internas', icon: <MessageSquare size={15} /> },
                { id: 'audit', label: 'Auditoria & Logs (LGPD)', icon: <ShieldCheck size={15} /> }
              ].map(t => (
                <button
                  key={t.id}
                  className={`adm-tab ${detailTab === t.id ? 'active' : ''}`}
                  onClick={() => setDetailTab(t.id)}
                  style={{ padding: '12px 16px', fontSize: '13px' }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Conteúdo do Drawer */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {/* ABA 1: PERFIL CADASTRAL */}
              {detailTab === 'profile' && (
                <div>
                  {!isEditingProfile ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                      {/* Cartão de Informações Pessoais */}
                      <div className="adm-editor-section" style={{ margin: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                          <h4 className="adm-section-title"><Users size={16} /> Identificação</h4>
                          {canEdit && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setIsEditingProfile(true)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Edit3 size={14} /> Editar Dados
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '13px' }}>
                          <div><span style={{ color: 'var(--dark-500)' }}>Nome Completo:</span> <strong style={{ color: 'var(--dark-900)' }}>{selectedCustomer.nome || selectedCustomer.name || 'Cliente'}</strong></div>
                          <div><span style={{ color: 'var(--dark-500)' }}>E-mail:</span> <strong style={{ color: 'var(--dark-800)' }}>{selectedCustomer.email}</strong></div>
                          <div><span style={{ color: 'var(--dark-500)' }}>Telefone / WhatsApp:</span> <strong style={{ color: 'var(--dark-800)' }}>{selectedCustomer.telefone || 'Não informado'}</strong></div>
                          <div>
                            <span style={{ color: 'var(--dark-400)' }}>CPF:</span>{' '}
                            <strong style={{ fontFamily: 'monospace' }}>
                              {revealedCpfs.has(selectedCustomer.id) ? (selectedCustomer.cpf || 'Não informado') : maskCpf(selectedCustomer.cpf)}
                            </strong>{' '}
                            {canRevealCpf && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleToggleRevealCpf(selectedCustomer)}
                                style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--cyan)' }}
                              >
                                {revealedCpfs.has(selectedCustomer.id) ? 'Ocultar' : 'Revelar'}
                              </button>
                            )}
                          </div>
                          <div><span style={{ color: 'var(--dark-400)' }}>Status:</span> <span className="badge badge-lime">{selectedCustomer.status || 'Ativo'}</span></div>
                        </div>
                      </div>

                      {/* Cartão de Endereço */}
                      <div className="adm-editor-section" style={{ margin: 0 }}>
                        <h4 className="adm-section-title"><MapPin size={16} /> Endereço Residencial</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '13px' }}>
                          <div><span style={{ color: 'var(--dark-400)' }}>CEP:</span> <strong>{formatCep(selectedCustomer.cep) || 'Não informado'}</strong></div>
                          <div><span style={{ color: 'var(--dark-400)' }}>Logradouro:</span> <strong>{selectedCustomer.endereco || '—'}, Nº {selectedCustomer.numero || 'S/N'}</strong></div>
                          <div><span style={{ color: 'var(--dark-400)' }}>Complemento:</span> <strong>{selectedCustomer.complemento || '—'}</strong></div>
                          <div><span style={{ color: 'var(--dark-400)' }}>Bairro:</span> <strong>{selectedCustomer.bairro || '—'}</strong></div>
                          <div><span style={{ color: 'var(--dark-400)' }}>Cidade / UF:</span> <strong>{selectedCustomer.cidade || '—'} / {selectedCustomer.estado || '—'}</strong></div>
                        </div>
                      </div>

                      {/* Cartão de Consentimentos e Privacidade LGPD */}
                      <div className="adm-editor-section" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <h4 className="adm-section-title"><ShieldCheck size={16} /> Consentimentos & Privacidade (LGPD)</h4>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', fontSize: '13px' }}>
                          <span className={selectedCustomer.consent_marketing ? 'badge badge-lime' : 'badge badge-dark'}>
                            {selectedCustomer.consent_marketing ? '✓ Aceita E-mail Marketing' : '✕ E-mail Marketing Recusado'}
                          </span>
                          <span className={selectedCustomer.consent_whatsapp !== false ? 'badge badge-lime' : 'badge badge-dark'}>
                            {selectedCustomer.consent_whatsapp !== false ? '✓ Notificações WhatsApp Autorizadas' : '✕ WhatsApp Recusado'}
                          </span>
                          {selectedCustomer.anonymized_at && (
                            <span className="badge badge-red">
                              ⚠️ Dados Anonimizados em {new Date(selectedCustomer.anonymized_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>

                        {/* Botão de Exclusão/Anonimização LGPD */}
                        {canAnonymize && !selectedCustomer.anonymized_at && (
                          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--dark-800)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                              O titular solicitou exclusão dos dados pessoais? (Art. 18 LGPD)
                            </span>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => setCustomerToAnonymize(selectedCustomer)}
                              style={{ color: 'var(--red)', borderColor: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Trash2 size={14} /> Anonimizar Dados Pessoais
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Formulário de Edição de Dados Cadastrais */
                    <form onSubmit={handleSaveProfileEdit} className="adm-editor-section">
                      <h4 className="adm-section-title"><Edit3 size={16} /> Editando Dados do Cliente</h4>
                      <div className="ck-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                        <div>
                          <label>Nome Completo</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.nome || ''}
                            onChange={e => setEditFormData({ ...editFormData, nome: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label>E-mail</label>
                          <input
                            type="email"
                            className="input-field"
                            value={editFormData.email || ''}
                            onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label>Telefone</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.telefone || ''}
                            onChange={e => setEditFormData({ ...editFormData, telefone: e.target.value })}
                          />
                        </div>
                        <div>
                          <label>CEP</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.cep || ''}
                            onChange={e => setEditFormData({ ...editFormData, cep: e.target.value })}
                          />
                        </div>
                        <div>
                          <label>Endereço</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.endereco || ''}
                            onChange={e => setEditFormData({ ...editFormData, endereco: e.target.value })}
                          />
                        </div>
                        <div>
                          <label>Número</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.numero || ''}
                            onChange={e => setEditFormData({ ...editFormData, numero: e.target.value })}
                          />
                        </div>
                        <div>
                          <label>Bairro</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.bairro || ''}
                            onChange={e => setEditFormData({ ...editFormData, bairro: e.target.value })}
                          />
                        </div>
                        <div>
                          <label>Cidade</label>
                          <input
                            type="text"
                            className="input-field"
                            value={editFormData.cidade || ''}
                            onChange={e => setEditFormData({ ...editFormData, cidade: e.target.value })}
                          />
                        </div>
                        <div>
                          <label>UF</label>
                          <input
                            type="text"
                            className="input-field"
                            maxLength={2}
                            value={editFormData.estado || ''}
                            onChange={e => setEditFormData({ ...editFormData, estado: e.target.value?.toUpperCase() })}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setIsEditingProfile(false)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                        >
                          Salvar Alterações
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ABA 2: HISTÓRICO DE PEDIDOS */}
              {detailTab === 'orders' && (
                <div>
                  {(() => {
                    const metrics = getCustomerOrderMetrics(selectedCustomer, orders)
                    if (metrics.orders.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dark-400)' }}>
                          <ShoppingCart size={40} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>Este cliente ainda não realizou nenhum pedido na loja.</p>
                        </div>
                      )
                    }

                    return (
                      <div className="adm-table-wrap">
                        <table className="adm-table">
                          <thead>
                            <tr>
                              <th>Pedido</th>
                              <th>Data</th>
                              <th>Itens</th>
                              <th>Pagamento</th>
                              <th>Total</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.orders.map(order => (
                              <tr key={order.id}>
                                <td><strong>{order.id}</strong></td>
                                <td style={{ fontSize: '12px' }}>
                                  {new Date(order.created_at || order.date).toLocaleDateString('pt-BR')}
                                </td>
                                <td style={{ fontSize: '12px' }}>
                                  {Array.isArray(order.items) ? (
                                    order.items.map((it, idx) => (
                                      <div key={idx}>• {it.qty}x {it.name}</div>
                                    ))
                                  ) : '—'}
                                </td>
                                <td>
                                  <span className="badge badge-dark">
                                    {(order.payment_method || order.paymentMethod || 'Pix').toUpperCase()}
                                  </span>
                                </td>
                                <td>
                                  <strong style={{ color: 'var(--lime)' }}>
                                    R$ {(parseFloat(order.total) || 0).toFixed(2).replace('.', ',')}
                                  </strong>
                                </td>
                                <td>
                                  <span className={
                                    (order.status || '').toLowerCase().includes('pago') || (order.status || '').toLowerCase().includes('entregue')
                                      ? 'badge badge-lime'
                                      : (order.status || '').toLowerCase().includes('cancel')
                                      ? 'badge badge-red'
                                      : 'badge badge-amber'
                                  }>
                                    {order.status || 'Pendente'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ABA 3: INTELIGÊNCIA DE CONSUMO */}
              {detailTab === 'intelligence' && (
                <div>
                  {(() => {
                    const metrics = getCustomerOrderMetrics(selectedCustomer, orders)
                    return (
                      <div>
                        {/* Indicadores de Consumo */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
                          <div className="adm-stat" style={{ '--accent': 'var(--lime)' }}>
                            <DollarSign size={20} />
                            <div>
                              <span className="adm-stat-value">R$ {metrics.totalSpent.toFixed(2).replace('.', ',')}</span>
                              <span className="adm-stat-label">Total Gasto Histórico</span>
                            </div>
                          </div>
                          <div className="adm-stat" style={{ '--accent': 'var(--cyan)' }}>
                            <TrendingUp size={20} />
                            <div>
                              <span className="adm-stat-value">R$ {metrics.averageTicket.toFixed(2).replace('.', ',')}</span>
                              <span className="adm-stat-label">Ticket Médio do Cliente</span>
                            </div>
                          </div>
                          <div className="adm-stat" style={{ '--accent': 'var(--amber)' }}>
                            <Clock size={20} />
                            <div>
                              <span className="adm-stat-value">
                                {metrics.lastOrderDate ? new Date(metrics.lastOrderDate).toLocaleDateString('pt-BR') : 'Nunca'}
                              </span>
                              <span className="adm-stat-label">Data da Última Compra</span>
                            </div>
                          </div>
                        </div>

                        {/* Produtos Favoritos / Mais Comprados */}
                        <div className="adm-editor-section">
                          <h4 className="adm-section-title"><Sparkles size={16} /> Produtos Mais Comprados por Este Cliente</h4>
                          {metrics.topProducts.length === 0 ? (
                            <p style={{ color: 'var(--dark-400)', fontSize: '13px', margin: 0 }}>Sem histórico de compras para ranquear produtos.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {metrics.topProducts.map((prod, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--dark-50)', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontWeight: 800, color: 'var(--cyan)' }}>#{idx + 1}</span>
                                    <div>
                                      <strong style={{ fontSize: '13px', display: 'block', color: 'var(--dark-900)' }}>{prod.name}</strong>
                                      {prod.brand && <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>{prod.brand}</span>}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <span className="badge badge-lime">{prod.qty} un. compradas</span>
                                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--dark-400)', marginTop: 2 }}>
                                      Total: R$ {prod.total.toFixed(2).replace('.', ',')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* ABA 4: OBSERVAÇÕES INTERNAS */}
              {detailTab === 'notes' && (
                <div className="adm-editor-section">
                  <h4 className="adm-section-title"><MessageSquare size={16} /> Observações Internas da Equipe</h4>
                  <p style={{ fontSize: '12px', color: 'var(--dark-400)', margin: '0 0 12px 0' }}>
                    Essas anotações são visíveis apenas para os administradores e a equipe de atendimento da sua empresa. O cliente nunca tem acesso a este campo.
                  </p>
                  <textarea
                    rows={6}
                    className="input-field"
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                    placeholder="Ex: Cliente prefere contato no período da tarde. Solicitou nota fiscal com menção ao projeto XPTO..."
                    style={{ resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={isSavingNotes}
                      onClick={handleSaveNotes}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Check size={16} /> {isSavingNotes ? 'Salvando...' : 'Salvar Observações'}
                    </button>
                  </div>
                </div>
              )}

              {/* ABA 5: AUDITORIA & LOGS (LGPD) */}
              {detailTab === 'audit' && (
                <div className="adm-editor-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 className="adm-section-title"><ShieldCheck size={16} /> Trilha de Auditoria do Cliente</h4>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => loadAuditLogs(selectedCustomer.id)}
                      style={{ fontSize: '12px', color: 'var(--cyan)' }}
                    >
                      Atualizar Trilha
                    </button>
                  </div>

                  {loadingLogs ? (
                    <p style={{ color: 'var(--dark-400)', textAlign: 'center', padding: 20 }}>Carregando trilha de auditoria...</p>
                  ) : customerLogs.length === 0 ? (
                    <p style={{ color: 'var(--dark-400)', textAlign: 'center', padding: 20 }}>Nenhum evento registrado para este cliente ainda.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {customerLogs.map((log, idx) => (
                        <div key={idx} style={{ padding: '10px 14px', background: 'var(--dark-850)', borderRadius: 6, border: '1px solid var(--dark-800)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ color: log.action.includes('ANONYMIZE') ? 'var(--red)' : log.action.includes('VIEW') ? 'var(--cyan)' : 'var(--lime)' }}>
                              {log.action}
                            </strong>
                            <span style={{ color: 'var(--dark-400)' }}>
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div style={{ color: 'var(--dark-300)' }}>
                            Operador: <strong>{log.actor_name}</strong> ({log.actor_email}) · Papel: <code>{log.actor_role}</code>
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div style={{ marginTop: 4, fontFamily: 'monospace', color: 'var(--dark-400)', fontSize: '11px' }}>
                              Detalhes: {JSON.stringify(log.details)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CONFIRMAÇÃO DE BLOQUEIO / DESBLOQUEIO
         ========================================================= */}
      {customerToBlock && (
        <div className="overlay" style={{ zIndex: 750 }}>
          <div className="modal" style={{ maxWidth: 440, textAlign: 'center', padding: 'var(--space-6)' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: (customerToBlock.status || 'Ativo') === 'Bloqueado' ? 'rgba(132, 204, 22, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: (customerToBlock.status || 'Ativo') === 'Bloqueado' ? 'var(--lime)' : 'var(--red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ margin: '0 0 var(--space-2)' }}>
              {(customerToBlock.status || 'Ativo') === 'Bloqueado' ? 'Desbloquear Conta do Cliente?' : 'Bloquear Conta do Cliente?'}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-400)', margin: '0 0 var(--space-4)' }}>
              Cliente: <strong>{customerToBlock.nome}</strong> ({customerToBlock.email}).<br />
              {(customerToBlock.status || 'Ativo') === 'Bloqueado'
                ? 'O cliente voltará a poder fazer login e comprar na loja.'
                : 'O cliente ficará impedido de fazer login e concluir novos pedidos.'}
            </p>

            <div style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
              <label style={{ fontSize: '12px', color: 'var(--dark-300)', display: 'block', marginBottom: 4 }}>
                Motivo / Justificativa (registrado no log de auditoria):
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Suspeita de fraude, solicitação interna..."
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setCustomerToBlock(null); setBlockReason(''); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmToggleStatus}
                style={{
                  background: (customerToBlock.status || 'Ativo') === 'Bloqueado' ? 'var(--lime)' : 'var(--red)',
                  color: (customerToBlock.status || 'Ativo') === 'Bloqueado' ? '#000' : '#fff',
                  fontWeight: 600
                }}
              >
                Sim, {(customerToBlock.status || 'Ativo') === 'Bloqueado' ? 'Desbloquear' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE CONFIRMAÇÃO DE ANONIMIZAÇÃO LGPD (ART. 18)
         ========================================================= */}
      {customerToAnonymize && (
        <div className="overlay" style={{ zIndex: 750 }}>
          <div className="modal" style={{ maxWidth: 480, textAlign: 'center', padding: 'var(--space-6)' }}>
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
              <ShieldAlert size={28} />
            </div>

            <h3 style={{ margin: '0 0 var(--space-2)' }}>
              Anonimizar Dados Pessoais (LGPD)?
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-400)', margin: '0 0 var(--space-4)' }}>
              Esta ação atende ao direito de esquecimento/exclusão do titular (Art. 18 da LGPD). Os dados identificáveis (Nome, CPF, E-mail, Telefone, Endereço) serão <strong>permanentemente descaracterizados</strong>.<br /><br />
              <span style={{ color: 'var(--lime)' }}>✓ O histórico de pedidos e valores fiscais permanecerá íntegro.</span>
            </p>

            <div style={{ textAlign: 'left', marginBottom: 'var(--space-4)' }}>
              <label style={{ fontSize: '12px', color: 'var(--dark-300)', display: 'block', marginBottom: 4 }}>
                Protocolo ou Justificativa do Titular:
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Solicitação via ticket #1234..."
                value={anonymizeReason}
                onChange={e => setAnonymizeReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => { setCustomerToAnonymize(null); setAnonymizeReason(''); }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmAnonymize}
                style={{ background: 'var(--red)', color: '#fff', fontWeight: 600 }}
              >
                Confirmar Anonimização Irreversível
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL DE REDEFINIÇÃO DE SENHA SEGURA (SEM EXPOSIÇÃO)
         ========================================================= */}
      {resetPassData && (
        <div className="overlay" style={{ zIndex: 750 }}>
          <div className="modal" style={{ maxWidth: 460, padding: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(56, 189, 248, 0.15)', color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Key size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Redefinição Segura de Senha</h3>
                <span style={{ fontSize: '12px', color: 'var(--dark-400)' }}>
                  Para: <strong>{resetPassData.customer.email}</strong>
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--dark-300)', lineHeight: 1.5, marginBottom: 16 }}>
              Por segurança e conformidade, senhas não são exibidas nem editadas manualmente pelo painel. Um link criptografado e temporário (válido por 24h) foi gerado para o cliente criar sua nova senha:
            </p>

            <div style={{ background: 'var(--dark-850)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--dark-800)', marginBottom: 16 }}>
              <span style={{ fontSize: '11px', color: 'var(--dark-400)', display: 'block', marginBottom: 4 }}>Link de Recuperação Gerado:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="text"
                  readOnly
                  value={resetPassData.resetUrl}
                  className="input-field"
                  style={{ fontSize: '11px', fontFamily: 'monospace', padding: '6px 8px' }}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(resetPassData.resetUrl)
                    setCopiedLink(true)
                    showToast('Link copiado para a área de transferência! 📋')
                    setTimeout(() => setCopiedLink(false), 2500)
                  }}
                  style={{ flexShrink: 0 }}
                >
                  {copiedLink ? <Check size={14} color="var(--lime)" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setResetPassData(null)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos específicos da seção de clientes */}
      <style>{`
        .adm-rbac-control-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--dark-800);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          margin-bottom: var(--space-4);
          gap: 12px;
          flex-wrap: wrap;
        }
        .adm-rbac-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .adm-rbac-icon {
          color: var(--lime);
        }
        .adm-rbac-label {
          font-size: 11px;
          color: var(--dark-400);
          display: block;
        }
        .adm-rbac-role-name {
          font-size: 13px;
          color: var(--white);
        }
        .adm-rbac-selector-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .row-blocked {
          background: rgba(239, 68, 68, 0.04);
        }
      `}</style>
    </div>
  )
}
