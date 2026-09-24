import { supabase } from '../lib/supabaseClient.js'

export async function getTiresOverview() {
  const { data, error } = await supabase
    .from('tire_overview')
    .select('*')
    .order('code', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createTire(payload) {
  const { data, error } = await supabase.rpc('create_tire_with_lifecycle', {
    p_code: payload.code,
    p_dot: payload.dot || null,
    p_size: payload.size || null,
    p_brand: payload.brand || null,
    p_model: payload.model || null,
    p_project: payload.project || null,
    p_tire_type: payload.tire_type || null,
    p_location_state: payload.location_state || null,
    p_status: payload.status || 'STOCK',
    p_cycle_type: payload.cycle_type || 'O',
    p_started_at: payload.started_at || new Date().toISOString(),
    p_initial_depth_mm:
      payload.initial_depth_mm === '' || payload.initial_depth_mm == null
        ? null
        : Number(payload.initial_depth_mm),
  })

  if (error) throw error
  return data
}

export async function updateTire(tireId, payload) {
  const clean = {
    code: payload.code?.trim().toUpperCase(),
    dot: payload.dot?.trim().toUpperCase() || null,
    size: payload.size?.trim().toUpperCase() || null,
    brand: payload.brand?.trim().toUpperCase() || null,
    model: payload.model?.trim().toUpperCase() || null,
    project: payload.project?.trim().toUpperCase() || null,
    tire_type: payload.tire_type?.trim().toUpperCase() || null,
    location_state: payload.location_state?.trim().toUpperCase() || null,
    status: payload.status?.trim().toUpperCase() || 'STOCK',
    active: Boolean(payload.active),
  }

  const { error } = await supabase
    .from('tires')
    .update(clean)
    .eq('tire_id', tireId)

  if (error) throw error
}

export async function advanceTireLifecycle(tireId, payload) {
  const { data, error } = await supabase.rpc('advance_tire_lifecycle', {
    p_tire_id: tireId,
    p_started_at: payload.started_at || new Date().toISOString(),
    p_final_depth_mm:
      payload.final_depth_mm === '' || payload.final_depth_mm == null
        ? null
        : Number(payload.final_depth_mm),
    p_new_initial_depth_mm:
      payload.new_initial_depth_mm === '' || payload.new_initial_depth_mm == null
        ? null
        : Number(payload.new_initial_depth_mm),
  })

  if (error) throw error
  return data
}
