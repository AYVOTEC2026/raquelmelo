/* Monograma RM em ouro 3D (three.js).
   Gerado em assets/js/3d/ pelo esbuild. Para gerar de novo:
   npx esbuild src/monograma3d.js src/cabelo3d.js --bundle --splitting --minify --format=esm --target=es2020 --outdir=assets/js/3d --chunk-names=three-[hash]
   (com three instalado: npm i three) */

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  ExtrudeGeometry,
  PMREMGenerator,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Color,
  DirectionalLight,
  Box3,
  Vector3,
} from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ svgUrl: string, getView: () => number }} opts
 *   getView: progresso de 0 a 1 enquanto a seção atravessa a tela.
 */
export async function iniciarMonograma(canvas, { svgUrl, getView }) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  pmrem.dispose();

  const key = new DirectionalLight(new Color('#FFF1D6'), 2.6);
  key.position.set(-120, 160, 220);
  const rim = new DirectionalLight(new Color('#FFD08A'), 1.8);
  rim.position.set(180, -60, -120);
  scene.add(key, rim);

  // Geometria a partir do vetor oficial do monograma
  const svgText = await (await fetch(svgUrl)).text();
  const data = new SVGLoader().parse(svgText);
  const shapes = data.paths.flatMap((p) => p.toShapes());
  const geometry = new ExtrudeGeometry(shapes, {
    depth: 6,
    bevelEnabled: true,
    bevelThickness: 0.7,
    bevelSize: 0.22,
    bevelSegments: 4,
    curveSegments: 32,
  });
  geometry.center();
  geometry.rotateX(Math.PI); // SVG tem o eixo Y para baixo

  const material = new MeshPhysicalMaterial({
    color: new Color('#E7BE6C'),
    metalness: 1,
    roughness: 0.2,
    clearcoat: 0.35,
    clearcoatRoughness: 0.15,
    envMapIntensity: 1.25,
  });

  const mesh = new Mesh(geometry, material);
  const group = new Group();
  group.add(mesh);
  scene.add(group);

  const size = new Box3().setFromObject(mesh).getSize(new Vector3());
  const camera = new PerspectiveCamera(28, 1, 1, 4000);

  const fit = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // enquadra o monograma ocupando ~62% da menor dimensão
    const target = Math.max(size.x / camera.aspect, size.y) / 0.62;
    camera.position.set(0, 0, target / (2 * Math.tan((camera.fov * Math.PI) / 360)));
    camera.updateProjectionMatrix();
  };
  fit();
  new ResizeObserver(fit).observe(canvas);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Pegar e girar com a mão: continua no embalo e para de frente
  const TAU = Math.PI * 2;
  const mao = { ativa: false, id: null, x: 0, y: 0, giro: 0, vel: 0, incl: 0, t: 0 };
  canvas.addEventListener('pointerdown', (e) => {
    mao.ativa = true;
    mao.id = e.pointerId;
    mao.x = e.clientX;
    mao.y = e.clientY;
    mao.t = performance.now();
    mao.vel = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-grabbed');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!mao.ativa || e.pointerId !== mao.id) return;
    const agora = performance.now();
    const dt = Math.max(0.008, (agora - mao.t) / 1000);
    const dx = (e.clientX - mao.x) * 0.012;
    mao.giro += dx;
    mao.vel = mao.vel * 0.4 + (dx / dt) * 0.6;
    mao.incl = Math.max(-0.6, Math.min(0.6, mao.incl + (e.clientY - mao.y) * 0.006));
    mao.x = e.clientX;
    mao.y = e.clientY;
    mao.t = agora;
  });
  const soltar = () => {
    if (!mao.ativa) return;
    mao.ativa = false;
    canvas.classList.remove('is-grabbed');
    if (performance.now() - mao.t > 80) mao.vel = 0;
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener('lostpointercapture', soltar);

  let running = false;
  let raf = 0;
  let turn = (getView() - 0.5) * 2.6;
  const start = performance.now();
  let last = 0;

  const frame = (now) => {
    const t = (now - start) / 1000;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    if (!mao.ativa) {
      // embalo que vai diminuindo; depois volta para a volta inteira mais próxima (de frente)
      mao.giro += mao.vel * dt;
      mao.vel *= Math.pow(0.18, dt);
      if (Math.abs(mao.vel) < 2.5) {
        const frente = Math.round(mao.giro / TAU) * TAU;
        mao.vel += (frente - mao.giro) * 9 * dt;
        mao.vel *= Math.pow(0.05, dt);
      }
      mao.incl *= Math.pow(0.08, dt);
    }
    // gira com a rolagem: de lado ao entrar, de frente no meio da seção
    const target = (getView() - 0.5) * 2.6;
    turn += (target - turn) * 0.08;
    group.rotation.y = turn + mao.giro + pointer.x * 0.22 + Math.sin(t * 0.55) * 0.05;
    group.rotation.x = mao.incl + pointer.y * 0.12 + Math.sin(t * 0.7) * 0.035;
    group.position.y = Math.sin(t * 0.9) * size.y * 0.015;
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      raf = requestAnimationFrame(frame);
    } else if (!entry.isIntersecting && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  }).observe(canvas);

  renderer.render(scene, camera);
  return { renderer };
}
