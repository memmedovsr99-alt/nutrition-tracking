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

def sb_delete(table, filter_str):
    req = urllib.request.Request(f'{URL}/rest/v1/{table}?{filter_str}',
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'}, method='DELETE')
    with urllib.request.urlopen(req) as r: return r.status

def sb_insert(table, data):
    req = urllib.request.Request(f'{URL}/rest/v1/{table}', data=json.dumps(data).encode(),
        headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}',
                 'Content-Type': 'application/json', 'Prefer': 'return=minimal'}, method='POST')
    with urllib.request.urlopen(req) as r: return r.status

# ── April 17 ──
date = "2026-04-17"
sb_upsert('nutrition_log', {"date": date, "calories": 2484, "protein": 144, "carbs": 201, "fat": 118, "notes": "Broke 24h fast 🍽️"}, 'date')
sb_delete('food_items', f'date=eq.{date}')
sb_insert('food_items', [
    {"date": date, "meal": "Dinner", "name": "Ribeye steak 367g raw, fat trimmed (interior fat removed)", "calories": 620, "protein": 72, "carbs": 0,  "fat": 38, "sort_order": 0},
    {"date": date, "meal": "Dinner", "name": "Asparagus 221g raw",                                        "calories": 44,  "protein": 5,  "carbs": 8,  "fat": 0,  "sort_order": 1},
    {"date": date, "meal": "Snack",  "name": "Snacks + margherita pizza x2 slices (est.)",                "calories": 800, "protein": 25, "carbs": 80, "fat": 40, "sort_order": 2},
    {"date": date, "meal": "Snack",  "name": "Strawberries (1lb / 454g)",                                 "calories": 145, "protein": 1,  "carbs": 35, "fat": 0,  "sort_order": 3},
    {"date": date, "meal": "Snack",  "name": "Blackberries (170g)",                                       "calories": 75,  "protein": 2,  "carbs": 17, "fat": 1,  "sort_order": 4},
    {"date": date, "meal": "Dinner", "name": "Dave's Hot Chicken — 1 tender",                             "calories": 500, "protein": 35, "carbs": 25, "fat": 25, "sort_order": 5},
    {"date": date, "meal": "Dinner", "name": "Dave's Hot Chicken — fries (half small)",                   "calories": 220, "protein": 3,  "carbs": 28, "fat": 10, "sort_order": 6},
    {"date": date, "meal": "Dinner", "name": "Dave's Hot Chicken — sauce (80 cal)",                       "calories": 80,  "protein": 1,  "carbs": 8,  "fat": 4,  "sort_order": 7},
])
print("✅ Apr 17 logged!")
