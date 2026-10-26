// Navbar.test.tsx — characterization tests (#41): what Navbar does TODAY
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from './Navbar'

describe('Navbar', () => {
  it('shows the PitchIQ name and links to each section and to the Champions League page', () => {
    // MemoryRouter = a pretend browser address bar, needed because Navbar uses React Router's <Link>
    render(<MemoryRouter><Navbar /></MemoryRouter>)

    expect(screen.getByText('PitchIQ')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Live' })).toHaveAttribute('href', '#live')
    expect(screen.getByRole('link', { name: 'Scorers' })).toHaveAttribute('href', '#scorers')
    expect(screen.getByRole('link', { name: 'Standings' })).toHaveAttribute('href', '#standings')
    expect(screen.getByRole('link', { name: 'UCL' })).toHaveAttribute('href', '/champions-league')
  })

  it('highlights "Live" when the page first loads', () => {
    render(<MemoryRouter><Navbar /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Live' })).toHaveClass('navbar-link-active')
    expect(screen.getByRole('link', { name: 'Standings' })).not.toHaveClass('navbar-link-active')
  })
})

