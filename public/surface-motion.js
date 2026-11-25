export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

const runningFades = new Map();

export function fadeIn(element, { enabled = true, duration = 180 } = {}) {
  runningFades.get(element)?.cancel();
  runningFades.delete(element);
  if (!enabled || reducedMotion.matches) return;

  const fade = element.animate([{ opacity: 0.88 }, { opacity: 1 }], {
    duration,
    easing: "cubic-bezier(.22,1,.36,1)",
  });
  runningFades.set(element, fade);
  fade.addEventListener("finish", () => {
    if (runningFades.get(element) === fade) runningFades.delete(element);
  }, { once: true });
}

export function openFadingDialog(dialog, enabled = false) {
  dialog.toggleAttribute("data-fade", enabled && !reducedMotion.matches);
  dialog.showModal();
  fadeIn(dialog, { enabled, duration: 200 });
}

reducedMotion.addEventListener("change", () => {
  if (!reducedMotion.matches) return;
  for (const fade of runningFades.values()) fade.cancel();
  runningFades.clear();
});
