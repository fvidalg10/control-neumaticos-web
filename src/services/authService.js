import { supabase } from '../lib/supabaseClient'

export async function signInWithIdentifier(identifier, password) {
  const value = identifier.trim()

  if (value.includes('@')) {
    const { error } = await supabase.auth.signInWithPassword({
      email: value.toLowerCase(),
      password,
    })
    if (error) throw error
    return
  }

  if (!/^\d{8}$/.test(value)) {
    throw new Error('Ingresa un correo válido o un DNI de 8 dígitos.')
  }

  const { data, error } = await supabase.functions.invoke('login-by-dni', {
    body: { dni: value, password },
  })

  if (error || !data?.access_token || !data?.refresh_token) {
    throw new Error(data?.error || 'Credenciales inválidas.')
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  })

  if (sessionError) throw sessionError
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return () => data.subscription.unsubscribe()
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id,dni,full_name,email,role,active')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}
