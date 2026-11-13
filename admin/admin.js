/* Painel do site da Raquel Melo.

   Como funciona (o site é estático, no GitHub Pages):
   - As fotos e os vídeos do site estão listados em assets/data/fotos.json; os textos, as
     perguntas frequentes, o contato e os horários, em assets/data/conteudo.json. O site lê os
     dois arquivos e monta as seções. Espaço sem foto some sozinho.
   - O painel edita esses arquivos (a parte dos textos fica em conteudo.js) e envia tudo direto
     para o repositório, num único commit, pela API do GitHub. O GitHub Pages republica o site
     em alguns minutos.
   - O acesso usa um token do GitHub (só deste repositório, só "Contents"). Ele fica salvo em
     admin/acesso.json cifrado com a senha da Raquel (AES-GCM + PBKDF2); sem a senha não serve.
   - As fotos são reduzidas no próprio aparelho (600 e 1200 px, JPEG), o que também apaga os
     dados escondidos da foto, como a localização. Os vídeos vão como estão (MP4 em H.264, até
     30 MB), com uma capa tirada do próprio vídeo. */
(() => {
  'use strict';

  const REPO = 'AYVOTEC2026/raquelmelo';
  const RAMO = window.__RAMO_TESTE || 'main';
  const API = 'https://api.github.com/repos/' + REPO;
  const CAMINHO_FOTOS = 'assets/data/fotos.json';
  const CAMINHO_CONTEUDO = 'assets/data/conteudo.json';
  const CAMINHO_ACESSO = 'admin/acesso.json';
  const ITERACOES = 600000;
  const LIMITES = { topo: 1, sobre: 3, galeria: 15, produtos: 1, rodape: 3, galerias: 4, videos: 6 };
  const LARGURAS = [600, 1200];
  const VIDEO_MAX_MB = 30;
  const SITE = new URL('../', window.location.href);
  const CHAVE_SESSAO = 'rm-painel';
  const CHAVE_ABA = 'rm-painel-aba';
  const ABAS = ['fotos', 'textos', 'duvidas', 'contato'];
  const Editor = window.PainelConteudo;

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const el = (tag, attrs = {}, texto) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v); });
    if (texto !== undefined) n.textContent = texto;
    return n;
  };
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

  /* ---------- Estado ---------- */

  let token = '';
  let dados = null;          // fotos.json (fotos e vídeos)
  let original = '';
  let shaFotos = '';
  let conteudo = null;       // conteudo.json (textos, perguntas, contato)
  let originalConteudo = '';
  let shaConteudo = '';
  const novos = new Map();   // id da foto ou do vídeo -> arquivos ainda não enviados [{ caminho, blob }]
  const previas = new Map(); // id -> endereço local da miniatura (fotos e vídeos recém-enviados)
  const videosLocais = new Map(); // id do vídeo novo -> endereço local do vídeo (para a prévia)
  const textosAbertos = new Set();
  let ocupado = false;

  /* ---------- Base64 e texto ---------- */

  const bytesParaB64 = (bytes) => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const b64ParaBytes = (t) => Uint8Array.from(atob(String(t).replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const textoParaB64 = (t) => bytesParaB64(new TextEncoder().encode(t));
  const b64ParaTexto = (t) => new TextDecoder().decode(b64ParaBytes(t));
  const blobParaB64 = async (blob) => bytesParaB64(new Uint8Array(await blob.arrayBuffer()));

  /* ---------- Cifra do token (AES-GCM com chave derivada da senha) ---------- */

  const derivar = async (senha, sal, iteracoes) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: sal, iterations: iteracoes, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
    );
  };
  const cifrar = async (segredo, senha) => {
    const sal = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const chave = await derivar(senha, sal, ITERACOES);
    const cifrado = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(segredo));
    return { versao: 1, kdf: 'PBKDF2-SHA256', iteracoes: ITERACOES, sal: bytesParaB64(sal), iv: bytesParaB64(iv), dados: bytesParaB64(new Uint8Array(cifrado)) };
  };
  const decifrar = async (acesso, senha) => {
    const it = Number(acesso.iteracoes);
    if (!Number.isInteger(it) || it < 100000 || it > 5000000) throw new Error('Arquivo de acesso inválido.');
    const chave = await derivar(senha, b64ParaBytes(acesso.sal), it);
    const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ParaBytes(acesso.iv) }, chave, b64ParaBytes(acesso.dados));
    return new TextDecoder().decode(claro);
  };

  const PALAVRAS = ['ambar', 'areia', 'aurora', 'avela', 'baunilha', 'bege', 'brilho', 'bronze', 'cacau', 'cacho', 'canela', 'caramelo',
    'castanho', 'cereja', 'champanhe', 'chocolate', 'cobre', 'coral', 'creme', 'dourado', 'escova', 'espelho', 'essencia', 'flor',
    'franja', 'grafite', 'jasmim', 'lavanda', 'lilas', 'luar', 'luz', 'madeira', 'marfim', 'mecha', 'mel', 'menta', 'nuance', 'ocre',
    'onda', 'orvalho', 'ouro', 'perola', 'pente', 'pluma', 'prata', 'rosa', 'rubi', 'safira', 'seda', 'sol', 'topazio', 'trigo',
    'turquesa', 'veludo', 'vinho', 'violeta', 'vitral', 'esmeralda', 'jade', 'ametista', 'opala', 'orquidea', 'magnolia', 'girassol'];
  const sorteio = (n) => {
    const limite = Math.floor(0x100000000 / n) * n;
    const v = new Uint32Array(1);
    do crypto.getRandomValues(v); while (v[0] >= limite);
    return v[0] % n;
  };
  const gerarSenha = () => [0, 1, 2, 3].map(() => PALAVRAS[sorteio(PALAVRAS.length)]).join('-') + '-' + String(sorteio(10000)).padStart(4, '0');

  /* ---------- API do GitHub ---------- */

  class ErroGitHub extends Error {
    constructor(status, mensagem) { super(mensagem); this.status = status; }
  }
  const gh = async (caminho, { metodo = 'GET', corpo, chave = token } = {}) => {
    let r;
    try {
      r = await fetch(API + caminho, {
        method: metodo,
        cache: 'no-store',
        headers: Object.assign(
          { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + chave },
          corpo ? { 'Content-Type': 'application/json' } : {},
        ),
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
    } catch (e) {
      throw new ErroGitHub(0, 'Sem conexão com a internet. Confira a rede e tente de novo.');
    }
    if (r.ok) return r.status === 204 ? null : r.json();
    let detalhe = '';
    try { detalhe = (await r.json()).message || ''; } catch (e) { /* sem corpo */ }
    throw new ErroGitHub(r.status, detalhe);
  };
  const mensagemDe = (e) => {
    if (!(e instanceof ErroGitHub)) return (e && e.message) || 'Algo deu errado. Tente de novo.';
    if (e.status === 0) return e.message;
    if (e.status === 401) return 'O acesso expirou ou foi cancelado. Peça ao Italo para renovar o token do painel.';
    if (e.status === 403 && /rate limit/i.test(e.message)) return 'O GitHub pediu uma pausa. Tente de novo em alguns minutos.';
    if (e.status === 403) return 'O token não tem permissão para alterar o site. Ele precisa de "Contents: Read and write" no repositório raquelmelo.';
    if (e.status === 404) return 'Não encontrei o repositório do site com este token. Confira se o token dá acesso ao repositório raquelmelo.';
    if (e.status === 409 || e.status === 422) return 'O site foi alterado enquanto você publicava. Tente publicar de novo.';
    return 'O GitHub respondeu com um erro (' + e.status + '). Tente de novo em instantes.';
  };

  /* ---------- Telas ---------- */

  const telas = $$('[data-tela]');
  const mostrarTela = (nome) => {
    telas.forEach((t) => { t.hidden = t.dataset.tela !== nome; });
    $('[data-acoes]').hidden = nome !== 'painel';
    $('[data-barra-publicar]').hidden = nome !== 'painel';
    window.scrollTo(0, 0);
    const foco = $(`[data-tela="${nome}"] input:not([hidden])`);
    if (foco && nome !== 'painel') foco.focus();
  };
  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrarTela(b.dataset.ir)));

  const mostrarErro = (raiz, msg) => {
    const p = $('[data-erro]', raiz);
    p.textContent = msg || '';
    p.hidden = !msg;
  };
  const travar = (form, sim, rotulo) => {
    const b = $('[data-enviar]', form);
    if (!b.dataset.rotulo) b.dataset.rotulo = b.textContent;
    b.disabled = sim;
    b.textContent = sim ? rotulo : b.dataset.rotulo;
  };

  /* ---------- Dados das fotos ---------- */

  const normalizar = (d) => {
    const lista = (v) => (Array.isArray(v) ? v.filter((f) => f && typeof f.arquivo === 'string' && Array.isArray(f.larguras)) : []);
    d.topo = lista(d.topo);
    d.sobre = lista(d.sobre);
    d.produtos = lista(d.produtos);
    d.rodape = lista(d.rodape);
    d.galerias = (Array.isArray(d.galerias) ? d.galerias : []).filter((g) => g && typeof g === 'object').map((g) => {
      g.id = String(g.id || 'galeria-' + Math.random().toString(36).slice(2, 7));
      g.fotos = lista(g.fotos);
      ['script', 'serif', 'subtitulo', 'texto'].forEach((k) => { g[k] = typeof g[k] === 'string' ? g[k] : ''; });
      return g;
    });
    d.videos = (Array.isArray(d.videos) ? d.videos : []).filter((v) => v && typeof v.video === 'string');
    return d;
  };
  const lerArquivo = async (caminho) => {
    const r = await gh(`/contents/${caminho}?ref=${encodeURIComponent(RAMO)}`);
    return { sha: r.sha, json: JSON.parse(b64ParaTexto(r.content)) };
  };
  const carregarDados = async () => {
    const [f, c] = await Promise.all([lerArquivo(CAMINHO_FOTOS), lerArquivo(CAMINHO_CONTEUDO)]);
    shaFotos = f.sha;
    dados = normalizar(f.json);
    original = JSON.stringify(dados);
    shaConteudo = c.sha;
    conteudo = Editor.normalizar(c.json);
    originalConteudo = JSON.stringify(conteudo);
  };
  const mudouFotos = () => !!dados && JSON.stringify(dados) !== original;
  const mudouConteudo = () => !!conteudo && JSON.stringify(conteudo) !== originalConteudo;
  const mudou = () => mudouFotos() || mudouConteudo();
  // quais abas têm alterações ainda não publicadas (mostra um pontinho na aba)
  const PARTES = { textos: ['topo', 'fitas', 'sobre', 'produtos', 'videos', 'horarios', 'rodape'], duvidas: ['duvidas'], contato: ['contato'] };
  const abasAlteradas = () => {
    const alt = new Set();
    if (mudouFotos()) alt.add('fotos');
    if (mudouConteudo()) {
      const antes = JSON.parse(originalConteudo);
      Object.entries(PARTES).forEach(([aba, chaves]) => {
        if (chaves.some((k) => JSON.stringify(conteudo[k]) !== JSON.stringify(antes[k]))) alt.add(aba);
      });
    }
    return alt;
  };
  const todasFotos = (d) => [...d.topo, ...d.sobre, ...d.galerias.flatMap((g) => g.fotos), ...d.produtos, ...d.rodape];
  const arquivosDe = (f) => f.larguras.flatMap((w) => ((Array.isArray(f.formatos) && f.formatos.length) ? f.formatos : ['jpg']).map((x) => `${f.arquivo}-${w}.${x}`));
  const arquivosVideo = (v) => [v.video, v.capa].filter((c) => typeof c === 'string' && c);
  const nomeGaleria = (g) => [g.script, g.serif].map((t) => String(t || '').trim()).filter(Boolean).join(' ') || 'Galeria sem nome';
  const slug = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'foto';

  const espacos = () => [
    { chave: 'topo', titulo: 'Foto do topo', limite: LIMITES.topo, lista: dados.topo, prefixo: 'topo', legenda: false, antesDepois: false,
      desc: 'A primeira foto do site, em arco, ao lado do título. Use uma foto da Raquel na vertical.' },
    { chave: 'sobre', titulo: 'Sobre a Raquel', limite: LIMITES.sobre, lista: dados.sobre, prefixo: 'sobre', legenda: false, antesDepois: false,
      desc: 'A primeira foto fica grande, em arco. As outras duas aparecem menores, em preto e branco.' },
    ...dados.galerias.map((g, i) => ({
      chave: 'g:' + g.id, titulo: 'Galeria · ' + nomeGaleria(g), limite: LIMITES.galeria, lista: g.fotos, prefixo: slug(g.id),
      legenda: true, antesDepois: true, galeria: g, indice: i,
      desc: 'Fotos de resultados, em carrossel. Pode ser uma montagem de antes e depois (lado a lado). A foto aparece quadrada.',
    })),
    { chave: 'produtos', titulo: 'Foto dos produtos (STIJL)', limite: LIMITES.produtos, lista: dados.produtos, prefixo: 'produtos', legenda: false, antesDepois: false,
      desc: 'Fica ao lado do texto sobre a linha STIJL. Use uma foto na vertical. Sem foto, fica só o texto.' },
    { chave: 'rodape', titulo: 'Fotos do rodapé', limite: LIMITES.rodape, lista: dados.rodape, prefixo: 'rodape', legenda: false, antesDepois: true,
      desc: 'Polaroids no fim da página. Em montagens de antes e depois, aparece só o "depois".' },
  ];
  const localizar = (id) => {
    for (const e of espacos()) {
      const i = e.lista.findIndex((f) => f.id === id);
      if (i >= 0) return { espaco: e, indice: i, foto: e.lista[i] };
    }
    return null;
  };
  const miniatura = (f) => previas.get(f.id) ||
    new URL(`${f.arquivo}-${Math.min(...f.larguras)}.${(f.formatos || []).includes('jpg') || !(f.formatos || []).length ? 'jpg' : f.formatos[0]}`, SITE).href;

  /* ---------- Preparar fotos no aparelho ---------- */

  const abrirImagem = async (arquivo) => {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(arquivo, { imageOrientation: 'from-image' }); } catch (e) { /* tenta pelo <img> */ }
    }
    const url = URL.createObjectURL(arquivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  const larguraDe = (img) => img.naturalWidth || img.width;
  const alturaDe = (img) => img.naturalHeight || img.height;
  // reduz pela metade em etapas: fica mais nítido que reduzir de uma vez
  const reduzir = (img, w, h) => {
    let fonte = img;
    let fw = larguraDe(img);
    let fh = alturaDe(img);
    while (fw / 2 >= w * 1.2) {
      const c = el('canvas');
      c.width = Math.round(fw / 2);
      c.height = Math.round(fh / 2);
      const x = c.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(fonte, 0, 0, c.width, c.height);
      fonte = c;
      fw = c.width;
      fh = c.height;
    }
    const c = el('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, w, h);
    x.imageSmoothingQuality = 'high';
    x.drawImage(fonte, 0, 0, w, h);
    return c;
  };
  const paraJpeg = (canvas) => new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não consegui preparar a foto.'))), 'image/jpeg', 0.84));
  const novoId = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.random().toString(36).slice(2, 6)}`;
  };

  const prepararFoto = async (arquivo, espaco) => {
    if (!/^image\//.test(arquivo.type) && !/\.(jpe?g|png|webp|heic|heif|gif|avif)$/i.test(arquivo.name)) throw new Error('não é uma foto.');
    if (arquivo.size > 40 * 1024 * 1024) throw new Error('passa de 40 MB.');
    let img;
    try {
      img = await abrirImagem(arquivo);
    } catch (e) {
      throw new Error('não consegui abrir este formato. Envie em JPG ou PNG.');
    }
    const W = larguraDe(img);
    const H = alturaDe(img);
    if (W < 300 || H < 300) throw new Error('é pequena demais (mínimo de 300 pixels).');
    const id = novoId();
    const base = `assets/fotos/${espaco.prefixo}-${id}`;
    const larguras = [...new Set(LARGURAS.map((w) => Math.min(w, W)))];
    const arquivos = [];
    for (const w of larguras) {
      const blob = await paraJpeg(reduzir(img, w, Math.round(H * w / W)));
      arquivos.push({ caminho: `${base}-${w}.jpg`, blob });
    }
    if (img.close) img.close();
    const quadrada = W / H > 0.9 && W / H < 1.1;
    const foto = {
      id: 'f' + id.replace(/-/g, ''),
      arquivo: base,
      larguras,
      formatos: ['jpg'],
      largura: W,
      altura: H,
      antesDepois: !!espaco.galeria && quadrada,
      legenda: '',
      descricao: '',
    };
    novos.set(foto.id, arquivos);
    previas.set(foto.id, URL.createObjectURL(arquivos[0].blob));
    return foto;
  };

  /* ---------- Janela de andamento ---------- */

  const jp = $('[data-janela-progresso]');
  const andamento = (titulo, texto, valor) => {
    $('[data-jp-titulo]', jp).textContent = titulo;
    $('[data-jp-texto]', jp).textContent = texto || '';
    const barra = $('[data-jp-barra]', jp);
    barra.hidden = valor === null;
    if (valor !== null && valor !== undefined) barra.value = valor;
    if (!jp.open) {
      $('[data-jp-erro]', jp).hidden = true;
      $('[data-jp-fim]', jp).hidden = true;
      jp.showModal();
    }
  };
  const fimAndamento = ({ erro, site } = {}) => {
    const e = $('[data-jp-erro]', jp);
    e.textContent = erro || '';
    e.hidden = !erro;
    $('[data-jp-site]', jp).hidden = !site;
    $('[data-jp-fim]', jp).hidden = false;
    $('[data-jp-fechar]', jp).focus();
  };
  jp.addEventListener('cancel', (e) => { if (ocupado) e.preventDefault(); });
  $('[data-jp-fechar]', jp).addEventListener('click', () => jp.close());

  /* ---------- Desenhar o painel ---------- */

  const caixa = $('[data-espacos]');

  const desenhar = () => {
    if (!dados) return;
    caixa.textContent = '';
    espacos().forEach((e) => {
      caixa.append(cartaoEspaco(e));
      // os vídeos ficam na mesma ordem do site: depois dos produtos, antes do rodapé
      if (e.chave === 'produtos') caixa.append(cartaoVideos());
    });
    $('[data-nova-galeria]').hidden = dados.galerias.length >= LIMITES.galerias;
    atualizarBarra();
  };

  const capaVideo = (v) => previas.get(v.id) || (v.capa ? new URL(v.capa, SITE).href : '');

  const cartaoVideos = () => {
    const lista = dados.videos;
    const sec = el('section', { class: 'espaco cartao', 'aria-label': 'Vídeos' });
    const cabeca = el('div', { class: 'espaco-cabeca' });
    const t = el('div');
    t.append(el('h2', {}, 'Vídeos'), el('p', {}, `Vídeos em pé, como os reels. Envie em MP4, com até ${VIDEO_MAX_MB} MB. No site, eles tocam sem som.`));
    cabeca.append(t, el('span', { class: 'contador' + (lista.length >= LIMITES.videos ? ' cheio' : '') }, `${lista.length} de ${LIMITES.videos}`));
    sec.append(cabeca);
    if (!lista.length) sec.append(el('p', { class: 'espaco-vazio' }, 'Sem vídeos: esta parte não aparece no site.'));
    const grade = el('ul', { class: 'grade grade-videos' });
    lista.forEach((v, i) => {
      const li = el('li');
      const b = el('button', { class: 'miniatura miniatura-video', type: 'button', 'aria-label': `Vídeo ${i + 1}${v.legenda ? ': ' + v.legenda : ''}. Tocar para editar` });
      const capa = capaVideo(v);
      if (capa) b.append(el('img', { src: capa, alt: '', loading: 'lazy' }));
      else b.append(el('span', { class: 'sem-capa' }, 'Vídeo'));
      b.append(el('span', { class: 'ordem' }, String(i + 1)), el('span', { class: 'play', 'aria-hidden': 'true' }, '▶'));
      if (novos.has(v.id)) b.append(el('span', { class: 'marca marca-nova' }, 'Novo'));
      else if (v.legenda) b.append(el('span', { class: 'marca' }, v.legenda));
      b.addEventListener('click', () => abrirVideo(v.id));
      li.append(b);
      grade.append(li);
    });
    if (lista.length < LIMITES.videos) {
      const li = el('li');
      const rotulo = el('label', { class: 'miniatura miniatura-video adicionar' });
      const entrada = el('input', { type: 'file', accept: 'video/mp4,video/quicktime,video/*,.mp4,.m4v,.mov', 'aria-label': 'Adicionar vídeo' });
      entrada.addEventListener('change', () => {
        const arquivo = entrada.files && entrada.files[0];
        entrada.value = '';
        if (arquivo) adicionarVideo(arquivo);
      });
      rotulo.append(el('span', { class: 'mais', 'aria-hidden': 'true' }, '+'), document.createTextNode('Adicionar vídeo'), entrada);
      li.append(rotulo);
      grade.append(li);
    }
    sec.append(grade);
    return sec;
  };

  const cartaoEspaco = (e) => {
    const sec = el('section', { class: 'espaco cartao', 'aria-label': e.titulo });
    const cabeca = el('div', { class: 'espaco-cabeca' });
    const t = el('div');
    t.append(el('h2', {}, e.titulo), el('p', {}, e.desc));
    const cont = el('span', { class: 'contador' + (e.lista.length >= e.limite ? ' cheio' : '') }, `${e.lista.length} de ${e.limite}`);
    cabeca.append(t, cont);
    sec.append(cabeca);

    if (!e.lista.length) {
      sec.append(el('p', { class: 'espaco-vazio' }, e.galeria
        ? 'Galeria vazia: ela só aparece no site quando tiver pelo menos uma foto.'
        : 'Sem fotos: este espaço não aparece no site.'));
    }

    const grade = el('ul', { class: 'grade' });
    e.lista.forEach((f, i) => {
      const li = el('li');
      const b = el('button', { class: 'miniatura', type: 'button', 'aria-label': `Foto ${i + 1}${f.legenda ? ': ' + f.legenda : ''}. Tocar para editar` });
      const img = el('img', { src: miniatura(f), alt: '', loading: 'lazy' });
      b.append(img, el('span', { class: 'ordem' }, String(i + 1)));
      if (novos.has(f.id)) b.append(el('span', { class: 'marca marca-nova' }, 'Nova'));
      else if (e.legenda && f.legenda) b.append(el('span', { class: 'marca' }, f.legenda));
      else if (e.antesDepois && f.antesDepois) b.append(el('span', { class: 'marca' }, 'Antes e depois'));
      b.addEventListener('click', () => abrirFoto(f.id));
      li.append(b);
      grade.append(li);
    });
    if (e.lista.length < e.limite) {
      const li = el('li');
      const rotulo = el('label', { class: 'miniatura adicionar' });
      const entrada = el('input', { type: 'file', accept: 'image/*', 'aria-label': 'Adicionar fotos em ' + e.titulo });
      if (e.limite - e.lista.length > 1) entrada.multiple = true;
      entrada.addEventListener('change', () => {
        const arquivos = Array.from(entrada.files || []);
        entrada.value = '';
        if (arquivos.length) adicionar(e.chave, arquivos);
      });
      rotulo.append(el('span', { class: 'mais', 'aria-hidden': 'true' }, '+'), document.createTextNode(e.lista.length ? 'Adicionar' : 'Adicionar foto'), entrada);
      li.append(rotulo);
      grade.append(li);
    }
    sec.append(grade);
    if (e.lista.length >= e.limite) {
      sec.append(el('p', { class: 'espaco-vazio' }, `Espaço cheio (${e.limite} ${e.limite === 1 ? 'foto' : 'fotos'}). Para colocar outra, toque numa foto e escolha "Trocar" ou "Remover".`));
    }

    if (e.galeria) {
      const g = e.galeria;
      const det = el('details', { class: 'textos' });
      det.open = textosAbertos.has(g.id);
      det.addEventListener('toggle', () => { if (det.open) textosAbertos.add(g.id); else textosAbertos.delete(g.id); });
      det.append(el('summary', {}, 'Textos da galeria'));
      const campos = el('div', { class: 'textos-campos' });
      const campo = (rotulo, chave, max, longo) => {
        const l = el('label', { class: 'campo' });
        const entrada = el(longo ? 'textarea' : 'input', longo ? { maxlength: String(max) } : { type: 'text', maxlength: String(max) });
        entrada.value = g[chave] || '';
        entrada.addEventListener('input', () => { g[chave] = entrada.value; atualizarBarra(); });
        entrada.addEventListener('change', () => { g[chave] = entrada.value.trim(); desenhar(); });
        l.append(el('span', {}, rotulo), entrada);
        campos.append(l);
      };
      campo('Palavra em letra cursiva (ex.: Morena)', 'script', 20);
      campo('Resto do título (ex.: iluminada)', 'serif', 30);
      campo('Frase pequena embaixo do título', 'subtitulo', 50);
      campo('Texto embaixo das fotos', 'texto', 240, true);
      det.append(campos);
      sec.append(det);

      const acoes = el('div', { class: 'espaco-acoes' });
      const sobe = el('button', { class: 'botao botao-claro', type: 'button' }, 'Subir galeria');
      const desce = el('button', { class: 'botao botao-claro', type: 'button' }, 'Descer galeria');
      const exclui = el('button', { class: 'botao botao-perigo', type: 'button' }, 'Excluir galeria');
      sobe.disabled = e.indice === 0;
      desce.disabled = e.indice === dados.galerias.length - 1;
      sobe.addEventListener('click', () => moverGaleria(e.indice, -1));
      desce.addEventListener('click', () => moverGaleria(e.indice, 1));
      exclui.addEventListener('click', () => excluirGaleria(e.indice));
      acoes.append(sobe, desce, exclui);
      sec.append(acoes);
    }
    return sec;
  };

  const atualizarBarra = () => {
    const barra = $('[data-barra-publicar]');
    const tem = mudou();
    const qtdNovas = dados ? todasFotos(dados).filter((f) => novos.has(f.id)).length : 0;
    const qtdVideos = dados ? dados.videos.filter((v) => novos.has(v.id)).length : 0;
    const partes = [];
    if (qtdNovas) partes.push(plural(qtdNovas, 'foto nova', 'fotos novas'));
    if (qtdVideos) partes.push(plural(qtdVideos, 'vídeo novo', 'vídeos novos'));
    barra.classList.toggle('tem-mudancas', tem);
    $('[data-resumo]').textContent = !tem ? 'Tudo publicado'
      : partes.length ? partes.join(' e ') + ' para publicar' : 'Alterações para publicar';
    $('[data-publicar]').disabled = !tem || ocupado;
    $('[data-desfazer]').disabled = !tem || ocupado;
    const alteradas = abasAlteradas();
    $$('[data-aba]').forEach((b) => b.classList.toggle('alterada', alteradas.has(b.dataset.aba)));
  };

  /* ---------- Abas ---------- */

  // as abas ficam grudadas logo abaixo da barra de cima (que muda de altura no celular)
  const barraTopo = $('.barra');
  const medirBarra = () => document.documentElement.style.setProperty('--barra', barraTopo.offsetHeight + 'px');
  if (window.ResizeObserver) new ResizeObserver(medirBarra).observe(barraTopo);
  else window.addEventListener('resize', medirBarra);
  medirBarra();

  const mostrarAba = (nome, rolar = true) => {
    if (!ABAS.includes(nome)) nome = 'fotos';
    $$('[data-aba]').forEach((b) => {
      const sim = b.dataset.aba === nome;
      b.setAttribute('aria-selected', String(sim));
      b.tabIndex = sim ? 0 : -1;
    });
    $$('[data-painel-aba]').forEach((p) => {
      p.hidden = p.dataset.painelAba !== nome;
      if (!p.hidden) Editor.ajustar(p);
    });
    try { sessionStorage.setItem(CHAVE_ABA, nome); } catch (e) { /* tudo bem */ }
    if (rolar) window.scrollTo(0, 0);
  };
  $$('[data-aba]').forEach((b, i, todas) => {
    b.addEventListener('click', () => mostrarAba(b.dataset.aba));
    b.addEventListener('keydown', (e) => {
      const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!passo) return;
      const alvo = todas[(i + passo + todas.length) % todas.length];
      alvo.focus();
      mostrarAba(alvo.dataset.aba);
    });
  });

  const desenharEditor = () => {
    Editor.desenhar({
      textos: $('[data-editor-textos]'),
      duvidas: $('[data-editor-duvidas]'),
      contato: $('[data-editor-contato]'),
    }, conteudo, atualizarBarra);
  };

  /* ---------- Ações nas fotos ---------- */

  const adicionar = async (chave, arquivos) => {
    const e = espacos().find((x) => x.chave === chave);
    if (!e) return;
    const livres = e.limite - e.lista.length;
    const lista = arquivos.slice(0, livres);
    const avisos = [];
    if (arquivos.length > livres) avisos.push(`Só cabiam mais ${plural(livres, 'foto', 'fotos')} em "${e.titulo}"; as outras ficaram de fora.`);
    ocupado = true;
    for (let i = 0; i < lista.length; i++) {
      andamento('Preparando as fotos', `Foto ${i + 1} de ${lista.length}…`, Math.round((i / lista.length) * 100));
      try {
        e.lista.push(await prepararFoto(lista[i], e));
      } catch (erro) {
        avisos.push(`"${lista[i].name}": ${erro.message}`);
      }
    }
    ocupado = false;
    desenhar();
    if (avisos.length) {
      andamento('Fotos prontas', 'Algumas fotos precisam de atenção:', null);
      fimAndamento({ erro: avisos.join(' ') });
    } else if (jp.open) {
      jp.close();
    }
  };

  const descartarNovo = (id) => {
    if (previas.has(id) && novos.has(id)) {
      URL.revokeObjectURL(previas.get(id));
      previas.delete(id);
    }
    if (videosLocais.has(id)) {
      URL.revokeObjectURL(videosLocais.get(id));
      videosLocais.delete(id);
    }
    novos.delete(id);
  };

  // Janela de uma foto
  const jf = $('[data-janela-foto]');
  let fotoAberta = '';
  const abrirFoto = (id) => {
    const achado = localizar(id);
    if (!achado) return;
    fotoAberta = id;
    preencherJanelaFoto();
    jf.showModal();
  };
  const preencherJanelaFoto = () => {
    const achado = localizar(fotoAberta);
    if (!achado) { jf.close(); return; }
    const { espaco: e, indice: i, foto: f } = achado;
    $('[data-jf-titulo]', jf).textContent = `${e.titulo} · foto ${i + 1} de ${e.lista.length}`;
    $('[data-jf-previa]', jf).src = previas.get(f.id) || new URL(`${f.arquivo}-${Math.max(...f.larguras)}.${(f.formatos || []).includes('jpg') || !(f.formatos || []).length ? 'jpg' : f.formatos[0]}`, SITE).href;
    $('[data-jf-legenda-campo]', jf).hidden = !e.legenda;
    $('[data-jf-legenda]', jf).value = f.legenda || '';
    $('[data-jf-ad-campo]', jf).hidden = !e.antesDepois;
    $('[data-jf-ad]', jf).checked = !!f.antesDepois;
    $('[data-jf-esquerda]', jf).disabled = i === 0;
    $('[data-jf-direita]', jf).disabled = i === e.lista.length - 1;
    const sel = $('[data-jf-mover]', jf);
    sel.textContent = '';
    sel.append(el('option', { value: '' }, 'Escolha um lugar…'));
    espacos().filter((x) => x.chave !== e.chave).forEach((x) => {
      const cheio = x.lista.length >= x.limite;
      sel.append(el('option', { value: x.chave, disabled: cheio }, x.titulo + (cheio ? ' (cheio)' : '')));
    });
  };
  $('[data-jf-legenda]', jf).addEventListener('input', (ev) => {
    const achado = localizar(fotoAberta);
    if (achado) { achado.foto.legenda = ev.target.value.trim(); atualizarBarra(); }
  });
  $('[data-jf-ad]', jf).addEventListener('change', (ev) => {
    const achado = localizar(fotoAberta);
    if (achado) { achado.foto.antesDepois = ev.target.checked; atualizarBarra(); }
  });
  const moverNaLista = (passo) => {
    const achado = localizar(fotoAberta);
    if (!achado) return;
    const { espaco: e, indice: i } = achado;
    const j = i + passo;
    if (j < 0 || j >= e.lista.length) return;
    [e.lista[i], e.lista[j]] = [e.lista[j], e.lista[i]];
    desenhar();
    preencherJanelaFoto();
  };
  $('[data-jf-esquerda]', jf).addEventListener('click', () => moverNaLista(-1));
  $('[data-jf-direita]', jf).addEventListener('click', () => moverNaLista(1));
  $('[data-jf-mover]', jf).addEventListener('change', (ev) => {
    const destino = espacos().find((x) => x.chave === ev.target.value);
    const achado = localizar(fotoAberta);
    if (!destino || !achado || destino.lista.length >= destino.limite) return;
    achado.espaco.lista.splice(achado.indice, 1);
    if (!destino.antesDepois) achado.foto.antesDepois = false;
    destino.lista.push(achado.foto);
    desenhar();
    preencherJanelaFoto();
  });
  $('[data-jf-trocar]', jf).addEventListener('change', async (ev) => {
    const arquivo = ev.target.files && ev.target.files[0];
    ev.target.value = '';
    const achado = localizar(fotoAberta);
    if (!arquivo || !achado) return;
    jf.close();
    ocupado = true;
    andamento('Preparando a foto', 'Um instante…', null);
    try {
      const nova = await prepararFoto(arquivo, achado.espaco);
      nova.legenda = achado.foto.legenda || '';
      if (!achado.espaco.antesDepois) nova.antesDepois = false;
      achado.espaco.lista.splice(achado.indice, 1, nova);
      descartarNovo(achado.foto.id);
      ocupado = false;
      jp.close();
      desenhar();
      abrirFoto(nova.id);
    } catch (erro) {
      ocupado = false;
      fimAndamento({ erro: 'Não deu para usar esta foto: ' + erro.message });
    }
  });
  $('[data-jf-remover]', jf).addEventListener('click', () => {
    const achado = localizar(fotoAberta);
    if (!achado) return;
    if (!window.confirm('Remover esta foto do site?')) return;
    achado.espaco.lista.splice(achado.indice, 1);
    descartarNovo(achado.foto.id);
    jf.close();
    desenhar();
  });
  $('[data-jf-pronto]', jf).addEventListener('click', () => jf.close());
  jf.addEventListener('close', () => { fotoAberta = ''; desenhar(); });

  /* ---------- Vídeos ---------- */

  // Lê o "moov" do MP4/MOV e diz o formato da imagem: H.264 toca em todo celular; HEVC, não.
  const codecDoVideo = (bytes) => {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const tipo = (i) => String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
    let i = 0;
    while (i + 8 <= bytes.length) {
      let tam = dv.getUint32(i);
      if (tam === 1 && i + 16 <= bytes.length) tam = dv.getUint32(i + 8) * 0x100000000 + dv.getUint32(i + 12);
      else if (tam === 0) tam = bytes.length - i;
      if (tam < 8) return null;
      if (tipo(i + 4) === 'moov') {
        const moov = bytes.subarray(i, Math.min(bytes.length, i + tam));
        const tem = (s) => {
          const [a, b, c, d] = Array.from(s, (ch) => ch.charCodeAt(0));
          for (let k = 0; k + 4 <= moov.length; k++) if (moov[k] === a && moov[k + 1] === b && moov[k + 2] === c && moov[k + 3] === d) return true;
          return false;
        };
        if (['hvc1', 'hev1', 'dvh1', 'dvhe'].some(tem)) return 'hevc';
        if (['avc1', 'avc3'].some(tem)) return 'h264';
        return 'outro';
      }
      i += tam;
    }
    return null;
  };

  // Abre o vídeo no aparelho, confere se toca e tira uma capa (um quadro perto do 1º segundo)
  const abrirVideoLocal = (arquivo) => new Promise((ok, falha) => {
    const url = URL.createObjectURL(arquivo);
    const v = el('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    let info = null;
    let feito = false;
    let relogioCapa = 0;
    const fim = (erro, capa) => {
      if (feito) return;
      feito = true;
      clearTimeout(relogio);
      clearTimeout(relogioCapa);
      v.removeAttribute('src');
      v.load();
      URL.revokeObjectURL(url);
      if (erro) falha(erro);
      else ok(Object.assign({ capa }, info));
    };
    const relogio = setTimeout(() => fim(new Error('não consegui abrir este vídeo neste aparelho. Envie em MP4.')), 25000);
    v.addEventListener('error', () => fim(new Error('este aparelho não consegue tocar o vídeo. Envie em MP4.')));
    v.addEventListener('loadedmetadata', () => {
      if (!v.videoWidth || !v.videoHeight) return fim(new Error('o arquivo não tem imagem de vídeo.'));
      info = { largura: v.videoWidth, altura: v.videoHeight, duracao: v.duration };
      // sem capa, o vídeo funciona do mesmo jeito (só aparece escuro até tocar)
      relogioCapa = setTimeout(() => fim(null, null), 10000);
      v.currentTime = Math.min(1, (Number.isFinite(v.duration) ? v.duration : 3) / 3);
    });
    // desenha o quadro atual; devolve null se saiu preto (o Safari só entrega a imagem depois de tocar)
    const quadro = () => {
      try {
        const w = Math.min(720, v.videoWidth);
        const h = Math.round(v.videoHeight * w / v.videoWidth);
        const c = el('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(v, 0, 0, w, h);
        const amostra = el('canvas');
        amostra.width = amostra.height = 16;
        const x = amostra.getContext('2d');
        x.drawImage(c, 0, 0, 16, 16);
        const px = x.getImageData(0, 0, 16, 16).data;
        let soma = 0;
        for (let k = 0; k < px.length; k += 4) soma += px[k] + px[k + 1] + px[k + 2];
        return soma / (px.length / 4) / 3 < 6 ? null : c;
      } catch (e) {
        return null;
      }
    };
    const entregar = (c) => (c ? c.toBlob((b) => fim(null, b), 'image/jpeg', 0.84) : fim(null, null));
    v.addEventListener('seeked', () => {
      const c = quadro();
      if (c) return entregar(c);
      // quadro preto: toca sem som por um instante e tenta de novo
      const depois = v.currentTime;
      const aoAndar = () => {
        if (v.currentTime < depois + 0.25) return;
        v.removeEventListener('timeupdate', aoAndar);
        v.pause();
        entregar(quadro());
      };
      v.addEventListener('timeupdate', aoAndar);
      const tocando = v.play();
      if (tocando && tocando.catch) tocando.catch(() => fim(null, null));
    }, { once: true });
    v.src = url;
  });

  const prepararVideo = async (arquivo) => {
    if (!/^video\//.test(arquivo.type) && !/\.(mp4|m4v|mov)$/i.test(arquivo.name)) throw new Error('não é um vídeo.');
    if (arquivo.size > VIDEO_MAX_MB * 1024 * 1024) {
      throw new Error(`o vídeo tem ${Math.round(arquivo.size / 1024 / 1024)} MB e o máximo é ${VIDEO_MAX_MB} MB. Use um vídeo mais curto, ou salve o reel do Instagram (que já vem menor).`);
    }
    const codec = codecDoVideo(new Uint8Array(await arquivo.arrayBuffer()));
    if (codec === 'hevc') {
      throw new Error('foi gravado no formato HEVC, que não toca em todo celular. No iPhone, em Ajustes › Câmera › Formatos, escolha "Mais compatível" e grave de novo, ou envie o vídeo salvo do Instagram.');
    }
    if (codec !== 'h264') throw new Error('não reconheci o formato do vídeo. Envie um arquivo MP4.');
    const info = await abrirVideoLocal(arquivo);
    const id = novoId();
    const base = `assets/video/video-${id}`;
    const v = {
      id: 'v' + id.replace(/-/g, ''),
      video: base + '.mp4',
      capa: info.capa ? base + '-capa.jpg' : '',
      largura: info.largura,
      altura: info.altura,
      legenda: '',
      descricao: '',
    };
    const arquivos = [{ caminho: v.video, blob: arquivo }];
    if (info.capa) {
      arquivos.push({ caminho: v.capa, blob: info.capa });
      previas.set(v.id, URL.createObjectURL(info.capa));
    }
    novos.set(v.id, arquivos);
    videosLocais.set(v.id, URL.createObjectURL(arquivo));
    return { v, deitado: info.largura > info.altura };
  };

  const adicionarVideo = async (arquivo) => {
    if (dados.videos.length >= LIMITES.videos) return;
    ocupado = true;
    andamento('Preparando o vídeo', 'Conferindo o formato…', null);
    try {
      const { v, deitado } = await prepararVideo(arquivo);
      dados.videos.push(v);
      ocupado = false;
      desenhar();
      if (deitado) {
        andamento('Vídeo pronto', 'Este vídeo está deitado. No site, os vídeos aparecem em pé, então as laterais ficam cortadas.', null);
        fimAndamento({});
      } else {
        jp.close();
        abrirVideo(v.id);
      }
    } catch (erro) {
      ocupado = false;
      andamento('Não deu para usar este vídeo', '', null);
      fimAndamento({ erro: `"${arquivo.name}": ${erro.message}` });
    }
  };

  // Janela de um vídeo
  const jv = $('[data-janela-video]');
  let videoAberto = '';
  const posVideo = () => dados.videos.findIndex((v) => v.id === videoAberto);
  const abrirVideo = (id) => {
    videoAberto = id;
    const i = posVideo();
    if (i < 0) return;
    const v = dados.videos[i];
    const previa = $('[data-jv-previa]', jv);
    previa.poster = capaVideo(v);
    previa.src = videosLocais.get(v.id) || new URL(v.video, SITE).href;
    $('[data-jv-legenda]', jv).value = v.legenda || '';
    preencherJanelaVideo();
    jv.showModal();
  };
  const preencherJanelaVideo = () => {
    const i = posVideo();
    if (i < 0) { jv.close(); return; }
    $('[data-jv-titulo]', jv).textContent = `Vídeo ${i + 1} de ${dados.videos.length}`;
    $('[data-jv-esquerda]', jv).disabled = i === 0;
    $('[data-jv-direita]', jv).disabled = i === dados.videos.length - 1;
  };
  $('[data-jv-legenda]', jv).addEventListener('input', (ev) => {
    const i = posVideo();
    if (i >= 0) { dados.videos[i].legenda = ev.target.value.trim(); atualizarBarra(); }
  });
  const moverVideo = (passo) => {
    const i = posVideo();
    const j = i + passo;
    if (i < 0 || j < 0 || j >= dados.videos.length) return;
    [dados.videos[i], dados.videos[j]] = [dados.videos[j], dados.videos[i]];
    desenhar();
    preencherJanelaVideo();
  };
  $('[data-jv-esquerda]', jv).addEventListener('click', () => moverVideo(-1));
  $('[data-jv-direita]', jv).addEventListener('click', () => moverVideo(1));
  $('[data-jv-remover]', jv).addEventListener('click', () => {
    const i = posVideo();
    if (i < 0 || !window.confirm('Remover este vídeo do site?')) return;
    const [v] = dados.videos.splice(i, 1);
    jv.close();
    descartarNovo(v.id);
    desenhar();
  });
  $('[data-jv-pronto]', jv).addEventListener('click', () => jv.close());
  jv.addEventListener('close', () => {
    const previa = $('[data-jv-previa]', jv);
    previa.pause();
    previa.removeAttribute('src');
    previa.load();
    videoAberto = '';
    desenhar();
  });

  // Galerias
  const moverGaleria = (i, passo) => {
    const j = i + passo;
    if (j < 0 || j >= dados.galerias.length) return;
    [dados.galerias[i], dados.galerias[j]] = [dados.galerias[j], dados.galerias[i]];
    desenhar();
  };
  const excluirGaleria = (i) => {
    const g = dados.galerias[i];
    const aviso = g.fotos.length
      ? `Excluir a galeria "${nomeGaleria(g)}" e as ${plural(g.fotos.length, 'foto', 'fotos')} dela?`
      : `Excluir a galeria "${nomeGaleria(g)}"?`;
    if (!window.confirm(aviso)) return;
    g.fotos.forEach((f) => descartarNovo(f.id));
    dados.galerias.splice(i, 1);
    desenhar();
  };
  $('[data-nova-galeria]').addEventListener('click', () => {
    if (dados.galerias.length >= LIMITES.galerias) return;
    let id;
    do id = 'galeria-' + Math.random().toString(36).slice(2, 7); while (dados.galerias.some((g) => g.id === id));
    dados.galerias.push({ id, script: 'Nova', serif: 'galeria', subtitulo: '', texto: '', fotos: [] });
    textosAbertos.add(id);
    desenhar();
    const ultimo = $$('.espaco', caixa).filter((s) => s.querySelector('.textos')).pop();
    if (ultimo) ultimo.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('[data-desfazer]').addEventListener('click', () => {
    if (!window.confirm('Desfazer tudo o que ainda não foi publicado?')) return;
    [...todasFotos(dados), ...dados.videos].forEach((f) => { if (novos.has(f.id)) descartarNovo(f.id); });
    novos.clear();
    dados = normalizar(JSON.parse(original));
    conteudo = Editor.normalizar(JSON.parse(originalConteudo));
    desenharEditor();
    desenhar();
  });

  /* ---------- Publicar ---------- */

  const mensagemCommit = ({ fotosNovas, fotosRemovidas, videosNovos, videosRemovidos, fotosMudaram, textos }) => {
    const partes = [];
    if (fotosNovas) partes.push(plural(fotosNovas, 'foto nova', 'fotos novas'));
    if (fotosRemovidas) partes.push(plural(fotosRemovidas, 'foto removida', 'fotos removidas'));
    if (videosNovos) partes.push(plural(videosNovos, 'vídeo novo', 'vídeos novos'));
    if (videosRemovidos) partes.push(plural(videosRemovidos, 'vídeo removido', 'vídeos removidos'));
    if (!partes.length && fotosMudaram) partes.push('fotos reorganizadas');
    if (textos) partes.push('textos e contato');
    return 'Painel do site: ' + partes.join(', ');
  };

  const acompanhar = async (marca, caminho) => {
    const inicio = Date.now();
    while (Date.now() - inicio < 12 * 60 * 1000) {
      await espera(15000);
      try {
        const r = await fetch(new URL(caminho + '?v=' + Date.now(), SITE), { cache: 'no-store' });
        if (r.ok && (await r.json()).atualizado === marca) return true;
      } catch (e) { /* tenta de novo */ }
      if (!jp.open) return false;
    }
    return false;
  };

  $('[data-publicar]').addEventListener('click', async () => {
    if (ocupado || !mudou()) return;
    const erros = Editor.problemas(conteudo);
    if (erros.length) {
      mostrarAba(erros[0].aba);
      andamento('Falta corrigir uma coisa', 'Nada foi publicado ainda.', null);
      fimAndamento({ erro: erros.map((x) => x.msg).join(' ') });
      return;
    }
    ocupado = true;
    atualizarBarra();
    andamento('Publicando no site', 'Conferindo a versão atual…', 3);
    try {
      const comFotos = mudouFotos();
      const comConteudo = mudouConteudo();
      const ler = (caminho) => gh(`/contents/${caminho}?ref=${encodeURIComponent(RAMO)}`);
      const [atualF, atualC] = await Promise.all([comFotos ? ler(CAMINHO_FOTOS) : null, comConteudo ? ler(CAMINHO_CONTEUDO) : null]);
      if ((atualF && atualF.sha !== shaFotos) || (atualC && atualC.sha !== shaConteudo)) {
        throw new Error('O site foi alterado em outro aparelho depois que você entrou. Anote o que você mudou, toque em Desfazer, recarregue a página e faça de novo.');
      }

      let removidos = [];
      let fotosNovas = [];
      let videosNovos = [];
      if (comFotos) {
        const antes = normalizar(JSON.parse(original));
        const usadosAgora = new Set([...todasFotos(dados).flatMap(arquivosDe), ...dados.videos.flatMap(arquivosVideo)]);
        removidos = [...new Set([...todasFotos(antes).flatMap(arquivosDe), ...antes.videos.flatMap(arquivosVideo)])]
          .filter((c) => (c.startsWith('assets/fotos/') || c.startsWith('assets/video/')) && !usadosAgora.has(c));
        fotosNovas = todasFotos(dados).filter((f) => novos.has(f.id));
        videosNovos = dados.videos.filter((v) => novos.has(v.id));
      }
      const envios = [...fotosNovas, ...videosNovos].flatMap((x) => novos.get(x.id));
      const itens = [];

      for (let i = 0; i < envios.length; i++) {
        const texto = /\.mp4$/.test(envios[i].caminho)
          ? 'Enviando o vídeo… pode levar alguns minutos na internet do celular.'
          : `Enviando as fotos (${i + 1} de ${envios.length})…`;
        andamento('Publicando no site', texto, 5 + Math.round((i / Math.max(1, envios.length)) * 75));
        const blob = await gh('/git/blobs', { metodo: 'POST', corpo: { content: await blobParaB64(envios[i].blob), encoding: 'base64' } });
        itens.push({ path: envios[i].caminho, mode: '100644', type: 'blob', sha: blob.sha });
      }

      andamento('Publicando no site', 'Salvando as alterações…', 85);
      const marca = new Date().toISOString();
      const salvarJson = async (obj, caminho) => {
        const copia = JSON.parse(JSON.stringify(obj));
        copia.atualizado = marca;
        const b = await gh('/git/blobs', { metodo: 'POST', corpo: { content: textoParaB64(JSON.stringify(copia, null, 2) + '\n'), encoding: 'base64' } });
        itens.push({ path: caminho, mode: '100644', type: 'blob', sha: b.sha });
        return b.sha;
      };
      const novoShaFotos = comFotos ? await salvarJson(dados, CAMINHO_FOTOS) : shaFotos;
      const novoShaConteudo = comConteudo ? await salvarJson(conteudo, CAMINHO_CONTEUDO) : shaConteudo;
      removidos.forEach((c) => itens.push({ path: c, mode: '100644', type: 'blob', sha: null }));
      const mensagem = mensagemCommit({
        fotosNovas: fotosNovas.length,
        fotosRemovidas: new Set(removidos.filter((c) => c.startsWith('assets/fotos/')).map((c) => c.replace(/-\d+\.\w+$/, ''))).size,
        videosNovos: videosNovos.length,
        videosRemovidos: removidos.filter((c) => /\.mp4$/.test(c)).length,
        fotosMudaram: comFotos,
        textos: comConteudo,
      });

      for (let tentativa = 1; ; tentativa++) {
        const ref = await gh(`/git/ref/heads/${encodeURIComponent(RAMO)}`);
        const ultimo = await gh(`/git/commits/${ref.object.sha}`);
        const arvore = await gh('/git/trees', { metodo: 'POST', corpo: { base_tree: ultimo.tree.sha, tree: itens } });
        const commit = await gh('/git/commits', {
          metodo: 'POST',
          corpo: { message: mensagem, tree: arvore.sha, parents: [ref.object.sha] },
        });
        try {
          await gh(`/git/refs/heads/${encodeURIComponent(RAMO)}`, { metodo: 'PATCH', corpo: { sha: commit.sha, force: false } });
          break;
        } catch (e) {
          if (tentativa < 3 && (e.status === 409 || e.status === 422)) continue;
          throw e;
        }
      }

      if (comFotos) {
        dados.atualizado = marca;
        original = JSON.stringify(dados);
        shaFotos = novoShaFotos;
      }
      if (comConteudo) {
        conteudo.atualizado = marca;
        originalConteudo = JSON.stringify(conteudo);
        shaConteudo = novoShaConteudo;
      }
      novos.clear();
      ocupado = false;
      desenhar();
      andamento('Salvo!', 'As alterações foram salvas. O site está sendo atualizado; isso costuma levar de 1 a 5 minutos. Pode fechar esta janela.', null);
      fimAndamento({ site: true });
      const noAr = await acompanhar(marca, comConteudo ? CAMINHO_CONTEUDO : CAMINHO_FOTOS);
      if (jp.open && noAr) andamento('Pronto, já está no site!', 'Se ainda aparecer a versão antiga, puxe a página para baixo para atualizar.', null);
    } catch (e) {
      ocupado = false;
      atualizarBarra();
      andamento('Não foi possível publicar', 'Nada foi alterado no site.', null);
      fimAndamento({ erro: mensagemDe(e) });
    }
  });

  window.addEventListener('beforeunload', (e) => {
    if (mudou()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ---------- Entrar, configurar, trocar senha, sair ---------- */

  const abrirPainel = async () => {
    await carregarDados();
    mostrarTela('painel');
    let aba = 'fotos';
    try { aba = sessionStorage.getItem(CHAVE_ABA) || 'fotos'; } catch (e) { /* tudo bem */ }
    mostrarAba(aba, false);
    desenharEditor();
    desenhar();
  };

  const formEntrar = $('[data-form-entrar]');
  formEntrar.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    // espaços no começo ou no fim são ignorados, como na hora de criar a senha
    // (o teclado do celular costuma colocar um espaço depois da palavra)
    const senha = formEntrar.senha.value.trim();
    if (!senha) return mostrarErro(formEntrar, 'Digite a senha.');
    mostrarErro(formEntrar, '');
    travar(formEntrar, true, 'Entrando…');
    try {
      const r = await fetch('acesso.json?v=' + Date.now(), { cache: 'no-store' });
      if (r.status === 404) throw new Error('O painel ainda não foi configurado. Peça ao Italo para configurar o acesso.');
      if (!r.ok) throw new Error('Não consegui abrir o painel agora. Confira a internet e tente de novo.');
      const acesso = await r.json();
      try {
        token = await decifrar(acesso, senha);
      } catch (e) {
        throw new Error('Senha incorreta.');
      }
      await abrirPainel();
      try { sessionStorage.setItem(CHAVE_SESSAO, token); } catch (e) { /* aba privada: tudo bem */ }
      formEntrar.reset();
    } catch (e) {
      token = '';
      mostrarErro(formEntrar, mensagemDe(e));
    } finally {
      travar(formEntrar, false);
    }
  });

  const salvarAcesso = async (chave, senha) => {
    const acesso = await cifrar(chave, senha);
    let sha;
    try {
      sha = (await gh(`/contents/${CAMINHO_ACESSO}?ref=${encodeURIComponent(RAMO)}`, { chave })).sha;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
    await gh(`/contents/${CAMINHO_ACESSO}`, {
      metodo: 'PUT',
      chave,
      corpo: { message: 'Painel do site: ' + (sha ? 'troca a senha' : 'configura o acesso'), content: textoParaB64(JSON.stringify(acesso, null, 2) + '\n'), branch: RAMO, sha },
    });
  };

  $$('[data-gerar-senha]').forEach((b) => b.addEventListener('click', () => {
    const campo = $('input[name="senha"]', b.closest('form'));
    campo.value = gerarSenha();
    campo.focus();
    campo.select();
  }));

  const formConfigurar = $('[data-form-configurar]');
  formConfigurar.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const chave = formConfigurar.token.value.trim();
    const senha = formConfigurar.senha.value.trim();
    if (!/^(github_pat_|ghp_)[A-Za-z0-9_]{20,}$/.test(chave)) return mostrarErro(formConfigurar, 'Cole o token do GitHub (começa com "github_pat_").');
    if (senha.length < 12) return mostrarErro(formConfigurar, 'A senha precisa de pelo menos 12 caracteres. Use "Gerar uma senha forte".');
    mostrarErro(formConfigurar, '');
    travar(formConfigurar, true, 'Salvando…');
    try {
      const repo = await gh('', { chave });
      if (repo.archived) throw new Error('O repositório está arquivado.');
      await salvarAcesso(chave, senha);
      token = chave;
      try { sessionStorage.setItem(CHAVE_SESSAO, token); } catch (e) { /* tudo bem */ }
      formConfigurar.reset();
      await abrirPainel();
      andamento('Acesso configurado', `Envie para a Raquel o endereço deste painel e a senha: ${senha} . O login com senha funciona em 1 a 5 minutos, quando o site terminar de atualizar.`, null);
      fimAndamento({});
    } catch (e) {
      mostrarErro(formConfigurar, mensagemDe(e));
    } finally {
      travar(formConfigurar, false);
    }
  });

  const js = $('[data-janela-senha]');
  const formSenha = $('[data-form-senha]');
  $('[data-abrir-senha]').addEventListener('click', () => { formSenha.reset(); mostrarErro(formSenha, ''); js.showModal(); });
  $('[data-fechar-senha]').addEventListener('click', () => js.close());
  formSenha.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const senha = formSenha.senha.value.trim();
    if (senha.length < 12) return mostrarErro(formSenha, 'A senha precisa de pelo menos 12 caracteres.');
    travar(formSenha, true, 'Salvando…');
    try {
      await salvarAcesso(token, senha);
      js.close();
      andamento('Senha trocada', 'A nova senha passa a valer em 1 a 5 minutos, quando o site terminar de atualizar. Guarde-a num lugar seguro.', null);
      fimAndamento({});
    } catch (e) {
      mostrarErro(formSenha, mensagemDe(e));
    } finally {
      travar(formSenha, false);
    }
  });

  $('[data-sair]').addEventListener('click', () => {
    if (mudou() && !window.confirm('Há alterações não publicadas. Sair mesmo assim?')) return;
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* tudo bem */ }
    token = '';
    dados = null;
    original = '';
    conteudo = null;
    originalConteudo = '';
    novos.clear();
    window.location.reload();
  });

  /* ---------- Início ---------- */

  (async () => {
    if (!window.crypto || !crypto.subtle) {
      mostrarTela('entrar');
      mostrarErro(formEntrar, 'Este navegador não consegue abrir o painel. Use o Chrome ou o Safari atualizados.');
      return;
    }
    let salvo = '';
    try { salvo = sessionStorage.getItem(CHAVE_SESSAO) || ''; } catch (e) { /* tudo bem */ }
    if (salvo) {
      token = salvo;
      try {
        await abrirPainel();
        return;
      } catch (e) {
        token = '';
        try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e2) { /* tudo bem */ }
      }
    }
    mostrarTela('entrar');
  })();
})();
