const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const videoSkus = new Set([
  'T103', 'T104', 'T105', 'T108', 'T112', 'T114', 'T122', 'T123',
  ...Array.from({length:17}, (_, i) => `T${201+i}`),
]);

for (const lang of ['', 'zh/']) {
  test(`${lang}product factory photos use the certificate wall`, () => {
    let total = 0;
    for (const sku of fs.readdirSync(path.join(root, lang, 'products'))) {
      const file = path.join(root, lang, 'products', sku, 'index.html');
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      const photos = [...html.matchAll(/<div class="pd-factory-ph"><img([^>]+)>/g)];
      if (!photos.length) continue;
      assert.equal(photos.length, 4, sku);
      for (let i = 0; i < 3; i++) assert.ok(photos[i][1].includes(`/factory-${i+1}.webp`), sku);
      assert.ok(photos[3][1].includes('/certificate-wall-img1392.webp'), sku);
      assert.match(photos[3][1], /width="1600" height="1200"/);
      total++;
    }
    assert.equal(total, 269);
  });

  for (const sku of [...Array.from({length:23}, (_,i) => `T${101+i}`), ...Array.from({length:17}, (_,i) => `T${201+i}`)]) {
    test(`${lang}${sku} uses the approved toilet presentation`, () => {
      const html = fs.readFileSync(path.join(root, lang, 'products', sku, 'index.html'), 'utf8');
      assert.match(html, /class="pd-presentation(?: pd-presentation--no-video)?"/);
      assert.equal((html.match(/class="pd-col"/g) || []).length, 2);
      assert.doesNotMatch(html, /<table class="pd-loadtable">|<div class="pd-pack-img">|data-media="video"|\/assets\/product-media.js|const thumbs = Array.from/);
      assert.equal((html.match(/product-video-section.js/g) || []).length, 1);
      assert.match(html, /product-video-section.css\?v=9/);
      const videos = [...html.matchAll(/<video\b[^>]*>/g)];
      assert.equal(videos.length, videoSkus.has(sku) ? 1 : 0);
      if (videoSkus.has(sku)) {
        assert.match(videos[0][0], new RegExp(`/assets/products/${sku}/video-with-audio.mp4`));
        assert.match(videos[0][0], /controls playsinline preload="none"/);
        assert.doesNotMatch(videos[0][0], /\smuted|\sautoplay|\ssrc=/);
        assert.ok(html.indexOf('id="product-video"') < html.indexOf('class="pd-cols"'));
        assert.equal((html.match(/id="pd-video"/g) || []).length, 1);
        assert.match(html, new RegExp(`class="pd-film-title-accent">${lang ? '影片' : 'Video'}<`));
      } else assert.match(html, /pd-presentation--no-video/);
      for (const m of html.matchAll(/(?:src|href|data-src|poster)="(\/assets\/[^"?#]+)/g)) {
        assert.ok(fs.existsSync(path.join(root, m[1])), `${sku}: ${m[1]}`);
      }
      for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
        if (m[0].includes('application/ld+json')) JSON.parse(m[1]);
        else new vm.Script(m[1]);
      }
      assert.ok(html.includes('inquiryList'));
    });
  }
}
