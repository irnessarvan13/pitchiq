// root component — combines all dashboard components into one page
// import each component as we build them and add them here
import './App.css'
import { useState, useEffect, useRef } from 'react'        // useRef added for debounce timer
import Navbar from './components/Navbar'
import Standings from './components/Standings'
import LiveMatches from './components/LiveMatches'
import TopScorers from './components/TopScorers'

// available competitions — max 4 to stay within free tier rate limits
const COMPETITIONS = [
  { code: 'PL', name: 'Premier League' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'PD', name: 'La Liga' },
]

function App() {
  // competition = which button is highlighted (updates immediately on click)
  const [competition, setCompetition] = useState('PL')

  // activeCompetition = what actually gets passed to components (updates after 500ms delay)
  const [activeCompetition, setActiveCompetition] = useState('PL')

  // useRef stores the debounce timer between renders without causing re-renders
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // debounce handler — highlights button immediately but delays API call by 500ms
  // if user clicks again within 500ms the previous timer gets cancelled
  // only fires API call after user stops clicking for 500ms
  const handleCompetitionChange = (code: string) => {
    setCompetition(code)                                    // highlight button immediately
    if (timerRef.current) clearTimeout(timerRef.current)   // cancel previous pending timer
    timerRef.current = setTimeout(() => {
      setActiveCompetition(code)                           // trigger API call after 500ms
    }, 500)
  }

  // cleanup timer when component unmounts — prevents memory leaks
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <>
      <Navbar />
      <div className="dashboard">

        {/* competition selector — clicking highlights immediately, API call fires after 500ms */}
        <div className="competition-selector">
          {COMPETITIONS.map(comp => (
            <button
              key={comp.code}
              className={`comp-btn ${competition === comp.code ? 'active' : ''}`}
              onClick={() => handleCompetitionChange(comp.code)}
              disabled={competition === comp.code}         // prevent clicking already selected
            >
              {comp.name}
            </button>
          ))}
        </div>

        <div id="live">
          <LiveMatches />
        </div>
        <div id="scorers">
          {/* passes activeCompetition not competition — only updates after debounce delay */}
          <TopScorers competition={activeCompetition} />
        </div>
        <div id="standings">
          {/* passes activeCompetition not competition — only updates after debounce delay */}
          <Standings competition={activeCompetition} />
        </div>
      </div>
    </>
  )
}

export default App