(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  const hasObserver = 'IntersectionObserver' in window;

  // Mobile menu: toggle, close on link click, outside click, Escape, or resize to desktop.
  if (toggle && nav) {
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && header && !header.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    window.matchMedia('(min-width: 860px)').addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  // Theme: follow the system until the visitor picks one, then remember it.
  // (The saved choice is applied by the inline script in <head> to avoid a flash.)
  const themeToggle = document.querySelector('.theme-toggle');
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');

  const syncTheme = () => {
    const theme = currentTheme();
    if (themeToggle) {
      themeToggle.dataset.mode = theme;
      const label = themeToggle.querySelector('.theme-toggle-text');
      if (label) label.textContent = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }
    // Keep the mobile browser chrome in step with the page background.
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (bg) {
      document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', bg));
    }
  };

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try {
        localStorage.setItem('theme', next);
      } catch (error) {
        // Storage unavailable: the choice still applies for this visit.
      }
      syncTheme();
    });
  }
  darkQuery.addEventListener('change', syncTheme);
  syncTheme();

  // Show the header divider once the page has scrolled.
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Highlight the nav link for the section currently being read.
  const navLinks = [...document.querySelectorAll('.nav-list a[href^="#"]')];
  if (hasObserver && navLinks.length) {
    const linkById = new Map(navLinks.map((link) => [link.getAttribute('href').slice(1), link]));
    const inView = new Set();

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) inView.add(entry.target.id);
        else inView.delete(entry.target.id);
      });
      // If two sections straddle the reading line, the later one wins.
      const active = [...linkById.keys()].filter((id) => inView.has(id)).pop();
      linkById.forEach((link, id) => {
        if (id === active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-40% 0px -55% 0px' }); // a thin band just above mid-screen

    linkById.forEach((link, id) => {
      const section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  // Fade content in as it scrolls into view. Skipped for reduced-motion visitors;
  // the hero is left alone so the first screen paints immediately.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hasObserver && !reduceMotion) {
    const targets = document.querySelectorAll(
      '.section-head, .card, .spotlight-copy, .spotlight-visual, .step, .faq-list, .cta-panel'
    );

    const REVEAL_MS = 600; // keep in step with .reveal.is-visible in styles.css
    const delays = new WeakMap();

    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        revealer.unobserve(el);
        el.classList.add('is-visible');
        // Hand the element back to its normal styles (e.g. card hover) on a timer.
        // transitionend is not used because it never fires if a transition is skipped.
        window.setTimeout(() => {
          el.classList.remove('reveal', 'is-visible');
          el.style.removeProperty('--reveal-delay');
        }, REVEAL_MS + (delays.get(el) || 0) + 100);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    targets.forEach((el) => {
      // Anything already on screen stays put: hiding it now would make it flicker.
      if (el.getBoundingClientRect().top < window.innerHeight) return;

      // Stagger items that sit side by side in a grid.
      let delay = 0;
      if (el.matches('.card, .step')) {
        delay = ([...el.parentElement.children].indexOf(el) % 3) * 70;
        el.style.setProperty('--reveal-delay', `${delay}ms`);
      }
      delays.set(el, delay);
      el.classList.add('reveal');
      revealer.observe(el);
    });
  }

  // Keep the copyright year current.
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
