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

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
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

export async function updateTireMeasurementRecord(measurementId, payload) {
  const nks = nullableNumber(payload.remaining_depth_mm)

  if (nks === null || nks < 0) {
    throw new Error('El NKS debe ser mayor o igual a 0.')
  }

  const { data, error } = await supabase.rpc('admin_update_measurement_record', {
    p_tire_measurement_id: measurementId,
    p_hr: nullableNumber(payload.hr),
    p_km: nullableNumber(payload.km),
    p_remaining_depth_mm: nks,
  })

  if (error) throw error
  return data
}
