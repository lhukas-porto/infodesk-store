# Manual Completo: SEO, Google Shopping & Divulgação — InfoDesk Store

Este manual prático e técnico serve como guia definitivo para o lojista e a equipe de marketing preencherem e configurarem todas as funcionalidades de atração orgânica, anúncios no Google Shopping e rastreamento de tráfego da plataforma InfoDesk Store.

---

## 📑 Sumário

1. [Visão Geral da Arquitetura de SEO](#1-visão-geral-da-arquitetura-de-seo)
2. [Ficha do Produto — SEO & Google Shopping](#2-ficha-do-produto--seo--google-shopping)
   - [Slug da URL (URL Amigável)](#slug-da-url-url-amigável)
   - [Palavra-Chave Principal](#palavra-chave-principal)
   - [Título SEO (<title>)](#título-seo-title)
   - [Meta Description SEO](#meta-description-seo)
   - [Texto Alternativo da Imagem (Alt Text)](#texto-alternativo-da-imagem-alt-text)
   - [Part Number / MPN do Fabricante](#part-number--mpn-do-fabricante)
   - [Categoria do Google Shopping (Taxonomia Oficial)](#categoria-do-google-shopping-taxonomia-oficial)
   - [Opções de Destaque e Visibilidade (Checkboxes)](#opções-de-destaque-e-visibilidade-checkboxes)
3. [Central de Marketing & SEO da Loja](#3-central-de-marketing--seo-da-loja)
   - [Domínio Próprio & URLs Canônicas](#domínio-próprio--urls-canônicas)
   - [Sitemap.xml & Robots.txt Dinâmicos](#sitemapxml--robotstxt-dinâmicos)
   - [Google Analytics 4 (GA4) com Eventos Automáticos](#google-analytics-4-ga4-com-eventos-automáticos)
   - [Google Search Console (Validação Rápida)](#google-search-console-validação-rápida)
   - [Google Merchant Center (Feed XML ao Vivo)](#google-merchant-center-feed-xml-ao-vivo)
   - [WhatsApp Oficial & Redes Sociais](#whatsapp-oficial--redes-sociais)
   - [Gerador Inteligente de Links Rastreados (UTMs)](#gerador-inteligente-de-links-rastreados-utms)
4. [Checklist de Rotina para o Lojista](#4-checklist-de-rotina-para-o-lojista)

---

## 1. Visão Geral da Arquitetura de SEO

O sistema de divulgação da InfoDesk Store atua em duas frentes integradas:

1. **Nível Produto**: Otimização individual de cada item do catálogo para disputar posições na busca orgânica do Google e ser exibido com foto, preço e parcelamento no Google Shopping.
2. **Nível Loja (Central de Marketing)**: Integração com as ferramentas corporativas do Google (Analytics 4, Search Console, Merchant Center), gestão de domínio canônico e criação de links com parâmetros UTM para medir o retorno financeiro de campanhas.

---

## 2. Ficha do Produto — SEO & Google Shopping
*(Painel de Controle > Produtos > Cadastrar / Editar Produto)*

### Slug da URL (URL Amigável)
- **O que é:** O caminho de texto que identifica a página do produto após o domínio da loja.
- **Para que serve:** O Google prioriza URLs legíveis e sem parâmetros complexos. URLs limpas aumentam a taxa de clique e a confiança do usuário.
- **Como preencher:** Se deixar vazio, o sistema gera automaticamente a partir do nome. Para personalizar, use letras minúsculas separadas por hífen (`-`), sem acentos ou caracteres especiais.
- **Exemplo:** `teclado-gamer-mecanico-rgb-switch-blue`

### Palavra-Chave Principal
- **O que é:** O termo de busca prioritário que expressa a intenção de compra do produto.
- **Para que serve:** Informa aos algoritmos de busca qual termo deve ter maior relevância nesta página.
- **Como preencher:** Escolha a expressão mais direta e comum que um comprador digitaria no Google.
- **Exemplo:** `monitor gamer 144hz ips` ou `ssd nvme 1tb kingston`

### Título SEO (`<title>`)
- **O que é:** A linha principal de destaque que aparece em azul nos resultados de pesquisa do Google e na aba do navegador.
- **Para que serve:** É o fator que mais impacta a decisão inicial do usuário de clicar no seu link ou no concorrente.
- **Como preencher:** Recomendamos a fórmula:  
  `[Nome do Produto] - [Marca] - [Diferencial / Benefício] | [Nome da Loja]`  
  *Mantenha entre 50 e 60 caracteres para evitar truncamento.*
- **Exemplo:** `Monitor Gamer 27" 165Hz Asus Rog Strix - Envio Rápido | InfoDesk`

### Meta Description SEO
- **O que é:** O parágrafo descritivo de até 160 caracteres exibido abaixo do título nos resultados do Google.
- **Para que serve:** É a vitrine de texto do anúncio. Uma boa chamada para ação (CTA) converte impressões de busca em visitas reais.
- **Como preencher:** Descreva o produto com clareza, cite diferenciais comerciais (garantia, desconto no Pix, parcelamento sem juros) e encerre com um convite.
- **Exemplo:** `Compre o Teclado Gamer RGB com switches mecânicos e garantia nacional. Até 10x sem juros ou 3% off no Pix. Entrega rápida!`

### Texto Alternativo da Imagem (Alt Text)
- **O que é:** A descrição em texto da foto principal do item.
- **Para que serve:** Permite a indexação no Google Imagens (gerando tráfego adicional gratuito) e cumpre os requisitos de acessibilidade digital para leitores de tela.
- **Como preencher:** Descreva objetivamente o produto e o ângulo da imagem.
- **Exemplo:** `Foto frontal do mouse gamer sem fio preto com iluminação RGB ligada`

### Part Number / MPN do Fabricante
- **O que é:** Código alfanumérico exclusivo atribuído pelo fabricante (Manufacturer Part Number).
- **Para que serve:** Exigido pelo Google Shopping para associar sua oferta ao catálogo de produtos mundial e exibi-la em pesquisas técnicas.
- **Como preencher:** Copie exatamente o código impresso na caixa ou ficha técnica do fabricante.
- **Exemplo:** `910-005790` (Logitech) ou `MZ-V8V1T0B/AM` (Samsung)

### Categoria do Google Shopping (Taxonomia Oficial)
- **O que é:** O departamento padronizado na árvore mundial de categorias do Google.
- **Para que serve:** Garante que o Google Shopping mostre seu produto no departamento correto, sem misturar com produtos de outros segmentos.
- **Como preencher:** Informe o caminho hierárquico separado por `>`. Se vazio, o sistema mapeia automaticamente com base na categoria interna.
- **Exemplo:** `Eletrônicos > Computadores > Periféricos > Teclados`

### Opções de Destaque e Visibilidade (Checkboxes)
- ⭐ **Produto-Âncora (Destaque SEO):** Prioriza o produto no Sitemap XML entregue ao Google e destaca nas campanhas internas da loja.
- 🔥 **Oferta da Semana:** Ativa um selo visual de urgência e destaque promocional na vitrine.
- 🛒 **Incluir no Google Merchant Center:** Chave de liga/desliga para envio ao feed do Google Shopping. Mantenha marcado para anunciar o item.

---

## 3. Central de Marketing & SEO da Loja
*(Painel de Controle > Aba Marketing)*

### Domínio Próprio & URLs Canônicas
- **Função:** Define o endereço oficial da loja (ex: `infodeskstore.com.br`).
- **Importância:** O sistema utiliza este domínio para construir todas as URLs absolutas do Sitemap XML, Robots.txt, Feed do Google Shopping e tags canônicas (impedindo que o Google encare o site como conteúdo duplicado).

### Sitemap.xml & Robots.txt Dinâmicos
- **Função:** Arquivos técnicos lidos automaticamente pelos robôs de busca.
- **Funcionamento:** São gerados em tempo real pelas rotas `/sitemap.xml` e `/robots.txt`, atualizando-se sempre que um produto novo é cadastrado.

### Google Analytics 4 (GA4) com Eventos Automáticos
- **Função:** Medição e inteligência de tráfego oficial do Google.
- **Como configurar:** Insira seu ID de Métrica (formato `G-XXXXXXXXXX`) e marque a opção ativar.
- **Eventos Automáticos já embutidos no código:**
  - `view_item`: Quando o cliente abre a página do produto.
  - `add_to_cart`: Quando adiciona itens ao carrinho.
  - `begin_checkout`: Quando abre o modal de finalização de compra.
  - `purchase`: Quando o pedido é pago e confirmado com sucesso.

### Google Search Console (Validação Rápida)
- **Função:** Monitora cliques, impressões, palavras-chave de busca e saúde da indexação da loja.
- **Como configurar:** Cole a meta tag de verificação fornecida pelo Google. A loja injeta no `<head>` automaticamente.

### Google Merchant Center (Feed XML ao Vivo)
- **Função:** Fornece o catálogo da loja para o Google Shopping em formato XML padronizado.
- **URL do Feed:** `https://sualoja.com.br/api/marketing/feed.xml`
- **Como ativar:** No Google Merchant Center, adicione um novo feed por **"Busca Programada Diária"** e cole essa URL. O Google atualiza os preços e estoque todos os dias de forma 100% automática.

### WhatsApp Oficial & Redes Sociais
- **Função:** Configura o canal de atendimento direto e links oficiais da marca (Instagram, Facebook, TikTok e YouTube).
- **Recurso:** Permite definir uma mensagem de boas-vindas padrão que já abre digitada no celular do cliente.

### Gerador Inteligente de Links Rastreados (UTMs)
- **Função:** Cria URLs de produtos com tags de rastreamento de campanha (`utm_source`, `utm_medium`, `utm_campaign`).
- **Aplicação:** Permite saber exatamente quais canais (Instagram, WhatsApp, influenciadores ou e-mail) geraram vendas reais no relatório da loja.

---

## 4. Checklist de Rotina para o Lojista

1. **Ao cadastrar qualquer produto novo:**
   - Preencha Nome, Marca, Categoria e Código EAN/Barras.
   - Deixe o sistema gerar o **Slug** ou personalize com termos limpos.
   - Adicione o código **MPN** do fabricante e confirme o **Título SEO**.
   - Mantenha a caixa **"Incluir no Google Merchant Center"** marcada.
2. **Na Central de Marketing:**
   - Confirme se o **Domínio Oficial** está salvo corretamente.
   - Cadastre a URL do feed XML (`/api/marketing/feed.xml`) no seu painel do Google Merchant Center.
   - Conecte o **Google Analytics 4** para acompanhar os acessos e conversões.
3. **Nas redes sociais e promoções:**
   - Use sempre o **Gerador de Links UTM** para divulgar links rastreados e descobrir quais campanhas trazem mais lucro.
