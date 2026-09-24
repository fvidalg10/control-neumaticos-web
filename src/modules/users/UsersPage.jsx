import React, { useEffect, useState } from 'react'
import { adminUserAction } from '../../services/userService'
import './users.css'

const emptyUserForm = {
  dni: '',
  full_name: '',
  email: '',
  role: 'TECNICO',
  password: '',
  confirmPassword: '',
}

export default function UsersPage({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyUserForm)
  const [editing, setEditing] = useState(null)
  const [passwordUser, setPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const data = await adminUserAction({ action: 'list' })
      setUsers(data?.users || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function updateCreate(field, value) {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  async function createUser(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!/^\d{8}$/.test(createForm.dni.trim())) {
      setError('El DNI debe tener 8 dígitos.')
      return
    }
    if (createForm.password.length < 8) {
      setError('La contraseña inicial debe tener al menos 8 caracteres.')
      return
    }
    if (createForm.password !== createForm.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    try {
      await adminUserAction({
        action: 'create',
        dni: createForm.dni.trim(),
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim().toLowerCase(),
        role: createForm.role,
        password: createForm.password,
      })
      setCreateForm(emptyUserForm)
      setShowCreate(false)
      setMessage('Usuario creado correctamente.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(user) {
    setEditing({
      user_id: user.user_id,
      dni: user.dni || '',
      full_name: user.full_name || '',
      email: user.email,
      role: user.role,
    })
    setPasswordUser(null)
    setMessage('')
    setError('')
  }

  async function saveEdit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      await adminUserAction({
        action: 'update',
        user_id: editing.user_id,
        dni: editing.dni.trim(),
        full_name: editing.full_name.trim(),
        role: editing.role,
      })
      setEditing(null)
      setMessage('Datos del usuario actualizados.')
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleUser(user) {
    const nextActive = !user.active
    const text = nextActive ? 'activar' : 'desactivar'
    if (!window.confirm(`¿Confirmas ${text} a ${user.full_name || user.email}?`)) return

    setSaving(true)
    setMessage('')
    setError('')
    try {
      await adminUserAction({
        action: 'toggle_active',
        user_id: user.user_id,
        active: nextActive,
      })
      setMessage(`Usuario ${nextActive ? 'activado' : 'desactivado'} correctamente.`)
      await loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function setUserPassword(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSaving(true)
    try {
      await adminUserAction({
        action: 'set_password',
        user_id: passwordUser.user_id,
        password: newPassword,
      })
      setNewPassword('')
      setConfirmPassword('')
      setPasswordUser(null)
      setMessage('Contraseña actualizada correctamente.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="users-module">
      <div className="module-heading">
        <div>
          <p className="eyebrow">Administración</p>
          <h2>Usuarios</h2>
          <p className="muted">Crea usuarios, asigna roles y controla su acceso a la plataforma.</p>
        </div>
        <button className="primary-button" onClick={() => { setShowCreate((v) => !v); setEditing(null); setPasswordUser(null) }}>
          {showCreate ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </div>

      {message && <div className="notice success-notice">{message}</div>}
      {error && <div className="notice error-notice">{error}</div>}

      {showCreate && (
        <section className="panel user-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Nuevo registro</p>
              <h3>Crear usuario</h3>
            </div>
          </div>
          <form onSubmit={createUser} className="user-form-grid">
            <div>
              <label>DNI</label>
              <input value={createForm.dni} onChange={(e) => updateCreate('dni', e.target.value.replace(/\D/g, '').slice(0, 8))} required inputMode="numeric" placeholder="12345678" />
            </div>
            <div className="span-2">
              <label>Nombre completo</label>
              <input value={createForm.full_name} onChange={(e) => updateCreate('full_name', e.target.value)} required placeholder="Nombres y apellidos" />
            </div>
            <div className="span-2">
              <label>Correo</label>
              <input type="email" value={createForm.email} onChange={(e) => updateCreate('email', e.target.value)} required placeholder="usuario@empresa.com" />
            </div>
            <div>
              <label>Rol</label>
              <select value={createForm.role} onChange={(e) => updateCreate('role', e.target.value)}>
                <option value="TECNICO">TECNICO</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label>Contraseña inicial</label>
              <input type="password" minLength={8} value={createForm.password} onChange={(e) => updateCreate('password', e.target.value)} required autoComplete="new-password" />
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <input type="password" minLength={8} value={createForm.confirmPassword} onChange={(e) => updateCreate('confirmPassword', e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="form-actions span-all">
              <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Creando…' : 'Crear usuario'}</button>
            </div>
          </form>
        </section>
      )}

      {editing && (
        <section className="panel user-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Edición</p>
              <h3>{editing.full_name || editing.email}</h3>
              <p className="muted form-help">El correo se mantiene fijo en esta versión.</p>
            </div>
            <button className="secondary-button" onClick={() => setEditing(null)}>Cerrar</button>
          </div>
          <form onSubmit={saveEdit} className="user-form-grid">
            <div>
              <label>DNI</label>
              <input value={editing.dni} onChange={(e) => setEditing({ ...editing, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })} required inputMode="numeric" />
            </div>
            <div className="span-2">
              <label>Nombre completo</label>
              <input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} required />
            </div>
            <div className="span-2">
              <label>Correo</label>
              <input value={editing.email} disabled />
            </div>
            <div>
              <label>Rol</label>
              <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                <option value="TECNICO">TECNICO</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="form-actions span-all">
              <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </form>
        </section>
      )}

      {passwordUser && (
        <section className="panel user-form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Seguridad</p>
              <h3>Cambiar contraseña</h3>
              <p className="muted form-help">{passwordUser.full_name || passwordUser.email}</p>
            </div>
            <button className="secondary-button" onClick={() => setPasswordUser(null)}>Cerrar</button>
          </div>
          <form onSubmit={setUserPassword} className="user-form-grid password-form-grid">
            <div>
              <label>Nueva contraseña</label>
              <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div>
              <label>Confirmar contraseña</label>
              <input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="form-actions span-all">
              <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Guardando…' : 'Actualizar contraseña'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="panel user-list-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Accesos registrados</p>
            <h3>{users.length} usuario{users.length === 1 ? '' : 's'}</h3>
          </div>
          <button className="secondary-button" onClick={loadUsers} disabled={loading}>Actualizar</button>
        </div>

        {loading ? (
          <p className="muted">Cargando usuarios…</p>
        ) : (
          <div className="table-wrap">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>DNI</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td>
                      <strong>{user.full_name || 'Sin nombre'}</strong>
                      <span>{user.email}</span>
                    </td>
                    <td>{user.dni || '—'}</td>
                    <td><span className={`role-pill role-${user.role.toLowerCase()}`}>{user.role}</span></td>
                    <td><span className={`state-pill ${user.active ? 'state-active' : 'state-inactive'}`}>{user.active ? 'ACTIVO' : 'INACTIVO'}</span></td>
                    <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('es-PE') : '—'}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => startEdit(user)}>Editar</button>
                        <button onClick={() => { setPasswordUser(user); setEditing(null); setShowCreate(false); setNewPassword(''); setConfirmPassword('') }}>Contraseña</button>
                        <button
                          className={user.active ? 'danger-link' : 'activate-link'}
                          onClick={() => toggleUser(user)}
                          disabled={saving || (user.user_id === currentUserId && user.active)}
                          title={user.user_id === currentUserId && user.active ? 'No puedes desactivar tu propia cuenta' : ''}
                        >
                          {user.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}
