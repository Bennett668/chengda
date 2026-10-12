// Run with sharp available on NODE_PATH. Originals are never overwritten.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const {execFileSync} = require('node:child_process');

async function buildFollowup() {
  const python = process.env.PYTHON || 'python3';
  const inventory = JSON.parse(execFileSync(python, ['tools/product_previews.py', '--inventory'], {cwd:root, encoding:'utf8'}));
  const manifest = {};
  const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
  for (const [code, entry] of Object.entries(inventory)) {
    const target = manifest[code] = {gallery:[], drawings:[]};
    for (const [kind, sources] of Object.entries(entry)) for (const source of sources) {
      const original = fs.readFileSync(path.join(root, source));
      const metadata = await sharp(original).metadata();
      const item = {source, sourceHash:digest(original), width:metadata.width, height:metadata.height};
      const previews = [];
      for (const width of kind === 'gallery' ? [192] : [720,1440]) {
        const url = kind === 'gallery' ? source.replace(`/${code}/`, `/${code}/thumbs/`) : source.replace('.webp', `-${width}.webp`);
        const resized = sharp(original).resize(kind === 'gallery'
          ? {width,height:width,fit:'inside',withoutEnlargement:true} : {width,withoutEnlargement:true});
        const {data,info} = await resized.webp({quality:kind === 'gallery'?90:92}).toBuffer({resolveWithObject:true});
        fs.mkdirSync(path.dirname(path.join(root,url)), {recursive:true});
        fs.writeFileSync(path.join(root,url),data);
        previews.push({url,width:info.width,height:info.height,bytes:data.length,hash:digest(data)});
      }
      if(kind === 'gallery') item.thumbnail=previews[0]; else item.previews=previews;
      target[kind].push(item);
    }
  }
  fs.writeFileSync(path.join(root,'tools/product-previews.json'),JSON.stringify(manifest,null,2)+'\n');
  execFileSync(python,['tools/product_previews.py','--write'],{cwd:root,stdio:'inherit'});
}

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
(process.argv.includes('--followup') ? buildFollowup() : build()).catch(error => { console.error(error); process.exitCode = 1; });
