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

async function dumpExistingIds() {
  console.log('=== REGISTRO DE DADOS REAIS EXISTENTES (PRESERVAÇÃO INTEGRAL) ===')
  
  const { data: prods } = await supabase.from('products').select('id, name, ean')
  console.log('Produtos Reais:', JSON.stringify(prods, null, 2))

  const { data: custs } = await supabase.from('customers').select('id, nome, email, cpf')
  console.log('Clientes Reais:', JSON.stringify(custs, null, 2))

  const { data: ords } = await supabase.from('orders').select('id, customer_name, total, status')
  console.log('Pedidos Reais:', JSON.stringify(ords, null, 2))

  const { data: settings } = await supabase.from('store_settings').select('key')
  console.log('Settings Reais:', JSON.stringify(settings, null, 2))
}

dumpExistingIds().catch(console.error)
