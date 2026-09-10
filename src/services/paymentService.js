// Serviço de pagamento e emissão de boletos / checkout seguro (simulação)
// Em produção, integrar com o gateway de pagamento ou banco selecionado

import { jsPDF } from 'jspdf'

function gerarLinhaDigitavel() {
  const blocos = []
  for (let i = 0; i < 4; i++) {
    let bloco = ''
    for (let j = 0; j < 11; j++) {
      bloco += Math.floor(Math.random() * 10)
    }
    blocos.push(bloco)
  }
  return blocos.join(' ')
}

function gerarCodigoBarras() {
  let codigo = '23793.'
  for (let i = 0; i < 42; i++) {
    if (i % 5 === 4 && i < 40) codigo += '.'
    codigo += Math.floor(Math.random() * 10)
  }
  return codigo
}

export function gerarBoleto(pedido) {
  const vencimento = new Date()
  vencimento.setDate(vencimento.getDate() + 3)

  const boleto = {
    banco: 'Rede Bancária Nacional',
    codigoBanco: 'Boleto Registrado',
    linhaDigitavel: gerarLinhaDigitavel(),
    codigoBarras: gerarCodigoBarras(),
    beneficiario: 'INFODESK INFORMÁTICA — Lucas Porto da Fonseca',
    cnpj: '15.266.716/0001-02',
    enderecoBeneficiario: 'CLSW 304 Bloco A Sala 108 - Sudoeste, Brasília/DF - CEP 70.673-631',
    valor: pedido.total,
    valorFormatado: `R$ ${pedido.total.toFixed(2).replace('.', ',')}`,
    vencimento: vencimento.toLocaleDateString('pt-BR'),
    dataEmissao: new Date().toLocaleDateString('pt-BR'),
    numeroPedido: pedido.id,
    pagador: pedido.cliente?.nome || 'Consumidor Final',
    cpfPagador: pedido.cliente?.cpf || '',
    instrucoes: [
      'Não receber após o vencimento.',
      'Juros de 1% ao mês após o vencimento.',
      'Multa de 2% após o vencimento.',
    ],
  }

  return boleto
}

export function gerarBoletoPDF(boleto) {
  const doc = new jsPDF()

  // Header
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setTextColor(132, 204, 22)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('INFODESK STORE', 15, 18)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text('Boleto Bancário', 160, 18)

  // Instituição Bancária / Emissor
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(boleto.banco, 15, 45)
  doc.setFontSize(14)
  doc.text(boleto.codigoBanco, 195, 45, { align: 'right' })

  doc.setDrawColor(200, 200, 200)
  doc.line(15, 50, 195, 50)

  // Info Grid
  const y0 = 58
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  doc.text('Beneficiário', 15, y0)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(boleto.beneficiario, 15, y0 + 5)

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('CNPJ', 15, y0 + 14)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(boleto.cnpj, 15, y0 + 19)

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Data de Emissão', 120, y0)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(boleto.dataEmissao, 120, y0 + 5)

  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Data de Vencimento', 120, y0 + 14)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(boleto.vencimento, 120, y0 + 19)

  doc.line(15, y0 + 24, 195, y0 + 24)

  // Valor
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Valor do Documento', 120, y0 + 30)
  doc.setTextColor(132, 204, 22)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(boleto.valorFormatado, 120, y0 + 38)

  // Pagador
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Pagador', 15, y0 + 30)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text(boleto.pagador, 15, y0 + 38)

  doc.line(15, y0 + 44, 195, y0 + 44)

  // Instruções
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Instruções', 15, y0 + 50)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  boleto.instrucoes.forEach((inst, i) => {
    doc.text(`• ${inst}`, 15, y0 + 56 + i * 5)
  })

  doc.line(15, y0 + 76, 195, y0 + 76)

  // Linha digitável
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text('Linha Digitável', 15, y0 + 82)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('courier', 'bold')
  doc.text(boleto.linhaDigitavel, 15, y0 + 90)

  // Nº Pedido
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Pedido: ${boleto.numeroPedido}`, 15, y0 + 100)

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('Este boleto é uma simulação para fins de demonstração.', 105, 280, { align: 'center' })

  return doc
}

export function gerarLinkPagamento(pedido) {
  return {
    tipo: 'link_pagamento',
    url: `https://pagamento.infodesk.net.br/checkout/${Date.now()}`,
    valor: pedido.total,
    valorFormatado: `R$ ${pedido.total.toFixed(2).replace('.', ',')}`,
    expiracao: '24 horas',
    qrCodeData: `00020126580014br.gov.bcb.pix0136${Date.now()}52040000530398654${pedido.total.toFixed(2)}5802BR`,
  }
}
