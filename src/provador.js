/* Provador de cores: aplica qualquer cor no cabelo, na foto da Raquel, numa foto
   da pessoa ou ao vivo pela câmera. Tudo roda no próprio aparelho (WebGL2 +
   MediaPipe); nenhuma imagem é enviada.

   Precisão:
   - refino automático da borda pela cor do fio;
   - diagnóstico do tom atual (níveis 1 a 10 da colorimetria);
   - simulação "só tinta" (sem clarear o fio antes);
   - ajuste manual da área do cabelo com pincel, com desfazer;
   - captura da câmera para ajustar com calma; câmera suavizada (sem tremer).

   Gerado em assets/js/3d/ pelo esbuild (veja o README). */

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';

// Luminância típica (linear) do cabelo numa foto, do nível 1 (preto) ao 10 (loiro claríssimo)
const NIVEIS = [0.004, 0.008, 0.014, 0.024, 0.04, 0.065, 0.1, 0.15, 0.23, 0.33];
const nivelDe = (lum) => {
  if (lum <= NIVEIS[0]) return 1;
  for (let i = 1; i < NIVEIS.length; i++) {
    if (lum <= NIVEIS[i]) {
      const a = Math.log(NIVEIS[i - 1]);
      const b = Math.log(NIVEIS[i]);
      return i + (Math.log(lum) - a) / (b - a);
    }
  }
  return 10;
};

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
uniform vec3 uCroma;
uniform float uIntens;
uniform float uDivisor;
uniform float uTopo;
uniform float uBase;
uniform int uTecnica;
uniform float uSemClarear;
uniform float uMostrarArea;

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
  vec3 l3 = paraLinear(original);
  float l = luma(l3);
  float bruto = texture(uMask, uv).r;

  // refino automático da borda: na faixa de dúvida, o que tem cor de cabelo entra e o resto sai
  vec3 croma = l3 / max(l3.r + l3.g + l3.b, 0.0005);
  float dc = length(croma - uCroma) / 0.05;
  float dl = log(max(l, 0.0005) / max(uMedia, 0.0005)) / 1.1;
  float pareceCabelo = exp(-0.5 * (dc * dc + dl * dl));
  float faixa = 1.0 - abs(bruto * 2.0 - 1.0);
  bruto = clamp(bruto + (pareceCabelo - 0.5) * 0.8 * faixa, 0.0, 1.0);

  if (uMostrarArea < 0.5 && vUv.x < uDivisor) { saida = vec4(original, 1.0); return; }

  // cores claras cobrem um pouco mais a borda (sem contorno escuro); fora do cabelo continua intocado
  float claro = clamp(uAlvo, 0.0, 1.0);
  float m = smoothstep(0.12 - claro * 0.08, 0.7 - claro * 0.15, bruto);
  m = 1.0 - pow(1.0 - m, 1.0 + claro * 1.5);

  // técnica: 0 cor inteira, 1 ombré (raiz natural), 2 mechas (fios intercalados)
  float t = clamp((uv.y - uTopo) / max(0.02, uBase - uTopo), 0.0, 1.0);
  float w = 1.0;
  if (uTecnica == 1) {
    w = smoothstep(0.16, 0.6, t);
  } else if (uTecnica == 2) {
    float onda = sin(uv.y * 14.0 + uv.x * 3.0) * 0.006 + sin(uv.y * 33.0 + uv.x * 7.0) * 0.0025;
    vec2 q = vec2((uv.x + onda) * 150.0, uv.y * 7.0);
    float n = ruido2(q) * 0.6 + ruido2(q * vec2(2.3, 1.6) + 7.0) * 0.4;
    float fio = clamp((l / max(uMedia, 0.003) - 0.6) * 0.9, 0.0, 1.0) * smoothstep(0.55, 0.95, bruto);
    n = n * 0.64 + fio * 0.36;
    w = smoothstep(0.38, 0.58, n) * (0.8 + 0.2 * ruido(q.x * 0.37 + 5.0));
    w *= smoothstep(0.02, 0.22, t);
  }
  float a = clamp(m * w * uIntens, 0.0, 1.0);

  // "só tinta": sem clarear antes, a tinta sobe no máximo ~2 tons e aparece menos sobre fio escuro
  float alvo = uAlvo;
  float cobertura = 1.0;
  if (uSemClarear > 0.5) {
    alvo = min(uAlvo, uMedia * 2.4);
    cobertura = clamp(alvo / max(uAlvo, 0.003), 0.3, 1.0);
  }

  // a cor nova mantém a textura do fio: brilho e sombra proporcionais ao original
  float nl = alvo * pow(l / max(uMedia, 0.003), 0.72);
  vec3 tinta = uTinta * (nl / max(luma(uTinta), 0.003));
  tinta = tinta / (1.0 + max(0.0, luma(tinta) - 0.9));
  tinta = mix(l3 * (nl / max(l, 0.0005)), tinta, cobertura);
  vec3 resultado = mix(l3, tinta, a);

  // modo de ajuste: a área que recebe cor aparece em dourado
  if (uMostrarArea > 0.5) resultado = mix(resultado, vec3(0.9, 0.6, 0.16), smoothstep(0.3, 0.7, bruto) * 0.5);

  saida = vec4(paraSrgb(resultado), 1.0);
}`;

const linear = (v) => Math.pow(v / 255, 2.2);
const lumaLin = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// espera a imagem estar decodificada: no Safari, ler antes disso devolve pixels pretos
const carregarImagem = (src) => new Promise((ok, falha) => {
  const img = new Image();
  img.onload = () => {
    if (img.decode) img.decode().then(() => ok(img), () => ok(img));
    else ok(img);
  };
  img.onerror = () => falha(new Error('imagem'));
  img.src = src;
});

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ foto: string, mascara: string, modelo: string,
 *           onStatus?: (msg: string) => void, onDiagnostico?: (nivel: number) => void }} opcoes
 */
export async function iniciarProvador(canvas, opcoes) {
  const onStatus = opcoes.onStatus || (() => {});
  const onDiagnostico = opcoes.onDiagnostico || (() => {});
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
  ['uImg', 'uMask', 'uEscala', 'uDesloc', 'uEspelho', 'uTinta', 'uAlvo', 'uMedia', 'uCroma', 'uIntens',
    'uDivisor', 'uTopo', 'uBase', 'uTecnica', 'uSemClarear', 'uMostrarArea']
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

  const st = {
    tinta: [0.8, 0.3, 0.4], alvo: 0.3, media: 0.05, croma: [0.4, 0.33, 0.27], intens: 0.85, divisor: 0,
    topo: 0, base: 1, tecnica: 0, espelho: 0, fonte: 'demo', w: 1, h: 1, temCabelo: true,
    semClarear: 0, mostrarArea: 0, nivel: 0, ex: 1, ey: 1, dx: 0, dy: 0,
  };

  /* --- Imagem e máscara (a máscara fica também na memória, para poder ser ajustada) --- */
  let mascara = null; // { dados: Uint8ClampedArray, w, h }
  let mascaraOriginal = null;
  const pilha = [];

  const enviarImagem = (fonte) => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texImg);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fonte);
  };
  const enviarMascara = () => {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texMask);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, mascara.w, mascara.h, 0, gl.RED, gl.UNSIGNED_BYTE, mascara.dados);
  };
  const enviarRegiao = (x0, y0, x1, y1) => {
    if (x1 < x0 || y1 < y0) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texMask);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, mascara.w);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1, gl.RED, gl.UNSIGNED_BYTE, mascara.dados);
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0);
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0);
  };
  const definirMascara = (dados, w, h) => {
    mascara = { dados, w, h };
    mascaraOriginal = dados.slice();
    pilha.length = 0;
    enviarMascara();
  };

  /* --- Diagnóstico do cabelo: brilho médio, cor média, altura e nível --- */
  const mini = document.createElement('canvas');
  const mctx = mini.getContext('2d', { willReadFrequently: true });
  let ultimoNivel = 0;
  const medir = (fonte) => {
    if (!mascara) return;
    const W = 72;
    const H = Math.max(8, Math.round((W * st.h) / st.w));
    mini.width = W;
    mini.height = H;
    mctx.drawImage(fonte, 0, 0, W, H);
    const px = mctx.getImageData(0, 0, W, H).data;
    let soma = 0;
    let peso = 0;
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let topo = H;
    let base = 0;
    for (let y = 0; y < H; y++) {
      const my = Math.min(mascara.h - 1, Math.floor(((y + 0.5) / H) * mascara.h));
      for (let x = 0; x < W; x++) {
        const mx = Math.min(mascara.w - 1, Math.floor(((x + 0.5) / W) * mascara.w));
        const m = mascara.dados[my * mascara.w + mx] / 255;
        if (m > 0.5) {
          if (y < topo) topo = y;
          if (y > base) base = y;
        }
        if (m < 0.6) continue;
        const i = (y * W + x) * 4;
        const r = linear(px[i]);
        const g = linear(px[i + 1]);
        const b = linear(px[i + 2]);
        const s = r + g + b + 1e-4;
        soma += lumaLin(r, g, b) * m;
        sr += (r / s) * m;
        sg += (g / s) * m;
        sb += (b / s) * m;
        peso += m;
      }
    }
    st.temCabelo = peso > W * H * 0.01;
    st.media = peso > 1 ? Math.max(0.004, soma / peso) : 0.05;
    if (peso > 1) st.croma = [sr / peso, sg / peso, sb / peso];
    st.topo = topo < H ? topo / H : 0;
    st.base = base > 0 ? (base + 1) / H : 1;
    st.nivel = st.temCabelo ? nivelDe(st.media) : 0;
    if (Math.abs(st.nivel - ultimoNivel) > 0.25) {
      ultimoNivel = st.nivel;
      onDiagnostico(st.nivel);
    }
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
    st.ex = 1;
    st.ey = 1;
    if (sa > ca) st.ex = ca / sa;
    else st.ey = sa / ca;
    const focoY = st.fonte === 'camera' ? 0.5 : 0.4;
    st.dx = (1 - st.ex) * 0.5;
    st.dy = Math.min(Math.max(focoY - st.ey * 0.5, 0), 1 - st.ey);
    gl.uniform2f(U.uEscala, st.ex, st.ey);
    gl.uniform2f(U.uDesloc, st.dx, st.dy);
    gl.uniform1f(U.uEspelho, st.espelho);
    gl.uniform3f(U.uTinta, st.tinta[0], st.tinta[1], st.tinta[2]);
    gl.uniform1f(U.uAlvo, st.alvo);
    gl.uniform1f(U.uMedia, st.media);
    gl.uniform3f(U.uCroma, st.croma[0], st.croma[1], st.croma[2]);
    gl.uniform1f(U.uIntens, st.intens);
    gl.uniform1f(U.uDivisor, st.divisor);
    gl.uniform1f(U.uTopo, st.topo);
    gl.uniform1f(U.uBase, st.base);
    gl.uniform1i(U.uTecnica, st.tecnica);
    gl.uniform1f(U.uSemClarear, st.semClarear);
    gl.uniform1f(U.uMostrarArea, st.mostrarArea);
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
  const paraBytes = (mpMask) => {
    const f = mpMask.getAsFloat32Array();
    const out = new Uint8ClampedArray(f.length);
    for (let i = 0; i < f.length; i++) out[i] = f[i] * 255;
    return out;
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
  const [imgDemo, pngMascara] = await Promise.all([carregarImagem(opcoes.foto), carregarImagem(opcoes.mascara)]);
  const lerMascaraPng = () => {
    const c = document.createElement('canvas');
    c.width = pngMascara.naturalWidth;
    c.height = pngMascara.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(pngMascara, 0, 0);
    const rgba = ctx.getImageData(0, 0, c.width, c.height).data;
    const dados = new Uint8ClampedArray(c.width * c.height);
    for (let i = 0; i < dados.length; i++) dados[i] = rgba[i * 4];
    return { dados, w: c.width, h: c.height };
  };
  const mascaraDemo = lerMascaraPng();

  const usarDemo = () => {
    pararCamera();
    st.fonte = 'demo';
    st.espelho = 0;
    st.w = imgDemo.naturalWidth;
    st.h = imgDemo.naturalHeight;
    enviarImagem(imgDemo);
    definirMascara(mascaraDemo.dados.slice(), mascaraDemo.w, mascaraDemo.h);
    medir(imgDemo);
    onStatus('');
    pedir();
  };

  let fotoAtual = null;
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
    const dados = paraBytes(cabelo);
    const w = cabelo.width;
    const h = cabelo.height;
    if (res.close) res.close();
    st.fonte = 'foto';
    st.espelho = 0;
    st.w = tela.width;
    st.h = tela.height;
    fotoAtual = tela;
    enviarImagem(tela);
    definirMascara(dados, w, h);
    medir(tela);
    onStatus(st.temCabelo ? '' : 'Não encontrei cabelo nessa foto. Tente uma foto de rosto, com o cabelo aparecendo.');
    pedir();
  };

  const usarCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const e = new Error('sem-camera');
      e.name = 'NotSupportedError';
      throw e;
    }
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
    mascara = { dados: new Uint8ClampedArray(1), w: 1, h: 1 };
    enviarMascara();
    onStatus('');
    const quadro = (agora) => {
      if (st.fonte !== 'camera' || !stream) return;
      if (video.readyState >= 2) {
        enviarImagem(video);
        if (agora - ultimaDeteccao > 45) {
          ultimaDeteccao = agora;
          seg.segmentForVideo(video, agora, (r) => {
            const ms = r.confidenceMasks || [];
            if (!ms.length) return;
            const mk = ms[ms.length - 1];
            const f = mk.getAsFloat32Array();
            // suavização entre quadros: a cor não treme quando a pessoa se mexe
            if (!mascaraCamera || mascaraCamera.w !== mk.width || mascaraCamera.h !== mk.height) {
              mascaraCamera = { dados: new Uint8ClampedArray(f.length), w: mk.width, h: mk.height };
              for (let i = 0; i < f.length; i++) mascaraCamera.dados[i] = f[i] * 255;
            } else {
              const d = mascaraCamera.dados;
              for (let i = 0; i < f.length; i++) d[i] = d[i] * 0.35 + f[i] * 165.75;
            }
            mascara = mascaraCamera;
            enviarMascara();
          });
          if (mascaraCamera && deteccoes++ % 12 === 0) medir(video);
        }
        desenhar();
      }
      lacoCamera = requestAnimationFrame(quadro);
    };
    lacoCamera = requestAnimationFrame(quadro);
  };

  // Congela a câmera numa foto (mesma imagem espelhada) para ajustar com calma
  const capturar = () => {
    if (st.fonte !== 'camera' || !video || !mascaraCamera) return false;
    const tela = document.createElement('canvas');
    tela.width = video.videoWidth;
    tela.height = video.videoHeight;
    tela.getContext('2d').drawImage(video, 0, 0, tela.width, tela.height);
    const dados = mascaraCamera.dados.slice();
    const { w, h } = mascaraCamera;
    pararCamera();
    st.fonte = 'foto';
    st.espelho = 1;
    st.w = tela.width;
    st.h = tela.height;
    fotoAtual = tela;
    enviarImagem(tela);
    definirMascara(dados, w, h);
    medir(tela);
    pedir();
    return true;
  };

  /* --- Ajuste manual da área do cabelo (pincel) --- */
  const traco = { ativo: false, modo: 'add', raio: 20, ult: null };
  const fonteAtual = () => (st.fonte === 'demo' ? imgDemo : fotoAtual);
  const paraMascara = (x, y) => {
    const cw = canvas.clientWidth || 1;
    const ch = canvas.clientHeight || 1;
    let u = (x / cw) * st.ex + st.dx;
    const v = (y / ch) * st.ey + st.dy;
    if (st.espelho > 0.5) u = 1 - u;
    return [u * mascara.w, v * mascara.h];
  };
  const raioMascara = () => Math.max(2, (traco.raio / (canvas.clientWidth || 1)) * st.ex * mascara.w);
  const carimbo = (mx, my, r, caixa) => {
    const d = mascara.dados;
    const W = mascara.w;
    const x0 = Math.max(0, Math.floor(mx - r));
    const x1 = Math.min(W - 1, Math.ceil(mx + r));
    const y0 = Math.max(0, Math.floor(my - r));
    const y1 = Math.min(mascara.h - 1, Math.ceil(my + r));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dist = Math.hypot(x - mx, y - my) / r;
        if (dist >= 1) continue;
        const f = dist < 0.55 ? 1 : 1 - (dist - 0.55) / 0.45; // borda macia
        const i = y * W + x;
        if (traco.modo === 'add') d[i] = Math.max(d[i], 255 * f);
        else d[i] = Math.min(d[i], 255 * (1 - f));
      }
    }
    caixa[0] = Math.min(caixa[0], x0);
    caixa[1] = Math.min(caixa[1], y0);
    caixa[2] = Math.max(caixa[2], x1);
    caixa[3] = Math.max(caixa[3], y1);
  };
  const pincel = {
    inicio(x, y, modo, raio) {
      if (!mascara || st.fonte === 'camera') return false;
      pilha.push(mascara.dados.slice());
      if (pilha.length > 8) pilha.shift();
      traco.ativo = true;
      traco.modo = modo;
      traco.raio = raio;
      traco.ult = paraMascara(x, y);
      const caixa = [Infinity, Infinity, -1, -1];
      carimbo(traco.ult[0], traco.ult[1], raioMascara(), caixa);
      enviarRegiao(caixa[0], caixa[1], caixa[2], caixa[3]);
      pedir();
      return true;
    },
    mover(x, y) {
      if (!traco.ativo) return;
      const [mx, my] = paraMascara(x, y);
      const [lx, ly] = traco.ult;
      const r = raioMascara();
      const passos = Math.max(1, Math.ceil(Math.hypot(mx - lx, my - ly) / (r * 0.35)));
      const caixa = [Infinity, Infinity, -1, -1];
      for (let k = 1; k <= passos; k++) {
        const t = k / passos;
        carimbo(lx + (mx - lx) * t, ly + (my - ly) * t, r, caixa);
      }
      traco.ult = [mx, my];
      enviarRegiao(caixa[0], caixa[1], caixa[2], caixa[3]);
      pedir();
    },
    fim() {
      if (!traco.ativo) return;
      traco.ativo = false;
      const f = fonteAtual();
      if (f) medir(f);
      pedir();
    },
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
    semClarear(v) {
      st.semClarear = v ? 1 : 0;
      pedir();
    },
    mostrarArea(v) {
      st.mostrarArea = v ? 1 : 0;
      pedir();
    },
    pincel,
    desfazer() {
      const anterior = pilha.pop();
      if (anterior && mascara) {
        mascara.dados.set(anterior);
        enviarMascara();
        const f = fonteAtual();
        if (f) medir(f);
        pedir();
      }
      return pilha.length > 0;
    },
    restaurar() {
      if (!mascara || !mascaraOriginal || st.fonte === 'camera') return;
      pilha.push(mascara.dados.slice());
      mascara.dados.set(mascaraOriginal);
      enviarMascara();
      const f = fonteAtual();
      if (f) medir(f);
      pedir();
    },
    get podeDesfazer() { return pilha.length > 0; },
    capturar,
    usarDemo,
    usarFoto,
    usarCamera,
    pararCamera() {
      if (st.fonte === 'camera') usarDemo();
      else pararCamera();
    },
    get fonte() { return st.fonte; },
    get nivel() { return st.nivel; },
    nivelDaCor: (hex) => {
      const t = paraLinearHex(hex);
      return nivelDe(lumaLin(t[0], t[1], t[2]));
    },
  };
}
