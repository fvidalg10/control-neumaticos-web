import React, { useEffect, useMemo, useState } from 'react'
import {
  getHistoryTires,
  getTireAssignmentHistory,
  getTireLifecycleHistory,
  getTireMeasurementHistory,
} from '../../services/historyService.js'
import './history.css'

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

function cycleLabel(value) {
  if (!value) return '—'
  if (value === 'O') return 'O · ORIGINAL'
  if (value.startsWith('R')) return `${value} · REENCAUCHE ${value.slice(1)}`
  return value
}

function statusLabel(value) {
  const labels = {
    STOCK: 'STOCK',
    INSTALLED: 'INSTALADO',
    REPAIR: 'REPARACIÓN',
    REMOVED: 'RETIRADO',
    SCRAP: 'SCRAP',
  }
  return labels[value] || textOrDash(value)
}

function formatNumber(value, decimals = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function getCycleBaseline(cycleId, assignments, measurements, field) {
  const assignmentField = field === 'hr' ? 'install_hr' : 'install_km'
  const cycleAssignments = assignments
    .filter((row) => row.lifecycle_id === cycleId && Number.isFinite(Number(row[assignmentField])))
    .sort((a, b) => new Date(a.installed_at) - new Date(b.installed_at))

  if (cycleAssignments.length > 0) {
    return {
      value: Number(cycleAssignments[0][assignmentField]),
      source: 'installation',
    }
  }

  const cycleMeasurements = measurements
    .filter((row) => row.lifecycle_id === cycleId && Number.isFinite(Number(row[field])))
    .sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at))

  if (cycleMeasurements.length > 0) {
    return {
      value: Number(cycleMeasurements[0][field]),
      source: 'first_measurement',
    }
  }

  return null
}

