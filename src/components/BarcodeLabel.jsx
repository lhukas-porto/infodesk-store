import React from 'react'
import { Printer, Download, Sparkles } from 'lucide-react'
import { encodeEan13ToPattern, generateBarcodeLabelPDF } from '../services/barcodeService'

export default function BarcodeLabel({ product, ean, price, onPrint, onDownload }) {
  const cleanEan = (ean || '7891234567890').replace(/\D/g, '').padStart(13, '0').slice(0, 13)
  const { pattern } = encodeEan13ToPattern(cleanEan)
  const finalPrice = parseFloat(price || product?.price || 0)

  const handleDownloadPDF = () => {
    const doc = generateBarcodeLabelPDF({ product, ean: cleanEan, price: finalPrice })
    doc.save(`etiqueta-${cleanEan}.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="barcode-label-wrapper">
      {/* Visual Barcode Label (Estilo Impressora Térmica 60x40mm) */}
      <div className="printable-barcode-label" id="printable-label">
        <div className="bl-header">INFODESK INFORMÁTICA</div>
        <div className="bl-title">{product?.name || 'PRODUTO INFODESK'}</div>
        <div className="bl-sub">
          <span>{product?.brand ? `Marca: ${product.brand}` : 'Tecnologia & Hardware'}</span>
          {product?.category && <span> | {product.category}</span>}
        </div>

        {/* Barcode SVG */}
        <div className="bl-barcode-container">
          <svg viewBox={`0 0 ${pattern.length * 2} 45`} className="bl-barcode-svg">
            {pattern.split('').map((bit, idx) => {
              if (bit === '0') return null
              const isGuard = idx < 3 || (idx >= 45 && idx < 50) || idx >= pattern.length - 3
              return (
                <rect
                  key={idx}
                  x={idx * 2}
                  y={0}
                  width={2}
                  height={isGuard ? 45 : 38}
                  fill="#000000"
                />
              )
            })}
          </svg>
          <div className="bl-numbers">{cleanEan}</div>
        </div>

        <div className="bl-price">
          R$ {finalPrice.toFixed(2).replace('.', ',')}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bl-actions hide-print">
        <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadPDF}>
          <Download size={14} /> Baixar PDF
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
          <Printer size={14} /> Imprimir Etiqueta
        </button>
      </div>

      <style>{`
        .barcode-label-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          margin: var(--space-3) 0;
        }
        .printable-barcode-label {
          width: 260px;
          background: #ffffff;
          color: #000000;
          border: 2px dashed #94a3b8;
          border-radius: 8px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .bl-header {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .bl-title {
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          max-height: 28px;
          overflow: hidden;
          color: #1e293b;
          margin-bottom: 2px;
        }
        .bl-sub {
          font-size: 9px;
          color: #64748b;
          margin-bottom: 6px;
        }
        .bl-barcode-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: #ffffff;
          padding: 4px 0;
        }
        .bl-barcode-svg {
          width: 190px;
          height: 42px;
          display: block;
        }
        .bl-numbers {
          font-family: "Courier New", Courier, monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          margin-top: 2px;
          color: #000000;
        }
        .bl-price {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-top: 4px;
          border-top: 1px solid #e2e8f0;
          width: 100%;
          padding-top: 4px;
        }
        .bl-actions {
          display: flex;
          gap: var(--space-2);
        }

        @media print {
          body * {
            visibility: hidden;
          }
          #printable-label, #printable-label * {
            visibility: visible;
          }
          #printable-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 58mm;
            height: 38mm;
            border: none;
            box-shadow: none;
            padding: 2mm;
          }
          .hide-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
