// Endpoint de Consulta Pública e Internacional de Código de Barras (EAN-13 / UPC / ISBN)
// GET /api/barcode/lookup?ean=7891234567890
// POST /api/barcode/lookup { ean: "7891234567890" }

// Catálogo Curado de Alta Fidelidade de Hardware, Periféricos, Informática e Eletrônicos
const HARDWARE_EAN_DATABASE = {
  // --- Armazenamento / SSD / HD ---
  '7898585800018': {
    name: 'SSD Kingston A400 480GB SATA 3 2.5" 500MB/s',
    brand: 'Kingston',
    category: 'Hardware',
    description: 'SSD Kingston A400 de alta performance com leitura de 500MB/s e gravação de 450MB/s. 10x mais rápido que um disco rígido tradicional.',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Capacidade', value: '480 GB' },
      { label: 'Interface', value: 'SATA Rev. 3.0 (6Gb/s)' },
      { label: 'Velocidade de Leitura', value: '500 MB/s' },
      { label: 'Formato', value: '2.5 Polegadas' }
    ],
    suggestedPrice: 249.90,
    source: 'Catálogo Kingston Oficial'
  },
  '0740617261219': {
    name: 'SSD Kingston NV2 1TB M.2 2280 NVMe PCIe 4.0',
    brand: 'Kingston',
    category: 'Hardware',
    description: 'SSD NVMe PCIe 4.0 de alta velocidade com leitura até 3.500MB/s e gravação até 2.100MB/s.',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Capacidade', value: '1 TB (1000 GB)' },
      { label: 'Interface', value: 'PCIe 4.0 x4 NVMe' },
      { label: 'Velocidade', value: '3500 MB/s Leitura' }
    ],
    suggestedPrice: 429.90,
    source: 'Catálogo Kingston Oficial'
  },
  '0740617261202': {
    name: 'SSD Kingston NV2 500GB M.2 2280 NVMe PCIe 4.0',
    brand: 'Kingston',
    category: 'Hardware',
    description: 'SSD NVMe PCIe 4.0 com leitura de 3.500MB/s para notebooks e desktops modernos.',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Capacidade', value: '500 GB' },
      { label: 'Interface', value: 'PCIe 4.0 x4 NVMe' }
    ],
    suggestedPrice: 279.90,
    source: 'Catálogo Kingston Oficial'
  },
  '0887276327334': {
    name: 'SSD Samsung 970 EVO Plus 1TB NVMe M.2',
    brand: 'Samsung',
    category: 'Hardware',
    description: 'SSD NVMe líder em estabilidade e velocidade com tecnologia V-NAND Samsung e leitura de 3.500MB/s.',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Capacidade', value: '1 TB' },
      { label: 'Interface', value: 'PCIe Gen 3.0 x4, NVMe 1.3' }
    ],
    suggestedPrice: 589.00,
    source: 'Samsung Electronics Registry'
  },

  // --- Mouses e Teclados ---
  '0097855140883': {
    name: 'Mouse Gamer Sem Fio Logitech G305 Lightspeed 12.000 DPI Preto',
    brand: 'Logitech',
    category: 'Periféricos',
    description: 'Mouse gamer sem fio de última geração com sensor HERO de 12.000 DPI e tecnologia sem fio Lightspeed de 1ms de resposta ultrarrápida.',
    images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Sensor', value: 'HERO Óptico (200 - 12.000 DPI)' },
      { label: 'Conexão', value: 'Sem Fio Lightspeed (1ms)' },
      { label: 'Autonomia', value: 'Até 250 horas (1 Pilha AA)' },
      { label: 'Peso', value: '99g Ultraleve' }
    ],
    suggestedPrice: 289.90,
    source: 'Logitech Global Registry'
  },
  '0097855152862': {
    name: 'Teclado Mecânico Sem Fio Logitech G915 TKL RGB Lightspeed Switch GL Tactile',
    brand: 'Logitech',
    category: 'Periféricos',
    description: 'Teclado mecânico gamer de baixo perfil com corpo em liga de alumínio 5052 e iluminação RGB Lightsync personalizável tecla por tecla.',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Switches', value: 'GL Tactile Low Profile' },
      { label: 'Conexão', value: 'Lightspeed Wireless / Bluetooth / USB' },
      { label: 'Iluminação', value: 'RGB Lightsync por tecla' }
    ],
    suggestedPrice: 1299.00,
    source: 'Logitech Global Registry'
  },
  '0097855156389': {
    name: 'Mouse Gamer Logitech G Pro X Superlight Sem Fio 25.600 DPI',
    brand: 'Logitech',
    category: 'Periféricos',
    description: 'Mouse ultraleve para esports com menos de 63 gramas e sensor HERO 25K.',
    images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Sensor', value: 'HERO 25K (25.600 DPI)' },
      { label: 'Peso', value: '< 63g' }
    ],
    suggestedPrice: 799.90,
    source: 'Logitech Global Registry'
  },
  '0097855127266': {
    name: 'Mouse Sem Fio Logitech M280 Preto Confortável',
    brand: 'Logitech',
    category: 'Periféricos',
    description: 'Design ergonômico curvo com pegada em borracha macia e pilha com duração de até 18 meses.',
    images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Conexão', value: 'Sem Fio 2.4GHz com Nano Receptor USB' },
      { label: 'Sensor', value: 'Óptico Avançado 1000 DPI' }
    ],
    suggestedPrice: 89.90,
    source: 'Logitech Global Registry'
  },
  '6950376772091': {
    name: 'Teclado Mecânico Redragon Kumara K552 RGB Switch Outemu Blue',
    brand: 'Redragon',
    category: 'Periféricos',
    description: 'Teclado mecânico compacto tenkeyless (TKL) com estrutura metálica reforçada e switches azuis com feedback tátil e sonoro.',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Switches', value: 'Outemu Blue Mecânico' },
      { label: 'Layout', value: 'ABNT2 com Tecla Ç' },
      { label: 'Iluminação', value: 'RGB Chroma com múltiplos modos' }
    ],
    suggestedPrice: 229.90,
    source: 'Redragon Brasil'
  },

  // --- Placas de Vídeo e Processadores ---
  '4711081888498': {
    name: 'Placa de Vídeo ASUS Dual GeForce RTX 4060 EVO OC 8GB GDDR6 DLSS 3',
    brand: 'ASUS',
    category: 'Hardware',
    description: 'Placa de vídeo com arquitetura NVIDIA Ada Lovelace, ray tracing em tempo real, núcleos tensores de 4ª geração e DLSS 3 para altíssimas taxas de quadros.',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Memória de Vídeo', value: '8GB GDDR6 (128-bit)' },
      { label: 'Clock Boost', value: '2535 MHz (Modo OC)' },
      { label: 'Conexões', value: '1x HDMI 2.1a, 3x DisplayPort 1.4a' },
      { label: 'Refrigeração', value: 'Duas ventoinhas Axial-tech' }
    ],
    suggestedPrice: 2399.00,
    source: 'ASUS Hardware Database'
  },
  '0730143314541': {
    name: 'Processador AMD Ryzen 5 5600 3.5GHz (4.4GHz Turbo) 6-Core 12-Threads AM4',
    brand: 'AMD',
    category: 'Hardware',
    description: 'Processador gamer de alto custo-benefício com 6 núcleos, 12 threads e 32MB de cache L3 para soquete AM4.',
    images: ['https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Núcleos/Threads', value: '6 Cores / 12 Threads' },
      { label: 'Clock Base/Turbo', value: '3.5 GHz / 4.4 GHz' },
      { label: 'Soquete', value: 'AM4' },
      { label: 'TDP', value: '65W' }
    ],
    suggestedPrice: 849.00,
    source: 'AMD Global Component Database'
  },
  '0730143314930': {
    name: 'Processador AMD Ryzen 7 5700X 3.4GHz (4.6GHz Turbo) 8-Core 16-Threads AM4',
    brand: 'AMD',
    category: 'Hardware',
    description: 'Processador de 8 núcleos para renderização pesada e jogos competitivos em alta taxa de quadros.',
    images: ['https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Núcleos/Threads', value: '8 Cores / 16 Threads' },
      { label: 'Clock Base/Turbo', value: '3.4 GHz / 4.6 GHz' },
      { label: 'Cache L3', value: '32 MB' }
    ],
    suggestedPrice: 1199.00,
    source: 'AMD Global Component Database'
  },

  // --- Monitores ---
  '7893299923845': {
    name: 'Monitor Gamer LG UltraGear 27" IPS Full HD 144Hz 1ms HDR10 FreeSync',
    brand: 'LG',
    category: 'Monitores',
    description: 'Monitor gamer de alta taxa de atualização com painel IPS para cores vívidas e fidelidade de imagem em qualquer ângulo de visão.',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Tamanho da Tela', value: '27 Polegadas (1920x1080)' },
      { label: 'Taxa de Atualização', value: '144Hz' },
      { label: 'Tempo de Resposta', value: '1ms MBR' },
      { label: 'Tecnologia', value: 'AMD FreeSync Premium, HDR10' }
    ],
    suggestedPrice: 1399.00,
    source: 'LG Eletrônicos Brasil'
  },
  '7893299918230': {
    name: 'Monitor LG 24" IPS Full HD 75Hz FreeSync 24MK430H',
    brand: 'LG',
    category: 'Monitores',
    description: 'Monitor versátil para escritório e estudo com tela IPS antirreflexo e resolução Full HD.',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Tamanho', value: '24 Polegadas Full HD' },
      { label: 'Painel', value: 'IPS 75Hz' }
    ],
    suggestedPrice: 649.00,
    source: 'LG Eletrônicos Brasil'
  },

  // --- Memória RAM ---
  '0840006628354': {
    name: 'Memória RAM Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200MHz C16 Preta',
    brand: 'Corsair',
    category: 'Hardware',
    description: 'Memória RAM de alto desempenho para overclock com dissipador de calor em alumínio puro para dissipação rápida e circuitos integrados selecionados manualmente.',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Capacidade', value: '16GB (Kit 2x 8GB)' },
      { label: 'Velocidade', value: 'DDR4 3200MHz (PC4-25600)' },
      { label: 'Latência', value: 'CL16 (16-20-20-38)' },
      { label: 'Voltagem', value: '1.35V' }
    ],
    suggestedPrice: 319.90,
    source: 'Corsair Component Registry'
  },
  '0740617325881': {
    name: 'Memória RAM Kingston Fury Beast 8GB DDR4 3200MHz CL16',
    brand: 'Kingston',
    category: 'Hardware',
    description: 'Memória para jogos com dissipador de calor elegante de perfil baixo e suporte a Intel XMP e AMD Ryzen.',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Capacidade', value: '8 GB' },
      { label: 'Velocidade', value: 'DDR4 3200MHz' },
      { label: 'Latência', value: 'CL16' }
    ],
    suggestedPrice: 169.90,
    source: 'Kingston Technology'
  },

  // --- Redes e Wi-Fi ---
  '6935364089054': {
    name: 'Roteador Wi-Fi 6 TP-Link Archer AX12 Dual Band Gigabit AX1500',
    brand: 'TP-Link',
    category: 'Redes',
    description: 'Roteador sem fio Wi-Fi 6 de última geração com velocidades combinadas de até 1.5 Gbps, tecnologia Beamforming e 4 antenas de alto ganho.',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Padrão Wi-Fi', value: 'Wi-Fi 6 (802.11ax/ac/n/a/b/g)' },
      { label: 'Velocidade', value: '1201 Mbps (5 GHz) + 300 Mbps (2.4 GHz)' },
      { label: 'Portas', value: '1x WAN Gigabit + 3x LAN Gigabit' }
    ],
    suggestedPrice: 329.90,
    source: 'TP-Link Global Products'
  },
  '6935364052560': {
    name: 'Roteador TP-Link Archer C6 Dual Band AC1200 Gigabit MU-MIMO',
    brand: 'TP-Link',
    category: 'Redes',
    description: 'Roteador AC1200 com 4 antenas externas e portas 100% gigabit para planos de internet acima de 100 mega.',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Velocidade', value: 'AC1200 (867 Mbps + 300 Mbps)' },
      { label: 'Portas', value: 'Gigabit 10/100/1000' }
    ],
    suggestedPrice: 229.00,
    source: 'TP-Link Global Products'
  },

  // --- Headsets e Áudio ---
  '7898552003841': {
    name: 'Headset Gamer HyperX Cloud Stinger 2 com Som Espacial DTS:X',
    brand: 'HyperX',
    category: 'Periféricos',
    description: 'Headset gamer leve com espumas memory foam premium e almofadas giratórias de 90 graus com microfone condensador com cancelamento de ruído.',
    images: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Drivers', value: '50mm Dinâmicos' },
      { label: 'Áudio', value: 'DTS Headphone:X Spatial Audio' },
      { label: 'Conexão', value: 'P3 / P2 3.5mm Universal' }
    ],
    suggestedPrice: 259.00,
    source: 'HyperX Gaming Base'
  },
  '6925281988295': {
    name: 'Caixa de Som Portátil Bluetooth JBL Go 3 À Prova D\'Água IP67',
    brand: 'JBL',
    category: 'Áudio',
    description: 'Caixa de som ultraportátil com som JBL Pro original marcante, bateria de até 5 horas e proteção IP67 à prova d\'água e poeira.',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&h=600&fit=crop'],
    specs: [
      { label: 'Potência', value: '4.2W RMS' },
      { label: 'Proteção', value: 'IP67 À Prova d\'Água' },
      { label: 'Bateria', value: 'Até 5 Horas de Reprodução' }
    ],
    suggestedPrice: 249.00,
    source: 'Harman JBL Brasil'
  }
}

