// Script de Seed / Migração Idempotente dos Dados da Empresa
// Executado com: node server/company/seedCompany.js
// Salva o primeiro registro em 'store_settings' (key: 'company_data') no Supabase
// Caso já exista, NÃO sobrescreve para respeitar edições feitas pelo usuário no painel

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://wcddxzbjttfxrercadlb.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_isknr_vuFBdzGxse_181XA_k3NFkhJV'

export function getInitialLogoBase64() {
  try {
    const logoPath = path.resolve(__dirname, '../../src/assets/brand/infodesk-logo-clean.png')
    if (fs.existsSync(logoPath)) {
      const buffer = fs.readFileSync(logoPath)
      return `data:image/png;base64,${buffer.toString('base64')}`
    }
  } catch (err) {
    console.warn('[Seed] Aviso: Não foi possível ler logo local:', err.message)
  }
  return ''
}

export const INITIAL_INFODESK_DATA = {
  razaoSocial: 'INFODESK INFORMÁTICA LTDA',
  nomeFantasia: 'Infodesk Store',
  cnpj: '15.266.716/0001-02',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  emailPrincipal: 'lucas@infodesk.net.br',
  emailAtendimento: 'contato@infodesk.net.br',
  telefone: '(61) 3033-5373',
  whatsapp: '(61) 9 9627-2630',
  site: 'https://infodesk.net.br',
  cep: '70673-631',
  endereco: 'CLSW 304 Bloco A',
  numero: 'Sala 108',
  complemento: 'Bloco A Sala 108',
  bairro: 'Sudoeste',
  cidade: 'Brasília',
  estado: 'DF',
  pais: 'Brasil',
  logo: getInitialLogoBase64(),
  logoAlt: 'Infodesk Store',
  favicon: '/favicon.jpg',
  descricaoCurta: 'Variedades, eletrônicos, escritório, utilidades e tecnologia com frete rápido e atendimento especializado.'
}

export async function runCompanySeed() {
  console.log('🌱 Verificando registro inicial de Dados da Empresa...')

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.log('⚠️ Supabase não configurado. Utilizando fallback local.')
    return { success: false, reason: 'SUPABASE_NOT_CONFIGURED' }
  }

  try {
    // 1. Verifica se a chave 'company_data' já existe no banco
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/store_settings?key=eq.company_data&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })

    if (!checkRes.ok) {
      console.warn(`[Seed] Erro HTTP ao consultar store_settings: ${checkRes.status}`)
      return { success: false, reason: 'HTTP_ERROR', status: checkRes.status }
    }

    const rows = await checkRes.json()

    // Se já existe, NÃO sobrescreve (idempotência e respeito a alterações do painel)
    if (rows && rows.length > 0) {
      console.log('✅ Registro "company_data" já existe no banco de dados. Nenhuma sobrescrita necessária.')
      return { success: true, alreadyExisted: true, data: rows[0].value }
    }

    // 2. Não existe: cadastra o primeiro registro com os dados preservados da Infodesk
    console.log('📦 Cadastrando dados da Infodesk no banco de dados...')
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/store_settings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        key: 'company_data',
        value: INITIAL_INFODESK_DATA,
        updated_at: new Date().toISOString()
      })
    })

    if (!insertRes.ok) {
      const errText = await insertRes.text()
      console.error('[Seed] Falha ao inserir registro:', errText)
      return { success: false, reason: 'INSERT_ERROR', details: errText }
    }

    const inserted = await insertRes.json()
    console.log('🎉 Migração de Dados da Empresa concluída com SUCESSO! Registro inicial da Infodesk ativo no Supabase.')
    return { success: true, alreadyExisted: false, data: inserted }
  } catch (err) {
    console.error('[Seed] Exceção durante migração:', err.message)
    return { success: false, reason: 'EXCEPTION', error: err.message }
  }
}

if (process.argv[1] && process.argv[1].endsWith('seedCompany.js')) {
  runCompanySeed().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}
