import { ComposedChart, Bar, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'
import { fmtPct } from '../../lib/format.js'
import { Legend } from '../ui.jsx'

/** One bar per site: 2030 rate with approved (green), pending extension (taupe), FY actual marker (charcoal tick), 95 % line (grey). */
export function WasteBars({ waste }) {
  const rows = waste.sites
    .filter((s) => s.status !== 'missing')
    .map((s) => ({
      code: s.site.code,
      name: s.site.name,
      year: s.year,
      actual: s.rate * 100,
      approved: s.projected * 100,
      pending: Math.max(0, s.projectedWithPending - s.projected) * 100,
      capped: s.capped,
    }))
  const Tick = (props) => {
    const { cx, cy } = props
    if (cx === undefined || cy === undefined) return null
    return <line x1={cx - 14} x2={cx + 14} y1={cy} y2={cy} stroke="#333333" strokeWidth={2.5} />
  }
  return (
    <div>
      <div className="overflow-x-auto">
      <div className="h-[300px] min-w-[640px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 12, right: 16, left: 8, bottom: 4 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="#DDDBD3" />
            <XAxis dataKey="code" tickLine={false} axisLine={{ stroke: '#DDDBD3' }} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v} %`} tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDDBD3' }}
              formatter={(v, n) => [fmtPct(v / 100, 1), n]}
              labelFormatter={(code) => {
                const r = rows.find((x) => x.code === code)
                return r ? `${r.code} ${r.name} (FY${r.year} actual)` : code
              }}
            />
            <Bar dataKey="approved" name="2030 with approved" stackId="r" fill="#0F6B3A" isAnimationActive={false} maxBarSize={90}>
              {rows.map((r) => (
                <Cell key={r.code} fill="#0F6B3A" stroke={r.capped ? '#D98E2B' : 'none'} strokeWidth={r.capped ? 2 : 0} />
              ))}
            </Bar>
            <Bar dataKey="pending" name="Pending extension" stackId="r" fill="#C9A27F" isAnimationActive={false} radius={[3, 3, 0, 0]} maxBarSize={90} />
            <Scatter dataKey="actual" name="FY actual" shape={<Tick />} isAnimationActive={false} />
            <ReferenceLine y={waste.threshold * 100} stroke="#6B6B6B" strokeDasharray="6 4" label={{ value: `${Math.round(waste.threshold * 100)} % target`, position: 'insideTopRight', fontSize: 11, fill: '#6B6B6B' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      </div>
      <Legend items={[{ label: '2030 rate with approved projects', fill: '#0F6B3A' }, { label: 'Pending extension, if approved', fill: '#C9A27F' }, { label: 'Latest actual rate', fill: '#333333' }, { label: `${Math.round(waste.threshold * 100)} % target line`, fill: '#FFFFFF', stroke: '#6B6B6B', dash: '3 2' }]} />
      <p className="rb-caption mt-2">
        Diversion from landfill per site (incineration with energy recovery counts as diverted): latest actual rate, 2030 rate with approved projects, extension with pending projects, capped at 100 %.
        {waste.capped.length > 0 && <> Capped above 100 % at {waste.capped.map((s) => s.code).join(', ')}: check the site's tonnage.</>}
        {waste.groupProjects.length > 0 && <> Group waste projects ({waste.groupProjects.length}) change no site rate.</>}
      </p>
    </div>
  )
}
