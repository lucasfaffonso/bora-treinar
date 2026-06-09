/* =========================================================
   Personal ranking
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const totalXpElement = document.querySelector("[data-ranking-total-xp]");
  const sessionsElement = document.querySelector("[data-ranking-sessions]");
  const bestElement = document.querySelector("[data-ranking-best]");
  const rankingList = document.querySelector("[data-ranking-list]");

  if (!storage || !rankingList) {
    return;
  }

  const ranking = getWorkoutRanking();
  const totalXp = ranking.reduce((sum, item) => sum + item.xp, 0);
  const totalSessions = ranking.reduce((sum, item) => sum + item.sessions, 0);

  if (totalXpElement) {
    totalXpElement.textContent = String(totalXp);
  }

  if (sessionsElement) {
    sessionsElement.textContent = String(totalSessions);
  }

  if (bestElement) {
    bestElement.textContent = ranking[0]?.name || "—";
  }

  rankingList.innerHTML = ranking.length
    ? ranking.map(renderRankingItem).join("")
    : createEmptyState();

  function getWorkoutRanking() {
    const workoutsById = new Map(
      storage.getStoredWorkouts().map((workout) => [workout.id, workout]),
    );
    const sessions = storage.getStoredSessions();
    const rankingByWorkout = new Map();

    sessions.forEach((session) => {
      const workout = workoutsById.get(session.workoutId);
      const fallbackId = session.workoutId || session.workoutName || session.id;
      const key = workout?.id || fallbackId;

      if (!key) {
        return;
      }

      const current = rankingByWorkout.get(key) || {
        id: key,
        name: workout?.name || session.workoutName || "Treino cadastrado",
        hasWorkout: Boolean(workout),
        xp: 0,
        sessions: 0,
        durationSeconds: 0,
      };

      current.xp += toNumber(session.xp);
      current.sessions += 1;
      current.durationSeconds += toNumber(session.durationSeconds);

      rankingByWorkout.set(key, current);
    });

    return Array.from(rankingByWorkout.values()).sort((a, b) => {
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }

      if (b.sessions !== a.sessions) {
        return b.sessions - a.sessions;
      }

      return b.durationSeconds - a.durationSeconds;
    });
  }

  function renderRankingItem(item, index) {
    const position = index + 1;
    const positionClass = position <= 3 ? "top" : "";
    const href = item.hasWorkout
      ? `./workouts/workout-detail.html?id=${encodeURIComponent(item.id)}`
      : "./workouts/workouts.html";

    return `
      <article class="ranking-item">
        <span class="ranking-position ${positionClass}">
          ${position}
        </span>

        <div class="ranking-user">
          <span class="ranking-avatar">
            ${escapeHTML(getInitials(item.name))}
          </span>

          <div>
            <h3 class="ranking-name">${escapeHTML(item.name)}</h3>
            <p class="ranking-subtitle">
              ${item.sessions} sessão${item.sessions === 1 ? "" : "es"} •
              ${escapeHTML(storage.formatDuration(item.durationSeconds))}
            </p>
          </div>
        </div>

        <div class="ranking-xp">
          <strong>${item.xp} XP</strong>
          <a class="btn btn-outline btn-sm mt-sm" href="${escapeAttribute(href)}">
            Abrir
          </a>
        </div>
      </article>
    `;
  }

  function createEmptyState() {
    return `
      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Estado vazio</span>
            <h3 class="content-card-title mt-md">
              Nenhuma sessão registrada.
            </h3>
            <p class="content-card-description mt-sm">
              Finalize treinos para gerar XP e montar seu ranking pessoal.
            </p>
          </div>
        </div>

        <div class="content-card-body">
          <a class="btn btn-primary" href="./workouts/workouts.html">
            Ver treinos
          </a>
        </div>
      </article>
    `;
  }

  function getInitials(value) {
    const parts = String(value || "BT")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  function toNumber(value) {
    const number = Number(value || 0);

    return Number.isFinite(number) && number > 0 ? number : 0;
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
