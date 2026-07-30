import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { configured, supabase } from './lib'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import People from './pages/People'
import NewConnection from './pages/NewConnection'
import Profile from './pages/Profile'
import Prepare from './pages/Prepare'
import Cards from './pages/Cards'
import Events from './pages/Events'
import Connect from './pages/Connect'
import Settings from './pages/Settings'
import BulkImport from './pages/BulkImport'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(configured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
      },
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="center-screen">
        Loading People First Network…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/connect" element={<Connect />} />
      <Route path="/login" element={<Login session={session} />} />

      <Route
        path="/*"
        element={
          !configured ? (
            <Layout demoMode />
          ) : session ? (
            <Layout />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="people" element={<People />} />
        <Route path="people/new" element={<NewConnection />} />
        <Route path="people/:id" element={<Profile />} />
        <Route path="import" element={<BulkImport />} />
        <Route path="prepare" element={<Prepare />} />
        <Route path="cards" element={<Cards />} />
        <Route path="events" element={<Events />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
