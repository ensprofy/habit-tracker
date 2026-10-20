/* Habit Tracker: state, rendering and events. */
(function () {
  "use strict";

  var MAX_NAME_LENGTH = 60;

  var state = HabitStorage.load();

  var form = document.getElementById("add-form");
  var input = document.getElementById("habit-name");
  var list = document.getElementById("habit-list");
  var emptyState = document.getElementById("empty-state");
  var message = document.getElementById("message");

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

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
      createdAt: todayISO(),
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

  function render() {
    list.textContent = "";
    state.habits.forEach(function (habit) {
      var li = document.createElement("li");
      li.className = "habit-item";

      var name = document.createElement("span");
      name.className = "habit-name";
      name.textContent = habit.name;

      var del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.textContent = "Delete";
      del.setAttribute("aria-label", "Delete habit: " + habit.name);
      del.addEventListener("click", function () {
        if (window.confirm('Delete "' + habit.name + '"?')) {
          deleteHabit(habit.id);
        }
      });

      li.appendChild(name);
      li.appendChild(del);
      list.appendChild(li);
    });
    emptyState.hidden = state.habits.length > 0;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (addHabit(input.value)) {
      input.value = "";
    }
    input.focus();
  });

  render();
})();
