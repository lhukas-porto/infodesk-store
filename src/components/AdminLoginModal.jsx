import React, { useState, useEffect } from 'react'
import {
  X, Shield, Lock, Mail, Eye, EyeOff, AlertCircle,
  CheckCircle2, KeyRound, Info, ArrowRight
} from 'lucide-react'
import { useStore } from '../context/StoreContext'
import InfodeskLogo from '../assets/brand/InfodeskLogo'
import { getCompanyPublicName } from '../services/companyService'

export default function AdminLoginModal() {
  const { showAdminLogin, setShowAdminLogin, loginAdmin, adminConfig, companyData } = useStore()
  const publicName = getCompanyPublicName(companyData)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTimer, setLockoutTimer] = useState(0)
  
  // Estado para alternar entre Login e Esqueci a Senha
  const [viewMode, setViewMode] = useState('login') // 'login' | 'forgot'
  const [forgotEmail, setForgotEmail] = useState('')
  const [isSendingForgot, setIsSendingForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState('')
  const [forgotError, setForgotError] = useState('')

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
      setForgotError('')
      setForgotSent(false)
      if (!email) setEmail(adminConfig.email)
      if (!forgotEmail) setForgotEmail(adminConfig.email)
    }
  }, [showAdminLogin, adminConfig.email])

  // Suporte a fechar modal com tecla ESC
  useEffect(() => {
    if (!showAdminLogin) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAdminLogin(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAdminLogin, setShowAdminLogin])

  if (!showAdminLogin) return null

  const handleSubmit = async (e) => {
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

    try {
      const result = await loginAdmin(email, password, rememberMe)
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
    } catch (err) {
      setIsLoading(false)
      setError('Erro ao processar autenticação de administrador.')
    }
  }

  const handleForgotSubmit = async (e) => {
    e?.preventDefault()
    setForgotError('')
    if (!forgotEmail.trim()) {
      setForgotError('Informe o e-mail de administrador para recuperação.')
      return
    }

    setIsSendingForgot(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), type: 'admin' })
      })
      const data = await res.json()
      setIsSendingForgot(false)

      if (res.ok && data.success) {
        setForgotSent(true)
        setForgotSuccessMsg(data.message || 'Link de recuperação enviado com sucesso!')
      } else {
        setForgotError(data.error || 'Não foi possível enviar o link de recuperação.')
      }
    } catch (err) {
      setIsSendingForgot(false)
      setForgotError('Falha ao conectar com o serviço de recuperação. Tente novamente.')
    }
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
            {companyData?.logo ? (
              <img
                src={companyData.logo}
                alt={companyData.logoAlt || publicName}
                style={{ maxHeight: 48, maxWidth: 200, objectFit: 'contain' }}
              />
            ) : publicName && publicName !== 'Infodesk Store' ? (
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--lime-dark)' }}>
                {publicName}
              </h2>
            ) : (
              <InfodeskLogo size={140} />
            )}
          </div>
          <div className="adm-badge-security">
            <Shield size={14} />
            <span>Acesso Restrito · Painel de Gestão</span>
          </div>
          <h2>{viewMode === 'login' ? 'Área do Administrador' : 'Recuperar Senha de Acesso'}</h2>
          <p>
            {viewMode === 'login'
              ? 'Autentique-se com suas credenciais seguras para gerenciar o catálogo, estoque e pedidos.'
              : 'Informe o e-mail de administrador cadastrado. Enviaremos um link de uso único para você redefinir sua senha com segurança.'}
          </p>
        </div>

        {/* VIEW 1: LOGIN */}
        {viewMode === 'login' ? (
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
                  placeholder="ex: admin@suaempresa.com.br"
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
                  onClick={() => {
                    setViewMode('forgot')
                    setForgotSent(false)
                    setForgotError('')
                    if (!forgotEmail && email) setForgotEmail(email)
                  }}
                >
                  Esqueceu a senha?
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
        ) : (
          /* VIEW 2: FORGOT PASSWORD */
          <div className="adm-forgot-view">
            {forgotSent ? (
              <div className="adm-forgot-success-box">
                <div className="adm-forgot-icon-wrap">
                  <CheckCircle2 size={36} color="var(--primary-color, #10b981)" />
                </div>
                <h3>E-mail de Recuperação Enviado!</h3>
                <p>
                  Enviamos o link de redefinição para <strong>{forgotEmail}</strong>.
                  Verifique sua caixa de entrada e spam nos próximos minutos.
                </p>
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                    onClick={() => {
                      setViewMode('login')
                      setForgotSent(false)
                    }}
                  >
                    Voltar para o Login
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--dark-500)' }}
                    onClick={() => setForgotSent(false)}
                  >
                    Tentar outro e-mail
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="adm-login-form">
                {forgotError && (
                  <div className="adm-alert-error">
                    <AlertCircle size={18} />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="adm-form-group">
                  <label htmlFor="admin-forgot-email">E-mail Cadastrado do Administrador</label>
                  <div className="input-wrap">
                    <Mail size={18} className="input-icon-left" />
                    <input
                      id="admin-forgot-email"
                      type="email"
                      className="input-field has-icon-left"
                      placeholder="admin@suaempresa.com.br"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); setForgotError('') }}
                      disabled={isSendingForgot}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg adm-submit-btn"
                  disabled={isSendingForgot}
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  {isSendingForgot ? (
                    <>
                      <div className="spinner" style={{ width: 18, height: 18 }} />
                      <span>Enviando link por e-mail...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      <span>Enviar Link de Recuperação</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
                  <button
                    type="button"
                    className="cust-link-btn"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--dark-600)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                    onClick={() => {
                      setViewMode('login')
                      setForgotError('')
                    }}
                  >
                    ← Voltar para o Login
                  </button>
                </div>
              </form>
            )}
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
          .adm-forgot-view {
            animation: fadeIn 0.2s ease-out;
          }
          .adm-forgot-success-box {
            text-align: center;
            padding: var(--space-6) var(--space-4);
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: var(--radius-xl);
            animation: fadeIn 0.3s ease-out;
          }
          .adm-forgot-icon-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 60px;
            height: 60px;
            border-radius: var(--radius-full);
            background: rgba(16, 185, 129, 0.15);
            margin-bottom: var(--space-3);
          }
          .adm-forgot-success-box h3 {
            font-size: var(--text-lg);
            font-weight: 700;
            color: var(--dark-900);
            margin-bottom: var(--space-2);
          }
          .adm-forgot-success-box p {
            font-size: var(--text-sm);
            color: var(--dark-600);
            line-height: 1.5;
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
