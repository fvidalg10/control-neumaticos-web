import React, { useEffect, useMemo, useState } from 'react'
import { getTireAlerts, getTireAlertConfig } from '../../services/alertService.js'
import './alerts.css'

function fmt(value, decimals = 0) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

function fmtDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function depthLabel(value) {
  const labels = {
    CRITICO: 'CRÍTICO',
    PROXIMO: 'PRÓXIMO',
    NORMAL: 'NORMAL',
    SIN_MEDICION: 'SIN MEDICIÓN',
  }
  return labels[value] || value
}

function cycleLabel(value) {
  if (!value) return '—'
  return value
}

function wearReason(row) {
  const hr = Number(row.hr_acceleration_ratio)
  const km = Number(row.km_acceleration_ratio)
  const parts = []

  if (Number.isFinite(hr) && hr >= Number(row.acceleration_factor)) {
    parts.push(`HR ×${fmt(hr, 2)}`)
  }
  if (Number.isFinite(km) && km >= Number(row.acceleration_factor)) {
    parts.push(`KM ×${fmt(km, 2)}`)
  }

  return parts.length ? parts.join(' · ') : 'Tendencia acelerada'
}

export default function AlertsPage({ onOpenHistory }) {
  const [rows, setRows] = useState([])
  const [config, setConfig] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALERTAS')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    try {
      setLoading(true)
      setError('')
      const [alerts, cfg] = await Promise.all([
        getTireAlerts(),
        getTireAlertConfig(),
      ])
      setRows(alerts)
      setConfig(cfg)
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar las alertas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => ({
    critical: rows.filter((r) => r.depth_alert === 'CRITICO').length,
    next: rows.filter((r) => r.depth_alert === 'PROXIMO').length,
    accelerated: rows.filter((r) => r.accelerated_wear).length,
    inspection: rows.filter((r) => r.inspection_due).length,
    installed: rows.length,
  }), [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()

    return rows.filter((row) => {
      const matchesQuery = !q || [
        row.tire_code,
        row.plate,
        row.dot,
        row.brand,
        row.model,
        row.project,
        `POS${row.position}`,
      ].some((value) => String(value ?? '').toUpperCase().includes(q))

      if (!matchesQuery) return false

      if (filter === 'CRITICO') return row.depth_alert === 'CRITICO'
      if (filter === 'PROXIMO') return row.depth_alert === 'PROXIMO'
      if (filter === 'ACELERADO') return row.accelerated_wear
      if (filter === 'INSPECCION') return row.inspection_due
      if (filter === 'NORMAL') {
        return row.depth_alert === 'NORMAL' && !row.inspection_due && !row.accelerated_wear
      }
      if (filter === 'ALERTAS') {
        return row.depth_alert === 'CRITICO' ||
          row.depth_alert === 'PROXIMO' ||
          row.depth_alert === 'SIN_MEDICION' ||
          row.inspection_due ||
          row.accelerated_wear
      }
      return true
    })
  }, [rows, query, filter])

  return (
    <div className="alerts-page">
      <section className="alerts-summary">
        <button className="alert-card alert-card--critical" onClick={() => setFilter('CRITICO')}>
          <span className="alert-card__label">Críticos</span>
          <strong>{counts.critical}</strong>
          <small>NKS ≤ {fmt(config?.critical_max_mm, 1)} mm</small>
        </button>

        <button className="alert-card alert-card--next" onClick={() => setFilter('PROXIMO')}>
          <span className="alert-card__label">Próximos</span>
          <strong>{counts.next}</strong>
          <small>&gt; {fmt(config?.next_min_mm, 1)} y &lt; {fmt(config?.next_max_mm, 1)} mm</small>
        </button>

        <button className="alert-card alert-card--accelerated" onClick={() => setFilter('ACELERADO')}>
          <span className="alert-card__label">Desgaste acelerado</span>
          <strong>{counts.accelerated}</strong>
          <small>Último tramo ≥ ×{fmt(config?.acceleration_factor, 2)} del promedio previo</small>
        </button>

        <button className="alert-card alert-card--inspection" onClick={() => setFilter('INSPECCION')}>
          <span className="alert-card__label">Inspección</span>
          <strong>{counts.inspection}</strong>
          <small>Más de {config?.inspection_days ?? 30} días sin medición</small>
        </button>

        <button className="alert-card alert-card--total" onClick={() => setFilter('TODOS')}>
          <span className="alert-card__label">Instalados</span>
          <strong>{counts.installed}</strong>
          <small>Neumáticos con asignación activa</small>
        </button>
      </section>

      <section className="alerts-panel">
        <div className="alerts-panel__top">
          <div>
            <h2>Control de alertas</h2>
            <p>Última medición, inspección y tendencia de desgaste por neumático instalado.</p>
          </div>
          <button className="alerts-refresh" onClick={load}>Actualizar</button>
        </div>

        <div className="alerts-toolbar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar placa, código, DOT, marca..."
          />

          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALERTAS">Solo alertas</option>
            <option value="CRITICO">Críticos</option>
            <option value="PROXIMO">Próximos</option>
            <option value="ACELERADO">Desgaste acelerado</option>
            <option value="INSPECCION">Inspección pendiente</option>
            <option value="NORMAL">Normales</option>
            <option value="TODOS">Todos</option>
          </select>
        </div>

        {error && <div className="alerts-message alerts-message--error">{error}</div>}
        {loading && <div className="alerts-message">Cargando alertas…</div>}

        {!loading && !error && (
          <div className="alerts-table-wrap">
            <table className="alerts-table">
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>POS</th>
                  <th>Código</th>
                  <th>Ciclo</th>
                  <th>NKS</th>
                  <th>Últ. medición</th>
                  <th>Días</th>
                  <th>Alarma NKS</th>
                  <th>Desgaste</th>
                  <th>Inspección</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.assignment_id}
                    className={row.accelerated_wear ? 'alerts-row--accelerated' : ''}
                  >
                    <td><strong>{row.plate}</strong></td>
                    <td>POS{row.position}</td>
                    <td>
                      <button
                        type="button"
                        className="alert-tire-link"
                        onClick={() => onOpenHistory?.(row.tire_code)}
                        title={`Abrir historial de ${row.tire_code}`}
                      >
                        {row.tire_code}
                      </button>
                    </td>
                    <td>{cycleLabel(row.cycle_type)}</td>
                    <td className="alerts-nks">
                      {row.remaining_depth_mm == null ? '—' : `${fmt(row.remaining_depth_mm, 2)} mm`}
                    </td>
                    <td>{fmtDate(row.last_measured_at)}</td>
                    <td>{row.days_since_measurement == null ? '—' : row.days_since_measurement}</td>
                    <td>
                      <span className={`alert-pill alert-pill--${String(row.depth_alert).toLowerCase()}`}>
                        {depthLabel(row.depth_alert)}
                      </span>
                    </td>
                    <td>
                      {row.accelerated_wear ? (
                        <span className="wear-pill wear-pill--accelerated" title={wearReason(row)}>
                          ACELERADO
                        </span>
                      ) : (
                        <span className="wear-pill">NORMAL</span>
                      )}
                    </td>
                    <td>
                      {row.inspection_due ? (
                        <span className="inspection-pill inspection-pill--due">REVISAR</span>
                      ) : (
                        <span className="inspection-pill">AL DÍA</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="history-button"
                        onClick={() => onOpenHistory?.(row.tire_code)}
                      >
                        Ver historial
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="11" className="alerts-empty">
                      No hay registros que coincidan con el filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="alerts-rules">
        <strong>Criterios activos</strong>
        <span>CRÍTICO: NKS ≤ {fmt(config?.critical_max_mm, 1)} mm</span>
        <span>PRÓXIMO: NKS &gt; {fmt(config?.next_min_mm, 1)} mm y &lt; {fmt(config?.next_max_mm, 1)} mm</span>
        <span>INSPECCIÓN: más de {config?.inspection_days ?? 30} días desde la última medición</span>
        <span>
          ACELERADO: último tramo ≥ ×{fmt(config?.acceleration_factor, 2)} del promedio previo,
          con mínimo {config?.acceleration_min_measurements ?? 3} mediciones
        </span>
      </section>
    </div>
  )
}
