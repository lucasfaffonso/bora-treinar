/* =========================================================
   Profile page
   Usa apenas dados salvos do usuário e estatísticas reais locais.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const main = document.querySelector(".page-content");

  if (!main) {
    console.warn("Conteúdo da página de perfil não encontrado.");
    return;
  }

  const user = getSafeCurrentUser();
  const stats = storage?.getWorkoutStats
    ? storage.getWorkoutStats()
    : {
        totalWorkouts: 0,
        completedSessions: 0,
        sessionsThisWeek: 0,
        totalDurationSeconds: 0,
        averageDurationSeconds: 0,
        totalXp: 0,
        currentStreakDays: 0,
        totalCompletedSets: 0,
        totalSets: 0,
        completionRatePercent: 0,
        latestSessionAt: "",
        latestSessionWorkoutName: "",
        longestSessionSeconds: 0,
        longestSessionWorkoutName: "",
      };

  renderProfile(user, stats);

  function renderProfile(currentUser, currentStats) {
    const name = currentUser?.name || "Usuário";
    const email = currentUser?.email || "E-mail não cadastrado";
    const role = formatRole(currentUser?.role);
    const premiumStatus = currentUser?.premiumActive ? "Premium" : "Gratuito";
    const hasWorkouts = currentStats.totalWorkouts > 0;
    const hasSessions = currentStats.completedSessions > 0;
    const completionSummary = currentStats.totalSets
      ? `${currentStats.totalCompletedSets}/${currentStats.totalSets} séries`
      : "Sem séries registradas";

    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Perfil</h2>
          <p class="page-description">
            Dados salvos da sua conta e resumo real da sua atividade.
          </p>
        </div>

        <a class="btn btn-outline" href="../settings/settings.html">
          <i class="bi bi-gear" aria-hidden="true"></i>
          Configurações
        </a>
      </section>

      <section class="profile-layout">
        <article class="profile-card">
          <div class="profile-avatar" aria-hidden="true">
            ${escapeHTML(getInitials(name))}
          </div>

          <h3 class="profile-name">${escapeHTML(name)}</h3>

          <p class="profile-bio">
            ${escapeHTML(email)}
          </p>

          <div class="profile-stats">
            <div class="profile-stat">
              <strong class="profile-stat-value">
                ${escapeHTML(premiumStatus)}
              </strong>
              <span class="profile-stat-label">Plano</span>
            </div>

            <div class="profile-stat">
              <strong class="profile-stat-value">
                ${escapeHTML(role)}
              </strong>
              <span class="profile-stat-label">Perfil</span>
            </div>

            <div class="profile-stat">
              <strong class="profile-stat-value">
                ${formatDays(currentStats.currentStreakDays)}
              </strong>
              <span class="profile-stat-label">Sequência</span>
            </div>
          </div>
        </article>

        <div class="grid grid-2">
          <article class="stats-card">
            <div class="stats-card-header">
              <span class="stats-card-title">Treinos cadastrados</span>
              <span class="stats-card-icon">
                <i class="bi bi-activity" aria-hidden="true"></i>
              </span>
            </div>

            <strong class="stats-card-value">
              ${currentStats.totalWorkouts}
            </strong>

            <p class="stats-card-description">
              Rotinas criadas por você.
            </p>
          </article>

          <article class="stats-card">
            <div class="stats-card-header">
              <span class="stats-card-title">Sessões concluídas</span>
              <span class="stats-card-icon">
                <i class="bi bi-check2-circle" aria-hidden="true"></i>
              </span>
            </div>

            <strong class="stats-card-value">
              ${currentStats.completedSessions}
            </strong>

            <p class="stats-card-description">
              Sessões registradas no histórico.
            </p>
          </article>

          <article class="stats-card">
            <div class="stats-card-header">
              <span class="stats-card-title">Esta semana</span>
              <span class="stats-card-icon">
                <i class="bi bi-calendar-check" aria-hidden="true"></i>
              </span>
            </div>

            <strong class="stats-card-value">
              ${currentStats.sessionsThisWeek}
            </strong>

            <p class="stats-card-description">
              Sessões registradas na semana atual.
            </p>
          </article>

          <article class="stats-card">
            <div class="stats-card-header">
              <span class="stats-card-title">Tempo total</span>
              <span class="stats-card-icon">
                <i class="bi bi-stopwatch" aria-hidden="true"></i>
              </span>
            </div>

            <strong class="stats-card-value">
              ${formatDuration(currentStats.totalDurationSeconds)}
            </strong>

            <p class="stats-card-description">
              Somado apenas a partir das sessões registradas.
            </p>
          </article>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">Resumo real de progresso</h2>
            <p class="page-description">
              Indicadores calculados a partir dos treinos e sessões salvos no seu dispositivo.
            </p>
          </div>
        </div>

        <div class="profile-progress-grid">
          <article class="content-card profile-progress-card">
            <div class="content-card-header">
              <div>
                <span class="badge ${hasSessions ? "badge-success" : "badge-info"}">
                  ${hasSessions ? "Histórico real" : "Estado vazio"}
                </span>

                <h3 class="content-card-title mt-md">
                  ${hasSessions ? "Última sessão registrada" : "Nenhuma sessão concluída ainda"}
                </h3>

                <p class="content-card-description mt-sm">
                  ${
                    hasSessions
                      ? `${escapeHTML(currentStats.latestSessionWorkoutName || "Treino cadastrado")} - ${escapeHTML(formatDate(currentStats.latestSessionAt))}`
                      : "Finalize um treino para que o perfil comece a mostrar seu progresso real."
                  }
                </p>
              </div>
            </div>
          </article>

          <article class="content-card profile-progress-card">
            <div class="content-card-header">
              <div>
                <span class="badge badge-info">Conclusão</span>

                <h3 class="content-card-title mt-md">
                  ${currentStats.completionRatePercent}%
                </h3>

                <p class="content-card-description mt-sm">
                  ${escapeHTML(completionSummary)} concluídas no histórico salvo.
                </p>
              </div>
            </div>
          </article>

          <article class="content-card profile-progress-card">
            <div class="content-card-header">
              <div>
                <span class="badge badge-info">Sessão mais longa</span>

                <h3 class="content-card-title mt-md">
                  ${formatDuration(currentStats.longestSessionSeconds)}
                </h3>

                <p class="content-card-description mt-sm">
                  ${
                    hasSessions
                      ? escapeHTML(currentStats.longestSessionWorkoutName || "Treino cadastrado")
                      : "Ainda não há duração registrada."
                  }
                </p>
              </div>
            </div>
          </article>

          <article class="content-card profile-progress-card">
            <div class="content-card-header">
              <div>
                <span class="badge badge-info">Tempo médio</span>

                <h3 class="content-card-title mt-md">
                  ${formatDuration(currentStats.averageDurationSeconds)}
                </h3>

                <p class="content-card-description mt-sm">
                  Média das sessões concluídas.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">Dados ainda não implementados</h2>
            <p class="page-description">
              Esta área não exibe conquistas, ranking ou métricas que ainda não foram implementadas.
            </p>
          </div>
        </div>

        <article class="content-card">
          <div class="content-card-header">
            <div>
              <span class="badge badge-info">Dados reais</span>

              <h3 class="content-card-title mt-md">
                Perfil conectado apenas aos dados existentes.
              </h3>

              <p class="content-card-description mt-sm">
                Quando conquistas, ranking e preferências forem implementados, eles aparecerão aqui com dados reais.
              </p>
            </div>
          </div>

          <div class="content-card-body">
            <a class="btn btn-primary" href="${hasWorkouts ? "../workouts/workouts.html" : "../workouts/workout-form.html"}">
              <i class="bi bi-activity" aria-hidden="true"></i>
              ${hasWorkouts ? "Ver treinos" : "Criar primeiro treino"}
            </a>
          </div>
        </article>
      </section>
    `;
  }

  function getSafeCurrentUser() {
    if (typeof getCurrentUser === "function") {
      return getCurrentUser();
    }

    return null;
  }

  function getInitials(name) {
    const words = String(name || "Usuário")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) {
      return "U";
    }

    return words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  function formatRole(role) {
    if (role === "ADMIN") {
      return "Admin";
    }

    return "Usuário";
  }

  function formatDuration(seconds) {
    if (storage?.formatDuration) {
      return storage.formatDuration(seconds);
    }

    const normalizedSeconds = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(normalizedSeconds / 60);
    const remainingSeconds = normalizedSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  function formatDays(days) {
    const normalizedDays = Number(days || 0);

    return normalizedDays === 1
      ? "1 dia"
      : `${normalizedDays} dias`;
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Data não registrada";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
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
