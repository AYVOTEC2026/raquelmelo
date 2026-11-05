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

  /* ---------- Contatos ---------- */

  const waDigits = String(cfg.whatsapp || '').replace(/\D/g, '');
  const igUser = String(cfg.instagram || '')
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[/?#].*$/, '');
  const address = String(cfg.endereco || '').trim();
  const hours = Array.isArray(cfg.horarios) ? cfg.horarios.filter(Boolean) : [];
  const mapsUrl = String(cfg.mapsUrl || '').trim() ||
    (address ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address) : '');
  const wazeUrl = address ? 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(address) : '';
  const igUrl = igUser ? 'https://www.instagram.com/' + igUser + '/' : '';

  const waUrl = (msg) =>
    'https://wa.me/' + waDigits + '?text=' + encodeURIComponent(msg || cfg.mensagemPadrao || '');

  const formatPhone = (digits) => {
    const n = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
    if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    return '+' + digits;
  };

  // Sem WhatsApp configurado, os botões continuam levando à seção de contato.
  if (waDigits) {
    $$('[data-wa]').forEach((a) => {
      a.href = waUrl(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener';
    });
    const cta = $('[data-contato-cta]');
    if (cta) cta.hidden = false;
  }

  const fillContact = (key, render) => {
    const row = $(`[data-contato="${key}"]`);
    if (!row) return;
    $('dd', row).replaceChildren(...render());
    row.hidden = false;
  };

  if (waDigits) fillContact('whatsapp', () => [externalLink(waUrl(), formatPhone(waDigits))]);
  if (igUser) fillContact('instagram', () => [externalLink(igUrl, '@' + igUser)]);
  if (address) {
    fillContact('endereco', () => {
      const routes = el('span', { class: 'contato-rotas' });
      routes.append(externalLink(mapsUrl, 'Abrir no Google Maps'), externalLink(wazeUrl, 'Abrir no Waze'));
      return [el('span', {}, address), routes];
    });
  }
  if (hours.length) {
    fillContact('horarios', () => {
      const list = el('ul', { class: 'contato-horarios' });
      hours.forEach((h) => list.append(el('li', {}, h)));
      return [list];
    });
  }
  if (!waDigits && !igUser && !address && !hours.length) {
    const pending = $('[data-contato-pendente]');
    if (pending) pending.hidden = false;
  }

  $$('[data-footer-instagram]').forEach((a) => {
    if (!igUrl) return;
    a.href = igUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    a.hidden = false;
  });

  /* ---------- Dados estruturados (Google) ---------- */

  const abs = (path) => new URL(path, document.baseURI).href;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: 'Raquel Melo Conceito de Beleza',
    description: 'Coloração, loiros, morena iluminada, mechas em cabelo cacheado e tratamentos capilares sob medida.',
    url: abs('./'),
    image: abs('assets/img/raquel-melo-retrato-1000.jpg'),
    logo: abs('apple-touch-icon.png'),
  };
  if (waDigits) ld.telephone = '+' + waDigits;
  if (address) ld.address = { '@type': 'PostalAddress', streetAddress: address, addressCountry: 'BR' };
  if (igUrl) ld.sameAs = [igUrl];
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

  /* ---------- Botão fixo de agendamento no celular ---------- */

  const mobileCta = $('[data-mobile-cta]');
  const heroActions = $('.hero-actions');
  const contato = $('#contato');

  if (mobileCta && heroActions && contato && 'IntersectionObserver' in window) {
    let heroCtaVisible = true;
    let contatoVisible = false;
    const update = () => mobileCta.classList.toggle('is-visible', !heroCtaVisible && !contatoVisible);
    new IntersectionObserver(([e]) => { heroCtaVisible = e.isIntersecting; update(); }).observe(heroActions);
    new IntersectionObserver(([e]) => { contatoVisible = e.isIntersecting; update(); }, { threshold: 0.1 }).observe(contato);
  }

  $$('[data-ano]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });

  /* ==========================================================================
     Movimento 3D
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

  /* --- Cartela: mechas com física de mola (balançam com o mouse, o toque e a rolagem) --- */

  const strands = motion && cartela ? $$('.mecha', cartela).map((node, i, all) => {
    const fromCenter = Math.abs(i - (all.length - 1) / 2);
    return { node, az: 0, vz: 0, ax: 0, vx: 0, z: Math.round(-6 - fromCenter * 14), gain: 0.8 + ((i * 7) % 5) / 10 };
  }) : [];
  const tilt = { x: 0, y: 0, tx: 0, ty: 0, scroll: 0 };
  let heroLoop = 0;
  let heroVisible = true;
  let lastTime = 0;
  const STIFF = 34;
  const DAMP = 2.7;

  const heroFrame = (now) => {
    const dt = lastTime ? Math.min(0.033, (now - lastTime) / 1000) : 0.016;
    lastTime = now;
    let energy = 0;
    strands.forEach((s) => {
      s.vz += (-STIFF * s.az - DAMP * s.vz) * dt;
      s.az = clamp(s.az + s.vz * dt, -11, 11);
      s.vx += (-STIFF * s.ax - DAMP * s.vx) * dt;
      s.ax = clamp(s.ax + s.vx * dt, -18, 18);
      energy += Math.abs(s.az) + Math.abs(s.ax) + (Math.abs(s.vz) + Math.abs(s.vx)) * 0.05;
      s.node.style.transform = `translateZ(${s.z}px) rotateX(${s.ax.toFixed(2)}deg) rotateZ(${s.az.toFixed(2)}deg)`;
    });
    tilt.x += (tilt.tx - tilt.x) * 0.08;
    tilt.y += (tilt.ty - tilt.y) * 0.08;
    energy += Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y);
    cartela.style.transform =
      `perspective(1600px) rotateX(${(tilt.y - tilt.scroll).toFixed(2)}deg) rotateY(${tilt.x.toFixed(2)}deg)`;
    if (energy > 0.02 && heroVisible) {
      heroLoop = requestAnimationFrame(heroFrame);
    } else {
      heroLoop = 0;
      lastTime = 0;
    }
  };
  const kick = () => {
    if (!heroLoop && heroVisible && strands.length) heroLoop = requestAnimationFrame(heroFrame);
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

    // Hero: a cartela inclina para trás e as mechas reagem à velocidade da rolagem
    if (hero && strands.length) {
      const p = clamp(y / hero.offsetHeight, 0, 1);
      tilt.scroll = p * 16;
      heroCopy.style.transform = `translate3d(0, ${(p * 60).toFixed(1)}px, 0)`;
      heroCopy.style.opacity = (1 - p * 0.65).toFixed(3);
      if (heroVisible && Math.abs(vy) > 0.5) {
        const v = clamp(vy, -40, 40);
        strands.forEach((s, i) => {
          s.vx += v * 0.55 * s.gain;
          s.vz += v * 0.14 * (i % 2 ? 1 : -1) * s.gain;
        });
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
    $$('.split-text > p, .split-text > .btn, .section-head > p, .faq-intro > p, .servicos + .btn')
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

    $$('[data-reveal="swing"]').forEach((fig) => {
      fig.addEventListener('animationend', (e) => {
        if (e.target === fig && e.animationName === 'balanco') fig.classList.add('is-done');
      });
    });

    const pendantsOnScreen = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visiblePendants.add(e.target) : visiblePendants.delete(e.target)));
      requestFrame();
    });
    $$('.pendant').forEach((p) => pendantsOnScreen.observe(p));

    // Fotos inclinam e recebem luz sob o cursor
    if (finePointer) {
      $$('.pendant').forEach((fig) => {
        fig.addEventListener('pointermove', (e) => {
          if (!fig.classList.contains('is-done')) return;
          const r = fig.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
          const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
          fig.style.setProperty('--ry', (nx * 5).toFixed(2) + 'deg');
          fig.style.setProperty('--rx', (-ny * 3).toFixed(2) + 'deg');
          fig.style.setProperty('--sx', ((nx + 1) * 50).toFixed(1) + '%');
          fig.style.setProperty('--sy', ((ny + 1) * 50).toFixed(1) + '%');
          fig.classList.add('is-hover');
        });
        fig.addEventListener('pointerleave', () => {
          fig.style.setProperty('--rx', '0deg');
          fig.style.setProperty('--ry', '0deg');
          fig.classList.remove('is-hover');
        });
      });
    }

    // Cartela: o mouse passa pelas mechas e elas balançam; um toque também
    if (hero && strands.length) {
      const portrait = $('.cartela-retrato', cartela);
      if (portrait) portrait.style.transform = 'translateZ(28px)';
      let lastX = null;

      hero.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = hero.getBoundingClientRect();
        tilt.tx = (((e.clientX - r.left) / r.width) * 2 - 1) * 6;
        tilt.ty = -(((e.clientY - r.top) / r.height) * 2 - 1) * 3.5;
        if (lastX !== null) {
          const dx = e.clientX - lastX;
          strands.forEach((s) => {
            const sr = s.node.getBoundingClientRect();
            if (e.clientY < sr.top - 10 || e.clientY > sr.bottom + 24) return;
            const reach = sr.width / 2 + 30;
            const d = Math.abs(e.clientX - (sr.left + sr.width / 2));
            if (d > reach) return;
            const lever = clamp((e.clientY - sr.top) / sr.height, 0, 1);
            s.vz -= dx * 1.5 * (1 - d / reach) * (0.35 + lever) * s.gain;
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
      strands.forEach((s) => {
        s.node.addEventListener('pointerdown', () => {
          s.vz += (Math.random() < 0.5 ? -1 : 1) * 95;
          s.vx += 40;
          kick();
        });
      });

      new IntersectionObserver(([e]) => {
        heroVisible = e.isIntersecting;
        kick();
      }).observe(hero);
    }

    // Monograma 3D: carrega o three.js só quando a seção está chegando
    if (conceito && palco) {
      const canvas = $('[data-monograma3d]', palco);
      new IntersectionObserver((entries, obs) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        obs.disconnect();
        import('./monograma3d.min.js')
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
