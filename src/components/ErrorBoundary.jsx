import React from 'react'
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleResetCache = () => {
    if (window.confirm('Deseja redefinir os dados locais para o padrão da loja?')) {
      localStorage.clear()
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-container">
          <div className="eb-card">
            <div className="eb-icon-wrap">
              <AlertTriangle size={36} />
            </div>
            <h2 className="eb-title">Ops! Algo inesperado aconteceu.</h2>
            <p className="eb-desc">
              Não se preocupe, seus dados estão seguros. Você pode recarregar a aplicação ou redefinir o estado local abaixo.
            </p>

            {this.state.error && (
              <div className="eb-error-box">
                <code>{this.state.error.toString()}</code>
              </div>
            )}

            <div className="eb-actions">
              <button type="button" className="btn btn-primary" onClick={this.handleReload}>
                <RefreshCw size={16} /> Recarregar Loja
              </button>
              <button type="button" className="btn btn-outline" onClick={this.handleResetCache}>
                <Trash2 size={16} /> Restaurar Padrões Locais
              </button>
            </div>
          </div>

          <style>{`
            .eb-container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #020617;
              padding: 24px;
              color: #f8fafc;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .eb-card {
              max-width: 540px;
              width: 100%;
              background: #0f172a;
              border: 1px solid #1e293b;
              border-radius: 20px;
              padding: 36px 32px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            .eb-icon-wrap {
              width: 72px;
              height: 72px;
              border-radius: 50%;
              background: rgba(225, 29, 72, 0.15);
              color: #fb7185;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
            }
            .eb-title {
              font-size: 1.5rem;
              font-weight: 800;
              margin-bottom: 10px;
              color: #ffffff;
            }
            .eb-desc {
              font-size: 0.95rem;
              color: #94a3b8;
              line-height: 1.5;
              margin-bottom: 20px;
            }
            .eb-error-box {
              width: 100%;
              background: #020617;
              border: 1px solid #334155;
              border-radius: 10px;
              padding: 12px 16px;
              text-align: left;
              margin-bottom: 24px;
              overflow-x: auto;
              font-size: 0.8rem;
              color: #f87171;
            }
            .eb-actions {
              display: flex;
              gap: 12px;
              flex-wrap: wrap;
              justify-content: center;
              width: 100%;
            }
          `}</style>
        </div>
      )
    }

    return this.props.children
  }
}
