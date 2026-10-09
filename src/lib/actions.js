// Every action a screen can take, in one place. Each one is a narrow function (RPC) or a plain write the policies
// allow; the database refuses anything else, whatever the screen shows. Every action returns after the data store
// has been reloaded, so the screens recalculate.
import { getSupabase, errorMessage } from './supabase.js'
import { reload } from './data.js'

async function rpc(name, args) {
  const { data, error } = await getSupabase().rpc(name, args)
  if (error) throw new Error(errorMessage(error))
  await reload()
  return data
}

export const endorseProject = (id, comment) => rpc('endorse_project', { p_project: id, p_comment: comment })
export const declineProject = (id, comment) => rpc('decline_project', { p_project: id, p_comment: comment })
export const recordCommitteeDecision = (id, outcome, comment, attendees, decisionDate) =>
  rpc('record_committee_decision', { p_project: id, p_outcome: outcome, p_comment: comment, p_attendees: attendees, p_decision_date: decisionDate })
export const markProjectObsolete = (id, comment) => rpc('mark_project_obsolete', { p_project: id, p_comment: comment })
export const reapproveProject = (id, comment) => rpc('reapprove_project', { p_project: id, p_comment: comment })
export const resubmitProject = (id) => rpc('resubmit_project', { p_project: id })
export const retireProject = (id, comment) => rpc('retire_project', { p_project: id, p_comment: comment })
export const reinstateProject = (id, comment) => rpc('reinstate_project', { p_project: id, p_comment: comment })
export const editProjectFigures = (id, changes, comment) => rpc('edit_project_figures', { p_project: id, p_changes: changes, p_comment: comment })
export const anonymisePerson = (profileId, name) => rpc('anonymise_person', { p_profile: profileId, p_name: name })

/** A new project: a plain insert the policy allows (own site for a site user, group for the ESG lead). Returns the row. */
export async function createProject(fields) {
  const { data, error } = await getSupabase().from('projects').insert(fields).select('*').single()
  if (error) throw new Error(errorMessage(error))
  await reload()
  return data
}

/** A content edit while Potential: a plain update the policy allows; the trigger refuses every protected column. */
export async function updateProject(id, fields) {
  const { data, error } = await getSupabase().from('projects').update(fields).eq('id', id).select('*').single()
  if (error) throw new Error(errorMessage(error))
  await reload()
  return data
}

/** A reference figure row: insert when new, update when it exists (one row per site, year and kind). */
export async function saveReferenceFigure(existingId, fields) {
  const sb = getSupabase()
  const q = existingId ? sb.from('reference_figures').update(fields).eq('id', existingId) : sb.from('reference_figures').insert(fields)
  const { data, error } = await q.select('*').single()
  if (error) throw new Error(errorMessage(error))
  await reload()
  return data
}

export async function updateTarget(id, fields) {
  const { data, error } = await getSupabase().from('targets').update(fields).eq('id', id).select('*').single()
  if (error) throw new Error(errorMessage(error))
  await reload()
  return data
}

export async function saveSite(existingId, fields) {
  const sb = getSupabase()
  const q = existingId ? sb.from('sites').update(fields).eq('id', existingId) : sb.from('sites').insert(fields)
  const { data, error } = await q.select('*').single()
  if (error) throw new Error(errorMessage(error))
  await reload()
  return data
}

/** The admin function with the secret key: create, update (role, site) or retire a user. Never the caller's own row. */
export async function adminUsers(action, payload) {
  const { data: sessionData } = await getSupabase().auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) throw new Error('Not signed in.')
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  let body = {}
  try {
    body = await res.json()
  } catch {
    /* no body */
  }
  if (!res.ok) throw new Error(body.error || `The admin function failed (${res.status}).`)
  await reload()
  return body
}
