import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtPct } from '../../lib/format.js'

const FILL = {
  Potential: '#DDDBD3',
  'Pending approval': '#C9A27F',
  Approved: '#0F6B3A',
  Declined: 'url(#rb-hatch-problem)',
}
const ORDER = ['Approved', 'Pending approval', 'Potential', 'Declined']

export function Donut({ title, counts }) {
  const total = ORDER.reduce((acc, s) => acc + (counts[s] || 0), 0)
  const rows = ORDER.map((s) => ({ name: s, value: counts[s] || 0 }))
  const plotted = rows.filter((r) => r.value > 0)
  return (
    <div>
      <h3 className="mb-1">{title}</h3>
      <div className="flex items-center gap-3">
        <div className="relative w-[120px] h-[120px] flex-none">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={plotted.length ? plotted : [{ name: 'none', value: 1 }]} dataKey="value" innerRadius={38} outerRadius={56} paddingAngle={plotted.length > 1 ? 2 : 0} stroke="#FFFFFF" strokeWidth={2} isAnimationActive={false}>
                {(plotted.length ? plotted : [{ name: 'none' }]).map((r) => (
                  <Cell key={r.name} fill={FILL[r.name] || '#F5F4EF'} />
                ))}
              </Pie>
              {plotted.length > 0 && <Tooltip formatter={(v, n) => [`${v} (${fmtPct(total ? v / total : 0)})`, n]} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDDBD3' }} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="rb-num text-xl text-rb-green leading-none">{total}</div>
            <div className="rb-caption text-[11px]">projects</div>
          </div>
        </div>
        <table className="text-[13px] flex-1" aria-label={`${title} projects by status`}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="py-0.5 pr-2">
                  <span className="inline-flex items-center gap-1.5">
                    <svg width="12" height="12" aria-hidden="true">
                      <rect width="12" height="12" rx="2" fill={FILL[r.name]} stroke="#DDDBD3" strokeWidth="0.5" />
                    </svg>
                    {r.name}
                  </span>
                </td>
                <td className="py-0.5 text-right rb-num">{r.value}</td>
                <td className="py-0.5 pl-2 text-right rb-caption">{total ? fmtPct(r.value / total) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rb-caption text-[12px] mt-1">
        Retired {counts.Retired || 0} · Obsolete {counts.Obsolete || 0}
      </div>
    </div>
  )
}
