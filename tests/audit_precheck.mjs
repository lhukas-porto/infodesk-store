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

console.log('=== VERIFICAÇÃO DE AMBIENTE SUPABASE ===')
console.log('Supabase URL:', url)
console.log('Chave Anon presente:', !!key)

const supabase = createClient(url, key)

async function inspect() {
  const tables = ['products', 'categories', 'customers', 'orders', 'store_settings', 'customer_audit_logs']
  
  for (const t of tables) {
    try {
      const { data, count, error } = await supabase.from(t).select('*', { count: 'exact' }).limit(5)
      if (error) {
        console.log(`❌ Tabela [${t}]: Erro (${error.code || error.message})`)
      } else {
        console.log(`✅ Tabela [${t}]: OK, total registros = ${count}, amostra retornada = ${data?.length}`)
        if (data && data.length > 0) {
          console.log(`   Colunas detectadas em [${t}]:`, Object.keys(data[0]).join(', '))
        }
      }
    } catch (err) {
      console.log(`⚠️ Tabela [${t}]: Exceção (${err.message})`)
    }
  }
}

inspect().catch(err => {
  console.error('Falha geral na inspeção:', err)
  process.exit(1)
})
