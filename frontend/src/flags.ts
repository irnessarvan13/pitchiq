/*
flags.ts — turns a player's nationality into a country code for their flag image (#46).
One shared list, used by the Flag component. Before #46, TopScorers.tsx and ChampionsLeague.tsx
each had their own copy of this list (with different countries in each), and they used emoji flags,
which Windows can't draw — Windows shows two letters like "NO" instead.

The names on the left are spelled the way football-data.org spells nationalities.
The codes on the right are the ones flagcdn.com uses for its flag images:
two-letter country codes, plus gb-eng / gb-sct / gb-wls / gb-nir for the UK's four nations,
which play as separate national teams in football.
*/

const COUNTRY_CODES: Record<string, string> = {
  'Albania': 'al',
  'Algeria': 'dz',
  'Argentina': 'ar',
  'Australia': 'au',
  'Austria': 'at',
  'Belgium': 'be',
  'Bolivia': 'bo',
  'Bosnia and Herzegovina': 'ba',
  'Bosnia-Herzegovina': 'ba',              // football-data.org uses both spellings
  'Brazil': 'br',
  'Bulgaria': 'bg',
  'Cameroon': 'cm',
  'Canada': 'ca',
  'Chile': 'cl',
  'China': 'cn',
  'Colombia': 'co',
  'Costa Rica': 'cr',
  'Croatia': 'hr',
  'Czech Republic': 'cz',
  'Denmark': 'dk',
  'DR Congo': 'cd',
  'Ecuador': 'ec',
  'Egypt': 'eg',
  'England': 'gb-eng',
  'Finland': 'fi',
  'France': 'fr',
  'Georgia': 'ge',
  'Germany': 'de',
  'Ghana': 'gh',
  'Greece': 'gr',
  'Guinea': 'gn',
  'Honduras': 'hn',
  'Hungary': 'hu',
  'Iceland': 'is',
  'Iran': 'ir',
  'Ireland': 'ie',
  'Italy': 'it',
  'Ivory Coast': 'ci',
  'Jamaica': 'jm',
  'Japan': 'jp',
  'Korea Republic': 'kr',
  'Kosovo': 'xk',
  'Mali': 'ml',
  'Mexico': 'mx',
  'Montenegro': 'me',
  'Morocco': 'ma',
  'Netherlands': 'nl',
  'Nigeria': 'ng',
  'North Macedonia': 'mk',
  'Northern Ireland': 'gb-nir',
  'Norway': 'no',
  'Panama': 'pa',
  'Paraguay': 'py',
  'Peru': 'pe',
  'Poland': 'pl',
  'Portugal': 'pt',
  'Romania': 'ro',
  'Russia': 'ru',
  'Saudi Arabia': 'sa',
  'Scotland': 'gb-sct',
  'Senegal': 'sn',
  'Serbia': 'rs',
  'Slovakia': 'sk',
  'Slovenia': 'si',
  'South Africa': 'za',
  'South Korea': 'kr',
  'Spain': 'es',
  'Sweden': 'se',
  'Switzerland': 'ch',
  'Tunisia': 'tn',
  'Turkey': 'tr',
  'Ukraine': 'ua',
  'United States': 'us',
  'Uruguay': 'uy',
  'Venezuela': 've',
  'Wales': 'gb-wls',
}

// returns the country code for a nationality, or null if it's not in the list
// ?? null = "if the lookup found nothing (undefined), give back null instead"
export function getCountryCode(nationality: string): string | null {
  return COUNTRY_CODES[nationality] ?? null
}
