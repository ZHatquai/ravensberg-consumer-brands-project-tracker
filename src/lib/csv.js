// CSV export of the register as filtered on screen (spec §3). Built in the browser from the same rows the register shows.
import { siteById, profileById } from './data.js'
import { isoDate } from './format.js'

export const CSV_COLUMNS = [
  'Project ID',
  'Title',
  'Category',
  'Scope',
  'Site code',
  'Site name',
  'Description',
  'Total impact',
  'Annual impact',
  'Unit',
  'Start year',
  'Capex (EUR)',
  'Opex (EUR per year)',
  'Owner name',
  'Status',
  'Version',
  'Submitted by',
  'Submitted on',
  'Last decision stage',
  'Last decision outcome',
  'Last decision date',
  'Last decision comment',
]

export function csvRows(rows) {
  return rows.map((p) => {
    const site = p.site_id ? siteById[p.site_id] : null
    const d = p.lastDecision
    return [
      p.project_code,
      p.title,
      p.category,
      p.scope,
      site?.code || '',
      site?.name || 'Group',
      p.description,
      p.total_impact,
      p.annual_impact,
      p.unit,
      p.start_year,
      p.capex_eur,
      p.opex_eur_per_year,
      p.owner_name,
      p.status,
      p.version,
      profileById[p.created_by]?.name || '',
      String(p.created_at).slice(0, 10),
      d?.stage || '',
      d?.outcome || '',
      d?.decision_date || '',
      d?.comment || '',
    ]
  })
}

function cell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header, rows) {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** ravensberg-projects-<filter>-<YYYY-MM-DD>.csv where <filter> names the year, the site and any category or status filter. */
export function csvFileName({ year, siteId, category, status }, today = new Date()) {
  const parts = [String(year), siteId ? siteById[siteId]?.code || 'site' : 'group']
  if (category) parts.push(slug(category))
  if (status) parts.push(slug(status))
  return `ravensberg-projects-${parts.join('-')}-${isoDate(today)}.csv`
}

export function downloadBlob(fileName, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadCsv(fileName, text) {
  downloadBlob(fileName, new Blob([text], { type: 'text/csv;charset=utf-8' }))
}
