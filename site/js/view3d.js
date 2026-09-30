// 3D 시뮬레이션 — 도면 치수(NW_ORDER)를 그대로 세워 올린다. 장면: 자동/벽면/기둥/상담 책상/벽 상단/제품만
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

const host = document.getElementById('view3d'); if (!host) throw new Error('no #view3d');
const note = document.getElementById('view3dNote');
const MM = 0.001;
let sceneMode = 'auto';
const isMobile = matchMedia('(max-width: 760px)').matches;

// ---- 렌더러 · 환경광 · 후처리(AO, 안티앨리어싱) ----
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.outputColorSpace = THREE.SRGBColorSpace;
host.prepend(renderer.domElement); renderer.domElement.style.display = 'block';
const scene = new THREE.Scene(); scene.background = new THREE.Color('#e4dfd6');
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture; scene.environmentIntensity = 0.55;
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 0.6; controls.maxDistance = 12;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, 1, 1); gtao.output = GTAOPass.OUTPUT.Default;
gtao.updateGtaoMaterial({ radius: 0.18, distanceExponent: 1.5, thickness: 0.6, scale: 1.2, samples: isMobile ? 8 : 16, distanceFallOff: 1 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 3, samples: 12 });
composer.addPass(gtao);
composer.addPass(new OutputPass());
const smaa = new SMAAPass(1, 1); composer.addPass(smaa);
function resize() { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); gtao.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(host); resize();

// ---- 조명 ----
scene.add(new THREE.HemisphereLight('#fff8f0', '#7d7368', 0.25));
const sun = new THREE.DirectionalLight('#fff0d8', 2.4); sun.position.set(2.6, 4.2, 3.4); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 }); sun.shadow.bias = -0.0002; sun.shadow.radius = 6; sun.shadow.blurSamples = 12; scene.add(sun);
const fill = new THREE.DirectionalLight('#d6e2ff', 0.35); fill.position.set(-4, 2.5, 2); scene.add(fill);

