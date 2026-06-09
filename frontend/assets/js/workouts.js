/* =========================================================
   Workouts page
   Mostra apenas treinos cadastrados pelo usuário ou estado vazio.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;

  const workoutList =
    document.querySelector("[data-workout-list]") ||
    document.querySelector(".workout-list");

  const statsCards = document.querySelectorAll(".stats-card");
  const floatingActionButton = document.querySelector("[data-scroll-fab]");

  const searchInput =
    document.querySelector("[data-workout-search]") ||
    document.querySelector(".dashboard-section .search-box input");
  const workoutFilterToggle = document.querySelector(
    "[data-workout-filter-toggle]",
  );
  const workoutFilterPanel = document.querySelector(
    "[data-workout-filter-panel]",
  );
  const workoutGoalFilter = document.querySelector("[data-workout-filter-goal]");
  const workoutLevelFilter = document.querySelector(
    "[data-workout-filter-level]",
  );
  const workoutFrequencyFilter = document.querySelector(
    "[data-workout-filter-frequency]",
  );
  const workoutFilterClearButton = document.querySelector(
    "[data-workout-filter-clear]",
  );

  const historyTableBody =
    document.querySelector("[data-history-table-body]") ||
    document.querySelector("#historyTableBody") ||
    document.querySelector(".table tbody");

  const historySearchInput = document.querySelector("[data-history-search]");
  const historyPeriodSelect = document.querySelector("[data-history-period]");
  const historyClearButton = document.querySelector("[data-history-clear]");
  const historySummary = document.querySelector("[data-history-summary]");
  const historyNavigation = document.querySelector("[data-history-navigation]");
  const historyNavigationLabel = document.querySelector(
    "[data-history-navigation-label]",
  );
  const historyToggleFullButton = document.querySelector(
    "[data-history-toggle-full]",
  );

  const recentHistoryLimit = 5;
  let isShowingFullHistory = false;

  if (!storage || !workoutList) {
    console.warn("Camada de dados ou lista de treinos não encontrada.");
    return;
  }

  setupFloatingActionButton();
  setupSearch();
  setupCustomSelects();
  setupWorkoutFilters();
  setupHistoryFilters();
  renderPage();

  function renderPage() {
    const workouts = storage.getStoredWorkouts();
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const filteredWorkouts = workouts.filter((workout) => {
      const searchable = [
        workout.name,
        workout.description,
        workout.goalLabel,
        workout.levelLabel,
        workout.frequencyLabel,
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchable.includes(query) &&
        matchesWorkoutFilters(workout)
      );
    });

    updateWorkoutFilterControls();
    renderStats();
    renderWorkouts(filteredWorkouts, workouts.length);
    renderHistory();
  }

  function renderStats() {
    const stats = storage.getWorkoutStats();

    setStatsCard(0, String(stats.totalWorkouts), "Treinos cadastrados");
    setStatsCard(1, String(stats.completedSessions), "Sessões registradas");
    setStatsCard(2, String(stats.sessionsThisWeek), "Sessões nesta semana");
    setStatsCard(
      3,
      storage.formatDuration(stats.averageDurationSeconds),
      "Média registrada",
    );
  }

  function setStatsCard(index, value, description) {
    const card = statsCards[index];

    if (!card) {
      return;
    }

    const valueElement = card.querySelector(".stats-card-value");
    const descriptionElement = card.querySelector(".stats-card-description");

    if (valueElement) {
      valueElement.textContent = value;
    }

    if (descriptionElement) {
      descriptionElement.textContent = description;
    }
  }

  function renderWorkouts(workouts, totalWorkoutCount) {
    if (!totalWorkoutCount) {
      workoutList.innerHTML = createEmptyState({
        title: "Nenhum treino cadastrado ainda.",
        description:
          "Crie seu primeiro treino para começar a organizar sua rotina.",
        actionHref: "./workout-form.html",
        actionLabel: "Criar treino",
      });

      return;
    }

    if (!workouts.length) {
      workoutList.innerHTML = createEmptyState({
        title: "Nenhum treino encontrado.",
        description: "Ajuste a busca para encontrar um treino cadastrado.",
        actionHref: "./workouts.html",
        actionLabel: "Limpar busca",
      });

      return;
    }

    workoutList.innerHTML = workouts.map(createWorkoutCard).join("");

    setupWorkoutActions();
  }

  function createWorkoutCard(workout) {
    const exercisesCount = Array.isArray(workout.exercises)
      ? workout.exercises.length
      : 0;

    const detailsHref = `./workout-detail.html?id=${encodeURIComponent(
      workout.id,
    )}`;

    const sessionHref = `./workout-session.html?id=${encodeURIComponent(
      workout.id,
    )}`;

    const editHref = `./workout-form.html?id=${encodeURIComponent(workout.id)}`;
    const description = String(workout.description || "").trim();

    return `
      <article class="workout-card" data-workout-id="${escapeHTML(workout.id)}">
        <div class="workout-card-header">
          <div>
            <h3 class="workout-card-title">
              ${escapeHTML(workout.name || "Treino sem nome")}
            </h3>

            ${description
              ? `<p class="workout-card-description">${escapeHTML(description)}</p>`
              : ""}
          </div>

          <span class="badge badge-info">Cadastrado</span>
        </div>

        <div class="workout-card-meta">
          <span class="workout-meta-pill">
            <i class="bi bi-bullseye" aria-hidden="true"></i>
            ${escapeHTML(workout.goalLabel || "Objetivo não definido")}
          </span>

          <span class="workout-meta-pill">
            <i class="bi bi-calendar-week" aria-hidden="true"></i>
            ${escapeHTML(workout.frequencyLabel || "Frequência não definida")}
          </span>

          <span class="workout-meta-pill">
            <i class="bi bi-bar-chart" aria-hidden="true"></i>
            ${escapeHTML(workout.levelLabel || "Nível não definido")}
          </span>

          <span class="workout-meta-pill">
            <i class="bi bi-list-check" aria-hidden="true"></i>
            ${exercisesCount} exercício${exercisesCount === 1 ? "" : "s"}
          </span>
        </div>

        <div class="workout-card-actions">
          <a class="btn btn-outline" href="${editHref}">
            <i class="bi bi-pencil-square" aria-hidden="true"></i>
            Editar
          </a>

          <button
            class="btn btn-outline"
            type="button"
            data-delete-workout="${escapeHTML(workout.id)}"
          >
            <i class="bi bi-trash" aria-hidden="true"></i>
            Excluir
          </button>

          <a class="btn btn-outline" href="${detailsHref}">
            Detalhes
          </a>

          <a class="btn btn-primary" href="${sessionHref}">
            <i class="bi bi-play-fill" aria-hidden="true"></i>
            Iniciar
          </a>
        </div>
      </article>
    `;
  }

  function renderHistory() {
    if (!historyTableBody) {
      return;
    }

    const sessions = storage.getStoredSessions();

    updateHistoryClearButton();

    if (!sessions.length) {
      updateHistoryNavigation({
        filteredCount: 0,
        visibleCount: 0,
        totalCount: 0,
        hasActiveFilters: false,
      });
      renderHistoryEmptyRow("Nenhum registro de treino encontrado.");
      return;
    }

    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = new Date(a.finishedAt || 0).getTime();
      const dateB = new Date(b.finishedAt || 0).getTime();

      return dateB - dateA;
    });

    const filteredSessions = filterHistorySessions(sortedSessions);
    const hasActiveFilters = hasHistoryFilters();
    const visibleSessions = hasActiveFilters || isShowingFullHistory
      ? filteredSessions
      : filteredSessions.slice(0, recentHistoryLimit);

    updateHistoryNavigation({
      filteredCount: filteredSessions.length,
      visibleCount: visibleSessions.length,
      totalCount: sessions.length,
      hasActiveFilters,
    });

    if (!visibleSessions.length) {
      renderHistoryEmptyRow("Nenhuma sessão encontrada para esses filtros.");
      return;
    }

    historyTableBody.innerHTML = visibleSessions
      .map((session) => {
        const detailHref = `./workout-session-detail.html?id=${encodeURIComponent(
          session.id,
        )}`;
        const status = getSessionStatus(session);

        return `
        <tr>
          <td>${escapeHTML(session.workoutName || "Treino cadastrado")}</td>
          <td>${escapeHTML(formatDate(session.finishedAt))}</td>
          <td>${escapeHTML(storage.formatDuration(session.durationSeconds))}</td>
          <td>
            <span class="badge ${status.badgeClass}">${escapeHTML(status.label)}</span>
          </td>
          <td>${escapeHTML(formatHistoryXp(session.xp))}</td>
          <td class="history-actions-cell">
            <div class="history-actions">
              <a class="btn btn-outline btn-sm" href="${detailHref}">
                <i class="bi bi-eye" aria-hidden="true"></i>
                Ver detalhes
              </a>

              <button
                class="btn btn-outline btn-sm"
                type="button"
                data-delete-session="${escapeHTML(session.id)}"
              >
                <i class="bi bi-trash" aria-hidden="true"></i>
                Remover
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");

    setupHistoryActions();
  }

  function updateHistoryNavigation({
    filteredCount,
    visibleCount,
    totalCount,
    hasActiveFilters,
  }) {
    const hasMoreHistory = filteredCount > recentHistoryLimit;
    const hiddenCount = Math.max(filteredCount - visibleCount, 0);

    if (historySummary) {
      historySummary.textContent = "";
      historySummary.hidden = true;
    }

    if (historyNavigation) {
      historyNavigation.hidden = hasActiveFilters || !hasMoreHistory;
    }

    if (historyNavigationLabel) {
      historyNavigationLabel.textContent = isShowingFullHistory
        ? "Histórico completo."
        : `${hiddenCount} sessão${
            hiddenCount === 1 ? "" : "ões"
          } anterior${hiddenCount === 1 ? "" : "es"}.`;
    }

    if (historyToggleFullButton) {
      historyToggleFullButton.textContent = isShowingFullHistory
        ? "Mostrar recentes"
        : "Ver mais";
    }
  }

  function filterHistorySessions(sessions) {
    const query = historySearchInput
      ? historySearchInput.value.trim().toLowerCase()
      : "";
    const periodValue = historyPeriodSelect ? historyPeriodSelect.value : "all";
    const periodDays = periodValue === "all" ? 0 : Number(periodValue);
    const now = Date.now();

    return sessions.filter((session) => {
      const matchesQuery = !query
        ? true
        : String(session.workoutName || "Treino cadastrado")
            .toLowerCase()
            .includes(query);

      if (!matchesQuery) {
        return false;
      }

      if (!periodDays) {
        return true;
      }

      const finishedAt = new Date(session.finishedAt || 0).getTime();

      if (Number.isNaN(finishedAt)) {
        return false;
      }

      const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

      return finishedAt >= periodStart && finishedAt <= now;
    });
  }

  function hasHistoryFilters() {
    const query = historySearchInput ? historySearchInput.value.trim() : "";
    const periodValue = historyPeriodSelect ? historyPeriodSelect.value : "all";

    return Boolean(query) || periodValue !== "all";
  }

  function renderHistoryEmptyRow(message) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="6">${escapeHTML(message)}</td>
      </tr>
    `;
  }

  function updateHistoryClearButton() {
    if (!historyClearButton) {
      return;
    }

    historyClearButton.disabled = !hasHistoryFilters();
  }

  function getSessionStatus(session) {
    const completedSets = Number(session.completedSets || 0);
    const totalSets = Number(session.totalSets || 0);

    if (!totalSets) {
      return {
        badgeClass: "badge-info",
        label: "Sem dados",
      };
    }

    if (completedSets >= totalSets) {
      return {
        badgeClass: "badge-success",
        label: "Concluído",
      };
    }

    if (completedSets > 0) {
      return {
        badgeClass: "badge-warning",
        label: "Parcial",
      };
    }

    return {
      badgeClass: "badge-danger",
      label: "Não executado",
    };
  }

  function setupHistoryActions() {
    document.querySelectorAll("[data-delete-session]").forEach((button) => {
      button.addEventListener("click", async () => {
        const sessionId = button.getAttribute("data-delete-session");

        if (!sessionId) {
          return;
        }

        let shouldDelete = true;

        if (typeof window.showBtConfirmDialog === "function") {
          shouldDelete = await window.showBtConfirmDialog({
            title: "Remover histórico?",
            message:
              "Essa ação vai remover o registro desta sessão concluída do histórico.",
            confirmLabel: "Remover histórico",
            cancelLabel: "Cancelar",
            variant: "danger",
            icon: "trash",
          });
        }

        if (!shouldDelete) {
          return;
        }

        if (typeof storage.deleteSession !== "function") {
          safeShowToast({
            title: "Ação indisponível",
            message: "A função para remover histórico não foi encontrada.",
            type: "warning",
          });

          return;
        }

        const deleted = storage.deleteSession(sessionId);

        if (!deleted) {
          safeShowToast({
            title: "Histórico não encontrado",
            message: "Não foi possível localizar essa sessão no histórico.",
            type: "warning",
          });

          return;
        }

        safeShowToast({
          title: "Histórico removido",
          message: "A sessão foi removida do histórico.",
          type: "success",
        });

        renderPage();
      });
    });
  }

  function setupWorkoutActions() {
    setupWorkoutDeletion();
  }

  function setupWorkoutDeletion() {
    document.querySelectorAll("[data-delete-workout]").forEach((button) => {
      button.addEventListener("click", async () => {
        const workoutId = button.getAttribute("data-delete-workout");

        if (!workoutId) {
          return;
        }

        const workout = storage
          .getStoredWorkouts()
          .find((item) => String(item.id) === String(workoutId));

        if (!workout) {
          safeShowToast({
            title: "Treino não encontrado",
            message: "Não foi possível localizar esse treino.",
            type: "warning",
          });

          return;
        }

        if (typeof window.showBtConfirmDialog !== "function") {
          safeShowToast({
            title: "Confirmação indisponível",
            message: "Não foi possível abrir a confirmação. Tente novamente.",
            type: "warning",
          });

          return;
        }

        const shouldDelete = await window.showBtConfirmDialog({
          title: "Excluir treino?",
          message: `Essa ação vai remover "${workout.name || "este treino"}" da sua rotina.`,
          confirmLabel: "Excluir treino",
          cancelLabel: "Cancelar",
          variant: "danger",
          icon: "trash",
        });

        if (!shouldDelete) {
          return;
        }

        storage.deleteWorkout(workoutId);

        safeShowToast({
          title: "Treino excluído",
          message: "O treino foi removido da sua rotina.",
          type: "success",
        });

        renderPage();
      });
    });
  }

  function setupFloatingActionButton() {
    if (!floatingActionButton) {
      return;
    }

    floatingActionButton.addEventListener("click", () => {
      window.location.href = "./workout-form.html";
    });
  }

  function setupSearch() {
    if (!searchInput) {
      return;
    }

    searchInput.addEventListener("input", renderPage);
  }

  function setupHistoryFilters() {
    if (historySearchInput) {
      historySearchInput.addEventListener("input", renderHistory);
    }

    if (historyPeriodSelect) {
      historyPeriodSelect.addEventListener("change", renderHistory);
    }

    if (historyClearButton) {
      historyClearButton.addEventListener("click", () => {
        if (historySearchInput) {
          historySearchInput.value = "";
        }

        if (historyPeriodSelect) {
          historyPeriodSelect.value = "all";
          syncSelectLabel("historyPeriod");
        }

        isShowingFullHistory = false;
        renderHistory();
      });
    }

    if (historyToggleFullButton) {
      historyToggleFullButton.addEventListener("click", () => {
        isShowingFullHistory = !isShowingFullHistory;
        renderHistory();
      });
    }
  }

  function setupWorkoutFilters() {
    if (workoutFilterToggle) {
      workoutFilterToggle.addEventListener("click", () => {
        if (!workoutFilterPanel) {
          return;
        }

        workoutFilterPanel.hidden = !workoutFilterPanel.hidden;
      });
    }

    [workoutGoalFilter, workoutLevelFilter, workoutFrequencyFilter].forEach(
      (filter) => {
        if (filter) {
          filter.addEventListener("change", renderPage);
        }
      },
    );

    if (workoutFilterClearButton) {
      workoutFilterClearButton.addEventListener("click", () => {
        if (workoutGoalFilter) workoutGoalFilter.value = "all";
        if (workoutLevelFilter) workoutLevelFilter.value = "all";
        if (workoutFrequencyFilter) workoutFrequencyFilter.value = "all";
        syncSelectLabel("workoutGoalFilter");
        syncSelectLabel("workoutLevelFilter");
        syncSelectLabel("workoutFrequencyFilter");
        renderPage();
      });
    }
  }

  function matchesWorkoutFilters(workout) {
    if (workoutGoalFilter && workoutGoalFilter.value !== "all") {
      if (workout.goal !== workoutGoalFilter.value) {
        return false;
      }
    }

    if (workoutLevelFilter && workoutLevelFilter.value !== "all") {
      if (workout.level !== workoutLevelFilter.value) {
        return false;
      }
    }

    if (workoutFrequencyFilter && workoutFrequencyFilter.value !== "all") {
      if (workout.frequency !== workoutFrequencyFilter.value) {
        return false;
      }
    }

    return true;
  }

  function updateWorkoutFilterControls() {
    if (!workoutFilterClearButton) {
      return;
    }

    const hasActiveFilters = Boolean(
      (workoutGoalFilter && workoutGoalFilter.value !== "all") ||
        (workoutLevelFilter && workoutLevelFilter.value !== "all") ||
        (workoutFrequencyFilter && workoutFrequencyFilter.value !== "all"),
    );

    workoutFilterClearButton.disabled = !hasActiveFilters;
  }

  function setupCustomSelects() {
    const customSelects = document.querySelectorAll("[data-custom-select-for]");

    customSelects.forEach((customSelect) => {
      const selectId = customSelect.getAttribute("data-custom-select-for");
      const nativeSelect = document.getElementById(selectId);
      const button = customSelect.querySelector(".bt-select-button");
      const label = customSelect.querySelector("[data-selected-label]");
      const options = customSelect.querySelectorAll("[data-value]");

      if (!nativeSelect || !button || !label) {
        return;
      }

      button.setAttribute("aria-expanded", "false");
      syncCustomSelect(nativeSelect, customSelect);

      button.addEventListener("click", () => {
        const shouldOpen = !customSelect.classList.contains("is-open");

        closeCustomSelects(customSelect);
        customSelect.classList.toggle("is-open", shouldOpen);
        button.setAttribute("aria-expanded", String(shouldOpen));
      });

      options.forEach((option) => {
        option.addEventListener("click", () => {
          const value = option.getAttribute("data-value");

          nativeSelect.value = value;
          syncCustomSelect(nativeSelect, customSelect);
          closeCustomSelects();
          nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });

      nativeSelect.addEventListener("change", () => {
        syncCustomSelect(nativeSelect, customSelect);
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".bt-select")) {
        closeCustomSelects();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCustomSelects();
      }
    });
  }

  function syncCustomSelect(nativeSelect, customSelect) {
    const label = customSelect.querySelector("[data-selected-label]");
    const options = customSelect.querySelectorAll("[data-value]");
    const selectedOption = Array.from(options).find(
      (option) => option.getAttribute("data-value") === nativeSelect.value,
    );

    options.forEach((option) => {
      option.classList.toggle("is-selected", option === selectedOption);
    });

    if (label && selectedOption) {
      label.textContent = selectedOption.textContent.trim();
    }
  }

  function syncSelectLabel(selectId) {
    const nativeSelect = document.getElementById(selectId);
    const customSelect = document.querySelector(
      `[data-custom-select-for="${selectId}"]`,
    );

    if (nativeSelect && customSelect) {
      syncCustomSelect(nativeSelect, customSelect);
    }
  }

  function closeCustomSelects(exceptSelect = null) {
    document.querySelectorAll(".bt-select.is-open").forEach((customSelect) => {
      if (customSelect === exceptSelect) {
        return;
      }

      customSelect.classList.remove("is-open");
      customSelect
        .querySelector(".bt-select-button")
        ?.setAttribute("aria-expanded", "false");
    });
  }

  function safeShowToast({ title, message, type }) {
    if (typeof window.showToast === "function") {
      window.showToast({ title, message, type });
    }
  }

  function formatDate(value) {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    return date.toLocaleDateString("pt-BR");
  }

  function formatHistoryXp(value) {
    const number = Number(value || 0);

    if (!Number.isFinite(number) || number <= 0) {
      return "0 XP";
    }

    return `${Math.round(number)} XP`;
  }

  function createEmptyState({ title, description, actionHref, actionLabel }) {
    return `
      <article class="content-card empty-state">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Estado vazio</span>

            <h3 class="content-card-title mt-md">${escapeHTML(title)}</h3>

            <p class="content-card-description mt-sm">
              ${escapeHTML(description)}
            </p>
          </div>
        </div>

        ${
          actionHref && actionLabel
            ? `<div class="content-card-footer">
                <a class="btn btn-primary" href="${actionHref}">${escapeHTML(actionLabel)}</a>
              </div>`
            : ""
        }
      </article>
    `;
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
