// Serviço Central de Dados e Configurações da Empresa (Multi-Marca)
// Permite que qualquer empresa configure seus dados cadastrais e identidade visual

export const DEFAULT_COMPANY_DATA = {
  razaoSocial: 'NOME FANTASIA DA EMPRESA LTDA',
  nomeFantasia: 'Minha Loja',
  cnpj: '',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  emailPrincipal: 'contato@minhaloja.com.br',
  telefone: '',
  whatsapp: '',
  site: 'https://minhaloja.com.br',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  pais: 'Brasil',
  logo: '', // Se vazio, usa a logo padrão do assets ou exibe o nome em texto
  logoAlt: 'Minha Loja',
  favicon: '/favicon.jpg',
  descricaoCurta: 'Sua loja online com frete rápido e atendimento especializado.',
  corPrimaria: '#84CC16'
}

/**
 * Aplica as variáveis CSS de cor da marca (:root) dinamicamente na página.
 * Permite que clientes de revenda white-label personalizem a identidade visual inteira
 * da loja (botões, badges, luzes/glow e bordas) sem editar uma linha de código.
 */
export function applyBrandThemeColor(hexColor) {
  if (!hexColor || typeof window === 'undefined') return
  const hex = String(hexColor).trim()
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // Calcula tom mais escuro (aprox. 75% da luminância) para estados de hover
  const darkR = Math.round(r * 0.75).toString(16).padStart(2, '0')
  const darkG = Math.round(g * 0.75).toString(16).padStart(2, '0')
  const darkB = Math.round(b * 0.75).toString(16).padStart(2, '0')
  const darkHex = `#${darkR}${darkG}${darkB}`

  // Calcula tom mais claro (aprox. +25% de brilho) para foco e highlights
  const lightR = Math.round(r + (255 - r) * 0.25).toString(16).padStart(2, '0')
  const lightG = Math.round(g + (255 - g) * 0.25).toString(16).padStart(2, '0')
  const lightB = Math.round(b + (255 - b) * 0.25).toString(16).padStart(2, '0')
  const lightHex = `#${lightR}${lightG}${lightB}`

  const root = document.documentElement
  root.style.setProperty('--lime', hex)
  root.style.setProperty('--lime-dark', darkHex)
  root.style.setProperty('--lime-light', lightHex)
  root.style.setProperty('--lime-glow', `rgba(${r}, ${g}, ${b}, 0.15)`)
  root.style.setProperty('--lime-glow-strong', `rgba(${r}, ${g}, ${b}, 0.35)`)
}


/**
 * Aplica máscara de CNPJ (00.000.000/0000-00)
 */
export function formatCnpj(value) {
  if (!value) return ''
  const clean = String(value).replace(/\D/g, '').slice(0, 14)
  if (clean.length <= 2) return clean
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`
}

/**
 * Aplica máscara de Telefone ou WhatsApp ((00) 0000-0000 ou (00) 00000-0000)
 */
export function formatPhone(value) {
  if (!value) return ''
  const clean = String(value).replace(/\D/g, '').slice(0, 11)
  if (clean.length <= 2) return clean ? `(${clean}` : ''
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
}

/**
 * Aplica máscara de CEP (00000-000)
 */
export function formatCep(value) {
  if (!value) return ''
  const clean = String(value).replace(/\D/g, '').slice(0, 8)
  if (clean.length <= 5) return clean
  return `${clean.slice(0, 5)}-${clean.slice(5)}`
}

/**
 * Validação de CNPJ (dígitos verificadores oficiais)
 */
export function isValidCnpj(cnpj) {
  if (!cnpj) return false
  const clean = String(cnpj).replace(/\D/g, '')
  if (clean.length !== 14) return false
  if (/^(\d)\1{13}$/.test(clean)) return false // Elimina 00000000000000, 11111111111111, etc.

  let tamanho = clean.length - 2
  let numeros = clean.substring(0, tamanho)
  const digitos = clean.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false

  tamanho = tamanho + 1
  numeros = clean.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  return resultado === parseInt(digitos.charAt(1), 10)
}

/**
 * Validação simples de e-mail
 */
export function isValidEmail(email) {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
}

/**
 * Validação de URL
 */
export function isValidUrl(url) {
  if (!url) return false
  const trimmed = String(url).trim()
  if (!trimmed) return false
  const candidate = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`
  try {
    const u = new URL(candidate)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.')
  } catch {
    return false
  }
}

/**
 * Retorna o nome público da empresa (Nome Fantasia como prioridade; se não houver, Razão Social)
 */
export function getCompanyPublicName(company) {
  if (!company) return 'Minha Loja'
  return company.nomeFantasia?.trim() || company.razaoSocial?.trim() || 'Minha Loja'
}

/**
 * Monta o endereço textual completo para exibição no rodapé e canais oficiais.
 * Sequência solicitada: Endereço complemento e numero (sem vírgulas entre esses 3 campos),
 * seguido por bairro, cidade - estado e CEP (separados por vírgula).
 */
export function getCompanyFullAddress(company) {
  if (!company) return 'CLSW 304 Bloco A Sala 108, Sudoeste, Brasília - DF, CEP 70673-631'
  const parts = []
  const end = company.endereco?.trim()
  const comp = company.complemento?.trim()
  const num = company.numero?.trim()

  // 1. Sequência: Endereço complemento e numero (sem vírgulas entre esses campos)
  const streetParts = []
  if (end) streetParts.push(end)
  if (comp && !end?.includes(comp)) streetParts.push(comp)
  if (num && !end?.includes(num) && (!comp || !comp?.includes(num))) {
    streetParts.push(num)
  }

  const streetLine = streetParts.join(' ')
  if (streetLine) parts.push(streetLine)

  // 2. Bairro, cidade - estado e CEP (separados por vírgula)
  if (company.bairro?.trim()) parts.push(company.bairro.trim())
  if (company.cidade?.trim() && company.estado?.trim()) {
    parts.push(`${company.cidade.trim()} - ${company.estado.trim()}`)
  } else if (company.cidade?.trim()) {
    parts.push(company.cidade.trim())
  }
  if (company.cep?.trim()) parts.push(`CEP ${formatCep(company.cep)}`)

  return parts.join(', ') || 'CLSW 304 Bloco A Sala 108, Sudoeste, Brasília - DF, CEP 70673-631'
}

/**
 * Gera URL direta para pesquisa no Google Maps com base no endereço cadastrado
 */
export function getCompanyGoogleMapsUrl(company) {
  const full = getCompanyFullAddress(company)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`
}
