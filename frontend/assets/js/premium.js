/* =========================================================
   Premium page
   Exibe status do plano e interesse do usuário.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const heading = document.querySelector("[data-premium-heading]");
  const description = document.querySelector("[data-premium-description]");
  const plan = document.querySelector("[data-premium-plan]");
  const note = document.querySelector("[data-premium-note]");
  const currentCard = document.querySelector("[data-premium-current-card]");
  const currentTitle = document.querySelector("[data-premium-current-title]");
  const currentPrice = document.querySelector("[data-premium-current-price]");
  const interestButtons = document.querySelectorAll(
    "[data-premium-interest-button], [data-premium-interest-button-secondary]",
  );

  const INTEREST_KEY = "bora_treinar_premium_interest";

  renderPremiumPage();
  bindEvents();

  function bindEvents() {
    interestButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const isInterested = togglePremiumInterest();

        renderPremiumPage();
        showSafeToast({
          title: isInterested ? "Interesse salvo" : "Interesse removido",
          message: isInterested
            ? "Sua preferência sobre o Premium foi salva."
            : "Sua preferência sobre o Premium foi removida.",
          type: "success",
        });
      });
    });
  }

  function renderPremiumPage() {
    renderPremiumStatus();
    renderPremiumInterest();
  }

  function renderPremiumStatus() {
    const user = getSafeCurrentUser();
    const premiumActive = Boolean(user?.premiumActive || user?.premium);

    if (heading) {
      heading.textContent = premiumActive ? "Premium ativo" : "Plano gratuito";
    }

    if (description) {
      description.textContent = premiumActive
        ? "Sua conta está marcada como Premium. Aproveite os recursos avançados quando estiverem disponíveis."
        : "Use os recursos essenciais do Bora Treinar hoje e salve seu interesse para acompanhar a chegada dos recursos avançados.";
    }

    if (plan) {
      plan.textContent = premiumActive ? "Premium" : "Gratuito";
    }

    if (note) {
      note.textContent = premiumActive
        ? "Status do seu plano atualizado."
        : "Recursos essenciais liberados.";
    }

    if (currentTitle) {
      currentTitle.textContent = premiumActive ? "Premium" : "Plano gratuito";
    }

    if (currentPrice) {
      currentPrice.innerHTML = premiumActive
        ? "Ativo<span>/agora</span>"
        : "Gratuito<span>/agora</span>";
    }

    currentCard?.classList.toggle("featured", premiumActive);
  }

  function renderPremiumInterest() {
    const isInterested = getPremiumInterest();

    interestButtons.forEach((button) => {
      button.classList.toggle("btn-primary", isInterested);
      button.classList.toggle("btn-outline", !isInterested);
      button.innerHTML = isInterested
        ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Interesse salvo'
        : '<i class="bi bi-bookmark-star" aria-hidden="true"></i> Salvar interesse';
    });
  }

  function togglePremiumInterest() {
    const key = getScopedKey(INTEREST_KEY);
    const nextValue = !getPremiumInterest();

    if (nextValue) {
      window.localStorage.setItem(key, "true");
    } else {
      window.localStorage.removeItem(key);
    }

    return nextValue;
  }

  function getPremiumInterest() {
    return window.localStorage.getItem(getScopedKey(INTEREST_KEY)) === "true";
  }

  function getSafeCurrentUser() {
    if (typeof window.getCurrentUser === "function") {
      return window.getCurrentUser();
    }

    if (typeof window.getStorageJSON === "function") {
      return window.getStorageJSON(window.APP_CONFIG.STORAGE_KEYS.USER) || {};
    }

    try {
      return JSON.parse(
        window.localStorage.getItem(window.APP_CONFIG.STORAGE_KEYS.USER) || "{}",
      );
    } catch {
      return {};
    }
  }

  function getScopedKey(baseKey) {
    return `${baseKey}:${getCurrentUserScopeId()}`;
  }

  function getCurrentUserScopeId() {
    const user = window.Auth?.getCurrentUser?.() || getSafeCurrentUser();
    const scope = String(user?.id || user?.email || "anonymous").trim().toLowerCase();

    return scope.replace(/[^a-z0-9@._-]/g, "_") || "anonymous";
  }

  function showSafeToast({ title, message, type }) {
    if (typeof window.showToast === "function") {
      window.showToast({ title, message, type });
    }
  }
});
