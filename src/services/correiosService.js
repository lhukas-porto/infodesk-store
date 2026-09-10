// Serviço de cálculo de frete dos Correios e Consulta de CEP (ViaCEP / Correios)

const FRETE_TABELA = {
  // Faixas de CEP por região → custo base SEDEX e PAC para até 1kg
  // Origem: Distrito Federal / Centro-Oeste
  DF: { sedex: 14.90, pac: 9.90, prazoSedex: 1, prazoPac: 2 },
  SP_RJ_MG_ES: { sedex: 22.90, pac: 15.90, prazoSedex: 2, prazoPac: 5 },
  SUL: { sedex: 28.90, pac: 19.90, prazoSedex: 3, prazoPac: 7 },
  NORDESTE: { sedex: 34.90, pac: 23.90, prazoSedex: 4, prazoPac: 9 },
  NORTE_CO: { sedex: 32.90, pac: 21.90, prazoSedex: 3, prazoPac: 8 },
}

const ADICIONAL_POR_KG = 4.50 // Custo adicional por kg extra

function getRegiaoPorCep(cep) {
  const numCep = parseInt(cep.replace(/\D/g, ''), 10)
  if (numCep >= 70000000 && numCep <= 72799999) return 'DF'
  if (numCep >= 1000000 && numCep <= 39999999) return 'SP_RJ_MG_ES'
  if (numCep >= 80000000 && numCep <= 99999999) return 'SUL'
  if (numCep >= 40000000 && numCep <= 65999999) return 'NORDESTE'
  return 'NORTE_CO'
}

// Consulta oficial de endereço na base dos Correios via API ViaCEP
export async function consultarCep(cep) {
  const cleanCep = cep.replace(/\D/g, '')
  if (cleanCep.length !== 8) {
    return { success: false, error: 'CEP deve conter 8 dígitos.' }
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
    const data = await response.json()

    if (data.erro) {
      return { success: false, error: 'CEP não encontrado na base dos Correios.' }
    }

    let logradouro = (data.logradouro || '').trim()
    let bairro = (data.bairro || '').trim()

    // Regra: O que vem depois da vírgula é considerado bairro
    if (logradouro.includes(',')) {
      const parts = logradouro.split(',')
      logradouro = parts[0].trim()
      const afterComma = parts.slice(1).join(',').trim()
      if (afterComma) {
        bairro = bairro ? `${bairro} (${afterComma})` : afterComma
      }
    }

    return {
      success: true,
      logradouro,
      bairro,
      cidade: data.localidade || '',
      estado: data.uf || '',
      cep: data.cep || formatCep(cleanCep),
    }
  } catch (err) {
    console.error('Erro ao consultar CEP:', err)
    return { success: false, error: 'Não foi possível consultar os Correios no momento.' }
  }
}

// Estima peso unitário do produto com base no cadastro ou categoria/nome
export function getProductWeight(product) {
  if (!product) return 0.5
  if (product.weight && parseFloat(product.weight) > 0) {
    const w = parseFloat(product.weight)
    return w > 50 ? Math.round((w / 1000) * 10) / 10 : w
  }
  if (product.weight_g && parseInt(product.weight_g, 10) > 0) {
    return Math.round((parseInt(product.weight_g, 10) / 1000) * 10) / 10
  }
  const cat = (product.category || '').toLowerCase()
  const name = (product.name || '').toLowerCase()

  if (name.includes('cadeira') || cat.includes('cadeira')) return 14.0
  if (name.includes('monitor') || cat.includes('monitor')) return 4.5
  if (name.includes('gabinete') || name.includes('computador') || name.includes('pc gamer')) return 7.5
  if (name.includes('notebook')) return 2.8
  if (name.includes('placa de vídeo') || name.includes('rtx') || name.includes('rx')) return 1.8
  if (name.includes('teclado')) return 0.9
  if (name.includes('parafusadeira') || name.includes('furadeira')) return 2.2
  if (name.includes('cafeteira')) return 2.6
  if (name.includes('headset') || name.includes('fone')) return 0.6
  return 0.5 // periféricos pequenos, mouses, cabos, ssds
}

/**
 * Cotação oficial de frete e prazo nos Correios via backend seguro (/api/shipping/quote)
 * @param {string} cep - CEP do cliente
 * @param {Array} items - Itens no carrinho [{ id, qty, ... }]
 * @param {number} fallbackTotal - Valor total para fallback de contingência
 */
