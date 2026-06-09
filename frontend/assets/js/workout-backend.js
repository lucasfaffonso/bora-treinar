/* =========================================================
   Workout backend bridge
   ========================================================= */

(function (window, document) {
  "use strict";

  const storage = window.BoraTreinarStorage;

  const labels = {
    goals: {
      hypertrophy: "Hipertrofia",
      strength: "Força",
      conditioning: "Condicionamento",
      "weight-loss": "Emagrecimento",
      mobility: "Mobilidade",
    },
    levels: {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    },
    frequencies: {
      1: "1x por semana",
      2: "2x por semana",
      3: "3x por semana",
      4: "4x por semana",
      5: "5x por semana",
      6: "6x por semana",
      7: "7x por semana",
    },
  };

  function initWorkoutBackendBridge() {
    const page = document.body?.dataset?.page;

    if (!page || !window.apiGet || !window.apiPost || !window.apiPut || !window.apiDelete) {
      return;
    }

    if (page === "workouts") {
      initWorkoutsPage();
      return;
    }

    if (page === "workout-form") {
      initWorkoutFormPage();
      return;
    }

    if (page === "workout-detail") {
      initWorkoutDetailPage();
    }
  }

  /* =========================================================
     API
     ========================================================= */

  async function fetchWorkouts() {
    const response = await window.apiGet("/workouts");
    const workouts = normalizeWorkoutList(unwrapApiData(response));

    cacheWorkouts(workouts);

    return workouts;
  }

  async function fetchWorkout(workoutId) {
    const response = await window.apiGet(`/workouts/${encodeURIComponent(workoutId)}`);
    const workout = normalizeWorkout(unwrapApiData(response));

    if (workout) {
      cacheWorkout(workout);
    }

    return workout;
  }

  async function createWorkout(payload) {
    const response = await window.apiPost("/workouts", payload);
    const workout = normalizeWorkout(unwrapApiData(response));

    if (workout) {
      cacheWorkout(workout);
    }

    return workout;
  }

  async function updateWorkout(workoutId, payload) {
    const response = await window.apiPut(`/workouts/${encodeURIComponent(workoutId)}`, payload);
    const workout = normalizeWorkout(unwrapApiData(response));

    if (workout) {
      cacheWorkout(workout);
    }

    return workout;
  }

  async function deleteWorkout(workoutId) {
    await window.apiDelete(`/workouts/${encodeURIComponent(workoutId)}`);

    if (storage?.deleteWorkout) {
      storage.deleteWorkout(workoutId);
    }
  }

  function unwrapApiData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
  }

  /* =========================================================
     NORMALIZATION
     ========================================================= */

  function normalizeWorkoutList(value) {
    return Array.isArray(value) ? value.map(normalizeWorkout).filter(Boolean) : [];
  }

  function normalizeWorkout(workout) {
    if (!workout || typeof workout !== "object") {
      return null;
    }

    const frequency = String(workout.weeklyFrequency ?? workout.frequency ?? "").trim();
    const goal = String(workout.goal || "").trim();
    const level = String(workout.level || "").trim();

    return {
      id: String(workout.id || ""),
      name: String(workout.name || "").trim(),
      description: String(workout.description || "").trim(),
      goal,
      goalLabel: labels.goals[goal] || workout.goalLabel || goal || "Não definido",
      level,
      levelLabel: labels.levels[level] || workout.levelLabel || level || "Não definido",
      frequency,
      frequencyLabel:
        labels.frequencies[frequency] ||
        workout.frequencyLabel ||
        (frequency ? `${frequency}x por semana` : "Não definida"),
      status: workout.active === false ? "INACTIVE" : workout.status || "ACTIVE",
      progress: Number(workout.progress || 0),
      createdAt: workout.createdAt || new Date().toISOString(),
      updatedAt: workout.updatedAt || workout.createdAt || new Date().toISOString(),
      exercises: Array.isArray(workout.exercises)
        ? workout.exercises.map(normalizeExercise).filter(Boolean)
        : [],
    };
  }

  function normalizeExercise(exercise, index) {
    if (!exercise || typeof exercise !== "object") {
      return null;
    }

    const order = Number(exercise.exerciseOrder ?? exercise.order ?? index + 1);
    const restSeconds = parseRestSeconds(exercise.restSeconds ?? exercise.rest);

    return {
      id: exercise.id ? String(exercise.id) : "",
      order: Number.isFinite(order) && order > 0 ? order : index + 1,
      libraryExerciseId: String(exercise.libraryExerciseId || ""),
      name: String(exercise.exerciseName || exercise.name || "").trim(),
      muscleGroup: String(exercise.muscleGroup || "").trim(),
      equipment: String(exercise.equipment || "").trim(),
      notes: String(exercise.notes || "").trim(),
      sets: Number(exercise.sets || 0),
      reps: String(exercise.reps || "").trim(),
      rest: restSeconds ? String(restSeconds) : "",
      restSeconds,
    };
  }

  function toBackendPayload(workout) {
    return {
      name: workout.name,
      description: workout.description || null,
      goal: workout.goal,
      level: workout.level,
      weeklyFrequency: Number(workout.frequency),
      exercises: workout.exercises.map((exercise, index) => ({
        exerciseName: exercise.name,
        exerciseOrder: index + 1,
        sets: Number(exercise.sets),
        reps: String(exercise.reps || "").trim(),
        restSeconds: parseRestSeconds(exercise.restSeconds || exercise.rest),
        notes: exercise.notes || null,
      })),
    };
  }

  function parseRestSeconds(value) {
    if (storage?.parseRestSeconds) {
      return storage.parseRestSeconds(value);
    }

    if (typeof value === "number") {
      return Math.max(0, Math.round(value));
    }

    const number = Number.parseInt(String(value || ""), 10);

    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function cacheWorkouts(workouts) {
    if (storage?.saveStoredWorkouts) {
      storage.saveStoredWorkouts(workouts);
    }
  }

  function cacheWorkout(workout) {
    if (!workout || !storage?.getStoredWorkouts || !storage?.saveStoredWorkouts) {
      return;
    }

    const workouts = storage.getStoredWorkouts();
    const index = workouts.findIndex((item) => String(item.id) === String(workout.id));

    if (index >= 0) {
      workouts[index] = workout;
    } else {
      workouts.unshift(workout);
    }

    storage.saveStoredWorkouts(workouts);
  }

  /* =========================================================
     WORKOUTS LIST PAGE
     ========================================================= */

  function initWorkoutsPage() {
    const workoutList = document.querySelector("[data-workout-list]");
    const searchInput = document.querySelector("[data-workout-search]");
    const goalFilter = document.querySelector("[data-workout-filter-goal]");
    const levelFilter = document.querySelector("[data-workout-filter-level]");
    const frequencyFilter = document.querySelector("[data-workout-filter-frequency]");
    const clearButton = document.querySelector("[data-workout-filter-clear]");

    if (!workoutList) {
      return;
    }

    let cachedWorkouts = [];

    renderLoading(workoutList, "Carregando treinos...");

    fetchWorkouts()
      .then((workouts) => {
        cachedWorkouts = workouts;
        renderWorkoutsPage(cachedWorkouts);
      })
      .catch(() => {
        renderApiError(workoutList, "Não foi possível carregar seus treinos.");
      });

    [searchInput, goalFilter, levelFilter, frequencyFilter].forEach((field) => {
      field?.addEventListener("input", () => renderWorkoutsPage(cachedWorkouts));
      field?.addEventListener("change", () => renderWorkoutsPage(cachedWorkouts));
    });

    clearButton?.addEventListener("click", () => {
      [goalFilter, levelFilter, frequencyFilter].forEach((field) => {
        if (field) field.value = "all";
      });

      renderWorkoutsPage(cachedWorkouts);
    });
  }

  function renderWorkoutsPage(workouts) {
    const workoutList = document.querySelector("[data-workout-list]");

    if (!workoutList) {
      return;
    }

    const filteredWorkouts = filterWorkouts(workouts);

    updateStats(workouts);

    if (!workouts.length) {
      workoutList.innerHTML = createEmptyState({
        title: "Nenhum treino cadastrado ainda.",
        description: "Crie seu primeiro treino para começar a organizar sua rotina.",
        actionHref: "./workout-form.html",
        actionLabel: "Criar treino",
      });
      return;
    }

    if (!filteredWorkouts.length) {
      workoutList.innerHTML = createEmptyState({
        title: "Nenhum treino encontrado.",
        description: "Ajuste a busca ou limpe os filtros para encontrar seu treino.",
        actionHref: "./workouts.html",
        actionLabel: "Limpar busca",
      });
      return;
    }

    workoutList.innerHTML = filteredWorkouts.map(createWorkoutCard).join("");
    setupBackendDeleteActions();
  }

  function filterWorkouts(workouts) {
    const searchInput = document.querySelector("[data-workout-search]");
    const goalFilter = document.querySelector("[data-workout-filter-goal]");
    const levelFilter = document.querySelector("[data-workout-filter-level]");
    const frequencyFilter = document.querySelector("[data-workout-filter-frequency]");

    const query = String(searchInput?.value || "").trim().toLowerCase();
    const selectedGoal = getActiveFilterValue(goalFilter);
    const selectedLevel = getActiveFilterValue(levelFilter);
    const selectedFrequency = getActiveFilterValue(frequencyFilter);

    return workouts.filter((workout) => {
      const searchable = [
        workout.name,
        workout.description,
        workout.goalLabel,
        workout.levelLabel,
        workout.frequencyLabel,
      ]
        .join(" ")
        .toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (selectedGoal && workout.goal !== selectedGoal) return false;
      if (selectedLevel && workout.level !== selectedLevel) return false;
      if (selectedFrequency && String(workout.frequency) !== selectedFrequency) return false;

      return true;
    });
  }

  function getActiveFilterValue(field) {
    const value = String(field?.value || "").trim();

    return value === "all" ? "" : value;
  }

  function updateStats(workouts) {
    const statsCards = document.querySelectorAll(".stats-card");
    const sessions = storage?.getStoredSessions ? storage.getStoredSessions() : [];

    setStatsCard(statsCards[0], String(workouts.length), "Treinos cadastrados");
    setStatsCard(statsCards[1], String(sessions.length), "Sessões registradas");
    setStatsCard(statsCards[2], "0", "Sessões nesta semana");
    setStatsCard(statsCards[3], "00:00", "Média registrada");
  }

  function setStatsCard(card, value, description) {
    if (!card) return;

    const valueElement = card.querySelector(".stats-card-value");
    const descriptionElement = card.querySelector(".stats-card-description");

    if (valueElement) valueElement.textContent = value;
    if (descriptionElement) descriptionElement.textContent = description;
  }

  function createWorkoutCard(workout) {
    const exercisesCount = Array.isArray(workout.exercises) ? workout.exercises.length : 0;
    const detailHref = `./workout-detail.html?id=${encodeURIComponent(workout.id)}`;
    const editHref = `./workout-form.html?id=${encodeURIComponent(workout.id)}`;
    const sessionHref = `./workout-session.html?id=${encodeURIComponent(workout.id)}`;

    return `
      <article class="workout-card" data-workout-id="${escapeHTML(workout.id)}">
        <div class="workout-card-header">
          <div>
            <h3 class="workout-card-title">${escapeHTML(workout.name || "Treino sem nome")}</h3>
            <p class="workout-card-description">${escapeHTML(workout.description || "Treino cadastrado na sua rotina.")}</p>
          </div>
          <span class="badge badge-info">Ativo</span>
        </div>

        <div class="workout-card-meta">
          <span class="workout-meta-pill"><i class="bi bi-bullseye" aria-hidden="true"></i>${escapeHTML(workout.goalLabel)}</span>
          <span class="workout-meta-pill"><i class="bi bi-calendar-week" aria-hidden="true"></i>${escapeHTML(workout.frequencyLabel)}</span>
          <span class="workout-meta-pill"><i class="bi bi-bar-chart" aria-hidden="true"></i>${escapeHTML(workout.levelLabel)}</span>
          <span class="workout-meta-pill"><i class="bi bi-list-check" aria-hidden="true"></i>${exercisesCount} exercício${exercisesCount === 1 ? "" : "s"}</span>
        </div>

        <div class="workout-card-actions">
          <a class="btn btn-outline" href="${editHref}"><i class="bi bi-pencil-square" aria-hidden="true"></i>Editar</a>
          <button class="btn btn-outline" type="button" data-backend-delete-workout="${escapeHTML(workout.id)}"><i class="bi bi-trash" aria-hidden="true"></i>Excluir</button>
          <a class="btn btn-outline" href="${detailHref}">Detalhes</a>
          <a class="btn btn-primary" href="${sessionHref}"><i class="bi bi-play-fill" aria-hidden="true"></i>Iniciar</a>
        </div>
      </article>
    `;
  }

  function setupBackendDeleteActions() {
    document.querySelectorAll("[data-backend-delete-workout]").forEach((button) => {
      button.addEventListener("click", async () => {
        const workoutId = button.getAttribute("data-backend-delete-workout");

        if (!workoutId) return;

        const shouldDelete = typeof window.showBtConfirmDialog === "function"
          ? await window.showBtConfirmDialog({
              title: "Excluir treino?",
              message: "Essa ação vai remover o treino cadastrado.",
              confirmLabel: "Excluir treino",
              cancelLabel: "Cancelar",
              variant: "danger",
              icon: "trash",
            })
          : true;

        if (!shouldDelete) return;

        button.disabled = true;

        try {
          await deleteWorkout(workoutId);
          await initWorkoutsPage();
          window.showToast?.({
            title: "Treino excluído",
            message: "O treino foi removido com sucesso.",
            type: "success",
          });
        } catch {
          button.disabled = false;
          window.showToast?.({
            title: "Erro ao excluir",
            message: "Não foi possível remover o treino. Tente novamente.",
            type: "danger",
          });
        }
      });
    });
  }

  /* =========================================================
     FORM PAGE
     ========================================================= */

  function initWorkoutFormPage() {
    const form = document.querySelector("#workoutForm");
    const params = new URLSearchParams(window.location.search);
    const workoutId = params.get("id");

    if (!form) return;

    if (workoutId) {
      fetchWorkout(workoutId)
        .then((workout) => {
          if (!workout) return;
          fillWorkoutForm(workout);
        })
        .catch(() => {
          window.showToast?.({
            title: "Erro ao carregar treino",
            message: "Não foi possível carregar o treino selecionado. Tente novamente.",
            type: "danger",
          });
        });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const submitButton = form.querySelector("button[type='submit']");
      const payload = toBackendPayload(collectWorkoutFormData(form));

      submitButton.disabled = true;

      try {
        if (workoutId) {
          await updateWorkout(workoutId, payload);
        } else {
          await createWorkout(payload);
        }

        window.showToast?.({
          title: workoutId ? "Treino atualizado" : "Treino criado",
          message: workoutId
            ? "As alterações foram salvas com sucesso."
            : "Seu treino foi cadastrado com sucesso.",
          type: "success",
        });

        window.location.href = "./workouts.html";
      } catch {
        submitButton.disabled = false;
        window.showToast?.({
          title: "Erro ao salvar treino",
          message: "Não foi possível salvar o treino. Revise as informações e tente novamente.",
          type: "danger",
        });
      }
    });
  }

  function collectWorkoutFormData(form) {
    const exercises = Array.from(form.querySelectorAll("[data-exercise-item]")).map((item) => ({
      name: item.querySelector("[data-exercise-name]")?.value.trim() || "",
      sets: item.querySelector("[data-exercise-sets]")?.value || "0",
      reps: item.querySelector("[data-exercise-reps]")?.value.trim() || "",
      rest: item.querySelector("[data-exercise-rest]")?.value || "0",
      notes: item.querySelector("[data-exercise-notes]")?.value.trim() || "",
    }));

    return {
      name: form.querySelector("#workoutName")?.value.trim() || "",
      description: form.querySelector("#workoutDescription")?.value.trim() || "",
      goal: form.querySelector("#workoutGoal")?.value || "",
      level: form.querySelector("#workoutLevel")?.value || "",
      frequency: form.querySelector("#workoutFrequency")?.value || "",
      exercises,
    };
  }

  function fillWorkoutForm(workout) {
    const setValue = (selector, value) => {
      const field = document.querySelector(selector);
      if (field) field.value = value || "";
    };

    setValue("#workoutName", workout.name);
    setValue("#workoutDescription", workout.description);
    setValue("#workoutGoal", workout.goal);
    setValue("#workoutLevel", workout.level);
    setValue("#workoutFrequency", workout.frequency);
  }

  /* =========================================================
     DETAIL PAGE
     ========================================================= */

  function initWorkoutDetailPage() {
    const params = new URLSearchParams(window.location.search);
    const workoutId = params.get("id");
    const container = document.querySelector(".page-content");

    if (!workoutId || !container) return;

    renderLoading(container, "Carregando treino...");

    fetchWorkout(workoutId)
      .then((workout) => {
        if (!workout) {
          renderApiError(container, "Treino não encontrado.");
          return;
        }

        renderWorkoutDetail(container, workout);
      })
      .catch(() => {
        renderApiError(container, "Não foi possível carregar este treino.");
      });
  }

  function renderWorkoutDetail(container, workout) {
    const sessionHref = `./workout-session.html?id=${encodeURIComponent(workout.id)}`;

    container.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">${escapeHTML(workout.name || "Treino")}</h2>
          <p class="page-description">${escapeHTML(workout.description || "Treino cadastrado na sua rotina.")}</p>
        </div>

        <div class="filter-actions">
          <a class="btn btn-outline" href="./workouts.html">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Voltar
          </a>

          <a class="btn btn-primary" href="${sessionHref}">
            <i class="bi bi-play-fill" aria-hidden="true"></i>
            Iniciar treino
          </a>
        </div>
      </section>

      <section class="workout-detail-header">
        <article class="content-card">
          <div class="content-card-header">
            <div>
              <span class="badge badge-info">Ativo</span>
              <h3 class="content-card-title mt-md">Resumo do treino</h3>
              <p class="content-card-description mt-sm">Organização e exercícios cadastrados.</p>
            </div>
          </div>

          <div class="content-card-body">
            <div class="workout-card-meta">
              <span class="workout-meta-pill"><i class="bi bi-bullseye" aria-hidden="true"></i>${escapeHTML(workout.goalLabel)}</span>
              <span class="workout-meta-pill"><i class="bi bi-calendar-week" aria-hidden="true"></i>${escapeHTML(workout.frequencyLabel)}</span>
              <span class="workout-meta-pill"><i class="bi bi-bar-chart" aria-hidden="true"></i>${escapeHTML(workout.levelLabel)}</span>
            </div>
          </div>
        </article>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">Exercícios</h2>
            <p class="page-description">Veja a ordem de execução desta rotina.</p>
          </div>
        </div>

        <div class="workout-exercise-list">
          ${workout.exercises.length ? workout.exercises.map(createExerciseItem).join("") : createEmptyState({
            title: "Nenhum exercício cadastrado.",
            description: "Edite o treino para adicionar exercícios.",
            actionHref: `./workout-form.html?id=${encodeURIComponent(workout.id)}`,
            actionLabel: "Editar treino",
          })}
        </div>
      </section>
    `;
  }

  function createExerciseItem(exercise, index) {
    return `
      <article class="workout-exercise-item">
        <span class="workout-exercise-order">${index + 1}</span>
        <div>
          <h3 class="card-title">${escapeHTML(exercise.name || "Exercício")}</h3>
          <p class="card-description">${escapeHTML(exercise.notes || "Exercício cadastrado nesta rotina.")}</p>
        </div>
        <div class="workout-card-meta">
          <span class="workout-meta-pill">${exercise.sets} séries</span>
          <span class="workout-meta-pill">${escapeHTML(exercise.reps || "reps")}</span>
          <span class="workout-meta-pill">${exercise.restSeconds}s descanso</span>
        </div>
      </article>
    `;
  }

  /* =========================================================
     UI HELPERS
     ========================================================= */

  function renderLoading(container, message) {
    container.innerHTML = `
      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Carregando</span>
            <h3 class="content-card-title mt-md">${escapeHTML(message)}</h3>
          </div>
        </div>
      </article>
    `;
  }

  function renderApiError(container, fallbackMessage) {
    container.innerHTML = createEmptyState({
      title: fallbackMessage,
      description: "Tente novamente em alguns instantes.",
      actionHref: "./workouts.html",
      actionLabel: "Voltar para treinos",
    });
  }

  function createEmptyState({ title, description, actionHref, actionLabel }) {
    return `
      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Treinos</span>
            <h3 class="content-card-title mt-md">${escapeHTML(title)}</h3>
            <p class="content-card-description mt-sm">${escapeHTML(description)}</p>
          </div>

          ${actionHref && actionLabel ? `<a class="btn btn-primary" href="${actionHref}">${escapeHTML(actionLabel)}</a>` : ""}
        </div>
      </article>
    `;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkoutBackendBridge);
  } else {
    initWorkoutBackendBridge();
  }
})(window, document);
