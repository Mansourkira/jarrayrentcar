// Hero background: a low-poly car driving down a Djerba road at sunset (three.js).
// Scrolling the page speeds the car up and lowers the camera. Pauses when off-screen,
// shows a single still frame with prefers-reduced-motion, and throws if WebGL is missing
// (the caller keeps the plain dark header in that case).
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Night (sunset) and day palettes: the theme switch blends smoothly between the two.
const PAL = {
  night: { top: "#0b1620", mid: "#1d3f5c", hor: "#e9854d", ground: "#3b2f27", shoulder: "#5a4636", hill: "#24313a", road: "#a8aeb5",
    trunk: "#4a3526", crown: "#1f5a45", hemiSky: "#ffb27a", hemiGround: "#1a1410", key: "#ffa56b", sun: "#ffd596" },
  day: { top: "#5fb0ea", mid: "#a8d8f6", hor: "#f7efd9", ground: "#cdb88c", shoulder: "#b59d76", hill: "#a9bfb2", road: "#ffffff",
    trunk: "#8a6a45", crown: "#3a9a52", hemiSky: "#ffffff", hemiGround: "#c9b48a", key: "#fff1d0", sun: "#fff6d8" },
};
const NUM = { // [night, day]
  hemi: [0.9, 1.25], key: [1.4, 1.0], fill: [0.7, 0.25], tail: [1.6, 0.5], stars: [0.7, 0], glow: [1, 0.4], glowScale: [190, 150],
  sunY: [5, 46], sunX: [42, 62], sunScale: [1, 0.85],
};
const lerp = (a, b, k) => a + (b - a) * k;

