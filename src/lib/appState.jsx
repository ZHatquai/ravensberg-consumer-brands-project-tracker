// Screen state for the signed-in person: who they are (from their profile), the selected site (group or one site)
// and the reporting year, plus the loaded data and a reload after every action.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './auth.jsx'
import { data, reload, onReload } from './data.js'
import { reportingYears } from './calculations.js'

const AppState = createContext(null)

function readSession(key) {
  try {
    return window.sessionStorage.getItem('rb-tracker:' + key)
  } catch {
    return null
  }
}
function writeSession(key, value) {
  try {
    window.sessionStorage.setItem('rb-tracker:' + key, value)
  } catch {
    /* private mode or blocked storage: the choice simply does not survive a refresh */
  }
}

export function AppStateProvider({ children }) {
  const { profile } = useAuth()
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [version, setVersion] = useState(0)
  const [siteSel, setSiteSelState] = useState(() => readSession('siteSel') || 'group')
  const [year, setYearState] = useState(() => Number(readSession('year')) || new Date().getUTCFullYear())
  const [notice, setNotice] = useState(null) // the confirmation after an action: { title, lines, path }

  const refresh = useCallback(async () => {
    try {
      await reload()
      setLoadError(null)
      setLoaded(true)
    } catch (err) {
      setLoadError(err.message || String(err))
      setLoaded(true)
    }
  }, [])

  useEffect(() => onReload(() => setVersion((v) => v + 1)), [])
  useEffect(() => {
    refresh()
  }, [refresh])

  const years = useMemo(() => reportingYears(data.projects), [version]) // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => {
    const viewer = profile
    const isSiteUser = viewer.role === 'site_user'
    const siteId = isSiteUser ? viewer.site_id : siteSel === 'group' ? null : siteSel
    const safeYear = years.includes(year) ? year : years[years.length - 1]
    return {
      viewer,
      siteId,
      siteSel: isSiteUser ? viewer.site_id : siteSel,
      setSiteSel: (v) => {
        writeSession('siteSel', v)
        setSiteSelState(v)
      },
      year: safeYear,
      setYear: (v) => {
        writeSession('year', String(v))
        setYearState(v)
      },
      years,
      isSiteUser,
      isEsgLead: viewer.role === 'esg_lead',
      isCfo: viewer.role === 'cfo',
      canChooseSite: !isSiteUser,
      canExportPdf: !isSiteUser,
      canRegister: viewer.role !== 'cfo',
      loaded,
      loadError,
      version,
      refresh,
      notice,
      /** Shows the confirmation of an action; `path` is the page it belongs to (default: the current one, or the page the action navigates to). */
      notify: (n) => setNotice({ ...n, path: n.path || window.location.pathname, at: Date.now() }),
      dismissNotice: () => setNotice(null),
    }
  }, [profile, siteSel, year, years, loaded, loadError, version, refresh, notice])

  return <AppState.Provider value={value}>{children}</AppState.Provider>
}

export function useAppState() {
  return useContext(AppState)
}
