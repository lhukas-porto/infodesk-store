import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { DEFAULT_PRIMARY_DOMAIN, normalizeHostname } from './tenantResolver.js'

export const DEFAULT_MARKETING_SETTINGS = {
  primary_domain: 'minhaloja.com.br',
  default_seo_title: 'Minha Loja — Tudo o que você precisa em um só lugar',
  default_seo_description: 'Eletrônicos, tecnologia, utilidades e escritório com entrega rápida dos Correios e pagamento seguro via Pix, Cartão e Boleto.',
  default_share_image: '',
  analytics_enabled: false,
  analytics_measurement_id: '',
  analytics_status: 'disabled', // 'disabled', 'pending', 'active', 'error'
  search_console_enabled: false,
  search_console_verification: '',
  search_console_status: 'disabled',
  merchant_enabled: false,
  merchant_status: 'disabled',
  merchant_auto_include: true,
  merchant_require_approval: false,
  whatsapp_enabled: true,
  whatsapp_number: '5561996272630',
  whatsapp_message: 'Olá! Estava navegando na loja e gostaria de tirar uma dúvida.',
  social_sharing_enabled: true,
  social_links: {
    instagram: '',
    tiktok: '',
    youtube: '',
    facebook: ''
  }
}

/**
 * Validação rigorosa do formato de ID do Google Analytics 4 (G-XXXXXXXXXX)
 */
export function validateGaMeasurementId(id) {
  if (!id) return { valid: false, error: 'ID de medição não preenchido.' }
  const clean = String(id).trim().toUpperCase()
  const regex = /^G-[A-Z0-9]{6,14}$/
  if (!regex.test(clean)) {
    return {
      valid: false,
      error: 'Formato inválido. O ID do GA4 deve iniciar com "G-" seguido de letras e números (Ex: G-A1B2C3D4E5).'
    }
  }
  return { valid: true, value: clean }
}

/**
 * Extrai e valida o token da meta tag do Google Search Console
 * Aceita tanto a tag HTML completa (<meta name="google-site-verification" content="XYZ" />) quanto o código puro
 */
export function extractSearchConsoleVerification(input) {
  if (!input) return ''
  const trimmed = String(input).trim()

  if (trimmed.includes('<meta') || trimmed.includes('content=')) {
    const match = trimmed.match(/content=["']([^"']+)["']/i)
    if (match && match[1]) {
      return match[1].trim()
    }
  }

  return trimmed.replace(/[<>"']/g, '')
}

/**
 * Carrega as configurações de SEO & Divulgação da loja ativa (White-Label)
 */
export async function fetchMarketingSettings(paramA, paramB) {
  // Suporte flexível para fetchMarketingSettings() ou fetchMarketingSettings(tenantId)
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Tenta carregar da tabela padrão store_settings
      const { data: storeSetting } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'marketing_settings')
        .maybeSingle()

      if (storeSetting?.value && typeof storeSetting.value === 'object') {
        return {
          ...DEFAULT_MARKETING_SETTINGS,
          ...storeSetting.value,
          social_links: {
            ...DEFAULT_MARKETING_SETTINGS.social_links,
            ...(storeSetting.value.social_links || {})
          }
        }
      }

      // 2. Fallback para tenant_marketing_settings
      const { data: tenantData } = await supabase
        .from('tenant_marketing_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (tenantData) {
        return {
          ...DEFAULT_MARKETING_SETTINGS,
          ...tenantData,
          social_links: {
            ...DEFAULT_MARKETING_SETTINGS.social_links,
            ...(typeof tenantData.social_links === 'object' ? tenantData.social_links : {})
          }
        }
      }
    } catch (err) {
      console.warn('MarketingService: Erro ao buscar configurações no Supabase:', err)
    }
  }

  // Fallback para localStorage
  try {
    const saved = localStorage.getItem('infodesk_marketing_settings') ||
      localStorage.getItem('marketing_settings_default') ||
      localStorage.getItem('marketing_settings_emp_infodesk')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        ...DEFAULT_MARKETING_SETTINGS,
        ...parsed,
        social_links: { ...DEFAULT_MARKETING_SETTINGS.social_links, ...(parsed.social_links || {}) }
      }
    }
  } catch {}

  return { ...DEFAULT_MARKETING_SETTINGS }
}

/**
 * Salva as configurações de SEO & Divulgação da loja (White-Label)
 */
