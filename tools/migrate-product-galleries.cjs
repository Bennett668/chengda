// Static product HTML is the retained template source. Reject unknown legacy blocks.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const known = new Set(['9f6761b3de','f166f8a7d3','ba956b9b2c','7eee7d5d10']);
function migrate(html) {
  const start = html.indexOf('  const thumbs = Array.from');
  if (start !== -1) {
    const end = html.indexOf('  const addBtn', start);
    if (end === -1) throw Error('Missing inquiry boundary');
    const block = html.slice(start,end).trim().replace(/\/\/[^\n]*/g,'').trim();
    const hash = crypto.createHash('sha256').update(block).digest('hex').slice(0,10);
    if (!known.has(hash)) throw Error('Unreviewed gallery block: '+hash);
    html = html.slice(0,start) + html.slice(end);
    html = html.replace('  // Gallery: thumbs + arrows\n','');
  }
  if (html.includes('id="pd-main"') && !html.includes('src="/assets/product-gallery.js')) {
    const anchor = '<script src="/assets/site-shell.js';
    if (!html.includes(anchor)) throw Error('Missing shell script boundary');
    html = html.replace(anchor, '<script src="/assets/product-gallery.js?v=1" defer></script>\n'+anchor);
  }
  return html;
}
if (require.main === module) {
  const write = process.argv.includes('--write');
  const files = execFileSync('git',['ls-files','-z','products/*/index.html','zh/products/*/index.html'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
  const changed=[];
  for(const name of files){
    const file=path.join(root,name), before=fs.readFileSync(file,'utf8'), after=migrate(before);
    if(before===after)continue;
    changed.push(name);if(write)fs.writeFileSync(file,after);
  }
  console.log(`${write?'Migrated':'Pending'} product galleries: ${changed.length}`);
  if(!write&&changed.length)process.exitCode=1;
}
module.exports={migrate};
