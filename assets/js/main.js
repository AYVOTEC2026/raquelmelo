/* Raquel Melo Conceito de Beleza: interações do site.
   Os dados de contato vêm de assets/js/config.js. */
(() => {
  'use strict';

  const cfg = window.SITE_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // .anim é ligada no <head> só quando o navegador suporta e a pessoa não pediu menos movimento
  const motion = document.documentElement.classList.contains('anim');
  window.__animPronta = true;

  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
  };
  const externalLink = (href, text) => el('a', { href, target: '_blank', rel: 'noopener' }, text);

  /* ---------- Contatos (tudo vem de config.js; o que estiver vazio fica escondido) ---------- */

  const waDigits = String(cfg.whatsapp || '').replace(/\D/g, '');
  const igUser = String(cfg.instagram || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
  const address = String(cfg.endereco || '').trim();
  const hours = Array.isArray(cfg.horarios) ? cfg.horarios.filter(Boolean) : [];
  const pagamento = Array.isArray(cfg.pagamento) ? cfg.pagamento.filter(Boolean) : [];
  const googleUrl = String(cfg.google || '').trim();
  const notaGoogle = String(cfg.notaGoogle || '').trim();
  const mapsUrl = String(cfg.mapsUrl || '').trim() ||
    (address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) : '');
  const wazeUrl = address ? 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(address) : '';
  const uberUrl = address
    ? 'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=' + encodeURIComponent(address)
    : '';
  const igUrl = igUser ? 'https://www.instagram.com/' + igUser + '/' : '';

  const waUrl = (msg) =>
    'https://wa.me/' + waDigits + '?text=' + encodeURIComponent(msg || cfg.mensagemPadrao || '');

  const formatPhone = (digits) => {
    const n = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return '+' + digits;
  };
  const listaPt = (itens) => (itens.length <= 1 ? itens.join('') : itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1]);
  const icone = (id) => {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + id);
    svg.append(use);
    return svg;
  };

  // Sem WhatsApp configurado, os botões continuam levando à seção de contato.
  if (waDigits) {
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  // Instagram no cabeçalho e no rodapé
  $$('[data-instagram-link], [data-footer-instagram]').forEach((a) => {
    if (!igUrl) return;
    a.href = igUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.hidden = false;
  });

  // Selo com a nota do Google, sobre a foto do topo
  const notaEl = $('[data-nota-google]');
  if (notaEl && notaGoogle) {
    $('[data-nota-valor]', notaEl).textContent = notaGoogle;
    if (googleUrl) notaEl.href = googleUrl;
    else notaEl.removeAttribute('href');
    notaEl.setAttribute('aria-label', 'Nota ' + notaGoogle + ' no Google');
    notaEl.hidden = false;
  }

  // Horários: tabela com o dia de hoje em destaque
  const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const diasDoTexto = (texto) => {
    const t = semAcento(texto);
    const achados = DIAS.map((d, i) => ({ i, pos: t.indexOf(d) })).filter((x) => x.pos >= 0).sort((a, b) => a.pos - b.pos);
    if (achados.length === 2 && / a /.test(t.slice(achados[0].pos, achados[1].pos + 1))) {
      const intervalo = [];
      for (let i = achados[0].i; ; i = (i + 1) % 7) {
        intervalo.push(i);
        if (i === achados[1].i || intervalo.length > 7) break;
      }
      return intervalo;
    }
    return achados.map((x) => x.i);
  };
  const tabela = $('[data-horarios]');
  if (tabela && hours.length) {
    const hoje = new Date().getDay();
    const corpo = $('tbody', tabela);
    hours.forEach((linha) => {
      const i = linha.indexOf(':');
      const dia = i > 0 ? linha.slice(0, i).trim() : linha.trim();
      const hora = i > 0 ? linha.slice(i + 1).trim() : '';
      const tr = el('tr');
      tr.append(el('th', { scope: 'row' }, dia), el('td', {}, hora));
      if (diasDoTexto(dia).includes(hoje)) {
        tr.classList.add('is-hoje');
        tr.setAttribute('aria-current', 'date');
      }
      corpo.append(tr);
    });
    tabela.hidden = false;
    $('[data-horarios-vazio]').hidden = true;
  }

  if (address) {
    $('[data-endereco-texto]').textContent = address;
    $('[data-endereco-bloco]').hidden = false;
  }
  if (pagamento.length) {
    $('[data-pagamento-texto]').textContent = listaPt(pagamento) + '.';
    $('[data-pagamento-bloco]').hidden = false;
  }

  // Mapa: só carrega o Google Maps quando a pessoa pede (mais leve e sem enviar dados antes)
  const mapa = $('[data-mapa]');
  if (mapa) {
    const mapaTexto = $('[data-mapa-texto]', mapa);
    const mapaAbrir = $('[data-mapa-abrir]', mapa);
    if (address) {
      mapaTexto.textContent = address;
      mapaAbrir.hidden = false;
      mapaAbrir.addEventListener('click', () => {
        const quadro = el('iframe', {
          src: 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed',
          title: 'Mapa com o endereço do salão',
          loading: 'lazy',
          referrerpolicy: 'no-referrer-when-downgrade',
          allowfullscreen: '',
        });
        mapa.append(quadro);
        $('[data-mapa-capa]', mapa).hidden = true;
      });
    } else if (waDigits || igUser || hours.length) {
      mapaTexto.textContent = 'Raquel Melo Conceito de Beleza';
    }
  }

  // Botões de contato e rotas
  const botoes = $('[data-contato-botoes]');
  if (botoes) {
    const botao = (href, iconeId, titulo, sub) => {
      const a = el('a', { class: 'contato-botao', href, target: '_blank', rel: 'noopener' });
      const texto = el('span');
      texto.append(el('strong', {}, titulo), el('small', {}, sub));
      a.append(icone(iconeId), texto);
      botoes.append(a);
    };
    if (waDigits) botao(waUrl(), 'icon-whatsapp', 'WhatsApp', formatPhone(waDigits));
    else $('.contato-botao-destaque', botoes).hidden = true;
    if (igUrl) botao(igUrl, 'icon-instagram', 'Instagram', '@' + igUser);
    if (googleUrl) botao(googleUrl, 'icon-estrela', 'Avalie no Google', 'Conte como foi');
    if (address) {
      botao(mapsUrl, 'icon-pin', 'Google Maps', 'Ver a rota');
      botao(wazeUrl, 'icon-rota', 'Waze', 'Navegar até o salão');
      botao(uberUrl, 'icon-carro', 'Uber', 'Chamar um carro');
    }
    if (!botoes.children.length || botoes.querySelectorAll('a:not([hidden])').length === 0) botoes.hidden = true;
  }

  // Perguntas frequentes geradas a partir dos dados (como no site de referência)
  const faqLista = $('.faq-list');
  if (faqLista) {
    const pergunta = (titulo, montar) => {
      const d = el('details', { class: 'faq-item' });
      const r = el('div', { class: 'faq-answer' });
      montar(r);
      d.append(el('summary', {}, titulo), r);
      return d;
    };
    const extras = [];
    if (address) {
      extras.push(pergunta('Onde fica o salão?', (r) => {
        const p = el('p', {}, address + '. ');
        p.append(externalLink(mapsUrl, 'Abrir no Google Maps'), document.createTextNode(' ou '), externalLink(wazeUrl, 'no Waze'), document.createTextNode('.'));
        r.append(p);
      }));
    }
    if (hours.length) {
      extras.push(pergunta('Qual é o horário de atendimento?', (r) => {
        const ul = el('ul');
        hours.forEach((h) => ul.append(el('li', {}, h)));
        r.append(ul, el('p', {}, 'O atendimento é somente com horário marcado.'));
      }));
    }
    if (pagamento.length) {
      extras.push(pergunta('Quais são as formas de pagamento?', (r) => r.append(el('p', {}, listaPt(pagamento) + '.'))));
    }
    if (googleUrl) {
      extras.push(pergunta('Onde vejo as avaliações de outras clientes?', (r) => {
        const p = el('p', {}, 'No perfil do salão no Google: ');
        p.append(externalLink(googleUrl, 'ver as avaliações'), document.createTextNode('.'));
        r.append(p);
      }));
    }
    faqLista.prepend(...extras);
  }

  // Rodapé: onde estamos
  const onde = $('[data-footer-onde]');
  if (onde && (address || waDigits)) {
    if (address) onde.append(el('span', {}, address));
    if (address && waDigits) onde.append(el('br'));
    if (waDigits) onde.append(el('span', {}, 'WhatsApp ' + formatPhone(waDigits)));
    onde.hidden = false;
  }

  /* ---------- Dados estruturados (Google) ---------- */

  const abs = (path) => new URL(path, document.baseURI).href;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: 'Raquel Melo Conceito de Beleza',
    description: 'Todas as cores, dos tons naturais às cores fantasia: coloração, mechas, loiros e tratamentos capilares sob medida.',
    url: abs('./'),
    image: abs('assets/img/raquel-melo-retrato-1000.jpg'),
    logo: abs('apple-touch-icon.png'),
  };
  if (waDigits) ld.telephone = '+' + waDigits;
  if (address) ld.address = { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'BR' };
  if (igUrl) ld.sameAs = [igUrl];
  if (pagamento.length) ld.paymentAccepted = listaPt(pagamento);
  document.head.append(el('script', { type: 'application/ld+json' }, JSON.stringify(ld)));

  /* ---------- Menu do celular ---------- */

  const toggle = $('.menu-toggle');
  const menu = $('#menu-mobile');
  const label = $('.menu-toggle-label', toggle);

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Fechar' : 'Menu';
    menu.classList.toggle('is-open', open);
    menu.inert = !open;
    document.documentElement.classList.toggle('menu-open', open);
  };

  setMenu(false);
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) $('a', menu).focus({ preventScroll: true });
  });
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
    if (e.matches) setMenu(false);
  });

  /* ---------- Menu: destaca a seção que está na tela ---------- */

  const navLinks = $$('.site-nav a[href^="#"]');
  const linkFor = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
        const active = linkFor.get(entry.target.id);
        if (active) {
          active.classList.add('is-active');
          active.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- Vídeo: toca só quando está na tela ---------- */

  const video = $('[data-video]');
  const videoBtn = $('[data-video-toggle]');

  if (video && videoBtn) {
    video.muted = true;
    let pausedByUser = reduceMotion.matches;

    const syncButton = () => {
      const playing = !video.paused;
      videoBtn.dataset.state = playing ? 'playing' : 'paused';
      videoBtn.setAttribute('aria-label', playing ? 'Pausar vídeo' : 'Reproduzir vídeo');
    };
    video.addEventListener('play', syncButton);
    video.addEventListener('pause', syncButton);

    videoBtn.addEventListener('click', () => {
      if (video.paused) {
        pausedByUser = false;
        video.play().catch(() => {});
      } else {
        pausedByUser = true;
        video.pause();
      }
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries, obs) => {
        if (entries.some((e) => e.isIntersecting)) {
          video.preload = 'auto';
          obs.disconnect();
        }
      }, { rootMargin: '600px 0px' }).observe(video);

      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!pausedByUser) video.play().catch(() => {});
          } else if (!video.paused) {
            video.pause();
          }
        });
      }, { threshold: 0.35 }).observe(video);
    }
    syncButton();
  }

  /* ---------- Faixa de serviços: o conteúdo é duplicado para rolar sem emenda ---------- */

  $$('.faixa-trilho').forEach((t) => { t.innerHTML += t.innerHTML; });

  /* ---------- Carrossel de resultados (arrastar no celular, setas e pontos) ---------- */

  const carrossel = $('[data-carrossel]');
  if (carrossel) {
    const trilho = $('[data-carrossel-trilho]', carrossel);
    const itens = $$('.carrossel-item', trilho);
    const pontos = $('[data-carrossel-pontos]', carrossel);
    const anterior = $('[data-carrossel-anterior]', carrossel);
    const proximo = $('[data-carrossel-proximo]', carrossel);
    const visiveis = new Set();
    let atual = 0;

    const irPara = (i) => {
      const alvo = itens[clamp(i, 0, itens.length - 1)];
      trilho.scrollTo({ left: alvo.offsetLeft - itens[0].offsetLeft, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };
    const marcar = () => {
      const lista = [...visiveis].sort((a, b) => a - b);
      if (lista.length) atual = lista[0];
      $$('.carrossel-ponto', pontos).forEach((p, i) => p.setAttribute('aria-current', String(i === atual)));
      anterior.disabled = trilho.scrollLeft <= 4;
      proximo.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
    };

    itens.forEach((item, i) => {
      item.setAttribute('role', 'group');
      item.setAttribute('aria-roledescription', 'slide');
      item.setAttribute('aria-label', (i + 1) + ' de ' + itens.length);
      const ponto = el('button', { type: 'button', class: 'carrossel-ponto', 'aria-label': 'Ir para o resultado ' + (i + 1) });
      ponto.addEventListener('click', () => irPara(i));
      pontos.append(ponto);
    });
    anterior.addEventListener('click', () => irPara(atual - 1));
    proximo.addEventListener('click', () => irPara(atual + 1));

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          const i = itens.indexOf(e.target);
          if (e.isIntersecting) visiveis.add(i);
          else visiveis.delete(i);
        });
        marcar();
      }, { root: trilho, threshold: 0.6 });
      itens.forEach((item) => obs.observe(item));
    }
    let agendado = false;
    trilho.addEventListener('scroll', () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => { agendado = false; marcar(); });
    }, { passive: true });
    marcar();
  }

  /* ---------- Botão fixo de agendamento no celular ---------- */

  const mobileCta = $('[data-mobile-cta]');
  const heroActions = $('.hero-actions');
  const contato = $('#contato');

  if (mobileCta && heroActions && contato && 'IntersectionObserver' in window) {
    let heroCtaVisible = true;
    let contatoVisible = false;
    let provadorVisible = false; // o provador tem o próprio botão; o fixo sairia por cima da foto
    const update = () => mobileCta.classList.toggle('is-visible', !heroCtaVisible && !contatoVisible && !provadorVisible);
    new IntersectionObserver(([e]) => { heroCtaVisible = e.isIntersecting; update(); }).observe(heroActions);
    new IntersectionObserver(([e]) => { contatoVisible = e.isIntersecting; update(); }, { threshold: 0.1 }).observe(contato);
    const provadorSec = $('#provador');
    if (provadorSec) {
      new IntersectionObserver(([e]) => { provadorVisible = e.isIntersecting; update(); }, { threshold: 0.12 }).observe(provadorSec);
    }
  }

  $$('[data-ano]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });

  /* ---------- Provador de cores (WebGL + detecção de cabelo no aparelho) ---------- */

  const provSec = $('[data-provador]');
  if (provSec) {
    provSec.hidden = false;
    const tela = $('[data-provador-tela]', provSec);
    const canvas = $('[data-provador-canvas]', provSec);
    const status = $('[data-provador-status]', provSec);
    const nomeEl = $('[data-provador-nome]', provSec);
    const cta = $('[data-provador-cta]', provSec);
    const divisor = $('[data-provador-divisor]', provSec);
    const intensidade = $('[data-provador-intensidade]', provSec);
    const arquivo = $('[data-fonte-arquivo]', provSec);
    const btnDemo = $('[data-fonte="demo"]', provSec);
    const btnCamera = $('[data-fonte="camera"]', provSec);
    const btnCapturar = $('[data-provador-capturar]', provSec);
    const btnAjustar = $('[data-provador-ajustar]', provSec);
    const edicao = $('[data-provador-edicao]', provSec);
    const btnDesfazer = $('[data-provador-desfazer]', provSec);
    const cursor = $('[data-provador-cursor]', provSec);
    const diagTom = $('[data-diagnostico-tom]', provSec);
    const diagDica = $('[data-diagnostico-dica]', provSec);
    const rotuloArquivo = arquivo.closest('.provador-fonte');
    const marcado = $('.tom[aria-checked="true"]', provSec);
    const ui = {
      cor: marcado.dataset.cor, nome: marcado.dataset.nome, base: Number(marcado.dataset.base), tipo: marcado.dataset.tipo,
      tecnica: 'ombre', intens: 0.9, div: 0, semClarear: false, editando: false, pincel: 'add', tamanho: 18,
    };
    const NIVEL = ['preto', 'castanho escuríssimo', 'castanho escuro', 'castanho médio', 'castanho claro',
      'loiro escuro', 'loiro médio', 'loiro claro', 'loiro muito claro', 'loiro claríssimo'];
    // navegadores dentro de apps (Instagram, Facebook, TikTok) costumam bloquear a câmera
    const dentroDeApp = /Instagram|FBAN|FBAV|Line\/|TikTok|musical_ly/i.test(navigator.userAgent);
    let motor = null;
    let avisoTimer = 0;

    const aviso = (msg, segundos) => {
      clearTimeout(avisoTimer);
      status.textContent = msg || '';
      if (msg && segundos) avisoTimer = setTimeout(() => { status.textContent = ''; }, segundos * 1000);
    };
    const atualizarCta = () => {
      cta.dataset.wa = 'Olá, Raquel! Testei a cor ' + ui.nome + ' no provador do site e quero agendar uma avaliação.';
      if (waDigits) cta.href = waUrl(cta.dataset.wa);
    };

    // diagnóstico: tom atual (níveis 1 a 10) e quanto precisa clarear para a cor escolhida
    const atualizarDiagnostico = () => {
      if (!motor) return;
      const nivel = motor.nivel;
      if (!nivel) {
        diagTom.textContent = 'Não deu para medir o tom do cabelo nesta imagem.';
        diagDica.textContent = 'Use uma foto com o cabelo bem visível, com luz natural.';
        return;
      }
      const n = Math.max(1, Math.min(10, Math.round(nivel)));
      const quem = motor.fonte === 'demo' ? 'Tom da Raquel nesta foto' : 'Seu tom atual';
      diagTom.textContent = quem + ': ' + NIVEL[n - 1] + ', nível ' + n + ' (estimado pela imagem).';
      const delta = ui.base - n;
      let dica;
      if (ui.semClarear) {
        dica = delta >= 2
          ? 'Só com tinta, sem clarear antes, a cor fica bem mais discreta: é o que você vê agora.'
          : 'Só com tinta, sem clarear: o resultado fica perto do seu tom de base.';
      } else if (delta >= 2) {
        dica = 'Para chegar em ' + ui.nome.toLowerCase() + ', o fio precisa clarear cerca de ' + delta +
          ' tons antes (até o nível ' + ui.base + '). A Raquel avalia a técnica mais segura para você.';
        if (ui.tipo === 'fantasia') dica += ' Cores fantasia ficam mais vivas sobre fios bem claros.';
      } else if (delta <= -1) {
        dica = 'Escurecer é mais simples: a cor é depositada sobre o seu tom atual.';
      } else {
        dica = 'É uma cor próxima do seu tom atual, com um processo mais simples.';
      }
      diagDica.textContent = dica;
    };

    // grupos de opções: clique e setas do teclado
    const opcoes = (lista, aoEscolher) => {
      const escolher = (btn, foco) => {
        lista.forEach((b) => {
          const on = b === btn;
          b.setAttribute('aria-checked', String(on));
          b.tabIndex = on ? 0 : -1;
        });
        if (foco) btn.focus();
        aoEscolher(btn);
      };
      lista.forEach((b, i) => {
        b.addEventListener('click', () => escolher(b, false));
        b.addEventListener('keydown', (e) => {
          const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!d) return;
          e.preventDefault();
          escolher(lista[(i + d + lista.length) % lista.length], true);
        });
      });
    };
    opcoes($$('.tom', provSec), (b) => {
      ui.cor = b.dataset.cor;
      ui.nome = b.dataset.nome;
      ui.base = Number(b.dataset.base);
      ui.tipo = b.dataset.tipo;
      nomeEl.textContent = ui.nome;
      atualizarCta();
      atualizarDiagnostico();
      if (motor) motor.cor(ui.cor);
    });
    opcoes($$('[data-tecnica]', provSec), (b) => {
      ui.tecnica = b.dataset.tecnica;
      if (motor) motor.tecnica(ui.tecnica);
    });
    opcoes($$('[data-clarear]', provSec), (b) => {
      ui.semClarear = b.dataset.clarear === 'nao';
      if (motor) motor.semClarear(ui.semClarear);
      atualizarDiagnostico();
    });
    opcoes($$('[data-pincel]', provSec), (b) => { ui.pincel = b.dataset.pincel; });
    opcoes($$('[data-tamanho]', provSec), (b) => {
      ui.tamanho = Number(b.dataset.tamanho);
      cursor.style.setProperty('--pincel', ui.tamanho * 2 + 'px');
    });
    cursor.style.setProperty('--pincel', ui.tamanho * 2 + 'px');
    intensidade.addEventListener('input', () => {
      ui.intens = intensidade.value / 100;
      if (motor) motor.intensidade(ui.intens);
    });
    atualizarCta();

    // antes e depois
    const definirDivisor = (v) => {
      ui.div = clamp(v, 0, 1);
      tela.style.setProperty('--div', ui.div.toFixed(4));
      divisor.setAttribute('aria-valuenow', String(Math.round(ui.div * 100)));
      divisor.setAttribute('aria-valuetext', ui.div < 0.03 ? 'Depois' : Math.round(ui.div * 100) + '% antes');
      tela.classList.toggle('mostra-antes', ui.div > 0.18);
      if (motor) motor.divisor(ui.div);
    };
    divisor.addEventListener('keydown', (e) => {
      const passo = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 }[e.key];
      if (passo === undefined && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      if (e.key === 'Home') definirDivisor(0);
      else if (e.key === 'End') definirDivisor(1);
      else definirDivisor(ui.div + passo);
    });

    // ajuste fino da área do cabelo (pincel)
    const atualizarDesfazer = () => { btnDesfazer.disabled = !(motor && motor.podeDesfazer); };
    const definirEdicao = (on) => {
      if (on && (!motor || motor.fonte === 'camera')) return;
      ui.editando = on;
      btnAjustar.setAttribute('aria-pressed', String(on));
      edicao.hidden = !on;
      tela.classList.toggle('is-editando', on);
      if (!on) cursor.classList.remove('is-visivel');
      if (motor) motor.mostrarArea(on);
      if (on) definirDivisor(0);
      atualizarDesfazer();
    };
    btnAjustar.addEventListener('click', () => definirEdicao(!ui.editando));
    $('[data-provador-pronto]', provSec).addEventListener('click', () => definirEdicao(false));
    btnDesfazer.addEventListener('click', () => {
      if (!motor) return;
      motor.desfazer();
      atualizarDesfazer();
      atualizarDiagnostico();
    });
    $('[data-provador-restaurar]', provSec).addEventListener('click', () => {
      if (!motor) return;
      motor.restaurar();
      atualizarDesfazer();
      atualizarDiagnostico();
    });

    // na foto: o dedo/mouse move o divisor, ou pinta a área quando o ajuste está ligado
    let arrasto = null;
    const local = (e) => {
      const r = tela.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top, r.width];
    };
    const moverCursor = (e) => {
      const [x, y] = local(e);
      cursor.style.setProperty('--cx', x + 'px');
      cursor.style.setProperty('--cy', y + 'px');
      cursor.classList.add('is-visivel');
    };
    tela.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      arrasto = e.pointerId;
      try { tela.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const [x, y, w] = local(e);
      if (ui.editando && motor) {
        e.preventDefault();
        motor.pincel.inicio(x, y, ui.pincel, ui.tamanho);
        moverCursor(e);
      } else {
        definirDivisor(x / w);
      }
    });
    tela.addEventListener('pointermove', (e) => {
      if (ui.editando) moverCursor(e);
      if (arrasto !== e.pointerId) return;
      const [x, y, w] = local(e);
      if (ui.editando && motor) motor.pincel.mover(x, y);
      else definirDivisor(x / w);
    });
    const soltar = (e) => {
      if (arrasto !== e.pointerId) return;
      arrasto = null;
      if (ui.editando && motor) {
        motor.pincel.fim();
        atualizarDesfazer();
        atualizarDiagnostico();
      }
      if (e.pointerType !== 'mouse') cursor.classList.remove('is-visivel');
    };
    tela.addEventListener('pointerup', soltar);
    tela.addEventListener('pointercancel', soltar);
    tela.addEventListener('pointerleave', () => cursor.classList.remove('is-visivel'));

    // de onde vem a imagem: foto da Raquel, câmera ou foto enviada
    const marcarFonte = (nome) => {
      btnDemo.setAttribute('aria-pressed', String(nome === 'demo'));
      btnCamera.setAttribute('aria-pressed', String(nome === 'camera'));
      btnCamera.textContent = nome === 'camera' ? 'Parar câmera' : 'Usar minha câmera';
      btnCapturar.hidden = nome !== 'camera';
      rotuloArquivo.classList.toggle('is-ativa', nome === 'foto');
      btnAjustar.disabled = nome === 'camera';
      btnAjustar.title = nome === 'camera' ? 'Toque em "Capturar e ajustar" para ajustar a área' : '';
      if (nome === 'camera') definirEdicao(false);
      atualizarDesfazer();
      atualizarDiagnostico();
    };
    btnDemo.addEventListener('click', () => {
      if (!motor) return;
      motor.usarDemo();
      marcarFonte('demo');
    });
    btnCamera.addEventListener('click', async () => {
      if (!motor) return;
      if (motor.fonte === 'camera') {
        motor.pararCamera();
        marcarFonte('demo');
        return;
      }
      try {
        marcarFonte('camera');
        await motor.usarCamera();
        definirDivisor(0);
        atualizarDiagnostico();
      } catch (err) {
        motor.usarDemo();
        marcarFonte('demo');
        if (dentroDeApp) aviso('O navegador do app bloqueia a câmera. Toque em ··· e escolha "Abrir no navegador", ou envie uma foto.', 8);
        else if (err && err.name === 'NotAllowedError') aviso('A câmera não foi liberada. Você pode testar com uma foto sua.', 5);
        else aviso('Não foi possível abrir a câmera aqui. Tente enviar uma foto.', 5);
      }
    });
    btnCapturar.addEventListener('click', () => {
      if (!motor || !motor.capturar()) return;
      marcarFonte('foto');
      definirEdicao(true);
      aviso('Foto capturada. Se precisar, ajuste a área do cabelo.', 3);
    });
    arquivo.addEventListener('change', async () => {
      const f = arquivo.files && arquivo.files[0];
      arquivo.value = '';
      if (!f || !motor) return;
      try {
        definirEdicao(false);
        await motor.usarFoto(f);
        marcarFonte('foto');
        definirDivisor(0);
      } catch (_) {
        aviso('Não consegui abrir essa foto. Tente outra, de preferência de rosto.', 5);
      }
    });

    // carrega o motor só quando a seção está chegando; a câmera desliga quando a pessoa sai dela
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries, obs) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        import('./3d/provador.js')
          .then((m) => m.iniciarProvador(canvas, {
            foto: 'assets/img/provador-raquel.jpg',
            mascara: 'assets/img/provador-raquel-mascara.png',
            modelo: new URL('assets/models/hair_segmenter.tflite', document.baseURI).href,
            onStatus: (msg) => aviso(msg),
            onDiagnostico: () => atualizarDiagnostico(),
          }))
          .then((api) => {
            motor = api;
            motor.cor(ui.cor);
            motor.tecnica(ui.tecnica);
            motor.intensidade(ui.intens);
            tela.classList.add('is-pronto');
            atualizarDiagnostico();
            definirDivisor(motion ? 1 : 0.4);
            // revelação: o "depois" entra varrendo a foto quando ela aparece
            new IntersectionObserver(([e], o) => {
              if (!e.isIntersecting) return;
              o.disconnect();
              if (!motion) return;
              const inicio = performance.now();
              const anima = (agora) => {
                const t = Math.min(1, (agora - inicio) / 1500);
                const suave = 1 - Math.pow(1 - t, 3);
                if (arrasto === null && !ui.editando) definirDivisor(1 - suave * 0.6);
                if (t < 1 && arrasto === null && !ui.editando) requestAnimationFrame(anima);
              };
              requestAnimationFrame(anima);
            }, { threshold: 0.55 }).observe(tela);
          })
          .catch((err) => {
            console.warn('Provador de cores indisponível.', err && err.message);
            aviso('Este navegador não consegue abrir o provador. Tente pelo celular ou outro navegador.');
          });
      }, { rootMargin: '500px 0px' }).observe(provSec);

      new IntersectionObserver(([e]) => {
        if (!e.isIntersecting && motor && motor.fonte === 'camera') {
          motor.pararCamera();
          marcarFonte('demo');
        }
      }).observe(provSec);
    }
  }

  /* ==========================================================================
     Movimento 3D: tudo que pende balança, com o mouse, o toque e a rolagem
     ========================================================================== */

  const header = $('[data-header]');
  const hero = $('.hero');
  const cartela = $('.cartela');
  const heroCopy = $('.hero-copy');
  const conceito = $('[data-conceito]');
  const palco = $('[data-conceito-palco]');
  const state = { conceitoView: 0.5 };
  let acendeWords = [];
  const visiblePendants = new Set();

  // Separa um título em palavras; com "inner", cada palavra ganha uma camada que gira em 3D.
  const splitWords = (node, inner) => {
    const text = node.textContent.trim().replace(/\s+/g, ' ');
    node.setAttribute('aria-label', text);
    node.textContent = '';
    const words = text.split(' ');
    words.forEach((word, i) => {
      const w = el('span', { class: 'w', 'aria-hidden': 'true' });
      if (inner) {
        const wi = el('span', { class: 'wi' }, word);
        wi.style.setProperty('--wi', i);
        w.append(wi);
      } else {
        w.textContent = word;
      }
      node.append(w);
      if (i < words.length - 1) node.append(' ');
    });
    return $$('.w', node);
  };

  /* --- Pêndulos: cada peça pendurada tem uma mola (ângulos em graus) --- */

  const pendulos = [];
  const novoPendulo = (node, opcoes) => {
    const p = {
      node, ax: 0, ay: 0, az: 0, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0,
      pego: false, ativo: true, rigidez: 34, atrito: 2.7, maxX: 30, maxZ: 30,
      rolagem: 0, rolagemZ: 0, ganho: 1, escrever: () => {},
      ...opcoes,
    };
    pendulos.push(p);
    return p;
  };

  const tilt = { x: 0, y: 0, tx: 0, ty: 0, scroll: 0 };
  let laco = 0;
  let ultimoT = 0;

  const passo = (agora) => {
    const dt = ultimoT ? Math.min(0.033, (agora - ultimoT) / 1000) : 0.016;
    ultimoT = agora;
    let energia = 0;
    for (const p of pendulos) {
      if (!p.ativo && !p.pego) continue;
      if (!p.pego) {
        p.vz += (-p.rigidez * (p.az - p.tz) - p.atrito * p.vz) * dt;
        p.vx += (-p.rigidez * (p.ax - p.tx) - p.atrito * p.vx) * dt;
        p.vy += (-p.rigidez * (p.ay - p.ty) - p.atrito * p.vy) * dt;
        p.az = clamp(p.az + p.vz * dt, -p.maxZ, p.maxZ);
        p.ax = clamp(p.ax + p.vx * dt, -p.maxX, p.maxX);
        p.ay = clamp(p.ay + p.vy * dt, -p.maxX, p.maxX);
      }
      const e = Math.abs(p.az - p.tz) + Math.abs(p.ax - p.tx) + Math.abs(p.ay - p.ty) +
        (Math.abs(p.vz) + Math.abs(p.vx) + Math.abs(p.vy)) * 0.05;
      if (!p.pego && e < 0.01) {
        p.az = p.tz; p.ax = p.tx; p.ay = p.ty;
        p.vx = 0; p.vy = 0; p.vz = 0;
      }
      energia += p.pego ? 1 : e;
      p.escrever(p);
    }
    if (cartela && motion) {
      tilt.x += (tilt.tx - tilt.x) * 0.08;
      tilt.y += (tilt.ty - tilt.y) * 0.08;
      energia += Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y);
      cartela.style.transform =
        `perspective(1600px) rotateX(${(tilt.y - tilt.scroll).toFixed(2)}deg) rotateY(${tilt.x.toFixed(2)}deg)`;
    }
    if (energia > 0.02) {
      laco = requestAnimationFrame(passo);
    } else {
      laco = 0;
      ultimoT = 0;
    }
  };
  const kick = () => {
    if (!laco) laco = requestAnimationFrame(passo);
  };

  // Pegar com a mão: arrasta para os lados (balanço) e para cima (vem para a frente, em 3D)
  const pegavel = (p, { ignorar, limiteZ = 40, limiteX = 32, aoTocar } = {}) => {
    const node = p.node;
    node.dataset.pegar = '';
    p.maxZ = Math.max(p.maxZ, limiteZ);
    p.maxX = Math.max(p.maxX, limiteX);
    let id = null;
    let hx = 0;
    let hy = 0;
    let y0 = 0;
    let ang0 = 0;
    let az0 = 0;
    let ax0 = 0;
    let ultAz = 0;
    let ultAx = 0;
    let ultT = 0;
    let moveu = false;
    const angulo = (x, y) => (Math.atan2(x - hx, Math.max(24, y - hy)) * -180) / Math.PI;

    node.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || (ignorar && e.target.closest(ignorar))) return;
      if (node.matches('[data-reveal="swing"]') && !node.classList.contains('is-done')) return;
      const r = node.getBoundingClientRect();
      hx = r.left + r.width / 2;
      hy = r.top;
      y0 = e.clientY;
      ang0 = angulo(e.clientX, e.clientY);
      az0 = p.az;
      ax0 = p.ax;
      ultAz = p.az;
      ultAx = p.ax;
      ultT = performance.now();
      moveu = false;
      id = e.pointerId;
      p.pego = true;
      p.vx = 0;
      p.vz = 0;
      try { node.setPointerCapture(id); } catch (_) { /* ignore */ }
      node.classList.add('is-grabbed');
      kick();
    });
    node.addEventListener('pointermove', (e) => {
      if (!p.pego || e.pointerId !== id) return;
      const az = clamp(az0 + angulo(e.clientX, e.clientY) - ang0, -limiteZ, limiteZ);
      const ax = clamp(ax0 + (y0 - e.clientY) * 0.16, -limiteX, limiteX);
      const agora = performance.now();
      const dt = Math.max(0.008, (agora - ultT) / 1000);
      p.vz = p.vz * 0.3 + ((az - ultAz) / dt) * 0.7;
      p.vx = p.vx * 0.3 + ((ax - ultAx) / dt) * 0.7;
      p.az = az;
      p.ax = ax;
      ultAz = az;
      ultAx = ax;
      ultT = agora;
      if (Math.abs(az - az0) + Math.abs(ax - ax0) > 1.5) moveu = true;
    });
    const soltar = (e) => {
      if (!p.pego || (e && e.pointerId !== id)) return;
      p.pego = false;
      id = null;
      node.classList.remove('is-grabbed');
      if (performance.now() - ultT > 90) {
        p.vz *= 0.2;
        p.vx *= 0.2;
      }
      p.vz = clamp(p.vz, -420, 420);
      p.vx = clamp(p.vx, -420, 420);
      if (!moveu && aoTocar) aoTocar(p);
      kick();
    };
    node.addEventListener('pointerup', soltar);
    node.addEventListener('pointercancel', soltar);
    node.addEventListener('lostpointercapture', soltar);
  };

  /* --- Rolagem: um único laço por quadro --- */

  let lastY = window.scrollY;
  let ticking = false;

  const onFrame = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    header.style.setProperty('--progresso', max > 0 ? (y / max).toFixed(4) : '0');
    header.classList.toggle('is-scrolled', y > 8);
    if (!motion) return;

    const vy = y - lastY;
    lastY = y;

    // Hero: a cartela inclina para trás e o texto se afasta
    if (hero && cartela) {
      const p = clamp(y / hero.offsetHeight, 0, 1);
      tilt.scroll = p * 16;
      heroCopy.style.transform = `translate3d(0, ${(p * 60).toFixed(1)}px, 0)`;
      heroCopy.style.opacity = (1 - p * 0.65).toFixed(3);
      kick();
    }

    // Tudo que pende balança com o embalo da rolagem
    if (Math.abs(vy) > 0.5) {
      const v = clamp(vy, -40, 40);
      for (const p of pendulos) {
        if (!p.ativo || p.pego || !p.rolagem) continue;
        p.vx += v * p.rolagem * p.ganho;
        p.vz += v * p.rolagemZ * p.ganho;
      }
      kick();
    }

    // Fotos: profundidade (a imagem anda mais devagar que a moldura)
    visiblePendants.forEach((fig) => {
      if (!fig.querySelector('img')) return;
      const r = fig.getBoundingClientRect();
      const c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      fig.style.setProperty('--py', (-c * r.height * 0.045).toFixed(1) + 'px');
    });

    // Conceito: progresso da seção para o giro do monograma e para acender a frase
    if (conceito) {
      const r = conceito.getBoundingClientRect();
      const hh = header.offsetHeight;
      state.conceitoView = clamp((vh - r.top) / (r.height + vh), 0, 1);
      const pin = clamp((hh - r.top) / Math.max(1, r.height - (vh - hh)), 0, 1);
      const lit = pin * (acendeWords.length + 3) - 1.5;
      acendeWords.forEach((w, i) => w.style.setProperty('--o', (0.14 + 0.86 * clamp(lit - i, 0, 1)).toFixed(3)));
      palco.style.setProperty('--giro', ((state.conceitoView - 0.5) * 140).toFixed(1) + 'deg');
    }
  };

  const requestFrame = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onFrame);
    }
  };

  if (motion) {
    // Títulos e frase do conceito
    $$('[data-split]').forEach((h) => splitWords(h, true));
    const frase = $('[data-acende]');
    if (frase) acendeWords = splitWords(frase, false);

    // Textos que surgem suavemente, em sequência dentro de cada bloco
    $$('.split-text > p, .split-text > .btn, .section-head > p, .faq-intro > p, .servicos + .btn, .provador-painel > .lead, .provador-cartela, .provador-escolha, .provador-controles, .provador-cta')
      .forEach((n) => { n.dataset.reveal = 'fade'; });
    const order = new Map();
    $$('[data-reveal="fade"]').forEach((n) => {
      const i = order.get(n.parentElement) || 0;
      n.style.setProperty('--d', (160 + i * 110) + 'ms');
      order.set(n.parentElement, i + 1);
    });

    // Listas: índice só entre os itens visíveis
    $$('[data-reveal="cascade"]').forEach((list) => {
      let i = 0;
      Array.from(list.children).forEach((c) => { if (!c.hidden) c.style.setProperty('--ci', i++); });
    });

    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        reveal.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    $$('[data-split], [data-reveal]').forEach((n) => reveal.observe(n));

    /* Mechas do topo: passam o mouse, pegam, puxam e soltam */
    let strands = [];
    if (hero && cartela) {
      strands = $$('.mecha', cartela).map((node, i, all) => {
        const doCentro = Math.abs(i - (all.length - 1) / 2);
        const z = Math.round(-6 - doCentro * 14);
        const p = novoPendulo(node, {
          z, ganho: 0.8 + ((i * 7) % 5) / 10, rolagem: 0.5, rolagemZ: 0.13 * (i % 2 ? 1 : -1),
          escrever: (q) => {
            q.node.style.transform = `translateZ(${q.z}px) rotateX(${q.ax.toFixed(2)}deg) rotateZ(${q.az.toFixed(2)}deg)`;
          },
        });
        pegavel(p, {
          limiteZ: 45, limiteX: 34,
          aoTocar: (q) => { q.vz += (Math.random() < 0.5 ? -1 : 1) * 95; q.vx += 40; },
        });
        return p;
      });

      const retrato = $('.cartela-retrato', cartela);
      if (retrato) {
        const p = novoPendulo(retrato, {
          rigidez: 24, atrito: 3.4, rolagem: 0.12, rolagemZ: 0.03,
          escrever: (q) => {
            q.node.style.transform = `translateZ(28px) rotateX(${q.ax.toFixed(2)}deg) rotateZ(${q.az.toFixed(2)}deg)`;
          },
        });
        pegavel(p, { limiteZ: 16, limiteX: 18, aoTocar: (q) => { q.vz += 30; } });
        strands.push(p);
      }

      let lastX = null;
      hero.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = hero.getBoundingClientRect();
        tilt.tx = (((e.clientX - r.left) / r.width) * 2 - 1) * 6;
        tilt.ty = -(((e.clientY - r.top) / r.height) * 2 - 1) * 3.5;
        if (lastX !== null) {
          const dx = e.clientX - lastX;
          strands.forEach((s) => {
            if (s.pego || s.node.classList.contains('cartela-retrato')) return;
            const sr = s.node.getBoundingClientRect();
            if (e.clientY < sr.top - 10 || e.clientY > sr.bottom + 24) return;
            const reach = sr.width / 2 + 30;
            const d = Math.abs(e.clientX - (sr.left + sr.width / 2));
            if (d > reach) return;
            const lever = clamp((e.clientY - sr.top) / sr.height, 0, 1);
            s.vz -= dx * 1.5 * (1 - d / reach) * (0.35 + lever) * s.ganho;
          });
        }
        lastX = e.clientX;
        kick();
      });
      hero.addEventListener('pointerleave', () => {
        tilt.tx = 0;
        tilt.ty = 0;
        lastX = null;
        kick();
      });

      new IntersectionObserver(([e]) => {
        strands.forEach((s) => { s.ativo = e.isIntersecting; });
        kick();
      }).observe(hero);
    }

    /* Fotos: entram balançando; depois dá para pegar, puxar e soltar */
    $$('.pendant').forEach((fig) => {
      const p = novoPendulo(fig, {
        ativo: false, rigidez: 30, atrito: 3, rolagem: 0.2, rolagemZ: 0.04,
        escrever: (q) => {
          q.node.style.setProperty('--ax', q.ax.toFixed(2) + 'deg');
          q.node.style.setProperty('--ay', q.ay.toFixed(2) + 'deg');
          q.node.style.setProperty('--az', q.az.toFixed(2) + 'deg');
        },
      });
      let visivel = false;
      let pronto = false;
      const atualizar = () => { p.ativo = visivel && pronto; kick(); };
      fig.addEventListener('animationend', (e) => {
        if (e.target === fig && e.animationName === 'balanco') {
          fig.classList.add('is-done');
          pronto = true;
          atualizar();
        }
      });
      new IntersectionObserver(([e]) => {
        visivel = e.isIntersecting;
        if (visivel) visiblePendants.add(fig);
        else visiblePendants.delete(fig);
        atualizar();
        requestFrame();
      }).observe(fig);
      $$('img', fig).forEach((img) => img.setAttribute('draggable', 'false'));
      pegavel(p, {
        ignorar: '.video-toggle', limiteZ: 26, limiteX: 26,
        aoTocar: (q) => { q.vz += (Math.random() < 0.5 ? -1 : 1) * 60; },
      });

      if (finePointer) {
        fig.addEventListener('pointermove', (e) => {
          if (p.pego || !fig.classList.contains('is-done')) return;
          const r = fig.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          p.ty = nx * 6;
          p.tx = -ny * 4;
          fig.style.setProperty('--sx', ((nx + 1) * 50).toFixed(1) + '%');
          fig.style.setProperty('--sy', ((ny + 1) * 50).toFixed(1) + '%');
          fig.classList.add('is-hover');
          kick();
        });
        fig.addEventListener('pointerleave', () => {
          p.tx = 0;
          p.ty = 0;
          fig.classList.remove('is-hover');
          kick();
        });
      }
    });

    /* Serviços e etapas: balançam como etiquetas quando o mouse passa */
    $$('.servicos > .servico, .passos > .passo').forEach((row) => {
      const p = novoPendulo(row, {
        ativo: false, rigidez: 70, atrito: 6, maxX: 24,
        escrever: (q) => q.node.style.setProperty('--ax', q.ax.toFixed(2) + 'deg'),
      });
      row.addEventListener('animationend', (e) => {
        if (e.target === row && e.animationName === 'aba') {
          row.classList.add('is-done');
          p.ativo = true;
        }
      });
      if (finePointer) {
        row.addEventListener('pointerenter', () => {
          if (!p.ativo) return;
          p.vx -= 75;
          kick();
        });
      }
    });

    /* Moeda do rodapé: gira com a mão e para mostrando uma das faces */
    const moeda = $('[data-moeda]');
    if (moeda) {
      moeda.dataset.pegar = '';
      // passo: 180 para parar em qualquer face; 360 para parar sempre de frente (selo)
      const m = { ang: 0, vel: 0, pego: false, id: null, x: 0, t: 0, moveu: false, passo: 180 };
      let mLaco = 0;
      let mUlt = 0;
      const mPasso = (agora) => {
        const dt = mUlt ? Math.min(0.033, (agora - mUlt) / 1000) : 0.016;
        mUlt = agora;
        if (!m.pego) {
          m.ang += m.vel * dt;
          m.vel *= Math.pow(0.4, dt);
          if (Math.abs(m.vel) < 160) {
            const face = Math.round(m.ang / m.passo) * m.passo;
            m.vel += (face - m.ang) * 30 * dt;
            m.vel *= Math.pow(0.02, dt);
          }
        }
        moeda.style.setProperty('--giro-moeda', m.ang.toFixed(2) + 'deg');
        const face = Math.round(m.ang / m.passo) * m.passo;
        if (!m.pego && Math.abs(m.vel) < 0.5 && Math.abs(m.ang - face) < 0.3) {
          m.ang = face;
          m.vel = 0;
          moeda.style.setProperty('--giro-moeda', face + 'deg');
          mLaco = 0;
          mUlt = 0;
        } else {
          mLaco = requestAnimationFrame(mPasso);
        }
      };
      const mKick = () => { if (!mLaco) mLaco = requestAnimationFrame(mPasso); };
      moeda.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        m.pego = true;
        m.passo = 180;
        m.id = e.pointerId;
        m.x = e.clientX;
        m.t = performance.now();
        m.vel = 0;
        m.moveu = false;
        try { moeda.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        moeda.classList.add('is-grabbed');
        mKick();
      });
      moeda.addEventListener('pointermove', (e) => {
        if (!m.pego || e.pointerId !== m.id) return;
        const agora = performance.now();
        const dt = Math.max(0.008, (agora - m.t) / 1000);
        const d = (e.clientX - m.x) * 1.1;
        m.ang += d;
        m.vel = m.vel * 0.3 + (d / dt) * 0.7;
        m.x = e.clientX;
        m.t = agora;
        if (Math.abs(d) > 1) m.moveu = true;
      });
      const mSoltar = (e) => {
        if (!m.pego || (e && e.pointerId !== m.id)) return;
        m.pego = false;
        moeda.classList.remove('is-grabbed');
        if (!m.moveu) m.vel = 900;
        else if (performance.now() - m.t > 90) m.vel *= 0.2;
        mKick();
      };
      moeda.addEventListener('pointerup', mSoltar);
      moeda.addEventListener('pointercancel', mSoltar);
      moeda.addEventListener('lostpointercapture', mSoltar);
      // dá uma volta quando aparece pela primeira vez
      new IntersectionObserver(([e], obs) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        m.passo = 360;
        m.vel = 720;
        mKick();
      }, { threshold: 0.6 }).observe(moeda);
    }

    /* Monograma 3D: carrega o three.js só quando a seção está chegando */
    const aparelhoSimples = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.connection && navigator.connection.saveData);
    if (conceito && palco && !aparelhoSimples) {
      const canvas = $('[data-monograma3d]', palco);
      new IntersectionObserver((entries, obs) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        import('./3d/monograma3d.js')
          .then((m) => m.iniciarMonograma(canvas, {
            svgUrl: 'assets/img/logo-monogram.svg',
            getView: () => state.conceitoView,
          }))
          .then(() => palco.classList.add('is-3d'))
          .catch((err) => console.warn('Monograma 3D indisponível, usando a versão plana.', err && err.message));
      }, { rootMargin: '1200px 0px' }).observe(conceito);
    }
  }

  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  onFrame();
})();
