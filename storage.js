/* Persistence layer: loads and saves app state in localStorage.
 * Plain script (no ES modules) so the page works when opened via file://.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "habitTracker.v1";
  var VERSION = 1;

  function emptyState() {
    return { version: VERSION, habits: [] };
  }

  function isValidHabit(h) {
    return h && typeof h.id === "string" && typeof h.name === "string" &&
      Array.isArray(h.completions);
  }

  // Returns a clean state object; falls back to empty state on any problem.
  function load() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.habits)) return emptyState();
      return {
        version: VERSION,
        habits: parsed.habits.filter(isValidHabit)
      };
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

  global.HabitStorage = {
    KEY: STORAGE_KEY,
    VERSION: VERSION,
    emptyState: emptyState,
    load: load,
    save: save
  };
})(typeof window !== "undefined" ? window : globalThis);
