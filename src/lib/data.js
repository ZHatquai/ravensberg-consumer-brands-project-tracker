// FIXTURE DATA. Every screen reads these local JSON files, shaped exactly like the database tables, and reads no table.
// The switch to the real rows happens in the access phase, together with the login and the row rules (CLAUDE.md).
import sites from '../fixtures/sites.json'
import profiles from '../fixtures/profiles.json'
import targets from '../fixtures/targets.json'
import referenceFigures from '../fixtures/reference_figures.json'
import projects from '../fixtures/projects.json'
import decisions from '../fixtures/decisions.json'
import history from '../fixtures/project_history.json'
import { indexBy } from './calculations.js'

export const data = { sites, profiles, targets, referenceFigures, projects, decisions, history }
export const siteById = indexBy(sites)
export const profileById = indexBy(profiles)
export const targetByCategory = indexBy(targets, 'category')
export const sitesSorted = [...sites].sort((a, b) => a.code.localeCompare(b.code))

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
