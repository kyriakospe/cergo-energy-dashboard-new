# CERGO Energy Dash

Static-first CERGO energy, commodities, agriculture, infrastructure, and market-risk dashboard.

## Run locally

```powershell
& 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 5173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173
```

## Refresh data

```powershell
& 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\update_data.py
```

The updater writes normalized static JSON into `public/data`:

- `futures.json`
- `stocks.json`
- `country-indices.json`
- `performance-rankings.json`
- `news.json`

Market data is delayed Yahoo Finance chart data. News is pulled from EIA RSS plus targeted Google News RSS searches for energy, commodities, and agriculture. Map infrastructure is curated GeoJSON in `public/data/map/features.geojson`.
