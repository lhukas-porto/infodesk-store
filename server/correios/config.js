// Configurações e definições das APIs Oficiais dos Correios (Multiempresa / Multi-Store)
// Mantém as credenciais seguras exclusivamente no ambiente Node.js / Serverless
import fs from 'node:fs'
import path from 'node:path'

const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'server/correios/.correios_config.json')

// Mapa em memória de configurações por empresa/loja (store_id)
const storeConfigs = new Map()

// Carrega configurações persistidas do disco na inicialização
function loadPersistedConfigs() {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
      if (raw.trim()) {
        const parsed = JSON.parse(raw)
        for (const [key, val] of Object.entries(parsed)) {
          storeConfigs.set(key, val)
        }
      }
    }
  } catch (err) {
    console.warn('[Correios Config] Aviso ao ler arquivo de configuração local:', err.message)
  }
}

// Salva configurações no disco
function persistConfigs() {
  try {
    const obj = {}
    for (const [key, val] of storeConfigs.entries()) {
      obj[key] = val
    }
    const dir = path.dirname(CONFIG_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8')
  } catch (err) {
    console.warn('[Correios Config] Aviso ao persistir arquivo de configuração local:', err.message)
  }
}

// Inicializa lendo do disco
loadPersistedConfigs()

export const CORREIOS_SERVICES = [
  {
    id: 'PAC',
    code: '03298',
    name: 'PAC',
    description: 'Econômico com entrega em todo o Brasil',
    requisicao: 'PAC'
  },
  {
    id: 'SEDEX',
    code: '03220',
    name: 'SEDEX',
    description: 'Expresso com entrega rápida prioritária',
    requisicao: 'SEDEX'
  }
]

export function maskSecret(secret) {
  if (!secret || typeof secret !== 'string') return ''
  return '••••••••••••••••'
}

/**
 * Retorna as configurações ativas para a empresa/loja especificada
 * Prioridade: Configuração dinâmica salva > Variáveis de ambiente
 * @param {string} storeId
 * @returns {object}
 */
export function getStoreCorreiosConfig(storeId = 'default') {
  if (storeConfigs.size === 0) {
    loadPersistedConfigs()
  }
  const custom = storeConfigs.get(storeId) || {}

  return {
    storeId,
    enabled: custom.enabled !== undefined ? Boolean(custom.enabled) : true,
    usuario: custom.usuario || process.env.CORREIOS_USUARIO || '',
    codigoAcesso: custom.codigoAcesso || process.env.CORREIOS_CODIGO_ACESSO || '',
    contrato: custom.contrato || process.env.CORREIOS_CONTRATO || '',
    dr: custom.dr || process.env.CORREIOS_DR || '10',
    cepOrigem: (custom.cepOrigem || process.env.CORREIOS_CEP_ORIGEM || '70673631').replace(/\D/g, ''),
    pacEnabled: custom.pacEnabled !== undefined ? Boolean(custom.pacEnabled) : true,
    sedexEnabled: custom.sedexEnabled !== undefined ? Boolean(custom.sedexEnabled) : true,
    authUrl: 'https://api.correios.com.br/token/v1/autentica/contrato',
    precoUrl: 'https://api.correios.com.br/preco/v1/nacional',
    prazoUrl: 'https://api.correios.com.br/prazo/v1/nacional',
    timeoutMs: 8000,
  }
}

/**
 * Atualiza as configurações de uma empresa/loja específica em memória
 * @param {string} storeId
 * @param {object} updates
 */
export function setStoreCorreiosConfig(storeId = 'default', updates = {}) {
  const current = getStoreCorreiosConfig(storeId)

  // Se o código de acesso recebido for a máscara ou vazio, preserva o existente
  let finalCodigoAcesso = current.codigoAcesso
  if (updates.codigoAcesso && updates.codigoAcesso !== '••••••••••••••••' && !updates.codigoAcesso.startsWith('••')) {
    finalCodigoAcesso = updates.codigoAcesso
  }

  const merged = {
    ...current,
    ...updates,
    codigoAcesso: finalCodigoAcesso,
    cepOrigem: updates.cepOrigem ? String(updates.cepOrigem).replace(/\D/g, '') : current.cepOrigem
  }

  storeConfigs.set(storeId, merged)
  persistConfigs()
  return merged
}

export const CORREIOS_CONFIG = {
  get usuario() {
    return getStoreCorreiosConfig('default').usuario
  },
  get codigoAcesso() {
    return getStoreCorreiosConfig('default').codigoAcesso
  },
  get contrato() {
    return getStoreCorreiosConfig('default').contrato
  },
  get dr() {
    return getStoreCorreiosConfig('default').dr
  },
  get cepOrigem() {
    return getStoreCorreiosConfig('default').cepOrigem
  },
  get enabled() {
    return getStoreCorreiosConfig('default').enabled
  },
  get pacEnabled() {
    return getStoreCorreiosConfig('default').pacEnabled
  },
  get sedexEnabled() {
    return getStoreCorreiosConfig('default').sedexEnabled
  },
  authUrl: 'https://api.correios.com.br/token/v1/autentica/contrato',
  precoUrl: 'https://api.correios.com.br/preco/v1/nacional',
  prazoUrl: 'https://api.correios.com.br/prazo/v1/nacional',
  timeoutMs: 8000,
}

export function hasCorreiosCredentials(storeId = 'default') {
  const cfg = getStoreCorreiosConfig(storeId)
  return Boolean(
    cfg.enabled &&
    cfg.usuario &&
    cfg.codigoAcesso &&
    cfg.contrato
  )
}