// ---- 질감 생성 (노이즈 기반 나뭇결 + 범프, 석고 벽, 마루, 타일) ----
function rnd(seed) { let t = seed; return () => { t = (t * 9301 + 49297) % 233280; return t / 233280; }; }
function noise2(r, w, h, oct = 4) { // 값 노이즈 (여러 옥타브)
  const out = new Float32Array(w * h); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const gw = 4 << o, gh = 4 << o, g = new Float32Array((gw + 1) * (gh + 1)); for (let i = 0; i < g.length; i++) g[i] = r();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const fx = x / w * gw, fy = y / h * gh, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const i = y0 * (gw + 1) + x0, a = g[i], b = g[i + 1], c = g[i + gw + 1], d = g[i + gw + 2];
      out[y * w + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot; return out;
}
function makeTex(c, repeat = [1, 1], srgb = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function woodTextures(base, dark, light, seed, contrast = 1) {
  const W = 256, H = 2048, r = rnd(seed), n = noise2(r, W, H, 5);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const b = document.createElement('canvas'); b.width = W; b.height = H; const bx = b.getContext('2d');
  const img = x.createImageData(W, H), bimg = bx.createImageData(W, H);
  const B = hex(base), D = hex(dark), L = hex(light);
  for (let y = 0; y < H; y++) for (let px = 0; px < W; px++) {
    const i = y * W + px; const v = n[i];
    const grainA = Math.pow(Math.min(1, Math.max(0, (v - 0.42) * 2.2)), 1.5);           // 길이 방향으로 길게 늘어진 결 얼룩
    const fine = 0.5 + 0.5 * Math.sin((y / H) * 180 + v * 12);                           // 가는 결선
    const tone = (0.65 * grainA + 0.35 * fine) * contrast;
    const col = [0, 1, 2].map(k => B[k] + (D[k] - B[k]) * tone * 0.8 + (L[k] - B[k]) * (1 - tone) * 0.25);
    img.data.set([col[0], col[1], col[2], 255], i * 4);
    const bump = 128 + (fine - 0.5) * 24 + (grainA - 0.5) * 20; bimg.data.set([bump, bump, bump, 255], i * 4);
  }
  x.putImageData(img, 0, 0); bx.putImageData(bimg, 0, 0);
  return { map: makeTex(c), bump: makeTex(b, [1, 1], false) };
}
function hex(h) { return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function plasterTex(seed) { const W = 512, r = rnd(seed), n = noise2(r, W, W, 5); const c = document.createElement('canvas'); c.width = c.height = W; const x = c.getContext('2d'); const img = x.createImageData(W, W); for (let i = 0; i < W * W; i++) { const v = 236 + (n[i] - 0.5) * 18; img.data.set([v, v - 2, v - 6, 255], i * 4); } x.putImageData(img, 0, 0); return makeTex(c, [3, 3]); }
function plankFloor() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); const r = rnd(7), n = noise2(rnd(9), 1024, 1024, 5);
  for (let row = 0; row < 8; row++) { let px = -Math.floor(r() * 300); while (px < 1024) { const w = 300 + r() * 200; const shade = 190 + r() * 34; x.fillStyle = `rgb(${shade},${shade - 24},${shade - 52})`; x.fillRect(px, row * 128, w - 3, 125); px += w; } }
  const img = x.getImageData(0, 0, 1024, 1024); for (let i = 0; i < 1024 * 1024; i++) { const g = 0.75 + 0.5 * Math.sin(n[i] * 40 + (i % 1024) / 9); img.data[i * 4] *= 0.85 + 0.15 * g; img.data[i * 4 + 1] *= 0.85 + 0.15 * g; img.data[i * 4 + 2] *= 0.85 + 0.15 * g; } x.putImageData(img, 0, 0);
  return makeTex(c, [3, 3]);
}
function tileFloor() { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const r = rnd(3), n = noise2(rnd(4), 512, 512, 4); const img = x.createImageData(512, 512); for (let i = 0; i < 512 * 512; i++) { const v = 200 + (n[i] - 0.5) * 22; img.data.set([v, v - 2, v - 7, 255], i * 4); } x.putImageData(img, 0, 0); x.fillStyle = '#a8a39a'; x.fillRect(0, 254, 512, 3); x.fillRect(254, 0, 3, 512); return makeTex(c, [6, 6]); }
const wNat = woodTextures('#DCB07C', '#93683E', '#F0D8B4', 11, 0.95), wSt = woodTextures('#9C6A3C', '#4C2A12', '#C4915F', 23, 1.15), wPlyN = woodTextures('#E2C59B', '#A57D53', '#F1DFBF', 5, 0.7), wPlyS = woodTextures('#C5A57E', '#876341', '#DEC09F', 5, 0.7); // 합판: 각재 색의 중간 톤 (마감별)
const matBattenNatural = new THREE.MeshPhysicalMaterial({ map: wNat.map, bumpMap: wNat.bump, bumpScale: 0.25, roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.6 });
const matBattenStain = new THREE.MeshPhysicalMaterial({ map: wSt.map, bumpMap: wSt.bump, bumpScale: 0.2, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.45 });
const matPlyNatural = new THREE.MeshStandardMaterial({ map: wPlyN.map, bumpMap: wPlyN.bump, bumpScale: 0.12, roughness: 0.82 });
const matPlyStain = new THREE.MeshPhysicalMaterial({ map: wPlyS.map, bumpMap: wPlyS.bump, bumpScale: 0.12, roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.6 });
const matWall = new THREE.MeshStandardMaterial({ map: plasterTex(31), roughness: 0.96 });
const matWall2 = new THREE.MeshStandardMaterial({ color: '#d9d3c8', map: plasterTex(32), roughness: 0.96 });
const matCeil = new THREE.MeshStandardMaterial({ color: '#f7f6f3', roughness: 1 });
const matFloorWood = new THREE.MeshPhysicalMaterial({ map: plankFloor(), roughness: 0.45, clearcoat: 0.25, clearcoatRoughness: 0.5 });
const matFloorTile = new THREE.MeshPhysicalMaterial({ map: tileFloor(), roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.35 });
const matDesk = new THREE.MeshStandardMaterial({ color: '#f5f4f0', roughness: 0.45 });
const matTop = new THREE.MeshPhysicalMaterial({ color: '#26262a', roughness: 0.3, clearcoat: 0.5 });
const matColumn = new THREE.MeshStandardMaterial({ map: plasterTex(33), roughness: 0.9 });
const matTrim = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.6 });   // 흰색 쫄대
const matFabric = new THREE.MeshStandardMaterial({ color: '#b3aa9c', roughness: 1 });
const matBlack = new THREE.MeshStandardMaterial({ color: '#1f1f1f', roughness: 0.55, metalness: 0.2 });
const matLeaf = new THREE.MeshStandardMaterial({ color: '#4c7a45', roughness: 0.8 });
const matPot = new THREE.MeshStandardMaterial({ color: '#8f8a84', roughness: 0.9 });
const matGlass = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.05, transmission: 0.9, thickness: 0.02, transparent: true, opacity: 0.35 });

