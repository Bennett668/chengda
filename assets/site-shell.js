// Shared nav + footer renderer for porcelain site (en + zh-Hant)
(function(){
  const ZH = location.pathname.startsWith('/zh/') || location.pathname === '/zh';
  const P = ZH ? '/zh' : '';

  const L = ZH ? {
    home:'首頁', about:'關於', products:'產品', oem:'OEM', blog:'文章', contact:'聯絡',
    cta:'索取報價', langSwitch:'EN', altPath: location.pathname.replace(/^\/zh/, '') || '/',
    footerTag:'瓷器衛浴，以瓷塑形。潮州，自 1999。',
    fProducts:'產品', fCompany:'公司', fContact:'聯絡',
    fWashbasin:'面盆', fPedestal:'柱盆', fToilet:'馬桶', fSmart:'智能馬桶',
    fOem:'OEM / ODM', fHours:'',
    copyr:'© 2026 廣東程達智能科技有限公司', addr:'潮州 · 廣東 · 中國'
  } : {
    home:'Home', about:'About', products:'Products', oem:'OEM', blog:'Blog', contact:'Contact',
    cta:'Get a quote →', langSwitch:'繁', altPath: '/zh' + (location.pathname === '/' ? '/' : location.pathname),
    footerTag:'Vitreous china sanitaryware, shaped in porcelain. Made in Chaozhou since 1999.',
    fProducts:'Products', fCompany:'Company', fContact:'Contact',
    fWashbasin:'Washbasin', fPedestal:'Pedestal', fToilet:'Toilet', fSmart:'Smart Toilet',
    fOem:'OEM &amp; ODM', fHours:'',
    copyr:'© 2026 Guangdong Chengda Intelligent Tech.', addr:'Chaozhou · Guangdong · China'
  };

  const NAV = (active) => `
<header class="nav" id="nav">
  <div class="wrap nav-inner">
    <a href="${P}/" class="brand">Chengda</a>
    <nav class="nav-menu">
      <a href="${P}/"${active==='home'?' class="active"':''}>${L.home}</a>
      <a href="${P}/about/"${active==='about'?' class="active"':''}>${L.about}</a>
      <a href="${P}/products/"${active==='products'?' class="active"':''}>${L.products}</a>
      <a href="${P}/oem/"${active==='oem'?' class="active"':''}>${L.oem}</a>
      <a href="${P}/blog/"${active==='blog'?' class="active"':''}>${L.blog}</a>
      <a href="${P}/contact/"${active==='contact'?' class="active"':''}>${L.contact}</a>
    </nav>
    <a href="${L.altPath}" class="lang-switch" aria-label="Switch language">${L.langSwitch}</a>
    <a href="${P}/contact/" class="nav-cta">${L.cta}</a>
    <button class="nav-burger" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="nav-drawer" id="navDrawer">
  <a href="${P}/">${L.home}</a>
  <a href="${P}/about/">${L.about}</a>
  <a href="${P}/products/">${L.products}</a>
  <a href="${P}/oem/">${L.oem}</a>
  <a href="${P}/blog/">${L.blog}</a>
  <a href="${P}/contact/">${L.contact}</a>
  <a href="${L.altPath}">${L.langSwitch}</a>
  <a href="${P}/contact/">${L.cta}</a>
</div>`;

  const FOOTER = `
<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">Chengda</div>
        <p class="footer-tag">${L.footerTag}</p>
      </div>
      <div class="footer-col"><h4>${L.fProducts}</h4>
        <a href="${P}/products/?cat=washbasin">${L.fWashbasin}</a>
        <a href="${P}/products/?cat=pedestal">${L.fPedestal}</a>
        <a href="${P}/products/?cat=standard">${L.fToilet}</a>
        <a href="${P}/products/?cat=smart">${L.fSmart}</a>
      </div>
      <div class="footer-col"><h4>${L.fCompany}</h4>
        <a href="${P}/about/">${L.about}</a>
        <a href="${P}/oem/">${L.fOem}</a>
        <a href="${P}/blog/">${L.blog}</a>
        <a href="${P}/contact/">${L.contact}</a>
      </div>
      <div class="footer-col"><h4>${L.fContact}</h4>
        <a class="cd-email-footer" data-u="13829094740" data-d="163" data-t="com" href="#">[ email ]</a>
        <a href="tel:+8613829094740">+86 138 2909 4740</a>
        <a href="#">WeChat: Chengda_koi888</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>${L.copyr}</span>
      <span>${L.addr}</span>
    </div>
  </div>
</footer>`;

  window.renderShell = function(active){
    // Language switch: prefer the page's declared hreflang alternate so that
    // blog articles (no path-mirrored counterpart) don't 404. Fall back to the
    // blind /zh transform already in L.altPath.
    try {
      const sel = ZH ? 'link[rel="alternate"][hreflang="en"]'
                     : 'link[rel="alternate"][hreflang="zh-Hant"], link[rel="alternate"][hreflang="zh-Hans"]';
      const alt = document.querySelector(sel);
      if (alt && alt.href) { const u = new URL(alt.href); L.altPath = u.pathname + u.search + u.hash; }
    } catch(e){}
    const n = document.getElementById('shell-nav');
    const f = document.getElementById('shell-footer');
    if (n) n.outerHTML = NAV(active);
    if (f) f.outerHTML = FOOTER;
    const nav = document.getElementById('nav');
    if (nav) addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY>12));
    const b = document.querySelector('.nav-burger'); const d = document.getElementById('navDrawer');
    if (b && d) {
      b.setAttribute('aria-expanded', 'false');
      b.setAttribute('aria-controls', 'navDrawer');
      b.addEventListener('click', () => {
        const open = d.classList.toggle('open');
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && d.classList.contains('open')) {
          d.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); b.focus();
        }
      });
    }

    // Skip-to-content link + main target (a11y 2.4.1 bypass blocks)
    if (!document.querySelector('.skip-link')) {
      const nav = document.getElementById('nav');
      let first = nav ? nav.nextElementSibling : null;
      while (first && first.id === 'navDrawer') first = first.nextElementSibling;
      if (first && !first.id) { first.id = 'main'; first.setAttribute('tabindex', '-1'); }
      const skip = document.createElement('a');
      skip.className = 'skip-link';
      skip.href = '#' + (first && first.id ? first.id : 'main');
      skip.textContent = ZH ? '跳至內容' : 'Skip to content';
      document.body.insertBefore(skip, document.body.firstChild);
    }

    // Email obfuscation: rebuild mailto links from data attributes
    document.querySelectorAll('.cd-email-footer').forEach(el => {
      const u = el.dataset.u, d = el.dataset.d, t = el.dataset.t;
      if (!u || !d || !t) return;
      const addr = u + '@' + d + '.' + t;
      el.href = 'mailto:' + addr;
      el.textContent = addr;
    });

    // Scroll-reveal: gentle fade + lift as sections enter the viewport.
    // Respects prefers-reduced-motion. Observer disconnects per-element after reveal.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && 'IntersectionObserver' in window) {
      const sel = 'section, .stats, .porcelain-frame, .card-grid > *, .hf-row, .bt-card, .b-card, .cap, .step, .p-card';
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('reveal-in');
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
      // Above-the-fold elements render instantly (no fade-in wait); only
      // below-fold sections get the scroll-reveal. Keeps first paint snappy.
      document.querySelectorAll(sel).forEach(t => {
        if (t.getBoundingClientRect().top < innerHeight) return;
        t.classList.add('reveal');
        io.observe(t);
      });
    }

    // Speculation Rules — prerender same-origin pages on hover so the
    // next click feels instant (Chrome). Other browsers ignore it.
    if (HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')
        && !document.getElementById('spec-rules')) {
      const sr = document.createElement('script');
      sr.type = 'speculationrules';
      sr.id = 'spec-rules';
      sr.textContent = JSON.stringify({
        prerender: [{ where: { href_matches: '/*' }, eagerness: 'conservative' }]
      });
      document.body.appendChild(sr);
    }
  };
})();
