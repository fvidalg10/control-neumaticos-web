import React, { useState } from 'react'
import { signInWithIdentifier } from '../../services/authService'

export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      await signInWithIdentifier(identifier, password)
    } catch (error) {
      setMessage(error?.message || 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">CN</div>
        <p className="eyebrow">Estación automatizada</p>
        <h1>Control de Neumáticos</h1>
        <p className="muted">Ingresa con tu correo o DNI y tu contraseña.</p>

        <form onSubmit={handleLogin}>
          <label>Correo o DNI</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            placeholder="correo@empresa.com o 12345678"
          />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
            placeholder="Contraseña"
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </section>
    </main>
  )
}
