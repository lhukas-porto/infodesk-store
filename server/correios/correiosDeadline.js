// Módulo de Consulta à API de Prazo dos Correios (Lote Nacional)
import { CORREIOS_CONFIG, CORREIOS_SERVICES, getStoreCorreiosConfig } from './config.js'

/**
 * Consulta a API de Prazo Nacional dos Correios em lote
 * @param {string} token - Bearer Token
 * @param {string} cepDestino - CEP de destino limpo (8 dígitos)
 * @param {object} [options] - Parâmetros opcionais (cepOrigem, storeId)
 * @returns {Promise<Array<{ coProduto: string, nuRequisicao: string, prazoEntrega: number, dataMaxima: string, entregaDomiciliar: string }>>}
 */
export async function fetchCorreiosDeadline(token, cepDestino, options = {}) {
  const storeId = options.storeId || 'default'
  const storeCfg = getStoreCorreiosConfig(storeId)

  const cepOrigem = (options.cepOrigem || storeCfg.cepOrigem || CORREIOS_CONFIG.cepOrigem || '').replace(/\D/g, '')
  const idLote = `LOTE-${Date.now()}`

  const parametrosPrazo = CORREIOS_SERVICES.map(svc => ({
    coProduto: svc.code,
    nuRequisicao: svc.requisicao,
    cepOrigem: cepOrigem,
    cepDestino: cepDestino
  }))

  const bodyPayload = {
    idLote,
    parametrosPrazo
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CORREIOS_CONFIG.timeoutMs)

  try {
    const response = await fetch(CORREIOS_CONFIG.prazoUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error(`[Correios Prazo] HTTP ${response.status}: ${errText.slice(0, 150)}`)
      const error = new Error(`Falha na API de Prazo (${response.status})`)
      error.status = response.status
      throw error
    }

    const data = await response.json()

    const items = Array.isArray(data)
      ? data
      : (data.parametrosPrazo || data.resultado || data.itens || [data])

    return items.map(item => {
      const prazoEntrega = parseInt(item.prazoEntrega || item.prazo || 0, 10)
      const dataMaxima = item.dataMaxima || null
      const entregaDomiciliar = item.entregaDomiciliar || 'S'
      const coProduto = item.coProduto || ''
      const nuRequisicao = item.nuRequisicao || ''

      return {
        coProduto,
        nuRequisicao,
        prazoEntrega,
        dataMaxima,
        entregaDomiciliar,
        entregaSabado: item.entregaSabado || 'N',
        entregaDomingo: item.entregaDomingo || 'N',
        raw: item
      }
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      console.error('[Correios Prazo] Timeout na requisição de prazo.')
      throw new Error('Timeout na API de Prazo dos Correios.')
    }
    throw err
  }
}
