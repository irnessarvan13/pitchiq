import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'  // React Router — enables multiple pages
import './index.css'
import App from './App'
import ChampionsLeague from './pages/ChampionsLeague'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter wraps everything — enables routing for the entire app */}
    <BrowserRouter>
      {/* Routes — only renders the component that matches the current URL */}
      <Routes>
        {/* / — main dashboard */}
        <Route path="/" element={<App />} />

        {/* /champions-league — dedicated UCL page */}
        <Route path="/champions-league" element={<ChampionsLeague />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)