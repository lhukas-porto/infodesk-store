import React, { useState, useEffect } from 'react'
import {
  Store, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink,
  Search, Loader2, Send, Percent, Tag, ArrowUpRight, Check
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { mercadoLivreService } from '../../services/mercadoLivreService'

export default function AdminMercadoLivreSection() {
  const { products = [], showToast, updateProduct } = useStore()
  const [status, setStatus] = useState({ loading: true, connected: false })
  const [publishingId, setPublishingId] = useState(null)
  const [publishedMap, setPublishedMap] = useState({})
  const [searchTerm, setSearchTerm] = useState('')
  const [defaultMarkup, setDefaultMarkup] = useState(15) // 15% para cobrir taxas do Meli
  const [listingType, setListingType] = useState('gold_special') // gold_special (Clássico) ou gold_pro (Premium)

  // Consulta status de conexão da conta
  const loadStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }))
    const res = await mercadoLivreService.getStatus()
    setStatus({ loading: false, ...res })
  }

  useEffect(() => {
    loadStatus()

    // Verifica retorno de OAuth na URL
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
        
        // Atualiza o mapa local imediato
        setPublishedMap(prev => ({
          ...prev,
          [product.id]: {
            id: res.itemId,
            permalink: res.permalink
          }
        }))

        // Atualiza no StoreContext
        if (typeof updateProduct === 'function') {
          updateProduct(product.id, {
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
    <div className="adm-mercadolivre-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner Mercado Livre */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 230, 0, 0.18), rgba(45, 50, 119, 0.04))',
        border: '1px solid rgba(234, 179, 8, 0.35)',
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
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
            flexShrink: 0
          }}>
            <Store size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: 4 }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--dark-900, #0f172a)', fontWeight: 800 }}>
                Integração Oficial com Mercado Livre
              </h3>
              {status.connected ? (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#15803d',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <CheckCircle2 size={13} /> Conectado ({status.nickname || 'LHUCAS'})
                </span>
              ) : (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#b91c1c',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <AlertTriangle size={13} /> Desconectado
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--dark-600, #475569)' }}>
              Publique produtos diretamente do seu estoque para o Mercado Livre com sincronização em 1 clique.
            </p>
          </div>
        </div>

        {/* Botão de Conexão */}
        <div>
          {status.loading ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}
            >
              <RefreshCw size={15} className="spin" /> Verificando...
            </button>
          ) : status.connected ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={mercadoLivreService.connectAccount}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.875rem',
                background: 'var(--white, #fff)',
                border: '1px solid var(--dark-200, #e2e8f0)',
                color: 'var(--dark-800, #1e293b)'
              }}
              title="Clique para renovar as credenciais ou trocar de conta"
            >
              <RefreshCw size={15} /> Reconectar Conta
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              style={{
                background: '#FFE600',
                color: '#2D3277',
                fontWeight: 800,
                border: '1px solid #eab308',
                boxShadow: '0 4px 12px rgba(234, 179, 8, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.875rem',
                padding: '10px 18px',
                borderRadius: 10
              }}
              onClick={mercadoLivreService.connectAccount}
            >
              <Store size={18} /> Conectar com Mercado Livre
            </button>
          )}
        </div>
      </div>

      {/* Alerta caso desconectado */}
      {!status.connected && !status.loading && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <AlertTriangle size={22} style={{ color: '#d97706', flexShrink: 0 }} />
          <div style={{ fontSize: '0.875rem', color: 'var(--dark-800, #1e293b)' }}>
            <strong>Ação necessária:</strong> Clique em <strong>"Conectar com Mercado Livre"</strong> acima para autorizar o Infodesk Store a gerenciar seus anúncios.
          </div>
        </div>
      )}

      {/* Barra de Filtros e Parâmetros */}
      <div style={{
        background: 'var(--white, #ffffff)',
        border: '1px solid var(--dark-200, #e2e8f0)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Campo de Busca */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 260,
          background: 'var(--surface-primary, #f8fafc)',
          border: '1px solid var(--dark-200, #cbd5e1)',
          borderRadius: 10,
          padding: '8px 14px'
        }}>
          <Search size={18} style={{ color: 'var(--dark-500, #64748b)' }} />
          <input
            type="text"
            placeholder="Buscar produto por nome, código ou EAN..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '0.875rem',
              color: 'var(--dark-900, #0f172a)'
            }}
          />
        </div>

        {/* Controles de Markup e Tipo de Anúncio */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark-700, #334155)' }}>
              Acréscimo no Meli:
            </span>
            <div style={{ position: 'relative', width: 90 }}>
              <input
                type="number"
                min="0"
                max="100"
                value={defaultMarkup}
                onChange={e => setDefaultMarkup(Number(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px 28px 8px 12px',
                  border: '1px solid var(--dark-200, #cbd5e1)',
                  borderRadius: 8,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--dark-900, #0f172a)',
                  background: 'var(--white, #fff)',
                  outline: 'none'
                }}
              />
              <Percent size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark-700, #334155)' }}>
              Tipo de Anúncio:
            </span>
            <select
              value={listingType}
              onChange={e => setListingType(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--dark-200, #cbd5e1)',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--dark-900, #0f172a)',
                background: 'var(--white, #fff)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="gold_special">Clássico (Menor taxa)</option>
              <option value="gold_pro">Premium (Sem juros no cartão)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Lista de Produtos */}
      <div style={{
        background: 'var(--white, #ffffff)',
        border: '1px solid var(--dark-200, #e2e8f0)',
        borderRadius: 16,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--dark-900, #0f172a)' }}>
            Produtos Disponíveis para Anúncio ({filteredProducts.length})
          </h4>
          <span style={{ fontSize: '0.8rem', color: 'var(--dark-500, #64748b)' }}>
            💡 Produtos sem código de barras são declarados automaticamente com justificativa aceita pelo Mercado Livre.
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--dark-500, #64748b)' }}>
            Nenhum produto encontrado com o termo pesquisado.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredProducts.map(prod => {
              const meliItem = publishedMap[prod.id] || (prod.mercadolivre_id ? { id: prod.mercadolivre_id, permalink: prod.mercadolivre_permalink } : null)
              const isPublished = Boolean(meliItem?.id)
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
                    padding: '16px 20px',
                    borderRadius: 14,
                    border: isPublished ? '1px solid #86efac' : '1px solid var(--dark-200, #e2e8f0)',
                    background: isPublished ? '#f0fdf4' : 'var(--white, #fff)',
                    gap: '16px',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s ease',
                    boxShadow: isPublished ? '0 2px 8px rgba(34, 197, 94, 0.08)' : 'none'
                  }}
                >
                  {/* Foto + Informações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 260 }}>
                    <img
                      src={thumb}
                      alt={prod.name}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 10,
                        objectFit: 'cover',
                        background: 'var(--dark-100, #f1f5f9)',
                        border: '1px solid var(--dark-200, #e2e8f0)'
                      }}
                    />
                    <div>
                      {isPublished && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          marginBottom: 4
                        }}>
                          <CheckCircle2 size={12} /> Publicado no Mercado Livre ({meliItem.id})
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark-900, #0f172a)' }}>
                        {prod.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--dark-500, #64748b)', display: 'flex', gap: 12, marginTop: 2 }}>
                        <span>Estoque: <strong style={{ color: 'var(--dark-800, #1e293b)' }}>{prod.stock || 0} un.</strong></span>
                        {prod.barcode ? (
                          <span>EAN: {prod.barcode}</span>
                        ) : (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>EAN auto-gerado</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preços Comparados */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--dark-500, #64748b)' }}>Preço Loja</div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--dark-800, #1e293b)' }}>
                        R$ {Number(prod.price || 0).toFixed(2)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: isPublished ? '#15803d' : '#b45309', fontWeight: 700 }}>
                        {isPublished ? 'Preço no Meli' : 'Preço Simulado Meli'}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isPublished ? '#15803d' : '#b45309' }}>
                        R$ {meliPrice}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isPublished ? (
                      <>
                        <a
                          href={meliItem.permalink || `http://produto.mercadolivre.com.br/${meliItem.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn"
                          style={{
                            background: '#16a34a',
                            color: '#ffffff',
                            border: '1px solid #15803d',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            padding: '8px 14px',
                            borderRadius: 8,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            textDecoration: 'none',
                            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                          }}
                        >
                          <ExternalLink size={14} /> Ver no Mercado Livre
                        </a>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: '8px 10px',
                            fontSize: '0.8rem',
                            background: 'var(--white, #fff)',
                            border: '1px solid var(--dark-200, #cbd5e1)',
                            color: 'var(--dark-700, #334155)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5
                          }}
                          disabled={isPublishing}
                          onClick={() => handlePublish(prod)}
                          title="Sincronizar novamente com o Mercado Livre"
                        >
                          <RefreshCw size={12} className={isPublishing ? 'spin' : ''} />
                          {isPublishing ? 'Atualizando...' : 'Re-sincronizar'}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          background: status.connected ? '#FFE600' : 'var(--dark-100, #f1f5f9)',
                          color: status.connected ? '#2D3277' : 'var(--dark-400, #94a3b8)',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          border: status.connected ? '1px solid #eab308' : '1px solid var(--dark-200, #e2e8f0)',
                          borderRadius: 8,
                          padding: '8px 16px',
                          cursor: status.connected ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: status.connected ? '0 2px 6px rgba(234, 179, 8, 0.2)' : 'none'
                        }}
                        disabled={!status.connected || isPublishing}
                        onClick={() => handlePublish(prod)}
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
