/* =========================================================
   Dashboard
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;

  if (!storage) {
    console.warn("Camada de dados local não encontrada.");
    return;
  }

  renderDashboard();

  function renderDashboard() {
    const workouts = storage.getStoredWorkouts();
    const sessions = storage.getStoredSessions ? storage.getStoredSessions() : [];
    const stats = storage.getWorkoutStats();

    updateStats(stats, sessions);
    updateRecommendedWorkout(workouts);
  }

  function updateStats(stats, sessions) {
    const cards = document.querySelectorAll(
      '[aria-label="Resumo do usuário"] .stats-card',
    );
    const completedWorkoutsCount = countFullyCompletedSessions(sessions);

    setCard(cards[0], String(completedWorkoutsCount));
    setCard(cards[1], formatDays(stats.currentStreakDays));
    setCard(cards[2], String(stats.totalXp));
    setCard(cards[3], "Pessoal");
  }

  function countFullyCompletedSessions(sessions) {
    if (!Array.isArray(sessions)) {
      return 0;
    }

    return sessions.filter(isFullyCompletedSession).length;
  }

  function isFullyCompletedSession(session) {
    const progress = Number(session?.progress || 0);

    if (Number.isFinite(progress) && progress >= 100) {
      return true;
    }

    const completedSets = Number(session?.completedSets || 0);
    const totalSets = Number(session?.totalSets || 0);

    return totalSets > 0 && completedSets >= totalSets;
  }

  function setCard(card, value) {
    if (!card) {
      return;
    }

    const valueElement = card.querySelector(".stats-card-value");
    const descriptionElement = card.querySelector(".stats-card-description");

    if (valueElement) {
      valueElement.textContent = value;
    }

    if (descriptionElement) {
      descriptionElement.textContent = "";
      descriptionElement.hidden = true;
    }
  }

  function updateRecommendedWorkout(workouts) {
    const section = document.querySelector("[data-dashboard-workout-section]");

    if (!section) {
      return;
    }

    const workout = workouts[0];

    if (!workout) {
      section.innerHTML = `
        <div class="dashboard-section-header">
          <h2 class="dashboard-section-title">Treino cadastrado</h2>

          <a class="btn btn-outline" href="../workouts/workout-form.html">
            Criar treino
          </a>
        </div>

        <article class="content-card">
          <div class="content-card-header">
            <div>
              <span class="badge badge-info">Estado vazio</span>

              <h3 class="content-card-title mt-md">
                Nenhum treino cadastrado ainda.
              </h3>
            </div>
          </div>
        </article>
      `;

      return;
    }

    const detailsHref = `../workouts/workout-detail.html?id=${encodeURIComponent(
      workout.id,
    )}`;

    const sessionHref = `../workouts/workout-session.html?id=${encodeURIComponent(
      workout.id,
    )}`;

    const exercises = Array.isArray(workout.exercises)
      ? workout.exercises.slice(0, 3)
      : [];
    const description = String(workout.description || "").trim();

    section.innerHTML = `
      <div class="dashboard-section-header">
        <h2 class="dashboard-section-title">Treino cadastrado</h2>

        <a class="btn btn-outline" href="${detailsHref}">
          Detalhes
        </a>
      </div>

      <article class="content-card">
        <div class="content-card-header">
          <div>
            <h3 class="content-card-title">
              ${escapeHTML(workout.name || "Treino sem nome")}
            </h3>

            ${description
              ? `<p class="content-card-description">${escapeHTML(description)}</p>`
              : ""}
          </div>

          <span class="badge badge-info">Cadastrado</span>
        </div>

        <div class="content-card-body">
          ${
            exercises.length
              ? `<div class="grid grid-3">${exercises
                  .map(renderExerciseCard)
                  .join("")}</div>`
              : ""
          }
        </div>

        <div class="content-card-footer">
          <a class="btn btn-primary" href="${sessionHref}">
            <i class="bi bi-play-fill" aria-hidden="true"></i>
            Iniciar treino
          </a>
        </div>
      </article>
    `;
  }

  function renderExerciseCard(exercise) {
    return `
      <div class="card">
        <h4 class="card-title">
          ${escapeHTML(exercise.name || "Exercício sem nome")}
        </h4>

        <p class="card-description">
          ${escapeHTML(exercise.sets || 0)} séries • ${escapeHTML(
            exercise.reps || "reps não informadas",
          )}
        </p>
      </div>
    `;
  }

  function formatDays(days) {
    const normalizedDays = Number(days || 0);

    return normalizedDays === 1 ? "1 dia" : `${normalizedDays} dias`;
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
