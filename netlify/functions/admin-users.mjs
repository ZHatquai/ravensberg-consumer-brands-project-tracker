// admin-users: the one path that creates, changes or retires a user. It holds the secret key, which bypasses RLS,
// so for this path the function is the rule (CLAUDE.md Hard Rules; docs/access-matrix.md §6 line 38):
//   1. the caller's session must belong to an active ESG lead, checked before anything else;
//   2. one change per call: create (login identity and profile together), update (role, site), retire (comment);
//   3. never the caller's own row; every input validated; only the profile fields the Users screen shows are returned.
// Deactivation = profiles.retired_at + the login banned; nothing is ever deleted.
import { createClient } from '@supabase/supabase-js'

const ROLES = ['site_user', 'esg_lead', 'cfo']
const FIELDS = 'id, email, name, role, site_id, retired_at, retired_comment, created_at, updated_at'
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  const url = process.env.VITE_SUPABASE_DATABASE_URL || process.env.VITE_SUPABASE_URL // the project URL, as the extension writes it
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !secret) return json(500, { error: 'The admin function is not configured (Supabase variables missing).' })
  if (!/^https:\/\//.test(url)) return json(500, { error: 'VITE_SUPABASE_DATABASE_URL is not the project URL.' })

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'Not signed in.' })

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })

  // 1. who is calling: an active ESG lead, or nothing happens
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) return json(401, { error: 'Not signed in.' })
  const { data: caller } = await admin.from('profiles').select(FIELDS).eq('auth_user_id', userData.user.id).is('retired_at', null).maybeSingle()
  if (!caller || caller.role !== 'esg_lead') return json(403, { error: 'ESG lead only.' })

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid request body.' })
  }
  const action = String(body?.action || '')
  if (!['create', 'update', 'retire'].includes(action)) return json(400, { error: 'Unknown action.' })

  // 2. the one change
  if (action === 'create') {
    const email = String(body.email || '').trim().toLowerCase()
    const name = String(body.name || '').trim()
    const role = String(body.role || '')
    const siteId = body.site_id ? String(body.site_id) : null
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'A valid email is required.' })
    if (!name) return json(400, { error: 'A name is required.' })
    if (!ROLES.includes(role)) return json(400, { error: 'Role must be site_user, esg_lead or cfo.' })
    if ((role === 'site_user') !== Boolean(siteId)) return json(400, { error: 'A site user needs a site; the other roles have none.' })
    if (siteId) {
      const { data: site } = await admin.from('sites').select('id, active').eq('id', siteId).maybeSingle()
      if (!site || site.active === false) return json(400, { error: 'Choose an active site.' })
    }
    const { data: existing } = await admin.from('profiles').select(FIELDS + ', auth_user_id').eq('email', email).maybeSingle()
    let profile = null
    if (existing) {
      // a seeded or earlier profile without a login (the demo seed, or a failed identity step): give it its login identity, change nothing else
      if (existing.retired_at) return json(409, { error: 'This email belongs to a retired user.' })
      if (existing.auth_user_id) return json(409, { error: 'A user with this email already exists and has a login.' })
      if (existing.role !== role || (existing.site_id || null) !== siteId) return json(409, { error: `${existing.name} already exists as ${existing.role}${existing.site_id ? ' of their site' : ''}: create the login with the same role and site, then change it.` })
      profile = existing
    } else {
      const { data: inserted, error: profileError } = await admin.from('profiles').insert({ email, name, role, site_id: siteId }).select(FIELDS).single()
      if (profileError) return json(400, { error: profileError.message })
      profile = inserted
    }
    // the login identity: created confirmed, no password; the link trigger sets profiles.auth_user_id by email
    const { error: authError } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { name: profile.name } })
    if (authError && !/already/i.test(authError.message)) return json(400, { error: `Profile saved, but the login identity failed: ${authError.message}` })
    const { data: linked } = await admin.from('profiles').select(FIELDS).eq('id', profile.id).single()
    return json(200, { profile: linked || profile })
  }

  const id = String(body.id || '')
  if (!id) return json(400, { error: 'A user id is required.' })
  // 3. never the caller's own row
  if (id === caller.id) return json(403, { error: 'You cannot change your own role, site or active state.' })
  const { data: target } = await admin.from('profiles').select(FIELDS + ', auth_user_id').eq('id', id).maybeSingle()
  if (!target) return json(404, { error: 'User not found.' })

  if (action === 'update') {
    const role = String(body.role || target.role)
    const siteId = body.site_id === undefined ? target.site_id : body.site_id ? String(body.site_id) : null
    if (!ROLES.includes(role)) return json(400, { error: 'Role must be site_user, esg_lead or cfo.' })
    if ((role === 'site_user') !== Boolean(siteId)) return json(400, { error: 'A site user needs a site; the other roles have none.' })
    if (target.retired_at) return json(400, { error: 'A retired user is not changed.' })
    if (siteId) {
      const { data: site } = await admin.from('sites').select('id, active').eq('id', siteId).maybeSingle()
      if (!site || site.active === false) return json(400, { error: 'Choose an active site.' })
    }
    const { data: profile, error } = await admin.from('profiles').update({ role, site_id: siteId }).eq('id', id).select(FIELDS).single()
    if (error) return json(400, { error: error.message })
    return json(200, { profile })
  }

  if (action === 'retire') {
    const comment = String(body.comment || '').trim()
    if (!comment) return json(400, { error: 'A comment is required to retire a user.' })
    if (target.retired_at) return json(400, { error: 'Already retired.' })
    const { data: profile, error } = await admin.from('profiles').update({ retired_at: new Date().toISOString(), retired_comment: comment }).eq('id', id).select(FIELDS).single()
    if (error) return json(400, { error: error.message })
    if (target.auth_user_id) {
      const { error: banError } = await admin.auth.admin.updateUserById(target.auth_user_id, { ban_duration: '876000h' })
      if (banError) return json(200, { profile, warning: `Profile retired; the login could not be banned: ${banError.message}. The policies refuse a retired profile regardless.` })
    }
    return json(200, { profile })
  }
  return json(400, { error: 'Unknown action.' })
}

// Served at /.netlify/functions/admin-users; netlify.toml maps /api/admin-users to it ahead of the SPA rule.
