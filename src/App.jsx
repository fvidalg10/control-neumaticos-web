import React, { useEffect, useRef, useState } from 'react'
import { getCurrentSession, getUserProfile, onAuthStateChange, signOut } from './services/authService'
import Login from './modules/auth/Login'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [checking, setChecking] = useState(true)
  const [profileError, setProfileError] = useState('')
  const profileUserIdRef = useRef(null)

  async function loadProfile(nextSession, showLoading = true) {
    if (!nextSession) {
      profileUserIdRef.current = null
      setProfile(null)
      setChecking(false)
      return
    }

    if (showLoading) setChecking(true)
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
      profileUserIdRef.current = null
      await signOut()
      setProfileError('Tu usuario se encuentra desactivado.')
      setChecking(false)
      return
    }

    profileUserIdRef.current = data.user_id
    setProfile(data)
    setChecking(false)
  }

  useEffect(() => {
    let mounted = true

    getCurrentSession().then((currentSession) => {
      if (!mounted) return
      setSession(currentSession)
      loadProfile(currentSession, true)
    })

    const unsubscribe = onAuthStateChange((nextSession, event) => {
      if (!mounted) return

      setSession(nextSession)

      if (!nextSession || event === 'SIGNED_OUT') {
        profileUserIdRef.current = null
        setProfile(null)
        setChecking(false)
        return
      }

      const sameUser = profileUserIdRef.current === nextSession.user.id

      // Supabase puede emitir SIGNED_IN o TOKEN_REFRESHED nuevamente cuando la
      // pestaña recupera el foco. Si el perfil ya está cargado, no desmontamos
      // el Dashboard ni reiniciamos su estado.
      if (sameUser && ['SIGNED_IN', 'TOKEN_REFRESHED', 'INITIAL_SESSION', 'USER_UPDATED'].includes(event)) {
        return
      }

      loadProfile(nextSession, !profileUserIdRef.current)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
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
