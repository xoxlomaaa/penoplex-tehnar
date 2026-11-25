import { defaults, decodeState, encodeState } from "./state.js";
import { icon } from "./icons.js";
import { chooseModelAsset } from "./model-assets.js";
import { initAboutGallery } from "./about-gallery.js?v=calm";
import { fadeIn, openFadingDialog, reducedMotion } from "./surface-motion.js";
import { loadSystem } from "./systems.js";
const { system, layers, products, documents, tour } = await loadSystem(document.documentElement.dataset.system);
const modelAsset = () => system.modelAsset ?? chooseModelAsset();
const modelSizeLabel = () => (modelAsset().bytes / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 }) + " МБ · загрузка по запросу";
const systemTitle = `${system.name} ${system.version}`;
const exportName = systemTitle.replaceAll(" ", "-");
const $ = (selector) => document.querySelector(selector),
  $$ = (selector) => [...document.querySelectorAll(selector)];
$$("[data-icon]").forEach((el) => {
  el.innerHTML = icon(el.dataset.icon);
});
let state = decodeState(location.hash, system),
  viewer,
  loadPromise,
  controller,
  loadToken = 0,
  tourStep = -1,
  toastTimer;
const announce = (text) => {
  $("#announcement").textContent = text;
};
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
  announce(text);
}
function save() {
  history.replaceState(
    null,
    "",
    location.pathname + location.search + encodeState(state, system),
  );
}
const docLink = (id) => {
  const d = documents[id];
  return `<a href="${d.url}" target="_blank" rel="noopener">${d.title}</a>`;
};
function bindLayerList() {
  $("#layer-list").addEventListener("click", (e) => {
    const button = e.target.closest("[data-layer]");
    if (button) selectLayer(button.dataset.layer);
  });
  $("#layer-list").addEventListener("keydown", (e) => {
    const all = $$("[data-layer]"),
      index = all.indexOf(document.activeElement);
    if (index < 0) return;
    let next;
    if (e.key === "ArrowDown") next = (index + 1) % all.length;
    if (e.key === "ArrowUp") next = (index + all.length - 1) % all.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = all.length - 1;
    if (next !== undefined) {
      e.preventDefault();
      all[next].focus();
      selectLayer(all[next].dataset.layer);
    }
  });
}
function renderDetail() {
  const activeId = $("#layer-detail")?.contains(document.activeElement)
    ? document.activeElement.id
    : null;
  const keepExpanded =
    $("#layer-detail").dataset.layer === state.layer &&
    $("#layer-detail details")?.open;
  $("#layer-detail").dataset.layer = state.layer;
  const l = layers.find((x) => x.id === state.layer),
    p = products[l.product];
  $("#layer-detail").innerHTML =
    `<div class="detail-kicker"><span class="detail-num">${l.id.padStart(2, "0")}</span><span>СЛОЙ КОНСТРУКЦИИ</span></div><div class="detail-main"><h2>${l.name}</h2><p class="detail-subtitle">${l.short}</p><span class="role-label">${l.role}</span><p class="detail-text">${l.text}</p><details><summary>Технические подробности</summary><p>${l.spec}</p></details></div>${p ? `<button class="product-teaser" id="open-product"><span class="eyebrow">МАТЕРИАЛ СЛОЯ</span>${p.image ? `<img src="${p.image}" alt="${p.imageAlt}" loading="lazy">` : ""}<span><strong>${p.name}</strong><small>Материал, поставка и документы</small></span></button>` : '<p class="no-product">Общестроительный слой. Материалы и параметры определяются проектом.</p>'}<a class="detail-source" href="${documents.system.url}" target="_blank" rel="noopener">Технический лист системы</a>`;
  $("#open-product")?.addEventListener("click", (event) =>
    openProduct(l.product, event.detail > 0),
  );
  if (keepExpanded) $("#layer-detail details").open = true;
  if (activeId) $("#" + activeId)?.focus({ preventScroll: true });
}
function reflect() {
  $$("#layer-list button[data-layer]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.layer === state.layer)),
  );
  $("#explode").value = Math.round(state.explode * 100);
  $("#explode-output").textContent = Math.round(state.explode * 100) + "%";
  $("#explode-label").textContent =
    state.explode > 0.02 ? "Собрать систему" : "Разнести слои";
  $("#explode-toggle").setAttribute(
    "aria-pressed",
    String(state.explode > 0.02),
  );
  $("#isolation-banner").hidden = !state.isolate || !viewer?.ready;
  const l = layers.find((l) => l.id === state.layer);
  $("#selection-label").textContent = l.id.padStart(2, "0") + " / " + l.short;
  $("#selection-label").hidden = !viewer?.ready;
  $("#mobile-layer-picker").value = l.id;
  $("#mobile-layer-summary").textContent = l.short;
  $("#isolate-layer").setAttribute("aria-pressed", String(state.isolate));
  $("#isolate-label").textContent = state.isolate ? "Показать все слои" : "Только слой";
  renderDetail();
}
function selectLayer(id) {
  if (!layers.some((l) => l.id === id)) return;
  state.layer = id;
  viewer?.select(id);
  if (state.isolate) viewer?.focus();
  reflect();
  save();
  announce("Выбран слой " + id + ": " + layers.find((l) => l.id === id).name);
}
function setIsolation(value) {
  state.isolate = value;
  viewer?.setIsolation(value);
  if (value) viewer?.focus();
  else viewer?.fit();
  reflect();
  save();
  announce(
    value ? "Показан только выбранный слой" : "Показана вся конструкция",
  );
}
function explode(value) {
  if (!viewer?.ready) return;
  state.explode = value;
  viewer.setExplode(value);
  reflectExplode();
  save();
}
function reflectExplode() {
  $("#explode").value = Math.round(state.explode * 100);
  $("#explode-output").textContent = Math.round(state.explode * 100) + "%";
  $("#explode-label").textContent =
    state.explode > 0.02 ? "Собрать систему" : "Разнести слои";
  $("#explode-toggle").setAttribute(
    "aria-pressed",
    String(state.explode > 0.02),
  );
}
function reset() {
  if (!viewer?.ready) return;
  endTour(false);
  state = defaults(system);
  viewer.setExplode(0, true);
  viewer.setIsolation(false);
  viewer.select(state.layer);
  viewer.fit();
  reflect();
  markPreset("perspective");
  save();
  toast("Исходный вид восстановлен");
}
function markPreset(name) {
  $("#mobile-preset-picker").value = name;
  $$("[data-preset]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.preset === name)),
  );
}
function loadingUI(kind, message = "") {
  const ready = kind === "ready",
    busy = kind === "loading";
  $("#poster").hidden = ready;
  $(".scene-bottom").hidden = !ready;
  $("#model-status").textContent = ready
    ? "3D-МОДЕЛЬ"
    : busy
      ? "ЗАГРУЗКА 3D"
      : "РАЗРЕЗ СИСТЕМЫ";
  $$("[data-needs-model]").forEach((b) => (b.disabled = !ready));
  $("#load-model").disabled = busy;
  $("#load-progress").hidden = !busy;
  $("#cancel-load").hidden = !busy;
  $("#load-title").textContent =
    kind === "error"
      ? "Модель пока недоступна"
      : busy
        ? "Готовим интерактивный разрез"
        : "Интерактивный разрез";
  $("#load-description").textContent =
    message ||
    (busy
      ? "Загружаем геометрию и текстуры. Все материалы доступны ниже."
      : "Вращайте разрез, разделяйте слои и изучайте материалы.");
  $("#load-model").innerHTML =
    kind === "error"
      ? "Повторить загрузку"
      : busy
        ? "Загрузка…"
        : "Открыть 3D-модель";
  $("#load-size").textContent =
    kind === "error"
      ? "Слои, карточки и PDF доступны без 3D."
      : modelSizeLabel();
  if (busy) $("#load-progress").value = 0;
  $("#viewport").setAttribute("aria-busy", String(busy));
  renderDetail();
}
async function loadModel() {
  if (viewer?.ready) return true;
  if (loadPromise) return loadPromise;
  const token = ++loadToken;
  const request = new AbortController();
  controller = request;
  const { signal } = request;
  loadingUI("loading");
  loadPromise = (async () => {
    const timer = setTimeout(() => request.abort(), 180000);
    try {
      const asset = modelAsset();
      const [{ SystemViewer }, response] = await Promise.all([
        import("./viewer.js"),
        fetch(asset.url, { signal }),
      ]);
      if (token !== loadToken) return false;
      viewer?.dispose();
      viewer = new SystemViewer($("#viewport"), system);
      viewer.addEventListener("select", (e) =>
        selectLayer(e.detail),
      );
      viewer.addEventListener("reset", reset);
      viewer.addEventListener("camera", (e) => {
        state.camera = e.detail;
        save();
      });
      viewer.addEventListener("error", (e) => {
        endTour(false);
        loadingUI("error", e.detail);
        announce(e.detail);
        reflect();
      });
      await viewer.load(
        response,
        (p) => {
          if (token !== loadToken) return;
          $("#load-progress").value = Math.round(p * 100);
          $("#load-model").textContent =
            p >= 0.91
              ? "Подготавливаем сцену…"
              : `Загрузка ${Math.round(p * 100)}%`;
        },
        signal,
        asset.bytes,
      );
      if (token !== loadToken) return false;
      viewer.setExplode(state.explode, true);
      viewer.select(state.layer);
      viewer.setIsolation(state.isolate);
      const camera = state.camera;
      if (camera) viewer.restoreCamera(camera);
      else viewer.fit(false);
      loadingUI("ready");
      fadeIn($("#viewport"), { duration: 200 });
      reflect();
      announce(`3D-модель готова. ${layers.length} слоёв доступны для выбора.`);
      return true;
    } catch (e) {
      request.abort();
      if (token !== loadToken) return false;
      viewer?.dispose();
      viewer = null;
      endTour(false);
      loadingUI(
        "error",
        e.name === "AbortError"
          ? "Загрузка заняла слишком много времени. Проверьте соединение и попробуйте ещё раз."
          : /WebGL|context/i.test(e.message)
            ? "Браузер не смог включить 3D-графику. Можно изучить слои и документы или повторить попытку."
            : "Не удалось загрузить модель. Проверьте соединение и повторите попытку.",
      );
      reflect();
      announce("Ошибка загрузки модели. Доступны текст и документы.");
      return false;
    } finally {
      clearTimeout(timer);
      if (token === loadToken) loadPromise = null;
    }
  })();
  return loadPromise;
}
function cancelLoad() {
  loadToken++;
  controller?.abort();
  viewer?.dispose();
  viewer = null;
  loadPromise = null;
  loadingUI("idle");
  reflect();
  toast("Загрузка остановлена. Можно изучать слои и документы.");
}
function openProduct(id, animate) {
  const p = products[id];
  $("#product-content").innerHTML =
    `<div class="product-head">${p.image ? `<img src="${p.image}" alt="${p.imageAlt}">` : `<div class="product-no-image">ПЕНОПЛЭКС®<br><span class="small">Марка по расчёту</span></div>`}<div><span class="eyebrow">${p.category}</span><h2 id="product-title">${p.name}</h2><p>${p.description}</p></div></div><dl class="product-facts">${p.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl><div class="product-packaging"><h3>Поставка и упаковка</h3><p>${p.packaging}</p>${p.photoNote ? `<p class="photo-note">${p.photoNote}</p>` : ""}</div><div class="product-documents"><h3>Документы</h3>${p.documents.map(docLink).join("")}</div><div class="product-source"><a href="${p.source}" target="_blank" rel="noopener">Материал в каталоге</a></div>`;
  openFadingDialog($("#product-dialog"), animate);
}
function info(title, html, animate = false) {
  $("#info-content").innerHTML =
    `<span class="eyebrow">ПЕНОПЛЭКС · СТРОИТЕЛЬНЫЕ СИСТЕМЫ</span><h2 id="info-title">${title}</h2>${html}`;
  openFadingDialog($("#info-dialog"), animate);
}
function tab(name, { focus = false, syncURL = true, animate = false } = {}) {
  const panel = $("#" + name);
  const changed = panel.hidden;
  $$("[data-tab]").forEach((b) => {
    const active = b.dataset.tab === name;
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
    if (active && focus) b.focus();
  });
  $$("[role=tabpanel]").forEach((p) => (p.hidden = p.id !== name));
  fadeIn(panel, { enabled: changed && animate });
  if (syncURL) {
    const view = new URL(location.href);
    if (name === "explorer") view.searchParams.delete("tab");
    else view.searchParams.set("tab", name);
    if (name !== "about" && view.hash === "#system-gallery") view.hash = "";
    history.replaceState(null, "", view);
  }
  if (name !== "explorer") endTour(false);
  else {
    if (!viewer?.ready && !$("#poster > img")) {
      const template = $("#poster-image");
      if (template) template.before(template.content.cloneNode(true));
    }
    requestAnimationFrame(() => viewer?.resize());
  }
}
async function startTour(event) {
  const animate = event.detail > 0;
  tab("explorer");
  if (!(await loadModel())) return;
  tourStep = 0;
  applyTour(animate);
  $("#tour-next").focus({ preventScroll: true });
  $("#tour").scrollIntoView({
    block: "nearest",
    behavior: animate && !reducedMotion.matches ? "smooth" : "auto",
  });
}
function applyTour(animate) {
  const t = tour[tourStep];
  $("#tour").hidden = false;
  $("#tour-count").textContent = `ШАГ ${tourStep + 1} ИЗ ${tour.length}`;
  $("#tour-title").textContent = t.title;
  $("#tour-text").textContent = t.text;
  fadeIn($("#tour"), { enabled: animate });
  $("#tour-prev").disabled = tourStep === 0;
  $("#tour-next").textContent =
    tourStep === tour.length - 1 ? "Готово" : "Далее";
  state.isolate = false;
  state.layer = t.layer;
  state.explode = t.explode;
  viewer.setIsolation(false);
  viewer.setExplode(t.explode);
  viewer.select(t.layer);
  viewer.preset(t.preset);
  markPreset(t.preset);
  reflect();
  save();
  announce(`Шаг ${tourStep + 1}: ${t.title}. ${t.text}`);
}
function endTour(returnFocus = true) {
  tourStep = -1;
  $("#tour").hidden = true;
  if (returnFocus) $("#start-tour").focus({ preventScroll: true });
}
function download(data, name) {
  let objectURL;
  if (data.startsWith("data:image/png;base64,")) {
    const raw = atob(data.split(",")[1]);
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    objectURL = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    data = objectURL;
  }
  const a = document.createElement("a");
  a.href = data;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  if (objectURL) setTimeout(() => URL.revokeObjectURL(objectURL), 60000);
}
async function share() {
  state.camera = viewer?.ready ? viewer.getCamera() : state.camera;
  const view = new URL(location.href);
  view.searchParams.delete("tab");
  view.hash = encodeState(state, system);
  const url = view.href;
  try {
    await navigator.clipboard.writeText(url);
    toast("Ссылка на этот вид скопирована");
  } catch {
    info(
      "Ссылка на текущий вид",
      '<p>Выбранный слой, разнесение и ракурс сохранятся. Передайте ссылку, чтобы открыть систему в том же ракурсе.</p><input id="share-url" aria-label="Ссылка на вид" readonly><button class="button primary" id="copy-url">Скопировать ссылку</button>',
    );
    $("#share-url").value = url;
    $("#share-url").select();
    $("#copy-url").onclick = async () => {
      try {
        await navigator.clipboard.writeText(url);
        $("#info-dialog").close();
        toast("Ссылка скопирована");
      } catch {
        $("#share-url").focus();
        $("#share-url").select();
        toast("Нажмите Ctrl+C, чтобы скопировать ссылку");
      }
    };
  }
}
function materials() {
  const rows = [
    [`${systemTitle} — состав системы`],
    ["Позиция", "Материал / слой", "Назначение", "Примечание"],
    ...layers.map((l) => [l.id, l.name, l.short, l.spec]),
  ];
  const csv =
    "\ufeff" +
    rows
      .map((r) =>
        r.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  download(url, `${exportName}-состав.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Список материалов подготовлен");
}
bindLayerList();
$("#mobile-layer-picker").replaceChildren(...layers.map((layer) =>
  new Option(layer.id.padStart(2, "0") + " · " + layer.name, layer.id),
));
$("#mobile-layer-picker").addEventListener("change", (event) => selectLayer(event.target.value));
const touchInput = matchMedia("(pointer: coarse)");
function updateGestureHint() {
  $("#gesture-hint").textContent = touchInput.matches
    ? "Один палец — вращение · два — масштаб"
    : "Перетащите для вращения · колесо меняет масштаб";
}
updateGestureHint();
touchInput.addEventListener("change", updateGestureHint);
reflect();
$("#load-size").textContent = modelSizeLabel();

$("#load-model").addEventListener("click", loadModel);
$("#cancel-load").addEventListener("click", cancelLoad);
$("#start-tour").addEventListener("click", startTour);
$("#explode").addEventListener("input", (e) =>
  explode(Number(e.target.value) / 100),
);
$("#explode").addEventListener("change", () => {
  viewer.setExplode(state.explode, true);
  if (!state.isolate) viewer.fit();
});
$("#explode-toggle").addEventListener("click", () => {
  explode(state.explode > 0.02 ? 0 : 1);
  setTimeout(() => {
    if (viewer?.ready && !state.isolate) viewer.fit();
  }, 450);
});
$("#return-all").addEventListener("click", () => setIsolation(false));
$("#reset").addEventListener("click", reset);
$("#zoom-in").addEventListener("click", () => viewer.zoom(1 / 1.2));
$("#zoom-out").addEventListener("click", () => viewer.zoom(1.2));
$("#mobile-preset-picker").addEventListener("change", (event) => {
  viewer.preset(event.target.value);
  markPreset(event.target.value);
});
$$("[data-preset]").forEach((b) =>
  b.addEventListener("click", () => {
    viewer.preset(b.dataset.preset);
    markPreset(b.dataset.preset);
  }),
);
$("#snapshot").addEventListener("click", () => {
  closeSceneMenu(true);
  download(viewer.snapshot(), `${exportName}-слой-${state.layer}.png`);
  toast("PNG текущего вида подготовлен к скачиванию");
});
const sceneMenu = $("#scene-menu");
function closeSceneMenu(restoreFocus = false) {
  sceneMenu.open = false;
  if (restoreFocus) sceneMenu.querySelector("summary").focus({ preventScroll: true });
}
sceneMenu.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sceneMenu.open) {
    event.preventDefault();
    closeSceneMenu(true);
  }
});
document.addEventListener("pointerdown", (event) => {
  if (sceneMenu.open && !sceneMenu.contains(event.target)) closeSceneMenu();
});
$("#share").addEventListener("click", () => {
  closeSceneMenu(true);
  share();
});
$("#materials").addEventListener("click", materials);
$("#focus-layer").addEventListener("click", () => {
  viewer?.focus();
  announce("Камера приближена к выбранному слою");
});
$("#isolate-layer").addEventListener("click", () => setIsolation(!state.isolate));
$("#application-explore").addEventListener("click", (event) => {
  tab("explorer", { focus: true, animate: event.detail > 0 });
  $(".workspace-nav").scrollIntoView({ block: "start" });
  loadModel();
});
$("#tour-prev").addEventListener("click", (event) => {
  if (tourStep > 0) {
    tourStep--;
    applyTour(event.detail > 0);
  }
});
$("#tour-next").addEventListener("click", (event) => {
  if (tourStep < tour.length - 1) {
    tourStep++;
    applyTour(event.detail > 0);
  } else {
    endTour();
    toast("Теперь можно исследовать систему самостоятельно");
  }
});
$("#tour-close").addEventListener("click", () => endTour());
$$("[data-tab]").forEach((b, i, all) => {
  b.addEventListener("click", (event) =>
    tab(b.dataset.tab, { animate: event.detail > 0 }),
  );
  b.addEventListener("keydown", (e) => {
    let j;
    if (e.key === "ArrowRight") j = (i + 1) % all.length;
    if (e.key === "ArrowLeft") j = (i + all.length - 1) % all.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = all.length - 1;
    if (j !== undefined) {
      e.preventDefault();
      tab(all[j].dataset.tab, { focus: true });
    }
  });
});
$("#product-close").addEventListener("click", () =>
  $("#product-dialog").close(),
);
$("#info-close").addEventListener("click", () => $("#info-dialog").close());
$$("dialog").forEach((d) =>
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  }),
);
$("#help").addEventListener("click", (event) =>
  info(
    "Как исследовать систему",
    "<ul><li>Тяните модель мышью или одним пальцем, чтобы вращать.</li><li>Прокручивайте колесо или сводите два пальца для масштаба. Также доступны кнопки + и −.</li><li>Выберите слой на разрезе или в списке. «Только слой» временно скрывает остальную конструкцию.</li><li>Разнесите слои ползунком. Кнопка сброса возвращает исходный вид.</li><li>С клавиатуры: Tab — перейти к элементу; Enter — выбрать. На 3D-сцене стрелки вращают модель, + и − меняют масштаб, 0 сбрасывает вид.</li></ul>",
    event.detail > 0,
  ),
);
window.addEventListener("hashchange", () => {
  state = decodeState(location.hash, system);
  endTour(false);
  if (viewer?.ready) {
    viewer.setExplode(state.explode, true);
    viewer.select(state.layer);
    viewer.setIsolation(state.isolate);
    if (state.camera) viewer.restoreCamera(state.camera);
    else viewer.fit();
  }
  reflect();
});
initAboutGallery();
const requestedTab = new URLSearchParams(location.search).get("tab");
if (requestedTab === "about" || requestedTab === "documents") tab(requestedTab, { syncURL: false });
window.demo = {
  get state() {
    return structuredClone(state);
  },
  get ready() {
    return !!viewer?.ready;
  },
  get viewer() {
    return viewer;
  },
  get tourStep() {
    return tourStep;
  },
  version: "2.3.0",
};
if (new URLSearchParams(location.hash.slice(1)).get("system") === system.id && !requestedTab) loadModel();
