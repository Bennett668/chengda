const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const products = [
  { sku: 'A230', mm: '480 × 340 × 145 mm', inch: '18.9″ × 13.4″ × 5.7″', loads: ['1,050', '2,250', '2,650'] },
  { sku: 'A231', mm: '600 × 400 × 155 mm', inch: '23.6″ × 15.7″ × 6.1″', loads: ['700', '1,550', '1,800'] },
];
for (const lang of ['', 'zh/']) {
  for (const p of products) {
    test(`${lang}${p.sku} matches the A20 source data and assets`, () => {
      const html = fs.readFileSync(path.join(root, lang, 'products', p.sku, 'index.html'), 'utf8');
      assert.ok(html.includes(p.mm));
      assert.ok(html.includes(p.inch));
      assert.match(html, /single-image/);
      assert.doesNotMatch(html, /A229|Net Weight|淨重|待補充|維達|维达|成本/);
      assert.match(html, lang ? />橢圓形</ : />Oval</);
      for (const [i, container] of ['20GP', '40GP', '40HQ'].entries()) {
        assert.ok(html.includes(`<tr><td>${container}</td><td>${p.loads[i]} ${lang ? '件' : 'pcs'}</td></tr>`));
      }
      for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)/g)) {
        assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
      }
      for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
        if (m[0].includes('application/ld+json')) JSON.parse(m[1]);
        else new vm.Script(m[1]);
      }
      assert.ok(html.includes(`rel="canonical" href="https://www.gdchengda.hk/${lang}products/${p.sku}/"`));
      assert.ok(html.includes(`list.push('${p.sku}')`));
      const catalog = fs.readFileSync(path.join(root, lang, 'products/index.html'), 'utf8');
      assert.equal((catalog.match(new RegExp(`code:"${p.sku}"`, 'g')) || []).length, 1);
      const record = catalog.match(new RegExp(`\\{code:"${p.sku}"[^}]+\\}`))[0];
      assert.ok(record.includes('sub:"A20"'));
      assert.ok(record.includes(p.mm));
      assert.ok(catalog.includes(`href="/${lang}products/${p.sku}/"`));
      assert.ok(catalog.includes(`"url": "https://www.gdchengda.hk/${lang}products/${p.sku}/"`));
      const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
      assert.equal((sitemap.match(new RegExp(`<loc>https://www.gdchengda.hk/${lang}products/${p.sku}/</loc>`, 'g')) || []).length, 1);
    });
  }
}
