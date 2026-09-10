import React, { useState } from 'react'
import { MapPin, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { consultarCep, formatCep } from '../services/correiosService'

export default function CepModal() {
  const {
    showCepModal,
    setShowCepModal,
    globalCep,
    setGlobalCep,
    globalAddress,
    setGlobalAddress,
    showToast,
  } = useStore()

  const [inputCep, setInputCep] = useState(globalCep || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addressPreview, setAddressPreview] = useState(globalAddress || null)

  if (!showCepModal) return null

  const handleCepChange = async (val) => {
    const formatted = formatCep(val)
    setInputCep(formatted)
    setError(null)

    const clean = formatted.replace(/\D/g, '')
    if (clean.length === 8) {
      setLoading(true)
      const res = await consultarCep(clean)
      setLoading(false)

      if (res.success) {
        setAddressPreview(res)
      } else {
        setError(res.error || 'CEP não encontrado nos Correios.')
        setAddressPreview(null)
      }
    } else {
      setAddressPreview(null)
    }
  }

  const handleConfirm = () => {
    if (!addressPreview || !inputCep) {
      setError('Por favor, informe um CEP válido com 8 dígitos.')
      return
    }

    setGlobalCep(inputCep)
    setGlobalAddress(addressPreview)
    setShowCepModal(false)
    showToast(`📍 Local de entrega definido para ${addressPreview.cidade}/${addressPreview.estado}!`)
  }

  const handleClear = () => {
    setInputCep('')
    setGlobalCep('')
    setGlobalAddress(null)
    setAddressPreview(null)
    setShowCepModal(false)
    showToast('Localização de entrega redefinida.')
  }

  return (
    <div className="overlay" onClick={() => setShowCepModal(false)}>
      <div className="modal cep-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setShowCepModal(false)} aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="cep-modal-header">
          <div className="cep-icon-wrap">
            <MapPin size={24} />
          </div>
          <div>
            <h3>Onde você quer receber suas compras?</h3>
            <p className="cep-modal-sub">
              Informe seu CEP para calcularmos prazos de entrega dos Correios e fretes exatos.
            </p>
          </div>
        </div>

        <div className="cep-modal-body">
          <div className="ck-field">
            <label>Seu CEP *</label>
            <div className="cep-input-wrapper">
              <input
                type="text"
                className="input-field"
                placeholder="00000-000"
                maxLength={9}
                value={inputCep}
                onChange={e => handleCepChange(e.target.value)}
                autoFocus
              />
              {loading && <Loader2 size={18} className="cep-input-spinner animate-spin" />}
            </div>
          </div>

          {error && (
            <div className="cep-feedback-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {addressPreview && (
            <div className="cep-address-card">
              <div className="cep-address-check">
                <Check size={16} />
              </div>
              <div className="cep-address-details">
                <strong>{addressPreview.cidade} - {addressPreview.estado}</strong>
                <span>{addressPreview.bairro ? `${addressPreview.bairro}, ` : ''}{addressPreview.logradouro || 'Região atendida'}</span>
                <span className="cep-coverage-tag">✓ Envio via SEDEX e PAC garantido</span>
              </div>
            </div>
          )}

          <div className="cep-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg cep-confirm-btn"
              onClick={handleConfirm}
              disabled={!addressPreview}
            >
              Usar Este Endereço
            </button>

            {globalCep && (
              <button
                type="button"
                className="btn btn-ghost cep-clear-btn"
                onClick={handleClear}
              >
                Remover CEP salvo
              </button>
            )}
          </div>
        </div>

        <style>{`
          .cep-modal {
            max-width: 460px;
            padding: 28px;
            border-radius: 18px;
          }
          .cep-modal-header {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 20px;
          }
          .cep-icon-wrap {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            background: rgba(59, 130, 246, 0.15);
            color: #38bdf8;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .cep-modal-header h3 {
            font-size: 18px;
            font-weight: 700;
            color: var(--dark-900);
            margin: 0 0 4px 0;
            line-height: 1.3;
          }
          .cep-modal-sub {
            font-size: 13px;
            color: var(--dark-500);
            margin: 0;
            line-height: 1.4;
          }
          .cep-input-wrapper {
            position: relative;
            display: flex;
            align-items: center;
          }
          .cep-input-spinner {
            position: absolute;
            right: 14px;
            color: var(--dark-400);
          }
          .cep-feedback-error {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ef4444;
            font-size: 13px;
            margin-top: 10px;
            background: #fef2f2;
            padding: 8px 12px;
            border-radius: 8px;
          }
          .cep-address-card {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            padding: 14px;
            border-radius: 12px;
            margin-top: 16px;
          }
          .cep-address-check {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #22c55e;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
          }
          .cep-address-details {
            display: flex;
            flex-direction: column;
            gap: 2px;
            font-size: 13px;
            color: #1e293b;
          }
          .cep-coverage-tag {
            font-size: 11px;
            color: #15803d;
            font-weight: 700;
            margin-top: 4px;
          }
          .cep-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 22px;
          }
          .cep-confirm-btn {
            width: 100%;
          }
          .cep-clear-btn {
            font-size: 12px;
            color: var(--dark-400);
            text-align: center;
          }
        `}</style>
      </div>
    </div>
  )
}
