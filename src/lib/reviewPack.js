// The CFO review pack (spec §3): four A4 pages generated in the browser with jsPDF from the same calculations as the Overview.
// Brand: Soft Stone / white pages, logo lockup top-left on every page, Leaf Green rule under each page title, Montserrat for
// titles and numbers, Source Sans 3 for everything else, Ravensberg Green only on titles and table header rows, footer on every page.
import { jsPDF } from 'jspdf'
import { data, siteById, siteLabel, profileById } from './data.js'
import { overview, registerRows, TARGET_YEAR, FACTOR_SET, CATEGORIES } from './calculations.js'
import { fmtInt, fmtNum, fmtPct, fmtEur, fmtDate } from './format.js'

const GREEN = [15, 107, 58]
const LEAF = [127, 176, 105]
const TAUPE = [201, 162, 127]
const STONE = [245, 244, 239]
const CHARCOAL = [51, 51, 51]
const GREY = [107, 107, 107]
const LINE = [221, 219, 211]
const WHITE = [255, 255, 255]
const ATTENTION = [217, 142, 43]

const PAGE = { w: 210, h: 297 }
const M = 16 // margin, mm
const CONTENT_W = PAGE.w - 2 * M
const FOOTER_Y = PAGE.h - 10
const BODY_TOP = 42

const FONTS = [
  ['Montserrat-SemiBold.ttf', 'Montserrat', 'normal'],
  ['Montserrat-Bold.ttf', 'Montserrat', 'bold'],
  ['SourceSans3-Regular.ttf', 'SourceSans3', 'normal'],
  ['SourceSans3-SemiBold.ttf', 'SourceSans3', 'bold'],
]
let fontCache = null
let logoCache = null

