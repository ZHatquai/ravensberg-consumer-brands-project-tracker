import { Routes, Route, Navigate } from 'react-router-dom'
import { AppStateProvider, useAppState } from './lib/appState.jsx'
import { Header } from './components/Header.jsx'
import { HatchDefs } from './components/ui.jsx'
import Overview from './screens/Overview.jsx'
import Register from './screens/Register.jsx'
import ProjectPage from './screens/ProjectPage.jsx'
import NewProject from './screens/NewProject.jsx'
import ReferenceData from './screens/ReferenceData.jsx'
import Users from './screens/Users.jsx'

function Shell() {
  const { isEsgLead, canRegister } = useAppState()
  return (
    <div className="min-h-screen flex flex-col">
      <HatchDefs />
      <Header />
      <main className="w-full max-w-[1200px] mx-auto px-4 py-5 flex-1">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<Register />} />
          <Route path="/projects/new" element={canRegister ? <NewProject /> : <Navigate to="/projects" replace />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
          <Route path="/reference" element={<ReferenceData />} />
          <Route path="/users" element={isEsgLead ? <Users /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="rb-caption text-[12px] text-center py-4 px-4">Ravensberg Consumer Brands | Group Sustainability | Internal</footer>
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <Shell />
    </AppStateProvider>
  )
}
