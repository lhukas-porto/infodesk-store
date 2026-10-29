import React, { useState, useEffect } from 'react'
import {
  Store, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink,
  ArrowUpRight, ShoppingBag, Send, Percent, Tag, Search, Loader2
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { mercadoLivreService } from '../../services/mercadoLivreService'

export default function AdminMercadoLivreSection() {
  const { products = [], showToast, updateProduct } = useStore()
  const [status, setStatus] = useState({ loading: true, connected: false })
  const [publishingId, setPublishingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [defaultMarkup, setDefaultMarkup] = useState(15) // 15% para cobrir taxas padrão do Meli
  const [listingType, setListingType] = useState('gold_special') // gold_special (Clássico) ou gold_pro (Premium)

  // Consulta status de conexão da conta
  const loadStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }))
    const res = await mercadoLivreService.getStatus()
    setStatus({ loading: false, ...res })
  }

  useEffect(() => {
    loadStatus()

    // Verifica se veio de retorno de OAuth na URL
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('meli') === 'success') {
      showToast('🎉 Conta do Mercado Livre conectada com sucesso!')
      window.history.replaceState({}, document.title, window.location.pathname + '#admin')
      loadStatus()
    } else if (urlParams.get('meli') === 'error') {
      showToast('❌ Erro ao conectar conta do Mercado Livre.')
      window.history.replaceState({}, document.title, window.location.pathname + '#admin')
    }
  }, [])

  // Publicar um produto individual
  const handlePublish = async (product) => {
    try {
      setPublishingId(product.id)
      const res = await mercadoLivreService.publishProduct(product.id, defaultMarkup, listingType)

      if (res.success) {
        showToast(`✅ Anúncio ${res.itemId} criado com sucesso no Mercado Livre! 🚀`)
        // Atualiza o estado local do produto
        if (updateProduct) {
          updateProduct({
            ...product,
            mercadolivre_id: res.itemId,
            mercadolivre_permalink: res.permalink,
            mercadolivre_status: 'active'
          })
        }
      } else {
        showToast(`❌ Falha ao publicar: ${res.error || 'Verifique as fotos e dados do produto'}`)
      }
    } catch (err) {
      showToast(`❌ Erro inesperado: ${err.message}`)
    } finally {
      setPublishingId(null)
    }
  }

  // Filtra produtos da busca
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase()
    return (
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.includes(term)) ||
      (p.mercadolivre_id && p.mercadolivre_id.toLowerCase().includes(term))
    )
  })

  return (
    <div className="adm-mercadolivre-section" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner Mercado Livre */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 230, 0, 0.12), rgba(45, 50, 119, 0.05))',
        border: '1px solid rgba(255, 230, 0, 0.4)',
        borderRadius: 16,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#FFE600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#2D3277',
            boxShadow: '0 4px 12px rgba(255, 230, 0, 0.3)'
          }}>
            <Store size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text, #fff)' }}>
                Integração Oficial com Mercado Livre
              </h2>
              {status.connected ? (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <CheckCircle2 size={12} /> Conectado ({status.nickname})
                </span>
              ) : (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <AlertTriangle size={12} /> Desconectado
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              Publique produtos diretamente da sua loja para o Mercado Livre com 1 clique.
            </p>
          </div>
        </div>

        {/* Botão de Conexão OAuth */}
        <div>
          {status.loading ? (
            <button className="adm-btn adm-btn-secondary" disabled>
              <RefreshCw size={16} className="spin" /> Verificando...
            </button>
          ) : status.connected ? (
            <button
              className="adm-btn adm-btn-secondary"
              onClick={mercadoLivreService.connectAccount}
              title="Clique para renovar as credenciais ou trocar de conta"
            >
              <RefreshCw size={16} /> Reconectar Conta
            </button>
          ) : (
            <button
              className="adm-btn"
              style={{
                background: '#FFE600',
                color: '#2D3277',
                fontWeight: 700,
                border: 'none',
                boxShadow: '0 4px 12px rgba(255, 230, 0, 0.3)'
              }}
              onClick={mercadoLivreService.connectAccount}
            >
              <Store size={18} /> Conectar com Mercado Livre
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Configuração se não conectado */}
      {!status.connected && !status.loading && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', color: 'var(--text, #fff)' }}>
            <strong>Passo necessário:</strong> Clique no botão <strong>"Conectar com Mercado Livre"</strong> acima para autorizar o Infodesk Store a publicar anúncios na sua conta de vendedor.
          </div>
        </div>
      )}

      {/* Barra de Ajustes de Publicação */}
      <div style={{
        background: 'var(--surface-card, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Busca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={18} style={{ color: 'var(--text-muted, #94a3b8)' }} />
          <input
            type="text"
            className="adm-input"
            placeholder="Buscar produto para anunciar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', margin: 0 }}
          />
        </div>

        {/* Ajustes de Markup e Tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
              Acréscimo no Meli:
            </span>
            <div style={{ position: 'relative', width: 90 }}>
              <input
                type="number"
                className="adm-input"
                min="0"
                max="100"
                value={defaultMarkup}
                onChange={e => setDefaultMarkup(Number(e.target.value) || 0)}
                style={{ width: '100%', margin: 0, paddingRight: 28 }}
              />
              <Percent size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>Tipo:</span>
            <select
              className="adm-input"
              value={listingType}
              onChange={e => setListingType(e.target.value)}
              style={{ width: 'auto', margin: 0 }}
            >
              <option value="gold_special">Clássico (menor taxa)</option>
              <option value="gold_pro">Premium (sem juros)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Produtos */}
      <div style={{
        background: 'var(--surface-card, #1e293b)',
        border: '1px solid var(--border, #334155)',
        borderRadius: 16,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            Catálogo de Produtos ({filteredProducts.length})
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
            Dica: Fotos com fundo limpo e códigos de barras (EAN) garantem mais destaque no Mercado Livre.
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted, #94a3b8)' }}>
            Nenhum produto encontrado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredProducts.map(prod => {
              const isPublished = Boolean(prod.mercadolivre_id)
              const isPublishing = publishingId === prod.id
              const meliPrice = (Number(prod.price || 0) * (1 + (defaultMarkup / 100))).toFixed(2)
              const thumb = (prod.images && prod.images[0]) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200'

              return (
                <div
                  key={prod.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: '1px solid var(--border, #334155)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  {/* Foto + Nome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 260 }}>
                    <img
                      src={thumb}
                      alt={prod.name}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        objectFit: 'cover',
                        background: '#0f172a'
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text, #fff)' }}>
                        {prod.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', gap: 12 }}>
                        <span>Estoque: <strong>{prod.stock || 0} un.</strong></span>
                        {prod.barcode && <span>EAN: {prod.barcode}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Preços */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>Na Loja</div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        R$ {Number(prod.price || 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#FFE600', fontWeight: 600 }}>No Mercado Livre</div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#FFE600' }}>
                        R$ {meliPrice}
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isPublished ? (
                      <a
                        href={prod.mercadolivre_permalink || `https://produto.mercadolivre.com.br/${prod.mercadolivre_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="adm-btn adm-btn-secondary"
                        style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        <ExternalLink size={14} /> Ver Anúncio ({prod.mercadolivre_id})
                      </a>
                    ) : (
                      <button
                        className="adm-btn"
                        style={{
                          background: status.connected ? '#FFE600' : 'var(--surface-variant, #334155)',
                          color: status.connected ? '#2D3277' : '#94a3b8',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          border: 'none',
                          cursor: status.connected ? 'pointer' : 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        disabled={!status.connected || isPublishing}
                        onClick={() => handlePublish(prod)}
                        title={status.connected ? 'Criar anúncio no Mercado Livre' : 'Conecte a conta do Mercado Livre primeiro'}
                      >
                        {isPublishing ? (
                          <>
                            <Loader2 size={14} className="spin" /> Publicando...
                          </>
                        ) : (
                          <>
                            <Send size={14} /> Anunciar no Mercado Livre
                          </>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

