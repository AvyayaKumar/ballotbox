# Ballotbox (Real Advocacy)

A nonpartisan voter-information site. Enter an address and Ballotbox shows every election currently scheduled for it, from local school board to U.S. Senate, with where to vote in each one (Election Day polling place, early-voting sites, ballot drop boxes, on a map), every contest on the ballot, the election offices that run it, and links to learn about the candidates and measures.

**Live:** https://realadvocacy.us

## Adoption and impact

- Adopted by the Union City Youth Council for voting initiatives.
- Helped register 40+ new voters and increased reported voter turnout at James Logan High School by 20%.
- Adoption by a League of Women Voters chapter is planned.

## Data sources

Ballotbox shows only data published by a government body, loaded live at the moment a user searches. Nothing election-related is stored.

- **Voting Information Project via the Google Civic Information API** (`officialOnly=true`): the list of elections officials currently publish, and for each one the voter's polling places, early-voting sites, drop boxes, ballot contests (with candidate names, parties, and official candidate URLs when published), mail-only status, and state and local election-office contacts. One request per election, fanned out server-side in `src/lib/elections-api.ts`.
- **Vote.gov (U.S. General Services Administration)**: each state and territory's official election website and registration lookup, generated into `src/lib/state-links.generated.ts` from vote.gov's public `states.json`. Refresh with `npm run links:refresh`.
- **Google Maps Geocoding and Places APIs**: turn the address you type into coordinates and power address autocomplete.
- **OpenStreetMap**: map tiles, rendered with Leaflet.

To keep responses small, voting locations are sorted by distance from the address and capped at the nearest 25 per type; the official location finder is linked for the full list (Denver publishes 450+ drop boxes). When officials have not yet published data for an address, which is normal more than a few weeks before an election, Ballotbox says so and links to the official state tools instead of guessing.

"Learn more" links point first to official sources (state election website, registration and sample-ballot lookup, official candidate sites), then to clearly labeled nonpartisan guides (Ballotpedia, Vote411 from the League of Women Voters).

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Leaflet / react-leaflet with OpenStreetMap tiles
- Optional Google sign-in via Auth.js (next-auth v5)
- Deployed on Vercel

## Running locally

```bash
cp .env.example .env.local   # then fill in your own keys
npm install
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example`. Server-side keys (`GOOGLE_CIVIC_API_KEY`, `GOOGLE_MAPS_API_KEY`) never reach the browser. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is used by address autocomplete in the browser, so restrict it by HTTP referrer in Google Cloud.
