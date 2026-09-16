import React, { useState } from 'react'
import {
  X, Sparkles, Building2, CreditCard, Palette, ArrowRight, ArrowLeft,
  CheckCircle2, Upload, Loader2, ShieldCheck
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import {
  formatCnpj,
  formatPhone,
  formatCep,
  applyBrandThemeColor
} from '../services/companyService'

const PRESET_WIZARD_COLORS = [
  { name: 'Verde Tech', hex: '#84CC16' },
  { name: 'Azul Elétrico', hex: '#0284C7' },
  { name: 'Indigo Cyber', hex: '#6366F1' },
  { name: 'Roxo Neon', hex: '#8B5CF6' },
  { name: 'Esmeralda', hex: '#10B981' },
  { name: 'Laranja Sunset', hex: '#F97316' },
  { name: 'Vermelho Carmim', hex: '#E11D48' },
  { name: 'Âmbar Ouro', hex: '#D97706' }
]

export default function SetupWizardModal({ onClose }) {
  const { companyData, updateCompanyData, showToast } = useStore()
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    nomeFantasia: companyData?.nomeFantasia || '',
    razaoSocial: companyData?.razaoSocial || '',
    cnpj: companyData?.cnpj || '',
    whatsapp: companyData?.whatsapp || '',
    cep: companyData?.cep || '',
    cidade: companyData?.cidade || '',
    estado: companyData?.estado || '',
    corPrimaria: companyData?.corPrimaria || '#84CC16',
    logo: companyData?.logo || '',
    descricaoCurta: companyData?.descricaoCurta || ''
  })

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showToast('A logo deve ter no máximo 2 MB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, logo: ev.target?.result }))
      showToast('Logo carregada com sucesso!')
    }
    reader.readAsDataURL(file)
  }

  const handleFinish = async () => {
    if (!form.nomeFantasia.trim()) {
      showToast('Informe o Nome Fantasia da sua loja.', 'error')
      setStep(1)
      return
    }

    setIsSaving(true)
    try {
      applyBrandThemeColor(form.corPrimaria)
      const res = await updateCompanyData(form)
      if (res.success) {
        showToast('Parabéns! Sua loja foi configurada com sucesso! 🚀🎉')
        onClose?.()
      } else {
        showToast(res.error || 'Erro ao salvar dados.', 'error')
      }
    } catch (err) {
      showToast('Erro de conexão ao salvar.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="overlay">
      <div className="modal modal-lg" style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}>
        {/* Top Header Wizard */}
        <div style={{
          background: 'linear-gradient(135deg, var(--dark-900), var(--dark-950))',
          padding: '24px',
          color: '#fff',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              background: 'rgba(132, 204, 22, 0.2)',
              color: '#a3e635',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <Sparkles size={12} /> SETUP WIZARD WHITE-LABEL
            </span>
          </div>

          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
            Assistente de Configuração da Loja
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
            Personalize sua loja em 3 passos simples para começar a vender imediatamente.
          </p>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
            {[
              { num: 1, label: 'Identidade' },
              { num: 2, label: 'Localização & Contato' },
              { num: 3, label: 'Visual & Cores' }
            ].map(s => (
              <div
                key={s.num}
                onClick={() => setStep(s.num)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: step === s.num ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  border: step === s.num ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: step > s.num ? '#84cc16' : step === s.num ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: step === s.num ? '#0f172a' : '#fff',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: step === s.num ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Steps */}
        <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* PASSO 1 */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                  Nome Fantasia da Loja (Visível para os clientes) *
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Minha Loja Store"
                  value={form.nomeFantasia}
                  onChange={e => setForm({ ...form, nomeFantasia: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                  Razão Social da Empresa
                </label>
                <input
                  className="input-field"
                  placeholder="Ex: Minha Loja Comércio Ltda"
                  value={form.razaoSocial}
                  onChange={e => setForm({ ...form, razaoSocial: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                    CNPJ
                  </label>
                  <input
                    className="input-field"
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={e => setForm({ ...form, cnpj: formatCnpj(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                    WhatsApp de Vendas & Suporte
                  </label>
                  <input
                    className="input-field"
                    placeholder="(00) 00000-0000"
                    value={form.whatsapp}
                    onChange={e => setForm({ ...form, whatsapp: formatPhone(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2 */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 100px', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                    CEP de Origem *
                  </label>
                  <input
                    className="input-field"
                    placeholder="70000-000"
                    value={form.cep}
                    onChange={e => setForm({ ...form, cep: formatCep(e.target.value) })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                    Cidade
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ex: Brasília"
                    value={form.cidade}
                    onChange={e => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                    UF
                  </label>
                  <input
                    className="input-field"
                    placeholder="DF"
                    maxLength={2}
                    value={form.estado}
                    onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                  Descrição Curta (Meta Description do Google)
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Tudo o que você precisa em informática, variedades e tecnologia com frete rápido."
                  value={form.descricaoCurta}
                  onChange={e => setForm({ ...form, descricaoCurta: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* PASSO 3 */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Logo Upload */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '6px' }}>
                  Logomarca da Loja
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '90px',
                    height: '60px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {form.logo ? (
                      <img src={form.logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>Sem Logo</span>
                    )}
                  </div>

                  <label className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> Selecionar Logo (PNG/WEBP)
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              {/* Seletor de Cores */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--dark-800)', display: 'block', marginBottom: '8px' }}>
                  🎨 Cor Principal do Tema da Loja
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PRESET_WIZARD_COLORS.map(c => {
                    const isSelected = form.corPrimaria.toLowerCase() === c.hex.toLowerCase()
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setForm(prev => ({ ...prev, corPrimaria: c.hex }))
                          applyBrandThemeColor(c.hex)
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '20px',
                          border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                          background: isSelected ? '#ffffff' : '#f8fafc',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex }} />
                        <span style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 500 }}>{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Prévia do Botão com a cor escolhida */}
              <div style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  Prévia de botão na vitrine:
                </span>
                <button
                  type="button"
                  style={{
                    background: form.corPrimaria,
                    color: '#0f172a',
                    border: 'none',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: `0 4px 12px ${form.corPrimaria}40`
                  }}
                >
                  Comprar Agora
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid var(--dark-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {step > 1 ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={14} /> Voltar
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setStep(step + 1)}
            >
              Próximo Passo <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={isSaving}
              onClick={handleFinish}
              style={{ minWidth: '160px' }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Concluir e Ativar Loja
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
