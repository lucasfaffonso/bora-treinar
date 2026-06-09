/* =========================================================
   Workout form carousel controls
   Responsabilidade:
   - Adicionar botões anterior/próximo ao carrossel de exercícios.
   - Manter os dots existentes como fonte de navegação principal.
   - Carregar ajustes visuais específicos do formulário de treino.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (document.body?.dataset.page !== "workout-form") {
    return;
  }

  ensureWorkoutFormStylesheet();

  const exerciseBuilder = document.getElementById("exerciseBuilder");

  if (!exerciseBuilder) {
    return;
  }

  let controlsUpdateFrame = null;

  const scheduleControlsUpdate = () => {
    window.cancelAnimationFrame(controlsUpdateFrame);
    controlsUpdateFrame = window.requestAnimationFrame(() => {
      ensureCarouselControls();
      updateCarouselControlsState();
    });
  };

  const observer = new MutationObserver(scheduleControlsUpdate);

  observer.observe(exerciseBuilder, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  ensureCarouselControls();
  updateCarouselControlsState();

  exerciseBuilder.addEventListener("click", (event) => {
    const control = event.target.closest("[data-exercise-carousel-control]");

    if (!control) {
      return;
    }

    const direction = control.getAttribute("data-exercise-carousel-control");

    moveExerciseCarousel(direction);
  });

  exerciseBuilder.addEventListener("keydown", (event) => {
    if (!event.target.closest(".exercise-builder-track")) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveExerciseCarousel("prev");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveExerciseCarousel("next");
    }
  });

  function ensureWorkoutFormStylesheet() {
    if (document.querySelector('link[href$="/assets/css/workout-form.css"]')) {
      return;
    }

    const stylesheet = document.createElement("link");

    stylesheet.rel = "stylesheet";
    stylesheet.href = "../../assets/css/workout-form.css";

    document.head.appendChild(stylesheet);
  }

  function ensureCarouselControls() {
    const track = exerciseBuilder.querySelector("[data-exercise-builder-track]");
    const dots = exerciseBuilder.querySelector("[data-exercise-carousel-dots]");
    const items = getExerciseItems();

    if (!track || !dots || !items.length) {
      return;
    }

    let controls = exerciseBuilder.querySelector(
      "[data-exercise-carousel-controls]",
    );

    if (!controls) {
      controls = document.createElement("div");
      controls.className = "exercise-carousel-controls";
      controls.setAttribute("data-exercise-carousel-controls", "");
      controls.innerHTML = `
        <button
          class="exercise-carousel-control"
          type="button"
          data-exercise-carousel-control="prev"
          aria-label="Ver exercício anterior"
        >
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
          <span>Anterior</span>
        </button>

        <span class="exercise-carousel-counter" data-exercise-carousel-counter>
          1 de ${items.length}
        </span>

        <button
          class="exercise-carousel-control"
          type="button"
          data-exercise-carousel-control="next"
          aria-label="Ver próximo exercício"
        >
          <span>Próximo</span>
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
      `;
    }

    if (controls.previousElementSibling !== dots) {
      dots.after(controls);
    }
  }

  function moveExerciseCarousel(direction) {
    const dots = getDots();
    const activeIndex = getActiveIndex();

    if (!dots.length || activeIndex < 0) {
      return;
    }

    const nextIndex = direction === "prev" ? activeIndex - 1 : activeIndex + 1;
    const targetIndex = Math.max(0, Math.min(nextIndex, dots.length - 1));

    if (targetIndex === activeIndex) {
      return;
    }

    dots[targetIndex].click();
    updateCarouselControlsState();
  }

  function updateCarouselControlsState() {
    const controls = exerciseBuilder.querySelector(
      "[data-exercise-carousel-controls]",
    );
    const items = getExerciseItems();
    const dots = getDots();

    if (!controls || !items.length || !dots.length) {
      return;
    }

    const activeIndex = getActiveIndex();
    const previousButton = controls.querySelector(
      '[data-exercise-carousel-control="prev"]',
    );
    const nextButton = controls.querySelector(
      '[data-exercise-carousel-control="next"]',
    );
    const counter = controls.querySelector("[data-exercise-carousel-counter]");
    const hasMultipleItems = items.length > 1;

    controls.hidden = !hasMultipleItems;

    if (previousButton) {
      previousButton.disabled = activeIndex <= 0;
    }

    if (nextButton) {
      nextButton.disabled = activeIndex >= items.length - 1;
    }

    if (counter) {
      counter.textContent = `${activeIndex + 1} de ${items.length}`;
    }
  }

  function getExerciseItems() {
    return Array.from(
      exerciseBuilder.querySelectorAll(".exercise-builder-item"),
    );
  }

  function getDots() {
    return Array.from(
      exerciseBuilder.querySelectorAll("[data-exercise-carousel-dot]"),
    );
  }

  function getActiveIndex() {
    const items = getExerciseItems();
    const activeItem = exerciseBuilder.querySelector(
      ".exercise-builder-item.is-active-exercise",
    );
    const itemIndex = items.indexOf(activeItem);

    if (itemIndex >= 0) {
      return itemIndex;
    }

    return getDots().findIndex((dot) => dot.classList.contains("is-active"));
  }
});
