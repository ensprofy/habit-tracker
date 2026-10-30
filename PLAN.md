# Habit Tracker: Development Plan

A single-page habit tracker built with plain HTML, CSS and JavaScript. No build step and no dependencies. *Update (branch `csv-backup`):* data is now stored in a CSV file, `habits.csv`, written by a tiny dependency-free Node server (`node server.js`), instead of the browser's `localStorage`, so the page no longer works when opened directly from the filesystem.

## 1. Goals and non-goals

**Goals**
- A list of daily habits the user can add, rename and delete.
- A checkbox per habit for each day of the current week (Mon–Sun).
- A streak counter per habit (consecutive days completed, ending today or yesterday).
- Everything persists in `habits.csv` across reloads (originally `localStorage`).
- Opens directly from the filesystem (`file://`), zero setup.
- Easy to iterate on: small, readable files and clear extension points (dark mode, weekly chart, etc.).

**Non-goals (for v1)**
- Accounts, sync across devices, backend or database.
- Notifications and reminders.
- Frameworks, bundlers, TypeScript or npm tooling.

## 2. Project structure

```
habit-tracker/
├── index.html      # markup and script/style includes
├── style.css       # layout, theme variables
├── app.js          # state, rendering, events
├── server.js       # local server: static files + GET/PUT /api/data backed by habits.csv
├── storage.js      # load/save through the server, validation, theme preference
├── dates.js        # local-date helpers, week days, streak logic (pure functions)
├── tests.js        # logic checks for dates.js
├── tests.html      # open in a browser to run the checks
├── PLAN.md         # this file
└── README.md       # usage and screenshots
```

Plain `<script>` tags (not ES modules) are used so the page works over `file://`, where module imports are blocked by CORS in some browsers. Load order: `storage.js`, `csv.js`, `dates.js`, `charts.js`, then `app.js`.

## 3. Data model

Stored under a single key, `habitTracker.v1`:

```json
{
  "version": 1,
  "habits": [
    {
      "id": "h_lk3j2x",
      "name": "Drink water",
      "createdAt": "2026-10-20",
      "completions": ["2026-10-19", "2026-10-20"]
    }
  ]
}
```

Design decisions:
- **Completions are stored as a list of ISO dates (`YYYY-MM-DD`)** in local time, not as a per-week grid. This keeps weeks derivable, makes streaks easy to compute, and supports history and charts later.
- **Streaks are computed, not stored**, so they can never drift out of sync with the checkboxes.
- A `version` field allows future migrations without losing user data.

## 4. Core logic

| Function | Purpose |
|---|---|
| `todayISO()` / `toISO(date)` | Local-date ISO strings (avoid `toISOString()`, which uses UTC and shifts days). |
| `getWeekDays(date)` | Returns the 7 dates of the week containing `date`, Monday first. |
| `toggleCompletion(habitId, iso)` | Adds or removes a date from a habit's completions. |
| `computeStreak(habit, today)` | Counts consecutive completed days backwards from today; if today is not yet done, starts from yesterday so the streak is not shown as broken mid-day. |
| `load()` / `save(state)` | JSON parse/stringify with try/catch, fallback to empty state, version check. |

## 5. UI plan

- Header with the app title and the current week range (e.g. "Oct 19 – Oct 25").
- Table/grid: habit name | Mon … Sun checkboxes | 🔥 streak | delete.
- Today's column visually highlighted.
- "Add habit" input with Enter-to-submit.
- Empty state message when there are no habits.
- Previous/next week navigation (milestone 3).
- Accessibility: real `<input type="checkbox">` with labels (`aria-label="Drink water, Monday"`), visible focus styles, sufficient contrast, keyboard operable.
- Responsive: layout works down to ~360 px width (horizontal scroll or compact day letters on small screens).

## 6. Milestones

### M1: Skeleton and persistence (≈ 1 session)
- [x] Create `index.html`, `style.css`, `app.js`, `storage.js`.
- [x] Implement state load/save with `localStorage` and error handling.
- [x] Render habit list from state; add and delete habits.
- **Done when:** habits survive a page reload.

### M2: Weekly checkboxes and streaks
- [x] Render the 7-day grid for the current week.
- [x] Toggle completions; persist on every change.
- [x] Implement and unit-check `computeStreak` (see testing).
- [x] Highlight today's column; disable or dim future days (decision: allow checking only today and the past).
- **Done when:** checking boxes updates the streak instantly and correctly after reload.

### M3: Polish and usability
- [x] Previous/next week navigation.
- [x] Inline rename of habits.
- [x] Empty state, input validation (trim, no duplicates, max length).
- [x] Accessibility pass and responsive layout.
- [x] README with usage and a screenshot.
- **Done when:** usable comfortably on desktop and phone-width screens.

### M4: First iteration features (pick as desired)
- [x] Dark mode (CSS variables, `prefers-color-scheme`, manual toggle saved in storage).
- [x] Weekly progress chart (plain SVG or `<canvas>`, no library).
- [x] Longest streak and completion rate per habit.
- [x] Export/import data for backup. Built as JSON first, then switched to CSV (branch `csv-backup`) so the file opens in spreadsheet apps.
- [ ] Reorder habits (drag and drop). Not built yet; a simpler alternative is up/down buttons, which also work on touch screens and with a keyboard.

### M5: Release
- [ ] Enable GitHub Pages so the app is available by URL (optional; the file still works locally).
- [ ] Tag `v1.0.0`.

## 7. Testing strategy

No test framework is required. Keep verification lightweight:
- **Logic checks:** a small `tests.html` page (or a `tests.js` run in the console) that asserts on `computeStreak`, `getWeekDays` and date helpers using fixed dates. Key cases: empty history, today-only, gap in the middle, streak ending yesterday, week boundaries, month and year rollovers, and daylight-saving transitions.
- **Manual checklist:** add/delete habits, toggle boxes, reload page, clear storage, corrupted storage value, private-browsing mode, Chrome/Firefox/Safari.
- **Edge cases:** `localStorage` unavailable or full (show a non-blocking warning and continue in memory); user's timezone changes; opening the page just after midnight.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| UTC vs local date bugs shifting completions by a day | Build ISO dates from local `getFullYear/getMonth/getDate`; cover in tests. |
| Corrupted or outdated stored data | Wrap parsing in try/catch, validate shape, keep a `version` for migrations. |
| Data loss when the browser clears site data | Data now lives in `habits.csv`, outside the browser; CSV export/import and a `.bak` copy as extra safety. |
| Page overwriting the file with an empty list after a failed load | The page refuses to save until `habits.csv` has been read successfully; covered by end-to-end tests. |
| `file://` restrictions | Avoid ES modules and `fetch`; use plain script tags. |
| Code becoming hard to iterate on | Separate storage, logic and rendering; keep functions small. |

## 9. Working agreement

- Small commits per task, with messages like `feat: weekly grid` or `fix: streak across month boundary`.
- Work on short-lived branches and merge to `main` when a milestone item is done.
- Each new feature request (e.g. "make it dark mode") should be a self-contained change that touches as few files as possible.
