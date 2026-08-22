(() => {
  const image = document.getElementById('hero-basin');
  if (!image) return;

  const products = [
    'A107', 'A109', 'A110', 'A114', 'A120', 'A125',
    'A134', 'A209', 'A216', 'A223', 'A311', 'A315'
  ];
  const previous = sessionStorage.getItem('chengdaHeroBasin');
  const choices = products.filter((code) => code !== previous);
  const code = choices[Math.floor(Math.random() * choices.length)];
  const isChinese = document.documentElement.lang.toLowerCase().startsWith('zh');

  image.src = `/assets/products/${code}/gallery/lead.webp`;
  image.alt = isChinese
    ? `程達 ${code} 陶瓷藝術盆`
    : `Chengda ${code} ceramic art basin`;
  image.dataset.product = code;
  sessionStorage.setItem('chengdaHeroBasin', code);
})();