function CyclePerformanceChart({ cycle, measurements, assignments, metric }) {
  const isHr = metric === 'hr'
  const actualField = isHr ? 'hr' : 'km'
  const unit = isHr ? 'h' : 'km'
  const title = isHr ? 'NKS vs HR recorrido' : 'NKS vs KM recorrido'
  const actualLabel = isHr ? 'HR actual' : 'KM actual'
  const elapsedLabel = isHr ? 'HR recorrido' : 'KM recorrido'

  const baseline = useMemo(
    () => getCycleBaseline(cycle.lifecycle_id, assignments, measurements, actualField),
    [cycle.lifecycle_id, assignments, measurements, actualField],
  )

  const points = useMemo(() => {
    if (!baseline) return []

    return measurements
      .filter((row) => row.lifecycle_id === cycle.lifecycle_id)
      .map((row) => {
        const actual = Number(row[actualField])
        const nks = Number(row.remaining_depth_mm)
        return {
          id: row.tire_measurement_id,
          actual,
          elapsed: actual - baseline.value,
          nks,
          measuredAt: row.measured_at,
          plate: row.plate,
          position: row.position,
        }
      })
      .filter((row) => Number.isFinite(row.actual) && Number.isFinite(row.elapsed) && row.elapsed >= 0 && Number.isFinite(row.nks))
      .sort((a, b) => a.elapsed - b.elapsed)
  }, [measurements, cycle.lifecycle_id, actualField, baseline])

  const width = 860
  const height = 320
  const pad = { left: 64, right: 28, top: 24, bottom: 82 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  if (points.length === 0) {
    return (
      <div className="performance-chart-card">
        <div className="performance-chart-card__header">
          <div>
            <strong>{title}</strong>
            <span>{cycleLabel(cycle.cycle_type)}</span>
          </div>
        </div>
        <div className="chart-empty">Este ciclo todavía no tiene datos suficientes de {actualLabel} y NKS.</div>
      </div>
    )
  }

  const xs = points.map((p) => p.elapsed)
  const nksValues = points.map((p) => p.nks)
  const rawMinX = Math.min(...xs)
  const rawMaxX = Math.max(...xs)
  const rawMinNks = Math.min(...nksValues)
  const rawMaxNks = Math.max(...nksValues)
  const minX = Math.min(0, rawMinX)
  const maxX = rawMaxX === minX ? minX + 1 : rawMaxX
  const nksMargin = Math.max((rawMaxNks - rawMinNks) * 0.15, 0.5)
  const minNks = Math.max(0, rawMinNks - nksMargin)
  const maxNks = rawMaxNks + nksMargin

  const x = (value) => pad.left + ((value - minX) / (maxX - minX)) * plotW
  const y = (value) => pad.top + (1 - (value - minNks) / (maxNks - minNks)) * plotH
  const polyline = points.map((p) => `${x(p.elapsed)},${y(p.nks)}`).join(' ')
  const yTicks = Array.from({ length: 5 }, (_, i) => minNks + ((maxNks - minNks) * i) / 4)

  return (
    <div className="performance-chart-card">
      <div className="performance-chart-card__header">
        <div>
          <strong>{title}</strong>
          <span>{points.length} medición(es) · eje X basado en {elapsedLabel.toLowerCase()}</span>
        </div>
        <span className="cycle-badge">{cycle.cycle_type}</span>
      </div>

      <div className="performance-chart-card__body">
        <svg className="performance-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} del ciclo ${cycle.cycle_type}`}>
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line x1={pad.left} y1={y(tick)} x2={width - pad.right} y2={y(tick)} className="chart-grid-line" />
              <text x={pad.left - 10} y={y(tick) + 4} textAnchor="end" className="chart-axis-text">
                {formatNumber(tick, 1)}
              </text>
            </g>
          ))}

          <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} className="chart-axis-line" />
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} className="chart-axis-line" />

          {points.length > 1 && <polyline points={polyline} className="chart-series-line" />}

          {points.map((point) => (
            <g key={point.id}>
              <line x1={x(point.elapsed)} y1={height - pad.bottom} x2={x(point.elapsed)} y2={y(point.nks)} className="chart-point-guide" />
              <circle cx={x(point.elapsed)} cy={y(point.nks)} r="5.5" className="chart-point" />
              <text x={x(point.elapsed)} y={height - pad.bottom + 22} textAnchor="middle" className="chart-axis-text chart-axis-text--elapsed">
                {formatNumber(point.elapsed, 0)} {unit}
              </text>
              <text x={x(point.elapsed)} y={height - pad.bottom + 42} textAnchor="middle" className="chart-axis-text chart-axis-text--actual">
                {isHr ? 'HR ' : 'KM '}{formatNumber(point.actual, 0)}
              </text>
              <title>{`${elapsedLabel}: ${formatNumber(point.elapsed, 0)} ${unit} · ${actualLabel}: ${formatNumber(point.actual, 0)} · NKS: ${formatNumber(point.nks, 2)} mm · ${formatDateTime(point.measuredAt)} · ${point.plate || '—'} POS${point.position || '—'}`}</title>
            </g>
          ))}

          <text x={pad.left + plotW / 2} y={height - 12} textAnchor="middle" className="chart-axis-title">
            {elapsedLabel} / {actualLabel}
          </text>
          <text transform={`translate(17 ${pad.top + plotH / 2}) rotate(-90)`} textAnchor="middle" className="chart-axis-title">NKS / remanente (mm)</text>
        </svg>
      </div>

      <div className="chart-range-summary">
        <span>Base del ciclo: <strong>{formatNumber(baseline.value, 0)} {unit}</strong></span>
        <span>{elapsedLabel}: <strong>{formatNumber(points[0].elapsed, 0)} → {formatNumber(points[points.length - 1].elapsed, 0)} {unit}</strong></span>
        <span>NKS: <strong>{formatNumber(points[0].nks, 2)} → {formatNumber(points[points.length - 1].nks, 2)} mm</strong></span>
        {baseline.source === 'first_measurement' && <span className="chart-baseline-note">Base temporal: primera medición; falta HR/KM de instalación.</span>}
      </div>
    </div>
  )
}

function CycleCharts({ cycle, measurements, assignments }) {
  return (
    <div className="cycle-chart-card">
      <div className="cycle-chart-card__header">
        <div>
          <strong>{cycleLabel(cycle.cycle_type)}</strong>
          <span>{formatDateTime(cycle.started_at)} → {cycle.ended_at ? formatDateTime(cycle.ended_at) : 'ACTIVO'}</span>
        </div>
        <span className="cycle-badge">{cycle.cycle_type}</span>
      </div>

      <div className="cycle-performance-grid">
        <CyclePerformanceChart cycle={cycle} measurements={measurements} assignments={assignments} metric="hr" />
        <CyclePerformanceChart cycle={cycle} measurements={measurements} assignments={assignments} metric="km" />
      </div>
    </div>
  )
}

