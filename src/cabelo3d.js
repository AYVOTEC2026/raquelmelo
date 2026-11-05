/* Mechas interativas: fios castanhos que ficam loiros onde o mouse ou o dedo passa.
   Física de cabelo (Verlet + "follow the leader") desenhada com three.js.
   Gerado em assets/js/3d/ pelo esbuild (veja o README). */

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Group,
  BufferGeometry,
  BufferAttribute,
  DynamicDrawUsage,
  LineSegments,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  CanvasTexture,
  Mesh,
  CylinderGeometry,
  SphereGeometry,
  MeshPhysicalMaterial,
  PMREMGenerator,
  SRGBColorSpace,
  Color,
  Vector2,
  Vector3,
  Raycaster,
  Plane,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const suave = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ leve?: boolean, onLuz?: (pct: number) => void, onToque?: () => void }} opcoes
 */
export function iniciarCabelo(canvas, opcoes = {}) {
  const leve = !!opcoes.leve;
  const onLuz = opcoes.onLuz || (() => {});
  const onToque = opcoes.onToque || (() => {});

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const FOV = 30;
  const CAM_Z = 1100;
  const camera = new PerspectiveCamera(FOV, 1, 10, 6000);
  camera.position.set(0, 0, CAM_Z);
  const viewH = 2 * CAM_Z * Math.tan((FOV * Math.PI) / 360);
  let viewW = viewH;

  const grupo = new Group();
  scene.add(grupo);

  /* ---------- Fios ---------- */

  const N = leve ? 480 : 1100; // quantidade de fios
  const P = leve ? 18 : 22; // pontos por fio
  const pos = new Float32Array(N * P * 3);
  const ant = new Float32Array(N * P * 3);
  const luz = new Float32Array(N * P);
  const desenho = new Float32Array(N * P * 3);
  const cores = new Float32Array(N * P * 4);

  const c = (hex) => new Color(hex); // three converte de sRGB para linear
  const castanhos = [c('#24150A'), c('#341F0F'), c('#462B15')];
  const passos = [c('#6E4723'), c('#A8763A'), c('#D2A55E')]; // mel, caramelo, dourado
  const loiros = [c('#E4C483'), c('#EFD7A2'), c('#F6E6C2')];
  const mistura = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
  const sorteio = (lista) => {
    const t = Math.random() * (lista.length - 1);
    const i = Math.floor(t);
    return mistura(lista[i], lista[Math.min(i + 1, lista.length - 1)], t - i);
  };

  const fios = Array.from({ length: N }, () => ({
    x: 0, y: 0, z: 0, seg: 0,
    fase: Math.random() * Math.PI * 2,
    onda: 0, freq: 0,
    base: sorteio(castanhos),
    loiro: sorteio(loiros),
    tom: 0.88 + Math.random() * 0.24,
  }));

  // fator que impede a raiz de clarear (raiz esfumada, como numa morena iluminada)
  const ponta = new Float32Array(P);
  let pontaMedia = 0;
  for (let i = 0; i < P; i++) {
    ponta[i] = i === 0 ? 0 : suave(0.05, 0.42, i / (P - 1));
    pontaMedia += ponta[i];
  }
  pontaMedia /= P;

  const indices = new (N * P > 65535 ? Uint32Array : Uint16Array)(N * (P - 1) * 2);
  for (let k = 0, n = 0; k < N; k++) {
    for (let i = 0; i < P - 1; i++) {
      indices[n++] = k * P + i;
      indices[n++] = k * P + i + 1;
    }
  }

  const geo = new BufferGeometry();
  const aPos = new BufferAttribute(desenho, 3).setUsage(DynamicDrawUsage);
  const aCor = new BufferAttribute(cores, 4).setUsage(DynamicDrawUsage);
  geo.setAttribute('position', aPos);
  geo.setAttribute('color', aCor);
  geo.setIndex(new BufferAttribute(indices, 1));
  const linhas = new LineSegments(geo, new LineBasicMaterial({
    vertexColors: true, transparent: true, depthWrite: false, toneMapped: false,
  }));
  linhas.frustumCulled = false;
  grupo.add(linhas);

  /* ---------- Haste dourada de onde os fios pendem ---------- */

  const ouro = new MeshPhysicalMaterial({
    color: c('#E7BE6C'), metalness: 1, roughness: 0.22, clearcoat: 0.3, clearcoatRoughness: 0.2,
  });
  const haste = new Mesh(new CylinderGeometry(1, 1, 1, 32), ouro);
  haste.rotation.z = Math.PI / 2;
  const pontaE = new Mesh(new SphereGeometry(1, 24, 16), ouro);
  const pontaD = pontaE.clone();
  grupo.add(haste, pontaE, pontaD);

  /* ---------- Brilhos que saem do pincel ---------- */

  const MAXB = 180;
  const bPos = new Float32Array(MAXB * 3);
  const bVel = new Float32Array(MAXB * 3);
  const bCor = new Float32Array(MAXB * 4);
  const bVida = new Float32Array(MAXB);
  let bProx = 0;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const sctx = sprite.getContext('2d');
  const grad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 32, 32);
  const bGeo = new BufferGeometry();
  bGeo.setAttribute('position', new BufferAttribute(bPos, 3).setUsage(DynamicDrawUsage));
  bGeo.setAttribute('color', new BufferAttribute(bCor, 4).setUsage(DynamicDrawUsage));
  const brilhos = new Points(bGeo, new PointsMaterial({
    size: 16, map: new CanvasTexture(sprite), vertexColors: true, transparent: true,
    depthWrite: false, toneMapped: false,
  }));
  brilhos.frustumCulled = false;
  grupo.add(brilhos);
  const dourado = c('#C8902E');

  const soltarBrilho = (x, y) => {
    const i = bProx;
    bProx = (bProx + 1) % MAXB;
    bPos[i * 3] = x + (Math.random() - 0.5) * 18;
    bPos[i * 3 + 1] = y + (Math.random() - 0.5) * 18;
    bPos[i * 3 + 2] = 40 + Math.random() * 30;
    bVel[i * 3] = (Math.random() - 0.5) * 70;
    bVel[i * 3 + 1] = 30 + Math.random() * 60;
    bVel[i * 3 + 2] = (Math.random() - 0.5) * 30;
    bVida[i] = 1;
  };

  /* ---------- Layout ---------- */

  let topoY = 0;
  let meia = 0;

  const montar = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewW = viewH * camera.aspect;
    meia = Math.min(viewW * 0.43, viewH * 1.05);
    topoY = viewH * 0.5 - viewH * 0.09;

    // fios vizinhos formam mechas que ondulam juntas (cabelo de verdade, sem frizz)
    const mechas = [];
    for (let k = 0; k < N; k++) {
      const f = fios[k];
      const id = Math.floor(k / 12);
      if (!mechas[id]) {
        mechas[id] = { fase: Math.random() * Math.PI * 2, onda: 3.5 + Math.random() * 4, freq: 1.1 + Math.random() * 0.35, dz: (Math.random() - 0.5) * 18 };
      }
      const m = mechas[id];
      f.x = -meia + ((k + Math.random() * 0.9) / N) * meia * 2;
      f.y = topoY;
      f.z = m.dz + (Math.random() - 0.5) * 8;
      f.seg = (viewH * (0.74 + Math.random() * 0.1)) / (P - 1);
      f.fase = m.fase + (Math.random() - 0.5) * 0.45;
      f.onda = m.onda * (0.85 + Math.random() * 0.3);
      f.freq = m.freq;
      for (let i = 0; i < P; i++) {
        const j = (k * P + i) * 3;
        pos[j] = ant[j] = f.x;
        pos[j + 1] = ant[j + 1] = f.y - i * f.seg;
        pos[j + 2] = ant[j + 2] = f.z;
      }
    }
    haste.scale.set(4.2, meia * 2 + 36, 4.2);
    haste.position.set(0, topoY + 3, 0);
    pontaE.scale.setScalar(8.5);
    pontaD.scale.setScalar(8.5);
    pontaE.position.set(-meia - 22, topoY + 3, 0);
    pontaD.position.set(meia + 22, topoY + 3, 0);
  };
  montar();
  new ResizeObserver(montar).observe(canvas);

  /* ---------- Ponteiro (mouse ou dedo) ---------- */

  const mouse = { ativo: false, sx: 0, sy: 0, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, novo: true, nx: 0, ny: 0 };
  const raio = new Raycaster();
  const ndc = new Vector2();
  const plano = new Plane(new Vector3(0, 0, 1), 0);
  const alvo = new Vector3();
  let tocou = false;

  const noMundo = () => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((mouse.sx - r.left) / r.width) * 2 - 1, -((mouse.sy - r.top) / r.height) * 2 + 1);
    raio.setFromCamera(ndc, camera);
    if (!raio.ray.intersectPlane(plano, alvo)) return false;
    grupo.worldToLocal(alvo);
    return true;
  };

  const mover = (e) => {
    mouse.sx = e.clientX;
    mouse.sy = e.clientY;
    const r = canvas.getBoundingClientRect();
    mouse.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (!mouse.ativo) mouse.novo = true;
    mouse.ativo = true;
    demo.ativo = false;
    if (!tocou) {
      tocou = true;
      onToque();
    }
  };
  canvas.addEventListener('pointermove', mover);
  canvas.addEventListener('pointerdown', mover);
  const parar = () => { mouse.ativo = false; };
  canvas.addEventListener('pointerleave', parar);
  canvas.addEventListener('pointercancel', parar);
  canvas.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') parar(); });

  // Demonstração: um traço de pincel automático mostra o que acontece
  const demo = { ativo: false, inicio: 0, feita: false, dur: 2600 };

  /* ---------- Simulação ---------- */

  const AMORT = 0.975;
  const RAIO = leve ? 62 : 74;
  const corr = new Float32Array(P * 3);
  let vento = 0;
  let giroAlvo = 0;
  let apagando = false;
  let quadro = 0;
  let ultimoPct = -1;

  const simular = (dt, t) => {
    const g = 1500 * dt * dt;
    const R2 = RAIO * RAIO;
    const taxa = 2.6 * dt;
    const brisa = Math.sin(t * 0.7) * 0.05;
    const pvx = Math.max(-7, Math.min(7, mouse.vx));
    const pvy = Math.max(-7, Math.min(7, mouse.vy));
    let pintou = false;

    for (let k = 0; k < N; k++) {
      const f = fios[k];
      const b = k * P;
      const j0 = b * 3;
      pos[j0] = f.x; pos[j0 + 1] = f.y; pos[j0 + 2] = f.z;
      const sopro = (brisa * Math.sin(t * 1.3 + f.fase) + vento * (0.7 + 0.3 * Math.sin(f.fase))) * dt * 60;

      for (let i = 1; i < P; i++) {
        const j = (b + i) * 3;
        const s = i / (P - 1);
        const vx = (pos[j] - ant[j]) * AMORT;
        const vy = (pos[j + 1] - ant[j + 1]) * AMORT;
        const vz = (pos[j + 2] - ant[j + 2]) * AMORT;
        ant[j] = pos[j]; ant[j + 1] = pos[j + 1]; ant[j + 2] = pos[j + 2];
        pos[j] += vx + sopro * s;
        pos[j + 1] += vy - g;
        pos[j + 2] += vz + sopro * 0.6 * s;

        if (mouse.ativo) {
          const dx = pos[j] - mouse.x;
          const dy = pos[j + 1] - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const fo = 1 - Math.sqrt(d2) / RAIO;
            pos[j] += pvx * fo * 0.34;
            pos[j + 1] += pvy * fo * 0.18;
            const p = b + i;
            if (luz[p] < 1) {
              luz[p] = Math.min(1, luz[p] + fo * taxa * ponta[i]);
              pintou = true;
            }
          }
        }
      }

      // mantém o comprimento de cada trecho do fio ("follow the leader")
      for (let i = 1; i < P; i++) {
        const j = (b + i) * 3;
        const q = j - 3;
        const dx = pos[j] - pos[q];
        const dy = pos[j + 1] - pos[q + 1];
        const dz = pos[j + 2] - pos[q + 2];
        const k2 = f.seg / (Math.sqrt(dx * dx + dy * dy + dz * dz) || 1);
        const nx = pos[q] + dx * k2;
        const ny = pos[q + 1] + dy * k2;
        const nz = pos[q + 2] + dz * k2;
        corr[i * 3] = nx - pos[j];
        corr[i * 3 + 1] = ny - pos[j + 1];
        corr[i * 3 + 2] = nz - pos[j + 2];
        pos[j] = nx;
        pos[j + 1] = ny;
        pos[j + 2] = nz;
      }
      // compensa a velocidade com a correção do ponto seguinte (DFTL): fio flexível, sem efeito chicote
      for (let i = 1; i < P - 1; i++) {
        const j = (b + i) * 3;
        const n = (i + 1) * 3;
        ant[j] += 0.9 * corr[n];
        ant[j + 1] += 0.9 * corr[n + 1];
        ant[j + 2] += 0.9 * corr[n + 2];
      }
    }
    return pintou;
  };

  const r0 = new Color();
  const pintar = (t) => {
    const brilhoS = 0.3 + Math.sin(t * 0.45) * 0.04 - mouse.ny * 0.03;
    for (let k = 0; k < N; k++) {
      const f = fios[k];
      const prof = 0.8 + 0.2 * ((f.z + 12) / 24);
      for (let i = 0; i < P; i++) {
        const p = k * P + i;
        const j = p * 3;
        const s = i / (P - 1);
        const ondaS = f.onda * Math.pow(s, 0.8);
        const fase = s * f.freq * Math.PI * 2 + f.fase;
        desenho[j] = pos[j] + Math.sin(fase) * ondaS;
        desenho[j + 1] = pos[j + 1];
        desenho[j + 2] = pos[j + 2] + Math.cos(fase) * ondaS * 0.6;

        // do castanho ao loiro, passando por mel, caramelo e dourado
        const L = luz[p];
        let cor;
        if (L <= 0) cor = f.base;
        else if (L < 0.3) cor = mistura(f.base, passos[0], L / 0.3);
        else if (L < 0.55) cor = mistura(passos[0], passos[1], (L - 0.3) / 0.25);
        else if (L < 0.8) cor = mistura(passos[1], passos[2], (L - 0.55) / 0.25);
        else cor = mistura(passos[2], f.loiro, (L - 0.8) / 0.2);

        const sombra = 0.5 + 0.5 * suave(0, 0.2, s);
        const banda = 0.3 * Math.exp(-((s - brilhoS) ** 2) / 0.005) * (0.35 + 0.65 * L);
        const q = p * 4;
        cores[q] = (cor.r * sombra * f.tom + banda) * prof;
        cores[q + 1] = (cor.g * sombra * f.tom + banda * 0.86) * prof;
        cores[q + 2] = (cor.b * sombra * f.tom + banda * 0.62) * prof;
        cores[q + 3] = 0.93 * (1 - suave(0.84, 1, s) * 0.9);
      }
    }
    aPos.needsUpdate = true;
    aCor.needsUpdate = true;
  };

  const animarBrilhos = (dt) => {
    for (let i = 0; i < MAXB; i++) {
      const q = i * 4;
      if (bVida[i] <= 0) {
        bCor[q + 3] = 0;
        continue;
      }
      bVida[i] -= dt * 1.15;
      bVel[i * 3 + 1] -= 180 * dt;
      bPos[i * 3] += bVel[i * 3] * dt;
      bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt;
      bPos[i * 3 + 2] += bVel[i * 3 + 2] * dt;
      bCor[q] = dourado.r * 1.3;
      bCor[q + 1] = dourado.g * 1.3;
      bCor[q + 2] = dourado.b * 1.1;
      bCor[q + 3] = Math.max(0, bVida[i]) * 0.95;
    }
    bGeo.attributes.position.needsUpdate = true;
    bGeo.attributes.color.needsUpdate = true;
  };

  const medir = () => {
    let soma = 0;
    for (let i = 0; i < luz.length; i++) soma += luz[i];
    return Math.round(Math.min(100, (soma / luz.length / pontaMedia) * 100));
  };

  /* ---------- Laço ---------- */

  let rodando = false;
  let raf = 0;
  let ultimo = 0;
  const camAlvo = { x: 0, y: 0 };

  const frame = (agora) => {
    const dtReal = ultimo ? Math.min(0.05, (agora - ultimo) / 1000) : 1 / 60;
    ultimo = agora;
    const t = agora / 1000;

    // traço automático de demonstração
    if (demo.ativo) {
      const u = (agora - demo.inicio) / demo.dur;
      if (u >= 1) {
        demo.ativo = false;
        mouse.ativo = false;
      } else {
        const e = u * u * (3 - 2 * u);
        const x = -meia * 0.7 + e * meia * 1.4;
        const y = topoY - viewH * (0.42 + 0.12 * Math.sin(e * Math.PI * 1.6));
        mouse.vx = mouse.ativo ? x - mouse.x : 0;
        mouse.vy = mouse.ativo ? y - mouse.y : 0;
        mouse.x = x;
        mouse.y = y;
        mouse.ativo = true;
      }
    } else if (mouse.ativo && noMundo()) {
      if (mouse.novo) {
        mouse.x = alvo.x;
        mouse.y = alvo.y;
        mouse.novo = false;
      }
      mouse.vx = alvo.x - mouse.x;
      mouse.vy = alvo.y - mouse.y;
      mouse.x = alvo.x;
      mouse.y = alvo.y;
    }

    // até 2 subpassos para manter a física estável
    const passosSim = dtReal > 1 / 45 ? 2 : 1;
    let pintou = false;
    for (let n = 0; n < passosSim; n++) {
      pintou = simular(dtReal / passosSim, t) || pintou;
      mouse.vx = 0; // o "pentear" vale uma vez por quadro
      mouse.vy = 0;
    }
    vento *= 0.94;

    if (pintou && mouse.ativo && Math.random() < 0.9) {
      soltarBrilho(mouse.x, mouse.y);
      if (Math.random() < 0.5) soltarBrilho(mouse.x, mouse.y);
    }
    animarBrilhos(dtReal);

    if (apagando) {
      let resta = 0;
      for (let i = 0; i < luz.length; i++) {
        luz[i] *= 0.9;
        if (luz[i] < 0.004) luz[i] = 0;
        resta += luz[i];
      }
      if (resta === 0) apagando = false;
    }

    pintar(t);

    // leve paralaxe 3D com o ponteiro e giro conforme a rolagem
    camAlvo.x = mouse.ativo && !demo.ativo ? mouse.nx * 28 : 0;
    camAlvo.y = mouse.ativo && !demo.ativo ? -mouse.ny * 14 : 0;
    camera.position.x += (camAlvo.x - camera.position.x) * 0.04;
    camera.position.y += (camAlvo.y - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    grupo.rotation.y += (giroAlvo - grupo.rotation.y) * 0.06;

    renderer.render(scene, camera);

    if (++quadro % 10 === 0) {
      const pct = medir();
      if (pct !== ultimoPct) {
        ultimoPct = pct;
        onLuz(pct);
      }
    }
    if (rodando) raf = requestAnimationFrame(frame);
  };

  const ligar = () => {
    if (rodando) return;
    rodando = true;
    ultimo = 0;
    raf = requestAnimationFrame(frame);
  };
  const desligar = () => {
    rodando = false;
    cancelAnimationFrame(raf);
  };

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      ligar();
      if (!demo.feita) {
        demo.feita = true;
        setTimeout(() => {
          if (!tocou) {
            demo.ativo = true;
            demo.inicio = performance.now();
          }
        }, 900);
      }
    } else {
      desligar();
    }
  }, { threshold: 0.35 }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) desligar();
  });

  pintar(0);
  renderer.render(scene, camera);

  return {
    /** vy: velocidade da rolagem (px por quadro); progresso: 0 a 1 da seção na tela */
    rolagem(vy, progresso) {
      vento += Math.max(-40, Math.min(40, vy)) * 0.004;
      giroAlvo = (progresso - 0.5) * 0.5;
    },
    apagar() {
      apagando = true;
      demo.ativo = false;
    },
  };
}
