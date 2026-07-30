import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib'

const modes = {
  signin: { eyebrow: 'Welcome back', title: 'Sign in', button: 'Sign in' },
  signup: { eyebrow: 'Create your private network', title: 'Create account', button: 'Create account' },
  reset: { eyebrow: 'Account recovery', title: 'Reset password', button: 'Send reset email' },
}

export default function Login({ session }) {
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />
  const copy = modes[mode]

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
      } else if (mode === 'signup') {
        if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim() || email.split('@')[0] },
          },
        })
        if (authError) throw authError
        setMessage(data.session ? 'Account created. You are signed in.' : 'Check your email to confirm your account, then sign in.')
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`,
        })
        if (authError) throw authError
        setMessage('Check your email for the password reset link.')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark large">PF</div>
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p>Your contacts and relationship history stay private to your account.</p>

        {mode === 'signup' && <label>Your name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" required /></label>}
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /></label>
        {mode !== 'reset' && <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required /></label>}

        <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : copy.button}</button>
        {message && <div className="notice success">{message}</div>}
        {error && <div className="notice error">{error}</div>}

        <div className="auth-links">
          {mode !== 'signin' && <button type="button" onClick={() => { setMode('signin'); setError(''); setMessage('') }}>Sign in</button>}
          {mode !== 'signup' && <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create account</button>}
          {mode !== 'reset' && <button type="button" onClick={() => { setMode('reset'); setError(''); setMessage('') }}>Forgot password?</button>}
        </div>
      </form>
    </div>
  )
}
