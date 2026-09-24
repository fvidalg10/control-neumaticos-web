import React, { useEffect, useMemo, useState } from 'react'
import { createEquipmentRecord, fetchEquipmentModuleData, setEquipmentActive, updateEquipmentRecord } from '../../services/equipmentService'
import './equipment.css'

const emptyEquipmentForm = {
  plate: '',
  equipment_code: '',
  description: '',
  brand: '',
  model: '',
  configuration: '',
  active: true,
}

export default function EquipmentPage({ profile }) {
  const canManage = profile?.role === 'ADMIN'
  const [equipment, setEquipment] = useState([])
  const [tireRows, setTireRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [selectedId, setSelectedId] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyEquipmentForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 40

  useEffect(() => {
    loadEquipment()
  }, [])

  async function loadEquipment() {
    setLoading(true)
    setError('')

    const { equipmentData, equipmentError, tireData, tireError } = await fetchEquipmentModuleData()

    if (equipmentError) {
      setError(equipmentError.message)
    } else {
      const rows = equipmentData || []
      setEquipment(rows)
      if (!selectedId && rows.length) {
        const firstReal = rows.find((item) => item.plate !== 'DEMO-001') || rows[0]
        setSelectedId(firstReal.equipment_id)
      }
    }

    if (tireError) {
      console.warn('No se pudo cargar estado de neumáticos:', tireError.message)
      setTireRows([])
    } else {
      setTireRows(tireData || [])
    }

    setLoading(false)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return equipment.filter((item) => {
      const statusOk = statusFilter === 'ALL'
        || (statusFilter === 'ACTIVE' && item.active)
        || (statusFilter === 'INACTIVE' && !item.active)

      if (!statusOk) return false
      if (!term) return true

      const haystack = [
        item.plate,
        item.equipment_code,
        item.description,
        item.brand,
        item.model,
        item.configuration,
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(term)
    })
  }, [equipment, search, statusFilter])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visibleRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const selected = equipment.find((item) => item.equipment_id === selectedId) || null
  const currentTires = selected ? tireRows.filter((row) => row.plate === selected.plate) : []
  const alertCount = currentTires.filter(
    (r) => r.remaining_depth_mm != null && Number(r.remaining_depth_mm) <= 7,
  ).length

  function updateCreate(field, value) {
    setCreateForm((prev) => ({ ...prev, [field]: value }))
  }

  async function createEquipment(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        plate: createForm.plate.trim().toUpperCase(),
        equipment_code: createForm.equipment_code.trim() || null,
        description: createForm.description.trim() || null,
        brand: createForm.brand.trim() || null,
        model: createForm.model.trim() || null,
        configuration: createForm.configuration.trim() || null,
        active: true,
      }

      const data = await createEquipmentRecord(payload)

      setShowCreate(false)
      setCreateForm(emptyEquipmentForm)
      setMessage('Equipo creado correctamente.')
      await loadEquipment()
      if (data?.equipment_id) setSelectedId(data.equipment_id)
    } catch (err) {
      setError(err.message || 'No se pudo crear el equipo.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(item) {
    setEditing({
      equipment_id: item.equipment_id,
      plate: item.plate || '',
      equipment_code: item.equipment_code || '',
      description: item.description || '',
      brand: item.brand || '',
      model: item.model || '',
      configuration: item.configuration || '',
      active: item.active,
    })
    setShowCreate(false)
    setError('')
    setMessage('')
  }

  async function saveEquipment(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        plate: editing.plate.trim().toUpperCase(),
        equipment_code: editing.equipment_code.trim() || null,
        description: editing.description.trim() || null,
        brand: editing.brand.trim() || null,
        model: editing.model.trim() || null,
        configuration: editing.configuration.trim() || null,
      }

      await updateEquipmentRecord(editing.equipment_id, payload)

      setEditing(null)
      setMessage('Equipo actualizado correctamente.')
      await loadEquipment()
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el equipo.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleEquipment(item) {
    const next = !item.active
    const action = next ? 'activar' : 'desactivar'
    if (!window.confirm(`¿Confirmas ${action} el equipo ${item.plate}?`)) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await setEquipmentActive(item.equipment_id, next)
      setMessage(`Equipo ${next ? 'activado' : 'desactivado'} correctamente.`)
      await loadEquipment()
    } catch (err) {
      setError(err.message || 'No se pudo cambiar el estado del equipo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="equipment-module">
      <div className="module-heading">
        <div>
          <p className="eyebrow">Maestro de flota</p>
          <h2>Equipos</h2>
          <p className="muted">Busca una unidad, revisa su ficha técnica y consulta su asignación actual.</p>
        </div>
        {canManage && (
          <button
            className="primary-button"
            onClick={() => {
              setShowCreate((value) => !value)
              setEditing(null)
              setMessage('')
              setError('')
            }}
          >
            {showCreate ? 'Cancelar' : '+ Nuevo equipo'}
          </button>
        )}
      </div>

      {message && <div className="notice success-notice">{message}</div>}
      {error && <div className="notice error-notice">{error}</div>}

      <section className="panel fleet-panel equipment-search-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Consulta</p>
            <h3>Buscar equipos</h3>
          </div>
        </div>

        <div className="fleet-filters">
          <div className="fleet-search">
            <label>Buscar equipo</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Placa, descripción, marca o modelo"
            />
          </div>
          <div>
            <label>Estado</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
              <option value="ALL">Todos</option>
            </select>
          </div>
          <button className="secondary-button fleet-refresh" onClick={loadEquipment} disabled={loading}>Actualizar</button>
        </div>

        <div className="fleet-count"><strong>{filtered.length}</strong> equipo{filtered.length === 1 ? '' : 's'} encontrados</div>

        {loading ? <p className="muted">Cargando equipos…</p> : (
          <div className="table-wrap fleet-table-wrap">
            <table className="users-table fleet-table">
              <thead><tr><th>Placa / serie</th><th>Descripción</th><th>Marca / modelo</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {visibleRows.map((item) => (
                  <tr key={item.equipment_id} className={selectedId === item.equipment_id ? 'selected-row' : ''}>
                    <td><strong>{item.plate}</strong><span>{item.equipment_code || 'Sin código'}</span></td>
                    <td>{item.description || '—'}</td>
                    <td><strong>{item.brand || '—'}</strong><span>{item.model || '—'}</span></td>
                    <td><span className={`state-pill ${item.active ? 'state-active' : 'state-inactive'}`}>{item.active ? 'ACTIVO' : 'INACTIVO'}</span></td>
                    <td><button className="table-open" onClick={() => setSelectedId(item.equipment_id)}>Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination-bar">
          <button className="secondary-button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button className="secondary-button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</button>
        </div>
      </section>

      {showCreate && canManage && (
        <section className="panel equipment-form-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Nuevo registro</p><h3>Crear equipo</h3></div>
          </div>
          <form onSubmit={createEquipment} className="equipment-form-grid">
            <div><label>Placa / serie</label><input value={createForm.plate} onChange={(e) => updateCreate('plate', e.target.value.toUpperCase())} required placeholder="ABC-123" /></div>
            <div><label>Código de equipo</label><input value={createForm.equipment_code} onChange={(e) => updateCreate('equipment_code', e.target.value)} placeholder="Opcional" /></div>
            <div className="span-2"><label>Descripción</label><input value={createForm.description} onChange={(e) => updateCreate('description', e.target.value.toUpperCase())} placeholder="VOLQUETE / CAMIÓN / CARGADOR..." /></div>
            <div><label>Marca</label><input value={createForm.brand} onChange={(e) => updateCreate('brand', e.target.value.toUpperCase())} /></div>
            <div><label>Modelo</label><input value={createForm.model} onChange={(e) => updateCreate('model', e.target.value.toUpperCase())} /></div>
            <div><label>Configuración</label><input value={createForm.configuration} onChange={(e) => updateCreate('configuration', e.target.value.toUpperCase())} placeholder="6X4" /></div>
            <div className="form-actions span-all"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear equipo'}</button></div>
          </form>
        </section>
      )}

      {editing && canManage && (
        <section className="panel equipment-form-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Edición</p><h3>{editing.plate}</h3></div>
            <button className="secondary-button" onClick={() => setEditing(null)}>Cerrar</button>
          </div>
          <form onSubmit={saveEquipment} className="equipment-form-grid">
            <div><label>Placa / serie</label><input value={editing.plate} onChange={(e) => setEditing({ ...editing, plate: e.target.value.toUpperCase() })} required /></div>
            <div><label>Código de equipo</label><input value={editing.equipment_code} onChange={(e) => setEditing({ ...editing, equipment_code: e.target.value })} /></div>
            <div className="span-2"><label>Descripción</label><input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value.toUpperCase() })} /></div>
            <div><label>Marca</label><input value={editing.brand} onChange={(e) => setEditing({ ...editing, brand: e.target.value.toUpperCase() })} /></div>
            <div><label>Modelo</label><input value={editing.model} onChange={(e) => setEditing({ ...editing, model: e.target.value.toUpperCase() })} /></div>
            <div><label>Configuración</label><input value={editing.configuration} onChange={(e) => setEditing({ ...editing, configuration: e.target.value.toUpperCase() })} /></div>
            <div className="form-actions span-all"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
          </form>
        </section>
      )}

      <section className="panel equipment-detail-panel equipment-technical-panel">
        {selected ? (
          <>
            <div className="equipment-detail-head">
              <div><p className="eyebrow">Ficha técnica del equipo</p><h2>{selected.plate}</h2><p>{selected.description || 'Sin descripción'}</p></div>
              <span className={`state-pill ${selected.active ? 'state-active' : 'state-inactive'}`}>{selected.active ? 'ACTIVO' : 'INACTIVO'}</span>
            </div>

            <dl className="equipment-detail-list">
              <div><dt>Código</dt><dd>{selected.equipment_code || '—'}</dd></div>
              <div><dt>Marca</dt><dd>{selected.brand || '—'}</dd></div>
              <div><dt>Modelo</dt><dd>{selected.model || '—'}</dd></div>
              <div><dt>Configuración</dt><dd>{selected.configuration || '—'}</dd></div>
              <div><dt>Neumáticos asignados</dt><dd>{currentTires.length}/10</dd></div>
              <div><dt>Alertas ≤ 7 mm</dt><dd>{alertCount}</dd></div>
            </dl>

            {canManage && (
              <div className="detail-actions">
                <button className="primary-button" onClick={() => startEdit(selected)}>Editar</button>
                <button className={selected.active ? 'danger-button' : 'secondary-button'} onClick={() => toggleEquipment(selected)} disabled={saving}>{selected.active ? 'Desactivar' : 'Activar'}</button>
              </div>
            )}
          </>
        ) : <p className="muted">Selecciona un equipo para ver su ficha técnica.</p>}
      </section>

      <section className="panel equipment-assignment-panel">
        <div className="section-title compact-section-title">
          <div><p className="eyebrow">Asignación actual</p><h3>Neumáticos</h3></div>
        </div>

        {!selected ? (
          <p className="muted">Selecciona un equipo para consultar su asignación actual.</p>
        ) : currentTires.length ? (
          <div className="mini-tire-list">
            {currentTires.map((item) => (
              <div key={`${item.plate}-${item.position}`} className="mini-tire-row">
                <strong>POS{item.position}</strong>
                <span>{item.tire_code || 'Sin código'}</span>
                <b>{item.remaining_depth_mm == null ? '—' : `${Number(item.remaining_depth_mm).toFixed(2)} mm`}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Este equipo todavía no tiene neumáticos asignados en la plataforma.</p>
        )}
      </section>
    </section>
  )
}
