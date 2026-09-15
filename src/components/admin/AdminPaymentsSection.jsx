import React, { useState, useEffect } from 'react'
import {
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw,
  ExternalLink, Copy, Check, Server, Globe, Key, Lock, ArrowUpRight,
  Info, ShoppingCart, Zap, Clock
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'

export default function AdminPaymentsSection() {
  const { orders = [], showToast } = useStore()
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [copiedWebhook, setCopiedWebhook] = useState(false)

  // Testa conexão inicial com a API
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      setTestingConnection(true)
      const res = await fetch('/api/payments/mercadopago/test-connection', { method: 'POST' })
      const data = await res.json()
      setConnectionStatus(data)
    } catch (err) {
      setConnectionStatus({
        success: false,
        configured: false,
        message: 'Não foi possível conectar ao servidor local.'
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const webhookUrl = connectionStatus?.webhookUrl || `${window.location.origin}/api/payments/mercadopago/webhook`

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopiedWebhook(true)
    showToast('URL do webhook copiada para a área de transferência! 📋')
    setTimeout(() => setCopiedWebhook(false), 2500)
  }

  // Filtra pedidos do Mercado Pago
  const mpOrders = (orders || []).filter(o =>
    o.paymentMethod === 'mercadopago_checkout_pro' ||
    o.payment_method === 'mercadopago_checkout_pro' ||
    o.paymentMethod === 'mercadopago'
  )

  return (
    <div className="adm-payments-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner de Identificação */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 158, 227, 0.08), rgba(0, 158, 227, 0.02))',
        border: '1px solid rgba(0, 158, 227, 0.25)',
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#009ee3',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0, 158, 227, 0.3)'
          }}>
            <ShieldCheck size={30} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--dark-900)', fontWeight: 800 }}>
                Mercado Pago Checkout Pro
              </h3>
              <span className="badge badge-cyan" style={{ fontSize: '11px', fontWeight: 700 }}>
                Orders API v1 (Oficial Moderna)
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--dark-600)' }}>
              Integração ativa para pagamentos transparentes no checkout com PIX Instantâneo, Cartão de Crédito em até 12x e Boleto.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={checkConnection}
          disabled={testingConnection}
          style={{ background: '#009ee3', borderColor: '#009ee3', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={15} className={testingConnection ? 'spin' : ''} />
          {testingConnection ? 'Testando Conexão...' : 'Testar Conexão com MP'}
        </button>
      </div>

      {/* Grid de Cards de Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Card 1: Situação da Integração */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--dark-200)',
          borderRadius: 14,
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dark-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Situação da Integração
            </span>
            <Server size={18} color="var(--dark-400)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {connectionStatus?.success ? (
              <>
                <CheckCircle2 size={20} color="#16a34a" />
                <strong style={{ fontSize: '15px', color: '#16a34a' }}>Conectado e Operacional</strong>
              </>
            ) : (
              <>
                <AlertTriangle size={20} color="#d97706" />
                <strong style={{ fontSize: '15px', color: '#d97706' }}>
                  {connectionStatus?.configured ? 'Falha na Validação' : 'Pendente de Configuração'}
                </strong>
              </>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--dark-600)', lineHeight: 1.4 }}>
            {connectionStatus?.success
              ? `Autenticado na conta "${connectionStatus.nickname || 'Infodesk'}" (${connectionStatus.siteId}).`
              : (connectionStatus?.message || 'Defina MERCADO_PAGO_ACCESS_TOKEN no .env ou nas variáveis da Vercel.')}
          </p>
        </div>

        {/* Card 2: Status do PIX no Mercado Pago */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--dark-200)',
          borderRadius: 14,
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dark-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PIX no Checkout Pro
            </span>
            <Zap size={18} color={connectionStatus?.hasPix ? '#16a34a' : '#d97706'} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {connectionStatus?.hasPix ? (
              <>
                <CheckCircle2 size={20} color="#16a34a" />
                <strong style={{ fontSize: '15px', color: '#16a34a' }}>Habilitado no Checkout</strong>
              </>
            ) : (
              <>
                <AlertTriangle size={20} color="#d97706" />
                <strong style={{ fontSize: '15px', color: '#d97706' }}>
                  Requer Chave Pix na Conta
                </strong>
              </>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--dark-600)', lineHeight: 1.4 }}>
            {connectionStatus?.hasPix
              ? 'O método PIX está ativo e disponível para seus compradores no Checkout Pro.'
              : 'O Mercado Pago exige que a conta do vendedor tenha ao menos uma Chave Pix cadastrada (em Área Pix > Minhas Chaves) para liberar a opção Pix no checkout.'}
          </p>
        </div>

        {/* Card 3: Ambiente Ativo */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--dark-200)',
          borderRadius: 14,
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dark-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ambiente de Execução
            </span>
            <Globe size={18} color="var(--dark-400)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span className={connectionStatus?.environment === 'production' ? 'badge badge-lime' : 'badge badge-amber'} style={{ fontSize: '13px', padding: '4px 10px' }}>
              {connectionStatus?.environment === 'production' ? '🚀 PRODUÇÃO' : '🧪 TESTE / HOMOLOGAÇÃO'}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--dark-600)' }}>
            Definido via variável <code>MERCADO_PAGO_ENVIRONMENT</code>. Sem cobrança real em modo teste.
          </p>
        </div>

        {/* Card 3: Webhook e Assinatura HMAC */}
        <div style={{
          background: 'var(--white)',
          border: '1px solid var(--dark-200)',
          borderRadius: 14,
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--dark-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Segurança do Webhook
            </span>
            <Lock size={18} color="var(--dark-400)" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {connectionStatus?.hasWebhookSecret ? (
              <>
                <CheckCircle2 size={18} color="#16a34a" />
                <strong style={{ fontSize: '13px', color: '#16a34a' }}>Assinatura HMAC-SHA256 Ativa</strong>
              </>
            ) : (
              <>
                <Clock size={18} color="var(--dark-400)" />
                <span style={{ fontSize: '13px', color: 'var(--dark-600)' }}>Secret pendente de cadastro</span>
              </>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--dark-600)' }}>
            Valida o header <code>x-signature</code> em cada notificação de pagamento recebida.
          </p>
        </div>
      </div>

      {/* Bloco de URL do Webhook para Cadastro no MP */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--dark-200)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--dark-900)', fontWeight: 700 }}>
          URL Oficial de Notificações Webhook (Cadastre no Mercado Pago)
        </h4>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--dark-600)', lineHeight: 1.5 }}>
          No painel do Mercado Pago Developers (<em>Suas Aplicações ➔ Webhooks</em>), adicione este endereço e marque os eventos <strong>Pagamentos</strong> e <strong>Ordens</strong>:
        </p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--dark-50)',
          border: '1px solid var(--dark-200)',
          borderRadius: 10,
          padding: '10px 14px'
        }}>
          <code style={{ flex: 1, fontSize: '13px', color: 'var(--dark-900)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {webhookUrl}
          </code>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleCopyWebhook}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            {copiedWebhook ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
            {copiedWebhook ? 'Copiado!' : 'Copiar URL'}
          </button>
        </div>
      </div>

      {/* Guia Didático de Variáveis de Ambiente */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--dark-200)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Key size={20} color="var(--dark-700)" />
          <h4 style={{ margin: 0, fontSize: '15px', color: 'var(--dark-900)', fontWeight: 700 }}>
            Variáveis de Ambiente (Vercel & .env)
          </h4>
        </div>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dark-600)', lineHeight: 1.5 }}>
          Por motivos de segurança e conformidade, as credenciais completas <strong>nunca são expostas na tela</strong>. Configure as seguintes chaves no seu arquivo <code>.env</code> ou nas variáveis de ambiente da Vercel:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--dark-50)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
            <strong style={{ fontSize: '12px', color: 'var(--dark-900)', display: 'block', marginBottom: 2 }}>MERCADO_PAGO_ACCESS_TOKEN</strong>
            <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>Token Bearer privado usado exclusivamente pelo backend.</span>
          </div>
          <div style={{ background: 'var(--dark-50)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
            <strong style={{ fontSize: '12px', color: 'var(--dark-900)', display: 'block', marginBottom: 2 }}>MERCADO_PAGO_PUBLIC_KEY</strong>
            <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>Chave pública da sua aplicação no Mercado Pago.</span>
          </div>
          <div style={{ background: 'var(--dark-50)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
            <strong style={{ fontSize: '12px', color: 'var(--dark-900)', display: 'block', marginBottom: 2 }}>MERCADO_PAGO_ENVIRONMENT</strong>
            <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>Use <code>test</code> para homologação ou <code>production</code>.</span>
          </div>
          <div style={{ background: 'var(--dark-50)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
            <strong style={{ fontSize: '12px', color: 'var(--dark-900)', display: 'block', marginBottom: 2 }}>MERCADO_PAGO_WEBHOOK_SECRET</strong>
            <span style={{ fontSize: '11px', color: 'var(--dark-500)' }}>Chave secreta para validação da assinatura HMAC-SHA256.</span>
          </div>
        </div>
      </div>

      {/* Histórico de Pedidos Processados via Mercado Pago */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--dark-200)',
        borderRadius: 14,
        padding: '22px 24px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--dark-900)', fontWeight: 700 }}>
              Pedidos Processados via Mercado Pago ({mpOrders.length})
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--dark-500)' }}>
              Lista de pedidos realizados através do Checkout Pro integrados à Orders API.
            </p>
          </div>
        </div>

        {mpOrders.length === 0 ? (
          <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--dark-400)', fontSize: '13px' }}>
            Nenhum pedido processado pelo Mercado Pago ainda. Realize uma compra de teste no checkout da loja para visualizar aqui.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Situação</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {mpOrders.map(o => (
                  <tr key={o.id}>
                    <td><strong style={{ color: 'var(--dark-900)' }}>{o.id}</strong></td>
                    <td style={{ color: 'var(--dark-800)' }}>{o.customerName || o.cliente?.nome || 'Cliente'}</td>
                    <td><strong style={{ color: 'var(--lime-dark)' }}>R$ {(o.total || 0).toFixed(2).replace('.', ',')}</strong></td>
                    <td>
                      <span className={
                        o.status === 'Pago' ? 'badge badge-lime' :
                        o.status === 'Cancelado' ? 'badge badge-red' : 'badge badge-amber'
                      }>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--dark-500)' }}>
                      {o.date ? new Date(o.date).toLocaleString('pt-BR') : 'Hoje'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
