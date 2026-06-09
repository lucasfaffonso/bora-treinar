/* =========================================================
   Workout timer
   Arquivo: workout-timer.js
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const workoutId = params.get("id") || getReferrerWorkoutId();
  const backButton = document.querySelector(".timer-back-button");
  const modeButtons = document.querySelectorAll("[data-timer-mode]");
  const timerScreens = document.querySelectorAll("[data-timer-screen]");
  const focusTotalTime = document.querySelector("[data-focus-total-time]");

  const restEndTime = document.querySelector("[data-rest-end-time]");
  const restMainTime = document.querySelector("[data-rest-main-time]");
  const restRingProgress = document.querySelector("[data-rest-ring-progress]");
  const restToggleButton = document.querySelector("[data-rest-toggle]");
  const restCancelButton = document.querySelector("[data-rest-cancel]");

  const workoutMainTime = document.querySelector("[data-workout-main-time]");
  const workoutToggleButton = document.querySelector("[data-workout-toggle]");
  const workoutLapResetButton = document.querySelector(
    "[data-workout-lap-reset]",
  );
  const workoutLapsList = document.querySelector("[data-workout-laps-list]");

  const DEFAULT_REST_SECONDS = 90;
  const REST_RING_RADIUS = 96;
  const REST_RING_CIRCUMFERENCE = 2 * Math.PI * REST_RING_RADIUS;
  const ACTIVE_SESSION_STARTED_AT_PREFIX =
    "bora_treinar_active_session_started_at";

  const requestedMode = params.get("mode");
  const requestedSeconds = Number(params.get("seconds"));
  const initialRestSeconds =
    Number.isFinite(requestedSeconds) && requestedSeconds > 0
      ? Math.floor(requestedSeconds)
      : DEFAULT_REST_SECONDS;

  let activeMode = requestedMode === "workout" ? "workout" : "rest";

  let restInitialSeconds = initialRestSeconds;
  let restRemainingSeconds = restInitialSeconds;
  let restStartedAt = 0;
  let restExpectedEnd = 0;
  let restPausedAt = 0;
  let restAnimationFrame = null;
  let isRestRunning = false;
  let isRestComplete = false;

  let workoutStartedAt = 0;
  let workoutElapsedBeforeStart = 0;
  let workoutElapsedMs = 0;
  let workoutAnimationFrame = null;
  let isWorkoutRunning = false;
  let workoutLaps = [];
  let lastWorkoutDisplayValue = "";
  let focusTotalInterval = null;

  setupBackButton();
  setupRestRing();
  bindEvents();
  setMode(activeMode);
  resetRestTimer();
  setupFocusTotalTimer();
  renderWorkoutTime();
  renderWorkoutControls();
  renderWorkoutLaps();

  function bindEvents() {
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMode(button.getAttribute("data-timer-mode"));
      });
    });

    if (restToggleButton) {
      restToggleButton.addEventListener("click", toggleRestTimer);
    }

    if (restCancelButton) {
      restCancelButton.addEventListener("click", resetRestTimer);
    }

    if (workoutToggleButton) {
      workoutToggleButton.addEventListener("click", toggleWorkoutTimer);
    }

    if (workoutLapResetButton) {
      workoutLapResetButton.addEventListener("click", handleWorkoutLapReset);
    }
  }

  function setupBackButton() {
    if (!backButton || !workoutId) {
      return;
    }

    backButton.href = `./workout-session.html?id=${encodeURIComponent(
      workoutId,
    )}`;
  }

  function setupFocusTotalTimer() {
    renderFocusTotalTimer();

    if (!focusTotalTime || !workoutId) {
      return;
    }

    focusTotalInterval = window.setInterval(renderFocusTotalTimer, 1000);
  }

  function getReferrerWorkoutId() {
    try {
      if (!document.referrer) {
        return "";
      }

      const referrerUrl = new URL(document.referrer);

      if (!referrerUrl.pathname.endsWith("/workout-session.html")) {
        return "";
      }

      return referrerUrl.searchParams.get("id") || "";
    } catch {
      return "";
    }
  }

  function setMode(mode) {
    activeMode = mode === "workout" ? "workout" : "rest";

    modeButtons.forEach((button) => {
      const isActive = button.getAttribute("data-timer-mode") === activeMode;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    timerScreens.forEach((screen) => {
      const isActive = screen.getAttribute("data-timer-screen") === activeMode;
      screen.classList.toggle("active", isActive);
      screen.hidden = !isActive;
    });
  }

  function setupRestRing() {
    if (!restRingProgress) return;

    restRingProgress.style.strokeDasharray = String(REST_RING_CIRCUMFERENCE);
    restRingProgress.style.strokeDashoffset = "0";
  }

  function toggleRestTimer() {
    if (isRestComplete || restRemainingSeconds <= 0) {
      resetRestTimer();
    }

    if (isRestRunning) {
      pauseRestTimer();
      return;
    }

    startRestTimer();
  }

  function startRestTimer() {
    isRestRunning = true;
    isRestComplete = false;
    restStartedAt = performance.now();
    restExpectedEnd = restStartedAt + restRemainingSeconds * 1000;
    restPausedAt = 0;

    renderRestControls();
    cancelRestAnimationFrame();
    restAnimationFrame = window.requestAnimationFrame(tickRestTimer);
  }

  function pauseRestTimer() {
    isRestRunning = false;
    restPausedAt = performance.now();

    cancelRestAnimationFrame();
    renderRestControls();
  }

  function resetRestTimer() {
    cancelRestAnimationFrame();

    restRemainingSeconds = restInitialSeconds;
    restStartedAt = 0;
    restExpectedEnd = 0;
    restPausedAt = 0;
    isRestRunning = false;
    isRestComplete = false;

    renderRestTimer();
    renderRestControls();
  }

  function tickRestTimer(timestamp) {
    if (!isRestRunning) return;

    const remainingMs = Math.max(0, restExpectedEnd - timestamp);
    restRemainingSeconds = Math.ceil(remainingMs / 1000);

    renderRestTimer();

    if (remainingMs <= 0) {
      finishRestTimer();
      return;
    }

    restAnimationFrame = window.requestAnimationFrame(tickRestTimer);
  }

  function finishRestTimer() {
    cancelRestAnimationFrame();

    restRemainingSeconds = 0;
    isRestRunning = false;
    isRestComplete = true;

    renderRestTimer();
    renderRestControls();

    if (typeof showToast === "function") {
      showToast({
        title: "Descanso concluido",
        message: "Hora de voltar para a proxima serie.",
        type: "success",
      });
    }
  }

  function cancelRestAnimationFrame() {
    if (!restAnimationFrame) return;

    window.cancelAnimationFrame(restAnimationFrame);
    restAnimationFrame = null;
  }

  function renderRestTimer() {
    const progress = restInitialSeconds
      ? restRemainingSeconds / restInitialSeconds
      : 0;
    const elapsedProgress = 1 - progress;
    const offset = REST_RING_CIRCUMFERENCE * elapsedProgress;
    const endTimestamp = Date.now() + restRemainingSeconds * 1000;

    if (restMainTime) {
      restMainTime.textContent = formatClock(restRemainingSeconds);
    }

    if (restEndTime) {
      restEndTime.textContent = `Termina as ${formatEndTime(endTimestamp)}`;
    }

    if (restRingProgress) {
      restRingProgress.style.strokeDashoffset = String(offset);
    }

    document.body.classList.toggle("timer-rest-complete", isRestComplete);
  }

  function renderRestControls() {
    if (!restToggleButton) return;

    if (isRestRunning) {
      restToggleButton.textContent = "Pausar";
      restToggleButton.setAttribute("aria-label", "Pausar descanso");
      return;
    }

    if (restPausedAt > 0 && restRemainingSeconds > 0) {
      restToggleButton.textContent = "Retomar";
      restToggleButton.setAttribute("aria-label", "Retomar descanso");
      return;
    }

    if (isRestComplete) {
      restToggleButton.textContent = "Concluido";
      restToggleButton.setAttribute("aria-label", "Descanso concluido");
      return;
    }

    restToggleButton.textContent = "Iniciar";
    restToggleButton.setAttribute("aria-label", "Iniciar descanso");
  }

  function toggleWorkoutTimer() {
    if (isWorkoutRunning) {
      stopWorkoutTimer();
      return;
    }

    startWorkoutTimer();
  }

  function startWorkoutTimer() {
    isWorkoutRunning = true;
    workoutStartedAt = performance.now();

    renderWorkoutControls();
    cancelWorkoutAnimationFrame();
    workoutAnimationFrame = window.requestAnimationFrame(tickWorkoutTimer);
  }

  function stopWorkoutTimer() {
    isWorkoutRunning = false;
    workoutElapsedBeforeStart = workoutElapsedMs;

    cancelWorkoutAnimationFrame();
    renderWorkoutControls();
  }

  function resetWorkoutTimer() {
    isWorkoutRunning = false;
    workoutStartedAt = 0;
    workoutElapsedBeforeStart = 0;
    workoutElapsedMs = 0;
    workoutLaps = [];
    lastWorkoutDisplayValue = "";

    cancelWorkoutAnimationFrame();
    renderWorkoutTime();
    renderWorkoutControls();
    renderWorkoutLaps();
  }

  function tickWorkoutTimer(timestamp) {
    if (!isWorkoutRunning) return;

    workoutElapsedMs = workoutElapsedBeforeStart + (timestamp - workoutStartedAt);
    renderWorkoutTime();

    workoutAnimationFrame = window.requestAnimationFrame(tickWorkoutTimer);
  }

  function cancelWorkoutAnimationFrame() {
    if (!workoutAnimationFrame) return;

    window.cancelAnimationFrame(workoutAnimationFrame);
    workoutAnimationFrame = null;
  }

  function handleWorkoutLapReset() {
    if (isWorkoutRunning) {
      workoutLaps.unshift({
        number: workoutLaps.length + 1,
        elapsedMs: workoutElapsedMs,
      });

      renderWorkoutLaps();
      return;
    }

    if (workoutElapsedMs > 0) {
      resetWorkoutTimer();
    }
  }

  function renderWorkoutTime() {
    if (!workoutMainTime) return;

    const formattedTime = formatStopwatch(workoutElapsedMs);

    if (formattedTime === lastWorkoutDisplayValue) return;

    lastWorkoutDisplayValue = formattedTime;
    workoutMainTime.textContent = formattedTime;
  }

  function renderWorkoutControls() {
    if (workoutToggleButton) {
      workoutToggleButton.textContent = isWorkoutRunning ? "Parar" : "Iniciar";
      workoutToggleButton.setAttribute(
        "aria-label",
        isWorkoutRunning
          ? "Parar cronometro de treino"
          : "Iniciar cronometro de treino",
      );
    }

    if (!workoutLapResetButton) return;

    const shouldReset = !isWorkoutRunning && workoutElapsedMs > 0;

    workoutLapResetButton.textContent = shouldReset ? "Resetar" : "Volta";
    workoutLapResetButton.disabled = !isWorkoutRunning && workoutElapsedMs <= 0;
    workoutLapResetButton.setAttribute(
      "aria-label",
      shouldReset ? "Resetar cronometro" : "Registrar volta",
    );
  }

  function renderWorkoutLaps() {
    if (!workoutLapsList) return;

    if (!workoutLaps.length) {
      workoutLapsList.innerHTML = `
        <li class="workout-lap-row">
          <span>Nenhuma volta registrada</span>
          <strong>--:--,--</strong>
        </li>
      `;
      return;
    }

    workoutLapsList.innerHTML = workoutLaps
      .map((lap) => {
        return `
          <li class="workout-lap-row">
            <span>Volta ${lap.number}</span>
            <strong>${formatStopwatch(lap.elapsedMs)}</strong>
          </li>
        `;
      })
      .join("");
  }

  function renderFocusTotalTimer() {
    if (!focusTotalTime) {
      return;
    }

    const startedAt = getActiveWorkoutStartedAt();

    if (!startedAt) {
      focusTotalTime.textContent = "00:00";
      return;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    focusTotalTime.textContent = formatClock(elapsedSeconds);
  }

  function getActiveWorkoutStartedAt() {
    if (!workoutId) {
      return 0;
    }

    const storageKey = `${ACTIVE_SESSION_STARTED_AT_PREFIX}:${workoutId}`;
    const startedAt = Number(window.sessionStorage.getItem(storageKey) || 0);

    return Number.isFinite(startedAt) && startedAt > 0 ? startedAt : 0;
  }

  function formatClock(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }

  function formatEndTime(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(timestamp));
  }

  function formatStopwatch(milliseconds) {
    const totalCentiseconds = Math.floor(milliseconds / 10);
    const centiseconds = totalCentiseconds % 100;
    const totalSeconds = Math.floor(totalCentiseconds / 100);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0",
    )},${String(centiseconds).padStart(2, "0")}`;
  }
});
