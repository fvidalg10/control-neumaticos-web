import React, { useEffect, useMemo, useState } from 'react'
import {
  deleteInspectionCycle,
  deleteTireMeasurement,
  getInspectionAdminData,
} from '../../services/inspectionAdminService.js'
import { usePersistentState } from '../../hooks/usePersistentState.js'
import './inspections.css'

function textOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : value
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  if (!Number.isFinite(number)) return textOrDash(value)

  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number)
}

function dayKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function InspectionsPage({ profile, storagePrefix = 'control-neumaticos' }) {
  const isAdmin = profile?.role === 'ADMIN'
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [query, setQuery] = usePersistentState(`${storagePrefix}:inspections:query`, '')
  const [plateFilter, setPlateFilter] = usePersistentState(`${storagePrefix}:inspections:plate`, 'TODOS')
  const [dateFilter, setDateFilter] = usePersistentState(`${storagePrefix}:inspections:date`, '')
  const [selectedCycleId, setSelectedCycleId] = usePersistentState(`${storagePrefix}:inspections:selectedCycleId`, null)

  async function load() {
    try {
      setLoading(true)
      setError('')
      const data = await getInspectionAdminData()
      setRows(data)
      setSelectedCycleId((current) => {
        if (current && data.some((row) => row.cycle_id === current)) return current
        return data[0]?.cycle_id ?? null
      })
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las inspecciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin])

  const plates = useMemo(
    () => [...new Set(rows.map((row) => row.plate).filter(Boolean))].sort(),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toUpperCase()

    return rows.filter((row) => {
      if (plateFilter !== 'TODOS' && row.plate !== plateFilter) return false
      if (dateFilter && dayKey(row.measured_at) !== dateFilter) return false

      if (!normalized) return true

      const measurementText = row.measurements
        .flatMap((measurement) => [
          measurement.tire_code,
          measurement.tire_dot,
          measurement.tire_brand,
          measurement.tire_model,
          `POS${measurement.position}`,
        ])
        .filter(Boolean)
        .join(' ')

      const searchText = [
        row.plate,
        row.hr,
        row.km,
        row.source_cycle_id,
        row.sync_source,
        measurementText,
      ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()

      return searchText.includes(normalized)
    })
  }, [rows, query, plateFilter, dateFilter])

  const selected = useMemo(
    () => rows.find((row) => row.cycle_id === selectedCycleId) ?? null,
    [rows, selectedCycleId],
  )

  const totals = useMemo(() => ({
    inspections: rows.length,
    measurements: rows.reduce((sum, row) => sum + row.measurement_count, 0),
    plates: new Set(rows.map((row) => row.plate).filter(Boolean)).size,
  }), [rows])

  function clearFilters() {
    setQuery('')
    setPlateFilter('TODOS')
    setDateFilter('')
  }

  async function handleDeleteMeasurement(measurement) {
    if (!selected || deleting) return

    if (selected.measurement_count <= 1) {
      const confirmedLast = window.confirm(
        `Esta es la única medición de la inspección ${selected.plate} del ${formatDateTime(selected.measured_at)}.\n\nAl eliminarla también se eliminará la inspección completa.\n\n¿Deseas continuar?`,
      )
      if (!confirmedLast) return
      await handleDeleteInspection()
      return
    }

    const confirmed = window.confirm(
      `¿Eliminar únicamente esta medición?\n\nNeumático: ${measurement.tire_code || '—'}\nPosición: POS${measurement.position}\nNKS: ${formatNumber(measurement.remaining_depth_mm, 2)} mm\n\nLas demás mediciones de la inspección se conservarán.`,
    )

    if (!confirmed) return

    try {
      setDeleting(true)
      setError('')
      setMessage('')
      await deleteTireMeasurement(measurement.tire_measurement_id)
      setMessage(`Medición de ${measurement.tire_code || `POS${measurement.position}`} eliminada correctamente.`)
      await load()
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar la medición.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDeleteInspection() {
    if (!selected || deleting) return

    const confirmed = window.confirm(
      `¿ELIMINAR LA INSPECCIÓN COMPLETA?\n\nEquipo: ${selected.plate}\nFecha: ${formatDateTime(selected.measured_at)}\nHR: ${textOrDash(selected.hr)}\nKM: ${textOrDash(selected.km)}\nMediciones: ${selected.measurement_count}\n\nSe eliminará el ciclo de inspección y TODAS sus mediciones NKS asociadas. Esta acción no se puede deshacer.`,
    )

    if (!confirmed) return

    const secondConfirmation = window.confirm(
      `Confirmación final: ¿eliminar definitivamente la inspección de ${selected.plate}?`,
    )

    if (!secondConfirmation) return

    try {
      setDeleting(true)
      setError('')
      setMessage('')
      const deletedPlate = selected.plate
      const deletedDate = selected.measured_at
      await deleteInspectionCycle(selected.cycle_id)
      setSelectedCycleId(null)
      setMessage(`Inspección ${deletedPlate} · ${formatDateTime(deletedDate)} eliminada correctamente.`)
      await load()
    } catch (err) {
      setError(err?.message || 'No se pudo eliminar la inspección.')
    } finally {
      setDeleting(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="inspections-page">
        <section className="inspection-panel">
          <div className="inspection-message inspection-message--error">
            Este módulo está disponible únicamente para usuarios ADMIN.
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="inspections-page">
      <section className="inspection-warning">
        <div>
          <strong>Administración de inspecciones</strong>
          <span>Área exclusiva para ADMIN. Permite eliminar una medición NKS individual o una inspección completa.</span>
        </div>
        <span className="inspection-admin-badge">ADMIN</span>
      </section>

      <section className="inspection-summary-grid">
        <div className="inspection-summary-card">
          <span>Inspecciones</span>
          <strong>{totals.inspections}</strong>
        </div>
        <div className="inspection-summary-card">
          <span>Mediciones NKS</span>
          <strong>{totals.measurements}</strong>
        </div>
        <div className="inspection-summary-card">
          <span>Equipos con historial</span>
          <strong>{totals.plates}</strong>
        </div>
      </section>

      <section className="inspection-panel">
        <div className="inspection-panel__header">
          <div>
            <h2>Buscar inspección</h2>
            <p>Filtra por placa, código de neumático, posición, fecha, HR o KM.</p>
          </div>
          <button type="button" className="inspection-button inspection-button--ghost" onClick={load} disabled={loading || deleting}>
            Actualizar
          </button>
        </div>

        <div className="inspection-toolbar">
          <label>
            <span>Búsqueda</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej.: API-827, 8862, POS1, 13616..."
            />
          </label>

          <label>
            <span>Equipo</span>
            <select value={plateFilter} onChange={(event) => setPlateFilter(event.target.value)}>
              <option value="TODOS">Todos</option>
              {plates.map((plate) => <option key={plate} value={plate}>{plate}</option>)}
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>

          <button type="button" className="inspection-button inspection-button--ghost inspection-clear" onClick={clearFilters}>
            Limpiar filtros
          </button>
        </div>

        {error && <div className="inspection-message inspection-message--error">{error}</div>}
        {message && <div className="inspection-message inspection-message--success">{message}</div>}

        <div className="inspection-table-wrap">
          <table className="inspection-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Equipo</th>
                <th>HR</th>
                <th>KM</th>
                <th>Mediciones</th>
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="inspection-table-state">Cargando inspecciones...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan="6" className="inspection-table-state">No se encontraron inspecciones.</td></tr>
              ) : filteredRows.map((row) => (
                <tr
                  key={row.cycle_id}
                  className={row.cycle_id === selectedCycleId ? 'is-selected' : ''}
                  onClick={() => setSelectedCycleId(row.cycle_id)}
                  tabIndex="0"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedCycleId(row.cycle_id)
                    }
                  }}
                >
                  <td>{formatDateTime(row.measured_at)}</td>
                  <td><strong>{textOrDash(row.plate)}</strong></td>
                  <td>{formatNumber(row.hr, 0)}</td>
                  <td>{formatNumber(row.km, 0)}</td>
                  <td><span className="inspection-count-badge">{row.measurement_count}</span></td>
                  <td>{textOrDash(row.sync_source)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <section className="inspection-panel inspection-detail-panel">
          <div className="inspection-panel__header">
            <div>
              <h2>Detalle de inspección</h2>
              <p>{selected.plate} · {formatDateTime(selected.measured_at)} · HR {textOrDash(selected.hr)} · KM {textOrDash(selected.km)}</p>
            </div>
            <button
              type="button"
              className="inspection-button inspection-button--danger"
              onClick={handleDeleteInspection}
              disabled={deleting}
            >
              {deleting ? 'Procesando...' : 'Eliminar inspección completa'}
            </button>
          </div>

          <div className="inspection-danger-note">
            Eliminar la inspección completa borra este registro y todas las mediciones NKS vinculadas al mismo cycle_id.
          </div>

          <div className="inspection-table-wrap">
            <table className="inspection-table inspection-measurements-table">
              <thead>
                <tr>
                  <th>POS</th>
                  <th>Código</th>
                  <th>DOT</th>
                  <th>Medida</th>
                  <th>Marca / Modelo</th>
                  <th>NKS</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {selected.measurements.length === 0 ? (
                  <tr><td colSpan="7" className="inspection-table-state">La inspección no tiene mediciones asociadas.</td></tr>
                ) : selected.measurements.map((measurement) => (
                  <tr key={measurement.tire_measurement_id}>
                    <td><strong>POS{measurement.position}</strong></td>
                    <td>{textOrDash(measurement.tire_code)}</td>
                    <td>{textOrDash(measurement.tire_dot)}</td>
                    <td>{textOrDash(measurement.tire_size)}</td>
                    <td>{textOrDash(measurement.tire_brand)} / {textOrDash(measurement.tire_model)}</td>
                    <td className="inspection-nks">{formatNumber(measurement.remaining_depth_mm, 2)} mm</td>
                    <td>
                      <button
                        type="button"
                        className="inspection-button inspection-button--danger-soft"
                        onClick={() => handleDeleteMeasurement(measurement)}
                        disabled={deleting}
                      >
                        Eliminar medición
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
