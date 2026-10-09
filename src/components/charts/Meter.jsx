import { fmtInt, fmtNum } from '../../lib/format.js'

/**
 * A target meter: the full width is the required reduction. Approved in green, "if approved" in taupe, uncovered hatched.
 * Over-delivery fills the meter and the surplus is stated in the card (spec §9 edge cases).
 */
export function Meter({ required, covered, ifApproved, uncovered, label, unit, decimals = 0, surplus = 0 }) {
  const total = required > 0 ? required : 1
  const a = Math.min(1, covered / total)
  const p = Math.min(1 - a, ifApproved / total)
  const u = Math.max(0, 1 - a - p)
  const f = (v) => (decimals ? fmtNum(v, decimals) : fmtInt(v))
  return (
    <div>
      {label && <div className="text-[13px] font-semibold mb-1">{label}</div>}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="w-full h-3.5 block" role="img" aria-label={`${label || 'Meter'}: covered ${f(covered)}, if approved ${f(ifApproved)}, uncovered ${f(uncovered)} ${unit || ''}`}>
        <rect x="0" y="0" width="100" height="10" rx="2" fill="#F5F4EF" />
        {u > 0 && <rect x={(a + p) * 100} y="0" width={u * 100} height="10" fill="url(#rb-hatch)" />}
        {p > 0 && <rect x={a * 100} y="0" width={p * 100} height="10" fill="#C9A27F" />}
        {a > 0 && <rect x="0" y="0" width={a * 100} height="10" fill="#0F6B3A" />}
        <rect x="0" y="0" width="100" height="10" rx="2" fill="none" stroke="#DDDBD3" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="grid grid-cols-3 gap-2 mt-1.5 text-[13px]">
        <div>
          <div className="rb-caption">Approved</div>
          <div className="rb-num text-rb-green">{f(covered)}</div>
        </div>
        <div>
          <div className="rb-caption">If approved</div>
          <div className="rb-num" style={{ color: '#9C7A5A' }}>{f(ifApproved)}</div>
        </div>
        <div>
          <div className="rb-caption">Uncovered</div>
          <div className="rb-num text-rb-grey-mid">{f(uncovered)}</div>
        </div>
      </div>
      {surplus > 0 && (
        <div className="text-[13px] mt-1">
          +{f(surplus)} {unit} above target
        </div>
      )}
    </div>
  )
}

/** Seven-segment meter for waste: one segment per site with figures. */
export function SegmentMeter({ segments }) {
  const n = segments.length || 1
  const fill = { covered: '#0F6B3A', ifApproved: '#C9A27F', uncovered: 'url(#rb-hatch)', missing: '#F5F4EF' }
  return (
    <svg viewBox={`0 0 ${n * 14} 10`} className="w-full h-4 block" role="img" aria-label="Sites at or above the diversion target">
      {segments.map((s, i) => (
        <g key={s.key}>
          <rect x={i * 14} y="0" width="12" height="10" rx="1.5" fill={fill[s.status] || '#F5F4EF'} stroke="#DDDBD3" strokeWidth="0.5" />
          <title>{s.title}</title>
        </g>
      ))}
    </svg>
  )
}
