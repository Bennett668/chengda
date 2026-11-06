const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');

for (const prefix of ['', 'zh/']) {
  test(prefix + 'homepage has centered counters and the approved 1280 C temperature', () => {
    const html = fs.readFileSync(path.join(root, prefix, 'index.html'), 'utf8');
    assert.deepEqual([...html.matchAll(/class="home-stat-number" data-count="(\d+)"/g)].map(match => +match[1]), [1999, 200, 50, 1280]);
    assert.ok(html.includes('1,280&nbsp;°C'));
    assert.ok(html.includes('home-stat-value-sr">1,280°C'));
    assert.ok(!html.includes('1,250'));
    assert.ok(html.includes('text-align: center'));
    assert.ok(html.includes('font-variant-numeric: tabular-nums'));
    assert.ok(html.includes('prefers-reduced-motion: reduce'));
    assert.ok(html.includes('history.scrollRestoration = \'manual\''));
    assert.ok(!html.includes("localStorage.setItem('chengda.analytics.exclude.v1', '1')"));
    assert.ok(html.includes('googletagmanager.com/gtag/js'));
  });

  test(prefix + 'certifications are accessible, transparent and between stats and products', () => {
    const html = fs.readFileSync(path.join(root, prefix, 'index.html'), 'utf8');
    const start = html.indexOf('<section class="home-certifications"');
    const end = html.indexOf('</section>', start);
    assert.ok(start > html.indexOf('<section class="wrap stats-section"'));
    assert.ok(end < html.indexOf('<section class="section">', end));
    assert.equal((html.match(/id="certifications"/g) || []).length, 1);
    const section = html.slice(start, end);
    const images = [...section.matchAll(/src="(\/assets\/certification-marks\/[a-z0-9-]+\.png)"/g)];
    assert.equal(images.length, 11);
    for (const [, src] of images) {
      const bytes = fs.readFileSync(path.join(root, src));
      assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      assert.equal(bytes[25], 6, 'RGBA PNG required: ' + src);
    }
    assert.ok(section.includes('role="region" tabindex="0"'));
    assert.ok(section.includes('aria-describedby="home-certifications-note"'));
    assert.ok(section.includes(prefix ? '具體型號及目標市場確認' : 'confirmed by model and destination market'));
    assert.ok(html.includes('overflow-x: auto'));
    assert.ok(html.includes('cert-mark-focus 1000ms'));
    assert.ok(html.includes('entry.intersectionRatio >= 0.65'));
    assert.ok(html.includes('index * 100'));
    assert.ok(html.includes('finishAll()'));
  });
}

test('original About-page certification artwork is unchanged', () => {
  const bytes = fs.readFileSync(path.join(root, 'assets/factory/cert-logos.webp'));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), '678078d0345ea803c8d486b747c7a1e5bb378afa1ac7b5e7e78953a2139f6a04');
});
