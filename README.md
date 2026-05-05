---
title: Canadian Grocery Prices
emoji: 🛒
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
pinned: false
short_description: Live Canadian grocery prices from 8 ingestion sources
---

# grocery-price-dashboard

Read-only public dashboard for the [grocery-price-rag](https://github.com/Arjun10g/grocery-price-rag) Canadian grocery price ingestion pipeline.

Live data: 165k+ price observations across StatCan provincial averages, Loblaws + Sobeys retailer APIs, Schema.org markup on long-tail grocers, and crowdsourced Open Food Facts. Refreshed every two weeks via Cloud Run + Cloud Scheduler.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind 4
- **Supabase JS** with anon key — RLS gates read access (see [migration 20260505011514](https://github.com/Arjun10g/grocery-price-rag/blob/main/supabase/migrations/20260505011514_anon_read_policies.sql))
- **Recharts** for price-history charts
- Deployed via Docker on Hugging Face Spaces

## Pages

| Route | What it does |
|---|---|
| `/` | Search + recent observations feed + table-count overview |
| `/search?q=...` | Product name + brand search (ILIKE; pg_trgm hybrid is future work) |
| `/products/[id]` | Price history chart, latest by retailer, all observations |
| `/sources` | Source confidence + recent pipeline runs (succeeded/failed/dlq) |
| `/stores` | 1,931 grocery stores grouped by province (from osm_overpass) |

## Local dev

```bash
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
# (anon key is intentionally public — RLS gates what's readable)

npm install
npm run dev          # http://localhost:3000
```

## What this dashboard is NOT

- Not a search engine (no semantic / embedding queries — those columns exist in the ingestion DB but the dashboard sticks to ILIKE)
- Not a notification service (no auth, no saved searches)
- Not a price-prediction tool (every row is a sighting, not a forecast)
- Not real-time (re-validates server-side at most once per minute via `revalidate`)

## License

MIT.
