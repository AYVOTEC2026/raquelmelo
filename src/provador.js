/* Provador de cores: aplica qualquer cor no cabelo, na foto da Raquel, numa foto
   da pessoa ou ao vivo pela câmera. Tudo roda no próprio aparelho (WebGL2 +
   MediaPipe); nenhuma imagem é enviada.
   Gerado em assets/js/3d/ pelo esbuild (veja o README). */

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';

const VERT = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 saida;
uniform sampler2D uImg;
uniform sampler2D uMask;
uniform vec2 uEscala;
uniform vec2 uDesloc;
uniform float uEspelho;
uniform vec3 uTinta;
uniform float uAlvo;
uniform float uMedia;
uniform float uIntens;
uniform float uDivisor;
uniform float uTopo;
uniform float uBase;
uniform int uTecnica;

vec3 paraLinear(vec3 c) { return pow(c, vec3(2.2)); }
vec3 paraSrgb(vec3 c) { return pow(max(c, vec3(0.0)), vec3(1.0 / 2.2)); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
float sorteio(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float ruido(float x) {
  float i = floor(x);
  return mix(sorteio(i), sorteio(i + 1.0), smoothstep(0.0, 1.0, fract(x)));
}
float sorteio2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(sorteio2(i), sorteio2(i + vec2(1.0, 0.0)), u.x),
             mix(sorteio2(i + vec2(0.0, 1.0)), sorteio2(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vUv * uEscala + uDesloc;
  if (uEspelho > 0.5) uv.x = 1.0 - uv.x;
  vec3 original = texture(uImg, uv).rgb;
  if (vUv.x < uDivisor) { saida = vec4(original, 1.0); return; }

  vec3 l3 = paraLinear(original);
  float l = luma(l3);
  // cores claras cobrem um pouco mais a borda, para não sobrar contorno escuro
  // (o que está fora do cabelo continua intocado: máscara zero fica zero)
  float claro = clamp(uAlvo, 0.0, 1.0);
  float bruto = texture(uMask, uv).r;
  float m = smoothstep(0.12 - claro * 0.08, 0.7 - claro * 0.15, bruto);
  m = 1.0 - pow(1.0 - m, 1.0 + claro * 1.5);

  // técnica: 0 cor inteira, 1 ombré (raiz natural), 2 mechas (fios intercalados)
  float t = clamp((uv.y - uTopo) / max(0.02, uBase - uTopo), 0.0, 1.0);
  float w = 1.0;
  if (uTecnica == 1) {
    w = smoothstep(0.16, 0.6, t);
  } else if (uTecnica == 2) {
    // fios finos e irregulares, longos na vertical e quebrados ao longo do comprimento
    float onda = sin(uv.y * 14.0 + uv.x * 3.0) * 0.006 + sin(uv.y * 33.0 + uv.x * 7.0) * 0.0025;
    vec2 q = vec2((uv.x + onda) * 150.0, uv.y * 7.0);
    float n = ruido2(q) * 0.6 + ruido2(q * vec2(2.3, 1.6) + 7.0) * 0.4;
    // as luzes acompanham os fios que já pegam luz na foto (seguem cachos e ondas)
    float fio = clamp((l / max(uMedia, 0.003) - 0.6) * 0.9, 0.0, 1.0) * smoothstep(0.55, 0.95, bruto);
    n = n * 0.64 + fio * 0.36;
    w = smoothstep(0.38, 0.58, n) * (0.8 + 0.2 * ruido(q.x * 0.37 + 5.0));
    w *= smoothstep(0.02, 0.22, t);
  }
  float a = clamp(m * w * uIntens, 0.0, 1.0);

  // a cor nova mantém a textura do fio: brilho e sombra proporcionais ao original
  float nl = uAlvo * pow(l / max(uMedia, 0.003), 0.72);
  vec3 tinta = uTinta * (nl / max(luma(uTinta), 0.003));
  tinta = tinta / (1.0 + max(0.0, luma(tinta) - 0.9));
  saida = vec4(paraSrgb(mix(l3, tinta, a)), 1.0);
}`;

const linear = (v) => Math.pow(v / 255, 2.2);
const lumaLin = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const carregarImagem = (src) => new Promise((ok, falha) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => ok(img);
  img.onerror = () => falha(new Error('imagem'));
  img.src = src;
});

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ foto: string, mascara: string, modelo: string, onStatus?: (msg: string) => void }} opcoes
 */
export async function iniciarProvador(canvas, opcoes) {
  const onStatus = opcoes.onStatus || (() => {});
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: false });
  if (!gl) throw new Error('webgl2');

  const compilar = (tipo, fonte) => {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, fonte);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'programa');
  gl.useProgram(prog);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uImg', 'uMask', 'uEscala', 'uDesloc', 'uEspelho', 'uTinta', 'uAlvo', 'uMedia', 'uIntens', 'uDivisor', 'uTopo', 'uBase', 'uTecnica']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  const novaTextura = (unidade) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unidade);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const texImg = novaTextura(0);
  const texMask = novaTextura(1);
  gl.uniform1i(U.uImg, 0);
  gl.uniform1i(U.uMask, 1);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  const enviarImagem = (fonte) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texImg);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
  };
  const enviarMascaraImagem = (img) => {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texMask);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };
  let bufMascara = null;
  const enviarMascaraIA = (mpMask) => {
    const w = mpMask.width;
    const h = mpMask.height;
    const f = mpMask.getAsFloat32Array();
    if (!bufMascara || bufMascara.length !== w * h) bufMascara = new Uint8ClampedArray(w * h);
    for (let i = 0; i < f.length; i++) bufMascara[i] = f[i] * 255;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texMask);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, bufMascara);
    return { dados: bufMascara, w, h };
  };
  const limparMascara = () => {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texMask);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array([0]));
  };

  const st = {
    tinta: [0.8, 0.3, 0.4], alvo: 0.3, media: 0.05, intens: 0.85, divisor: 0,
    topo: 0, base: 1, tecnica: 0, espelho: 0, fonte: 'demo', w: 1, h: 1, temCabelo: true,
  };

  /* --- Estatísticas do cabelo (brilho médio e altura) para a cor ficar natural --- */
  const mini = document.createElement('canvas');
  const mctx = mini.getContext('2d', { willReadFrequently: true });
  const medir = (fonte, mascara) => {
    const W = 72;
    const H = Math.max(8, Math.round((W * st.h) / st.w));
    mini.width = W;
    mini.height = H;
    mctx.drawImage(fonte, 0, 0, W, H);
    const px = mctx.getImageData(0, 0, W, H).data;
    let mk = null;
    if (mascara.dados) {
      mk = new Float32Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const sx = Math.min(mascara.w - 1, Math.floor(((x + 0.5) / W) * mascara.w));
          const sy = Math.min(mascara.h - 1, Math.floor(((y + 0.5) / H) * mascara.h));
          mk[y * W + x] = mascara.dados[sy * mascara.w + sx] / 255;
        }
      }
    } else {
      mctx.clearRect(0, 0, W, H);
      mctx.drawImage(mascara, 0, 0, W, H);
      const md = mctx.getImageData(0, 0, W, H).data;
      mk = new Float32Array(W * H);
      for (let i = 0; i < W * H; i++) mk[i] = md[i * 4] / 255;
    }
    let soma = 0;
    let peso = 0;
    let topo = H;
    let base = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const m = mk[i];
        if (m > 0.5) {
          if (y < topo) topo = y;
          if (y > base) base = y;
        }
        soma += lumaLin(linear(px[i * 4]), linear(px[i * 4 + 1]), linear(px[i * 4 + 2])) * m;
        peso += m;
      }
    }
    st.temCabelo = peso > W * H * 0.01;
    st.media = peso > 1 ? Math.max(0.004, soma / peso) : 0.05;
    st.topo = topo < H ? topo / H : 0;
    st.base = base > 0 ? (base + 1) / H : 1;
  };

  /* --- Desenho --- */
  const dimensionar = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
  };

  const desenhar = () => {
    dimensionar();
    const ca = canvas.width / canvas.height;
    const sa = st.w / st.h;
    let ex = 1;
    let ey = 1;
    if (sa > ca) ex = ca / sa;
    else ey = sa / ca;
    const focoY = st.fonte === 'camera' ? 0.5 : 0.4;
    const dx = (1 - ex) * 0.5;
    const dy = Math.min(Math.max(focoY - ey * 0.5, 0), 1 - ey);
    gl.uniform2f(U.uEscala, ex, ey);
    gl.uniform2f(U.uDesloc, dx, dy);
    gl.uniform1f(U.uEspelho, st.espelho);
    gl.uniform3f(U.uTinta, st.tinta[0], st.tinta[1], st.tinta[2]);
    gl.uniform1f(U.uAlvo, st.alvo);
    gl.uniform1f(U.uMedia, st.media);
    gl.uniform1f(U.uIntens, st.intens);
    gl.uniform1f(U.uDivisor, st.divisor);
    gl.uniform1f(U.uTopo, st.topo);
    gl.uniform1f(U.uBase, st.base);
    gl.uniform1i(U.uTecnica, st.tecnica);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  let pedido = 0;
  const pedir = () => {
    if (st.fonte === 'camera' || pedido) return;
    pedido = requestAnimationFrame(() => {
      pedido = 0;
      desenhar();
    });
  };
  new ResizeObserver(pedir).observe(canvas);

  /* --- Detecção de cabelo (MediaPipe), carregada só quando a pessoa usa câmera ou foto --- */
  let segmentador = null;
  let modoIA = null;
  const prepararIA = async (modo) => {
    if (!segmentador) {
      onStatus('Preparando a detecção do cabelo…');
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const arquivos = await FilesetResolver.forVisionTasks(WASM);
      const config = (delegate) => ({
        baseOptions: { modelAssetPath: opcoes.modelo, delegate },
        runningMode: modo,
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
      try {
        segmentador = await ImageSegmenter.createFromOptions(arquivos, config('GPU'));
      } catch (_) {
        segmentador = await ImageSegmenter.createFromOptions(arquivos, config('CPU'));
      }
      modoIA = modo;
    } else if (modoIA !== modo) {
      await segmentador.setOptions({ runningMode: modo });
      modoIA = modo;
    }
    return segmentador;
  };

  /* --- Câmera --- */
  let stream = null;
  let video = null;
  let lacoCamera = 0;
  let ultimaDeteccao = 0;
  let deteccoes = 0;
  let mascaraCamera = null;

  const pararCamera = () => {
    cancelAnimationFrame(lacoCamera);
    lacoCamera = 0;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) video.srcObject = null;
  };

  /* --- Fontes --- */
  const [imgDemo, mascaraDemo] = await Promise.all([carregarImagem(opcoes.foto), carregarImagem(opcoes.mascara)]);

  const usarDemo = () => {
    pararCamera();
    st.fonte = 'demo';
    st.espelho = 0;
    st.w = imgDemo.naturalWidth;
    st.h = imgDemo.naturalHeight;
    enviarImagem(imgDemo);
    enviarMascaraImagem(mascaraDemo);
    medir(imgDemo, mascaraDemo);
    onStatus('');
    pedir();
  };

  const usarFoto = async (arquivo) => {
    pararCamera();
    onStatus('Analisando a foto…');
    let bmp;
    try {
      bmp = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    } catch (_) {
      bmp = await carregarImagem(URL.createObjectURL(arquivo));
    }
    const lado = Math.max(bmp.width, bmp.height);
    const esc = Math.min(1, 1280 / lado);
    const tela = document.createElement('canvas');
    tela.width = Math.round(bmp.width * esc);
    tela.height = Math.round(bmp.height * esc);
    tela.getContext('2d').drawImage(bmp, 0, 0, tela.width, tela.height);
    const seg = await prepararIA('IMAGE');
    const res = seg.segment(tela);
    const mascaras = res.confidenceMasks || [];
    const cabelo = mascaras[mascaras.length - 1];
    st.fonte = 'foto';
    st.espelho = 0;
    st.w = tela.width;
    st.h = tela.height;
    enviarImagem(tela);
    const mk = enviarMascaraIA(cabelo);
    medir(tela, mk);
    if (res.close) res.close();
    onStatus(st.temCabelo ? '' : 'Não encontrei cabelo nessa foto. Tente uma foto de rosto, com o cabelo aparecendo.');
    pedir();
  };

  const usarCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('sem-camera');
    onStatus('Abrindo a câmera…');
    pararCamera();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
      audio: false,
    });
    if (!video) {
      video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
    }
    video.srcObject = stream;
    await video.play();
    const seg = await prepararIA('VIDEO');
    if (!stream) return; // parou enquanto carregava
    st.fonte = 'camera';
    st.espelho = 1;
    st.w = video.videoWidth || 960;
    st.h = video.videoHeight || 720;
    mascaraCamera = null;
    limparMascara();
    onStatus('');
    const quadro = (agora) => {
      if (st.fonte !== 'camera' || !stream) return;
      if (video.readyState >= 2) {
        enviarImagem(video);
        if (agora - ultimaDeteccao > 45) {
          ultimaDeteccao = agora;
          seg.segmentForVideo(video, agora, (r) => {
            const ms = r.confidenceMasks || [];
            if (ms.length) mascaraCamera = enviarMascaraIA(ms[ms.length - 1]);
          });
          if (mascaraCamera && deteccoes++ % 12 === 0) medir(video, mascaraCamera);
        }
        desenhar();
      }
      lacoCamera = requestAnimationFrame(quadro);
    };
    lacoCamera = requestAnimationFrame(quadro);
  };

  usarDemo();

  const paraLinearHex = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [linear((n >> 16) & 255), linear((n >> 8) & 255), linear(n & 255)];
  };

  return {
    cor(hex) {
      st.tinta = paraLinearHex(hex);
      st.alvo = Math.max(0.004, lumaLin(st.tinta[0], st.tinta[1], st.tinta[2]));
      pedir();
    },
    tecnica(nome) {
      st.tecnica = { global: 0, ombre: 1, mechas: 2 }[nome] || 0;
      pedir();
    },
    intensidade(v) {
      st.intens = v;
      pedir();
    },
    divisor(v) {
      st.divisor = v;
      pedir();
    },
    usarDemo,
    usarFoto,
    usarCamera,
    pararCamera() {
      if (st.fonte === 'camera') usarDemo();
      else pararCamera();
    },
    get fonte() { return st.fonte; },
  };
}
