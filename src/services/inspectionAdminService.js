import { supabase } from '../lib/supabaseClient.js'

async function getAllRows(table, { select = '*', orderColumn = null, ascending = true, pageSize = 1000 } = {}) {
  let from = 0
  let allRows = []

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1)

    if (orderColumn) {
      query = query.order(orderColumn, { ascending })
    }

    const { data, error } = await query
    if (error) throw error

    const rows = data ?? []
    allRows = [...allRows, ...rows]

    if (rows.length < pageSize) break
    from += pageSize
  }

  return allRows
}

export async function getInspectionAdminData() {
  const [cycles, measurements, tires] = await Promise.all([
    getAllRows('measurement_cycle', {
      select: 'cycle_id, equipment_id, plate, measured_at, hr, km, fueling_date, source_cycle_id, sync_source, created_at',
      orderColumn: 'measured_at',
      ascending: false,
      pageSize: 500,
    }),
    getAllRows('tire_measurement', {
      select: 'tire_measurement_id, cycle_id, tire_id, lifecycle_id, position, remaining_depth_mm, created_at',
      orderColumn: 'created_at',
      ascending: false,
      pageSize: 1000,
    }),
    getAllRows('tires', {
      select: 'tire_id, code, dot, size, brand, model',
      orderColumn: 'code',
      ascending: true,
      pageSize: 1000,
    }),
  ])

  const tireById = new Map(tires.map((tire) => [tire.tire_id, tire]))
  const measurementsByCycle = new Map()

  for (const measurement of measurements) {
    const tire = tireById.get(measurement.tire_id)
    const row = {
      ...measurement,
      tire_code: tire?.code ?? null,
      tire_dot: tire?.dot ?? null,
      tire_size: tire?.size ?? null,
      tire_brand: tire?.brand ?? null,
      tire_model: tire?.model ?? null,
    }

    const current = measurementsByCycle.get(measurement.cycle_id) ?? []
    current.push(row)
    measurementsByCycle.set(measurement.cycle_id, current)
  }

  return cycles.map((cycle) => {
    const cycleMeasurements = measurementsByCycle.get(cycle.cycle_id) ?? []
    cycleMeasurements.sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))

    return {
      ...cycle,
      measurement_count: cycleMeasurements.length,
      measurements: cycleMeasurements,
    }
  })
}

export async function deleteTireMeasurement(measurementId) {
  const { data, error } = await supabase
    .from('tire_measurement')
    .delete()
    .eq('tire_measurement_id', measurementId)
    .select('tire_measurement_id, cycle_id')

  if (error) throw error

  if (!data || data.length === 0) {
    throw new Error('No se eliminó la medición. Verifica que el usuario sea ADMIN y que las políticas DELETE estén habilitadas.')
  }

  return data[0]
}

export async function deleteInspectionCycle(cycleId) {
  const { data, error } = await supabase
    .from('measurement_cycle')
    .delete()
    .eq('cycle_id', cycleId)
    .select('cycle_id, plate, measured_at')

  if (error) throw error

  if (!data || data.length === 0) {
    throw new Error('No se eliminó la inspección. Verifica que el usuario sea ADMIN y que las políticas DELETE estén habilitadas.')
  }

  return data[0]
}
