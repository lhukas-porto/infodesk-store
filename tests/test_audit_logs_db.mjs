import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'

let url = process.env.VITE_SUPABASE_URL
let key = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  try {
    const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) url = trimmed.split('=')[1].trim()
      if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) key = trimmed.split('=')[1].trim()
    }
  } catch {}
}

const supabase = createClient(url, key)

async function testAuditLog() {
  console.log('Testando gravação direta na tabela customer_audit_logs...')
  
  const testLog = {
    company_id: 'emp_infodesk',
    actor_name: 'Lucas (Admin)',
    actor_email: 'lucas@infodesk.net.br',
    actor_role: 'super_admin',
    action: 'MIGRATION_VALIDATION',
    details: { note: 'Validação de migração multiempresa concluída com sucesso!' }
  }

  const { data, error } = await supabase.from('customer_audit_logs').insert([testLog]).select().single()
  if (error) {
    console.error('❌ Erro ao gravar log de auditoria:', error.message)
    process.exit(1)
  }

  console.log('✅ Log gravado com sucesso! ID:', data.id)
  
  // Confirma leitura
  const { data: readData, error: readError } = await supabase.from('customer_audit_logs').select('*').eq('id', data.id).single()
  if (readError) {
    console.error('❌ Erro ao ler log:', readError.message)
    process.exit(1)
  }

  console.log('✅ Leitura direta confirmada! Ação:', readData.action, '| Criado em:', readData.created_at)

  // Remove o registro de teste
  await supabase.from('customer_audit_logs').delete().eq('id', data.id)
  console.log('🧹 Registro de validação removido com sucesso!')
}

testAuditLog().catch(console.error)
