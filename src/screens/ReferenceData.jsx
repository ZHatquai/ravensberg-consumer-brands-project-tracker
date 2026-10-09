import { useMemo } from 'react'
import { useAppState } from '../lib/appState.jsx'
import { data, sitesSorted, personName } from '../lib/data.js'
import { figure, latestActual, outputPath, BASE_YEAR, TARGET_YEAR, PALLET_SITE_CODE, indexBy } from '../lib/calculations.js'
import { fmtInt, fmtNum, fmtPct, fmtDate } from '../lib/format.js'
import { Card, Eyebrow, SectionTitle, Flag, Estimate } from '../components/ui.jsx'

const TARGET_LABEL = {
  emissions: 'Emissions, Scope 1+2 (location-based)',
  water_absolute: 'Water, absolute withdrawal',
  water_intensity: 'Water, intensity (withdrawal per tonne output)',
  waste_diversion: 'Waste, diversion from landfill at every site',
}

export default function ReferenceData() {
  const { siteId, isSiteUser, isEsgLead } = useAppState()
  const targets = useMemo(() => indexBy(data.targets, 'category'), [])
  const sites = isSiteUser ? sitesSorted.filter((s) => s.id === siteId) : sitesSorted
  const refs = data.referenceFigures

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>{isSiteUser ? 'Your site' : 'All seven sites'}</Eyebrow>
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
              </tr>
            </thead>
            <tbody>
              {data.targets.map((t) => (
                <tr key={t.id}>
                  <td>{TARGET_LABEL[t.category] || t.category}</td>
                  <td className="num">{t.base_year}</td>
                  <td className="num">{t.target_year}</td>
                  <td className="num rb-num">
                    {t.category === 'waste_diversion' ? `≥ ${fmtNum(t.value, 0)} %` : `−${fmtNum(t.value, 0)} %`}
                  </td>
                  <td>{personName(t.set_by)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isEsgLead && <p className="rb-caption text-[12px] mt-1">Editing the targets comes with the access phase.</p>}
      </section>

      <section>
        <SectionTitle eyebrow="FY2024 base year, latest actuals, 2030 plan" title="Figures per site" />
        <div className="space-y-3">
          {sites.map((s) => (
            <SiteCard key={s.id} site={s} refs={refs} targets={targets} />
          ))}
        </div>
        <p className="rb-caption text-[12px] mt-2">{isSiteUser ? 'Entering and updating your figures comes with the access phase.' : 'Entering and updating figures comes with the access phase. Every change will be logged with user and time.'}</p>
      </section>
    </div>
  )
}

function SiteCard({ site, refs, targets, }) {
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

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h3>
          {site.code} {site.name}
        </h3>
        <span className="rb-caption text-[13px]">
          {site.city} · {site.type}
          {pallets && ' · reports pallets handled, not tonnes'}
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
