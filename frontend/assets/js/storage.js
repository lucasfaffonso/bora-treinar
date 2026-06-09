/* =========================================================
   Local storage data layer
   ========================================================= */

(function (window) {
  "use strict";

  const WORKOUTS_KEY = "bora_treinar_workouts";
  const LEGACY_WORKOUTS_KEY = "bora_treinar_mock_workouts";

  const SESSIONS_KEY = "bora_treinar_workout_sessions";
  const LEGACY_SESSIONS_KEY = "bora_treinar_mock_workout_sessions";

  const EXERCISES_KEY = "bora_treinar_exercises";

  function readJSON(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);

      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function getStoredUserScopeId() {
    const userKey = window.APP_CONFIG?.STORAGE_KEYS?.USER || "bora_treinar_user";
    const user = readJSON(userKey, null);
    const rawUserId = user?.id || user?.email || "anonymous";

    return String(rawUserId)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, "_") || "anonymous";
  }

  function getScopedStorageKey(baseKey) {
    return `${baseKey}:${getStoredUserScopeId()}`;
  }

  function shouldReadLegacyCache() {
    return (
      getStoredUserScopeId() === "anonymous" ||
      window.APP_CONFIG?.FEATURES?.USE_LOCAL_AUTH === true
    );
  }

  function getStoredWorkouts() {
    const current = readJSON(getScopedStorageKey(WORKOUTS_KEY), null);

    if (Array.isArray(current)) {
      return current.map(normalizeWorkout).filter(Boolean);
    }

    if (!shouldReadLegacyCache()) {
      return [];
    }

    const legacy = readJSON(WORKOUTS_KEY, readJSON(LEGACY_WORKOUTS_KEY, []));

    const legacyWorkouts = Array.isArray(legacy)
      ? legacy.map(normalizeWorkout).filter(Boolean)
      : [];

    if (legacyWorkouts.length) {
      saveStoredWorkouts(legacyWorkouts);
      return legacyWorkouts;
    }

    return [];
  }

  function saveStoredWorkouts(workouts) {
    const normalizedWorkouts = Array.isArray(workouts)
      ? workouts.map(normalizeWorkout).filter(Boolean)
      : [];

    writeJSON(getScopedStorageKey(WORKOUTS_KEY), normalizedWorkouts);

    return normalizedWorkouts;
  }

  function createWorkout(data) {
    const now = new Date().toISOString();
    const workouts = getStoredWorkouts();

    const workout = normalizeWorkout({
      ...data,
      id: data.id || `workout-${Date.now()}`,
      status: data.status || "ACTIVE",
      createdAt: data.createdAt || now,
      updatedAt: now,
    });

    workouts.unshift(workout);
    saveStoredWorkouts(workouts);

    return workout;
  }

  function updateWorkout(id, data) {
    const workouts = getStoredWorkouts();
    const index = workouts.findIndex((workout) => workout.id === id);

    if (index < 0) {
      return null;
    }

    const updatedWorkout = normalizeWorkout({
      ...workouts[index],
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    });

    workouts[index] = updatedWorkout;
    saveStoredWorkouts(workouts);

    return updatedWorkout;
  }

  function deleteWorkout(id) {
    const workouts = getStoredWorkouts();

    const updatedWorkouts = workouts.filter((workout) => {
      return workout.id !== id;
    });

    saveStoredWorkouts(updatedWorkouts);

    return updatedWorkouts.length !== workouts.length;
  }

  function getWorkoutById(id) {
    if (!id) {
      return null;
    }

    return getStoredWorkouts().find((workout) => workout.id === id) || null;
  }

  function getStoredSessions() {
    const current = readJSON(getScopedStorageKey(SESSIONS_KEY), null);

    if (Array.isArray(current)) {
      return current.map(normalizeSession).filter(Boolean);
    }

    if (!shouldReadLegacyCache()) {
      return [];
    }

    const legacy = readJSON(SESSIONS_KEY, readJSON(LEGACY_SESSIONS_KEY, []));

    const legacySessions = Array.isArray(legacy)
      ? legacy.map(normalizeSession).filter(Boolean)
      : [];

    if (legacySessions.length) {
      saveStoredSessions(legacySessions);
      return legacySessions;
    }

    return [];
  }

  function saveStoredSessions(sessions) {
    const normalizedSessions = Array.isArray(sessions)
      ? sessions.map(normalizeSession).filter(Boolean)
      : [];

    writeJSON(getScopedStorageKey(SESSIONS_KEY), normalizedSessions);

    return normalizedSessions;
  }

  function saveStoredSession(session) {
    const sessions = getStoredSessions();

    const normalizedSession = normalizeSession({
      ...session,
      id: session.id || `session-${Date.now()}`,
      finishedAt: session.finishedAt || new Date().toISOString(),
    });

    sessions.unshift(normalizedSession);
    saveStoredSessions(sessions);

    return normalizedSession;
  }

  function getSessionsByWorkoutId(workoutId) {
    if (!workoutId) {
      return [];
    }

    return getStoredSessions().filter((session) => {
      return session.workoutId === workoutId;
    });
  }

  function getSessionById(id) {
    if (!id) {
      return null;
    }

    return (
      getStoredSessions().find((session) => {
        return session.id === id;
      }) || null
    );
  }

  function deleteSession(id) {
    if (!id) {
      return false;
    }

    const normalizedId = String(id);
    const sessions = getStoredSessions();

    const updatedSessions = sessions.filter((session) => {
      return String(session.id || "") !== normalizedId;
    });

    const deletedFromCurrent = updatedSessions.length !== sessions.length;

    if (deletedFromCurrent) {
      saveStoredSessions(updatedSessions);
    }

    const legacySessions = readJSON(LEGACY_SESSIONS_KEY, []);
    let deletedFromLegacy = false;

    if (Array.isArray(legacySessions)) {
      const updatedLegacySessions = legacySessions.filter((session) => {
        return String(session?.id || "") !== normalizedId;
      });

      deletedFromLegacy =
        updatedLegacySessions.length !== legacySessions.length;

      if (deletedFromLegacy) {
        writeJSON(LEGACY_SESSIONS_KEY, updatedLegacySessions);
      }
    }

    return deletedFromCurrent || deletedFromLegacy;
  }

  function clearCurrentUserWorkoutCache() {
    window.localStorage.removeItem(getScopedStorageKey(WORKOUTS_KEY));
    window.localStorage.removeItem(getScopedStorageKey(SESSIONS_KEY));
  }

  function getWorkoutStats() {
    const workouts = getStoredWorkouts();
    const sessions = getStoredSessions();
    const sessionsWithValidDates = sessions
      .map((session) => {
        return {
          session,
          finishedAtDate: new Date(session.finishedAt),
        };
      })
      .filter(({ finishedAtDate }) => {
        return !Number.isNaN(finishedAtDate.getTime());
      });
    const sortedSessions = [...sessionsWithValidDates].sort((a, b) => {
      return b.finishedAtDate.getTime() - a.finishedAtDate.getTime();
    });
    const latestSession = sortedSessions[0]?.session || null;

    const now = new Date();
    const weekStart = new Date(now);

    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - now.getDay());

    const sessionsThisWeek = sessionsWithValidDates.filter(({ finishedAtDate }) => {
      return finishedAtDate >= weekStart;
    });

    const totalDurationSeconds = sessions.reduce((sum, session) => {
      return sum + toPositiveNumber(session.durationSeconds, 0);
    }, 0);

    const totalXp = sessions.reduce((sum, session) => {
      return sum + toPositiveNumber(session.xp, 0);
    }, 0);

    const totalCompletedSets = sessions.reduce((sum, session) => {
      return sum + toPositiveNumber(session.completedSets, 0);
    }, 0);

    const totalSets = sessions.reduce((sum, session) => {
      return sum + toPositiveNumber(session.totalSets, 0);
    }, 0);

    const longestSession = sessions.reduce((currentLongest, session) => {
      const currentDuration = toPositiveNumber(
        currentLongest?.durationSeconds,
        0,
      );
      const sessionDuration = toPositiveNumber(session.durationSeconds, 0);

      return sessionDuration > currentDuration ? session : currentLongest;
    }, null);

    return {
      totalWorkouts: workouts.length,
      completedSessions: sessions.length,
      sessionsThisWeek: sessionsThisWeek.length,
      totalDurationSeconds,
      averageDurationSeconds: sessions.length
        ? Math.round(totalDurationSeconds / sessions.length)
        : 0,
      totalXp,
      totalCompletedSets,
      totalSets,
      completionRatePercent: totalSets
        ? Math.round((totalCompletedSets / totalSets) * 100)
        : 0,
      currentStreakDays: calculateCurrentStreakDays(sessions),
      latestSessionAt: latestSession?.finishedAt || "",
      latestSessionWorkoutName: latestSession?.workoutName || "",
      longestSessionSeconds: longestSession?.durationSeconds || 0,
      longestSessionWorkoutName: longestSession?.workoutName || "",
    };
  }

  function calculateCurrentStreakDays(sessions) {
    const sessionDateKeys = new Set(
      sessions
        .map((session) => getLocalDateKey(session.finishedAt))
        .filter(Boolean),
    );

    if (!sessionDateKeys.size) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    const todayKey = getLocalDateKey(startDate);

    if (!sessionDateKeys.has(todayKey)) {
      startDate.setDate(startDate.getDate() - 1);
    }

    let streakDays = 0;
    const cursor = new Date(startDate);

    while (sessionDateKeys.has(getLocalDateKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streakDays;
  }

  function getLocalDateKey(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getStoredExercises() {
    const exercises = readJSON(EXERCISES_KEY, []);

    if (!Array.isArray(exercises)) {
      return [];
    }

    return exercises.map(normalizeLibraryExercise).filter(Boolean);
  }

  function saveStoredExercises(exercises) {
    const normalizedExercises = Array.isArray(exercises)
      ? exercises.map(normalizeLibraryExercise).filter(Boolean)
      : [];

    writeJSON(EXERCISES_KEY, normalizedExercises);

    return normalizedExercises;
  }

  function createExercise(data) {
    const now = new Date().toISOString();
    const exercises = getStoredExercises();

    const exercise = normalizeLibraryExercise({
      ...data,
      id: data.id || `exercise-${Date.now()}`,
      createdAt: data.createdAt || now,
      updatedAt: now,
    });

    exercises.unshift(exercise);
    saveStoredExercises(exercises);

    return exercise;
  }

  function deleteExercise(id) {
    const exercises = getStoredExercises();

    const updatedExercises = exercises.filter((exercise) => {
      return exercise.id !== id;
    });

    saveStoredExercises(updatedExercises);

    return updatedExercises.length !== exercises.length;
  }

  function normalizeLibraryExercise(data) {
    if (!data || typeof data !== "object") {
      return null;
    }

    const now = new Date().toISOString();

    return {
      id: String(data.id || `exercise-${Date.now()}`),
      name: String(data.name || "").trim(),
      muscleGroup: String(data.muscleGroup || "").trim(),
      equipment: String(data.equipment || "").trim(),
      notes: String(data.notes || "").trim(),
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || data.createdAt || now,
    };
  }

  function normalizeWorkout(data) {
    if (!data || typeof data !== "object") {
      return null;
    }

    const now = new Date().toISOString();

    const exercises = Array.isArray(data.exercises)
      ? data.exercises.map(normalizeExercise).filter(Boolean)
      : [];

    return {
      id: String(data.id || `workout-${Date.now()}`),
      name: String(data.name || "").trim(),
      description: String(data.description || "").trim(),
      goal: String(data.goal || "").trim(),
      goalLabel: String(data.goalLabel || data.goal || "Não definido").trim(),
      level: String(data.level || "").trim(),
      levelLabel: String(
        data.levelLabel || data.level || "Não definido",
      ).trim(),
      frequency: String(data.frequency || "").trim(),
      frequencyLabel: String(
        data.frequencyLabel || data.frequency || "Não definida",
      ).trim(),
      status: String(data.status || "ACTIVE").trim(),
      progress: toPositiveNumber(data.progress, 0),
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || data.createdAt || now,
      exercises,
    };
  }

  function normalizeExercise(exercise, index) {
    if (!exercise || typeof exercise !== "object") {
      return null;
    }

    const name = String(exercise.exerciseName || exercise.name || "").trim();
    const sets = toPositiveNumber(exercise.sets, 0);
    const reps = String(exercise.reps || "").trim();
    const rest = String(exercise.rest || exercise.restSeconds || "").trim();
    const restSeconds = parseRestSeconds(exercise.restSeconds || rest);

    if (!name && !sets && !reps && !restSeconds) {
      return null;
    }

    return {
      order: toPositiveNumber(exercise.exerciseOrder ?? exercise.order, index + 1),
      libraryExerciseId: String(exercise.libraryExerciseId || ""),
      name,
      muscleGroup: String(exercise.muscleGroup || "").trim(),
      equipment: String(exercise.equipment || "").trim(),
      notes: String(exercise.notes || "").trim(),
      sets,
      reps,
      rest,
      restSeconds,
    };
  }

  function normalizeSession(session) {
    if (!session || typeof session !== "object") {
      return null;
    }

    const exercises = Array.isArray(session.exercises)
      ? session.exercises.map(normalizeSessionExercise).filter(Boolean)
      : [];

    return {
      id: String(session.id || `session-${Date.now()}`),
      workoutId: String(session.workoutId || ""),
      workoutName: String(session.workoutName || "Treino cadastrado"),
      finishedAt: session.finishedAt || new Date().toISOString(),
      durationSeconds: toPositiveNumber(session.durationSeconds, 0),
      progress: toPositiveNumber(session.progress, 0),
      completedSets: toPositiveNumber(session.completedSets, 0),
      totalSets: toPositiveNumber(session.totalSets, 0),
      xp: toPositiveNumber(session.xp, 0),
      exercises,
    };
  }

  function normalizeSessionExercise(exercise, index) {
    if (!exercise || typeof exercise !== "object") {
      return null;
    }

    const setStatuses = Array.isArray(exercise.setStatuses)
      ? exercise.setStatuses.map(Boolean)
      : [];
    const totalSets = toPositiveNumber(
      exercise.totalSets ?? exercise.sets,
      setStatuses.length,
    );
    const completedSets = toPositiveNumber(
      exercise.completedSets,
      setStatuses.filter(Boolean).length,
    );
    const name = String(exercise.name || "").trim();

    if (!name && !totalSets && !completedSets) {
      return null;
    }

    return {
      order: toPositiveNumber(exercise.order, index + 1),
      libraryExerciseId: String(exercise.libraryExerciseId || ""),
      name,
      muscleGroup: String(exercise.muscleGroup || "").trim(),
      equipment: String(exercise.equipment || "").trim(),
      notes: String(exercise.notes || "").trim(),
      sets: totalSets,
      totalSets,
      completedSets,
      reps: String(exercise.reps || "").trim(),
      rest: String(exercise.rest || exercise.restSeconds || "").trim(),
      restSeconds: parseRestSeconds(exercise.restSeconds || exercise.rest),
      setStatuses,
    };
  }

  function parseRestSeconds(value) {
    if (typeof value === "number") {
      return Math.max(0, Math.round(value));
    }

    const text = String(value || "")
      .toLowerCase()
      .trim();

    if (!text) {
      return 0;
    }

    const number = Number.parseInt(text, 10);

    if (!Number.isFinite(number)) {
      return 0;
    }

    if (text.includes("min")) {
      return number * 60;
    }

    return number;
  }

  function toPositiveNumber(value, fallback) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
      return fallback;
    }

    return Math.round(number);
  }

  function formatDuration(seconds) {
    const normalizedSeconds = toPositiveNumber(seconds, 0);
    const minutes = Math.floor(normalizedSeconds / 60);
    const remainingSeconds = normalizedSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  window.BoraTreinarStorage = {
    keys: {
      WORKOUTS_KEY,
      SESSIONS_KEY,
      EXERCISES_KEY,
    },
    getScopedStorageKey,
    clearCurrentUserWorkoutCache,
    getStoredExercises,
    saveStoredExercises,
    createExercise,
    deleteExercise,
    getStoredWorkouts,
    saveStoredWorkouts,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    getWorkoutById,
    getStoredSessions,
    saveStoredSessions,
    saveStoredSession,
    getSessionsByWorkoutId,
    getSessionById,
    deleteSession,
    getWorkoutStats,
    parseRestSeconds,
    formatDuration,
  };
})(window);
