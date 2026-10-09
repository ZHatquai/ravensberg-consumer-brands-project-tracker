import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { data, sitesSorted, siteShort, personName, profileById } from '../lib/data.js'
import { registerRows, CATEGORIES, STATUSES } from '../lib/calculations.js'
import { fmtInt, fmtDate } from '../lib/format.js'
import { Card, Eyebrow, StatusDot } from '../components/ui.jsx'
import { ExportCsvDialog } from '../components/ExportCsvDialog.jsx'
import { ActionDialog } from '../components/ActionDialog.jsx'
import { endorseProject, declineProject, recordCommitteeDecision } from '../lib/actions.js'

const COLUMNS = [
  ['project_code', 'Project'],
  ['category', 'Category'],
  ['scope', 'Scope'],
  ['site', 'Site'],
  ['annual_impact', 'Annual impact', 'num'],
  ['start_year', 'Start', 'num'],
  ['status', 'Status'],
  ['created_at', 'Submitted on'],
  ['daysWaiting', 'Days waiting', 'num'],
]

export default function Register() {
  const { siteId, siteSel, setSiteSel, canChooseSite, year, setYear, years, isEsgLead, canRegister, version } = useAppState()
  const navigate = useNavigate()
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [submittedBy, setSubmittedBy] = useState('all')
  const [sort, setSort] = useState(null)
  const [csv, setCsv] = useState(false)
  const [dialog, setDialog] = useState(null) // { kind: 'endorse' | 'decline' | 'record', project }
  const [outcome, setOutcome] = useState('Approved')
  const currentYear = years[years.length - 1]

  const base = useMemo(() => registerRows(data, { siteId, year }), [siteId, year, version]) // eslint-disable-line react-hooks/exhaustive-deps
  const submitters = useMemo(() => {
    const ids = [...new Set(base.rows.map((p) => p.created_by).filter(Boolean))]
    return ids.map((id) => profileById[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name))
  }, [base])

  const rows = useMemo(() => {
    let r = base.rows.filter((p) => (category === 'all' || p.category === category) && (status === 'all' || p.status === status) && (submittedBy === 'all' || p.created_by === submittedBy))
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1
      const val = (p) => (sort.key === 'site' ? siteShort(p.site_id) : sort.key === 'daysWaiting' ? (p.daysWaiting ?? -1) : p[sort.key])
      r = [...r].sort((a, b) => {
        const va = val(a)
        const vb = val(b)
        if (va === vb) return 0
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
        return String(va).localeCompare(String(vb)) * dir
      })
    }
    return r
  }, [base, category, status, submittedBy, sort])

  const toggleSort = (key) => setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  const filters = { category: category === 'all' ? null : category, status: status === 'all' ? null : status, submittedBy: submittedBy === 'all' ? null : submittedBy }
  const actionsLive = isEsgLead && year === currentYear
  const act = (kind, project) => (e) => {
    e.stopPropagation()
    setOutcome('Approved')
    setDialog({ kind, project })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>
            {rows.length} of {base.rows.length} projects · Pending approval first
          </Eyebrow>
          <h1 className="mt-0.5">Project register</h1>
          <div className="rb-rule mt-1.5" />
        </div>
        <div className="flex flex-wrap gap-2">
          {canRegister && (
            <Link to="/projects/new" className="rb-btn rb-btn--primary no-underline">
              Register a project
            </Link>
          )}
          <button className="rb-btn" onClick={() => setCsv(true)}>
            Export CSV
          </button>
        </div>
      </div>

      <Card className="!py-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[13px]">
          <label>
            <span className="rb-label">Reporting year</span>
            <select className="rb-select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          {canChooseSite && (
            <label>
              <span className="rb-label">Site</span>
              <select className="rb-select" value={siteSel} onChange={(e) => setSiteSel(e.target.value)}>
                <option value="group">All sites and group</option>
                {sitesSorted.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="rb-label">Category</span>
            <select className="rb-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="rb-label">Status</span>
            <select className="rb-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="rb-label">Submitted by</span>
            <select className="rb-select" value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)}>
              <option value="all">Anyone</option>
              {submitters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <div className="rb-card overflow-x-auto">
        <table className="rb-table">
          <thead>
            <tr>
              {COLUMNS.map(([key, label, cls]) => (
                <th key={key} className={cls || ''}>
                  <button className="font-display font-semibold text-white bg-transparent border-0 p-0 cursor-pointer" onClick={() => toggleSort(key)} aria-label={`Sort by ${label}`}>
                    {label}
                    {sort?.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
              {actionsLive && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="rb-row-link" onClick={() => navigate(`/projects/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${p.id}`)}>
                <td>
                  <div className="font-semibold whitespace-nowrap">
                    {p.project_code}
                    {p.version > 1 && <span className="rb-caption font-normal"> v{p.version}</span>}
                    {p.superseded && <span className="rb-caption font-normal"> · superseded</span>}
                  </div>
                  <div className="text-[13px]">{p.title}</div>
                </td>
                <td>{p.category}</td>
                <td className="capitalize">{p.scope}</td>
                <td className="whitespace-nowrap">{siteShort(p.site_id)}</td>
                <td className="num whitespace-nowrap">
                  <span className="rb-num">{fmtInt(p.annual_impact)}</span> <span className="rb-caption text-[12px]">{p.unit.replace(' per year', '/yr')}</span>
                </td>
                <td className="num">{p.start_year}</td>
                <td>
                  <StatusDot status={p.status} />
                </td>
                <td className="whitespace-nowrap">
                  {fmtDate(p.created_at)}
                  <div className="rb-caption text-[12px]">{personName(p.created_by)}</div>
                </td>
                <td className="num">{p.daysWaiting ?? ''}</td>
                {actionsLive && (
                  <td className="whitespace-nowrap">
                    {p.status === 'Potential' && (
                      <span className="inline-flex gap-1">
                        <button className="rb-btn rb-btn--small rb-btn--primary" onClick={act('endorse', p)}>
                          Endorse
                        </button>
                        <button className="rb-btn rb-btn--small" onClick={act('decline', p)}>
                          Decline
                        </button>
                      </span>
                    )}
                    {p.status === 'Pending approval' && (
                      <span className="inline-flex gap-1">
                        <button className="rb-btn rb-btn--small rb-btn--primary" onClick={act('record', p)}>
                          Record decision
                        </button>
                        <button className="rb-btn rb-btn--small" onClick={act('decline', p)}>
                          Decline
                        </button>
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + (actionsLive ? 1 : 0)} className="rb-caption text-center py-6">
                  No project matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {isEsgLead && year !== currentYear && <p className="rb-caption text-[12px]">Row actions apply to the current year; switch the reporting year to {currentYear} to act.</p>}
      {csv && <ExportCsvDialog onClose={() => setCsv(false)} filters={filters} rows={rows} />}
      {dialog?.kind === 'endorse' && (
        <ActionDialog title={`Endorse ${dialog.project.project_code}`} intro={`${dialog.project.title} goes to the committee as Pending approval.`} confirmLabel="Endorse" onConfirm={({ comment }) => endorseProject(dialog.project.id, comment)} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'decline' && (
        <ActionDialog title={`Decline ${dialog.project.project_code}`} intro={`${dialog.project.title} is declined; the site can resubmit a new version or retire it.`} confirmLabel="Decline" danger onConfirm={({ comment }) => declineProject(dialog.project.id, comment)} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'record' && (
        <ActionDialog
          title={`Committee decision on ${dialog.project.project_code}`}
          intro={dialog.project.title}
          confirmLabel="Record decision"
          attendees
          date
          extra={{
            values: { outcome },
            render: (
              <div>
                <label className="rb-label" htmlFor="outcome">
                  Outcome
                </label>
                <select id="outcome" className="rb-select" value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                  <option>Approved</option>
                  <option>Declined</option>
                </select>
              </div>
            ),
          }}
          onConfirm={({ comment, attendees, decision_date }) => recordCommitteeDecision(dialog.project.id, outcome, comment, attendees, decision_date)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
