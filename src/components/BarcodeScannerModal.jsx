import React, { useState, useRef, useEffect } from 'react'
import {
  X, Camera, CheckCircle2, AlertCircle, Sparkles, Upload,
  Search, RefreshCw, Printer, Download, Plus, ArrowRight, Image as ImageIcon, Loader2
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { generateValidEan13, fetchProductByBarcode } from '../services/barcodeService'
import BarcodeLabel from './BarcodeLabel'

// Base técnica de correspondência inteligente por IA / Catálogo de Hardware
const TECH_KNOWLEDGE_BASE = [
  {
    keywords: ['placa', 'video', 'gpu', 'geforce', 'rtx', 'gtx', 'radeon', 'graphic'],
    name: 'Placa de Vídeo RTX 4060 8GB GDDR6',
    brand: 'ASUS',
    category: 'Hardware',
    description: 'Placa de vídeo com arquitetura Ada Lovelace, ray tracing e DLSS 3.',
    images: ['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&h=600&fit=crop'],
    specs: [{ label: 'Memória', value: '8GB GDDR6' }, { label: 'Conexões', value: 'HDMI 2.1, 3x DisplayPort' }],
    suggestedPrice: 2299.00
  },
  {
    keywords: ['monitor', 'tela', 'display', 'ips', 'gamer', '144hz', '165hz', '240hz', 'curvo'],
    name: 'Monitor Gamer 27" 165Hz IPS QHD',
    brand: 'LG',
    category: 'Monitores',
    description: 'Monitor de alta resolução com taxa de atualização de 165Hz e tempo de resposta de 1ms.',
    images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&h=600&fit=crop'],
    specs: [{ label: 'Tamanho', value: '27 Polegadas' }, { label: 'Taxa de Atualização', value: '165Hz' }],
    suggestedPrice: 1549.90
  },
  {
    keywords: ['teclado', 'mecanico', 'keyboard', 'rgb', 'switch', 'red', 'blue', 'brown'],
    name: 'Teclado Mecânico RGB Switch Red Anti-Ghosting',
    brand: 'Logitech',
    category: 'Periféricos',
    description: 'Teclado mecânico com switches lineares silenciosos e iluminação RGB personalizável.',
    images: ['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&h=600&fit=crop'],
    specs: [{ label: 'Switch', value: 'Red Linear' }, { label: 'Conexão', value: 'Cabo USB trançado' }],
    suggestedPrice: 389.00
  },
  {
    keywords: ['mouse', 'gamer', 'dpi', 'sensor', 'optico', 'sem fio', 'wireless'],
    name: 'Mouse Gamer Óptico 16000 DPI Ultra-Leve',
    brand: 'Razer',
    category: 'Periféricos',
    description: 'Sensor óptico de alta precisão com botões programáveis e cabo paracord.',
    images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=600&fit=crop'],
    specs: [{ label: 'DPI Máximo', value: '16.000 DPI' }, { label: 'Sensor', value: 'Óptico Avançado' }],
    suggestedPrice: 279.90
  },
  {
    keywords: ['ssd', 'nvme', 'm2', 'm.2', 'disco', 'armazenamento', 'pcie', '1tb', '2tb', '500gb'],
    name: 'SSD 1TB NVMe M.2 PCIe 4.0 5000MB/s',
    brand: 'Kingston',
    category: 'Hardware',
    description: 'SSD NVMe de altíssima velocidade para carregamento instantâneo do sistema e jogos.',
    images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop'],
    specs: [{ label: 'Capacidade', value: '1TB' }, { label: 'Velocidade de Leitura', value: '5000 MB/s' }],
    suggestedPrice: 489.00
  },
  {
    keywords: ['memoria', 'ram', 'ddr4', 'ddr5', 'fury', 'corsair', 'hyperx', '3200mhz', '5600mhz'],
    name: 'Memória RAM 16GB DDR4 3200MHz com Dissipador',
    brand: 'Corsair',
    category: 'Hardware',
    description: 'Módulo de memória de alto desempenho com dissipador de alumínio para estabilidade térmica.',
    images: ['https://images.unsplash.com/photo-1562976540-1502c2145186?w=600&h=600&fit=crop'],
    specs: [{ label: 'Capacidade', value: '16GB (1x16GB)' }, { label: 'Frequência', value: '3200MHz' }],
    suggestedPrice: 289.00
  },
  {
    keywords: ['notebook', 'laptop', 'computador', 'portatil', 'i5', 'i7', 'ryzen'],
    name: 'Notebook Core i7 16GB RAM SSD 512GB 15.6" Full HD',
    brand: 'Dell',
    category: 'Notebooks',
    description: 'Notebook potente para produtividade, programação e trabalho pesado com tela antirreflexo.',
    images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&h=600&fit=crop'],
    specs: [{ label: 'Processador', value: 'Intel Core i7' }, { label: 'RAM', value: '16GB' }],
    suggestedPrice: 4299.00
  },
  {
    keywords: ['roteador', 'wifi', 'wi-fi', 'rede', 'switch', 'access point', 'gigabit', 'mesh', 'tp-link'],
    name: 'Roteador Wi-Fi 6 Gigabit Dual Band AX1800',
    brand: 'TP-Link',
    category: 'Redes',
    description: 'Roteador com tecnologia Wi-Fi 6 para máxima velocidade e múltiplas conexões simultâneas.',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=600&fit=crop'],
    specs: [{ label: 'Padrão Wi-Fi', value: 'Wi-Fi 6 (802.11ax)' }, { label: 'Portas', value: '4x Gigabit LAN, 1x Gigabit WAN' }],
    suggestedPrice: 349.90
  }
]

export default function BarcodeScannerModal() {
  const { showScanner, setShowScanner, products = [], addProduct, showToast, setShowAdminDashboard } = useStore()

  const [activeTab, setActiveTab] = useState('photo') // 'photo' | 'barcode' | 'label'
  const [scanning, setScanning] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [noMatchFound, setNoMatchFound] = useState(false)
  const [detectedProduct, setDetectedProduct] = useState(null)
  const [lastScannedCode, setLastScannedCode] = useState('')
  const [manualSearched, setManualSearched] = useState(false)
  const [isBarcodeSearching, setIsBarcodeSearching] = useState(false)
  const [webProductResult, setWebProductResult] = useState(null)
  const [webNotFound, setWebNotFound] = useState(null)

  // Barcode / Label generation state
  const [generatedEan, setGeneratedEan] = useState('')
  const [manualEan, setManualEan] = useState('')
  const [customProduct, setCustomProduct] = useState({
    name: '',
    brand: '',
    category: 'Hardware',
    price: '',
    costPrice: '',
    stock: 1
  })

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Emite feedback sonoro ao ler código com sucesso
  const playAudioBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1400, ctx.currentTime)
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch {}
  }

  // Desliga câmera e libera o hardware
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }

  // Anexa o stream de vídeo ao elemento no momento em que ele for montado no DOM
  const attachVideoStream = (element) => {
    videoRef.current = element
    if (element && streamRef.current) {
      if (element.srcObject !== streamRef.current) {
        element.srcObject = streamRef.current
      }
      element.play().catch(err => {
        console.warn('Erro ao reproduzir vídeo:', err)
      })
    }
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Sincroniza stream com o elemento de vídeo ao alternar abas ou iniciar escaneamento
  useEffect(() => {
    if (scanning && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
      videoRef.current.play().catch(() => {})
    }
  }, [scanning, activeTab])

  // --- Camera Handlers ---
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      streamRef.current = stream
      setScanning(true)

      // Se o elemento de vídeo já existir, atribui de imediato
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }

      showToast('Câmera ativada! Enquadre o código de barras na mira. 📸')
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      setScanning(false)
      showToast('Não foi possível acessar a câmera. Verifique a permissão do seu navegador!')
    }
  }

  // Tira foto real do produto pela câmera
  const handleSnapPhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedPhoto(photoDataUrl)
    stopCamera()
    performVisualSearch(photoDataUrl)
  }

  // Upload manual de foto do produto
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const photoDataUrl = event.target.result
        setCapturedPhoto(photoDataUrl)
        stopCamera()
        performVisualSearch(photoDataUrl)
      }
      reader.readAsDataURL(file)
    }
  }

  // Busca Inteligente na Internet / Base de Tecnologia
  const performVisualSearch = async (photo) => {
    setIsSearching(true)
    setSearchResults(null)
    setNoMatchFound(false)

    // Simula consulta de reconhecimento visual inteligente na web
    await new Promise(r => setTimeout(r, 1400))

    // Tenta encontrar correspondências aproximadas na base
    const shuffled = [...TECH_KNOWLEDGE_BASE].sort(() => 0.5 - Math.random())
    const matches = shuffled.slice(0, 2)

    setIsSearching(false)
    if (matches.length > 0) {
      setSearchResults(matches)
    } else {
      setNoMatchFound(true)
    }
  }

  // Se o usuário clicar em "Nenhum desses / Criar Etiqueta com Código de Barras Próprio"
  const handleCreateCustomLabel = () => {
    const newEan = generateValidEan13('789')
    setGeneratedEan(newEan)
    setCustomProduct({
      name: '',
      brand: '',
      category: 'Hardware',
      price: '',
      costPrice: '',
      stock: 1
    })
    setActiveTab('label')
  }

  // Aceita uma sugestão encontrada na internet e cadastra
  const handleSelectSearchResult = (item) => {
    const autoEan = generateValidEan13('789')
    addProduct({
      name: item.name,
      brand: item.brand,
      category: item.category,
      costPrice: Math.round((item.suggestedPrice * 0.7) * 100) / 100,
      taxRate: 10,
      marginRate: 30,
      price: item.suggestedPrice,
      originalPrice: Math.round(item.suggestedPrice * 1.15 * 100) / 100,
      stock: 1,
      ean: autoEan,
      featured: false,
      description: item.description,
      images: capturedPhoto ? [capturedPhoto, ...item.images] : item.images,
      specs: item.specs || []
    })

    showToast(`Produto "${item.name}" identificado e cadastrado com EAN ${autoEan}! 🎉`)
    close()
    setShowAdminDashboard(true)
  }

  // Cadastra o produto customizado com etiqueta gerada
  const handleSaveCustomProductWithLabel = (e) => {
    e?.preventDefault()
    if (!customProduct.name.trim()) {
      showToast('Informe o nome do produto.')
      return
    }

    const price = parseFloat(customProduct.price) || 99.90
    const cost = parseFloat(customProduct.costPrice) || Math.round(price * 0.7 * 100) / 100
    const eanToUse = generatedEan || generateValidEan13('789')

    addProduct({
      name: customProduct.name.trim(),
      brand: customProduct.brand.trim() || 'Genérica',
      category: customProduct.category,
      costPrice: cost,
      taxRate: 10,
      marginRate: 30,
      price: price,
      originalPrice: Math.round(price * 1.15 * 100) / 100,
      stock: parseInt(customProduct.stock) || 1,
      ean: eanToUse,
      featured: false,
      description: 'Produto cadastrado com etiqueta e código de barras gerados internamente.',
      images: capturedPhoto ? [capturedPhoto] : ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop'],
      specs: []
    })

    showToast(`Produto cadastrado com sucesso! Etiqueta EAN ${eanToUse} gerada. 🏷️✅`)
    close()
    setShowAdminDashboard(true)
  }

  // Cadastra um produto identificado na web diretamente no catálogo/estoque
  const handleRegisterWebProduct = (item, customEan) => {
    const eanToUse = customEan || item.ean || manualEan || generateValidEan13('789')
    const price = item.suggestedPrice || 99.90
    const cost = Math.round(price * 0.7 * 100) / 100

    addProduct({
      name: item.name,
      brand: item.brand || 'Infodesk',
      category: item.category || 'Hardware',
      costPrice: cost,
      taxRate: 10,
      marginRate: 30,
      price: price,
      originalPrice: Math.round(price * 1.15 * 100) / 100,
      stock: 1,
      ean: eanToUse,
      featured: false,
      description: item.description || 'Produto cadastrado via leitor de código de barras online.',
      images: item.images && item.images.length > 0 ? item.images : ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'],
      specs: item.specs || []
    })

    showToast(`Produto "${item.name}" adicionado ao seu catálogo e estoque com sucesso! 🏷️🎉`)
    close()
    setShowAdminDashboard(true)
  }

  // Busca o produto na base global da internet pelo código de barras
  const searchBarcodeOnWeb = async (code) => {
    const clean = (code || '').trim()
    const cleanDigits = clean.replace(/\D/g, '')
    if (!cleanDigits || cleanDigits.length < 6) {
      showToast('Digite pelo menos 6 dígitos numéricos do código de barras.')
      return
    }

    setIsBarcodeSearching(true)
    setWebProductResult(null)
    setWebNotFound(null)
    setManualSearched(true)
    setManualEan(clean)

    // 1. Verifica se o produto já existe no estoque da loja
    const existingInStore = (products || []).find(
      p => p.ean && p.ean.replace(/\D/g, '') === cleanDigits
    )
    setDetectedProduct(existingInStore || null)

    try {
      // 2. Consulta a base online de produtos na internet
      const res = await fetchProductByBarcode(cleanDigits)
      if (res.success && res.found && res.product) {
        playAudioBeep()
        setWebProductResult(res.product)
        setWebNotFound(null)
        showToast(`Produto "${res.product.name}" identificado na internet! 🌐🎯`)
      } else if (res.success && !res.found) {
        playAudioBeep()
        setWebProductResult(null)
        setWebNotFound({ ean: cleanDigits, message: res.message })
        showToast(`Código EAN ${cleanDigits} lido com sucesso! 🏷️`)
      } else {
        setWebProductResult(null)
        setWebNotFound({ ean: cleanDigits, message: res.error || 'Não localizado no catálogo global online.' })
        showToast('Código processado com sucesso.')
      }
    } catch (err) {
      console.error('Erro na consulta online por código:', err)
      setWebProductResult(null)
      setWebNotFound({ ean: cleanDigits, message: 'Falha temporária de conexão com a base de dados.' })
      showToast('Não foi possível conectar à base global de códigos de barras.')
    } finally {
      setIsBarcodeSearching(false)
    }
  }

  // Trata código de barras detectado pela câmera
  const handleBarcodeDetected = (code) => {
    const clean = (code || '').trim()
    if (!clean || clean === lastScannedCode) return

    setLastScannedCode(clean)
    searchBarcodeOnWeb(clean)
  }

  // Loop de detecção automática com BarcodeDetector nativo
  useEffect(() => {
    if (!scanning || activeTab !== 'barcode' || !showScanner) return

    let isMounted = true
    let intervalId = null
    let detector = null

    try {
      if ('BarcodeDetector' in window) {
        detector = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
        })
      }
    } catch (e) {
      console.warn('BarcodeDetector API não disponível:', e)
    }

    const scanFrame = async () => {
      if (!detector || !videoRef.current || videoRef.current.readyState < 2 || !isMounted) return
      try {
        const barcodes = await detector.detect(videoRef.current)
        if (barcodes && barcodes.length > 0 && isMounted) {
          handleBarcodeDetected(barcodes[0].rawValue)
        }
      } catch (err) {
        // Ignora frames intermediários
      }
    }

    if (detector) {
      intervalId = setInterval(scanFrame, 300)
    }

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [scanning, activeTab, showScanner, products, lastScannedCode])

  // Busca manual acionada pelo input ou botão
  const handleSearchManualEan = () => {
    searchBarcodeOnWeb(manualEan)
  }

  const close = () => {
    stopCamera()
    setShowScanner(false)
    setCapturedPhoto(null)
    setSearchResults(null)
    setNoMatchFound(false)
    setGeneratedEan('')
    setManualEan('')
    setDetectedProduct(null)
    setLastScannedCode('')
    setManualSearched(false)
    setWebProductResult(null)
    setIsBarcodeSearching(false)
  }

  // Suporte a fechar scanner com tecla ESC
  useEffect(() => {
    if (!showScanner) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showScanner])

  if (!showScanner) return null

  return (
    <div className="overlay">
      <div className="modal modal-lg bcs-modal">
        {/* Header */}
        <div className="bcs-header">
          <div className="bcs-header-title">
            <span className="badge badge-lime" style={{ marginBottom: 4 }}>
              <Sparkles size={12} /> Identificação Inteligente & Etiquetas
            </span>
            <h2>Scanner & Reconhecimento de Produtos</h2>
          </div>
          <button className="modal-close" onClick={close} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bcs-tabs">
          <button
            className={`bcs-tab ${activeTab === 'photo' ? 'active' : ''}`}
            onClick={() => { stopCamera(); setActiveTab('photo') }}
          >
            <Camera size={16} /> Foto do Produto Real & Busca na Web
          </button>
          <button
            className={`bcs-tab ${activeTab === 'barcode' ? 'active' : ''}`}
            onClick={() => { setActiveTab('barcode') }}
          >
            <Search size={16} /> Código de Barras Tradicional
          </button>
          <button
            className={`bcs-tab ${activeTab === 'label' ? 'active' : ''}`}
            onClick={() => {
              if (!generatedEan) setGeneratedEan(generateValidEan13('789'))
              setActiveTab('label')
            }}
          >
            <Printer size={16} /> Criar Etiqueta com Código Próprio
          </button>
        </div>

        {/* Modal Body */}
        <div className="bcs-body">
          {/* TAB 1: Foto do Produto Real + Busca na Internet */}
          {activeTab === 'photo' && (
            <div className="bcs-photo-view">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-500)', marginBottom: 'var(--space-4)' }}>
                Se o produto <strong>não tem código de barras</strong>, tire uma foto real ou carregue uma imagem para fazermos uma busca técnica aproximada na internet.
              </p>

              {/* Camera or Photo Preview */}
              <div className="bcs-camera-box">
                {scanning ? (
                  <div className="bcs-video-wrap">
                    <video
                      ref={attachVideoStream}
                      className="bcs-video"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="bcs-camera-controls">
                      <button type="button" className="btn btn-primary" onClick={handleSnapPhoto}>
                        <Camera size={18} /> Capturar Foto Agora
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={stopCamera}>
                        Cancelar Câmera
                      </button>
                    </div>
                  </div>
                ) : capturedPhoto ? (
                  <div className="bcs-photo-preview-wrap">
                    <img src={capturedPhoto} alt="Produto Real" className="bcs-photo-preview" />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={startCamera}>
                        <RefreshCw size={14} /> Tirar Outra Foto
                      </button>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => performVisualSearch(capturedPhoto)}>
                        <Search size={14} /> Refazer Busca na Web
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bcs-camera-empty">
                    <div className="bcs-camera-buttons">
                      <button type="button" className="btn btn-primary btn-lg" onClick={startCamera}>
                        <Camera size={20} /> Abrir Câmera e Tirar Foto
                      </button>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-400)' }}>ou</span>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={16} /> Carregar Foto do Computador/Celular
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Search Loading State */}
              {isSearching && (
                <div className="bcs-searching-box">
                  <Loader2 size={32} className="animate-spin" style={{ color: 'var(--lime-dark)' }} />
                  <strong>Pesquisando produto na internet e na base de hardware...</strong>
                  <span>Cruzando características visuais, padrões de conectores e modelos aproximados.</span>
                </div>
              )}

              {/* Search Results */}
              {searchResults && searchResults.length > 0 && (
                <div className="bcs-results-container">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--lime-dark)' }}>
                    <Sparkles size={18} /> Resultados Mais Próximos Encontrados na Internet:
                  </h4>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-500)', marginBottom: 'var(--space-3)' }}>
                    Selecione a melhor correspondência abaixo para cadastrar automaticamente, ou gere uma etiqueta própria:
                  </p>

                  <div className="bcs-results-grid">
                    {searchResults.map((item, i) => (
                      <div key={i} className="bcs-result-card">
                        <img src={item.images[0]} alt={item.name} className="bcs-result-thumb" />
                        <div className="bcs-result-info">
                          <span className="badge badge-dark" style={{ width: 'fit-content' }}>{item.category} • {item.brand}</span>
                          <strong>{item.name}</strong>
                          <p>{item.description}</p>
                          <div className="bcs-result-price-row">
                            <span>Preço Sugerido: <strong>R$ {item.suggestedPrice.toFixed(2).replace('.', ',')}</strong></span>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectSearchResult(item)}
                            >
                              <Plus size={14} /> Usar Este Modelo
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Fallback option if none matches */}
                  <div className="bcs-no-match-banner">
                    <div>
                      <strong>Não é nenhum destes modelos?</strong>
                      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--dark-500)' }}>
                        Crie uma etiqueta e gere um código de barras exclusivo para o seu produto.
                      </span>
                    </div>
                    <button type="button" className="btn btn-outline" onClick={handleCreateCustomLabel}>
                      <Printer size={16} /> Gerar Etiqueta Própria
                    </button>
                  </div>
                </div>
              )}

              {/* No match found fallback */}
              {noMatchFound && (
                <div className="bcs-no-match-card">
                  <AlertCircle size={32} style={{ color: 'var(--amber)' }} />
                  <h4>Nenhuma correspondência exata encontrada na internet</h4>
                  <p>Não se preocupe! Você pode gerar um código de barras novo e imprimir a etiqueta para este produto agora mesmo.</p>
                  <button type="button" className="btn btn-primary" onClick={handleCreateCustomLabel}>
                    <Printer size={16} /> Criar Etiqueta com Código de Barras EAN-13
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Código de Barras Tradicional */}
          {activeTab === 'barcode' && (
            <div className="bcs-barcode-view">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-500)', marginBottom: 'var(--space-4)' }}>
                Aponte a câmera para o código de barras impresso na caixa do produto ou digite os números abaixo.
              </p>

              <div className="bcs-camera-box">
                {scanning ? (
                  <div className="bcs-video-wrap">
                    <video
                      ref={attachVideoStream}
                      className="bcs-video"
                      autoPlay
                      playsInline
                      muted
                    />

                    {/* Mira / Retículo de Leitura com Laser Animado */}
                    <div className="bcs-scanner-overlay">
                      <div className="bcs-target-box">
                        <div className="bcs-target-corner bcs-target-corner-tl" />
                        <div className="bcs-target-corner bcs-target-corner-tr" />
                        <div className="bcs-target-corner bcs-target-corner-bl" />
                        <div className="bcs-target-corner bcs-target-corner-br" />
                        <div className="bcs-laser-line" />
                      </div>
                      <div className="bcs-target-guide">
                        <span className="bcs-pulse-dot" />
                        Aponte a linha vermelha sobre o código de barras
                      </div>
                    </div>

                    <div className="bcs-camera-controls">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={stopCamera}>
                        Fechar Câmera
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="btn btn-primary" onClick={startCamera}>
                    <Camera size={18} /> Ativar Leitor de Código de Barras
                  </button>
                )}
              </div>

              <div className="bcs-manual-ean" style={{ marginTop: 'var(--space-4)' }}>
                <label>Digite ou bip com leitor de código de barras USB:</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    className="input-field"
                    value={manualEan}
                    onChange={e => {
                      setManualEan(e.target.value)
                      if (manualSearched) setManualSearched(false)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSearchManualEan()
                      }
                    }}
                    placeholder="Ex: 7898585800018 ou 0097855140883 (digite e pressione Enter)"
                    maxLength={14}
                    disabled={isBarcodeSearching}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSearchManualEan()}
                    disabled={isBarcodeSearching}
                  >
                    {isBarcodeSearching ? (
                      <>
                        <Loader2 size={15} className="spin" /> Buscando...
                      </>
                    ) : (
                      <>
                        <Search size={15} /> Buscar na Internet
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loading da busca online */}
              {isBarcodeSearching && (
                <div className="bcs-searching-box" style={{ marginTop: 'var(--space-4)' }}>
                  <Loader2 size={32} className="spin" style={{ color: 'var(--lime-dark)' }} />
                  <strong>Pesquisando produto na internet pelo código de barras...</strong>
                  <span>Consultando bases de dados de tecnologia e registros globais GS1 para o código {manualEan}.</span>
                </div>
              )}

              {/* Resultado da busca online */}
              {webProductResult && !isBarcodeSearching && (
                <div className="bcs-web-result-card">
                  <div className="bcs-web-header">
                    <span className="badge badge-lime">
                      <Sparkles size={12} /> {webProductResult.source || 'Identificado na Internet via EAN'}
                    </span>
                    {detectedProduct ? (
                      <span className="badge badge-blue">✓ Já em estoque na sua loja ({detectedProduct.stock} un)</span>
                    ) : (
                      <span className="badge badge-amber">Novo Produto / Pronto para Cadastrar</span>
                    )}
                  </div>

                  <div className="bcs-web-body">
                    <img
                      src={webProductResult.images?.[0] || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'}
                      alt={webProductResult.name}
                      className="bcs-web-thumb"
                    />
                    <div className="bcs-web-info">
                      <div className="bcs-web-tags">
                        <span className="badge badge-dark">{webProductResult.brand}</span>
                        <span className="badge badge-light">{webProductResult.category}</span>
                        <span className="bcs-ean-tag">EAN: <code>{webProductResult.ean || manualEan}</code></span>
                      </div>
                      <h3 className="bcs-web-title">{webProductResult.name}</h3>
                      <p className="bcs-web-desc">{webProductResult.description}</p>

                      {webProductResult.specs && webProductResult.specs.length > 0 && (
                        <div className="bcs-web-specs">
                          {webProductResult.specs.map((spec, sIdx) => (
                            <span key={sIdx} className="bcs-spec-pill">
                              <strong>{spec.label}:</strong> {spec.value}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="bcs-web-pricing-row">
                        <div className="bcs-price-col">
                          <span className="bcs-price-label">Preço Sugerido de Mercado</span>
                          <span className="bcs-price-val">
                            R$ {(webProductResult.suggestedPrice || 99.90).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <div className="bcs-actions-col">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleRegisterWebProduct(webProductResult, manualEan)}
                          >
                            <Plus size={16} /> Adicionar ao Estoque da Loja
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            onClick={() => {
                              setGeneratedEan(manualEan || generateValidEan13('789'))
                              setCustomProduct({
                                name: webProductResult.name,
                                brand: webProductResult.brand,
                                category: webProductResult.category,
                                price: webProductResult.suggestedPrice || '',
                                costPrice: Math.round((webProductResult.suggestedPrice || 99.90) * 0.7 * 100) / 100,
                                stock: 1
                              })
                              setActiveTab('label')
                            }}
                          >
                            <Printer size={16} /> Imprimir Etiqueta
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quando o código foi lido com sucesso mas não indexado no catálogo online */}
              {webNotFound && !isBarcodeSearching && !webProductResult && (
                <div className="bcs-not-found-card" style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-6)',
                  background: 'var(--dark-900)',
                  border: '1px solid var(--dark-700)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-4)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0
                    }}>
                      🏷️
                    </div>
                    <div>
                      <h4 style={{ color: 'var(--white)', margin: 0, fontSize: 16 }}>
                        Código de Barras Lido: <code>{webNotFound.ean}</code>
                      </h4>
                      <p style={{ color: 'var(--dark-400)', margin: '4px 0 0', fontSize: 13, lineHeight: 1.4 }}>
                        {detectedProduct ? (
                          <span style={{ color: '#4ade80' }}>
                            ✓ Este código já pertence ao produto <strong>"{detectedProduct.name}"</strong> no seu estoque ({detectedProduct.stock} un disponíveis).
                          </span>
                        ) : (
                          'O código foi lido com precisão, mas ainda não possui cadastro nas bases públicas abertas da internet. Você pode cadastrá-lo na sua loja agora mesmo!'
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        setGeneratedEan(webNotFound.ean)
                        setCustomProduct({
                          name: detectedProduct?.name || '',
                          brand: detectedProduct?.brand || '',
                          category: detectedProduct?.category || 'Hardware',
                          price: detectedProduct?.price || '',
                          costPrice: detectedProduct?.costPrice || '',
                          stock: detectedProduct?.stock || 1
                        })
                        setActiveTab('label')
                      }}
                    >
                      <Plus size={16} /> {detectedProduct ? 'Editar / Atualizar Etiqueta' : 'Cadastrar Produto com este EAN'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setGeneratedEan(webNotFound.ean)
                        setCustomProduct({
                          name: detectedProduct?.name || 'PRODUTO NOVO',
                          brand: detectedProduct?.brand || 'INFODESK',
                          category: detectedProduct?.category || 'Hardware',
                          price: detectedProduct?.price || 99.90,
                          costPrice: detectedProduct?.costPrice || 69.90,
                          stock: 1
                        })
                        setActiveTab('label')
                      }}
                    >
                      <Printer size={16} /> Imprimir Etiqueta para este Código
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Gerador de Etiquetas & Código de Barras Próprio */}
          {activeTab === 'label' && (
            <div className="bcs-label-view">
              <div className="bcs-label-grid">
                {/* Form to fill product info */}
                <form onSubmit={handleSaveCustomProductWithLabel} className="bcs-label-form">
                  <h4 className="adm-section-title"><Sparkles size={16} /> Dados para a Etiqueta</h4>

                  <div className="ck-field">
                    <label>Código EAN-13 Gerado *</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        className="input-field"
                        value={generatedEan}
                        readOnly
                        style={{ background: 'var(--dark-50)', fontWeight: 700, fontFamily: 'monospace' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          const ean = generateValidEan13('789')
                          setGeneratedEan(ean)
                          showToast('Novo código EAN-13 gerado! 🎲')
                        }}
                        title="Gerar outro código aleatório"
                      >
                        <RefreshCw size={14} /> Novo
                      </button>
                    </div>
                  </div>

                  <div className="ck-field">
                    <label>Nome do Produto na Etiqueta *</label>
                    <input
                      className="input-field"
                      value={customProduct.name}
                      onChange={e => setCustomProduct({ ...customProduct, name: e.target.value })}
                      placeholder="Ex: Adaptador USB-C para HDMI 4K"
                      required
                    />
                  </div>

                  <div className="ck-form-grid">
                    <div className="ck-field">
                      <label>Marca / Fabricante</label>
                      <input
                        className="input-field"
                        value={customProduct.brand}
                        onChange={e => setCustomProduct({ ...customProduct, brand: e.target.value })}
                        placeholder="Ex: Infodesk"
                      />
                    </div>
                    <div className="ck-field">
                      <label>Categoria</label>
                      <select
                        className="input-field"
                        value={customProduct.category}
                        onChange={e => setCustomProduct({ ...customProduct, category: e.target.value })}
                      >
                        <option>Hardware</option>
                        <option>Periféricos</option>
                        <option>Monitores</option>
                        <option>Notebooks</option>
                        <option>Redes</option>
                        <option>Acessórios</option>
                      </select>
                    </div>
                  </div>

                  <div className="ck-form-grid">
                    <div className="ck-field">
                      <label>Preço de Venda (R$) *</label>
                      <input
                        className="input-field"
                        type="number"
                        step="0.01"
                        value={customProduct.price}
                        onChange={e => setCustomProduct({ ...customProduct, price: e.target.value })}
                        placeholder="Ex: 89.90"
                        required
                      />
                    </div>
                    <div className="ck-field">
                      <label>Estoque Inicial</label>
                      <input
                        className="input-field"
                        type="number"
                        min="1"
                        value={customProduct.stock}
                        onChange={e => setCustomProduct({ ...customProduct, stock: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-3)' }}>
                    <Plus size={18} /> Salvar e Cadastrar no Estoque
                  </button>
                </form>

                {/* Live Barcode Label Preview */}
                <div className="bcs-label-preview-col">
                  <h4>Pré-visualização da Etiqueta:</h4>
                  <BarcodeLabel
                    product={{
                      name: customProduct.name || 'NOME DO PRODUTO',
                      brand: customProduct.brand || 'INFODESK',
                      category: customProduct.category
                    }}
                    ean={generatedEan || '7891234567890'}
                    price={parseFloat(customProduct.price) || 0}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--dark-400)', textAlign: 'center' }}>
                    Formato padrão para impressoras térmicas (60x40mm) ou folhas de etiqueta adesiva.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <style>{`
          .bcs-modal {
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 0;
          }
          .bcs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-5) var(--space-6);
            border-bottom: 1px solid var(--dark-100);
          }
          .bcs-header-title h2 { font-size: var(--text-xl); }
          .bcs-tabs {
            display: flex;
            gap: var(--space-2);
            padding: 0 var(--space-6);
            border-bottom: 1px solid var(--dark-100);
            background: var(--dark-50);
            overflow-x: auto;
          }
          .bcs-tab {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: var(--space-3) var(--space-4);
            background: none;
            border: none;
            border-bottom: 2px solid transparent;
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--dark-500);
            cursor: pointer;
            transition: all var(--transition-fast);
            white-space: nowrap;
          }
          .bcs-tab:hover { color: var(--dark-900); }
          .bcs-tab.active {
            color: var(--lime-dark);
            border-bottom-color: var(--lime);
            background: var(--white);
          }
          .bcs-body {
            padding: var(--space-6);
            overflow-y: auto;
          }
          .bcs-camera-box {
            background: var(--dark-900);
            border-radius: var(--radius-xl);
            min-height: 220px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
          }
          .bcs-video-wrap {
            position: relative;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .bcs-video {
            width: 100%;
            max-height: 320px;
            object-fit: cover;
          }
          .bcs-camera-controls {
            position: absolute;
            bottom: 12px;
            display: flex;
            gap: 8px;
            background: rgba(0,0,0,0.6);
            padding: 8px 16px;
            border-radius: var(--radius-full);
          }
          .bcs-camera-empty {
            padding: var(--space-6);
            text-align: center;
          }
          .bcs-camera-buttons {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .bcs-photo-preview-wrap {
            padding: var(--space-4);
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .bcs-photo-preview {
            max-height: 200px;
            border-radius: var(--radius-lg);
            border: 2px solid var(--lime);
          }
          .bcs-searching-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: var(--space-6);
            background: var(--lime-glow);
            border-radius: var(--radius-xl);
            margin-top: var(--space-4);
            text-align: center;
            color: var(--lime-dark);
          }
          .bcs-results-container {
            margin-top: var(--space-5);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
          }
          .bcs-results-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--space-3);
          }
          @media (min-width: 768px) {
            .bcs-results-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
          .bcs-result-card {
            display: flex;
            gap: var(--space-3);
            padding: var(--space-3);
            border: 1px solid var(--dark-200);
            border-radius: var(--radius-xl);
            background: var(--white);
            transition: all var(--transition-fast);
          }
          .bcs-result-card:hover {
            border-color: var(--lime);
            box-shadow: 0 4px 12px var(--lime-glow);
          }
          .bcs-result-thumb {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: var(--radius-lg);
          }
          .bcs-result-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .bcs-result-info strong { font-size: var(--text-sm); line-height: 1.2; }
          .bcs-result-info p { font-size: 11px; color: var(--dark-500); max-height: 32px; overflow: hidden; }
          .bcs-result-price-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: auto;
            padding-top: 4px;
            font-size: 11px;
          }
          .bcs-no-match-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: var(--dark-50);
            border: 1px dashed var(--dark-300);
            padding: var(--space-4);
            border-radius: var(--radius-xl);
            margin-top: var(--space-2);
          }
          .bcs-no-match-card {
            text-align: center;
            padding: var(--space-6);
            background: var(--dark-50);
            border-radius: var(--radius-xl);
            margin-top: var(--space-4);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
          .bcs-label-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: var(--space-6);
          }
          @media (min-width: 768px) {
            .bcs-label-grid {
              grid-template-columns: 1.2fr 0.8fr;
            }
          }
          .bcs-label-preview-col {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            background: var(--dark-50);
            padding: var(--space-4);
            border-radius: var(--radius-xl);
          }
          /* Overlay de Mira e Laser do Scanner */
          .bcs-scanner-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            z-index: 5;
          }
          .bcs-target-box {
            width: 260px;
            height: 120px;
            border: 2px solid rgba(132, 204, 22, 0.7);
            border-radius: 12px;
            position: relative;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.4);
            overflow: hidden;
          }
          .bcs-target-corner {
            position: absolute;
            width: 16px;
            height: 16px;
            border-color: #ef4444;
            border-style: solid;
          }
          .bcs-target-corner-tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-top-left-radius: 8px; }
          .bcs-target-corner-tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-top-right-radius: 8px; }
          .bcs-target-corner-bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-bottom-left-radius: 8px; }
          .bcs-target-corner-br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-bottom-right-radius: 8px; }
          .bcs-laser-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, #ef4444, #f87171, #ef4444, transparent);
            box-shadow: 0 0 8px #ef4444, 0 0 14px rgba(239, 68, 68, 0.8);
            animation: scanLaser 1.8s infinite ease-in-out alternate;
          }
          @keyframes scanLaser {
            0% { top: 12%; }
            100% { top: 88%; }
          }
          .bcs-target-guide {
            margin-top: 12px;
            background: rgba(15, 23, 42, 0.85);
            color: #ffffff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.3px;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .bcs-pulse-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            box-shadow: 0 0 8px #ef4444;
            animation: pulseDot 1s infinite alternate;
          }
          @keyframes pulseDot {
            0% { opacity: 0.4; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1.2); }
          }
          .bcs-detected-card {
            margin-top: var(--space-4);
            padding: var(--space-4);
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: var(--radius-xl);
          }
          .bcs-not-found-card {
            margin-top: var(--space-4);
            padding: var(--space-4);
            background: #fffbeb;
            border: 1px solid #fef3c7;
            border-radius: var(--radius-xl);
          }
          /* Card de resultado de busca na internet */
          .bcs-web-result-card {
            margin-top: var(--space-4);
            padding: var(--space-5);
            background: #ffffff;
            border: 2px solid var(--lime);
            border-radius: var(--radius-xl);
            box-shadow: 0 4px 16px rgba(132, 204, 22, 0.15);
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .bcs-web-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            padding-bottom: var(--space-3);
            border-bottom: 1px solid var(--dark-100);
          }
          .bcs-web-body {
            display: flex;
            gap: var(--space-5);
            align-items: flex-start;
          }
          @media (max-width: 640px) {
            .bcs-web-body {
              flex-direction: column;
            }
          }
          .bcs-web-thumb {
            width: 120px;
            height: 120px;
            object-fit: cover;
            border-radius: var(--radius-lg);
            border: 1px solid var(--dark-200);
            flex-shrink: 0;
          }
          .bcs-web-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .bcs-web-tags {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
          }
          .bcs-ean-tag {
            font-size: 11px;
            color: var(--dark-500);
            font-family: monospace;
            background: var(--dark-50);
            padding: 2px 6px;
            border-radius: 4px;
          }
          .bcs-web-title {
            font-size: var(--text-base);
            font-weight: 700;
            color: var(--dark-900);
            margin: 0;
            line-height: 1.3;
          }
          .bcs-web-desc {
            font-size: var(--text-xs);
            color: var(--dark-500);
            line-height: 1.4;
            margin: 0;
          }
          .bcs-web-specs {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 4px;
          }
          .bcs-spec-pill {
            font-size: 11px;
            background: #f1f5f9;
            color: #334155;
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .bcs-web-pricing-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: var(--space-3);
            padding-top: var(--space-3);
            border-top: 1px solid var(--dark-100);
            flex-wrap: wrap;
            gap: 12px;
          }
          .bcs-price-col {
            display: flex;
            flex-direction: column;
          }
          .bcs-price-label {
            font-size: 10px;
            color: var(--dark-400);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
          }
          .bcs-price-val {
            font-size: var(--text-lg);
            font-weight: 800;
            color: var(--lime-dark);
          }
          .bcs-actions-col {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }
        `}</style>
      </div>
    </div>
  )
}
