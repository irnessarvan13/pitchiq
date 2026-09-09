// root component — combines all dashboard components into one page
// import each component as we build them and add them here
import Standings from './components/Standings'
import LiveMatches from './components/LiveMatches'

function App() {
  return (
    <div>
      <h1>PitchIQ</h1>
      <LiveMatches />
      <Standings />
    </div>
  )
}

export default App