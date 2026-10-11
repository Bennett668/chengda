const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {build, catalogData} = require('./build-catalog-first-paint.cjs');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// User-confirmed correction, 2026-10-10: A10/A134/A134尺寸图.png and the
// existing A134 dim-1/dim-2 assets supersede the old 400 x 350 x 130 sheet row.
// This is specific to A134; do not swap its identity with the old A135 row.
const mm = '360 × 360 × 120 mm';
const inches = [360, 360, 120].map((value) => `${(value / 25.4).toFixed(1)}″`).join(' × ');

for (const prefix of ['', 'zh/']) {
  test(`${prefix}A134 dimensions agree in visible specs and structured data`, () => {
    const html = read(`${prefix}products/A134/index.html`);
    const label = prefix ? '尺寸' : 'Dimensions';
    assert.ok(html.includes(`<div class="k">${label}</div><div class="v">${mm}<span class="small">${inches}</span></div>`));
    assert.doesNotMatch(html, /400 × 350 × 130|15\.7″ × 13\.8″ × 5\.1″/);
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const product = schemas.find((schema) => schema['@type'] === 'Product');
    assert.equal(product.sku, 'A134');
    assert.equal(product.additionalProperty.find((item) => item.name === label)?.value, mm);
    for (const asset of ['gallery/lead.webp', 'dim-1.webp', 'dim-2.webp']) {
      assert.ok(html.includes(`/assets/products/A134/${asset}`));
      assert.ok(fs.existsSync(path.join(root, 'assets/products/A134', asset)));
    }
  });

  test(`${prefix}A134 catalog source, static card and no-script link stay consistent`, () => {
    const html = read(`${prefix}products/index.html`);
    const records = Object.values(catalogData(html).CATS).flatMap((category) => Array.from(category.items)).filter((item) => item.code === 'A134');
    assert.equal(records.length, 1);
    assert.equal(records[0].dims, `${mm}<br>${inches}`);
    assert.equal(records[0].sub, 'A10');
    const cards = [...html.matchAll(/<a class="pcard" data-code="A134"[\s\S]*?<\/a>/g)];
    assert.equal(cards.length, 1);
    assert.ok(cards[0][0].includes(`<div class="dims">${mm}<br>${inches}</div>`));
    const fallback = [...html.matchAll(/<noscript>([\s\S]*?)<\/noscript>/g)].map((match) => match[1]).join('');
    assert.ok(fallback.includes(`href="/${prefix}products/A134/"`));
    assert.equal(build(html, !!prefix), html);
  });

  test(`${prefix}A134 size-guide reference no longer quotes the old footprint`, () => {
    const html = read(`${prefix}blog/vessel-sink-sizes-dimensions-guide/index.html`);
    assert.match(html, /A134[^<]*360 × 360/);
    assert.doesNotMatch(html, /A134[^<]*400 × 350/);
  });
}
