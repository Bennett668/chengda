// Inlined by build-catalog-first-paint.cjs before the body is parsed.
function catalogFirstPaint(config) {
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const params = new URLSearchParams(location.search);
  const style = document.createElement('style');
  style.id = 'catalog-selection';
  document.head.appendChild(style);
  let current;
  function select(cat, sub) {
    if (!own(config, 'art') && cat === 'art') { cat = 'washbasin'; sub = !sub || sub === 'all' ? 'g_above' : sub; }
    if (own(config, 'art') && cat === 'washbasin' && /^(A10|A20|A30|g_above)$/.test(sub)) { cat = 'art'; sub = sub === 'g_above' ? 'all' : sub; }
    if (!own(config, cat)) cat = 'washbasin';
    sub = sub || (cat === 'standard' ? 'floor' : 'all');
    const category = config[cat];
    const group = own(category.groups, sub) ? category.groups[sub] : null;
    const selector = group ? group.selector : '#grid > .no-such-product';
    current = { category, group, selector };
    // Only selectors generated from repository data enter CSS, never query strings.
    style.textContent = '#grid > .pcard{display:none}' + selector + '{display:block}' +
      '#catalog-empty{display:' + (group && group.count ? 'none' : 'block') + '}';
    paint();
  }
  function paint() {
    const title = document.getElementById('catTitle');
    if (!title) return;
    title.textContent = current.category.title;
    const toggleLabel = document.getElementById('catalog-filter-label');
    if (toggleLabel) toggleLabel.textContent = current.group
      ? `${current.group.label} (${current.group.count})` : current.category.title;
    const subtitle = document.getElementById('catSub');
    subtitle.replaceChildren(...current.category.sub.map((text) => {
      const span = document.createElement('span');
      span.textContent = text;
      return span;
    }));
    const empty = document.getElementById('catalog-empty');
    if (empty) empty.innerHTML = current.category.empty;
    document.querySelectorAll(current.selector).forEach((card, index) => {
      const image = card.querySelector('.img img');
      if (image && index < 3) {
        image.loading = 'eager';
        image.fetchPriority = index === 0 ? 'high' : 'auto';
      }
    });
  }
  window.chengdaCatalogView = { select, paint };
  document.documentElement.classList.add('catalog-enhanced');
  select(params.get('cat') || 'washbasin', params.get('sub'));
  // Start only the selected category's first row, not an unrelated default row.
  (current.group?.images || []).forEach((src, index) => {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = src;
    preload.fetchPriority = index === 0 ? 'high' : 'auto';
    document.head.appendChild(preload);
  });
}
