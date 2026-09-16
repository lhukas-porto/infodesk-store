import React, { useState, useEffect } from 'react'
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, X, ArrowRight, ShieldCheck } from 'lucide-react'
import { useStore } from '../context/StoreContext'

export default function PasswordResetModal() {
  const { showToast, loginAdmin, loginCustomer } = useStore()
  const [isOpen, setIsOpen] = useState(false)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState('customer') // 'admin' | 'customer'
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // Monitora a hash #redefinir-senha na URL
  useEffect(() => {
    function checkHashRoute() {
      const hash = window.location.hash || ''
      if (hash.includes('redefinir-senha')) {
        const queryString = hash.includes('?') ? hash.split('?')[1] : window.location.search.replace('?', '')
        const params = new URLSearchParams(queryString)
        const t = params.get('token') || ''
        const e = params.get('email') || ''
        const tp = params.get('type') || 'customer'

        if (t) {
          setToken(t)
          setEmail(e)
          setType(tp)
          setIsOpen(true)
          setError('')
          setIsSuccess(false)
        }
      }
    }

    checkHashRoute()
    window.addEventListener('hashchange', checkHashRoute)
    return () => window.removeEventListener('hashchange', checkHashRoute)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    window.location.hash = ''
  }

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem. Verifique e tente novamente.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
          email,
          type
        })
      })

      const data = await res.json()
      setIsLoading(false)

      if (!res.ok || !data.success) {
        setError(data.error || 'Falha ao redefinir a senha. O link pode ter expirado.')
        return
      }

      setIsSuccess(true)
      showToast('Senha atualizada com sucesso! 🔐✨')

      // Login automático e redirecionamento
      setTimeout(async () => {
        handleClose()
        if (type === 'admin') {
          await loginAdmin(email, newPassword)
        } else {
          await loginCustomer(email, newPassword)
        }
      }, 1500)
    } catch (err) {
      setIsLoading(false)
      setError('Erro de conexão ao redefinir a senha. Tente novamente.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '440px', padding: 'var(--space-8)' }}>
        <button
          className="modal-close"
          onClick={handleClose}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div style={{
            width: '56px',
            height: '56px',
            margin: '0 auto var(--space-3)',
            borderRadius: '50%',
            background: 'var(--lime-glow)',
            color: 'var(--lime-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <KeyRound size={28} />
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', margin: '0 0 var(--space-2)' }}>
            Criar Nova Senha
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-500)', margin: 0 }}>
            {email ? `Defina uma nova senha de acesso para ${email}` : 'Defina sua nova senha de acesso.'}
          </p>
        </div>

        {isSuccess ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-6)',
            background: 'rgba(132, 204, 22, 0.1)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid rgba(132, 204, 22, 0.3)'
          }}>
            <CheckCircle2 size={42} style={{ color: 'var(--lime-dark)', margin: '0 auto var(--space-3)' }} />
            <h3 style={{ margin: '0 0 var(--space-2)', color: 'var(--dark-900)' }}>Senha Alterada!</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--dark-600)', margin: 0 }}>
              Sua nova senha foi gravada com sucesso. Entrando na sua conta...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: 'var(--space-3)',
                background: 'var(--red-glow)',
                color: 'var(--red)',
                borderRadius: 'var(--radius-lg)',
                fontSize: 'var(--text-xs)',
                fontWeight: 600
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--dark-700)' }}>
                Nova Senha *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--dark-400)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--dark-400)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--dark-700)' }}>
                Confirmar Nova Senha *
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: '14px', color: 'var(--dark-400)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingLeft: '44px', paddingRight: '44px' }}
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isLoading}
              style={{ marginTop: 'var(--space-2)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <ShieldCheck size={18} /> Salvar Nova Senha
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
