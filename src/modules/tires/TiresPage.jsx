import React, { useEffect, useMemo, useState } from 'react'
import {
  advanceTireLifecycle,
  createTire,
  getTiresOverview,
  updateTire,
} from '../../services/tireService.js'
import './tires.css'

const EMPTY_FORM = {
  code: '',
  dot: '',
  size: '',
  brand: '',
  model: '',
  project: '',
  tire_type: '',
  location_state: '',
  status: 'STOCK',
  active: true,
  cycle_type: 'O',
  started_at: '',
  initial_depth_mm: '',
}

const STATUS_LABELS = {
  STOCK: 'STOCK',
  INSTALLED: 'INSTALADO',
  REPAIR: 'REPARACIÓN',
  REMOVED: 'RETIRADO',
  SCRAP: 'SCRAP',
}

function cycleLabel(value) {
  if (!value) return '—'
  if (value === 'O') return 'O · ORIGINAL'
  if (value.startsWith('R')) {
    const n = value.slice(1)
    return `${value} · REENCAUCHE ${n}`
  }
  return value
}

function textOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function normalizeForm(row) {
  return {
    code: row.code ?? '',
    dot: row.dot ?? '',
    size: row.size ?? '',
    brand: row.brand ?? '',
    model: row.model ?? '',
    project: row.project ?? '',
    tire_type: row.tire_type ?? '',
    location_state: row.location_state ?? '',
    status: row.status ?? 'STOCK',
    active: row.active ?? true,
    cycle_type: row.cycle_type ?? 'O',
    started_at: '',
    initial_depth_mm: '',
  }
}

