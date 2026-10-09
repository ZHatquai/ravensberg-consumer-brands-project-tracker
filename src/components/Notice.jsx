/**
 * The confirmation shown after an action: what happened and the entries that were saved. Set through
 * useAppState().notify({ title, lines, path }); it stays until closed or until the person leaves the page it belongs to.
 */
export function Notice({ notice, onClose }) {
  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 pt-4">
      <div className="rb-card p-3 border-l-4 flex items-start gap-3" style={{ borderLeftColor: '#2E8B57' }} role="status" aria-live="polite">
        <span className="rb-dot rb-dot--ok mt-1.5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-[15px]">{notice.title}</div>
          {notice.lines?.length > 0 && (
            <ul className="text-[13px] mt-1 space-y-0.5">
              {notice.lines.filter(Boolean).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        <button className="rb-btn rb-btn--small" onClick={onClose} aria-label="Close this confirmation">
          Close
        </button>
      </div>
    </div>
  )
}
