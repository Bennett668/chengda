// Run with sharp available on NODE_PATH. Originals are never overwritten.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');

async function build() {
  const marks = {};
  const seen = new Set();
  fs.mkdirSync(path.join(root, 'assets/products/flush-marks'), {recursive:true});
  for (let n = 101; n <= 123; n++) {
    const code = `T${n}`;
    const original = fs.readFileSync(path.join(root, `assets/products/${code}/flush-mark.png`));
    const hash = crypto.createHash('sha256').update(original).digest('hex');
    const url = `/assets/products/flush-marks/${hash.slice(0,16)}.webp`;
    marks[code] = url;
    if (seen.has(hash)) continue;
    seen.add(hash);
    await sharp(original).resize({width:366, height:252, fit:'inside', withoutEnlargement:true})
      .webp({lossless:true, effort:6}).toFile(path.join(root, url));
  }
  for (const prefix of ['', 'zh/']) {
    const file = path.join(root, prefix, 'products/index.html');
    const html = fs.readFileSync(file, 'utf8');
    const mapping = 'const TOILET_FLUSH_MARKS = ' + JSON.stringify(marks, null, 2) + ';';
    fs.writeFileSync(file, html.replace(/const TOILET_FLUSH_MARKS = \{[\s\S]*?\};/, mapping));
  }
  const dir = path.join(root, 'assets/products/T201');
  fs.mkdirSync(path.join(dir, 'thumbs'), {recursive:true});
  for (const name of ['card', 'hero', ...Array.from({length:8}, (_,i)=>`g${i+1}`)]) {
    await sharp(path.join(dir, `${name}.webp`)).resize({width:192, height:192, fit:'inside'})
      .webp({quality:90}).toFile(path.join(dir, `thumbs/${name}.webp`));
  }
  for (const width of [720, 1440]) {
    await sharp(path.join(dir, 'dimensions.webp')).resize({width})
      .webp({quality:92}).toFile(path.join(dir, `dimensions-${width}.webp`));
  }
  console.log(`Built ${seen.size} distinct flush marks, 10 thumbnails and 2 drawing previews.`);
}
build().catch(error => { console.error(error); process.exitCode = 1; });
