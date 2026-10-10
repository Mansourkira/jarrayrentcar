// 3D carousel of car photos. Works with any number of cars from config.js.
import * as THREE from "three";

const CARD_W = 2.4;
const CARD_H = 1.5;
const FOV = 35;
const AUTOPLAY_MS = 4000;

function roundedCard(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 8);
  // ShapeGeometry UVs are in shape units: normalise them to 0..1
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - x) / w, (uv.getY(i) - y) / h);
  return g;
}

// Crop the photo like CSS object-fit: cover
function cover(tex, aspect) {
  const img = tex.image;
  const ia = img.width / img.height;
  if (ia > aspect) { tex.repeat.set(aspect / ia, 1); tex.offset.set((1 - aspect / ia) / 2, 0); }
  else { tex.repeat.set(1, ia / aspect); tex.offset.set(0, (1 - ia / aspect) / 2); }
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(242,181,68,0.35)");
  g.addColorStop(0.5, "rgba(10,107,115,0.15)");
  g.addColorStop(1, "rgba(10,107,115,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function createShowroom(container, cars, { onChange, onPick, onTouch }) {
  const probe = document.createElement("canvas");
  if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) throw new Error("WebGL unavailable");

  const N = cars.length;
  const STEP = (Math.PI * 2) / N;
  const R = Math.max(3.2, (N * (CARD_W + 0.5)) / (Math.PI * 2));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e1c27, R + 3, R * 2 + 6);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  // Floor glow under the front card
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, fog: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, -CARD_H / 2 - 0.05, R);
  scene.add(glow);

  const ring = new THREE.Group();
  scene.add(ring);

  const cardGeo = roundedCard(CARD_W, CARD_H, 0.12);
  const frameGeo = roundedCard(CARD_W + 0.06, CARD_H + 0.06, 0.15);
  const loader = new THREE.TextureLoader();
  const cards = cars.map((car, i) => {
    const group = new THREE.Group();
    const a = i * STEP;
    group.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    group.rotation.y = a;

    const frame = new THREE.Mesh(frameGeo, new THREE.MeshBasicMaterial({ color: 0x2a3b48 }));
    frame.position.z = -0.01;
    const photoMat = new THREE.MeshBasicMaterial({ color: 0x1f2f3c });
    const photo = new THREE.Mesh(cardGeo, photoMat);
    photo.userData.index = i;
    const reflMat = new THREE.MeshBasicMaterial({ color: 0x1f2f3c, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });
    const refl = new THREE.Mesh(cardGeo, reflMat);
    refl.scale.y = -1;
    refl.position.y = -CARD_H - 0.08;

    loader.load(car.image, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      cover(tex, CARD_W / CARD_H);
      photoMat.map = tex; photoMat.color.set(0xffffff); photoMat.needsUpdate = true;
      reflMat.map = tex; reflMat.color.set(0xffffff); reflMat.needsUpdate = true;
    });

    group.add(frame, photo, refl);
    ring.add(group);
    return { group, photo };
  });

  // ---------- Motion state ----------
  let current = 0, target = 0, lastIdx = -1, lastInteract = performance.now() - AUTOPLAY_MS * 0.5;
  const idxOf = (v) => ((Math.round(v) % N) + N) % N;
  const touch = () => { lastInteract = performance.now(); onTouch?.(); };

  function goTo(i) {
    // shortest way round to card i
    const base = Math.round(target);
    let d = (i - idxOf(base)) % N;
    if (d > N / 2) d -= N;
    if (d < -N / 2) d += N;
    target = base + d;
  }

  // ---------- Pointer: drag to spin, tap to pick ----------
  const el = renderer.domElement;
  const ray = new THREE.Raycaster();
  let drag = null;

  el.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, start: target, moved: 0 };
    el.setPointerCapture(e.pointerId);
    touch();
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    drag.moved = Math.max(drag.moved, Math.abs(dx));
    target = drag.start - (dx / el.clientWidth) * 2.5;
  });
  const end = (e, cancelled) => {
    if (!drag) return;
    const tap = !cancelled && drag.moved < 6;
    drag = null;
    target = Math.round(target);
    if (!tap) return;
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(cards.map((c) => c.photo))[0];
    if (!hit) return;
    const i = hit.object.userData.index;
    if (i === idxOf(target)) onPick?.(cars[i]);
    else goTo(i);
  };
  el.addEventListener("pointerup", (e) => end(e, false));
  el.addEventListener("pointercancel", (e) => end(e, true));

  // ---------- Size ----------
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the front card (plus a margin) inside the view on narrow screens
    const halfTan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(4.6, (CARD_W * 1.35) / (2 * halfTan * camera.aspect));
    camera.position.set(0, 0.45, R + dist);
    camera.lookAt(0, -0.15, R - 1);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- Loop (paused while off screen) ----------
  let visible = true, raf = 0, prev = performance.now();
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
  }).observe(container);

  function tick(now) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;

    if (!reduced && !drag && now - lastInteract > AUTOPLAY_MS * 1.5) {
      target = Math.round(target) + 1;
      lastInteract = now - AUTOPLAY_MS * 0.5; // next autoplay step in AUTOPLAY_MS
    }
    current += (target - current) * (1 - Math.exp(-dt * (reduced ? 30 : 6)));
    ring.rotation.y = -current * STEP;

    cards.forEach(({ group }, i) => {
      const rel = Math.cos(i * STEP - current * STEP); // 1 = front
      const s = 1 + 0.12 * Math.max(0, rel) ** 6;
      group.scale.setScalar(s);
      group.position.y = reduced ? 0 : Math.sin(now / 1000 + i) * 0.03;
    });

    const idx = idxOf(target);
    if (idx !== lastIdx) { lastIdx = idx; onChange?.(cars[idx]); }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    step(n) { target = Math.round(target) + n; touch(); },
    goTo(i) { goTo(i); touch(); },
  };
}
