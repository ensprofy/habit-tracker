# Habit Tracker

A single-page habit tracker in plain HTML, CSS and JavaScript. Your data is stored in a plain CSV file, `habits.csv`, on your own computer. No build step and no dependencies (just Node.js to run the small local server).

| Light | Dark | Phone |
|---|---|---|
| <img src="docs/screenshot-desktop.png" alt="Light theme, desktop width" width="360"> | <img src="docs/screenshot-desktop-dark.png" alt="Dark theme, desktop width" width="360"> | <img src="docs/screenshot-mobile.png" alt="Dark theme, phone width" width="170"> |

## Run it

You need [Node.js](https://nodejs.org) 18 or newer. In the app folder:

```
node server.js
```

Then open <http://localhost:3000> in any modern browser. (`npm start` does the same.) Stop the server with Ctrl+C.

- Your habits are saved to **`habits.csv`** in the app folder after every change. Open it in Excel, Numbers or Google Sheets, back it up, or keep it in a synced folder.
- Opening `index.html` by double-clicking no longer works on its own: the page shows a message telling you to start the server, and it won't save anything.
- To use another port or another file: `PORT=3001 HABITS_FILE=/path/to/habits.csv node server.js`.
- The server only listens on your own computer (`127.0.0.1`); other devices on your network can't reach it.

### How your data is protected

- The page **never saves until it has read `habits.csv` successfully**. If the file is damaged or the server isn't running, you get a message and the add/import controls are disabled, so your data can't be overwritten with an empty list.
- Every save goes to a temporary file first and is then swapped in, so a crash can't leave a half-written file. The version before the latest save is kept as `habits.csv.bak` (one step of undo).
- If a save fails (for example the server was stopped), the page tells you. The habit stays on screen and is saved together with your next change once the server is back.
- If you edit `habits.csv` in a spreadsheet while the app is open, the changes appear when you switch back to the browser tab. Keep dates as `YYYY-MM-DD` (text), because some spreadsheet apps rewrite them in a local format on save, and the app can't read that.
- Two browser tabs on the same file are fine, but the last save wins. Switching to a tab refreshes it first, so changes from the other tab aren't lost unless you edit in both at the same moment.
- `habits.csv` is listed in `.gitignore`, so your personal data is never committed by accident.

### Coming from the browser-storage version

Earlier versions kept data in the browser. That data lives under the old page's own address, so the new page can't see it. Open the old version, use its **Export** button, and then in the new page use **Import CSV** (the export from the `csv-backup` branch is already in this format).

## How it works

- Add habits with the input at the top. Rename one with the Rename button (Enter or clicking away saves, Escape cancels) and remove it with Delete. Names are trimmed and must be unique.
- Use the arrows above the grid to look at earlier weeks and fix a missed check-in; "This week" jumps back. You can't go past the current week.
- Each habit has a checkbox for every day of the current week (Monday to Sunday). Today's column is highlighted. Future days are locked.
- The streak counter shows how many days in a row you have completed the habit. If you haven't checked today yet, the streak still counts up to yesterday, so it isn't shown as broken during the day.

- **Dark mode:** follows your system setting by default. The button in the top corner switches it. This is a display preference, so it is remembered by the browser and is not written to `habits.csv`.
- **Progress this week:** a bar chart of how many habits you completed each day, with a total for the week. It follows whichever week you are viewing.
- **Stats:** per habit, the current streak, your best streak ever, and the share of days completed over the last 30 days (counted from when the habit started, so new habits aren't penalised).
- **Export / import CSV:** "Export CSV" downloads a copy of your habits, handy for a dated backup. "Import CSV" replaces `habits.csv` with a file you choose, after asking for confirmation. Files are validated and cleaned on import, so a damaged or unrelated file is refused.

## Status

Milestones 1 to 4 are done: persistence, add/delete/rename, weekly checkboxes, streaks, week navigation, dark mode, weekly chart, stats, and CSV import/export. On this branch the data is stored in `habits.csv` through a small local server instead of the browser. Not built yet: reordering habits. See [PLAN.md](PLAN.md) for the roadmap.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `style.css` | Styles and theme variables |
| `server.js` | Local server: serves the page and reads/writes `habits.csv` |
| `storage.js` | Loads/saves the habits through the server, validates data, remembers the theme |
| `csv.js` | Converts the habits to and from CSV (used for the data file, export and import) |
| `dates.js` | Local-date helpers, week days and streak logic |
| `charts.js` | Weekly bar chart (SVG) and stats table |
| `app.js` | State, rendering, theme, saving and events |
| `package.json` | `npm start` shortcut (no dependencies) |
| `tests.js`, `tests.html` | Logic checks for `dates.js`, `storage.js` and `csv.js` |

## Running the checks

Open `tests.html` in a browser; it lists every check and whether it passed.

With Node installed you can also run them from the command line:

```
node -e "require('./dates.js'); require('./storage.js'); require('./csv.js'); require('./tests.js'); const r = globalThis.HabitTestResults; console.log(r.filter(x => !x.ok).length ? 'FAILED' : 'all ' + r.length + ' passed')"
```

Try different time zones to check daylight-saving handling, e.g. `TZ=America/New_York node -e "..."`.

## The data file (habits.csv)

The same format is used for the data file, "Export CSV" and "Import CSV". One row per check-in, with a header row:

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
- Streaks and stats are computed from the dates, never stored.
- Reading is forgiving of files saved from a spreadsheet app: any line endings, blank lines and header capitalisation. Rows with unreadable dates are skipped, and habits with the same name (any capitalisation) are merged.
