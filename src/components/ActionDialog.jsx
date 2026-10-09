import { useState } from 'react'
import { Modal } from './ui.jsx'

/**
 * One dialog for every transition: a title, an explanation, the fields the transition needs (comment always unless
 * `comment` is false; attendees and date for the committee), Confirm and Cancel. `onConfirm` receives the values and
 * may throw; the message is shown in the dialog.
 */
export function ActionDialog({ title, intro, confirmLabel = 'Confirm', comment = true, attendees = false, date = false, extra = null, onConfirm, onClose, danger = false }) {
  const [values, setValues] = useState({ comment: '', attendees: '', decision_date: new Date().toISOString().slice(0, 10) })
  const [state, setState] = useState({ status: 'idle' })
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    if (comment && !values.comment.trim()) return setState({ status: 'error', message: 'A comment is required.' })
    if (attendees && !values.attendees.trim()) return setState({ status: 'error', message: 'The people in the room are required.' })
    if (date && !values.decision_date) return setState({ status: 'error', message: 'The decision date is required.' })
    setState({ status: 'working' })
    try {
      await onConfirm({ comment: values.comment.trim(), attendees: values.attendees.trim(), decision_date: values.decision_date, ...(extra?.values || {}) })
      onClose()
    } catch (err) {
      setState({ status: 'error', message: err.message || String(err) })
    }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {intro && <p className="text-[14px]">{intro}</p>}
        {extra?.render}
        {attendees && (
          <div>
            <label className="rb-label" htmlFor="attendees">
              People in the room
            </label>
            <input id="attendees" className="rb-input" value={values.attendees} onChange={set('attendees')} placeholder="Names and functions" />
          </div>
        )}
        {date && (
          <div>
            <label className="rb-label" htmlFor="decision_date">
              Decision date
            </label>
            <input id="decision_date" type="date" className="rb-input" value={values.decision_date} onChange={set('decision_date')} />
          </div>
        )}
        {comment && (
          <div>
            <label className="rb-label" htmlFor="comment">
              Comment
            </label>
            <textarea id="comment" className="rb-textarea" rows={3} value={values.comment} onChange={set('comment')} autoFocus />
          </div>
        )}
        {state.status === 'error' && <div className="rb-error">{state.message}</div>}
        <div className="flex gap-2 pt-1">
          <button type="submit" className={`rb-btn rb-btn--primary ${danger ? '!bg-rb-problem !border-rb-problem' : ''}`} disabled={state.status === 'working'}>
            {state.status === 'working' ? 'Working…' : confirmLabel}
          </button>
          <button type="button" className="rb-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
