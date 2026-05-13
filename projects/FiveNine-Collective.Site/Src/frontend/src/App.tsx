import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'
import { NavBar } from './components/NavBar'
import { HomePage } from './pages/HomePage'
import { ClusterPage } from './pages/ClusterPage'

function App() {
  const { isLoading: authLoading } = useAuth0()

  if (authLoading) {
    return (
      <div className="app-container">
        <div className="app-loading" role="status" aria-live="polite">
          <span>Authenticating...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <NavBar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/studio" element={<ClusterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
