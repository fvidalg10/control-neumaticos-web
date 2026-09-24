import React, { useState } from 'react'
import { signOut } from '../services/authService'
import AlertsPage from '../modules/alerts/AlertsPage'
import EquipmentPage from '../modules/equipment/EquipmentPage'
import TiresPage from '../modules/tires/TiresPage'
import AssignmentPage from '../modules/assignments/AssignmentPage'
import HistoryPage from '../modules/history/HistoryPage'
import UsersPage from '../modules/users/UsersPage'

export default function Dashboard({ session, profile }) {
  const [view, setView] = useState('alerts')
  const [historyTarget, setHistoryTarget] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const titles = {
    alerts: 'Alertas de neumáticos',
    equipment: 'Estado actual del equipo',
    tires: 'Control de neumáticos',
    assignments: 'Asignación de neumáticos',
    history: 'Historial de neumáticos',
    users: 'Administración de usuarios',
  }

  function goTo(nextView) {
    setView(nextView)
    setMobileMenuOpen(false)
  }

  function openHistory(tireCode) {
    setHistoryTarget(tireCode)
    setView('history')
    setMobileMenuOpen(false)
  }

  function openHistoryMenu() {
    setHistoryTarget(null)
    setView('history')
    setMobileMenuOpen(false)
  }

  return (
    <main className="app-shell">
      <button
        type="button"
        className={`mobile-menu-backdrop ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-label="Cerrar menú"
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div>
          <div className="sidebar-identity">
            <div className="company-logo-circle">
              <img src="/logo-empresa.svg" alt="Logo de la empresa" />
            </div>
            <div className="sidebar-brand">CONTROL<br />NEUMÁTICOS</div>
          </div>

          <nav>
            <button
              className={view === 'alerts' ? 'nav-active' : ''}
              onClick={() => goTo('alerts')}
            >
              Alertas
            </button>

            <button
              className={view === 'equipment' ? 'nav-active' : ''}
              onClick={() => goTo('equipment')}
            >
              Equipos
            </button>

            <button
              className={view === 'tires' ? 'nav-active' : ''}
              onClick={() => goTo('tires')}
            >
              Neumáticos
            </button>

            <button
              className={view === 'assignments' ? 'nav-active' : ''}
              onClick={() => goTo('assignments')}
            >
              Asignaciones
            </button>

            <button
              className={view === 'history' ? 'nav-active' : ''}
              onClick={openHistoryMenu}
            >
              Historial
            </button>

            {profile?.role === 'ADMIN' && (
              <button
                className={view === 'users' ? 'nav-active' : ''}
                onClick={() => goTo('users')}
              >
                Usuarios
              </button>
            )}
          </nav>
        </div>

        <div className="sidebar-footer">
          <button className="logout" onClick={signOut}>Cerrar sesión</button>
          <div className="creator-credit">By Franklin Vidal</div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="topbar-title-group">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={mobileMenuOpen}
            >
              <span aria-hidden="true">☰</span>
              <span>Menú</span>
            </button>

            <h1>{titles[view] || 'Control de Neumáticos'}</h1>
          </div>

          <div className="user-area">
            <span className="role-chip">{profile?.role || '—'}</span>
            <span className="user-chip">{profile?.full_name || session.user.email}</span>
          </div>
        </header>

        {view === 'alerts' && <AlertsPage onOpenHistory={openHistory} />}
        {view === 'equipment' && <EquipmentPage profile={profile} />}
        {view === 'tires' && <TiresPage profile={profile} />}
        {view === 'assignments' && <AssignmentPage profile={profile} />}
        {view === 'history' && (
          <HistoryPage profile={profile} initialTireCode={historyTarget} />
        )}
        {view === 'users' && profile?.role === 'ADMIN' && (
          <UsersPage currentUserId={session.user.id} />
        )}
      </section>
    </main>
  )
}
