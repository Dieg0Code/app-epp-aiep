import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // Mensaje claro en consola para no perder tiempo si falta configurar .env.local
  console.error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env.local y completa tus credenciales de Supabase.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')

export const supabaseConfigurado = Boolean(url && anonKey)
