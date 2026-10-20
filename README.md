# Habit Tracker

A single-page habit tracker in plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

Open `index.html` in any modern browser (double-click it). Your habits are saved in the browser's `localStorage`, so they stay after you reload or close the tab.

## Status

Milestone 1 is done: add and delete habits, with persistence. Weekly checkboxes and streaks are next. See [PLAN.md](PLAN.md) for the full roadmap.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `style.css` | Styles and theme variables |
| `storage.js` | Loading and saving state in `localStorage` |
| `app.js` | State, rendering and events |
