/* =========================================================
   Workout form
   Arquivo: workout-form.js
   Responsabilidade:
   - Controlar o formulário de criação de treino
   - Adicionar/remover exercícios
   - Atualizar resumo lateral
   - Validar campos
   - Salvar treino na biblioteca local
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const workoutForm = document.getElementById("workoutForm");
  const addExerciseButton = document.getElementById("addExerciseButton");
  const exerciseBuilder = document.getElementById("exerciseBuilder");
  const saveWorkoutButton = document.getElementById("saveWorkoutButton");
  const storage = window.BoraTreinarStorage;
  const registeredExercises = storage?.getStoredExercises
    ? storage.getStoredExercises()
    : [];
  const params = new URLSearchParams(window.location.search);
  const editingWorkoutId = params.get("id");
  const editingWorkout =
    editingWorkoutId && storage?.getWorkoutById
      ? storage.getWorkoutById(editingWorkoutId)
      : null;

  const isEditMode = Boolean(editingWorkoutId && editingWorkout);

  const workoutNameInput = document.getElementById("workoutName");
  const workoutGoalInput = document.getElementById("workoutGoal");
  const workoutLevelInput = document.getElementById("workoutLevel");
  const workoutFrequencyInput = document.getElementById("workoutFrequency");
  const workoutDescriptionInput = document.getElementById("workoutDescription");

  const workoutNameError = document.getElementById("workoutNameError");
  const workoutGoalError = document.getElementById("workoutGoalError");
  const workoutLevelError = document.getElementById("workoutLevelError");
  const workoutFrequencyError = document.getElementById(
    "workoutFrequencyError",
  );

  const summaryName = document.getElementById("summaryName");
  const summaryGoal = document.getElementById("summaryGoal");
  const summaryLevel = document.getElementById("summaryLevel");
  const summaryFrequency = document.getElementById("summaryFrequency");
  const summaryExercises = document.getElementById("summaryExercises");

  const LEGACY_WORKOUTS_KEY = "bora_treinar_mock_workouts";

  let exerciseCounter = 1;
  let activeExerciseItem = null;
  let exerciseTrackScrollFrame = null;

  const labels = {
    goals: {
      hypertrophy: "Hipertrofia",
      strength: "Força",
      conditioning: "Condicionamento",
      "weight-loss": "Emagrecimento",
      mobility: "Mobilidade",
    },
    levels: {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    },
    frequencies: {
      2: "2x por semana",
      3: "3x por semana",
      4: "4x por semana",
      5: "5x por semana",
      6: "6x por semana",
    },
  };

  if (!workoutForm || !exerciseBuilder) {
    console.warn("Formulário de treino não encontrado.");
    return;
  }

  bindEvents();
  setupCustomSelects();

  if (editingWorkoutId && !editingWorkout) {
    renderWorkoutNotFoundState();
    return;
  }

  if (isEditMode) {
    hydrateFormForEdit(editingWorkout);
  } else {
    enhanceExerciseItems();
    updateExerciseLabels();
    updateSummary();
  }

  updateFormModeUI();

  function bindEvents() {
    if (addExerciseButton) {
      addExerciseButton.addEventListener("click", addExerciseItem);
    }

    workoutForm.addEventListener("submit", handleSubmit);

    [
      workoutNameInput,
      workoutGoalInput,
      workoutLevelInput,
      workoutFrequencyInput,
      workoutDescriptionInput,
    ].forEach((field) => {
      if (field) {
        field.addEventListener("input", updateSummary);
        field.addEventListener("change", updateSummary);
      }
    });

    exerciseBuilder.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-exercise]");

      if (removeButton) {
        removeExerciseItem(removeButton);
        return;
      }

      const librarySearchInput = event.target.closest(
        "[data-library-search-input]",
      );

      if (librarySearchInput) {
        return;
      }

      const libraryOption = event.target.closest("[data-library-list-option]");

      if (libraryOption) {
        applyLibraryExerciseToActiveItem(
          libraryOption.getAttribute("data-value") || "",
        );
        closeExerciseLibraryList();
        return;
      }

      const libraryToggle = event.target.closest("[data-library-list-toggle]");

      if (libraryToggle) {
        const list = exerciseBuilder.querySelector("[data-library-list]");

        if (!list) {
          return;
        }

        list.classList.toggle("is-open");
        libraryToggle.setAttribute(
          "aria-expanded",
          list.classList.contains("is-open") ? "true" : "false",
        );

        return;
      }

      const clickedItem = event.target.closest(".exercise-builder-item");

      if (clickedItem) {
        setActiveExerciseItem(clickedItem);
      }

      const toggleButton = event.target.closest(
        "[data-library-exercise-toggle]",
      );

      if (toggleButton) {
        return;
      }

      const optionButton = event.target.closest(
        "[data-library-exercise-option]",
      );

      if (!optionButton) {
        return;
      }

      const customSelect = optionButton.closest(
        "[data-library-exercise-custom]",
      );
      const exerciseItem = optionButton.closest(".exercise-builder-item");
      const hiddenInput = exerciseItem?.querySelector(
        "[data-library-exercise-select]",
      );
      const label = customSelect?.querySelector(
        "[data-library-exercise-label]",
      );
      const selectedValue = optionButton.getAttribute("data-value") || "";

      if (!customSelect || !exerciseItem || !hiddenInput || !label) {
        return;
      }

      hiddenInput.value = selectedValue;
      label.textContent = optionButton.textContent.trim();

      customSelect
        .querySelectorAll("[data-library-exercise-option]")
        .forEach((option) => {
          option.classList.toggle("is-selected", option === optionButton);
        });

      customSelect.classList.remove("is-open");
      exerciseItem.classList.remove("is-select-open");

      applyRegisteredExercise(hiddenInput);
    });

    exerciseBuilder.addEventListener("input", () => {
      updateExerciseLabels();
      updateSummary();
    });

    exerciseBuilder.addEventListener("input", (event) => {
      if (event.target.matches("[data-library-search-input]")) {
        filterExerciseLibraryList(event.target.value);
      }
    });

    exerciseBuilder.addEventListener("focusin", (event) => {
      const item = event.target.closest(".exercise-builder-item");

      if (item) {
        setActiveExerciseItem(item);
      }
    });

    exerciseBuilder.addEventListener("scroll", (event) => {
      if (!event.target.matches("[data-exercise-builder-track]")) {
        return;
      }

      window.cancelAnimationFrame(exerciseTrackScrollFrame);
      exerciseTrackScrollFrame = window.requestAnimationFrame(() => {
        syncActiveExerciseFromTrack(event.target);
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest("[data-library-exercise-custom]")) {
        closeExerciseLibrarySelects();
      }

      if (!event.target.closest("[data-exercise-library-carousel]")) {
        closeExerciseLibraryList();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeExerciseLibrarySelects();
        closeExerciseLibraryList();
      }
    });
  }
  function setupCustomSelects() {
    const customSelects = document.querySelectorAll("[data-custom-select-for]");

    customSelects.forEach((customSelect) => {
      const selectId = customSelect.getAttribute("data-custom-select-for");
      const nativeSelect = document.getElementById(selectId);
      const button = customSelect.querySelector(".bt-select-button");
      const label = customSelect.querySelector("[data-selected-label]");
      const options = customSelect.querySelectorAll("[data-value]");

      if (!nativeSelect || !button || !label) {
        return;
      }

      button.addEventListener("click", () => {
        closeOtherCustomSelects(customSelect);
        customSelect.classList.toggle("is-open");
      });

      options.forEach((option) => {
        option.addEventListener("click", () => {
          const value = option.getAttribute("data-value");
          const text = option.textContent.trim();

          nativeSelect.value = value;
          label.textContent = text;

          options.forEach((item) => {
            item.classList.remove("is-selected");
          });

          option.classList.add("is-selected");
          customSelect.classList.remove("is-open");

          nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
        });
      });
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".bt-select")) {
        closeOtherCustomSelects();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeOtherCustomSelects();
      }
    });
  }

  function closeOtherCustomSelects(currentSelect = null) {
    document.querySelectorAll(".bt-select.is-open").forEach((select) => {
      if (select !== currentSelect) {
        select.classList.remove("is-open");
      }
    });
  }

  function addExerciseItem() {
    exerciseCounter += 1;

    const exerciseItem = createExerciseItemElement(exerciseCounter);

    getExerciseTrack().appendChild(exerciseItem);

    enhanceExerciseItems();
    setActiveExerciseItem(exerciseItem);
    updateExerciseLabels();
    updateSummary();
    scrollExerciseItemIntoView(exerciseItem);

    const firstInput = exerciseItem.querySelector('input:not([type="hidden"])');

    if (firstInput) {
      firstInput.focus();
    }
  }

  function removeExerciseItem(button) {
    const exerciseItem = button.closest(".exercise-builder-item");

    if (!exerciseItem) {
      return;
    }

    const totalItems = getExerciseItems().length;

    if (totalItems <= 1) {
      showToast({
        title: "Treino",
        message: "O treino precisa ter pelo menos um exercício.",
        type: "warning",
      });

      return;
    }

    exerciseItem.remove();

    setActiveExerciseItem(getExerciseItems()[0] || null);
    updateExerciseLabels();
    updateSummary();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    clearErrors();

    const workout = collectWorkoutData();

    if (!validateWorkout(workout)) {
      return;
    }

    try {
      setLoading(true);

      await saveWorkout(workout);

      showToast({
        title: isEditMode ? "Treino atualizado" : "Treino salvo",
        message: isEditMode
          ? "As alterações do treino foram salvas."
          : "Seu treino foi criado com sucesso.",
        type: "success",
      });

      window.setTimeout(() => {
        const redirectUrl = isEditMode
          ? `./workout-detail.html?id=${encodeURIComponent(editingWorkoutId)}`
          : "./workouts.html";

        window.location.href = redirectUrl;
      }, 700);
    } catch {
      showToast({
        title: "Erro",
        message: isEditMode
          ? "Não foi possível atualizar o treino. Tente novamente."
          : "Não foi possível salvar o treino. Tente novamente.",
        type: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  function collectWorkoutData() {
    updateExerciseLabels();

    return {
      id: isEditMode ? editingWorkoutId : `workout-${Date.now()}`,
      name: workoutNameInput.value.trim(),
      goal: workoutGoalInput.value,
      goalLabel: getSelectedText(workoutGoalInput),
      level: workoutLevelInput.value,
      levelLabel: getSelectedText(workoutLevelInput),
      frequency: workoutFrequencyInput.value,
      frequencyLabel: getSelectedText(workoutFrequencyInput),
      description: workoutDescriptionInput.value.trim(),
      status: isEditMode ? editingWorkout.status || "ACTIVE" : "DRAFT",
      progress: isEditMode ? editingWorkout.progress || 0 : 0,
      createdAt: isEditMode
        ? editingWorkout.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      exercises: collectExercises(),
    };
  }

  function collectExercises() {
    return getExerciseItems()
      .map((item, index) => {
        const librarySelect = item.querySelector(
          "[data-library-exercise-select]",
        );
        const exerciseName = item.querySelector('input[name="exerciseName[]"]');
        const sets = item.querySelector('input[name="sets[]"]');
        const reps = item.querySelector('input[name="reps[]"]');
        const rest = item.querySelector('input[name="rest[]"]');

        const selectedExercise = getRegisteredExerciseById(
          librarySelect ? librarySelect.value : "",
        );

        return {
          order: index + 1,
          libraryExerciseId: selectedExercise?.id || "",
          name: exerciseName ? exerciseName.value.trim() : "",
          muscleGroup: selectedExercise?.muscleGroup || "",
          equipment: selectedExercise?.equipment || "",
          notes: selectedExercise?.notes || "",
          sets: sets ? sets.value.trim() : "",
          reps: reps ? reps.value.trim() : "",
          rest: rest ? rest.value.trim() : "",
        };
      })
      .filter((exercise) => {
        return exercise.name || exercise.sets || exercise.reps || exercise.rest;
      });
  }

  function validateWorkout(workout) {
    let isValid = true;

    if (isEmpty(workout.name)) {
      setFieldError(
        workoutNameInput,
        workoutNameError,
        "Informe o nome do treino.",
      );
      isValid = false;
    } else if (workout.name.length < 3) {
      setFieldError(
        workoutNameInput,
        workoutNameError,
        "O nome deve ter pelo menos 3 caracteres.",
      );
      isValid = false;
    }

    if (isEmpty(workout.goal)) {
      setFieldError(
        workoutGoalInput,
        workoutGoalError,
        "Selecione um objetivo.",
      );
      isValid = false;
    }

    if (isEmpty(workout.level)) {
      setFieldError(
        workoutLevelInput,
        workoutLevelError,
        "Selecione um nível.",
      );
      isValid = false;
    }

    if (isEmpty(workout.frequency)) {
      setFieldError(
        workoutFrequencyInput,
        workoutFrequencyError,
        "Selecione uma frequência.",
      );
      isValid = false;
    }

    if (!workout.exercises.length) {
      showToast({
        title: "Exercícios",
        message: "Adicione pelo menos um exercício ao treino.",
        type: "warning",
      });

      const firstExerciseInput = exerciseBuilder.querySelector(
        'input[name="exerciseName[]"]',
      );

      if (firstExerciseInput) {
        firstExerciseInput.focus();
      }

      isValid = false;
    }

    if (!isValid) {
      focusFirstInvalidField();
    }

    return isValid;
  }

  async function saveWorkout(workout) {
    await delay(350);

    if (window.BoraTreinarStorage) {
      if (isEditMode && window.BoraTreinarStorage.updateWorkout) {
        window.BoraTreinarStorage.updateWorkout(editingWorkoutId, {
          ...workout,
          status: "ACTIVE",
        });

        return;
      }

      if (window.BoraTreinarStorage.createWorkout) {
        window.BoraTreinarStorage.createWorkout({
          ...workout,
          status: "ACTIVE",
        });

        return;
      }
    }

    const currentWorkouts = getLocalWorkouts();

    if (isEditMode) {
      const workoutIndex = currentWorkouts.findIndex((item) => {
        return item.id === editingWorkoutId;
      });

      if (workoutIndex >= 0) {
        currentWorkouts[workoutIndex] = {
          ...currentWorkouts[workoutIndex],
          ...workout,
          updatedAt: new Date().toISOString(),
        };
      }
    } else {
      currentWorkouts.unshift(workout);
    }

    if (storage?.saveStoredWorkouts) {
      storage.saveStoredWorkouts(currentWorkouts);
      return;
    }

    localStorage.setItem(LEGACY_WORKOUTS_KEY, JSON.stringify(currentWorkouts));
  }

  function getLocalWorkouts() {
    if (storage?.getStoredWorkouts) {
      return storage.getStoredWorkouts();
    }

    try {
      const storedWorkouts = localStorage.getItem(LEGACY_WORKOUTS_KEY);

      return storedWorkouts ? JSON.parse(storedWorkouts) : [];
    } catch {
      return [];
    }
  }

  function enhanceExerciseItems() {
    renderExerciseLibraryCarousel();
    ensureExerciseCardsTrack();

    getExerciseItems().forEach((item) => {
      if (item.querySelector("[data-library-exercise-select]")) {
        return;
      }

      ensureLibraryExerciseInput(item);
    });

    setActiveExerciseItem(activeExerciseItem || getExerciseItems()[0] || null);
  }

  function ensureExerciseCardsTrack() {
    const track = getExerciseTrack();
    const looseItems = Array.from(
      exerciseBuilder.children,
    ).filter((child) => {
      return child.classList.contains("exercise-builder-item");
    });

    looseItems.forEach((item) => {
      track.appendChild(item);
    });
  }

  function getExerciseTrack() {
    let track = exerciseBuilder.querySelector("[data-exercise-builder-track]");

    if (!track) {
      track = document.createElement("div");
      track.className = "exercise-builder-track";
      track.setAttribute("data-exercise-builder-track", "");
      exerciseBuilder.appendChild(track);
    }

    bindExerciseTrackScroll(track);

    return track;
  }

  function bindExerciseTrackScroll(track) {
    if (!track || track.dataset.exerciseTrackScrollReady) {
      return;
    }

    track.dataset.exerciseTrackScrollReady = "true";

    track.addEventListener("scroll", () => {
      window.cancelAnimationFrame(exerciseTrackScrollFrame);
      exerciseTrackScrollFrame = window.requestAnimationFrame(() => {
        syncActiveExerciseFromTrack(track);
      });
    });
  }

  function renderExerciseLibraryCarousel() {
    let carousel = exerciseBuilder.querySelector(
      "[data-exercise-library-carousel]",
    );

    if (!carousel) {
      carousel = document.createElement("div");
      carousel.className = "exercise-library-carousel";
      carousel.setAttribute("data-exercise-library-carousel", "");
      exerciseBuilder.prepend(carousel);
    }

    if (!registeredExercises.length) {
      carousel.innerHTML = `
      <div class="exercise-library-carousel-header">
        <div>
          <span class="badge badge-info">Biblioteca</span>
          <strong>Exercícios salvos</strong>
        </div>
      </div>

      <div class="exercise-library-empty">
        <span>Nenhum exercício cadastrado na biblioteca.</span>
        <a href="../exercises/exercises.html">Cadastrar exercício</a>
      </div>
    `;
      return;
    }

    carousel.innerHTML = `
      <div class="exercise-library-carousel-header">
        <div>
          <span class="badge badge-info">Biblioteca</span>
          <strong>Escolha um exercício salvo</strong>
        </div>
      </div>

      <button
        class="exercise-library-list-toggle"
        type="button"
        data-library-list-toggle
        aria-expanded="false"
      >
        <span>Selecionar da biblioteca</span>
        <i class="bi bi-chevron-down" aria-hidden="true"></i>
      </button>

      <div class="exercise-library-list" data-library-list>
        <div class="exercise-library-search">
          <i class="bi bi-search" aria-hidden="true"></i>
          <input
            type="search"
            placeholder="Buscar exercício"
            data-library-search-input
            aria-label="Buscar exercício cadastrado"
          />
        </div>

        <div class="exercise-library-list-options">
          ${registeredExercises.map(createExerciseLibraryListOption).join("")}
        </div>
      </div>
    `;
  }

  function createExerciseLibraryListOption(exercise) {
    return `
      <button
        class="exercise-library-list-option"
        type="button"
        data-library-list-option
        data-value="${escapeHTML(exercise.id)}"
        data-library-search-text="${escapeHTML(
          [exercise.name, exercise.muscleGroup, exercise.equipment]
            .join(" ")
            .toLowerCase(),
        )}"
      >
        <strong>${escapeHTML(exercise.name)}</strong>
        <span>${escapeHTML(exercise.muscleGroup || "Grupo não definido")}</span>
      </button>
    `;
  }

  function ensureLibraryExerciseInput(item) {
    if (item.querySelector("[data-library-exercise-select]")) {
      return;
    }

    const input = document.createElement("input");
    input.type = "hidden";
    input.setAttribute("data-library-exercise-select", "");
    input.value = "";

    item.prepend(input);
  }

  function setActiveExerciseItem(item) {
    const items = getExerciseItems();
    const nextActiveItem = item && items.includes(item) ? item : items[0] || null;

    items.forEach((exerciseItem) => {
      exerciseItem.classList.toggle(
        "is-active-exercise",
        exerciseItem === nextActiveItem,
      );
    });

    activeExerciseItem = nextActiveItem;

    updateExerciseCarouselDots();
  }

  function applyLibraryExerciseToActiveItem(exerciseId) {
    const item = activeExerciseItem || getExerciseItems()[0];
    const selectedExercise = getRegisteredExerciseById(exerciseId);

    if (!item || !selectedExercise) {
      return;
    }

    setActiveExerciseItem(item);

    const librarySelect = item.querySelector("[data-library-exercise-select]");

    if (librarySelect) {
      librarySelect.value = selectedExercise.id;
    }

    applyRegisteredExercise(librarySelect);
  }

  function filterExerciseLibraryList(query) {
    const normalizedQuery = String(query || "").trim().toLowerCase();

    exerciseBuilder
      .querySelectorAll("[data-library-list-option]")
      .forEach((option) => {
        const searchable = option.getAttribute("data-library-search-text") || "";

        option.hidden = normalizedQuery
          ? !searchable.includes(normalizedQuery)
          : false;
      });
  }

  function closeExerciseLibraryList() {
    const list = exerciseBuilder.querySelector("[data-library-list]");
    const toggle = exerciseBuilder.querySelector("[data-library-list-toggle]");

    list?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  }

  function updateExerciseCarouselDots() {
    const track = exerciseBuilder.querySelector("[data-exercise-builder-track]");
    let dots = exerciseBuilder.querySelector("[data-exercise-carousel-dots]");
    const items = getExerciseItems();

    if (!track || !items.length) {
      dots?.remove();
      return;
    }

    if (!dots) {
      dots = document.createElement("div");
      dots.className = "exercise-carousel-dots";
      dots.setAttribute("data-exercise-carousel-dots", "");
      track.after(dots);
    }

    dots.innerHTML = items
      .map((item, index) => {
        const isActive = item === activeExerciseItem;

        return `
          <button
            class="exercise-carousel-dot${isActive ? " is-active" : ""}"
            type="button"
            data-exercise-carousel-dot="${index}"
            aria-label="Ver exercício ${index + 1}"
          ></button>
        `;
      })
      .join("");

    dots.querySelectorAll("[data-exercise-carousel-dot]").forEach((dot) => {
      dot.addEventListener("click", () => {
        const index = Number(dot.getAttribute("data-exercise-carousel-dot"));
        const item = items[index];

        if (!item) {
          return;
        }

        setActiveExerciseItem(item);
        scrollExerciseItemIntoView(item);
      });
    });
  }

  function scrollExerciseItemIntoView(item) {
    if (!item || window.matchMedia("(min-width: 1201px)").matches) {
      return;
    }

    item.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }

  function syncActiveExerciseFromTrack(track) {
    const items = getExerciseItems();

    if (!items.length) {
      return;
    }

    const trackLeft = track.getBoundingClientRect().left;
    const nearestItem = items
      .map((item) => {
        return {
          item,
          distance: Math.abs(item.getBoundingClientRect().left - trackLeft),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.item;

    if (nearestItem && nearestItem !== activeExerciseItem) {
      setActiveExerciseItem(nearestItem);
    }
  }

  function createExerciseLibraryPickerHTML() {
    if (!registeredExercises.length) {
      return `
      <label>Biblioteca de exercícios</label>

      <div class="exercise-library-empty">
        <span>Nenhum exercício cadastrado na biblioteca.</span>
        <a href="../exercises/exercises.html">Cadastrar exercício</a>
      </div>
    `;
    }

    return `
    <label>Selecionar da biblioteca</label>

    <div class="bt-library-select" data-library-exercise-custom>
      <input type="hidden" data-library-exercise-select value="" />

      <button
        class="bt-library-select-button"
        type="button"
        data-library-exercise-toggle
        aria-haspopup="listbox"
        aria-expanded="false"
      >
        <span data-library-exercise-label>
          Digite manualmente ou selecione um exercício
        </span>

        <i class="bi bi-chevron-down" aria-hidden="true"></i>
      </button>

      <div class="bt-library-select-menu" role="listbox">
        <button
          class="bt-library-select-option is-selected"
          type="button"
          data-library-exercise-option
          data-value=""
          role="option"
        >
          Digite manualmente ou selecione um exercício
        </button>

        ${registeredExercises
          .map((exercise) => {
            return `
              <button
                class="bt-library-select-option"
                type="button"
                data-library-exercise-option
                data-value="${escapeHTML(exercise.id)}"
                role="option"
              >
                ${escapeHTML(exercise.name)}
              </button>
            `;
          })
          .join("")}
      </div>
    </div>

    <small class="form-helper">
      Ao selecionar, o nome do exercício será preenchido automaticamente.
    </small>
  `;
  }

  function closeExerciseLibrarySelects(currentSelect = null) {
    document
      .querySelectorAll("[data-library-exercise-custom].is-open")
      .forEach((select) => {
        if (select !== currentSelect) {
          select.classList.remove("is-open");
          select
            .closest(".exercise-builder-item")
            ?.classList.remove("is-select-open");
        }
      });
  }

  function applyRegisteredExercise(librarySelect) {
    const selectedExercise = getRegisteredExerciseById(librarySelect.value);
    const item = librarySelect.closest(".exercise-builder-item");

    if (!selectedExercise || !item) {
      return;
    }

    const nameInput = item.querySelector('input[name="exerciseName[]"]');

    if (nameInput) {
      nameInput.value = selectedExercise.name;
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    updateExerciseLabels();
    updateSummary();
  }

  function getRegisteredExerciseById(exerciseId) {
    if (!exerciseId) {
      return null;
    }

    return (
      registeredExercises.find((exercise) => {
        return exercise.id === exerciseId;
      }) || null
    );
  }

  function updateFormModeUI() {
    const pageTitle = document.querySelector(".page-title");
    const pageDescription = document.querySelector(".page-description");
    const cardTitle = document.querySelector(".content-card-title");
    const saveIcon = saveWorkoutButton?.querySelector("i");

    if (pageTitle) {
      pageTitle.textContent = isEditMode ? "Editar treino" : "Novo treino";
    }

    if (pageDescription) {
      pageDescription.textContent = isEditMode
        ? "Atualize os dados e exercícios deste treino cadastrado."
        : "Monte sua rotina com dados reais e exercícios cadastrados.";
    }

    if (cardTitle) {
      cardTitle.textContent = isEditMode
        ? "Dados do treino"
        : "Informações do treino";
    }

    if (saveWorkoutButton) {
      saveWorkoutButton.dataset.defaultLabel = isEditMode
        ? "Salvar alterações"
        : "Salvar treino";

      saveWorkoutButton.innerHTML = `
      <i class="bi ${isEditMode ? "bi-check2-circle" : "bi-check2-circle"}" aria-hidden="true"></i>
      ${isEditMode ? "Salvar alterações" : "Salvar treino"}
    `;
    }

    if (saveIcon) {
      saveIcon.className = "bi bi-check2-circle";
    }

    document.title = `${isEditMode ? "Editar treino" : "Novo treino"} | Bora Treinar`;
  }

  function hydrateFormForEdit(workout) {
    workoutNameInput.value = workout.name || "";
    workoutGoalInput.value = workout.goal || "";
    workoutLevelInput.value = workout.level || "";
    workoutFrequencyInput.value = workout.frequency || "";
    workoutDescriptionInput.value = workout.description || "";

    syncCustomSelectLabel(workoutGoalInput);
    syncCustomSelectLabel(workoutLevelInput);
    syncCustomSelectLabel(workoutFrequencyInput);

    exerciseBuilder.innerHTML = "";

    const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];

    if (!exercises.length) {
      addExerciseItem();
      return;
    }

    exercises.forEach((exercise, index) => {
      const item = createExerciseItemElement(index + 1);
      getExerciseTrack().appendChild(item);
      enhanceExerciseItems();
      fillExerciseItem(item, exercise);
    });

    updateExerciseLabels();
    updateSummary();
  }

  function createExerciseItemElement(number) {
    const exerciseItem = document.createElement("div");

    exerciseItem.className = "exercise-builder-item";
    exerciseItem.dataset.exerciseItem = String(number);

    exerciseItem.innerHTML = `
    <div class="exercise-builder-item-header">
      <div>
        <span class="exercise-item-badge">Exercício ${number}</span>
        <h4 class="exercise-item-title">Novo exercício</h4>
      </div>

      <button
        class="exercise-remove-button"
        type="button"
        data-remove-exercise
        aria-label="Remover exercício"
      >
        <i class="bi bi-trash" aria-hidden="true"></i>
      </button>
    </div>

    <div class="exercise-builder-grid">
      <div class="input-group">
        <label for="exerciseName${number}">Exercício</label>

        <input
          type="text"
          id="exerciseName${number}"
          name="exerciseName[]"
          class="input"
          placeholder="Digite o nome do exercício"
        />
      </div>

      <div class="input-group">
        <label for="sets${number}">Séries</label>

        <input
          type="number"
          id="sets${number}"
          name="sets[]"
          class="input"
          min="1"
          placeholder="Séries"
        />
      </div>

      <div class="input-group">
        <label for="reps${number}">Reps</label>

        <input
          type="text"
          id="reps${number}"
          name="reps[]"
          class="input"
          placeholder="Repetições"
        />
      </div>

      <div class="input-group">
        <label for="rest${number}">Descanso</label>

        <input
          type="text"
          id="rest${number}"
          name="rest[]"
          class="input"
          placeholder="Descanso em segundos"
        />
      </div>
    </div>
  `;

    return exerciseItem;
  }

  function fillExerciseItem(item, exercise) {
    const librarySelect = item.querySelector("[data-library-exercise-select]");
    const libraryLabel = item.querySelector("[data-library-exercise-label]");
    const nameInput = item.querySelector('input[name="exerciseName[]"]');
    const setsInput = item.querySelector('input[name="sets[]"]');
    const repsInput = item.querySelector('input[name="reps[]"]');
    const restInput = item.querySelector('input[name="rest[]"]');

    if (librarySelect && exercise.libraryExerciseId) {
      const selectedExercise = getRegisteredExerciseById(
        exercise.libraryExerciseId,
      );

      librarySelect.value = exercise.libraryExerciseId;

      if (selectedExercise && libraryLabel) {
        libraryLabel.textContent = selectedExercise.name;
      }

      item
        .querySelectorAll("[data-library-exercise-option]")
        .forEach((option) => {
          option.classList.toggle(
            "is-selected",
            option.getAttribute("data-value") === exercise.libraryExerciseId,
          );
        });
    }

    if (nameInput) {
      nameInput.value = exercise.name || "";
    }

    if (setsInput) {
      setsInput.value = exercise.sets || "";
    }

    if (repsInput) {
      repsInput.value = exercise.reps || "";
    }

    if (restInput) {
      restInput.value = exercise.rest || exercise.restSeconds || "";
    }
  }

  function syncCustomSelectLabel(select) {
    if (!select) {
      return;
    }

    const customSelect = document.querySelector(
      `[data-custom-select-for="${select.id}"]`,
    );

    if (!customSelect) {
      return;
    }

    const label = customSelect.querySelector("[data-selected-label]");
    const options = customSelect.querySelectorAll("[data-value]");
    const selectedText = getSelectedText(select) || "Selecione";

    if (label) {
      label.textContent = selectedText;
    }

    options.forEach((option) => {
      option.classList.toggle(
        "is-selected",
        option.getAttribute("data-value") === select.value,
      );
    });
  }

  function renderWorkoutNotFoundState() {
    const pageContent = document.querySelector(".page-content");

    if (!pageContent) {
      return;
    }

    pageContent.innerHTML = `
    <section class="page-header">
      <div class="page-title-group">
        <h2 class="page-title">Treino não encontrado</h2>
        <p class="page-description">
          Não foi possível encontrar o treino selecionado para edição.
        </p>
      </div>

      <a class="btn btn-primary" href="./workouts.html">
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        Voltar para treinos
      </a>
    </section>

    <article class="content-card">
      <div class="content-card-header">
        <div>
          <span class="badge badge-warning">Sem dados</span>
          <h3 class="content-card-title mt-md">Nada para editar.</h3>
          <p class="content-card-description mt-sm">
            Abra a edição a partir de um treino cadastrado.
          </p>
        </div>
      </div>
    </article>
  `;
  }

  function updateSummary() {
    updateExerciseLabels();

    const exerciseCount = getExerciseItems().length;

    setText(summaryName, workoutNameInput.value.trim() || "Novo treino");

    setText(
      summaryGoal,
      labels.goals[workoutGoalInput.value] || "Não definido",
    );

    setText(
      summaryLevel,
      labels.levels[workoutLevelInput.value] || "Não definido",
    );

    setText(
      summaryFrequency,
      labels.frequencies[workoutFrequencyInput.value] || "Não definida",
    );

    setText(summaryExercises, String(exerciseCount));
  }

  function updateExerciseLabels() {
    const items = getExerciseItems();

    items.forEach((item, index) => {
      const displayNumber = index + 1;

      const badge = item.querySelector(".exercise-item-badge");
      const title = item.querySelector(".exercise-item-title");

      const nameInput = item.querySelector('input[name="exerciseName[]"]');
      const setsInput = item.querySelector('input[name="sets[]"]');
      const repsInput = item.querySelector('input[name="reps[]"]');
      const restInput = item.querySelector('input[name="rest[]"]');
      const librarySelect = item.querySelector(
        "[data-library-exercise-select]",
      );

      if (badge) {
        badge.textContent = `Exercício ${displayNumber}`;
      }

      if (title) {
        const exerciseName = nameInput ? nameInput.value.trim() : "";
        title.textContent = exerciseName || "Novo exercício";
      }

      updateInputAndLabel(librarySelect, `libraryExercise${displayNumber}`);
      updateInputAndLabel(nameInput, `exerciseName${displayNumber}`);
      updateInputAndLabel(setsInput, `sets${displayNumber}`);
      updateInputAndLabel(repsInput, `reps${displayNumber}`);
      updateInputAndLabel(restInput, `rest${displayNumber}`);

      item.dataset.exerciseItem = String(displayNumber);
    });

    exerciseCounter = items.length;
  }

  function updateInputAndLabel(input, newId) {
    if (!input) {
      return;
    }

    const inputGroup = input.closest(".input-group");
    const label = inputGroup ? inputGroup.querySelector("label") : null;

    input.id = newId;

    if (label) {
      label.setAttribute("for", newId);
    }
  }

  function getExerciseItems() {
    return Array.from(
      exerciseBuilder.querySelectorAll(".exercise-builder-item"),
    );
  }

  function getSelectedText(select) {
    if (!select || !select.selectedOptions || !select.selectedOptions.length) {
      return "";
    }

    return select.selectedOptions[0].textContent.trim();
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
    [
      workoutNameInput,
      workoutGoalInput,
      workoutLevelInput,
      workoutFrequencyInput,
    ].forEach((input) => {
      if (input) {
        input.classList.remove("input-error");
      }
    });

    [
      workoutNameError,
      workoutGoalError,
      workoutLevelError,
      workoutFrequencyError,
    ].forEach((element) => {
      if (element) {
        element.textContent = "";
      }
    });
  }

  function focusFirstInvalidField() {
    const firstInvalidInput = workoutForm.querySelector(".input-error");

    if (firstInvalidInput) {
      firstInvalidInput.focus();
    }
  }

  function setLoading(isLoading) {
    if (!saveWorkoutButton) {
      return;
    }

    if (isLoading) {
      saveWorkoutButton.dataset.originalHtml = saveWorkoutButton.innerHTML;
      saveWorkoutButton.disabled = true;
      saveWorkoutButton.innerHTML = `
        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
        Salvando...
      `;
      return;
    }

    saveWorkoutButton.disabled = false;
    saveWorkoutButton.innerHTML =
      saveWorkoutButton.dataset.originalHtml ||
      `
    <i class="bi bi-check2-circle" aria-hidden="true"></i>
    ${isEditMode ? "Salvar alterações" : "Salvar treino"}
  `;
  }

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
});
