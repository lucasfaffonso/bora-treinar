/* =========================================================
   Login page
   Arquivo: login.js
   Responsabilidade:
   - Controlar a tela de login
   - Validar campos
   - Mostrar/ocultar senha
   - Lembrar o e-mail do usuário quando solicitado
   - Chamar loginUser() do auth.js
   - Redirecionar para o dashboard
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const rememberUserInput = document.getElementById("rememberUser");
  const loginButton = document.getElementById("loginButton");
  const loginAlert = document.getElementById("loginAlert");

  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  const REMEMBERED_EMAIL_KEY = "bora_treinar_remembered_login_email";

  if (!loginForm) {
    console.warn("Formulário de login não encontrado.");
    return;
  }

  setupPasswordToggle();
  restoreRememberedEmail();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearErrors();
    hideAlert();

    const formData = {
      email: emailInput.value.trim(),
      password: passwordInput.value,
      rememberUser: Boolean(rememberUserInput?.checked),
    };

    if (!validateLoginForm(formData)) {
      return;
    }

    try {
      setLoginLoading(true);

      await loginUser({
        email: formData.email,
        password: formData.password,
      });

      saveRememberedEmail(formData.email, formData.rememberUser);

      showAlert("Login realizado com sucesso! Redirecionando...", "success");

      showToast({
        title: "Login realizado",
        message: "Bem-vindo de volta ao Bora Treinar.",
        type: "success",
      });

      window.setTimeout(() => {
        window.location.href = "../../pages/dashboard/dashboard.html";
      }, 800);
    } catch (error) {
      const message =
        error?.message || "Não foi possível fazer login. Tente novamente.";

      showAlert(message, "danger");

      showToast({
        title: "Erro no login",
        message,
        type: "danger",
      });
    } finally {
      setLoginLoading(false);
    }
  });

  function restoreRememberedEmail() {
    const rememberedEmail = getRememberedEmail();

    if (!rememberedEmail || !emailInput) return;

    emailInput.value = rememberedEmail;

    if (rememberUserInput) {
      rememberUserInput.checked = true;
    }

    passwordInput?.focus();
  }

  function getRememberedEmail() {
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  }

  function saveRememberedEmail(email, shouldRemember) {
    try {
      if (shouldRemember) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        return;
      }

      window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // Não bloqueia o login caso o navegador negue acesso ao armazenamento local.
    }
  }

  function validateLoginForm(data) {
    let isValid = true;

    if (isEmpty(data.email)) {
      setFieldError(emailInput, emailError, "Informe seu e-mail.");
      isValid = false;
    } else if (!isValidEmail(data.email)) {
      setFieldError(emailInput, emailError, "Informe um e-mail válido.");
      isValid = false;
    }

    if (isEmpty(data.password)) {
      setFieldError(passwordInput, passwordError, "Informe sua senha.");
      isValid = false;
    } else if (data.password.length < 8) {
      setFieldError(
        passwordInput,
        passwordError,
        "A senha deve ter pelo menos 8 caracteres.",
      );
      isValid = false;
    }

    if (!isValid) {
      focusFirstInvalidField();
    }

    return isValid;
  }

  function setFieldError(input, errorElement, message) {
    if (input) {
      input.classList.add("input-error");
    }

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  function clearErrors() {
    [emailInput, passwordInput].forEach((input) => {
      if (input) {
        input.classList.remove("input-error");
      }
    });

    [emailError, passwordError].forEach((element) => {
      if (element) {
        element.textContent = "";
      }
    });
  }

  function focusFirstInvalidField() {
    const firstInvalidInput = loginForm.querySelector(".input-error");

    if (firstInvalidInput) {
      firstInvalidInput.focus();
    }
  }

  function showAlert(message, type = "danger") {
    if (!loginAlert) {
      return;
    }

    loginAlert.classList.remove(
      "alert-success",
      "alert-warning",
      "alert-danger",
      "alert-info",
      "auth-message",
    );

    loginAlert.classList.add(
      "alert",
      `alert-${type}`,
      "auth-message",
      "active",
    );
    loginAlert.textContent = message;
  }

  function hideAlert() {
    if (!loginAlert) {
      return;
    }

    loginAlert.classList.remove("active");
    loginAlert.textContent = "";
  }

  function setLoginLoading(isLoading) {
    if (!loginButton) {
      return;
    }

    const label = loginButton.querySelector(".btn-label");
    const loading = loginButton.querySelector(".btn-loading");

    loginButton.disabled = isLoading;

    if (label) {
      label.classList.toggle("hidden", isLoading);
    }

    if (loading) {
      loading.classList.toggle("hidden", !isLoading);
    }
  }

  function setupPasswordToggle() {
    const toggleButton = document.querySelector("[data-toggle-password]");

    if (!toggleButton) {
      return;
    }

    toggleButton.addEventListener("click", () => {
      const inputId = toggleButton.getAttribute("data-toggle-password");
      const input = document.getElementById(inputId);
      const icon = toggleButton.querySelector("i");

      if (!input) {
        return;
      }

      const shouldShowPassword = input.type === "password";

      input.type = shouldShowPassword ? "text" : "password";

      if (icon) {
        icon.className = shouldShowPassword ? "bi bi-eye-slash" : "bi bi-eye";
      }
    });
  }
});
