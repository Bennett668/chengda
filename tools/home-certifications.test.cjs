const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const marks = ['CE', 'cUPC', 'ISO 9001', 'ISO 14001', 'NSF/ANSI 61', 'WRAS', 'SASO', 'WaterMark', 'BSCI', 'SGS'];

test('Homepage reuses the unchanged certification artwork from the About page', () => {
  const file = fs.readFileSync(path.join(root, 'assets/factory/cert-logos.webp'));
  assert.equal(crypto.createHash('sha256').update(file).digest('hex'), '678078d0345ea803c8d486b747c7a1e5bb378afa1ac7b5e7e78953a2139f6a04');
  assert.ok(fs.readFileSync(path.join(root, 'about/index.html'), 'utf8').includes('/assets/factory/cert-logos.webp'));
});

for (const prefix of ['', 'zh/']) test(prefix + 'homepage shows accessible certification artwork directly after the hero', () => {
  const html = fs.readFileSync(path.join(root, prefix, 'index.html'), 'utf8');
  const start = html.indexOf('<section class="home-certifications"');
  const end = html.indexOf('</section>', start);
  assert.ok(start > html.indexOf('<section class="hero"'));
  assert.ok(end < html.indexOf('<section class="wrap stats-section"'));
  assert.equal((html.match(/<section class="home-certifications"/g) || []).length, 1);
  const section = html.slice(start, end);
  for (const mark of marks) assert.ok(section.includes(mark), mark);
  assert.ok(section.includes('loading="lazy" decoding="async" width="1463" height="160"'));
  assert.ok(section.includes('role="region" tabindex="0"'));
  assert.ok(section.includes('aria-labelledby="home-certifications-title"'));
  assert.ok(section.includes('aria-describedby="home-certifications-note"'));
  assert.ok(section.includes(prefix ? '具體型號及目標市場確認' : 'confirmed by model and destination market'));
  assert.ok(html.includes('overflow-x: auto'));
  assert.ok(html.includes('min-width: 1320px; max-width: none; height: auto'));
  assert.ok(html.includes('home-certifications-scroll:focus-visible'));
  assert.ok(html.includes('scroll-margin-top: 88px'));
  assert.ok(html.includes('<span class="cert-chip">CUPC</span><span class="cert-chip">ISO 9001</span>'));
});
