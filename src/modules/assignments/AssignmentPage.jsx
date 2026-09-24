import React, { useEffect, useMemo, useState } from 'react'
import {
  assignTireToPosition,
  getAssignmentEquipment,
  getAvailableTires,
  getEquipmentPositions,
  removeTireFromPosition,
} from '../../services/assignmentService.js'
import './assignments.css'

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

function cycleLabel(value) {
  if (!value) return '—'
  if (value === 'O') return 'O · ORIGINAL'
  return `${value} · REENCAUCHE ${value.replace('R', '')}`
}

function localDateTimeValue() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

const GROUPS = [
  { title: 'Eje delantero', positions: [1, 2] },
  { title: 'Eje posterior 1', positions: [3, 4, 5, 6] },
  { title: 'Eje posterior 2', positions: [7, 8, 9, 10] },
]

export default function AssignmentPage({ profile }) {
  const [equipment, setEquipment] = useState([])
  const [equipmentQuery, setEquipmentQuery] = useState('')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const [positions, setPositions] = useState([])
  const [availableTires, setAvailableTires] = useState([])
  const [tireQuery, setTireQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingPositions, setLoadingPositions] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [action, setAction] = useState(null)
  const [saving, setSaving] = useState(false)
  const [assignForm, setAssignForm] = useState({
    tire_id: '',
    installed_at: localDateTimeValue(),
    install_hr: '',
    install_km: '',
  })
  const [removeForm, setRemoveForm] = useState({
    removed_at: localDateTimeValue(),
    remove_hr: '',
    remove_km: '',
    location_state: 'ALMACEN',
  })

  const isAdmin = profile?.role === 'ADMIN'

  async function loadInitial() {
    try {
      setLoading(true)
      setError('')
      const equipmentRows = await getAssignmentEquipment()
      setEquipment(equipmentRows)
      setSelectedEquipmentId((current) => current || equipmentRows[0]?.equipment_id || null)
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los equipos.')
    } finally {
      setLoading(false)
    }
  }

  async function loadAssignmentData(equipmentId) {
    if (!equipmentId) {
      setPositions([])
      setAvailableTires([])
      return
    }

    try {
      setLoadingPositions(true)
      setError('')
      const [positionRows, tireRows] = await Promise.all([
        getEquipmentPositions(equipmentId),
        getAvailableTires(),
      ])
      setPositions(positionRows)
      setAvailableTires(tireRows)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la asignación actual.')
    } finally {
      setLoadingPositions(false)
    }
  }

  useEffect(() => {
    loadInitial()
  }, [])

  useEffect(() => {
    loadAssignmentData(selectedEquipmentId)
    setAction(null)
  }, [selectedEquipmentId])

  const filteredEquipment = useMemo(() => {
    const q = equipmentQuery.trim().toUpperCase()
    if (!q) return equipment
    return equipment.filter((row) =>
      [row.plate, row.description, row.brand, row.model]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()
        .includes(q),
    )
  }, [equipment, equipmentQuery])

  const selectedEquipment = useMemo(
    () => equipment.find((row) => row.equipment_id === selectedEquipmentId) ?? null,
    [equipment, selectedEquipmentId],
  )

  const positionMap = useMemo(() => {
    const map = new Map()
    positions.forEach((row) => map.set(Number(row.position), row))
    return map
  }, [positions])

  const assignedCount = useMemo(
    () => positions.filter((row) => row.assignment_id).length,
    [positions],
  )

  const filteredAvailableTires = useMemo(() => {
    const q = tireQuery.trim().toUpperCase()
    if (!q) return availableTires
    return availableTires.filter((row) =>
      [row.code, row.dot, row.size, row.brand, row.model, row.project, row.cycle_type]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()
        .includes(q),
    )
  }, [availableTires, tireQuery])

  function openAssign(position) {
    setMessage('')
    setError('')
    setAction({ type: 'assign', position })
    setAssignForm({
      tire_id: '',
      installed_at: localDateTimeValue(),
      install_hr: '',
      install_km: '',
    })
    setTireQuery('')
  }

  function openRemove(row) {
    setMessage('')
    setError('')
    setAction({ type: 'remove', row })
    setRemoveForm({
      removed_at: localDateTimeValue(),
      remove_hr: '',
      remove_km: '',
      location_state: 'ALMACEN',
    })
  }

  async function submitAssign(event) {
    event.preventDefault()
    if (!selectedEquipmentId || !action?.position || !assignForm.tire_id) {
      setError('Selecciona un neumático para realizar la asignación.')
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')
      await assignTireToPosition({
        ...assignForm,
        equipment_id: selectedEquipmentId,
        position: action.position,
      })
      setAction(null)
      setMessage(`Neumático asignado correctamente a POS${action.position}.`)
      await loadAssignmentData(selectedEquipmentId)
    } catch (err) {
      setError(err?.message || 'No se pudo asignar el neumático.')
    } finally {
      setSaving(false)
    }
  }

  async function submitRemove(event) {
    event.preventDefault()
    if (!action?.row?.assignment_id) return

    try {
      setSaving(true)
      setError('')
      setMessage('')
      const position = action.row.position
      await removeTireFromPosition({
        ...removeForm,
        assignment_id: action.row.assignment_id,
      })
      setAction(null)
      setMessage(`Neumático retirado correctamente de POS${position}.`)
      await loadAssignmentData(selectedEquipmentId)
    } catch (err) {
      setError(err?.message || 'No se pudo retirar el neumático.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="assignment-page">
      <div className="assignment-page__header">
        <div>
          <h1>Asignaciones</h1>
          <p>Control de neumáticos instalados por equipo y posición.</p>
        </div>
      </div>

      {error && <div className="notice notice--error">{error}</div>}
      {message && <div className="notice notice--success">{message}</div>}

      <section className="panel assignment-search">
        <div className="panel__title-row">
          <div>
            <h2>Buscar equipo</h2>
            <span>Selecciona el equipo antes de modificar sus posiciones.</span>
          </div>
        </div>

        <div className="assignment-search__controls">
          <label className="field">
            <span>Buscar por placa, descripción, marca o modelo</span>
            <input
              value={equipmentQuery}
              onChange={(event) => setEquipmentQuery(event.target.value)}
              placeholder="Ej. AJI-879, ACTROS..."
            />
          </label>

          <label className="field">
            <span>Equipo</span>
            <select
              value={selectedEquipmentId || ''}
              onChange={(event) => setSelectedEquipmentId(event.target.value || null)}
              disabled={loading}
            >
              <option value="">Seleccionar equipo</option>
              {filteredEquipment.map((row) => (
                <option key={row.equipment_id} value={row.equipment_id}>
                  {row.plate} · {row.description || row.model || 'EQUIPO'}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {selectedEquipment && (
        <section className="assignment-equipment-summary">
          <div>
            <span>PLACA</span>
            <strong>{selectedEquipment.plate}</strong>
          </div>
          <div>
            <span>DESCRIPCIÓN</span>
            <strong>{selectedEquipment.description || '—'}</strong>
          </div>
          <div>
            <span>MARCA / MODELO</span>
            <strong>{[selectedEquipment.brand, selectedEquipment.model].filter(Boolean).join(' ') || '—'}</strong>
          </div>
          <div>
            <span>ASIGNADOS</span>
            <strong>{assignedCount}/10</strong>
          </div>
        </section>
      )}

      {action?.type === 'assign' && (
        <section className="panel action-panel">
          <div className="panel__title-row">
            <div>
              <h2>Asignar neumático a POS{action.position}</h2>
              <span>Solo se muestran neumáticos sin asignación activa.</span>
            </div>
            <button className="btn btn--ghost" type="button" onClick={() => setAction(null)}>
              Cancelar
            </button>
          </div>

          <form className="assignment-form" onSubmit={submitAssign}>
            <label className="field field--wide">
              <span>Buscar neumático disponible</span>
              <input
                value={tireQuery}
                onChange={(event) => setTireQuery(event.target.value)}
                placeholder="Código, DOT, medida, marca, proyecto..."
              />
            </label>

            <label className="field field--wide">
              <span>Neumático</span>
              <select
                value={assignForm.tire_id}
                onChange={(event) => setAssignForm((f) => ({ ...f, tire_id: event.target.value }))}
                required
              >
                <option value="">Seleccionar neumático</option>
                {filteredAvailableTires.map((row) => (
                  <option key={row.tire_id} value={row.tire_id}>
                    {row.code} · {cycleLabel(row.cycle_type)} · {row.size || 'SIN MEDIDA'} · {row.brand || 'SIN MARCA'}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fecha / hora instalación</span>
              <input
                type="datetime-local"
                value={assignForm.installed_at}
                onChange={(event) => setAssignForm((f) => ({ ...f, installed_at: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>HR instalación</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={assignForm.install_hr}
                onChange={(event) => setAssignForm((f) => ({ ...f, install_hr: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>KM instalación</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={assignForm.install_km}
                onChange={(event) => setAssignForm((f) => ({ ...f, install_km: event.target.value }))}
              />
            </label>

            <div className="form-actions">
              <button className="btn btn--primary" disabled={saving}>
                {saving ? 'Guardando...' : `Asignar a POS${action.position}`}
              </button>
            </div>
          </form>
        </section>
      )}

      {action?.type === 'remove' && (
        <section className="panel action-panel">
          <div className="panel__title-row">
            <div>
              <h2>Retirar {action.row.tire_code} de POS{action.row.position}</h2>
              <span>Se cerrará esta asignación, pero el historial permanecerá.</span>
            </div>
            <button className="btn btn--ghost" type="button" onClick={() => setAction(null)}>
              Cancelar
            </button>
          </div>

          <form className="assignment-form" onSubmit={submitRemove}>
            <label className="field">
              <span>Fecha / hora retiro</span>
              <input
                type="datetime-local"
                value={removeForm.removed_at}
                onChange={(event) => setRemoveForm((f) => ({ ...f, removed_at: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>HR retiro</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={removeForm.remove_hr}
                onChange={(event) => setRemoveForm((f) => ({ ...f, remove_hr: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>KM retiro</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={removeForm.remove_km}
                onChange={(event) => setRemoveForm((f) => ({ ...f, remove_km: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Destino</span>
              <select
                value={removeForm.location_state}
                onChange={(event) => setRemoveForm((f) => ({ ...f, location_state: event.target.value }))}
              >
                <option value="ALMACEN">ALMACÉN</option>
                <option value="REPARACION">REPARACIÓN</option>
                <option value="REENCAUCHE">REENCAUCHE</option>
                <option value="SCRAP">SCRAP</option>
              </select>
            </label>

            <div className="form-actions">
              <button className="btn btn--primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Confirmar retiro'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel__title-row">
          <div>
            <h2>Asignación actual</h2>
            <span>POS1–POS10 del equipo seleccionado.</span>
          </div>
        </div>

        {!selectedEquipment ? (
          <div className="empty-card">Selecciona un equipo para visualizar sus posiciones.</div>
        ) : loadingPositions ? (
          <div className="empty-card">Cargando posiciones...</div>
        ) : (
          <div className="axle-groups">
            {GROUPS.map((group) => (
              <div className="axle-group" key={group.title}>
                <h3>{group.title}</h3>
                <div className={`position-grid position-grid--${group.positions.length}`}>
                  {group.positions.map((position) => {
                    const row = positionMap.get(position)
                    const occupied = Boolean(row?.assignment_id)
                    const warning = occupied && row.remaining_depth_mm != null && Number(row.remaining_depth_mm) <= 7

                    return (
                      <article
                        className={`position-card ${occupied ? 'position-card--occupied' : 'position-card--empty'} ${warning ? 'position-card--warning' : ''}`}
                        key={position}
                      >
                        <div className="position-card__top">
                          <span>POS{position}</span>
                          <strong>{occupied ? row.tire_code : 'LIBRE'}</strong>
                        </div>

                        {occupied ? (
                          <>
                            <dl className="position-card__data">
                              <div><dt>Ciclo</dt><dd>{cycleLabel(row.cycle_type)}</dd></div>
                              <div><dt>Medida</dt><dd>{row.size || '—'}</dd></div>
                              <div><dt>Marca</dt><dd>{row.tire_brand || '—'}</dd></div>
                              <div><dt>Instalado</dt><dd>{formatDate(row.installed_at)}</dd></div>
                              <div>
                                <dt>Remanente</dt>
                                <dd>{row.remaining_depth_mm == null ? '—' : `${Number(row.remaining_depth_mm).toFixed(2)} mm`}</dd>
                              </div>
                            </dl>
                            {isAdmin && (
                              <button className="position-action position-action--remove" type="button" onClick={() => openRemove(row)}>
                                Retirar
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="position-card__empty-text">Sin neumático asignado.</p>
                            {isAdmin && (
                              <button className="position-action" type="button" onClick={() => openAssign(position)}>
                                + Asignar
                              </button>
                            )}
                          </>
                        )}
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
