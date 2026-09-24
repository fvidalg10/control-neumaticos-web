import { supabase } from '../lib/supabaseClient'

export async function fetchEquipmentModuleData() {
  const [equipmentResult, tireResult] = await Promise.all([
    supabase
      .from('equipment')
      .select('equipment_id,plate,equipment_code,description,brand,model,configuration,active,created_at')
      .order('plate'),
    supabase
      .from('current_tire_status')
      .select('*')
      .order('plate')
      .order('position'),
  ])

  return {
    equipmentData: equipmentResult.data || [],
    equipmentError: equipmentResult.error,
    tireData: tireResult.data || [],
    tireError: tireResult.error,
  }
}

export async function createEquipmentRecord(payload) {
  const { data, error } = await supabase
    .from('equipment')
    .insert(payload)
    .select('equipment_id')
    .single()

  if (error) throw error
  return data
}

export async function updateEquipmentRecord(equipmentId, payload) {
  const { error } = await supabase
    .from('equipment')
    .update(payload)
    .eq('equipment_id', equipmentId)

  if (error) throw error
}

export async function setEquipmentActive(equipmentId, active) {
  const { error } = await supabase
    .from('equipment')
    .update({ active })
    .eq('equipment_id', equipmentId)

  if (error) throw error
}
