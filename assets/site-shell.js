// Shared nav + footer renderer for porcelain site (en + zh-Hant)
(function(){
  const ZH = location.pathname.startsWith('/zh/') || location.pathname === '/zh';
  const P = ZH ? '/zh' : '';

  const L = ZH ? {
    home:'首頁', about:'關於', products:'產品', oem:'OEM', blog:'文章', videos:'影片', contact:'聯絡',
    cta:'索取報價', langSwitch:'EN', altPath: location.pathname.replace(/^\/zh/, '') || '/',
    footerTag:'瓷器衛浴，以瓷塑形。潮州，自 1999。',
    follow:'關注我們', waMsg:'您好，程達衛浴，我想了解你們的陶瓷衛浴產品。',
    fProducts:'產品', fCompany:'公司', fContact:'聯絡',
    fWashbasin:'面盆', fPedestal:'柱盆', fToilet:'馬桶', fVanity:'櫃盆',
    fOem:'OEM / ODM', fHours:'',
    copyr:'© 2026 廣東程達智能科技有限公司', addr:'潮州 · 廣東 · 中國'
  } : {
    home:'Home', about:'About', products:'Products', oem:'OEM', blog:'Blog', videos:'Videos', contact:'Contact',
    cta:'Get a quote →', langSwitch:'繁', altPath: '/zh' + (location.pathname === '/' ? '/' : location.pathname),
    footerTag:'Vitreous china sanitaryware, shaped in porcelain. Made in Chaozhou since 1999.',
    follow:'Follow us', waMsg:"Hi Chengda, I'm interested in your ceramic sanitaryware.",
    fProducts:'Products', fCompany:'Company', fContact:'Contact',
    fWashbasin:'Washbasin', fPedestal:'Pedestal', fToilet:'Toilet', fVanity:'Vanity Basin',
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
      <a href="${P}/videos/"${active==='videos'?' class="active"':''}>${L.videos}</a>
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
  <a href="${P}/videos/">${L.videos}</a>
  <a href="${P}/contact/">${L.contact}</a>
  <a href="${L.altPath}">${L.langSwitch}</a>
  <a href="${P}/contact/">${L.cta}</a>
</div>`;

  // Monoline brand glyphs (24x24, currentColor). WhatsApp path reused by the float button.
  const WA_PATH = '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>';
  const SOCIAL = [
    { k:'whatsapp', n:'WhatsApp', href:'https://wa.me/12132160960', svg:WA_PATH },
    { k:'tiktok', n:'TikTok', href:'https://www.tiktok.com/t/ZP8s3wpPg/', svg:'<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>' },
    { k:'facebook', n:'Facebook', href:'https://www.facebook.com/share/1BLtiFvWHG/', svg:'<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"/>' },
    { k:'instagram', n:'Instagram', href:'https://www.instagram.com/bennett66688', svg:'<path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227a3.81 3.81 0 01-.899 1.382 3.744 3.744 0 01-1.38.895c-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421a3.716 3.716 0 01-1.379-.899 3.644 3.644 0 01-.9-1.38c-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z"/>' },
    { k:'linkedin', n:'LinkedIn', href:'https://www.linkedin.com/in/benneet-young-6600b1417', svg:'<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>' }
  ];
  const SOCIAL_ROW = `
    <div class="footer-social">
      <span class="footer-social-label">${L.follow}</span>
      <div class="social-icons">
        ${SOCIAL.map(s=>`<a class="social-link" data-net="${s.k}" href="${s.href}" target="_blank" rel="noopener" aria-label="${s.n}"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${s.svg}</svg></a>`).join('')}
      </div>
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
        <a href="${P}/products/?cat=vanity">${L.fVanity}</a>
      </div>
      <div class="footer-col"><h4>${L.fCompany}</h4>
        <a href="${P}/about/">${L.about}</a>
        <a href="${P}/oem/">${L.fOem}</a>
        <a href="${P}/blog/">${L.blog}</a>
        <a href="${P}/contact/">${L.contact}</a>
      </div>
      <div class="footer-col"><h4>${L.fContact}</h4>
        <a class="cd-email-footer" data-u="chengdakoi168" data-d="gmail" data-t="com" href="#">[ email ]</a>
        <a href="tel:+8613829094740">+86 138 2909 4740</a>
        <a href="https://wa.me/12132160960" target="_blank" rel="noopener">WhatsApp: +1 (213) 216-0960</a>
        <a href="#">WeChat: Chengda_koi888</a>
      </div>
    </div>
    ${SOCIAL_ROW}
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

    // Floating WhatsApp button — primary inquiry channel, fixed on every page.
    if (!document.querySelector('.wa-float')) {
      const wa = document.createElement('a');
      wa.className = 'wa-float';
      wa.href = 'https://wa.me/12132160960?text=' + encodeURIComponent(L.waMsg);
      wa.target = '_blank'; wa.rel = 'noopener';
      wa.setAttribute('aria-label', 'WhatsApp');
      wa.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + WA_PATH + '</svg>';
      document.body.appendChild(wa);
    }
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

/* Dynamic TOC indicator + smooth-scroll (blog articles). Reacts to the .active
   class that the article's scroll-spy already toggles; no per-page edits needed. */
(function(){
  function initTocMotion(){
    var toc = document.querySelector('.toc ul');
    if (!toc) return;
    var nav = toc.closest('.toc');
    if (nav) nav.classList.add('has-indicator');
    var ind = document.createElement('span');
    ind.className = 'toc-indicator';
    toc.appendChild(ind);
    function move(){
      var a = toc.querySelector('a.active') || toc.querySelector('a');
      if (!a) return;
      ind.style.height = a.offsetHeight + 'px';
      ind.style.transform = 'translateY(' + a.offsetTop + 'px)';
    }
    // follow the .active toggling done by the article's scroll-spy
    var mo = new MutationObserver(move);
    toc.querySelectorAll('a').forEach(function(a){
      mo.observe(a, { attributes: true, attributeFilter: ['class'] });
    });
    window.addEventListener('resize', move, { passive: true });
    // smooth scroll on TOC click
    toc.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click', function(e){
        var t = document.getElementById(a.getAttribute('href').slice(1));
        if (t){ e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (history.replaceState) history.replaceState(null, '', '#' + t.id); }
      });
    });
    setTimeout(move, 60);
    move();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initTocMotion);
  else initTocMotion();
})();
