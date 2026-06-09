/* =========================================================
   Community preview polish
   - Complementa a página de Comunidades sem alterar endpoints.
   - Adiciona desafios visuais e resumo real do usuário.
   - Mantém botões e badges sincronizados após participar/sair.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const focusPanel = document.querySelector("[data-community-focus-panel]");
  const focusTitle = document.querySelector("[data-community-focus-title]");
  const focusStatus = document.querySelector("[data-community-focus-status]");
  const focusUserStatus = document.querySelector("[data-community-focus-user-status]");
  const focusToggle = document.querySelector("[data-community-focus-toggle]");
  const joinedCounter = document.querySelector("[data-communities-joined]");

  if (!focusPanel || !focusTitle) {
    return;
  }

  const COMMUNITY_PREVIEWS = {
    "Constância da semana": {
      challengeTitle: "Desafio ativo",
      challengeText: "Treine 3 vezes nesta semana e registre cada sessão para manter o ritmo.",
      progressLabel: "Meta sugerida",
      progressValue: "3 treinos",
    },
    "Hipertrofia e força": {
      challengeTitle: "Desafio ativo",
      challengeText: "Complete uma sessão com todas as séries registradas e acompanhe sua evolução.",
      progressLabel: "Meta sugerida",
      progressValue: "100% da sessão",
    },
    "Primeiros treinos": {
      challengeTitle: "Desafio ativo",
      challengeText: "Finalize seu primeiro treino da semana e mantenha uma rotina simples de evolução.",
      progressLabel: "Meta sugerida",
      progressValue: "1 treino completo",
    },
    "Ranking entre amigos": {
      challengeTitle: "Desafio ativo",
      challengeText: "Some XP com treinos concluídos e acompanhe sua evolução no grupo.",
      progressLabel: "Meta sugerida",
      progressValue: "+50 XP",
    },
  };

  ensurePreviewMarkup();
  bindPreviewEvents();
  renderPreview();
  syncCommunityToggleVisualState();

  function ensurePreviewMarkup() {
    if (focusPanel.querySelector("[data-community-preview-grid]")) {
      return;
    }

    const preview = document.createElement("div");
    preview.className = "community-preview-grid";
    preview.setAttribute("data-community-preview-grid", "");
    preview.innerHTML = `
      <article class="community-preview-card community-challenge-card">
        <div class="community-preview-card-header">
          <span class="community-preview-icon">
            <i class="bi bi-flag" aria-hidden="true"></i>
          </span>
          <span class="badge badge-info">Desafio</span>
        </div>
        <h4 data-community-challenge-title>Desafio ativo</h4>
        <p data-community-challenge-text></p>
        <div class="community-preview-metric">
          <span data-community-challenge-progress-label>Meta sugerida</span>
          <strong data-community-challenge-progress-value>3 treinos</strong>
        </div>
      </article>

      <article class="community-preview-card community-ranking-card">
        <div class="community-preview-card-header">
          <span class="community-preview-icon">
            <i class="bi bi-bar-chart" aria-hidden="true"></i>
          </span>
          <span class="badge badge-info">Resumo</span>
        </div>
        <h4>Seu progresso</h4>
        <div class="community-preview-ranking" data-community-preview-ranking></div>
      </article>
    `;

    focusPanel.insertBefore(preview, focusPanel.querySelector(".community-focus-actions"));
  }

  function bindPreviewEvents() {
    document.querySelectorAll("[data-community-detail]").forEach((button) => {
      button.addEventListener("click", () => {
        queueVisualSync(0);
      });
    });

    document.querySelectorAll("[data-community-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        queueVisualSync(80);
        queueVisualSync(220);
      });
    });

    focusToggle?.addEventListener("click", () => {
      queueVisualSync(80);
      queueVisualSync(220);
    });

    const observer = new MutationObserver(() => queueVisualSync(0));
    observer.observe(focusTitle, { childList: true, characterData: true, subtree: true });
    observer.observe(focusPanel, { childList: true, characterData: true, subtree: true });

    document.querySelectorAll("[data-community-card]").forEach((card) => {
      observer.observe(card, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true,
        characterData: true,
        subtree: true,
      });
    });
  }

  function queueVisualSync(delay) {
    window.setTimeout(() => {
      renderPreview();
      syncCommunityToggleVisualState();
    }, delay);
  }

  function renderPreview() {
    const selectedTitle = focusTitle.textContent.trim();
    const preview = COMMUNITY_PREVIEWS[selectedTitle] || COMMUNITY_PREVIEWS["Constância da semana"];
    const isJoined = isSelectedCommunityJoined();

    setText("[data-community-challenge-title]", preview.challengeTitle);
    setText("[data-community-challenge-text]", preview.challengeText);
    setText("[data-community-challenge-progress-label]", preview.progressLabel);
    setText("[data-community-challenge-progress-value]", preview.progressValue);
    renderUserProgressSummary();
    normalizeJoinedCopy(isJoined);
  }

  function renderUserProgressSummary() {
    const progressContainer = document.querySelector("[data-community-preview-ranking]");

    if (!progressContainer) return;

    const stats = getUserProgressStats();

    progressContainer.innerHTML = [
      renderProgressRow("XP registrado", `${stats.totalXp} XP`, "bi-lightning-charge"),
      renderProgressRow("Sessões concluídas", String(stats.completedSessions), "bi-check2-circle"),
      renderProgressRow("Grupos seguidos", String(stats.joinedCommunities), "bi-people"),
    ].join("");
  }

  function renderProgressRow(label, value, icon) {
    return `
      <div class="community-preview-ranking-row">
        <span><i class="bi ${escapeHTML(icon)}" aria-hidden="true"></i></span>
        <strong>${escapeHTML(label)}</strong>
        <em>${escapeHTML(value)}</em>
      </div>
    `;
  }

  function getUserProgressStats() {
    const sessions = getSafeStoredSessions();
    const completedSessions = sessions.filter(isFullyCompleted);
    const totalXp = sessions.reduce((sum, session) => {
      return sum + toSafeNumber(session?.xp);
    }, 0);
    const joinedCommunities = getJoinedCommunityCards().length;

    return {
      totalXp,
      completedSessions: completedSessions.length,
      joinedCommunities,
    };
  }

  function normalizeJoinedCopy(isJoined) {
    if (focusUserStatus) {
      focusUserStatus.textContent = isJoined ? "No grupo" : "Fora do grupo";
    }

    if (focusStatus) {
      focusStatus.textContent = isJoined ? "Participando" : "Não participa";
    }

    if (focusToggle && !isLoadingButton(focusToggle)) {
      focusToggle.classList.toggle("btn-primary", !isJoined);
      focusToggle.classList.toggle("btn-outline", isJoined);
      focusToggle.innerHTML = isJoined
        ? '<i class="bi bi-box-arrow-left" aria-hidden="true"></i> Deixar grupo'
        : '<i class="bi bi-plus-circle" aria-hidden="true"></i> Participar';
    }
  }

  function syncCommunityToggleVisualState() {
    document.querySelectorAll("[data-community-card]").forEach((card) => {
      const button = card.querySelector("[data-community-toggle]");
      const isJoined = isCardJoined(card);

      card.classList.toggle("is-joined", isJoined);

      if (button && !isLoadingButton(button)) {
        button.classList.toggle("btn-primary", isJoined);
        button.classList.toggle("btn-outline", !isJoined);
        button.innerHTML = isJoined
          ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Participando'
          : "Participar";
      }
    });

    updateJoinedCounterFromCards();
    normalizeJoinedCopy(isSelectedCommunityJoined());
  }

  function updateJoinedCounterFromCards() {
    if (!joinedCounter) return;

    joinedCounter.textContent = String(getJoinedCommunityCards().length);
  }

  function getJoinedCommunityCards() {
    return Array.from(
      document.querySelectorAll("[data-community-card], [data-created-community-card]"),
    ).filter(isCardJoined);
  }

  function isSelectedCommunityJoined() {
    const selectedTitle = normalizeText(focusTitle.textContent);
    const selectedCard = Array.from(document.querySelectorAll("[data-community-card]")).find((card) => {
      const title = normalizeText(card.querySelector("h3")?.textContent);
      return title === selectedTitle;
    });

    if (selectedCard) {
      return isCardJoined(selectedCard);
    }

    return normalizeText(focusStatus?.textContent).includes("participando") ||
      normalizeText(focusUserStatus?.textContent).includes("no grupo");
  }

  function isCardJoined(card) {
    const badgeText = normalizeText(card.querySelector(".badge")?.textContent);

    return (
      card.classList.contains("is-joined") ||
      badgeText.includes("participando") ||
      badgeText.includes("no grupo")
    );
  }

  function isLoadingButton(button) {
    return button?.disabled && normalizeText(button.textContent).includes("salvando");
  }

  function getSafeStoredSessions() {
    if (typeof window.BoraTreinarStorage?.getStoredSessions === "function") {
      return window.BoraTreinarStorage.getStoredSessions();
    }

    return [];
  }

  function isFullyCompleted(session) {
    const progress = toSafeNumber(session?.progress);
    const completedSets = toSafeNumber(session?.completedSets);
    const totalSets = toSafeNumber(session?.totalSets);

    return progress >= 100 || (totalSets > 0 && completedSets >= totalSets);
  }

  function toSafeNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) return 0;

    return Math.round(number);
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);

    if (element) {
      element.textContent = value;
    }
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
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

/* Página dedicada das comunidades criadas pelo usuário. */
document.addEventListener(
  "click",
  (event) => {
    const openButton = event.target.closest("[data-created-community-open]");

    if (!openButton) return;

    const communityId = openButton.getAttribute("data-created-community-open");

    if (!communityId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const url = new URL("community-room.html", window.location.href);
    url.searchParams.set("id", communityId);
    window.location.href = url.toString();
  },
  true,
);
