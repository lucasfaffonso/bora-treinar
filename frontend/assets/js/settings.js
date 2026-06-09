/* =========================================================
   Settings page
   Controla dados exibidos, resumo de conta e preferência de tema.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("[data-settings-form]");
  const nameInput = document.querySelector("[data-settings-name]");
  const emailInput = document.querySelector("[data-settings-email]");
  const nameDisplay = document.querySelector("[data-settings-name-display]");
  const emailDisplay = document.querySelector("[data-settings-email-display]");
  const avatarElement = document.querySelector("[data-settings-avatar]");
  const planElement = document.querySelector("[data-settings-plan]");
  const roleElement = document.querySelector("[data-settings-role]");
  const themeLabelElement = document.querySelector("[data-settings-theme-label]");
  const themeTitleElement = document.querySelector("[data-settings-theme-title]");
  const themeDescriptionElement = document.querySelector("[data-settings-theme-description]");
  const themeToggle = document.querySelector("[data-theme-toggle]");

  if (!form || !nameInput || !emailInput) {
    return;
  }

  renderSettings();
  bindEvents();
  restoreCompactSidebarState();
  initThemeToggle();

  function bindEvents() {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (typeof validateBtForm === "function" && !validateBtForm(form)) {
        return;
      }

      const currentUser = getSafeCurrentUser();
      const updatedUser = {
        ...currentUser,
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
      };

      if (typeof setStoredUser === "function") {
        setStoredUser(updatedUser);
      } else {
        setStorageJSON(APP_CONFIG.STORAGE_KEYS.USER, updatedUser);
      }

      renderSettings();
      updateSafeUserUI();
      showSafeToast({
        title: "Configurações salvas",
        message: "Seus dados foram atualizados.",
        type: "success",
      });
    });
  }

  function renderSettings() {
    const user = getSafeCurrentUser();
    const displayName = getDisplayName(user);
    const displayEmail = user?.email || "E-mail não informado";

    nameInput.value = user?.name || user?.fullName || "";
    emailInput.value = user?.email || "";

    setText(nameDisplay, displayName);
    setText(emailDisplay, displayEmail);
    setText(avatarElement, getInitials(displayName));

    if (planElement) {
      planElement.textContent = user?.premiumActive || user?.premium
        ? "Premium"
        : "Gratuito";
    }

    if (roleElement) {
      roleElement.textContent = formatRole(user?.role);
    }
  }

  function getSafeCurrentUser() {
    if (typeof getCurrentUser === "function") {
      return getCurrentUser();
    }

    return getStorageJSON(APP_CONFIG.STORAGE_KEYS.USER) || {};
  }

  function updateSafeUserUI() {
    if (typeof updateUserUI === "function") {
      updateUserUI();
    }

    if (typeof window.BoraTreinarLayout?.refresh === "function") {
      window.BoraTreinarLayout.refresh();
    }
  }

  function showSafeToast({ title, message, type }) {
    if (typeof showToast === "function") {
      showToast({ title, message, type });
    }
  }

  function formatRole(role) {
    if (role === "ADMIN") {
      return "Admin";
    }

    return "Usuário";
  }

  function getDisplayName(user) {
    return user?.name || user?.fullName || user?.displayName || "Usuário";
  }

  function getInitials(name) {
    const parts = String(name || "Usuário")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) return "BT";

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value;
    }
  }

  function restoreCompactSidebarState() {
    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement?.closest(".sidebar, .bt-sidebar")) {
        activeElement.blur();
      }

      document.body.classList.remove("bt-sidebar-expanded");
    }, 0);
  }

  function initThemeToggle() {
    if (!themeToggle) {
      return;
    }

    const savedTheme = getSavedTheme();
    const isLight = savedTheme === "light";

    themeToggle.checked = isLight;
    themeToggle.setAttribute("aria-checked", String(isLight));
    applyTheme(isLight);
    renderThemeCopy(isLight);

    themeToggle.addEventListener("change", () => {
      const shouldUseLightTheme = themeToggle.checked;
      const nextTheme = shouldUseLightTheme ? "light" : "dark";

      saveTheme(nextTheme);
      applyTheme(shouldUseLightTheme);
      renderThemeCopy(shouldUseLightTheme);
      themeToggle.setAttribute("aria-checked", String(shouldUseLightTheme));

      showSafeToast({
        title: "Tema atualizado",
        message: shouldUseLightTheme
          ? "Modo claro ativado."
          : "Modo escuro ativado.",
        type: "success",
      });
    });
  }

  function renderThemeCopy(isLight) {
    setText(themeLabelElement, isLight ? "Modo claro" : "Modo escuro");
    setText(themeTitleElement, isLight ? "Modo claro" : "Modo escuro");
    setText(
      themeDescriptionElement,
      isLight
        ? "Visual claro ativo para uma experiência com fundo branco."
        : "Visual escuro ativo, seguindo a identidade principal do Bora Treinar.",
    );
  }

  function getSavedTheme() {
    try {
      if (typeof window.getSavedTheme === "function") {
        return window.getSavedTheme();
      }

      return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || "dark";
    } catch (error) {
      return "dark";
    }
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, theme);
    } catch (error) {
      console.warn("Não foi possível salvar o tema preferido.", error);
    }
  }

  function applyTheme(isLight) {
    const shouldUseDarkTheme = !isLight;

    document.documentElement.classList.toggle("dark-mode", shouldUseDarkTheme);
    document.body.classList.toggle("dark-mode", shouldUseDarkTheme);
  }
});
