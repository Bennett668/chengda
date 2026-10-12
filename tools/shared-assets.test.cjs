const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {normalize, versions} = require('./sync-shared-assets.cjs');
const root = path.resolve(__dirname, '..');

test('normalization changes only shared asset URLs and is idempotent', () => {
  const old = '<link href="/assets/porcelain.css?v=19"><script src="/assets/site-shell.js?v=10"></script><p>Specifications stay unchanged.</p>';
  const expected = `<link href="/assets/porcelain.css?v=${versions['/assets/porcelain.css']}"><script src="/assets/site-shell.js?v=${versions['/assets/site-shell.js']}"></script><p>Specifications stay unchanged.</p>`;
  assert.equal(normalize(old), expected);
  assert.equal(normalize(expected), expected);
  assert.equal(normalize('<img src="/assets/products/T201/card.webp">'), '<img src="/assets/products/T201/card.webp">');
});
test('all tracked pages and dynamic catalog resources use the release versions', () => {
  const files = execFileSync('git', ['ls-files', '-z', '*.html', 'assets/site-shell.js'], {cwd:root, encoding:'utf8'}).split('\0').filter(Boolean);
  for (const file of files) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.equal(normalize(html), html, file);
  }
  for (const asset of Object.keys(versions)) assert.ok(fs.existsSync(path.join(root, asset)));
});
