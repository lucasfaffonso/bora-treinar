/* =========================================================
   Workout session
   Sessão de treino conectada ao backend.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const params = new URLSearchParams(window.location.search);
  const workoutId = params.get("id");

  const pageContent = document.querySelector(".page-content");
  const workoutTimerElement = document.querySelector(
    ".workout-session-timer strong",
  );
  const restTimerElement = document.querySelector(".rest-timer strong");

  const heroTitle = document.querySelector(".workout-session-hero h2");
  const heroDescription = document.querySelector(".workout-session-hero p");

  const focusWorkoutLink = document.querySelector(
    ".workout-session-focus-link",
  );
  const restFocusLink = document.querySelector(
    '.rest-timer-actions a[href*="workout-timer"]',
  );

  const floatingSessionTimer = document.querySelector(
    "[data-session-floating-timer]",
  );
  const floatingWorkoutTime = document.querySelector(
    "[data-floating-workout-time]",
  );
  const floatingRestTime = document.querySelector("[data-floating-rest-time]");
  const floatingProgressBar = document.querySelector(
    "[data-floating-progress-bar]",
  );

  const currentExerciseBadge = document.querySelector(
    ".workout-session-main .content-card-header .badge",
  );
  const currentExerciseTitle = document.querySelector(
    ".workout-session-main .content-card-title",
  );
  const currentExerciseDescription = document.querySelector(
    ".workout-session-main .content-card-description",
  );

  const currentMetrics = document.querySelectorAll(
    ".workout-current-metric strong",
  );

  const setList = document.querySelector(".set-list");
  const queueList = document.querySelector(".workout-exercise-list");

  const pauseWorkoutButton = document.querySelector("[data-session-toggle]");
  const resetWorkoutTimerButton = document.querySelector(
    "[data-workout-timer-reset]",
  );
  const nextExerciseButton = document.querySelector("[data-next-exercise]");
  const finishWorkoutButton = document.querySelector("[data-finish-workout]");

  const restToggleButton = document.querySelector("[data-rest-timer-toggle]");
  const restResetButton = document.querySelector("[data-rest-timer-reset]");

  const restTimerCard = document
    .querySelector(".rest-timer")
    ?.closest(".workout-session-card");

  const progressInfo = document.querySelector(
    ".workout-session-actions .workout-progress-info strong",
  );
  const progressBar = document.querySelector(
    ".workout-session-actions .workout-progress-bar span",
  );
  const summaryItems = document.querySelectorAll(
    ".workout-session-actions .workout-summary-item strong",
  );

  const ACTIVE_SESSION_STARTED_AT_PREFIX =
    "bora_treinar_active_session_started_at";
  const ACTIVE_BACKEND_SESSION_ID_PREFIX =
    "bora_treinar_active_backend_session_id";
  const XP_PER_COMPLETED_SET = 10;
  const XP_COMPLETION_BONUS = 50;
  const MIN_SECONDS_PER_XP_SET = 20;
  const MIN_SECONDS_FOR_SESSION_XP = 300;

  let workout = null;
  let backendSession = null;
  let exercises = [];
  let completedSets = [];
  let currentExerciseIndex = 0;
  let workoutStartedAt = Date.now();
  let elapsedSeconds = 0;
  let restRemainingSeconds = 60;

  let isRestRunning = false;
  let isRestPaused = true;
  let isFinishingWorkout = false;

  let workoutTimerInterval = null;
  let restTimerInterval = null;

  init();

  async function init() {
    if (!storage || !pageContent || !workoutId) {
      renderMissingWorkout();
      return;
    }

    renderLoadingSession();

    try {
      workout = await loadWorkout(workoutId);

      if (!workout) {
        renderMissingWorkout();
        return;
      }

      exercises = normalizeExercises(workout.exercises);

      if (!exercises.length) {
        renderWorkoutWithoutExercises(workout);
        return;
      }

      backendSession = await getOrStartBackendSession(workout.id);
      completedSets = exercises.map((exercise) => Array(exercise.sets).fill(false));
      currentExerciseIndex = 0;
      workoutStartedAt = getBackendSessionStartedAt(backendSession);
      elapsedSeconds = getElapsedWorkoutSeconds();
      restRemainingSeconds = exercises[0].restSeconds;

      saveActiveBackendSession(backendSession);
      bindEvents();
      setupPageTexts();
      setupFloatingSessionTimer();
      renderSession();
      updateWorkoutTimer();
      updateRestTimer(restRemainingSeconds);
      updateRestControls();
      startWorkoutTimer();
    } catch {
      renderBackendSessionError();
    }
  }

  async function loadWorkout(id) {
    try {
      const response = await apiGet(`/workouts/${encodeURIComponent(id)}`);
      const apiWorkout = normalizeWorkout(unwrapApiData(response));

      if (apiWorkout) {
        cacheWorkout(apiWorkout);
      }

      return apiWorkout;
    } catch (error) {
      const cachedWorkout = storage.getWorkoutById(id);

      if (cachedWorkout) {
        return cachedWorkout;
      }

      throw error;
    }
  }

  async function getOrStartBackendSession(id) {
    const storedSessionId = getActiveBackendSessionId(id);

    if (storedSessionId) {
      const storedSession = await findBackendSessionById(storedSessionId);

      if (storedSession?.status === "IN_PROGRESS") {
        return storedSession;
      }
    }

    try {
      const response = await apiPost(`/workouts/${encodeURIComponent(id)}/sessions`, {
        notes: "Sessão iniciada pelo frontend",
      });

      return unwrapApiData(response);
    } catch (error) {
      if (error?.status !== 400) {
        throw error;
      }

      const activeSession = await findActiveSessionForWorkout(id);

      if (activeSession) {
        return activeSession;
      }

      throw error;
    }
  }

  async function findBackendSessionById(sessionId) {
    try {
      const response = await apiGet(
        `/workout-sessions/${encodeURIComponent(sessionId)}`,
      );

      return unwrapApiData(response);
    } catch {
      return null;
    }
  }

  async function findActiveSessionForWorkout(id) {
    const response = await apiGet(`/workouts/${encodeURIComponent(id)}/sessions`);
    const sessions = unwrapApiData(response);

    return Array.isArray(sessions)
      ? sessions.find((session) => session.status === "IN_PROGRESS") || null
      : null;
  }

  function renderLoadingSession() {
    setText(heroTitle, "Carregando treino");
    setText(
      heroDescription,
      "Buscando treino e preparando sua sessão.",
    );

    if (currentExerciseTitle) {
      currentExerciseTitle.textContent = "Carregando sessão...";
    }

    if (currentExerciseDescription) {
      currentExerciseDescription.textContent =
        "Aguarde enquanto preparamos sua sessão.";
    }
  }

  function renderMissingWorkout() {
    pageContent.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Nenhum treino selecionado</h2>

          <p class="page-description">
            Escolha um treino cadastrado para iniciar uma sessão.
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
              Sessão não iniciada.
            </h3>

            <p class="content-card-description mt-sm">
              Inicie uma sessão a partir de um treino cadastrado.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function renderWorkoutWithoutExercises(selectedWorkout) {
    pageContent.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">
            ${escapeHTML(selectedWorkout.name || "Treino sem exercícios")}
          </h2>

          <p class="page-description">
            Este treino foi cadastrado, mas ainda não possui exercícios.
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
            <span class="badge badge-info">Estado vazio</span>

            <h3 class="content-card-title mt-md">
              Nenhum exercício cadastrado.
            </h3>

            <p class="content-card-description mt-sm">
              Adicione exercícios ao treino antes de iniciar uma sessão.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function renderBackendSessionError() {
    pageContent.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Sessão não iniciada</h2>
          <p class="page-description">
            Não foi possível preparar esta sessão.
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
            <span class="badge badge-warning">Indisponível</span>
            <h3 class="content-card-title mt-md">Erro ao iniciar sessão.</h3>
            <p class="content-card-description mt-sm">
              Tente novamente em alguns instantes.
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function bindEvents() {
    pauseWorkoutButton?.addEventListener("click", toggleRestTimer);
    resetWorkoutTimerButton?.addEventListener("click", resetRestTimer);
    nextExerciseButton?.addEventListener("click", goToNextExercise);
    finishWorkoutButton?.addEventListener("click", finishWorkout);
    restToggleButton?.addEventListener("click", toggleRestTimer);
    restResetButton?.addEventListener("click", resetRestTimer);
  }

  function setupPageTexts() {
    setText(heroTitle, workout.name || "Treino cadastrado");
    setText(
      heroDescription,
      workout.description ||
        "Sessão iniciada a partir de um treino cadastrado pelo usuário.",
    );

    if (focusWorkoutLink) {
      focusWorkoutLink.href = buildTimerHref("workout");
    }

    if (restFocusLink) {
      restFocusLink.href = buildTimerHref("rest", exercises[0].restSeconds);
    }
  }

  function setupFloatingSessionTimer() {
    if (!floatingSessionTimer) {
      return;
    }

    function updateFloatingTimerVisibility() {
      const shouldShow = window.scrollY > 260;
      floatingSessionTimer.classList.toggle("is-hidden", !shouldShow);
    }

    window.addEventListener("scroll", updateFloatingTimerVisibility, {
      passive: true,
    });

    updateFloatingTimerVisibility();
  }

  function renderSession() {
    renderCurrentExercise();
    renderSetList();
    renderExerciseQueue();
    updateSessionProgress();
  }

  function renderCurrentExercise() {
    const exercise = exercises[currentExerciseIndex];

    setText(
      currentExerciseBadge,
      `Exercício ${currentExerciseIndex + 1} de ${exercises.length}`,
    );
    setText(currentExerciseTitle, exercise.name || "Exercício sem nome");
    setText(currentExerciseDescription, "Exercício cadastrado nesta rotina.");

    if (currentMetrics[0]) currentMetrics[0].textContent = String(exercise.sets);
    if (currentMetrics[1]) currentMetrics[1].textContent = exercise.reps || "—";
    if (currentMetrics[2]) currentMetrics[2].textContent = `${exercise.restSeconds}s`;
    if (currentMetrics[3]) {
      currentMetrics[3].textContent = isExerciseCompleted(currentExerciseIndex)
        ? "Concluído"
        : "Em execução";
    }

    if (restFocusLink) {
      restFocusLink.href = buildTimerHref("rest", exercise.restSeconds);
    }
  }

  function buildTimerHref(mode, seconds = null) {
    const timerParams = new URLSearchParams({
      mode,
      id: workout.id,
    });

    if (seconds !== null) {
      timerParams.set("seconds", String(seconds));
    }

    return `./workout-timer.html?${timerParams.toString()}`;
  }

  function renderSetList() {
    const exercise = exercises[currentExerciseIndex];
    const currentCompletedSets = completedSets[currentExerciseIndex];

    if (!setList) return;

    setList.innerHTML = currentCompletedSets
      .map((isCompleted, index) => {
        const setNumber = index + 1;

        return `
          <label class="set-item ${isCompleted ? "is-completed" : ""}">
            <input
              type="checkbox"
              data-set-index="${index}"
              ${isCompleted ? "checked" : ""}
            />

            <span class="set-check">
              <i class="bi bi-check-lg" aria-hidden="true"></i>
            </span>

            <span class="set-info">
              <strong>Série ${setNumber}</strong>
              <small>
                ${escapeHTML(exercise.reps || "reps não informadas")} • ${exercise.restSeconds}s descanso
              </small>
            </span>
          </label>
        `;
      })
      .join("");

    setList.querySelectorAll("[data-set-index]").forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        const setIndex = Number(checkbox.getAttribute("data-set-index"));
        completedSets[currentExerciseIndex][setIndex] = checkbox.checked;

        if (checkbox.checked) {
          startRestTimer(exercise.restSeconds);
        }

        renderSetList();
        renderExerciseQueue();
        updateSessionProgress();

        if (isExerciseCompleted(currentExerciseIndex)) {
          safeShowToast({
            title: "Exercício concluído",
            message: `${exercise.name || "Exercício"} foi concluído.`,
            type: "success",
          });
        }
      });
    });
  }

  function renderExerciseQueue() {
    if (!queueList) return;

    queueList.innerHTML = exercises
      .map((exercise, index) => {
        const isCurrent = index === currentExerciseIndex;
        const isCompleted = isExerciseCompleted(index);
        const badgeClass = isCurrent
          ? "badge-info"
          : isCompleted
            ? "badge-success"
            : "badge-warning";
        const badgeText = isCurrent
          ? "Atual"
          : isCompleted
            ? "Concluído"
            : "Pendente";

        return `
          <article class="workout-exercise-item ${isCurrent ? "active" : ""}">
            <span class="workout-exercise-order">${index + 1}</span>
            <div>
              <h3 class="card-title">${escapeHTML(exercise.name || "Exercício sem nome")}</h3>
              <p class="card-description">
                ${exercise.sets} séries • ${escapeHTML(exercise.reps || "reps não informadas")} • ${exercise.restSeconds}s
              </p>
            </div>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </article>
        `;
      })
      .join("");
  }

  function startWorkoutTimer() {
    stopWorkoutTimer();

    workoutTimerInterval = window.setInterval(() => {
      elapsedSeconds = getElapsedWorkoutSeconds();
      updateWorkoutTimer();
      updateSessionProgress();
    }, 1000);
  }

  function stopWorkoutTimer() {
    if (workoutTimerInterval) {
      window.clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;
    }
  }

  function updateWorkoutTimer() {
    elapsedSeconds = getElapsedWorkoutSeconds();
    const formattedTime = formatTime(elapsedSeconds);

    if (workoutTimerElement) workoutTimerElement.textContent = formattedTime;
    if (floatingWorkoutTime) floatingWorkoutTime.textContent = formattedTime;
  }

  function toggleRestTimer() {
    if (!isRestRunning) {
      startRestTimer(
        restRemainingSeconds > 0
          ? restRemainingSeconds
          : exercises[currentExerciseIndex].restSeconds,
      );
      return;
    }

    isRestPaused = !isRestPaused;
    updateRestControls();
  }

  function resetRestTimer() {
    stopRestTimer();
    restRemainingSeconds = exercises[currentExerciseIndex].restSeconds;
    isRestRunning = false;
    isRestPaused = true;
    updateRestTimer(restRemainingSeconds);
    updateRestControls();
  }

  function startRestTimer(seconds) {
    stopRestTimer();
    restRemainingSeconds = seconds;
    isRestRunning = true;
    isRestPaused = false;
    updateRestTimer(restRemainingSeconds);
    updateRestControls();

    restTimerInterval = window.setInterval(() => {
      if (isRestPaused) return;

      restRemainingSeconds -= 1;

      if (restRemainingSeconds <= 0) {
        restRemainingSeconds = 0;
        isRestRunning = false;
        isRestPaused = true;
        updateRestTimer(restRemainingSeconds);
        updateRestControls();
        stopRestTimer();
        safeShowToast({
          title: "Descanso finalizado",
          message: "Hora da próxima série.",
          type: "info",
        });
        return;
      }

      updateRestTimer(restRemainingSeconds);
    }, 1000);
  }

  function stopRestTimer() {
    if (restTimerInterval) {
      window.clearInterval(restTimerInterval);
      restTimerInterval = null;
    }
  }

  function updateRestTimer(seconds) {
    const formattedTime = formatTime(seconds);

    if (restTimerElement) restTimerElement.textContent = formattedTime;
    if (floatingRestTime) floatingRestTime.textContent = formattedTime;
  }

  function updateRestControls() {
    updateFloatingRestControls();
    updateRestCardState();

    if (!restToggleButton) return;

    if (isRestRunning && !isRestPaused) {
      setRestToggleButtonState({
        label: "Pausar",
        icon: "pause-circle",
        usePrimary: false,
        isPausedState: false,
      });
      return;
    }

    if (isRestRunning && isRestPaused) {
      setRestToggleButtonState({
        label: "Retomar",
        icon: "play-circle",
        usePrimary: false,
        isPausedState: true,
      });
      return;
    }

    setRestToggleButtonState({
      label: "Iniciar",
      icon: "play-circle",
      usePrimary: true,
      isPausedState: false,
    });
  }

  function setRestToggleButtonState({
    label,
    icon,
    usePrimary = false,
    isPausedState = false,
  }) {
    if (!restToggleButton) return;

    restToggleButton.classList.remove(
      "btn-primary",
      "btn-outline",
      "is-paused",
    );
    restToggleButton.classList.add(usePrimary ? "btn-primary" : "btn-outline");

    if (isPausedState) {
      restToggleButton.classList.add("is-paused");
    }

    restToggleButton.innerHTML = `
      <i class="bi bi-${icon}" aria-hidden="true"></i>
      <span>${label}</span>
    `;
  }

  function updateFloatingRestControls() {
    if (pauseWorkoutButton) {
      pauseWorkoutButton.classList.toggle("is-paused", isRestRunning);

      if (isRestRunning && !isRestPaused) {
        pauseWorkoutButton.innerHTML = `
          <i class="bi bi-pause-circle" aria-hidden="true"></i>
          <span>Pausar descanso</span>
        `;
      } else if (isRestRunning && isRestPaused) {
        pauseWorkoutButton.innerHTML = `
          <i class="bi bi-play-circle" aria-hidden="true"></i>
          <span>Retomar descanso</span>
        `;
      } else {
        pauseWorkoutButton.innerHTML = `
          <i class="bi bi-play-circle" aria-hidden="true"></i>
          <span>Iniciar descanso</span>
        `;
      }
    }

    if (resetWorkoutTimerButton) {
      resetWorkoutTimerButton.innerHTML = `
        <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
        <span>Reiniciar descanso</span>
      `;
    }
  }

  function updateRestCardState() {
    if (!restTimerCard) return;

    restTimerCard.classList.remove("rest-is-running", "rest-is-paused");

    if (isRestRunning && !isRestPaused) {
      restTimerCard.classList.add("rest-is-running");
      return;
    }

    if (isRestRunning && isRestPaused) {
      restTimerCard.classList.add("rest-is-paused");
    }
  }

  function goToNextExercise() {
    if (currentExerciseIndex >= exercises.length - 1) {
      safeShowToast({
        title: "Treino",
        message: "Você já está no último exercício.",
        type: "warning",
      });
      return;
    }

    currentExerciseIndex += 1;
    stopRestTimer();
    isRestRunning = false;
    isRestPaused = true;
    restRemainingSeconds = exercises[currentExerciseIndex].restSeconds;
    updateRestTimer(restRemainingSeconds);
    updateRestControls();
    renderSession();

    safeShowToast({
      title: "Próximo exercício",
      message: exercises[currentExerciseIndex].name || "Exercício cadastrado",
      type: "info",
    });
  }

  async function finishWorkout() {
    if (isFinishingWorkout || !backendSession?.id) return;

    const progress = getProgressPercentage();

    if (progress < 100) {
      const shouldFinish = await window.showBtConfirmDialog({
        title: "Finalizar treino?",
        message:
          "Você ainda não concluiu todas as séries. Deseja finalizar a sessão mesmo assim?",
        confirmLabel: "Finalizar treino",
        cancelLabel: "Continuar treinando",
        variant: "warning",
        icon: "exclamation-triangle",
      });

      if (!shouldFinish) return;
    }

    isFinishingWorkout = true;
    setFinishButtonLoading(true);
    stopAllTimers();

    try {
      const durationSeconds = getElapsedWorkoutSeconds();
      const xpEarned = calculateSessionXp();
      const response = await apiPatch(
        `/workout-sessions/${encodeURIComponent(backendSession.id)}/finish`,
        {
          durationSeconds,
          xpEarned,
          notes: `Sessão finalizada pelo frontend com ${progress}% de progresso.`,
        },
      );
      const finishedSession = unwrapApiData(response);

      storage.saveStoredSession({
        id: finishedSession?.id || backendSession.id,
        workoutId: workout.id,
        workoutName: workout.name || "Treino cadastrado",
        finishedAt: finishedSession?.finishedAt || new Date().toISOString(),
        durationSeconds,
        progress,
        completedSets: getCompletedSetCount(),
        totalSets: getTotalSetCount(),
        xp: finishedSession?.xpEarned ?? xpEarned,
        exercises: getSessionExercises(),
        source: "BACKEND",
      });

      clearWorkoutSessionState();
      clearActiveBackendSession(workout.id);

      safeShowToast({
        title: "Treino finalizado",
        message: "Sessão salva no histórico.",
        type: "success",
      });

      window.setTimeout(() => {
        window.location.href = "./workouts.html";
      }, 900);
    } catch (error) {
      isFinishingWorkout = false;
      setFinishButtonLoading(false);
      startWorkoutTimer();
      safeShowToast({
        title: "Erro ao finalizar",
        message: "Não foi possível finalizar a sessão. Tente novamente.",
        type: "danger",
      });
    }
  }

  function setFinishButtonLoading(isLoading) {
    if (!finishWorkoutButton) return;

    finishWorkoutButton.disabled = isLoading;
    finishWorkoutButton.innerHTML = isLoading
      ? `<i class="bi bi-arrow-repeat" aria-hidden="true"></i><span>Finalizando...</span>`
      : `<i class="bi bi-check2-circle" aria-hidden="true"></i><span>Finalizar treino</span>`;
  }

  function updateSessionProgress() {
    const progress = getProgressPercentage();
    const completedSetCount = getCompletedSetCount();
    const totalSetCount = getTotalSetCount();

    if (progressInfo) progressInfo.textContent = `${progress}%`;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (floatingProgressBar) floatingProgressBar.style.width = `${progress}%`;
    if (summaryItems[0]) summaryItems[0].textContent = `${currentExerciseIndex + 1}/${exercises.length}`;
    if (summaryItems[1]) summaryItems[1].textContent = `${completedSetCount}/${totalSetCount}`;
    if (summaryItems[2]) summaryItems[2].textContent = formatTime(elapsedSeconds);
    if (summaryItems[3]) summaryItems[3].textContent = `${calculateSessionXp()} XP`;

    renderCurrentExercise();
  }

  function getCompletedSetCount() {
    return completedSets.flat().filter(Boolean).length;
  }

  function getTotalSetCount() {
    return completedSets.flat().length;
  }

  function getProgressPercentage() {
    const totalSetCount = getTotalSetCount();

    if (!totalSetCount) return 0;

    return Math.round((getCompletedSetCount() / totalSetCount) * 100);
  }

  function calculateSessionXp() {
    const elapsedWorkoutSeconds = getElapsedWorkoutSeconds();

    if (elapsedWorkoutSeconds < MIN_SECONDS_FOR_SESSION_XP) return 0;

    const completedSetCount = getCompletedSetCount();
    const progress = getProgressPercentage();
    const durationEligibleSetCount = Math.floor(
      elapsedWorkoutSeconds / MIN_SECONDS_PER_XP_SET,
    );
    const xpSetCount = Math.min(completedSetCount, durationEligibleSetCount);
    const completionBonus =
      progress >= 100 && xpSetCount >= getTotalSetCount()
        ? XP_COMPLETION_BONUS
        : 0;

    return xpSetCount * XP_PER_COMPLETED_SET + completionBonus;
  }

  function getSessionExercises() {
    return exercises.map((exercise, index) => {
      const currentCompletedSets = completedSets[index] || [];

      return {
        order: index + 1,
        libraryExerciseId: exercise.libraryExerciseId || "",
        name: exercise.name || "",
        muscleGroup: exercise.muscleGroup || "",
        equipment: exercise.equipment || "",
        notes: exercise.notes || "",
        sets: exercise.sets,
        totalSets: currentCompletedSets.length,
        completedSets: currentCompletedSets.filter(Boolean).length,
        reps: exercise.reps || "",
        rest: exercise.rest || "",
        restSeconds: exercise.restSeconds,
        setStatuses: currentCompletedSets.map(Boolean),
      };
    });
  }

  function isExerciseCompleted(exerciseIndex) {
    return completedSets[exerciseIndex].every(Boolean);
  }

  function normalizeExercises(items) {
    return Array.isArray(items)
      ? items
          .map((exercise, index) => ({
            order: index + 1,
            libraryExerciseId: exercise.libraryExerciseId || "",
            name: exercise.exerciseName || exercise.name || "",
            muscleGroup: exercise.muscleGroup || "",
            equipment: exercise.equipment || "",
            notes: exercise.notes || "",
            sets: Math.max(1, Number(exercise.sets || 1)),
            reps: exercise.reps || "",
            rest: exercise.rest || "",
            restSeconds: Number(
              exercise.restSeconds || storage.parseRestSeconds(exercise.rest) || 60,
            ),
          }))
          .filter((exercise) => exercise.name)
      : [];
  }

  function normalizeWorkout(data) {
    if (!data || typeof data !== "object") return null;

    const frequency = String(data.weeklyFrequency ?? data.frequency ?? "").trim();

    return {
      id: String(data.id || ""),
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim(),
      goal: String(data.goal || "").trim(),
      level: String(data.level || "").trim(),
      frequency,
      exercises: normalizeExercises(data.exercises),
    };
  }

  function cacheWorkout(apiWorkout) {
    if (!apiWorkout || !storage?.getStoredWorkouts || !storage?.saveStoredWorkouts) {
      return;
    }

    const workouts = storage.getStoredWorkouts();
    const index = workouts.findIndex((item) => String(item.id) === String(apiWorkout.id));

    if (index >= 0) {
      workouts[index] = {
        ...workouts[index],
        ...apiWorkout,
      };
    } else {
      workouts.unshift(apiWorkout);
    }

    storage.saveStoredWorkouts(workouts);
  }

  function unwrapApiData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
  }

  function stopAllTimers() {
    stopWorkoutTimer();
    stopRestTimer();
  }

  function getWorkoutSessionStorageKey() {
    return `${ACTIVE_SESSION_STARTED_AT_PREFIX}:${workout.id}`;
  }

  function getBackendSessionStorageKey(id) {
    return `${ACTIVE_BACKEND_SESSION_ID_PREFIX}:${id}`;
  }

  function saveActiveBackendSession(session) {
    if (!session?.id) return;

    window.sessionStorage.setItem(getBackendSessionStorageKey(workout.id), session.id);
    window.sessionStorage.setItem(
      getWorkoutSessionStorageKey(),
      String(getBackendSessionStartedAt(session)),
    );
  }

  function getActiveBackendSessionId(id) {
    return window.sessionStorage.getItem(getBackendSessionStorageKey(id));
  }

  function clearActiveBackendSession(id) {
    window.sessionStorage.removeItem(getBackendSessionStorageKey(id));
  }

  function getBackendSessionStartedAt(session) {
    const startedAt = new Date(session?.startedAt || Date.now()).getTime();

    if (Number.isFinite(startedAt) && startedAt > 0) {
      return startedAt;
    }

    return Date.now();
  }

  function getElapsedWorkoutSeconds() {
    return Math.max(0, Math.floor((Date.now() - workoutStartedAt) / 1000));
  }

  function clearWorkoutSessionState() {
    window.sessionStorage.removeItem(getWorkoutSessionStorageKey());
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }

  function safeShowToast({ title, message, type }) {
    if (typeof showToast === "function") {
      showToast({ title, message, type });
      return;
    }

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
