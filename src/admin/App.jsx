import { useState, useEffect } from 'react'
import { isLoggedIn, logout } from './api'
import Sidebar from './components/Sidebar'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FlyersPage from './pages/FlyersPage'
import UsersPage from './pages/UsersPage'
import PointsPage from './pages/PointsPage'
import BusinessPage from './pages/BusinessPage'

const pages = {
  dashboard: DashboardPage,
  flyers: FlyersPage,
  users: UsersPage,
  points: PointsPage,
  business: BusinessPage,
}

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn())
  const [currentPage, setCurrentPage] = useState('dashboard')

  useEffect(() => {
    setAuthed(isLoggedIn())
  }, [])

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />
  }

  const handleLogout = () => {
    logout()
    setAuthed(false)
  }

  const PageComponent = pages[currentPage] || DashboardPage

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        current={currentPage}
        onChange={setCurrentPage}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <PageComponent />
        </div>
      </main>
    </div>
  )
}
