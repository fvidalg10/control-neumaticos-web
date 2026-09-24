import React, { useEffect, useState } from 'react'
import { getCurrentSession, getUserProfile, onAuthStateChange, signOut } from './services/authService'
import Login from './modules/auth/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checking, setChecking] = useState(true)
  const [profileError, setProfileError] = useState('')

  async function loadProfile(nextSession) {
    if (!nextSession) {
      setProfile(null)
      setChecking(false)
      return
    }

    setChecking(true)
    setProfileError('')

    let data
    try {
      data = await getUserProfile(nextSession.user.id)
    } catch (error) {
      setProfileError(error?.message || 'No se encontró el perfil del usuario.')
      setChecking(false)
      return
    }

    if (!data) {
      setProfileError('No se encontró el perfil del usuario.')
      setChecking(false)
      return
    }

    if (!data.active) {
      await signOut()
      setProfileError('Tu usuario se encuentra desactivado.')
      setChecking(false)
      return
    }

    setProfile(data)
    setChecking(false)
  }

  useEffect(() => {
    getCurrentSession().then((currentSession) => {
      setSession(currentSession)
      loadProfile(currentSession)
    })

    return onAuthStateChange((nextSession) => {
      setSession(nextSession)
      loadProfile(nextSession)
    })
  }, [])

  if (checking) return <div className="loading-screen">Cargando…</div>
  if (!session) return <Login />

  if (profileError) {
    return (
      <main className="login-shell">
        <section className="login-card">
          <h1>No se pudo ingresar</h1>
          <p className="message">{profileError}</p>
          <button className="primary-button" onClick={signOut}>Cerrar sesión</button>
        </section>
      </main>
    )
  }

  return <Dashboard session={session} profile={profile} />
}
