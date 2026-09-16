// Gerenciador de SEO Dinâmico, Metadados e Dados Estruturados Schema.org (JSON-LD)

/**
 * Converte qualquer texto em slug amigável para URLs
 */
export function slugify(text) {
  if (!text) return ''
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Espaços para traços
    .replace(/-+/g, '-') // Traços múltiplos
}

/**
 * Atualiza ou cria uma tag <meta> no <head>
 */
function setMetaTag(name, content, attr = 'name') {
  if (typeof document === 'undefined') return
  if (!content) {
    const existing = document.head.querySelector(`meta[${attr}="${name}"]`)
    if (existing) existing.remove()
    return
  }

  let tag = document.head.querySelector(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * Atualiza ou cria o link canonical no <head>
 */
function setCanonicalUrl(url) {
  if (typeof document === 'undefined') return
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

/**
 * Injeta ou atualiza script JSON-LD de Schema.org
 */
function setJsonLd(id, data) {
  if (typeof document === 'undefined') return
  let script = document.head.querySelector(`script#${id}`)
  if (!script) {
    script = document.createElement('script')
    script.setAttribute('type', 'application/ld+json')
    script.setAttribute('id', id)
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

/**
 * Aplica SEO completo da página inicial da loja
 */
export function applyStoreSeo({
  storeName,
  primaryDomain = 'minhaloja.com.br',
  seoTitle,
  seoDescription,
  shareImage,
  searchConsoleVerification,
  companyData
}) {
  if (typeof document === 'undefined') return

  const nomeFantasia = companyData?.nomeFantasia?.trim() || storeName || 'Minha Loja'
  const title = seoTitle || nomeFantasia
  const description = seoDescription || `${nomeFantasia} com ofertas em tecnologia, escritório e variedades. Frete rápido e pagamento seguro.`
  const canonicalUrl = `https://${primaryDomain}/`
  const defaultImage = shareImage || `${canonicalUrl}assets/store-logo.png`

  // 1. Título & Meta tags básicas
  document.title = title
  setMetaTag('description', description)
  setCanonicalUrl(canonicalUrl)

  // 2. Google Search Console Verification
  if (searchConsoleVerification) {
    setMetaTag('google-site-verification', searchConsoleVerification)
  } else {
    setMetaTag('google-site-verification', '')
  }

  // 3. Open Graph (Facebook, WhatsApp, LinkedIn)
  setMetaTag('og:site_name', storeName, 'property')
  setMetaTag('og:type', 'website', 'property')
  setMetaTag('og:title', title, 'property')
  setMetaTag('og:description', description, 'property')
  setMetaTag('og:url', canonicalUrl, 'property')
  setMetaTag('og:image', defaultImage, 'property')

  // 4. Twitter Card
  setMetaTag('twitter:card', 'summary_large_image')
  setMetaTag('twitter:title', title)
  setMetaTag('twitter:description', description)
  setMetaTag('twitter:image', defaultImage)

  // 5. Dados Estruturados Schema.org: WebSite & Organization
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: storeName,
    legalName: companyData?.razaoSocial || storeName,
    url: canonicalUrl,
    logo: defaultImage,
    telephone: companyData?.telefone || companyData?.whatsapp || '',
    email: companyData?.emailPrincipal || '',
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${companyData?.endereco || ''}, ${companyData?.numero || ''}`,
      addressLocality: companyData?.cidade || 'Brasília',
      addressRegion: companyData?.estado || 'DF',
      postalCode: companyData?.cep || '',
      addressCountry: 'BR'
    }
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: storeName,
    url: canonicalUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${canonicalUrl}?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }

  setJsonLd('schema-store-org', orgSchema)
  setJsonLd('schema-store-website', websiteSchema)
}

/**
 * Aplica SEO completo para a página ou modal de um produto específico
 */
export function applyProductSeo({
  product,
  storeName,
  primaryDomain = 'minhaloja.com.br'
}) {
  if (typeof document === 'undefined' || !product) return

  const prodSlug = product.slug || slugify(product.name)
  const productUrl = `https://${primaryDomain}/#produto/${prodSlug}`
  const title = product.seo_title || `${product.name} | ${storeName}`
  const description = product.seo_description || product.description || `Compre ${product.name} na ${storeName} com garantia e frete rápido.`
  const image = (product.images && product.images[0]) ? product.images[0] : `https://${primaryDomain}/assets/store-logo.png`
  const price = parseFloat(product.price) || 0
  const isAvailable = (parseInt(product.stock) || 0) > 0

  // 1. Título & Meta tags
  document.title = title
  setMetaTag('description', description)
  setCanonicalUrl(productUrl)

  // 2. Open Graph para Compartilhamento Rico no WhatsApp/Redes
  setMetaTag('og:site_name', storeName, 'property')
  setMetaTag('og:type', 'product', 'property')
  setMetaTag('og:title', title, 'property')
  setMetaTag('og:description', description, 'property')
  setMetaTag('og:url', productUrl, 'property')
  setMetaTag('og:image', image, 'property')
  setMetaTag('product:price:amount', price.toFixed(2), 'property')
  setMetaTag('product:price:currency', 'BRL', 'property')

  // 3. Twitter Card
  setMetaTag('twitter:card', 'summary_large_image')
  setMetaTag('twitter:title', title)
  setMetaTag('twitter:description', description)
  setMetaTag('twitter:image', image)

  // 4. Schema.org Product + Offer
  const productSchema = buildProductSchema({ product, storeName, primaryDomain, productUrl, image, price, isAvailable })

  // 5. Breadcrumb
  const breadcrumbSchema = buildBreadcrumbSchema({ product, primaryDomain, productUrl })

  setJsonLd('schema-product-item', productSchema)
  setJsonLd('schema-product-breadcrumb', breadcrumbSchema)
}

/**
 * Constrói o objeto estruturado Schema.org do Produto para SEO e testes
 */
export function buildProductSchema({ product, storeName = 'Loja', primaryDomain = 'minhaloja.com.br', productUrl = null, image = null, price = null, isAvailable = null }) {
  const resolvedUrl = productUrl || `https://${primaryDomain}/#produto/${product.slug || slugify(product.name)}`
  const resolvedPrice = price !== null ? price : (parseFloat(product.price) || 0)
  const available = isAvailable !== null ? isAvailable : ((parseInt(product.stock) || 0) > 0)
  const resolvedImg = image || (product.images && product.images[0]) || `https://${primaryDomain}/assets/store-logo.png`

  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images || [resolvedImg],
    description: product.seo_description || product.description || '',
    sku: product.id,
    ...(product.ean ? { gtin13: product.ean } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    brand: {
      '@type': 'Brand',
      name: product.brand || storeName
    },
    offers: {
      '@type': 'Offer',
      url: resolvedUrl,
      priceCurrency: 'BRL',
      price: resolvedPrice.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      itemCondition: 'https://schema.org/NewCondition',
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: storeName
      }
    }
  }

  if (product.reviews > 0 && product.rating > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviews
    }
  }

  return schema
}

/**
 * Constrói o BreadcrumbList estruturado Schema.org
 */
export function buildBreadcrumbSchema({ product, primaryDomain = 'minhaloja.com.br', productUrl = null }) {
  const resolvedUrl = productUrl || `https://${primaryDomain}/#produto/${product.slug || slugify(product.name)}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: `https://${primaryDomain}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product?.category || 'Produtos',
        item: `https://${primaryDomain}/#products`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product?.name || 'Produto',
        item: resolvedUrl
      }
    ]
  }
}

