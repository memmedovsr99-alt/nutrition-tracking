# Samir's Nutrition Tracking — Project Notes

## Live Site
- **URL**: https://memmedovsr99-alt.github.io/nutrition-tracking/
- **Hosting**: GitHub Pages (free, no limits)
- **Repo**: https://github.com/memmedovsr99-alt/nutrition-tracking.git

## How It Works
- Data lives in `nutrition_dashboard.html` as JS arrays (LOG, WEIGHT_LOG, TARGETS)
- After EVERY edit to `nutrition_dashboard.html`, ALWAYS run this command immediately:
  ```
  cd "/Users/samir/Documents/Claude/Projects/Nutrition tracking" && git add -A && git commit -m "Auto-update $(date '+%Y-%m-%d %H:%M')" && git push
  ```
- This pushes to GitHub → GitHub Pages updates the live site in ~1 min
- Do NOT skip this step — the site will not update without it

## Critical: Correct Folder Path
**ALWAYS use**: `/Users/samir/Documents/Claude/Projects/Nutrition tracking/`
**NEVER use**: `Nutrition tracking (1)/` — this is a duplicate that breaks sync. Delete it if it reappears.

## Key Files
- `nutrition_dashboard.html` — main dashboard (nutrition + weight log embedded)
- `weight_tracker.html` — DELETED, weight is embedded in dashboard
- `index.html` — redirects to nutrition_dashboard.html
- `manifest.json` — PWA config
- `sw.js` — service worker for PWA/offline
- `icons/` — app icons (coconut guy emoji photo)

## Data Structure
- `TARGETS` — daily goals: 2200 cal, 170g protein, 205g carbs, 55g fat
- `LOG` — array of daily entries with foods array inside each
- `WEIGHT_LOG` — morning weigh-ins

## User Info
- Name: Samir, Age: 27, Height: 179cm, Goal: Cut
- Current weight: ~81.5kg

## Design
- Dark theme, Inter font, circular SVG progress rings for macros
- Mobile-first, optimized for iPhone Pro (393px)
- Food log grouped by meal with color-coded sections
- Chips row shows: cal left, protein left, items logged, status

## GitHub Auth
- Token stored in git remote URL (already configured, don't change)
- Push with: `git add -A && git commit -m "..." && git push`

## PWA
- Installed on iPhone via Safari → Share → Add to Home Screen
- Icon: coconut guy emoji photo (cropped to face)
- If reinstalling after icon update: delete app first, then re-add
