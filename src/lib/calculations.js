// Spec §9 calculations as pure functions over rows shaped like the database tables.
// Nothing here reads a table or touches the network: the screens pass in fixture rows today and real rows in the access phase.
// Every figure the Overview, the register and the review pack show comes from here, so the three never disagree.

export const BASE_YEAR = 2024
export const TARGET_YEAR = 2030
export const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030]
export const FACTOR_SET = 'FY2024 factor set, frozen; location-based'
export const CATEGORIES = ['Emissions', 'Water', 'Waste']
export const STATUSES = ['Potential', 'Pending approval', 'Approved', 'Declined', 'Retired', 'Obsolete']
export const COUNTED_STATUSES = ['Potential', 'Pending approval', 'Approved', 'Declined']
export const CLOSED_STATUSES = ['Retired', 'Obsolete']
export const UNIT_BY_CATEGORY = {
  Emissions: 'tCO₂e per year',
  Water: 'm³ per year',
  Waste: 'tonnes diverted per year',
}
export const PALLET_SITE_CODE = '1100' // Logistikzentrum Bad Oeynhausen reports pallets handled, not tonnes (spec §9)

const sum = (list, f) => list.reduce((acc, x) => acc + (f ? f(x) : x), 0)
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

// ---------- time

export function yearEnd(year) {
  return new Date(Date.UTC(year, 11, 31, 23, 59, 59))
}

/** The "as of" moment for a reporting year: the end of that year, or now for the current year. */
export function asOfForYear(year, now = new Date()) {
  const end = yearEnd(year)
  return end < now ? end : now
}

export function daysBetween(fromIso, toDate) {
  const from = new Date(fromIso)
  return Math.max(0, Math.floor((toDate - from) / 86400000))
}

// ---------- indexes

export function groupBy(rows, key) {
  const out = {}
  for (const r of rows) {
    const k = r[key]
    ;(out[k] ||= []).push(r)
  }
  return out
}

export function indexBy(rows, key = 'id') {
  const out = {}
  for (const r of rows) out[r[key]] = r
  return out
}

// ---------- the portfolio as of a date

/** A project's status as of a moment, rebuilt from its history rows on the status field. Null when not yet registered. */
export function statusAsOf(project, historyRows, asOf) {
  if (new Date(project.created_at) > asOf) return null
  let status = 'Potential'
  let latest = null
  for (const h of historyRows || []) {
    if (h.field !== 'status') continue
    const t = new Date(h.changed_at)
    if (t > asOf) continue
    if (!latest || t >= latest) {
      latest = t
      status = h.new_value
    }
  }
  return status
}

/**
 * The projects visible as of a moment, each with the status it had then.
 * `historyByProject` is groupBy(project_history, 'project_id').
 */
export function snapshot(projects, historyByProject, asOf) {
  const out = []
  for (const p of projects) {
    const status = statusAsOf(p, historyByProject[p.id], asOf)
    if (status) out.push({ ...p, status })
  }
  return out
}

/** Current versions only: a version that another visible version supersedes is dropped (it stays in the register, linked). */
export function currentVersions(snapshotRows) {
  const superseded = new Set(snapshotRows.map((p) => p.supersedes_project_id).filter(Boolean))
  return snapshotRows.filter((p) => !superseded.has(p.id))
}

/** The rows a viewer scope sees: a site sees its own site projects only; the group sees everything. */
export function inScope(rows, siteId) {
  return siteId ? rows.filter((p) => p.site_id === siteId) : rows
}

// ---------- counts

export function statusCounts(currentRows) {
  const out = {}
  for (const c of CATEGORIES) {
    out[c] = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    out[c].total = 0
  }
  for (const p of currentRows) {
    if (!out[p.category]) continue
    out[p.category][p.status] += 1
    out[p.category].total += 1
  }
  return out
}

export function kpis(currentRows) {
  const by = (s) => currentRows.filter((p) => p.status === s)
  return {
    registered: currentRows.length,
    approved: by('Approved').length,
    pending: by('Pending approval').length,
    declined: by('Declined').length,
    approvedTco2e: sum(
      by('Approved').filter((p) => p.category === 'Emissions' && p.start_year <= TARGET_YEAR),
      (p) => Number(p.annual_impact),
    ),
  }
}

