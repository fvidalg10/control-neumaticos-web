import { supabase } from '../lib/supabaseClient'

export async function adminUserAction(body) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) throw new Error(error.message || 'No se pudo completar la operación.')
  if (data?.error) throw new Error(data.error)
  return data
}