async function fetchBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url}`)
  const buf = await res.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

async function loadAssets() {
  if (!fontCache) fontCache = await Promise.all(FONTS.map(async ([file, family, style]) => [file, family, style, await fetchBase64(`/fonts/${file}`)]))
  if (!logoCache) logoCache = await fetchBase64('/assets/ravensberg-logo.png')
  return { fonts: fontCache, logo: logoCache }
}

const txt = (doc, s, x, y, o = {}) => {
  doc.setFont(o.font || 'SourceSans3', o.style || 'normal')
  doc.setFontSize(o.size || 10)
  doc.setTextColor(...(o.color || CHARCOAL))
  doc.text(String(s), x, y, { align: o.align || 'left', maxWidth: o.maxWidth })
}
const rect = (doc, x, y, w, h, fill, stroke) => {
  if (fill) doc.setFillColor(...fill)
  if (stroke) {
    doc.setDrawColor(...stroke)
    doc.setLineWidth(0.25)
  }
  doc.rect(x, y, w, h, fill && stroke ? 'FD' : fill ? 'F' : 'S')
}
const line = (doc, x1, y1, x2, y2, color = LINE, width = 0.25, dash = null) => {
  doc.setDrawColor(...color)
  doc.setLineWidth(width)
  if (dash) doc.setLineDashPattern(dash, 0)
  doc.line(x1, y1, x2, y2)
  if (dash) doc.setLineDashPattern([], 0)
}
/** Diagonal hatching inside a rectangle: the brand's "declined or gap" encoding. */
function hatch(doc, x, y, w, h, spacing = 1.6) {
  rect(doc, x, y, w, h, WHITE, GREY)
  doc.setDrawColor(...GREY)
  doc.setLineWidth(0.3)
  for (let k = spacing; k < w + h; k += spacing) {
    const x1 = k <= w ? x + k : x + w
    const y1 = k <= w ? y : y + (k - w)
    const x2 = k >= h ? x + k - h : x
    const y2 = k >= h ? y + h : y + k
    doc.line(x1, y1, x2, y2)
  }
}

function pageChrome(doc, logo, title, subtitle) {
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, PAGE.w, PAGE.h, 'F')
  doc.addImage(logo, 'PNG', M, 9, 34, 34 / (1560 / 440))
  txt(doc, title, M, 27, { font: 'Montserrat', size: 16, color: GREEN })
  rect(doc, M, 30, 50, 1.2, LEAF)
  if (subtitle) txt(doc, subtitle, PAGE.w - M, 27, { size: 9.5, color: GREY, align: 'right' })
}

function footers(doc) {
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    line(doc, M, FOOTER_Y - 4, PAGE.w - M, FOOTER_Y - 4)
    txt(doc, 'Ravensberg Consumer Brands | Group Sustainability | Internal', M, FOOTER_Y, { size: 8.5, color: GREY })
    txt(doc, `Page ${i} of ${n}`, PAGE.w - M, FOOTER_Y, { size: 8.5, color: GREY, align: 'right' })
  }
}

function meter(doc, x, y, w, { required, covered, ifApproved }) {
  const total = required > 0 ? required : 1
  const a = Math.min(1, covered / total)
  const p = Math.min(1 - a, ifApproved / total)
  const u = Math.max(0, 1 - a - p)
  const h = 5
  rect(doc, x, y, w, h, STONE)
  if (u > 0) hatch(doc, x + (a + p) * w, y, u * w, h)
  if (p > 0) rect(doc, x + a * w, y, p * w, h, TAUPE)
  if (a > 0) rect(doc, x, y, a * w, h, GREEN)
  rect(doc, x, y, w, h, null, LINE)
}

function meterFigures(doc, x, y, w, { covered, ifApproved, uncovered }, fmt) {
  const col = w / 3
  const items = [
    ['Approved', fmt(covered), GREEN],
    ['If approved', fmt(ifApproved), [156, 122, 90]],
    ['Uncovered', fmt(uncovered), GREY],
  ]
  items.forEach(([label, value, color], i) => {
    txt(doc, label, x + i * col, y, { size: 8, color: GREY })
    txt(doc, value, x + i * col, y + 4.5, { font: 'Montserrat', size: 10, color })
  })
}

/** Simple table: header row in Ravensberg Green, zebra rows, wraps text, breaks pages. Returns the y after the table. */
function table(doc, ctx, { x = M, y, columns, rows, fontSize = 8, rowPad = 1.3 }) {
  const widths = columns.map((c) => c.w)
  const drawHeader = (yy) => {
    rect(doc, x, yy, widths.reduce((a, b) => a + b, 0), 7, GREEN)
    let cx = x
    columns.forEach((c, i) => {
      txt(doc, c.label, c.align === 'right' ? cx + widths[i] - 1.5 : cx + 1.5, yy + 4.8, { font: 'Montserrat', size: 7.5, color: WHITE, align: c.align || 'left' })
      cx += widths[i]
    })
    return yy + 7
  }
  y = drawHeader(y)
  doc.setFontSize(fontSize)
  rows.forEach((r, ri) => {
    const cells = columns.map((c, i) => {
      doc.setFont('SourceSans3', r.bold ? 'bold' : 'normal')
      doc.setFontSize(fontSize)
      return doc.splitTextToSize(String(r.cells[i] ?? ''), widths[i] - 3)
    })
    const lines = Math.max(1, ...cells.map((c) => c.length))
    const h = lines * fontSize * 0.42 + rowPad * 2
    if (y + h > FOOTER_Y - 8) {
      doc.addPage()
      pageChrome(doc, ctx.logo, ctx.title + ' (continued)', ctx.subtitle)
      y = drawHeader(BODY_TOP)
    }
    if (r.subtotal) rect(doc, x, y, widths.reduce((a, b) => a + b, 0), h, STONE)
    else if (ri % 2 === 1) rect(doc, x, y, widths.reduce((a, b) => a + b, 0), h, STONE)
    let cx = x
    columns.forEach((c, i) => {
      doc.setFont('SourceSans3', r.bold ? 'bold' : 'normal')
      doc.setFontSize(fontSize)
      doc.setTextColor(...CHARCOAL)
      const tx = c.align === 'right' ? cx + widths[i] - 1.5 : cx + 1.5
      doc.text(cells[i], tx, y + rowPad + fontSize * 0.33, { align: c.align || 'left' })
      cx += widths[i]
    })
    line(doc, x, y + h, x + widths.reduce((a, b) => a + b, 0), y + h)
    y += h
  })
  return y
}

// ---------- charts drawn with primitives

function chartBridge(doc, x, y, w, h, bridge, unit) {
  const steps = []
  let running = 0
  for (const b of bridge) {
    if (b.kind === 'base' || b.kind === 'projected' || b.kind === 'target') {
      steps.push({ ...b, lo: 0, hi: b.value })
      running = b.value
    } else {
      const next = running + b.value
      steps.push({ ...b, lo: Math.min(running, next), hi: Math.max(running, next) })
      running = next
    }
  }
  const max = Math.max(...steps.map((s) => s.hi)) * 1.08 || 1
  const plotX = x + 14
  const plotW = w - 14
  const plotH = h - 10
  const sx = (v) => y + plotH - (v / max) * plotH
  // gridlines
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i
    line(doc, plotX, sx(v), plotX + plotW, sx(v))
    txt(doc, fmtInt(v), plotX - 1.5, sx(v) + 1, { size: 6.5, color: GREY, align: 'right' })
  }
  const bw = plotW / steps.length
  steps.forEach((s, i) => {
    const bx = plotX + i * bw + bw * 0.15
    const bwid = bw * 0.7
    const top = sx(s.hi)
    const hh = Math.max(0.3, sx(s.lo) - sx(s.hi))
    if (s.kind === 'gap') hatch(doc, bx, top, bwid, hh)
    else rect(doc, bx, top, bwid, hh, s.kind === 'lever' ? GREEN : s.kind === 'pending' ? TAUPE : GREY)
    const v = s.value
    txt(doc, v === 0 ? '0' : `${v < 0 ? '−' : ''}${fmtInt(Math.abs(v))}`, bx + bwid / 2, top - 1.2, { font: 'Montserrat', size: 6, align: 'center' })
    const label = s.kind === 'lever' ? (s.label.match(/^(\d{4}|PRJ-\d{4})/)?.[1] || s.label.slice(0, 8)) : s.kind === 'pending' ? 'Pending' : s.kind === 'projected' ? 'Proj. 2030' : s.label
    txt(doc, label, bx + bwid / 2, y + plotH + 3.5, { size: 6.2, color: GREY, align: 'center' })
  })
  line(doc, plotX, y + plotH, plotX + plotW, y + plotH, LINE, 0.3)
}

function chartTrajectory(doc, x, y, w, h, wi) {
  const rows = wi.pathway
  const series = [
    ['actual', CHARCOAL, null, 0.6],
    ['approved', GREEN, null, 0.7],
    ['approvedPending', TAUPE, [1.5, 1], 0.6],
    ['targetIntensity', GREY, [2, 1.2], 0.45],
    ['absoluteAsIntensity', GREY, [0.6, 1], 0.45],
  ]
  const vals = rows.flatMap((r) => series.map(([k]) => r[k]).filter((v) => v !== null && v !== undefined))
  const min = Math.min(...vals) * 0.95
  const max = Math.max(...vals) * 1.03
  const plotX = x + 14
  const plotW = w - 14
  const plotH = h - 10
  const px = (yr) => plotX + ((yr - rows[0].year) / (rows[rows.length - 1].year - rows[0].year)) * plotW
  const py = (v) => y + plotH - ((v - min) / (max - min || 1)) * plotH
  for (let i = 0; i <= 4; i++) {
    const v = min + ((max - min) / 4) * i
    line(doc, plotX, py(v), plotX + plotW, py(v))
    txt(doc, fmtNum(v, 2), plotX - 1.5, py(v) + 1, { size: 6.5, color: GREY, align: 'right' })
  }
  rows.forEach((r) => txt(doc, String(r.year), px(r.year), y + plotH + 3.5, { size: 6.5, color: GREY, align: 'center' }))
  for (const [key, color, dash, width] of series) {
    let prev = null
    for (const r of rows) {
      const v = r[key]
      if (v === null || v === undefined) {
        prev = null
        continue
      }
      if (prev) line(doc, px(prev.year), py(prev.v), px(r.year), py(v), color, width, dash)
      if (key === 'actual' || key === 'approved') {
        doc.setFillColor(...color)
        doc.circle(px(r.year), py(v), 0.8, 'F')
      }
      prev = { year: r.year, v }
    }
  }
}

function chartWaste(doc, x, y, w, h, waste) {
  const sites = waste.sites.filter((s) => s.status !== 'missing')
  const plotX = x + 14
  const plotW = w - 14
  const plotH = h - 10
  const py = (v) => y + plotH - v * plotH
  for (let i = 0; i <= 4; i++) {
    const v = i / 4
    line(doc, plotX, py(v), plotX + plotW, py(v))
    txt(doc, `${Math.round(v * 100)} %`, plotX - 1.5, py(v) + 1, { size: 6.5, color: GREY, align: 'right' })
  }
  const bw = plotW / Math.max(1, sites.length)
  sites.forEach((s, i) => {
    const bx = plotX + i * bw + bw * 0.22
    const bwid = bw * 0.56
    rect(doc, bx, py(s.projected), bwid, py(0) - py(s.projected), GREEN)
    if (s.projectedWithPending > s.projected) rect(doc, bx, py(s.projectedWithPending), bwid, py(s.projected) - py(s.projectedWithPending), TAUPE)
    line(doc, bx - 1, py(s.rate), bx + bwid + 1, py(s.rate), CHARCOAL, 0.7)
    txt(doc, s.site.code, bx + bwid / 2, y + plotH + 3.5, { size: 6.5, color: GREY, align: 'center' })
    txt(doc, fmtPct(s.projected, 0) + (s.capped ? ' capped' : ''), bx + bwid / 2, py(Math.max(s.projected, s.projectedWithPending)) - 1.2, { font: 'Montserrat', size: 6, align: 'center', color: s.capped ? ATTENTION : CHARCOAL })
  })
  line(doc, plotX, py(waste.threshold), plotX + plotW, py(waste.threshold), GREY, 0.45, [2, 1.2])
  txt(doc, `${Math.round(waste.threshold * 100)} % target`, plotX + plotW, py(waste.threshold) - 1, { size: 6.5, color: GREY, align: 'right' })
}

function legend(doc, x, y, items) {
  let cx = x
  for (const [label, color, kind] of items) {
    if (kind === 'hatch') hatch(doc, cx, y - 2.2, 4, 2.6, 0.9)
    else if (kind === 'dash') line(doc, cx, y - 0.9, cx + 4, y - 0.9, color, 0.5, [1, 0.8])
    else rect(doc, cx, y - 2.2, 4, 2.6, color)
    txt(doc, label, cx + 5.2, y, { size: 6.8, color: GREY })
    cx += 5.2 + doc.getTextWidth(label) + 5
  }
}

// ---------- the pack

export async function generateReviewPack({ year, siteId = null, generatedBy }) {
  const { fonts, logo } = await loadAssets()
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  for (const [file, family, style, b64] of fonts) {
    doc.addFileToVFS(file, b64)
    doc.addFont(file, family, style)
  }
  const o = overview(data, { siteId, year })
  const reg = registerRows(data, { siteId, year })
  const scopeLabel = siteId ? siteLabel(siteId) : 'Group, all seven sites'
  const title = `Sustainability projects, review ${year}`
  const subtitle = `${scopeLabel} · as of ${fmtDate(o.asOf.toISOString())}`
  const ctx = { logo, title, subtitle }
  const e = o.emissions
  const wa = o.waterAbsolute
  const wi = o.waterIntensity
  const w = o.waste

  // ---- Page 1: Summary
  pageChrome(doc, logo, title, subtitle)
  txt(doc, `Generated ${fmtDate(new Date().toISOString())} by ${generatedBy}. Figures as on the Overview for ${scopeLabel}, reporting year ${year}.`, M, BODY_TOP - 3, { size: 9.5, color: GREY })
  // KPI row
  const kpis = [
    ['Projects registered', fmtInt(o.kpis.registered)],
    ['Approved', fmtInt(o.kpis.approved)],
    ['Pending approval', fmtInt(o.kpis.pending)],
    ['Declined', fmtInt(o.kpis.declined)],
    ['Approved tCO₂e per year', fmtInt(o.kpis.approvedTco2e)],
  ]
  const kw = (CONTENT_W - 4 * 3) / 5
  kpis.forEach(([label, value], i) => {
    const kx = M + i * (kw + 3)
    rect(doc, kx, BODY_TOP + 2, kw, 20, WHITE, LINE)
    rect(doc, kx, BODY_TOP + 2, kw, 1.4, GREEN)
    txt(doc, label, kx + 2.5, BODY_TOP + 8.5, { size: 7.5, color: GREY })
    txt(doc, value, kx + 2.5, BODY_TOP + 17, { font: 'Montserrat', size: 14, color: GREEN })
  })
  txt(doc, FACTOR_SET, PAGE.w - M, BODY_TOP + 26, { size: 7, color: GREY, align: 'right' })
  // target cards
  const cy = BODY_TOP + 32
  const cw = (CONTENT_W - 2 * 4) / 3
  const ch = 92
  const cards = [M, M + cw + 4, M + 2 * (cw + 4)]
  cards.forEach((cx) => rect(doc, cx, cy, cw, ch, WHITE, LINE))
  // emissions
  let cx = cards[0]
  txt(doc, 'EMISSIONS', cx + 3, cy + 6, { style: 'bold', size: 7, color: GREEN })
  txt(doc, `−${Math.round(e.pct * 100)} % Scope 1+2 by 2030`, cx + 3, cy + 12, { font: 'Montserrat', size: 9.5, color: GREEN })
  txt(doc, `Required ${fmtInt(e.required)} tCO₂e per year (${Math.round(e.pct * 100)} % of FY2024 ${fmtInt(e.base)} tCO₂e)`, cx + 3, cy + 18, { size: 7.5, color: GREY, maxWidth: cw - 6 })
  meter(doc, cx + 3, cy + 26, cw - 6, e)
  meterFigures(doc, cx + 3, cy + 36, cw - 6, e, (v) => fmtInt(v))
  if (e.surplus > 0) txt(doc, `+${fmtInt(e.surplus)} tCO₂e above target`, cx + 3, cy + 47, { size: 7.5 })
  if (e.missing.length) txt(doc, `Reference figures missing: ${e.missing.map((s) => s.code).join(', ')}`, cx + 3, cy + 52, { size: 7.5, color: [192, 57, 43], maxWidth: cw - 6 })
  txt(doc, FACTOR_SET, cx + 3, cy + ch - 4, { size: 6.5, color: GREY, maxWidth: cw - 6 })
  // water
  cx = cards[1]
  txt(doc, 'WATER', cx + 3, cy + 6, { style: 'bold', size: 7, color: GREEN })
  txt(doc, `−${Math.round(wa.pct * 100)} % withdrawal · −${Math.round(wi.pct * 100)} % intensity`, cx + 3, cy + 12, { font: 'Montserrat', size: 8.8, color: GREEN })
  txt(doc, `Absolute: required ${fmtInt(wa.required)} m³ per year of FY2024 ${fmtInt(wa.base)} m³`, cx + 3, cy + 18, { size: 7.5, color: GREY, maxWidth: cw - 6 })
  meter(doc, cx + 3, cy + 26, cw - 6, wa)
  meterFigures(doc, cx + 3, cy + 36, cw - 6, wa, (v) => fmtInt(v))
  txt(doc, `Intensity, ${wi.unit}: FY2024 ${fmtNum(wi.baseIntensity, 2)} → target ${fmtNum(wi.target, 2)}${wi.estimate ? ' (estimate)' : ''}`, cx + 3, cy + 52, { size: 7.5, color: GREY, maxWidth: cw - 6 })
  meter(doc, cx + 3, cy + 58, cw - 6, wi)
  meterFigures(doc, cx + 3, cy + 68, cw - 6, wi, (v) => fmtNum(v, 2))
  if (wi.excluded.length) txt(doc, `Site ${wi.excluded.map((s) => s.code).join(', ')} reports pallets: excluded from the group intensity.`, cx + 3, cy + ch - 4, { size: 6.5, color: GREY, maxWidth: cw - 6 })
  // waste
  cx = cards[2]
  txt(doc, 'WASTE', cx + 3, cy + 6, { style: 'bold', size: 7, color: GREEN })
  txt(doc, `${Math.round(w.threshold * 100)} % diversion at every site`, cx + 3, cy + 12, { font: 'Montserrat', size: 9.5, color: GREEN })
  txt(doc, `${siteId ? 'This site' : `${w.covered} of ${w.required} sites`} at or above ${Math.round(w.threshold * 100)} % with approved projects`, cx + 3, cy + 18, { size: 7.5, color: GREY, maxWidth: cw - 6 })
  const segs = w.sites.filter((s) => s.status !== 'missing')
  const segW = (cw - 6 - (segs.length - 1) * 1.2) / Math.max(1, segs.length)
  segs.forEach((s, i) => {
    const sxp = cx + 3 + i * (segW + 1.2)
    if (s.status === 'uncovered') hatch(doc, sxp, cy + 26, segW, 5)
    else rect(doc, sxp, cy + 26, segW, 5, s.status === 'covered' ? GREEN : TAUPE, LINE)
  })
  meterFigures(doc, cx + 3, cy + 36, cw - 6, { covered: w.covered, ifApproved: w.ifApproved, uncovered: w.uncovered }, (v) => String(v))
  let ly = cy + 50
  for (const s of segs) {
    txt(doc, `${s.site.code} ${s.site.name.replace(/^Werk /, '').replace(/^Logistikzentrum /, 'LZ ')}`, cx + 3, ly, { size: 7 })
    txt(doc, `${fmtPct(s.rate, 1)} → ${fmtPct(s.projected, 1)}${s.capped ? ' *' : ''}`, cx + cw - 3, ly, { font: 'Montserrat', size: 6.5, align: 'right', color: s.capped ? ATTENTION : CHARCOAL })
    ly += 4.2
  }
  if (w.capped.length) txt(doc, `* Rate above 100 % capped at ${w.capped.map((s) => s.code).join(', ')}: check the tonnage.`, cx + 3, cy + ch - 4, { size: 6.5, color: GREY, maxWidth: cw - 6 })
  legend(doc, M, cy + ch + 6, [['Approved', GREEN], ['Pending, if approved', TAUPE], ['Uncovered', null, 'hatch']])
  txt(doc, 'Approved projects count in full from their start year to 2030; pending projects are shown as "if approved" and never count in the covered figure. Potential, Declined, Retired and Obsolete projects count in no target figure. Estimates are labelled.', M, cy + ch + 13, { size: 7.5, color: GREY, maxWidth: CONTENT_W })

  // ---- Page 2: Pathways
  doc.addPage()
  pageChrome(doc, logo, 'Pathways to 2030', subtitle)
  const chartH = 54
  let yy = BODY_TOP
  txt(doc, 'Emissions bridge', M, yy, { font: 'Montserrat', size: 10, color: GREEN })
  txt(doc, 'tCO₂e per year', M + 34, yy, { size: 7.5, color: GREY })
  chartBridge(doc, M, yy + 6, CONTENT_W, chartH, e.bridge, 'tCO₂e per year')
  legend(doc, M, yy + chartH + 11, [['Reference (base, projected, target)', GREY], ['Approved levers', GREEN], ['Pending, if approved', TAUPE], ['Gap', null, 'hatch']])
  txt(doc, `From the FY2024 Scope 1+2 figure to 2030: each approved lever counts its full annual impact in 2030; the gap is what no project covers yet. ${FACTOR_SET}.`, M, yy + chartH + 16, { size: 7.5, color: GREY, maxWidth: CONTENT_W })
  yy += chartH + 26
  txt(doc, 'Water intensity trajectory', M, yy, { font: 'Montserrat', size: 10, color: GREEN })
  txt(doc, wi.unit, M + 50, yy, { size: 7.5, color: GREY })
  chartTrajectory(doc, M, yy + 6, CONTENT_W, chartH, wi)
  legend(doc, M, yy + chartH + 11, [['Actual', CHARCOAL], ['Projected, approved', GREEN], ['Projected, approved and pending', TAUPE], ['Intensity target (−20 %)', GREY, 'dash'], ['Absolute target as intensity', GREY, 'dash']])
  txt(doc, `Withdrawal minus approved savings over output interpolated straight-line from FY2024 to the planned 2030 output, in ${wi.unit}.${wi.estimate ? ` Estimate: output held flat at FY2024 for ${wi.estimateSites.map((s) => s.code).join(', ')} (no 2030 plan).` : ''}${wi.excluded.length ? ` Site ${wi.excluded.map((s) => s.code).join(', ')} reports pallets and is excluded from the group intensity.` : ''}`, M, yy + chartH + 16, { size: 7.5, color: GREY, maxWidth: CONTENT_W })
  yy += chartH + 26
  txt(doc, 'Waste diversion by site', M, yy, { font: 'Montserrat', size: 10, color: GREEN })
  txt(doc, 'diversion rate, latest actual year and 2030', M + 44, yy, { size: 7.5, color: GREY })
  chartWaste(doc, M, yy + 6, CONTENT_W, chartH, w)
  legend(doc, M, yy + chartH + 11, [['2030 rate with approved projects', GREEN], ['Pending extension, if approved', TAUPE], ['Latest actual rate (marker)', CHARCOAL], [`${Math.round(w.threshold * 100)} % target line`, GREY, 'dash']])
  txt(doc, `Diversion from landfill per site (incineration with energy recovery counts as diverted): latest actual rate, 2030 rate with approved projects, extension with pending projects, capped at 100 %.${w.capped.length ? ` Capped at ${w.capped.map((s) => s.code).join(', ')}: check the site's tonnage.` : ''}${w.groupProjects.length ? ` Group waste projects (${w.groupProjects.length}) change no site rate.` : ''}`, M, yy + chartH + 16, { size: 7.5, color: GREY, maxWidth: CONTENT_W })

  // ---- Page 3: Approved projects
  doc.addPage()
  const p3 = { ...ctx, title: `Approved projects, ${year}` }
  pageChrome(doc, logo, p3.title, subtitle)
  txt(doc, `Every project Approved as of the end of the reporting year, grouped by category. Site, annual and total impact, start year, capex and opex; category subtotals. Start years after ${TARGET_YEAR} contribute nothing to 2030.`, M, BODY_TOP - 3, { size: 8.5, color: GREY, maxWidth: CONTENT_W })
  const approvedRows = []
  for (const c of CATEGORIES) {
    const list = reg.rows.filter((p) => p.status === 'Approved' && p.category === c && !p.superseded).sort((a, b) => a.project_code.localeCompare(b.project_code))
    if (!list.length) continue
    const unit = list[0].unit.replace(' per year', '')
    approvedRows.push({ cells: [c, '', '', '', '', '', ''], bold: true, subtotal: true })
    for (const p of list) approvedRows.push({ cells: [p.project_code, p.title, p.site_id ? siteById[p.site_id].code : 'Group', fmtInt(p.annual_impact), fmtInt(p.total_impact), String(p.start_year), `${fmtEur(p.capex_eur)} / ${fmtEur(p.opex_eur_per_year)}`] })
    approvedRows.push({ cells: ['', `Subtotal ${c} (${list.length}), ${unit}`, '', fmtInt(list.reduce((a, p) => a + Number(p.annual_impact), 0)), fmtInt(list.reduce((a, p) => a + Number(p.total_impact), 0)), '', `${fmtEur(list.reduce((a, p) => a + Number(p.capex_eur), 0))} / ${fmtEur(list.reduce((a, p) => a + Number(p.opex_eur_per_year), 0))}`], bold: true, subtotal: true })
  }
  if (!approvedRows.length) approvedRows.push({ cells: ['–', 'No approved project in this year.', '', '', '', '', ''] })
  let y3 = table(doc, p3, {
    y: BODY_TOP + 4,
    columns: [
      { label: 'Project', w: 17 },
      { label: 'Title', w: 62 },
      { label: 'Site', w: 12 },
      { label: 'Annual impact', w: 22, align: 'right' },
      { label: 'Total impact', w: 22, align: 'right' },
      { label: 'Start', w: 11, align: 'right' },
      { label: 'Capex / opex per year', w: 32, align: 'right' },
    ],
    rows: approvedRows,
  })
  const obsolete = reg.rows.filter((p) => p.status === 'Obsolete' && p.lastDecision?.stage === 'obsolete' && String(p.lastDecision.decision_date).startsWith(String(year)))
  if (y3 + 22 > FOOTER_Y - 6) {
    doc.addPage()
    pageChrome(doc, logo, p3.title + ' (continued)', subtitle)
    y3 = BODY_TOP
  }
  txt(doc, `Obsolete in ${year}`, M, y3 + 8, { font: 'Montserrat', size: 9.5, color: GREEN })
  txt(doc, obsolete.length ? obsolete.map((p) => `${p.project_code} ${p.title} (${p.site_id ? siteById[p.site_id].code : 'Group'}, ${fmtInt(p.annual_impact)} ${p.unit}): ${p.lastDecision.comment}`).join('\n') : 'None.', M, y3 + 14, { size: 8.5, maxWidth: CONTENT_W })

  // ---- Page 4: Committee decisions
  doc.addPage()
  const p4 = { ...ctx, title: `Committee decisions, ${year}` }
  pageChrome(doc, logo, p4.title, subtitle)
  txt(doc, 'Every committee decision of the year in date order: project, outcome, date, people in the room and the decision comment. Then the Declined projects awaiting resubmission or retirement.', M, BODY_TOP - 3, { size: 8.5, color: GREY, maxWidth: CONTENT_W })
  const visibleIds = new Set(reg.rows.map((p) => p.id))
  const projectById = Object.fromEntries(reg.rows.map((p) => [p.id, p]))
  const committee = data.decisions
    .filter((d) => d.stage === 'committee' && String(d.decision_date).startsWith(String(year)) && visibleIds.has(d.project_id) && new Date(d.recorded_at) <= o.asOf)
    .sort((a, b) => (a.decision_date < b.decision_date ? -1 : a.decision_date > b.decision_date ? 1 : 0))
  const decisionRows = committee.map((d) => {
    const p = projectById[d.project_id]
    return { cells: [`${p.project_code}${p.version > 1 ? ` v${p.version}` : ''} ${p.title}`, d.outcome, fmtDate(d.decision_date), d.attendees || '', d.comment] }
  })
  if (!decisionRows.length) decisionRows.push({ cells: ['No committee decision in this year.', '', '', '', ''] })
  let y4 = table(doc, p4, {
    y: BODY_TOP + 4,
    columns: [
      { label: 'Project', w: 52 },
      { label: 'Outcome', w: 17 },
      { label: 'Date', w: 20 },
      { label: 'People in the room', w: 40 },
      { label: 'Comment', w: 49 },
    ],
    rows: decisionRows,
  })
  const declined = reg.rows.filter((p) => p.status === 'Declined' && !p.superseded)
  if (y4 + 30 > FOOTER_Y - 6) {
    doc.addPage()
    pageChrome(doc, logo, p4.title + ' (continued)', subtitle)
    y4 = BODY_TOP - 8
  }
  txt(doc, 'Declined, awaiting resubmission or retirement', M, y4 + 9, { font: 'Montserrat', size: 9.5, color: GREEN })
  const declinedRows = declined.map((p) => ({ cells: [`${p.project_code}${p.version > 1 ? ` v${p.version}` : ''} ${p.title}`, p.site_id ? siteById[p.site_id].code : 'Group', fmtDate(p.lastDecision?.decision_date), p.lastDecision?.comment || ''] }))
  if (!declinedRows.length) declinedRows.push({ cells: ['None.', '', '', ''] })
  table(doc, p4, {
    y: y4 + 12,
    columns: [
      { label: 'Project', w: 62 },
      { label: 'Site', w: 14 },
      { label: 'Declined on', w: 22 },
      { label: 'Decision comment', w: 80 },
    ],
    rows: declinedRows,
  })

  footers(doc)
  const fileName = `ravensberg-review-pack-${year}${siteId ? '-' + siteById[siteId].code : ''}.pdf`
  return { blob: doc.output('blob'), fileName }
}


