const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {catalogData} = require('./build-catalog-first-paint.cjs');
const {productFiles} = require('./product-page-files.cjs');
const root = path.resolve(__dirname, '..');
const entries = require('./measured-basins.json').products;
const mm = values => values.join(' \u00d7 ') + ' mm';
const inch = values => values.map(value => (value / 25.4).toFixed(1) + '\u2033').join(' \u00d7 ');

test('measured source contains only approved existing models and valid public facts', () => {
  assert.equal(Object.keys(entries).length, 20);
  for (const [code, entry] of Object.entries(entries)) {
    assert.match(code, /^(?:A|UB)\d+[A-Z0-9-]*$/);
    assert.deepEqual(Object.keys(entry), ['outerMm', 'innerMm', 'netWeightKg', 'drawings']);
    assert.ok(entry.drawings.length >= 1 && entry.drawings.length <= 2);
    for (const url of entry.drawings) {
      assert.ok(url.startsWith(`/assets/products/${code}/`));
      assert.ok(fs.existsSync(path.join(root, url.split('?')[0])));
    }
    assert.equal(entry.outerMm.length, 3);
    assert.equal(entry.innerMm.length, 3);
    entry.innerMm.forEach((value, index) => assert.ok(value > 0 && value <= entry.outerMm[index]));
    assert.ok(entry.netWeightKg > 0);
  }
  for (const code of ['UB0121', 'UB0510-1', 'UB0515-1', 'UB0517-1', 'UB0612-1']) assert.ok(!Object.hasOwn(entries, code));
});

test('published machine-readable model notes do not retain contradicted measured dimensions', () => {
  const text = fs.readFileSync(path.join(root, 'llms-full.txt'), 'utf8');
  assert.ok(text.includes('| UB0118-A | 465x340x200 | 420x290x155 |'));
  assert.ok(!text.includes('| UB0118-A | 455x345x200 |'));
  for (const code of ['UB0121-A', 'UB0124-D', 'UB0126', 'UB0316', 'UB0318', 'UB0424']) {
    const entry = entries[code];
    assert.ok(text.includes(`| ${code} | Outer ${entry.outerMm.join(' x ')} mm; inner ${entry.innerMm.join(' x ')} mm; net weight ${entry.netWeightKg} kg |`));
  }
});

for (const prefix of ['', 'zh/']) {
  const catalog = fs.readFileSync(path.join(root, prefix, 'products/index.html'), 'utf8');
  const cards = Object.values(catalogData(catalog).CATS).flatMap(category => Array.from(category.items));
  for (const [code, entry] of Object.entries(entries)) {
    test(`${prefix}${code} measured specifications agree in HTML, catalog and schema`, () => {
      const html = fs.readFileSync(path.join(root, prefix, 'products', code, 'index.html'), 'utf8');
      const labels = prefix ? ['\u5c3a\u5bf8', '\u5167\u5f91\u5c3a\u5bf8', '\u6de8\u91cd'] : ['Dimensions', 'Inner Dimensions', 'Net Weight'];
      for (const [index, values] of [entry.outerMm, entry.innerMm].entries()) {
        assert.ok(html.includes(`<div class="k">${labels[index]}</div><div class="v">${mm(values)}<span class="small">${inch(values)}</span></div>`));
      }
      const weight = entry.netWeightKg + (prefix ? ' \u516c\u65a4' : ' kg');
      assert.ok(html.includes(`<div class="k">${labels[2]}</div><div class="v">${weight}</div>`));
      const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      const product = schemas.find(value => value['@type'] === 'Product');
      assert.equal(product.sku, code);
      assert.equal(product.mpn, code);
      for (const url of entry.drawings) assert.ok(html.includes(`src="${url}"`));
      if (entry.drawings.length === 2 && html.includes('class="pd-tech-draws two"')) {
        assert.ok(html.includes('.pd-tech-draws.two {'));
        assert.ok(html.includes('.pd-tech-draws.two { grid-template-columns: minmax(0, 1fr); }'));
      }
      if (code === 'UB0124-D') {
        assert.ok(html.includes(`href="${entry.drawings[0]}"`));
        assert.ok(!html.includes('dimensions-20260918.webp'));
      }
      const expected = [mm(entry.outerMm), mm(entry.innerMm), weight];
      const names = prefix ? labels : ['Dimensions', 'Inner dimensions', 'Net weight'];
      names.forEach((name, index) => {
        const values = product.additionalProperty.filter(value => value.name.toLowerCase() === name.toLowerCase());
        assert.equal(values.length, 1);
        assert.equal(values[0].value, expected[index]);
      });
      const item = cards.filter(item => item.code === code);
      assert.equal(item.length, 1);
      assert.equal(item[0].dims, mm(entry.outerMm) + '<br>' + inch(entry.outerMm));
      assert.ok(html.includes(`rel="canonical" href="https://www.gdchengda.hk/${prefix}products/${code}/"`));
    });
  }
  test(`${prefix}legacy D links redirect to A without relabelling the unsuffixed model`, () => {
    const html = fs.readFileSync(path.join(root, prefix, 'products/UB0121-D/index.html'), 'utf8');
    const target = `/${prefix}products/UB0121-A/`;
    assert.ok(html.includes(`<meta http-equiv="refresh" content="0;url=${target}" />`));
    assert.ok(html.includes(`<link rel="canonical" href="https://www.gdchengda.hk${target}" />`));
    let redirected;
    const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
    vm.runInNewContext(script, {location: {search: '?ref=legacy', hash: '#specs', replace(value) {redirected = value;}}});
    assert.equal(redirected, target + '?ref=legacy#specs');
    assert.equal(cards.filter(item => item.code === 'UB0121-A').length, 1);
    assert.equal(cards.filter(item => item.code === 'UB0121').length, 1);
    assert.equal(cards.filter(item => item.code === 'UB0121-D').length, 0);
    const primary = productFiles();
    assert.ok(primary.includes(`${prefix}products/UB0121-A/index.html`));
    assert.ok(!primary.includes(`${prefix}products/UB0121-D/index.html`));
  });
}