/** Days waiting: Potential since submission; Pending approval since endorsement. Null otherwise. */
export function daysWaiting(project, decisionRows, asOf) {
  if (project.status === 'Potential') return daysBetween(project.created_at, asOf)
  if (project.status === 'Pending approval') {
    const endorsements = (decisionRows || [])
      .filter((d) => d.stage === 'endorsement' && new Date(d.decision_date) <= asOf)
      .sort((a, b) => (a.decision_date < b.decision_date ? 1 : -1))
    return daysBetween(endorsements[0]?.decision_date || project.created_at, asOf)
  }
  return null
}

export function lastDecision(decisionRows, asOf) {
  const rows = (decisionRows || []).filter((d) => new Date(d.recorded_at || d.decision_date) <= asOf)
  rows.sort((a, b) => (a.decision_date === b.decision_date ? (a.recorded_at < b.recorded_at ? 1 : -1) : a.decision_date < b.decision_date ? 1 : -1))
  return rows[0] || null
}

const STATUS_ORDER = { 'Pending approval': 0, Potential: 1, Approved: 2, Declined: 3, Retired: 4, Obsolete: 5 }

/** Register order: Pending approval first (longest waiting on top), then Potential, then the rest, newest submission first. */
export function sortRegister(rows) {
  return [...rows].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    if (s !== 0) return s
    if (a.status === 'Pending approval' || a.status === 'Potential') {
      const d = (b.daysWaiting ?? 0) - (a.daysWaiting ?? 0)
      if (d !== 0) return d
    }
    return a.created_at < b.created_at ? 1 : -1
  })
}

// ---------- reference figures

export function figure(refRows, siteId, year, kind) {
  return refRows.find((r) => r.site_id === siteId && r.year === year && r.kind === kind && r.status !== 'void') || null
}

export function latestActual(refRows, siteId, hasFields) {
  const rows = refRows
    .filter((r) => r.site_id === siteId && r.kind === 'actual' && r.status !== 'void' && hasFields(r))
    .sort((a, b) => b.year - a.year)
  return rows[0] || null
}

/** Output per year, interpolated straight-line from FY2024 to the planned 2030 output; flat and labelled estimate without a plan. */
export function outputPath(refRows, siteId) {
  const base = num(figure(refRows, siteId, BASE_YEAR, 'actual')?.output_t)
  const plan = num(figure(refRows, siteId, TARGET_YEAR, 'plan')?.output_t)
  if (base === null) return null
  const end = plan === null ? base : plan
  const estimate = plan === null
  const byYear = {}
  for (const y of YEARS) byYear[y] = base + ((end - base) * (y - BASE_YEAR)) / (TARGET_YEAR - BASE_YEAR)
  return { base, plan, estimate, byYear }
}

// ---------- shared helpers for a target calculation

function activeIn(list, year) {
  return sum(
    list.filter((p) => p.start_year <= year),
    (p) => Number(p.annual_impact),
  )
}

/** Which projects of a category count for a scope: the site's own site projects, or (group) site projects of included sites plus group projects. */
function eligible(rows, category, siteId, includedSiteIds) {
  return rows.filter((p) => {
    if (p.category !== category) return false
    if (siteId) return p.scope === 'site' && p.site_id === siteId
    return p.scope === 'group' || includedSiteIds.has(p.site_id)
  })
}

