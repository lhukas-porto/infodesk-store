// Serviço Utilitário para Notificações Comerciais via WhatsApp da Infodesk Store
// Gera links diretos wa.me com mensagens pré-formatadas profissionais e limpas

export const STORE_WHATSAPP = '5561999998888' // Número de atendimento da Infodesk Store em Brasília
export const STORE_NAME = 'Infodesk Informática'

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
export function buildPaymentReminderMessage(order) {
  const clienteNome = (order.cliente?.nome || 'Cliente').split(' ')[0]
  const total = (order.total || 0).toFixed(2).replace('.', ',')
  const pedidoId = order.id || ''

  let msg = `Olá, *${clienteNome}*! Tudo bem? Aqui é da *${STORE_NAME}*.\n\n`
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
  msg += `*${STORE_NAME}* · CNPJ 15.266.716/0001-02`

  return msg
}

/**
 * Gera mensagem de envio com código de rastreio dos Correios
 */
export function buildShippingNotificationMessage(order) {
  const clienteNome = (order.cliente?.nome || 'Cliente').split(' ')[0]
  const pedidoId = order.id || ''
  const trackingCode = order.trackingCode || ''
  const freteTipo = order.freteType || 'Correios'

  let msg = `Olá, *${clienteNome}*! Ótima notícia da *${STORE_NAME}*! 🚀📦\n\n`
  msg += `Seu pedido *#${pedidoId}* já foi embalado e despachado via *${freteTipo}*!\n\n`

  if (trackingCode) {
    msg += `🔎 *Código de Rastreamento dos Correios:*\n*${trackingCode}*\n\n`
    msg += `Você pode acompanhar cada etapa em nosso site na opção *Rastrear Pedido* ou pelo link oficial:\n`
    msg += `https://rastreamento.correios.com.br/app/index.php?codigo=${trackingCode}\n\n`
  }

  msg += `Agradecemos pela preferência e confiança em nossa loja!\n`
  msg += `*${STORE_NAME}* · CLSW 304 Bloco A Sala 108 - Sudoeste, Brasília - DF`

  return msg
}

/**
 * Gera mensagem de entrega concluída
 */
export function buildDeliveredNotificationMessage(order) {
  const clienteNome = (order.cliente?.nome || 'Cliente').split(' ')[0]
  const pedidoId = order.id || ''

  let msg = `Olá, *${clienteNome}*! Tudo bem? Aqui é da *${STORE_NAME}*! 🎉\n\n`
  msg += `Consta em nosso sistema que seu pedido *#${pedidoId}* foi entregue com sucesso!\n\n`
  msg += `Esperamos que você aproveite muito seus novos produtos. Se puder nos dar um feedback sobre sua experiência de compra, ficaremos muito felizes!\n\n`
  msg += `Conte sempre com a *${STORE_NAME}* para o que precisar. Um grande abraço!`

  return msg
}

/**
 * Gera mensagem para o próprio cliente enviar à loja no pós-checkout
 */
export function buildCustomerOrderSupportMessage(order) {
  const pedidoId = order.id || ''
  const clienteNome = order.cliente?.nome || 'Cliente'
  const total = (order.total || 0).toFixed(2).replace('.', ',')

  let msg = `Olá, equipe *${STORE_NAME}*! Acabei de realizar o pedido *#${pedidoId}* no valor de *R$ ${total}*.\n\n`
  msg += `Meu nome é *${clienteNome}*. Gostaria de confirmar o pedido e receber as atualizações de envio por aqui. Obrigado!`

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
