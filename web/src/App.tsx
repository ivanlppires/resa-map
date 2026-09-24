import { Routes, Route, Navigate } from 'react-router'
import LandingPage from './pages/LandingPage'
import MapPage from './pages/MapPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/mapa" element={<MapPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
