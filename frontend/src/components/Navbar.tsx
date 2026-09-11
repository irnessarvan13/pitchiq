/*
Navbar.tsx — navigation bar at the top of the dashboard.
Shows PitchIQ logo and navigation links.
Active link highlights green based on which section is visible on screen.
Uses Intersection Observer to detect which section is in view.
*/
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'  // import Link for instant navigation

function Navbar() {
  const [activeSection, setActiveSection] = useState('live')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { threshold: 0.3 }
    )

    const sections = ['live', 'scorers', 'standings']
    sections.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        {/* Link to home — instant navigation, no page refresh */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="navbar-logo">⚽</span>
          <span className="navbar-title">PitchIQQ</span>
        </Link>
      </div>
      <div className="navbar-links">
        <a href="#live" className={`navbar-link ${activeSection === 'live' ? 'navbar-link-active' : ''}`}>Live</a>
        <a href="#scorers" className={`navbar-link ${activeSection === 'scorers' ? 'navbar-link-active' : ''}`}>Scorers</a>
        <a href="#standings" className={`navbar-link ${activeSection === 'standings' ? 'navbar-link-active' : ''}`}>Standings</a>
        {/* Champions League link — gold color to stand out */}
        <Link to="/champions-league" className="navbar-link" style={{ color: '#f59e0b' }}>⭐ UCL</Link>
      </div>
    </nav>
  )
}

export default Navbar