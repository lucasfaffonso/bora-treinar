/* =========================================================
   Workout detail
   Renderiza detalhes apenas de treino cadastrado.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const main = document.querySelector(".page-content");
  const params = new URLSearchParams(window.location.search);
  const workoutId = params.get("id");

  if (!storage || !main) {
    console.warn("Camada de dados ou conteúdo da página não encontrado.");
    return;
  }

  const workout = storage.getWorkoutById(workoutId);

  if (!workout) {
    renderNotFound();
    return;
  }

  renderWorkoutDetail(workout);

  function renderNotFound() {
    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Treino não encontrado</h2>

          <p class="page-description">
            Selecione um treino cadastrado na sua lista para visualizar os detalhes.
          </p>
        </div>

        <a class="btn btn-primary" href="./workouts.html">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          Voltar para treinos
        </a>
      </section>

      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-warning">Sem dados</span>

            <h3 class="content-card-title mt-md">
              Nenhum treino selecionado.
            </h3>

            <p class="content-card-description mt-sm">
              Abra um treino cadastrado para ver os detalhes.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function renderWorkoutDetail(workout) {
    const sessions = storage.getSessionsByWorkoutId(workout.id);
    const totalSets = getTotalSets(workout);

    const sessionHref = `./workout-session.html?id=${encodeURIComponent(
      workout.id,
    )}`;

    const editHref = `./workout-form.html?id=${encodeURIComponent(workout.id)}`;

    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">
            ${escapeHTML(workout.name || "Treino sem nome")}
          </h2>

          <p class="page-description">
            ${escapeHTML(workout.description || "Treino cadastrado pelo usuário.")}
          </p>
        </div>

        <div class="filter-actions">
          <a class="btn btn-outline" href="./workouts.html">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Voltar
          </a>

          <a class="btn btn-outline" href="${editHref}">
            <i class="bi bi-pencil-square" aria-hidden="true"></i>
            Editar
          </a>

          <a class="btn btn-primary" href="${sessionHref}">
            <i class="bi bi-play-fill" aria-hidden="true"></i>
            Iniciar treino
          </a>
        </div>
      </section>

      <section class="workout-detail-header">
        <div class="content-card">
          <div class="content-card-header">
            <div>
              <span class="badge badge-info">Cadastrado</span>

              <h3 class="content-card-title mt-md">
                ${escapeHTML(workout.name || "Treino sem nome")}
              </h3>

              <p class="content-card-description mt-sm">
                ${escapeHTML(workout.description || "Sem descrição cadastrada.")}
              </p>
            </div>
          </div>

          <div class="content-card-body">
            <div class="workout-card-meta">
              <span class="workout-meta-pill">
                <i class="bi bi-bullseye" aria-hidden="true"></i>
                ${escapeHTML(workout.goalLabel || "Objetivo não definido")}
              </span>

              <span class="workout-meta-pill">
                <i class="bi bi-bar-chart" aria-hidden="true"></i>
                ${escapeHTML(workout.levelLabel || "Nível não definido")}
              </span>

              <span class="workout-meta-pill">
                <i class="bi bi-calendar-week" aria-hidden="true"></i>
                ${escapeHTML(workout.frequencyLabel || "Frequência não definida")}
              </span>
            </div>
          </div>
        </div>

        <aside class="workout-session-card">
          <span class="badge badge-info">Resumo</span>

          <h3 class="card-title mt-md">Dados cadastrados</h3>

          <div class="workout-summary-list mt-lg">
            <div class="workout-summary-item">
              <span>Exercícios</span>
              <strong>${workout.exercises.length}</strong>
            </div>

            <div class="workout-summary-item">
              <span>Séries totais</span>
              <strong>${totalSets}</strong>
            </div>

            <div class="workout-summary-item">
              <span>Sessões registradas</span>
              <strong>${sessions.length}</strong>
            </div>

            <div class="workout-summary-item">
              <span>Última sessão</span>
              <strong>${sessions.length ? formatDate(sessions[0].finishedAt) : "Nenhuma"}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">Exercícios cadastrados</h2>

            <p class="page-description">
              Exercícios informados no cadastro deste treino.
            </p>
          </div>
        </div>

        <div class="workout-exercise-list">
          ${
            workout.exercises.length
              ? workout.exercises.map(renderExercise).join("")
              : createInlineEmptyState(
                  "Nenhum exercício cadastrado neste treino.",
                )
          }
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">Histórico deste treino</h2>

            <p class="page-description">
              Sessões reais registradas para esta rotina.
            </p>
          </div>
        </div>

        <div class="content-card">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Duração</th>
                  <th>Status</th>
                  <th>XP</th>
                </tr>
              </thead>

              <tbody>
                ${
                  sessions.length
                    ? sessions.map(renderSessionRow).join("")
                    : `
                      <tr>
                        <td colspan="4">
                          Nenhuma sessão registrada para este treino.
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  }

  function renderExercise(exercise, index) {
    return `
      <article class="workout-exercise-item">
        <span class="workout-exercise-order">${index + 1}</span>

        <div>
          <h3 class="card-title">
            ${escapeHTML(exercise.name || "Exercício sem nome")}
          </h3>

          <p class="card-description">
            Exercício cadastrado nesta rotina.
          </p>
        </div>

        <div class="workout-card-meta">
          <span class="workout-meta-pill">
            ${escapeHTML(exercise.sets || 0)} séries
          </span>

          <span class="workout-meta-pill">
            ${escapeHTML(exercise.reps || "reps não informadas")}
          </span>

          <span class="workout-meta-pill">
            ${escapeHTML(exercise.restSeconds || 0)}s descanso
          </span>
        </div>
      </article>
    `;
  }

  function renderSessionRow(session) {
    return `
      <tr>
        <td>${formatDate(session.finishedAt)}</td>
        <td>${storage.formatDuration(session.durationSeconds)}</td>
        <td><span class="badge badge-success">Concluído</span></td>
        <td>${formatSessionXp(session.xp)}</td>
      </tr>
    `;
  }

  function formatSessionXp(value) {
    const xp = Number(value || 0);

    if (!Number.isFinite(xp) || xp <= 0) {
      return "0 XP";
    }

    return `+${xp} XP`;
  }

  function createInlineEmptyState(message) {
    return `
      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Estado vazio</span>

            <h3 class="content-card-title mt-md">
              ${escapeHTML(message)}
            </h3>
          </div>
        </div>
      </article>
    `;
  }

  function getTotalSets(workout) {
    return workout.exercises.reduce((sum, exercise) => {
      return sum + Number(exercise.sets || 0);
    }, 0);
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
});
