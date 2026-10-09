import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { fmtInt } from '../../lib/format.js'
import { Legend } from '../ui.jsx'

const FILL = { base: '#6B6B6B', projected: '#6B6B6B', target: '#6B6B6B', lever: '#0F6B3A', pending: '#C9A27F', gap: 'url(#rb-hatch)' }

/** Waterfall: base year, one bar per approved lever, projected 2030, pending pipeline, gap, target. Grey = anchors, green = approved, taupe = pending, hatched = gap. */
export function EmissionsBridge({ bridge, unit = 'tCO₂e per year', factorSet }) {
  let running = 0
  const rows = bridge.map((b) => {
    let range
    if (b.kind === 'base' || b.kind === 'projected' || b.kind === 'target') {
      range = [0, b.value]
      running = b.value
    } else {
      const next = running + b.value
      range = [Math.min(running, next), Math.max(running, next)]
      running = next
    }
    return { ...b, range, short: shortLabel(b) }
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
              formatter={(v, n, item) => [`${item.payload.value < 0 ? '−' : ''}${fmtInt(Math.abs(item.payload.value))} ${unit}`, item.payload.label]}
              labelFormatter={() => ''}
            />
            <Bar dataKey="range" isAnimationActive={false} radius={[3, 3, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.label} fill={FILL[r.kind]} stroke={r.kind === 'gap' ? '#6B6B6B' : 'none'} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(v) => (v === 0 ? '0' : `${v < 0 ? '−' : ''}${fmtInt(Math.abs(v))}`)} style={{ fontSize: 11, fill: '#333333', fontFamily: 'Montserrat' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      </div>
      <Legend items={[{ label: 'Reference (base year, projected, target)', fill: '#6B6B6B' }, { label: 'Approved levers', fill: '#0F6B3A' }, { label: 'Pending, if approved', fill: '#C9A27F' }, { label: 'Gap', fill: 'url(#rb-hatch)', stroke: '#6B6B6B' }]} />
      <p className="rb-caption mt-2">
        Bridge from the FY2024 Scope 1+2 figure to 2030: each approved lever counts its full annual impact in 2030; pending projects are shown as "if approved"; the gap is what no project covers yet. {factorSet}.
      </p>
    </div>
  )
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
  if (b.kind === 'pending') return 'Pending'
  if (b.kind === 'projected') return 'Proj. 2030'
  if (b.kind === 'target') return 'Target'
  return b.label
}
