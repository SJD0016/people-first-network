import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase, configured } from '../lib'

export default function Login({ session }) {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  if (session) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    if (!configured) return setMessage('Add Supabase environment variables before signing in.')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    setMessage(error ? error.message : 'Check your email for a secure sign-in link.')
  }

  return <div className="auth-page">
    <form className="auth-card" onSubmit={submit}>
      <div className="brand-mark large">PF</div>
      <div className="eyebrow">Private relationship assistant</div>
      <h1>People First Network</h1>
      <p>Sign in with your email. No password is required.</p>
      <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <button className="primary-button">Email me a sign-in link</button>
      {message && <div className="notice">{message}</div>}
      {!configured && <div className="notice warning">The app is not connected to Supabase yet.</div>}
    </form>
  </div>
}
