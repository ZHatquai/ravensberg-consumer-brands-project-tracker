// Number, date and text formatting. English, thousands separators, tabular numbers come from the CSS.
const int = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })
const one = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const two = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function fmtInt(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '–'
  return int.format(Number(n))
}
export function fmtNum(n, decimals = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '–'
  return (decimals === 2 ? two : decimals === 1 ? one : int).format(Number(n))
}
export function fmtPct(x, decimals = 0) {
  if (x === null || x === undefined || Number.isNaN(Number(x))) return '–'
  return `${fmtNum(Number(x) * 100, decimals)} %`
}
export function fmtEur(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '–'
  const v = Number(n)
  return `${v < 0 ? '−' : ''}€ ${int.format(Math.abs(v))}`
}
export function fmtDate(iso) {
  if (!iso) return '–'
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
export function fmtDateTime(iso) {
  if (!iso) return '–'
  const d = new Date(iso)
  return `${fmtDate(iso)}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`
}
export function isoDate(d) {
  return d.toISOString().slice(0, 10)
}
export function signed(n, unit) {
  const v = Number(n)
  return `${v >= 0 ? '+' : '−'}${fmtInt(Math.abs(v))}${unit ? ' ' + unit : ''}`
}
export const ROLE_LABEL = { site_user: 'Site user', esg_lead: 'ESG lead', cfo: 'CFO' }
export const STATUS_DOT = {
  Potential: 'rb-dot--neutral',
  'Pending approval': 'rb-dot--attention',
  Approved: 'rb-dot--ok',
  Declined: 'rb-dot--problem',
  Retired: 'rb-dot--closed',
  Obsolete: 'rb-dot--closed',
}
export const STAGE_LABEL = { endorsement: 'Endorsement', committee: 'Committee', decline: 'Decline', obsolete: 'Obsolete' }
export const FIELD_LABEL = {
  created: 'Created',
  title: 'Title',
  category: 'Category',
  scope: 'Scope',
  site_id: 'Site',
  description: 'Description',
  total_impact: 'Total impact',
  annual_impact: 'Annual impact',
  unit: 'Unit',
  start_year: 'Start year',
  capex_eur: 'Capex (EUR)',
  opex_eur_per_year: 'Opex (EUR per year)',
  owner_name: 'Owner',
  status: 'Status',
  version: 'Version',
  supersedes_project_id: 'Supersedes',
}
