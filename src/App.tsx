import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TallerDetalle from './pages/TallerDetalle'
import PasarLista from './pages/PasarLista'

function Rutas() {
  const { session, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-full grid place-items-center">
        <Spinner label="Cargando…" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/taller/:tallerId" element={<TallerDetalle />} />
        <Route path="/clase/:claseId" element={<PasarLista />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Rutas />
      </AuthProvider>
    </BrowserRouter>
  )
}
