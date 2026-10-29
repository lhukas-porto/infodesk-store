// Endpoint Serverless: Callback OAuth do Mercado Livre
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'
  return createClient(url, key)
}

export default async function handler(req, res) {
  try {
    const urlObj = new URL(req.url, 'http://localhost')
    const code = urlObj.searchParams.get('code') || req.query?.code
    const errorParam = urlObj.searchParams.get('error') || req.query?.error

    if (errorParam || !code) {
      res.statusCode = 302
      res.setHeader('Location', '/#admin?meli=error&reason=' + encodeURIComponent(errorParam || 'codigo_ausente'))
      res.end()
      return
    }

    const clientId = process.env.MERCADOLIVRE_CLIENT_ID || '7098003394262901'
    const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET
    const redirectUri = process.env.MERCADOLIVRE_REDIRECT_URI || 'https://infodesk.net.br/api/mercadolivre/callback'

    if (!clientSecret) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end('<h3>Erro: MERCADOLIVRE_CLIENT_SECRET não configurado na Vercel.</h3>')
      return
    }

    // Troca do código de autorização por access_token e refresh_token
    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      }).toString()
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('[MercadoLivre Callback] Erro ao trocar token:', tokenData)
      res.statusCode = 302
      res.setHeader('Location', '/#admin?meli=error&reason=' + encodeURIComponent(tokenData.message || 'token_exchange_failed'))
      res.end()
      return
    }

    // Buscar dados do usuário conectado para exibir no painel
    let nickname = ''
    let email = ''
    try {
      const userRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        nickname = userData.nickname || ''
        email = userData.email || ''
      }
    } catch (e) {
      console.warn('[MercadoLivre Callback] Não foi possível obter nickname do usuário:', e.message)
    }

    // Calcular data de expiração (expires_in vem em segundos, geralmente 21600s = 6 horas)
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 21600) * 1000).toISOString()

    // Salvar no Supabase na tabela mercadolivre_integrations
    const supabase = getSupabaseClient()
    if (supabase) {
      const payload = {
        store_id: 'default',
        enabled: true,
        user_id: tokenData.user_id,
        nickname: nickname,
        email: email,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
        scope: tokenData.scope,
        updated_at: new Date().toISOString()
      }

      const { error: upsertError } = await supabase
        .from('mercadolivre_integrations')
        .upsert(payload, { onConflict: 'store_id' })

      if (upsertError) {
        console.error('[MercadoLivre Callback] Erro ao salvar no Supabase:', upsertError)
      }
    }

    // Redireciona com sucesso para a aba do painel admin
    res.statusCode = 302
    res.setHeader('Location', '/#admin?meli=success&user=' + encodeURIComponent(nickname || tokenData.user_id))
    res.end()
  } catch (error) {
    console.error('[MercadoLivre Callback] Exceção:', error)
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end('<h3>Erro interno ao processar autorização do Mercado Livre.</h3><p>' + error.message + '</p>')
  }
}

