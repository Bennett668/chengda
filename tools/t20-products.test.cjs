const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const { products } = require('./fixtures/t20-products.json');

test('T20 workbook data has 17 unique SKUs and reconciled loading estimates', () => {
  assert.equal(products.length, 17);
  assert.equal(new Set(products.map(p => p.sku)).size, 17);
  for (const p of products) {
    assert.deepEqual(p.carton, p.dimensions.map((n, i) => n + [20, 70, 85][i]));
    const volume = p.carton.reduce((a, b) => a * b, 1) / 1e9;
    assert.deepEqual(p.loading, [33.2, 67.7, 76.3].map(v => Math.floor(v * .85 / volume / 10) * 10));
    assert.equal(p.inches, p.dimensions.map(n => `${(n / 25.4).toFixed(1)}″`).join(' × '));
  }
});

for (const p of products) for (const lang of ['', 'zh/']) {
  test(`${lang}${p.sku}: specifications, drawings, video and catalog agree`, () => {
    const html = fs.readFileSync(path.join(root, lang, 'products', p.sku, 'index.html'), 'utf8');
    const dims = p.dimensions.join(' × ') + ' mm';
    assert.ok(html.includes(dims));
    assert.ok(html.includes(p.inches));
    assert.ok(html.includes(lang ? p.flushZh : p.flush));
    assert.ok(html.includes(p.roughIn.replace(/\s*\/\s*/g, ' / ') + ' mm'));
    const presentation = html.includes('class="pd-presentation"');
    if (presentation) {
      assert.doesNotMatch(html, /<table class="pd-loadtable">|<div class="pd-pack-img">/);
      assert.equal((html.match(/<div class="pd-col">/g) || []).length, 2);
    } else {
      const table = html.match(/<table class="pd-loadtable">([\s\S]*?)<\/table>/)[1];
      for (const [i, container] of ['20GP', '40GP', '40HQ'].entries()) {
        assert.ok(table.includes(`<td>${container}</td><td>${p.loading[i]} ${lang ? '件' : 'pcs'}</td>`));
      }
      assert.ok(html.includes('85%'));
    }
    assert.doesNotMatch(html, /5 KGS|5 公斤|Net Weight|淨重|3\/6|≤100|装柜|柜容/);
    assert.equal((html.match(/class="pd-lede"/g) || []).length, 2);
    assert.equal((html.match(/id="pd-video"/g) || []).length, 1);
    const standalone = html.includes('class="pd-film"');
    assert.equal((html.match(/data-media="video"/g) || []).length, standalone ? 0 : 1);
    const video = html.match(/<video\b[^>]*>/)[0];
    assert.match(video, /preload="none"/);
    if (standalone) {
      assert.doesNotMatch(video, /muted/);
      assert.ok(html.indexOf('class="pd-tech') < html.indexOf('id="product-video"'));
      assert.ok(html.indexOf('id="product-video"') < html.indexOf('class="pd-cols"'));
      assert.ok(html.includes('/assets/product-video-section.js?v=5'));
      assert.doesNotMatch(html, /class="pd-film-meta"/);
    } else assert.match(video, /muted/);
    assert.doesNotMatch(video, /\sautoplay|\ssrc=/);
    assert.match(video, new RegExp(`data-src="/assets/products/${p.sku}/${standalone ? 'video-with-audio' : 'video'}.mp4"`));
    assert.ok(html.includes(`href="/assets/products/${p.sku}/dimensions.webp"`));
    for (const match of html.matchAll(/(?:src|href|data-src)="(\/assets\/[^"?#]+)(?:[?#][^"]*)?"/g)) {
      assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
    }
    for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      if (match[0].includes('application/ld+json')) JSON.parse(match[1]);
      else new vm.Script(match[1]);
    }
    const structured = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1])).find(j => j['@type'] === 'Product');
    assert.equal(structured.sku, p.sku);
    assert.ok(structured.additionalProperty.some(prop => prop.name === 'Dimensions' && prop.value === dims));
    const catalog = fs.readFileSync(path.join(root, lang, 'products/index.html'), 'utf8');
    assert.ok(catalog.includes(`dims:"${dims}<br>${p.inches}"`));
    assert.ok(catalog.includes(`href="/${lang}products/${p.sku}/"`));
  });
}

