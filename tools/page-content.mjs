import { defaults } from "../public/state.js";
import { chooseInitialNote } from "./page-initializer.mjs";
import { modelAssets } from "../public/model-assets.js";
import { loadSystem } from "../public/systems.js";

export const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const documentRow = (doc, primary = false) =>
  '<a class="document-row' + (primary ? " document-primary" : "") + '" href="' + escapeHTML(doc.url) + '" target="_blank" rel="noopener">' +
  '<span class="file-mark" aria-hidden="true">PDF</span><span><strong>' + escapeHTML(doc.title) + '</strong><small>' +
  escapeHTML(doc.subtitle) + '</small></span><span class="document-open">Открыть PDF</span></a>';

export async function renderSystemPage(html, id) {
  const { documents, layers, system } = await loadSystem(id);
  const selected = defaults(system).layer;
  const list = layers.map(layer => {
    const num = layer.id.padStart(2, "0");
    return '<li><button type="button" data-layer="' + layer.id + '" aria-pressed="' + (layer.id === selected) +
      '" style="--swatch:' + layer.color + '"><span class="layer-number">' + num +
      '</span><span class="layer-copy"><strong>' + escapeHTML(layer.name) + '</strong><small>' +
      escapeHTML(layer.short) + '</small></span></button></li>';
  }).join("\n");
  const docs = documentRow(documents.system, true) + '<h3 class="document-group-title">Материалы системы</h3>' +
    Object.entries(documents).filter(([key]) => key !== "system").map(([, doc]) => documentRow(doc)).join("\n");
  const fallbackLayers = layers.map(layer => '<details><summary>' + layer.id.padStart(2, "0") + ' · ' +
    escapeHTML(layer.name) + '</summary><p>' + escapeHTML(layer.short) + ' · ' + escapeHTML(layer.role) + '</p><p>' +
    escapeHTML(layer.text) + '</p><p>' + escapeHTML(layer.spec) + '</p></details>').join("\n");
  const scenes = [...html.matchAll(/\bdata-full="([^"]+)"/g)].map((m, i) => '<a href="' + escapeHTML(m[1]) +
    '" target="_blank" rel="noopener">' + (i ? "Разрез крупным планом" : "Общий вид") + '</a>').join(" ");
  const fallback = '<noscript><style>.workspace-nav,#explorer,#materials,.gallery-toolbar,.gallery-choices,#application-explore{display:none!important}' +
    '#about[hidden],#documents[hidden]{display:block!important}</style>' +
    '<section class="static-system" aria-label="Состав системы"><h2>Слои системы</h2><p>Для вращения модели включите JavaScript.</p>' +
    fallbackLayers + '</section><nav class="static-gallery-links" aria-label="Сцены применения">' + scenes + '</nav></noscript>';
  const formatSize = asset => (asset.bytes / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 });
  const size = system.modelAsset ? formatSize(system.modelAsset) : formatSize(modelAssets.mobile) + "–" + formatSize(modelAssets.web);
  return html
    .replace(/(<ol id="layer-list"[^>]*>)(<\/ol>)/, "$1" + list + "$2")
    .replace('<div id="document-list"></div>', '<div id="document-list">' + docs + '</div>')
    .replace(/(<p class="load-size" id="load-size">\s*)[0-9,–]+\s*МБ/, (_, prefix) => prefix + size + " МБ")
    .replace('<script type="module" src=', '<script>(' + chooseInitialNote.toString() + ')();</script>\n    <script type="module" src=')
    .replace('</template>', '</template><script>' +
      'if(!["about","documents"].includes(new URLSearchParams(location.search).get("tab"))){const t=document.currentScript.previousElementSibling;t.before(t.content.cloneNode(true));}' +
      '</script>')
    .replace(/(<section\b[^>]*\bid="about")/, fallback + "\n      $1");
}
