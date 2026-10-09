// The Supabase client for the browser: the project URL and the publishable key (sb_publishable_…), both written into
// Netlify by the Supabase extension and baked in by Vite at build time. RLS and the narrow functions decide what the
// signed-in person may read or change; the key itself grants nothing.
import { createClient } from '@supabase/supabase-js'

let client = null

export function getSupabase() {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase variables are missing. They are written by the Supabase extension in the Netlify dashboard (site → Connect); redeploy after connecting.',
    )
  }
  if (!key.startsWith('sb_')) {
    console.warn('VITE_SUPABASE_ANON_KEY is not a publishable key (sb_publishable_…). Replace the legacy value in the Netlify dashboard.')
  }
  client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  return client
}

/** Turns a PostgREST or RPC error into one plain sentence for the screen. */
export function errorMessage(error) {
  if (!error) return 'Something went wrong.'
  const m = error.message || String(error)
  if (/row-level security|permission denied|42501/i.test(m)) return m.replace(/^.*?:\s*/, '') || 'Refused by the access rules.'
  return m
}
