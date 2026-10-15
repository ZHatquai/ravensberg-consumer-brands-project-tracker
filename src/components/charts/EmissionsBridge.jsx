import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { fmtInt } from '../../lib/format.js'
import { Legend, Estimate } from '../ui.jsx'

// Spec §10 encoding: grey = reference anchors, green = approved, taupe = pending, hatched = gap;
// from v1.4 a very light Leaf Green tint with a Leaf Green outline = growth to 2030 (business as usual).
const FILL = { base: '#6B6B6B', projected: '#6B6B6B', target: '#6B6B6B', lever: '#0F6B3A', pending: '#C9A27F', gap: 'url(#rb-hatch)', growth: '#D2E3CA' }
const STROKE = { gap: '#6B6B6B', growth: '#7FB069' }
const ANCHORS = new Set(['base', 'projected', 'target'])

/** Waterfall: base year, growth to 2030, one bar per approved lever, projected 2030, pending pipeline, gap, target. */
export function EmissionsBridge({ bridge, unit = 'tCO₂e per year', factorSet, estimateSites = [] }) {
  let running = 0
  const rows = bridge.map((b) => {
    let range
    if (ANCHORS.has(b.kind)) {
      range = [0, b.value]
      running = b.value
    } else {
      const next = running + b.value
      range = [Math.min(running, next), Math.max(running, next)]
      running = next
    }
    return { ...b, range, short: shortLabel(b), labelText: valueText(b) }
  })
  return (
    <div>
      <div className="overflow-x-auto">
      <div className="h-[300px] min-w-[640px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 22, right: 8, left: 8, bottom: 4 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="#DDDBD3" />
            <XAxis dataKey="short" tickLine={false} axisLine={{ stroke: '#DDDBD3' }} interval={0} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtInt(v)} tickLine={false} axisLine={false} width={58} tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: '#F5F4EF' }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDDBD3' }}
              formatter={(v, n, item) => [`${valueText(item.payload)} ${unit}`, tooltipLabel(item.payload)]}
              labelFormatter={() => ''}
            />
            <Bar dataKey="range" isAnimationActive={false} radius={[3, 3, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.label} fill={FILL[r.kind]} stroke={STROKE[r.kind] || 'none'} />
              ))}
              <LabelList dataKey="labelText" position="top" style={{ fontSize: 11, fill: '#333333', fontFamily: 'Montserrat' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
      <Legend
        items={[
          { label: 'Reference (base year, projected, target)', fill: '#6B6B6B' },
          { label: 'Growth to 2030 (business as usual)', fill: '#D2E3CA', stroke: '#7FB069' },
          { label: 'Approved levers', fill: '#0F6B3A' },
          { label: 'Pending, if approved', fill: '#C9A27F' },
          { label: 'Gap', fill: 'url(#rb-hatch)', stroke: '#6B6B6B' },
        ]}
      />
      <p className="rb-caption mt-2">
        Bridge from the FY2024 Scope 1+2 figure to 2030: growth to 2030 comes first (business as usual, from the planned output or the planned 2030 figure where entered), then each approved lever counts its full annual impact in 2030; pending projects are shown as "if approved"; the gap is what no project covers yet. {factorSet}.
        {estimateSites.length > 0 && (
          <>
            {' '}
            <Estimate /> no planned 2030 output for {estimateSites.map((s) => s.code).join(', ')}: held flat, no growth.
          </>
        )}
      </p>
    </div>
  )
}

/** Anchors show their level; every other bar shows its signed step (+ for growth, − for a lever, pending or the gap). */
function valueText(b) {
  if (ANCHORS.has(b.kind)) return fmtInt(b.value)
  if (b.value === 0) return '0'
  return `${b.value < 0 ? '−' : '+'}${fmtInt(Math.abs(b.value))}`
}

function tooltipLabel(b) {
  if (b.kind === 'growth') return `${b.label}: business as usual 2030 ${fmtInt(b.bau)}${b.estimate ? ' (estimate)' : ''}`
  return b.label
}

function shortLabel(b) {
  if (b.kind === 'lever') {
    if (b.short) return b.short
    const m = b.label.match(/^(\d{4})\s/)
    if (m) return m[1]
    const p = b.label.match(/^(PRJ-\d{4})/)
    if (p) return p[1]
    return b.label.length > 10 ? b.label.slice(0, 9) + '…' : b.label
  }
  if (b.kind === 'growth') return 'Growth'
  if (b.kind === 'pending') return 'Pending'
  if (b.kind === 'projected') return 'Proj. 2030'
  if (b.kind === 'target') return 'Target'
  return b.label
}
