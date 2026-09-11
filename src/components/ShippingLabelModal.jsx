import React, { useEffect, useRef } from 'react'
import { X, Printer, Truck, Package, Shield, FileText, CheckCircle2, QrCode } from 'lucide-react'
import { formatCep, formatCpf } from '../services/correiosService'

export default function ShippingLabelModal({ order, onClose }) {
  const printRef = useRef(null)

  // Suporte a fechar pelo ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!order) return null

  const handlePrint = () => {
    window.print()
  }

  const cliente = order.cliente || {}
  const total = (order.total || 0).toFixed(2).replace('.', ',')
  const freteType = order.freteType || 'PAC'
  const isSedex = freteType.toUpperCase().includes('SEDEX')

  return (
    <div className="overlay">
      <button
        className="modal-close-floating no-print"
        onClick={onClose}
        title="Fechar Janela (ESC)"
        aria-label="Fechar Janela"
      >
        <X size={22} />
      </button>

      <div className="modal modal-xl print-container" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header (Ocultado na impressão) */}
        <div className="adm-header no-print" style={{ borderBottom: '1px solid var(--dark-200)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Printer size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--dark-900)' }}>
                Etiqueta de Envio & Declaração de Conteúdo dos Correios
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--dark-500)' }}>
                Pedido #{order.id} · Padrão Oficial Correios A4 / Térmica
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button type="button" className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Imprimir Documentos
            </button>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Folha de Impressão Oficial */}
        <div ref={printRef} className="label-printable-area" style={{ padding: '24px', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
          {/* ========================================================================= */}
          {/* 1. ETIQUETA DE POSTAGEM DOS CORREIOS */}
          {/* ========================================================================= */}
          <div style={{ border: '2px solid #000', borderRadius: '4px', padding: '16px', marginBottom: '24px' }}>
            {/* Topo da Etiqueta: Chancela Oficial */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#000', color: '#fff', padding: '6px 14px', fontWeight: 900, fontSize: '20px', letterSpacing: '2px' }}>
                  {isSedex ? 'SEDEX' : 'PAC'}
                </div>
                <div>
                  <strong style={{ fontSize: '13px', display: 'block' }}>CORREIOS</strong>
                  <span style={{ fontSize: '11px' }}>Contrato: <strong>9912631518</strong> · DR: <strong>10 (DF)</strong></span>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '11px' }}>
                <span>Pedido: <strong>#{order.id}</strong></span>
                <span style={{ display: 'block' }}>Data: {new Date(order.date).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            {/* Código de Rastreio / Código de Barras dos Correios */}
            <div style={{ textAlign: 'center', padding: '10px 0 14px', borderBottom: '1px dashed #666', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#555', letterSpacing: '1px' }}>
                Código de Rastreamento
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '3px', margin: '4px 0' }}>
                {order.trackingCode || 'BR' + String(order.id).replace(/\D/g, '').padStart(9, '0') + 'BR'}
              </div>
              {/* Representação visual do código de barras Code 128 */}
              <div style={{ display: 'flex', justifyContent: 'center', height: '42px', gap: '2px', alignItems: 'flex-end', margin: '6px auto', maxWidth: '300px' }}>
                {[3,1,2,1,4,2,1,3,1,2,4,1,2,3,1,4,2,1,3,2,4,1,2,1,3,4,1,2,3,1,2,4,1,3,2,1,4,2,1,3,1,2].map((h, idx) => (
                  <div key={idx} style={{ width: `${(idx % 3 === 0 ? 3 : 2)}px`, height: '100%', background: '#000' }} />
                ))}
              </div>
            </div>

            {/* DESTINATÁRIO */}
            <div style={{ padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '4px' }}>
                DESTINATÁRIO:
              </span>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                {cliente.nome || 'Cliente Infodesk'}
              </div>
              <div style={{ fontSize: '13px', marginTop: '2px', color: '#1e293b' }}>
                {cliente.endereco || 'Endereço não informado'}, {cliente.numero || 'S/N'} {cliente.complemento && `- ${cliente.complemento}`}
              </div>
              <div style={{ fontSize: '13px', color: '#1e293b' }}>
                Bairro: <strong>{cliente.bairro || 'Centro'}</strong> · {cliente.cidade || 'Brasília'} / {cliente.estado || 'DF'}
              </div>
              <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#000' }}>
                  CEP: {formatCep(cliente.cep || '70000000')}
                </span>
                {cliente.telefone && (
                  <span style={{ fontSize: '12px', color: '#475569' }}>
                    Tel: {cliente.telefone}
                  </span>
                )}
              </div>
            </div>

            {/* REMETENTE */}
            <div style={{ padding: '10px', borderTop: '1px solid #000', fontSize: '11px', color: '#333' }}>
              <span style={{ fontWeight: 900, display: 'block', textTransform: 'uppercase' }}>REMETENTE:</span>
              <strong style={{ fontSize: '12px', color: '#000' }}>INFODESK INFORMÁTICA</strong> · CNPJ: 15.266.716/0001-02<br />
              CLSW 304 Bloco A Sala 108 - Sudoeste · Brasília - DF · <strong>CEP: 70.673-631</strong>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. DECLARAÇÃO DE CONTEÚDO OFICIAL DOS CORREIOS */}
          {/* ========================================================================= */}
          <div style={{ border: '2px solid #000', borderRadius: '4px', padding: '16px' }}>
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 900 }}>
                Declaração de Conteúdo
              </h4>
              <span style={{ fontSize: '10px', color: '#555' }}>
                Exigida pelos Correios para transporte de encomendas sem nota fiscal anexada (Art. 730 Lei 10.406/02)
              </span>
            </div>

            {/* Grid Remetente / Destinatário Compacto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', borderBottom: '1px solid #000', paddingBottom: '10px', marginBottom: '10px' }}>
              <div>
                <strong>REMETENTE:</strong><br />
                Nome: Infodesk Informática<br />
                Endereço: CLSW 304 Bloco A Sala 108 - Sudoeste<br />
                Cidade/UF: Brasília - DF · CEP: 70.673-631<br />
                CNPJ: 15.266.716/0001-02
              </div>
              <div>
                <strong>DESTINATÁRIO:</strong><br />
                Nome: {cliente.nome || 'Cliente'}<br />
                Endereço: {cliente.endereco || ''}, {cliente.numero || ''}<br />
                Cidade/UF: {cliente.cidade || ''}/{cliente.estado || ''} · CEP: {formatCep(cliente.cep || '')}<br />
                CPF/CNPJ: {formatCpf(cliente.cpf || '') || 'Não informado'}
              </div>
            </div>

            {/* Tabela de Itens */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '14px' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', width: '30px' }}>Item</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'left' }}>Conteúdo</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', width: '40px' }}>Qtd</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', width: '80px' }}>Valor (R$)</th>
                  <th style={{ border: '1px solid #000', padding: '5px', textAlign: 'right', width: '80px' }}>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((it, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>{it.name}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{it.qty}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                      {it.price?.toFixed(2).replace('.', ',')}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'right' }}>
                      {((it.price || 0) * (it.qty || 1)).toFixed(2).replace('.', ',')}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 900, background: '#f8fafc' }}>
                  <td colSpan={4} style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>VALOR TOTAL:</td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'right' }}>R$ {total}</td>
                </tr>
              </tbody>
            </table>

            {/* Termo e Assinatura */}
            <div style={{ fontSize: '10px', color: '#444', borderTop: '1px dashed #666', paddingTop: '8px' }}>
              <p style={{ margin: '0 0 16px' }}>
                Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996 e que o conteúdo da encomenda não constitui objeto de mercancia com habitualidade ou intuito comercial.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span>Brasília - DF, {new Date().toLocaleDateString('pt-BR')}</span>
                <div style={{ textAlign: 'center', width: '240px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                  Assinatura do Remetente / Responsável
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estilos CSS específicos de impressão */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .no-print {
              display: none !important;
            }
            .label-printable-area, .label-printable-area * {
              visibility: visible;
            }
            .label-printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 !important;
            }
            .modal {
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
            }
            .overlay {
              background: transparent !important;
              position: static !important;
              padding: 0 !important;
            }
          }
        ` }} />
      </div>
    </div>
  )
}
