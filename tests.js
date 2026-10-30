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
  // Untrusted JSON text -> cleaned state (or null), the same path an imported file takes.
  function P(text) { try { return S.normalize(JSON.parse(text)); } catch (e) { return null; } }
  if (S) {
    var good = { version: 1, settings: { theme: "dark" }, habits: [
      { id: "a", name: "  Read   books ", createdAt: "2026-10-01", completions: ["2026-10-03", "2026-10-02", "2026-10-02"] }
    ] };
    var clean = P(JSON.stringify(good));
    eq("storage: tidies name", clean.habits[0].name, "Read books");
    eq("storage: dedupes and sorts dates", clean.habits[0].completions, ["2026-10-02", "2026-10-03"]);
    eq("storage: keeps valid theme", clean.settings, { theme: "dark" });
    eq("storage: cleaning twice changes nothing", S.normalize(clean), clean);
    eq("storage: not JSON", P("{nope"), null);
    eq("storage: wrong shape", P('{"habits": "x"}'), null);
    eq("storage: JSON null", P("null"), null);
    eq("storage: array at top level", P("[1,2]"), null);
    eq("storage: empty habits list is valid", P('{"habits": []}').habits, []);
    eq("storage: drops malformed habits", P(JSON.stringify({ habits: [
      null, 5, { id: "a" }, { id: 1, name: "x", completions: [] },
      { id: "b", name: "   ", completions: [] }, { id: "ok", name: "Ok", completions: [] }
    ] })).habits.map(function (h) { return h.id; }), ["ok"]);
    eq("storage: drops duplicate ids", P(JSON.stringify({ habits: [
      { id: "a", name: "One", completions: [] }, { id: "a", name: "Two", completions: [] }
    ] })).habits.map(function (h) { return h.name; }), ["One"]);
    eq("storage: ignores invalid dates", P(JSON.stringify({ habits: [
      { id: "a", name: "A", createdAt: "yesterday", completions: ["2026-10-02", "20261003", 5, null, "<b>"] }
    ] })).habits[0], { id: "a", name: "A", createdAt: "", completions: ["2026-10-02"] });
    eq("storage: ignores unknown theme", P('{"habits": [], "settings": {"theme": "neon"}}').settings, {});
    eq("storage: truncates very long names",
      P(JSON.stringify({ habits: [{ id: "a", name: new Array(100).join("x"), completions: [] }] })).habits[0].name.length, 60);
    eq("storage: does not copy unknown fields", Object.keys(P(JSON.stringify({ evil: 1, habits: [
      { id: "a", name: "A", completions: [], extra: "x" }] }))).sort(), ["habits", "settings", "version"]);
  }

  // --- CSV backup ---------------------------------------------------------
  var C = global.HabitCSV;
  if (C && S) {
    function st(habits) { return { version: 1, settings: {}, habits: habits }; }
    function h(name, created, days) { return { id: "x", name: name, createdAt: created, completions: days }; }
    // ids are regenerated on import, so compare everything else
    function strip(state) {
      return state.habits.map(function (x) { return { name: x.name, createdAt: x.createdAt, completions: x.completions }; });
    }

    var out = C.stringify(st([h("Drink water", "2026-10-01", ["2026-10-19", "2026-10-20"]), h("Read", "2026-10-05", [])]));
    eq("csv: starts with BOM and header", out.indexOf("\uFEFFhabit,created,date\r\n"), 0);
    eq("csv: one row per check-in, empty date for none", out.split("\r\n").slice(1, 4),
      ["Drink water,2026-10-01,2026-10-19", "Drink water,2026-10-01,2026-10-20", "Read,2026-10-05,"]);
    eq("csv: ends with a newline", out.slice(-2), "\r\n");
    eq("csv: empty state is just the header", C.stringify(st([])), "\uFEFFhabit,created,date\r\n");

    var awkward = [h("Run, then stretch", "2026-10-01", ["2026-10-02"]), h('Say "hi"', "", []),
      h("Caf\u00E9 \u65E5\u672C\u8A9E \uD83D\uDE00", "2026-10-03", ["2026-10-04"])];
    eq("csv: round trip with commas, quotes, unicode", strip(C.parse(C.stringify(st(awkward)))), strip(st(awkward)));
    eq("csv: round trip of the sample", strip(C.parse(out)), [
      { name: "Drink water", createdAt: "2026-10-01", completions: ["2026-10-19", "2026-10-20"] },
      { name: "Read", createdAt: "2026-10-05", completions: [] }]);
    eq("csv: quoted field is escaped", C.stringify(st([h('A"B,C', "", [])])).split("\r\n")[1], '"A""B,C",,');

    // Formula guard: cells starting with = + - @ must not run as formulas in a spreadsheet
    ["=SUM(A1)", "+1 more", "-5 push-ups", "@home", "'=tricky"].forEach(function (name) {
      var line = C.stringify(st([h(name, "", [])])).split("\r\n")[1];
      eq("csv: guards formula-like name " + name, line.charAt(0) === "'" || line.indexOf('"\'') === 0, true);
      eq("csv: guarded name round-trips " + name, C.parse(C.stringify(st([h(name, "", [])]))).habits[0].name, name);
    });
    eq("csv: ordinary apostrophe untouched", C.stringify(st([h("Don't skip", "", [])])).split("\r\n")[1], "Don't skip,,");

    // Reading other people's / spreadsheet-edited files
    eq("csv: LF line endings and no BOM", strip(C.parse("habit,created,date\nRead,2026-10-01,2026-10-02\n")),
      [{ name: "Read", createdAt: "2026-10-01", completions: ["2026-10-02"] }]);
    eq("csv: old Mac CR line endings", C.parse("habit,created,date\rRead,,2026-10-02").habits.length, 1);
    eq("csv: newline inside a quoted name is tidied", C.parse('habit,created,date\r\n"Two\nlines",,\r\n').habits[0].name, "Two lines");
    eq("csv: header is case-insensitive", C.parse("Habit,Created,Date\nRead,,").habits.length, 1);
    eq("csv: extra columns ignored", C.parse("habit,created,date,notes\nRead,,2026-10-02,hello").habits[0].completions, ["2026-10-02"]);
    eq("csv: blank lines skipped", C.parse("habit,created,date\n\nRead,,\n\n").habits.length, 1);
    eq("csv: same habit on many rows merges", C.parse("habit,created,date\nRead,2026-10-05,2026-10-06\nread,2026-10-01,2026-10-07\n").habits.map(strip1), [
      { name: "Read", createdAt: "2026-10-01", completions: ["2026-10-06", "2026-10-07"] }]);
    function strip1(x) { return { name: x.name, createdAt: x.createdAt, completions: x.completions }; }
    eq("csv: bad dates ignored, habit kept", strip1(C.parse("habit,created,date\nRead,soon,2026-13-45x\nRead,,not a date\n").habits[0]),
      { name: "Read", createdAt: "", completions: [] });
    eq("csv: header only is an empty backup", C.parse("habit,created,date\n").habits, []);
    eq("csv: rows without a name skipped", C.parse("habit,created,date\n,2026-10-01,2026-10-02\n").habits, []);
    eq("csv: ids are unique", (function () {
      var ids = C.parse("habit,created,date\nA,,\nB,,\nC,,\n").habits.map(function (x) { return x.id; });
      return ids.length === 3 && ids[0] !== ids[1] && ids[1] !== ids[2] && ids[0] !== ids[2];
    })(), true);

    // Things that are not our CSV must be refused
    eq("csv: empty text", C.parse(""), null);
    eq("csv: only blank lines", C.parse("\n\n"), null);
    eq("csv: wrong header", C.parse("name,when\nRead,today"), null);
    eq("csv: JSON is refused", C.parse('{"habits": []}'), null);
    eq("csv: unterminated quote", C.parse('habit,created,date\n"Read,,'), null);
    eq("csv: random text", C.parse("hello world"), null);
    eq("csv: very long name is truncated to 60", C.parse("habit,created,date\n" + new Array(200).join("x") + ",,").habits[0].name.length, 60);
    eq("csv: theme setting is not in the file", C.parse(C.stringify({ version: 1, settings: { theme: "dark" }, habits: [] })).settings, {});
  }

  global.HabitTestResults = results;
})(typeof window !== "undefined" ? window : globalThis);
