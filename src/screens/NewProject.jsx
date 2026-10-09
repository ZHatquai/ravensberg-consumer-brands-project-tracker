import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { data, siteLabel } from '../lib/data.js'
import { UNIT_BY_CATEGORY, CATEGORIES, BASE_YEAR, TARGET_YEAR } from '../lib/calculations.js'
import { fmtInt } from '../lib/format.js'
import { Card, Eyebrow } from '../components/ui.jsx'
import { createProject, updateProject } from '../lib/actions.js'

const EMPTY = { title: '', category: '', description: '', total_impact: '', annual_impact: '', start_year: '', capex_eur: '', opex_eur_per_year: '', owner_name: '' }
const fromRow = (p) => Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] === null || p[k] === undefined ? '' : String(p[k])]))

export function validate(form) {
  const errors = {}
  const warnings = {}
  if (!form.title.trim()) errors.title = 'Title is required.'
  if (!form.category) errors.category = 'Choose a category.'
  if (!form.description.trim()) errors.description = 'Describe the project and how it delivers the impact.'
  const annual = Number(form.annual_impact)
  const total = Number(form.total_impact)
  if (form.annual_impact === '' || Number.isNaN(annual)) errors.annual_impact = 'Annual impact is required.'
  else if (annual <= 0) errors.annual_impact = 'Annual impact must be greater than zero.'
  if (form.total_impact === '' || Number.isNaN(total)) errors.total_impact = 'Total impact is required.'
  else if (!errors.annual_impact && total < annual) errors.total_impact = 'Total impact must be at least the annual impact.'
  const start = Number(form.start_year)
  if (form.start_year === '' || !Number.isInteger(start)) errors.start_year = 'Start year is required.'
  else if (start < BASE_YEAR) errors.start_year = `Start year must be ${BASE_YEAR} or later.`
  else if (start > TARGET_YEAR) warnings.start_year = `A start year after ${TARGET_YEAR} is accepted but contributes nothing to the 2030 targets.`
  if (form.capex_eur === '' || Number.isNaN(Number(form.capex_eur))) errors.capex_eur = 'Capex is required (0 if none).'
  else if (Number(form.capex_eur) < 0) errors.capex_eur = 'Capex cannot be negative.'
  if (form.opex_eur_per_year === '' || Number.isNaN(Number(form.opex_eur_per_year))) errors.opex_eur_per_year = 'Opex is required (negative for a saving, 0 if none).'
  if (!form.owner_name.trim()) errors.owner_name = 'Owner name is required.'
  return { errors, warnings, valid: Object.keys(errors).length === 0 }
}

