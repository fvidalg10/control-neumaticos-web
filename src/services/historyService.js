import { supabase } from '../lib/supabaseClient.js'

export async function getHistoryTires() {
  const { data, error } = await supabase
    .from('tire_overview')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data ?? []
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
