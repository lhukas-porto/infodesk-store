import React, { useState, useEffect } from 'react'
import { CheckCircle2, Clock, XCircle, ShoppingBag, ArrowRight, RefreshCw, MessageCircle, ExternalLink } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { createWhatsAppLink, buildCustomerOrderSupportMessage } from '../services/whatsappService'

export default function PaymentReturnModal({ orderId, statusParam, onClose }) {
  const { orders, showToast, companyData } = useStore()
  const [loading, setLoading] = useState(true)
  const [orderInfo, setOrderInfo] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchStatus() {
      if (!orderId) {
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const res = await fetch(`/api/payments/mercadopago/status?order_id=${encodeURIComponent(orderId)}`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data.success) {
            setOrderInfo(data)
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar status no backend:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStatus()
    return () => { isMounted = false }
  }, [orderId])

  // Normaliza o status
  const currentStatus = orderInfo?.status || (
    statusParam === 'approved' ? 'Pago' :
    statusParam === 'pending' ? 'Pendente' :
    statusParam === 'rejected' ? 'Cancelado' : 'Pendente'
  )

  const isApproved = currentStatus === 'Pago' || statusParam === 'approved'
  const isPending = currentStatus === 'Pendente' || statusParam === 'pending'
  const isRejected = currentStatus === 'Cancelado' || statusParam === 'rejected'

  const localOrder = orders.find(o => o.id === orderId)
  const displayTotal = orderInfo?.total || localOrder?.total || 0

  const handleSupportClick = () => {
    const phone = companyData?.telefoneWhatsapp || companyData?.telefone || '61996272630'
    const link = createWhatsAppLink(phone, `Olá! Gostaria de falar sobre o meu pedido ${orderId} realizado pelo Mercado Pago.`)
    window.open(link, '_blank')
  }

  return (
    <div className="overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div
        className="modal"
        style={{
          maxWidth: '540px',
          width: '92vw',
          padding: '32px 28px',
          textAlign: 'center',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: 'var(--white)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Ícone de Status */}
        <div style={{ marginBottom: 16 }}>
          {isApproved && (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto'
            }}>
              <CheckCircle2 size={44} />
            </div>
          )}
          {isPending && (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)', color: '#d97706',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Clock size={44} />
            </div>
          )}
          {isRejected && (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto'
            }}>
              <XCircle size={44} />
            </div>
          )}
        </div>

        {/* Título & Mensagem */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dark-900)', marginBottom: 8 }}>
          {isApproved && 'Pagamento Aprovado com Sucesso! 🎉'}
          {isPending && 'Pagamento em Processamento ⏳'}
          {isRejected && 'Pagamento Não Concluído ⚠️'}
        </h2>

        <p style={{ fontSize: '13px', color: 'var(--dark-600)', lineHeight: 1.5, marginBottom: 20 }}>
          {isApproved && 'Seu pagamento via Mercado Pago foi confirmado. Nosso time já está preparando a sua encomenda!'}
          {isPending && 'O Mercado Pago está analisando a transação. Assim que o pagamento for liquidado, seu pedido será liberado automaticamente.'}
          {isRejected && 'A operadora recusou a transação ou o pagamento expirou. Você pode tentar novamente escolhendo outro meio.'}
        </p>

        {/* Card Resumo do Pedido */}
        <div style={{
          background: 'var(--dark-50)',
          border: '1px solid var(--dark-200)',
          borderRadius: 12,
          padding: '16px',
          textAlign: 'left',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '13px' }}>
            <span style={{ color: 'var(--dark-500)' }}>Identificador do Pedido:</span>
            <strong style={{ color: 'var(--dark-900)', fontFamily: 'monospace' }}>{orderId}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '13px' }}>
            <span style={{ color: 'var(--dark-500)' }}>Forma de Pagamento:</span>
            <span style={{ fontWeight: 600, color: '#009ee3' }}>Mercado Pago (Checkout Pro)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '13px' }}>
            <span style={{ color: 'var(--dark-500)' }}>Situação do Pedido:</span>
            <span className={
              currentStatus === 'Pago' ? 'badge badge-lime' :
              currentStatus === 'Cancelado' ? 'badge badge-red' : 'badge badge-amber'
            }>
              {currentStatus}
            </span>
          </div>
          {displayTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--dark-200)', paddingTop: 8, marginTop: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--dark-700)' }}>Total da Compra:</span>
              <strong style={{ color: 'var(--dark-900)', fontSize: '15px' }}>
                R$ {displayTotal.toFixed(2).replace('.', ',')}
              </strong>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onClose}
          >
            <ShoppingBag size={18} /> Continuar Comprando
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', color: '#16a34a' }}
            onClick={handleSupportClick}
          >
            <MessageCircle size={16} /> Falar no WhatsApp de Atendimento
          </button>
        </div>
      </div>
    </div>
  )
}
