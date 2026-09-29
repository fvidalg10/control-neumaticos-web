import { supabase } from '../lib/supabaseClient.js'

async function getAllRows(table, orderColumn = 'code', select = '*', extraQuery = null) {
  const pageSize = 1000
  let from = 0
  let allRows = []

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .order(orderColumn, { ascending: true })
      .range(from, from + pageSize - 1)

    if (extraQuery) query = extraQuery(query)

    const { data, error } = await query
    if (error) throw error

    allRows = [...allRows, ...(data ?? [])]

    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return allRows
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function nullableDate(value) {
  return value ? new Date(value).toISOString() : null
}

export async function getCurrentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData?.user) return null

  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, dni, full_name, email, role, active')
    .eq('user_id', userData.user.id)
    .single()

  if (error) throw error
  return data
}

export async function getEquipmentOptions() {
  return getAllRows(
    'equipment',
    'plate',
    'equipment_id, plate, equipment_code, brand, model, description, active',
    (query) => query.eq('active', true),
  )
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

export async function updateTireLifecycleRecord(lifecycleId, payload) {
  const clean = {
    started_at: payload.started_at ? new Date(payload.started_at).toISOString() : null,
    ended_at: nullableDate(payload.ended_at),
    initial_depth_mm: nullableNumber(payload.initial_depth_mm),
    final_depth_mm: nullableNumber(payload.final_depth_mm),
  }

  const { error } = await supabase
    .from('tire_lifecycle')
    .update(clean)
    .eq('lifecycle_id', lifecycleId)

  if (error) throw error
}

export async function updateTireAssignmentRecord(assignmentId, payload) {
  const clean = {
    equipment_id: payload.equipment_id,
    position: Number(payload.position),
    installed_at: payload.installed_at ? new Date(payload.installed_at).toISOString() : null,
    install_hr: nullableNumber(payload.install_hr),
    install_km: nullableNumber(payload.install_km),
    removed_at: nullableDate(payload.removed_at),
    remove_hr: nullableNumber(payload.remove_hr),
    remove_km: nullableNumber(payload.remove_km),
  }

  const { error } = await supabase
    .from('tire_assignment')
    .update(clean)
    .eq('assignment_id', assignmentId)

  if (error) throw error
}

export async function updateTireMeasurementRecord(measurementId, payload) {
  const { data, error } = await supabase.rpc('admin_update_measurement_record', {
    p_tire_measurement_id: measurementId,
    p_equipment_id: payload.equipment_id,
    p_measured_at: payload.measured_at ? new Date(payload.measured_at).toISOString() : null,
    p_hr: nullableNumber(payload.hr),
    p_km: nullableNumber(payload.km),
    p_fueling_date: nullableDate(payload.fueling_date),
    p_position: Number(payload.position),
    p_remaining_depth_mm: nullableNumber(payload.remaining_depth_mm),
  })

  if (error) throw error
  return data
}
