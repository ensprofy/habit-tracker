/* Persistence layer: loads and saves app state in localStorage, and
 * validates data coming from storage or from an imported backup file.
 * Plain script (no ES modules) so the page works when opened via file://.
 *
 * State shape (version 1):
 *   { version: 1, settings: { theme?: "light" | "dark" },
 *     habits: [{ id, name, createdAt, completions: ["YYYY-MM-DD", ...] }] }
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "habitTracker.v1";
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

  // Parses JSON text; returns a clean state or null if it isn't usable.
  function parse(text) {
    try {
      return normalize(JSON.parse(text));
    } catch (e) {
      return null;
    }
  }

  // Returns a clean state object; falls back to empty state on any problem.
  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return parse(raw) || emptyState();
    } catch (e) {
      return emptyState();
    }
  }

  // Returns true on success, false if storage is unavailable or full.
  function save(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Pretty-printed JSON for the backup file.
  function serialize(state) {
    return JSON.stringify(state, null, 2);
  }

  global.HabitStorage = {
    KEY: STORAGE_KEY,
    VERSION: VERSION,
    MAX_NAME_LENGTH: MAX_NAME_LENGTH,
    emptyState: emptyState,
    normalize: normalize,
    parse: parse,
    load: load,
    save: save,
    serialize: serialize
  };
})(typeof window !== "undefined" ? window : globalThis);
