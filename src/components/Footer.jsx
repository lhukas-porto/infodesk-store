import React, { useRef } from 'react'
import { Truck, CreditCard, ShieldCheck, Headphones, Mail, Phone, MapPin } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { getCompanyPublicName, getCompanyFullAddress, getCompanyGoogleMapsUrl } from '../services/companyService'

// Ícone oficial vetorial do WhatsApp
function WhatsAppIcon({ size = 18, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={{ color: '#25D366' }}
    >
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.971.53 1.764.821 2.796.821 3.182 0 5.768-2.587 5.768-5.766.001-3.18-2.585-5.767-5.768-5.767zm3.393 8.163c-.144.405-.837.774-1.17.824-.312.045-.634.072-1.045-.062-.25-.082-.574-.199-1.002-.384-1.808-.783-2.981-2.617-3.072-2.737-.091-.121-.735-.979-.735-1.868 0-.89.467-1.328.632-1.508.165-.18.36-.225.48-.225.12 0 .24.002.345.006.111.004.258-.042.404.308.149.36.509 1.242.553 1.332.045.09.075.195.015.315-.06.12-.09.195-.18.3-.09.105-.189.234-.27.315-.09.09-.184.187-.079.367.105.18.468.772 1.004 1.249.691.614 1.274.805 1.454.895.18.09.285.075.39-.045.105-.12.45-.525.57-.705.12-.18.24-.15.405-.09.165.06 1.05.495 1.23.585.18.09.3.135.345.21.045.075.045.435-.099.84zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.438 5.178L2 22l4.98-1.306A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.162a8.134 8.134 0 01-4.148-1.134l-.297-.176-2.964.777.791-2.889-.193-.306A8.138 8.138 0 013.838 12c0-4.5 3.662-8.162 8.162-8.162s8.162 3.662 8.162 8.162-3.662 8.162-8.162 8.162z" />
    </svg>
  )
}

// Ícone clássico de telefone fixo
function VintagePhoneIcon({ size = 18, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      style={{ color: '#E2E8F0' }}
    >
      <path d="M19.95 21a2 2 0 0 1-1.95-1.52A15.86 15.86 0 0 1 17.5 13a15.86 15.86 0 0 1 .5-6.48A2 2 0 0 1 19.95 5h.05a2 2 0 0 1 2 2.05c-.13 3.32-.13 6.58 0 9.9a2 2 0 0 1-2 2.05h-.05zm-15.9 0a2 2 0 0 1-2-2.05c.13-3.32.13-6.58 0-9.9A2 2 0 0 1 4.05 7h.05a2 2 0 0 1 1.95 1.52A15.86 15.86 0 0 1 6.5 15a15.86 15.86 0 0 1-.5 4.48A2 2 0 0 1 4.05 21h-.05zM12 3a9.96 9.96 0 0 0-7.07 2.93l1.41 1.41A7.97 7.97 0 0 1 12 5c2.21 0 4.21.9 5.66 2.34l1.41-1.41A9.96 9.96 0 0 0 12 3zm0 4a5.98 5.98 0 0 0-4.24 1.76l1.41 1.41A3.98 3.98 0 0 1 12 9c1.1 0 2.1.45 2.83 1.17l1.41-1.41A5.98 5.98 0 0 0 12 7zM9 13h6v2H9v-2zm-1 3h8v2H8v-2zm2 3h4v2h-4v-2z" />
    </svg>
  )
}

