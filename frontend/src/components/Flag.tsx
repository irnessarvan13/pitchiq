/*
Flag.tsx — a small flag image for a player's nationality (#46).
Shared by TopScorers and the Champions League page, so both show flags the same way.
Uses images from flagcdn.com instead of emoji flags, because Windows can't draw flag emojis.
*/

import { getCountryCode } from '../flags'           // nationality → country code, e.g. "Norway" → "no"

// defines what props this component accepts
interface FlagProps {
  nationality: string                               // e.g. "Norway", spelled the way football-data.org spells it
}

function Flag({ nationality }: FlagProps) {
  const code = getCountryCode(nationality)
  if (!code) return null                            // unknown nationality → show nothing, never a broken image

  return (
    <img
      className="flag"
      src={`https://flagcdn.com/w20/${code}.png`}     // a 20-pixel-wide flag
      srcSet={`https://flagcdn.com/w40/${code}.png 2x`}   // a sharper 40-pixel version for high-resolution screens
      width={20}
      alt={nationality}                             // screen readers (and our tests) read the country name
      title={nationality}                           // hovering over the flag shows the country name
      onError={event => { event.currentTarget.style.display = 'none' }}   // if the image can't download, hide it
    />
  )
}

// export default makes Flag importable in other components
export default Flag
