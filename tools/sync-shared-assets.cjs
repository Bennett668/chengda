const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const versions = require('./shared-assets.json');
const root = path.resolve(__dirname, '..');

function normalize(text) {
  for (const [asset, version] of Object.entries(versions)) {
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escaped + '(?:\\?v=[A-Za-z0-9._-]+)?(?=["\'\\s>])', 'g'), asset + '?v=' + version);
  }
  return text;
}
function sync(files, write = false) {
  const stale = [];
  for (const file of files) {
    const current = fs.readFileSync(file, 'utf8');
    const next = normalize(current);
    if (current === next) continue;
    stale.push(path.relative(root, file));
    if (write) fs.writeFileSync(file, next);
  }
  return stale;
}
if (require.main === module) {
  const files = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const targets = files.length ? files.map(file => path.resolve(file)) :
    execFileSync('git', ['ls-files', '-z', '*.html', 'assets/site-shell.js'], {cwd:root, encoding:'utf8'})
      .split('\0').filter(Boolean).map(file => path.join(root, file));
  const write = process.argv.includes('--write');
  const stale = sync(targets, write);
  console.log(`${write ? 'Updated' : 'Stale'} shared asset references: ${stale.length} files.`);
  if (!write && stale.length) { console.error(stale.join('\n')); process.exitCode = 1; }
}
module.exports = {normalize, sync, versions};
