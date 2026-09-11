import React, { useState, useEffect } from 'react'
import {
  X, User, Package, MapPin, Phone, Mail, FileText, CheckCircle2,
  Calendar, CreditCard, ExternalLink, Copy, AlertCircle, Save, Loader2,
  Lock, Eye, EyeOff, LogIn, UserPlus, LogOut, Sparkles, Truck
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import {
  formatCep,
  formatCpf,
  formatPhone,
  consultarCep
} from '../services/correiosService'
import { gerarBoletoPDF } from '../services/paymentService'

export default function CustomerAccountModal() {
  const {
    showCustomerAccount,
    setShowCustomerAccount,
    customerProfile,
    saveCustomerProfile,
    isCustomerLoggedIn,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    orders,
    showToast,
    openTrackingModal
  } = useStore()

  // Abas quando autenticado: 'profile' | 'orders'
  const [activeTab, setActiveTab] = useState('profile')

  // Abas quando NÃO autenticado: 'login' | 'register'
  const [authTab, setAuthTab] = useState('login')

  // Estado do formulário de Login
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado do formulário de Cadastro
  const [regData, setRegData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    password: '',
    confirmPassword: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  })
  const [regError, setRegError] = useState('')

  // Suporte para sair/fechar pelo ESC
  useEffect(() => {
    if (!showCustomerAccount) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCustomerAccount(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCustomerAccount, setShowCustomerAccount])

  // Estado dos dados cadastrais (quando logado)
  const [formData, setFormData] = useState(customerProfile || {
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

  // Sincroniza dados do perfil quando mudar
  useEffect(() => {
    if (customerProfile) {
      setFormData(customerProfile)
    }
  }, [customerProfile])

  const [isCepLoading, setIsCepLoading] = useState(false)
  const [cepFeedback, setCepFeedback] = useState(null)

  if (!showCustomerAccount) return null

  // Filtra pedidos deste cliente por email ou cpf, ou traz todos os pedidos locais
  const customerOrders = orders.filter(o => {
    const email = customerProfile?.email || formData?.email
    const cpf = customerProfile?.cpf || formData?.cpf
    if (!email && !cpf) return true
    const matchEmail = email && o.cliente?.email?.toLowerCase() === email.toLowerCase()
    const matchCpf = cpf && o.cliente?.cpf?.replace(/\D/g, '') === cpf.replace(/\D/g, '')
    return matchEmail || matchCpf
  })

  // --- Handlers de Login / Cadastro ---
  const handleLoginSubmit = (e) => {
    e.preventDefault()
    setLoginError('')
    setIsSubmitting(true)

    if (!loginId.trim()) {
      setLoginError('Informe seu E-mail ou CPF cadastrado.')
      setIsSubmitting(false)
      return
    }

    if (!loginPassword) {
      setLoginError('Informe sua senha de acesso.')
      setIsSubmitting(false)
      return
    }

    const res = loginCustomer(loginId, loginPassword)
    setIsSubmitting(false)

    if (!res.success) {
      setLoginError(res.error || 'Credenciais inválidas.')
    } else {
      setLoginId('')
      setLoginPassword('')
    }
  }

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    setRegError('')

    if (!regData.nome.trim()) {
      setRegError('Informe seu nome completo.')
      return
    }
    if (!regData.email.trim()) {
      setRegError('Informe seu e-mail.')
      return
    }
    if (!regData.cpf.trim()) {
      setRegError('Informe seu CPF.')
      return
    }
    if (!regData.password || regData.password.length < 3) {
      setRegError('A senha deve ter pelo menos 3 caracteres.')
      return
    }
    if (regData.password !== regData.confirmPassword) {
      setRegError('As senhas digitadas não coincidem.')
      return
    }

    setIsSubmitting(true)
    const res = registerCustomer({
      nome: regData.nome.trim(),
      email: regData.email.trim().toLowerCase(),
      cpf: regData.cpf.trim(),
      telefone: regData.telefone.trim(),
      password: regData.password,
      cep: regData.cep,
      endereco: regData.endereco,
      numero: regData.numero,
      complemento: regData.complemento,
      bairro: regData.bairro,
      cidade: regData.cidade,
      estado: regData.estado
    })
    setIsSubmitting(false)

    if (!res.success) {
      setRegError(res.error || 'Não foi possível cadastrar.')
    } else {
      setRegData({
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        password: '',
        confirmPassword: '',
        cep: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: ''
      })
    }
  }

  // Preencher credenciais de teste para praticidade
  const handleFillTestCredentials = () => {
    setLoginId('lucas@infodesk.net.br')
    setLoginPassword('123')
    setLoginError('')
    showToast('Dados de teste preenchidos! Clique em Entrar. 👤')
  }

  // Consulta de CEP para endereço de cadastro ou edição
  const handleCepLookup = async (val, isRegister = false) => {
    const formatted = formatCep(val)
    if (isRegister) {
      setRegData(prev => ({ ...prev, cep: formatted }))
    } else {
      setFormData(prev => ({ ...prev, cep: formatted }))
    }

    const clean = formatted.replace(/\D/g, '')
    if (clean.length === 8) {
      setIsCepLoading(true)
      setCepFeedback(null)

      const res = await consultarCep(clean)
      setIsCepLoading(false)

      if (res.success) {
        if (isRegister) {
          setRegData(prev => ({
            ...prev,
            endereco: res.logradouro || prev.endereco,
            bairro: res.bairro || prev.bairro,
            cidade: res.cidade || prev.cidade,
            estado: res.estado || prev.estado
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            endereco: res.logradouro || prev.endereco,
            bairro: res.bairro || prev.bairro,
            cidade: res.cidade || prev.cidade,
            estado: res.estado || prev.estado
          }))
        }
        setCepFeedback({
          type: 'success',
          message: `Endereço localizado: ${res.logradouro ? res.logradouro + ' — ' : ''}${res.bairro ? res.bairro + ', ' : ''}${res.cidade}/${res.estado}`
        })
      } else {
        setCepFeedback({
          type: 'error',
          message: res.error || 'CEP não localizado.'
        })
      }
    }
  }

  const handleSaveProfile = (e) => {
    e?.preventDefault()
    saveCustomerProfile(formData)
    showToast('Dados cadastrais salvos com sucesso! 👤✅')
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Copiado para a área de transferência! 📋')
  }

  const handleDownloadBoleto = (order) => {
    if (order.boleto) {
      const pdf = gerarBoletoPDF(order.boleto)
      pdf.save(`boleto-${order.id}.pdf`)
      showToast('Boleto baixado com sucesso! 📄')
    }
  }

  return (
    <div className="overlay" style={{ zIndex: 500 }}>
      {/* Botão de Fechar Flutuante / Desgarrado no Canto Superior Direito da Tela */}
      <button
        className="modal-close-floating"
        onClick={(e) => {
          e.stopPropagation()
          setShowCustomerAccount(false)
        }}
        title="Fechar Janela"
        aria-label="Fechar Janela"
      >
        <X size={22} />
      </button>

      <div className="modal modal-lg cust-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cust-header">
          <div className="cust-header-title">
            <div className="badge badge-lime" style={{ width: 'fit-content', marginBottom: 4 }}>
              <User size={12} /> Área do Cliente
            </div>
            <h2>
              {isCustomerLoggedIn
                ? `Olá, ${(customerProfile?.nome || formData?.nome || 'Cliente').split(' ')[0]}`
                : authTab === 'login'
                  ? 'Entrar na Minha Conta'
                  : 'Criar Nova Conta de Cliente'}
            </h2>
            <span className="cust-subtitle">
              {isCustomerLoggedIn
                ? `${customerProfile?.email || formData?.email || ''} • Gerencie seus dados e acompanhe seus pedidos`
                : authTab === 'login'
                  ? 'Se você já tem cadastro, faça login com seu e-mail/CPF e senha'
                  : 'Preencha o formulário abaixo para se cadastrar na Infodesk Store'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CASO 1: CLIENTE NÃO ESTÁ LOGADO (EXIBE TELA DE LOGIN / CADASTRO) */}
        {/* ========================================================================= */}
        {!isCustomerLoggedIn ? (
          <div className="cust-modal-content">
            {/* Tabs de Autenticação */}
            <div className="cust-tabs">
              <button
                type="button"
                className={`cust-tab ${authTab === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthTab('login'); setLoginError(''); setRegError(''); }}
              >
                <LogIn size={16} /> Já sou Cliente (Entrar)
              </button>
              <button
                type="button"
                className={`cust-tab ${authTab === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthTab('register'); setLoginError(''); setRegError(''); }}
              >
                <UserPlus size={16} /> Criar Nova Conta (Cadastro)
              </button>
            </div>

            <div className="cust-body">
              {/* ABA DE LOGIN */}
              {authTab === 'login' && (
                <div className="cust-auth-container">
                  <div className="cust-auth-card">
                    {loginError && (
                      <div className="cust-alert cust-alert-error">
                        <AlertCircle size={18} />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <form onSubmit={handleLoginSubmit} className="cust-form">
                      <div className="ck-field">
                        <label>E-mail ou CPF *</label>
                        <div className="input-wrap">
                          <Mail size={18} className="input-icon-left" />
                          <input
                            className="input-field has-icon-left"
                            type="text"
                            value={loginId}
                            onChange={e => setLoginId(e.target.value)}
                            placeholder="seuemail@exemplo.com ou 000.000.000-00"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="ck-field">
                        <label>Senha de Acesso *</label>
                        <div className="input-wrap">
                          <Lock size={18} className="input-icon-left" />
                          <input
                            className="input-field has-both-icons"
                            type={showPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            placeholder="Digite sua senha"
                            required
                          />
                          <button
                            type="button"
                            className="input-btn-right"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Ver senha"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        style={{ width: '100%', marginTop: 'var(--space-2)' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" /> Entrando...
                          </>
                        ) : (
                          <>
                            <LogIn size={18} /> Entrar na Minha Conta
                          </>
                        )}
                      </button>
                    </form>

                    {/* Dica / Acesso Rápido */}
                    <div className="cust-demo-box">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={16} style={{ color: 'var(--lime-dark)' }} />
                        <strong>Conta de Demonstração / Teste Rápido</strong>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--dark-500)', margin: '4px 0 8px' }}>
                        Para testar rapidamente, utilize: <code>lucas@infodesk.net.br</code> com senha <code>123</code>.
                      </p>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={handleFillTestCredentials}
                      >
                        Preencher Dados de Teste
                      </button>
                    </div>

                    {/* Alternar para Cadastro */}
                    <div className="cust-auth-footer">
                      <span>Ainda não possui uma conta?</span>
                      <button
                        type="button"
                        className="cust-link-btn"
                        onClick={() => { setAuthTab('register'); setLoginError(''); setRegError(''); }}
                      >
                        Cadastre-se gratuitamente
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA DE CADASTRO */}
              {authTab === 'register' && (
                <div className="cust-auth-container">
                  <form onSubmit={handleRegisterSubmit} className="cust-form">
                    {regError && (
                      <div className="cust-alert cust-alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                        <AlertCircle size={18} />
                        <span>{regError}</span>
                      </div>
                    )}

                    <div className="cust-form-grid-columns">
                      {/* Coluna 1: Dados Pessoais & Acesso */}
                      <div className="adm-editor-section">
                        <h4 className="adm-section-title"><User size={16} /> Dados Pessoais & Acesso</h4>
                        <div className="ck-form-grid">
                          <div className="ck-field ck-field-full">
                            <label>Nome Completo *</label>
                            <input
                              className="input-field"
                              value={regData.nome}
                              onChange={e => setRegData({ ...regData, nome: e.target.value })}
                              placeholder="Ex: Lucas Silva"
                              required
                            />
                          </div>

                          <div className="ck-field">
                            <label>E-mail *</label>
                            <input
                              className="input-field"
                              type="email"
                              value={regData.email}
                              onChange={e => setRegData({ ...regData, email: e.target.value.toLowerCase().trim() })}
                              placeholder="seuemail@provedor.com"
                              autoCapitalize="none"
                              required
                            />
                          </div>

                          <div className="ck-field">
                            <label>CPF *</label>
                            <input
                              className="input-field"
                              value={regData.cpf}
                              onChange={e => setRegData({ ...regData, cpf: formatCpf(e.target.value) })}
                              placeholder="000.000.000-00"
                              maxLength={14}
                              required
                            />
                          </div>

                          <div className="ck-field ck-field-full">
                            <label>WhatsApp / Telefone *</label>
                            <input
                              className="input-field"
                              value={regData.telefone}
                              onChange={e => setRegData({ ...regData, telefone: formatPhone(e.target.value) })}
                              placeholder="(00) 00000-0000"
                              maxLength={15}
                              required
                            />
                          </div>

                          <div className="ck-field">
                            <label>Criar Senha *</label>
                            <input
                              className="input-field"
                              type="password"
                              value={regData.password}
                              onChange={e => setRegData({ ...regData, password: e.target.value })}
                              placeholder="Mínimo 3 caracteres"
                              required
                            />
                          </div>

                          <div className="ck-field">
                            <label>Confirmar Senha *</label>
                            <input
                              className="input-field"
                              type="password"
                              value={regData.confirmPassword}
                              onChange={e => setRegData({ ...regData, confirmPassword: e.target.value })}
                              placeholder="Repita a senha"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="adm-editor-section">
                        <h4 className="adm-section-title"><MapPin size={16} /> Endereço Padrão de Entrega (Opcional)</h4>
                        <div className="ck-form-grid">
                          <div className="ck-field">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>CEP (Busca Automática)</span>
                              {isCepLoading && (
                                <span style={{ fontSize: '11px', color: 'var(--lime-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Loader2 size={12} className="animate-spin" /> Buscando...
                                </span>
                              )}
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                className="input-field"
                                value={regData.cep}
                                onChange={e => handleCepLookup(e.target.value, true)}
                                placeholder="00000-000"
                                maxLength={9}
                              />
                              <MapPin size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)', pointerEvents: 'none' }} />
                            </div>
                          </div>

                          {cepFeedback && (
                            <div className={`ck-field ck-field-full ck-cep-feedback ${cepFeedback.type}`}>
                              {cepFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                              <span>{cepFeedback.message}</span>
                            </div>
                          )}

                          <div className="ck-field ck-field-full">
                            <label>Rua / Logradouro</label>
                            <input
                              className="input-field"
                              value={regData.endereco}
                              onChange={e => setRegData({ ...regData, endereco: e.target.value })}
                              placeholder="Ex: SCS Quadra 01, Bloco A"
                            />
                          </div>

                          {/* Linha 1: Número e Complemento */}
                          <div className="ck-grid-num-comp">
                            <div className="ck-field">
                              <label>Número</label>
                              <input
                                className="input-field"
                                value={regData.numero}
                                onChange={e => setRegData({ ...regData, numero: e.target.value })}
                                placeholder="Ex: 120 ou S/N"
                              />
                            </div>

                            <div className="ck-field">
                              <label>Complemento</label>
                              <input
                                className="input-field"
                                value={regData.complemento}
                                onChange={e => setRegData({ ...regData, complemento: e.target.value })}
                                placeholder="Apto, Sala, Bloco..."
                              />
                            </div>
                          </div>

                          {/* Linha 2: Bairro, Cidade e Estado */}
                          <div className="ck-grid-bairro-cidade-uf">
                            <div className="ck-field">
                              <label>Bairro</label>
                              <input
                                className="input-field"
                                value={regData.bairro}
                                onChange={e => setRegData({ ...regData, bairro: e.target.value })}
                                placeholder="Ex: Asa Sul, Centro"
                              />
                            </div>

                            <div className="ck-field">
                              <label>Cidade</label>
                              <input
                                className="input-field"
                                value={regData.cidade}
                                onChange={e => setRegData({ ...regData, cidade: e.target.value })}
                                placeholder="Ex: Brasília"
                              />
                            </div>

                            <div className="ck-field">
                              <label>Estado</label>
                              <input
                                className="input-field"
                                value={regData.estado}
                                onChange={e => setRegData({ ...regData, estado: e.target.value.toUpperCase() })}
                                placeholder="DF"
                                maxLength={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 'var(--space-4)' }}>
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={18} className="animate-spin" /> Cadastrando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} /> Concluir Cadastro e Entrar
                          </>
                        )}
                      </button>

                      <div className="cust-auth-footer">
                        <span>Já possui uma conta cadastrada?</span>
                        <button
                          type="button"
                          className="cust-link-btn"
                          onClick={() => { setAuthTab('login'); setLoginError(''); setRegError(''); }}
                        >
                          Fazer Login
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASO 2: CLIENTE JÁ AUTENTICADO (DADOS CADASTRAIS & MEUS PEDIDOS) */
          /* ========================================================================= */
          <div className="cust-modal-content">
            {/* Tabs da Área Logada */}
            <div className="cust-tabs">
              <button
                className={`cust-tab ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <User size={16} /> Meus Dados Cadastrais
              </button>
              <button
                className={`cust-tab ${activeTab === 'orders' ? 'active' : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                <Package size={16} /> Meus Pedidos ({customerOrders.length})
              </button>
            </div>

            {/* Body da Área Logada */}
            <div className="cust-body">
              {activeTab === 'profile' && (
                <div className="cust-auth-container">
                  <form onSubmit={handleSaveProfile} className="cust-form">
                    <div className="cust-form-grid-columns">
                      {/* Coluna 1: Dados Pessoais & Contato */}
                      <div className="adm-editor-section">
                        <h4 className="adm-section-title"><User size={16} /> Dados Pessoais & Contato</h4>
                        <div className="ck-form-grid">
                          <div className="ck-field ck-field-full">
                            <label>Nome Completo *</label>
                            <input
                              className="input-field"
                              value={formData.nome || ''}
                              onChange={e => setFormData({ ...formData, nome: e.target.value })}
                              placeholder="Ex: Lucas Silva"
                              required
                            />
                          </div>

                          <div className="ck-field">
                            <label>E-mail *</label>
                            <input
                              className="input-field"
                              type="email"
                              value={formData.email || ''}
                              onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
                              placeholder="seuemail@provedor.com"
                              autoCapitalize="none"
                              required
                            />
                          </div>

                          <div className="ck-field">
                            <label>CPF *</label>
                            <input
                              className="input-field"
                              value={formData.cpf || ''}
                              onChange={e => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                              placeholder="000.000.000-00"
                              maxLength={14}
                              required
                            />
                          </div>

                          <div className="ck-field ck-field-full">
                            <label>WhatsApp / Telefone *</label>
                            <input
                              className="input-field"
                              value={formData.telefone || ''}
                              onChange={e => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                              placeholder="(00) 00000-0000"
                              maxLength={15}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="adm-editor-section">
                        <h4 className="adm-section-title"><MapPin size={16} /> Endereço Padrão de Entrega</h4>
                        <div className="ck-form-grid">
                          <div className="ck-field">
                            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>CEP *</span>
                              {isCepLoading && (
                                <span style={{ fontSize: '11px', color: 'var(--lime-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  <Loader2 size={12} className="animate-spin" /> Buscando...
                                </span>
                              )}
                            </label>
                            <div style={{ position: 'relative' }}>
                              <input
                                className="input-field"
                                value={formData.cep || ''}
                                onChange={e => handleCepLookup(e.target.value, false)}
                                placeholder="00000-000"
                                maxLength={9}
                                required
                              />
                              <MapPin size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)', pointerEvents: 'none' }} />
                            </div>
                          </div>

                          {cepFeedback && (
                            <div className={`ck-field ck-field-full ck-cep-feedback ${cepFeedback.type}`}>
                              {cepFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                              <span>{cepFeedback.message}</span>
                            </div>
                          )}

                          <div className="ck-field ck-field-full">
                            <label>Rua / Logradouro *</label>
                            <input
                              className="input-field"
                              value={formData.endereco || ''}
                              onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                              placeholder="Ex: SCS Quadra 01, Bloco A"
                              required
                            />
                          </div>

                          {/* Linha 1: Número e Complemento */}
                          <div className="ck-grid-num-comp">
                            <div className="ck-field">
                              <label>Número *</label>
                              <input
                                className="input-field"
                                value={formData.numero || ''}
                                onChange={e => setFormData({ ...formData, numero: e.target.value })}
                                placeholder="Ex: 120 ou S/N"
                                required
                              />
                            </div>

                            <div className="ck-field">
                              <label>Complemento</label>
                              <input
                                className="input-field"
                                value={formData.complemento || ''}
                                onChange={e => setFormData({ ...formData, complemento: e.target.value })}
                                placeholder="Apto, Sala, Bloco..."
                              />
                            </div>
                          </div>

                          {/* Linha 2: Bairro, Cidade e Estado */}
                          <div className="ck-grid-bairro-cidade-uf">
                            <div className="ck-field">
                              <label>Bairro *</label>
                              <input
                                className="input-field"
                                value={formData.bairro || ''}
                                onChange={e => setFormData({ ...formData, bairro: e.target.value })}
                                placeholder="Ex: Asa Sul, Centro"
                                required
                              />
                            </div>

                            <div className="ck-field">
                              <label>Cidade *</label>
                              <input
                                className="input-field"
                                value={formData.cidade || ''}
                                onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                                placeholder="Ex: Brasília"
                                required
                              />
                            </div>

                            <div className="ck-field">
                              <label>Estado *</label>
                              <input
                                className="input-field"
                                value={formData.estado || ''}
                                onChange={e => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                                placeholder="DF"
                                maxLength={2}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--dark-100)', flexWrap: 'wrap', gap: 12 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          logoutCustomer()
                        }}
                        style={{ color: 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
                        title="Desconectar e sair da sua conta"
                      >
                        <LogOut size={16} /> Desconectar da Conta
                      </button>

                      <button type="submit" className="btn btn-primary btn-lg">
                        <Save size={18} /> Salvar Alterações
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="cust-orders">
                  {customerOrders.length === 0 ? (
                    <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
                      <Package size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                      <p>Você ainda não possui nenhum pedido registrado nesta conta.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      {customerOrders.map(order => (
                        <div key={order.id} className="cust-order-card">
                          <div className="cust-order-header">
                            <div>
                              <span className="cust-order-id">Pedido: <strong>{order.id}</strong></span>
                              <span className="cust-order-date">
                                <Calendar size={12} /> {new Date(order.date).toLocaleDateString('pt-BR')} às {new Date(order.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <span className={`badge ${order.status === 'Pago' || order.status === 'Entregue' ? 'badge-lime' : order.status === 'Enviado' ? 'badge-dark' : 'badge-red'}`}>
                              {order.status}
                            </span>
                          </div>

                          {/* Items */}
                          <div className="cust-order-items">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="cust-order-item-row">
                                <img src={item.images?.[0] || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=100'} alt={item.name} className="cust-item-thumb" />
                                <div style={{ flex: 1 }}>
                                  <strong>{item.name}</strong>
                                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--dark-500)' }}>
                                    {item.qty}x R$ {item.price.toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                                <strong>R$ {(item.price * item.qty).toFixed(2).replace('.', ',')}</strong>
                              </div>
                            ))}
                          </div>

                          {/* Shipping Tracking */}
                          {order.trackingCode && (
                            <div className="cust-tracking-box">
                              <span>📦 Rastreio dos Correios: <strong>{order.trackingCode}</strong></span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => openTrackingModal(order.trackingCode)}
                                  title="Rastrear envio em tempo real"
                                >
                                  <Truck size={13} /> Rastrear Encomenda
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleCopy(order.trackingCode)}
                                >
                                  <Copy size={12} /> Copiar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="cust-order-footer">
                            <div>
                              <span style={{ fontSize: '12px', color: 'var(--dark-500)' }}>Forma de Pagamento: <strong>{order.paymentMethod?.toUpperCase()}</strong></span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              {order.boleto && (
                                <button className="btn btn-outline btn-sm" onClick={() => handleDownloadBoleto(order)}>
                                  <FileText size={14} /> Boleto
                                </button>
                              )}
                              <div className="cust-order-total">
                                Total: <strong>R$ {(order.total || 0).toFixed(2).replace('.', ',')}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <style>{`
          .cust-modal {
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 0;
          }
          .cust-modal-content {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
          }
          .cust-header {
            flex-shrink: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-5) var(--space-6);
            border-bottom: 1px solid var(--dark-100);
          }
          .cust-header-title h2 { font-size: var(--text-xl); }
          .cust-subtitle { font-size: var(--text-xs); color: var(--dark-500); }
          .cust-logout-btn {
            color: var(--red);
            font-size: var(--text-xs);
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .cust-logout-btn:hover {
            background: var(--red-glow);
          }
          .cust-tabs {
            flex-shrink: 0;
            display: flex;
            gap: var(--space-2);
            padding: 0 var(--space-6);
            border-bottom: 1px solid var(--dark-100);
            background: var(--dark-50);
          }
          .cust-tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: var(--space-3) var(--space-4);
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--dark-500);
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .cust-tab:hover { color: var(--dark-900); }
          .cust-tab.active {
            color: var(--lime-dark);
            border-bottom-color: var(--lime);
            background: var(--white);
          }
          .cust-body {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: var(--space-4) var(--space-6);
            -webkit-overflow-scrolling: touch;
          }
          .cust-auth-container {
            max-width: 820px;
            margin: 0 auto;
            width: 100%;
          }
          .cust-form-grid-columns {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }
          @media (min-width: 768px) {
            .cust-form-grid-columns {
              grid-template-columns: 1fr 1fr;
              gap: var(--space-4);
              align-items: start;
            }
          }
          .cust-auth-card {
            max-width: 480px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .cust-alert {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-radius: var(--radius-lg);
            font-size: var(--text-sm);
          }
          .cust-alert-error {
            background: #fef2f2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .cust-demo-box {
            background: var(--lime-glow);
            border: 1px dashed var(--lime);
            border-radius: var(--radius-lg);
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }
          .cust-demo-box code {
            background: rgba(0,0,0,0.06);
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
          }
          .cust-auth-footer {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: var(--text-sm);
            color: var(--dark-500);
            padding-top: var(--space-2);
          }
          .cust-link-btn {
            background: none;
            border: none;
            color: var(--lime-dark);
            font-weight: 700;
            cursor: pointer;
            text-decoration: underline;
          }
          .cust-order-card {
            border: 1px solid var(--dark-200);
            border-radius: var(--radius-xl);
            padding: var(--space-4);
            background: var(--white);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
          .cust-order-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: var(--space-2);
            border-bottom: 1px solid var(--dark-100);
          }
          .cust-order-id { font-size: var(--text-sm); display: block; }
          .cust-order-date { font-size: 11px; color: var(--dark-400); display: flex; align-items: center; gap: 4px; }
          .cust-order-items {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }
          .cust-order-item-row {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            font-size: var(--text-sm);
          }
          .cust-item-thumb {
            width: 44px;
            height: 44px;
            object-fit: cover;
            border-radius: var(--radius-md);
            border: 1px solid var(--dark-100);
          }
          .cust-tracking-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--lime-glow);
            padding: 6px 12px;
            border-radius: var(--radius-md);
            font-size: var(--text-xs);
            color: var(--lime-dark);
          }
          .cust-order-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: var(--space-2);
            border-top: 1px solid var(--dark-100);
          }
          .cust-order-total {
            font-size: var(--text-base);
            color: var(--lime-dark);
          }
        `}</style>
      </div>
    </div>
  )
}
