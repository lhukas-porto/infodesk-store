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

export function calcularFrete(cep, pesoKg = 0.5, valorTotal = 0) {
  const cepLimpo = cep.replace(/\D/g, '')
  if (cepLimpo.length !== 8) {
    return { error: 'CEP inválido. Informe 8 dígitos.' }
  }

  const regiao = getRegiaoPorCep(cepLimpo)
  const tabela = FRETE_TABELA[regiao] || FRETE_TABELA['SP_RJ_MG_ES']
  const pesoExtra = Math.max(0, pesoKg - 1)
  const adicional = pesoExtra * ADICIONAL_POR_KG

  const sedex = Math.round((tabela.sedex + adicional) * 100) / 100
  const pac = Math.round((tabela.pac + adicional) * 100) / 100

  return {
    cep: cepLimpo,
    regiao,
    opcoes: [
      {
        tipo: 'SEDEX',
        preco: sedex,
        prazo: tabela.prazoSedex,
        label: `R$ ${sedex.toFixed(2).replace('.', ',')}`,
        prazoLabel: `${tabela.prazoSedex} dia${tabela.prazoSedex > 1 ? 's' : ''} útei${tabela.prazoSedex > 1 ? 's' : 'l'}`,
      },
      {
        tipo: 'PAC',
        preco: pac,
        prazo: tabela.prazoPac,
        label: `R$ ${pac.toFixed(2).replace('.', ',')}`,
        prazoLabel: `${tabela.prazoPac} dias úteis`,
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