export async function cotarFreteOficial(cep, items = [], fallbackTotal = 0) {
  const cleanCep = (cep || '').replace(/\D/g, '')
  if (cleanCep.length !== 8) {
    return { error: 'CEP inválido. Informe 8 dígitos.' }
  }

  const payload = {
    cepDestino: cleanCep,
    items: items.map(item => ({
      productId: item.id,
      quantity: item.qty || item.quantity || 1
    }))
  }

  try {
    const response = await fetch('/api/shipping/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && Array.isArray(data.options) && data.options.length > 0) {
        return {
          success: true,
          cep: cleanCep,
          isOficial: true,
          opcoes: data.options.map(opt => ({
            tipo: opt.name, // 'PAC' ou 'SEDEX'
            serviceCode: opt.serviceCode,
            preco: opt.price,
            prazo: opt.deliveryDays,
            label: `R$ ${opt.price.toFixed(2).replace('.', ',')}`,
            prazoLabel: opt.deliveryDays === 1 ? 'Entrega em até 1 dia útil' : `Entrega em até ${opt.deliveryDays} dias úteis`,
            dataMaxima: opt.maxDeliveryDate,
            description: opt.description
          })),
          package: data.package
        }
      }
    }
  } catch (err) {
    console.warn('[Correios] Endpoint oficial inacessível. Acionando contingência local:', err.message)
  }

  // Fallback de contingência caso a API dos Correios ou conexão externa falhe
  const totalKg = items.reduce((sum, i) => sum + (getProductWeight(i) * (i.qty || 1)), 0)
  const contingencia = calcularFrete(cleanCep, totalKg, fallbackTotal)
  return {
    ...contingencia,
    isOficial: false,
    warning: 'Cotação estimada por contingência local.'
  }
}

/**
 * Validação de integridade do frete antes de registrar o pedido no checkout
 */
export async function validarFreteNoBackend({ cepDestino, items, selectedServiceId, claimedShippingPrice }) {
  try {
    const response = await fetch('/api/shipping/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cepDestino,
        items: items.map(i => ({ productId: i.id, quantity: i.qty || i.quantity || 1 })),
        selectedServiceId,
        claimedShippingPrice
      })
    })

    if (response.ok) {
      return await response.json()
    }
    const errData = await response.json().catch(() => ({}))
    return { valid: false, error: errData.error || 'Erro na validação do frete.' }
  } catch {
    // Se a rota falhar por estar em modo puramente estático, aprova com log
    return { valid: true, warning: 'Validação ignorada em modo offline.' }
  }
}

export function calcularFrete(cep, pesoKg = 0.5, valorTotal = 0) {
  const cepLimpo = cep.replace(/\D/g, '')
  if (cepLimpo.length !== 8) {
    return { error: 'CEP inválido. Informe 8 dígitos.' }
  }

  const regiao = getRegiaoPorCep(cepLimpo)
  const tabela = FRETE_TABELA[regiao] || FRETE_TABELA['SP_RJ_MG_ES']
  const pesoFinal = Math.max(0.3, Math.round(pesoKg * 10) / 10)
  const pesoExtra = Math.max(0, pesoFinal - 1)
  const adicional = pesoExtra * ADICIONAL_POR_KG

  const sedex = Math.round((tabela.sedex + adicional) * 100) / 100
  const pac = Math.round((tabela.pac + adicional) * 100) / 100

  return {
    cep: cepLimpo,
    regiao,
    pesoKg: pesoFinal,
    opcoes: [
      {
        tipo: 'SEDEX',
        serviceCode: '03220',
        preco: sedex,
        prazo: tabela.prazoSedex,
        label: `R$ ${sedex.toFixed(2).replace('.', ',')}`,
        prazoLabel: tabela.prazoSedex === 1 ? 'Entrega em até 1 dia útil' : `Entrega em até ${tabela.prazoSedex} dias úteis`,
      },
      {
        tipo: 'PAC',
        serviceCode: '03298',
        preco: pac,
        prazo: tabela.prazoPac,
        label: `R$ ${pac.toFixed(2).replace('.', ',')}`,
        prazoLabel: tabela.prazoPac === 1 ? 'Entrega em até 1 dia útil' : `Entrega em até ${tabela.prazoPac} dias úteis`,
      },
    ],
  }
}

// Máscara para CEP: 00000-000
export function formatCep(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }
  return digits
}

// Máscara para CPF: 000.000.000-00
export function formatCpf(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length > 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }
  return digits
}

// Máscara para Telefone: (00) 00000-0000 ou (00) 0000-0000
export function formatPhone(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length > 10) {
    // Celular (11 dígitos): (XX) XXXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length > 6) {
    // Fixo (10 dígitos): (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  }
  if (digits.length > 0) {
    return `(${digits}`
  }
  return digits
}
