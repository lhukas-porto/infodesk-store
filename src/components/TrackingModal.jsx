import React, { useState, useEffect } from 'react'
import {
  X, Truck, Search, CheckCircle2, Clock, MapPin, AlertCircle,
  Package, ArrowRight, Copy, Share2, Loader2, Sparkles, ExternalLink
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { createWhatsAppLink } from '../services/whatsappService'
import { getCompanyPublicName } from '../services/companyService'

export default function TrackingModal() {
  const {
    showTrackingModal,
    setShowTrackingModal,
    trackingCodeToView,
    setTrackingCodeToView,
    showToast,
    companyData
  } = useStore()

  const publicName = getCompanyPublicName(companyData)

  const [inputCode, setInputCode] = useState(trackingCodeToView || '')
  const [isLoading, setIsLoading] = useState(false)
  const [trackingData, setTrackingData] = useState(null)
  const [error, setError] = useState(null)

  // Atualiza campo quando código vindo de fora muda
  useEffect(() => {
    if (trackingCodeToView) {
      setInputCode(trackingCodeToView)
      handleTrack(trackingCodeToView)
    }
  }, [trackingCodeToView])

  const handleClose = () => {
    setShowTrackingModal(false)
    setTrackingCodeToView('')
    setError(null)
  }

  // Suporte universal a fechar pelo ESC
  useEffect(() => {
    if (!showTrackingModal) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showTrackingModal])

  if (!showTrackingModal) return null

  const handleTrack = async (codeToSearch = inputCode) => {
    const clean = (codeToSearch || '').trim().toUpperCase()
    if (!clean) {
      setError('Por favor, digite o código de rastreio.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/shipping/track?code=${encodeURIComponent(clean)}`)
      const data = await res.json()

      if (data.success) {
        setTrackingData(data)
      } else {
        setError(data.error || 'Objeto não encontrado na base dos Correios.')
        setTrackingData(null)
      }
    } catch {
      setError('Falha de conexão ao consultar o rastreamento dos Correios.')
      setTrackingData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    showToast('Código copiado para a área de transferência! 📋')
  }

  const handleShareWhatsApp = () => {
    if (!trackingData) return
    const msg = `📦 *Acompanhe meu pedido da ${publicName}!*\nCódigo de Rastreamento: *${trackingData.codigo}*\nStatus Atual: *${trackingData.descricaoStatus}*\nÚltima Atualização: ${trackingData.ultimaAtualizacao}`
    window.open(createWhatsAppLink('', msg), '_blank')
  }

  // Estágios da barra de progresso (4 macro-etapas)
  const stages = [
    { id: 'POSTADO', label: 'Postado', icon: <Package size={16} /> },
    { id: 'EM_TRANSITO', label: 'Em Trânsito', icon: <Truck size={16} /> },
    { id: 'SAIU_ENTREGA', label: 'Saiu p/ Entrega', icon: <MapPin size={16} /> },
    { id: 'ENTREGUE', label: 'Entregue', icon: <CheckCircle2 size={16} /> }
  ]

  const getStageIndex = (stageId) => {
    if (stageId === 'POSTADO') return 0
    if (stageId === 'EM_TRANSITO') return 1
    if (stageId === 'SAIU_ENTREGA') return 2
    if (stageId === 'ENTREGUE') return 3
    return 1
  }

  const currentStageIndex = trackingData ? getStageIndex(trackingData.statusAtual) : 0

  return (
    <div className="overlay">
      <button
        className="modal-close-floating"
        onClick={handleClose}
        title="Fechar Janela (ESC)"
        aria-label="Fechar Janela"
      >
        <X size={22} />
      </button>

      <div className="modal modal-lg" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="adm-header" style={{ borderBottom: '1px solid var(--dark-200)', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Truck size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--dark-900)' }}>Rastreamento de Encomendas</h3>
              <span style={{ fontSize: '12px', color: 'var(--dark-500)' }}>
                Integração Oficial com o Contrato dos Correios da {publicName}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Campo de Busca */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleTrack(inputCode); }}
            style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--dark-400)' }} />
              <input
                type="text"
                className="input-field"
                value={inputCode}
                onChange={e => setInputCode(e.target.value.toUpperCase())}
                placeholder="Ex: NL123456789BR ou insira seu código de postagem"
                style={{ paddingLeft: '42px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ minWidth: '130px' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Buscando...
                </>
              ) : (
                <>
                  <Search size={16} /> Rastrear
                </>
              )}
            </button>
          </form>

          {/* Erro */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', marginBottom: '20px' }}>
              <AlertCircle size={20} />
              <span style={{ fontSize: '14px' }}>{error}</span>
            </div>
          )}

          {/* Dados do Rastreio */}
          {trackingData && (
            <div>
              {/* Card Resumo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '18px 20px', background: 'var(--dark-50)', borderRadius: '12px', border: '1px solid var(--dark-200)', marginBottom: '24px' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--dark-400)', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Código do Objeto ({trackingData.tipoPostal})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <strong style={{ fontSize: '1.2rem', letterSpacing: '1px', color: 'var(--dark-900)' }}>
                      {trackingData.codigo}
                    </strong>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCopy(trackingData.codigo)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      <Copy size={13} /> Copiar
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleShareWhatsApp}
                    style={{ borderColor: '#22c55e', color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Share2 size={14} /> Compartilhar no WhatsApp
                  </button>
                </div>
              </div>

              {/* Barra de Progresso Visual de 4 Estágios */}
              <div style={{ margin: '28px 0 34px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                  {/* Linha de fundo */}
                  <div style={{ position: 'absolute', top: '18px', left: '20px', right: '20px', height: '4px', background: 'var(--dark-200)', zIndex: 1 }} />
                  {/* Linha preenchida */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '18px',
                      left: '20px',
                      width: `${(currentStageIndex / (stages.length - 1)) * 90}%`,
                      height: '4px',
                      background: 'var(--lime-dark)',
                      zIndex: 2,
                      transition: 'width 0.4s ease'
                    }}
                  />

                  {stages.map((stg, idx) => {
                    const isDone = idx <= currentStageIndex
                    const isCurrent = idx === currentStageIndex
                    return (
                      <div key={stg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isDone ? 'var(--lime-dark)' : 'var(--white)',
                            color: isDone ? '#fff' : 'var(--dark-400)',
                            border: `3px solid ${isDone ? 'var(--lime-dark)' : 'var(--dark-300)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isCurrent ? '0 0 0 4px rgba(132, 204, 22, 0.25)' : 'none',
                            transition: 'all 0.3s'
                          }}
                        >
                          {stg.icon}
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: isDone ? 700 : 500, color: isDone ? 'var(--dark-800)' : 'var(--dark-400)', marginTop: '8px', textAlign: 'center' }}>
                          {stg.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Status Destaque */}
              <div style={{ padding: '14px 18px', borderRadius: '10px', background: trackingData.statusAtual === 'ENTREGUE' ? '#f0fdf4' : '#f8fafc', border: `1px solid ${trackingData.statusAtual === 'ENTREGUE' ? '#bbf7d0' : 'var(--dark-200)'}`, marginBottom: '24px' }}>
                <strong style={{ fontSize: '1rem', color: trackingData.statusAtual === 'ENTREGUE' ? '#166534' : 'var(--dark-800)', display: 'block' }}>
                  {trackingData.descricaoStatus}
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--dark-500)' }}>
                  Última atualização: {trackingData.ultimaAtualizacao}
                </span>
              </div>

              {/* Linha do Tempo de Movimentações */}
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--dark-800)', marginBottom: '16px' }}>
                Histórico de Movimentação do Objeto:
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '24px' }}>
                {/* Linha vertical */}
                <div style={{ position: 'absolute', top: '10px', bottom: '10px', left: '7px', width: '2px', background: 'var(--dark-200)' }} />

                {trackingData.eventos?.map((evt, i) => (
                  <div key={i} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {/* Marcador */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '-24px',
                        top: '4px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: i === 0 ? 'var(--lime-dark)' : '#fff',
                        border: `3px solid ${i === 0 ? 'var(--lime-dark)' : 'var(--dark-300)'}`
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--dark-900)' }}>{evt.descricao}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--dark-400)' }}>
                        <Clock size={11} style={{ display: 'inline', marginRight: '3px' }} />
                        {evt.data} às {evt.hora}
                      </span>
                    </div>
                    {evt.detalhe && (
                      <span style={{ fontSize: '12px', color: 'var(--dark-600)' }}>
                        {evt.detalhe}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dica rápida */}
          {!trackingData && !isLoading && (
            <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--dark-50)', borderRadius: '12px', border: '1px dashed var(--dark-200)' }}>
              <Package size={40} style={{ color: 'var(--dark-400)', marginBottom: '10px' }} />
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--dark-600)' }}>
                Digite acima o código de postagem recebido por e-mail ou WhatsApp para acompanhar sua entrega em tempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
