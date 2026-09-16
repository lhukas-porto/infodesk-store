import React, { useState, useEffect } from 'react'
import {
  X, CreditCard, FileText, QrCode, ArrowLeft, CheckCircle, Copy,
  MapPin, Loader2, CheckCircle2, AlertCircle, Sparkles, MessageCircle,
  Truck, Mail, ShieldCheck, LogIn, UserPlus, Eye, EyeOff, User, KeyRound, Lock
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import {
  calcularFrete,
  cotarFreteOficial,
  validarFreteNoBackend,
  consultarCep,
  formatCep,
  formatCpf,
  formatPhone,
  getProductWeight
} from '../services/correiosService'
import { gerarBoleto, gerarBoletoPDF, gerarLinkPagamento } from '../services/paymentService'
import { createWhatsAppLink, buildCustomerOrderSupportMessage } from '../services/whatsappService'
import { getStoredUtmData } from '../services/utmTracker'
import { trackBeginCheckout, trackPurchase } from '../services/analyticsService'

export default function CheckoutModal() {
  const {
    showCheckout,
    setShowCheckout,
    cart,
    cartTotal,
    clearCart,
    createOrder,
    showToast,
    customerProfile,
    isCustomerLoggedIn,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    globalCep,
    globalAddress,
    companyData
  } = useStore()
  const [step, setStep] = useState(1) // 1: Info, 2: Freight, 3: Payment, 4: Success
  const [isCreatingMPOrder, setIsCreatingMPOrder] = useState(false)
  const [cliente, setCliente] = useState({
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

  // Sincroniza dados com o perfil logado ou CEP global
  useEffect(() => {
    setCliente(prev => ({
      ...prev,
      nome: customerProfile?.nome || prev.nome,
      email: customerProfile?.email || prev.email,
      cpf: customerProfile?.cpf ? formatCpf(customerProfile.cpf) : prev.cpf,
      telefone: customerProfile?.telefone ? formatPhone(customerProfile.telefone) : prev.telefone,
      cep: customerProfile?.cep ? formatCep(customerProfile.cep) : (globalCep ? formatCep(globalCep) : prev.cep),
      endereco: customerProfile?.endereco || globalAddress?.logradouro || prev.endereco,
      numero: customerProfile?.numero || prev.numero,
      complemento: customerProfile?.complemento || prev.complemento,
      bairro: customerProfile?.bairro || globalAddress?.bairro || prev.bairro,
      cidade: customerProfile?.cidade || globalAddress?.cidade || prev.cidade,
      estado: customerProfile?.estado || globalAddress?.estado || prev.estado,
    }))
  }, [customerProfile, globalCep, globalAddress])

  // Dispara evento GA4 de início de checkout quando o modal for aberto com itens
  useEffect(() => {
    if (showCheckout && cart?.length > 0) {
      trackBeginCheckout(cart, cartTotal)
    }
  }, [showCheckout])

  const [isCepLoading, setIsCepLoading] = useState(false)
  const [isFreteLoading, setIsFreteLoading] = useState(false)
  const [isValidatingOrder, setIsValidatingOrder] = useState(false)
  const [cepFeedback, setCepFeedback] = useState(null) // { type: 'success' | 'error', message: string }
  const [freteResult, setFreteResult] = useState(null)
  const [selectedFrete, setSelectedFrete] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('mercadopago') // Mercado Pago Oficial
  const [orderResult, setOrderResult] = useState(null)

  // --- Estados de Autenticação Expressa no Checkout ---
  const [authMode, setAuthMode] = useState(null) // null (tela inicial limpa com botões) | 'login' | 'new'
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Opção de criar conta ao finalizar compra
  const [wantsToCreateAccount, setWantsToCreateAccount] = useState(false)
  const [createPassword, setCreatePassword] = useState('')
  const [showCreatePassword, setShowCreatePassword] = useState(false)

  // Login Expresso no Checkout
  const handleExpressLogin = (e) => {
    e?.preventDefault()
    setLoginError('')
    if (!loginIdentifier.trim()) {
      setLoginError('Informe seu E-mail ou CPF cadastrado.')
      return
    }
    if (!loginPassword) {
      setLoginError('Informe sua senha de acesso.')
      return
    }

    setIsLoggingIn(true)
    try {
      const res = loginCustomer(loginIdentifier, loginPassword)
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.')
        return
      }

      const user = res.customer
      setCliente(prev => ({
        ...prev,
        nome: user.nome || prev.nome,
        email: user.email || prev.email,
        cpf: user.cpf ? formatCpf(user.cpf) : prev.cpf,
        telefone: user.telefone ? formatPhone(user.telefone) : prev.telefone,
        cep: user.cep ? formatCep(user.cep) : prev.cep,
        endereco: user.endereco || prev.endereco,
        numero: user.numero || prev.numero,
        complemento: user.complemento || prev.complemento,
        bairro: user.bairro || prev.bairro,
        cidade: user.cidade || prev.cidade,
        estado: user.estado || prev.estado,
      }))
      setAuthMode('new')
      setLoginPassword('')
      showToast(`Bem-vindo(a) de volta, ${user.nome.split(' ')[0]}! Dados carregados. ✨`)
    } catch (err) {
      setLoginError('Erro ao autenticar. Tente novamente.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleStep1Submit = () => {
    // Se o cliente ainda não estiver logado, a criação de senha e conta é OBRIGATÓRIA
    if (!isCustomerLoggedIn) {
      if (!createPassword || createPassword.trim().length < 4) {
        showToast('Por favor, crie uma senha de acesso com no mínimo 4 caracteres para rastrear seu pedido. 🔒', 'error')
        return
      }

      const regRes = registerCustomer({
        ...cliente,
        password: createPassword
      })

      if (!regRes.success) {
        showToast(regRes.error || 'Já existe um cadastro com este E-mail ou CPF. Acesse com sua senha.', 'error')
        setLoginIdentifier(cliente.email || cliente.cpf)
        setAuthMode('login')
        return
      }
    }

    handleManualCalcFrete()
    setStep(2)
  }
  // Calcula o peso acumulado de todos os itens e quantidades no carrinho
  const totalCartWeight = (cart || []).reduce((acc, item) => {
    return acc + (getProductWeight(item) * (item.qty || 1))
  }, 0)
  const finalCartWeight = Math.max(0.5, Math.round(totalCartWeight * 10) / 10)

  // Função para cotar frete oficial no backend
  const fetchFrete = async (cleanCep) => {
    if (!cleanCep || cleanCep.length !== 8) return
    setIsFreteLoading(true)
    try {
      const res = await cotarFreteOficial(cleanCep, cart, cartTotal)
      if (!res.error && res.opcoes && res.opcoes.length > 0) {
        setFreteResult(res)
        setSelectedFrete(prev => {
          if (!prev) return res.opcoes[0]
          const existing = res.opcoes.find(o => o.tipo === prev.tipo)
          return existing || res.opcoes[0]
        })
      } else {
        setFreteResult(null)
      }
    } catch {
      setFreteResult(null)
    } finally {
      setIsFreteLoading(false)
    }
  }

  // Pré-calcula opções de frete automaticamente se já tiver CEP válido preenchido
  useEffect(() => {
    const clean = (cliente.cep || '').replace(/\D/g, '')
    if (clean.length === 8 && !freteResult && !isFreteLoading) {
      fetchFrete(clean)
    }
  }, [cliente.cep, cartTotal, finalCartWeight])

  // Auto-busca nos Correios ao preencher 8 dígitos do CEP
  const handleCepChange = async (value) => {
    const formatted = formatCep(value)
    setCliente(prev => ({ ...prev, cep: formatted }))

    const clean = formatted.replace(/\D/g, '')
    if (clean.length === 8) {
      setIsCepLoading(true)
      setCepFeedback(null)

      const res = await consultarCep(clean)
      setIsCepLoading(false)

      if (res.success) {
        setCliente(prev => ({
          ...prev,
          endereco: res.logradouro || prev.endereco,
          bairro: res.bairro || prev.bairro,
          cidade: res.cidade || prev.cidade,
          estado: res.estado || prev.estado
        }))
        setCepFeedback(null)

        // Auto-calcular opções de frete oficial
        fetchFrete(clean)
      } else {
        setCepFeedback({
          type: 'error',
          message: res.error || 'CEP não encontrado. Preencha o endereço manualmente.'
        })
      }
    } else {
      setCepFeedback(null)
    }
  }

  const handleManualCalcFrete = () => {
    const clean = (cliente.cep || '').replace(/\D/g, '')
    fetchFrete(clean)
  }

  const fretePrice = selectedFrete?.preco || 0
  const total = cartTotal + fretePrice
  const pixDiscount = total * 0.03
  const pixTotal = total - pixDiscount

  const handleFinalize = async () => {
    if (!selectedFrete) {
      showToast('Por favor, selecione uma opção de frete dos Correios.', 'error')
      return
    }

    const cleanCep = (cliente.cep || '').replace(/\D/g, '')
    setIsValidatingOrder(true)

    // Validação de segurança anti-fraude no backend (Section 11)
    const validation = await validarFreteNoBackend({
      cepDestino: cleanCep,
      items: cart,
      selectedServiceId: selectedFrete.tipo,
      claimedShippingPrice: selectedFrete.preco
    })
    setIsValidatingOrder(false)

    if (!validation.valid) {
      showToast(validation.error || 'Divergência detectada no cálculo de frete. O frete foi atualizado.', 'error')
      fetchFrete(cleanCep)
      return
    }

    const fullAddress = [
      cliente.endereco,
      cliente.numero ? `Nº ${cliente.numero}` : '',
      cliente.complemento ? `(${cliente.complemento})` : '',
      cliente.bairro ? `Bairro: ${cliente.bairro}` : '',
      `${cliente.cidade}/${cliente.estado}`,
      `CEP: ${cliente.cep}`
    ].filter(Boolean).join(', ')

    const validatedFrete = validation.realShippingPrice !== undefined ? validation.realShippingPrice : fretePrice
    const calculatedTotal = cartTotal + validatedFrete
    const appliedPixDiscount = paymentMethod === 'pix' ? (calculatedTotal * 0.03) : 0
    const finalTotal = paymentMethod === 'pix' ? (calculatedTotal - appliedPixDiscount) : calculatedTotal

    const pedido = {
      items: cart,
      subtotal: cartTotal,
      frete: validatedFrete,
      freteType: selectedFrete?.tipo,
      pixDiscount: appliedPixDiscount,
      total: finalTotal,
      cliente: {
        ...cliente,
        enderecoCompleto: fullAddress
      },
      paymentMethod,
      utm_data: getStoredUtmData(),
    }

    if (paymentMethod === 'mercadopago') {
      try {
        setIsCreatingMPOrder(true)
        const orderId = 'ORD-' + Date.now()
        const orderPayload = {
          ...pedido,
          id: orderId
        }

        const res = await fetch('/api/payments/mercadopago/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData: orderPayload,
            companyId: companyData?.id || 'default'
          })
        })

        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Falha ao gerar checkout com o Mercado Pago.')
        }

        // Salva o pedido localmente no contexto
        createOrder(orderPayload)

        // Dispara evento GA4 de purchase (sem PII)
        trackPurchase(orderPayload, cart)

        // Limpa o carrinho de compras apenas após a criação da Order confirmada
        clearCart()
        showToast('Redirecionando para o Checkout Pro do Mercado Pago... 🔒')

        if (data.checkout_url) {
          setTimeout(() => {
            window.location.href = data.checkout_url
          }, 600)
        }
        return
      } catch (err) {
        console.error('Erro no checkout Mercado Pago:', err)
        showToast(err.message || 'Erro ao conectar com o Mercado Pago. Tente novamente.')
      } finally {
        setIsCreatingMPOrder(false)
      }
      return
    }

    if (paymentMethod === 'boleto') {
      const boleto = gerarBoleto({ id: 'ORD-' + Date.now(), total: finalTotal, cliente })
      pedido.boleto = boleto
    } else if (paymentMethod === 'link') {
      const link = gerarLinkPagamento({ total: finalTotal })
      pedido.linkPagamento = link
    }

    const order = createOrder(pedido)
    // Dispara evento GA4 de purchase (sem PII)
    trackPurchase(order || pedido, cart)
    setOrderResult({ ...order, ...pedido })
    setStep(4)
  }

  const handleDownloadBoleto = () => {
    if (orderResult?.boleto) {
      const pdf = gerarBoletoPDF(orderResult.boleto)
      pdf.save(`boleto-${orderResult.id}.pdf`)
      showToast('Boleto baixado com sucesso! 📄')
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Copiado para a área de transferência! 📋')
  }

  const closeAll = () => {
    setShowCheckout(false)
    setStep(1)
    setCliente({ nome: '', email: '', cpf: '', telefone: '', cep: '', endereco: '', numero: '', complemento: '', cidade: '', estado: '' })
    setCepFeedback(null)
    setFreteResult(null)
    setSelectedFrete(null)
    setPaymentMethod('mercadopago')
    setOrderResult(null)
    setAuthMode(null)
    setLoginIdentifier('')
    setLoginPassword('')
    setLoginError('')
    setWantsToCreateAccount(false)
    setCreatePassword('')
  }

  // Ao abrir o checkout modal, garante que comece limpo (apenas com os botões de escolha se não estiver logado)
  useEffect(() => {
    if (showCheckout) {
      if (!isCustomerLoggedIn) {
        setAuthMode(null)
      }
    }
  }, [showCheckout, isCustomerLoggedIn])

  // Suporte a fechar checkout com tecla ESC
  useEffect(() => {
    if (!showCheckout) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeAll()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCheckout])

  if (!showCheckout) return null

  return (
    <div className="overlay">
      <div className="modal modal-lg">
        <button className="modal-close" onClick={closeAll} aria-label="Fechar"><X size={20} /></button>

        {/* Progress Bar */}
        <div className="ck-progress">
          {['Identificação & Endereço', 'Frete Correios', 'Pagamento', 'Confirmação'].map((label, i) => (
            <div key={i} className={`ck-step ${step > i ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <span className="ck-step-num">{step > i + 1 ? '✓' : i + 1}</span>
              <span className="ck-step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="ck-body">
          {/* Step 1: Identificação, Login ou Cadastro & Endereço */}
          {step === 1 && (
            <div className="ck-form">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0 }}>Identificação & Entrega</h3>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)', margin: '2px 0 0 0' }}>
                    Identifique-se para entrega e emissão segura do comprovante do seu pedido.
                  </p>
                </div>
              </div>

              {/* Banner se o cliente já estiver logado */}
              {isCustomerLoggedIn && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, rgba(132, 204, 22, 0.12), rgba(132, 204, 22, 0.04))',
                  border: '1px solid rgba(132, 204, 22, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: 'var(--lime)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0
                    }}>
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dark-900)' }}>
                        Identificado como: {customerProfile?.nome}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--dark-600)' }}>
                        {customerProfile?.email} • Seus dados e endereço foram carregados automaticamente
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => {
                      logoutCustomer()
                      setAuthMode(null)
                      showToast('Sessão encerrada no checkout.')
                    }}
                    style={{ color: 'var(--dark-500)', textDecoration: 'underline', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Não é você? Trocar de conta
                  </button>
                </div>
              )}

              {/* TELA INICIAL LIMPA: APENAS OS DOIS BOTÕES DE ESCOLHA */}
              {!isCustomerLoggedIn && authMode === null && (
                <div style={{ padding: '8px 0 20px 0' }}>
                  <p style={{ fontSize: '14px', color: 'var(--dark-700)', marginBottom: '20px', lineHeight: 1.5 }}>
                    Para continuar com a sua compra, como prefere se identificar?
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Opção 1: Já sou cadastrado */}
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      style={{
                        background: 'var(--white)',
                        border: '2px solid var(--dark-200)',
                        borderRadius: '14px',
                        padding: '24px 20px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--lime-dark)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--dark-200)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, background: 'var(--dark-100)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dark-900)'
                      }}>
                        <LogIn size={22} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '15px', color: 'var(--dark-900)', display: 'block', marginBottom: 4 }}>
                          Já sou cadastrado (Entrar)
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--dark-500)', lineHeight: 1.4, display: 'block' }}>
                          Acesse sua conta para carregar seus dados e endereço salvos automaticamente.
                        </span>
                      </div>
                      <span className="btn btn-outline btn-sm" style={{ marginTop: 'auto', pointerEvents: 'none' }}>
                        Fazer Login ➔
                      </span>
                    </button>

                    {/* Opção 2: Primeira compra */}
                    <button
                      type="button"
                      onClick={() => setAuthMode('new')}
                      style={{
                        background: 'var(--white)',
                        border: '2px solid var(--lime)',
                        borderRadius: '14px',
                        padding: '24px 20px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, background: 'var(--lime-glow)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lime-dark)'
                      }}>
                        <UserPlus size={22} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '15px', color: 'var(--dark-900)', display: 'block', marginBottom: 4 }}>
                          Primeira compra (Novo Cliente)
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--dark-500)', lineHeight: 1.4, display: 'block' }}>
                          Preencha seu endereço de entrega e dados para envio da encomenda.
                        </span>
                      </div>
                      <span className="btn btn-primary btn-sm" style={{ marginTop: 'auto', pointerEvents: 'none' }}>
                        Preencher Dados ➔
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cabeçalho quando estiver dentro de uma das opções para poder voltar */}
              {!isCustomerLoggedIn && authMode !== null && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setAuthMode(null)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, color: 'var(--dark-600)', padding: 0 }}
                >
                  <ArrowLeft size={16} /> Voltar para escolher identificação
                </button>
              )}

              {/* Formulário de Login Expresso dentro do checkout */}
              {authMode === 'login' && !isCustomerLoggedIn && (
                <div style={{
                  background: 'var(--dark-50)',
                  border: '1px solid var(--dark-200)',
                  borderRadius: '14px',
                  padding: '24px 20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: 'var(--lime)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000'
                    }}>
                      <LogIn size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--dark-900)' }}>
                        Acessar Conta Infodesk
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--dark-500)' }}>
                        Preencha seus dados para carregar suas informações de entrega na hora.
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleExpressLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: 16 }}>
                    <div className="ck-field">
                      <label>E-mail ou CPF *</label>
                      <input
                        type="text"
                        className="input-field"
                        value={loginIdentifier}
                        onChange={e => setLoginIdentifier(e.target.value)}
                        placeholder="Digite seu e-mail ou CPF cadastrado"
                        autoFocus
                        required
                      />
                    </div>

                    <div className="ck-field">
                      <label>Senha *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          className="input-field"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="Digite sua senha de acesso"
                          required
                          style={{ paddingRight: 40 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-400)'
                          }}
                          tabIndex={-1}
                          title={showLoginPassword ? 'Ocultar senha' : 'Ver senha'}
                        >
                          {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {loginError && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'var(--red-glow)', color: 'var(--red)',
                        padding: '10px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600
                      }}>
                        <AlertCircle size={16} />
                        <span>{loginError}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isLoggingIn}
                      style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
                    >
                      {isLoggingIn ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
                      {isLoggingIn ? 'Autenticando...' : 'Entrar e Carregar Meus Dados'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 6 }}>
                      <button
                        type="button"
                        onClick={() => setAuthMode('new')}
                        style={{ background: 'none', border: 'none', color: 'var(--dark-600)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Ainda não tem cadastro? Preencha os dados como novo cliente
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Formulário de Identificação e Entrega (Exibido apenas quando for 'new' ou se já estiver logado) */}
              {(authMode === 'new' || isCustomerLoggedIn) && (
                <>
                  <div className="ck-form-grid">
                  {/* Nome */}
                  <div className="ck-field ck-field-full">
                    <label>Nome Completo *</label>
                    <input
                      className="input-field"
                      value={cliente.nome}
                      onChange={e => setCliente({ ...cliente, nome: e.target.value })}
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>

                  {/* E-mail em minúsculo */}
                  <div className="ck-field">
                    <label>E-mail *</label>
                    <input
                      className="input-field"
                      type="email"
                      value={cliente.email}
                      onChange={e => setCliente({ ...cliente, email: e.target.value.toLowerCase().trim() })}
                      placeholder="seuemail@provedor.com"
                      autoCapitalize="none"
                      spellCheck="false"
                      required
                    />
                  </div>

                  {/* CPF com máscara */}
                  <div className="ck-field">
                    <label>CPF *</label>
                    <input
                      className="input-field"
                      value={cliente.cpf}
                      onChange={e => setCliente({ ...cliente, cpf: formatCpf(e.target.value) })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>

                  {/* Telefone com máscara */}
                  <div className="ck-field ck-field-full">
                    <label>WhatsApp / Telefone *</label>
                    <input
                      className="input-field"
                      value={cliente.telefone}
                      onChange={e => setCliente({ ...cliente, telefone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                      required
                    />
                  </div>

                  {/* Criação OBRIGATÓRIA de conta e senha se não estiver logado */}
                  {!isCustomerLoggedIn && (
                    <div style={{
                      gridColumn: '1 / -1',
                      background: 'rgba(0, 158, 227, 0.04)',
                      border: '1px solid rgba(0, 158, 227, 0.25)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      margin: '6px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Lock size={16} style={{ color: 'var(--lime-dark)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--dark-900)' }}>
                          Defina sua Senha de Acesso * (Obrigatória para rastreio)
                        </span>
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          className="input-field"
                          value={createPassword}
                          onChange={e => setCreatePassword(e.target.value)}
                          placeholder="Crie uma senha de acesso (mínimo 4 caracteres)"
                          style={{ paddingRight: 40 }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          style={{
                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dark-400)'
                          }}
                          tabIndex={-1}
                          title={showCreatePassword ? 'Ocultar senha' : 'Ver senha'}
                        >
                          {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <span style={{ fontSize: '11.5px', color: 'var(--dark-600)', lineHeight: '1.4' }}>
                        🔒 Sua conta será criada automaticamente com esta senha para você acompanhar o rastreio dos Correios e emitir comprovantes na Área do Cliente.
                      </span>
                    </div>
                  )}

                  {/* CEP com máscara e busca automática */}
                  <div className="ck-field ck-field-full">
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>CEP (Busca nos Correios) *</span>
                      {isCepLoading && (
                        <span style={{ fontSize: '11px', color: 'var(--lime-dark)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Loader2 size={12} className="animate-spin" /> Buscando...
                        </span>
                      )}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input-field"
                        value={cliente.cep}
                        onChange={e => handleCepChange(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        required
                      />
                      <MapPin size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Feedback da busca de CEP */}
                  {cepFeedback && cepFeedback.type === 'error' && (
                    <div className="ck-field ck-field-full ck-cep-feedback error">
                      <AlertCircle size={16} />
                      <span>{cepFeedback.message}</span>
                    </div>
                  )}

                  {/* Endereço / Logradouro */}
                  <div className="ck-field ck-field-full">
                    <label>Rua / Logradouro *</label>
                    <input
                      className="input-field"
                      value={cliente.endereco}
                      onChange={e => setCliente({ ...cliente, endereco: e.target.value })}
                      placeholder="Ex: Rua das Acácias, SCS Quadra 01..."
                      required
                    />
                  </div>

                  {/* Linha 1: Número e Complemento */}
                  <div className="ck-grid-num-comp">
                    <div className="ck-field">
                      <label>Número *</label>
                      <input
                        className="input-field"
                        value={cliente.numero}
                        onChange={e => setCliente({ ...cliente, numero: e.target.value })}
                        placeholder="Ex: 120 ou S/N"
                        required
                      />
                    </div>

                    <div className="ck-field">
                      <label>Complemento</label>
                      <input
                        className="input-field"
                        value={cliente.complemento}
                        onChange={e => setCliente({ ...cliente, complemento: e.target.value })}
                        placeholder="Apto, Bloco, Sala..."
                      />
                    </div>
                  </div>

                  {/* Linha 2: Bairro, Cidade e Estado */}
                  <div className="ck-grid-bairro-cidade-uf">
                    <div className="ck-field">
                      <label>Bairro *</label>
                      <input
                        className="input-field"
                        value={cliente.bairro}
                        onChange={e => setCliente({ ...cliente, bairro: e.target.value })}
                        placeholder="Ex: Asa Sul, Centro, Jardins..."
                        required
                      />
                    </div>

                    <div className="ck-field">
                      <label>Cidade *</label>
                      <input
                        className="input-field"
                        value={cliente.cidade}
                        onChange={e => setCliente({ ...cliente, cidade: e.target.value })}
                        placeholder="Ex: Brasília"
                        required
                      />
                    </div>

                    <div className="ck-field">
                      <label>Estado *</label>
                      <input
                        className="input-field"
                        value={cliente.estado}
                        onChange={e => setCliente({ ...cliente, estado: e.target.value.toUpperCase() })}
                        placeholder="DF"
                        maxLength={2}
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-lg ck-next"
                  onClick={handleStep1Submit}
                  disabled={
                    !cliente.nome || !cliente.email || !cliente.cpf || !cliente.cep || !cliente.endereco ||
                    (!isCustomerLoggedIn && (!createPassword || createPassword.trim().length < 4))
                  }
                >
                  Prosseguir para Frete dos Correios
                </button>
              </>
            )}
            </div>
          )}

          {/* Step 2: Freight */}
          {step === 2 && (
            <div className="ck-form">
              <button className="btn btn-ghost ck-back" onClick={() => setStep(1)}><ArrowLeft size={16} /> Voltar</button>
              <h3>Opção de Envio (Correios)</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)', marginBottom: 'var(--space-4)' }}>
                Destino: <strong>{cliente.cidade}/{cliente.estado}</strong> (CEP: {cliente.cep}) · 📦 Remessa: <strong>{finalCartWeight.toFixed(1)} kg</strong> ({cart.reduce((a, b) => a + (b.qty || 1), 0)} {cart.reduce((a, b) => a + (b.qty || 1), 0) > 1 ? 'itens' : 'item'})
              </p>

              {isFreteLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', gap: '12px', background: 'var(--dark-50)', borderRadius: '12px', marginBottom: 'var(--space-4)' }}>
                  <Loader2 className="spinner" size={32} style={{ animation: 'spin 1s linear infinite', color: '#16a34a' }} />
                  <span style={{ fontWeight: 600, color: 'var(--dark-700)', fontSize: '0.95rem' }}>Calculando frete dos Correios...</span>
                </div>
              ) : freteResult && freteResult.opcoes && freteResult.opcoes.length > 0 ? (
                freteResult.opcoes.map(op => (
                  <div
                    key={op.tipo}
                    className={`ck-frete-option ${selectedFrete?.tipo === op.tipo ? 'selected' : ''}`}
                    onClick={() => setSelectedFrete(op)}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong>{op.tipo}</strong>
                        {op.serviceCode && (
                          <span style={{ fontSize: '10px', background: 'var(--dark-200)', padding: '1px 6px', borderRadius: '4px', color: 'var(--dark-600)' }}>
                            {op.serviceCode}
                          </span>
                        )}
                      </div>
                      <span>{op.prazoLabel}</span>
                    </div>
                    <span className="ck-frete-price">{op.label}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', marginBottom: '16px' }}>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Não foi possível calcular o frete para este CEP no momento. Verifique os dados informados.</p>
                </div>
              )}

              <div className="ck-total-preview">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal Produtos:</span>
                  <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Frete ({selectedFrete?.tipo || 'Correios'}):</span>
                  <span>R$ {fretePrice.toFixed(2).replace('.', ',')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--dark-200)', paddingTop: 6, marginTop: 4 }}>
                  <strong>Total a Pagar:</strong>
                  <strong>R$ {total.toFixed(2).replace('.', ',')}</strong>
                </div>
              </div>

              <button className="btn btn-primary btn-lg ck-next" onClick={() => setStep(3)} disabled={isFreteLoading || !selectedFrete}>
                Escolher Forma de Pagamento
              </button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="ck-form">
              <button className="btn btn-ghost ck-back" onClick={() => setStep(2)}><ArrowLeft size={16} /> Voltar</button>
              <h3>Forma de Pagamento</h3>
              
              <div className="ck-payment-options" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Mercado Pago Checkout Pro (Único Gateway Oficial) */}
                <div
                  className="ck-payment-card ck-payment-mp selected"
                  onClick={() => setPaymentMethod('mercadopago')}
                  style={{
                    border: '2px solid #009ee3',
                    background: 'linear-gradient(180deg, rgba(0, 158, 227, 0.06) 0%, rgba(255, 255, 255, 0.95) 100%)',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '24px 20px',
                    borderRadius: '12px',
                    textAlign: 'left',
                    boxShadow: '0 4px 16px rgba(0, 158, 227, 0.08)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#009ee3',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderBottomLeftRadius: '8px',
                    letterSpacing: '0.5px'
                  }}>
                    CHECKOUT OFICIAL & SEGURO
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      background: '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#009ee3'
                    }}>
                      <ShieldCheck size={28} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '18px', color: '#0f172a', display: 'block', fontWeight: 800 }}>
                        Mercado Pago Checkout Pro
                      </strong>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Pague com PIX, Cartão até 12x ou Boleto em ambiente seguro
                      </span>
                    </div>
                  </div>

                  {/* Badges de Formas Suportadas */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    margin: '14px 0',
                    padding: '12px',
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span>
                      <strong>PIX Instantâneo</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }}></span>
                      <strong>Cartão de Crédito</strong> (até 12x)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span>
                      <strong>Boleto Bancário</strong>
                    </div>
                  </div>

                  {/* Preço e Garantia */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      🔒 Criptografia ponta a ponta Mercado Pago
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total do Pedido</span>
                      <strong style={{ fontSize: '20px', color: '#009ee3', fontWeight: 800 }}>
                        R$ {total.toFixed(2).replace('.', ',')}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg ck-next"
                onClick={handleFinalize}
                disabled={!paymentMethod || isValidatingOrder || isCreatingMPOrder}
                style={{
                  background: '#009ee3',
                  borderColor: '#009ee3',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 700,
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(0, 158, 227, 0.25)',
                  marginTop: '8px'
                }}
              >
                {isValidatingOrder ? (
                  <>
                    <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Validando Pedido...
                  </>
                ) : isCreatingMPOrder ? (
                  <>
                    <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    Conectando ao Mercado Pago Seguro...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    Pagar com Mercado Pago — R$ {total.toFixed(2).replace('.', ',')}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && orderResult && (
            <div className="ck-confirmation">
              <CheckCircle size={56} className="ck-check-icon" />
              <h2>Pedido Realizado com Sucesso! 🎉</h2>
              <p className="ck-order-id">Identificador do Pedido: <strong>{orderResult.id}</strong></p>

              {orderResult.boleto && (
                <div className="ck-boleto-info">
                  <h4>Boleto Bancário</h4>
                  <p>Valor: <strong>{orderResult.boleto.valorFormatado}</strong></p>
                  <p>Vencimento: <strong>{orderResult.boleto.vencimento}</strong></p>
                  <div className="ck-linha-digitavel">
                    <code>{orderResult.boleto.linhaDigitavel}</code>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(orderResult.boleto.linhaDigitavel)}>
                      <Copy size={14} /> Copiar
                    </button>
                  </div>
                  <button className="btn btn-primary" onClick={handleDownloadBoleto}>
                    <FileText size={16} /> Baixar Boleto em PDF
                  </button>
                </div>
              )}

              {orderResult.paymentMethod === 'pix' && (
                <div className="ck-pix-info">
                  <h4>Pix Copia e Cola</h4>
                  <p>Valor com 3% de desconto: <strong style={{ color: '#16a34a' }}>R$ {(orderResult.total || pixTotal).toFixed(2).replace('.', ',')}</strong></p>
                  <div className="ck-pix-code">
                    <code>00020126580014br.gov.bcb.pix0136infodesk-store-{orderResult.id}52040000530398654{(orderResult.total || pixTotal).toFixed(2)}5802BR</code>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleCopy(`00020126580014br.gov.bcb.pix0136infodesk-store-${orderResult.id}52040000530398654${(orderResult.total || pixTotal).toFixed(2)}5802BR`)}>
                      <Copy size={14} /> Copiar Código
                    </button>
                  </div>
                </div>
              )}

              {orderResult.linkPagamento && (
                <div className="ck-link-info">
                  <h4>Link Seguro de Pagamento</h4>
                  <p>Valor: <strong>{orderResult.linkPagamento.valorFormatado}</strong></p>
                  <a href={orderResult.linkPagamento.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <CreditCard size={16} /> Pagar com Cartão
                  </a>
                </div>
              )}

              {/* Informações de Acompanhamento e Notificações (Padrão Amazon) */}
              <div style={{
                marginTop: 'var(--space-4)',
                padding: '16px 20px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-lg)',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Mail size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                      Comprovante enviado por e-mail
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                      Os detalhes do seu pedido foram registrados e encaminhados para <strong>{orderResult.cliente?.email || cliente.email || 'seu e-mail'}</strong>.
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                      Rastreamento dos Correios ({orderResult.freteType || 'PAC'})
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, display: 'block' }}>
                      Assim que o pacote for despachado nos Correios, você poderá acompanhar cada etapa em <strong>Meus Pedidos &gt; Detalhes do Pedido</strong>.
                    </span>
                  </div>
                </div>
              </div>

              {/* Canal de Atendimento e Suporte Humano Opcional */}
              <div style={{
                marginTop: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#64748b'
              }}>
                <span>Precisa de ajuda com este pedido?</span>
                <a
                  href={createWhatsAppLink(companyData?.whatsapp || '61996272630', buildCustomerOrderSupportMessage(orderResult, companyData))}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#16a34a',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Falar com nosso atendimento"
                >
                  <MessageCircle size={14} /> Fale com nosso suporte
                </a>
              </div>

              <button className="btn btn-outline btn-lg" onClick={closeAll} style={{ marginTop: 'var(--space-4)' }}>
                Voltar à Loja
              </button>
            </div>
          )}
        </div>

        <style>{`
          .modal-close {
            position: absolute; top: var(--space-4); right: var(--space-4); z-index: 10;
            width: 36px; height: 36px; border-radius: var(--radius-full);
            background: var(--dark-100); border: none; cursor: pointer;
            display: flex; align-items: center; justify-content: center;
            color: var(--dark-600); transition: all var(--transition-fast);
          }
          .modal-close:hover { background: var(--dark-200); color: var(--dark-900); }
          .ck-progress {
            display: flex; justify-content: center; gap: var(--space-4);
            padding: var(--space-5) var(--space-6); border-bottom: 1px solid var(--dark-100);
            overflow-x: auto;
          }
          .ck-step { display: flex; align-items: center; gap: var(--space-2); opacity: 0.4; white-space: nowrap; }
          .ck-step.active, .ck-step.done { opacity: 1; }
          .ck-step-num {
            width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--dark-300);
            display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 700;
          }
          .ck-step.active .ck-step-num { border-color: var(--lime); background: var(--lime); color: var(--dark-950); }
          .ck-step.done .ck-step-num { border-color: var(--lime); background: var(--lime-glow); color: var(--lime-dark); }
          .ck-step-label { font-size: var(--text-sm); font-weight: 500; }
          @media (max-width: 600px) { .ck-step-label { display: none; } }
          .ck-body { padding: var(--space-6); }
          .ck-form h3 { margin-bottom: 2px; }
          .ck-form-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
          }
          @media (max-width: 600px) { .ck-form-grid { grid-template-columns: 1fr; } }
          .ck-field { display: flex; flex-direction: column; gap: var(--space-1); }
          .ck-field label { font-size: var(--text-sm); font-weight: 500; color: var(--dark-600); }
          .ck-field-full { grid-column: 1 / -1; }
          .ck-next { width: 100%; margin-top: var(--space-5); }
          .ck-next:disabled { opacity: 0.5; cursor: not-allowed; }
          .ck-back { margin-bottom: var(--space-3); }

          .ck-cep-feedback {
            display: flex; align-items: center; gap: 8px;
            padding: 8px 12px; border-radius: var(--radius-md); font-size: var(--text-xs); font-weight: 600;
            animation: fadeIn 0.2s ease-out;
          }
          .ck-cep-feedback.success { background: var(--lime-glow); color: var(--lime-dark); }
          .ck-cep-feedback.error { background: var(--red-glow); color: var(--red); }

          .ck-frete-option {
            display: flex; justify-content: space-between; align-items: center;
            padding: var(--space-4); border: 2px solid var(--dark-200);
            border-radius: var(--radius-lg); cursor: pointer; margin-bottom: var(--space-2);
            transition: all var(--transition-fast);
          }
          .ck-frete-option:hover { border-color: var(--lime); }
          .ck-frete-option.selected { border-color: var(--lime); background: var(--lime-glow); }
          .ck-frete-option span { font-size: var(--text-sm); color: var(--dark-500); display: block; }
          .ck-frete-price { font-weight: 700; }
          .ck-total-preview {
            display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-4);
            background: var(--dark-50); border-radius: var(--radius-lg); margin-top: var(--space-3);
            font-size: var(--text-sm);
          }
          .ck-payment-options { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-3); }
          @media (max-width: 600px) { .ck-payment-options { grid-template-columns: 1fr; } }
          .ck-payment-card {
            display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
            padding: var(--space-5) var(--space-3); border: 2px solid var(--dark-200);
            border-radius: var(--radius-xl); cursor: pointer; text-align: center;
            transition: all var(--transition-base);
          }
          .ck-payment-card:hover { border-color: var(--lime); }
          .ck-payment-card.selected { border-color: var(--lime); background: var(--lime-glow); }
          .ck-payment-card svg { color: var(--lime-dark); }
          .ck-payment-card strong { font-size: var(--text-sm); }
          .ck-payment-card span { font-size: var(--text-xs); color: var(--dark-500); }
          .ck-payment-price { color: var(--lime-dark) !important; font-weight: 700 !important; }
          .ck-confirmation { text-align: center; padding: var(--space-8) 0; }
          .ck-check-icon { color: var(--lime); margin-bottom: var(--space-4); }
          .ck-order-id { font-size: var(--text-base); color: var(--dark-500); margin-bottom: var(--space-6); }
          .ck-boleto-info, .ck-pix-info, .ck-link-info {
            padding: var(--space-5); background: var(--dark-50); border-radius: var(--radius-xl);
            margin-bottom: var(--space-4); text-align: left;
          }
          .ck-boleto-info h4, .ck-pix-info h4, .ck-link-info h4 { margin-bottom: var(--space-2); }
          .ck-linha-digitavel, .ck-pix-code {
            display: flex; align-items: center; gap: var(--space-2); margin: var(--space-3) 0;
            padding: var(--space-3); background: var(--white); border-radius: var(--radius-md);
            border: 1px solid var(--dark-200); font-size: var(--text-sm);
          }
          .ck-linha-digitavel code, .ck-pix-code code {
            flex: 1; font-size: var(--text-xs); word-break: break-all;
          }
        `}</style>
      </div>
    </div>
  )
}