test('Gallery loads video on demand and pauses it on photo navigation', () => {
  const element = (dataset = {}) => ({dataset, hidden: false, attrs: {}, events: {}, classList: {toggle() {}},
    addEventListener(name, fn) { this.events[name] = fn; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name]; }, focus() {},
  });
  const main = element(), error = element();
  const video = element({src: '/assets/products/T201/video.mp4'});
  video.pause = () => { video.paused = true; };
  video.play = () => { video.paused = false; return Promise.resolve(); };
  Object.defineProperty(video, 'src', {set(value) { this.attrs.src = value; }});
  const thumbs = [element({src:'card.webp',alt:'T201'}), element({media:'video'}), element({src:'hero.webp'})];
  const prev = element(), next = element(), docEvents = {}, windowEvents = {};
  const document = {hidden: false,
    getElementById: id => ({'pd-main': main, 'pd-video':video,'pd-video-error':error})[id],
    querySelectorAll: () => thumbs,
    querySelector: selector => selector.includes('prev') ? prev : next,
    addEventListener: (name, fn) => {docEvents[name] = fn;},
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/product-media.js'),'utf8'), {document, window:{addEventListener:(name,fn)=>{windowEvents[name]=fn;}}});
  assert.equal(video.getAttribute('src'), undefined);
  assert.equal(video.hidden, true);
  thumbs[1].events.click();
  assert.equal(video.getAttribute('src'), video.dataset.src);
  assert.equal(video.paused, false);
  assert.equal(main.hidden, true);
  thumbs[2].events.click();
  assert.equal(video.paused, true);
  assert.equal(video.hidden, true);
  assert.equal(main.src, 'hero.webp');
  prev.events.click();
  assert.equal(video.hidden, false);
  video.events.error();
  assert.equal(error.hidden, false);
  document.hidden = true;
  docEvents.visibilitychange();
  assert.equal(video.paused, true);
  thumbs[0].events.click();
  assert.equal(error.hidden, true);
});

test('Standalone video starts unmuted on click and remains independent of photos', async () => {
  const element = (dataset = {}) => ({dataset, hidden: false, attrs: {}, events: {}, classList: {toggle() {}},
    addEventListener(name, fn) { this.events[name] = fn; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getAttribute(name) { return this.attrs[name]; }, focus() {},
  });
  const main = element(), error = element(), start = element();
  const video = element({src: '/assets/products/T203/video-with-audio.mp4'});
  video.paused = true;
  video.muted = true;
  video.pause = () => { video.paused = true; };
  video.play = () => { video.paused = false; return Promise.resolve(); };
  Object.defineProperty(video, 'src', {set(value) { this.attrs.src = value; }});
  const thumbs = [element({src:'card.webp',alt:'T203'}), element({src:'hero.webp'})];
  const prev = element(), next = element(), docEvents = {}, windowEvents = {};
  const document = {hidden: false,
    getElementById: id => ({'pd-main': main, 'pd-video':video,'pd-video-error':error})[id],
    querySelectorAll: () => thumbs,
    querySelector: selector => ({'.pd-arrow.prev':prev,'.pd-arrow.next':next,'.pd-film-start':start})[selector],
    addEventListener: (name, fn) => {docEvents[name] = fn;},
  };
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/product-video-section.js'),'utf8'), {document, window:{addEventListener:(name,fn)=>{windowEvents[name]=fn;}}});
  assert.equal(video.getAttribute('src'), undefined);
  assert.equal(video.paused, true);
  await start.events.click();
  assert.equal(video.getAttribute('src'), video.dataset.src);
  assert.equal(video.muted, false);
  assert.equal(video.paused, false);
  assert.equal(video.controls, true);
  assert.equal(start.hidden, true);
  thumbs[1].events.click();
  assert.equal(main.src, 'hero.webp');
  assert.equal(video.hidden, false);
  assert.equal(video.paused, false);
  document.hidden = true;
  docEvents.visibilitychange();
  assert.equal(video.paused, true);
  video.events.error();
  assert.equal(error.hidden, false);
  windowEvents.pagehide();
});
