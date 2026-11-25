export const systems = {
  "stilobat-v2": () => import("./content.js"),
  "invers-green": () => import("./invers-green.js"),
  "invers-way": () => import("./invers-way.js"),
  "invers-sport": () => import("./invers-sport.js"),
};

export function loadSystem(id) {
  return systems[Object.hasOwn(systems, id) ? id : "stilobat-v2"]();
}
