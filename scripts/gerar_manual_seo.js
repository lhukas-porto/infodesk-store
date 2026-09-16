import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
})

const pageWidth = 210
const pageHeight = 297
const margin = 18
const contentWidth = pageWidth - (margin * 2)
let currentY = margin

function checkNewPage(neededHeight) {
  if (currentY + neededHeight > pageHeight - 20) {
    doc.addPage()
    currentY = margin
    drawPageHeader()
  }
}

function drawPageHeader() {
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text('INFODESK STORE — MANUAL DE SEO, GOOGLE SHOPPING & DIVULGAÇÃO', margin, 12)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, 14, pageWidth - margin, 14)
}

function addTitle(text) {
  checkNewPage(24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text(text, margin, currentY)
  currentY += 8
}

function addSubtitle(text) {
  checkNewPage(12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text(text, margin, currentY)
  currentY += 10
}

function addSectionHeading(title, tag = '') {
  checkNewPage(18)
  currentY += 4
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(margin, currentY, contentWidth, 8, 2, 2, 'F')
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(2, 132, 199)
  doc.text(title.toUpperCase(), margin + 3, currentY + 5.5)
  
  if (tag) {
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(tag, pageWidth - margin - 3, currentY + 5.5, { align: 'right' })
  }
  
  currentY += 13
}

function addFieldBlock(fieldName, role, purpose, fillTip, example = '') {
  const roleLines = doc.splitTextToSize(`O que é: ${role}`, contentWidth - 8)
  const purposeLines = doc.splitTextToSize(`Para que serve: ${purpose}`, contentWidth - 8)
  const tipLines = doc.splitTextToSize(`Como preencher: ${fillTip}`, contentWidth - 8)
  const exLines = example ? doc.splitTextToSize(`Exemplo Prático: ${example}`, contentWidth - 8) : []

  const totalLines = roleLines.length + purposeLines.length + tipLines.length + exLines.length
  const estimatedHeight = 10 + (totalLines * 4.2) + (example ? 6 : 4)

  checkNewPage(estimatedHeight)

  // Caixa suave
  doc.setDrawColor(226, 232, 240)
  doc.setFillColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, currentY, contentWidth, estimatedHeight - 2, 2, 2, 'FD')

  // Faixa esquerda de destaque
  doc.setFillColor(2, 132, 199)
  doc.rect(margin, currentY, 2.5, estimatedHeight - 2, 'F')

  let innerY = currentY + 5

  // Título do campo
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(fieldName, margin + 5, innerY)
  innerY += 5.2

  // Textos
  doc.setFontSize(8.5)

  // O que é
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('O que é: ', margin + 5, innerY)
  const roleX = margin + 5 + doc.getTextWidth('O que é: ')
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(roleLines[0].replace('O que é: ', ''), roleX, innerY)
  for (let i = 1; i < roleLines.length; i++) {
    innerY += 4.2
    doc.text(roleLines[i], margin + 5, innerY)
  }
  innerY += 4.5

  // Para que serve
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('Para que serve: ', margin + 5, innerY)
  const purpX = margin + 5 + doc.getTextWidth('Para que serve: ')
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(purposeLines[0].replace('Para que serve: ', ''), purpX, innerY)
  for (let i = 1; i < purposeLines.length; i++) {
    innerY += 4.2
    doc.text(purposeLines[i], margin + 5, innerY)
  }
  innerY += 4.5

  // Como preencher
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('Como preencher: ', margin + 5, innerY)
  const tipX = margin + 5 + doc.getTextWidth('Como preencher: ')
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(51, 65, 85)
  doc.text(tipLines[0].replace('Como preencher: ', ''), tipX, innerY)
  for (let i = 1; i < tipLines.length; i++) {
    innerY += 4.2
    doc.text(tipLines[i], margin + 5, innerY)
  }

  if (example) {
    innerY += 4.5
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(22, 101, 52)
    doc.text('Exemplo Prático: ', margin + 5, innerY)
    const exX = margin + 5 + doc.getTextWidth('Exemplo Prático: ')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(21, 128, 61)
    doc.text(exLines[0].replace('Exemplo Prático: ', ''), exX, innerY)
    for (let i = 1; i < exLines.length; i++) {
      innerY += 4.2
      doc.text(exLines[i], margin + 5, innerY)
    }
  }

  currentY += estimatedHeight + 3
}

function addCallout(title, text, type = 'info') {
  const lines = doc.splitTextToSize(text, contentWidth - 14)
  const height = 12 + (lines.length * 4.2)
  checkNewPage(height)

  const bgColor = type === 'success' ? [240, 253, 244] : [248, 250, 252]
  const borderColor = type === 'success' ? [187, 247, 208] : [203, 213, 225]
  const titleColor = type === 'success' ? [22, 101, 52] : [15, 23, 42]

  doc.setFillColor(...bgColor)
  doc.setDrawColor(...borderColor)
  doc.setLineWidth(0.4)
  doc.roundedRect(margin, currentY, contentWidth, height, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...titleColor)
  doc.text(title, margin + 4, currentY + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  doc.setTextColor(51, 65, 85)
  doc.text(lines, margin + 4, currentY + 9.5)

  currentY += height + 4
}

// ==========================================
// CAPA / CABEÇALHO DO DOCUMENTO
// ==========================================
doc.setFillColor(15, 23, 42)
doc.rect(0, 0, pageWidth, 42, 'F')

doc.setFont('helvetica', 'bold')
doc.setFontSize(10)
doc.setTextColor(56, 189, 248)
doc.text('INFODESK STORE — PLATAFORMA DE E-COMMERCE', margin, 15)

doc.setFontSize(18)
doc.setTextColor(255, 255, 255)
doc.text('Manual de SEO, Google Shopping & Divulgação', margin, 24)

doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
doc.setTextColor(203, 213, 225)
doc.text('Guia prático definitivo de preenchimento, indexação orgânica e integração de anúncios', margin, 32)

currentY = 50

addCallout(
  'VISÃO GERAL DO SISTEMA DE DIVULGAÇÃO INFODESK',
  'A arquitetura de SEO da sua loja opera em dois níveis: na ficha de cada produto (otimizando buscas de itens individuais) e na Central Geral de Marketing (conectando domínio próprio, Google Analytics 4, Search Console, Google Merchant Center e links rastreados UTM). Este manual detalha a finalidade de cada campo e as melhores práticas comerciais para maximizar visitas e vendas.',
  'info'
)

// ==========================================
// SEÇÃO 1: FICHA DO PRODUTO (POR ITEM)
// ==========================================
addSectionHeading('1. Ficha do Produto — SEO & Google Shopping', 'Preenchimento por Item')

addFieldBlock(
  'Slug da URL (URL Amigável)',
  'O endereço web específico onde a página do produto é acessada no navegador.',
  'URLs limpas e legíveis são preferidas pelo algoritmo do Google em relação a códigos confusos, além de gerarem muito mais cliques e compartilhamentos confiáveis.',
  'Deixe em branco para o sistema gerar automaticamente a partir do nome do produto, ou digite com letras minúsculas separadas por hífen (-). Sem acentos ou espaços.',
  'teclado-gamer-mecanico-rgb-switch-blue'
)

addFieldBlock(
  'Palavra-Chave Principal',
  'O termo de busca prioritário que define a intenção de compra do produto.',
  'Orienta os robôs de inteligência de busca a associar o seu produto exatamente à pesquisa feita pelo cliente com intenção real de compra.',
  'Escolha o termo mais comum e direto que você mesmo usaria ao pesquisar no Google para comprar este produto.',
  'monitor gamer 144hz ips ou ssd nvme 1tb kingston'
)

addFieldBlock(
  'Título SEO (<title>)',
  'A manchete que aparece em destaque nos resultados de pesquisa do Google e na aba do navegador.',
  'É o elemento de maior impacto direto para o clique do cliente na lista de resultados da busca (CTR). Deve ser atraente, claro e profissional.',
  'Utilize a fórmula: [Nome do Produto] - [Marca] - [Diferencial / Frete] | [Nome da Loja]. Mantenha entre 50 e 60 caracteres para não truncar.',
  'Monitor Gamer 27" 165Hz Asus Rog Strix - Envio Rápido | InfoDesk'
)

addFieldBlock(
  'Meta Description SEO',
  'O resumo descritivo de até 160 caracteres exibido abaixo do título nos resultados do Google.',
  'Funciona como a "vitrine de texto" da página. Um texto convincente com chamada para ação (CTA) aumenta expressivamente a taxa de cliques.',
  'Apresente o produto, cite benefícios comerciais (garantia, desconto no Pix, parcelamento sem juros) e inclua um convite à ação.',
  'Compre o Teclado Gamer RGB com switches mecânicos e garantia nacional. Até 10x sem juros ou 3% off no Pix. Entrega rápida!'
)

addFieldBlock(
  'Texto Alternativo da Imagem (Alt Text)',
  'A descrição textual do conteúdo visual da foto principal do item.',
  'Permite a indexação no Google Imagens (gerando tráfego adicional gratuito) e garante conformidade com acessibilidade digital para leitores de tela.',
  'Descreva fielmente o que a imagem mostra, mencionando modelo, cor e ângulo.',
  'Foto frontal do mouse gamer sem fio preto com iluminação RGB ligada'
)

addFieldBlock(
  'Part Number / MPN do Fabricante',
  'O código oficial do fabricante para aquela peça (Manufacturer Part Number).',
  'Exigido pelo Google Shopping para associar o seu produto ao catálogo global do fabricante e colocá-lo na comparação de preços em buscas técnicas.',
  'Copie exatamente o código impresso na caixa ou ficha técnica oficial do fabricante.',
  '910-005790 (Logitech) ou MZ-V8V1T0B/AM (Samsung)'
)

addFieldBlock(
  'Categoria do Google Shopping (Taxonomia Oficial)',
  'O caminho padronizado da árvore de produtos internacional do Google.',
  'Garante que o algoritmo do Google Shopping classifique seu produto no departamento correto, evitando exibi-lo em buscas irrelevantes.',
  'Informe a trilha hierárquica completa separada por ">". Se deixar vazio, a loja mapeia automaticamente pela categoria interna.',
  'Eletrônicos > Computadores > Periféricos > Teclados'
)

addFieldBlock(
  'Opções de Destaque e Visibilidade (Checkboxes)',
  'Três chaves de controle de promoção e anúncio de cada produto.',
  'Permitem priorizar ou ocultar produtos estrategicamente sem precisar alterar dados cadastrais.',
  '• Produto-Âncora: prioriza no Sitemap XML do Google e destaca nas campanhas.\n• Oferta da Semana: ativa etiqueta visual de urgência e desconto especial.\n• Incluir no Google Merchant: desmarque apenas se NÃO quiser anunciar no Google.',
  'Marque "Incluir no Google Merchant" para todos os itens ativos que deseja vender.'
)

// ==========================================
// SEÇÃO 2: CENTRAL GERAL DE MARKETING & SEO
// ==========================================
addSectionHeading('2. Central de Marketing & SEO da Loja', 'Painel de Controle > Aba Marketing')

addFieldBlock(
  'Domínio Próprio & URLs Canônicas',
  'O endereço web oficial público onde seu e-commerce opera (ex: sualoja.com.br).',
  'O sistema utiliza esse endereço como raiz para construir automaticamente o Sitemap XML, o arquivo Robots.txt, o feed do Google Shopping e as tags canônicas.',
  'Insira o domínio limpo da loja (ex: infodeskstore.com.br). A plataforma gerencia automaticamente HTTPS e certificados SSL.',
  'infodeskstore.com.br'
)

addFieldBlock(
  'Sitemap.xml & Robots.txt Dinâmicos',
  'Arquivos técnicos que orientam os robôs de busca do Google e Bing.',
  'O Sitemap (/sitemap.xml) lista todos os produtos e páginas automaticamente. O Robots.txt (/robots.txt) informa quais áreas são públicas.',
  '100% automático! Você não precisa criar nem subir arquivos via FTP; o sistema compila e serve as rotas em tempo real.',
  'https://sualoja.com.br/sitemap.xml'
)

addFieldBlock(
  'Google Analytics 4 (GA4)',
  'A ferramenta de inteligência e mensuração de tráfego oficial do Google.',
  'Monitora em tempo real quantas pessoas estão no site, de onde vieram e o funil de vendas completo.',
  'Cole seu ID de Métrica (começa com G-) e ative a chave. O sistema já dispara eventos automáticos de visualização de item, carrinho, checkout e compra concluída!',
  'G-XXXXXXXXXX'
)

addFieldBlock(
  'Google Search Console',
  'Painel oficial para monitoramento da presença do site no índice do Google.',
  'Informa quais termos de busca geram cliques, monitora erros de indexação e valida a saúde geral do site.',
  'Cole o código de verificação HTML fornecido pelo Google (ex: google-site-verification=...) no campo indicado para validar a propriedade com 1 clique.',
  'google-site-verification=aBcDeF123456789'
)

addFieldBlock(
  'Google Merchant Center (Feed XML ao Vivo)',
  'O conector que envia seus produtos diretamente para a vitrine do Google Shopping.',
  'Gera um arquivo XML atualizado em tempo real com preços, fotos, estoque, parcelamento e códigos EAN/MPN de todos os produtos ativos.',
  'Copie a URL /api/marketing/feed.xml e configure no Google Merchant Center na opção "Busca Programada Diária". O Google sincroniza seu catálogo sozinho!',
  'https://sualoja.com.br/api/marketing/feed.xml'
)

addFieldBlock(
  'WhatsApp Oficial & Redes Sociais',
  'Canais de atendimento direto e conexão social exibidos na loja.',
  'Facilitam o contato rápido do cliente com o lojista para fechar vendas no balcão e tirarem dúvidas de estoque e frete.',
  'Informe o WhatsApp com DDD e defina a mensagem padrão. Adicione os links oficiais do Instagram, Facebook, TikTok e YouTube.',
  '(11) 98765-4321 com mensagem: "Olá! Vim pela loja virtual e quero tirar uma dúvida."'
)

addFieldBlock(
  'Gerador Inteligente de Links Rastreados (UTMs)',
  'Ferramenta para criar links com tags de rastreamento para anúncios e campanhas.',
  'Permite saber exatamente de onde veio cada pedido (ex: anúncio no Instagram, Stories, influenciador, status do WhatsApp ou e-mail marketing).',
  'Escolha o produto, selecione o canal e clique em "Gerar Link". Copie o link encurtado e utilize nas postagens e anúncios.',
  'https://sualoja.com.br/produto/teclado-rgb?utm_source=instagram&utm_medium=stories'
)

// ==========================================
// SEÇÃO 3: CHECKLIST DE BOAS PRÁTICAS
// ==========================================
addSectionHeading('3. Checklist de Boas Práticas para o Lojista', 'Rotina de Sucesso')

addCallout(
  'PASSO A PASSO PARA COLOCAR PRODUTOS NO GOOGLE SHOPPING:',
  '1. Cadastre o produto com Nome completo, Marca, Categoria e Código EAN/Barras.\n2. Na seção SEO, confirme o Slug e adicione o Part Number (MPN) do fabricante.\n3. Marque a caixa "Incluir no Google Merchant Center".\n4. Na Central de Marketing, certifique-se de que o Domínio Oficial está preenchido.\n5. Copie a URL do feed XML (/api/marketing/feed.xml) e cole no Google Merchant Center.\n6. Pronto! Seus produtos aparecerão com foto e preço nas pesquisas do Google Shopping.',
  'success'
)

// Numeração de páginas no rodapé
const totalPages = doc.internal.getNumberOfPages()
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i)
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `InfoDesk Store — Manual de SEO e Divulgação | Página ${i} de ${totalPages}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )
}

const outputPath = path.join(__dirname, '..', 'MANUAL_SEO_GOOGLE_SHOPPING.pdf')
const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
fs.writeFileSync(outputPath, pdfBuffer)

console.log(`PDF gerado com sucesso em: ${outputPath}`)
console.log(`Total de páginas: ${totalPages}`)
