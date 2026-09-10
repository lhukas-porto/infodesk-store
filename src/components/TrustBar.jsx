import React from 'react'
import { ShieldCheck, Truck, CreditCard, RotateCcw } from 'lucide-react'

export default function TrustBar() {
  const benefits = [
    {
      icon: <ShieldCheck size={26} className="trust-icon" />,
      title: 'Procedência & Nota Fiscal',
      subtitle: 'Garantia oficial e nota fiscal em todos os pedidos'
    },
    {
      icon: <Truck size={26} className="trust-icon" />,
      title: 'Envio Rápido pelos Correios',
      subtitle: 'Postagem em até 24h úteis para todo o Brasil'
    },
    {
      icon: <CreditCard size={26} className="trust-icon" />,
      title: '3% de Desconto no Pix',
      subtitle: 'Ou parcele em até 12x sem juros no cartão'
    },
    {
      icon: <RotateCcw size={26} className="trust-icon" />,
      title: 'Tudo em um Só Lugar',
      subtitle: 'Variedade completa para qualquer necessidade'
    }
  ]

  return (
    <section className="trust-bar-section">
      <div className="container">
        <div className="trust-bar-grid">
          {benefits.map((item, index) => (
            <div key={index} className="trust-bar-card">
              <div className="trust-icon-wrapper">
                {item.icon}
              </div>
              <div className="trust-bar-info">
                <h4 className="trust-bar-title">{item.title}</h4>
                <p className="trust-bar-sub">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .trust-bar-section {
          background: #0b1120;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px 0;
          position: relative;
          z-index: 5;
        }
        .trust-bar-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .trust-bar-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .trust-bar-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
          }
        }
        .trust-bar-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          transition: all 0.25s ease;
        }
        .trust-bar-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(59, 130, 246, 0.4);
          transform: translateY(-2px);
        }
        .trust-icon-wrapper {
          width: 46px;
          height: 46px;
          border-radius: 10px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.25));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #60a5fa;
          flex-shrink: 0;
        }
        .trust-bar-title {
          font-size: 14px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 2px 0;
          letter-spacing: -0.01em;
        }
        .trust-bar-sub {
          font-size: 12px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.35;
        }
      `}</style>
    </section>
  )
}
