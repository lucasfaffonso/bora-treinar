/* =========================================================
   Workout session detail
   Detalhe conectado ao backend com fallback local.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const main = document.querySelector(".page-content");
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("id");

  if (!storage || !main) {
    console.warn("Camada de dados ou conteúdo da página não encontrado.");
    return;
  }

  init();

  async function init() {
    if (!sessionId) {
      renderNotFound();
      return;
    }

    renderLoading();

    try {
      const session = await loadSession(sessionId);

      if (!session) {
        renderNotFound();
        return;
      }

      const workout = await loadWorkout(session.workoutId);

      renderSessionDetail(session, workout);
    } catch {
      renderError();
    }
  }

  async function loadSession(id) {
    if (!window.isLocalAuthEnabled?.() && typeof window.apiGet === "function") {
      try {
        const response = await window.apiGet(`/workout-sessions/${encodeURIComponent(id)}`);
        const backendSession = normalizeBackendSession(unwrapApiData(response));
        const localSession = storage.getSessionById ? storage.getSessionById(id) : null;

        return mergeSessionWithLocalData(backendSession, localSession);
      } catch (error) {
        const localFallback = storage.getSessionById ? storage.getSessionById(id) : null;

        if (localFallback) return localFallback;

        throw error;
      }
    }

    return storage.getSessionById ? storage.getSessionById(id) : null;
  }

  async function loadWorkout(workoutId) {
    if (!workoutId) return null;

    if (!window.isLocalAuthEnabled?.() && typeof window.apiGet === "function") {
      try {
        const response = await window.apiGet(`/workouts/${encodeURIComponent(workoutId)}`);
        const workout = normalizeWorkout(unwrapApiData(response));

        if (workout) return workout;
      } catch {
        // Usa fallback local abaixo.
      }
    }

    return storage.getWorkoutById ? storage.getWorkoutById(workoutId) : null;
  }

  function renderLoading() {
    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Carregando sessão</h2>
          <p class="page-description">Buscando os dados da sessão.</p>
        </div>
      </section>

      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Aguarde</span>
            <h3 class="content-card-title mt-md">Carregando detalhes...</h3>
            <p class="content-card-description mt-sm">
              Os dados da sessão serão exibidos em instantes.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function renderNotFound() {
    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Sessão não encontrada</h2>

          <p class="page-description">
            Selecione uma sessão registrada no histórico para visualizar os detalhes.
          </p>
        </div>

        <a class="btn btn-primary" href="./workouts.html#workoutHistory">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          Voltar para histórico
        </a>
      </section>

      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-warning">Sem dados</span>

            <h3 class="content-card-title mt-md">
              Nenhuma sessão selecionada.
            </h3>

            <p class="content-card-description mt-sm">
              Abra uma sessão registrada para ver os detalhes.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function renderError() {
    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Erro ao carregar sessão</h2>
          <p class="page-description">
            Não foi possível buscar os detalhes desta sessão.
          </p>
        </div>

        <a class="btn btn-primary" href="./workouts.html#workoutHistory">
          <i class="bi bi-arrow-left" aria-hidden="true"></i>
          Voltar para histórico
        </a>
      </section>

      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-danger">Erro</span>
            <h3 class="content-card-title mt-md">Detalhe indisponível.</h3>
            <p class="content-card-description mt-sm">
              Tente novamente em alguns instantes.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function renderSessionDetail(session, workout) {
    const workoutHref = session.workoutId
      ? `./workout-detail.html?id=${encodeURIComponent(session.workoutId)}`
      : "./workouts.html";
    const exerciseSource = getExerciseSource(session, workout);
    const sessionStatus = getSessionStatus(session);
    const referenceDate = session.finishedAt || session.startedAt;

    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Detalhes da sessão</h2>

          <p class="page-description">
            Registro da sessão finalizada.
          </p>
        </div>

        <div class="filter-actions">
          <a class="btn btn-outline" href="./workouts.html#workoutHistory">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
            Voltar
          </a>

          <a class="btn btn-primary" href="${workoutHref}">
            <i class="bi bi-clipboard2-pulse" aria-hidden="true"></i>
            Ver treino
          </a>
        </div>
      </section>

      <section class="workout-detail-header">
        <article class="content-card">
          <div class="content-card-header">
            <div>
              <span class="badge ${sessionStatus.badgeClass}">
                ${escapeHTML(sessionStatus.label)}
              </span>

              <h3 class="content-card-title mt-md">
                ${escapeHTML(session.workoutName || "Treino cadastrado")}
              </h3>

              <p class="content-card-description mt-sm">
                Sessão registrada em ${escapeHTML(formatDateTime(referenceDate))}.
              </p>
            </div>
          </div>

          <div class="content-card-body">
            <div class="workout-card-meta">
              <span class="workout-meta-pill">
                <i class="bi bi-calendar-check" aria-hidden="true"></i>
                ${escapeHTML(formatDate(referenceDate))}
              </span>

              <span class="workout-meta-pill">
                <i class="bi bi-stopwatch" aria-hidden="true"></i>
                ${escapeHTML(formatDuration(session.durationSeconds))}
              </span>

              <span class="workout-meta-pill">
                <i class="bi bi-lightning-charge" aria-hidden="true"></i>
                ${escapeHTML(formatSessionXp(session.xp))}
              </span>

              <span class="workout-meta-pill">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
                ${escapeHTML(formatSets(session))}
              </span>
            </div>
          </div>
        </article>

        <aside class="workout-session-card">
          <span class="badge badge-info">Resumo</span>

          <h3 class="card-title mt-md">Dados registrados</h3>

          <div class="workout-summary-list mt-lg">
            <div class="workout-summary-item">
              <span>Status</span>
              <strong>${escapeHTML(sessionStatus.label)}</strong>
            </div>

            <div class="workout-summary-item">
              <span>Progresso</span>
              <strong>${escapeHTML(session.progress || 0)}%</strong>
            </div>

            <div class="workout-summary-item">
              <span>Duração</span>
              <strong>${escapeHTML(formatDuration(session.durationSeconds))}</strong>
            </div>

            <div class="workout-summary-item">
              <span>Séries</span>
              <strong>${escapeHTML(formatSets(session))}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">
              ${escapeHTML(exerciseSource.title)}
            </h2>

            <p class="page-description">
              ${escapeHTML(exerciseSource.description)}
            </p>
          </div>
        </div>

        <div class="workout-exercise-list">
          ${
            exerciseSource.exercises.length
              ? exerciseSource.exercises
                  .map((exercise, index) => {
                    return renderExercise(
                      exercise,
                      index,
                      exerciseSource.isSessionRecord,
                    );
                  })
                  .join("")
              : createInlineEmptyState(
                  "Nenhum exercício registrado para esta sessão.",
                )
          }
        </div>
      </section>
    `;
  }

  function getExerciseSource(session, workout) {
    if (Array.isArray(session.exercises) && session.exercises.length) {
      return {
        title: "Exercícios executados",
        description: "Lista registrada no momento em que a sessão foi concluída.",
        exercises: session.exercises,
        isSessionRecord: true,
      };
    }

    if (workout && Array.isArray(workout.exercises) && workout.exercises.length) {
      return {
        title: "Exercícios do treino",
        description:
          "Exibindo o treino relacionado como referência para esta sessão.",
        exercises: workout.exercises,
        isSessionRecord: false,
      };
    }

    return {
      title: "Exercícios executados",
      description: "Nenhuma lista de exercícios foi registrada nesta sessão.",
      exercises: [],
      isSessionRecord: true,
    };
  }

  function renderExercise(exercise, index, isSessionRecord) {
    const status = getExerciseStatus(exercise, isSessionRecord);
    const setStatusList = renderSetStatusList(exercise, isSessionRecord);

    return `
      <article class="workout-exercise-item session-exercise-item ${status.className}">
        <span class="workout-exercise-order">${index + 1}</span>

        <div class="session-exercise-content">
          <div class="session-exercise-heading">
            <div>
              <h3 class="card-title">
                ${escapeHTML(exercise.name || "Exercício sem nome")}
              </h3>

              <p class="card-description">
                ${escapeHTML(getExerciseDescription(exercise))}
              </p>
            </div>

            ${
              isSessionRecord
                ? `<span class="badge ${status.badgeClass}">${escapeHTML(status.label)}</span>`
                : ""
            }
          </div>

          ${setStatusList}
        </div>

        <div class="workout-card-meta">
          <span class="workout-meta-pill">
            ${escapeHTML(formatExerciseSets(exercise, isSessionRecord))}
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

  function getExerciseStatus(exercise, isSessionRecord) {
    if (!isSessionRecord) {
      return {
        className: "",
        badgeClass: "badge-info",
        label: "Treino base",
      };
    }

    const totalSets = Number(exercise.totalSets || exercise.sets || 0);
    const completedSets = Number(exercise.completedSets || 0);

    if (!totalSets) {
      return {
        className: "is-untracked",
        badgeClass: "badge-warning",
        label: "Sem séries",
      };
    }

    if (completedSets >= totalSets) {
      return {
        className: "is-completed",
        badgeClass: "badge-success",
        label: "Concluído",
      };
    }

    if (completedSets > 0) {
      return {
        className: "is-partial",
        badgeClass: "badge-warning",
        label: "Parcial",
      };
    }

    return {
      className: "is-not-executed",
      badgeClass: "badge-danger",
      label: "Não executado",
    };
  }

  function getSessionStatus(session) {
    const status = String(session.status || "").toUpperCase();

    if (status === "IN_PROGRESS") {
      return {
        badgeClass: "badge-warning",
        label: "Em andamento",
      };
    }

    if (status === "CANCELLED") {
      return {
        badgeClass: "badge-danger",
        label: "Cancelada",
      };
    }

    const completedSets = Number(session.completedSets || 0);
    const totalSets = Number(session.totalSets || 0);

    if (!totalSets) {
      return {
        badgeClass: "badge-success",
        label: "Finalizada",
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

  function renderSetStatusList(exercise, isSessionRecord) {
    if (
      !isSessionRecord ||
      !Array.isArray(exercise.setStatuses) ||
      !exercise.setStatuses.length
    ) {
      return "";
    }

    return `
      <div class="session-set-status-list" aria-label="Séries registradas">
        ${exercise.setStatuses
          .map((isCompleted, index) => {
            const statusClass = isCompleted ? "is-completed" : "is-pending";
            const statusLabel = isCompleted ? "Concluída" : "Pendente";

            return `
              <span class="session-set-status ${statusClass}">
                Série ${index + 1}: ${statusLabel}
              </span>
            `;
          })
          .join("")}
      </div>
    `;
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

  function normalizeBackendSession(session) {
    if (!session || typeof session !== "object") return null;

    return {
      id: String(session.id || ""),
      workoutId: String(session.workoutId || ""),
      workoutName: String(session.workoutName || "Treino cadastrado"),
      startedAt: session.startedAt || "",
      finishedAt: session.finishedAt || "",
      durationSeconds: Number(session.durationSeconds || 0),
      status: String(session.status || "FINISHED"),
      xp: Number(session.xpEarned || session.xp || 0),
      notes: String(session.notes || ""),
      progress: 0,
      completedSets: 0,
      totalSets: 0,
      exercises: [],
    };
  }

  function mergeSessionWithLocalData(backendSession, localSession) {
    if (!backendSession) return localSession || null;

    return {
      ...localSession,
      ...backendSession,
      progress: localSession?.progress || backendSession.progress || 0,
      completedSets: localSession?.completedSets || backendSession.completedSets || 0,
      totalSets: localSession?.totalSets || backendSession.totalSets || 0,
      exercises: localSession?.exercises || backendSession.exercises || [],
    };
  }

  function normalizeWorkout(data) {
    if (!data || typeof data !== "object") return null;

    return {
      id: String(data.id || ""),
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim(),
      goal: String(data.goal || "").trim(),
      level: String(data.level || "").trim(),
      frequency: String(data.weeklyFrequency ?? data.frequency ?? "").trim(),
      exercises: Array.isArray(data.exercises)
        ? data.exercises.map(normalizeExercise).filter(Boolean)
        : [],
    };
  }

  function normalizeExercise(exercise, index) {
    if (!exercise || typeof exercise !== "object") return null;

    return {
      order: Number(exercise.exerciseOrder ?? exercise.order ?? index + 1),
      name: String(exercise.exerciseName || exercise.name || "").trim(),
      muscleGroup: String(exercise.muscleGroup || "").trim(),
      equipment: String(exercise.equipment || "").trim(),
      notes: String(exercise.notes || "").trim(),
      sets: Number(exercise.sets || 0),
      reps: String(exercise.reps || "").trim(),
      restSeconds: Number(exercise.restSeconds || exercise.rest || 0),
    };
  }

  function unwrapApiData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
  }

  function getExerciseDescription(exercise) {
    const details = [exercise.muscleGroup, exercise.equipment]
      .filter(Boolean)
      .join(" • ");

    return details || "Exercício cadastrado neste treino.";
  }

  function formatExerciseSets(exercise, isSessionRecord) {
    const totalSets = Number(exercise.totalSets || exercise.sets || 0);
    const completedSets = Number(exercise.completedSets || 0);

    if (!totalSets) {
      return "Séries não registradas";
    }

    if (isSessionRecord) {
      return `${completedSets}/${totalSets} séries concluídas`;
    }

    return `${totalSets} séries`;
  }

  function formatSets(session) {
    const completedSets = Number(session.completedSets || 0);
    const totalSets = Number(session.totalSets || 0);

    if (!totalSets) {
      return "Resumo registrado";
    }

    return `${completedSets}/${totalSets} séries`;
  }

  function formatSessionXp(value) {
    const xp = Number(value || 0);

    if (!Number.isFinite(xp) || xp <= 0) {
      return "0 XP";
    }

    return `+${xp} XP`;
  }

  function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.round(Number(totalSeconds || 0)));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

  function formatDateTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "data não registrada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
