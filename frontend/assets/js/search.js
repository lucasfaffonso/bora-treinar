/* =========================================================
   Local search
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const input = document.querySelector("[data-local-search-input]");
  const summary = document.querySelector("[data-local-search-summary]");
  const resultsList = document.querySelector("[data-local-search-results]");

  if (!storage || !input || !summary || !resultsList) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";

  input.value = initialQuery;
  renderResults(initialQuery);

  input.addEventListener("input", () => {
    renderResults(input.value);
  });

  function renderResults(query) {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      summary.textContent = "Digite algo para pesquisar.";
      resultsList.innerHTML = createEmptyState(
        "Nenhuma busca realizada.",
        "Use o campo acima para consultar dados cadastrados.",
      );
      return;
    }

    const results = getSearchResults(normalizedQuery);

    summary.textContent = `${results.length} resultado${
      results.length === 1 ? "" : "s"
    } encontrado${results.length === 1 ? "" : "s"}.`;

    resultsList.innerHTML = results.length
      ? results.map(renderResult).join("")
      : createEmptyState(
          "Nenhum resultado encontrado.",
          "Tente buscar pelo nome do treino, exercício, objetivo ou sessão.",
        );
  }

  function getSearchResults(query) {
    return [
      ...getWorkoutResults(query),
      ...getExerciseResults(query),
      ...getSessionResults(query),
    ];
  }

  function getWorkoutResults(query) {
    return storage
      .getStoredWorkouts()
      .filter((workout) => {
        return matchesQuery(
          [
            workout.name,
            workout.description,
            workout.goalLabel,
            workout.levelLabel,
            workout.frequencyLabel,
            ...workout.exercises.map((exercise) => exercise.name),
          ],
          query,
        );
      })
      .map((workout) => {
        return {
          type: "Treino",
          title: workout.name || "Treino sem nome",
          description:
            workout.description ||
            `${workout.exercises.length} exercício${
              workout.exercises.length === 1 ? "" : "s"
            } cadastrado${workout.exercises.length === 1 ? "" : "s"}.`,
          href: `./workouts/workout-detail.html?id=${encodeURIComponent(
            workout.id,
          )}`,
          icon: "bi-activity",
        };
      });
  }

  function getExerciseResults(query) {
    return storage
      .getStoredExercises()
      .filter((exercise) => {
        return matchesQuery(
          [exercise.name, exercise.muscleGroup, exercise.equipment, exercise.notes],
          query,
        );
      })
      .map((exercise) => {
        return {
          type: "Exercício",
          title: exercise.name || "Exercício sem nome",
          description:
            [exercise.muscleGroup, exercise.equipment].filter(Boolean).join(" • ") ||
            "Exercício salvo na biblioteca.",
          href: "./exercises/exercises.html",
          icon: "bi-heart-pulse",
        };
      });
  }

  function getSessionResults(query) {
    return storage
      .getStoredSessions()
      .filter((session) => {
        return matchesQuery(
          [
            session.workoutName,
            storage.formatDuration(session.durationSeconds),
            formatDate(session.finishedAt),
          ],
          query,
        );
      })
      .map((session) => {
        return {
          type: "Sessão",
          title: session.workoutName || "Treino cadastrado",
          description: `${formatDate(session.finishedAt)} • ${storage.formatDuration(
            session.durationSeconds,
          )}`,
          href: `./workouts/workout-session-detail.html?id=${encodeURIComponent(
            session.id,
          )}`,
          icon: "bi-check2-circle",
        };
      });
  }

  function renderResult(result) {
    return `
      <article class="workout-exercise-item">
        <span class="workout-exercise-order">
          <i class="bi ${escapeHTML(result.icon)}" aria-hidden="true"></i>
        </span>

        <div>
          <span class="badge badge-info">${escapeHTML(result.type)}</span>
          <h3 class="card-title mt-sm">${escapeHTML(result.title)}</h3>
          <p class="card-description">${escapeHTML(result.description)}</p>
        </div>

        <a class="btn btn-outline" href="${escapeAttribute(result.href)}">
          Abrir
        </a>
      </article>
    `;
  }

  function createEmptyState(title, description) {
    return `
      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Estado vazio</span>
            <h3 class="content-card-title mt-md">${escapeHTML(title)}</h3>
            <p class="content-card-description mt-sm">
              ${escapeHTML(description)}
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function matchesQuery(values, query) {
    return values.some((value) => {
      return normalize(value).includes(query);
    });
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Data não registrada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHTML(value);
  }
});
