const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
