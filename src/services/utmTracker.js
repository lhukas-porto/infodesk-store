import { supabase, isSupabaseConfigured } from './supabaseClient.js'
import { DEFAULT_TENANT_ID } from './tenantResolver.js'

const UTM_STORAGE_KEY = 'infodesk_utm_tracking'

/**
 * Captura parâmetros UTM e origem da sessão no primeiro acesso
 */
export function captureUtmParameters(tenantId = DEFAULT_TENANT_ID) {
  if (typeof window === 'undefined') return null

  try {
    const params = new URLSearchParams(window.location.search)
    const utmSource = params.get('utm_source')
    const utmMedium = params.get('utm_medium')
    const utmCampaign = params.get('utm_campaign')
    const utmContent = params.get('utm_content')
    const utmTerm = params.get('utm_term')
    const referrer = document.referrer || ''
    const landingPage = window.location.href

    // Se houver parâmetros UTM na URL
    if (utmSource || utmMedium || utmCampaign) {
      const trackingData = {
        tenant_id: tenantId,
        utm_source: utmSource ? utmSource.toLowerCase().trim() : '',
        utm_medium: utmMedium ? utmMedium.toLowerCase().trim() : '',
        utm_campaign: utmCampaign ? utmCampaign.toLowerCase().trim() : '',
        utm_content: utmContent ? utmContent.trim() : '',
        utm_term: utmTerm ? utmTerm.trim() : '',
        referrer,
        landing_page: landingPage,
        first_visited_at: new Date().toISOString(),
        last_visited_at: new Date().toISOString()
      }

      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(trackingData))

      // Registra evento no Supabase em segundo plano
      logAnalyticsEvent(tenantId, 'session_start', trackingData)
      return trackingData
    }

    // Se já existia um UTM anterior na sessão, atualiza apenas timestamp
    const existing = sessionStorage.getItem(UTM_STORAGE_KEY)
    if (existing) {
      const parsed = JSON.parse(existing)
      parsed.last_visited_at = new Date().toISOString()
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(parsed))
      return parsed
    }

    // Caso de acesso direto/orgânico sem UTM
    const directData = {
      tenant_id: tenantId,
      utm_source: referrer ? 'referral' : 'direto',
      utm_medium: referrer ? 'referral' : 'organico',
      utm_campaign: 'organico',
      utm_content: '',
      utm_term: '',
      referrer,
      landing_page: landingPage,
      first_visited_at: new Date().toISOString(),
      last_visited_at: new Date().toISOString()
    }
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(directData))
    return directData
  } catch (err) {
    console.warn('UtmTracker: Erro ao capturar parâmetros de origem:', err)
    return null
  }
}

/**
 * Retorna os dados de UTM armazenados para vincular ao pedido
 */
export function getStoredUtmData() {
  if (typeof window === 'undefined') return null
  try {
    const saved = sessionStorage.getItem(UTM_STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/**
 * Grava evento no banco de dados de métricas do tenant
 */
export async function logAnalyticsEvent(tenantId, eventName, details = {}) {
  if (!isSupabaseConfigured || !supabase) return
  try {
    const payload = {
      tenant_id: tenantId || DEFAULT_TENANT_ID,
      event_name: eventName,
      utm_source: details.utm_source || null,
      utm_medium: details.utm_medium || null,
      utm_campaign: details.utm_campaign || null,
      utm_content: details.utm_content || null,
      utm_term: details.utm_term || null,
      referrer: details.referrer || null,
      landing_page: details.landing_page || null,
      product_id: details.product_id || null,
      order_id: details.order_id || null,
      value: details.value ? parseFloat(details.value) : null
    }

    await supabase.from('tenant_analytics_events').insert([payload])
  } catch {
    // Falha silenciosa para não travar navegação
  }
}
