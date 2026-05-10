// Shared nav + footer renderer for porcelain site
(function(){
  const NAV = (active) => `
<header class="nav" id="nav">
  <div class="wrap nav-inner">
    <a href="/" class="brand">Chengda</a>
    <nav class="nav-menu">
      <a href="/"${active==='home'?' class="active"':''}>Home</a>
      <a href="/about/"${active==='about'?' class="active"':''}>About</a>
      <a href="/products/"${active==='products'?' class="active"':''}>Products</a>
      <a href="/oem/"${active==='oem'?' class="active"':''}>OEM</a>
      <a href="/blog/"${active==='blog'?' class="active"':''}>Blog</a>
      <a href="/contact/"${active==='contact'?' class="active"':''}>Contact</a>
    </nav>
    <a href="/contact/" class="nav-cta">Get a quote →</a>
    <button class="nav-burger" aria-label="Menu"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="nav-drawer" id="navDrawer">
  <a href="/">Home</a>
  <a href="/about/">About</a>
  <a href="/products/">Products</a>
  <a href="/oem/">OEM</a>
  <a href="/blog/">Blog</a>
  <a href="/contact/">Contact</a>
  <a href="/contact/">Get a quote →</a>
</div>`;
  const FOOTER = `
<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">Chengda</div>
        <p class="footer-tag">Vitreous china sanitaryware, shaped in porcelain. Made in Chaozhou since 1999.</p>
      </div>
      <div class="footer-col"><h4>Products</h4>
        <a href="/products/?cat=washbasin">Washbasin</a>
        <a href="/products/?cat=pedestal">Pedestal</a>
        <a href="/products/?cat=standard">Toilet</a>
        <a href="/products/?cat=smart">Smart Toilet</a>
      </div>
      <div class="footer-col"><h4>Company</h4>
        <a href="/about/">About</a>
        <a href="/oem/">OEM &amp; ODM</a>
        <a href="/blog/">Blog</a>
        <a href="/contact/">Contact</a>
      </div>
      <div class="footer-col"><h4>Contact</h4>
        <a href="mailto:13829094740@163.com">13829094740@163.com</a>
        <a href="tel:+8613829094740">+86 138 2909 4740</a>
        <a href="#">WeChat: Chengda_koi888</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2026 Guangdong Chengda Intelligent Tech.</span>
      <span>Chaozhou · Guangdong · China</span>
    </div>
  </div>
</footer>`;
  window.renderShell = function(active){
    const n = document.getElementById('shell-nav');
    const f = document.getElementById('shell-footer');
    if (n) n.outerHTML = NAV(active);
    if (f) f.outerHTML = FOOTER;
    const nav = document.getElementById('nav');
    if (nav) addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY>12));
    const b = document.querySelector('.nav-burger'); const d = document.getElementById('navDrawer');
    if (b && d) b.addEventListener('click', () => d.classList.toggle('open'));
  };
})();
