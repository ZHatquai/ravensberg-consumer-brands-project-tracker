// The rows the signed-in person may read, loaded from Supabase into one store shaped exactly like the fixture files were.
// RLS decides which rows come back: a site user receives their site, the CFO and the ESG lead everything. The screens,
// the calculations, the CSV and the review pack read this store; `reload()` refreshes it after every action.
import { getSupabase } from './supabase.js'
import { indexBy } from './calculations.js'

export const data = { sites: [], profiles: [], targets: [], referenceFigures: [], referenceFiguresHistory: [], projects: [], decisions: [], history: [] }
export const siteById = {}
export const profileById = {}
export const targetByCategory = {}
export const sitesSorted = []

const listeners = new Set()
/** Called after every successful reload (an action, a refresh); the app state bumps its version so every screen recalculates. */
export function onReload(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

const TABLES = [
  ['sites', 'sites', 'code'],
  ['profiles', 'profiles', 'name'],
  ['targets', 'targets', 'category'],
  ['reference_figures', 'referenceFigures', 'year'],
  ['reference_figures_history', 'referenceFiguresHistory', 'changed_at'],
  ['projects', 'projects', 'created_at'],
  ['decisions', 'decisions', 'decision_date'],
  ['project_history', 'history', 'changed_at'],
]

function refill(target, rows) {
  target.length = 0
  for (const r of rows) target.push(r)
}
function reindex(target, rows, key = 'id') {
  for (const k of Object.keys(target)) delete target[k]
  Object.assign(target, indexBy(rows, key))
}

/** Loads every table the caller may read. Throws with the first error; nothing is half-loaded on failure. */
export async function reload() {
  const sb = getSupabase()
  const results = await Promise.all(
    TABLES.map(([table, , order]) => sb.from(table).select('*').order(order, { ascending: true }).limit(5000)),
  )
  const failed = results.find((r) => r.error)
  if (failed) throw failed.error
  TABLES.forEach(([, key], i) => refill(data[key], results[i].data || []))
  reindex(siteById, data.sites)
  reindex(profileById, data.profiles)
  reindex(targetByCategory, data.targets, 'category')
  refill(sitesSorted, [...data.sites].sort((a, b) => a.code.localeCompare(b.code)))
  for (const fn of listeners) fn()
  return data
}

export function siteLabel(siteId) {
  const s = siteById[siteId]
  return s ? `${s.code} ${s.name}` : 'Group'
}
export function siteShort(siteId) {
  const s = siteById[siteId]
  return s ? `${s.code} ${s.name.replace(/^Werk /, '').replace(/^Logistikzentrum /, 'LZ ')}` : 'Group'
}
export function personName(profileId) {
  return profileById[profileId]?.name || '–'
}
