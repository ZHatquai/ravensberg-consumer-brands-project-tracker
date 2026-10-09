import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fmtNum } from '../../lib/format.js'
import { Legend, Estimate } from '../ui.jsx'

/** Water intensity trajectory: actual, projected with approved, projected with approved and pending, both target lines. */
export function WaterTrajectory({ wi }) {
  const rows = wi.pathway
  const unit = wi.unit
  return (
    <div>
      <div className="overflow-x-auto">
      <div className="h-[300px] min-w-[640px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#DDDBD3" />
            <XAxis dataKey="year" tickLine={false} axisLine={{ stroke: '#DDDBD3' }} tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtNum(v, 2)} domain={['auto', 'auto']} tickLine={false} axisLine={false} width={52} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDDBD3' }} formatter={(v, n) => [`${fmtNum(v, 2)} ${unit}`, n]} />
            <Line type="linear" dataKey="targetIntensity" name="Intensity target (−20 %)" stroke="#6B6B6B" strokeDasharray="6 4" dot={false} isAnimationActive={false} strokeWidth={2} />
            <Line type="linear" dataKey="absoluteAsIntensity" name="Absolute target (−10 % withdrawal) as intensity" stroke="#6B6B6B" strokeDasharray="2 3" dot={false} isAnimationActive={false} strokeWidth={2} />
            <Line type="linear" dataKey="approvedPending" name="Projected, approved and pending" stroke="#C9A27F" strokeDasharray="5 3" dot={{ r: 3 }} isAnimationActive={false} strokeWidth={2} />
            <Line type="linear" dataKey="approved" name="Projected, approved" stroke="#0F6B3A" dot={{ r: 3 }} isAnimationActive={false} strokeWidth={2.5} />
            <Line type="linear" dataKey="actual" name="Actual" stroke="#333333" dot={{ r: 4, fill: '#333333' }} connectNulls isAnimationActive={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>
      <Legend items={[{ label: 'Actual', fill: '#333333' }, { label: 'Projected, approved', fill: '#0F6B3A' }, { label: 'Projected, approved and pending', fill: '#C9A27F' }, { label: 'Intensity target (−20 %)', fill: '#FFFFFF', stroke: '#6B6B6B', dash: '3 2' }, { label: 'Absolute target as intensity', fill: '#FFFFFF', stroke: '#6B6B6B', dash: '1 2' }]} />
      <p className="rb-caption mt-2">
        Withdrawal minus approved savings, divided by output interpolated straight-line from FY2024 to the planned 2030 output, in {unit}.
        {wi.estimate && (
          <>
            {' '}
            <Estimate /> output held flat at FY2024 for {wi.estimateSites.map((s) => s.code).join(', ')} (no 2030 plan).
          </>
        )}
        {wi.excluded.length > 0 && <> Site {wi.excluded.map((s) => s.code).join(', ')} reports pallets and is excluded from the group intensity.</>}
      </p>
    </div>
  )
}
