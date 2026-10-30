# Habit Tracker

A single-page habit tracker in plain HTML, CSS and JavaScript. No build step, no dependencies.

| Light | Dark | Phone |
|---|---|---|
| <img src="docs/screenshot-desktop.png" alt="Light theme, desktop width" width="360"> | <img src="docs/screenshot-desktop-dark.png" alt="Dark theme, desktop width" width="360"> | <img src="docs/screenshot-mobile.png" alt="Dark theme, phone width" width="170"> |

## Run it

Open `index.html` in any modern browser (double-click it). Your habits and check-ins are saved in the browser's `localStorage`, so they stay after you reload or close the tab.

## How it works

- Add habits with the input at the top. Rename one with the Rename button (Enter or clicking away saves, Escape cancels) and remove it with Delete. Names are trimmed and must be unique.
- Use the arrows above the grid to look at earlier weeks and fix a missed check-in; "This week" jumps back. You can't go past the current week.
- Each habit has a checkbox for every day of the current week (Monday to Sunday). Today's column is highlighted. Future days are locked.
- The streak counter shows how many days in a row you have completed the habit. If you haven't checked today yet, the streak still counts up to yesterday, so it isn't shown as broken during the day.

- **Dark mode:** follows your system setting by default. The button in the top corner switches it, and your choice is remembered.
- **Progress this week:** a bar chart of how many habits you completed each day, with a total for the week. It follows whichever week you are viewing.
- **Stats:** per habit, the current streak, your best streak ever, and the share of days completed over the last 30 days (counted from when the habit started, so new habits aren't penalised).
- **Backup (CSV):** "Export CSV" downloads your habits as a spreadsheet-friendly file that opens in Excel, Numbers and Google Sheets. "Import CSV" restores one, after asking for confirmation because it replaces what you have now. Files are validated and cleaned on import, so a damaged or unrelated file is refused. Use this to back up your data or move it to another browser. Your theme choice is not part of the file.

## Status

Milestones 1 to 4 are done: persistence, add/delete/rename, weekly checkboxes, streaks, week navigation, dark mode, weekly chart, stats, and CSV backup. Not built yet: reordering habits. See [PLAN.md](PLAN.md) for the roadmap.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `style.css` | Styles and theme variables |
| `storage.js` | Loading and saving state in `localStorage`, and validation of loaded data |
| `csv.js` | CSV export and import |
| `dates.js` | Local-date helpers, week days and streak logic |
| `charts.js` | Weekly bar chart (SVG) and stats table |
| `app.js` | State, rendering, theme, backup and events |
| `tests.js`, `tests.html` | Logic checks for `dates.js`, `storage.js` and `csv.js` |

## Running the checks

Open `tests.html` in a browser; it lists every check and whether it passed.

With Node installed you can also run them from the command line:

```
node -e "require('./dates.js'); require('./storage.js'); require('./csv.js'); require('./tests.js'); const r = globalThis.HabitTestResults; console.log(r.filter(x => !x.ok).length ? 'FAILED' : 'all ' + r.length + ' passed')"
```

Try different time zones to check daylight-saving handling, e.g. `TZ=America/New_York node -e "..."`.

## Data format

Stored under the `habitTracker.v1` key:

```json
{
  "version": 1,
  "settings": { "theme": "dark" },
  "habits": [
    { "id": "h_abc", "name": "Drink water", "createdAt": "2026-10-20", "completions": ["2026-10-19", "2026-10-20"] }
  ]
}
```

Dates are local `YYYY-MM-DD` strings; streaks and stats are computed from them, never stored. `settings.theme` is optional and only present once you have used the theme button. This is the format inside the browser; the backup file is CSV instead (below).

## Backup file format (CSV)

One row per check-in, with a header row:

```csv
habit,created,date
Drink water,2026-10-01,2026-10-19
Drink water,2026-10-01,2026-10-20
Read,2026-10-05,
```

- A habit with no check-ins has one row with an empty `date`, so it isn't lost.
- Habits are matched by name when importing, so internal ids are created fresh.
- Fields containing commas, quotes or line breaks are quoted as standard CSV, and the file starts with a UTF-8 byte-order mark so Excel shows accents and other languages correctly.
- A habit name starting with `=`, `+`, `-` or `@` gets a leading `'` in the file so a spreadsheet can't run it as a formula; the `'` is removed again on import.
- Import also accepts files saved from a spreadsheet app: any line endings, extra columns, and header capitalisation.
