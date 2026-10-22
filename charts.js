/* Weekly progress chart (plain SVG) and per-habit stats table. No libraries.
 * Colours come from CSS variables so both follow the light/dark theme.
 */
(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var RATE_WINDOW_DAYS = 30;

  // Chart geometry (SVG user units; the SVG scales to its container width).
  var COL_W = 50, BAR_W = 30, CHART_H = 100, TOP = 22, WIDTH = COL_W * 7, HEIGHT = TOP + CHART_H + 26;

  function svgEl(tag, attrs, text) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // How many habits were completed on each of the given days.
  function dayTotals(habits, days) {
    return days.map(function (iso) {
      return habits.filter(function (h) { return h.completions.indexOf(iso) !== -1; }).length;
    });
  }

  function percent(part, whole) {
    return whole === 0 ? 0 : Math.round((part / whole) * 100);
  }

  // Draws the bar chart for the shown week into `container`.
  function renderChart(container, habits, days, today) {
    container.textContent = "";
    var totals = dayTotals(habits, days);
    var max = Math.max(habits.length, 1);

    // Summary: check-ins vs. possible check-ins on days that have started.
    var elapsed = days.filter(function (iso) { return iso <= today; }).length;
    var possible = habits.length * elapsed;
    var done = totals.reduce(function (a, b) { return a + b; }, 0);
    container.appendChild(el("p", "chart-summary",
      done + " of " + possible + " check-ins (" + percent(done, possible) + "%)"));

    var description = "Habits completed per day: " + days.map(function (iso, i) {
      return DAY_SHORT[i] + " " + totals[i] + " of " + habits.length;
    }).join(", ") + ".";

    var svg = svgEl("svg", {
      "class": "chart", viewBox: "0 0 " + WIDTH + " " + HEIGHT, role: "img", "aria-label": description
    });

    days.forEach(function (iso, i) {
      var x = i * COL_W + (COL_W - BAR_W) / 2;
      var future = iso > today;
      var barH = Math.round((totals[i] / max) * CHART_H);

      svg.appendChild(svgEl("rect", {
        "class": "chart-track" + (future ? " is-future" : ""),
        x: x, y: TOP, width: BAR_W, height: CHART_H, rx: 5
      }));
      if (barH > 0) {
        svg.appendChild(svgEl("rect", {
          "class": "chart-bar" + (iso === today ? " is-today" : ""),
          x: x, y: TOP + CHART_H - barH, width: BAR_W, height: barH, rx: 5
        }));
      }
      if (!future) {
        svg.appendChild(svgEl("text", {
          "class": "chart-value", x: x + BAR_W / 2, y: TOP - 7, "text-anchor": "middle"
        }, String(totals[i])));
      }
      svg.appendChild(svgEl("text", {
        "class": "chart-label" + (iso === today ? " is-today" : ""),
        x: x + BAR_W / 2, y: TOP + CHART_H + 18, "text-anchor": "middle"
      }, DAY_SHORT[i]));
    });

    container.appendChild(svg);
  }

  // Table with current streak, best streak and the last-30-days rate per habit.
  function renderStats(container, habits, today) {
    container.textContent = "";
    var table = el("table", "stats-table");
    var head = el("tr");
    ["Habit", "Streak", "Best", "Last " + RATE_WINDOW_DAYS + " days"].forEach(function (label, i) {
      var th = el("th", i === 0 ? "" : "num", label);
      th.scope = "col";
      head.appendChild(th);
    });
    var thead = el("thead");
    thead.appendChild(head);
    table.appendChild(thead);

    var body = el("tbody");
    habits.forEach(function (habit) {
      var row = el("tr");
      var name = el("th", "", habit.name);
      name.scope = "row";
      row.appendChild(name);

      var current = HabitDates.computeStreak(habit.completions, today);
      var best = HabitDates.computeLongestStreak(habit.completions);
      var rate = HabitDates.computeCompletionRate(habit, today, RATE_WINDOW_DAYS);

      row.appendChild(el("td", "num", String(current)));
      row.appendChild(el("td", "num", String(best)));
      row.appendChild(el("td", "num", rate ? rate.done + "/" + rate.total + " · " + percent(rate.done, rate.total) + "%" : "–"));
      body.appendChild(row);
    });
    table.appendChild(body);

    var wrap = el("div", "table-wrap");
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  global.HabitCharts = { renderChart: renderChart, renderStats: renderStats, dayTotals: dayTotals };
})(typeof window !== "undefined" ? window : globalThis);
