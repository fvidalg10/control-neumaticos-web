import { supabase } from '../lib/supabaseClient.js'

export async function getTireAlerts() {
  const { data, error } = await supabase
    .from('tire_alerts')
    .select('*')
    .order('plate', { ascending: true })
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getTireAlertConfig() {
  const { data, error } = await supabase
    .from('tire_alert_config')
    .select('*')
    .eq('config_key', 'DEFAULT')
    .single()

  if (error) throw error
  return data
}
