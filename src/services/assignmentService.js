import { supabase } from '../lib/supabaseClient.js'

export async function getAssignmentEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('equipment_id,plate,description,brand,model,configuration,active')
    .eq('active', true)
    .order('plate', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getEquipmentPositions(equipmentId) {
  const { data, error } = await supabase
    .from('equipment_tire_positions')
    .select('*')
    .eq('equipment_id', equipmentId)
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getAvailableTires() {
  const { data, error } = await supabase
    .from('tire_overview')
    .select('*')
    .eq('active', true)
    .is('assignment_id', null)
    .neq('status', 'SCRAP')
    .order('code', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function assignTireToPosition(payload) {
  const { data, error } = await supabase.rpc('assign_tire_to_position', {
    p_tire_id: payload.tire_id,
    p_equipment_id: payload.equipment_id,
    p_position: Number(payload.position),
    p_installed_at: payload.installed_at
      ? new Date(payload.installed_at).toISOString()
      : new Date().toISOString(),
    p_install_hr:
      payload.install_hr === '' || payload.install_hr == null
        ? null
        : Number(payload.install_hr),
    p_install_km:
      payload.install_km === '' || payload.install_km == null
        ? null
        : Number(payload.install_km),
  })

  if (error) throw error
  return data
}

export async function removeTireFromPosition(payload) {
  const { data, error } = await supabase.rpc('remove_tire_from_position', {
    p_assignment_id: payload.assignment_id,
    p_removed_at: payload.removed_at
      ? new Date(payload.removed_at).toISOString()
      : new Date().toISOString(),
    p_remove_hr:
      payload.remove_hr === '' || payload.remove_hr == null
        ? null
        : Number(payload.remove_hr),
    p_remove_km:
      payload.remove_km === '' || payload.remove_km == null
        ? null
        : Number(payload.remove_km),
    p_location_state: payload.location_state || 'ALMACEN',
  })

  if (error) throw error
  return data
}
