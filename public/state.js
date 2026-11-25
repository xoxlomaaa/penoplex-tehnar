export const defaults = (system) => ({
  layer: system?.defaultLayer ?? "3",
  explode: 0,
  isolate: false,
  camera: null,
});
export function decodeState(hash = "", system) {
  const p = new URLSearchParams(hash.replace(/^#/, "")),
    s = defaults(system);
  if (system?.id && p.has("system") && p.get("system") !== system.id) return s;
  const layer = p.get("layer");
  if (system?.layers ? system.layers.includes(layer) : /^(?:[1-9]|1[0-2])$/.test(layer)) s.layer = layer;
  const x = Number(p.get("explode"));
  if (Number.isFinite(x)) s.explode = Math.min(1, Math.max(0, x));
  s.isolate = p.get("isolate") === "1";
  const a = (p.get("camera") || "").split(",").map(Number);
  if (
    a.length === 7 &&
    a.every(Number.isFinite) &&
    a.slice(0, 6).every((x) => Math.abs(x) < 100) &&
    a[6] > 0.1 &&
    a[6] < 10 &&
    Math.hypot(a[0] - a[3], a[1] - a[4], a[2] - a[5]) > 0.1
  )
    s.camera = { position: a.slice(0, 3), target: a.slice(3, 6), aspect: a[6] };
  return s;
}
export function encodeState(s, system) {
  const p = new URLSearchParams({
    system: system?.id ?? "stilobat-v2",
    layer: s.layer,
    explode: String(Math.round(s.explode * 100) / 100),
  });
  if (s.isolate) p.set("isolate", "1");
  if (s.camera)
    p.set(
      "camera",
      [...s.camera.position, ...s.camera.target, s.camera.aspect]
        .map((n) => Number(n.toFixed(3)))
        .join(","),
    );
  return "#" + p;
}