export function createHeroScene(canvas, header, perks, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
  const small = matchMedia("(max-width: 800px)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.25 : 1.75));
  const HORIZON = new THREE.Color(PAL.night.hor), SKY_TOP = new THREE.Color(PAL.night.top), SKY_MID = new THREE.Color(PAL.night.mid);
  renderer.setClearColor(SKY_TOP);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(HORIZON, 22, 175);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 700);

  // ---------- Sky ----------
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(500, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: SKY_TOP }, mid: { value: SKY_MID }, hor: { value: HORIZON } },
      vertexShader: "varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `varying vec3 p; uniform vec3 top; uniform vec3 mid; uniform vec3 hor;
        void main(){ float h = clamp(normalize(p).y, 0.0, 1.0);
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, h));
          c = mix(c, top, smoothstep(0.12, 0.55, h));
          gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  scene.add(sky);

  const stars = (() => {
    const n = 140, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.3 + Math.random() * 0.9, r = 450;
      pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r - 100], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.7, fog: false }));
  })();
  scene.add(stars);

  // Sun: disc + soft glow, partly below the horizon
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,200,130,.95)"); g.addColorStop(0.25, "rgba(255,150,80,.45)"); g.addColorStop(1, "rgba(255,120,60,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const sunX = 42;
  const sun = new THREE.Mesh(new THREE.CircleGeometry(9, 40), new THREE.MeshBasicMaterial({ color: 0xffd596, fog: false }));
  sun.position.set(sunX, 5, -230);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  glow.scale.set(190, 190, 1);
  glow.position.set(sunX, 6, -228);
  scene.add(sun, glow);

  // ---------- Ground + road ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshLambertMaterial({ color: 0x3b2f27 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -300;
  scene.add(ground);

  const ROAD_W = 7, TILE = 8;
  const roadTex = (() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 256;
    const x = c.getContext("2d");
    x.fillStyle = "#2c333b"; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; x.fillRect(Math.random() * 128, Math.random() * 256, 2, 2); }
    x.fillStyle = "#ffffff";
    x.fillRect(5, 0, 3, 256); x.fillRect(120, 0, 3, 256);       // edge lines
    x.fillStyle = "#f6cf7a"; x.fillRect(62, 20, 4, 100);         // centre dash
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    t.colorSpace = THREE.SRGBColorSpace;
    t.repeat.set(1, 480 / TILE / 2);
    return t;
  })();
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 480), new THREE.MeshLambertMaterial({ map: roadTex }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -220);
  scene.add(road);
  const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W + 3.2, 480), new THREE.MeshLambertMaterial({ color: 0x5a4636 }));
  shoulder.rotation.x = -Math.PI / 2;
  shoulder.position.set(0, 0.005, -220);
  scene.add(shoulder);

  // Distant hills
  const hillMat = new THREE.MeshLambertMaterial({ color: 0x24313a });
  [[-70, -150, 60, 7], [-25, -170, 70, 5], [30, -165, 55, 6], [85, -150, 65, 8], [150, -160, 80, 6]].forEach(([x, z, w, h]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), hillMat);
    m.scale.set(w, h, 14); m.position.set(x, 0, z);
    scene.add(m);
  });

  // ---------- Lights ----------
  const hemi = new THREE.HemisphereLight(0xffb27a, 0x1a1410, 0.9); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffa56b, 1.4); key.position.set(-10, 5, -40); scene.add(key);
  const fill = new THREE.DirectionalLight(0x7fb2d6, 0.7); fill.position.set(6, 8, 14); scene.add(fill);

  // ---------- Palms ----------
  const trunkGeo = (() => {
    const g = new THREE.CylinderGeometry(0.08, 0.16, 4.2, 6, 5);
    g.translate(0, 2.1, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 4.2; p.setX(i, p.getX(i) + 0.55 * t * t); }
    g.computeVertexNormals();
    return g;
  })();
  const crownGeo = (() => {
    const parts = [];
    const N = 9;
    for (let k = 0; k < N; k++) {
      const g = new THREE.PlaneGeometry(0.6, 2.5, 1, 6);
      g.translate(0, 1.25, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = p.getY(i) / 2.5; p.setX(i, p.getX(i) * (1 - 0.85 * t)); }
      g.rotateX(Math.PI / 2 - 0.45);
      const q = g.attributes.position;
      for (let i = 0; i < q.count; i++) { const d = q.getZ(i); q.setY(i, q.getY(i) - 0.16 * d * d); }
      g.rotateY((k / N) * Math.PI * 2 + (k % 2) * 0.2);
      parts.push(g);
    }
    const m = mergeGeometries(parts); m.computeVertexNormals(); return m;
  })();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3526 });
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x1f5a45, side: THREE.DoubleSide, flatShading: true });

  const SPACING = 15, PER_SIDE = 17, SPAN = SPACING * PER_SIDE;
  const palms = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < PER_SIDE; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(trunkGeo, trunkMat));
      const crown = new THREE.Mesh(crownGeo, crownMat); crown.position.set(0.55, 4.2, 0); g.add(crown);
      const s = 0.85 + Math.random() * 0.6;
      g.scale.setScalar(s);
      g.rotation.y = Math.random() * 6.28;
      g.position.set(side * (5.4 + Math.random() * 5.5), 0, 12 - i * SPACING - Math.random() * 5);
      scene.add(g); palms.push(g);
    }
  }

  // ---------- Car (faces -z) ----------
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshPhongMaterial({ color: 0x16a3ad, shininess: 80, specular: 0x88aabb });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x0c1218, shininess: 120, specular: 0x88aacc });
  const tyreMat = new THREE.MeshLambertMaterial({ color: 0x0d0d0f });
  const hubMat = new THREE.MeshPhongMaterial({ color: 0xb9c2c9, shininess: 90 });

  const profile = new THREE.Shape();
  [[-2.05, 0.3], [-2.1, 0.62], [-1.35, 0.84], [-0.65, 1.3], [0.55, 1.34], [1.55, 0.97], [2.05, 0.92], [2.1, 0.55], [2.0, 0.3]]
    .forEach(([z, y], i) => (i ? profile.lineTo(z, y) : profile.moveTo(z, y)));
  const bodyGeo = new THREE.ExtrudeGeometry(profile, { depth: 1.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  bodyGeo.rotateY(-Math.PI / 2);
  bodyGeo.translate(0.85, 0, 0);
  const body = new THREE.Mesh(bodyGeo, bodyMat); car.add(body);

  const glassProfile = new THREE.Shape();
  [[-1.28, 0.9], [-0.66, 1.27], [0.52, 1.31], [1.3, 1.0], [1.2, 0.9]].forEach(([z, y], i) => (i ? glassProfile.lineTo(z, y) : glassProfile.moveTo(z, y)));
  const glassGeo = new THREE.ExtrudeGeometry(glassProfile, { depth: 1.92, bevelEnabled: false });
  glassGeo.rotateY(-Math.PI / 2);
  glassGeo.translate(0.96, 0, 0);
  car.add(new THREE.Mesh(glassGeo, glassMat));
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.08), glassMat);
  rear.rotation.x = -1.2; rear.position.set(0, 1.27, 1.1); car.add(rear);

  const tail = new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false });
  [-0.62, 0.62].forEach((x) => { const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.13, 0.06), tail); t.position.set(x, 0.74, 2.2); car.add(t); });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.05), tail); strip.position.set(0, 0.74, 2.2); car.add(strip);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.04), new THREE.MeshBasicMaterial({ color: 0xf1f1ea }));
  plate.position.set(0, 0.52, 2.2); car.add(plate);
  const tailLight = new THREE.PointLight(0xff3322, 1.6, 9); tailLight.position.set(0, 0.7, 2.8); car.add(tailLight);

  const wheels = [];
  [[-0.88, -1.3], [0.88, -1.3], [-0.88, 1.3], [0.88, 1.3]].forEach(([x, z]) => {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.3, 14), tyreMat); tyre.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 8), hubMat); hub.rotation.z = Math.PI / 2;
    w.add(tyre, hub); w.position.set(x, 0.37, z); car.add(w); wheels.push(w);
  });

  const blob = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, "rgba(0,0,0,.7)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.03; return m;
  })();
  car.add(blob);
  car.position.z = -5.5;
  scene.add(car);

  // ---------- Sizing & camera ----------
  let W = 1, H = 1, horizonFrac = 0.6, camX = 0;
  function resize() {
    W = header.clientWidth; H = header.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = W / H < 0.9 ? 62 : W / H < 1.4 ? 52 : 44;
    camera.updateProjectionMatrix();
    // Put the horizon just below the "perks" row so the road fills the space under the search form
    const hr = header.getBoundingClientRect(), pr = perks.getBoundingClientRect();
    horizonFrac = Math.min(0.85, Math.max(0.35, (pr.bottom - hr.top + 64) / H));
  }
  new ResizeObserver(resize).observe(header);
  resize();

  const camBase = () => ({ y: 2.7, z: W / H < 0.9 ? 10.5 : 8.2 });
  function placeCamera(scrollP) {
    const { y, z } = camBase();
    const cy = y - scrollP * 0.9;
    camera.position.set(camX, cy, z - scrollP * 2);
    // pitch up so the horizon sits at `horizonFrac` of the canvas height
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const pitch = Math.atan((1 - 2 * horizonFrac) * -half);
    const dist = 60;
    camera.lookAt(camX * 0.4, cy + Math.tan(pitch) * dist, camera.position.z - dist);
  }

  // Steer the car with the pointer (mouse or touch drag): left/right across the road
  let steer = 0.43, carX = 1.0;
  addEventListener("pointermove", (e) => { steer = (e.clientX / innerWidth - 0.5) * 2; }, { passive: true });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let running = false, visible = true, last = 0, t = 0, raf = 0;
  const BASE_SPEED = 13;

  // ---------- Day / night blend ----------
  const trunkM = trunkMat, crownM = crownMat;
  const cmp = new THREE.Color();
  const lc = (target, name, k) => target.set(PAL.night[name]).lerp(cmp.set(PAL.day[name]), k);
  const nm = (name, k) => lerp(NUM[name][0], NUM[name][1], k);
  let mix = opts.theme === "light" ? 1 : 0, mixT = mix;
  let sunSide = opts.rtl ? -1 : 1, sunSideT = sunSide, sunBob = 0;

  function placeSun() {
    const x = sunSide * nm("sunX", mix), y = nm("sunY", mix) + sunBob;
    sun.position.set(x, y, -230); glow.position.set(x, y + 1, -228);
  }
  function applyMix() {
    const k = mix;
    lc(SKY_TOP, "top", k); lc(SKY_MID, "mid", k); lc(HORIZON, "hor", k);
    renderer.setClearColor(SKY_TOP); scene.fog.color.copy(HORIZON);
    lc(ground.material.color, "ground", k); lc(shoulder.material.color, "shoulder", k); lc(hillMat.color, "hill", k);
    lc(road.material.color, "road", k); lc(trunkM.color, "trunk", k); lc(crownM.color, "crown", k);
    lc(hemi.color, "hemiSky", k); lc(hemi.groundColor, "hemiGround", k); hemi.intensity = nm("hemi", k);
    lc(key.color, "key", k); key.intensity = nm("key", k); fill.intensity = nm("fill", k);
    tailLight.intensity = nm("tail", k);
    stars.material.opacity = nm("stars", k); stars.visible = stars.material.opacity > 0.01;
    lc(sun.material.color, "sun", k); sun.scale.setScalar(nm("sunScale", k));
    glow.material.opacity = nm("glow", k); glow.scale.set(nm("glowScale", k), nm("glowScale", k), 1);
    placeSun();
  }
  function stepMix(dt) {
    const k = Math.min(1, dt * 2.2);
    mix += (mixT - mix) * k; sunSide += (sunSideT - sunSide) * k;
    if (Math.abs(mixT - mix) < 0.003) mix = mixT;
    if (Math.abs(sunSideT - sunSide) < 0.003) sunSide = sunSideT;
    applyMix();
  }
  const moving = () => mix !== mixT || sunSide !== sunSideT;
  // When the main loop is paused (off-screen / reduced motion) a short loop plays the transition
  let settleRaf = 0;
  function settle() {
    if (running || settleRaf || !moving()) return;
    let prev = performance.now();
    const tick = (now) => {
      settleRaf = 0;
      stepMix(Math.min(0.05, Math.max(0.001, (now - prev) / 1000))); prev = now;
      placeCamera(Math.min(1, Math.max(0, scrollY / Math.max(1, H))));
      renderer.render(scene, camera);
      if (moving() && !running) settleRaf = requestAnimationFrame(tick);
    };
    settleRaf = requestAnimationFrame(tick);
  }
  applyMix();

  const api = {
    setTheme(name, animate = true) {
      mixT = name === "light" ? 1 : 0;
      if (!animate || reduced) { mix = mixT; applyMix(); placeCamera(0); renderer.render(scene, camera); }
      else settle();
    },
    setRtl(rtl) {
      sunSideT = rtl ? -1 : 1;
      if (reduced) { sunSide = sunSideT; applyMix(); placeCamera(0); renderer.render(scene, camera); }
      else settle();
    },
  };

  // ---------- Loop ----------

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now; t += dt; // rAF time can precede `last` on the first frame
    const scrollP = Math.min(1, Math.max(0, scrollY / Math.max(1, H)));
    const speed = BASE_SPEED * (1 + scrollP * 2.2);

    roadTex.offset.y += (speed * dt) / TILE / 2 * 1; // features move toward the camera
    for (const p of palms) { p.position.z += speed * dt; if (p.position.z > 14) p.position.z -= SPAN; }
    wheels.forEach((w) => (w.rotation.x -= (speed * dt) / 0.37));

    const wantX = THREE.MathUtils.clamp(steer * 2.3, -2.4, 2.4) + Math.sin(t * 0.5) * 0.08;
    const dx = (wantX - carX) * Math.min(1, dt * 3);
    carX += dx;
    car.position.x = carX;
    car.position.y = Math.sin(t * 9) * 0.008;
    const vel = dx / Math.max(dt, 0.001); // sideways speed, independent of frame rate
    const k = Math.min(1, dt * 8);
    car.rotation.y += (THREE.MathUtils.clamp(-vel * 0.09, -0.28, 0.28) - car.rotation.y) * k; // nose turns into the move
    car.rotation.z += (THREE.MathUtils.clamp(-vel * 0.015, -0.05, 0.05) - car.rotation.z) * k; // slight body roll
    sunBob = Math.sin(t * 0.1) * 0.4;
    if (moving()) stepMix(dt); else placeSun();

    camX += (carX * 0.35 - camX) * 0.04;
    placeCamera(scrollP);
    renderer.render(scene, camera);
    schedule();
  }
  const schedule = () => { if (running && !raf) raf = requestAnimationFrame(frame); };
  function setRunning(v) {
    const next = v && visible && !document.hidden && !reduced;
    if (next === running) return;
    running = next; last = performance.now();
    if (running) schedule();
  }

  // One still frame always (also the only frame for reduced motion)
  placeCamera(0);
  renderer.render(scene, camera);

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(true); }).observe(header);
  document.addEventListener("visibilitychange", () => setRunning(true));
  addEventListener("resize", () => { if (!running) { placeCamera(0); renderer.render(scene, camera); } });
  setRunning(true);
  return api;
}
