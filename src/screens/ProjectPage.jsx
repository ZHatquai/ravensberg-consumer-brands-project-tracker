import { useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { data, siteLabel, personName } from '../lib/data.js'
import { asOfForYear, groupBy, statusAsOf, daysWaiting, TARGET_YEAR, BASE_YEAR } from '../lib/calculations.js'
import { fmtInt, fmtEur, fmtDate, fmtDateTime, STAGE_LABEL, FIELD_LABEL } from '../lib/format.js'
import { Card, Eyebrow, StatusDot, SectionTitle } from '../components/ui.jsx'
import { ActionDialog } from '../components/ActionDialog.jsx'
import { endorseProject, declineProject, recordCommitteeDecision, markProjectObsolete, reapproveProject, resubmitProject, retireProject, reinstateProject, editProjectFigures, uploadPresentation, presentationDownloadUrl } from '../lib/actions.js'
import { checkPresentationFile, ACCEPT, MAX_LABEL } from '../lib/presentation.js'

const FIGURE_KEYS = ['total_impact', 'annual_impact', 'start_year', 'capex_eur', 'opex_eur_per_year']
const FIGURE_LABEL = { total_impact: 'Total impact', annual_impact: 'Annual impact', start_year: 'Start year', capex_eur: 'Capex (EUR)', opex_eur_per_year: 'Opex (EUR per year)' }

export default function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { year, years, siteId, isSiteUser, isEsgLead, viewer, version, notify } = useAppState()
  const [dialog, setDialog] = useState(null) // the open action: endorse | decline | record | figures | obsolete | reapprove | resubmit | retire | reinstate
  const [outcome, setOutcome] = useState('Approved')
  const [fig, setFig] = useState({})
  const [pres, setPres] = useState({ status: 'idle' }) // the presentation section: idle | uploading | downloading | error
  const fileRef = useRef(null)
  const currentYear = years[years.length - 1]

  const view = useMemo(() => {
    const p = data.projects.find((x) => x.id === id)
    if (!p) return null
    const asOf = asOfForYear(year)
    const history = (groupBy(data.history, 'project_id')[p.id] || []).filter((h) => new Date(h.changed_at) <= asOf).sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1))
    const decisions = (groupBy(data.decisions, 'project_id')[p.id] || []).filter((d) => new Date(d.recorded_at) <= asOf).sort((a, b) => (a.decision_date < b.decision_date ? 1 : -1))
    const status = statusAsOf(p, history, asOf)
    const predecessor = p.supersedes_project_id ? data.projects.find((x) => x.id === p.supersedes_project_id) : null
    const successor = data.projects.find((x) => x.supersedes_project_id === p.id && new Date(x.created_at) <= asOf)
    return { p: { ...p, status }, asOf, history, decisions, predecessor, successor, waiting: status ? daysWaiting({ ...p, status }, decisions, asOf) : null }
  }, [id, year, version]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return <p>Project not found.</p>
  const { p, history, decisions, predecessor, successor, waiting } = view
  if (isSiteUser && p.site_id !== siteId) return <p>Project not found.</p>
  if (!p.status)
    return (
      <p>
        {p.project_code} was registered on {fmtDate(p.created_at)}, after the end of the reporting year {year}. Choose a later year to see it.
      </p>
    )

  // Who owns this row: the site for its site projects, the ESG lead for group projects (docs/access-matrix.md §3). The database checks the same.
  const own = isSiteUser ? p.site_id === viewer.site_id : isEsgLead ? p.scope === 'group' : false
  const live = year === currentYear
  const actions = []
  if (live) {
    if (p.status === 'Potential') {
      if (own) actions.push({ key: 'edit', label: 'Edit', to: `/projects/${p.id}/edit` })
      if (isEsgLead) actions.push({ key: 'endorse', label: 'Endorse', primary: true }, { key: 'decline', label: 'Decline' })
    }
    if (p.status === 'Pending approval' && isEsgLead) actions.push({ key: 'record', label: 'Record committee decision', primary: true }, { key: 'decline', label: 'Decline' }, { key: 'figures', label: 'Correct figures' })
    if (p.status === 'Approved' && isEsgLead) actions.push({ key: 'reapprove', label: 'Send for re-approval' }, { key: 'obsolete', label: 'Mark obsolete' })
    if (p.status === 'Declined' && own && !successor) actions.push({ key: 'resubmit', label: 'Resubmit as a new version', primary: true }, { key: 'retire', label: 'Retire' })
    if (p.status === 'Obsolete' && isEsgLead && !successor) actions.push({ key: 'reinstate', label: 'Reinstate' })
  }
  const open = (key) => {
    setOutcome('Approved')
    if (key === 'figures') setFig(Object.fromEntries(FIGURE_KEYS.map((k) => [k, String(p[k] ?? '')])))
    setDialog(key)
  }
  const frozen = ['Approved', 'Declined', 'Retired', 'Obsolete'].includes(p.status)
  // The approval presentation (v1.3): the owner attaches or replaces it while Potential; frozen from Pending approval on; versions from before the rule take none.
  const exempt = !p.presentation_required
  const canAttach = live && own && p.status === 'Potential' && !exempt
  const needsFile = !exempt && !p.presentation_file_name
  const pickFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    const message = checkPresentationFile(f)
    if (message) return setPres({ status: 'error', message })
    setPres({ status: 'uploading' })
    try {
      const replaced = !!p.presentation_file_name
      await uploadPresentation(p.id, f)
      setPres({ status: 'idle' })
      notify({ title: `Presentation ${replaced ? 'replaced' : 'attached'} on ${p.project_code}`, lines: [f.name, 'Logged in the history with your name and the time', replaced ? 'The previous file is overwritten' : 'The ESG lead can endorse the project now'] })
    } catch (err) {
      setPres({ status: 'error', message: err.message || String(err) })
    }
  }
  const download = async () => {
    setPres({ status: 'downloading' })
    try {
      const url = await presentationDownloadUrl(p.id, p.presentation_file_name)
      window.location.assign(url)
      setPres({ status: 'idle' })
    } catch (err) {
      setPres({ status: 'error', message: err.message || String(err) })
    }
  }

  const fields = [
    ['Category', p.category],
    ['Scope', p.scope === 'site' ? 'Site project' : 'Group project'],
    ['Site', siteLabel(p.site_id)],
    ['Owner', p.owner_name],
    ['Total impact', `${fmtInt(p.total_impact)} ${p.unit.replace(' per year', '')}`],
    ['Annual impact', `${fmtInt(p.annual_impact)} ${p.unit}`],
    ['Start year', p.start_year > TARGET_YEAR ? `${p.start_year} (contributes nothing to 2030)` : p.start_year],
    ['Capex', fmtEur(p.capex_eur)],
    ['Opex per year', `${fmtEur(p.opex_eur_per_year)}${Number(p.opex_eur_per_year) < 0 ? ' (saving)' : ''}`],
    ['Submitted by', personName(p.created_by)],
    ['Submitted on', fmtDate(p.created_at)],
    ['Days waiting', waiting ?? '–'],
  ]

  const figureChanges = () => {
    const changes = {}
    for (const k of FIGURE_KEYS) {
      const v = fig[k]
      if (v === '' || v === undefined) throw new Error(`${FIGURE_LABEL[k]} is required.`)
      const n = Number(v)
      if (Number.isNaN(n)) throw new Error(`${FIGURE_LABEL[k]} must be a number.`)
      if (n !== Number(p[k])) changes[k] = k === 'start_year' ? Math.trunc(n) : n
    }
    const annual = changes.annual_impact ?? Number(p.annual_impact)
    const total = changes.total_impact ?? Number(p.total_impact)
    if (annual <= 0) throw new Error('Annual impact must be greater than zero.')
    if (total < annual) throw new Error('Total impact must be at least the annual impact.')
    if ((changes.start_year ?? p.start_year) < BASE_YEAR) throw new Error(`Start year must be ${BASE_YEAR} or later.`)
    if ((changes.capex_eur ?? Number(p.capex_eur)) < 0) throw new Error('Capex cannot be negative.')
    if (Object.keys(changes).length === 0) throw new Error('Nothing changed.')
    return changes
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/projects" className="rb-caption text-[13px] no-underline hover:underline">
          ← Project register
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
          <div>
            <Eyebrow>
              {p.project_code} · version {p.version}
              {predecessor && (
                <>
                  {' '}
                  · supersedes{' '}
                  <Link to={`/projects/${predecessor.id}`} className="underline">
                    v{predecessor.version}
                  </Link>
                </>
              )}
              {successor && (
                <>
                  {' '}
                  · superseded by{' '}
                  <Link to={`/projects/${successor.id}`} className="underline">
                    v{successor.version}
                  </Link>
                </>
              )}
            </Eyebrow>
            <h1 className="mt-0.5">{p.title}</h1>
            <div className="rb-rule mt-1.5" />
          </div>
          <div className="rb-pill text-[14px]">
            <StatusDot status={p.status} />
          </div>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Actions">
          {actions.map((a) =>
            a.to ? (
              <Link key={a.key} to={a.to} className={`rb-btn no-underline ${a.primary ? 'rb-btn--primary' : ''}`}>
                {a.label}
              </Link>
            ) : (
              <button key={a.key} className={`rb-btn ${a.primary ? 'rb-btn--primary' : ''}`} onClick={() => open(a.key)}>
                {a.label}
              </button>
            ),
          )}
        </div>
      )}
      {!live && (isEsgLead || own) && <p className="rb-caption text-[12px]">Actions apply to the current year; switch the reporting year to {currentYear} to act.</p>}
      {live && frozen && actions.length === 0 && (isEsgLead || own) && <p className="rb-caption text-[12px]">This version is {p.status} and frozen: {successor ? `a newer version (v${successor.version}) carries the project.` : 'nothing on it changes in place.'}</p>}

      <Card>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 text-[14px]">
          {fields.map(([k, v]) => (
            <div key={k}>
              <dt className="rb-caption text-[12px]">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4">
          <div className="rb-caption text-[12px]">Description</div>
          <p className="mt-0.5 max-w-prose">{p.description}</p>
        </div>
      </Card>

      <section>
        <SectionTitle eyebrow="PowerPoint, one file per version" title="Approval presentation" />
        <Card>
          {exempt ? (
            <p className="text-[14px]">No presentation (registered before the rule).</p>
          ) : needsFile ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px]">
                <span className="rb-dot rb-dot--attention mr-1.5" aria-hidden="true" />
                No presentation yet: {canAttach ? 'attach one before endorsement.' : 'its owner attaches one before the ESG lead can endorse this version.'}
              </p>
              {canAttach && (
                <button className="rb-btn rb-btn--primary" onClick={() => fileRef.current?.click()} disabled={pres.status === 'uploading'}>
                  {pres.status === 'uploading' ? 'Uploading…' : 'Attach presentation'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-[14px]">
                <div className="col-span-2 md:col-span-1">
                  <dt className="rb-caption text-[12px]">File</dt>
                  <dd className="font-semibold break-all">{p.presentation_file_name}</dd>
                </div>
                <div>
                  <dt className="rb-caption text-[12px]">Uploaded by</dt>
                  <dd className="font-semibold">{personName(p.presentation_uploaded_by)}</dd>
                </div>
                <div>
                  <dt className="rb-caption text-[12px]">Uploaded on</dt>
                  <dd className="font-semibold">{fmtDateTime(p.presentation_uploaded_at)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <button className="rb-btn rb-btn--primary" onClick={download} disabled={pres.status === 'downloading'}>
                  {pres.status === 'downloading' ? 'Preparing…' : 'Download'}
                </button>
                {canAttach && (
                  <button className="rb-btn" onClick={() => fileRef.current?.click()} disabled={pres.status === 'uploading'}>
                    {pres.status === 'uploading' ? 'Uploading…' : 'Replace presentation'}
                  </button>
                )}
              </div>
            </div>
          )}
          {canAttach && <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={pickFile} aria-label="Presentation file" />}
          {pres.status === 'error' && <div className="rb-error mt-2">{pres.message}</div>}
          {!exempt && (
            <p className="rb-caption text-[12px] mt-3">
              {p.status === 'Potential'
                ? `One PowerPoint file (.pptx, max ${MAX_LABEL}) per version, replaceable by its owner while Potential; frozen from endorsement on. Every upload is in the history. The download link is valid for a minute.`
                : 'Frozen since endorsement: this is the file the committee decides on. The download link is valid for a minute.'}
            </p>
          )}
        </Card>
      </section>

      <section>
        <SectionTitle eyebrow={`${decisions.length} recorded`} title="Decisions" />
        <div className="rb-card overflow-x-auto">
          <table className="rb-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Outcome</th>
                <th>Date</th>
                <th>People in the room</th>
                <th>Comment</th>
                <th>Recorded by</th>
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap">{STAGE_LABEL[d.stage] || d.stage}</td>
                  <td className="whitespace-nowrap font-semibold">{d.outcome}</td>
                  <td className="whitespace-nowrap">{fmtDate(d.decision_date)}</td>
                  <td className="min-w-[160px]">{d.attendees || '–'}</td>
                  <td className="min-w-[240px]">{d.comment}</td>
                  <td className="whitespace-nowrap">
                    {personName(d.recorded_by)}
                    <div className="rb-caption text-[12px]">{fmtDateTime(d.recorded_at)}</div>
                  </td>
                </tr>
              ))}
              {decisions.length === 0 && (
                <tr>
                  <td colSpan={6} className="rb-caption text-center py-4">
                    No decision yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionTitle eyebrow="Every field change, newest first" title="History" />
        <div className="rb-card overflow-x-auto">
          <table className="rb-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Field</th>
                <th>Old value</th>
                <th>New value</th>
                <th>Who</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(h.changed_at)}</td>
                  <td className="whitespace-nowrap">{FIELD_LABEL[h.field] || h.field}</td>
                  <td>{renderValue(h.field, h.old_value)}</td>
                  <td className="font-semibold">{renderValue(h.field, h.new_value)}</td>
                  <td className="whitespace-nowrap">{personName(h.changed_by)}</td>
                  <td className="min-w-[200px]">{h.comment || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {dialog === 'endorse' && <ActionDialog title={`Endorse ${p.project_code}`} intro={`${p.title} goes to the committee as Pending approval.${needsFile ? ' This version has no approval presentation yet: the database refuses the endorsement until its owner attaches one.' : ''}`} confirmLabel="Endorse" onConfirm={async ({ comment }) => {
            await endorseProject(p.id, comment)
            notify({ title: `${p.project_code} endorsed`, lines: ['Status: Pending approval, now with the committee', `Comment: ${comment}`] })
          }} onClose={() => setDialog(null)} />}
      {dialog === 'decline' && <ActionDialog title={`Decline ${p.project_code}`} intro={`${p.title} is declined; its owner can resubmit a new version or retire it.`} confirmLabel="Decline" danger onConfirm={async ({ comment }) => {
            await declineProject(p.id, comment)
            notify({ title: `${p.project_code} declined`, lines: ['Status: Declined. Its owner can resubmit a new version or retire it', `Comment: ${comment}`] })
          }} onClose={() => setDialog(null)} />}
      {dialog === 'record' && (
        <ActionDialog
          title={`Committee decision on ${p.project_code}`}
          intro={p.title}
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
          onConfirm={async ({ comment, attendees, decision_date }) => {
            await recordCommitteeDecision(p.id, outcome, comment, attendees, decision_date)
            notify({ title: `Committee decision recorded for ${p.project_code}`, lines: [`Outcome: ${outcome}`, `Decision date: ${fmtDate(decision_date)}`, `People in the room: ${attendees}`, `Comment: ${comment}`] })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'figures' && (
        <ActionDialog
          title={`Correct the figures of ${p.project_code}`}
          intro="Only while Pending approval, with a comment; every change is logged with old and new value."
          confirmLabel="Save correction"
          extra={{
            values: {},
            render: (
              <div className="grid grid-cols-2 gap-3">
                {FIGURE_KEYS.map((k) => (
                  <div key={k}>
                    <label className="rb-label" htmlFor={`fig-${k}`}>
                      {FIGURE_LABEL[k]}
                    </label>
                    <input id={`fig-${k}`} type="number" step={k === 'start_year' ? '1' : 'any'} className="rb-input" value={fig[k] ?? ''} onChange={(e) => setFig((f) => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
            ),
          }}
          onConfirm={async ({ comment }) => {
            const changes = figureChanges()
            await editProjectFigures(p.id, changes, comment)
            notify({ title: `Figures of ${p.project_code} corrected`, lines: [...Object.entries(changes).map(([k, v]) => `${FIGURE_LABEL[k]}: ${fmtInt(p[k])} to ${fmtInt(v)}`), `Comment: ${comment}`, 'Each change is in the history with the comment'] })
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'obsolete' && <ActionDialog title={`Mark ${p.project_code} obsolete`} intro="The savings leave every year of the pathway; the row stays visible with its history. Reinstate undoes a mistake." confirmLabel="Mark obsolete" danger onConfirm={async ({ comment }) => {
            await markProjectObsolete(p.id, comment)
            notify({ title: `${p.project_code} marked obsolete`, lines: ['Status: Obsolete. It leaves every year of the pathway; the row stays visible', `Comment: ${comment}`] })
          }} onClose={() => setDialog(null)} />}
      {dialog === 'reapprove' && (
        <ActionDialog
          title={`Send ${p.project_code} for re-approval`}
          intro={`This approved version becomes Obsolete and version ${p.version + 1} opens in Potential with the same figures, to be edited and approved again from the start. The covered figure drops at once. The new version starts without a presentation; its owner attaches one before endorsement.`}
          confirmLabel="Start re-approval"
          onConfirm={async ({ comment }) => {
            const newId = await reapproveProject(p.id, comment)
            notify({ title: `${p.project_code} sent for re-approval`, lines: [`Version ${p.version} is now Obsolete and out of every target figure`, `Version ${p.version + 1} opened in Potential with the same figures and no presentation; its owner edits it and attaches the deck, then you endorse it`, `Comment: ${comment}`], path: `/projects/${newId}` })
            navigate(`/projects/${newId}`)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'resubmit' && (
        <ActionDialog
          title={`Resubmit ${p.project_code}`}
          intro={`Version ${p.version + 1} is created in Potential with the same project ID and figures, linked to this declined version; the form then opens so you can revise it. It starts without a presentation: attach the revised deck on its project page before endorsement.`}
          confirmLabel="Create the new version"
          comment={false}
          onConfirm={async () => {
            const newId = await resubmitProject(p.id)
            notify({ title: `${p.project_code} resubmitted`, lines: [`Version ${p.version + 1} created in Potential, linked to version ${p.version}`, 'Revise it below and save, then attach the revised presentation on its project page; the ESG lead endorses it from there'], path: `/projects/${newId}/edit` })
            navigate(`/projects/${newId}/edit`)
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'retire' && <ActionDialog title={`Retire ${p.project_code}`} intro="The project stays visible as Retired and counts in no target figure." confirmLabel="Retire" danger onConfirm={async ({ comment }) => {
            await retireProject(p.id, comment)
            notify({ title: `${p.project_code} retired`, lines: ['Status: Retired. It stays visible and counts in no target figure', `Comment: ${comment}`] })
          }} onClose={() => setDialog(null)} />}
      {dialog === 'reinstate' && <ActionDialog title={`Reinstate ${p.project_code}`} intro="The version counts again as Approved. Only possible while no newer version exists." confirmLabel="Reinstate" onConfirm={async ({ comment }) => {
            await reinstateProject(p.id, comment)
            notify({ title: `${p.project_code} reinstated`, lines: ['Status: Approved. It counts again in every year from its start year', `Comment: ${comment}`] })
          }} onClose={() => setDialog(null)} />}
    </div>
  )
}

function renderValue(field, v) {
  if (v === null || v === undefined) return '–'
  if (field === 'site_id') return siteLabel(v)
  if (['total_impact', 'annual_impact'].includes(field)) return fmtInt(v)
  if (['capex_eur', 'opex_eur_per_year'].includes(field)) return fmtEur(v)
  return v
}
