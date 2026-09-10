import React, { useState, useEffect } from 'react'
import {
  X, CreditCard, FileText, QrCode, ArrowLeft, CheckCircle, Copy,
  MapPin, Loader2, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import {
  calcularFrete,
  consultarCep,
  formatCep,
  formatCpf,
  formatPhone,
  getProductWeight
} from '../services/correiosService'
import { gerarBoleto, gerarBoletoPDF, gerarLinkPagamento } from '../services/itauPaymentService'

export default function CheckoutModal() {
  const {
    showCheckout,
    setShowCheckout,
    cart,
    cartTotal,
    createOrder,
    showToast,
    customerProfile,
    globalCep,
    globalAddress
  } = useStore()
  const [step, setStep] = useState(1) // 1=dados, 2=frete, 3=pagamento, 4=confirmação

  const [cliente, setCliente] = useState(() => ({
    nome: customerProfile?.nome || '',
    email: customerProfile?.email || '',
    cpf: customerProfile?.cpf || '',
    telefone: customerProfile?.telefone || '',
    cep: customerProfile?.cep || globalCep || '',
    endereco: customerProfile?.endereco || globalAddress?.logradouro || '',
    numero: customerProfile?.numero || '',
    complemento: customerProfile?.complemento || '',
    bairro: customerProfile?.bairro || globalAddress?.bairro || '',
    cidade: customerProfile?.cidade || globalAddress?.cidade || '',
    estado: customerProfile?.estado || globalAddress?.estado || ''
  }))

  // Atualiza cliente caso o perfil mude ou haja um CEP/endereço global definido
  useEffect(() => {
    setCliente(prev => ({
      ...prev,
      nome: prev.nome || customerProfile?.nome || '',
      email: prev.email || customerProfile?.email || '',
      cpf: prev.cpf || customerProfile?.cpf || '',
      telefone: prev.telefone || customerProfile?.telefone || '',
      cep: prev.cep || customerProfile?.cep || globalCep || '',
      endereco: prev.endereco || customerProfile?.endereco || globalAddress?.logradouro || '',
      numero: prev.numero || customerProfile?.numero || '',
      complemento: prev.complemento || customerProfile?.complemento || '',
      bairro: prev.bairro || customerProfile?.bairro || globalAddress?.bairro || '',
      cidade: prev.cidade || customerProfile?.cidade || globalAddress?.cidade || '',
      estado: prev.estado || customerProfile?.estado || globalAddress?.estado || ''
    }))
  }, [customerProfile, globalCep, globalAddress])

  const [isCepLoading, setIsCepLoading] = useState(false)
  const [cepFeedback, setCepFeedback] = useState(null) // { type: 'success' | 'error', message: string }
  const [freteResult, setFreteResult] = useState(null)
  const [selectedFrete, setSelectedFrete] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(null) // 'boleto' | 'link' | 'pix'
  // Calcula o peso acumulado de todos os itens e quantidades no carrinho
  const totalCartWeight = (cart || []).reduce((acc, item) => {
    return acc + (getProductWeight(item) * (item.qty || 1))
  }, 0)
  const finalCartWeight = Math.max(0.5, Math.round(totalCartWeight * 10) / 10)

  // Pré-calcula opções de frete automaticamente se já tiver CEP válido preenchido
  useEffect(() => {
    const clean = (cliente.cep || '').replace(/\D/g, '')
    if (clean.length === 8 && !freteResult) {
      const freteRes = calcularFrete(clean, finalCartWeight, cartTotal)
      if (!freteRes.error) {
        setFreteResult(freteRes)
        setSelectedFrete(freteRes.opcoes[0])
      }
    }
  }, [cliente.cep, cartTotal, finalCartWeight, freteResult])

  if (!showCheckout) return null

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
        setCepFeedback({
          type: 'success',
          message: `Endereço localizado: ${res.logradouro ? res.logradouro + ' — ' : ''}${res.bairro ? res.bairro + ', ' : ''}${res.cidade}/${res.estado}`
        })

        // Auto-calcular opções de frete com peso acumulado real
        const freteRes = calcularFrete(clean, finalCartWeight, cartTotal)
        if (!freteRes.error) {
          setFreteResult(freteRes)
          setSelectedFrete(freteRes.opcoes[0])
        }
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
    const result = calcularFrete(clean, finalCartWeight, cartTotal)
    if (!result.error) {
      setFreteResult(result)
      setSelectedFrete(result.opcoes[0])
    }
  }

  const fretePrice = selectedFrete?.preco || 0
  const total = cartTotal + fretePrice
  const pixDiscount = total * 0.03
  const pixTotal = total - pixDiscount

  const handleFinalize = () => {
    const fullAddress = [
      cliente.endereco,
      cliente.numero ? `Nº ${cliente.numero}` : '',
      cliente.complemento ? `(${cliente.complemento})` : '',
      cliente.bairro ? `Bairro: ${cliente.bairro}` : '',
      `${cliente.cidade}/${cliente.estado}`,
      `CEP: ${cliente.cep}`
    ].filter(Boolean).join(', ')

    const finalTotal = paymentMethod === 'pix' ? pixTotal : total
    const appliedPixDiscount = paymentMethod === 'pix' ? pixDiscount : 0

    const pedido = {
      items: cart,
      subtotal: cartTotal,
      frete: fretePrice,
      freteType: selectedFrete?.tipo,
      pixDiscount: appliedPixDiscount,
      total: finalTotal,
      cliente: {
        ...cliente,
        enderecoCompleto: fullAddress
      },
      paymentMethod,
    }

    if (paymentMethod === 'boleto') {
      const boleto = gerarBoleto({ id: 'ORD-' + Date.now(), total: finalTotal, cliente })
      pedido.boleto = boleto
    } else if (paymentMethod === 'link') {
      const link = gerarLinkPagamento({ total: finalTotal })
      pedido.linkPagamento = link
    }

    const order = createOrder(pedido)
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
    setPaymentMethod(null)
    setOrderResult(null)
  }

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
          {/* Step 1: Customer Data with Auto-CEP */}
          {step === 1 && (
            <div className="ck-form">
              <h3>Identificação & Entrega</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)', marginBottom: 'var(--space-4)' }}>
                Preencha seus dados para entrega e emissão do comprovante/nota.
              </p>

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
                <div className="ck-field">
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

                {/* CEP com máscara e busca automática */}
                <div className="ck-field">
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
                {cepFeedback && (
                  <div className={`ck-field ck-field-full ck-cep-feedback ${cepFeedback.type}`}>
                    {cepFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
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
                onClick={() => {
                  handleManualCalcFrete()
                  setStep(2)
                }}
                disabled={!cliente.nome || !cliente.email || !cliente.cpf || !cliente.cep || !cliente.endereco}
              >
                Prosseguir para Frete dos Correios
              </button>
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

              {freteResult && freteResult.opcoes.map(op => (
                <div
                  key={op.tipo}
                  className={`ck-frete-option ${selectedFrete?.tipo === op.tipo ? 'selected' : ''}`}
                  onClick={() => setSelectedFrete(op)}
                >
                  <div>
                    <strong>{op.tipo}</strong>
                    <span>Prazo estimado: {op.prazoLabel}</span>
                  </div>
                  <span className="ck-frete-price">{op.label}</span>
                </div>
              ))}

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

              <button className="btn btn-primary btn-lg ck-next" onClick={() => setStep(3)}>
                Escolher Forma de Pagamento
              </button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <div className="ck-form">
              <button className="btn btn-ghost ck-back" onClick={() => setStep(2)}><ArrowLeft size={16} /> Voltar</button>
              <h3>Forma de Pagamento</h3>
              <div className="ck-payment-options">
                <div className={`ck-payment-card ${paymentMethod === 'boleto' ? 'selected' : ''}`} onClick={() => setPaymentMethod('boleto')}>
                  <FileText size={28} />
                  <strong>Boleto Bancário Itaú</strong>
                  <span>Vencimento em 3 dias úteis</span>
                  <span className="ck-payment-price">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className={`ck-payment-card ${paymentMethod === 'pix' ? 'selected' : ''}`} onClick={() => setPaymentMethod('pix')}>
                  <QrCode size={28} />
                  <strong>Pix Instantâneo</strong>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Chave QR Code (3% OFF à vista)</span>
                  <span className="ck-payment-price" style={{ color: '#16a34a', fontWeight: 800 }}>
                    R$ {pixTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className={`ck-payment-card ${paymentMethod === 'link' ? 'selected' : ''}`} onClick={() => setPaymentMethod('link')}>
                  <CreditCard size={28} />
                  <strong>Cartão de Crédito</strong>
                  <span>Até 12x no cartão</span>
                  <span className="ck-payment-price">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>
              <button className="btn btn-primary btn-lg ck-next" onClick={handleFinalize} disabled={!paymentMethod}>
                Finalizar Pedido — R$ {(paymentMethod === 'pix' ? pixTotal : total).toFixed(2).replace('.', ',')}
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
                  <h4>Boleto Bancário Itaú</h4>
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
                  <h4>Link Seguro de Pagamento Itaú</h4>
                  <p>Valor: <strong>{orderResult.linkPagamento.valorFormatado}</strong></p>
                  <a href={orderResult.linkPagamento.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                    <CreditCard size={16} /> Pagar com Cartão
                  </a>
                </div>
              )}

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
