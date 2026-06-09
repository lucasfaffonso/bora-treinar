/* =========================================================
   Local workout session fallback
   Permite executar sessão no GitHub Pages/S3 sem backend online.
   ========================================================= */

(function (window, document) {
  "use strict";

  const ACTIVE_LOCAL_SESSION_PREFIX = "bora_treinar_active_local_session";
  const LOCAL_SESSION_ID_PREFIX = "local-session";

  const originalApiGet = window.apiGet;
  const originalApiPost = window.apiPost;
  const originalApiPatch = window.apiPatch;

  function shouldRun() {
    return Boolean(
      document.body?.dataset?.page === "workout-session" &&
        typeof window.isLocalAuthEnabled === "function" &&
        window.isLocalAuthEnabled(),
    );
  }

  if (!shouldRun()) {
    return;
  }

  const storage = window.BoraTreinarStorage;

  if (!storage) {
    return;
  }

  installLocalApiBridge();
  installLocalSessionStorageBridge();
  document.addEventListener("DOMContentLoaded", updateLocalCopy);

  function installLocalApiBridge() {
    window.apiGet = async function apiGetLocalBridge(endpoint, ...args) {
      const handled = handleLocalGet(endpoint);

      if (handled.handled) {
        return handled.response;
      }

      if (typeof originalApiGet === "function") {
        return originalApiGet.call(this, endpoint, ...args);
      }

      throw new Error("Recurso indisponível no modo local.");
    };

    window.apiPost = async function apiPostLocalBridge(endpoint, body, ...args) {
      const handled = handleLocalPost(endpoint, body);

      if (handled.handled) {
        return handled.response;
      }

      if (typeof originalApiPost === "function") {
        return originalApiPost.call(this, endpoint, body, ...args);
      }

      throw new Error("Recurso indisponível no modo local.");
    };

    window.apiPatch = async function apiPatchLocalBridge(endpoint, body, ...args) {
      const handled = handleLocalPatch(endpoint, body);

      if (handled.handled) {
        return handled.response;
      }

      if (typeof originalApiPatch === "function") {
        return originalApiPatch.call(this, endpoint, body, ...args);
      }

      throw new Error("Recurso indisponível no modo local.");
    };
  }

  function installLocalSessionStorageBridge() {
    if (typeof storage.saveStoredSession !== "function") {
      return;
    }

    const originalSaveStoredSession = storage.saveStoredSession.bind(storage);

    storage.saveStoredSession = function saveStoredLocalSession(session) {
      if (!shouldRun()) {
        return originalSaveStoredSession(session);
      }

      const activeSession = findActiveLocalSession({
        workoutId: session?.workoutId,
        sessionId: session?.id,
      });
      const finishedAt =
        session?.finishedAt || activeSession?.finishedAt || new Date().toISOString();
      const enrichedSession = {
        ...session,
        id: session?.id || activeSession?.id || buildLocalSessionId(session?.workoutId),
        workoutId: session?.workoutId || activeSession?.workoutId || "",
        workoutName:
          session?.workoutName || activeSession?.workoutName || "Treino cadastrado",
        startedAt: activeSession?.startedAtIso || activeSession?.startedAt || finishedAt,
        finishedAt,
        source: "LOCAL",
        status: "FINISHED",
      };

      const savedSession = originalSaveStoredSession(enrichedSession);
      persistLocalSessionMetadata(enrichedSession);
      clearActiveLocalSession(enrichedSession.workoutId);

      return {
        ...savedSession,
        ...enrichedSession,
      };
    };
  }

  function handleLocalGet(endpoint) {
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    const workoutMatch = normalizedEndpoint.match(/^workouts\/([^/]+)$/);
    const workoutSessionsMatch = normalizedEndpoint.match(
      /^workouts\/([^/]+)\/sessions$/,
    );
    const sessionMatch = normalizedEndpoint.match(/^workout-sessions\/([^/]+)$/);

    if (workoutMatch) {
      const workoutId = decodeURIComponent(workoutMatch[1]);
      const workout = storage.getWorkoutById?.(workoutId) || null;

      if (!workout) {
        throw new Error("Treino não encontrado neste navegador.");
      }

      return ok(workout);
    }

    if (workoutSessionsMatch) {
      const workoutId = decodeURIComponent(workoutSessionsMatch[1]);
      const activeSession = getActiveLocalSession(workoutId);

      return ok(activeSession ? [activeSession] : []);
    }

    if (sessionMatch) {
      const sessionId = decodeURIComponent(sessionMatch[1]);
      const activeSession = findActiveLocalSession({ sessionId });
      const storedSession = storage.getSessionById?.(sessionId) || null;

      return ok(activeSession || storedSession || null);
    }

    return pass();
  }

  function handleLocalPost(endpoint) {
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    const sessionStartMatch = normalizedEndpoint.match(/^workouts\/([^/]+)\/sessions$/);

    if (!sessionStartMatch) {
      return pass();
    }

    const workoutId = decodeURIComponent(sessionStartMatch[1]);
    const workout = storage.getWorkoutById?.(workoutId) || null;

    if (!workout) {
      throw new Error("Treino não encontrado neste navegador.");
    }

    const session = getActiveLocalSession(workoutId) || createActiveLocalSession(workout);

    return ok(session);
  }

  function handleLocalPatch(endpoint, body) {
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    const finishMatch = normalizedEndpoint.match(
      /^workout-sessions\/([^/]+)\/finish$/,
    );
    const cancelMatch = normalizedEndpoint.match(
      /^workout-sessions\/([^/]+)\/cancel$/,
    );

    if (finishMatch) {
      const sessionId = decodeURIComponent(finishMatch[1]);
      const activeSession = findActiveLocalSession({ sessionId });
      const finishedAt = new Date().toISOString();
      const finishedSession = {
        ...(activeSession || {}),
        id: sessionId,
        finishedAt,
        durationSeconds: Number(body?.durationSeconds || 0),
        xpEarned: Number(body?.xpEarned || 0),
        status: "FINISHED",
        source: "LOCAL",
      };

      if (finishedSession.workoutId) {
        saveActiveLocalSession(finishedSession.workoutId, finishedSession);
      }

      return ok(finishedSession);
    }

    if (cancelMatch) {
      const sessionId = decodeURIComponent(cancelMatch[1]);
      const activeSession = findActiveLocalSession({ sessionId });

      if (activeSession?.workoutId) {
        clearActiveLocalSession(activeSession.workoutId);
      }

      return ok({
        ...(activeSession || {}),
        id: sessionId,
        status: "CANCELLED",
        source: "LOCAL",
      });
    }

    return pass();
  }

  function createActiveLocalSession(workout) {
    const startedAt = Date.now();
    const session = {
      id: buildLocalSessionId(workout.id),
      workoutId: String(workout.id || ""),
      workoutName: workout.name || "Treino cadastrado",
      startedAt,
      startedAtIso: new Date(startedAt).toISOString(),
      status: "IN_PROGRESS",
      source: "LOCAL",
      updatedAt: new Date().toISOString(),
    };

    saveActiveLocalSession(workout.id, session);

    return session;
  }

  function getActiveLocalSession(workoutId) {
    try {
      const session = JSON.parse(
        window.localStorage.getItem(getActiveLocalSessionKey(workoutId)) || "null",
      );

      return String(session?.workoutId || "") === String(workoutId) ? session : null;
    } catch {
      return null;
    }
  }

  function findActiveLocalSession({ workoutId = "", sessionId = "" } = {}) {
    if (workoutId) {
      return getActiveLocalSession(workoutId);
    }

    if (!sessionId) {
      return null;
    }

    const prefix = `${ACTIVE_LOCAL_SESSION_PREFIX}:${getCurrentUserScopeId()}:`;

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key?.startsWith(prefix)) {
        continue;
      }

      try {
        const session = JSON.parse(window.localStorage.getItem(key) || "null");

        if (String(session?.id || "") === String(sessionId)) {
          return session;
        }
      } catch {
        // Ignora registros inválidos do navegador.
      }
    }

    return null;
  }

  function saveActiveLocalSession(workoutId, session) {
    if (!workoutId || !session) return;

    window.localStorage.setItem(
      getActiveLocalSessionKey(workoutId),
      JSON.stringify({
        ...session,
        workoutId: String(workoutId),
        source: "LOCAL",
        updatedAt: new Date().toISOString(),
      }),
    );
  }

  function clearActiveLocalSession(workoutId) {
    if (!workoutId) return;

    window.localStorage.removeItem(getActiveLocalSessionKey(workoutId));
  }

  function persistLocalSessionMetadata(session) {
    const sessionsKey = storage.getScopedStorageKey?.(storage.keys?.SESSIONS_KEY);

    if (!sessionsKey || !session?.id) {
      return;
    }

    try {
      const sessions = JSON.parse(window.localStorage.getItem(sessionsKey) || "[]");

      if (!Array.isArray(sessions)) {
        return;
      }

      const index = sessions.findIndex((item) => String(item?.id) === String(session.id));

      if (index < 0) {
        return;
      }

      sessions[index] = {
        ...sessions[index],
        startedAt: session.startedAt,
        source: "LOCAL",
        status: "FINISHED",
      };

      window.localStorage.setItem(sessionsKey, JSON.stringify(sessions));
    } catch {
      // A sessão normalizada já foi salva; metadados extras são melhoria visual.
    }
  }

  function getActiveLocalSessionKey(workoutId) {
    return `${ACTIVE_LOCAL_SESSION_PREFIX}:${getCurrentUserScopeId()}:${workoutId}`;
  }

  function getCurrentUserScopeId() {
    const user = window.Auth?.getCurrentUser?.() || getStoredConfigUser();
    const scope = String(user?.id || user?.email || "anonymous").trim().toLowerCase();

    return scope.replace(/[^a-z0-9@._-]/g, "_") || "anonymous";
  }

  function getStoredConfigUser() {
    try {
      const userKey = window.APP_CONFIG?.STORAGE_KEYS?.USER || "bora_treinar_user";

      return JSON.parse(window.localStorage.getItem(userKey) || "null");
    } catch {
      return null;
    }
  }

  function buildLocalSessionId(workoutId) {
    return `${LOCAL_SESSION_ID_PREFIX}-${workoutId || "workout"}-${Date.now()}`;
  }

  function normalizeEndpoint(endpoint) {
    return String(endpoint || "")
      .split("?")[0]
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
  }

  function ok(data) {
    return {
      handled: true,
      response: { data },
    };
  }

  function pass() {
    return {
      handled: false,
      response: null,
    };
  }

  function updateLocalCopy() {
    window.setTimeout(() => {
      const heroDescription = document.querySelector(".workout-session-hero p");
      const currentDescription = document.querySelector(
        ".workout-session-main .content-card-description",
      );

      if (heroDescription && /backend/i.test(heroDescription.textContent || "")) {
        heroDescription.textContent =
          "Sessão local iniciada a partir de um treino salvo neste navegador.";
      }

      if (currentDescription && /backend/i.test(currentDescription.textContent || "")) {
        currentDescription.textContent =
          "Acompanhe a sessão local, marque séries e controle o descanso.";
      }
    }, 0);
  }
})(window, document);
