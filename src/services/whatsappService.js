// Serviço Utilitário para Notificações Comerciais via WhatsApp
// Gera links diretos wa.me com mensagens pré-formatadas profissionais e limpas

import { getCompanyPublicName, getCompanyFullAddress } from './companyService.js'

function resolveCompanyData(provided) {
  if (provided) return provided
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('infodesk_company_data') : null
    if (saved) return JSON.parse(saved)
  } catch {}
  return null
}

export const STORE_WHATSAPP = ''
export const STORE_NAME = 'Minha Loja'

/**
 * Limpa e formata o número de telefone para o padrão internacional do WhatsApp (55 + DDD + Número)
 * @param {string} phone
 * @returns {string}
 */
export function formatPhoneForWhatsApp(phone) {
  if (!phone) return ''
  const digits = String(phone).replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits
  }
  // Se tem 10 ou 11 dígitos (DDD + Tel), adiciona DDI 55
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }
  return digits
}

/**
 * Gera mensagem de lembrete de pagamento para pedidos Pendentes
 */
export function buildPaymentReminderMessage(order, companyData = null) {
  const company = resolveCompanyData(companyData)
  const storeName = getCompanyPublicName(company)
  const cnpjStr = company?.cnpj ? ` · CNPJ ${company.cnpj}` : ''
  const clienteNome = (order.cliente?.nome || 'Cliente').split(' ')[0]
  const total = (order.total || 0).toFixed(2).replace('.', ',')
  const pedidoId = order.id || ''

  let msg = `Olá, *${clienteNome}*! Tudo bem? Aqui é da *${storeName}*.\n\n`
  msg += `Recebemos o seu pedido *#${pedidoId}* no valor de *R$ ${total}*.\n\n`

  if (order.paymentMethod === 'pix' && order.pixKey) {
    msg += `🔑 *Chave Pix Copia e Cola:*\n\`${order.pixKey}\`\n\n`
    msg += `Assim que o pagamento for realizado, seu pedido entrará em separação imediata para postagem nos Correios! 📦\n\n`
  } else if (order.paymentMethod === 'boleto' && order.boleto?.codigoBarras) {
    msg += `📄 *Linha Digitável do Boleto:*\n\`${order.boleto.codigoBarras}\`\n\n`
    msg += `Você também pode acessar e baixar o boleto em PDF diretamente em sua conta.\n\n`
  } else {
    msg += `Aguardamos a confirmação do pagamento para enviar seus produtos com total agilidade.\n\n`
  }

  msg += `Qualquer dúvida ou se precisar de ajuda, estamos à disposição por aqui!\n`
  msg += `*${storeName}*${cnpjStr}`

  return msg
}

/**
 * Gera mensagem de envio com código de rastreio dos Correios
 */
export function buildShippingNotificationMessage(order, companyData = null) {
  const company = resolveCompanyData(companyData)
  const storeName = getCompanyPublicName(company)
  const addressStr = getCompanyFullAddress(company)
  const clienteNome = (order.cliente?.nome || 'Cliente').split(' ')[0]
  const pedidoId = order.id || ''
  const trackingCode = order.trackingCode || ''
  const freteTipo = order.freteType || 'Correios'

  let msg = `Olá, *${clienteNome}*! Ótima notícia da *${storeName}*! 🚀📦\n\n`
  msg += `Seu pedido *#${pedidoId}* já foi embalado e despachado via *${freteTipo}*!\n\n`

  if (trackingCode) {
    msg += `🔎 *Código de Rastreamento dos Correios:*\n*${trackingCode}*\n\n`
    msg += `Você pode acompanhar cada etapa em nosso site em *Meus Pedidos > Detalhes do Pedido* ou pelo link oficial:\n`
    msg += `https://rastreamento.correios.com.br/app/index.php?codigo=${trackingCode}\n\n`
  }

  msg += `Agradecemos pela preferência e confiança em nossa loja!\n`
  msg += `*${storeName}* · ${addressStr}`

  return msg
}

/**
 * Gera mensagem de entrega concluída
 */
export function buildDeliveredNotificationMessage(order, companyData = null) {
  const company = resolveCompanyData(companyData)
  const storeName = getCompanyPublicName(company)
  const clienteNome = (order.cliente?.nome || 'Cliente').split(' ')[0]
  const pedidoId = order.id || ''

  let msg = `Olá, *${clienteNome}*! Tudo bem? Aqui é da *${storeName}*! 🎉\n\n`
  msg += `Consta em nosso sistema que seu pedido *#${pedidoId}* foi entregue com sucesso!\n\n`
  msg += `Esperamos que você aproveite muito seus novos produtos. Se puder nos dar um feedback sobre sua experiência de compra, ficaremos muito felizes!\n\n`
  msg += `Conte sempre com a *${storeName}* para o que precisar. Um grande abraço!`

  return msg
}

/**
 * Gera mensagem para o próprio cliente enviar à loja no pós-checkout
 */
export function buildCustomerOrderSupportMessage(order, companyData = null) {
  const company = resolveCompanyData(companyData)
  const storeName = getCompanyPublicName(company)
  const pedidoId = order.id || ''
  const clienteNome = order.cliente?.nome || 'Cliente'

  let msg = `Olá, equipe *${storeName}*! Tudo bem? Meu nome é *${clienteNome}*.\n\n`
  msg += `Gostaria de tirar uma dúvida sobre o meu pedido *#${pedidoId}*. Poderiam me ajudar?`

  return msg
}

/**
 * Monta o link web para disparar a conversa no WhatsApp
 * @param {string} phone
 * @param {string} message
 * @returns {string}
 */
export function createWhatsAppLink(phone, message) {
  const cleanPhone = formatPhoneForWhatsApp(phone)
  const encodedText = encodeURIComponent(message)
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`
  }
  return `https://wa.me/?text=${encodedText}`
}