export async function saveMarketingSettings(paramA, paramB) {
  // Suporta saveMarketingSettings(settings) ou saveMarketingSettings(tenantId, settings)
  const settings = (paramB && typeof paramB === 'object') ? paramB : paramA || {}

  const payload = {
    primary_domain: normalizeHostname(settings.primary_domain || DEFAULT_PRIMARY_DOMAIN),
    default_seo_title: settings.default_seo_title?.trim() || '',
    default_seo_description: settings.default_seo_description?.trim() || '',
    default_share_image: settings.default_share_image?.trim() || '',
    analytics_enabled: Boolean(settings.analytics_enabled),
    analytics_measurement_id: settings.analytics_measurement_id?.trim()?.toUpperCase() || '',
    analytics_status: settings.analytics_status || (settings.analytics_enabled ? 'active' : 'disabled'),
    search_console_enabled: Boolean(settings.search_console_enabled),
    search_console_verification: extractSearchConsoleVerification(settings.search_console_verification),
    search_console_status: settings.search_console_status || (settings.search_console_enabled ? 'active' : 'disabled'),
    merchant_enabled: Boolean(settings.merchant_enabled),
    merchant_status: settings.merchant_status || (settings.merchant_enabled ? 'active' : 'disabled'),
    merchant_auto_include: settings.merchant_auto_include !== false,
    merchant_require_approval: Boolean(settings.merchant_require_approval),
    whatsapp_enabled: settings.whatsapp_enabled !== false,
    whatsapp_number: String(settings.whatsapp_number || '').replace(/\D/g, ''),
    whatsapp_message: settings.whatsapp_message?.trim() || '',
    social_sharing_enabled: settings.social_sharing_enabled !== false,
    social_links: settings.social_links || {},
    updated_at: new Date().toISOString()
  }

  // Validação do GA4 caso ativado
  if (payload.analytics_enabled && payload.analytics_measurement_id) {
    const checkGa = validateGaMeasurementId(payload.analytics_measurement_id)
    if (!checkGa.valid) {
      payload.analytics_status = 'error'
    }
  } else if (!payload.analytics_enabled) {
    payload.analytics_status = 'disabled'
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Salva na tabela universal store_settings
      await supabase
        .from('store_settings')
        .upsert({
          key: 'marketing_settings',
          value: payload,
          updated_at: payload.updated_at
        }, { onConflict: 'key' })

      // 2. Mantém compatibilidade com tenant_marketing_settings se a tabela existir
      try {
        await supabase
          .from('tenant_marketing_settings')
          .upsert({
            tenant_id: 'default',
            ...payload
          }, { onConflict: 'tenant_id' })
      } catch {}
    } catch (err) {
      console.warn('MarketingService: Exceção ao salvar no Supabase:', err)
    }
  }

  // Persistência local segura
  try {
    const jsonStr = JSON.stringify(payload)
    localStorage.setItem('infodesk_marketing_settings', jsonStr)
    localStorage.setItem('marketing_settings_default', jsonStr)
    localStorage.setItem('marketing_settings_emp_infodesk', jsonStr)
    return { success: true, data: payload }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * Constrói URL com parâmetros UTM a partir de uma URL base arbitrária
 */
export function buildUtmUrl(baseUrl, params = {}) {
  try {
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, String(v))
    })
    return url.toString()
  } catch {
    const query = Object.entries(params)
      .filter(([_, v]) => Boolean(v))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
    if (!query) return baseUrl
    return baseUrl.includes('?') ? `${baseUrl}&${query}` : `${baseUrl}?${query}`
  }
}

/**
 * Gera URL de link rastreado completo com parâmetros UTM
 */
export function buildTrackableUrl({
  domain = DEFAULT_PRIMARY_DOMAIN,
  path = '',
  utmSource = '',
  utmMedium = '',
  utmCampaign = '',
  utmContent = '',
  utmTerm = ''
}) {
  const host = normalizeHostname(domain) || DEFAULT_PRIMARY_DOMAIN
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : ''

  const url = new URL(`${protocol}://${host}${cleanPath}`)

  if (utmSource) url.searchParams.set('utm_source', utmSource.trim().toLowerCase())
  if (utmMedium) url.searchParams.set('utm_medium', utmMedium.trim().toLowerCase())
  if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign.trim().toLowerCase())
  if (utmContent) url.searchParams.set('utm_content', utmContent.trim())
  if (utmTerm) url.searchParams.set('utm_term', utmTerm.trim())

  return url.toString()
}

export const getMarketingSettings = fetchMarketingSettings

/**
 * Calcula métricas reais de marketing e pedidos por UTM para a empresa ativa
 */
export async function getTenantMarketingAnalytics(tenantId = null, orders = []) {
  const sourceMap = {}
  const campaignMap = {}
  let totalTrackedRevenue = 0
  let totalTrackedOrders = 0

  orders.forEach(o => {
    const utm = o.utm_data || {}
    const source = (o.utm_source || utm.source || 'direto').toLowerCase()
    const campaign = (o.utm_campaign || utm.campaign || 'organico').toLowerCase()
    const val = parseFloat(o.total) || 0

    if (!sourceMap[source]) sourceMap[source] = { source, count: 0, revenue: 0 }
    sourceMap[source].count += 1
    sourceMap[source].revenue += val

    if (!campaignMap[campaign]) campaignMap[campaign] = { campaign, count: 0, revenue: 0 }
    campaignMap[campaign].count += 1
    campaignMap[campaign].revenue += val

    if (source !== 'direto') {
      totalTrackedOrders += 1
      totalTrackedRevenue += val
    }
  })

  return {
    totalTrackedOrders,
    totalTrackedRevenue,
    sources: Object.values(sourceMap).sort((a, b) => b.revenue - a.revenue),
    campaigns: Object.values(campaignMap).sort((a, b) => b.revenue - a.revenue)
  }
}