export default function TiresPage({ profile }) {
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('TODOS')
  const [cycleFilter, setCycleFilter] = useState('TODOS')
  const [typeFilter, setTypeFilter] = useState('TODOS')
  const [locationFilter, setLocationFilter] = useState('TODOS')
  const [editMode, setEditMode] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [cycleMode, setCycleMode] = useState(false)
  const [cycleForm, setCycleForm] = useState({
    started_at: '',
    final_depth_mm: '',
    new_initial_depth_mm: '',
  })

  const isAdmin = profile?.role === 'ADMIN'

  async function load() {
    try {
      setLoading(true)
      setError('')
      const data = await getTiresOverview()
      setRows(data)
      setSelectedId((current) => {
        if (current && data.some((row) => row.tire_id === current)) return current
        return data[0]?.tire_id ?? null
      })
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los neumáticos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selected = useMemo(
    () => rows.find((row) => row.tire_id === selectedId) ?? null,
    [rows, selectedId],
  )

  const projects = useMemo(
    () => [...new Set(rows.map((row) => row.project).filter(Boolean))].sort(),
    [rows],
  )

  const types = useMemo(
    () => [...new Set(rows.map((row) => row.tire_type).filter(Boolean))].sort(),
    [rows],
  )

  const locations = useMemo(
    () => [...new Set(rows.map((row) => row.location_state).filter(Boolean))].sort(),
    [rows],
  )

  const cycles = useMemo(
    () => [...new Set(rows.map((row) => row.cycle_type).filter(Boolean))].sort(),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const q = query.trim().toUpperCase()

    return rows.filter((row) => {
      const searchText = [
        row.code,
        row.dot,
        row.size,
        row.brand,
        row.model,
        row.project,
        row.plate,
      ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()

      if (q && !searchText.includes(q)) return false
      if (projectFilter !== 'TODOS' && row.project !== projectFilter) return false
      if (cycleFilter !== 'TODOS' && row.cycle_type !== cycleFilter) return false
      if (typeFilter !== 'TODOS' && row.tire_type !== typeFilter) return false
      if (locationFilter !== 'TODOS' && row.location_state !== locationFilter) return false
      return true
    })
  }, [rows, query, projectFilter, cycleFilter, typeFilter, locationFilter])

  function startCreate() {
    setMessage('')
    setError('')
    setEditMode('create')
    setCycleMode(false)
    setForm({ ...EMPTY_FORM })
  }

  function startEdit() {
    if (!selected) return
    setMessage('')
    setError('')
    setEditMode('edit')
    setCycleMode(false)
    setForm(normalizeForm(selected))
  }

  function cancelEdit() {
    setEditMode(null)
    setForm(EMPTY_FORM)
  }

  async function saveForm(event) {
    event.preventDefault()
    if (!form.code.trim()) {
      setError('El código del neumático es obligatorio.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')

      if (editMode === 'create') {
        const newId = await createTire(form)
        setMessage('Neumático creado correctamente.')
        setEditMode(null)
        await load()
        if (newId) setSelectedId(newId)
      } else if (editMode === 'edit' && selected) {
        await updateTire(selected.tire_id, form)
        setMessage('Datos del neumático actualizados.')
        setEditMode(null)
        await load()
      }
    } catch (err) {
      setError(err?.message || 'No se pudo guardar el neumático.')
    } finally {
      setSaving(false)
    }
  }

  async function registerNextCycle(event) {
    event.preventDefault()
    if (!selected) return

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const next = await advanceTireLifecycle(selected.tire_id, cycleForm)
      setMessage(`Nuevo ciclo ${next} registrado correctamente.`)
      setCycleMode(false)
      setCycleForm({ started_at: '', final_depth_mm: '', new_initial_depth_mm: '' })
      await load()
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar el siguiente ciclo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="tires-page">
      <div className="tires-page__header">
        <div>
          <h1>Neumáticos</h1>
          <p>Maestro, ciclo de vida, ubicación y asignación actual.</p>
        </div>
        {isAdmin && (
          <button className="btn btn--primary" type="button" onClick={startCreate}>
            + Nuevo neumático
          </button>
        )}
      </div>

      {error && <div className="notice notice--error">{error}</div>}
      {message && <div className="notice notice--success">{message}</div>}

      <section className="panel search-panel">
        <div className="panel__title-row">
          <div>
            <h2>Buscar neumáticos</h2>
            <span>{filteredRows.length} registros encontrados</span>
          </div>
        </div>

        <div className="filters-grid">
          <label className="field field--wide">
            <span>Buscar</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Código, DOT, medida, marca, modelo, proyecto o placa..."
            />
          </label>

          <label className="field">
            <span>Proyecto</span>
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="TODOS">Todos</option>
              {projects.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Ciclo</span>
            <select value={cycleFilter} onChange={(e) => setCycleFilter(e.target.value)}>
              <option value="TODOS">Todos</option>
              {cycles.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Tipo</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="TODOS">Todos</option>
              {types.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Ubicación</span>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="TODOS">Todas</option>
              {locations.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-wrap">
          <table className="tires-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>DOT</th>
                <th>Medida</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Proyecto</th>
                <th>Ciclo</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th>Equipo</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="table-state">Cargando...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan="10" className="table-state">No hay resultados.</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.tire_id}
                    className={row.tire_id === selectedId ? 'is-selected' : ''}
                    onClick={() => {
                      setSelectedId(row.tire_id)
                      setEditMode(null)
                      setCycleMode(false)
                    }}
                  >
                    <td className="cell-strong">{textOrDash(row.code)}</td>
                    <td>{textOrDash(row.dot)}</td>
                    <td>{textOrDash(row.size)}</td>
                    <td>{textOrDash(row.brand)}</td>
                    <td>{textOrDash(row.model)}</td>
                    <td>{textOrDash(row.project)}</td>
                    <td><span className="cycle-badge">{textOrDash(row.cycle_type)}</span></td>
                    <td>{textOrDash(row.tire_type)}</td>
                    <td>{textOrDash(row.location_state)}</td>
                    <td>{row.plate ? `${row.plate}${row.position ? ` · POS${row.position}` : ''}` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && editMode && (
        <section className="panel edit-panel">
          <div className="panel__title-row">
            <div>
              <h2>{editMode === 'create' ? 'Nuevo neumático' : 'Editar neumático'}</h2>
              <span>
                {editMode === 'create'
                  ? 'El primer ciclo queda registrado junto con el neumático.'
                  : 'El ciclo actual se gestiona por separado para conservar el historial.'}
              </span>
            </div>
            <button className="btn btn--ghost" type="button" onClick={cancelEdit}>Cancelar</button>
          </div>

          <form onSubmit={saveForm} className="form-grid">
            <label className="field"><span>Código *</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label className="field"><span>DOT</span><input value={form.dot} onChange={(e) => setForm({ ...form, dot: e.target.value })} /></label>
            <label className="field"><span>Medida</span><input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></label>
            <label className="field"><span>Marca</span><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></label>
            <label className="field"><span>Modelo</span><input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></label>
            <label className="field"><span>Proyecto</span><input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} /></label>
            <label className="field"><span>Tipo</span><select value={form.tire_type} onChange={(e) => setForm({ ...form, tire_type: e.target.value })}><option value="">—</option><option value="DELANTERO">DELANTERO</option><option value="POSTERIOR">POSTERIOR</option></select></label>
            <label className="field"><span>Ubicación</span><input value={form.location_state} onChange={(e) => setForm({ ...form, location_state: e.target.value })} placeholder="EN EQUIPO / ALMACÉN / ..." /></label>
            <label className="field"><span>Estado operativo</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>

            {editMode === 'create' ? (
              <>
                <label className="field"><span>Ciclo inicial</span><select value={form.cycle_type} onChange={(e) => setForm({ ...form, cycle_type: e.target.value })}><option value="O">O · ORIGINAL</option><option value="R1">R1 · REENCAUCHADO 1</option><option value="R2">R2 · REENCAUCHADO 2</option></select></label>
                <label className="field"><span>Inicio del ciclo</span><input type="datetime-local" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} /></label>
                <label className="field"><span>Remanente inicial (mm)</span><input type="number" step="0.01" min="0" value={form.initial_depth_mm} onChange={(e) => setForm({ ...form, initial_depth_mm: e.target.value })} /></label>
              </>
            ) : (
              <label className="field field--checkbox"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /><span>Registro activo</span></label>
            )}

            <div className="form-actions"><button className="btn btn--primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button></div>
          </form>
        </section>
      )}

      {selected && (
        <section className="panel">
          <div className="panel__title-row">
            <div>
              <h2>Ficha del neumático</h2>
              <span>Identidad física y ciclo de vida vigente.</span>
            </div>
            {isAdmin && (
              <div className="button-row">
                <button className="btn btn--ghost" type="button" onClick={startEdit}>Editar</button>
                <button className="btn btn--secondary" type="button" onClick={() => { setCycleMode((value) => !value); setEditMode(null) }}>Registrar reencauche</button>
              </div>
            )}
          </div>

          <div className="detail-grid">
            <div><span>Código</span><strong>{textOrDash(selected.code)}</strong></div>
            <div><span>DOT</span><strong>{textOrDash(selected.dot)}</strong></div>
            <div><span>Medida</span><strong>{textOrDash(selected.size)}</strong></div>
            <div><span>Marca</span><strong>{textOrDash(selected.brand)}</strong></div>
            <div><span>Modelo</span><strong>{textOrDash(selected.model)}</strong></div>
            <div><span>Proyecto</span><strong>{textOrDash(selected.project)}</strong></div>
            <div><span>Tipo</span><strong>{textOrDash(selected.tire_type)}</strong></div>
            <div><span>Ubicación</span><strong>{textOrDash(selected.location_state)}</strong></div>
            <div><span>Estado operativo</span><strong>{STATUS_LABELS[selected.status] ?? textOrDash(selected.status)}</strong></div>
            <div><span>Condición</span><strong>{selected.active ? 'ACTIVO' : 'INACTIVO'}</strong></div>
            <div className="detail-grid__highlight"><span>Ciclo actual</span><strong>{cycleLabel(selected.cycle_type)}</strong></div>
            <div><span>Inicio del ciclo</span><strong>{formatDate(selected.cycle_started_at)}</strong></div>
          </div>
        </section>
      )}

      {isAdmin && selected && cycleMode && (
        <section className="panel cycle-panel">
          <div className="panel__title-row">
            <div>
              <h2>Registrar siguiente ciclo de vida</h2>
              <span>El ciclo actual se cierra y se crea automáticamente el siguiente: O → R1 → R2 → R3...</span>
            </div>
            <button className="btn btn--ghost" type="button" onClick={() => setCycleMode(false)}>Cancelar</button>
          </div>

          {selected.assignment_id && (
            <div className="notice notice--warning">Primero debes retirar el neumático de su equipo. No se permite iniciar un reencauche con una asignación activa.</div>
          )}

          <form onSubmit={registerNextCycle} className="form-grid">
            <label className="field"><span>Fecha de inicio del nuevo ciclo</span><input type="datetime-local" value={cycleForm.started_at} onChange={(e) => setCycleForm({ ...cycleForm, started_at: e.target.value })} /></label>
            <label className="field"><span>Remanente final del ciclo anterior (mm)</span><input type="number" min="0" step="0.01" value={cycleForm.final_depth_mm} onChange={(e) => setCycleForm({ ...cycleForm, final_depth_mm: e.target.value })} /></label>
            <label className="field"><span>Remanente inicial del nuevo ciclo (mm)</span><input type="number" min="0" step="0.01" value={cycleForm.new_initial_depth_mm} onChange={(e) => setCycleForm({ ...cycleForm, new_initial_depth_mm: e.target.value })} /></label>
            <div className="form-actions"><button className="btn btn--primary" type="submit" disabled={saving || Boolean(selected.assignment_id)}>{saving ? 'Registrando...' : 'Crear siguiente ciclo'}</button></div>
          </form>
        </section>
      )}

      {selected && (
        <section className="panel">
          <div className="panel__title-row">
            <div>
              <h2>Asignación actual</h2>
              <span>Equipo y posición donde está instalado el neumático.</span>
            </div>
          </div>

          {selected.assignment_id ? (
            <div className="assignment-card">
              <div><span>Equipo</span><strong>{textOrDash(selected.plate)}</strong></div>
              <div><span>Posición</span><strong>{selected.position ? `POS${selected.position}` : '—'}</strong></div>
              <div><span>Instalado</span><strong>{formatDate(selected.installed_at)}</strong></div>
              <div><span>Última medición</span><strong>{formatDate(selected.measured_at)}</strong></div>
              <div><span>Remanente actual</span><strong>{selected.remaining_depth_mm != null ? `${Number(selected.remaining_depth_mm).toFixed(2)} mm` : '—'}</strong></div>
            </div>
          ) : (
            <div className="empty-card">Este neumático no tiene una asignación activa.</div>
          )}
        </section>
      )}
    </div>
  )
}
