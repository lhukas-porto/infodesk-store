// Módulo de Consulta à API de Preço dos Correios (Lote Nacional)
import { CORREIOS_CONFIG, CORREIOS_SERVICES } from './config.js'

/**
 * Converte valor de moeda brasileira (ex: "24,54" ou "1.234,56") para número float JS
 * @param {string|number} value
 * @returns {number}
 */
export function parseBrazilianCurrency(value) {
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  if (!value || typeof value !== 'string') return 0

  const cleaned = value.trim()
  if (!cleaned) return 0

  // Se tiver formato brasileiro como "1.234,56" ou "24,54"
  if (cleaned.includes(',')) {
    const standardized = cleaned.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(standardized)
    return isNaN(parsed) ? 0 : parsed
  }

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Consulta a API de Preço Nacional dos Correios em lote
 * @param {string} token - Bearer Token
 * @param {string} cepDestino - CEP de destino limpo (8 dígitos)
 * @param {{ weightG: number, length: number, width: number, height: number }} packageInfo - Dados do pacote
 * @returns {Promise<Array<{ coProduto: string, nuRequisicao: string, pcFinal: number, raw: object }>>}
 */
export async function fetchCorreiosPrice(token, cepDestino, packageInfo) {
  const contrato = CORREIOS_CONFIG.contrato
  const dr = CORREIOS_CONFIG.dr
  const cepOrigem = CORREIOS_CONFIG.cepOrigem
  const idLote = `LOTE-${Date.now()}`

  const parametrosProduto = CORREIOS_SERVICES.map(svc => ({
    coProduto: svc.code,
    nuRequisicao: svc.requisicao,
    nuContrato: contrato,
    nuDR: dr,
    cepOrigem: cepOrigem,
    cepDestino: cepDestino,
    psObjeto: String(packageInfo.weightG),
    tpObjeto: '2', // Pacote / Caixa
    comprimento: String(packageInfo.length),
    largura: String(packageInfo.width),
    altura: String(packageInfo.height)
  }))

  const bodyPayload = {
    idLote,
    parametrosProduto
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CORREIOS_CONFIG.timeoutMs)

  try {
    const response = await fetch(CORREIOS_CONFIG.precoUrl, {
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
      console.error(`[Correios Preço] HTTP ${response.status}: ${errText.slice(0, 150)}`)
      const error = new Error(`Falha na API de Preço (${response.status})`)
      error.status = response.status
      throw error
    }

    const data = await response.json()

    // O retorno pode vir como array direto de resultados ou objeto contendo lista
    const items = Array.isArray(data)
      ? data
      : (data.parametrosProduto || data.resultado || data.itens || [data])

    return items.map(item => {
      // pcFinal pode vir diretamente no item ou em propriedades equivalentes
      const rawPrice = item.pcFinal || item.vlPrecoFrete || item.precoFinal || item.valor || '0'
      const price = parseBrazilianCurrency(rawPrice)
      const coProduto = item.coProduto || ''
      const nuRequisicao = item.nuRequisicao || ''

      return {
        coProduto,
        nuRequisicao,
        pcFinal: price,
        raw: item
      }
    })
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      console.error('[Correios Preço] Timeout na requisição de preço.')
      throw new Error('Timeout na API de Preço dos Correios.')
    }
    throw err
  }
}
