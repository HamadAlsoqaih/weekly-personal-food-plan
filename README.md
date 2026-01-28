# Weekly Food Log (Static)

Two-page static site that reads JSON files (no backend).

## Pages
- **Today** (`index.html`): auto-detects weekday (shows only the day name). Meal descriptions open in a popup. Shows supplements.
- **Week** (`week.html`): top overview (days + meal names), then full details with descriptions under each meal.

## Data files
- `data/food_log.json`
- `data/supplements.json`

Edit the JSON and refresh the page.

## Dark/Light mode
Theme toggle persists in `localStorage`.

## Run locally
Because the site uses `fetch()` to load JSON, you must serve it (opening the HTML file directly may fail).