// Consulta em bases públicas globais e abertas
async function queryPublicBarcodeAPIs(ean) {
  const cleanEan = (ean || '').replace(/\D/g, '')

  // 1. Base Curada Prioritária
  if (HARDWARE_EAN_DATABASE[cleanEan]) {
    return {
      found: true,
      ean: cleanEan,
      ...HARDWARE_EAN_DATABASE[cleanEan]
    }
  }

  // 2. Open Food Facts / Open Products Facts / Open Beauty Facts (APIs Globais Abertas)
  const openDataEndpoints = [
    `https://world.openproductsfacts.org/api/v0/product/${cleanEan}.json`,
    `https://world.openfoodfacts.org/api/v2/product/${cleanEan}.json`,
    `https://br.openfoodfacts.org/api/v0/product/${cleanEan}.json`,
    `https://world.openbeautyfacts.org/api/v0/product/${cleanEan}.json`
  ]

  for (const url of openDataEndpoints) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2500)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'InfodeskStoreBarcodeLookup/2.0 (contato@infodesk.com.br)'
        },
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        if (data && (data.status === 1 || data.product)) {
          const p = data.product || {}
          const name = p.product_name || p.product_name_pt || p.generic_name || p.product_name_en
          if (name && name.trim()) {
            const brand = p.brands || p.brand_owner || p.creator || 'Fabricante Registrado'
            const category = p.categories ? p.categories.split(',')[0].trim() : 'Geral'
            const image = p.image_front_url || p.image_url || p.image_small_url || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'
            const description = p.generic_name || p.ingredients_text || `Produto oficial cadastrado sob código EAN-13 ${cleanEan}.`
            
            return {
              found: true,
              ean: cleanEan,
              name: name.trim(),
              brand: brand.trim(),
              category: category,
              description: description.trim(),
              images: [image],
              specs: [
                { label: 'EAN Oficial', value: cleanEan },
                { label: 'Quantidade / Conteúdo', value: p.quantity || '1 Unidade' }
              ],
              suggestedPrice: 49.90,
              source: 'Registro Internacional GS1 / Open Database'
            }
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId)
    }
  }

  // 3. Google Books API (Para Livros / Códigos ISBN 978 / 979)
  if (cleanEan.startsWith('978') || cleanEan.startsWith('979')) {
    try {
      const gBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanEan}`
      const gbRes = await fetch(gBooksUrl)
      if (gbRes.ok) {
        const gbData = await gbRes.json()
        if (gbData.totalItems > 0 && gbData.items?.[0]?.volumeInfo) {
          const v = gbData.items[0].volumeInfo
          return {
            found: true,
            ean: cleanEan,
            name: v.title + (v.subtitle ? ` - ${v.subtitle}` : ''),
            brand: v.authors ? v.authors.join(', ') : (v.publisher || 'Editora'),
            category: 'Livros & Publicações',
            description: v.description || `Publicação oficial registrada sob ISBN ${cleanEan}.`,
            images: [v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'],
            specs: [
              { label: 'ISBN/EAN', value: cleanEan },
              { label: 'Páginas', value: `${v.pageCount || 'N/A'}` },
              { label: 'Ano', value: `${v.publishedDate || 'N/A'}` }
            ],
            suggestedPrice: 59.90,
            source: 'Google Books Global Registry'
          }
        }
      }
    } catch (e) {}
  }

  // Se NÃO foi localizado nas bases abertas, NUNCA inventamos um produto falso!
  // Retornamos found: false com o EAN limpo para que o usuário possa cadastrar o produto real com 1 clique.
  return {
    found: false,
    ean: cleanEan,
    message: 'Código de barras lido corretamente, mas ainda não indexado nas bases abertas da internet.'
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  let ean = ''
  if (req.method === 'GET') {
    const urlObj = new URL(req.url, 'http://localhost')
    ean = urlObj.searchParams.get('ean') || urlObj.searchParams.get('code') || ''
  } else if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    ean = body?.ean || body?.code || ''
  }

  const cleanEan = (ean || '').replace(/\D/g, '')
  if (!cleanEan || cleanEan.length < 6) {
    res.statusCode = 400
    res.end(JSON.stringify({
      success: false,
      error: 'Código de barras inválido. Digite pelo menos 6 dígitos numéricos.'
    }))
    return
  }

  try {
    const productInfo = await queryPublicBarcodeAPIs(cleanEan)
    res.statusCode = 200
    res.end(JSON.stringify({
      success: true,
      ean: cleanEan,
      data: productInfo
    }))
  } catch (err) {
    console.error('Erro na consulta de código de barras:', err)
    res.statusCode = 500
    res.end(JSON.stringify({
      success: false,
      error: 'Erro interno ao consultar base de código de barras na internet.'
    }))
  }
}
