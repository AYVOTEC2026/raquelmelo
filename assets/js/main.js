/* Raquel Melo Conceito de Beleza: interações do site.
   Os dados de contato vêm de assets/js/config.js. */
(() => {
  'use strict';

  const cfg = window.SITE_CONFIG || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    const dd = $('dd', row);
    dd.replaceChildren(...render());
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

  const footerIg = $('[data-footer-instagram]');
  if (footerIg && igUrl) {
    footerIg.href = igUrl;
    footerIg.target = '_blank';
    footerIg.rel = 'noopener';
    footerIg.hidden = false;
  }

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

  /* ---------- Cabeçalho ---------- */

  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

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
      // Começa a carregar um pouco antes de aparecer.
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
    let heroVisible = true;
    let contatoVisible = false;
    const update = () => mobileCta.classList.toggle('is-visible', !heroVisible && !contatoVisible);
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; update(); }).observe(heroActions);
    new IntersectionObserver(([e]) => { contatoVisible = e.isIntersecting; update(); }, { threshold: 0.1 }).observe(contato);
  }

  /* ---------- Ano no rodapé ---------- */

  $$('[data-ano]').forEach((n) => { n.textContent = String(new Date().getFullYear()); });
})();
