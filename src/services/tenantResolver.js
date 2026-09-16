// ==========================================================
// STORE CONFIG & DOMAIN RESOLVER (WHITE-LABEL TURNKEY)
// Gerencia a resolução de domínio, URLs canônicas e identidade da loja
// ==========================================================

export const DEFAULT_TENANT_ID = 'default'
export const DEFAULT_PRIMARY_DOMAIN = 'minhaloja.com.br'

/**
 * Normaliza qualquer hostname removendo protocolo, porta e prefixo 'www.'
 */
export function normalizeHostname(rawHost) {
  if (!rawHost) return ''
  let host = String(rawHost).trim().toLowerCase()

  // Remove protocolo se presente
  if (host.startsWith('http://') || host.startsWith('https://')) {
    try {
      const u = new URL(host)
      host = u.hostname
    } catch {
      host = host.replace(/^https?:\/\//, '')
    }
  }

  // Remove porta (ex: localhost:5173 -> localhost)
  if (host.includes(':')) {
    host = host.split(':')[0]
  }

  // Remove www.
  if (host.startsWith('www.')) {
    host = host.slice(4)
  }

  return host
}

/**
 * Identifica se o hostname atual é um ambiente de desenvolvimento ou preview local
 */
export function isDevEnvironment(hostname) {
  const h = normalizeHostname(hostname)
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.endsWith('.local')
}

/**
 * Obtém o domínio principal canônico configurado para esta instância white-label
 */
export function getStorePrimaryDomain() {
  if (typeof window !== 'undefined') {
    try {
      // 1. Tenta carregar das configurações de marketing salvas
      const mkt = localStorage.getItem('marketing_settings_default') || localStorage.getItem('marketing_settings_emp_infodesk')
      if (mkt) {
        const parsed = JSON.parse(mkt)
        if (parsed.primary_domain) return normalizeHostname(parsed.primary_domain)
      }
      // 2. Tenta carregar dos dados da empresa (white-label desacoplado)
      const comp = localStorage.getItem('store_company_data') || localStorage.getItem('infodesk_company_data')
      if (comp) {
        const parsedComp = JSON.parse(comp)
        if (parsedComp.dominio || parsedComp.site) return normalizeHostname(parsedComp.dominio || parsedComp.site)
      }
      // 3. Fallback para o próprio hostname acessado
      if (!isDevEnvironment(window.location.hostname)) {
        return normalizeHostname(window.location.hostname)
      }
    } catch {}
  }
  return DEFAULT_PRIMARY_DOMAIN
}

/**
 * Resolve a identidade e domínio da loja ativa (White-Label)
 */
export async function resolveTenantFromHostname(rawHost = null) {
  const currentHost = rawHost || (typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  const host = normalizeHostname(currentHost)
  const primaryDomain = getStorePrimaryDomain()

  return {
    tenantId: DEFAULT_TENANT_ID,
    companyId: DEFAULT_TENANT_ID,
    hostname: host,
    primaryHostname: primaryDomain || host,
    isPrimary: host === primaryDomain,
    status: 'active',
    isDevFallback: isDevEnvironment(host),
    matched: true
  }
}

export const resolveCurrentTenant = resolveTenantFromHostname
