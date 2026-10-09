// Screen state for the fixture-data MVP: who is "viewing" (a fixture profile, chosen in the header because nobody logs in yet),
// the selected site (group or one site) and the reporting year. The access phase replaces the viewer switch with the signed-in profile.
import { createContext, useContext, useMemo, useState } from 'react'
import { data, profileById } from './data.js'
import { reportingYears } from './calculations.js'

const AppState = createContext(null)

export function AppStateProvider({ children }) {
  const defaultViewer = data.profiles.find((p) => p.role === 'esg_lead' && !p.retired_at) || data.profiles[0]
  const years = reportingYears(data.projects)
  // The choices survive a page refresh (sessionStorage, per tab); nothing here is data.
  const [viewerId, setViewerIdState] = useState(() => {
    const saved = readSession('viewerId')
    return saved && profileById[saved] && !profileById[saved].retired_at ? saved : defaultViewer.id
  })
  const [siteSel, setSiteSelState] = useState(() => readSession('siteSel') || 'group')
  const [year, setYearState] = useState(() => {
    const saved = Number(readSession('year'))
    return years.includes(saved) ? saved : years[years.length - 1]
  })
  const setViewerId = (v) => { writeSession('viewerId', v); setViewerIdState(v) }
  const setSiteSel = (v) => { writeSession('siteSel', v); setSiteSelState(v) }
  const setYear = (v) => { writeSession('year', String(v)); setYearState(v) }

  const value = useMemo(() => {
    const viewer = profileById[viewerId]
    const isSiteUser = viewer.role === 'site_user'
    const siteId = isSiteUser ? viewer.site_id : siteSel === 'group' ? null : siteSel
    return {
      viewer,
      viewerId,
      setViewerId,
      siteId,
      siteSel: isSiteUser ? viewer.site_id : siteSel,
      setSiteSel,
      year,
      setYear,
      years,
      isSiteUser,
      isEsgLead: viewer.role === 'esg_lead',
      isCfo: viewer.role === 'cfo',
      canChooseSite: !isSiteUser,
      canExportPdf: !isSiteUser,
      canRegister: viewer.role !== 'cfo',
    }
  }, [viewerId, siteSel, year, years])

  return <AppState.Provider value={value}>{children}</AppState.Provider>
}

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

export function useAppState() {
  return useContext(AppState)
}
