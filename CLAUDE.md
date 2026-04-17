# Samir's Nutrition Tracking — Project Notes

## Live Site
- **URL**: https://memmedovsr99-alt.github.io/nutrition-tracking/
- **Hosting**: GitHub Pages (free, no limits)
- **Repo**: https://github.com/memmedovsr99-alt/nutrition-tracking.git

## Architecture (migrated to Supabase — April 2026)
- **Data lives in Supabase**, NOT in the HTML file anymore
- `nutrition_dashboard.html` is now just UI code — do NOT look for data arrays in it
- Dashboard fetches data from Supabase on load via REST API

## Supabase Config
- **URL**: `https://dhwquwnqlxnmbsrokiff.supabase.co`
- **Key**: `sb_publishable_5Sr1y3JmWCHXNCFMMt10Dg_1TgtLnLu`
- Tables: `nutrition_log`, `food_items`, `weight_log`, `targets`, `inbody_scans`, `hydration_log`

## How to Log Data (NO HTML editing needed)

### Log a food day
Call `window.logDay(entry)` in the browser console, OR use the Supabase REST API directly:

```python
import urllib.request, json

URL = 'https://dhwquwnqlxnmbsrokiff.supabase.co'
KEY = 'sb_publishable_5Sr1y3JmWCHXNCFMMt10Dg_1TgtLnLu'

def sb_upsert(table, data, on_conflict=''):
    path = f'/rest/v1/{table}' + (f'?on_conflict={on_conflict}' if on_conflict else '')
    req = urllib.request.Request(URL + path, data=json.dumps(data).encode(),
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}',
                 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'}, method='POST')
    with urllib.request.urlopen(req) as r: return r.status

def sb_insert(table, data):
    req = urllib.request.Request(f'{URL}/rest/v1/{table}', data=json.dumps(data).encode(),
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}',
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}, method='POST')
    with urllib.request.urlopen(req) as r: return r.status

def sb_delete(table, filter_str):
    req = urllib.request.Request(f'{URL}/rest/v1/{table}?{filter_str}',
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'}, method='DELETE')
    with urllib.request.urlopen(req) as r: return r.status
```

### Log a full day with foods
```python
date = "2026-04-17"
sb_upsert('nutrition_log', {"date": date, "calories": 2100, "protein": 165, "carbs": 190, "fat": 60, "notes": ""}, 'date')
sb_delete('food_items', f'date=eq.{date}')
sb_insert('food_items', [
    {"date": date, "meal": "Breakfast", "name": "Boiled eggs (x3)", "calories": 210, "protein": 18, "carbs": 1, "fat": 15, "sort_order": 0},
    {"date": date, "meal": "Lunch", "name": "Chicken breast 200g", "calories": 220, "protein": 44, "carbs": 0, "fat": 4, "sort_order": 1},
    # ... more foods
])
```

### Log a weigh-in
```python
sb_upsert('weight_log', {"date": "2026-04-17", "weight": 81.2}, 'date')
```

### Log hydration
```python
sb_upsert('hydration_log', {"date": "2026-04-17", "liters": 2.5}, 'date')
```

## Data Schema
- `nutrition_log`: `date` (PK), `calories`, `protein`, `carbs`, `fat`, `notes`
- `food_items`: `id` (serial PK), `date`, `meal`, `name`, `calories`, `protein`, `carbs`, `fat`, `sort_order`
- `weight_log`: `date` (PK), `weight`
- `targets`: `id` (PK=1), `calories`=2200, `protein`=170, `carbs`=205, `fat`=55
- `inbody_scans`: `date` (PK), `weight`, `smm`, `bfm`, `pbf`, `lbm`, `tbw`, `bmr`, `bmi`
- `hydration_log`: `date` (PK), `liters`

## HTML edits — when needed
Only edit `nutrition_dashboard.html` for **UI/design changes** (never for data).
After any HTML edit, push:
```
cd "/Users/samir/Documents/Claude/Projects/Nutrition tracking" && git add -A && git commit -m "Auto-update $(date '+%Y-%m-%d %H:%M')" && git push
```

## Critical: Correct Folder Path
**ALWAYS use**: `/Users/samir/Documents/Claude/Projects/Nutrition tracking/`
**NEVER use**: `Nutrition tracking (1)/` — this is a duplicate that breaks sync.

## Key Files
- `nutrition_dashboard.html` — UI only (no data)
- `index.html` — redirects to nutrition_dashboard.html
- `manifest.json` — PWA config
- `sw.js` — service worker for PWA/offline
- `icons/` — app icons (coconut guy emoji photo)
- `migrate.html` — one-time migration page (can be deleted)

## User Info
- Name: Samir, Age: 27, Height: 179cm, Goal: Cut
- Current weight: ~81.5kg

## Design
- Dark theme, Inter font, circular SVG progress rings for macros
- Mobile-first, optimized for iPhone Pro (393px)
- Food log grouped by meal with color-coded sections

## GitHub Auth
- Token stored in git remote URL (already configured, don't change)

## PWA
- Installed on iPhone via Safari → Share → Add to Home Screen
- Icon: coconut guy emoji photo (cropped to face)
- If reinstalling after icon update: delete app first, then re-add
