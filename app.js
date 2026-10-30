/* Habit Tracker: state, rendering and events. */
(function () {
  "use strict";

  var MAX_NAME_LENGTH = HabitStorage.MAX_NAME_LENGTH;
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var state = HabitStorage.emptyState();
  var savedTheme = HabitStorage.loadTheme();
  if (savedTheme) state.settings.theme = savedTheme;

  // The habits live in habits.csv on the server. Nothing may be saved until the
  // file has been read successfully, or an empty list could overwrite real data.
  var ready = false;
  var loadFailed = false;
  var saving = false;      // a save request is in flight
  var dirty = false;       // changes not yet written to the file
  var saveErrorShown = false;
  var localVersion = 0;    // bumps on every local change; lets a late reload know it is stale
  var weekOffset = 0;   // 0 = this week, -1 = last week, ... (never positive)
  var editingId = null; // id of the habit currently being renamed

  var form = document.getElementById("add-form");
  var input = document.getElementById("habit-name");
  var list = document.getElementById("habit-list");
  var emptyState = document.getElementById("empty-state");
  var message = document.getElementById("message");
  var weekRange = document.getElementById("week-range");
  var weekHeader = document.getElementById("week-header");
  var weekPrev = document.getElementById("week-prev");
  var weekNext = document.getElementById("week-next");
  var weekToday = document.getElementById("week-today");
  var themeToggle = document.getElementById("theme-toggle");
  var insights = document.getElementById("insights");
  var chartTitle = document.getElementById("chart-title");
  var chartBox = document.getElementById("chart");
  var statsBox = document.getElementById("stats");
  var exportBtn = document.getElementById("export-btn");
  var importBtn = document.getElementById("import-btn");
  var importFile = document.getElementById("import-file");
  var loading = document.getElementById("loading");
  var banner = document.getElementById("status-banner");
  var bannerText = document.getElementById("banner-text");
  var bannerRetry = document.getElementById("banner-retry");
  var addButton = form.querySelector("button");
  var MAX_IMPORT_BYTES = 5 * 1024 * 1024;

  function newId() {
    return "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // Errors are shown in red; pass isInfo for neutral confirmations.
  function showMessage(text, isInfo) {
    message.textContent = text || "";
    message.className = "message" + (isInfo ? " is-info" : "");
  }

  // Queues a write of the whole habit list to habits.csv. Writes never overlap:
  // while one is in flight, further changes are folded into the next one.
  function persist() {
    if (!ready) return;
    localVersion++;
    dirty = true;
    flushSaves();
  }

  function flushSaves() {
    if (saving || !dirty) return;
    dirty = false;
    saving = true;
    HabitStorage.save(state).then(function (ok) {
      saving = false;
      if (ok) {
        if (saveErrorShown) {
          saveErrorShown = false;
          showMessage("");
        }
        flushSaves();
      } else {
        dirty = true; // the next change tries again with the full, current list
        saveErrorShown = true;
        showMessage("Could not save to habits.csv. Is the server still running? " +
          "Your latest change is not saved yet; it will be saved with your next change.");
      }
    });
  }

  function setReady(value) {
    ready = value;
    [input, addButton, exportBtn, importBtn].forEach(function (control) {
      control.disabled = !value;
    });
  }

  function describeLoadError(error) {
    if (window.location.protocol === "file:") {
      return "This page was opened as a plain file, so it can't reach habits.csv. " +
        "Start the server with \"node server.js\" in the app folder, then open http://localhost:3000";
    }
    return "Could not load your habits: " + (error && error.message ? error.message : "unknown error") +
      " Make sure the server is running (node server.js).";
  }

  function loadData() {
    banner.hidden = true;
    loadFailed = false;
    render();
    HabitStorage.load().then(function (loaded) {
      state.habits = loaded.habits;
      setReady(true);
      render();
    }, function (error) {
      loadFailed = true;
      setReady(false);
      bannerText.textContent = describeLoadError(error);
      banner.hidden = false;
      render();
    });
  }

  // Picks up edits made to habits.csv outside the app (e.g. in a spreadsheet),
  // but only when this page has nothing unsaved and the user isn't mid-edit.
  function refreshFromFile() {
    var versionAtStart = localVersion;
    HabitStorage.load().then(function (loaded) {
      if (versionAtStart !== localVersion || saving || dirty || editingId !== null) return;
      if (HabitCSV.stringify({ habits: loaded.habits }) !== HabitCSV.stringify({ habits: state.habits })) {
        state.habits = loaded.habits;
      }
      render();
    }, function () { /* keep working with what is on screen */ });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatShort(iso) {
    var d = HabitDates.parseISO(iso);
    return MONTHS[d.getMonth()] + " " + d.getDate();
  }

  // Shared by "add" and "rename". Returns { name } or { error }.
  function validateName(rawName, ignoreId) {
    var name = rawName.trim().replace(/\s+/g, " ");
    if (!name) return { error: "Please enter a habit name." };
    if (name.length > MAX_NAME_LENGTH) {
      return { error: "Habit name is too long (max " + MAX_NAME_LENGTH + " characters)." };
    }
    var duplicate = state.habits.some(function (h) {
      return h.id !== ignoreId && h.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) return { error: "You already have a habit with that name." };
    return { name: name };
  }

  function addHabit(rawName) {
    var result = validateName(rawName);
    if (result.error) {
      showMessage(result.error);
      return false;
    }
    state.habits.push({
      id: newId(),
      name: result.name,
      createdAt: HabitDates.todayISO(),
      completions: []
    });
    showMessage("");
    persist();
    render();
    return true;
  }

  function deleteHabit(id) {
    state.habits = state.habits.filter(function (h) { return h.id !== id; });
    persist();
    render();
  }

  function toggleCompletion(id, iso) {
    // Only today and past days can be changed.
    if (iso > HabitDates.todayISO()) return;
    state.habits.forEach(function (h) {
      if (h.id === id) h.completions = HabitDates.toggleDate(h.completions, iso);
    });
    persist();
    render({ habitId: id, iso: iso }); // keep keyboard focus on the box just toggled
  }

  function startRename(id) {
    editingId = id;
    showMessage("");
    render({ habitId: id, edit: true });
  }

  function finishRename(id, rawName, save) {
    var habit = state.habits.filter(function (h) { return h.id === id; })[0];
    if (!habit) {
      editingId = null;
      render();
      return;
    }
    if (save) {
      var result = validateName(rawName, id);
      if (result.error) {
        showMessage(result.error);
        return; // stay in edit mode so the user can fix it
      }
      habit.name = result.name;
      persist();
    }
    editingId = null;
    showMessage("");
    render({ habitId: id, rename: true });
  }

  // ---- Theme -----------------------------------------------------------
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function effectiveTheme() {
    if (state.settings.theme) return state.settings.theme;
    return darkQuery && darkQuery.matches ? "dark" : "light";
  }

  function applyTheme() {
    var root = document.documentElement;
    if (state.settings.theme) root.setAttribute("data-theme", state.settings.theme);
    else root.removeAttribute("data-theme");
    var dark = effectiveTheme() === "dark";
    // The button shows (and announces) what a click will switch to.
    themeToggle.textContent = dark ? "\u2600 Light" : "\u263E Dark";
    themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function toggleTheme() {
    state.settings.theme = effectiveTheme() === "dark" ? "light" : "dark";
    HabitStorage.saveTheme(state.settings.theme);
    applyTheme();
  }

  // ---- Backup: export / import -----------------------------------------
  function exportData() {
    var blob = new Blob([HabitCSV.stringify(state)], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "habit-tracker-" + HabitDates.todayISO() + ".csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    showMessage("Backup downloaded (" + state.habits.length + " habit" + (state.habits.length === 1 ? "" : "s") + ").", true);
  }

  function importData(file) {
    if (file.size > MAX_IMPORT_BYTES) {
      showMessage("That file is too large to be a Habit Tracker CSV backup.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var imported = HabitCSV.parse(String(reader.result));
      if (!imported) {
        showMessage("That file isn't a valid Habit Tracker CSV backup.");
        return;
      }
      var question = "Replace your current " + state.habits.length + " habit(s) with the " +
        imported.habits.length + " habit(s) in this file? This cannot be undone.";
      if (!window.confirm(question)) {
        showMessage("Import cancelled.", true);
        return;
      }
      imported.settings = state.settings; // a CSV carries no settings: keep the current theme
      state = imported;
      editingId = null;
      persist();
      applyTheme();
      render();
      showMessage("Imported " + state.habits.length + " habit" + (state.habits.length === 1 ? "" : "s") + ".", true);
    };
    reader.onerror = function () { showMessage("Could not read that file."); };
    reader.readAsText(file);
  }

  function setWeekOffset(n) {
    weekOffset = Math.min(0, n);
    render();
  }

  function renderWeekHeader(days, today) {
    weekHeader.textContent = "";
    weekHeader.appendChild(el("span", "habit-col", "Habit"));
    days.forEach(function (iso, i) {
      var cell = el("span", "day-col" + (iso === today ? " is-today" : ""));
      cell.appendChild(el("span", "day-name", DAY_SHORT[i]));
      cell.appendChild(el("span", "day-date", String(HabitDates.parseISO(iso).getDate())));
      weekHeader.appendChild(cell);
    });
    weekHeader.appendChild(el("span", "streak-col", "Streak"));
    weekHeader.appendChild(el("span", "action-col"));
  }

  var focusTarget = null; // element to re-focus after a render

  function renderNameCell(habit, refocus) {
    var cell = el("span", "habit-col habit-cell");

    if (editingId === habit.id) {
      var edit = document.createElement("input");
      edit.type = "text";
      edit.className = "rename-input";
      edit.value = habit.name;
      edit.maxLength = MAX_NAME_LENGTH;
      edit.setAttribute("aria-label", "New name for " + habit.name);
      var done = false; // Enter/Escape re-render removes the field; ignore the blur that follows
      edit.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          done = true;
          finishRename(habit.id, edit.value, true);
          if (editingId === habit.id) done = false; // validation failed, still editing
        } else if (event.key === "Escape") {
          event.preventDefault();
          done = true;
          finishRename(habit.id, edit.value, false);
        }
      });
      edit.addEventListener("blur", function () {
        if (done) return;
        done = true;
        finishRename(habit.id, edit.value, true);
        if (editingId === habit.id) done = false;
      });
      cell.appendChild(edit);
      if (refocus && refocus.habitId === habit.id && refocus.edit) focusTarget = edit;
      return cell;
    }

    cell.appendChild(el("span", "habit-name", habit.name));
    var rename = el("button", "rename-btn", "Rename");
    rename.type = "button";
    rename.setAttribute("aria-label", "Rename habit: " + habit.name);
    rename.addEventListener("click", function () { startRename(habit.id); });
    cell.appendChild(rename);
    if (refocus && refocus.habitId === habit.id && refocus.rename) focusTarget = rename;
    return cell;
  }

  function renderHabit(habit, days, today, refocus) {
    var li = el("li", "habit-item grid-row");
    li.appendChild(renderNameCell(habit, refocus));

    days.forEach(function (iso, i) {
      var cell = el("span", "day-col" + (iso === today ? " is-today" : ""));
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = habit.completions.indexOf(iso) !== -1;
      box.disabled = iso > today;
      box.setAttribute("aria-label", habit.name + ", " + DAY_NAMES[i] + " " + formatShort(iso));
      box.addEventListener("change", function () {
        toggleCompletion(habit.id, iso);
      });
      if (refocus && refocus.habitId === habit.id && refocus.iso === iso) {
        focusTarget = box;
      }
      cell.appendChild(box);
      li.appendChild(cell);
    });

    // Streak always counts back from the real today, whichever week is shown.
    var streak = HabitDates.computeStreak(habit.completions, today);
    var streakCell = el("span", "streak-col" + (streak > 0 ? " is-active" : ""));
    streakCell.appendChild(el("span", "streak-icon", streak > 0 ? "🔥" : ""));
    streakCell.appendChild(el("span", "streak-num", String(streak)));
    streakCell.setAttribute("aria-label", "Streak: " + streak + (streak === 1 ? " day" : " days"));
    li.appendChild(streakCell);

    var actionCell = el("span", "action-col");
    var del = el("button", "delete-btn", "Delete");
    del.type = "button";
    del.setAttribute("aria-label", "Delete habit: " + habit.name);
    del.addEventListener("click", function () {
      if (window.confirm('Delete "' + habit.name + '"?')) {
        deleteHabit(habit.id);
      }
    });
    actionCell.appendChild(del);
    li.appendChild(actionCell);
    return li;
  }

  function render(refocus) {
    focusTarget = null;
    var today = HabitDates.todayISO();
    var days = HabitDates.getWeekDays(HabitDates.addDays(today, weekOffset * 7));

    weekRange.textContent = "Week of " + formatShort(days[0]) + " – " + formatShort(days[6]) +
      (weekOffset === 0 ? " (this week)" : "");
    weekNext.disabled = weekOffset >= 0;
    weekToday.hidden = weekOffset === 0;
    renderWeekHeader(days, today);

    list.textContent = "";
    state.habits.forEach(function (habit) {
      list.appendChild(renderHabit(habit, days, today, refocus));
    });

    var empty = state.habits.length === 0;
    loading.hidden = ready || loadFailed;
    emptyState.hidden = !ready || !empty;
    weekHeader.hidden = empty;

    insights.hidden = empty;
    if (!empty) {
      chartTitle.textContent = weekOffset === 0 ? "Progress this week" : "Progress for week of " + formatShort(days[0]);
      HabitCharts.renderChart(chartBox, state.habits, days, today);
      HabitCharts.renderStats(statsBox, state.habits, today);
    }

    if (focusTarget) focusTarget.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (addHabit(input.value)) {
      input.value = "";
    }
    input.focus();
  });

  themeToggle.addEventListener("click", toggleTheme);
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", applyTheme);
  exportBtn.addEventListener("click", exportData);
  importBtn.addEventListener("click", function () { importFile.click(); });
  importFile.addEventListener("change", function () {
    if (importFile.files && importFile.files[0]) importData(importFile.files[0]);
    importFile.value = ""; // allow re-selecting the same file
  });

  weekPrev.addEventListener("click", function () { setWeekOffset(weekOffset - 1); });
  weekNext.addEventListener("click", function () { setWeekOffset(weekOffset + 1); });
  weekToday.addEventListener("click", function () { setWeekOffset(0); });

  bannerRetry.addEventListener("click", loadData);

  // When returning to the tab, pick up a new day (or week) and any outside edits to the file.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden || editingId !== null) return;
    if (ready && !saving && !dirty) refreshFromFile();
    else render();
  });

  // Warn before leaving with changes that haven't reached the file.
  window.addEventListener("beforeunload", function (event) {
    if (saving || dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  setReady(false);
  applyTheme();
  loadData();
})();
