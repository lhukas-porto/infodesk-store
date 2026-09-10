// Cliente Orquestrador dos Correios
// Realiza chamadas em paralelo (Preço + Prazo), cache de cotações, renovação de token em caso de 401 e combinação dos dados

import { CORREIOS_CONFIG, CORREIOS_SERVICES, hasCorreiosCredentials, getStoreCorreiosConfig } from './config.js'
import { getCorreiosToken, invalidateCorreiosToken } from './correiosAuth.js'
import { fetchCorreiosPrice } from './correiosPrice.js'
import { fetchCorreiosDeadline } from './correiosDeadline.js'
import { calculatePackage } from './packagePacker.js'

// Cache em memória de cotações recentes (5 minutos de TTL)
const quoteCache = new Map() // key -> { timestamp, data }
const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000

function getCacheKey(storeId, cepDestino, pkg) {
  return `${storeId}_${cepDestino}_${pkg.weightG}_${pkg.length}x${pkg.width}x${pkg.height}`
}

function cleanExpiredCache() {
  const now = Date.now()
  for (const [k, v] of quoteCache.entries()) {
    if (now - v.timestamp > QUOTE_CACHE_TTL_MS) {
      quoteCache.delete(k)
    }
  }
}

/**
 * Cota frete e prazo nas APIs oficiais dos Correios
 * @param {string} cepDestino - CEP do destinatário
 * @param {Array} items - Itens com dimensões e pesos
 * @param {string} storeId - Identificador da loja/empresa
 * @returns {Promise<{ success: boolean, options: Array, package: object, error?: string }>}
 */
export async function quoteShipping(cepDestino, items, storeId = 'default') {
  const cleanCep = (cepDestino || '').replace(/\D/g, '')
  if (cleanCep.length !== 8) {
    return {
      success: false,
      error: 'CEP de destino inválido. Deve conter 8 dígitos.',
      options: []
    }
  }

  const storeCfg = getStoreCorreiosConfig(storeId)
  if (!storeCfg.enabled) {
    return {
      success: false,
      error: 'Integração dos Correios está desativada no painel administrativo.',
      options: [],
      disabled: true
    }
  }

  // 1. Calcula embalagem determinística
  const packageInfo = calculatePackage(items)

  // 2. Verifica cache em memória
  cleanExpiredCache()
  const cacheKey = getCacheKey(storeId, cleanCep, packageInfo)
  const cached = quoteCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL_MS) {
    return { ...cached.data, fromCache: true }
  }

  // 3. Verifica credenciais dos Correios
  if (!hasCorreiosCredentials(storeId)) {
    console.warn('[Correios] Credenciais oficiais não configuradas no .env ou no Painel. Configure Usuário, Código de Acesso e Contrato.')
    return {
      success: false,
      error: 'Serviço de cotação dos Correios temporariamente indisponível. Verifique as credenciais do contrato.',
      options: [],
      package: packageInfo,
      unconfigured: true
    }
  }

  // 4. Executa consulta com suporte a retry único em caso de 401 (token expirado)
  let attempt = 0
  let lastError = null

  while (attempt < 2) {
    attempt++
    try {
      const token = await getCorreiosToken(attempt > 1)

      // Cotação paralela de Preço e Prazo
      const [priceResults, deadlineResults] = await Promise.all([
        fetchCorreiosPrice(token, cleanCep, packageInfo),
        fetchCorreiosDeadline(token, cleanCep)
      ])

      // 5. Combina os resultados por código de serviço / coProduto respeitando ativação
      const options = []

      for (const service of CORREIOS_SERVICES) {
        // Verifica se o serviço está habilitado nas configurações da loja
        if (service.id === 'PAC' && !storeCfg.pacEnabled) continue
        if (service.id === 'SEDEX' && !storeCfg.sedexEnabled) continue

        const priceItem = priceResults.find(
          p => p.coProduto === service.code || p.nuRequisicao === service.requisicao
        )
        const deadlineItem = deadlineResults.find(
          d => d.coProduto === service.code || d.nuRequisicao === service.requisicao
        )

        // Se o preço foi retornado com sucesso para a modalidade
        if (priceItem && priceItem.pcFinal > 0) {
          const deliveryDays = deadlineItem ? deadlineItem.prazoEntrega : 0
          const maxDeliveryDate = deadlineItem ? deadlineItem.dataMaxima : null

          options.push({
            id: service.id,
            serviceCode: service.code,
            name: service.name,
            description: service.description,
            price: priceItem.pcFinal,
            deliveryDays,
            maxDeliveryDate,
            homeDelivery: deadlineItem ? deadlineItem.entregaDomiciliar === 'S' : true,
            deliverySaturday: deadlineItem ? deadlineItem.entregaSabado === 'S' : false
          })
        }
      }

      if (options.length === 0) {
        return {
          success: false,
          error: 'Nenhuma modalidade de entrega dos Correios disponível para este CEP com as dimensões fornecidas.',
          options: [],
          package: packageInfo
        }
      }

      // Ordena: PAC primeiro ou menor preço
      options.sort((a, b) => a.price - b.price)

      const result = {
        success: true,
        options,
        package: packageInfo,
        originCep: CORREIOS_CONFIG.cepOrigem,
        destinationCep: cleanCep,
        quotedAt: new Date().toISOString()
      }

      // Salva no cache
      quoteCache.set(cacheKey, { timestamp: Date.now(), data: result })

      return result
    } catch (err) {
      lastError = err
      const isUnauthorized = err.status === 401 || (err.message && err.message.includes('401'))

      if (isUnauthorized && attempt === 1) {
        console.warn('[Correios] Token expirado ou rejeitado (401). Invalidando cache e tentando nova emissão...')
        invalidateCorreiosToken()
        continue // Tenta mais uma vez
      }

      // Se for outro erro ou já foi a segunda tentativa, interrompe
      break
    }
  }

  // Falha após tentativas
  console.error('[Correios Client] Erro ao consultar Correios:', lastError?.message)
  return {
    success: false,
    error: 'Não foi possível calcular o frete para este CEP no momento.',
    options: [],
    package: packageInfo
  }
}