function reductionTarget({ sites, refRows, rows, siteId, pct, category, field, siteById }) {
  const siteRows = siteId ? sites.filter((s) => s.id === siteId) : sites.filter((s) => s.active !== false)
  const bases = siteRows.map((s) => ({ site: s, base: num(figure(refRows, s.id, BASE_YEAR, 'actual')?.[field]) }))
  const missing = bases.filter((b) => b.base === null).map((b) => b.site)
  const included = bases.filter((b) => b.base !== null)
  const includedIds = new Set(included.map((b) => b.site.id))
  const base = sum(included, (b) => b.base)
  const required = pct * base
  const counted = eligible(rows, category, siteId, includedIds)
  const approved = counted.filter((p) => p.status === 'Approved')
  const pending = counted.filter((p) => p.status === 'Pending approval')
  const covered = activeIn(approved, TARGET_YEAR)
  const ifApproved = activeIn(pending, TARGET_YEAR)
  const uncovered = Math.max(0, required - covered - ifApproved)
  const surplus = Math.max(0, covered - required)
  const pathway = YEARS.map((y) => ({
    year: y,
    target: base - (required * (y - BASE_YEAR)) / (TARGET_YEAR - BASE_YEAR),
    approved: base - activeIn(approved, y),
    approvedPending: base - activeIn(approved, y) - activeIn(pending, y),
  }))

  // bridge: base, one bar per approved lever (per site for the group view, per project for a site view), projected 2030, pending, gap, target
  let levers
  if (siteId) {
    levers = approved
      .filter((p) => p.start_year <= TARGET_YEAR)
      .map((p) => ({ label: `${p.project_code} ${p.title}`, value: Number(p.annual_impact), key: p.id }))
  } else {
    const bySite = {}
    let group = 0
    for (const p of approved) {
      if (p.start_year > TARGET_YEAR) continue
      if (p.scope === 'group') group += Number(p.annual_impact)
      else bySite[p.site_id] = (bySite[p.site_id] || 0) + Number(p.annual_impact)
    }
    levers = Object.entries(bySite).map(([id, v]) => ({ label: siteById[id] ? `${siteById[id].code} ${siteById[id].name}` : id, value: v, key: id }))
    levers.sort((a, b) => b.value - a.value)
    if (group > 0) levers.push({ label: 'Group projects', short: 'Group', value: group, key: 'group' })
  }
  const bridge = [
    { kind: 'base', label: `FY${BASE_YEAR}`, value: base },
    ...levers.map((l) => ({ kind: 'lever', label: l.label, short: l.short, value: -l.value, key: l.key })),
    { kind: 'projected', label: 'Projected 2030', value: base - covered },
    { kind: 'pending', label: 'Pending, if approved', value: -ifApproved },
    { kind: 'gap', label: 'Gap', value: -uncovered },
    { kind: 'target', label: 'Target 2030', value: base - required },
  ]
  return { base, required, covered, ifApproved, uncovered, surplus, missing, included: included.map((b) => b.site), pathway, bridge, approved, pending, pct }
}

// ---------- emissions

export function emissions(ctx) {
  const pct = Number(ctx.targets.emissions?.value ?? 42) / 100
  return { ...reductionTarget({ ...ctx, pct, category: 'Emissions', field: 'scope12_tco2e' }), unit: 'tCO₂e per year', factorSet: FACTOR_SET }
}

// ---------- water, absolute

export function waterAbsolute(ctx) {
  const pct = Number(ctx.targets.water_absolute?.value ?? 10) / 100
  return { ...reductionTarget({ ...ctx, pct, category: 'Water', field: 'water_withdrawal_m3' }), unit: 'm³ per year' }
}

// ---------- water, intensity

