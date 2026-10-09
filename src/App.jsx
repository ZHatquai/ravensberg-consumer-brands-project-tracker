import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import { AppStateProvider, useAppState } from './lib/appState.jsx'
import { Header } from './components/Header.jsx'
import { HatchDefs } from './components/ui.jsx'
import { Notice } from './components/Notice.jsx'
import Login from './screens/Login.jsx'
import Overview from './screens/Overview.jsx'
import Register from './screens/Register.jsx'
import ProjectPage from './screens/ProjectPage.jsx'
import NewProject from './screens/NewProject.jsx'
import ReferenceData from './screens/ReferenceData.jsx'
import Users from './screens/Users.jsx'

function Shell() {
  const { isEsgLead, canRegister, loaded, loadError, refresh, notice, dismissNotice } = useAppState()
  const location = useLocation()
  useEffect(() => {
    if (notice && notice.path !== location.pathname) dismissNotice()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="min-h-screen flex flex-col">
      <HatchDefs />
      <Header />
      {notice && <Notice notice={notice} onClose={dismissNotice} />}
      <main className="w-full max-w-[1200px] mx-auto px-4 py-5 flex-1">
        {!loaded ? (
          <p className="rb-caption">Loading…</p>
        ) : loadError ? (
          <div className="rb-card p-4 border-l-4 border-l-rb-problem">
            <p className="font-semibold">The data could not be loaded.</p>
            <p className="text-[14px] mt-1">{loadError}</p>
            <button className="rb-btn mt-3" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/projects" element={<Register />} />
            <Route path="/projects/new" element={canRegister ? <NewProject /> : <Navigate to="/projects" replace />} />
            <Route path="/projects/:id/edit" element={<NewProject editing />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/reference" element={<ReferenceData />} />
            <Route path="/users" element={isEsgLead ? <Users /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
      <footer className="rb-caption text-[12px] text-center py-4 px-4">Ravensberg Consumer Brands | Group Sustainability | Internal</footer>
    </div>
  )
}

function Gate() {
  const auth = useAuth()
  if (auth.status === 'loading') return <p className="rb-caption p-6">Loading…</p>
  if (auth.status === 'misconfigured')
    return (
      <div className="p-6 max-w-prose">
        <p className="font-semibold">The site is not connected to its database.</p>
        <p className="text-[14px] mt-1">{auth.message}</p>
      </div>
    )
  if (auth.status === 'signed-out') return <Login />
  if (auth.status === 'no-access') return <Login noAccess />
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
