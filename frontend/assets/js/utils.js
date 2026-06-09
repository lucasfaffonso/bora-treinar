/* =========================================================
   Shared utilities
   ========================================================= */

/**
 * Funções utilitárias reutilizáveis no frontend.
 *
 * Regras:
 * - Não salvar senha.
 * - Não imprimir token no console.
 * - Não expor dados sensíveis.
 * - Não colocar secrets no frontend.
 */

/* =========================================================
   DOM HELPERS
   ========================================================= */

function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

function qsa(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

function on(element, event, callback) {
  if (!element) return;

  element.addEventListener(event, callback);
}

function addClass(element, className) {
  if (!element) return;

  element.classList.add(className);
}

function removeClass(element, className) {
  if (!element) return;

  element.classList.remove(className);
}

function toggleClass(element, className) {
  if (!element) return;

  element.classList.toggle(className);
}

function showElement(element) {
  if (!element) return;

  element.classList.remove("hidden");
}

function hideElement(element) {
  if (!element) return;

  element.classList.add("hidden");
}

function setText(element, text) {
  if (!element) return;

  element.textContent = text ?? "";
}

function setHTML(element, html) {
  if (!element) return;

  element.innerHTML = html ?? "";
}

/* =========================================================
   STRING HELPERS
   ========================================================= */

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === "";
}

