// Supabase client for the access phase. NOTHING calls this today: every screen reads its fixture file
// (src/fixtures/*.json) until docs/access-matrix.md carries the named roles and the login is built with the rules.
// The browser key is the publishable key (sb_publishable_…), written into Netlify by the Supabase extension; RLS protects the data.
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
  client = createClient(url, key)
  return client
}
