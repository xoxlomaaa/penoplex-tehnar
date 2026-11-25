import { optimizedModels } from "./optimized-models.js";
export const modelAssets = optimizedModels.stilobat;
export function selectModelAsset({ narrow = false, saveData = false } = {}) {
  return narrow || saveData ? modelAssets.mobile : modelAssets.web;
}
export function chooseModelAsset() {
  return selectModelAsset({
    narrow: matchMedia("(max-width:760px)").matches,
    saveData: navigator.connection?.saveData,
  });
}
export function modelSizeLabel() {
  return (
    (chooseModelAsset().bytes / 1e6).toLocaleString("ru-RU", {
      maximumFractionDigits: 1,
    }) + " МБ · загрузка по запросу"
  );
}
