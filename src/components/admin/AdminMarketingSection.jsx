import React, { useState, useEffect, useMemo } from 'react'
import {
  Globe, Search, Share2, MessageCircle, BarChart3, ShoppingBag,
  CheckCircle2, AlertCircle, Clock, Copy, Check, ExternalLink,
  Plus, Trash2, Shield, Sparkles, RefreshCw, Eye, Tag, Flame,
  Star, HelpCircle, Link as LinkIcon, Send, Video, ArrowRight
} from 'lucide-react'
import {
  DEFAULT_MARKETING_SETTINGS,
  fetchMarketingSettings,
  saveMarketingSettings,
  validateGaMeasurementId,
  extractSearchConsoleVerification,
  buildTrackableUrl,
  getTenantMarketingAnalytics
} from '../../services/marketingService'
import { DEFAULT_PRIMARY_DOMAIN, normalizeHostname } from '../../services/tenantResolver'
import { slugify } from '../../services/seoManager'

export default function AdminMarketingSection({
  products = [],
  orders = [],
  companyData = {},
  showToast = () => {},
  onEditProduct = () => {}
}) {
  // Sub-abas internas da seção
  const [activeSubTab, setActiveSubTab] = useState('identity') // 'identity' | 'analytics' | 'searchconsole' | 'merchant' | 'social' | 'products' | 'utm'

  // Estados de dados
  const [settings, setSettings] = useState(DEFAULT_MARKETING_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedField, setCopiedField] = useState(null)

  // Estado para validação de GA4
  const [gaValidationFeedback, setGaValidationFeedback] = useState(null)

  // Estado para o Gerador de Links UTM
  const [utmDestination, setUtmDestination] = useState('home') // 'home' | productId
  const [utmSource, setUtmSource] = useState('instagram')
  const [utmMedium, setUtmMedium] = useState('stories')
  const [utmCampaign, setUtmCampaign] = useState('ofertas-semana')
  const [utmContent, setUtmContent] = useState('')
  const [utmTerm, setUtmTerm] = useState('')

  // Domínio principal ativo configurado
  const primaryDomain = useMemo(() => {
    return normalizeHostname(settings.primary_domain || companyData?.dominio || DEFAULT_PRIMARY_DOMAIN)
  }, [settings.primary_domain, companyData?.dominio])

  // Carrega dados iniciais
  useEffect(() => {
    let isMounted = true
    async function loadData() {
      setIsLoading(true)
      try {
        const mktSettings = await fetchMarketingSettings()
        if (isMounted) {
          setSettings(mktSettings)
        }
      } catch (err) {
        console.warn('Erro ao carregar dados de marketing:', err)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadData()
    return () => { isMounted = false }
  }, [])

  // Salva configurações gerais de marketing
  const handleSaveSettings = async (customSettings = null) => {
    setIsSaving(true)
    const toSave = customSettings || settings
    try {
      const res = await saveMarketingSettings(toSave)
      if (res.success) {
        setSettings(res.data)
        showToast('Configurações de SEO e Divulgação salvas com sucesso! 🚀')
      } else {
        showToast(res.error || 'Erro ao salvar configurações.', 'error')
      }
    } catch {
      showToast('Falha de conexão ao salvar configurações.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Validação do GA4
  const handleValidateGa = () => {
    const check = validateGaMeasurementId(settings.analytics_measurement_id)
    if (check.valid) {
      setGaValidationFeedback({ valid: true, message: 'ID do Google Analytics 4 com formato válido e aprovado!' })
      const updated = {
        ...settings,
        analytics_measurement_id: check.value,
        analytics_status: settings.analytics_enabled ? 'active' : 'disabled'
      }
      setSettings(updated)
      handleSaveSettings(updated)
    } else {
      setGaValidationFeedback({ valid: false, message: check.error })
      setSettings(prev => ({ ...prev, analytics_status: 'error' }))
    }
  }

  // Cópia para Clipboard
  const copyToClipboard = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    showToast('Copiado para a área de transferência! 📋')
    setTimeout(() => setCopiedField(null), 2500)
  }

  // Métricas do Merchant Center
  const merchantStats = useMemo(() => {
    const total = products.length
    let valid = 0
    let excluded = 0
    const issues = []

    products.forEach(p => {
      const price = parseFloat(p.price) || 0
      const hasImage = Boolean(p.images?.[0] || p.image)
      const isIncluded = p.merchant_include !== false

      if (price <= 0) {
        issues.push({ id: p.id, name: p.name, reason: 'Preço zerado ou inválido' })
        excluded++
      } else if (!hasImage) {
        issues.push({ id: p.id, name: p.name, reason: 'Sem imagem de exibição' })
        excluded++
      } else if (!isIncluded) {
        issues.push({ id: p.id, name: p.name, reason: 'Desmarcado manualmente' })
        excluded++
      } else {
        valid++
      }
    })

    return { total, valid, excluded, issues }
  }, [products])

  // Métricas de Tráfego por Origem (UTMs)
  const [trafficAnalytics, setTrafficAnalytics] = useState({
    totalTrackedOrders: 0,
    totalTrackedRevenue: 0,
    sources: [],
    campaigns: []
  })

  useEffect(() => {
    async function loadTraffic() {
      const res = await getTenantMarketingAnalytics(null, orders)
      setTrafficAnalytics(res)
    }
    loadTraffic()
  }, [orders])

  // URL do Gerador de UTMs
  const generatedTrackedUrl = useMemo(() => {
    let destPath = ''
    if (utmDestination !== 'home') {
      const prod = products.find(p => String(p.id) === String(utmDestination))
      destPath = `#product-${prod?.slug || utmDestination}`
    }

    return buildTrackableUrl({
      domain: primaryDomain,
      path: destPath,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm
    })
  }, [primaryDomain, utmDestination, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, products])

  // URLs de referência para Search Console
  const sitemapUrl = `https://${primaryDomain}/sitemap.xml`
  const robotsUrl = `https://${primaryDomain}/robots.txt`
  const merchantFeedUrl = `https://${primaryDomain}/api/google-merchant/feed.xml`

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(22, 163, 74, 0.12)', color: '#15803d', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <CheckCircle2 size={13} /> Ativo & Conectado
          </span>
        )
      case 'pending':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(234, 179, 8, 0.15)', color: '#b45309', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <Clock size={13} /> Aguardando Configuração
          </span>
        )
      case 'error':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            <AlertCircle size={13} /> Formato Inválido
          </span>
        )
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--dark-100)', color: 'var(--dark-500)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
            Desativado
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--dark-500)' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 12 }} />
        <p style={{ margin: 0, fontWeight: 600 }}>Carregando configurações de SEO & Divulgação da loja...</p>
      </div>
    )
  }

  return (
    <div className="adm-marketing-section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner White-Label */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
        border: '1px solid rgba(22, 163, 74, 0.25)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--lime-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--lime-dark)'
          }}>
            <Globe size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>SEO, Google Shopping & Divulgação</h3>
            <span style={{ fontSize: '13px', color: 'var(--dark-600)' }}>
              Domínio da loja: <strong style={{ color: 'var(--dark-900)' }}>{primaryDomain}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {isSaving ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Navegação por Sub-Abas */}
      <div style={{ borderBottom: '1px solid var(--dark-200)', paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {[
            { id: 'identity', label: 'Domínio & SEO Geral', icon: <Globe size={15} /> },
            { id: 'analytics', label: 'Google Analytics 4', icon: <BarChart3 size={15} /> },
            { id: 'searchconsole', label: 'Google Search Console', icon: <Search size={15} /> },
            { id: 'merchant', label: 'Google Merchant Center', icon: <ShoppingBag size={15} /> },
            { id: 'social', label: 'WhatsApp & Redes', icon: <MessageCircle size={15} /> },
            { id: 'products', label: 'Produtos & Âncoras', icon: <Tag size={15} /> },
            { id: 'utm', label: 'Links UTM & Tráfego', icon: <LinkIcon size={15} /> }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-sm ${activeSubTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveSubTab(tab.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. ABA: DOMÍNIO & IDENTIDADE SEO DA LOJA (WHITE-LABEL) */}
      {/* ========================================================================= */}
      {activeSubTab === 'identity' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Domínio Próprio & Identidade da Loja</h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
              Configure o endereço web oficial da sua loja. Ele é utilizado automaticamente para gerar as URLs canônicas, Sitemap XML, Robots.txt e o feed de produtos do Google Shopping.
            </p>
          </div>

          <div style={{ background: 'var(--dark-50)', border: '1px solid var(--dark-200)', borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="ck-field">
              <label style={{ fontWeight: 700 }}>Domínio Oficial da Loja (URL Pública / Hostname):</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: minhaloja.com.br ou www.minhaloja.com.br"
                  value={settings.primary_domain || ''}
                  onChange={e => setSettings({ ...settings, primary_domain: e.target.value })}
                  style={{ flex: 1, minWidth: 260, fontWeight: 600 }}
                />
                <a
                  href={`https://${primaryDomain}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Testar abertura da loja neste domínio"
                >
                  <ExternalLink size={14} /> Abrir Domínio
                </a>
              </div>
              <small style={{ color: 'var(--dark-500)', fontSize: 11, marginTop: 4 }}>
                Insira o domínio onde esta loja está publicada (ex: <code>sualoja.com.br</code>). O sistema cuida do protocolo HTTPS e das tags canônicas automaticamente.
              </small>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(22, 163, 74, 0.08)', borderRadius: 8, border: '1px solid rgba(22, 163, 74, 0.2)' }}>
              <Shield size={18} style={{ color: '#15803d' }} />
              <div>
                <strong style={{ fontSize: 12, color: '#15803d', display: 'block' }}>Certificado SSL & Indexação Canônica Ativa</strong>
                <span style={{ fontSize: 11, color: 'var(--dark-600)' }}>
                  Todas as páginas, produtos e imagens são entregues com URLs seguras e canônicas para evitar conteúdo duplicado no Google.
                </span>
              </div>
            </div>
          </div>

          {/* Dados Gerais de SEO da Loja */}
          <div style={{ borderTop: '1px solid var(--dark-200)', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>Metadados Globais de SEO</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <div className="ck-field">
                <label>Título SEO Padrão (&lt;title&gt;):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nome da Loja — Variedades e Eletrônicos"
                  value={settings.default_seo_title || ''}
                  onChange={e => setSettings({ ...settings, default_seo_title: e.target.value })}
                  maxLength={70}
                />
                <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>Recomendado: 50 a 60 caracteres ({settings.default_seo_title?.length || 0}/70)</small>
              </div>

              <div className="ck-field">
                <label>Imagem Padrão de Compartilhamento (og:image):</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://sualoja.com.br/banner-share.jpg"
                  value={settings.default_share_image || ''}
                  onChange={e => setSettings({ ...settings, default_share_image: e.target.value })}
                />
                <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>Exibida no WhatsApp, Facebook e Twitter quando compartilharem o link principal</small>
              </div>

              <div className="ck-field" style={{ gridColumn: '1 / -1' }}>
                <label>Descrição SEO Padrão (&lt;meta name="description"&gt;):</label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Resumo atraente da loja com principais diferenciais, condições de frete e pagamento..."
                  value={settings.default_seo_description || ''}
                  onChange={e => setSettings({ ...settings, default_seo_description: e.target.value })}
                  maxLength={160}
                />
                <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>Recomendado: 140 a 160 caracteres ({settings.default_seo_description?.length || 0}/160)</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABA: GOOGLE ANALYTICS 4 */}
      {/* ========================================================================= */}
      {activeSubTab === 'analytics' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Google Analytics 4 (GA4)</h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
                Configure o ID de medição oficial da sua conta Google para acompanhar acessos, conversões e faturamento em tempo real.
              </p>
            </div>
            {renderStatusBadge(settings.analytics_status)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--dark-50)', borderRadius: 10, border: '1px solid var(--dark-200)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: 14 }}>Ativar Coleta de Dados via GA4</strong>
              <span style={{ fontSize: 12, color: 'var(--dark-500)' }}>
                O script oficial do Google Analytics só será injetado no navegador se este botão estiver ativado e o ID for válido.
              </span>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={settings.analytics_enabled}
                onChange={e => {
                  const updated = {
                    ...settings,
                    analytics_enabled: e.target.checked,
                    analytics_status: e.target.checked ? (settings.analytics_measurement_id ? 'active' : 'pending') : 'disabled'
                  }
                  setSettings(updated)
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--lime-dark)' }}
              />
              <span>{settings.analytics_enabled ? 'Ativado' : 'Desativado'}</span>
            </label>
          </div>

          <div className="ck-field">
            <label>ID de Medição da Propriedade (Measurement ID):</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="input-field"
                placeholder="G-A1B2C3D4E5"
                value={settings.analytics_measurement_id || ''}
                onChange={e => {
                  setSettings({ ...settings, analytics_measurement_id: e.target.value.toUpperCase().trim() })
                  setGaValidationFeedback(null)
                }}
                style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600 }}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleValidateGa}
              >
                Validar Formato & Salvar
              </button>
            </div>
            <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>
              Obtido no Google Analytics em: Administrador &gt; Fluxos de Dados &gt; Fluxo Web &gt; ID de Medição.
            </small>
          </div>

          {gaValidationFeedback && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: gaValidationFeedback.valid ? 'rgba(22, 163, 74, 0.1)' : 'var(--red-glow)',
              color: gaValidationFeedback.valid ? '#15803d' : 'var(--red)'
            }}>
              {gaValidationFeedback.valid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{gaValidationFeedback.message}</span>
            </div>
          )}

          {/* Eventos Rastreados */}
          <div style={{ background: 'var(--dark-50)', borderRadius: 10, padding: 16 }}>
            <h5 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700 }}>Eventos de E-commerce Rastreados Automaticamente:</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--lime-dark)' }} />
                <span><code>view_item</code> (Abertura de produto)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--lime-dark)' }} />
                <span><code>add_to_cart</code> (Adição ao carrinho)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--lime-dark)' }} />
                <span><code>begin_checkout</code> (Início de compra)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--lime-dark)' }} />
                <span><code>purchase</code> (Compra finalizada única)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA: GOOGLE SEARCH CONSOLE */}
      {/* ========================================================================= */}
      {activeSubTab === 'searchconsole' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Google Search Console</h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
                Valide a propriedade do seu domínio no Google e acompanhe palavras-chave, cliques e indexação orgânica.
              </p>
            </div>
            {renderStatusBadge(settings.search_console_status)}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--dark-50)', borderRadius: 10, border: '1px solid var(--dark-200)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: 14 }}>Ativar Meta Tag de Verificação</strong>
              <span style={{ fontSize: 12, color: 'var(--dark-500)' }}>
                Injeta automaticamente no &lt;head&gt; da loja a tag de autenticação oficial do Google Search Console.
              </span>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={settings.search_console_enabled}
                onChange={e => {
                  const updated = {
                    ...settings,
                    search_console_enabled: e.target.checked,
                    search_console_status: e.target.checked ? (settings.search_console_verification ? 'active' : 'pending') : 'disabled'
                  }
                  setSettings(updated)
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--lime-dark)' }}
              />
              <span>{settings.search_console_enabled ? 'Ativado' : 'Desativado'}</span>
            </label>
          </div>

          <div className="ck-field">
            <label>Token de Verificação do Search Console (Código ou Meta Tag):</label>
            <input
              type="text"
              className="input-field"
              placeholder='Ex: abc123xyz ou <meta name="google-site-verification" content="abc123xyz" />'
              value={settings.search_console_verification || ''}
              onChange={e => {
                const clean = extractSearchConsoleVerification(e.target.value)
                setSettings({
                  ...settings,
                  search_console_verification: clean,
                  search_console_status: clean ? 'active' : 'disabled'
                })
              }}
              style={{ fontFamily: 'monospace' }}
            />
            <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>
              Você pode colar tanto o token puro quanto a tag HTML completa fornecida pelo Google.
            </small>
          </div>

          {/* Links do Sitemap e Robots para envio no Console */}
          <div style={{ background: 'var(--dark-50)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h5 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Arquivos Oficiais para Enviar no Search Console:</h5>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--white)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-500)', display: 'block' }}>SITEMAP XML DA LOJA:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-900)' }}>{sitemapUrl}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => copyToClipboard(sitemapUrl, 'sitemap')}
                >
                  {copiedField === 'sitemap' ? <Check size={12} /> : <Copy size={12} />} Copiar
                </button>
                <a href={sitemapUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">
                  <ExternalLink size={12} /> Abrir
                </a>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'var(--white)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--dark-500)', display: 'block' }}>ROBOTS.TXT:</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark-900)' }}>{robotsUrl}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-xs"
                  onClick={() => copyToClipboard(robotsUrl, 'robots')}
                >
                  {copiedField === 'robots' ? <Check size={12} /> : <Copy size={12} />} Copiar
                </button>
                <a href={robotsUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-xs">
                  <ExternalLink size={12} /> Abrir
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ABA: GOOGLE MERCHANT CENTER */}
      {/* ========================================================================= */}
      {activeSubTab === 'merchant' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Google Merchant Center & Google Shopping</h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
                Feed XML de alta performance gerado dinamicamente para anunciar seus produtos no Google Shopping e nas abas de busca gratuita.
              </p>
            </div>
            {renderStatusBadge(settings.merchant_status)}
          </div>

          {/* Toggle Geral */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--dark-50)', borderRadius: 10, border: '1px solid var(--dark-200)' }}>
            <div>
              <strong style={{ display: 'block', fontSize: 14 }}>Ativar Feed do Google Merchant Center</strong>
              <span style={{ fontSize: 12, color: 'var(--dark-500)' }}>
                Gera a URL pública oficial do catálogo XML compatível com os padrões de especificação do Google Shopping.
              </span>
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={settings.merchant_enabled}
                onChange={e => {
                  const updated = {
                    ...settings,
                    merchant_enabled: e.target.checked,
                    merchant_status: e.target.checked ? 'active' : 'disabled'
                  }
                  setSettings(updated)
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--lime-dark)' }}
              />
              <span>{settings.merchant_enabled ? 'Ativado' : 'Desativado'}</span>
            </label>
          </div>

          {/* URL Oficial do Feed */}
          <div style={{ background: 'var(--dark-50)', borderRadius: 10, padding: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark-600)', display: 'block', marginBottom: 6 }}>
              URL OFICIAL DO FEED DE PRODUTOS (XML RSS 2.0):
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--white)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--dark-200)' }}>
              <input
                type="text"
                readOnly
                value={merchantFeedUrl}
                style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--dark-900)' }}
              />
              <button
                type="button"
                className="btn btn-outline btn-xs"
                onClick={() => copyToClipboard(merchantFeedUrl, 'feed')}
              >
                {copiedField === 'feed' ? <Check size={13} /> : <Copy size={13} />} Copiar
              </button>
              <a
                href={merchantFeedUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost btn-xs"
              >
                <ExternalLink size={13} /> Testar Feed
              </a>
            </div>
          </div>

          {/* Cards de Diagnóstico do Feed */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <div style={{ background: 'var(--dark-50)', border: '1px solid var(--dark-200)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dark-700)', fontWeight: 700, fontSize: 14 }}>
                <ShoppingBag size={18} /> Total no Catálogo
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--dark-900)', margin: '8px 0 2px' }}>
                {merchantStats.total} produtos
              </div>
              <span style={{ fontSize: 11, color: 'var(--dark-500)' }}>
                Total de itens cadastrados no painel administrativo.
              </span>
            </div>

            <div style={{ background: 'rgba(22, 163, 74, 0.08)', border: '1px solid rgba(22, 163, 74, 0.25)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 700, fontSize: 14 }}>
                <CheckCircle2 size={18} /> Aprovados & Elegíveis
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d', margin: '8px 0 2px' }}>
                {merchantStats.valid} produtos
              </div>
              <span style={{ fontSize: 11, color: 'var(--dark-600)' }}>
                Ativos, com preço válido e imagens carregadas no feed.
              </span>
            </div>

            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--red)', fontWeight: 700, fontSize: 14 }}>
                <AlertCircle size={18} /> Produtos Pendentes / Excluídos
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--red)', margin: '8px 0 2px' }}>
                {merchantStats.excluded} produtos
              </div>
              <span style={{ fontSize: 11, color: 'var(--dark-600)' }}>
                Itens inativos, sem imagem, preço zerado ou excluídos manualmente.
              </span>
            </div>
          </div>

          {/* Detalhes dos produtos excluídos */}
          {merchantStats.issues.length > 0 && (
            <div style={{ border: '1px solid var(--dark-200)', borderRadius: 10, padding: 14 }}>
              <h5 style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--dark-700)' }}>
                Motivo de Exclusão dos Produtos ({merchantStats.issues.length}):
              </h5>
              <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {merchantStats.issues.map(it => (
                  <div key={it.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--dark-50)', borderRadius: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{it.name}</span>
                    <span style={{ color: 'var(--red)', fontSize: 11 }}>{it.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ABA: WHATSAPP & REDES SOCIAIS */}
      {/* ========================================================================= */}
      {activeSubTab === 'social' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>WhatsApp Oficial & Compartilhamento Social</h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
              Configure o canal direto de atendimento por WhatsApp e os botões de compartilhamento integrados aos produtos da loja.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* WhatsApp */}
            <div className="ck-field">
              <label>Número do WhatsApp (com DDI e DDD):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: 5561996272630"
                value={settings.whatsapp_number || ''}
                onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })}
              />
              <small style={{ color: 'var(--dark-400)', fontSize: 11 }}>Apenas números (Ex: 55 + DDD + Número)</small>
            </div>

            <div className="ck-field">
              <label>Mensagem Padrão de Atendimento:</label>
              <input
                type="text"
                className="input-field"
                placeholder="Olá! Estava navegando na loja e gostaria de ajuda..."
                value={settings.whatsapp_message || ''}
                onChange={e => setSettings({ ...settings, whatsapp_message: e.target.value })}
              />
            </div>
          </div>

          {/* Redes Sociais */}
          <div style={{ borderTop: '1px solid var(--dark-200)', paddingTop: 16 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>Links Oficiais das Redes Sociais da Loja</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <div className="ck-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Share2 size={14} /> Instagram:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://instagram.com/sualoja"
                  value={settings.social_links?.instagram || ''}
                  onChange={e => setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, instagram: e.target.value }
                  })}
                />
              </div>

              <div className="ck-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} /> Facebook:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://facebook.com/sualoja"
                  value={settings.social_links?.facebook || ''}
                  onChange={e => setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, facebook: e.target.value }
                  })}
                />
              </div>

              <div className="ck-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Video size={14} /> TikTok:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://tiktok.com/@sualoja"
                  value={settings.social_links?.tiktok || ''}
                  onChange={e => setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, tiktok: e.target.value }
                  })}
                />
              </div>

              <div className="ck-field">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Video size={14} /> YouTube:</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="https://youtube.com/@sualoja"
                  value={settings.social_links?.youtube || ''}
                  onChange={e => setSettings({
                    ...settings,
                    social_links: { ...settings.social_links, youtube: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ABA: PRODUTOS & ÂNCORAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Produtos-Âncora & Otimização SEO</h4>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
                Defina os produtos com maior potencial orgânico para receberem prioridade nos dados estruturados e na vitrine.
              </p>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dark-600)' }}>
              Total de Itens: {products.length}
            </span>
          </div>

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dark-400)' }}>
              Nenhum produto cadastrado no catálogo ainda.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--dark-200)', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--dark-100)', borderBottom: '1px solid var(--dark-200)' }}>
                    <th style={{ padding: '10px 14px' }}>Produto</th>
                    <th style={{ padding: '10px 14px' }}>Slug / URL</th>
                    <th style={{ padding: '10px 14px' }}>Classificação</th>
                    <th style={{ padding: '10px 14px' }}>Shopping</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const isAnchor = Boolean(p.is_anchor)
                    const isWeekly = Boolean(p.weekly_offer)
                    const inMerchant = p.merchant_include !== false
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--dark-200)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ display: 'block' }}>{p.name}</strong>
                          <span style={{ fontSize: 11, color: 'var(--dark-400)' }}>{p.brand} · {p.category}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--dark-600)' }}>
                          /{p.slug || slugify(p.name)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {isAnchor && (
                              <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Star size={12} /> Âncora
                              </span>
                            )}
                            {isWeekly && (
                              <span style={{ background: 'rgba(239, 68, 68, 0.12)', color: 'var(--red)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Flame size={12} /> Oferta
                              </span>
                            )}
                            {!isAnchor && !isWeekly && (
                              <span style={{ color: 'var(--dark-400)', fontSize: 11 }}>Padrão</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {inMerchant ? (
                            <span style={{ color: '#15803d', fontSize: 12, fontWeight: 600 }}>✔ No Feed</span>
                          ) : (
                            <span style={{ color: 'var(--dark-400)', fontSize: 12 }}>Excluído</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => onEditProduct(p)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            Editar SEO
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. ABA: GERADOR DE LINKS UTM & RELATÓRIO DE TRÁFEGO */}
      {/* ========================================================================= */}
      {activeSubTab === 'utm' && (
        <div className="adm-sec-card" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>Gerador de Links Rastreados (Parâmetros UTM)</h4>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dark-500)' }}>
              Crie links com tags de rastreamento para Instagram, WhatsApp, TikTok e anúncios. Quando um cliente comprar através destes links, a venda será automaticamente atribuída à campanha correta.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, background: 'var(--dark-50)', padding: 18, borderRadius: 12, border: '1px solid var(--dark-200)' }}>
            <div className="ck-field">
              <label>Destino do Link:</label>
              <select
                className="input-field"
                value={utmDestination}
                onChange={e => setUtmDestination(e.target.value)}
              >
                <option value="home">Página Inicial / Vitrine Principal</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>Produto: {p.name}</option>
                ))}
              </select>
            </div>

            <div className="ck-field">
              <label>Origem (utm_source) *:</label>
              <select
                className="input-field"
                value={utmSource}
                onChange={e => setUtmSource(e.target.value)}
              >
                <option value="instagram">Instagram</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="google_ads">Google Ads</option>
                <option value="email">E-mail Marketing</option>
                <option value="parceiro">Influenciador / Parceiro</option>
              </select>
            </div>

            <div className="ck-field">
              <label>Mídia (utm_medium):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: stories, bio, feed, cpc, mensagem"
                value={utmMedium}
                onChange={e => setUtmMedium(e.target.value)}
              />
            </div>

            <div className="ck-field">
              <label>Nome da Campanha (utm_campaign):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: liquidacao-marco, lancamento, promo-pix"
                value={utmCampaign}
                onChange={e => setUtmCampaign(e.target.value)}
              />
            </div>

            <div className="ck-field">
              <label>Conteúdo (utm_content - Opcional):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: banner-vermelho, botao-cta"
                value={utmContent}
                onChange={e => setUtmContent(e.target.value)}
              />
            </div>

            <div className="ck-field">
              <label>Termo / Palavra (utm_term - Opcional):</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: teclado-mecanico"
                value={utmTerm}
                onChange={e => setUtmTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Resultado Gerado com Copiar */}
          <div style={{ background: 'var(--white)', border: '2px solid var(--lime)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--lime-dark)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} /> LINK PRONTO PARA DIVULGAÇÃO:
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => copyToClipboard(generatedTrackedUrl, 'tracked_url')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {copiedField === 'tracked_url' ? <Check size={14} /> : <Copy size={14} />}
                {copiedField === 'tracked_url' ? 'Copiado!' : 'Copiar Link Completo'}
              </button>
            </div>

            <div style={{ background: 'var(--dark-50)', padding: '10px 14px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', color: 'var(--dark-800)', border: '1px solid var(--dark-200)' }}>
              {generatedTrackedUrl}
            </div>
          </div>

          {/* Relatório de Vendas Reais por Canal */}
          <div style={{ borderTop: '1px solid var(--dark-200)', paddingTop: 20 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>Desempenho de Vendas por Canal (UTM)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
              <div style={{ background: 'var(--dark-50)', padding: 14, borderRadius: 10, border: '1px solid var(--dark-200)' }}>
                <span style={{ fontSize: 11, color: 'var(--dark-500)', fontWeight: 600 }}>Vendas Rastreáveis</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--dark-900)', marginTop: 4 }}>
                  {trafficAnalytics.totalTrackedOrders} pedidos
                </div>
              </div>
              <div style={{ background: 'var(--dark-50)', padding: 14, borderRadius: 10, border: '1px solid var(--dark-200)' }}>
                <span style={{ fontSize: 11, color: 'var(--dark-500)', fontWeight: 600 }}>Receita Rastreável</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d', marginTop: 4 }}>
                  R$ {trafficAnalytics.totalTrackedRevenue.toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>

            {trafficAnalytics.sources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--dark-400)', background: 'var(--dark-50)', borderRadius: 10 }}>
                Nenhuma venda com parâmetros de campanha registrada até o momento.
              </div>
            ) : (
              <div style={{ border: '1px solid var(--dark-200)', borderRadius: 10, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--dark-100)', borderBottom: '1px solid var(--dark-200)' }}>
                      <th style={{ padding: '10px 14px' }}>Canal / Origem (Source)</th>
                      <th style={{ padding: '10px 14px' }}>Pedidos Realizados</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Receita Total Gerada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trafficAnalytics.sources.map(s => (
                      <tr key={s.source} style={{ borderBottom: '1px solid var(--dark-200)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, textTransform: 'capitalize' }}>{s.source}</td>
                        <td style={{ padding: '10px 14px' }}>{s.count} pedidos</td>
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                          R$ {s.revenue.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
