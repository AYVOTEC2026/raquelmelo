/* Painel do site: editor dos textos, das perguntas frequentes e do contato.

   Edita o objeto lido de assets/data/conteudo.json (o admin.js carrega e publica o arquivo).
   Cada campo grava direto no objeto e avisa com aoMudar(); listas (fitas, produtos, perguntas,
   horários...) têm botões para adicionar, subir, descer e remover itens.
   O site mostra tudo como texto puro; **palavra** vira negrito. */
window.PainelConteudo = (() => {
  'use strict';

  const el = (tag, attrs = {}, texto) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? '' : v); });
    if (texto !== undefined) n.textContent = texto;
    return n;
  };

  let c = null;
  let aoMudar = () => {};
  const abertos = new Set(['topo']); // blocos abertos (continuam abertos ao redesenhar)
  let contador = 0;
  const novoIdCampo = () => 'cp' + (++contador);

  /* ---------- Dados ---------- */

  const SECOES = ['contato', 'topo', 'fitas', 'sobre', 'produtos', 'videos', 'horarios', 'duvidas', 'rodape'];
  const normalizar = (d) => {
    const x = d && typeof d === 'object' ? d : {};
    SECOES.forEach((k) => { if (!x[k] || typeof x[k] !== 'object' || Array.isArray(x[k])) x[k] = {}; });
    return x;
  };

  const digitos = (t) => String(t || '').replace(/\D/g, '');
  const telefone = (d) => {
    const n = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d;
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return d;
  };
  const usuario = (t, dominio) => String(t || '').trim()
    .replace(new RegExp('^https?://(www\\.)?' + dominio + '/', 'i'), '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '')
    .trim();
  const link = (t) => {
    const v = String(t || '').trim();
    if (!v) return '';
    if (/^http:\/\//i.test(v)) return 'https://' + v.slice(7);
    if (!/^https:\/\//i.test(v) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(v)) return 'https://' + v;
    return v;
  };

  // Antes de publicar: o que precisa ser corrigido (com a aba onde está)
  const problemas = (d) => {
    const lista = [];
    const k = (d && d.contato) || {};
    const wa = digitos(k.whatsapp);
    if (!wa) lista.push({ aba: 'contato', msg: 'O WhatsApp não pode ficar vazio: é por ele que as clientes agendam.' });
    else if (!/^55\d{10,11}$/.test(wa)) lista.push({ aba: 'contato', msg: 'Confira o WhatsApp: escreva o DDD e o número, por exemplo (85) 98726-1704.' });
    [['mapsUrl', 'Google Maps'], ['google', 'perfil no Google'], ['youtube', 'YouTube']].forEach(([chave, nome]) => {
      const v = String(k[chave] || '').trim();
      if (v && !/^https:\/\/[^\s"<>]+$/i.test(v)) lista.push({ aba: 'contato', msg: `O link do ${nome} precisa começar com https:// (copie o endereço completo).` });
    });
    const nota = String(k.notaGoogle || '').trim();
    if (nota && !/^[0-5]([,.]\d)?$/.test(nota)) lista.push({ aba: 'contato', msg: 'A nota do Google deve ser um número de 0 a 5, por exemplo 5,0 ou 4,9.' });
    return lista;
  };

  /* ---------- Peças da tela ---------- */

  // a caixa de texto cresce com o texto (só dá para medir quando ela está na tela)
  const crescer = (t) => {
    if (!t.offsetParent) return;
    t.style.height = 'auto';
    t.style.height = (t.scrollHeight + 2) + 'px';
  };
  const ajustar = (raiz) => raiz.querySelectorAll('textarea').forEach(crescer);

  // Um campo de texto ligado a obj[chave]
  const campo = (rotulo, obj, chave, { max = 80, longo = false, dica, exemplo, tipo = 'text', modo, aoSair, mostrar, aoDigitar, guardar } = {}) => {
    const id = novoIdCampo();
    const l = el('div', { class: 'campo' });
    const entrada = longo
      ? el('textarea', { id, maxlength: String(max), rows: '2' })
      : el('input', { id, type: tipo, maxlength: String(max), inputmode: modo, autocomplete: 'off' });
    if (exemplo) entrada.placeholder = exemplo;
    entrada.value = mostrar ? mostrar(obj[chave]) : (obj[chave] == null ? '' : String(obj[chave]));
    l.append(el('label', { for: id }, rotulo), entrada);
    if (dica) {
      const d = el('small', { class: 'dica', id: id + '-dica' }, dica);
      entrada.setAttribute('aria-describedby', d.id);
      l.append(d);
    }
    entrada.addEventListener('input', () => {
      obj[chave] = guardar ? guardar(entrada.value) : entrada.value;
      if (longo) crescer(entrada);
      if (aoDigitar) aoDigitar(entrada.value);
      aoMudar();
    });
    if (aoSair) {
      entrada.addEventListener('change', () => {
        obj[chave] = aoSair(entrada.value);
        entrada.value = mostrar ? mostrar(obj[chave]) : obj[chave];
        aoMudar();
      });
    }
    if (longo) {
      entrada.addEventListener('focus', () => crescer(entrada));
      requestAnimationFrame(() => crescer(entrada));
    }
    return l;
  };

  const opcao = (rotulo, obj, chave, aoTrocar) => {
    const l = el('label', { class: 'opcao' });
    const caixa = el('input', { type: 'checkbox' });
    caixa.checked = obj[chave] !== false;
    caixa.addEventListener('change', () => {
      obj[chave] = caixa.checked;
      if (aoTrocar) aoTrocar(caixa.checked);
      aoMudar();
    });
    l.append(caixa, el('span', {}, rotulo));
    return l;
  };

  const aviso = (texto) => el('p', { class: 'aviso-campo' }, texto);

  // Lista editável: obj[chave] é um array (de textos ou de objetos)
  const lista = (obj, chave, { titulo, max, novo, rotuloNovo, item, resumo, recolher = false, vazio, lado = false }) => {
    const caixa = el('div', { class: 'lista-editavel' + (lado ? ' lista-lado' : '') });
    const abertosLista = new Set();
    const desenhar = (focar) => {
      const itens = Array.isArray(obj[chave]) ? obj[chave] : [];
      caixa.textContent = '';
      if (titulo) caixa.append(el('p', { class: 'lista-titulo' }, `${titulo} (${itens.length} de ${max})`));
      if (!itens.length && vazio) caixa.append(el('p', { class: 'lista-vazia' }, vazio));
      const ul = el('ol', { class: 'itens' });
      itens.forEach((valor, i) => {
        const li = el('li', { class: 'item' });
        const corpo = el('div', { class: 'item-corpo' });
        item(itens, i).forEach((n) => corpo.append(n));
        const acoes = el('div', { class: 'item-acoes' });
        const nome = () => (resumo && resumo(itens[i])) || 'item ' + (i + 1);
        const botao = (rot, verbo, fn, desligado, perigo) => {
          const b = el('button', { class: 'mini' + (perigo ? ' mini-perigo' : ''), type: 'button', 'aria-label': verbo + ' ' + nome() }, rot);
          b.dataset.verbo = verbo;
          b.disabled = !!desligado;
          b.addEventListener('click', fn);
          acoes.append(b);
        };
        // o nome lido pelo leitor de tela acompanha o que ela digita
        corpo.addEventListener('input', () => {
          acoes.querySelectorAll('[data-verbo]').forEach((b) => b.setAttribute('aria-label', b.dataset.verbo + ' ' + nome()));
        });
        botao('↑ Subir', 'Subir', () => { [itens[i - 1], itens[i]] = [itens[i], itens[i - 1]]; aoMudar(); desenhar(); }, i === 0);
        botao('↓ Descer', 'Descer', () => { [itens[i + 1], itens[i]] = [itens[i], itens[i + 1]]; aoMudar(); desenhar(); }, i === itens.length - 1);
        botao('Remover', 'Remover', () => {
          const r = resumo ? resumo(itens[i]) : '';
          if (!window.confirm(r ? `Remover "${r}"?` : 'Remover este item?')) return;
          itens.splice(i, 1);
          aoMudar();
          desenhar();
        }, false, true);
        if (recolher) {
          const det = el('details', { class: 'item-recolhivel' });
          det.open = abertosLista.has(valor) || focar === i;
          det.addEventListener('toggle', () => {
            if (det.open) { abertosLista.add(itens[i]); ajustar(det); } else abertosLista.delete(itens[i]);
          });
          const sum = el('summary', {}, resumo(itens[i]) || 'Novo item');
          corpo.addEventListener('input', () => { sum.textContent = resumo(itens[i]) || 'Novo item'; });
          det.append(sum, corpo, acoes);
          li.append(det);
        } else {
          li.append(corpo, acoes);
        }
        ul.append(li);
      });
      caixa.append(ul);
      if (itens.length < max) {
        const add = el('button', { class: 'botao botao-claro botao-adicionar', type: 'button' }, '+ ' + rotuloNovo);
        add.addEventListener('click', () => {
          if (!Array.isArray(obj[chave])) obj[chave] = [];
          obj[chave].push(novo());
          aoMudar();
          desenhar(obj[chave].length - 1);
        });
        caixa.append(add);
      } else {
        caixa.append(el('p', { class: 'lista-vazia' }, `Chegou ao máximo de ${max}. Remova um item para colocar outro.`));
      }
      if (typeof focar === 'number') {
        const alvo = ul.children[focar];
        const campoNovo = alvo && alvo.querySelector('input, textarea');
        if (campoNovo) {
          campoNovo.focus({ preventScroll: true });
          alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    desenhar();
    return caixa;
  };

  // Bloco recolhível com o nome da parte do site
  const bloco = (id, titulo, onde, filhos) => {
    const det = el('details', { class: 'cartao bloco' });
    det.open = abertos.has(id);
    det.addEventListener('toggle', () => {
      if (det.open) { abertos.add(id); ajustar(det); } else abertos.delete(id);
    });
    const sum = el('summary');
    sum.append(el('span', { class: 'bloco-titulo' }, titulo), el('span', { class: 'bloco-onde' }, onde));
    const corpo = el('div', { class: 'bloco-corpo' });
    filhos.filter(Boolean).forEach((f) => corpo.append(f));
    det.append(sum, corpo);
    return det;
  };

  const NEGRITO = 'Para deixar uma palavra em negrito, escreva entre dois asteriscos: **STIJL**.';
  const LINHAS = 'Cada linha vira um parágrafo.';

  /* ---------- Aba Textos ---------- */

  const desenharTextos = (raiz) => {
    const { topo, fitas, sobre, produtos, videos, horarios, rodape } = c;
    raiz.textContent = '';
    raiz.append(
      bloco('topo', 'Topo do site', 'A primeira tela, ao lado da foto da Raquel', [
        campo('Palavra em letra cursiva', topo, 'script', { max: 24, exemplo: 'Colorista' }),
        campo('Resto do título', topo, 'serif', { max: 40, exemplo: 'de todas as cores' }),
        campo('Linha de especialidades', topo, 'especialidades', { max: 70, exemplo: 'Coloração · Mechas · Cores fantasia', dica: 'Aparece em letras pequenas, embaixo do título.' }),
        campo('Texto de apresentação', topo, 'texto', { max: 320, longo: true, dica: NEGRITO }),
      ]),
      bloco('fitas', 'Fitas com os serviços', 'As duas faixas cruzadas que passam embaixo do topo', [
        opcao('Mostrar as fitas no site', fitas, 'mostrar'),
        lista(fitas, 'escura', {
          titulo: 'Fita escura', max: 10, rotuloNovo: 'Adicionar na fita escura', novo: () => '',
          resumo: (v) => String(v || '').trim(),
          item: (itens, i) => [campo('Texto ' + (i + 1), itens, i, { max: 40 })],
        }),
        lista(fitas, 'clara', {
          titulo: 'Fita dourada', max: 12, rotuloNovo: 'Adicionar na fita dourada', novo: () => '',
          resumo: (v) => String(v || '').trim(),
          item: (itens, i) => [campo('Serviço ' + (i + 1), itens, i, { max: 40 })],
        }),
      ]),
      bloco('sobre', 'Sobre a Raquel', 'Ao lado das fotos da Raquel', [
        campo('Frase pequena acima do título', sobre, 'sobretitulo', { max: 60, exemplo: 'Prazer, eu sou a Raquel' }),
        campo('Título: parte em letra cursiva', sobre, 'script', { max: 24, exemplo: 'Sobre a' }),
        campo('Título: resto', sobre, 'serif', { max: 40, exemplo: 'Raquel' }),
        campo('Texto', sobre, 'texto', { max: 1500, longo: true, dica: LINHAS + ' ' + NEGRITO }),
        campo('Assinatura (em letra cursiva)', sobre, 'assinatura', { max: 60 }),
      ]),
      bloco('produtos', 'Produtos (STIJL)', 'A parte dos produtos usados no salão', [
        opcao('Mostrar esta parte no site', produtos, 'mostrar'),
        campo('Frase pequena acima do título', produtos, 'sobretitulo', { max: 60 }),
        campo('Título: parte em letra cursiva', produtos, 'script', { max: 24 }),
        campo('Título: resto', produtos, 'serif', { max: 40 }),
        campo('Texto', produtos, 'texto', { max: 400, longo: true, dica: NEGRITO }),
        campo('Nome da linha', produtos, 'linha', { max: 60, exemplo: 'Linha Hydra Glow · Hidra Brilho' }),
        lista(produtos, 'itens', {
          titulo: 'Produtos', max: 12, rotuloNovo: 'Adicionar produto', novo: () => ({ nome: '', detalhe: '' }),
          resumo: (p) => String((p && p.nome) || '').trim(),
          item: (itens, i) => [
            campo('Nome do produto', itens[i], 'nome', { max: 60 }),
            campo('Detalhe (opcional)', itens[i], 'detalhe', { max: 80 }),
          ],
        }),
        campo('Texto do botão', produtos, 'botao', { max: 40, exemplo: 'Agendar um tratamento' }),
        aviso('A foto dos produtos fica na aba Fotos.'),
      ]),
      bloco('videos', 'Vídeos', 'O título e o texto da parte dos vídeos', [
        opcao('Mostrar os vídeos no site', videos, 'mostrar'),
        campo('Título: parte em letra cursiva', videos, 'script', { max: 24 }),
        campo('Título: resto', videos, 'serif', { max: 40 }),
        campo('Frase pequena embaixo do título', videos, 'subtitulo', { max: 60 }),
        campo('Texto embaixo dos vídeos', videos, 'texto', { max: 300, longo: true }),
        aviso('Os vídeos em si (adicionar, legenda, ordem) ficam na aba Fotos.'),
      ]),
      bloco('horarios', 'Horários e como chegar', 'O título e o aviso do quadro de horários', [
        campo('Frase pequena acima do título', horarios, 'sobretitulo', { max: 60, exemplo: 'Visite o salão' }),
        campo('Aviso em destaque', horarios, 'aviso', { max: 90, exemplo: 'Atendimento somente com horário agendado', dica: 'Aparece no quadro de horários e no menu do celular.' }),
        aviso('Os horários, o endereço e o WhatsApp ficam na aba Contato.'),
      ]),
      bloco('rodape', 'Rodapé', 'O fim da página', [
        campo('Frase embaixo do nome', rodape, 'descricao', { max: 200, longo: true }),
      ]),
    );
    // as galerias de fotos também têm textos: eles ficam junto das fotos
    raiz.append(aviso('Os títulos e textos de cada galeria de fotos ficam na aba Fotos, em "Textos da galeria".'));
  };

  /* ---------- Aba Dúvidas ---------- */

  const desenharDuvidas = (raiz) => {
    const d = c.duvidas;
    raiz.textContent = '';
    const cabeca = el('section', { class: 'cartao bloco-fixo' });
    cabeca.append(
      el('h2', {}, 'Título da parte'),
      opcao('Mostrar as perguntas no site', d, 'mostrar'),
      campo('Frase pequena acima do título', d, 'sobretitulo', { max: 60, exemplo: 'Tire suas dúvidas' }),
      campo('Título', d, 'titulo', { max: 60, exemplo: 'Perguntas frequentes' }),
      campo('Texto embaixo do título', d, 'intro', { max: 200 }),
    );
    const perguntas = el('section', { class: 'cartao bloco-fixo' });
    perguntas.append(
      el('h2', {}, 'Perguntas'),
      el('p', { class: 'bloco-desc' }, 'Toque numa pergunta para mudar o texto. A primeira já aparece aberta no site.'),
      lista(d, 'perguntas', {
        max: 25, rotuloNovo: 'Adicionar pergunta', recolher: true, novo: () => ({ pergunta: '', resposta: '' }),
        resumo: (q) => String((q && q.pergunta) || '').trim(),
        vazio: 'Nenhuma pergunta ainda.',
        item: (itens, i) => [
          campo('Pergunta', itens[i], 'pergunta', { max: 120 }),
          campo('Resposta', itens[i], 'resposta', { max: 1500, longo: true, dica: LINHAS + ' Comece a linha com um hífen (-) para fazer uma lista. ' + NEGRITO }),
        ],
      }),
      aviso('As perguntas "Onde fica o salão?" e "Qual é o horário de atendimento?" entram sozinhas, com os dados da aba Contato.'),
    );
    raiz.append(cabeca, perguntas);
  };

  /* ---------- Aba Contato ---------- */

  const desenharContato = (raiz) => {
    const k = c.contato;
    raiz.textContent = '';
    const zap = el('section', { class: 'cartao bloco-fixo' });
    const previaZap = el('p', { class: 'aviso-campo', 'aria-live': 'polite' });
    // guarda só os dígitos, com o 55 do Brasil na frente
    const numeroZap = (v) => {
      const d = digitos(v);
      return d.length === 10 || d.length === 11 ? '55' + d : d;
    };
    const mostrarPrevia = () => {
      const d = digitos(k.whatsapp);
      previaZap.textContent = /^55\d{10,11}$/.test(d)
        ? `Os botões "Agendar" abrem o WhatsApp ${telefone(d)}.`
        : 'Escreva o número com DDD, por exemplo (85) 98726-1704.';
    };
    zap.append(
      el('h2', {}, 'WhatsApp e redes'),
      campo('WhatsApp (com DDD)', k, 'whatsapp', {
        tipo: 'tel', modo: 'tel', max: 20, exemplo: '(85) 98726-1704',
        mostrar: (v) => telefone(digitos(v)),
        guardar: numeroZap,
        aoSair: numeroZap,
        aoDigitar: mostrarPrevia,
      }),
      previaZap,
      campo('Mensagem que já vem escrita no WhatsApp', k, 'mensagemPadrao', { max: 200, longo: true }),
      campo('Instagram (usuário)', k, 'instagram', { max: 60, exemplo: 'raquelmeloqueiroz', aoSair: (v) => usuario(v, 'instagram\\.com') }),
      campo('TikTok (usuário, opcional)', k, 'tiktok', { max: 60, aoSair: (v) => usuario(v, 'tiktok\\.com').replace(/^@/, '') }),
      campo('Canal no YouTube (link, opcional)', k, 'youtube', { tipo: 'url', modo: 'url', max: 300, exemplo: 'https://www.youtube.com/@...', aoSair: link }),
    );
    mostrarPrevia();

    const onde = el('section', { class: 'cartao bloco-fixo' });
    onde.append(
      el('h2', {}, 'Endereço'),
      campo('Cidade', k, 'cidade', { max: 40, exemplo: 'Fortaleza · CE', dica: 'Aparece no topo do site, ao lado do nome.' }),
      campo('Endereço completo', k, 'endereco', { max: 160, longo: true, dica: 'Usado no mapa e nos botões Google Maps, Waze e Uber.' }),
      campo('Link do Google Maps (opcional)', k, 'mapsUrl', { tipo: 'url', modo: 'url', max: 500, dica: 'Se ficar vazio, o mapa usa o endereço acima.', aoSair: link }),
    );

    const horas = el('section', { class: 'cartao bloco-fixo' });
    horas.append(
      el('h2', {}, 'Horário de atendimento'),
      el('p', { class: 'bloco-desc' }, 'Uma linha por dia (ou grupo de dias). Escreva "fechado" nos dias sem atendimento. O dia de hoje aparece destacado no site.'),
      lista(k, 'horarios', {
        max: 10, lado: true, rotuloNovo: 'Adicionar dia', novo: () => ({ dia: '', horario: '' }),
        resumo: (h) => String((h && h.dia) || '').trim(),
        vazio: 'Sem horários: o site mostra "Os horários serão publicados aqui em breve".',
        item: (itens, i) => [
          campo('Dia', itens[i], 'dia', { max: 40, exemplo: 'Terça-feira' }),
          campo('Horário', itens[i], 'horario', { max: 40, exemplo: '09:00 – 18:00' }),
        ],
      }),
    );

    const pag = el('section', { class: 'cartao bloco-fixo' });
    pag.append(
      el('h2', {}, 'Formas de pagamento'),
      el('p', { class: 'bloco-desc' }, 'Opcional. Se tiver alguma, aparece no quadro de horários e nas perguntas frequentes.'),
      lista(k, 'pagamento', {
        max: 8, rotuloNovo: 'Adicionar forma de pagamento', novo: () => '',
        resumo: (v) => String(v || '').trim(),
        item: (itens, i) => [campo('Forma de pagamento', itens, i, { max: 50, exemplo: 'Pix' })],
      }),
    );

    const google = el('section', { class: 'cartao bloco-fixo' });
    google.append(
      el('h2', {}, 'Avaliações no Google'),
      el('p', { class: 'bloco-desc' }, 'Opcional. Com o link, aparece o botão "Me avalie". Com a nota, aparece um selo sobre a foto do topo.'),
      campo('Link do perfil no Google', k, 'google', { tipo: 'url', modo: 'url', max: 500, exemplo: 'https://g.page/r/.../review', aoSair: link }),
      campo('Nota no Google', k, 'notaGoogle', { max: 3, modo: 'decimal', exemplo: '5,0' }),
    );
    raiz.append(zap, onde, horas, pag, google);
  };

  return {
    normalizar,
    problemas,
    ajustar,
    desenhar(raizes, dados, mudou) {
      c = dados;
      aoMudar = mudou;
      desenharTextos(raizes.textos);
      desenharDuvidas(raizes.duvidas);
      desenharContato(raizes.contato);
    },
  };
})();
