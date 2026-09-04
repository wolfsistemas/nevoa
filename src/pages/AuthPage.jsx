import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { signInWithLogin, signUpWithUsername } from '../lib/store'

export default function AuthPage() {
  const nav = useNavigate()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('m') === 'signup' ? 'signup' : 'login')

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (user) nav('/', { replace: true })
  }, [user, nav])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await signInWithLogin(email.trim(), password)
        nav('/', { replace: true })
      } else {
        if (password.length < 6) throw new Error('A senha precisa de pelo menos 6 caracteres.')
        if (!/^[a-z0-9_.]{2,20}$/i.test(username.trim())) {
          throw new Error('Use 2 a 20 caracteres: letras, números, ponto ou underline.')
        }
        const res = await signUpWithUsername(email.trim(), password, username.trim())
        if (res?.user && !res.session) {
          setNotice('Conta criada! Confirme o link enviado para o seu e-mail para entrar.')
          setMode('login')
        } else {
          nav('/', { replace: true })
        }
      }
    } catch (err) {
      setError(err?.message || 'Algo deu errado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page center-page auth-page">
      <div className="auth-card">
        <div className="home-logo center-logo">
          <span className="logo-dot" />
          <h1>Névoa Cifras</h1>
        </div>
        <p className="muted">Acesse para criar listas e favoritar cifras.</p>

        <div className="seg auth-tabs">
          <button className={mode === 'login' ? 'seg-btn on' : 'seg-btn'} onClick={() => { setMode('login'); setError('') }}>
            Entrar
          </button>
          <button className={mode === 'signup' ? 'seg-btn on' : 'seg-btn'} onClick={() => { setMode('signup'); setError('') }}>
            Criar conta
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          {mode === 'signup' && (
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nome de usuário"
              autoComplete="username"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type={mode === 'login' ? 'text' : 'email'}
            placeholder={mode === 'login' ? 'E-mail ou nome de usuário' : 'Seu e-mail'}
            autoComplete="username"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Senha"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="muted small center">Email e senha por enquanto. Login com Google vem depois.</p>
      </div>
    </div>
  )
}
