/* Habit Tracker: state, rendering and events. */
(function () {
  "use strict";

  var MAX_NAME_LENGTH = 60;
  var DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  var DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  var state = HabitStorage.load();

  var form = document.getElementById("add-form");
  var input = document.getElementById("habit-name");
  var list = document.getElementById("habit-list");
  var emptyState = document.getElementById("empty-state");
  var message = document.getElementById("message");
  var weekRange = document.getElementById("week-range");
  var weekHeader = document.getElementById("week-header");

  function newId() {
    return "h_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function showMessage(text) {
    message.textContent = text || "";
  }

  function persist() {
    if (!HabitStorage.save(state)) {
      showMessage("Could not save to this browser. Changes will be lost on reload.");
    }
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

  function addHabit(rawName) {
    var name = rawName.trim().replace(/\s+/g, " ");
    if (!name) {
      showMessage("Please enter a habit name.");
      return false;
    }
    if (name.length > MAX_NAME_LENGTH) {
      showMessage("Habit name is too long (max " + MAX_NAME_LENGTH + " characters).");
      return false;
    }
    var duplicate = state.habits.some(function (h) {
      return h.name.toLowerCase() === name.toLowerCase();
    });
    if (duplicate) {
      showMessage("You already have a habit with that name.");
      return false;
    }
    state.habits.push({
      id: newId(),
      name: name,
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

  var focusTarget = null; // checkbox to re-focus after a render

  function renderHabit(habit, days, today, refocus) {
    var li = el("li", "habit-item grid-row");
    li.appendChild(el("span", "habit-col habit-name", habit.name));

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
    var days = HabitDates.getWeekDays(today);

    weekRange.textContent = "Week of " + formatShort(days[0]) + " – " + formatShort(days[6]);
    renderWeekHeader(days, today);

    list.textContent = "";
    state.habits.forEach(function (habit) {
      list.appendChild(renderHabit(habit, days, today, refocus));
    });

    var empty = state.habits.length === 0;
    emptyState.hidden = !empty;
    weekHeader.hidden = empty;

    if (focusTarget) focusTarget.focus();
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (addHabit(input.value)) {
      input.value = "";
    }
    input.focus();
  });

  // Refresh when returning to the tab so a new day (or week) is picked up.
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) render();
  });

  render();
})();
