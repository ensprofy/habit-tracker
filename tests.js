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

  // --- toggleDate -------------------------------------------------------
  var original = ["2026-10-18", "2026-10-20"];
  eq("toggle adds and keeps sorted", D.toggleDate(original, "2026-10-19"),
    ["2026-10-18", "2026-10-19", "2026-10-20"]);
  eq("toggle removes existing", D.toggleDate(original, "2026-10-18"), ["2026-10-20"]);
  eq("toggle does not mutate input", original, ["2026-10-18", "2026-10-20"]);

  global.HabitTestResults = results;
})(typeof window !== "undefined" ? window : globalThis);