// ---- 기본 도형 ----
function box(w, h, d, mat, x, y, z, round = 0) { const g = round ? new RoundedBoxGeometry(w, h, d, 3, round) : new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, mat); m.position.set(x + w / 2, y + h / 2, z + d / 2); m.castShadow = m.receiveShadow = true; return m; }
function plane(w, h, mat, x, y, z, rx = 0, ry = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); m.receiveShadow = true; return m; }
function cyl(r, h, mat, x, y, z, rt = r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, r, h, 32), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; return m; }

// ---- 패널 (정면 +z, 왼쪽 아래 원점) ----
function buildPanel(opt = {}) {
  const { s, r, BAT, GAP, PITCH, PLY } = window.NW_ORDER.get();
  const g = new THREE.Group(); const matB = s.finish === '무도장' ? matBattenNatural : matBattenStain, matPly = s.finish === '무도장' ? matPlyNatural : matPlyStain;
  const widthMM = opt.width || s.A;                                    // 폭을 지정하면(기둥 옆면) 그 폭으로 같은 규칙 적용
  let nV = opt.width ? Math.max(0, Math.floor((widthMM - s.F - s.G + GAP) / PITCH)) : r.n, Fmm = s.F;
  if (opt.centered) { nV = Math.max(0, Math.floor((widthMM - GAP) / PITCH)); Fmm = (widthMM - (nV * PITCH - GAP)) / 2; } // 기둥 면: 양쪽 여백 동일(≥30)
  const A = widthMM * MM, B = s.B * MM, C = (s.dir === 'v' ? r.C : Math.max(0, widthMM - r.D)) * MM, K = s.K * MM, ply = PLY * MM, bat = BAT * MM, pitch = PITCH * MM, F = Fmm * MM;
  g.add(box(A, B, ply, matPly, 0, 0, 0));
  const batten = (w, h, d, x, y, z) => box(w, h, d, matB, x, y, z, 0.002);
  if (s.dir === 'v') { for (let i = 0; i < nV; i++) g.add(batten(bat, C, bat, F + i * pitch, B - C, ply)); }
  else { for (let i = 0; i < r.n; i++) g.add(batten(C, bat, bat, 0, B - F - i * pitch - bat, ply)); }
  if (opt.noCorner) return { g, A, B, K };
  const addReturn = (side) => {
    const rg = new THREE.Group();
    rg.add(box(K, B, ply, matPly, 0, 0, 0));
    if (s.dir === 'v') { for (let i = 0; i < r.cornerBattens; i++) rg.add(batten(bat, C, bat, side === 'left' ? K - bat - i * pitch : i * pitch, B - C, ply)); }
    else { for (let i = 0; i < r.n; i++) rg.add(batten(K, bat, bat, 0, B - F - i * pitch - bat, ply)); }
    if (side === 'left') { rg.rotation.y = -Math.PI / 2; rg.position.set(ply, 0, ply); } else { rg.rotation.y = Math.PI / 2; rg.position.set(A - ply, 0, ply - K); }
    g.add(rg);
  };
  if (r.left) addReturn('left'); if (r.right) addReturn('right');
  return { g, A, B, K };
}

