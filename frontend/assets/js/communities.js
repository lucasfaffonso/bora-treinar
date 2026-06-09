/* =========================================================
   Communities page
   - Backend real quando USE_LOCAL_AUTH === false.
   - localStorage quando USE_LOCAL_AUTH === true.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const workoutsElement = document.querySelector("[data-communities-workouts]");
  const completedElement = document.querySelector("[data-communities-completed]");
  const joinedElement = document.querySelector("[data-communities-joined]");
  const interestCardElement = document.querySelector("[data-communities-interest-card]");
  const profileScoreElement = document.querySelector("[data-communities-profile-score]");
  const profileNoteElement = document.querySelector("[data-communities-profile-note]");
  const activityList = document.querySelector("[data-community-activity-list]");
  const form = document.querySelector("[data-communities-form]");
  const interestSelect = document.querySelector("[data-communities-interest]");
  const customSelect = document.querySelector("[data-communities-custom-select]");
  const customSelectButton = customSelect?.querySelector(".bt-select-button");
  const customSelectLabel = customSelect?.querySelector("[data-communities-selected-label]");
  const customSelectOptions = customSelect?.querySelectorAll("[data-value]");
  const savedElement = document.querySelector("[data-communities-saved]");
  const focusPanel = document.querySelector("[data-community-focus-panel]");
  const focusBadge = document.querySelector("[data-community-focus-badge]");
  const focusTitle = document.querySelector("[data-community-focus-title]");
  const focusDescription = document.querySelector("[data-community-focus-description]");
  const focusStatus = document.querySelector("[data-community-focus-status]");
  const focusBenefits = document.querySelector("[data-community-focus-benefits]");
  const focusSteps = document.querySelector("[data-community-focus-steps]");
  const focusMembers = document.querySelector("[data-community-focus-members]");
  const focusUserStatus = document.querySelector("[data-community-focus-user-status]");
  const focusToggle = document.querySelector("[data-community-focus-toggle]");

  const INTEREST_KEY = "bora_treinar_community_interest";
  const JOINED_KEY = "bora_treinar_joined_communities";
  const CARD_BACKEND_SLUGS = {
    constancia: "constancia-da-semana",
    hipertrofia: "hipertrofia-e-forca",
    iniciante: "primeiros-treinos",
    amigos: "ranking-entre-amigos",
  };
  const COMMUNITY_DETAILS = {
    constancia: {
      badge: "Desafio",
      title: "Constância da semana",
      description:
        "Um grupo para transformar presença em hábito. Ideal para quem quer treinar com frequência e manter uma rotina mais estável.",
      benefits: [
        "Metas simples para manter o ritmo semanal.",
        "Foco em disciplina, presença e repetição.",
        "Boa opção para quem quer criar constância antes de aumentar intensidade.",
      ],
      steps: [
        "Crie ou escolha um treino da sua rotina.",
        "Registre sessões durante a semana.",
        "Acompanhe seu progresso pelo histórico e pelo ranking.",
      ],
    },
    hipertrofia: {
      badge: "Objetivo",
      title: "Hipertrofia e força",
      description:
        "Comunidade para quem quer evoluir em volume, carga e execução com mais organização nos treinos.",
      benefits: [
        "Foco em progressão de carga e volume de treino.",
        "Ajuda a acompanhar séries, repetições e descanso.",
        "Combina bem com treinos estruturados por grupo muscular.",
      ],
      steps: [
        "Monte treinos com exercícios bem definidos.",
        "Registre séries concluídas nas sessões.",
        "Compare sua evolução ao longo dos treinos.",
      ],
    },
    iniciante: {
      badge: "Iniciante",
      title: "Primeiros treinos",
      description:
        "Espaço para começar com segurança, entender sua rotina e ganhar confiança nos primeiros registros.",
      benefits: [
        "Ajuda a criar uma base de organização.",
        "Foco em hábito, segurança e clareza.",
        "Ideal para quem ainda está descobrindo frequência e objetivo.",
      ],
      steps: [
        "Comece com poucos exercícios por treino.",
        "Registre cada sessão mesmo que seja curta.",
        "Ajuste sua rotina conforme ganhar confiança.",
      ],
    },
    amigos: {
      badge: "Social",
      title: "Ranking entre amigos",
      description:
        "Grupo para competir de forma saudável, acompanhar XP e manter motivação junto com outras pessoas.",
      benefits: [
        "Motivação extra por comparação de evolução.",
        "Foco em XP, frequência e conclusão de sessões.",
        "Boa opção para quem treina melhor com metas sociais.",
      ],
      steps: [
        "Registre sessões completas para aumentar sua pontuação.",
        "Acompanhe sua posição no ranking.",
        "Use a competição como incentivo para manter a rotina.",
      ],
    },
  };

  let backendCommunities = [];
  let backendLoadFailed = false;
  let selectedCommunityKey = "constancia";

  bindEvents();
  initializePage();

  async function initializePage() {
    if (shouldUseBackendCommunities()) {
      await loadBackendCommunities();
    }

    renderPage();
  }

  function bindEvents() {
    customSelectButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      customSelect?.classList.toggle("is-open");
    });

    customSelectOptions?.forEach((option) => {
      option.addEventListener("click", () => {
        if (!interestSelect) return;

        interestSelect.value = option.getAttribute("data-value") || "";
        syncCustomSelect();
        customSelect?.classList.remove("is-open");
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-communities-custom-select]")) {
        customSelect?.classList.remove("is-open");
      }
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      saveInterest(interestSelect?.value || "");
      renderPage();
      showSafeToast({
        title: "Interesse salvo",
        message: interestSelect?.value
          ? "Sua preferência de comunidade foi atualizada."
          : "A preferência foi limpa.",
        type: "success",
      });
    });

    document.querySelectorAll("[data-community-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        handleCommunityToggle(button.getAttribute("data-community-toggle") || "");
      });
    });

    document.querySelectorAll("[data-community-detail]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedCommunityKey = button.getAttribute("data-community-detail") || "constancia";
        renderCommunityCards();
        renderCommunityFocusPanel();
        focusPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });

    focusToggle?.addEventListener("click", () => {
      handleCommunityToggle(selectedCommunityKey);
    });
  }

  async function handleCommunityToggle(communityKey) {
    if (!communityKey) return;

    const button = document.querySelector(`[data-community-toggle="${communityKey}"]`);
    const shouldUseBackend = shouldUseBackendCommunities() && !backendLoadFailed;

    setButtonLoading(button, true);
    setButtonLoading(communityKey === selectedCommunityKey ? focusToggle : null, true);

    try {
      if (shouldUseBackend) {
        const community = getBackendCommunityByCardKey(communityKey);

        if (!community?.id) {
          throw new Error("Comunidade não encontrada.");
        }

        const response = community.joined
          ? await window.apiDelete(`/communities/${community.id}/leave`)
          : await window.apiPost(`/communities/${community.id}/join`, {});
        const updatedCommunity = unwrapData(response);

        backendCommunities = backendCommunities.map((item) => {
          return String(item.id) === String(updatedCommunity.id) ? updatedCommunity : item;
        });

        renderPage();
        showSafeToast({
          title: updatedCommunity.joined ? "Comunidade salva" : "Comunidade removida",
          message: updatedCommunity.joined
            ? "Você entrou nessa comunidade."
            : "Você saiu dessa comunidade.",
          type: "success",
        });
        return;
      }

      const isJoined = toggleJoinedCommunity(communityKey);

      renderPage();
      showSafeToast({
        title: isJoined ? "Comunidade salva" : "Comunidade removida",
        message: isJoined
          ? "Você entrou nessa comunidade."
          : "Você saiu dessa comunidade.",
        type: "success",
      });
    } catch (error) {
      showSafeToast({
        title: "Não foi possível atualizar",
        message: error?.message || "Tente novamente em instantes.",
        type: "danger",
      });
    } finally {
      setButtonLoading(button, false);
      setButtonLoading(communityKey === selectedCommunityKey ? focusToggle : null, false);
      renderCommunityFocusPanel();
    }
  }

  async function loadBackendCommunities() {
    try {
      const response = await window.apiGet("/communities");
      backendCommunities = Array.isArray(unwrapData(response)) ? unwrapData(response) : [];
      backendLoadFailed = false;
    } catch (error) {
      backendCommunities = [];
      backendLoadFailed = true;
      showSafeToast({
        title: "Sincronização indisponível",
        message: "Não foi possível atualizar as comunidades agora. Você ainda pode continuar usando a página.",
        type: "warning",
      });
    }
  }

  function renderPage() {
    renderSummary();
    renderSavedInterest();
    renderCommunityCards();
    renderCommunityFocusPanel();
    renderActivityList();
  }

  function renderSummary() {
    const workouts = getSafeStoredWorkouts();
    const sessions = getSafeStoredSessions();
    const completedSessions = sessions.filter(isFullyCompleted);
    const joinedCommunities = getJoinedCommunitiesForCurrentMode();
    const savedInterest = getSavedInterest();
    const profileScore = calculateProfileScore({
      workouts,
      completedSessions,
      joinedCommunities,
      savedInterest,
    });

    setText(workoutsElement, String(workouts.length));
    setText(completedElement, String(completedSessions.length));
    setText(joinedElement, String(joinedCommunities.length));
    setText(interestCardElement, savedInterest ? formatInterest(savedInterest) : "Nenhuma");
    setText(profileScoreElement, `${profileScore}%`);
    setText(profileNoteElement, getProfileNote(profileScore));
  }

  function renderSavedInterest() {
    const savedInterest = getSavedInterest();

    if (interestSelect) {
      interestSelect.value = savedInterest;
      syncCustomSelect();
    }

    setText(
      savedElement,
      savedInterest ? `Salvo: ${formatInterest(savedInterest)}` : "Nada salvo ainda",
    );
  }

  function renderCommunityCards() {
    document.querySelectorAll("[data-community-card]").forEach((card) => {
      const communityKey = card.getAttribute("data-community-card") || "";
      const backendCommunity = getBackendCommunityByCardKey(communityKey);
      const isBackendMode = shouldUseBackendCommunities() && !backendLoadFailed;
      const isJoined = isCommunityJoined(communityKey);
      const button = card.querySelector("[data-community-toggle]");
      const detailButton = card.querySelector("[data-community-detail]");
      const badge = card.querySelector(".badge");

      card.classList.toggle("is-joined", isJoined);
      card.classList.toggle("is-selected", communityKey === selectedCommunityKey);
      card.classList.toggle("is-backend-community", isBackendMode && Boolean(backendCommunity));

      if (button) {
        button.disabled = isBackendMode && !backendCommunity;
        button.classList.toggle("btn-primary", isJoined);
        button.classList.toggle("btn-outline", !isJoined);
        button.innerHTML = isJoined
          ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Participando'
          : "Participar";
      }

      if (detailButton) {
        detailButton.classList.toggle("btn-primary", communityKey === selectedCommunityKey);
        detailButton.classList.toggle("btn-outline", communityKey !== selectedCommunityKey);
        detailButton.setAttribute("aria-pressed", String(communityKey === selectedCommunityKey));
      }

      if (badge && isJoined) {
        badge.textContent = "Participando";
        badge.classList.add("badge-success");
        badge.classList.remove("badge-info");
      } else if (badge) {
        badge.classList.remove("badge-success");
        badge.classList.add("badge-info");
        badge.textContent = getCommunityBadgeLabel(communityKey);
      }
    });
  }

  function renderCommunityFocusPanel() {
    if (!focusPanel) return;

    const details = COMMUNITY_DETAILS[selectedCommunityKey] || COMMUNITY_DETAILS.constancia;
    const isJoined = isCommunityJoined(selectedCommunityKey);
    const membersCount = getCommunityMembersCount(selectedCommunityKey, isJoined);

    setText(focusBadge, details.badge);
    setText(focusTitle, details.title);
    setText(focusDescription, details.description);
    setText(focusStatus, isJoined ? "Participando" : "Não participa");
    setText(focusMembers, String(membersCount));
    setText(focusUserStatus, isJoined ? "Participando" : "Fora do grupo");

    if (focusBenefits) {
      focusBenefits.innerHTML = details.benefits.map(renderFocusListItem).join("");
    }

    if (focusSteps) {
      focusSteps.innerHTML = details.steps.map(renderFocusListItem).join("");
    }

    if (focusToggle) {
      focusToggle.classList.toggle("btn-primary", !isJoined);
      focusToggle.classList.toggle("btn-outline", isJoined);
      focusToggle.innerHTML = isJoined
        ? '<i class="bi bi-box-arrow-left" aria-hidden="true"></i> Sair da comunidade'
        : '<i class="bi bi-plus-circle" aria-hidden="true"></i> Participar';
    }
  }

  function renderFocusListItem(text) {
    return `
      <li>
        <i class="bi bi-check2" aria-hidden="true"></i>
        <span>${escapeHTML(text)}</span>
      </li>
    `;
  }

  function renderActivityList() {
    if (!activityList) return;

    const sessions = getSafeStoredSessions()
      .filter((session) => session.finishedAt)
      .sort((a, b) => new Date(b.finishedAt).getTime() - new Date(a.finishedAt).getTime())
      .slice(0, 4);

    if (!sessions.length) {
      activityList.innerHTML = `
        <div class="user-timeline-empty">
          <i class="bi bi-clock-history" aria-hidden="true"></i>
          <p>Nenhuma atividade registrada ainda.</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = sessions.map(renderActivityItem).join("");
  }

  function renderActivityItem(session) {
    const status = isFullyCompleted(session) ? "Concluído" : getPartialStatus(session);

    return `
      <div class="user-timeline-item">
        <span class="user-timeline-icon">
          <i class="bi bi-activity" aria-hidden="true"></i>
        </span>
        <div>
          <strong>${escapeHTML(session.workoutName || "Treino cadastrado")}</strong>
          <p>${escapeHTML(status)} • ${escapeHTML(formatDate(session.finishedAt))}</p>
        </div>
      </div>
    `;
  }

  function saveInterest(selectedInterest) {
    const key = getScopedKey(INTEREST_KEY);

    if (!selectedInterest) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, selectedInterest);
  }

  function getSavedInterest() {
    return window.localStorage.getItem(getScopedKey(INTEREST_KEY)) || "";
  }

  function getJoinedCommunitiesForCurrentMode() {
    if (shouldUseBackendCommunities() && !backendLoadFailed) {
      return backendCommunities.filter((community) => community.joined);
    }

    return getJoinedCommunities();
  }

  function isCommunityJoined(communityKey) {
    if (shouldUseBackendCommunities() && !backendLoadFailed) {
      return Boolean(getBackendCommunityByCardKey(communityKey)?.joined);
    }

    return getJoinedCommunities().includes(communityKey);
  }

  function getCommunityMembersCount(communityKey, isJoined) {
    const backendCommunity = getBackendCommunityByCardKey(communityKey);
    const backendCount = Number(backendCommunity?.membersCount || 0);

    if (Number.isFinite(backendCount) && backendCount > 0) return backendCount;

    return isJoined ? 1 : 0;
  }

  function getJoinedCommunities() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(getScopedKey(JOINED_KEY)) || "[]");

      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  function saveJoinedCommunities(communities) {
    window.localStorage.setItem(
      getScopedKey(JOINED_KEY),
      JSON.stringify(Array.from(new Set(communities.map(String)))),
    );
  }

  function toggleJoinedCommunity(communityKey) {
    if (!communityKey) return false;

    const communities = new Set(getJoinedCommunities());

    if (communities.has(communityKey)) {
      communities.delete(communityKey);
      saveJoinedCommunities(Array.from(communities));
      return false;
    }

    communities.add(communityKey);
    saveJoinedCommunities(Array.from(communities));
    return true;
  }

  function getBackendCommunityByCardKey(cardKey) {
    const expectedSlug = CARD_BACKEND_SLUGS[cardKey] || cardKey;

    return backendCommunities.find((community) => community.slug === expectedSlug) || null;
  }

  function shouldUseBackendCommunities() {
    return Boolean(
      typeof window.isLocalAuthEnabled === "function" &&
        !window.isLocalAuthEnabled() &&
        typeof window.apiGet === "function" &&
        typeof window.apiPost === "function" &&
        typeof window.apiDelete === "function",
    );
  }

  function syncCustomSelect() {
    if (!interestSelect || !customSelectOptions) return;

    const selectedValue = interestSelect.value;
    const selectedOption = Array.from(customSelectOptions).find((option) => {
      return option.getAttribute("data-value") === selectedValue;
    });

    customSelectOptions.forEach((option) => {
      option.classList.toggle("is-selected", option === selectedOption);
    });

    if (customSelectLabel) {
      customSelectLabel.textContent = selectedOption?.textContent.trim() || "Escolha uma opção";
    }
  }

  function calculateProfileScore({ workouts, completedSessions, joinedCommunities, savedInterest }) {
    let score = 0;

    if (workouts.length > 0) score += 25;
    if (completedSessions.length > 0) score += 30;
    if (joinedCommunities.length > 0) score += 25;
    if (savedInterest) score += 20;

    return Math.min(100, score);
  }

  function getProfileNote(score) {
    if (score >= 80) return "Você está pronto para aproveitar melhor as comunidades.";
    if (score >= 50) return "Você já tem boa base para entrar em comunidades.";
    if (score >= 25) return "Salve grupos e registre sessões para evoluir seu perfil.";
    return "Crie treinos e registre sessões para melhorar seu perfil.";
  }

  function getPartialStatus(session) {
    const progress = Number(session.progress || 0);
    const completedSets = Number(session.completedSets || 0);

    if (progress > 0 || completedSets > 0) return "Parcial";

    return "Não executado";
  }

  function isFullyCompleted(session) {
    const progress = Number(session?.progress || 0);
    const completedSets = Number(session?.completedSets || 0);
    const totalSets = Number(session?.totalSets || 0);

    return progress >= 100 || (totalSets > 0 && completedSets >= totalSets);
  }

  function getSafeStoredWorkouts() {
    if (typeof window.BoraTreinarStorage?.getStoredWorkouts === "function") {
      return window.BoraTreinarStorage.getStoredWorkouts();
    }

    return [];
  }

  function getSafeStoredSessions() {
    if (typeof window.BoraTreinarStorage?.getStoredSessions === "function") {
      return window.BoraTreinarStorage.getStoredSessions();
    }

    return [];
  }

  function getScopedKey(baseKey) {
    return `${baseKey}:${getCurrentUserScopeId()}`;
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

  function getCommunityBadgeLabel(communityKey) {
    const labels = {
      constancia: "Desafio",
      hipertrofia: "Objetivo",
      iniciante: "Iniciante",
      amigos: "Social",
    };

    return labels[communityKey] || "Grupo";
  }

  function formatInterest(value) {
    const labels = {
      desafios: "Desafios",
      grupos: "Grupos",
      ranking: "Ranking",
      chat: "Chat",
    };

    return labels[value] || "Preferência";
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "data não registrada";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function unwrapData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;

    button.disabled = isLoading;

    if (isLoading) {
      button.dataset.previousLabel = button.innerHTML;
      button.innerHTML = '<i class="bi bi-arrow-repeat" aria-hidden="true"></i> Salvando';
      return;
    }

    if (button.dataset.previousLabel) {
      button.innerHTML = button.dataset.previousLabel;
    }

    delete button.dataset.previousLabel;
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showSafeToast({ title, message, type }) {
    if (typeof window.showToast === "function") {
      window.showToast({ title, message, type });
    }
  }
});
