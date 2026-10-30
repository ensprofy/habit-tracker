/* Persistence layer: loads and saves the habits in habits.csv through the
 * local server (server.js), and validates data from the file or from an
 * imported CSV. Needs csv.js (loaded after this file, used at call time).
 * Plain script, no ES modules.
 *
 * State shape (version 1; only the habits are written to the CSV):
 *   { version: 1, settings: { theme?: "light" | "dark" },
 *     habits: [{ id, name, createdAt, completions: ["YYYY-MM-DD", ...] }] }
 */
(function (global) {
  "use strict";

  var VERSION = 1;
  var MAX_NAME_LENGTH = 60;
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  function emptyState() {
    return { version: VERSION, settings: {}, habits: [] };
  }

  function isISO(value) {
    return typeof value === "string" && ISO_DATE.test(value);
  }

  // Turns untrusted parsed JSON into a clean state object, or null if it
  // doesn't look like Habit Tracker data at all. Bad habits are dropped,
  // bad dates are ignored, names are tidied.
  function normalize(parsed) {
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.habits)) return null;

    var seenIds = {};
    var habits = [];
    parsed.habits.forEach(function (h) {
      if (!h || typeof h.id !== "string" || typeof h.name !== "string" ||
          !Array.isArray(h.completions)) return;
      var name = h.name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
      if (!name || seenIds[h.id]) return;
      seenIds[h.id] = true;

      var days = {};
      h.completions.forEach(function (d) { if (isISO(d)) days[d] = true; });

      habits.push({
        id: h.id,
        name: name,
        createdAt: isISO(h.createdAt) ? h.createdAt : "",
        completions: Object.keys(days).sort()
      });
    });

    var theme = parsed.settings && parsed.settings.theme;
    return {
      version: VERSION,
      settings: (theme === "light" || theme === "dark") ? { theme: theme } : {},
      habits: habits
    };
  }

  // ---- Habit data: lives in habits.csv, reached through the local server ----

  var API_URL = "api/data";

  // Resolves to a clean state, or rejects with an Error whose message can be shown.
  function load() {
    return fetch(API_URL, { cache: "no-store", headers: { Accept: "text/csv" } })
      .then(function (response) {
        if (!response.ok) throw new Error("The server answered " + response.status + ".");
        return response.text();
      })
      .then(function (text) {
        if (text.replace(/^\uFEFF/, "").trim() === "") return emptyState();
        var state = global.HabitCSV.parse(text);
        if (!state) {
          throw new Error("habits.csv isn't a valid Habit Tracker file (its first line must be habit,created,date).");
        }
        return state;
      });
  }

  // Writes the whole state to habits.csv. Resolves to true on success, false on any failure.
  function save(state) {
    return fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: global.HabitCSV.stringify(state)
    }).then(function (response) { return response.ok; }, function () { return false; });
  }

  // ---- Theme: a display preference, so it stays in this browser (not in the CSV) ----

  var THEME_KEY = "habitTracker.theme";

  function loadTheme() {
    try {
      var value = global.localStorage.getItem(THEME_KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (e) {
      return null;
    }
  }

  function saveTheme(theme) {
    try {
      global.localStorage.setItem(THEME_KEY, theme);
    } catch (e) { /* private mode: the choice just won't be remembered */ }
  }

  global.HabitStorage = {
    VERSION: VERSION,
    MAX_NAME_LENGTH: MAX_NAME_LENGTH,
    emptyState: emptyState,
    normalize: normalize,
    load: load,
    save: save,
    loadTheme: loadTheme,
    saveTheme: saveTheme
  };
})(typeof window !== "undefined" ? window : globalThis);
