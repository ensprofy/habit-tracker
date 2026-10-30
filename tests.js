/* Logic checks for dates.js. Plain script, no framework.
 * Browser: open tests.html. Node: see README ("Running the checks").
 * Results are collected in HabitTestResults: [{ name, ok, detail }].
 */
(function (global) {
  "use strict";

  var D = global.HabitDates;
  var results = [];

  function eq(name, actual, expected) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    results.push({ name: name, ok: a === e, detail: a === e ? "" : "expected " + e + ", got " + a });
  }

  // --- toISO / parseISO -------------------------------------------------
  eq("toISO pads month and day", D.toISO(new Date(2026, 0, 5)), "2026-01-05");
  eq("parseISO round-trips", D.toISO(D.parseISO("2026-10-20")), "2026-10-20");

  // --- addDays: month, year and leap-year boundaries ---------------------
  eq("addDays crosses year end", D.addDays("2026-12-31", 1), "2027-01-01");
  eq("addDays crosses month start backwards", D.addDays("2026-03-01", -1), "2026-02-28");
  eq("addDays handles leap day", D.addDays("2028-02-28", 1), "2028-02-29");
  eq("addDays by 0 is identity", D.addDays("2026-10-20", 0), "2026-10-20");

  // --- addDays across daylight-saving changes (Europe and US dates) ------
  eq("DST EU spring forward +1", D.addDays("2026-03-29", 1), "2026-03-30");
  eq("DST EU spring forward -1", D.addDays("2026-03-29", -1), "2026-03-28");
  eq("DST EU fall back +1", D.addDays("2026-10-25", 1), "2026-10-26");
  eq("DST EU fall back -1", D.addDays("2026-10-25", -1), "2026-10-24");
  eq("DST US spring forward +1", D.addDays("2026-03-08", 1), "2026-03-09");
  eq("DST US fall back +1", D.addDays("2026-11-01", 1), "2026-11-02");

  // --- getWeekDays: Monday first ----------------------------------------
  eq("week of a Tuesday", D.getWeekDays("2026-10-20"),
    ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
  eq("week of a Monday starts that day", D.getWeekDays("2026-10-19")[0], "2026-10-19");
  eq("week of a Sunday ends that day", D.getWeekDays("2026-10-25")[6], "2026-10-25");
  eq("week spanning two months", D.getWeekDays("2026-11-01"),
    ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  eq("week spanning two years", D.getWeekDays("2026-12-31"),
    ["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  eq("week containing EU DST change has 7 distinct days",
    D.getWeekDays("2026-10-25").length, 7);
  eq("week containing EU DST change",
    D.getWeekDays("2026-10-25"),
    ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);

  // --- computeStreak ----------------------------------------------------
  var T = "2026-10-20";
  eq("streak: no completions", D.computeStreak([], T), 0);
  eq("streak: today only", D.computeStreak(["2026-10-20"], T), 1);
  eq("streak: yesterday only keeps streak alive", D.computeStreak(["2026-10-19"], T), 1);
  eq("streak: three in a row ending today",
    D.computeStreak(["2026-10-18", "2026-10-19", "2026-10-20"], T), 3);
  eq("streak: three in a row ending yesterday",
    D.computeStreak(["2026-10-17", "2026-10-18", "2026-10-19"], T), 3);
  eq("streak: gap breaks the count",
    D.computeStreak(["2026-10-20", "2026-10-19", "2026-10-17"], T), 2);
  eq("streak: last done two days ago is broken",
    D.computeStreak(["2026-10-17", "2026-10-18"], T), 0);
  eq("streak: unsorted input", D.computeStreak(["2026-10-20", "2026-10-18", "2026-10-19"], T), 3);
  eq("streak: duplicates ignored", D.computeStreak(["2026-10-20", "2026-10-20"], T), 1);
  eq("streak: across month boundary",
    D.computeStreak(["2026-10-31", "2026-11-01", "2026-11-02"], "2026-11-02"), 3);
  eq("streak: across year boundary",
    D.computeStreak(["2026-12-31", "2027-01-01", "2027-01-02"], "2027-01-02"), 3);
  eq("streak: across leap day",
    D.computeStreak(["2028-02-28", "2028-02-29", "2028-03-01"], "2028-03-01"), 3);
  eq("streak: across EU DST change",
    D.computeStreak(["2026-10-24", "2026-10-25", "2026-10-26"], "2026-10-26"), 3);
  eq("streak: across US DST change",
    D.computeStreak(["2026-10-31", "2026-11-01", "2026-11-02"], "2026-11-02"), 3);
  eq("streak: future date does not count",
    D.computeStreak(["2026-10-21"], T), 0);
  eq("streak: 100 days", D.computeStreak(
    Array.apply(null, Array(100)).map(function (_, i) { return D.addDays(T, -i); }), T), 100);

  // --- diffDays / longest streak / completion rate -----------------------
  eq("diffDays same day", D.diffDays("2026-10-20", "2026-10-20"), 0);
  eq("diffDays forward", D.diffDays("2026-10-20", "2026-10-27"), 7);
  eq("diffDays backward", D.diffDays("2026-10-27", "2026-10-20"), -7);
  eq("diffDays across EU DST change", D.diffDays("2026-03-28", "2026-03-30"), 2);
  eq("diffDays across US DST change", D.diffDays("2026-03-07", "2026-03-09"), 2);
  eq("diffDays across year end", D.diffDays("2026-12-30", "2027-01-02"), 3);

  eq("longest: empty", D.computeLongestStreak([]), 0);
  eq("longest: single day", D.computeLongestStreak(["2026-10-20"]), 1);
  eq("longest: picks the longest run, not the latest",
    D.computeLongestStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-10"]), 3);
  eq("longest: unsorted input", D.computeLongestStreak(["2026-10-03", "2026-10-01", "2026-10-02"]), 3);
  eq("longest: duplicates ignored", D.computeLongestStreak(["2026-10-01", "2026-10-01", "2026-10-02"]), 2);
  eq("longest: across month boundary", D.computeLongestStreak(["2026-10-31", "2026-11-01"]), 2);
  eq("longest: gap of one day breaks the run", D.computeLongestStreak(["2026-10-01", "2026-10-03"]), 1);

  eq("rate: no start day", D.computeCompletionRate({ createdAt: "", completions: [] }, T, 30), null);
  eq("rate: created today, nothing ticked",
    D.computeCompletionRate({ createdAt: T, completions: [] }, T, 30), { done: 0, total: 1, rate: 0 });
  eq("rate: created today and ticked",
    D.computeCompletionRate({ createdAt: T, completions: [T] }, T, 30), { done: 1, total: 1, rate: 1 });
  eq("rate: window is capped at 30 days",
    D.computeCompletionRate({ createdAt: "2026-01-01", completions: [T] }, T, 30), { done: 1, total: 30, rate: 1 / 30 });
  eq("rate: ticks older than the window are ignored",
    D.computeCompletionRate({ createdAt: "2026-01-01", completions: ["2026-01-05", T] }, T, 30).done, 1);
  eq("rate: early check-in extends the start day",
    D.computeCompletionRate({ createdAt: T, completions: [D.addDays(T, -3), T] }, T, 30), { done: 2, total: 4, rate: 0.5 });
  eq("rate: duplicates counted once",
    D.computeCompletionRate({ createdAt: T, completions: [T, T] }, T, 30).done, 1);
  eq("rate: future createdAt is ignored",
    D.computeCompletionRate({ createdAt: D.addDays(T, 5), completions: [] }, T, 30), null);

  // --- toggleDate -------------------------------------------------------
  var original = ["2026-10-18", "2026-10-20"];
  eq("toggle adds and keeps sorted", D.toggleDate(original, "2026-10-19"),
    ["2026-10-18", "2026-10-19", "2026-10-20"]);
  eq("toggle removes existing", D.toggleDate(original, "2026-10-18"), ["2026-10-20"]);
  eq("toggle does not mutate input", original, ["2026-10-18", "2026-10-20"]);

  // --- storage validation (used for loading and for imported backups) ----
  var S = global.HabitStorage;
  if (S) {
    var good = { version: 1, settings: { theme: "dark" }, habits: [
      { id: "a", name: "  Read   books ", createdAt: "2026-10-01", completions: ["2026-10-03", "2026-10-02", "2026-10-02"] }
    ] };
    var clean = S.parse(JSON.stringify(good));
    eq("storage: tidies name", clean.habits[0].name, "Read books");
    eq("storage: dedupes and sorts dates", clean.habits[0].completions, ["2026-10-02", "2026-10-03"]);
    eq("storage: keeps valid theme", clean.settings, { theme: "dark" });
    eq("storage: round-trips through serialize", S.parse(S.serialize(clean)), clean);
    eq("storage: not JSON", S.parse("{nope"), null);
    eq("storage: wrong shape", S.parse('{"habits": "x"}'), null);
    eq("storage: JSON null", S.parse("null"), null);
    eq("storage: array at top level", S.parse("[1,2]"), null);
    eq("storage: empty habits list is valid", S.parse('{"habits": []}').habits, []);
    eq("storage: drops malformed habits", S.parse(JSON.stringify({ habits: [
      null, 5, { id: "a" }, { id: 1, name: "x", completions: [] },
      { id: "b", name: "   ", completions: [] }, { id: "ok", name: "Ok", completions: [] }
    ] })).habits.map(function (h) { return h.id; }), ["ok"]);
    eq("storage: drops duplicate ids", S.parse(JSON.stringify({ habits: [
      { id: "a", name: "One", completions: [] }, { id: "a", name: "Two", completions: [] }
    ] })).habits.map(function (h) { return h.name; }), ["One"]);
    eq("storage: ignores invalid dates", S.parse(JSON.stringify({ habits: [
      { id: "a", name: "A", createdAt: "yesterday", completions: ["2026-10-02", "20261003", 5, null, "<b>"] }
    ] })).habits[0], { id: "a", name: "A", createdAt: "", completions: ["2026-10-02"] });
    eq("storage: ignores unknown theme", S.parse('{"habits": [], "settings": {"theme": "neon"}}').settings, {});
    eq("storage: truncates very long names",
      S.parse(JSON.stringify({ habits: [{ id: "a", name: new Array(100).join("x"), completions: [] }] })).habits[0].name.length, 60);
    eq("storage: does not copy unknown fields", Object.keys(S.parse(JSON.stringify({ evil: 1, habits: [
      { id: "a", name: "A", completions: [], extra: "x" }] }))).sort(), ["habits", "settings", "version"]);
  }

  global.HabitTestResults = results;
})(typeof window !== "undefined" ? window : globalThis);
