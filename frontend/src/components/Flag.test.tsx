// Flag.test.tsx — the shared flag image used by Top Scorers and the Champions League page (#46)
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Flag from './Flag'

describe('Flag', () => {
  it('shows a small flag image for a known nationality, with the country as its alt text', () => {
    render(<Flag nationality="Norway" />)

    const flag = screen.getByRole('img', { name: 'Norway' })                      // found by its alt text, like a screen reader would
    expect(flag).toHaveAttribute('src', 'https://flagcdn.com/w20/no.png')        // "no" is Norway's country code
  })

  it.each([
    ['England', 'gb-eng'],
    ['Scotland', 'gb-sct'],
    ['Wales', 'gb-wls'],
    ['Northern Ireland', 'gb-nir'],
  ])('%s gets its own flag (%s), not the UK flag', (nationality, code) => {
    render(<Flag nationality={nationality} />)

    expect(screen.getByRole('img', { name: nationality })).toHaveAttribute('src', `https://flagcdn.com/w20/${code}.png`)
  })

  it.each(['Bosnia-Herzegovina', 'Bosnia and Herzegovina'])('both spellings of Bosnia get the Bosnian flag: %s', (nationality) => {
    render(<Flag nationality={nationality} />)

    expect(screen.getByRole('img', { name: nationality })).toHaveAttribute('src', 'https://flagcdn.com/w20/ba.png')
  })

  it('shows nothing for a nationality it does not know — never a broken image', () => {
    const { container } = render(<Flag nationality="Atlantis" />)

    expect(container).toBeEmptyDOMElement()                                       // nothing was put on the page at all
  })

  it('hides itself if the flag image fails to download', () => {
    render(<Flag nationality="Norway" />)

    const flag = screen.getByRole('img', { name: 'Norway' })
    fireEvent.error(flag)                                                         // pretend the image couldn't be downloaded
    expect(flag).not.toBeVisible()                                               // hidden, instead of a broken-image icon
  })
})
