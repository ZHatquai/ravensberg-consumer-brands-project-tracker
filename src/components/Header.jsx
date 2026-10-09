import { NavLink } from 'react-router-dom'
import { useAppState } from '../lib/appState.jsx'
import { useAuth } from '../lib/auth.jsx'
import { sitesSorted, siteLabel } from '../lib/data.js'
import { ROLE_LABEL } from '../lib/format.js'

export function Header() {
  const { viewer, siteSel, setSiteSel, canChooseSite, year, setYear, years, isEsgLead, isSiteUser } = useAppState()
  const { signOut } = useAuth()
  return (
    <header className="bg-white border-b border-rb-grey-line">
      <div className="w-full max-w-[1200px] mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <NavLink to="/" className="flex items-center gap-3 no-underline">
          <img src="/assets/ravensberg-logo.svg" alt="Ravensberg Consumer Brands" className="h-9 w-auto" />
          <span className="font-display font-semibold text-rb-green text-[15px] whitespace-nowrap">Project Tracker</span>
        </NavLink>
        <nav className="rb-nav flex flex-wrap gap-1" aria-label="Main">
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/projects">Project register</NavLink>
          <NavLink to="/reference">Reference data</NavLink>
          {isEsgLead && <NavLink to="/users">Users</NavLink>}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{viewer.name}</span>
            <span className="rb-pill">
              {ROLE_LABEL[viewer.role]}
              {isSiteUser && ` · ${siteLabel(viewer.site_id)}`}
            </span>
          </div>
          {canChooseSite && (
            <label className="flex items-center gap-1.5">
              <span className="rb-caption">Site</span>
              <select className="rb-select !w-auto !py-1" value={siteSel} onChange={(e) => setSiteSel(e.target.value)} aria-label="Site">
                <option value="group">Group</option>
                {sitesSorted
                  .filter((s) => s.active !== false || s.id === siteSel)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} {s.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-1.5">
            <span className="rb-caption">Year</span>
            <select className="rb-select !w-auto !py-1" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Reporting year">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button className="rb-btn rb-btn--small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
