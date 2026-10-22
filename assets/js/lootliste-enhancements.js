/* Shared navigation and progressive enhancements; does not replace page-specific logic. */
(() => {
  'use strict';
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';
  const root = '';
  const excluded = new Set(['index.html', 'admin.html']);
  if (!excluded.has(file) && !document.querySelector('.ll-global-nav')) {
    const links = [
      ['index.html', 'Lootliste'],
      ['submit.html', 'Item anbieten'],
      ['my-items.html', 'Meine Items'],
      ['my-claims.html', 'Meine Claims']
    ];
    const nav = document.createElement('nav');
    nav.className = 'll-global-nav';
    nav.setAttribute('aria-label', 'Hauptnavigation');
    const brand = document.createElement('a');
    brand.className = 'll-global-brand';
    brand.href = root + 'index.html';
    const logo = document.createElement('img');
    logo.src = root + 'img/logo_d2r.webp';
    logo.alt = '';
    logo.width = 30;
    logo.height = 30;
    const brandText = document.createElement('span');
    brandText.textContent = 'D2R Lootliste';
    brand.append(logo, brandText);
    const list = document.createElement('div');
    list.className = 'll-global-links';
    links.forEach(([href, label]) => {
      const a = document.createElement('a');
      a.href = root + href;
      a.textContent = label;
      if (href === file) a.setAttribute('aria-current', 'page');
      if (href === 'submit.html') a.className = 'll-nav-cta';
      list.appendChild(a);
    });
    nav.append(brand, list);
    document.body.insertBefore(nav, document.body.firstChild);
  }
  document.documentElement.classList.add('ll-enhanced');
  // Avoid accidental horizontal overflow from legacy fixed-width content.
  window.addEventListener('load', () => {
    document.querySelectorAll('img:not([width])').forEach(img => { img.style.maxWidth ||= '100%'; });
  }, { once: true });
})();
