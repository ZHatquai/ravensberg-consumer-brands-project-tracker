import { useMemo, useState } from 'react'
import { useAppState } from '../lib/appState.jsx'
import { data, sitesSorted, personName } from '../lib/data.js'
import { figure, latestActual, outputPath, BASE_YEAR, TARGET_YEAR, PALLET_SITE_CODE, indexBy } from '../lib/calculations.js'
import { fmtInt, fmtNum, fmtPct, fmtDate, fmtDateTime } from '../lib/format.js'
import { Card, Eyebrow, SectionTitle, Flag, Estimate, Modal } from '../components/ui.jsx'
import { saveReferenceFigure, updateTarget, saveSite } from '../lib/actions.js'

const TARGET_LABEL = {
  emissions: 'Emissions, Scope 1+2 (location-based)',
  water_absolute: 'Water, absolute withdrawal',
  water_intensity: 'Water, intensity (withdrawal per tonne output)',
  waste_diversion: 'Waste, diversion from landfill at every site',
}
const FIGURE_FIELDS = [
  ['scope12_tco2e', 'Scope 1+2 emissions', 'tCO₂e'],
  ['water_withdrawal_m3', 'Water withdrawal', 'm³'],
  ['output_t', 'Output', 't (site 1100: pallets)'],
  ['waste_total_t', 'Total waste', 't'],
  ['waste_diverted_t', 'Waste diverted', 't'],
]
const FIGURE_LABEL = Object.fromEntries(FIGURE_FIELDS.map(([k, l]) => [k, l]))

