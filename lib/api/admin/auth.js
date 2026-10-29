// Endpoint Serverless: Autenticação Administrativa Segura
// POST /api/admin/auth — Validação timing-safe e emissão de token de sessão assinado
import crypto from 'node:crypto'

function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (secret) return secret
  if (process.env.ADMIN_PASSWORD) {
    return crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD + '_infodesk_auth_salt').digest('hex')
  }
  throw new Error('Chave de assinatura administrativa não configurada no ambiente (ADMIN_JWT_SECRET / SUPABASE_SERVICE_ROLE_KEY).')
}

async function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) } catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const secret = getJwtSecret()
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    const expectedSig = crypto.createHmac('sha256', secret).update(parts[0]).digest('hex')

    const sigBuf = Buffer.from(parts[1])
    const expBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null
    }

    if (new Date(payload.expiresAt) < new Date()) return null

    return payload
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }))
    return
  }

  try {
    const body = await parseRequestBody(req)
    const { action, email, password, token, remember } = body

    // 1. Verificação de Token existente
    if (action === 'verify') {
      const verified = verifyAdminToken(token)
      if (!verified) {
        res.statusCode = 401
        res.end(JSON.stringify({ success: false, error: 'Sessão inválida ou expirada.' }))
        return
      }
      res.statusCode = 200
      res.end(JSON.stringify({ success: true, user: verified.user, expiresAt: verified.expiresAt }))
      return
    }

    // 2. Login com credenciais
    if (!password) {
      res.statusCode = 400
      res.end(JSON.stringify({ success: false, error: 'Informe a senha de acesso.' }))
      return
    }

    const inputEmail = (email || '').trim().toLowerCase()
    const defaultAdminEmail = (process.env.ADMIN_EMAIL || 'admin@infodesk.net.br').trim().toLowerCase()
    
    // Lista estrita de e-mails/usuários autorizados (sem correspondência parcial frouxa)
    const validEmails = [
      defaultAdminEmail,
      'lucas@infodesk.net.br',
      'admin',
      'lucas'
    ]

    const emailMatches = validEmails.includes(inputEmail)

    // Validação estrita da senha contra variável de ambiente do servidor
    const configuredAdminPass = process.env.ADMIN_PASSWORD
    if (!configuredAdminPass) {
      console.error('[Admin Auth] Variável ADMIN_PASSWORD não configurada no ambiente.')
      res.statusCode = 500
      res.end(JSON.stringify({ success: false, error: 'Serviço de autenticação temporariamente indisponível. Contate o suporte.' }))
      return
    }

    const targetBuf = Buffer.from(String(configuredAdminPass))
    const userBuf = Buffer.from(String(password))
    const passwordMatches = targetBuf.length === userBuf.length && crypto.timingSafeEqual(targetBuf, userBuf)

    if (!emailMatches || !passwordMatches) {
      res.statusCode = 401
      res.end(JSON.stringify({
        success: false,
        error: 'E-mail ou senha incorretos.'
      }))
      return
    }

    // Emissão de sessão segura assinada
    const durationDays = remember ? 7 : 1
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()

    const user = {
      name: 'Administrador',
      email: inputEmail.includes('@') ? inputEmail : defaultAdminEmail,
      role: 'Super Admin'
    }

    const payload = {
      user,
      expiresAt,
      issuedAt: new Date().toISOString()
    }

    const secret = getJwtSecret()
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = crypto.createHmac('sha256', secret).update(encodedPayload).digest('hex')
    const sessionToken = `${encodedPayload}.${signature}`

    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      token: sessionToken,
      user,
      expiresAt
    }))
  } catch (err) {
    console.error('[Admin Auth Error]:', err.message)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: 'Erro interno ao autenticar.' }))
  }
}
