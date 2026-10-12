const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {catalogData} = require('./build-catalog-first-paint.cjs');

test('bilingual basin groups contain identical models and retain the art URL alias', () => {
  const read = lang => fs.readFileSync(path.join(__dirname, '..', lang, 'products/index.html'), 'utf8');
  const en = catalogData(read('')), zh = catalogData(read('zh/'));
  const leaves = node => node.children?.length ? node.children.flatMap(leaves) : [node.id];
  const walk = nodes => nodes.flatMap(node => [node, ...walk(node.children || [])]);
  assert.equal(en.CATS.washbasin.items.length, 132);
  assert.equal(zh.CATS.washbasin.items.length, 132);
  assert.equal(zh.CATS.art, undefined);
  for (const node of [{id:'all'}, ...walk(en.TREES.washbasin)]) {
    const ids = leaves(node);
    const codes = data => Array.from(data.CATS.washbasin.items.filter(item => node.id === 'all' || ids.includes(item.sub)).map(item => item.code));
    assert.deepEqual(codes(en), codes(zh), node.id);
  }
  for (const lang of ['', 'zh/']) {
    const html = read(lang);
    assert.match(html, /if\(cat==='art'\)\{cat='washbasin'/);
    assert.match(html, /hreflang="zh-Hant"/);
    assert.match(html, /rel="canonical" href="https:\/\/www.gdchengda.hk\/(?:zh\/)?products\/"/);
  }
});

for (const lang of ['', 'zh/']) {
  test(`${lang}toilet categories: T122 is wall-hung; T20 remains floor-standing`, () => {
    const html = fs.readFileSync(path.join(__dirname, '..', lang, 'products/index.html'), 'utf8');
    const source = html.slice(html.indexOf('const CATS ='), html.indexOf('const TOILET_FLUSH ='));
    const items = vm.runInNewContext(source + '\nCATS.standard.items');
    assert.equal(items.find(item => item.code === 'T122').sub, 'wall');
    assert.equal(items.filter(item => item.sub === 'wall').length, 23);
    assert.equal(items.filter(item => item.sub === 'floor').length, 17);
    for (let i = 201; i <= 217; i++) {
      assert.equal(items.find(item => item.code === `T${i}`).sub, 'floor');
    }
  });
}
