(async () => {
  const image = document.getElementById('hero-basin');
  if (!image) return;

  const products = [
    'A107', 'A109', 'A110', 'A114', 'A120', 'A125',
    'A134', 'A209', 'A216', 'A223', 'A311', 'A315'
  ];
  const isChinese = document.documentElement.lang.toLowerCase().startsWith('zh');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // The HTML image is always visible; enhancement failures leave it untouched.
  image.addEventListener('error', () => {
    image.src = '/assets/products/A107/card.webp';
  }, { once: true });
  try {
    await image.decode();
  } catch {
    if (image.complete && !image.naturalWidth) image.src = '/assets/products/A107/card.webp';
    return;
  }
  const frame = image.closest('.porcelain-frame');
  if (!frame || motion.matches) return;

  function animateFragments() {

    const fragments = document.createElement('div');
    fragments.className = 'hero-basin-fragments';
    fragments.setAttribute('aria-hidden', 'true');

    const rows = 3;
    const columns = 4;
    let pieceIndex = 0;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x0 = (column / columns) * 100;
        const x1 = ((column + 1) / columns) * 100;
        const y0 = (row / rows) * 100;
        const y1 = ((row + 1) / rows) * 100;
        const triangles = [
          `${x0}% ${y0}%, ${x1}% ${y0}%, ${x0}% ${y1}%`,
          `${x1}% ${y0}%, ${x1}% ${y1}%, ${x0}% ${y1}%`
        ];

        for (const polygon of triangles) {
          const fragment = document.createElement('img');
          const centerX = (x0 + x1) / 2;
          const centerY = (y0 + y1) / 2;
          const angle = Math.atan2(centerY - 50, centerX - 50) + (Math.random() - 0.5) * 0.9;
          const distance = 90 + Math.random() * 90;

          fragment.className = 'hero-basin-fragment';
          fragment.src = image.src;
          fragment.alt = '';
          fragment.decoding = 'async';
          fragment.style.clipPath = `polygon(${polygon})`;
          fragment.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
          fragment.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
          fragment.style.setProperty('--rz', `${(Math.random() - 0.5) * 90}deg`);
          fragment.style.setProperty('--scale', `${0.58 + Math.random() * 0.2}`);
          fragment.style.setProperty('--delay', `${0.03 + pieceIndex * 0.018 + Math.random() * 0.16}s`);
          fragments.appendChild(fragment);
          pieceIndex += 1;
        }
      }
    }

    frame.appendChild(fragments);
    window.setTimeout(() => {
      fragments.classList.add('is-fading');
    }, 1750);
    window.setTimeout(() => fragments.remove(), 2150);
  }

  animateFragments();
  // One optional change after the first screen has settled, only while visible.
  window.setTimeout(async () => {
    const bounds = frame.getBoundingClientRect();
    if (motion.matches || document.hidden || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
    let previous;
    try { previous = sessionStorage.getItem('chengdaHeroBasin'); } catch {}
    const choices = products.filter((code) => code !== 'A107' && code !== previous);
    const code = choices[Math.floor(Math.random() * choices.length)];
    const next = new Image();
    next.fetchPriority = 'low';
    next.src = `/assets/products/${code}/gallery/lead.webp`;
    try { await next.decode(); } catch { return; }
    if (motion.matches || document.hidden) return;
    image.src = next.src;
    image.alt = isChinese ? `程達 ${code} 陶瓷藝術盆` : `Chengda ${code} ceramic art basin`;
    image.dataset.product = code;
    try { sessionStorage.setItem('chengdaHeroBasin', code); } catch {}
    animateFragments();
  }, 8000);
})();
