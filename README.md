# Letterboxd Rewind

**A Spotify-Wrapped-style year in review for your Letterboxd diary.** Enter a username, pick a
year (or all time), and get your watching habits back as a scrolling film reel.

**Live:** [letterboxd-rewind.vercel.app](https://letterboxd-rewind.vercel.app)

## What you get

Each section is a frame on a strip of film:

- **Breakdown & milestones**: films logged, total watch time, average rating, longest and shortest watches
- **Watching journey**: films per month across the year, and which days of the week you watch most
- **Favorite eras, genres, and languages**
- **Favorite actors and directors**: ranked by how much you liked their films, not just how often you saw them
- **Your #1s, Polarizing Takes** (where your rating differs most from the Letterboxd average), and **Most Rewatched**

## How it works

```
Next.js page ──POST /api/scrape──▶ Next.js route ──▶ Python serverless function (Vercel, 300s)
                                                         │
                                  diary pages ◀──────────┤  requests + BeautifulSoup
                                  film pages  ◀──────────┘  aiohttp, 25 films in flight, retries
```

- **Scraping.** The Python function walks every page of the user's diary for the chosen year,
  then enriches each film concurrently from its film page. That adds cast, crew, genres,
  language, studio, runtime and the Letterboxd average. An `asyncio` semaphore caps it at 25
  films in flight, so a full year fits in one serverless call.
- **Fair rankings.** Rewatches are collapsed to your highest rating before ranking. "Favorite
  director" is scored three ways: a weighted average, a **Bayesian average** (pulls
  small-sample picks toward your overall mean, so one 5★ film doesn't beat ten 4.5★ ones), and
  a **Wilson score** lower bound.
- **Frontend.** Next.js 14 + React, Recharts for the charts, Framer Motion for the reel
  animations, Tailwind in Letterboxd's palette.

## Run locally

The page and the Python function run together under the Vercel CLI:

```bash
npm install
pip install -r requirements.txt
npx vercel dev          # http://localhost:3000
```

`npm run dev` alone serves the UI, but `/api/scrape` needs the Python function that `vercel dev` provides.

## Project layout

```
app/                    Next.js app router: page, components (charts, film frames), API route
api/scrape_job/         Python serverless function: scrape → enrich → stats → JSON
src/scraper.py          diary + film-page scraping (async enrichment)
src/stats.py            aggregation and ranking (weighted / Bayesian / Wilson)
src/storage.py          pandas DataFrame assembly
```

## Notes

Letterboxd has no public API, so this scrapes public diary pages. It only works for public
profiles, and it keeps request concurrency bounded. It isn't affiliated with Letterboxd.