/** Register a project (new) or edit one while Potential (editing): a site user their own site's, the ESG lead their own group project. */
export default function NewProject({ editing = false }) {
  const { id } = useParams()
  const { viewer, isSiteUser, isEsgLead, notify } = useAppState()
  const navigate = useNavigate()
  const existing = editing ? data.projects.find((x) => x.id === id) : null
  const [form, setForm] = useState(() => (existing ? fromRow(existing) : { ...EMPTY }))
  const [touched, setTouched] = useState({})
  const [save, setSave] = useState({ status: 'idle' })
  const { errors, warnings, valid } = useMemo(() => validate(form), [form])
  const unit = form.category ? UNIT_BY_CATEGORY[form.category] : '–'

  if (editing) {
    if (!existing) return <p>Project not found.</p>
    const own = isSiteUser ? existing.site_id === viewer.site_id : isEsgLead ? existing.scope === 'group' : false
    if (existing.status !== 'Potential' || !own)
      return (
        <div className="space-y-3 max-w-prose">
          <p className="font-semibold">{existing.project_code} cannot be edited here.</p>
          <p className="text-[14px]">
            {existing.status !== 'Potential'
              ? `A project is edited only while Potential; this version is ${existing.status}.${existing.status === 'Pending approval' && isEsgLead ? ' The figures are corrected on the project page, with a comment.' : ''}`
              : 'Only its owner edits it: the site for a site project, the ESG lead for a group project.'}
          </p>
          <Link to={`/projects/${existing.id}`} className="rb-btn no-underline">
            Back to the project
          </Link>
        </div>
      )
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const show = (k) => touched[k] || touched._all
  const field = (k, label, input, hint) => (
    <div>
      <label className="rb-label" htmlFor={k}>
        {label}
      </label>
      {input}
      {hint && <div className="rb-caption text-[12px] mt-0.5">{hint}</div>}
      {show(k) && errors[k] && <div className="rb-error">{errors[k]}</div>}
      {show(k) && !errors[k] && warnings[k] && <div className="rb-warning">{warnings[k]}</div>}
    </div>
  )
  const onSubmit = async (e) => {
    e.preventDefault()
    setTouched({ _all: true })
    if (!valid) return
    const fields = {
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      total_impact: Number(form.total_impact),
      annual_impact: Number(form.annual_impact),
      unit,
      start_year: Number(form.start_year),
      capex_eur: Number(form.capex_eur),
      opex_eur_per_year: Number(form.opex_eur_per_year),
      owner_name: form.owner_name.trim(),
    }
    setSave({ status: 'working' })
    try {
      if (editing) {
        await updateProject(existing.id, fields)
        notify({ title: `${existing.project_code} saved`, lines: [fields.title, `Annual impact: ${fmtInt(fields.annual_impact)} ${unit}, total ${fmtInt(fields.total_impact)}, from ${fields.start_year}`, 'Every changed field is in the history'], path: `/projects/${existing.id}` })
        navigate(`/projects/${existing.id}`)
      } else {
        // Site users register for their own site; the ESG lead registers group projects only (builder decision, 9 Oct 2026).
        // Status Potential, version 1 and the next project code are fixed by the database; the policy refuses anything else.
        const siteId = isSiteUser ? viewer.site_id : null
        const row = await createProject({ ...fields, scope: siteId ? 'site' : 'group', site_id: siteId, status: 'Potential', version: 1 })
        notify({ title: `${row.project_code} registered`, lines: [fields.title, 'Status: Potential, version 1', `Annual impact: ${fmtInt(fields.annual_impact)} ${unit}, total ${fmtInt(fields.total_impact)}, from ${fields.start_year}`, isSiteUser ? 'The ESG lead endorses it from here; you can edit it until then' : 'Endorse it from the register when it is ready for the committee'], path: `/projects/${row.id}` })
        navigate(`/projects/${row.id}`)
      }
    } catch (err) {
      setSave({ status: 'error', message: err.message || String(err) })
    }
  }

  const siteText = isSiteUser ? siteLabel(viewer.site_id) : 'Group project'
  return (
    <div className="space-y-4 max-w-[860px]">
      <div>
        <Eyebrow>{editing ? `${existing.project_code} · version ${existing.version} · ${existing.scope === 'site' ? siteLabel(existing.site_id) : 'Group project'}` : siteText}</Eyebrow>
        <h1 className="mt-0.5">{editing ? 'Edit the project' : 'Register a project'}</h1>
        <div className="rb-rule mt-1.5" />
        {editing && <p className="rb-caption text-[13px] mt-1">Editable while Potential. Every changed field is logged with old and new value.</p>}
      </div>
      <form onSubmit={onSubmit} noValidate>
        <Card className="space-y-4">
          {field('title', 'Title', <input id="title" className="rb-input" value={form.title} onChange={set('title')} onBlur={blur('title')} aria-invalid={show('title') && !!errors.title} />)}
          <div className="grid md:grid-cols-3 gap-4">
            {field(
              'category',
              'Category',
              <select id="category" className="rb-select" value={form.category} onChange={set('category')} onBlur={blur('category')} aria-invalid={show('category') && !!errors.category}>
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>,
            )}
            {editing
              ? field('site', 'Site', <input id="site" className="rb-input" value={existing.scope === 'site' ? siteLabel(existing.site_id) : 'Group (not tied to a site)'} readOnly />, 'Site and scope never change.')
              : isSiteUser
                ? field('site', 'Site', <input id="site" className="rb-input" value={siteLabel(viewer.site_id)} readOnly />, 'Fixed to your site.')
                : field('site', 'Site', <input id="site" className="rb-input" value="Group (not tied to a site)" readOnly />, 'The ESG lead registers group projects only; each site registers its own. Group projects count for the group only.')}
            {field('unit', 'Unit', <input id="unit" className="rb-input" value={unit} readOnly />, 'Set by the category.')}
          </div>
          {field('description', 'Description', <textarea id="description" className="rb-textarea" rows={4} value={form.description} onChange={set('description')} onBlur={blur('description')} aria-invalid={show('description') && !!errors.description} />, 'What the project is and how it delivers the impact.')}
          <div className="grid md:grid-cols-3 gap-4">
            {field('annual_impact', `Annual impact (${unit})`, <input id="annual_impact" type="number" min="0" step="any" className="rb-input" value={form.annual_impact} onChange={set('annual_impact')} onBlur={blur('annual_impact')} aria-invalid={show('annual_impact') && !!errors.annual_impact} />, 'At full run rate.')}
            {field('total_impact', `Total impact (${unit.replace(' per year', '')})`, <input id="total_impact" type="number" min="0" step="any" className="rb-input" value={form.total_impact} onChange={set('total_impact')} onBlur={blur('total_impact')} aria-invalid={show('total_impact') && !!errors.total_impact} />, "Over the project's life.")}
            {field('start_year', 'Start year', <input id="start_year" type="number" min={BASE_YEAR} step="1" className="rb-input" value={form.start_year} onChange={set('start_year')} onBlur={blur('start_year')} aria-invalid={show('start_year') && !!errors.start_year} />, `First year the annual impact applies (${BASE_YEAR}–${TARGET_YEAR}).`)}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {field('capex_eur', 'Capex (EUR, one-off)', <input id="capex_eur" type="number" min="0" step="any" className="rb-input" value={form.capex_eur} onChange={set('capex_eur')} onBlur={blur('capex_eur')} aria-invalid={show('capex_eur') && !!errors.capex_eur} />)}
            {field('opex_eur_per_year', 'Opex (EUR per year)', <input id="opex_eur_per_year" type="number" step="any" className="rb-input" value={form.opex_eur_per_year} onChange={set('opex_eur_per_year')} onBlur={blur('opex_eur_per_year')} aria-invalid={show('opex_eur_per_year') && !!errors.opex_eur_per_year} />, 'Negative for a saving.')}
            {field('owner_name', 'Owner name', <input id="owner_name" className="rb-input" value={form.owner_name} onChange={set('owner_name')} onBlur={blur('owner_name')} aria-invalid={show('owner_name') && !!errors.owner_name} />, 'The project owner at the site.')}
          </div>
          {save.status === 'error' && <div className="rb-error">{save.message}</div>}
          {touched._all && !valid && save.status !== 'error' && <div className="rb-error">Please correct the fields marked above.</div>}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button type="submit" className="rb-btn rb-btn--primary" disabled={save.status === 'working'}>
              {save.status === 'working' ? 'Saving…' : editing ? 'Save changes' : 'Submit'}
            </button>
            <button type="button" className="rb-btn" onClick={() => navigate(editing ? `/projects/${existing.id}` : '/projects')}>
              Cancel
            </button>
            {!editing && <span className="rb-caption text-[12px]">Saved as Potential, version 1, with the next sequential project ID.</span>}
          </div>
        </Card>
      </form>
    </div>
  )
}
