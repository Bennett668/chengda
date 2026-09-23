const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {build, catalogData} = require('./build-catalog-first-paint.cjs');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

for (const prefix of ['', 'zh/']) {
  const html = read(prefix + 'products/index.html');
  const data = catalogData(html);
  const config = JSON.parse(html.match(/catalogFirstPaint\((\{[^\n]+\})\);/)[1]);
  test(prefix + 'catalog is reproducible, crawlable and complete without script', () => {
    assert.equal(build(html, !!prefix), html);
    const cards = [...html.matchAll(/<a class="pcard" data-code="([^"]+)"/g)].map((m) => m[1]);
    const expected = Object.entries(data.CATS).filter(([cat]) => cat !== 'smart').flatMap(([,value]) => value.items.map((item) => item.code));
    assert.deepEqual(cards, Array.from(expected));
    assert.equal(cards.length, 269);
    assert.equal(new Set(cards).size, 269);
    for (const code of cards) assert.ok(fs.existsSync(path.join(root, prefix, 'products', code, 'index.html')));
    assert.match(html, /<button class="catalog-toggle"[^>]+aria-controls="catNav"/);
    assert.match(html, /cat-children:not\(\.open\) \{ display: none/);
    assert.match(config.standard.sub[0], /^40 /);
  });
  const leaves = (node) => node.children?.length ? node.children.flatMap(leaves) : [node.id];
  for (const [cat, value] of Object.entries(data.CATS)) {
    const cases = [{id:'all'}, ...(data.TREES[cat] || [])];
    const walk = (nodes) => nodes.flatMap((node) => [node, ...walk(node.children || [])]);
    for (const node of walk(cases)) {
      test(`${prefix}${cat}/${node.id} first-paint selection agrees with catalog`, () => {
        const matches = cat === 'smart' ? [] : value.items.filter((item) => node.id === 'all' || leaves(node).includes(item.sub));
        assert.equal(config[cat].groups[node.id].count, matches.length);
        assert.deepEqual(config[cat].groups[node.id].images, Array.from(matches.slice(0,3).map((item) => item.img)));
      });
    }
  }
  test(prefix + 'early runtime filters before DOMContentLoaded and prioritizes only selected images', () => {
    const nodes = [], context = {URLSearchParams, location:{search:'?cat=standard&sub=wall'}, window:{}, document:{
      documentElement:{classList:{add(){}}}, head:{appendChild(node){nodes.push(node);}},
      createElement(){return {};}, getElementById(){return null;}
    }};
    vm.runInNewContext(read('assets/catalog-first-paint.js') + '\ncatalogFirstPaint(' + JSON.stringify(config) + ');', context);
    assert.equal(nodes.filter((node) => node.as === 'image').length, 3);
    assert.ok(nodes.filter((node) => node.as === 'image').every((node) => /\/T10[123]\//.test(node.href)));
    assert.match(nodes[0].textContent, /data-sub="wall"/);
    context.window.chengdaCatalogView.select('standard', 'invalid"];body{display:none}');
    assert.doesNotMatch(nodes[0].textContent, /body/);
    context.window.chengdaCatalogView.select('__proto__', 'all');
    assert.match(nodes[0].textContent, /washbasin/);
    context.window.chengdaCatalogView.select('smart','all');
    assert.match(nodes[0].textContent, /catalog-empty\{display:block/);
  });
}

test('hero is visible without script and fixed preload matches initial image in both languages', () => {
  for (const prefix of ['', 'zh/']) {
    const html = read(prefix + 'index.html');
    const style = html.match(/\.hero #hero-basin \{([^}]+)\}/)[1];
    assert.match(style, /opacity: 1/);
    assert.doesNotMatch(html, /is-assembled/);
    const preload = html.match(/rel="preload" as="image" href="([^"]+)"/)[1];
    assert.equal(html.match(/id="hero-basin" src="([^"]+)"/)[1], preload);
    assert.match(html, /prefers-reduced-motion: reduce/);
    assert.doesNotMatch(html, /transparent-master\.png/);
  }
});

test('hero decode failure and reduced motion need neither storage nor animation', async () => {
  for (const mode of ['failure','reduced']) {
    const image = {src:'initial',addEventListener(){},decode:async()=>{if(mode==='failure')throw Error('offline');},closest:()=>({})};
    const context = {document:{getElementById:()=>image,documentElement:{lang:'en'}},window:{matchMedia:()=>({matches:mode==='reduced'}),setTimeout(){throw Error('No animation expected');}}};
    await vm.runInNewContext(read('assets/home-hero.js'),context);
    assert.equal(image.src,'initial');
  }
});

test('language switch preserves query, model and dynamic selection', () => {
  for (const [source, expected] of [
    ['/products/?cat=standard&sub=wall','/zh/products/?cat=standard&sub=wall'],
    ['/products/?cat=washbasin&sub=A20','/zh/products/?cat=art&sub=A20'],
    ['/zh/products/?cat=art&sub=A20','/products/?cat=washbasin&sub=A20'],
    ['/zh/products/?cat=art','/products/?cat=washbasin&sub=g_above'],
    ['/contact/?model=T201#inquiry','/zh/contact/?model=T201#inquiry']
  ]) {
    const location = new URL(source, 'https://www.gdchengda.hk');
    const links = [{}];
    const context = {URL,location,window:{},document:{querySelector:()=>null,querySelectorAll:()=>links}};
    vm.runInNewContext(read('assets/site-shell.js'),context);
    context.window.updateLanguageLinks();
    assert.equal(links[0].href,expected);
    if(source.startsWith('/products/')){
      context.location = new URL('/products/?cat=vanity&sub=VB05', location);
      context.window.updateLanguageLinks();
      assert.equal(links[0].href,'/zh/products/?cat=vanity&sub=VB05');
    }
  }
});