// ---- 소품 ----
function sofa(x, z) { const g = new THREE.Group(); g.add(box(1.8, 0.4, 0.85, matFabric, 0, 0.05, 0, 0.04)); g.add(box(1.8, 0.42, 0.24, matFabric, 0, 0.42, 0, 0.04)); g.add(box(0.2, 0.26, 0.85, matFabric, 0, 0.42, 0, 0.04)); g.add(box(0.2, 0.26, 0.85, matFabric, 1.6, 0.42, 0, 0.04)); [0.35, 0.95].forEach(cx => g.add(box(0.5, 0.16, 0.5, matFabric, cx, 0.45, 0.06, 0.05))); [[0.05, 0.05], [1.7, 0.05], [0.05, 0.75], [1.7, 0.75]].forEach(([a, b]) => g.add(cyl(0.02, 0.06, matBlack, a, 0, b))); g.position.set(x, 0, z); return g; }
function plant(x, z) { const g = new THREE.Group(); g.add(cyl(0.15, 0.36, matPot, 0, 0, 0, 0.18)); const r = rnd(41); for (let i = 0; i < 9; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14 + r() * 0.1, 14, 12), matLeaf); leaf.scale.set(1, 0.7, 1); leaf.position.set((r() - 0.5) * 0.45, 0.5 + r() * 0.4, (r() - 0.5) * 0.45); leaf.castShadow = true; g.add(leaf); } g.position.set(x, 0, z); return g; }
function chair(x, z, ry = 0) { const g = new THREE.Group(); g.add(box(0.46, 0.05, 0.46, matBlack, -0.23, 0.44, -0.23, 0.01)); g.add(box(0.46, 0.44, 0.04, matBlack, -0.23, 0.49, -0.23, 0.01)); [[-0.21, -0.21], [0.17, -0.21], [-0.21, 0.17], [0.17, 0.17]].forEach(([a, b]) => g.add(cyl(0.012, 0.44, matBlack, a + 0.02, 0, b + 0.02))); g.position.set(x, 0, z); g.rotation.y = ry; return g; }
function table(x, z, w = 1.2, d = 0.7) { const g = new THREE.Group(); g.add(box(w, 0.035, d, matTop, -w / 2, 0.72, -d / 2, 0.005)); [[-w / 2 + 0.06, -d / 2 + 0.06], [w / 2 - 0.06, -d / 2 + 0.06], [-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06]].forEach(([a, b]) => g.add(cyl(0.015, 0.72, matBlack, a, 0, b))); g.position.set(x, 0, z); return g; }
function bench(x, z, w) { const g = new THREE.Group(); g.add(box(w, 0.05, 0.42, matTop, -w / 2, 0.42, -0.21, 0.005)); g.add(box(0.05, 0.42, 0.38, matBlack, -w / 2 + 0.1, 0, -0.19)); g.add(box(0.05, 0.42, 0.38, matBlack, w / 2 - 0.15, 0, -0.19)); g.add(box(0.5, 0.08, 0.36, matFabric, -0.25, 0.47, -0.18, 0.03)); g.position.set(x, 0, z); return g; }
function pendant(x, z, y) { const g = new THREE.Group(); g.add(cyl(0.004, 0.7, matBlack, 0, y - 0.7, 0)); const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.18, 40, 1, true), new THREE.MeshStandardMaterial({ color: '#1f1f1f', roughness: 0.5, side: THREE.DoubleSide })); shade.position.set(0, y - 0.78, 0); shade.castShadow = true; g.add(shade); const pl = new THREE.PointLight('#ffdcb0', 5, 3.5, 2); pl.position.set(0, y - 0.9, 0); g.add(pl); g.position.set(x, 0, z); return g; }
function downlights(y, w, d, n = 3) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const x = -w / 2 + (i + 0.5) * w / n; const ring = cyl(0.06, 0.01, matBlack, x, y - 0.012, d); g.add(ring); const sp = new THREE.SpotLight('#fff1dc', 3.5, 6, 0.75, 0.6, 1.5); sp.position.set(x, y - 0.02, d); sp.target.position.set(x, 0, d + 0.3); g.add(sp); g.add(sp.target); } return g; }
function windowPane(x, y, z, w, h, ry = 0) { const g = new THREE.Group(); g.add(box(w, h, 0.02, matGlass, -w / 2, 0, 0)); g.add(box(w + 0.08, 0.05, 0.06, matBlack, -w / 2 - 0.04, -0.05, -0.02)); g.add(box(w + 0.08, 0.05, 0.06, matBlack, -w / 2 - 0.04, h, -0.02)); g.add(box(0.05, h, 0.06, matBlack, -w / 2 - 0.04, 0, -0.02)); g.add(box(0.05, h, 0.06, matBlack, w / 2 - 0.01, 0, -0.02)); g.add(box(0.03, h, 0.03, matBlack, -0.015, 0, -0.01)); g.position.set(x, y, z); g.rotation.y = ry; return g; }