function capitalize(value) {
  if (isEmpty(value)) return "";

  const text = String(value).trim();

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getInitials(name) {
  if (isEmpty(name)) return "BT";

  const parts = String(name).trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function truncateText(text, maxLength = 80) {
  if (isEmpty(text)) return "";

  const value = String(text);

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}...`;
}

/* =========================================================
   VALIDATION HELPERS
   ========================================================= */

function isValidEmail(email) {
  if (isEmpty(email)) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(String(email).trim());
}

function isValidPassword(password) {
  if (isEmpty(password)) return false;

  return String(password).length >= 8;
}

function isPositiveNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0;
}

function isPositiveOrZero(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0;
}

/* =========================================================
   DATE HELPERS
   ========================================================= */

function formatDate(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatDateTime(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatTime(dateValue) {
  if (!dateValue) return "-";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* =========================================================
   NUMBER HELPERS
   ========================================================= */

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat("pt-BR").format(number);
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number);
}

function formatXP(value) {
  return `${formatNumber(value)} XP`;
}

/* =========================================================
   STORAGE HELPERS
   ========================================================= */

function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Evita quebra em navegadores com storage indisponível.
  }
}

function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Evita quebra em navegadores com storage indisponível.
  }
}

function getStorageJSON(key) {
  try {
    const item = localStorage.getItem(key);

    if (!item) return null;

    return JSON.parse(item);
  } catch {
    return null;
  }
}

function setStorageJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Evita quebra em navegadores com storage indisponível.
  }
}

/* =========================================================
   URL HELPERS
   ========================================================= */

function getQueryParam(paramName) {
  const params = new URLSearchParams(window.location.search);

  return params.get(paramName);
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
}

function redirectTo(path) {
  window.location.href = path;
}

/* =========================================================
   UI HELPERS
   ========================================================= */

function setButtonLoading(button, isLoading, loadingText = "Carregando...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function renderLoadingState(message = "Carregando...") {
  return `
    <div class="loading-state">
      <strong>${escapeHTML(message)}</strong>
      <p>Aguarde um momento.</p>
    </div>
  `;
}

function renderEmptyState(title = "Nenhum item encontrado.", description = "") {
  return `
    <div class="empty-state">
      <strong>${escapeHTML(title)}</strong>
      ${description ? `<p>${escapeHTML(description)}</p>` : ""}
    </div>
  `;
}

function renderErrorState(
  title = "Não foi possível carregar os dados.",
  description = "Tente novamente em alguns instantes.",
) {
  return `
    <div class="error-state">
      <strong>${escapeHTML(title)}</strong>
      <p>${escapeHTML(description)}</p>
    </div>
  `;
}

/* =========================================================
   TOAST HELPERS
   ========================================================= */

function ensureToastContainer() {
  let container = qs(".toast-container");

  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  return container;
}

function showToast({
  title = "Aviso",
  message = "",
  type = "info",
  duration = 2600,
}) {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const maxToasts = isMobile ? 1 : 3;

  let toastContainer = document.querySelector("[data-toast-container]");

  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    toastContainer.setAttribute("data-toast-container", "");
    document.body.appendChild(toastContainer);
  }

  const currentToasts = Array.from(toastContainer.querySelectorAll(".toast"));

  while (currentToasts.length >= maxToasts) {
    const oldestToast = currentToasts.shift();

    if (oldestToast) {
      oldestToast.remove();
    }
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.setAttribute("role", "status");

  toast.innerHTML = `
    <div class="toast-content">
      <strong>${escapeHTML(title)}</strong>
      ${message ? `<span>${escapeHTML(message)}</span>` : ""}
    </div>

    <button class="toast-close" type="button" aria-label="Fechar aviso">
      <i class="bi bi-x-lg" aria-hidden="true"></i>
    </button>
  `;

  const closeButton = toast.querySelector(".toast-close");

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      toast.remove();
    });
  }

  toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("is-leaving");

    window.setTimeout(() => {
      toast.remove();
    }, 180);
  }, duration);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   MODAL HELPERS
   ========================================================= */

function openModal(modalId) {
  const modal = document.getElementById(modalId);

  if (!modal) return;

  modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);

  if (!modal) return;

  modal.classList.remove("active");
}

function setupModalCloseButtons() {
  qsa("[data-modal-close]").forEach((button) => {
    on(button, "click", () => {
      const modalId = button.dataset.modalClose;

      closeModal(modalId);
    });
  });

  qsa(".modal-overlay").forEach((overlay) => {
    on(overlay, "click", (event) => {
      if (event.target === overlay) {
        overlay.classList.remove("active");
      }
    });
  });
}

/* =========================================================
   SECURITY / ESCAPE HELPERS
   ========================================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Use quando precisar montar HTML com texto vindo de usuário/API.
 * Evita inserir HTML perigoso diretamente.
 */
function safeText(value) {
  return escapeHTML(value);
}

/* =========================================================
   MOCK DELAY HELPER
   ========================================================= */

function wait(ms = 300) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/* =========================================================
   PAGE TITLE HELPER
   ========================================================= */

function setPageTitle(title) {
  const finalTitle = title
    ? `${title} | ${APP_CONFIG.APP_NAME}`
    : APP_CONFIG.APP_NAME;

  document.title = finalTitle;
}

/* =========================================================
   Bora Treinar - Global Confirm Dialog
   Modal visual global de confirmação do projeto
   ========================================================= */

function showBtConfirmDialog({
  title = "Confirmar ação?",
  message = "Deseja continuar com esta ação?",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  icon = "exclamation-triangle",
} = {}) {
  return new Promise((resolve) => {
    const existingModal = document.querySelector("[data-bt-confirm-dialog]");

    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement("div");

    modal.className = "bt-confirm-overlay";
    modal.setAttribute("data-bt-confirm-dialog", "");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "btConfirmDialogTitle");

    modal.innerHTML = `
      <div class="bt-confirm-dialog bt-confirm-dialog-${escapeConfirmHTML(variant)}">
        <button
          class="bt-confirm-close"
          type="button"
          aria-label="Fechar confirmação"
          data-bt-confirm-cancel
        >
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>

        <div class="bt-confirm-icon">
          <i class="bi bi-${escapeConfirmHTML(icon)}" aria-hidden="true"></i>
        </div>

        <div>
          <h3 class="bt-confirm-title" id="btConfirmDialogTitle">
            ${escapeConfirmHTML(title)}
          </h3>

          <p class="bt-confirm-message">
            ${escapeConfirmHTML(message)}
          </p>
        </div>

        <div class="bt-confirm-actions">
          <button
            class="btn btn-outline"
            type="button"
            data-bt-confirm-cancel
          >
            ${escapeConfirmHTML(cancelLabel)}
          </button>

          <button
            class="btn btn-primary bt-confirm-accept"
            type="button"
            data-bt-confirm-accept
          >
            <i class="bi bi-check2-circle" aria-hidden="true"></i>
            ${escapeConfirmHTML(confirmLabel)}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.classList.add("bt-modal-open");

    const acceptButton = modal.querySelector("[data-bt-confirm-accept]");
    const cancelButtons = modal.querySelectorAll("[data-bt-confirm-cancel]");
    const previousActiveElement = document.activeElement;

    function closeModal(result) {
      modal.classList.remove("is-visible");
      document.removeEventListener("keydown", handleKeydown);

      window.setTimeout(() => {
        modal.remove();
        document.body.classList.remove("bt-modal-open");

        if (
          previousActiveElement &&
          typeof previousActiveElement.focus === "function"
        ) {
          previousActiveElement.focus();
        }

        resolve(result);
      }, 160);
    }

    function handleKeydown(event) {
      if (event.key === "Escape") {
        closeModal(false);
      }
    }

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(false);
      }
    });

    cancelButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeModal(false);
      });
    });

    if (acceptButton) {
      acceptButton.addEventListener("click", () => {
        closeModal(true);
      });
    }

    document.addEventListener("keydown", handleKeydown);

    window.requestAnimationFrame(() => {
      modal.classList.add("is-visible");

      if (acceptButton) {
        acceptButton.focus();
      }
    });
  });
}

function escapeConfirmHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.showBtConfirmDialog = showBtConfirmDialog;

/* =========================================================
   Bora Treinar - Global Form Validation
   Validação visual global para campos obrigatórios
   ========================================================= */

(function setupGlobalBtValidation() {
  function initializeFormValidation(root = document) {
    root.querySelectorAll("form").forEach((form) => {
      if (form.dataset.btValidationReady === "true") {
        return;
      }

      form.dataset.btValidationReady = "true";
      form.noValidate = true;

      form.addEventListener("input", (event) => {
        const field = event.target.closest("input, select, textarea");

        if (field) {
          clearBtFieldError(field);
        }
      });

      form.addEventListener("change", (event) => {
        const field = event.target.closest("input, select, textarea");

        if (field) {
          clearBtFieldError(field);
        }
      });
    });
  }

  function validateBtForm(form) {
    const fields = Array.from(
      form.querySelectorAll("input, select, textarea"),
    ).filter(shouldValidateField);

    let firstInvalidField = null;

    fields.forEach((field) => {
      clearBtFieldError(field);

      if (!field.checkValidity()) {
        if (!firstInvalidField) {
          firstInvalidField = field;
        }

        showBtFieldError(field, getBtValidationMessage(field));
      }
    });

    if (firstInvalidField) {
      focusBtField(firstInvalidField);

      if (typeof showToast === "function") {
        showToast({
          title: "Campos obrigatórios",
          message: "Preencha os campos destacados antes de continuar.",
          type: "warning",
        });
      }

      return false;
    }

    return true;
  }

  function shouldValidateField(field) {
    if (!field || field.disabled) {
      return false;
    }

    if (
      field.type === "button" ||
      field.type === "submit" ||
      field.type === "reset"
    ) {
      return false;
    }

    if (field.type === "hidden" && !field.hasAttribute("required")) {
      return false;
    }

    return (
      field.hasAttribute("required") ||
      field.type === "email" ||
      field.minLength > 0 ||
      field.maxLength > 0 ||
      field.pattern
    );
  }

  function getBtValidationMessage(field) {
    if (field.dataset.requiredMessage && field.validity.valueMissing) {
      return field.dataset.requiredMessage;
    }

    if (field.dataset.validationMessage) {
      return field.dataset.validationMessage;
    }

    const label = getBtFieldLabel(field);

    if (field.validity.valueMissing) {
      return label ? `Informe ${label.toLowerCase()}.` : "Preencha este campo.";
    }

    if (field.validity.typeMismatch && field.type === "email") {
      return "Informe um e-mail válido.";
    }

    if (field.validity.tooShort) {
      return `Informe pelo menos ${field.minLength} caracteres.`;
    }

    if (field.validity.patternMismatch) {
      return "Confira o formato informado.";
    }

    return "Confira este campo antes de continuar.";
  }

  function getBtFieldLabel(field) {
    const fieldId = field.getAttribute("id");

    if (fieldId) {
      const label = document.querySelector(
        `label[for="${CSS.escape(fieldId)}"]`,
      );

      if (label) {
        return label.textContent.trim().replace("*", "");
      }
    }

    const groupLabel = field.closest(".input-group")?.querySelector("label");

    if (groupLabel) {
      return groupLabel.textContent.trim().replace("*", "");
    }

    return "";
  }

  function showBtFieldError(field, message) {
    const inputGroup = field.closest(".input-group") || field.parentElement;
    const visualField = getBtVisualField(field);

    if (visualField) {
      visualField.classList.add("input-error");
      visualField.setAttribute("aria-invalid", "true");
    }

    if (!inputGroup) {
      return;
    }

    let errorElement =
      inputGroup.querySelector("[data-bt-form-error]") ||
      inputGroup.querySelector(".form-error");

    if (!errorElement) {
      errorElement = document.createElement("small");
      errorElement.className = "form-error";
      errorElement.setAttribute("data-bt-form-error", "");
      inputGroup.appendChild(errorElement);
    }

    errorElement.textContent = message;
  }

  function clearBtFieldError(field) {
    const inputGroup = field.closest(".input-group") || field.parentElement;
    const visualField = getBtVisualField(field);

    if (visualField) {
      visualField.classList.remove("input-error");
      visualField.removeAttribute("aria-invalid");
    }

    if (!inputGroup) {
      return;
    }

    const errorElement =
      inputGroup.querySelector("[data-bt-form-error]") ||
      inputGroup.querySelector(".form-error");

    if (errorElement) {
      errorElement.textContent = "";
    }
  }

  function getBtVisualField(field) {
    if (field.classList.contains("native-select-hidden")) {
      return field.closest(".input-group")?.querySelector(".bt-select-button");
    }

    if (field.matches("[data-library-exercise-select]")) {
      return field
        .closest("[data-library-exercise-custom]")
        ?.querySelector(".bt-library-select-button");
    }

    return field;
  }

  function focusBtField(field) {
    const visualField = getBtVisualField(field);

    if (visualField && typeof visualField.focus === "function") {
      visualField.focus();
      return;
    }

    if (typeof field.focus === "function") {
      field.focus();
    }
  }

  document.addEventListener(
    "submit",
    (event) => {
      const form = event.target.closest("form");

      if (!form) {
        return;
      }

      initializeFormValidation(form);

      if (!validateBtForm(form)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );

  document.addEventListener(
    "invalid",
    (event) => {
      const field = event.target.closest("input, select, textarea");

      if (!field) {
        return;
      }

      event.preventDefault();

      showBtFieldError(field, getBtValidationMessage(field));
    },
    true,
  );

  document.addEventListener("DOMContentLoaded", () => {
    initializeFormValidation();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }

          if (node.matches("form")) {
            initializeFormValidation(node.parentElement || document);
            return;
          }

          if (node.querySelector("form")) {
            initializeFormValidation(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

  window.setupBtFormValidation = initializeFormValidation;
  window.validateBtForm = validateBtForm;
})();
