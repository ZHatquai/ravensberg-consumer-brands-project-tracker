import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { data, siteLabel, personName } from '../lib/data.js'
import { asOfForYear, groupBy, statusAsOf, daysWaiting, TARGET_YEAR } from '../lib/calculations.js'
import { fmtInt, fmtEur, fmtDate, fmtDateTime, STAGE_LABEL, FIELD_LABEL } from '../lib/format.js'
import { Card, Eyebrow, StatusDot, SectionTitle } from '../components/ui.jsx'

export default function ProjectPage() {
  const { id } = useParams()
  const { year, siteId, isSiteUser } = useAppState()
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
  }, [id, year])

  if (!view) return <p>Project not found.</p>
  const { p, history, decisions, predecessor, successor, waiting } = view
  if (isSiteUser && p.site_id !== siteId) return <p>This project belongs to another site.</p>
  if (!p.status)
    return (
      <p>
        {p.project_code} was registered on {fmtDate(p.created_at)}, after the end of the reporting year {year}. Choose a later year to see it.
      </p>
    )

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

      <p className="rb-caption text-[12px]">The action bar (Edit, Resubmit, Retire, Endorse, Decline, Record committee decision, Mark obsolete) comes with the access phase, together with the login and the row rules.</p>
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
