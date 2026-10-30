export const modelAssets = {
  web: {
    url: "/assets/models/stilobat-L3-web.glb",
    bytes: 39527748,
    sha256: "95f5ec8967eea4daf4ae326f255d55f52804b393914e9356910364c5a601e8dc",
  },
  mobile: {
    url: "/assets/models/stilobat-L3-mobile.glb",
    bytes: 32658340,
    sha256: "b8898f64ec1ec3a6e7659281a7e0f884221d055c7eba5e870009e3d4bdc45f20",
  },
};
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
