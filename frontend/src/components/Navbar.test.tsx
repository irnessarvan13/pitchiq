// Navbar.test.tsx — characterization tests (#41): what Navbar does TODAY
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
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

  // #48 (found by coverage): the code that runs when a section scrolls into view had no test
  it.each([
    { section: 'scorers', link: 'Scorers' },
    { section: 'standings', link: 'Standings' },
  ])('highlights $link when that section scrolls into view', ({ section, link }) => {
    // a stand-in IntersectionObserver that hands us the callback, so the test can say "this section is now visible"
    let reportVisible: (entries: object[]) => void = () => {}
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: object[]) => void) { reportVisible = callback }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return [] }
    })

    render(<MemoryRouter><Navbar /></MemoryRouter>)
    act(() => reportVisible([
      { isIntersecting: false, target: { id: 'live' } },                         // Live scrolled OUT of view...
      { isIntersecting: true, target: { id: section } },                         // ...and this section scrolled IN
    ]))

    expect(screen.getByRole('link', { name: link })).toHaveClass('navbar-link-active')
    expect(screen.getByRole('link', { name: 'Live' })).not.toHaveClass('navbar-link-active')
  })
})