export function waterIntensity(ctx) {
  const { sites, refRows, rows, siteId } = ctx
  const pct = Number(ctx.targets.water_intensity?.value ?? 20) / 100
  const absPct = Number(ctx.targets.water_absolute?.value ?? 10) / 100
  let siteRows = siteId ? sites.filter((s) => s.id === siteId) : sites.filter((s) => s.active !== false)
  const palletSite = siteId ? siteRows[0]?.code === PALLET_SITE_CODE : false
  const excluded = []
  if (!siteId) {
    excluded.push(...siteRows.filter((s) => s.code === PALLET_SITE_CODE))
    siteRows = siteRows.filter((s) => s.code !== PALLET_SITE_CODE)
  }
  const perSite = siteRows.map((s) => {
    const w = num(figure(refRows, s.id, BASE_YEAR, 'actual')?.water_withdrawal_m3)
    const out = outputPath(refRows, s.id)
    return { site: s, withdrawal: w, output: out }
  })
  const missing = perSite.filter((x) => x.withdrawal === null || x.output === null).map((x) => x.site)
  const included = perSite.filter((x) => x.withdrawal !== null && x.output !== null)
  const includedIds = new Set(included.map((x) => x.site.id))
  const estimateSites = included.filter((x) => x.output.estimate).map((x) => x.site)
  const W = sum(included, (x) => x.withdrawal)
  const O = (y) => sum(included, (x) => x.output.byYear[y])
  const empty = included.length === 0 || O(BASE_YEAR) === 0
  const baseIntensity = empty ? 0 : W / O(BASE_YEAR)
  const target = baseIntensity * (1 - pct)
  const required = baseIntensity * pct
  const counted = eligible(rows, 'Water', siteId, includedIds)
  const approved = counted.filter((p) => p.status === 'Approved')
  const pending = counted.filter((p) => p.status === 'Pending approval')
  const projected = (y, lists) => (empty ? 0 : (W - sum(lists, (l) => activeIn(l, y))) / O(y))
  const actualFor = (y) => {
    if (empty) return null
    let w = 0
    let o = 0
    for (const x of included) {
      const f = figure(refRows, x.site.id, y, 'actual')
      const fw = num(f?.water_withdrawal_m3)
      const fo = num(f?.output_t)
      if (fw === null || fo === null) return null
      w += fw
      o += fo
    }
    return o === 0 ? null : w / o
  }
  const pathway = YEARS.map((y) => ({
    year: y,
    actual: actualFor(y),
    approved: projected(y, [approved]),
    approvedPending: projected(y, [approved, pending]),
    targetIntensity: baseIntensity - (required * (y - BASE_YEAR)) / (TARGET_YEAR - BASE_YEAR),
    absoluteAsIntensity: empty ? 0 : (W - (absPct * W * (y - BASE_YEAR)) / (TARGET_YEAR - BASE_YEAR)) / O(y),
    output: O(y),
  }))
  const projected2030 = projected(TARGET_YEAR, [approved])
  const projected2030Pending = projected(TARGET_YEAR, [approved, pending])
  const covered = Math.max(0, baseIntensity - projected2030)
  const ifApproved = Math.max(0, projected2030 - projected2030Pending)
  const uncovered = Math.max(0, required - covered - ifApproved)
  const surplus = Math.max(0, covered - required)
  return {
    pct,
    baseIntensity,
    target,
    required,
    covered,
    ifApproved,
    uncovered,
    surplus,
    projected2030,
    projected2030Pending,
    missing,
    excluded,
    estimate: estimateSites.length > 0,
    estimateSites,
    included: included.map((x) => x.site),
    pathway,
    approved,
    pending,
    unit: palletSite ? 'm³ per pallet' : 'm³ per t',
    withdrawal: W,
    outputBase: O(BASE_YEAR),
    output2030: O(TARGET_YEAR),
  }
}

// ---------- waste

