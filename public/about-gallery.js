// Two supplied architectural images, without cropping or automatic rotation.
export function initAboutGallery() {
  const root = document.getElementById("system-gallery");
  if (!root) return;
  const dialog = document.getElementById("gallery-lightbox"),
    stage = document.getElementById("gallery-stage");
  const figures = [...root.querySelectorAll("[data-gallery-slide]")],
    choices = [...root.querySelectorAll("[data-gallery-choice]")];
  const captions = [
    {
      title: "Пространство для жизни",
      description: "Спорт, озеленение и отдых на крыше стилобата.",
    },
    {
      title: "Технология под благоустройством",
      description: "Слои системы в раскрытом углу конструкции.",
    },
  ];
  let index = 0,
    opener,
    drag,
    suppressClick = false,
    previousOverflow;
  const fillDialog = () => {
    const source = figures[index].querySelector("img"),
      target = document.getElementById("gallery-lightbox-image");
    target.src = source.dataset.full || source.currentSrc || source.src;
    target.alt = source.alt;
    target.width = source.width;
    target.height = source.height;
    document.getElementById("gallery-lightbox-title").textContent =
      captions[index].title;
    document.getElementById("gallery-lightbox-description").textContent =
      captions[index].description;
    document.getElementById("gallery-lightbox-count").textContent =
      `0${index + 1} / 02`;
  };
  function show(next) {
    index = (next + figures.length) % figures.length;
    root.dataset.slide = String(index);
    figures.forEach((figure, i) => (figure.hidden = i !== index));
    choices.forEach((button, i) =>
      button.setAttribute("aria-pressed", String(i === index)),
    );
    const image = figures[index].querySelector("img");
    image.loading = "eager";
    document.getElementById("gallery-title").textContent =
      captions[index].title;
    document.getElementById("gallery-description").textContent =
      captions[index].description;
    document.getElementById("gallery-count").textContent = `0${index + 1} / 02`;
    document.getElementById("gallery-status").textContent =
      `Изображение ${index + 1} из 2. ${captions[index].title}`;
    if (dialog.open) fillDialog();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      image.animate([{ opacity: 0.65 }, { opacity: 1 }], {
        duration: 260,
        easing: "ease-out",
      });
  }
  for (const parent of [root, dialog]) {
    parent
      .querySelectorAll("[data-gallery-prev]")
      .forEach((b) => b.addEventListener("click", () => show(index - 1)));
    parent
      .querySelectorAll("[data-gallery-next]")
      .forEach((b) => b.addEventListener("click", () => show(index + 1)));
    parent.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        show(index + (e.key === "ArrowRight" ? 1 : -1));
      }
    });
  }
  choices.forEach((button, i) =>
    button.addEventListener("click", () => show(i)),
  );
  figures.forEach((figure) => {
    const image = figure.querySelector("img"),
      button = figure.querySelector("[data-gallery-open]");
    const failed = () => {
      figure.querySelector(".gallery-error").hidden = false;
      button.disabled = true;
    };
    image.addEventListener("error", failed);
    if (image.complete && !image.naturalWidth) failed();
    button.addEventListener("click", () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      opener = button;
      fillDialog();
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      dialog.showModal();
    });
  });
  document
    .getElementById("gallery-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    document.documentElement.style.overflow = previousOverflow ?? "";
    const active = figures[index].querySelector("[data-gallery-open]");
    (opener?.isConnected && !opener.closest("[hidden]")
      ? opener
      : active
    ).focus({ preventScroll: true });
  });
  stage.addEventListener("pointerdown", (e) => {
    suppressClick = false;
    if (e.isPrimary && e.pointerType === "touch")
      drag = { x: e.clientX, y: e.clientY };
  });
  stage.addEventListener("pointercancel", () => (drag = null));
  stage.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      suppressClick = true;
      show(index + (dx < 0 ? 1 : -1));
    }
  });
}
