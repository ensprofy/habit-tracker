/* CSV backup: converts app state to CSV text and back.
 *
 * Format: one row per check-in, so it opens cleanly in Excel, Numbers and
 * Google Sheets and works with pivot tables.
 *
 *   habit,created,date
 *   Drink water,2026-10-01,2026-10-19
 *   Drink water,2026-10-01,2026-10-20
 *   Read,2026-10-05,
 *
 * A habit with no check-ins gets a single row with an empty date, so it still
 * survives a round trip. Habits are matched by name when importing, so ids are
 * generated fresh. The theme setting is not part of the file.
 *
 * Plain script, no ES modules (works from file://).
 */
(function (global) {
  "use strict";

  var HEADER = ["habit", "created", "date"];
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
  // A cell starting with one of these can run as a formula in spreadsheet apps.
  var FORMULA_START = /^'*[=+\-@\t\r]/;

  // ---- Writing ----------------------------------------------------------

  function guardFormula(text) {
    return FORMULA_START.test(text) ? "'" + text : text;
  }

  function unguardFormula(text) {
    return /^'/.test(text) && FORMULA_START.test(text.slice(1)) ? text.slice(1) : text;
  }

  function escapeField(value) {
    var s = String(value);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function stringify(state) {
    var lines = [HEADER.join(",")];
    state.habits.forEach(function (habit) {
      var name = escapeField(guardFormula(habit.name));
      var created = habit.createdAt || "";
      if (habit.completions.length === 0) {
        lines.push([name, created, ""].join(","));
      } else {
        habit.completions.forEach(function (iso) {
          lines.push([name, created, iso].join(","));
        });
      }
    });
    // BOM so Excel opens the file as UTF-8 (habit names may contain any language).
    return "﻿" + lines.join("\r\n") + "\r\n";
  }

  // ---- Reading ----------------------------------------------------------

  // RFC 4180 style: quoted fields may contain commas, quotes ("") and newlines.
  // Returns an array of rows (arrays of strings), or null for an unterminated quote.
  function parseRows(text) {
    var rows = [], row = [], field = "", inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (inQuotes) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"' && field === "") {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text.charAt(i + 1) === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else {
        field += c;
      }
    }
    if (inQuotes) return null;
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  function newId(n) {
    return "h_" + Date.now().toString(36) + n.toString(36) + Math.random().toString(36).slice(2, 5);
  }

  // Returns a clean state (same validation as any other load), or null if the
  // text isn't a Habit Tracker CSV.
  function parse(text) {
    var rows = parseRows(String(text).replace(/^﻿/, ""));
    if (!rows) return null;
    rows = rows.filter(function (r) { return !(r.length === 1 && r[0].trim() === ""); });
    if (!rows.length) return null;

    var header = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    if (header[0] !== HEADER[0] || header[1] !== HEADER[1] || header[2] !== HEADER[2]) return null;

    var byName = {}, habits = [];
    rows.slice(1).forEach(function (r) {
      var name = unguardFormula(r[0] || "");
      var key = name.trim().replace(/\s+/g, " ").toLowerCase();
      if (!key) return;

      var habit = byName[key];
      if (!habit) {
        habit = byName[key] = { id: newId(habits.length), name: name, createdAt: "", completions: [] };
        habits.push(habit);
      }
      var created = (r[1] || "").trim();
      if (ISO_DATE.test(created) && (!habit.createdAt || created < habit.createdAt)) habit.createdAt = created;
      var date = (r[2] || "").trim();
      if (date) habit.completions.push(date);
    });

    return HabitStorage.normalize({ habits: habits });
  }

  global.HabitCSV = { stringify: stringify, parse: parse, parseRows: parseRows };
})(typeof window !== "undefined" ? window : globalThis);
