import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
export function createStudioLighting(scene, renderer, { mobile }) {
  let env, floor, contactShadow;
  // Broad studio fill opens dark faces without changing exposure or material colours.
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  env = pmrem.fromScene(room, 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;
  room.dispose();
  pmrem.dispose();
  const sky = new THREE.HemisphereLight(0xffffff, 0xb5bdc3, 0.45);
  sky.name = "Studio / diffuse sky and ground bounce";
  scene.add(sky);
  const light = new THREE.DirectionalLight(0xffffff, 2.1);
  light.name = "Studio / side key";
  light.position.set(4, 4.2, 6);
  light.castShadow = !mobile;
  light.shadow.mapSize.set(4096, 4096);
  light.shadow.radius = 5;
  light.shadow.camera.left = -6;
  light.shadow.camera.right = 6;
  light.shadow.camera.top = 7;
  light.shadow.camera.bottom = -6;
  light.shadow.camera.far = 25;
  light.shadow.bias = -0.00008;
  light.shadow.normalBias = 0.006;
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xf4f7ff, 0.95);
  fill.name = "Studio / soft front fill";
  fill.position.set(-5, 3.5, 1.5);
  scene.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 0.4);
  back.name = "Studio / soft rear fill";
  back.position.set(1, 4, -5);
  scene.add(back);
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.ShadowMaterial({ opacity: 0.065 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.012;
  floor.receiveShadow = true;
  scene.add(floor);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 512;
  const ctx = shadowCanvas.getContext("2d");
  ctx.filter = "blur(25px)";
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(64, 64, 384, 384);
  ctx.filter = "blur(8px)";
  ctx.fillStyle = "rgba(0,0,0,0.13)";
  ctx.fillRect(64, 64, 384, 384);
  floor.visible = false;
  contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 6.4),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(shadowCanvas),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = -0.006;
  contactShadow.renderOrder = -1;
  scene.add(contactShadow);

  return { env, floor, contactShadow };
}