export function waste(ctx) {
  const { sites, refRows, rows, siteId } = ctx
  const threshold = Number(ctx.targets.waste_diversion?.value ?? 95) / 100
  const siteRows = siteId ? sites.filter((s) => s.id === siteId) : sites.filter((s) => s.active !== false)
  const hasWaste = (r) => num(r.waste_total_t) !== null && num(r.waste_diverted_t) !== null
  const perSite = siteRows.map((s) => {
    const latest = latestActual(refRows, s.id, hasWaste)
    if (!latest) return { site: s, status: 'missing' }
    const total = num(latest.waste_total_t)
    const diverted = num(latest.waste_diverted_t)
    const planTotal = num(figure(refRows, s.id, TARGET_YEAR, 'plan')?.waste_total_t)
    const denom = planTotal ?? total
    const approvedAtSite = rows.filter((p) => p.category === 'Waste' && p.scope === 'site' && p.site_id === s.id && p.status === 'Approved' && p.start_year <= TARGET_YEAR)
    const pendingAtSite = rows.filter((p) => p.category === 'Waste' && p.scope === 'site' && p.site_id === s.id && p.status === 'Pending approval' && p.start_year <= TARGET_YEAR)
    const rate = total === 0 ? 0 : diverted / total
    const rawProjected = denom === 0 ? 0 : (diverted + activeIn(approvedAtSite, TARGET_YEAR)) / denom
    const rawPending = denom === 0 ? 0 : (diverted + activeIn(approvedAtSite, TARGET_YEAR) + activeIn(pendingAtSite, TARGET_YEAR)) / denom
    const projected = Math.min(1, rawProjected)
    const projectedWithPending = Math.min(1, rawPending)
    const reached = projected >= threshold
    const reachedWithPending = !reached && projectedWithPending >= threshold
    return {
      site: s,
      year: latest.year,
      total,
      diverted,
      denom,
      planTotal,
      rate,
      projected,
      projectedWithPending,
      capped: rawProjected > 1 || rawPending > 1,
      approved: approvedAtSite,
      pending: pendingAtSite,
      status: reached ? 'covered' : reachedWithPending ? 'ifApproved' : 'uncovered',
    }
  })
  const withFigures = perSite.filter((x) => x.status !== 'missing')
  const groupProjects = rows.filter((p) => p.category === 'Waste' && p.scope === 'group' && (p.status === 'Approved' || p.status === 'Pending approval'))
  return {
    threshold,
    sites: perSite,
    missing: perSite.filter((x) => x.status === 'missing').map((x) => x.site),
    required: withFigures.length,
    covered: withFigures.filter((x) => x.status === 'covered').length,
    ifApproved: withFigures.filter((x) => x.status === 'ifApproved').length,
    uncovered: withFigures.filter((x) => x.status === 'uncovered').length,
    capped: withFigures.filter((x) => x.capped).map((x) => x.site),
    groupProjects,
  }
}

// ---------- everything the Overview and the review pack need, in one call

/**
 * data: { sites, targets, referenceFigures, projects, history, decisions }
 * scope: { siteId (null = group), year }
 */
export function overview(data, scope, now = new Date()) {
  const asOf = asOfForYear(scope.year, now)
  const historyByProject = groupBy(data.history, 'project_id')
  const decisionsByProject = groupBy(data.decisions, 'project_id')
  const siteById = indexBy(data.sites)
  const targets = indexBy(data.targets, 'category')
  const visible = snapshot(data.projects, historyByProject, asOf)
  const current = currentVersions(visible)
  const scoped = inScope(current, scope.siteId)
  const ctx = { sites: data.sites, refRows: data.referenceFigures, rows: current, siteId: scope.siteId, targets, siteById }
  return {
    asOf,
    siteId: scope.siteId,
    year: scope.year,
    visible,
    current,
    scoped,
    historyByProject,
    decisionsByProject,
    siteById,
    targets,
    kpis: kpis(scoped),
    counts: statusCounts(scoped),
    emissions: emissions(ctx),
    waterAbsolute: waterAbsolute(ctx),
    waterIntensity: waterIntensity(ctx),
    waste: waste(ctx),
  }
}

/** The register rows for a scope with days waiting and the last decision attached, in register order. */
export function registerRows(data, scope, now = new Date()) {
  const asOf = asOfForYear(scope.year, now)
  const historyByProject = groupBy(data.history, 'project_id')
  const decisionsByProject = groupBy(data.decisions, 'project_id')
  const visible = inScope(snapshot(data.projects, historyByProject, asOf), scope.siteId)
  const superseded = new Set(visible.map((p) => p.supersedes_project_id).filter(Boolean))
  const rows = visible.map((p) => ({
    ...p,
    daysWaiting: daysWaiting(p, decisionsByProject[p.id], asOf),
    lastDecision: lastDecision(decisionsByProject[p.id], asOf),
    superseded: superseded.has(p.id),
  }))
  return { asOf, rows: sortRegister(rows) }
}

/** Reporting years the data covers: the first submission year up to the current year. */
export function reportingYears(projects, now = new Date()) {
  const first = projects.reduce((min, p) => Math.min(min, new Date(p.created_at).getUTCFullYear()), now.getUTCFullYear())
  const years = []
  for (let y = first; y <= now.getUTCFullYear(); y++) years.push(y)
  return years
}