// ---- 장면 ----
let world = new THREE.Group(); scene.add(world);
function clear() { scene.remove(world); world = new THREE.Group(); scene.add(world); }
function pickAuto(s, r) { if (s.corner !== 'none') return 'column'; if (r.along >= 1800) return 'wall'; return (s.B <= 1200 && s.A <= 2400) ? 'desk' : 'upper'; } // 짧고 폭도 책상 크기면 상담 책상, 폭이 넓으면 벽 상단
const auto = { on: true, base: null, t0: performance.now(), resumeAt: 0 };
function placeCam(target, dist, elev, azim) { camera.position.set(target.x + dist * Math.sin(azim) * Math.cos(elev), target.y + dist * Math.sin(elev), target.z + dist * Math.cos(azim) * Math.cos(elev)); }
function lookAt(target, dist, elev = 0.3, azim = 0.55) { controls.target.copy(target); placeCam(target, dist, elev, azim); auto.base = { target: target.clone(), dist, elev, azim }; auto.t0 = performance.now(); controls.update(); }
// 사용자가 조작하면 자동 움직임을 멈추고, 손을 떼고 5초 뒤 현재 시점을 기준으로 다시 천천히 움직임
const hint = document.getElementById('view3dHint');
const hideHint = () => { if (hint && !hint.classList.contains('off')) { hint.classList.add('off'); setTimeout(() => hint.remove(), 500); } };
controls.addEventListener('start', () => { auto.on = false; hideHint(); });
renderer.domElement.addEventListener('wheel', hideHint, { passive: true });
controls.addEventListener('end', () => { auto.resumeAt = performance.now() + 5000; });
function autoMove(now) {
  if (!auto.on && auto.resumeAt && now > auto.resumeAt) { // 재개: 현재 카메라를 새 기준으로
    const off = camera.position.clone().sub(controls.target); const dist = off.length();
    auto.base = { target: controls.target.clone(), dist, elev: Math.asin(off.y / dist), azim: Math.atan2(off.x, off.z) }; auto.t0 = now; auto.on = true; auto.resumeAt = 0;
  }
  if (!auto.on || !auto.base) return;
  const t = (now - auto.t0) / 1000, b = auto.base;
  const azim = b.azim + Math.sin(t * 0.22) * 0.32, elev = b.elev + Math.sin(t * 0.13) * 0.05, dist = b.dist * (1 + Math.sin(t * 0.09) * 0.04);
  placeCam(b.target, dist, elev, azim);
}
function room(w, h, d, floorMat, withWindow = true) {
  world.add(plane(w, d, floorMat, 0, 0, d / 2 - 0.01, -Math.PI / 2));
  world.add(plane(w, h, matWall, 0, h / 2, -0.01));
  world.add(plane(d, h, matWall2, -w / 2, h / 2, d / 2 - 0.01, 0, Math.PI / 2));
  world.add(plane(w, d, matCeil, 0, h, d / 2 - 0.01, Math.PI / 2));
  world.add(box(w, 0.09, 0.012, matWall2, -w / 2, 0, -0.012));
  world.add(box(0.012, 0.09, d, matWall2, -w / 2, 0, 0));                                   // 측벽 걸레받이 (벽 길이만큼)
  if (withWindow) world.add(windowPane(-w / 2 + 0.03, 0.9, 2.2, 1.6, 1.3, Math.PI / 2));
  world.add(downlights(h, Math.min(w, 5), 1.2, 3));
}
function build() {
  if (!window.NW_ORDER) return;
  clear();
  const { s, r } = window.NW_ORDER.get();
  const p = buildPanel();
  const mode = sceneMode === 'auto' ? pickAuto(s, r) : sceneMode;
  const labels = { wall: '벽면 부착', column: '기둥 감싸기', desk: '상담 책상 전면', upper: '벽 상단 부착', product: '제품만' };
  note.textContent = `${sceneMode === 'auto' ? '자동 · ' : ''}${labels[mode]}  ·  ${s.A}×${s.B}mm · 각재 ${r.totalBattens}개 · ${s.finish}`;
  document.dispatchEvent(new CustomEvent('scene3d', { detail: { mode, finish: s.finish, dir: s.dir } }));
  const A = p.A, B = p.B, K = p.K;
  if (mode === 'product') {
    const grid = new THREE.GridHelper(6, 24, '#b8b0a4', '#d6cfc4'); grid.position.y = -0.001; world.add(grid);
    world.add(plane(8, 8, new THREE.ShadowMaterial({ opacity: 0.3 }), 0, 0, 0, -Math.PI / 2));
    p.g.position.set(-A / 2, 0, 0); world.add(p.g);
    lookAt(new THREE.Vector3(0, B / 2, 0), Math.max(A, B) * 1.9 + 0.6, 0.3, 0.6);
  } else if (mode === 'wall') {
    const roomW = Math.max(4.8, A + 3.2), roomH = Math.max(2.7, B + 0.3);
    room(roomW, roomH, 6, matFloorWood);
    p.g.position.set(-A / 2, 0, 0.002); world.add(p.g);
    world.add(sofa(-A / 2 - 0.3 - (A > 1.6 ? 0 : 0.5), 1.25)); world.add(plant(A / 2 + 0.6, 0.45)); world.add(table(A / 2 + 0.5, 1.6, 0.6, 0.6)); world.add(pendant(0, 1.5, roomH));
    lookAt(new THREE.Vector3(0, B / 2 - 0.1, 0), Math.max(A, B) * 1.45 + 1.3, 0.2, 0.48);
  } else if (mode === 'column') {
    const depth = K > 0 && s.corner !== 'none' ? K : A, roomH = Math.max(2.7, B + 0.3);   // 기둥 단면: A × (K 또는 A)
    const Cm = r.C * MM, y0 = B - Cm;                                                       // 각재 길이 C, 각재 시작 높이
    world.add(plane(9, 9, matFloorTile, 0, 0, 0, -Math.PI / 2)); world.add(plane(9, roomH, matWall, 0, roomH / 2, -3.2)); world.add(plane(9, 9, matCeil, 0, roomH, 0, Math.PI / 2));
    world.add(box(9, 0.09, 0.012, matWall2, -4.5, 0, -3.212));
    world.add(box(A, roomH, depth, matColumn, -A / 2, 0, -depth));                                   // 기둥 몸체
    const ply = 0.008, bat = 0.03, skin = ply + bat;
    const o = { noCorner: true, centered: true };
    const front = buildPanel(o).g; front.position.set(-A / 2, 0, 0.001); world.add(front);                                                   // 정면 (+z)
    const back = buildPanel(o).g; back.rotation.y = Math.PI; back.position.set(A / 2, 0, -depth - 0.001); world.add(back);                   // 후면 (−z)
    const right = buildPanel({ ...o, width: depth / MM }).g; right.rotation.y = Math.PI / 2; right.position.set(A / 2 + 0.001, 0, 0); world.add(right);      // 우측면 (+x)
    const left = buildPanel({ ...o, width: depth / MM }).g; left.rotation.y = -Math.PI / 2; left.position.set(-A / 2 - 0.001, 0, -depth); world.add(left);  // 좌측면 (−x)
    // 모서리 각재: 다른 각재와 같은 길이(C)·같은 높이
    const matB = s.finish === '무도장' ? matBattenNatural : matBattenStain;
    if (s.dir === 'v') [[A / 2 + ply, ply], [-A / 2 - skin, ply], [A / 2 + ply, -depth - skin], [-A / 2 - skin, -depth - skin]].forEach(([x, z]) => world.add(box(bat, Cm, bat, matB, x, y0, z, 0.002))); // 세로 배열만 모서리 각재 (가로 배열은 각재가 모서리를 돌아감)
    // 상단 쫄대 마감: 각재 윗면을 덮는 띠 (사방)
    const tH = 0.045, tD = 0.014, ox = A / 2 + skin, oz = depth + skin;
    world.add(box(2 * ox + 2 * tD, tH, tD, matTrim, -ox - tD, B - tH, skin));               // 정면 (흰색 쫄대)
    world.add(box(2 * ox + 2 * tD, tH, tD, matTrim, -ox - tD, B - tH, -oz - tD));           // 후면
    world.add(box(tD, tH, oz + skin, matTrim, ox, B - tH, -oz));                            // 우측
    world.add(box(tD, tH, oz + skin, matTrim, -ox - tD, B - tH, -oz));                      // 좌측
    world.add(box(2 * ox + 2 * tD, 0.012, oz + skin + 2 * tD, matTrim, -ox - tD, B, -oz - tD)); // 윗면 덮개
    // 조명: 천장 트랙 스포트 4개가 각 면을 비춤
    const track = (x, z, tx, tz) => { world.add(box(0.05, 0.03, 0.9, matBlack, x - 0.025, roomH - 0.03, z - 0.45)); world.add(cyl(0.035, 0.12, matBlack, x, roomH - 0.15, z)); const sp = new THREE.SpotLight('#fff0d6', 9, 7, 0.42, 0.5, 1.4); sp.position.set(x, roomH - 0.15, z); sp.target.position.set(tx, B * 0.55, tz); sp.castShadow = true; world.add(sp); world.add(sp.target); };
    track(0, 1.5, 0, 0); track(A / 2 + 1.5, -depth / 2, A / 2, -depth / 2); track(0, -depth - 1.5, 0, -depth); track(-A / 2 - 1.5, -depth / 2, -A / 2, -depth / 2);
    world.add(table(A / 2 + 1.7, 0.3)); world.add(chair(A / 2 + 1.7, 0.95)); world.add(chair(A / 2 + 1.7, -0.35, Math.PI)); world.add(plant(-A / 2 - 0.85, -0.6)); world.add(downlights(roomH, 5, 1.8, 3));
    world.add(windowPane(2.4, 0.9, -3.18, 2.0, 1.4));
    lookAt(new THREE.Vector3(0, B / 2 - 0.1, -depth / 2), Math.max(A, B) * 1.6 + 1.4, 0.2, 0.75);
  } else if (mode === 'desk') {
    const deskW = A + 0.3, deskH = B + 0.04, deskD = 0.7, roomH = 2.7, zf = 1.3; // zf = 책상 앞면 위치 (벽에서 방 안쪽으로)
    room(Math.max(5, deskW + 3), roomH, 6, matFloorTile);
    world.add(box(deskW, deskH - 0.04, deskD, matDesk, -deskW / 2, 0, zf - deskD, 0.01));                                   // 책상 몸체 (벽 앞에 독립)
    world.add(box(deskW + 0.06, 0.04, deskD + 0.06, matTop, -deskW / 2 - 0.03, deskH - 0.04, zf - deskD - 0.03, 0.006));    // 상판
    world.add(box(0.5, 0.32, 0.02, matBlack, -0.25, deskH + 0.1, zf - deskD + 0.15)); world.add(cyl(0.05, 0.1, matBlack, 0, deskH, zf - deskD + 0.16)); // 모니터
    world.add(chair(0.45, zf - deskD - 0.4, 0));                                                                            // 직원 의자 (책상 몸체 뒤, 겹치지 않게)
    p.g.position.set(-A / 2, 0, zf + 0.001); world.add(p.g);                                                                // 패널: 책상 앞면
    world.add(chair(-0.35, zf + 0.85, Math.PI)); world.add(chair(0.35, zf + 0.85, Math.PI)); world.add(plant(deskW / 2 + 0.55, zf - 0.3));
    lookAt(new THREE.Vector3(0, B / 2 + 0.2, zf), Math.max(A, B) * 1.6 + 2.0, 0.3, 0.42);
  } else if (mode === 'upper') {
    // 벽 상단: 벽 폭은 5m 고정 (제품 크기와 무관, 5m를 넘는 제품만 예외로 확장), 패널은 가운데 배치
    const roomW = Math.max(5.0, A + 0.004), roomD = 6, roomH = 2.7, top = Math.min(roomH - 0.15, 2.35), y0 = Math.max(0.3, Math.min(0.9, top - B)); // 높은 패널은 천장 안에 들어오도록 아래로
    world.add(plane(roomW, roomD, matFloorWood, 0, 0, roomD / 2 - 0.01, -Math.PI / 2));
    world.add(plane(roomW, roomH, matWall, 0, roomH / 2, -0.01));
    world.add(plane(roomD, roomH, matWall2, -roomW / 2, roomH / 2, roomD / 2 - 0.01, 0, Math.PI / 2));
    world.add(plane(roomD, roomH, matWall2, roomW / 2, roomH / 2, roomD / 2 - 0.01, 0, -Math.PI / 2));
    world.add(plane(roomW, roomD, matCeil, 0, roomH, roomD / 2 - 0.01, Math.PI / 2));
    world.add(box(roomW, 0.09, 0.012, matWall2, -roomW / 2, 0, -0.012));
    world.add(box(0.012, 0.09, roomD, matWall2, -roomW / 2, 0, 0)); world.add(box(0.012, 0.09, roomD, matWall2, roomW / 2 - 0.012, 0, 0));
    world.add(box(roomW, y0 - 0.02, 0.015, matWall2, -roomW / 2, 0, -0.005));                  // 하부 벽(웨인스코트)
    world.add(windowPane(-roomW / 2 + 0.03, 0.9, 2.4, 1.6, 1.3, Math.PI / 2));
    world.add(downlights(roomH, Math.min(roomW, 5), 1.2, 3));
    p.g.position.set(-A / 2, y0, 0.002); world.add(p.g);
    { // 패널 둘레 흰색 쫄대 (기둥과 같은 마감)
      const tD = 0.014, tH = 0.045, skin = 0.008 + 0.03;
      world.add(box(A + 2 * tD, tH, skin + tD, matTrim, -A / 2 - tD, y0 + B - tH, 0.002));            // 위
      world.add(box(A + 2 * tD, tH, skin + tD, matTrim, -A / 2 - tD, y0, 0.002));                     // 아래
      world.add(box(tD, B, skin + tD, matTrim, -A / 2 - tD, y0, 0.002));                              // 왼쪽
      world.add(box(tD, B, skin + tD, matTrim, A / 2, y0, 0.002));                                    // 오른쪽
    }
    const benchW = roomW - 0.6; world.add(bench(0, 0.35, benchW));                            // 벤치·테이블은 벽 폭 기준으로 고정 배치
    [-1.5, 0, 1.5].forEach(x => { world.add(table(x, 1.05, 0.6, 0.5)); world.add(pendant(x, 1.05, roomH)); });
    world.add(plant(roomW / 2 - 0.4, 1.9));
    lookAt(new THREE.Vector3(0, Math.min(y0 + B / 2, 1.6), 0), 6.4, 0.12, 0.4);
  }
}
document.querySelectorAll('#scene3d button').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('#scene3d button').forEach(x => x.classList.remove('on')); b.classList.add('on'); sceneMode = b.dataset.scene; build(); }));
let pending = null; window.update3D = () => { clearTimeout(pending); pending = setTimeout(build, 120); };
build();
(function loop(now) { autoMove(now || performance.now()); controls.update(); composer.render(); requestAnimationFrame(loop); })(performance.now());
