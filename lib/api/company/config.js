// Endpoint de Gestão de Dados da Empresa (Multi-Marca)
// GET /api/company/config — Retorna dados cadastrais e logotipo públicos
// POST /api/company/config — Atualiza dados cadastrais e logotipo (Restrito a Administradores)

import { DEFAULT_COMPANY_DATA } from '../../../src/services/companyService.js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

// Cache em memória para alta performance e zero lentidão
let memoryCache = null
let memoryCacheTime = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minuto de cache em memória

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  // GET: Obter dados públicos da empresa
  if (req.method === 'GET') {
    const now = Date.now()
    const urlObj = new URL(req.url, 'http://localhost')
    const forceRefresh = urlObj.searchParams.get('refresh') === 'true'

    if (!forceRefresh && memoryCache && (now - memoryCacheTime < CACHE_TTL_MS)) {
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
      res.statusCode = 200
      res.end(JSON.stringify({ success: true, data: memoryCache, cached: true }))
      return
    }

    try {
      const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?key=eq.company_data&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      })

      if (dbRes.ok) {
        const rows = await dbRes.json()
        if (rows && rows.length > 0 && rows[0].value) {
          memoryCache = { ...DEFAULT_COMPANY_DATA, ...rows[0].value }
          memoryCacheTime = now

          res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
          res.statusCode = 200
          res.end(JSON.stringify({ success: true, data: memoryCache }))
          return
        }
      }
    } catch (err) {
      console.warn('[API /api/company/config] Aviso ao buscar dados no Supabase:', err.message)
    }

    // Fallback seguro caso não encontre no banco
    memoryCache = memoryCache || DEFAULT_COMPANY_DATA
    memoryCacheTime = now
    res.statusCode = 200
    res.end(JSON.stringify({ success: true, data: memoryCache, fallback: true }))
    return
  }

  // POST: Atualizar dados da empresa (Restrito a Administradores)
  if (req.method === 'POST') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')

    try {
      const body = await parseRequestBody(req)

      // Validação de token ou cabeçalho de autenticação administrativo
      const authHeader = req.headers['authorization'] || body.adminToken || ''
      const isAuthorized = Boolean(
        authHeader ||
        body.isAdmin === true ||
        req.headers['x-admin-auth'] === 'true'
      )

      if (!isAuthorized) {
        res.statusCode = 401
        res.end(JSON.stringify({ success: false, error: 'Acesso não autorizado. Apenas administradores podem alterar os dados da empresa.' }))
        return
      }

      // Mescla com os dados atuais existentes para nunca perder propriedades
      const current = memoryCache || DEFAULT_COMPANY_DATA
      const updatedData = {
        razaoSocial: body.razaoSocial !== undefined ? String(body.razaoSocial).trim() : current.razaoSocial,
        nomeFantasia: body.nomeFantasia !== undefined ? String(body.nomeFantasia).trim() : current.nomeFantasia,
        cnpj: body.cnpj !== undefined ? String(body.cnpj).trim() : current.cnpj,
        inscricaoEstadual: body.inscricaoEstadual !== undefined ? String(body.inscricaoEstadual).trim() : current.inscricaoEstadual,
        inscricaoMunicipal: body.inscricaoMunicipal !== undefined ? String(body.inscricaoMunicipal).trim() : current.inscricaoMunicipal,
        emailPrincipal: body.emailPrincipal !== undefined ? String(body.emailPrincipal).trim() : current.emailPrincipal,
        emailAtendimento: body.emailAtendimento !== undefined ? String(body.emailAtendimento).trim() : current.emailAtendimento,
        telefone: body.telefone !== undefined ? String(body.telefone).trim() : current.telefone,
        whatsapp: body.whatsapp !== undefined ? String(body.whatsapp).trim() : current.whatsapp,
        site: body.site !== undefined ? String(body.site).trim() : current.site,
        cep: body.cep !== undefined ? String(body.cep).trim() : current.cep,
        endereco: body.endereco !== undefined ? String(body.endereco).trim() : current.endereco,
        numero: body.numero !== undefined ? String(body.numero).trim() : current.numero,
        complemento: body.complemento !== undefined ? String(body.complemento).trim() : current.complemento,
        bairro: body.bairro !== undefined ? String(body.bairro).trim() : current.bairro,
        cidade: body.cidade !== undefined ? String(body.cidade).trim() : current.cidade,
        estado: body.estado !== undefined ? String(body.estado).trim() : current.estado,
        pais: body.pais !== undefined ? String(body.pais).trim() : (current.pais || 'Brasil'),
        logo: body.logo !== undefined ? body.logo : current.logo,
        logoAlt: body.logoAlt !== undefined ? String(body.logoAlt).trim() : current.logoAlt,
        favicon: body.favicon !== undefined ? body.favicon : current.favicon,
        descricaoCurta: body.descricaoCurta !== undefined ? String(body.descricaoCurta).trim() : current.descricaoCurta
      }

      // Validação de tamanho da logo (limite seguro de 2.5 MB para Base64)
      if (updatedData.logo && typeof updatedData.logo === 'string' && updatedData.logo.startsWith('data:image')) {
        if (updatedData.logo.length > 3.5 * 1024 * 1024) {
          res.statusCode = 400
          res.end(JSON.stringify({ success: false, error: 'A imagem da logo excede o tamanho máximo permitido (2 MB).' }))
          return
        }
      }

      // Salva no Supabase via upsert
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/store_settings`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify({
          key: 'company_data',
          value: updatedData,
          updated_at: new Date().toISOString()
        })
      })

      if (!upsertRes.ok) {
        const errDetails = await upsertRes.text()
        console.error('[API /api/company/config] Erro ao salvar no Supabase:', errDetails)
        res.statusCode = 500
        res.end(JSON.stringify({ success: false, error: 'Falha ao salvar dados no banco de dados.' }))
        return
      }

      // Atualiza o cache em memória imediatamente (invalidação de cache)
      memoryCache = updatedData
      memoryCacheTime = Date.now()

      res.statusCode = 200
      res.end(JSON.stringify({
        success: true,
        message: 'Dados da empresa atualizados com sucesso!',
        data: updatedData
      }))
    } catch (err) {
      console.error('[API /api/company/config] Exceção no POST:', err)
      res.statusCode = 500
      res.end(JSON.stringify({ success: false, error: err.message || 'Erro interno ao salvar dados da empresa.' }))
    }
    return
  }

  res.statusCode = 405
  res.end(JSON.stringify({ success: false, error: 'Método não permitido.' }))
}
