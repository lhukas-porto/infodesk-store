// Módulo de Autenticação com a API Oficial dos Correios (Token com Contrato)
// Gerencia cache em memória, renovação preventiva e invalidação segura sem expor credenciais

import { CORREIOS_CONFIG, getStoreCorreiosConfig } from './config.js'

const tokenCacheByStore = new Map() // storeId -> { token, expiresAt: timestamp }

/**
 * Obtém o Bearer Token dos Correios com cache e renovação automática
 * @param {boolean} forceRefresh - Força geração de novo token descartando o cache
 * @param {string} storeId - Identificador da loja
 * @returns {Promise<string>} Bearer token válido
 */
export async function getCorreiosToken(forceRefresh = false, storeId = 'default') {
  const now = Date.now()
  const cached = tokenCacheByStore.get(storeId)

  // Se houver token válido e com margem de segurança de pelo menos 5 minutos, reutiliza
  if (!forceRefresh && cached && cached.expiresAt > now + (5 * 60 * 1000)) {
    return cached.token
  }

  const storeCfg = getStoreCorreiosConfig(storeId)
  const usuario = storeCfg.usuario || CORREIOS_CONFIG.usuario
  const codigoAcesso = storeCfg.codigoAcesso || CORREIOS_CONFIG.codigoAcesso
  const contrato = storeCfg.contrato || CORREIOS_CONFIG.contrato
  const dr = storeCfg.dr || CORREIOS_CONFIG.dr

  if (!usuario || !codigoAcesso || !contrato) {
    throw new Error('Credenciais dos Correios incompletas no ambiente (CORREIOS_USUARIO, CORREIOS_CODIGO_ACESSO, CORREIOS_CONTRATO).')
  }

  const basicAuth = Buffer.from(`${usuario}:${codigoAcesso}`).toString('base64')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CORREIOS_CONFIG.timeoutMs)

  try {
    const response = await fetch(CORREIOS_CONFIG.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        numero: contrato,
        dr: dr
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      // Log seguro sem credenciais
      console.error(`[Correios Auth] Falha na autenticação HTTP ${response.status}: ${errorBody.slice(0, 150)}`)
      throw new Error(`Falha na autenticação dos Correios (${response.status})`)
    }

    const data = await response.json()

    // Resposta dos Correios: { token: '...', expiraEm: '2026-09-10T02:00:00.000-03:00' } ou similar
    const token = data.token || data.jwt
    if (!token) {
      throw new Error('Resposta de autenticação dos Correios não conteve o campo token.')
    }

    let expiresAt = now + (2 * 60 * 60 * 1000) // Default: 2 horas
    if (data.expiraEm) {
      const parsedDate = new Date(data.expiraEm).getTime()
      if (!isNaN(parsedDate) && parsedDate > now) {
        expiresAt = parsedDate
      }
    } else if (data.expires_in) {
      expiresAt = now + (parseInt(data.expires_in, 10) * 1000)
    }

    tokenCacheByStore.set(storeId, {
      token,
      expiresAt
    })

    return token
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      console.error('[Correios Auth] Timeout ao conectar na API de autenticação dos Correios.')
      throw new Error('Timeout ao conectar com os Correios.')
    }
    throw err
  }
}

/**
 * Descarta o token armazenado em memória (usado após erro 401)
 */
export function invalidateCorreiosToken(storeId = 'default') {
  tokenCacheByStore.delete(storeId)
}
