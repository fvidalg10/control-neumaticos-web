import { supabase } from '../lib/supabaseClient.js'

async function getAllRows(table, orderColumn = 'code') {
  const pageSize = 1000
  let from = 0
  let allRows = []

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error

    allRows = [...allRows, ...(data ?? [])]

    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return allRows
}

export async function getHistoryTires() {
  return getAllRows('tire_overview', 'code')
}

export async function getTireLifecycleHistory(tireId) {
  const { data, error } = await supabase
    .from('tire_lifecycle_history')
    .select('*')
    .eq('tire_id', tireId)
    .order('started_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getTireAssignmentHistory(tireId) {
  const { data, error } = await supabase
    .from('tire_assignment_history')
    .select('*')
    .eq('tire_id', tireId)
    .order('installed_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getTireMeasurementHistory(tireId) {
  const { data, error } = await supabase
    .from('tire_measurement_history')
    .select('*')
    .eq('tire_id', tireId)
    .order('measured_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

// Devuelve toda la trazabilidad del neumático físico usando tire_id.
// No depende de DOT, placa ni posición actual.
export async function getTireTraceability(tireId) {
  if (!tireId) {
    return { cycles: [], assignments: [], measurements: [] }
  }

  const [cycles, assignments, measurements] = await Promise.all([
    getTireLifecycleHistory(tireId),
    getTireAssignmentHistory(tireId),
    getTireMeasurementHistory(tireId),
  ])

  return { cycles, assignments, measurements }
}
