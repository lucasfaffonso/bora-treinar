/* =========================================================
   Workout form backend guard
   Impede salvamento duplicado local/backend e valida payload da API.
   ========================================================= */

(function (window, document) {
  "use strict";

  function shouldRun() {
    return Boolean(
      document.body?.dataset?.page === "workout-form" &&
        typeof window.isLocalAuthEnabled === "function" &&
        !window.isLocalAuthEnabled() &&
        typeof window.apiPost === "function",
    );
  }

  function initWorkoutFormBackendGuard() {
    if (!shouldRun()) return;

    const form = document.getElementById("workoutForm");

    if (!form || form.dataset.backendGuardReady === "true") return;

    form.dataset.backendGuardReady = "true";
    form.addEventListener("submit", handleBackendSubmit, true);
  }

  async function handleBackendSubmit(event) {
    if (!shouldRun()) return;

    event.preventDefault();
    event.stopPropagation();

    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }

    const form = event.currentTarget;
    const submitButton = form.querySelector("button[type='submit']");
    const workoutId = new URLSearchParams(window.location.search).get("id");

    clearValidationState(form);

    const formData = collectWorkoutFormData(form);
    const validation = validateWorkoutFormData(form, formData);

    if (!validation.isValid) {
      focusField(validation.focusElement);
      showValidationToast(validation.message);
      return;
    }

    const payload = toBackendPayload(formData);

    setLoading(submitButton, true);

    try {
      const response = workoutId
        ? await window.apiPut(`/workouts/${encodeURIComponent(workoutId)}`, payload)
        : await window.apiPost("/workouts", payload);
      const workout = unwrapApiData(response);

      cacheWorkout(workout);

      window.showToast?.({
        title: workoutId ? "Treino atualizado" : "Treino salvo",
        message: workoutId
          ? "As alterações foram salvas com sucesso."
          : "Seu treino foi criado com sucesso.",
        type: "success",
      });

      window.setTimeout(() => {
        window.location.href = workoutId
          ? `./workout-detail.html?id=${encodeURIComponent(workoutId)}`
          : "./workouts.html";
      }, 500);
    } catch (error) {
      showValidationToast(getApiErrorMessage(error));
      setLoading(submitButton, false);
    }
  }

  function collectWorkoutFormData(form) {
    const exerciseItems = Array.from(
      form.querySelectorAll("[data-exercise-item], .exercise-builder-item"),
    ).filter((item, index, items) => items.indexOf(item) === index);

    return {
      name: getFieldValue(form, "#workoutName"),
      description: getFieldValue(form, "#workoutDescription"),
      goal: getFieldValue(form, "#workoutGoal"),
      level: getFieldValue(form, "#workoutLevel"),
      frequency: getFieldValue(form, "#workoutFrequency"),
      exercises: exerciseItems.map((item, index) => ({
        item,
        index,
        name: getItemFieldValue(item, 'input[name="exerciseName[]"]'),
        sets: getItemFieldValue(item, 'input[name="sets[]"]'),
        reps: getItemFieldValue(item, 'input[name="reps[]"]'),
        rest: getItemFieldValue(item, 'input[name="rest[]"]'),
      })),
    };
  }

  function validateWorkoutFormData(form, data) {
    if (data.name.length < 3) {
      const field = form.querySelector("#workoutName");
      markInvalid(field);

      return invalid("Informe um nome de treino com pelo menos 3 caracteres.", field);
    }

    if (!data.goal) {
      const field = form.querySelector("#workoutGoal");
      markInvalid(field);

      return invalid("Selecione o objetivo do treino.", field);
    }

    if (!data.level) {
      const field = form.querySelector("#workoutLevel");
      markInvalid(field);

      return invalid("Selecione o nível do treino.", field);
    }

    if (!Number.isFinite(Number(data.frequency)) || Number(data.frequency) <= 0) {
      const field = form.querySelector("#workoutFrequency");
      markInvalid(field);

      return invalid("Selecione a frequência semanal do treino.", field);
    }

    if (!data.exercises.length) {
      return invalid("Adicione pelo menos um exercício ao treino.", null);
    }

    for (const exercise of data.exercises) {
      const exerciseNumber = exercise.index + 1;
      const nameField = exercise.item.querySelector('input[name="exerciseName[]"]');
      const setsField = exercise.item.querySelector('input[name="sets[]"]');
      const repsField = exercise.item.querySelector('input[name="reps[]"]');
      const restField = exercise.item.querySelector('input[name="rest[]"]');
      const sets = Number(exercise.sets);
      const restSeconds = parseRestSeconds(exercise.rest);

      if (!exercise.name) {
        markInvalid(nameField);

        return invalid(`Informe o nome do exercício ${exerciseNumber}.`, nameField);
      }

      if (!Number.isInteger(sets) || sets <= 0) {
        markInvalid(setsField);

        return invalid(`Informe a quantidade de séries do exercício ${exerciseNumber}.`, setsField);
      }

      if (!exercise.reps) {
        markInvalid(repsField);

        return invalid(`Informe as repetições do exercício ${exerciseNumber}.`, repsField);
      }

      if (!Number.isInteger(restSeconds) || restSeconds <= 0) {
        markInvalid(restField);

        return invalid(`Informe o descanso em segundos do exercício ${exerciseNumber}.`, restField);
      }
    }

    return {
      isValid: true,
      message: "",
      focusElement: null,
    };
  }

  function toBackendPayload(data) {
    return {
      name: data.name,
      description: data.description || null,
      goal: data.goal,
      level: data.level,
      weeklyFrequency: Number(data.frequency),
      exercises: data.exercises.map((exercise, index) => ({
        exerciseName: exercise.name,
        exerciseOrder: index + 1,
        sets: Number(exercise.sets),
        reps: exercise.reps,
        restSeconds: parseRestSeconds(exercise.rest),
        notes: null,
      })),
    };
  }

  function cacheWorkout(workout) {
    const storage = window.BoraTreinarStorage;

    if (!workout || !storage?.getStoredWorkouts || !storage?.saveStoredWorkouts) {
      return;
    }

    const normalizedWorkout = normalizeBackendWorkout(workout);
    const workouts = storage.getStoredWorkouts();
    const index = workouts.findIndex((item) => String(item.id) === String(normalizedWorkout.id));

    if (index >= 0) {
      workouts[index] = normalizedWorkout;
    } else {
      workouts.unshift(normalizedWorkout);
    }

    storage.saveStoredWorkouts(workouts);
  }

  function normalizeBackendWorkout(workout) {
    const frequency = String(workout.weeklyFrequency ?? workout.frequency ?? "").trim();
    const goal = String(workout.goal || "").trim();
    const level = String(workout.level || "").trim();

    return {
      id: String(workout.id || ""),
      name: String(workout.name || "").trim(),
      description: String(workout.description || "").trim(),
      goal,
      goalLabel: getGoalLabel(goal),
      level,
      levelLabel: getLevelLabel(level),
      frequency,
      frequencyLabel: frequency ? `${frequency}x por semana` : "Não definida",
      status: workout.active === false ? "INACTIVE" : workout.status || "ACTIVE",
      progress: Number(workout.progress || 0),
      createdAt: workout.createdAt || new Date().toISOString(),
      updatedAt: workout.updatedAt || workout.createdAt || new Date().toISOString(),
      exercises: Array.isArray(workout.exercises)
        ? workout.exercises.map(normalizeBackendExercise).filter(Boolean)
        : [],
    };
  }

  function normalizeBackendExercise(exercise, index) {
    if (!exercise || typeof exercise !== "object") return null;

    const restSeconds = parseRestSeconds(exercise.restSeconds ?? exercise.rest);

    return {
      id: exercise.id ? String(exercise.id) : "",
      order: Number(exercise.exerciseOrder ?? exercise.order ?? index + 1),
      name: String(exercise.exerciseName || exercise.name || "").trim(),
      sets: Number(exercise.sets || 0),
      reps: String(exercise.reps || "").trim(),
      rest: restSeconds ? String(restSeconds) : "",
      restSeconds,
    };
  }

  function getGoalLabel(value) {
    return {
      hypertrophy: "Hipertrofia",
      strength: "Força",
      conditioning: "Condicionamento",
      "weight-loss": "Emagrecimento",
      mobility: "Mobilidade",
    }[value] || value || "Não definido";
  }

  function getLevelLabel(value) {
    return {
      beginner: "Iniciante",
      intermediate: "Intermediário",
      advanced: "Avançado",
    }[value] || value || "Não definido";
  }

  function parseRestSeconds(value) {
    if (window.BoraTreinarStorage?.parseRestSeconds) {
      return window.BoraTreinarStorage.parseRestSeconds(value);
    }

    const number = Number.parseInt(String(value || ""), 10);

    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function unwrapApiData(response) {
    if (!response) return null;

    if (Object.prototype.hasOwnProperty.call(response, "data")) {
      return response.data;
    }

    return response;
  }

  function getFieldValue(form, selector) {
    return String(form.querySelector(selector)?.value || "").trim();
  }

  function getItemFieldValue(item, selector) {
    return String(item.querySelector(selector)?.value || "").trim();
  }

  function invalid(message, focusElement) {
    return {
      isValid: false,
      message,
      focusElement,
    };
  }

  function markInvalid(field) {
    field?.classList.add("input-error");
  }

  function clearValidationState(form) {
    form.querySelectorAll(".input-error").forEach((field) => {
      field.classList.remove("input-error");
    });
  }

  function focusField(field) {
    if (field && typeof field.focus === "function") {
      field.focus();
    }
  }

  function showValidationToast(message) {
    window.showToast?.({
      title: "Revise o treino",
      message,
      type: "warning",
    });
  }

  function getApiErrorMessage(error) {
    if (/validation/i.test(error?.message || "")) {
      return "Revise os campos do treino e preencha séries, repetições e descanso de todos os exercícios.";
    }

    return error?.message || "Não foi possível salvar o treino. Tente novamente.";
  }

  function setLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `
        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
        Salvando...
      `;
      return;
    }

    button.disabled = false;
    button.innerHTML = button.dataset.originalHtml || "Salvar treino";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWorkoutFormBackendGuard);
  } else {
    initWorkoutFormBackendGuard();
  }
})(window, document);
