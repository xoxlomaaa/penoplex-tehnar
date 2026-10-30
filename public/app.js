import {
  system,
  layers,
  products,
  documents,
  tour,
} from "./content.js?v=studio-L3";
import { defaults, decodeState, encodeState } from "./state.js";
import { icon } from "./icons.js";
import { chooseModelAsset, modelSizeLabel } from "./model-assets.js";
import { initAboutGallery } from "./about-gallery.js?v=gallery1";
const $ = (selector) => document.querySelector(selector),
  $$ = (selector) => [...document.querySelectorAll(selector)];
$$("[data-icon]").forEach((el) => {
  el.innerHTML = icon(el.dataset.icon);
});
let state = decodeState(location.hash),
  viewer,
  loadPromise,
  controller,
  loadToken = 0,
  tourStep = -1,
  toastTimer;
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
let detailSignature = "",
  tabMarker;
function reveal(el, { distance = 12, duration = 420, delay = 0 } = {}) {
  if (!el || motionQuery.matches) return;
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [
      { opacity: 0.3, transform: `translateY(${distance}px)` },
      { opacity: 1, transform: "translateY(0)" },
    ],
    { duration, delay, easing: "cubic-bezier(.22,1,.36,1)" },
  );
}
function detailMotion() {
  const signature = [state.layer, state.isolate].join(":");
  if (signature === detailSignature) return;
  detailSignature = signature;
  reveal($("#layer-detail .detail-num"), { distance: -9, duration: 500 });
  reveal($("#layer-detail .detail-main"), { distance: 9, duration: 440 });
  reveal($("#layer-detail .product-teaser"), { distance: 14, duration: 560 });
}
function positionTabMarker() {
  const active = $("[data-tab][aria-selected=true]"),
    parent = $(".workspace-tabs");
  if (!active || !tabMarker) return;
  tabMarker.style.width = active.offsetWidth + "px";
  tabMarker.style.transform = `translateX(${active.offsetLeft}px)`;
}
function openDialog(dialog) {
  dialog.showModal();
  reveal(dialog, { distance: 18, duration: 360 });
}
motionQuery.addEventListener("change", () => {
  if (motionQuery.matches) document.getAnimations().forEach((a) => a.cancel());
});
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
    location.pathname + location.search + encodeState(state),
  );
}
const docLink = (id) => {
  const d = documents[id];
  return `<a href="${d.url}" target="_blank" rel="noopener">${d.title}</a>`;
};
function renderList() {
  $("#layer-list").innerHTML = layers
    .map(
      (l) =>
        `<li><button data-layer="${l.id}" aria-pressed="${l.id === state.layer}" style="--swatch:${l.color}"><span class="layer-number">${l.id.padStart(2, "0")}</span><span class="layer-copy"><strong>${l.name}</strong><small>${l.short}</small></span></button></li>`,
    )
    .join("");
  $("#layer-list").addEventListener("click", (e) => {
    const button = e.target.closest("[data-layer]");
    if (button) selectLayer(button.dataset.layer, { mobile: true });
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
function mobilePanel(detail, moveFocus = false) {
  const changed = $("#explorer").classList.contains("show-detail") !== detail;
  $("#explorer").classList.toggle("show-detail", detail);
  $("#mobile-layers").setAttribute("aria-pressed", String(!detail));
  $("#mobile-detail").setAttribute("aria-pressed", String(detail));
  if (changed && matchMedia("(max-width:760px)").matches)
    reveal(detail ? $("#detail-panel") : $("#layer-panel"), {
      distance: 10,
      duration: 340,
    });
  if (detail && moveFocus) {
    const heading = $("#layer-detail h2");
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    $("#mobile-detail").scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }
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
    `<div class="detail-kicker"><span class="detail-num">${l.id.padStart(2, "0")}</span><span>СЛОЙ КОНСТРУКЦИИ</span></div><div class="detail-main"><h2>${l.name}</h2><p class="detail-subtitle">${l.short}</p><span class="role-label">${l.role}</span><p class="detail-text">${l.text}</p><div class="detail-actions"><button id="focus-layer" ${viewer?.ready ? "" : "disabled"}>${icon("focus")}<span>Приблизить</span></button><button id="isolate-layer" aria-pressed="${state.isolate}" ${viewer?.ready ? "" : "disabled"}>${icon(state.isolate ? "layers" : "isolate")}<span>${state.isolate ? "Все слои" : "Только слой"}</span></button></div><details><summary>Технические подробности</summary><p>${l.spec}</p></details></div>${p ? `<button class="product-teaser" id="open-product"><span class="eyebrow">МАТЕРИАЛ СЛОЯ</span>${p.image ? `<img src="${p.image}" alt="${p.imageAlt}" loading="lazy">` : ""}<span><strong>${p.name}</strong><small>Материал, поставка и документы</small></span></button>` : '<p class="no-product">Общестроительный слой. Материалы и параметры определяются проектом.</p>'}<a class="detail-source" href="/assets/system-01041100.pdf" target="_blank" rel="noopener">Технический лист системы</a>`;
  $("#focus-layer").addEventListener("click", () => {
    viewer?.focus();
    announce("Камера приближена к слою " + l.name);
  });
  $("#isolate-layer").addEventListener("click", () =>
    setIsolation(!state.isolate),
  );
  $("#open-product")?.addEventListener("click", () => openProduct(p.id));
  if (keepExpanded) $("#layer-detail details").open = true;
  if (activeId) $("#" + activeId)?.focus({ preventScroll: true });
  detailMotion();
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
  renderDetail();
}
function selectLayer(id, { mobile = false } = {}) {
  if (!layers.some((l) => l.id === id)) return;
  state.layer = id;
  viewer?.select(id);
  if (state.isolate) viewer?.focus();
  reflect();
  save();
  announce("Выбран слой " + id + ": " + layers.find((l) => l.id === id).name);
  if (mobile && matchMedia("(max-width:760px)").matches)
    mobilePanel(true, true);
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
  state = { ...defaults() };
  viewer.setExplode(0, true);
  viewer.setIsolation(false);
  viewer.select("3");
  viewer.fit();
  reflect();
  markPreset("perspective");
  save();
  toast("Исходный вид восстановлен");
}
function markPreset(name) {
  $$("[data-preset]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.preset === name)),
  );
}
function loadingUI(kind, message = "") {
  const ready = kind === "ready",
    busy = kind === "loading";
  $("#poster").hidden = ready;
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
        : "Загляните внутрь конструкции";
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
  controller = new AbortController();
  const signal = controller.signal;
  loadingUI("loading");
  loadPromise = (async () => {
    let timer;
    try {
      const { SystemViewer } = await import("./viewer.js?v=demo-optimized1");
      if (token !== loadToken) return false;
      viewer?.dispose();
      viewer = new SystemViewer($("#viewport"));
      viewer.addEventListener("select", (e) =>
        selectLayer(e.detail, { mobile: true }),
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
      timer = setTimeout(() => controller.abort(), 180000);
      const modelAsset = chooseModelAsset();
      await viewer.load(
        modelAsset.url,
        (p) => {
          if (token !== loadToken) return;
          $("#load-progress").value = Math.round(p * 100);
          $("#load-model").textContent =
            p >= 0.91
              ? "Подготавливаем сцену…"
              : `Загрузка ${Math.round(p * 100)}%`;
        },
        signal,
      );
      if (token !== loadToken) return false;
      viewer.setExplode(state.explode, true);
      viewer.select(state.layer);
      viewer.setIsolation(state.isolate);
      const camera = state.camera;
      if (camera) viewer.restoreCamera(camera);
      else viewer.fit(false);
      loadingUI("ready");
      reflect();
      announce("3D-модель готова. 12 слоёв доступны для выбора.");
      return true;
    } catch (e) {
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
function openProduct(id) {
  const p = products[id];
  $("#product-content").innerHTML =
    `<div class="product-head">${p.image ? `<img src="${p.image}" alt="${p.imageAlt}">` : `<div class="product-no-image">ПЕНОПЛЭКС®<br><span class="small">Марка по расчёту</span></div>`}<div><span class="eyebrow">${p.category}</span><h2 id="product-title">${p.name}</h2><p>${p.description}</p></div></div><dl class="product-facts">${p.facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl><div class="product-packaging"><h3>Поставка и упаковка</h3><p>${p.packaging}</p>${p.photoNote ? `<p class="photo-note">${p.photoNote}</p>` : ""}</div><div class="product-documents"><h3>Документы</h3>${p.documents.map(docLink).join("")}</div><div class="product-source"><a href="${p.source}" target="_blank" rel="noopener">Материал в каталоге</a></div>`;
  openDialog($("#product-dialog"));
}
function info(title, html) {
  $("#info-content").innerHTML =
    `<span class="eyebrow">ПЕНОПЛЭКС · СТРОИТЕЛЬНЫЕ СИСТЕМЫ</span><h2 id="info-title">${title}</h2>${html}`;
  openDialog($("#info-dialog"));
}
function tab(name, { focus = false } = {}) {
  const changed = $("[data-tab][aria-selected=true]")?.dataset.tab !== name;
  $$("[data-tab]").forEach((b) => {
    const active = b.dataset.tab === name;
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
    if (active && focus) b.focus();
  });
  $$("[role=tabpanel]").forEach((p) => (p.hidden = p.id !== name));
  positionTabMarker();
  if (changed) reveal($("#" + name), { distance: 14, duration: 440 });
  if (name !== "explorer") endTour(false);
  else requestAnimationFrame(() => viewer?.resize());
}
async function startTour() {
  tab("explorer");
  if (!(await loadModel())) return;
  tourStep = 0;
  applyTour();
  $("#tour-next").focus({ preventScroll: true });
  $("#tour").scrollIntoView({
    block: "end",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}
function applyTour() {
  const t = tour[tourStep];
  $("#tour").hidden = false;
  $("#tour-count").textContent = `ШАГ ${tourStep + 1} ИЗ ${tour.length}`;
  $("#tour-title").textContent = t.title;
  $("#tour-text").textContent = t.text;
  reveal($("#tour"), { distance: 8, duration: 360 });
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
  save();
  const url = location.href;
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
    ["СТИЛОБАТ V2.0 — состав системы"],
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
  download(url, "СТИЛОБАТ-V2.0-состав.csv");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Список материалов подготовлен");
}
renderList();
reflect();
$("#load-size").textContent = modelSizeLabel();
tabMarker = document.createElement("span");
tabMarker.className = "tab-marker";
tabMarker.setAttribute("aria-hidden", "true");
$(".workspace-tabs").append(tabMarker);
new ResizeObserver(positionTabMarker).observe($(".workspace-tabs"));
document.fonts.ready.then(positionTabMarker);

$("#document-list").innerHTML = Object.values(documents)
  .map(
    (d) =>
      `<a class="document-row" href="${d.url}" target="_blank" rel="noopener"><span class="file-mark">PDF</span><span><strong>${d.title}</strong><small>${d.subtitle}</small></span><span class="document-open">Открыть</span></a>`,
  )
  .join("");
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
$$("[data-preset]").forEach((b) =>
  b.addEventListener("click", () => {
    viewer.preset(b.dataset.preset);
    markPreset(b.dataset.preset);
  }),
);
$("#snapshot").addEventListener("click", () => {
  download(viewer.snapshot(), "СТИЛОБАТ-V2.0-слой-" + state.layer + ".png");
  toast("PNG текущего вида подготовлен к скачиванию");
});
$("#share").addEventListener("click", share);
$("#materials").addEventListener("click", materials);
$("#mobile-layers").addEventListener("click", () => mobilePanel(false));
$("#mobile-detail").addEventListener("click", () => mobilePanel(true));
$("#tour-prev").addEventListener("click", () => {
  if (tourStep > 0) {
    tourStep--;
    applyTour();
  }
});
$("#tour-next").addEventListener("click", () => {
  if (tourStep < tour.length - 1) {
    tourStep++;
    applyTour();
  } else {
    endTour();
    toast("Теперь можно исследовать систему самостоятельно");
  }
});
$("#tour-close").addEventListener("click", () => endTour());
$$("[data-tab]").forEach((b, i, all) => {
  b.addEventListener("click", () => tab(b.dataset.tab));
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
$("#help").addEventListener("click", () =>
  info(
    "Как исследовать систему",
    "<ul><li>Тяните модель мышью или одним пальцем, чтобы вращать.</li><li>Прокручивайте колесо или сводите два пальца для масштаба. Также доступны кнопки + и −.</li><li>Выберите слой на разрезе или в списке. «Только слой» временно скрывает остальную конструкцию.</li><li>Разнесите слои ползунком. Кнопка сброса возвращает исходный вид.</li><li>С клавиатуры: Tab — перейти к элементу; Enter — выбрать. На 3D-сцене стрелки вращают модель, + и − меняют масштаб, 0 сбрасывает вид.</li></ul>",
  ),
);
window.addEventListener("hashchange", () => {
  state = decodeState(location.hash);
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
if (requestedTab === "about" || requestedTab === "documents") tab(requestedTab);
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
if (location.hash.includes("system=stilobat-v2") && !requestedTab) loadModel();

// Local BrowserSync live reload verified.
