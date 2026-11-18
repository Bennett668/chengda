const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');

function productFiles() {
  const aliases = require('./product-aliases.json');
  const files = execFileSync('git', ['ls-files', '-z', 'products/*/index.html', 'zh/products/*/index.html'], {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean);
  return files.filter((name) => {
    const model = name.split('/').at(-2);
    if (!Object.hasOwn(aliases, model)) return true;
    const prefix = name.startsWith('zh/') ? '/zh' : '';
    const target = `${prefix}/products/${aliases[model]}/`;
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    if (!html.includes(`<meta http-equiv="refresh" content="0;url=${target}" />`) ||
        !html.includes(`<link rel="canonical" href="https://www.gdchengda.hk${target}" />`) ||
        html.includes('id="pd-main"') || !fs.existsSync(path.join(root, target, 'index.html'))) {
      throw Error('Invalid product alias: ' + name);
    }
    return false;
  });
}

module.exports = {productFiles};