export default function ReferenceData() {
  const { siteId, isSiteUser, isEsgLead, version } = useAppState()
  const targets = useMemo(() => indexBy(data.targets, 'category'), [version]) // eslint-disable-line react-hooks/exhaustive-deps
  const sites = isSiteUser ? sitesSorted.filter((s) => s.id === siteId) : sitesSorted
  const refs = data.referenceFigures
  const [targetDialog, setTargetDialog] = useState(null)
  const [siteDialog, setSiteDialog] = useState(null) // { site } or { site: null } for a new one
  const canEnter = isSiteUser || isEsgLead

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>{isSiteUser ? 'Your site' : `All ${sitesSorted.filter((s) => s.active !== false).length} sites`}</Eyebrow>
        <h1 className="mt-0.5">Reference data</h1>
        <div className="rb-rule mt-1.5" />
      </div>

      <section>
        <SectionTitle eyebrow="Group targets" title="Targets" />
        <div className="rb-card overflow-x-auto">
          <table className="rb-table">
            <thead>
              <tr>
                <th>Target</th>
                <th className="num">Base year</th>
                <th className="num">Target year</th>
                <th className="num">Value</th>
                <th>Set by</th>
                {isEsgLead && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {data.targets.map((t) => (
                <tr key={t.id}>
                  <td>
                    {TARGET_LABEL[t.category] || t.category}
                    {t.active === false && <span className="rb-caption"> · inactive</span>}
                  </td>
                  <td className="num">{t.base_year}</td>
                  <td className="num">{t.target_year}</td>
                  <td className="num rb-num">{t.category === 'waste_diversion' ? `≥ ${fmtNum(t.value, 0)} %` : `−${fmtNum(t.value, 0)} %`}</td>
                  <td className="min-w-[200px]">
                    {personName(t.updated_by || t.set_by)}
                    {t.updated_at && <div className="rb-caption text-[12px]">updated {fmtDate(t.updated_at)}</div>}
                    {t.change_comment && <div className="text-[12px] mt-0.5">Reason: {t.change_comment}</div>}
                  </td>
                  {isEsgLead && (
                    <td>
                      <button className="rb-btn rb-btn--small" onClick={() => setTargetDialog(t)}>
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isEsgLead && <p className="rb-caption text-[12px] mt-1">The value and the years can change, with a stated reason; the category never does. A change applies to every site and the group at once.</p>}
      </section>

      <section>
        <SectionTitle eyebrow="FY2024 base year, latest actuals, 2030 plan" title="Figures per site" />
        <div className="space-y-3">
          {sites.map((s) => (
            <SiteCard key={s.id} site={s} refs={refs} targets={targets} canEnter={canEnter} />
          ))}
        </div>
        <p className="rb-caption text-[12px] mt-2">
          {canEnter ? 'Figures are updated in place; every change is logged with user and time and shown under the site.' : 'Read-only: the sites and the ESG lead enter the figures.'}
        </p>
      </section>

      {isEsgLead && (
        <section>
          <SectionTitle
            eyebrow="Codes never change; a site is deactivated, never deleted"
            title="Sites"
            right={
              <button className="rb-btn rb-btn--small" onClick={() => setSiteDialog({ site: null })}>
                Add site
              </button>
            }
          />
          <div className="rb-card overflow-x-auto">
            <table className="rb-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sitesSorted.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.code}</td>
                    <td>{s.name}</td>
                    <td>{s.city}</td>
                    <td>{s.type}</td>
                    <td className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`rb-dot ${s.active === false ? 'rb-dot--closed' : 'rb-dot--ok'}`} aria-hidden="true" />
                        {s.active === false ? 'inactive' : 'active'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap rb-caption text-[12px]">
                      {s.updated_by ? personName(s.updated_by) + ', ' : ''}
                      {fmtDate(s.updated_at)}
                    </td>
                    <td className="whitespace-nowrap">
                      <button className="rb-btn rb-btn--small" onClick={() => setSiteDialog({ site: s })}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {targetDialog && <TargetDialog target={targetDialog} onClose={() => setTargetDialog(null)} />}
      {siteDialog && <SiteDialog site={siteDialog.site} onClose={() => setSiteDialog(null)} />}
    </div>
  )
}

function SiteCard({ site, refs, targets, canEnter }) {
  const [dialog, setDialog] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const f24 = figure(refs, site.id, BASE_YEAR, 'actual')
  const plan = figure(refs, site.id, TARGET_YEAR, 'plan')
  const waste = latestActual(refs, site.id, (r) => r.waste_total_t != null && r.waste_diverted_t != null)
  const out = outputPath(refs, site.id)
  const pallets = site.code === PALLET_SITE_CODE
  const ePct = Number(targets.emissions?.value ?? 42) / 100
  const waPct = Number(targets.water_absolute?.value ?? 10) / 100
  const wiPct = Number(targets.water_intensity?.value ?? 20) / 100
  const wThr = Number(targets.waste_diversion?.value ?? 95) / 100
  const intensity = f24?.water_withdrawal_m3 != null && f24?.output_t ? Number(f24.water_withdrawal_m3) / Number(f24.output_t) : null
  const rate = waste ? Number(waste.waste_diverted_t) / Number(waste.waste_total_t) : null
  const who = (r) => (r ? `${personName(r.entered_by)}, ${fmtDate(r.updated_at || r.created_at)}` : null)
  const outUnit = pallets ? 'pallets' : 't'
  const siteRows = refs.filter((r) => r.site_id === site.id)
  const rowById = indexBy(siteRows)
  const history = data.referenceFiguresHistory.filter((h) => rowById[h.reference_figure_id]).sort((a, b) => (a.changed_at < b.changed_at ? 1 : -1))

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3>
          {site.code} {site.name}
          {site.active === false && <span className="rb-caption text-[13px] font-normal"> · inactive</span>}
        </h3>
        <span className="flex flex-wrap items-center gap-2">
          <span className="rb-caption text-[13px]">
            {site.city} · {site.type}
            {pallets && ' · reports pallets handled, not tonnes'}
          </span>
          {canEnter && (
            <button className="rb-btn rb-btn--small" onClick={() => setDialog(true)}>
              Enter or update figures
            </button>
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-[13px]">
        <Figure label={`FY${BASE_YEAR} Scope 1+2`} value={f24?.scope12_tco2e} unit="tCO₂e" who={who(f24)} derived={f24?.scope12_tco2e != null ? `−${Math.round(ePct * 100)} % = ${fmtInt(ePct * f24.scope12_tco2e)} tCO₂e by 2030` : null} />
        <Figure label={`FY${BASE_YEAR} water withdrawal`} value={f24?.water_withdrawal_m3} unit="m³" who={who(f24)} derived={f24?.water_withdrawal_m3 != null ? `−${Math.round(waPct * 100)} % = ${fmtInt(waPct * f24.water_withdrawal_m3)} m³ by 2030` : null} />
        <Figure label={`FY${BASE_YEAR} output`} value={f24?.output_t} unit={outUnit} who={who(f24)} derived={intensity != null ? `intensity ${fmtNum(intensity, 2)} m³/${pallets ? 'pallet' : 't'} → target ${fmtNum(intensity * (1 - wiPct), 2)}` : null} />
        <Figure label={`Planned ${TARGET_YEAR} output`} value={plan?.output_t} unit={outUnit} who={who(plan)} missingLabel={<><Estimate /> FY{BASE_YEAR} held flat</>} derived={out ? `${fmtInt(out.byYear[TARGET_YEAR])} ${outUnit} used for 2030` : null} />
        <Figure label={waste ? `FY${waste.year} total waste` : 'Latest total waste'} value={waste?.waste_total_t} unit="t" who={who(waste)} />
        <Figure label={waste ? `FY${waste.year} diverted` : 'Latest diverted waste'} value={waste?.waste_diverted_t} unit="t" who={who(waste)} derived={rate != null ? `rate ${fmtPct(rate, 1)} → target ≥ ${Math.round(wThr * 100)} %` : null} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
        <span className="rb-caption">
          {siteRows.length} row{siteRows.length === 1 ? '' : 's'}: {siteRows.map((r) => `${r.year} ${r.kind}`).sort().join(', ') || 'none yet'}
        </span>
        {history.length > 0 && (
          <button className="rb-btn rb-btn--small" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? 'Hide history' : `Show history (${history.length})`}
          </button>
        )}
      </div>
      {showHistory && (
        <div className="overflow-x-auto mt-2">
          <table className="rb-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Row</th>
                <th>Field</th>
                <th>Old value</th>
                <th>New value</th>
                <th>Who</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(h.changed_at)}</td>
                  <td className="whitespace-nowrap">
                    {rowById[h.reference_figure_id].year} {rowById[h.reference_figure_id].kind}
                  </td>
                  <td className="whitespace-nowrap">{h.field === 'created' ? 'Created' : FIGURE_LABEL[h.field] || h.field}</td>
                  <td>{h.old_value == null ? '–' : fmtInt(h.old_value)}</td>
                  <td className="font-semibold">{h.field === 'created' ? h.new_value : h.new_value == null ? '–' : fmtInt(h.new_value)}</td>
                  <td className="whitespace-nowrap">{personName(h.changed_by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dialog && <FigureDialog site={site} rows={siteRows} onClose={() => setDialog(false)} />}
    </Card>
  )
}

function Figure({ label, value, unit, who, derived, missingLabel }) {
  const missing = value === null || value === undefined
  return (
    <div>
      <div className="rb-caption text-[12px]">{label}</div>
      {missing ? (
        <div className="mt-0.5">{missingLabel || <Flag>missing</Flag>}</div>
      ) : (
        <div className="rb-num text-[16px]">
          {fmtInt(value)} <span className="rb-caption text-[12px] font-normal">{unit}</span>
        </div>
      )}
      {derived && <div className="text-[12px] mt-0.5">{derived}</div>}
      {who && !missing && <div className="rb-caption text-[11px] mt-0.5">{who}</div>}
    </div>
  )
}

const blankFigures = () => Object.fromEntries(FIGURE_FIELDS.map(([k]) => [k, '']))
const figuresOf = (row) => Object.fromEntries(FIGURE_FIELDS.map(([k]) => [k, row?.[k] == null ? '' : String(row[k])]))

/** One row per site, year and kind: pick year and kind, the existing values load, save inserts or updates. */
function FigureDialog({ site, rows, onClose }) {
  const { notify } = useAppState()
  const [year, setYear] = useState(String(new Date().getUTCFullYear() - 1))
  const [kind, setKind] = useState('actual')
  const existing = rows.find((r) => String(r.year) === year && r.kind === kind) || null
  const [values, setValues] = useState(() => figuresOf(existing))
  const [loadedFor, setLoadedFor] = useState(`${year}|${kind}`)
  const [state, setState] = useState({ status: 'idle' })
  if (loadedFor !== `${year}|${kind}`) {
    setLoadedFor(`${year}|${kind}`)
    setValues(figuresOf(existing))
  }
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    const y = Number(year)
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return setState({ status: 'error', message: 'Year must be between 2000 and 2100.' })
    const figures = {}
    for (const [k, label] of FIGURE_FIELDS) {
      if (values[k] === '') {
        figures[k] = null
        continue
      }
      const n = Number(values[k])
      if (Number.isNaN(n) || n < 0) return setState({ status: 'error', message: `${label} must be zero or more.` })
      figures[k] = n
    }
    if (Object.values(figures).every((v) => v === null)) return setState({ status: 'error', message: 'Enter at least one figure.' })
    if (figures.waste_total_t != null && figures.waste_diverted_t != null && figures.waste_diverted_t > figures.waste_total_t) return setState({ status: 'error', message: 'Diverted waste cannot exceed total waste.' })
    if (figures.waste_diverted_t != null && figures.waste_total_t == null) return setState({ status: 'error', message: 'Diverted waste needs the total waste.' })
    setState({ status: 'working' })
    try {
      await saveReferenceFigure(existing?.id, existing ? figures : { site_id: site.id, year: y, kind, ...figures })
      notify({
        title: `${existing ? 'Figures updated' : 'Figures entered'} for ${site.code} ${site.name}, ${y} ${kind}`,
        lines: [...FIGURE_FIELDS.filter(([k]) => figures[k] != null).map(([k, label, unit]) => `${label}: ${fmtInt(figures[k])} ${unit}`), 'Logged with your name and the time; the Overview recalculates at once'],
      })
      onClose()
    } catch (err) {
      setState({ status: 'error', message: err.message || String(err) })
    }
  }
  return (
    <Modal title={`Figures for ${site.code} ${site.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rb-label" htmlFor="rf-year">
              Year
            </label>
            <input id="rf-year" type="number" min="2000" max="2100" step="1" className="rb-input" value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div>
            <label className="rb-label" htmlFor="rf-kind">
              Kind
            </label>
            <select id="rf-kind" className="rb-select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="actual">Actual (reported year)</option>
              <option value="plan">Plan (planned output, e.g. 2030)</option>
            </select>
          </div>
        </div>
        <p className="rb-caption text-[12px]">{existing ? `Updating the existing ${year} ${kind} row (entered by ${personName(existing.entered_by)}, ${fmtDate(existing.updated_at || existing.created_at)}). Leave a figure empty to clear it.` : `No ${year} ${kind} row yet: saving creates it.`}</p>
        <div className="grid grid-cols-2 gap-3">
          {FIGURE_FIELDS.map(([k, label, unit]) => (
            <div key={k}>
              <label className="rb-label" htmlFor={`rf-${k}`}>
                {label} <span className="rb-caption font-normal">({unit})</span>
              </label>
              <input id={`rf-${k}`} type="number" min="0" step="any" className="rb-input" value={values[k]} onChange={set(k)} />
            </div>
          ))}
        </div>
        {state.status === 'error' && <div className="rb-error">{state.message}</div>}
        <div className="flex gap-2 pt-1">
          <button type="submit" className="rb-btn rb-btn--primary" disabled={state.status === 'working'}>
            {state.status === 'working' ? 'Saving…' : existing ? 'Save changes' : 'Create the row'}
          </button>
          <button type="button" className="rb-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function TargetDialog({ target, onClose }) {
  const { notify } = useAppState()
  const [values, setValuesState] = useState({ value: String(target.value), base_year: String(target.base_year), target_year: String(target.target_year), active: target.active !== false, comment: '' })
  const [state, setState] = useState({ status: 'idle' })
  const [step, setStep] = useState('form') // form → warning (the pop-up) → acknowledged (the button must be clicked again)
  const setValues = (patch) => {
    setValuesState((v) => ({ ...v, ...patch }))
    if (step === 'acknowledged') setStep('form') // anything edited after the warning brings the warning back
  }
  const label = TARGET_LABEL[target.category] || target.category
  const fmtTarget = (v) => (target.category === 'waste_diversion' ? `at least ${fmtNum(v, 0)} %` : `${fmtNum(v, 0)} % reduction`)
  const changes = []
  if (Number(values.value) !== Number(target.value)) changes.push(`Value: ${fmtTarget(target.value)} to ${fmtTarget(values.value)}`)
  if (Number(values.base_year) !== Number(target.base_year)) changes.push(`Base year: ${target.base_year} to ${values.base_year}`)
  if (Number(values.target_year) !== Number(target.target_year)) changes.push(`Target year: ${target.target_year} to ${values.target_year}`)
  if (values.active !== (target.active !== false)) changes.push(values.active ? 'Reactivated' : 'Deactivated')
  const validate = () => {
    const value = Number(values.value)
    const base = Number(values.base_year)
    const ty = Number(values.target_year)
    if (Number.isNaN(value) || value <= 0 || value > 100) return 'The value is a percentage above 0 and at most 100.'
    if (!Number.isInteger(base) || !Number.isInteger(ty) || base < 2000 || ty > 2100 || ty <= base) return 'The target year must come after the base year (2000 to 2100).'
    if (changes.length === 0) return 'Nothing changed.'
    if (!values.comment.trim()) return 'Give the reason for this change; it is recorded with your name and the time.'
    return null
  }
  const submit = async (e) => {
    e.preventDefault()
    const problem = validate()
    if (problem) return setState({ status: 'error', message: problem })
    if (step !== 'acknowledged') {
      setState({ status: 'idle' })
      return setStep('warning')
    }
    setState({ status: 'working' })
    try {
      await updateTarget(target.id, { value: Number(values.value), base_year: Number(values.base_year), target_year: Number(values.target_year), active: values.active, change_comment: values.comment.trim() })
      notify({ title: `Target changed: ${label}`, lines: [...changes, `Reason: ${values.comment.trim()}`, 'Applies to every site and the group at once; recorded with your name and the time'] })
      onClose()
    } catch (err) {
      setState({ status: 'error', message: err.message || String(err) })
    }
  }

  if (step === 'warning')
    return (
      <Modal title="Before you change this target" onClose={onClose}>
        <div className="rb-card p-3 border-l-4 border-l-rb-attention" role="alert">
          <div className="flex items-center gap-2 font-semibold">
            <span className="rb-dot rb-dot--attention" aria-hidden="true" />
            This changes the target for the whole organisation
          </div>
          <p className="text-[13px] mt-1">
            Every site is measured against it: the required reductions, the uncovered gaps, the pathways and the review pack change at once, for every year. The change is recorded with your name, the time and your reason.
          </p>
        </div>
        <dl className="text-[13px] my-3 space-y-1">
          <div>
            <dt className="rb-caption text-[12px]">Target</dt>
            <dd className="font-semibold">{label}</dd>
          </div>
          <div>
            <dt className="rb-caption text-[12px]">What changes</dt>
            <dd className="font-semibold">{changes.join(' · ')}</dd>
          </div>
          <div>
            <dt className="rb-caption text-[12px]">Reason</dt>
            <dd>{values.comment.trim()}</dd>
          </div>
        </dl>
        <p className="rb-caption text-[12px] mb-3">Nothing is saved yet. After "I understand" you are back on the form: click "Change the target" once more to apply it.</p>
        <div className="flex gap-2">
          <button type="button" className="rb-btn rb-btn--primary" onClick={() => setStep('acknowledged')} autoFocus>
            I understand
          </button>
          <button type="button" className="rb-btn" onClick={() => setStep('form')}>
            Back
          </button>
        </div>
      </Modal>
    )

  return (
    <Modal title={label} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="rb-label" htmlFor="t-value">
              {target.category === 'waste_diversion' ? 'Diversion rate (%)' : 'Reduction (%)'}
            </label>
            <input id="t-value" type="number" min="0" max="100" step="any" className="rb-input" value={values.value} onChange={(e) => setValues({ value: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="rb-label" htmlFor="t-base">
              Base year
            </label>
            <input id="t-base" type="number" step="1" className="rb-input" value={values.base_year} onChange={(e) => setValues({ base_year: e.target.value })} />
          </div>
          <div>
            <label className="rb-label" htmlFor="t-year">
              Target year
            </label>
            <input id="t-year" type="number" step="1" className="rb-input" value={values.target_year} onChange={(e) => setValues({ target_year: e.target.value })} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={values.active} onChange={(e) => setValues({ active: e.target.checked })} />
          Active
        </label>
        <div>
          <label className="rb-label" htmlFor="t-comment">
            Reason for the change
          </label>
          <textarea id="t-comment" className="rb-textarea" rows={3} value={values.comment} onChange={(e) => setValues({ comment: e.target.value })} placeholder="Who decided it, when, and why" />
        </div>
        <p className="rb-caption text-[12px]">A target applies to every site and the group. The calculations use FY2024 and 2030 (spec §9); the years here are the record of the target as set.</p>
        {step === 'acknowledged' && (
          <p className="rb-warning flex items-center gap-2">
            <span className="rb-dot rb-dot--attention" aria-hidden="true" />
            Warning acknowledged. Click "Change the target" once more to apply it.
          </p>
        )}
        {state.status === 'error' && <div className="rb-error">{state.message}</div>}
        <div className="flex gap-2 pt-1">
          <button type="submit" className="rb-btn rb-btn--primary" disabled={state.status === 'working'}>
            {state.status === 'working' ? 'Saving…' : 'Change the target'}
          </button>
          <button type="button" className="rb-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}

function SiteDialog({ site, onClose }) {
  const { notify } = useAppState()
  const [values, setValues] = useState({ code: site?.code || '', name: site?.name || '', city: site?.city || '', type: site?.type || '', active: site ? site.active !== false : true })
  const [state, setState] = useState({ status: 'idle' })
  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    if (!site && !/^[0-9]{4}$/.test(values.code)) return setState({ status: 'error', message: 'The code is four digits and never changes afterwards.' })
    if (!values.name.trim() || !values.city.trim() || !values.type.trim()) return setState({ status: 'error', message: 'Name, city and type are required.' })
    setState({ status: 'working' })
    try {
      const fields = { name: values.name.trim(), city: values.city.trim(), type: values.type.trim(), active: values.active }
      await saveSite(site?.id, site ? fields : { code: values.code, ...fields })
      notify({ title: site ? `Site ${site.code} saved` : `Site ${values.code} added`, lines: [`${fields.name}, ${fields.city}, ${fields.type}`, fields.active ? 'Active: offered in the forms' : 'Inactive: no longer offered in the forms; its old projects keep it'] })
      onClose()
    } catch (err) {
      setState({ status: 'error', message: err.message || String(err) })
    }
  }
  return (
    <Modal title={site ? `Site ${site.code}` : 'Add a site'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rb-label" htmlFor="s-code">
              Code
            </label>
            <input id="s-code" className="rb-input" value={values.code} onChange={set('code')} readOnly={!!site} placeholder="4 digits" />
          </div>
          <div>
            <label className="rb-label" htmlFor="s-name">
              Name
            </label>
            <input id="s-name" className="rb-input" value={values.name} onChange={set('name')} />
          </div>
          <div>
            <label className="rb-label" htmlFor="s-city">
              City
            </label>
            <input id="s-city" className="rb-input" value={values.city} onChange={set('city')} />
          </div>
          <div>
            <label className="rb-label" htmlFor="s-type">
              Type
            </label>
            <input id="s-type" className="rb-input" value={values.type} onChange={set('type')} placeholder="e.g. Brewery, Logistics" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={values.active} onChange={set('active')} />
          Active (offered in the forms)
        </label>
        {site && <p className="rb-caption text-[12px]">A site that projects, figures or users reference cannot be renamed: deactivate it and add a new one.</p>}
        {state.status === 'error' && <div className="rb-error">{state.message}</div>}
        <div className="flex gap-2 pt-1">
          <button type="submit" className="rb-btn rb-btn--primary" disabled={state.status === 'working'}>
            {state.status === 'working' ? 'Saving…' : site ? 'Save site' : 'Add site'}
          </button>
          <button type="button" className="rb-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  )
}
