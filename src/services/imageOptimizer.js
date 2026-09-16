/**
 * Serviço de Otimização e Compressão Inteligente de Imagens Client-side
 * Converte fotos pesadas de celulares (PNG/JPG de 3MB-10MB) para WebP ultraleve (<70KB)
 * antes do upload para o Supabase Storage ou armazenamento local.
 */

export async function compressImageToWebP(fileOrBase64, maxDimension = 1000, quality = 0.82) {
  return new Promise((resolve, reject) => {
    try {
      let src = ''
      if (typeof fileOrBase64 === 'string') {
        src = fileOrBase64
      } else if (fileOrBase64 instanceof Blob || fileOrBase64 instanceof File) {
        src = URL.createObjectURL(fileOrBase64)
      } else {
        return resolve(fileOrBase64)
      }

      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        try {
          if (typeof fileOrBase64 !== 'string') {
            URL.revokeObjectURL(src)
          }

          let width = img.width
          let height = img.height

          // Redimensiona proporcionalmente mantendo o aspect ratio se for maior que maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')

          if (!ctx) {
            return resolve(typeof fileOrBase64 === 'string' ? fileOrBase64 : src)
          }

          // Renderização suave com interpolação de alta qualidade
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, 0, 0, width, height)

          // Tenta exportar em image/webp, com fallback automático para image/jpeg
          let webpDataUrl = canvas.toDataURL('image/webp', quality)
          if (!webpDataUrl.startsWith('data:image/webp')) {
            webpDataUrl = canvas.toDataURL('image/jpeg', quality)
          }

          canvas.toBlob((blob) => {
            resolve({
              dataUrl: webpDataUrl,
              blob: blob || null,
              width,
              height,
              originalSize: fileOrBase64.size || 0,
              compressedSize: blob ? blob.size : 0
            })
          }, 'image/webp', quality)
        } catch (err) {
          resolve({ dataUrl: src, blob: null, width: img.width, height: img.height })
        }
      }

      img.onerror = (err) => {
        if (typeof fileOrBase64 !== 'string') {
          URL.revokeObjectURL(src)
        }
        resolve({ dataUrl: src, blob: null, width: 0, height: 0 })
      }

      img.src = src
    } catch (e) {
      resolve({ dataUrl: '', blob: null, width: 0, height: 0 })
    }
  })
}
