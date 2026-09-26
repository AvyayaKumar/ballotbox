# Ballotbox (Real Advocacy)

A nonpartisan voter-information site. Enter an address and Ballotbox shows your assigned polling place, early-voting sites, and ballot drop boxes on a map, along with step-by-step voting guides and links to official resources for registration, sample ballots, and local election information.

**Live:** https://realadvocacy.us

## Data sources

- **Google Civic Information API**: polling places, early-voting sites, drop boxes, and contest/election data, as published by state and local election officials.
- **Google Maps Geocoding and Places APIs**: turn the address you type into coordinates and power address autocomplete.
- **OpenStreetMap**: map tiles, rendered with Leaflet.
- Curated state election-office links and a small set of upcoming California (Bay Area) elections in `src/lib/`.

Ballotbox doesn't generate or guess voting data. If the Civic API has nothing for an address, the site says no polling locations were found instead of guessing.

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
