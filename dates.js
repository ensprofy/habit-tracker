/* Date helpers and streak logic. Pure functions, no DOM access.
 * All dates are handled in the user's LOCAL time as "YYYY-MM-DD" strings.
 * (Never use toISOString(): it converts to UTC and can shift the day.)
 */
(function (global) {
  "use strict";

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISO(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  }

  function todayISO() {
    return toISO(new Date());
  }

  // "2026-10-20" -> Date at local midnight.
  function parseISO(iso) {
    var p = iso.split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }

  // Adds whole calendar days; built from date parts so DST changes can't skew it.
  function addDays(iso, n) {
    var d = parseISO(iso);
    return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
  }

  // The 7 ISO dates of the week (Monday first) that contains `iso`.
  function getWeekDays(iso) {
    var d = parseISO(iso);
    var daysSinceMonday = (d.getDay() + 6) % 7; // Sunday(0) -> 6, Monday(1) -> 0
    var monday = addDays(iso, -daysSinceMonday);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(monday, i));
    return days;
  }

  // Consecutive completed days ending today. If today isn't done yet, the count
  // starts from yesterday so the streak isn't shown as broken during the day.
  function computeStreak(completions, today) {
    var done = {};
    completions.forEach(function (iso) { done[iso] = true; });
    var day = done[today] ? today : addDays(today, -1);
    var streak = 0;
    while (done[day]) {
      streak++;
      day = addDays(day, -1);
    }
    return streak;
  }

  // Whole calendar days from a to b (negative if b is earlier). DST-safe: uses UTC parts.
  function diffDays(a, b) {
    var x = parseISO(a), y = parseISO(b);
    return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) -
      Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000);
  }

  // Longest run of consecutive completed days anywhere in the history.
  function computeLongestStreak(completions) {
    var days = Object.keys(completions.reduce(function (set, d) { set[d] = true; return set; }, {})).sort();
    var best = 0, run = 0;
    for (var i = 0; i < days.length; i++) {
      run = (i > 0 && days[i] === addDays(days[i - 1], 1)) ? run + 1 : 1;
      if (run > best) best = run;
    }
    return best;
  }

  // Completion rate over the last `windowDays` days ending today. Counting starts at
  // the habit's first day (createdAt or its earliest check-in, whichever is earlier),
  // so a brand-new habit isn't penalised for days before it existed.
  // Returns { done, total, rate } (rate 0..1) or null if the habit has no start day yet.
  function computeCompletionRate(habit, today, windowDays) {
    var starts = habit.completions.filter(function (d) { return d <= today; });
    if (habit.createdAt && habit.createdAt <= today) starts.push(habit.createdAt);
    if (!starts.length) return null;
    var first = starts.reduce(function (a, b) { return a < b ? a : b; });
    var windowStart = addDays(today, -(windowDays - 1));
    var from = first > windowStart ? first : windowStart;
    var total = diffDays(from, today) + 1;
    var done = 0, seen = {};
    habit.completions.forEach(function (d) {
      if (d >= from && d <= today && !seen[d]) { seen[d] = true; done++; }
    });
    return { done: done, total: total, rate: done / total };
  }

  // Adds the date if missing, removes it if present. Returns a new sorted array.
  function toggleDate(completions, iso) {
    if (completions.indexOf(iso) !== -1) {
      return completions.filter(function (d) { return d !== iso; });
    }
    return completions.concat(iso).sort();
  }

  global.HabitDates = {
    toISO: toISO,
    todayISO: todayISO,
    parseISO: parseISO,
    addDays: addDays,
    getWeekDays: getWeekDays,
    diffDays: diffDays,
    computeStreak: computeStreak,
    computeLongestStreak: computeLongestStreak,
    computeCompletionRate: computeCompletionRate,
    toggleDate: toggleDate
  };
})(typeof window !== "undefined" ? window : globalThis);
