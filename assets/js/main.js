/* Raquel Melo Conceito de Beleza: interações do site.
   Os dados do salão vêm de assets/js/config.js; o que estiver vazio fica escondido. */
(() => {
  'use strict';

  const cfg = window.SITE_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const html = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mouseFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // .anim é ligada no <head> só quando o navegador suporta e a pessoa não pediu menos movimento
  const motion = html.classList.contains('anim');
  window.__animPronta = true;

  const el = (tag, attrs = {}, text) => {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text) node.textContent = text;
    return node;
  };
  const linkExterno = (href, text) => el('a', { href, target: '_blank', rel: 'noopener' }, text);
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
  const suave = () => (reduceMotion.matches ? 'auto' : 'smooth');

  /* ---------- Dados do salão ---------- */

  const texto = (v) => String(v || '').trim();
  const lista = (v) => (Array.isArray(v) ? v.map(texto).filter(Boolean) : []);
  const usuario = (v, dominio) => texto(v)
    .replace(new RegExp('^https?://(www\\.)?' + dominio + '/', 'i'), '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');

  const waDigits = texto(cfg.whatsapp).replace(/\D/g, '');
  const igUser = usuario(cfg.instagram, 'instagram\\.com');
  const tiktokUser = usuario(cfg.tiktok, 'tiktok\\.com').replace(/^@/, '');
  const address = texto(cfg.endereco);
  const cidade = texto(cfg.cidade);
  const hours = lista(cfg.horarios);
  const pagamento = lista(cfg.pagamento);
  const googleUrl = texto(cfg.google);
  const notaGoogle = texto(cfg.notaGoogle);
  const youtubeUrl = texto(cfg.youtube);

  const igUrl = igUser ? 'https://www.instagram.com/' + igUser + '/' : '';
  const tiktokUrl = tiktokUser ? 'https://www.tiktok.com/@' + tiktokUser : '';
  const mapsUrl = texto(cfg.mapsUrl) ||
    (address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) : '');
  const wazeUrl = address ? 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(address) : '';
  const uberUrl = address
    ? 'https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff%5Bformatted_address%5D=' + encodeURIComponent(address)
    : '';
  const waUrl = (msg) => 'https://wa.me/' + waDigits + '?text=' + encodeURIComponent(msg || cfg.mensagemPadrao || '');

  const telefone = (digits) => {
    const n = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return '+' + digits;
  };
  const listaPt = (itens) => (itens.length <= 1 ? itens.join('') : itens.slice(0, -1).join(', ') + ' e ' + itens[itens.length - 1]);

  // Sem WhatsApp configurado, os botões "Agendar" continuam levando aos horários.
  if (waDigits) {
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  $$('[data-instagram-link]').forEach((a) => {
    if (!igUrl) return;
    a.href = igUrl;
    a.hidden = false;
  });

  if (cidade) $$('[data-cidade-sufixo]').forEach((n) => { n.textContent = ' · ' + cidade; });

  // Nota do Google sobre a foto do topo
  const nota = $('[data-nota-google]');
  if (nota && notaGoogle) {
    $('[data-nota-valor]', nota).textContent = notaGoogle;
    if (googleUrl) nota.href = googleUrl;
    else nota.removeAttribute('href');
    nota.setAttribute('aria-label', 'Nota ' + notaGoogle + ' no Google');
    nota.hidden = false;
  }

  // Horários: tabela com o dia de hoje em destaque
  const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const diasDoTexto = (t0) => {
    const t = semAcento(t0);
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
      const td = el('td', {}, hora.charAt(0).toUpperCase() + hora.slice(1));
      if (/fechad/i.test(hora)) td.className = 'fechado';
      tr.append(el('th', { scope: 'row' }, dia), td);
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

  // Mapa: o Google Maps entra quando há endereço (carrega só perto da tela)
  const mapa = $('[data-mapa]');
  if (mapa && address) {
    const capa = $('[data-mapa-capa]', mapa);
    $('[data-mapa-texto]', mapa).textContent = address;
    const quadro = el('iframe', {
      src: 'https://www.google.com/maps?q=' + encodeURIComponent(address) + '&output=embed',
      title: 'Mapa com o endereço do salão',
      loading: 'lazy',
      referrerpolicy: 'no-referrer-when-downgrade',
      allowfullscreen: '',
    });
    quadro.addEventListener('load', () => { capa.hidden = true; });
    mapa.prepend(quadro);
  }

  // Atalhos de contato e rotas (como os botões da referência)
  const atalhos = $('[data-atalhos]');
  if (atalhos) {
    const atalho = (href, iconeId, titulo, sub, escuro) => {
      const a = el('a', { class: 'atalho' + (escuro ? ' atalho-escuro' : ''), href, target: '_blank', rel: 'noopener' });
      const bola = el('span', { class: 'atalho-icone' });
      bola.append(icone(iconeId));
      const t = el('span', { class: 'atalho-texto' });
      t.append(el('strong', {}, titulo), el('small', {}, sub));
      a.append(bola, t);
      atalhos.append(a);
    };
    if (waDigits) {
      atalho(waUrl(), 'icon-agenda', 'Agendar agora', 'Escolha seu horário', true);
      atalho(waUrl(), 'icon-whatsapp', 'WhatsApp', telefone(waDigits));
    }
    if (googleUrl) atalho(googleUrl, 'icon-estrela', 'Me avalie', 'Avalie no Google');
    if (igUrl) atalho(igUrl, 'icon-instagram', 'Instagram', '@' + igUser);
    if (address) {
      atalho(mapsUrl, 'icon-pin', 'Google Maps', 'Ver rota');
      atalho(wazeUrl, 'icon-rota', 'Waze', 'Navegar até nós');
      atalho(uberUrl, 'icon-carro', 'Uber', 'Ir de carro');
    }
    if (youtubeUrl) atalho(youtubeUrl, 'icon-youtube', 'YouTube', 'Nosso canal');
    if (tiktokUrl) atalho(tiktokUrl, 'icon-tiktok', 'TikTok', '@' + tiktokUser);
    atalhos.hidden = !atalhos.children.length;
  }

  // Perguntas que dependem dos dados entram na mesma ordem da referência
  const faq = $('[data-faq]');
  if (faq) {
    const pergunta = (titulo, montar) => {
      const d = el('details', { class: 'faq-item' });
      const r = el('div', { class: 'faq-resposta' });
      montar(r);
      d.append(el('summary', {}, titulo), r);
      return d;
    };
    const antes = [];
    if (address) {
      antes.push(pergunta('Onde fica o salão?', (r) => {
        const p = el('p', {}, address + '. ');
        p.append(linkExterno(mapsUrl, 'Ver no Google Maps'), document.createTextNode(' ou '), linkExterno(wazeUrl, 'abrir no Waze'), document.createTextNode('.'));
        r.append(p);
      }));
    }
    if (hours.length) {
      antes.push(pergunta('Qual é o horário de atendimento?', (r) => {
        const ul = el('ul');
        hours.forEach((h) => ul.append(el('li', {}, h)));
        r.append(ul, el('p', {}, 'O atendimento é somente com horário agendado.'));
      }));
    }
    faq.prepend(...antes);

    const depois = [];
    if (pagamento.length) {
      depois.push(pergunta('Quais formas de pagamento são aceitas?', (r) => r.append(el('p', {}, listaPt(pagamento) + '.'))));
    }
    if (googleUrl) {
      depois.push(pergunta('Onde vejo as avaliações de quem já foi?', (r) => {
        const p = el('p', {}, 'No perfil do salão no Google: ');
        p.append(linkExterno(googleUrl, 'ver as avaliações'), document.createTextNode('.'));
        r.append(p);
      }));
    }
    const servicos = $$('.faq-item', faq).find((d) => /servi[cç]os/i.test($('summary', d).textContent));
    if (servicos) servicos.after(...depois);
    else faq.append(...depois);

    // A primeira pergunta já vem aberta, como na referência
    const primeira = $('.faq-item', faq);
    if (primeira) primeira.open = true;
  }

  // Rodapé: onde estamos e botões
  const onde = $('[data-rodape-onde]');
  if (onde && (address || waDigits)) {
    if (address) {
      const p = $('[data-rodape-endereco]', onde);
      p.textContent = address;
      p.hidden = false;
    }
    if (waDigits) {
      const t = $('[data-rodape-telefone]', onde);
      t.textContent = telefone(waDigits);
      t.hidden = false;
    }
    onde.hidden = false;
  }
  const pilulas = $('[data-rodape-botoes]');
  if (pilulas) {
    const pilula = (href, iconeId, rotulo, escura) => {
      const a = el('a', { class: 'pilula' + (escura ? ' pilula-escura' : ''), href, target: '_blank', rel: 'noopener' });
      a.append(icone(iconeId), document.createTextNode(rotulo));
      pilulas.append(a);
    };
    if (waDigits) {
      pilula(waUrl(), 'icon-agenda', 'Agendar agora', true);
      pilula(waUrl(), 'icon-whatsapp', 'WhatsApp');
    }
    if (igUrl) pilula(igUrl, 'icon-instagram', 'Instagram');
    if (googleUrl) pilula(googleUrl, 'icon-estrela', 'Me avalie');
    if (address) {
      pilula(mapsUrl, 'icon-pin', 'Google Maps');
      pilula(wazeUrl, 'icon-rota', 'Waze');
    }
    if (youtubeUrl) pilula(youtubeUrl, 'icon-youtube', 'YouTube');
    if (tiktokUrl) pilula(tiktokUrl, 'icon-tiktok', 'TikTok');
    pilulas.hidden = !pilulas.children.length;
  }

  /* ---------- Dados estruturados (Google) ---------- */

  const abs = (path) => new URL(path, document.baseURI).href;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: 'Raquel Melo Conceito de Beleza',
    description: 'Colorista de todas as cores: coloração, mechas, loiros, morena iluminada, cores fantasia e tratamentos capilares sob medida.',
    url: abs('./'),
    image: abs('assets/img/raquel-melo-retrato-1000.jpg'),
    logo: abs('apple-touch-icon.png'),
  };
  if (waDigits) ld.telephone = '+' + waDigits;
  if (address) ld.address = { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'BR' };
  const perfis = [igUrl, youtubeUrl, tiktokUrl].filter(Boolean);
  if (perfis.length) ld.sameAs = perfis;
  if (pagamento.length) ld.paymentAccepted = listaPt(pagamento);
  document.head.append(el('script', { type: 'application/ld+json' }, JSON.stringify(ld)));

  /* ---------- Menu do celular ---------- */

  const botaoMenu = $('.menu-botao');
  const menu = $('#menu');
  const definirMenu = (aberto) => {
    botaoMenu.setAttribute('aria-expanded', String(aberto));
    botaoMenu.setAttribute('aria-label', aberto ? 'Fechar o menu' : 'Abrir o menu');
    menu.classList.toggle('is-aberto', aberto);
    menu.inert = !aberto;
    html.classList.toggle('menu-aberto', aberto);
  };
  definirMenu(false);
  botaoMenu.addEventListener('click', () => {
    const aberto = botaoMenu.getAttribute('aria-expanded') !== 'true';
    definirMenu(aberto);
    if (aberto) $('a', menu).focus({ preventScroll: true });
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) definirMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-aberto')) {
      definirMenu(false);
      botaoMenu.focus();
    }
  });
  window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) definirMenu(false); });

  /* ---------- Menu: destaca a seção que está na tela ---------- */

  const linksNav = $$('.nav a[href^="#"]');
  const linkDe = new Map(linksNav.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const espiao = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        linksNav.forEach((a) => { a.classList.remove('is-ativo'); a.removeAttribute('aria-current'); });
        const ativo = linkDe.get(entry.target.id);
        if (ativo) {
          ativo.classList.add('is-ativo');
          ativo.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => espiao.observe(s));
  }

  /* ---------- Fitas: o conteúdo é duplicado para rolar sem emenda ---------- */

  $$('.fita-trilho').forEach((t) => { t.innerHTML += t.innerHTML; });

  /* ---------- Carrosséis (arrastar, setas e teclado) ---------- */

  $$('[data-carrossel]').forEach((car) => {
    const trilho = $('[data-trilho]', car);
    const itens = Array.from(trilho.children);
    const anterior = $('[data-anterior]', car);
    const proximo = $('[data-proximo]', car);

    itens.forEach((item, i) => {
      item.setAttribute('role', 'group');
      item.setAttribute('aria-roledescription', 'slide');
      item.setAttribute('aria-label', (i + 1) + ' de ' + itens.length);
    });

    const passo = () => (itens[1] ? itens[1].offsetLeft - itens[0].offsetLeft : trilho.clientWidth);
    const atualizar = () => {
      car.classList.toggle('cabe', trilho.scrollWidth <= trilho.clientWidth + 2);
      anterior.disabled = trilho.scrollLeft <= 4;
      proximo.disabled = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
    };
    anterior.addEventListener('click', () => trilho.scrollBy({ left: -passo(), behavior: suave() }));
    proximo.addEventListener('click', () => trilho.scrollBy({ left: passo(), behavior: suave() }));

    let agendado = false;
    trilho.addEventListener('scroll', () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => { agendado = false; atualizar(); });
    }, { passive: true });
    window.addEventListener('resize', atualizar);
    atualizar();

    // No computador, dá para arrastar com o mouse
    if (mouseFino) {
      let inicioX = 0;
      let inicioScroll = 0;
      let arrastou = false;
      let ativo = false;
      trilho.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('button')) return;
        ativo = true;
        arrastou = false;
        inicioX = e.clientX;
        inicioScroll = trilho.scrollLeft;
      });
      window.addEventListener('pointermove', (e) => {
        if (!ativo) return;
        const dx = e.clientX - inicioX;
        if (!arrastou && Math.abs(dx) > 6) {
          arrastou = true;
          trilho.classList.add('is-arrastando');
        }
        if (arrastou) trilho.scrollLeft = inicioScroll - dx;
      });
      window.addEventListener('pointerup', () => {
        if (!ativo) return;
        ativo = false;
        if (arrastou) {
          // ao soltar, encaixa na foto mais próxima
          const alvo = Math.round(trilho.scrollLeft / passo()) * passo();
          trilho.classList.remove('is-arrastando');
          trilho.scrollTo({ left: alvo, behavior: suave() });
        }
      });
      trilho.addEventListener('click', (e) => {
        if (arrastou) { e.preventDefault(); e.stopPropagation(); arrastou = false; }
      }, true);
    }
  });

  /* ---------- Vídeos: toca sem som quando aparece na tela ---------- */

  const videos = $$('[data-video]');
  if (videos.length) {
    const visiveis = new Set();
    let controleManual = false; // depois que a pessoa toca no play, ela decide

    const autoTocar = () => {
      if (controleManual || reduceMotion.matches) return;
      const alvo = videos.find((v) => visiveis.has(v));
      videos.forEach((v) => {
        if (v === alvo) v.play().catch(() => {});
        else if (!v.paused) v.pause();
      });
    };

    videos.forEach((video) => {
      video.muted = true;
      const botao = $('[data-video-botao]', video.parentElement);
      const sinc = () => {
        const tocando = !video.paused;
        botao.dataset.estado = tocando ? 'tocando' : 'pausado';
        botao.setAttribute('aria-label', tocando ? 'Pausar vídeo' : 'Reproduzir vídeo');
      };
      video.addEventListener('play', sinc);
      video.addEventListener('pause', sinc);
      botao.addEventListener('click', () => {
        controleManual = true;
        if (video.paused) {
          videos.forEach((v) => { if (v !== video) v.pause(); });
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
      sinc();
    });

    if ('IntersectionObserver' in window) {
      const perto = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.preload = 'auto';
          perto.unobserve(e.target);
        });
      }, { rootMargin: '600px 0px' });
      const naTela = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visiveis.add(e.target);
          else {
            visiveis.delete(e.target);
            if (!e.target.paused) e.target.pause();
          }
        });
        autoTocar();
      }, { threshold: 0.6 });
      videos.forEach((v) => { perto.observe(v); naTela.observe(v); });
    }
  }

  /* ---------- Perguntas: abrir e fechar com suavidade ---------- */

  $$('.faq-item').forEach((d) => {
    const resumo = $('summary', d);
    const resposta = $('.faq-resposta', d);
    resumo.addEventListener('click', (e) => {
      if (reduceMotion.matches || !resposta.animate) return;
      e.preventDefault();
      if (d.classList.contains('is-fechando')) return;
      if (d.open) {
        d.classList.add('is-fechando');
        const anim = resposta.animate(
          [{ height: resposta.offsetHeight + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 300, easing: 'cubic-bezier(.4, 0, .2, 1)' },
        );
        anim.onfinish = () => { d.open = false; d.classList.remove('is-fechando'); };
      } else {
        d.open = true;
        resposta.animate(
          [{ height: '0px', opacity: 0 }, { height: resposta.offsetHeight + 'px', opacity: 1 }],
          { duration: 380, easing: 'cubic-bezier(.16, .84, .24, 1)' },
        );
      }
    });
  });

  /* ---------- Botão flutuante: aparece depois do botão do topo ---------- */

  const flutuante = $('[data-flutuante]');
  const ctaTopo = $('[data-hero-cta]');
  if (flutuante && ctaTopo && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => flutuante.classList.toggle('is-oculto', e.isIntersecting)).observe(ctaTopo);
  }

  /* ---------- Cabeçalho, marcas-d'água e foto do topo acompanham a rolagem ---------- */

  const topo = $('[data-topo]');
  const derivas = motion ? $$('[data-deriva]') : [];
  // a foto do topo desce devagar com a rolagem só no computador (no celular ela fica no fim do topo)
  const fotoArea = motion && window.matchMedia('(min-width: 1080px)').matches ? $('.hero-foto-area') : null;
  let rolagemAgendada = false;
  const aoRolar = () => {
    rolagemAgendada = false;
    const y = window.scrollY;
    topo.classList.toggle('is-rolado', y > 8);
    if (!motion) return;
    const vh = window.innerHeight;
    derivas.forEach((n) => {
      const r = n.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      n.style.setProperty('--deriva', (p * -48).toFixed(1) + 'px');
    });
    if (fotoArea && y < vh * 1.2) fotoArea.style.transform = `translate3d(0, ${Math.min(y * 0.07, 48).toFixed(1)}px, 0)`;
  };
  window.addEventListener('scroll', () => {
    if (rolagemAgendada) return;
    rolagemAgendada = true;
    requestAnimationFrame(aoRolar);
  }, { passive: true });
  aoRolar();

  /* ---------- Revelação ao rolar ---------- */

  if (motion) {
    const revelar = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visivel');
        revelar.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    $$('[data-revelar]').forEach((n) => revelar.observe(n));
  }

  /* ---------- Polaroids inclinam com o mouse ---------- */

  if (motion && mouseFino) {
    $$('.polaroid').forEach((p) => {
      p.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = p.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        p.classList.add('is-inclinando');
        p.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
        p.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
      });
      p.addEventListener('pointerleave', () => {
        p.classList.remove('is-inclinando');
        p.style.removeProperty('--rx');
        p.style.removeProperty('--ry');
      });
    });
  }

  /* ---------- Selo do topo: dá para girar com o mouse ---------- */

  const selo = $('[data-selo]');
  if (selo && motion && mouseFino) {
    const anel = $('.selo-anel', selo);
    let angulo = 0;
    let velocidade = 0;
    let ultimo = 0;
    let girando = false;
    let laco = 0;
    const anguloDe = (e) => {
      const r = selo.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };
    selo.classList.add('is-giravel');
    selo.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      cancelAnimationFrame(laco);
      girando = true;
      ultimo = anguloDe(e);
      selo.setPointerCapture(e.pointerId);
      selo.classList.add('is-girando');
    });
    selo.addEventListener('pointermove', (e) => {
      if (!girando) return;
      const a = anguloDe(e);
      let d = a - ultimo;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      ultimo = a;
      angulo += d;
      velocidade = d;
      anel.style.rotate = angulo.toFixed(1) + 'deg';
    });
    const soltar = () => {
      if (!girando) return;
      girando = false;
      selo.classList.remove('is-girando');
      const inercia = () => {
        velocidade *= 0.95;
        angulo += velocidade;
        anel.style.rotate = angulo.toFixed(1) + 'deg';
        if (Math.abs(velocidade) > 0.05) laco = requestAnimationFrame(inercia);
      };
      laco = requestAnimationFrame(inercia);
    };
    selo.addEventListener('pointerup', soltar);
    selo.addEventListener('pointercancel', soltar);
  }

  $$('[data-ano]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });
})();