export default function HistoryPage({ initialTireCode = null }) {
  const [tires, setTires] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [cycleFilter, setCycleFilter] = useState('TODOS')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState('')
  const [cycles, setCycles] = useState([])
  const [assignments, setAssignments] = useState([])
  const [measurements, setMeasurements] = useState([])

  async function loadMaster() {
    try {
      setLoading(true)
      setError('')
      const data = await getHistoryTires()
      setTires(data)
      setSelectedId((current) => {
        if (current && data.some((row) => row.tire_id === current)) return current
        return data[0]?.tire_id ?? null
      })
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el historial de neumáticos.')
    } finally {
      setLoading(false)
    }
  }

  async function loadDetail(tireId) {
    if (!tireId) {
      setCycles([])
      setAssignments([])
      setMeasurements([])
      return
    }

    try {
      setDetailLoading(true)
      setError('')
      const [cycleRows, assignmentRows, measurementRows] = await Promise.all([
        getTireLifecycleHistory(tireId),
        getTireAssignmentHistory(tireId),
        getTireMeasurementHistory(tireId),
      ])
      setCycles(cycleRows)
      setAssignments(assignmentRows)
      setMeasurements(measurementRows)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el detalle histórico.')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    loadMaster()
  }, [])

  useEffect(() => {
    if (!initialTireCode || tires.length === 0) return

    const normalized = String(initialTireCode).trim().toUpperCase()
    const target = tires.find(
      (row) => String(row.code ?? '').trim().toUpperCase() === normalized,
    )

    if (target) {
      setQuery(target.code)
      setCycleFilter('TODOS')
      setSelectedId(target.tire_id)
    }
  }, [initialTireCode, tires])

  useEffect(() => {
    loadDetail(selectedId)
  }, [selectedId])

  const selected = useMemo(
    () => tires.find((row) => row.tire_id === selectedId) ?? null,
    [tires, selectedId],
  )

  const filteredTires = useMemo(() => {
    const q = query.trim().toUpperCase()
    return tires.filter((row) => {
      const searchText = [
        row.code,
        row.dot,
        row.size,
        row.brand,
        row.model,
        row.project,
        row.plate,
        row.tire_type,
      ]
        .filter(Boolean)
        .join(' ')
        .toUpperCase()

      if (q && !searchText.includes(q)) return false
      if (cycleFilter !== 'TODOS' && row.cycle_type !== cycleFilter) return false
      return true
    })
  }, [tires, query, cycleFilter])

  const cycleOptions = useMemo(
    () => [...new Set(tires.map((row) => row.cycle_type).filter(Boolean))].sort(),
    [tires],
  )

  const chartCycles = useMemo(
    () => [...cycles].sort((a, b) => new Date(a.started_at) - new Date(b.started_at)),
    [cycles],
  )

  const currentAssignment = assignments.find((row) => row.active_assignment) || null
  const latestMeasurement = measurements[0] || null

  return (
    <div className="history-page">
      <div className="history-page__header">
        <div>
          <h1>Historial</h1>
          <p>Seguimiento completo por neumático, ciclo de vida, asignaciones y remanentes.</p>
        </div>
      </div>

      {error && <div className="notice notice--error">{error}</div>}

      <section className="panel history-search">
        <div className="panel__title-row">
          <div>
            <h2>Buscar historial</h2>
            <span>Selecciona un neumático para consultar su trazabilidad.</span>
          </div>
          <strong>{filteredTires.length} neumático(s)</strong>
        </div>

        <div className="history-search__controls">
          <label className="field field--wide">
            <span>Búsqueda</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej.: DEMO-N01, 12R22.5, API-827..."
            />
          </label>

          <label className="field">
            <span>Ciclo actual</span>
            <select value={cycleFilter} onChange={(event) => setCycleFilter(event.target.value)}>
              <option value="TODOS">Todos</option>
              {cycleOptions.map((cycle) => (
                <option key={cycle} value={cycle}>{cycleLabel(cycle)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="history-selection-hint">Haz clic sobre una fila. El neumático seleccionado quedará resaltado en azul.</div>

        <div className="table-wrap">
          <table className="history-master-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>DOT</th>
                <th>Medida</th>
                <th>Marca / Modelo</th>
                <th>Ciclo</th>
                <th>Estado</th>
                <th>Equipo actual</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="table-state" colSpan="7">Cargando historial...</td></tr>
              ) : filteredTires.length === 0 ? (
                <tr><td className="table-state" colSpan="7">No se encontraron neumáticos.</td></tr>
              ) : (
                filteredTires.map((row) => (
                  <tr
                    key={row.tire_id}
                    className={row.tire_id === selectedId ? 'is-selected' : ''}
                    onClick={() => setSelectedId(row.tire_id)}
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedId(row.tire_id)
                      }
                    }}
                    aria-selected={row.tire_id === selectedId}
                  >
                    <td className="cell-strong">{textOrDash(row.code)}</td>
                    <td>{textOrDash(row.dot)}</td>
                    <td>{textOrDash(row.size)}</td>
                    <td>{textOrDash(row.brand)} / {textOrDash(row.model)}</td>
                    <td><span className="cycle-badge">{textOrDash(row.cycle_type)}</span></td>
                    <td>{statusLabel(row.status)}</td>
                    <td>{row.plate ? `${row.plate} · POS${row.position}` : 'SIN ASIGNAR'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <>
          <section className="panel history-selected-banner">
            <div>
              <span>NEUMÁTICO SELECCIONADO</span>
              <strong>{selected.code}</strong>
            </div>
            <div>{textOrDash(selected.brand)} · {textOrDash(selected.model)} · {textOrDash(selected.size)}</div>
          </section>

          <section className="panel">
            <div className="panel__title-row">
              <div>
                <h2>Ficha histórica del neumático</h2>
                <span>{selected.code}</span>
              </div>
              <span className="cycle-badge cycle-badge--large">{cycleLabel(selected.cycle_type)}</span>
            </div>

            <div className="history-summary-grid">
              <div><span>Código</span><strong>{textOrDash(selected.code)}</strong></div>
              <div><span>DOT</span><strong>{textOrDash(selected.dot)}</strong></div>
              <div><span>Medida</span><strong>{textOrDash(selected.size)}</strong></div>
              <div><span>Marca</span><strong>{textOrDash(selected.brand)}</strong></div>
              <div><span>Modelo</span><strong>{textOrDash(selected.model)}</strong></div>
              <div><span>Proyecto</span><strong>{textOrDash(selected.project)}</strong></div>
              <div><span>Tipo</span><strong>{textOrDash(selected.tire_type)}</strong></div>
              <div><span>Estado</span><strong>{statusLabel(selected.status)}</strong></div>
              <div><span>Asignación actual</span><strong>{currentAssignment ? `${currentAssignment.plate} · POS${currentAssignment.position}` : 'SIN ASIGNAR'}</strong></div>
              <div><span>Último NKS</span><strong>{latestMeasurement ? `${latestMeasurement.remaining_depth_mm} mm` : '—'}</strong></div>
              <div><span>Última medición</span><strong>{latestMeasurement ? formatDateTime(latestMeasurement.measured_at) : '—'}</strong></div>
              <div><span>Ciclos registrados</span><strong>{cycles.length}</strong></div>
            </div>
          </section>

          <section className="panel">
            <div className="panel__title-row">
              <div>
                <h2>Curvas de rendimiento por ciclo</h2>
                <span>Cada ciclo muestra por separado NKS vs HR recorrido y NKS vs KM recorrido, conservando también el valor actual del equipo.</span>
              </div>
            </div>

            {detailLoading ? (
              <div className="chart-empty">Cargando curvas...</div>
            ) : chartCycles.length === 0 ? (
              <div className="chart-empty">No existen ciclos registrados.</div>
            ) : (
              <div className="cycle-charts-grid">
                {chartCycles.map((cycle) => (
                  <CycleCharts key={cycle.lifecycle_id} cycle={cycle} measurements={measurements} assignments={assignments} />
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel__title-row">
              <div>
                <h2>Ciclos de vida</h2>
                <span>Original y reencauches registrados para este neumático.</span>
              </div>
            </div>

            <div className="table-wrap">
              <table className="history-detail-table">
                <thead>
                  <tr>
                    <th>Ciclo</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Prof. inicial</th>
                    <th>Prof. final</th>
                    <th>Asignaciones</th>
                    <th>Mediciones</th>
                    <th>HR cerradas</th>
                    <th>KM cerrados</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    <tr><td className="table-state" colSpan="9">Cargando ciclos...</td></tr>
                  ) : cycles.length === 0 ? (
                    <tr><td className="table-state" colSpan="9">Sin ciclos registrados.</td></tr>
                  ) : cycles.map((row) => (
                    <tr key={row.lifecycle_id}>
                      <td><span className="cycle-badge">{row.cycle_type}</span></td>
                      <td>{formatDateTime(row.started_at)}</td>
                      <td>{row.ended_at ? formatDateTime(row.ended_at) : 'ACTIVO'}</td>
                      <td>{row.initial_depth_mm == null ? '—' : `${row.initial_depth_mm} mm`}</td>
                      <td>{row.final_depth_mm == null ? '—' : `${row.final_depth_mm} mm`}</td>
                      <td>{row.assignment_count}</td>
                      <td>{row.measurement_count}</td>
                      <td>{row.closed_hr ?? '—'}</td>
                      <td>{row.closed_km ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel__title-row">
              <div>
                <h2>Historial de asignaciones</h2>
                <span>Cada instalación y retiro conserva equipo, posición, HR y KM.</span>
              </div>
            </div>

            <div className="table-wrap">
              <table className="history-detail-table">
                <thead>
                  <tr>
                    <th>Ciclo</th>
                    <th>Equipo</th>
                    <th>Posición</th>
                    <th>Instalación</th>
                    <th>HR inicial</th>
                    <th>KM inicial</th>
                    <th>Retiro</th>
                    <th>HR final</th>
                    <th>KM final</th>
                    <th>Rend. HR</th>
                    <th>Rend. KM</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    <tr><td className="table-state" colSpan="11">Cargando asignaciones...</td></tr>
                  ) : assignments.length === 0 ? (
                    <tr><td className="table-state" colSpan="11">Sin asignaciones registradas.</td></tr>
                  ) : assignments.map((row) => (
                    <tr key={row.assignment_id}>
                      <td><span className="cycle-badge">{textOrDash(row.cycle_type)}</span></td>
                      <td className="cell-strong">{row.plate}</td>
                      <td>POS{row.position}</td>
                      <td>{formatDateTime(row.installed_at)}</td>
                      <td>{textOrDash(row.install_hr)}</td>
                      <td>{textOrDash(row.install_km)}</td>
                      <td>{row.removed_at ? formatDateTime(row.removed_at) : 'ACTUAL'}</td>
                      <td>{textOrDash(row.remove_hr)}</td>
                      <td>{textOrDash(row.remove_km)}</td>
                      <td>{textOrDash(row.hr_run)}</td>
                      <td>{textOrDash(row.km_run)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel__title-row">
              <div>
                <h2>Historial de mediciones</h2>
                <span>NKS / remanente registrado por la estación durante cada ciclo.</span>
              </div>
              <strong>{measurements.length} medición(es)</strong>
            </div>

            <div className="table-wrap">
              <table className="history-detail-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Ciclo</th>
                    <th>Equipo</th>
                    <th>Posición</th>
                    <th>HR</th>
                    <th>KM</th>
                    <th>NKS</th>
                    <th>Últ. abastecimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {detailLoading ? (
                    <tr><td className="table-state" colSpan="8">Cargando mediciones...</td></tr>
                  ) : measurements.length === 0 ? (
                    <tr><td className="table-state" colSpan="8">Sin mediciones registradas.</td></tr>
                  ) : measurements.map((row) => (
                    <tr key={row.tire_measurement_id}>
                      <td>{formatDateTime(row.measured_at)}</td>
                      <td><span className="cycle-badge">{textOrDash(row.cycle_type)}</span></td>
                      <td className="cell-strong">{textOrDash(row.plate)}</td>
                      <td>POS{row.position}</td>
                      <td>{textOrDash(row.hr)}</td>
                      <td>{textOrDash(row.km)}</td>
                      <td className="history-depth">{row.remaining_depth_mm} mm</td>
                      <td>{formatDateTime(row.fueling_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
