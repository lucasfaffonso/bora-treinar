/* =========================================================
   Exercises page
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const storage = window.BoraTreinarStorage;
  const main = document.querySelector(".page-content");

  if (!storage || !main) {
    console.warn(
      "Camada de dados ou conteúdo da página de exercícios não encontrado.",
    );
    return;
  }

  renderExercisesPage();

  function renderExercisesPage() {
    main.innerHTML = `
      <section class="page-header">
        <div class="page-title-group">
          <h2 class="page-title">Exercícios</h2>
        </div>
      </section>

      <section class="grid grid-2">
        <article class="content-card">
          <div class="content-card-header">
            <div>
              <span class="badge badge-info">Cadastro</span>

              <h3 class="content-card-title mt-md">Novo exercício</h3>
            </div>
          </div>

          <div class="content-card-body">
            <form class="exercise-form" data-exercise-form novalidate>
              <div class="input-group">
                <label for="exerciseName">Nome do exercício</label>

                <input
                  id="exerciseName"
                  class="input"
                  type="text"
                  placeholder="Digite o nome do exercício"
                  required
                  data-required-message="Informe o nome do exercício para cadastrar."
                  data-exercise-name
                />
              </div>

              <div class="input-group">
                <label for="exerciseMuscleGroup">Grupo muscular</label>

                <input
                  id="exerciseMuscleGroup"
                  class="input"
                  type="text"
                  placeholder="Ex: Peitoral, costas, pernas, ombros"
                  data-exercise-muscle
                />
              </div>

              <div class="input-group">
                <label for="exerciseEquipment">Equipamento</label>

                <input
                  id="exerciseEquipment"
                  class="input"
                  type="text"
                  placeholder="Ex: Halteres, barra, máquina, peso corporal"
                  data-exercise-equipment
                />
              </div>

              <div class="input-group">
                <label for="exerciseNotes">Observações</label>

                <textarea
                  id="exerciseNotes"
                  class="input"
                  rows="4"
                  placeholder="Adicione instruções, ajustes ou cuidados importantes para a execução."
                  data-exercise-notes
                ></textarea>
              </div>

              <button class="btn btn-primary w-full" type="submit">
                <i class="bi bi-plus-circle" aria-hidden="true"></i>
                Cadastrar exercício
              </button>
            </form>
          </div>
        </article>

        <article class="content-card exercise-summary-card">
          <div class="content-card-header">
            <div>
              <span class="badge badge-info">Resumo</span>

              <h3 class="content-card-title mt-md">
                Biblioteca de exercícios
              </h3>
            </div>

            <span class="stats-card-icon">
              <i class="bi bi-heart-pulse" aria-hidden="true"></i>
            </span>
          </div>

          <div class="content-card-body">
            <div class="workout-summary-list">
              <div class="workout-summary-item">
                <span>Total cadastrado</span>
                <strong data-exercise-count>0</strong>
              </div>

              <div class="workout-summary-item">
                <span>Grupo mais usado</span>
                <strong data-exercise-top-muscle>Nenhum</strong>
              </div>

              <div class="workout-summary-item">
                <span>Equipamentos</span>
                <strong data-exercise-equipment-count>0</strong>
              </div>

              <div class="workout-summary-item">
                <span>Último cadastro</span>
                <strong data-exercise-last-name>Nenhum</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section class="dashboard-section exercise-library-section">
        <div class="dashboard-section-header">
          <div>
            <h2 class="dashboard-section-title">Minha biblioteca</h2>
          </div>

          <div class="search-box">
            <i class="bi bi-search search-icon" aria-hidden="true"></i>

            <input
              class="input"
              type="search"
              placeholder="Buscar exercício"
              aria-label="Buscar exercício"
              data-exercise-search
            />
          </div>
        </div>

        <div class="exercise-library-grid" data-exercise-list></div>
      </section>
    `;

    bindEvents();

    if (typeof window.setupBtFormValidation === "function") {
      window.setupBtFormValidation(main);
    }

    renderExerciseList();
  }

  function bindEvents() {
    const form = document.querySelector("[data-exercise-form]");
    const searchInput = document.querySelector("[data-exercise-search]");

    if (form) {
      form.noValidate = true;
      form.addEventListener("submit", handleSubmit);
    }

    if (searchInput) {
      searchInput.addEventListener("input", renderExerciseList);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const nameInput = document.querySelector("[data-exercise-name]");
    const muscleInput = document.querySelector("[data-exercise-muscle]");
    const equipmentInput = document.querySelector("[data-exercise-equipment]");
    const notesInput = document.querySelector("[data-exercise-notes]");

    if (
      typeof window.validateBtForm === "function" &&
      !window.validateBtForm(form)
    ) {
      return;
    }

    const name = nameInput?.value.trim() || "";

    if (!name) {
      setFieldError(nameInput, "Informe o nome do exercício para cadastrar.");

      safeShowToast({
        title: "Campo obrigatório",
        message: "Informe o nome do exercício antes de continuar.",
        type: "warning",
      });

      nameInput?.focus();
      return;
    }

    storage.createExercise({
      name,
      muscleGroup: muscleInput?.value.trim() || "",
      equipment: equipmentInput?.value.trim() || "",
      notes: notesInput?.value.trim() || "",
    });

    form.reset();
    clearFormErrors(form);

    safeShowToast({
      title: "Exercício cadastrado",
      message: "O exercício foi salvo na sua biblioteca.",
      type: "success",
    });

    renderExerciseList();

    nameInput?.focus();
  }

  function renderExerciseList() {
    const list = document.querySelector("[data-exercise-list]");
    const searchInput = document.querySelector("[data-exercise-search]");

    if (!list) {
      return;
    }

    const query = searchInput?.value.trim().toLowerCase() || "";
    const exercises = storage.getStoredExercises();

    const filteredExercises = exercises.filter((exercise) => {
      const searchable = [
        exercise.name,
        exercise.muscleGroup,
        exercise.equipment,
        exercise.notes,
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });

    updateExerciseSummary(exercises);

    if (!exercises.length) {
      list.innerHTML = createEmptyState({
        title: "Nenhum exercício cadastrado ainda.",
        description:
          "Cadastre seu primeiro exercício para montar sua biblioteca.",
      });

      return;
    }

    if (!filteredExercises.length) {
      list.innerHTML = createEmptyState({
        title: "Nenhum exercício encontrado.",
        description: "Ajuste a busca para encontrar um exercício cadastrado.",
      });

      return;
    }

    list.innerHTML = filteredExercises.map(createExerciseCard).join("");

    setupDeleteButtons();
  }

  function updateExerciseSummary(exercises) {
    const countElement = document.querySelector("[data-exercise-count]");
    const topMuscleElement = document.querySelector(
      "[data-exercise-top-muscle]",
    );
    const equipmentCountElement = document.querySelector(
      "[data-exercise-equipment-count]",
    );
    const lastNameElement = document.querySelector("[data-exercise-last-name]");

    if (countElement) {
      countElement.textContent = String(exercises.length);
    }

    if (topMuscleElement) {
      topMuscleElement.textContent = getTopMuscleGroup(exercises);
    }

    if (equipmentCountElement) {
      equipmentCountElement.textContent = String(getEquipmentCount(exercises));
    }

    if (lastNameElement) {
      lastNameElement.textContent = getLastExerciseName(exercises);
    }
  }

  function getTopMuscleGroup(exercises) {
    const groups = exercises
      .map((exercise) => String(exercise.muscleGroup || "").trim())
      .filter(Boolean);

    if (!groups.length) {
      return "Não definido";
    }

    const countByGroup = groups.reduce((accumulator, group) => {
      accumulator[group] = (accumulator[group] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(countByGroup).sort((a, b) => b[1] - a[1])[0][0];
  }

  function getEquipmentCount(exercises) {
    const equipment = exercises
      .map((exercise) => String(exercise.equipment || "").trim())
      .filter(Boolean);

    return new Set(equipment).size;
  }

  function getLastExerciseName(exercises) {
    if (!exercises.length) {
      return "Nenhum";
    }

    const sortedExercises = [...exercises].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();

      return dateB - dateA;
    });

    return sortedExercises[0]?.name || "Nenhum";
  }

  function createExerciseCard(exercise) {
    const notes = String(exercise.notes || "").trim();

    return `
      <article class="workout-card" data-exercise-id="${escapeHTML(exercise.id)}">
        <div class="workout-card-header">
          <div>
            <h3 class="workout-card-title">
              ${escapeHTML(exercise.name)}
            </h3>

            ${notes
              ? `<p class="workout-card-description">${escapeHTML(notes)}</p>`
              : ""}
          </div>

          <span class="badge badge-info">Cadastrado</span>
        </div>

        <div class="workout-card-meta">
          <span class="workout-meta-pill">
            <i class="bi bi-bullseye" aria-hidden="true"></i>
            ${escapeHTML(exercise.muscleGroup || "Grupo não definido")}
          </span>

          <span class="workout-meta-pill">
            <i class="bi bi-tools" aria-hidden="true"></i>
            ${escapeHTML(exercise.equipment || "Equipamento não definido")}
          </span>
        </div>

        <div class="workout-card-actions">
          <button
            class="btn btn-outline"
            type="button"
            data-delete-exercise="${escapeHTML(exercise.id)}"
          >
            <i class="bi bi-trash" aria-hidden="true"></i>
            Excluir
          </button>
        </div>
      </article>
    `;
  }

  function setupDeleteButtons() {
    document.querySelectorAll("[data-delete-exercise]").forEach((button) => {
      button.addEventListener("click", async () => {
        const exerciseId = button.getAttribute("data-delete-exercise");

        if (!exerciseId) {
          return;
        }

        if (typeof window.showBtConfirmDialog !== "function") {
          safeShowToast({
            title: "Confirmação indisponível",
            message: "Não foi possível abrir a confirmação. Tente novamente.",
            type: "warning",
          });

          return;
        }

        const shouldDelete = await window.showBtConfirmDialog({
          title: "Excluir exercício?",
          message:
            "Essa ação vai remover o exercício da sua biblioteca. Você poderá cadastrá-lo novamente depois, se precisar.",
          confirmLabel: "Excluir exercício",
          cancelLabel: "Cancelar",
          variant: "danger",
          icon: "trash",
        });

        if (!shouldDelete) {
          return;
        }

        storage.deleteExercise(exerciseId);

        safeShowToast({
          title: "Exercício removido",
          message: "O exercício foi removido da biblioteca.",
          type: "success",
        });

        renderExerciseList();
      });
    });
  }

  function createEmptyState({ title, description }) {
    return `
      <article class="content-card">
        <div class="content-card-header">
          <div>
            <span class="badge badge-info">Estado vazio</span>

            <h3 class="content-card-title mt-md">
              ${escapeHTML(title)}
            </h3>

            <p class="content-card-description mt-sm">
              ${escapeHTML(description)}
            </p>
          </div>
        </div>
      </article>
    `;
  }

  function setFieldError(field, message) {
    if (!field) {
      return;
    }

    const inputGroup = field.closest(".input-group") || field.parentElement;

    field.classList.add("input-error");
    field.setAttribute("aria-invalid", "true");

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

  function clearFormErrors(form) {
    if (!form) {
      return;
    }

    form.querySelectorAll(".input-error").forEach((field) => {
      field.classList.remove("input-error");
      field.removeAttribute("aria-invalid");
    });

    form
      .querySelectorAll(".form-error, [data-bt-form-error]")
      .forEach((item) => {
        item.textContent = "";
      });
  }

  function safeShowToast({ title, message, type }) {
    if (typeof window.showToast === "function") {
      window.showToast({ title, message, type });
    }
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
