/**
 * Supabase client — Singleton instance used across the app for
 * database queries, authentication, and storage.
 * Reads credentials from VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    redirectTo: window.location.origin,
  },
})
