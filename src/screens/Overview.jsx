import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { data, siteLabel } from '../lib/data.js'
import { overview, FACTOR_SET } from '../lib/calculations.js'
import { fmtInt, fmtNum, fmtPct } from '../lib/format.js'
import { Card, Eyebrow, SectionTitle, Flag, Estimate } from '../components/ui.jsx'
import { Meter, SegmentMeter } from '../components/charts/Meter.jsx'
import { Donut } from '../components/charts/Donut.jsx'
import { EmissionsBridge } from '../components/charts/EmissionsBridge.jsx'
import { WaterTrajectory } from '../components/charts/WaterTrajectory.jsx'
import { WasteBars } from '../components/charts/WasteBars.jsx'
import { ExportCsvDialog } from '../components/ExportCsvDialog.jsx'
import { ReviewPackDialog } from '../components/ReviewPackDialog.jsx'

export default function Overview() {
  const { siteId, year, canRegister, canExportPdf, version } = useAppState()
  const o = useMemo(() => overview(data, { siteId, year }), [siteId, year, version]) // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState('emissions')
  const [dialog, setDialog] = useState(null)
  const scopeLabel = siteId ? siteLabel(siteId) : 'Group, all seven sites'
  const e = o.emissions
  const wa = o.waterAbsolute
  const wi = o.waterIntensity
  const w = o.waste

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>
            {scopeLabel} · reporting year {year}
          </Eyebrow>
          <h1 className="mt-0.5">Overview</h1>
          <div className="rb-rule mt-1.5" />
        </div>
        <div className="flex flex-wrap gap-2">
          {canRegister && (
            <Link to="/projects/new" className="rb-btn rb-btn--primary no-underline">
              Register a project
            </Link>
          )}
          {canExportPdf && (
            <button className="rb-btn" onClick={() => setDialog('pdf')}>
              Export review pack (PDF)
            </button>
          )}
          <button className="rb-btn" onClick={() => setDialog('csv')}>
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI row */}
      <section aria-label="Key figures" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Projects registered" value={o.kpis.registered} />
        <Kpi label="Approved" value={o.kpis.approved} />
        <Kpi label="Pending approval" value={o.kpis.pending} />
        <Kpi label="Declined" value={o.kpis.declined} />
        <Kpi label="Approved tCO₂e per year" value={fmtInt(o.kpis.approvedTco2e)} caption={FACTOR_SET} />
      </section>

      {/* Projects by status */}
      <section>
        <SectionTitle eyebrow="Current versions" title="Projects by status" />
        <div className="grid md:grid-cols-3 gap-3">
          {['Emissions', 'Water', 'Waste'].map((c) => (
            <Card key={c}>
              <Donut title={c} counts={o.counts[c]} />
            </Card>
          ))}
        </div>
      </section>

      {/* Contribution to the 2030 targets */}
      <section>
        <SectionTitle eyebrow="Base year FY2024, target year 2030" title="Contribution to the 2030 targets" />
        <div className="grid md:grid-cols-3 gap-3">
          <Card>
            <Eyebrow>Emissions</Eyebrow>
            <h3 className="mt-0.5">−{Math.round(e.pct * 100)} % Scope 1+2 by 2030</h3>
            <p className="rb-caption mt-1 mb-3">
              Required {fmtInt(e.required)} {e.unit} ({Math.round(e.pct * 100)} % of FY2024 {fmtInt(e.base)} tCO₂e)
            </p>
            <Meter required={e.required} covered={e.covered} ifApproved={e.ifApproved} uncovered={e.uncovered} unit="tCO₂e per year" surplus={e.surplus} />
            {e.missing.length > 0 && (
              <div className="mt-2">
                <Flag>reference figures missing: {e.missing.map((s) => s.code + ' ' + s.name).join(', ')}</Flag>
              </div>
            )}
            <p className="rb-caption text-[12px] mt-3">{FACTOR_SET}</p>
          </Card>
          <Card>
            <Eyebrow>Water</Eyebrow>
            <h3 className="mt-0.5">−{Math.round(wa.pct * 100)} % withdrawal · −{Math.round(wi.pct * 100)} % intensity</h3>
            <p className="rb-caption mt-1 mb-3">
              Absolute: required {fmtInt(wa.required)} m³ per year of FY2024 {fmtInt(wa.base)} m³
            </p>
            <Meter label="Absolute withdrawal" required={wa.required} covered={wa.covered} ifApproved={wa.ifApproved} uncovered={wa.uncovered} unit="m³ per year" surplus={wa.surplus} />
            <div className="mt-4">
              <Meter
                label={
                  <>
                    Intensity, {wi.unit}: FY2024 {fmtNum(wi.baseIntensity, 2)} → target {fmtNum(wi.target, 2)} {wi.estimate && <Estimate />}
                  </>
                }
                required={wi.required}
                covered={wi.covered}
                ifApproved={wi.ifApproved}
                uncovered={wi.uncovered}
                unit={wi.unit}
                decimals={2}
                surplus={wi.surplus}
              />
            </div>
            {(wa.missing.length > 0 || wi.missing.length > 0) && (
              <div className="mt-2">
                <Flag>reference figures missing: {[...new Set([...wa.missing, ...wi.missing].map((s) => s.code + ' ' + s.name))].join(', ')}</Flag>
              </div>
            )}
            {wi.excluded.length > 0 && <p className="rb-caption text-[12px] mt-3">Site {wi.excluded.map((s) => s.code).join(', ')} reports pallets: excluded from the group intensity, included in the absolute figure.</p>}
          </Card>
          <Card>
            <Eyebrow>Waste</Eyebrow>
            <h3 className="mt-0.5">{Math.round(w.threshold * 100)} % diversion at every site</h3>
            <p className="rb-caption mt-1 mb-3">
              {siteId ? 'This site' : `${w.covered} of ${w.required} sites`} at or above {Math.round(w.threshold * 100)} % with approved projects
            </p>
            <SegmentMeter
              segments={w.sites
                .filter((s) => s.status !== 'missing')
                .map((s) => ({ key: s.site.id, status: s.status, title: `${s.site.code} ${s.site.name}: ${fmtPct(s.rate, 1)} now, ${fmtPct(s.projected, 1)} with approved, ${fmtPct(s.projectedWithPending, 1)} with pending` }))}
            />
            <div className="grid grid-cols-3 gap-2 mt-1.5 text-[13px]">
              <div>
                <div className="rb-caption">Approved</div>
                <div className="rb-num text-rb-green">{w.covered}</div>
              </div>
              <div>
                <div className="rb-caption">If approved</div>
                <div className="rb-num" style={{ color: '#9C7A5A' }}>{w.ifApproved}</div>
              </div>
              <div>
                <div className="rb-caption">Uncovered</div>
                <div className="rb-num text-rb-grey-mid">{w.uncovered}</div>
              </div>
            </div>
            <ul className="text-[13px] mt-3 space-y-0.5">
              {w.sites
                .filter((s) => s.status !== 'missing')
                .map((s) => (
                  <li key={s.site.id} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`rb-dot ${s.status === 'covered' ? 'rb-dot--ok' : s.status === 'ifApproved' ? 'rb-dot--attention' : 'rb-dot--problem'}`} aria-hidden="true" />
                      {s.site.code} {s.site.name.replace(/^Werk /, '').replace(/^Logistikzentrum /, 'LZ ')}
                    </span>
                    <span className="rb-num whitespace-nowrap">
                      {fmtPct(s.rate, 1)} → {fmtPct(s.projected, 1)}
                      {s.capped && <span className="rb-estimate ml-1">capped</span>}
                    </span>
                  </li>
                ))}
            </ul>
            {w.missing.length > 0 && (
              <div className="mt-2">
                <Flag>reference figures missing: {w.missing.map((s) => s.code + ' ' + s.name).join(', ')}</Flag>
              </div>
            )}
            {w.capped.length > 0 && <p className="rb-caption text-[12px] mt-2">Rate above 100 % capped at {w.capped.map((s) => s.code).join(', ')}: check the site's tonnage.</p>}
          </Card>
        </div>
      </section>

      {/* Pathway to 2030 */}
      <section>
        <SectionTitle eyebrow="2024 to 2030" title="Pathway to 2030" />
        <Card>
          <div role="tablist" className="flex flex-wrap border-b border-rb-grey-line mb-3">
            {[
              ['emissions', 'Emissions bridge'],
              ['water', 'Water intensity trajectory'],
              ['waste', 'Waste diversion by site'],
            ].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} className="rb-tab" onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'emissions' && <EmissionsBridge bridge={e.bridge} factorSet={FACTOR_SET} />}
          {tab === 'water' && <WaterTrajectory wi={wi} />}
          {tab === 'waste' && <WasteBars waste={w} />}
        </Card>
      </section>

      {dialog === 'csv' && <ExportCsvDialog onClose={() => setDialog(null)} filters={{}} />}
      {dialog === 'pdf' && <ReviewPackDialog onClose={() => setDialog(null)} />}
    </div>
  )
}

function Kpi({ label, value, caption }) {
  return (
    <div className="rb-card p-3 border-t-[5px] border-t-rb-green">
      <div className="rb-caption text-[12px]">{label}</div>
      <div className="rb-kpi-value mt-1">{value}</div>
      {caption && <div className="rb-caption text-[11px] mt-1">{caption}</div>}
    </div>
  )
}
