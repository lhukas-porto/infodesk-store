import React, { useState, useRef, useEffect } from 'react'
import {
  X, Camera, CheckCircle2, AlertCircle, Sparkles, Upload,
  Search, RefreshCw, Printer, Download, Plus, ArrowRight, Image as ImageIcon, Loader2,
  ExternalLink, Eye, Check, Trash2, HelpCircle, Info, Layers, FileText
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import {
  generateValidEan13,
  fetchProductByBarcode,
  identifyProductByPhoto,
  confirmProductPhotoMatch,
  fetchProductByDescription
} from '../services/barcodeService'
import { getCompanyPublicName } from '../services/companyService'
import BarcodeLabel from './BarcodeLabel'

export default function BarcodeScannerModal() {
  const { showScanner, setShowScanner, products = [], addProduct, showToast, setShowAdminDashboard, companyData } = useStore()

  const publicName = getCompanyPublicName(companyData)

  const [activeTab, setActiveTab] = useState('barcode') // 'barcode' | 'photo' | 'label'
  const [scanning, setScanning] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [noMatchFound, setNoMatchFound] = useState(false)
  const [photoSearchError, setPhotoSearchError] = useState(null)
  const [photoAnalysisMeta, setPhotoAnalysisMeta] = useState(null)
  const [photoImageHash, setPhotoImageHash] = useState('')
  const [photoIsConfirming, setPhotoIsConfirming] = useState(false)

  const [detectedProduct, setDetectedProduct] = useState(null)
  const [lastScannedCode, setLastScannedCode] = useState('')
  const [manualSearched, setManualSearched] = useState(false)
  const [isBarcodeSearching, setIsBarcodeSearching] = useState(false)
  const [webProductResult, setWebProductResult] = useState(null)
  const [webNotFound, setWebNotFound] = useState(null)

  // Busca Inteligente por Descrição / Texto (IA Gemini)
  const [descriptionQuery, setDescriptionQuery] = useState('')
  const [isDescriptionSearching, setIsDescriptionSearching] = useState(false)
  const [descriptionCandidates, setDescriptionCandidates] = useState([])
  const [descriptionError, setDescriptionError] = useState(null)

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

      showToast('Câmera ativada! 📸')
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      setScanning(false)
      showToast('Não foi possível acessar a câmera. Verifique a permissão do seu navegador!')
    }
  }

  // Tira foto real do produto pela câmera e salva para prévia
  const handleSnapPhoto = () => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88)
    setCapturedPhoto(photoDataUrl)
    stopCamera()
    setSearchResults(null)
    setNoMatchFound(false)
    setPhotoSearchError(null)
  }

  // Upload manual de foto do produto da galeria ou computador
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const photoDataUrl = event.target.result
        setCapturedPhoto(photoDataUrl)
        stopCamera()
        setSearchResults(null)
        setNoMatchFound(false)
        setPhotoSearchError(null)
      }
      reader.readAsDataURL(file)
    }
  }

  // Busca Inteligente de Identificação de Produto por Foto
  const performVisualSearch = async (photo) => {
    const photoToUse = photo || capturedPhoto
    if (!photoToUse) {
      showToast('Por favor, tire uma foto ou selecione uma imagem.')
      return
    }

    setIsSearching(true)
    setSearchResults(null)
    setNoMatchFound(false)
    setPhotoSearchError(null)

    try {
      const res = await identifyProductByPhoto(photoToUse)
      if (res.success && (res.product || (res.candidates && res.candidates.length > 0))) {
        const prod = res.product || res.candidates[0]
        setWebProductResult(prod)
        setSearchResults(res.candidates || [prod])
        setPhotoImageHash(res.imageHash || '')
        setPhotoAnalysisMeta(res.analysis || null)
        playAudioBeep()
        showToast(res.message || `Produto "${prod.name}" identificado com sucesso! 📸🎯`)
      } else if (res.configMissing) {
        setPhotoSearchError({
          title: 'Configuração de Chave Necessária',
          message: res.error || 'A chave GEMINI_API_KEY precisa ser configurada nas variáveis de ambiente (.env) do servidor.',
          configMissing: true
        })
        setSearchResults(null)
      } else {
        setNoMatchFound(true)
        setPhotoSearchError({
          title: 'Produto não identificado',
          message: res.error || 'Nenhum produto correspondente identificado com segurança nesta fotografia. Você pode tentar outra foto ou cadastrar manualmente.'
        })
      }
    } catch (err) {
      console.error('Erro na identificação visual:', err)
      setNoMatchFound(true)
      setPhotoSearchError({
        title: 'Falha de Conexão',
        message: 'Não foi possível se conectar ao serviço de inteligência visual.'
      })
    } finally {
      setIsSearching(false)
    }
  }

  // Confirmar um produto candidato e salvar no histórico de aprendizado
  const handleConfirmCandidate = async (item) => {
    setPhotoIsConfirming(true)
    try {
      const autoEan = item.ean || generateValidEan13('789')
      const price = item.suggestedPrice || 99.90
      const cost = Math.round(price * 0.7 * 100) / 100

      // 1. Salva no histórico de aprendizado do banco
      await confirmProductPhotoMatch({
        imageHash: photoImageHash,
        ean: autoEan,
        brand: item.brand,
        model: item.model,
        partNumber: item.partNumber,
        name: item.name,
        selectedResult: item
      })

      // 2. Adiciona ao catálogo/estoque da loja com ficha completa
      addProduct({
        name: item.name,
        brand: item.brand || publicName,
        manufacturer: item.manufacturer || item.brand || publicName,
        model: item.model || '',
        partNumber: item.partNumber || item.mpn || '',
        mpn: item.partNumber || item.mpn || '',
        category: item.category || 'Hardware',
        costPrice: item.costPrice || cost,
        taxRate: 10,
        marginRate: 30,
        price: price,
        originalPrice: Math.round(price * 1.15 * 100) / 100,
        stock: 1,
        ean: autoEan,
        gtin: item.gtin || autoEan,
        gtin14: item.gtin14 || '',
        ncm: item.ncm || '',
        weight: item.weight || null,
        dimensions: item.dimensions || null,
        featured: false,
        description: item.description || (item.matchReason
          ? `Produto identificado por fotografia. ${item.matchReason}`
          : 'Produto identificado e confirmado por foto.'),
        images: (item.images && item.images.length > 0)
          ? item.images
          : (capturedPhoto ? [capturedPhoto] : ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600']),
        specs: item.specs || []
      })

      showToast(`Produto "${item.name}" confirmado e adicionado com sucesso! 🏷️🎉`)
      close()
      setShowAdminDashboard(true)
    } catch (err) {
      console.error('Erro ao confirmar produto:', err)
      showToast('Erro ao confirmar produto. Tente novamente.')
    } finally {
      setPhotoIsConfirming(false)
    }
  }

  // Preenche dados para cadastro manual a partir de um candidato
  const handleFillManualFromCandidate = (item) => {
    const eanToUse = item?.ean || generatedEan || generateValidEan13('789')
    setGeneratedEan(eanToUse)
    setCustomProduct({
      name: item?.name || '',
      brand: item?.brand || '',
      category: item?.category || 'Hardware',
      price: item?.suggestedPrice || '',
      costPrice: item?.suggestedPrice ? Math.round(item.suggestedPrice * 0.7 * 100) / 100 : '',
      stock: 1
    })
    setActiveTab('label')
  }

  // Se o usuário clicar em "Criar Etiqueta com Código de Barras Próprio"
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

  // Aceita uma sugestão encontrada na internet e cadastra com ficha completa
  const handleSelectSearchResult = (item) => {
    const autoEan = item.ean || generateValidEan13('789')
    const price = item.suggestedPrice || 99.90
    const cost = item.costPrice || Math.round(price * 0.7 * 100) / 100

    addProduct({
      name: item.name,
      brand: item.brand || publicName,
      manufacturer: item.manufacturer || item.brand || publicName,
      model: item.model || '',
      partNumber: item.partNumber || item.mpn || '',
      mpn: item.partNumber || item.mpn || '',
      category: item.category || 'Hardware',
      costPrice: cost,
      taxRate: 10,
      marginRate: 30,
      price: price,
      originalPrice: Math.round(price * 1.15 * 100) / 100,
      stock: 1,
      ean: autoEan,
      gtin: item.gtin || autoEan,
      gtin14: item.gtin14 || '',
      ncm: item.ncm || '',
      weight: item.weight || null,
      dimensions: item.dimensions || null,
      featured: false,
      description: item.description || 'Produto identificado e catalogado por fotografia.',
      images: (item.images && item.images.length > 0)
        ? item.images
        : (capturedPhoto ? [capturedPhoto] : ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=600']),
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
    const eanToUse = customEan || item.ean || item.gtin || manualEan || generateValidEan13('789')
    const price = item.suggestedPrice || 99.90
    const cost = item.costPrice || Math.round(price * 0.7 * 100) / 100

    if (activeTab === 'photo' && photoImageHash) {
      confirmProductPhotoMatch({
        imageHash: photoImageHash,
        ean: eanToUse,
        brand: item.brand,
        model: item.model,
        partNumber: item.partNumber,
        name: item.name,
        selectedResult: item
      }).catch(err => console.warn('Erro ao salvar correspondência de foto:', err))
    }

    addProduct({
      name: item.name,
      brand: item.brand || publicName,
      manufacturer: item.manufacturer || item.brand || publicName,
      model: item.model || '',
      partNumber: item.partNumber || item.mpn || '',
      mpn: item.partNumber || item.mpn || '',
      category: item.category || 'Hardware',
      costPrice: cost,
      taxRate: 10,
      marginRate: 30,
      price: price,
      originalPrice: Math.round(price * 1.15 * 100) / 100,
      stock: 1,
      ean: eanToUse,
      gtin: item.gtin || eanToUse,
      gtin14: item.gtin14 || '',
      ncm: item.ncm || '',
      weight: item.weight || null,
      dimensions: item.dimensions || null,
      featured: false,
      description: item.description || (activeTab === 'photo' ? 'Produto identificado com inteligência visual e catalogado com sucesso.' : 'Produto cadastrado via leitor de código de barras online.'),
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

  // Busca Inteligente de Produto por Descrição / Texto (IA Gemini)
  const handleSearchByDescription = async (textToSearch) => {
    const text = (textToSearch !== undefined ? textToSearch : descriptionQuery).trim()
    if (!text || text.length < 3) {
      showToast('Digite pelo menos 3 caracteres da descrição do produto.')
      return
    }

    setIsDescriptionSearching(true)
    setDescriptionCandidates([])
    setDescriptionError(null)
    setWebProductResult(null)

    try {
      const res = await fetchProductByDescription(text)
      if (res.success && res.found) {
        if (!res.exactMatch && res.candidates && res.candidates.length > 1) {
          setDescriptionCandidates(res.candidates)
          setWebProductResult(null)
          playAudioBeep()
          showToast(`${res.candidates.length} modelos encontrados! Selecione o produto desejado. 🔍`)
        } else if (res.product) {
          setWebProductResult(res.product)
          setDescriptionCandidates([])
          playAudioBeep()
          showToast(`Produto "${res.product.name}" identificado com sucesso pela IA! ✨🎯`)
        } else {
          setWebProductResult(null)
          setDescriptionError('Produto não identificado com precisão.')
          showToast('Produto não identificado.', 'error')
        }
      } else {
        setWebProductResult(null)
        setDescriptionError(res.error || 'Não foi possível identificar o produto com base no texto informado.')
        showToast(res.error || 'Produto não identificado.', 'error')
      }
    } catch (err) {
      console.error('Erro na busca por descrição:', err)
      setWebProductResult(null)
      setDescriptionError('Falha temporária de conexão com o serviço de inteligência artificial.')
      showToast('Erro ao consultar inteligência artificial.', 'error')
    } finally {
      setIsDescriptionSearching(false)
    }
  }

  const handleSelectDescriptionCandidate = (cand) => {
    setWebProductResult(cand)
    setDescriptionCandidates([])
    playAudioBeep()
    showToast(`Produto "${cand.name}" selecionado! ✨`)
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
    setDescriptionQuery('')
    setIsDescriptionSearching(false)
    setDescriptionCandidates([])
    setDescriptionError(null)
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

  // Renderizador canônico unificado do card de produto identificado (usado tanto pelo Código de Barras quanto pela IA por Descrição)
  const renderWebResultCard = (result, defaultEan = '') => {
    if (!result) return null
    const cardEan = result.gtin || result.ean || defaultEan || manualEan

    return (
      <div className="bcs-web-result-card">
        <div className="bcs-web-header">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-lime">
              <Sparkles size={12} /> {result.source || 'Base de Dados GTIN'}
            </span>
            {result.confidence && (
              <span className="badge badge-dark" style={{ background: '#064e3b', color: '#6ee7b7' }}>
                ✓ {result.confidence}
              </span>
            )}
          </div>
          {detectedProduct ? (
            <span className="badge badge-blue">✓ Já em estoque na sua loja ({detectedProduct.stock} un)</span>
          ) : (
            <span className="badge badge-amber">Novo Produto / Pronto para Cadastrar</span>
          )}
        </div>

        <div className="bcs-web-body">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <img
              src={result.images?.[0] || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'}
              alt={result.name}
              className="bcs-web-thumb"
            />
            {result.images && result.images.length > 1 && (
              <div style={{ display: 'flex', gap: 4, maxWidth: 120, overflowX: 'auto', paddingBottom: 2 }}>
                {result.images.slice(0, 4).map((thumb, tIdx) => (
                  <img
                    key={tIdx}
                    src={thumb}
                    alt={`Foto ${tIdx + 1}`}
                    title="Clique para escolher como foto principal"
                    style={{
                      width: 26,
                      height: 26,
                      objectFit: 'contain',
                      borderRadius: 4,
                      border: tIdx === 0 ? '2px solid var(--lime)' : '1px solid var(--dark-300)',
                      cursor: 'pointer',
                      background: '#fff'
                    }}
                    onClick={() => {
                      const reordered = [thumb, ...result.images.filter(x => x !== thumb)]
                      setWebProductResult({ ...result, images: reordered })
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="bcs-web-info">
            <div className="bcs-web-tags">
              <span className="badge badge-dark">{result.brand}</span>
              {result.manufacturer && result.manufacturer !== result.brand && (
                <span className="badge badge-dark" style={{ opacity: 0.85 }}>Fab: {result.manufacturer}</span>
              )}
              <span className="badge badge-light">{result.category}</span>
              {cardEan && (
                <span className="bcs-ean-tag">GTIN/EAN: <code>{cardEan}</code></span>
              )}
              {result.gtin14 && (
                <span className="bcs-ean-tag" title="GTIN-14 Normalizado">GTIN-14: <code>{result.gtin14}</code></span>
              )}
              {result.partNumber && (
                <span className="badge badge-dark" style={{ background: '#1e1b4b', color: '#a5b4fc' }}>
                  P/N: {result.partNumber}
                </span>
              )}
              {result.model && (
                <span className="badge badge-light">Mod: {result.model}</span>
              )}
              {result.ncm && (
                <span className="badge badge-light">NCM: {result.ncm}</span>
              )}
              {result.weight && (
                <span className="badge badge-light">Peso: {String(result.weight).toLowerCase().endsWith('g') ? result.weight : `${result.weight} kg`}</span>
              )}
            </div>

            <h3 className="bcs-web-title">{result.name}</h3>

            {result.description && (
              <p className="bcs-web-desc">{result.description}</p>
            )}

            {result.specs && result.specs.length > 0 && (
              <div className="bcs-web-specs">
                {result.specs.map((spec, sIdx) => (
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
                  R$ {(result.suggestedPrice || 99.90).toFixed(2).replace('.', ',')}
                </span>
              </div>
              <div className="bcs-actions-col">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleRegisterWebProduct(result, cardEan)}
                >
                  <Plus size={16} /> Adicionar ao Estoque da Loja
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    const autoEan = cardEan || generateValidEan13('789')
                    setGeneratedEan(autoEan)
                    setCustomProduct({
                      name: result.name,
                      brand: result.brand,
                      category: result.category,
                      price: result.suggestedPrice || '',
                      costPrice: result.costPrice || Math.round((result.suggestedPrice || 99.90) * 0.7 * 100) / 100,
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
    )
  }

  if (!showScanner) return null

  return (
    <div className="overlay" style={{ zIndex: 1250 }}>
      <div className="modal modal-lg bcs-modal">
        {/* Header */}
        <div className="bcs-header">
          <div className="bcs-header-title">
            <span className="badge badge-lime" style={{ marginBottom: 4 }}>
              <Sparkles size={12} /> Identificação Inteligente & Etiquetas
            </span>
            <h2>Scanner & Reconhecimento de Produtos</h2>
          </div>
          <button
            type="button"
            className="bcs-close-btn"
            onClick={close}
            title="Fechar Scanner"
            aria-label="Fechar Scanner"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bcs-tabs">
          <button
            className={`bcs-tab ${activeTab === 'barcode' ? 'active' : ''}`}
            onClick={() => { setActiveTab('barcode') }}
          >
            <Search size={16} /> 1. Ler código de barras
          </button>
          <button
            className={`bcs-tab ${activeTab === 'photo' ? 'active' : ''}`}
            onClick={() => { stopCamera(); setActiveTab('photo') }}
          >
            <Camera size={16} /> 2. Buscar pela foto
          </button>
          <button
            className={`bcs-tab ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => { stopCamera(); setActiveTab('description') }}
          >
            <Sparkles size={16} /> 3. Buscar por nome (IA)
          </button>
          <button
            className={`bcs-tab ${activeTab === 'label' ? 'active' : ''}`}
            onClick={() => {
              stopCamera()
              if (!generatedEan) setGeneratedEan(generateValidEan13('789'))
              setActiveTab('label')
            }}
          >
            <Printer size={16} /> Criar Etiqueta com Código Próprio
          </button>
        </div>

        {/* Modal Body */}
        <div className="bcs-body">
          {/* TAB 2: Buscar Produto pela Foto */}
          {activeTab === 'photo' && (
            <div className="bcs-photo-view">
              <div className="bcs-photo-intro-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>📸</span>
                  <div>
                    <strong style={{ color: 'var(--white)', fontSize: 14, display: 'block' }}>
                      Identificação Inteligente por Fotografia
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--dark-300)' }}>
                      Tire uma foto ou carregue uma imagem da caixa do produto. A IA analisa marcas, modelos, códigos e especificações técnicas.
                    </span>
                  </div>
                </div>
              </div>

              {/* Área da Câmera / Imagem */}
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
                        <Camera size={18} /> Fotografar Agora
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={stopCamera}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : capturedPhoto ? (
                  <div className="bcs-photo-preview-wrap">
                    <div className="bcs-preview-image-container">
                      <img src={capturedPhoto} alt="Produto Real" className="bcs-photo-preview" />
                      <div className="bcs-preview-badge">
                        <CheckCircle2 size={13} /> Imagem Carregada
                      </div>
                    </div>

                    {/* Controles da Foto: Identificar, Trocar, Remover */}
                    <div className="bcs-photo-action-bar">
                      <button
                        type="button"
                        className="btn btn-primary bcs-btn-search-photo"
                        onClick={() => performVisualSearch(capturedPhoto)}
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 size={16} className="animate-spin" /> Identificando...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} /> Identificar Produto por Foto
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={startCamera}
                        disabled={isSearching}
                        title="Tirar outra foto com a câmera"
                      >
                        <RefreshCw size={14} /> Trocar Foto
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSearching}
                        title="Carregar outra imagem do computador ou galeria"
                      >
                        <Upload size={14} /> Carregar Outra
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444' }}
                        onClick={() => {
                          setCapturedPhoto(null)
                          setSearchResults(null)
                          setNoMatchFound(false)
                          setPhotoSearchError(null)
                        }}
                        disabled={isSearching}
                        title="Remover imagem"
                      >
                        <Trash2 size={14} /> Remover
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="bcs-camera-empty">
                    <div className="bcs-camera-buttons">
                      <button type="button" className="btn btn-primary btn-lg" onClick={startCamera}>
                        <Camera size={20} /> Fotografar Usando a Câmera
                      </button>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--dark-400)' }}>ou</span>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={16} /> Selecionar Imagem da Galeria ou Computador
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--dark-400)', marginTop: 4 }}>
                        Formatos aceitos: JPEG, PNG e WebP
                      </span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Andamento da Identificação com Indicadores de Etapa */}
              {isSearching && (
                <div className="bcs-searching-box">
                  <Loader2 size={36} className="animate-spin" style={{ color: 'var(--lime-dark)' }} />
                  <strong style={{ fontSize: 15, color: 'var(--dark-900)' }}>Identificando produto pela fotografia...</strong>
                  <div className="bcs-search-steps">
                    <span className="bcs-step-item active">
                      <span className="bcs-step-dot" /> 1. Analisando características visuais com IA Gemini
                    </span>
                    <span className="bcs-step-item active">
                      <span className="bcs-step-dot" /> 2. Verificando códigos GTIN e consultando bases de tecnologia
                    </span>
                    <span className="bcs-step-item active">
                      <span className="bcs-step-dot" /> 3. Ranqueando melhores correspondências técnicas
                    </span>
                  </div>
                </div>
              )}

              {/* Erros amigáveis (configuração ou foto não legível) */}
              {photoSearchError && !isSearching && (
                <div className="bcs-error-card">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <AlertCircle size={24} style={{ color: photoSearchError.configMissing ? '#f59e0b' : '#ef4444', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: 'var(--white)', fontSize: 15 }}>{photoSearchError.title}</h4>
                      <p style={{ margin: '4px 0 0', color: 'var(--dark-300)', fontSize: 13, lineHeight: 1.4 }}>
                        {photoSearchError.message}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setCapturedPhoto(null)
                            setPhotoSearchError(null)
                            startCamera()
                          }}
                        >
                          <Camera size={14} /> Tentar Outra Foto
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setGeneratedEan(generateValidEan13('789'))
                            setCustomProduct({
                              name: photoAnalysisMeta?.model ? `${photoAnalysisMeta.brand || ''} ${photoAnalysisMeta.model}`.trim() : '',
                              brand: photoAnalysisMeta?.brand || '',
                              category: photoAnalysisMeta?.productType || 'Hardware',
                              price: '',
                              costPrice: '',
                              stock: 1
                            })
                            setActiveTab('label')
                          }}
                        >
                          <Plus size={14} /> Informar Manualmente
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Exibição dos Produtos Identificados com Riqueza Máxima de Detalhes */}
              {searchResults && searchResults.length > 0 && !isSearching && (
                <div className="bcs-results-container" style={{ marginTop: 'var(--space-4)' }}>
                  {searchResults.length > 1 && (
                    <div className="bcs-candidates-wrap" style={{ marginBottom: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <h4 style={{ margin: 0, fontSize: 13, color: 'var(--dark-800)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={15} style={{ color: 'var(--lime-dark)' }} />
                          Modelos compatíveis identificados ({searchResults.length}):
                        </h4>
                        <span style={{ fontSize: 11, color: 'var(--dark-500)' }}>
                          Clique para alternar a ficha técnica completa:
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
                        {searchResults.map((cand, cIdx) => {
                          const currentProd = webProductResult || searchResults[0]
                          const isSelected = currentProd?.name === cand.name
                          return (
                            <button
                              key={cIdx}
                              type="button"
                              className={`bcs-tab ${isSelected ? 'active' : ''}`}
                              style={{
                                borderRadius: 'var(--radius-lg)',
                                border: isSelected ? '2px solid var(--lime)' : '1px solid var(--dark-200)',
                                background: isSelected ? '#f7fee7' : '#ffffff',
                                padding: '8px 12px',
                                fontSize: 12,
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s ease'
                              }}
                              onClick={() => setWebProductResult(cand)}
                            >
                              <img
                                src={cand.images?.[0] || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'}
                                alt=""
                                style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4, background: '#fff', border: '1px solid var(--dark-200)' }}
                              />
                              <span>
                                <strong style={{ color: 'var(--dark-900)' }}>{cand.brand}</strong>{' '}
                                <span style={{ color: 'var(--dark-700)' }}>{cand.model || cand.name}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ficha técnica canônica idêntica à busca por descrição com descrição comercial completa, fotos e especificações */}
                  {renderWebResultCard(webProductResult || searchResults[0], (webProductResult || searchResults[0]).ean || '')}

                  <div className="bcs-no-match-banner" style={{ marginTop: 16 }}>
                    <div>
                      <strong>Não é este produto?</strong>
                      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--dark-500)' }}>
                        Você pode tirar outra fotografia com melhor enquadramento ou cadastrar manualmente.
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setCapturedPhoto(null)
                          setSearchResults(null)
                          setWebProductResult(null)
                          startCamera()
                        }}
                      >
                        <Camera size={14} /> Tentar Outra Foto
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleCreateCustomLabel}
                      >
                        <Printer size={14} /> Informar Manualmente
                      </button>
                    </div>
                  </div>
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
              {webProductResult && manualSearched && !isBarcodeSearching && renderWebResultCard(webProductResult, manualEan)}

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

          {/* TAB 3: Buscar Produto por Nome / Descrição (IA Gemini) */}
          {activeTab === 'description' && (
            <div className="bcs-desc-view">
              <div className="bcs-photo-intro-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>✨</span>
                  <div>
                    <strong style={{ color: 'var(--white)', fontSize: 14, display: 'block' }}>
                      Identificação & Enriquecimento Automático por Descrição
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--dark-300)' }}>
                      Digite ou cole o nome comercial, título do fornecedor ou especificações. A IA extrai e preenche todos os campos cadastrais: marca, categoria, modelo, part number, preço de custo/venda, dimensões para os Correios e especificações técnicas!
                    </span>
                  </div>
                </div>
              </div>

              <div className="bcs-desc-input-box" style={{
                background: 'var(--dark-50)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--dark-200)'
              }}>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--dark-800)', marginBottom: 6 }}>
                  Nome, Modelo ou Descrição Bruta do Produto:
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    className="input-field"
                    style={{ flex: 1, minWidth: '240px' }}
                    value={descriptionQuery}
                    onChange={e => {
                      setDescriptionQuery(e.target.value)
                      if (descriptionError) setDescriptionError(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSearchByDescription()
                      }
                    }}
                    placeholder="Ex: SSD Kingston NV2 1TB M.2 NVMe PCIe 4.0 SNV2S/1000G ou Mouse Logitech G305 Lightspeed"
                    disabled={isDescriptionSearching}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSearchByDescription()}
                    disabled={isDescriptionSearching || !descriptionQuery.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    {isDescriptionSearching ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Analisando com IA...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Identificar Produto
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--dark-500)' }}>Exemplos rápidos:</span>
                  {[
                    'SSD Kingston NV2 1TB M.2 NVMe',
                    'Mouse Sem Fio Logitech G305 Lightspeed',
                    'Teclado Mecânico Redragon Kumara RGB Switch Outemu Blue',
                    'Roteador Wi-Fi 6 TP-Link Archer AX12 Gigabit'
                  ].map((example, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="badge badge-light"
                      style={{ cursor: 'pointer', border: '1px solid var(--dark-200)', background: '#ffffff' }}
                      onClick={() => {
                        setDescriptionQuery(example)
                        handleSearchByDescription(example)
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicador de carregamento */}
              {isDescriptionSearching && (
                <div className="bcs-searching-box" style={{ marginTop: 'var(--space-4)' }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: 'var(--lime-dark)' }} />
                  <strong style={{ fontSize: 15, color: 'var(--dark-900)' }}>Identificando e estruturando produto com Inteligência Artificial...</strong>
                  <div className="bcs-search-steps">
                    <span className="bcs-step-item active">
                      <span className="bcs-step-dot" /> 1. Analisando termos técnicos, marca e modelo
                    </span>
                    <span className="bcs-step-item active">
                      <span className="bcs-step-dot" /> 2. Estimando preços de custo, venda e medidas dos Correios
                    </span>
                    <span className="bcs-step-item active">
                      <span className="bcs-step-dot" /> 3. Gerando ficha técnica completa e descrição comercial
                    </span>
                  </div>
                </div>
              )}

              {/* Mensagem de Erro se houver */}
              {descriptionError && !isDescriptionSearching && (
                <div className="bcs-error-card" style={{ marginTop: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <AlertCircle size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--white)', fontSize: 14 }}>Não foi possível identificar</h4>
                      <p style={{ margin: '4px 0 0', color: 'var(--dark-300)', fontSize: 13 }}>{descriptionError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Seleção de candidatos quando houver múltiplos modelos compatíveis */}
              {descriptionCandidates && descriptionCandidates.length > 1 && !webProductResult && !isDescriptionSearching && (
                <div className="bcs-candidates-wrap" style={{ marginTop: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: 14, color: 'var(--dark-800)', fontWeight: 600 }}>
                      Encontramos {descriptionCandidates.length} modelos compatíveis:
                    </h4>
                    <span style={{ fontSize: 12, color: 'var(--dark-500)' }}>
                      Selecione o modelo desejado para carregar a ficha completa:
                    </span>
                  </div>
                  <div className="bcs-candidates-grid" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {descriptionCandidates.map((cand, cIdx) => (
                      <div
                        key={cIdx}
                        className="bcs-candidate-card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: '#ffffff',
                          border: '1px solid var(--dark-200)',
                          borderRadius: 'var(--radius-lg)',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={cand.images?.[0] || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600'}
                            alt={cand.name}
                            style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: 4, border: '1px solid var(--dark-200)' }}
                          />
                          <div>
                            <div style={{ display: 'flex', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                              <span className="badge badge-dark" style={{ fontSize: 10 }}>{cand.brand}</span>
                              {cand.model && <span className="badge badge-light" style={{ fontSize: 10 }}>Mod: {cand.model}</span>}
                              {cand.partNumber && <span className="badge badge-light" style={{ fontSize: 10 }}>P/N: {cand.partNumber}</span>}
                              {cand.ncm && <span className="badge badge-light" style={{ fontSize: 10 }}>NCM: {cand.ncm}</span>}
                            </div>
                            <strong style={{ fontSize: 13, color: 'var(--dark-900)' }}>{cand.name}</strong>
                            {cand.matchReason && (
                              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--dark-500)' }}>{cand.matchReason}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSelectDescriptionCandidate(cand)}
                          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          Selecionar Produto <ArrowRight size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultado canônico idêntico ao do Código de Barras quando localizado */}
              {webProductResult && !isDescriptionSearching && descriptionQuery && renderWebResultCard(webProductResult, webProductResult.ean || '')}
            </div>
          )}

          {/* TAB 4: Gerador de Etiquetas & Código de Barras Próprio */}
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
                        placeholder={`Ex: ${publicName}`}
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
            align-items: flex-start;
            gap: 16px;
            padding: var(--space-5) var(--space-6);
            border-bottom: 1px solid var(--dark-200);
            background: var(--white);
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .bcs-header-title h2 { font-size: var(--text-xl); }
          .bcs-close-btn {
            position: static;
            width: 38px;
            height: 38px;
            border-radius: var(--radius-full);
            background: var(--dark-100);
            border: 1px solid var(--dark-200);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--dark-600);
            transition: all var(--transition-fast);
            flex-shrink: 0;
          }
          .bcs-close-btn:hover {
            background: var(--dark-200);
            color: var(--dark-950);
            transform: scale(1.06);
          }
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
          .bcs-photo-intro-banner {
            background: linear-gradient(135deg, var(--dark-900) 0%, var(--dark-800) 100%);
            border: 1px solid var(--dark-700);
            border-radius: var(--radius-xl);
            padding: var(--space-4) var(--space-5);
            margin-bottom: var(--space-4);
          }
          .bcs-photo-preview-wrap {
            padding: var(--space-4);
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
          }
          .bcs-preview-image-container {
            position: relative;
            display: inline-block;
          }
          .bcs-photo-preview {
            max-height: 240px;
            max-width: 100%;
            border-radius: var(--radius-xl);
            border: 2px solid var(--lime);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
            object-fit: contain;
          }
          .bcs-preview-badge {
            position: absolute;
            bottom: 10px;
            right: 10px;
            background: rgba(15, 23, 42, 0.85);
            color: #4ade80;
            padding: 4px 10px;
            border-radius: var(--radius-full);
            font-size: 11px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 5px;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(74, 222, 128, 0.3);
          }
          .bcs-photo-action-bar {
            display: flex;
            gap: 10px;
            margin-top: 14px;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
          }
          .bcs-btn-search-photo {
            padding: 10px 20px;
            font-size: 14px;
            box-shadow: 0 4px 14px var(--lime-glow);
          }
          .bcs-searching-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: var(--space-6);
            background: var(--dark-50);
            border: 1px solid var(--dark-200);
            border-radius: var(--radius-xl);
            margin-top: var(--space-4);
            text-align: center;
          }
          .bcs-search-steps {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 6px;
            text-align: left;
            width: 100%;
            max-width: 440px;
          }
          .bcs-step-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--dark-600);
            font-weight: 500;
          }
          .bcs-step-item.active {
            color: var(--dark-900);
            font-weight: 600;
          }
          .bcs-step-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--lime);
            box-shadow: 0 0 6px var(--lime);
          }
          .bcs-error-card {
            margin-top: var(--space-4);
            padding: var(--space-5);
            background: var(--dark-900);
            border: 1px solid var(--dark-700);
            border-radius: var(--radius-xl);
          }
          .bcs-results-container {
            margin-top: var(--space-5);
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .bcs-results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            padding-bottom: var(--space-2);
            border-bottom: 1px solid var(--dark-200);
          }
          .bcs-candidates-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .bcs-candidate-card {
            background: var(--white);
            border: 1px solid var(--dark-200);
            border-radius: var(--radius-xl);
            padding: var(--space-4);
            display: flex;
            flex-direction: column;
            gap: var(--space-3);
            transition: all var(--transition-fast);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          }
          .bcs-candidate-card:hover {
            border-color: var(--lime);
            box-shadow: 0 6px 16px rgba(132, 204, 22, 0.12);
          }
          .bcs-candidate-exact {
            border: 2px solid var(--lime);
            background: #fafdf5;
            box-shadow: 0 4px 16px rgba(132, 204, 22, 0.15);
          }
          .bcs-candidate-main {
            display: flex;
            gap: var(--space-4);
            align-items: flex-start;
          }
          @media (max-width: 640px) {
            .bcs-candidate-main {
              flex-direction: column;
            }
          }
          .bcs-candidate-thumb {
            width: 100px;
            height: 100px;
            object-fit: contain;
            border-radius: var(--radius-lg);
            border: 1px solid var(--dark-200);
            flex-shrink: 0;
            background: #ffffff;
            padding: 4px;
          }
          .bcs-candidate-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .bcs-candidate-badges {
            display: flex;
            gap: 6px;
            align-items: center;
            flex-wrap: wrap;
          }
          .bcs-score-pill {
            font-size: 11px;
            font-weight: 700;
            background: #dcfce7;
            color: #15803d;
            padding: 2px 8px;
            border-radius: 6px;
            border: 1px solid #bbf7d0;
          }
          .bcs-candidate-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--dark-900);
            margin: 0;
            line-height: 1.3;
          }
          .bcs-candidate-meta-grid {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 2px;
          }
          .bcs-meta-tag {
            font-size: 11px;
            background: var(--dark-50);
            color: var(--dark-700);
            padding: 3px 8px;
            border-radius: 6px;
            border: 1px solid var(--dark-200);
          }
          .bcs-candidate-specs {
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            margin-top: 2px;
          }
          .bcs-match-reason {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 11px;
            color: #475569;
            margin-top: 4px;
            line-height: 1.4;
          }
          .bcs-candidate-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: var(--space-3);
            border-top: 1px solid var(--dark-100);
            flex-wrap: wrap;
            gap: 12px;
          }
          .bcs-candidate-price {
            display: flex;
            flex-direction: column;
          }
          .bcs-candidate-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
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
            object-fit: contain;
            border-radius: var(--radius-lg);
            border: 1px solid var(--dark-200);
            flex-shrink: 0;
            background: #ffffff;
            padding: 4px;
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
          .bcs-candidates-wrap {
            margin-top: var(--space-4);
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
          }
          .bcs-candidates-grid {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .bcs-candidate-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #ffffff;
            border: 1px solid var(--dark-200);
            border-radius: var(--radius-lg);
            gap: 12px;
            transition: all 0.2s ease;
          }
          .bcs-candidate-card:hover {
            border-color: var(--lime);
            box-shadow: 0 2px 8px rgba(132, 204, 22, 0.15);
          }
        `}</style>
      </div>
    </div>
  )
}