export default function Footer() {
  const { isAdmin, setShowAdminLogin, setShowAdminDashboard, companyData } = useStore()
  const clickCount = useRef(0)
  const clickTimer = useRef(null)

  const publicName = getCompanyPublicName(companyData)
  const fullAddress = getCompanyFullAddress(companyData)
  const mapsUrl = getCompanyGoogleMapsUrl(companyData)

  const rawWhatsapp = (companyData?.whatsapp || '61996272630').replace(/\D/g, '')
  const whatsappUrl = `https://wa.me/55${rawWhatsapp}`
  const contactEmail = companyData?.emailPrincipal || companyData?.emailAtendimento || 'lucas@infodesk.net.br'

  const handleSecretClick = () => {
    clickCount.current += 1
    if (clickTimer.current) clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0
    }, 1200)

    if (clickCount.current >= 3) {
      clickCount.current = 0
      if (isAdmin) setShowAdminDashboard(true)
      else setShowAdminLogin(true)
    }
  }

  return (
    <footer className="footer">
      {/* Trust bar */}
      <div className="footer-trust">
        <div className="container">
          <div className="footer-trust-grid">
            <div className="footer-trust-item">
              <Truck size={28} />
              <div>
                <strong>Entrega Rápida</strong>
                <span>Envio para todo o Brasil</span>
              </div>
            </div>
            <div className="footer-trust-item">
              <CreditCard size={28} />
              <div>
                <strong>Até 12x no cartão</strong>
                <span>Ou Boleto Bancário</span>
              </div>
            </div>
            <div className="footer-trust-item">
              <ShieldCheck size={28} />
              <div>
                <strong>Compra Segura</strong>
                <span>Dados protegidos</span>
              </div>
            </div>
            <div className="footer-trust-item">
              <Headphones size={28} />
              <div>
                <strong>Suporte Técnico</strong>
                <span>Atendimento especializado</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="footer-main">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h4 className="footer-brand-title">{publicName}</h4>
              <p>{companyData?.descricaoCurta || 'Tudo o que você e sua empresa precisam em um só lugar. Variedade completa, procedência garantida, frete rápido dos Correios e o melhor atendimento do Brasil.'}</p>
            </div>
            <div className="footer-links">
              <h4>Institucional</h4>
              <a href="#">Sobre nós</a>
              <a href="#">Política de Privacidade</a>
              <a href="#">Termos de Uso</a>
              <a href="#">Trocas e Devoluções</a>
            </div>
            <div className="footer-links">
              <h4>Departamentos</h4>
              <a href="#products">Eletrônicos & Tecnologia</a>
              <a href="#products">Informática & Periféricos</a>
              <a href="#products">Escritório & Suprimentos</a>
              <a href="#products">Casa & Utilidades</a>
              <a href="#products">Ferramentas & Variedades</a>
            </div>
            <div className="footer-links footer-contact">
              <h4>Fale Conosco</h4>

              {/* Telefone Fixo (Apenas exibição) */}
              {companyData?.telefone && (
                <div className="footer-contact-item footer-contact-static">
                  <span className="footer-contact-icon">
                    <Phone size={16} />
                  </span>
                  <div className="footer-contact-text">
                    <span className="footer-contact-label">Telefone Fixo</span>
                    <strong>{companyData.telefone}</strong>
                  </div>
                </div>
              )}

              {/* WhatsApp */}
              {companyData?.whatsapp && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-contact-item footer-contact-whatsapp"
                  title="Chamar no WhatsApp"
                >
                  <span className="footer-contact-icon whatsapp">
                    <WhatsAppIcon size={18} />
                  </span>
                  <div className="footer-contact-text">
                    <span className="footer-contact-label">WhatsApp</span>
                    <strong className="footer-wa-number">{companyData.whatsapp}</strong>
                  </div>
                </a>
              )}

              {/* E-mail */}
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="footer-contact-item" title="Enviar e-mail">
                  <span className="footer-contact-icon">
                    <Mail size={16} />
                  </span>
                  <div className="footer-contact-text">
                    <span className="footer-contact-label">E-mail</span>
                    <span>{contactEmail}</span>
                  </div>
                </a>
              )}
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-corporate-info" onClick={handleSecretClick} style={{ cursor: 'default' }}>
              <div className="footer-corp-line">
                <p className="footer-corp-title">
                  © {new Date().getFullYear()} <strong>{companyData?.razaoSocial || publicName}</strong>{companyData?.cnpj ? ` — CNPJ ${companyData.cnpj}` : ''}
                </p>
                {fullAddress && (
                  <>
                    <span className="footer-corp-sep hide-mobile">•</span>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="footer-corp-address-link"
                      title="Abrir endereço no Google Maps"
                    >
                      <MapPin size={14} className="footer-corp-pin" />
                      <span>{fullAddress}</span>
                    </a>
                  </>
                )}
              </div>
              <p className="footer-corp-sub">
                Atendimento presencial e centro de distribuição com envios expressos para todo o território nacional.
              </p>
            </div>
            <div className="footer-payments">
              <span className="badge badge-dark">Visa</span>
              <span className="badge badge-dark">Mastercard</span>
              <span className="badge badge-dark">Boleto Bancário</span>
              <span className="badge badge-dark">Pix</span>
              {/* Acesso Restrito Discreto ao Painel Administrativo */}
              <button
                className="footer-secret-btn"
                onClick={() => isAdmin ? setShowAdminDashboard(true) : setShowAdminLogin(true)}
                title="Acesso Administrativo"
                aria-label="Acesso Administrativo"
              >
                🔒
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .footer-trust {
          background: var(--dark-900);
          padding: var(--space-6) 0;
        }
        .footer-trust-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-4);
        }
        @media (min-width: 768px) {
          .footer-trust-grid { grid-template-columns: repeat(4, 1fr); }
        }
        .footer-trust-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          color: var(--white);
        }
        .footer-trust-item svg { color: var(--lime); flex-shrink: 0; }
        .footer-trust-item strong { display: block; font-size: var(--text-sm); }
        .footer-trust-item span { font-size: var(--text-xs); color: var(--dark-400); }

        .footer-main {
          background: var(--dark-950);
          padding: var(--space-12) 0 var(--space-6);
          color: var(--dark-400);
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-8);
        }
        @media (min-width: 768px) {
          .footer-grid { grid-template-columns: 2fr 1fr 1fr 1.5fr; }
        }
        .footer-brand-title {
          color: var(--white);
          font-size: var(--text-base);
          font-weight: 700;
          margin-bottom: var(--space-3);
          font-family: var(--font-display);
          letter-spacing: -0.2px;
        }
        .footer-brand p {
          margin-top: 0;
          font-size: var(--text-sm);
          line-height: 1.6;
          max-width: 300px;
        }
        .footer-links h4 {
          color: var(--white);
          font-size: var(--text-sm);
          margin-bottom: var(--space-3);
          font-family: var(--font-display);
        }
        .footer-links a {
          display: block;
          font-size: var(--text-sm);
          padding: var(--space-1) 0;
          transition: color var(--transition-fast);
        }
        .footer-links a:hover { color: var(--lime); }

        /* Contact links styling */
        .footer-contact {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .footer-contact-item {
          display: flex !important;
          align-items: center;
          gap: 10px;
          padding: 6px 10px !important;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          transition: all var(--transition-base) !important;
        }
        .footer-contact-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--lime);
          transform: translateX(4px);
        }
        .footer-contact-whatsapp:hover {
          border-color: #25D366 !important;
          background: rgba(37, 211, 102, 0.1) !important;
        }
        .footer-contact-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--white);
        }
        .footer-contact-icon.whatsapp {
          background: rgba(37, 211, 102, 0.15);
        }
        .footer-contact-text {
          display: flex;
          flex-direction: column;
          line-height: 1.3;
        }
        .footer-contact-label {
          font-size: 10px;
          color: var(--dark-400);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .footer-contact-text strong {
          color: var(--white);
          font-size: var(--text-sm);
          font-weight: 700;
        }
        .footer-wa-number {
          color: #25D366 !important;
        }
        .footer-contact-text span {
          color: var(--dark-300);
          font-size: var(--text-xs);
        }

        .footer-corporate-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          color: var(--dark-400);
        }
        .footer-corp-line {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .footer-corp-title {
          font-size: var(--text-xs);
          color: var(--dark-300);
          margin: 0;
        }
        .footer-corp-title strong {
          color: var(--white);
        }
        .footer-corp-sep {
          color: var(--dark-600);
          font-size: 10px;
        }
        .footer-corp-address-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: var(--text-xs);
          color: #94a3b8;
          text-decoration: none;
          transition: all var(--transition-fast);
          cursor: pointer;
        }
        .footer-corp-address-link:hover {
          color: #38bdf8;
        }
        .footer-corp-address-link:hover .footer-corp-pin {
          transform: scale(1.3);
          color: #60a5fa;
        }
        .footer-corp-pin {
          color: #38bdf8;
          flex-shrink: 0;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease;
        }
        .footer-contact-icon.maps {
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
        }
        .footer-contact-item.footer-contact-maps:hover {
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.06);
        }
        .footer-corp-sub {
          font-size: 11px;
          color: var(--dark-500);
          margin: 0;
          line-height: 1.4;
        }

        .footer-bottom {
          margin-top: var(--space-8);
          padding-top: var(--space-6);
          border-top: 1px solid var(--dark-800);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          align-items: center;
          text-align: center;
        }
        @media (min-width: 768px) {
          .footer-bottom {
            flex-direction: row;
            justify-content: space-between;
            text-align: left;
          }
        }
        .footer-payments { display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: center; align-items: center; }
        .footer-secret-btn {
          background: transparent;
          border: none;
          font-size: 11px;
          opacity: 0.2;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          color: var(--white);
          margin-left: 4px;
        }
        .footer-secret-btn:hover {
          opacity: 0.9;
          background: var(--dark-800);
        }
      `}</style>
    </footer>
  )
}
