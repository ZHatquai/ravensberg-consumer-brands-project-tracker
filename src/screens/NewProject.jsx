import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { data, sitesSorted, siteLabel } from '../lib/data.js'
import { UNIT_BY_CATEGORY, CATEGORIES, BASE_YEAR, TARGET_YEAR } from '../lib/calculations.js'
import { fmtInt, fmtEur } from '../lib/format.js'
import { Card, Eyebrow } from '../components/ui.jsx'

const EMPTY = { title: '', category: '', site: '', description: '', total_impact: '', annual_impact: '', start_year: '', capex_eur: '', opex_eur_per_year: '', owner_name: '' }

export function validate(form, { isSiteUser }) {
  const errors = {}
  const warnings = {}
  if (!form.title.trim()) errors.title = 'Title is required.'
  if (!form.category) errors.category = 'Choose a category.'
  if (!isSiteUser && !form.site) errors.site = 'Choose Group or a site.'
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

export default function NewProject() {
  const { viewer, isSiteUser, isEsgLead } = useAppState()
  const navigate = useNavigate()
  const [form, setForm] = useState({ ...EMPTY, site: isSiteUser ? viewer.site_id : '' })
  const [touched, setTouched] = useState({})
  const [preview, setPreview] = useState(null)
  const { errors, warnings, valid } = useMemo(() => validate(form, { isSiteUser }), [form, isSiteUser])
  const unit = form.category ? UNIT_BY_CATEGORY[form.category] : '–'
  const nextCode = useMemo(() => {
    const max = data.projects.reduce((m, p) => Math.max(m, Number(p.project_code.replace('PRJ-', '')) || 0), 0)
    return `PRJ-${String(max + 1).padStart(4, '0')}`
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }))
  const show = (k) => touched[k] || preview !== null || touched._all
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
  const onSubmit = (e) => {
    e.preventDefault()
    setTouched({ _all: true })
    if (!valid) return
    const siteId = isSiteUser ? viewer.site_id : form.site === 'group' ? null : form.site
    setPreview({ ...form, site_id: siteId, scope: siteId ? 'site' : 'group', unit, project_code: nextCode })
  }

  return (
    <div className="space-y-4 max-w-[860px]">
      <div>
        <Eyebrow>{isSiteUser ? siteLabel(viewer.site_id) : 'Group or a site'}</Eyebrow>
        <h1 className="mt-0.5">Register a project</h1>
        <div className="rb-rule mt-1.5" />
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
            {isSiteUser
              ? field('site', 'Site', <input id="site" className="rb-input" value={siteLabel(viewer.site_id)} readOnly />, 'Fixed to your site.')
              : field(
                  'site',
                  'Site',
                  <select id="site" className="rb-select" value={form.site} onChange={set('site')} onBlur={blur('site')} aria-invalid={show('site') && !!errors.site}>
                    <option value="">Choose…</option>
                    <option value="group">Group (not tied to a site)</option>
                    {sitesSorted.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} {s.name}
                      </option>
                    ))}
                  </select>,
                  isEsgLead ? 'Group projects count for the group only.' : undefined,
                )}
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
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="submit" className="rb-btn rb-btn--primary">
              Submit
            </button>
            <button type="button" className="rb-btn" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </Card>
      </form>

      {preview && (
        <Card className="border-l-4 border-l-rb-attention">
          <h3>Nothing is saved yet</h3>
          <p className="text-[14px] mt-1">
            Saving comes with the access phase, together with the login. The form is valid: it would be registered as <strong>{preview.project_code}</strong>, status Potential, version 1, and the Project page would open.
          </p>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-[13px] mt-3">
            <Item k="Title" v={preview.title} />
            <Item k="Category" v={preview.category} />
            <Item k="Scope" v={preview.scope} />
            <Item k="Site" v={siteLabel(preview.site_id)} />
            <Item k="Annual impact" v={`${fmtInt(preview.annual_impact)} ${preview.unit}`} />
            <Item k="Total impact" v={fmtInt(preview.total_impact)} />
            <Item k="Start year" v={preview.start_year} />
            <Item k="Capex" v={fmtEur(preview.capex_eur)} />
            <Item k="Opex per year" v={fmtEur(preview.opex_eur_per_year)} />
            <Item k="Owner" v={preview.owner_name} />
          </dl>
          <div className="mt-3">
            <Link to="/projects" className="rb-btn rb-btn--small no-underline">
              Back to the register
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}

function Item({ k, v }) {
  return (
    <div>
      <dt className="rb-caption text-[12px]">{k}</dt>
      <dd className="font-semibold">{v}</dd>
    </div>
  )
}
