const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function catalogData(html) {
  const start = html.indexOf('const CATS =');
  const end = html.indexOf('const params =', start);
  if (start < 0 || end < 0) throw new Error('Catalog data markers not found');
  return vm.runInNewContext(html.slice(start, end) + '\n({ CATS, TREES, TOILET_FLUSH, TOILET_FLUSH_MARKS, CAT_LABEL })', {}, {timeout:1000});
}

function build(html, chinese) {
  const {CATS, TREES, TOILET_FLUSH, TOILET_FLUSH_MARKS, CAT_LABEL} = catalogData(html);
  const prefix = chinese ? '/zh' : '';
  const config = {};
  const cards = [];
  const leaves = (node) => node.children?.length ? node.children.flatMap(leaves) : [node.id];
  for (const [cat, category] of Object.entries(CATS)) {
    const soon = cat === 'smart' || category.comingSoon;
    const items = soon ? [] : category.items.filter((item) => item.img);
    const groups = {all: items.map((item) => item.sub)};
    const labels = {all: CAT_LABEL[cat]};
    function walk(nodes) {
      for (const node of nodes || []) {
        groups[node.id] = leaves(node);
        labels[node.id] = node.label;
        walk(node.children);
      }
    }
    walk(TREES[cat]);
    for (const item of items) if (!groups[item.sub]) groups[item.sub] = [item.sub];
    const empty = chinese
      ? (soon ? `${CAT_LABEL[cat]}系列即將上線` : '此子分類即將上線') + ` —— <a href="${prefix}/contact/" style="color:var(--ink);text-decoration:underline;">查詢 OEM</a>。`
      : (soon ? `${CAT_LABEL[cat]} series — coming soon.` : 'This sub-category is coming soon.') + ` <a href="${prefix}/contact/" style="color:var(--ink);text-decoration:underline;">Enquire about OEM</a>.`;
    const subtitle = category.sub.map((text, index) => index === 0 && !soon
      ? text.replace(/^\d+/, String(items.length)) : text);
    config[cat] = { title: category.title, sub: subtitle, empty, groups: {} };
    for (const [id, subs] of Object.entries(groups)) {
      const matches = items.filter((item) => subs.includes(item.sub));
      const selectors = [...new Set(subs)].map((sub) => {
        if (!/^[\w-]+$/.test(cat) || !/^[\w-]+$/.test(sub)) throw new Error('Unsafe catalog ID');
        return `#grid > .pcard[data-catalog-cat="${cat}"][data-sub="${sub}"]`;
      });
      config[cat].groups[id] = {label:labels[id] || id, selector:selectors.join(',') || '#grid > .no-such-product', count:matches.length, images:matches.slice(0,3).map((item) => item.img)};
    }
    for (const item of items) {
      const code = escape(item.code);
      const name = item.name.startsWith(item.code + ' · ') ? item.name.slice(item.code.length + 3) : item.name;
      const flush = TOILET_FLUSH[item.code];
      const mark = TOILET_FLUSH_MARKS[item.code];
      const tag = flush ? `<span class="flush-tag">${escape(flush)}</span>` : '';
      const markHtml = mark ? `<img class="flush-mark flush-mark-${code.toLowerCase()}" src="${escape(mark)}" alt="${escape(flush)}${chinese ? '沖水標誌' : ' flushing mark'}" loading="lazy" decoding="async" />` : '';
      const dimensions = item.dims.split(/<br\s*\/?>/i).map(escape).join('<br>');
      cards.push(`<a class="pcard" data-code="${code}" data-catalog-cat="${cat}" data-sub="${escape(item.sub)}" href="${prefix}/products/${code}/"><div class="img"><img src="${escape(item.img)}" alt="${escape(item.name)}" loading="lazy" decoding="async" /></div><div class="info${mark ? ' has-flush-mark' : ''}"><div class="code">${code}</div><div class="name">${escape(name)}${tag}</div><div class="dims">${dimensions}</div>${markHtml}</div></a>`);
    }
  }
  const runtime = fs.readFileSync(path.join(root, 'assets/catalog-first-paint.js'), 'utf8');
  const head = `<!-- catalog-first-paint:start -->\n<script>\n${runtime}\ncatalogFirstPaint(${JSON.stringify(config).replace(/</g, '\\u003c')});\n</script>\n<!-- catalog-first-paint:end -->`;
  html = html.includes('<!-- catalog-first-paint:start -->')
    ? html.replace(/<!-- catalog-first-paint:start -->[\s\S]*?<!-- catalog-first-paint:end -->/, () => head)
    : html.replace('</head>', head + '\n</head>');
  const grid = `<!-- catalog-cards:start -->\n<div class="product-grid" id="grid">\n${cards.join('\n')}\n<div id="catalog-empty" class="grid-empty" style="grid-column:1/-1"></div>\n</div>\n<script>window.chengdaCatalogView?.paint();</script>\n<!-- catalog-cards:end -->`;
  html = html.includes('<!-- catalog-cards:start -->')
    ? html.replace(/<!-- catalog-cards:start -->[\s\S]*?<!-- catalog-cards:end -->/, () => grid)
    : html.replace('<div class="product-grid" id="grid"></div>', () => grid);
  const nav = Object.entries(CATS).map(([cat]) => `<a class="cat-node cat-row-0" href="?cat=${cat}">${escape(CAT_LABEL[cat])}</a>`).join('\n');
  html = html.replace(/<nav class="cat-tree" id="catNav">[\s\S]*?<\/nav>/, () => `<nav class="cat-tree" id="catNav">${nav}</nav>`);
  return html;
}

if (require.main === module) {
  for (const file of ['products/index.html', 'zh/products/index.html']) {
    const target = path.join(root, file);
    const old = fs.readFileSync(target, 'utf8');
    const updated = build(old, file.startsWith('zh/'));
    if (process.argv.includes('--check')) {
      if (updated !== old) throw new Error(`${file}: regenerate catalog with node tools/build-catalog-first-paint.cjs`);
    } else if (updated !== old) fs.writeFileSync(target, updated);
  }
}
module.exports = { build, catalogData };
