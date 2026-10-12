const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const known = new Set(['83cda6d4d8a1', 'aef47266e3a9', 'e6995c744f69', 'ca1ad5629881', '9c11fd606e13']);
function migrate(html, model) {
  let found = 0;
  const version = require('./shared-assets.json')['/assets/product-inquiry.js'];
  html = html.replace(/<script>\s*([\s\S]*?)<\/script>/g, (tag, body) => {
    if (!body.includes('const addBtn')) return tag;
    const normalized = body.replaceAll(model, 'MODEL').replace(/\/\/[^\n]*/g, '').trim();
    const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
    if (!known.has(hash)) throw Error('Unreviewed inquiry block: ' + hash);
    found++;
    return `<script src="/assets/product-inquiry.js?v=${version}" defer></script>`;
  });
  if (found > 1 || (html.match(/src="\/assets\/product-inquiry\.js/g) || []).length !== 1) throw Error('Expected one product inquiry script');
  return html;
}
if (require.main === module) {
  const write = process.argv.includes('--write');
  const files = execFileSync('git', ['ls-files', '-z', 'products/*/index.html', 'zh/products/*/index.html'], {cwd:root, encoding:'utf8'}).split('\0').filter(Boolean);
  let changed = 0;
  for (const name of files) {
    const file = path.join(root, name), before = fs.readFileSync(file, 'utf8');
    const after = migrate(before, name.split('/').at(-2));
    if (before === after) continue;
    changed++;
    if (write) fs.writeFileSync(file, after);
  }
  console.log(`${write ? 'Migrated' : 'Pending'} product inquiry scripts: ${changed}`);
  if (!write && changed) process.exitCode = 1;
}
module.exports = {migrate};
