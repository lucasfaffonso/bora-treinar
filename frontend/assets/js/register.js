/* =========================================================
   Register page
   Arquivo: register.js
   Responsabilidade:
   - Controlar a tela de cadastro
   - Validar campos
   - Mostrar/ocultar senha
   - Chamar registerUser() do auth.js
   - Redirecionar para o dashboard após cadastro autenticado
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const termsInput = document.getElementById("terms");
  const registerButton = document.getElementById("registerButton");
  const registerAlert = document.getElementById("registerAlert");

  const nameError = document.getElementById("nameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const confirmPasswordError = document.getElementById("confirmPasswordError");
  const termsError = document.getElementById("termsError");

  if (!registerForm) {
    console.warn("Formulário de cadastro não encontrado.");
    return;
  }

  setupPasswordToggles();

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    clearErrors();
    hideAlert();

    const formData = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passwordInput.value,
      confirmPassword: confirmPasswordInput.value,
      termsAccepted: termsInput.checked,
    };

    if (!validateRegisterForm(formData)) {
      return;
    }

    try {
      setRegisterLoading(true);

      await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      showAlert(
        "Conta criada com sucesso! Redirecionando para o dashboard...",
        "success"
      );

      showToast({
        title: "Cadastro realizado",
        message: "Sua conta foi criada e você já está conectado.",
        type: "success",
      });

      window.setTimeout(() => {
        window.location.href = APP_CONFIG.ROUTES.DASHBOARD;
      }, 1000);
    } catch (error) {
      const message =
        error?.message || "Não foi possível criar sua conta. Tente novamente.";

      showAlert(message, "danger");

      showToast({
        title: "Erro no cadastro",
        message,
        type: "danger",
      });
    } finally {
      setRegisterLoading(false);
    }
  });

  function validateRegisterForm(data) {
    let isValid = true;

    if (isEmpty(data.name)) {
      setFieldError(nameInput, nameError, "Informe seu nome.");
      isValid = false;
    } else if (data.name.length < 3) {
      setFieldError(nameInput, nameError, "O nome deve ter pelo menos 3 caracteres.");
      isValid = false;
    }

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
    } else if (!isValidPassword(data.password)) {
      setFieldError(
        passwordInput,
        passwordError,
        "A senha deve ter pelo menos 8 caracteres."
      );
      isValid = false;
    }

    if (isEmpty(data.confirmPassword)) {
      setFieldError(
        confirmPasswordInput,
        confirmPasswordError,
        "Confirme sua senha."
      );
      isValid = false;
    } else if (data.password !== data.confirmPassword) {
      setFieldError(
        confirmPasswordInput,
        confirmPasswordError,
        "A confirmação de senha não confere."
      );
      isValid = false;
    }

    if (!data.termsAccepted) {
      setText(termsError, "Você precisa aceitar os termos para continuar.");
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
    [nameInput, emailInput, passwordInput, confirmPasswordInput].forEach((input) => {
      if (input) {
        input.classList.remove("input-error");
      }
    });

    [nameError, emailError, passwordError, confirmPasswordError, termsError].forEach(
      (element) => {
        if (element) {
          element.textContent = "";
        }
      }
    );
  }

  function focusFirstInvalidField() {
    const firstInvalidInput = registerForm.querySelector(".input-error");

    if (firstInvalidInput) {
      firstInvalidInput.focus();
      return;
    }

    if (termsError && termsError.textContent) {
      termsInput.focus();
    }
  }

  function showAlert(message, type = "danger") {
    if (!registerAlert) {
      return;
    }

    registerAlert.classList.remove(
      "alert-success",
      "alert-warning",
      "alert-danger",
      "alert-info",
      "auth-message"
    );

    registerAlert.classList.add("alert", `alert-${type}`, "auth-message", "active");
    registerAlert.textContent = message;
  }

  function hideAlert() {
    if (!registerAlert) {
      return;
    }

    registerAlert.classList.remove("active");
    registerAlert.textContent = "";
  }

  function setRegisterLoading(isLoading) {
    if (!registerButton) {
      return;
    }

    const label = registerButton.querySelector(".btn-label");
    const loading = registerButton.querySelector(".btn-loading");

    registerButton.disabled = isLoading;

    if (label) {
      label.classList.toggle("hidden", isLoading);
    }

    if (loading) {
      loading.classList.toggle("hidden", !isLoading);
    }
  }

  function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll("[data-toggle-password]");

    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const inputId = button.getAttribute("data-toggle-password");
        const input = document.getElementById(inputId);
        const icon = button.querySelector("i");

        if (!input) {
          return;
        }

        const shouldShowPassword = input.type === "password";

        input.type = shouldShowPassword ? "text" : "password";

        if (icon) {
          icon.className = shouldShowPassword ? "bi bi-eye-slash" : "bi bi-eye";
        }
      });
    });
  }
});
