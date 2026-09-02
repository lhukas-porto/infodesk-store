import React, { useState, useEffect } from 'react'
import {
  X, Shield, Lock, Mail, Eye, EyeOff, AlertCircle,
  CheckCircle2, KeyRound, Info, ArrowRight
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import InfodeskLogo from '../assets/brand/InfodeskLogo'

export default function AdminLoginModal() {
  const { showAdminLogin, setShowAdminLogin, loginAdmin, adminConfig } = useStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTimer, setLockoutTimer] = useState(0)
  const [showCredsHint, setShowCredsHint] = useState(false)

  // Countdown timer for lockout protection
  useEffect(() => {
    let interval = null
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            setFailedAttempts(0)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [lockoutTimer])

  // Pre-fill email when opening
  useEffect(() => {
    if (showAdminLogin) {
      setError('')
      if (!email) setEmail(adminConfig.email)
    }
  }, [showAdminLogin, adminConfig.email])

  if (!showAdminLogin) return null

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (lockoutTimer > 0) return

    if (!email.trim()) {
      setError('Informe seu e-mail ou nome de usuário.')
      return
    }

    if (!password) {
      setError('Informe sua senha de acesso.')
      return
    }

    setIsLoading(true)
    setError('')

    // Micro-delay for security feeling and UI smoothness
    setTimeout(() => {
      const result = loginAdmin(email, password, rememberMe)
      setIsLoading(false)

      if (!result.success) {
        const nextAttempts = failedAttempts + 1
        setFailedAttempts(nextAttempts)

        if (nextAttempts >= 5) {
          setLockoutTimer(30)
          setError('Muitas tentativas incorretas. Bloqueio temporário de 30 segundos por segurança.')
        } else {
          setError(`${result.error} (Tentativa ${nextAttempts} de 5)`)
        }
      } else {
        // Reset state on successful login
        setPassword('')
        setError('')
        setFailedAttempts(0)
      }
    }, 400)
  }

  const handleFillDemo = () => {
    setEmail(adminConfig.email)
    setPassword(adminConfig.password)
    setError('')
    setShowCredsHint(false)
  }

  return (
    <div className="overlay">
      <div className="modal admin-login-modal">
        <button
          className="modal-close"
          onClick={() => setShowAdminLogin(false)}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="adm-login-header">
          <div className="adm-login-logo">
            <InfodeskLogo size={140} />
          </div>
          <div className="adm-badge-security">
            <Shield size={14} />
            <span>Acesso Restrito · Painel de Gestão</span>
          </div>
          <h2>Área do Administrador</h2>
          <p>Autentique-se com suas credenciais seguras para gerenciar o catálogo, estoque e pedidos.</p>
        </div>

        {/* Form */}
        <form className="adm-login-form" onSubmit={handleSubmit}>
          {/* Email / Username */}
          <div className="adm-form-group">
            <label htmlFor="admin-email">E-mail ou Usuário</label>
            <div className="input-wrap">
              <Mail size={18} className="input-icon-left" />
              <input
                id="admin-email"
                type="text"
                className="input-field has-icon-left"
                placeholder="ex: lucas@infodesk.net.br"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                disabled={lockoutTimer > 0 || isLoading}
                autoFocus
              />
            </div>
          </div>

          {/* Password */}
          <div className="adm-form-group">
            <div className="adm-label-row">
              <label htmlFor="admin-password">Senha de Acesso</label>
              <button
                type="button"
                className="adm-forgot-btn"
                onClick={() => setShowCredsHint(!showCredsHint)}
              >
                Esqueceu ou 1º Acesso?
              </button>
            </div>
            <div className="input-wrap">
              <Lock size={18} className="input-icon-left" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field has-both-icons"
                placeholder="••••••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                disabled={lockoutTimer > 0 || isLoading}
              />
              <button
                type="button"
                className="input-btn-right"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label="Alternar visualização da senha"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember me option */}
          <div className="adm-options-row">
            <label className="adm-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Manter conectado neste dispositivo</span>
            </label>
          </div>

          {/* Error message */}
          {error && (
            <div className="adm-alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Lockout alert */}
          {lockoutTimer > 0 && (
            <div className="adm-alert-lockout">
              <Lock size={18} />
              <span>Aguarde {lockoutTimer}s para tentar novamente.</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary btn-lg adm-submit-btn"
            disabled={isLoading || lockoutTimer > 0}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18 }} />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <KeyRound size={18} />
                <span>Entrar no Painel</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Credentials / First Access Hint Box */}
        {showCredsHint && (
          <div className="adm-creds-box">
            <div className="adm-creds-header">
              <Info size={16} />
              <strong>Credenciais Padrão do Sistema</strong>
            </div>
            <div className="adm-creds-body">
              <div className="adm-cred-line">
                <span>Usuário:</span>
                <code>{adminConfig.email}</code>
              </div>
              <div className="adm-cred-line">
                <span>Senha Inicial:</span>
                <code>{adminConfig.password}</code>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm adm-creds-autofill"
              onClick={handleFillDemo}
            >
              <CheckCircle2 size={14} />
              Preencher Automaticamente
            </button>
            <p className="adm-creds-note">
              * Você pode alterar esta senha a qualquer momento dentro do painel.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="adm-login-footer">
          <Shield size={14} />
          <span>Sessão protegida por criptografia de ponta a ponta</span>
        </div>

        <style>{`
          .admin-login-modal {
            max-width: 460px;
            padding: var(--space-8);
            position: relative;
            background: var(--white);
            border-radius: var(--radius-2xl);
          }
          .modal-close {
            position: absolute;
            top: var(--space-4);
            right: var(--space-4);
            width: 36px;
            height: 36px;
            border-radius: var(--radius-full);
            background: var(--dark-100);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--dark-600);
            transition: all var(--transition-fast);
          }
          .modal-close:hover {
            background: var(--dark-200);
            color: var(--dark-900);
          }
          .adm-login-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            margin-bottom: var(--space-6);
          }
          .adm-login-logo {
            margin-bottom: var(--space-3);
          }
          .adm-badge-security {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            background: var(--lime-glow);
            color: var(--lime-dark);
            border-radius: var(--radius-full);
            font-size: var(--text-xs);
            font-weight: 700;
            margin-bottom: var(--space-3);
          }
          .adm-login-header h2 {
            font-size: var(--text-2xl);
            color: var(--dark-900);
            margin-bottom: var(--space-2);
          }
          .adm-login-header p {
            font-size: var(--text-sm);
            color: var(--dark-500);
            line-height: 1.5;
          }
          .adm-login-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
          }
          .adm-form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .adm-form-group label {
            font-size: var(--text-sm);
            font-weight: 600;
            color: var(--dark-700);
          }
          .adm-label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .adm-forgot-btn {
            font-size: var(--text-xs);
            color: var(--lime-dark);
            font-weight: 600;
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
          }
          .adm-forgot-btn:hover {
            text-decoration: underline;
          }
          .adm-input-wrap {
            position: relative;
            display: flex;
            align-items: center;
          }
          .adm-input-icon {
            position: absolute;
            left: 14px;
            color: var(--dark-400);
            pointer-events: none;
          }
          .adm-input {
            padding-left: 44px;
            padding-right: 44px;
            font-size: var(--text-sm);
          }
          .adm-eye-btn {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            color: var(--dark-400);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
          }
          .adm-eye-btn:hover {
            color: var(--dark-800);
          }
          .adm-options-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .adm-checkbox-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: var(--text-xs);
            color: var(--dark-600);
            cursor: pointer;
          }
          .adm-checkbox-label input {
            accent-color: var(--lime-dark);
            cursor: pointer;
          }
          .adm-alert-error {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: var(--space-3);
            background: var(--red-glow);
            color: var(--red);
            border-radius: var(--radius-lg);
            font-size: var(--text-xs);
            font-weight: 600;
            animation: slideUp 0.2s ease-out;
          }
          .adm-alert-lockout {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: var(--space-3);
            background: rgba(245, 158, 11, 0.15);
            color: var(--amber-dark);
            border-radius: var(--radius-lg);
            font-size: var(--text-xs);
            font-weight: 600;
          }
          .adm-submit-btn {
            width: 100%;
            margin-top: var(--space-2);
          }
          .adm-creds-box {
            margin-top: var(--space-4);
            padding: var(--space-4);
            background: var(--dark-50);
            border: 1px dashed var(--dark-300);
            border-radius: var(--radius-xl);
            display: flex;
            flex-direction: column;
            gap: 8px;
            animation: fadeIn 0.2s ease-out;
          }
          .adm-creds-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: var(--text-xs);
            color: var(--dark-700);
          }
          .adm-creds-body {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .adm-cred-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: var(--text-xs);
            color: var(--dark-600);
          }
          .adm-cred-line code {
            background: var(--white);
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid var(--dark-200);
            font-weight: 700;
            color: var(--dark-900);
          }
          .adm-creds-autofill {
            width: 100%;
            margin-top: 4px;
            border-color: var(--lime);
            color: var(--lime-dark);
          }
          .adm-creds-note {
            font-size: 10px;
            color: var(--dark-400);
            text-align: center;
          }
          .adm-login-footer {
            margin-top: var(--space-6);
            padding-top: var(--space-4);
            border-top: 1px solid var(--dark-100);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: var(--text-xs);
            color: var(--dark-400);
          }
        `}</style>
      </div>
    </div>
  )
}
