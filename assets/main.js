(() => {
  'use strict';

  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  const backToTop = document.getElementById('back-to-top');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  function closeMenu() {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
    nav.classList.remove('is-open');
  }

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
      menuToggle.setAttribute('aria-expanded', String(opening));
      menuToggle.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', opening);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });
  }

  if (backToTop) {
    const updateButton = () => backToTop.classList.toggle('visible', window.scrollY > 450);
    window.addEventListener('scroll', updateButton, { passive: true });
    updateButton();
    backToTop.addEventListener('click', () => window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    }));
  }

  const FEED_URL = '/publication-feed/publications.json';
  const status = document.getElementById('feed-status');
  const latest = document.getElementById('latest-articles');
  const categories = ['articles', 'conference-abstracts', 'oral-communications', 'posters'];

  // Data is read but never added as HTML. textContent prevents injection from ORCID metadata.
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function safePublicationUrl(work) {
    if (typeof work.doi === 'string' && work.doi.trim()) {
      const doi = work.doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
      return `https://doi.org/${encodeURI(doi)}`;
    }
    if (typeof work.url === 'string') {
      try {
        const parsed = new URL(work.url);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
      } catch (_) { /* A malformed ORCID URL should not break the page. */ }
    }
    return 'https://vgmpaula.github.io/publication-feed/';
  }

  async function populatePublications() {
    if (!latest) return;
    try {
      const response = await fetch(FEED_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const feed = await response.json();
      if (!feed || !Array.isArray(feed.works)) throw new Error('Unexpected feed format');

      const counts = Object.fromEntries(categories.map((category) => [category, 0]));
      for (const work of feed.works) {
        if (Object.prototype.hasOwnProperty.call(counts, work.category)) counts[work.category] += 1;
      }
      for (const category of categories) {
        const counter = document.querySelector(`[data-stat="${category}"]`);
        if (counter) counter.textContent = String(counts[category]);
      }

      const articles = feed.works
        .filter((work) => work.category === 'articles' && work.title)
        .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0)
          || (Number(b.month) || 0) - (Number(a.month) || 0)
          || (Number(b.day) || 0) - (Number(a.day) || 0))
        .slice(0, 3);

      latest.replaceChildren();
      if (!articles.length) {
        latest.appendChild(element('p', 'feed-placeholder', 'No articles are currently listed in the public feed.'));
      }
      for (const work of articles) {
        const row = element('a', 'article-row');
        row.href = safePublicationUrl(work);
        row.target = '_blank';
        row.rel = 'noopener noreferrer';
        row.appendChild(element('span', 'article-year', work.year || '—'));
        const description = element('span', 'article-description');
        description.appendChild(element('span', 'article-title', work.title));
        const details = [work.venue, work.year].filter(Boolean).join(' · ');
        description.appendChild(element('span', 'article-venue', details || 'Research output'));
        row.appendChild(description);
        const arrow = element('span', 'article-arrow', '↗');
        arrow.setAttribute('aria-hidden', 'true');
        row.appendChild(arrow);
        latest.appendChild(row);
      }
      if (status) status.textContent = `${feed.works.length} public ORCID works · live feed`;
    } catch (_) {
      if (status) status.textContent = 'Publication feed temporarily unavailable';
      // Keep the link to the complete feed functional; never display invented numbers.
    }
  }

  populatePublications();
})();
