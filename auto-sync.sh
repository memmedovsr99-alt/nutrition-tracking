#!/bin/bash
cd "/Users/samir/Documents/Claude/Projects/Nutrition tracking"
if [[ -n $(git status --porcelain) ]]; then
    git add .
    git commit -m "Auto-update $(date '+%Y-%m-%d %H:%M')"
    git push
fi
