export function chooseInitialNote() {
  const tab = new URLSearchParams(location.search).get("tab");
  if (tab !== "about" && tab !== "documents") return;
  for (const panel of document.querySelectorAll("[role=tabpanel]")) {
    panel.hidden = panel.id !== tab;
  }
  for (const button of document.querySelectorAll("[data-tab]")) {
    const active = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  }
  if (tab === "about" && location.hash === "#system-gallery") {
    const gallery = document.getElementById("system-gallery");
    const primary = gallery.querySelector("[data-gallery-slide] img");
    primary.loading = "eager";
    primary.fetchPriority = "high";
    requestAnimationFrame(() => gallery.scrollIntoView({ block: "start" }));
  }
}
