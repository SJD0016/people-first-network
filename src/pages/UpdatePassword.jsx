import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib'

export default function UpdatePassword({ session }) {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!session) return <Navigate to="/login" replace />

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) return setError(updateError.message)
    navigate('/')
  }

  return <div className="auth-page"><form className="auth-card" onSubmit={submit}>
    <div className="brand-mark large">PF</div><div className="eyebrow">Account security</div><h1>Choose a new password</h1>
    <label>New password<input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></label>
    <button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
    {error && <div className="notice error">{error}</div>}
  </form></div>
}
