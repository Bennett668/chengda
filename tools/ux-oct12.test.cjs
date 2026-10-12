const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const {catalogData, build} = require('./build-catalog-first-paint.cjs');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

for (const prefix of ['', 'zh/']) {
  test(prefix + 'flush marks preserve source identity and static/dynamic parity', () => {
    const html = read(prefix+'products/index.html');
    const map = catalogData(html).TOILET_FLUSH_MARKS;
    const groups = new Map();
    for (const [code, url] of Object.entries(map)) {
      const original = fs.readFileSync(path.join(root, `assets/products/${code}/flush-mark.png`));
      const hash = crypto.createHash('sha256').update(original).digest('hex');
      assert.equal(url, `/assets/products/flush-marks/${hash.slice(0,16)}.webp`);
      assert.ok(fs.statSync(path.join(root,url)).size < original.length);
      if (groups.has(hash)) assert.equal(groups.get(hash), url);
      groups.set(hash, url);
    }
    assert.equal(groups.size,15);
    assert.equal(map.T103,map.T105);
    assert.notEqual(map.T103,map.T104);
    assert.equal(build(html,!!prefix),html);
  });
  test(prefix + 'T201 thumbnails retain full-resolution gallery targets and drawing link', () => {
    const html = read(prefix+'products/T201/index.html');
    const buttons = [...html.matchAll(/<button[^>]*class="pd-thumb[^>]*data-src="([^"]+)"[^>]*><img src="([^"]+)"/g)];
    assert.equal(buttons.length,10);
    for (const [,full,thumb] of buttons) {
      assert.equal(thumb, full.replace('/T201/','/T201/thumbs/'));
      assert.ok(fs.statSync(path.join(root,thumb)).size < fs.statSync(path.join(root,full)).size);
    }
    assert.match(html, /href="\/assets\/products\/T201\/dimensions.webp"/);
    assert.match(html, /srcset="[^\"]+dimensions-720.webp 720w, [^\"]+dimensions-1440.webp 1440w"/);
    assert.match(html, /id="pd-main"[^>]+fetchpriority="high"/);
  });
  test(prefix + 'selection positioning coalesces rapid choices and is never run during initialization', () => {
    const html = read(prefix+'products/index.html');
    const source = html.slice(html.indexOf('let selectionScroll ='),html.indexOf('function selectNode('));
    const frames = [], scrolls = [];
    const context = {requestAnimationFrame:fn=>frames.push(fn), grid:{getBoundingClientRect:()=>({top:420})}, document:{getElementById:()=>({getBoundingClientRect:()=>({bottom:64})})},window:{scrollY:100,matchMedia:()=>({matches:false}),scrollTo:arg=>scrolls.push(arg)}};
    vm.runInNewContext(source,context);
    context.showSelectedProducts();context.showSelectedProducts();
    while(frames.length) frames.shift()();
    assert.equal(scrolls.length,1);
    assert.equal(scrolls[0].top,440);
    assert.equal(scrolls[0].behavior,'instant');
    assert.match(html,/filterToggle.focus\(\{preventScroll:true\}\)/);
    assert.doesNotMatch(html,/applyCatHeader\(\);\s*renderNav\(\);\s*renderGrid\(\);\s*showSelectedProducts/);
  });
}
