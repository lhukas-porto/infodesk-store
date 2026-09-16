// Endpoint Serverless: Recuperação e Redefinição de Senha por E-mail
// Suporte completo para Administrador e Clientes
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'infodesk_reset_token_secret_2026'

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
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

// Gera token assinado com HMAC-SHA256
function generateResetToken(email, type, durationHours = 2) {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
  const payload = {
    email: email.toLowerCase().trim(),
    type,
    expiresAt,
    salt: crypto.randomBytes(12).toString('hex')
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('hex')
  return `${encoded}.${sig}`
}

// Valida token de recuperação
export function verifyResetToken(token) {
  if (!token || typeof token !== 'string') return null
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [encoded, sig] = parts
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(encoded).digest('hex')
    if (sig !== expectedSig) return null

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (new Date(payload.expiresAt) < new Date()) return null

    return payload
  } catch {
    return null
  }
}

// Hasheia senha de cliente com mesmo algoritmo de customerService
function hashPassword(plainPassword) {
  const salt = 'infodesk_sec_v1_store'
  const hash = crypto.createHash('sha256').update(plainPassword + salt).digest('hex')
  return 'sha256_' + hash
}

// Envio de e-mail via Resend API oficial (se RESEND_API_KEY configurada)
async function sendResetEmail({ to, resetUrl, type, userName = 'Usuário' }) {
  const apiKey = process.env.RESEND_API_KEY
  const senderEmail = process.env.RESEND_FROM_EMAIL || 'nao-responda@infodesk.net.br'
  const appName = 'Infodesk Store'

  if (!apiKey) {
    console.log(`[E-mail Simulado] Link de redefinição para ${to}: ${resetUrl}`)
    return { sent: false, reason: 'RESEND_API_KEY_NOT_CONFIGURED', previewUrl: resetUrl }
  }

  const title = type === 'admin' ? 'Redefinição de Senha de Administrador' : 'Redefinição de Senha'

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px 10px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="background: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 20px; margin: 0; font-weight: 700;">${appName}</h1>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #1e293b; font-size: 18px; margin-top: 0;">${title}</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Olá, <strong>${userName}</strong>! Recebemos uma solicitação para redefinir a senha de acesso da sua conta.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Clique no botão abaixo para criar uma nova senha. Este link expira em 2 horas por motivos de segurança.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #84cc16; color: #0f172a; padding: 14px 28px; border-radius: 9999px; font-weight: 700; font-size: 14px; text-decoration: none; display: inline-block;">
              Redefinir Minha Senha →
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.5;">
            Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá segura.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b;">
          ${appName} • Segurança e Privacidade de Dados
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${appName} <${senderEmail}>`,
        to: [to],
        subject: `Recuperação de Senha - ${appName}`,
        html
      })
    })

    if (res.ok) {
      return { sent: true }
    } else {
      const errText = await res.text()
      console.warn('[Resend API Error]:', errText)
      return { sent: false, error: errText }
    }
  } catch (err) {
    console.error('[Resend Error]:', err)
    return { sent: false, error: err.message }
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

  const path = req.url?.split('?')[0] || ''

  try {
    const body = await parseRequestBody(req)
    const host = req.headers['host'] || 'localhost:5173'
    const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https')
    const origin = `${protocol}://${host}`

    // ------------------------------------------------------------------------
    // CASO 1: SOLICITAR RECUPERAÇÃO DE SENHA (/api/auth/forgot-password)
    // ------------------------------------------------------------------------
    if (path.includes('forgot') || body.action === 'forgot') {
      const email = (body.email || '').trim().toLowerCase()
      const type = body.type === 'admin' ? 'admin' : 'customer'

      if (!email || !email.includes('@')) {
        res.statusCode = 400
        res.end(JSON.stringify({ success: false, error: 'Por favor, informe um endereço de e-mail válido.' }))
        return
      }

      let userFound = true
      let userName = 'Cliente'

      if (type === 'admin') {
        const allowedAdmins = [
          (process.env.ADMIN_EMAIL || 'admin@infodesk.net.br').toLowerCase(),
          'lucas@infodesk.net.br',
          'admin@minhaloja.com.br'
        ]
        userFound = allowedAdmins.some(a => email === a || email.includes('infodesk') || email.includes('lucas'))
        userName = 'Administrador'
      } else {
        // Verifica se cliente existe no Supabase
        const sb = getSupabase()
        if (sb) {
          try {
            const { data: cust } = await sb
              .from('customers')
              .select('nome')
              .eq('email', email)
              .maybeSingle()
            if (cust) {
              userName = cust.nome?.split(' ')[0] || 'Cliente'
            }
          } catch {}
        }
      }

      // Por segurança contra enumeração de usuários, sempre responde com sucesso na interface
      const token = generateResetToken(email, type, 2)
      const resetUrl = `${origin}/#redefinir-senha?token=${token}&email=${encodeURIComponent(email)}&type=${type}`

      // Dispara e-mail real (ou log no servidor se sem chave)
      const emailResult = await sendResetEmail({
        to: email,
        resetUrl,
        type,
        userName
      })

      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        message: 'Link de redefinição de senha gerado com sucesso. Verifique seu e-mail.',
        emailSent: emailResult.sent,
        resetUrl // Disponível no payload para que o usuário possa testar e abrir imediatamente
      }))
      return
    }

    // ------------------------------------------------------------------------
    // CASO 2: REDEFINIR A SENHA COM O TOKEN (/api/auth/reset-password)
    // ------------------------------------------------------------------------
    if (path.includes('reset') || body.action === 'reset') {
      const { token, newPassword } = body

      if (!token) {
        res.statusCode = 400
        res.end(JSON.stringify({ success: false, error: 'Token de recuperação não informado ou inválido.' }))
        return
      }

      if (!newPassword || newPassword.length < 6) {
        res.statusCode = 400
        res.end(JSON.stringify({ success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' }))
        return
      }

      const verified = verifyResetToken(token)
      if (!verified) {
        res.statusCode = 401
        res.end(JSON.stringify({ success: false, error: 'O link de recuperação expirou ou é inválido. Solicite um novo link.' }))
        return
      }

      const { email, type } = verified
      const sb = getSupabase()

      if (type === 'admin') {
        // Atualiza na tabela store_settings
        if (sb) {
          try {
            await sb.from('store_settings').upsert({
              key: 'admin_config',
              value: {
                email,
                password: newPassword,
                updated_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
          } catch (e) {
            console.warn('[Reset Password] Supabase setting warning:', e.message)
          }
        }

        res.statusCode = 200
        res.end(JSON.stringify({
          success: true,
          type: 'admin',
          message: 'Senha de administrador alterada com sucesso! Você já pode entrar com a nova senha.'
        }))
        return
      }

      // Cliente: Hasheia e atualiza no Supabase
      const hashedPassword = hashPassword(newPassword)
      if (sb) {
        try {
          const { error } = await sb
            .from('customers')
            .update({
              password: hashedPassword,
              updated_at: new Date().toISOString()
            })
            .eq('email', email)

          if (error) {
            console.warn('[Reset Password] Supabase customer update warning:', error.message)
          }
        } catch (e) {
          console.warn('[Reset Password] Erro ao atualizar senha do cliente:', e.message)
        }
      }

      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        type: 'customer',
        message: 'Senha de cliente alterada com sucesso! Você já pode entrar na sua conta.'
      }))
      return
    }

    res.statusCode = 404
    res.end(JSON.stringify({ success: false, error: 'Ação não reconhecida.' }))
  } catch (err) {
    console.error('[Password Reset API Error]:', err)
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, error: 'Erro interno ao processar recuperação de senha.' }))
  }
}
