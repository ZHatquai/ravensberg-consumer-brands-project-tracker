import { STATUS_DOT } from '../lib/format.js'

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`rb-card p-4 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, className = '' }) {
  return <div className={`rb-eyebrow ${className}`}>{children}</div>
}

export function SectionTitle({ eyebrow, title, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-0.5">{title}</h2>
        <div className="rb-rule mt-1.5" />
      </div>
      {right}
    </div>
  )
}

export function StatusDot({ status, withLabel = true }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={`rb-dot ${STATUS_DOT[status] || 'rb-dot--neutral'}`} aria-hidden="true" />
      {withLabel && <span>{status}</span>}
    </span>
  )
}

export function Flag({ children }) {
  return (
    <span className="rb-flag">
      <span className="rb-dot rb-dot--problem" aria-hidden="true" />
      {children}
    </span>
  )
}

export function Estimate({ children = 'estimate' }) {
  return <span className="rb-estimate">{children}</span>
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="rb-modal-backdrop" onClick={onClose} role="presentation">
      <div className="rb-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2>{title}</h2>
          <button className="rb-btn rb-btn--small" onClick={onClose} aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Defines the hatch pattern once; every inline SVG on the page can fill with url(#rb-hatch). Hatched = declined or gap (spec §10). */
export function HatchDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <pattern id="rb-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#FFFFFF" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#6B6B6B" strokeWidth="2" />
        </pattern>
        <pattern id="rb-hatch-problem" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#FFFFFF" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#C0392B" strokeWidth="2" />
        </pattern>
      </defs>
    </svg>
  )
}

export function Legend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] rb-caption mt-2">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          <svg width="14" height="10" aria-hidden="true">
            <rect width="14" height="10" rx="2" fill={it.fill} stroke={it.stroke || 'none'} strokeDasharray={it.dash || 'none'} />
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  )
}
