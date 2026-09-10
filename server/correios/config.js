// Configurações e definições das APIs Oficiais dos Correios
// Mantém as variáveis seguras exclusivamente no ambiente Node.js / Serverless

export const CORREIOS_CONFIG = {
  get usuario() {
    return process.env.CORREIOS_USUARIO || ''
  },
  get codigoAcesso() {
    return process.env.CORREIOS_CODIGO_ACESSO || ''
  },
  get contrato() {
    return process.env.CORREIOS_CONTRATO || ''
  },
  get dr() {
    return process.env.CORREIOS_DR || '10'
  },
  get cepOrigem() {
    return (process.env.CORREIOS_CEP_ORIGEM || '70673631').replace(/\D/g, '')
  },
  authUrl: 'https://api.correios.com.br/token/v1/autentica/contrato',
  precoUrl: 'https://api.correios.com.br/preco/v1/nacional',
  prazoUrl: 'https://api.correios.com.br/prazo/v1/nacional',
  timeoutMs: 8000,
}

// Catálogo de serviços habilitados no contrato comercial dos Correios
// Para habilitar novos serviços futuramente (ex: SEDEX 10, SEDEX 12), basta adicionar uma nova entrada aqui!
export const CORREIOS_SERVICES = [
  {
    id: 'PAC',
    code: '03298',
    name: 'PAC',
    description: 'Econômico com entrega em todo o Brasil',
    requisicao: 'PAC'
  },
  {
    id: 'SEDEX',
    code: '03220',
    name: 'SEDEX',
    description: 'Expresso com entrega rápida prioritária',
    requisicao: 'SEDEX'
  }
  // Exemplo de expansão futura:
  // { id: 'SEDEX10', code: '03158', name: 'SEDEX 10', description: 'Entrega até as 10h da manhã', requisicao: 'SEDEX10' },
  // { id: 'SEDEX12', code: '03140', name: 'SEDEX 12', description: 'Entrega até as 12h', requisicao: 'SEDEX12' }
]

export function hasCorreiosCredentials() {
  return Boolean(
    CORREIOS_CONFIG.usuario &&
    CORREIOS_CONFIG.codigoAcesso &&
    CORREIOS_CONFIG.contrato
  )
}
