const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const library = require('./published-videos.json');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

test('All eleven published archive videos are represented exactly once', () => {
  assert.equal(library.length, 11);
  assert.deepEqual(library.map(v => v.archiveNumber).sort((a,b) => a-b), Array.from({length:11}, (_,i) => i+1));
  assert.equal(new Set(library.map(v => v.video)).size, 11);
  assert.deepEqual(library.slice(0,5).map(v => v.archiveNumber), [11,10,9,8,7]);
});

for(const prefix of ['', 'zh/']) test(prefix + 'video cards, metadata and archive inventory agree without preloading videos', () => {
  const html = fs.readFileSync(path.join(root, prefix, 'videos/index.html'), 'utf8');
  const cards = [...html.matchAll(/<figure class="v-card" data-src="([^"]+)"[^>]*>([\s\S]*?)<\/figure>/g)];
  assert.deepEqual(cards.map(c => c[1]), library.map(v => v.video));
  assert.equal((html.match(/<video\b/g) || []).length, 0);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(schema['@graph'].map(v => v.contentUrl), library.map(v => 'https://www.gdchengda.hk' + v.video));
  assert.equal(schema['@graph'].length, 11);
  for(const [index, item] of library.entries()) {
    assert.ok(fs.existsSync(path.join(root, item.video)));
    assert.ok(fs.existsSync(path.join(root, item.poster)));
    assert.equal(schema['@graph'][index].thumbnailUrl, 'https://www.gdchengda.hk' + item.poster);
    if(item.legacy) continue;
    const language = prefix ? 'zh-Hant' : 'en';
    assert.ok(cards[index][2].includes(item.title[language]));
    assert.ok(cards[index][2].includes('loading="lazy"'));
    assert.ok(cards[index][2].includes(item.preview + ' 540w, ' + item.poster + ' 1080w'));
    assert.ok(cards[index][2].includes('data-poster-sources='));
    assert.equal(schema['@graph'][index].duration, `PT${item.duration.toFixed(2)}S`);
  }
});

for(const item of library.filter(v => !v.legacy)) test(item.slug + 'assets are intact, full-frame and fast-start with audio', () => {
  for(const [url, expected] of [[item.video,item.videoSha256],[item.poster,item.posterSha256],[item.preview,item.previewSha256]]) {
    assert.equal(hash(fs.readFileSync(path.join(root,url))), expected, url);
  }
  assert.equal(item.width, 1080); assert.equal(item.height, 1920);
  assert.ok(item.audioPayloadSha256.startsWith('SHA256='));
  assert.ok(item.bytes < 100*1024*1024);
  const bytes = fs.readFileSync(path.join(root,item.video));
  const atoms = []; let offset = 0;
  while(offset + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii',offset+4,offset+8);
    if(size === 1) size = Number(bytes.readBigUInt64BE(offset+8));
    if(size === 0) size = bytes.length-offset;
    assert.ok(size >= 8 && offset+size <= bytes.length);
    atoms.push({type,offset,size});offset += size;
  }
  const moov = atoms.find(a => a.type === 'moov'), mdat = atoms.find(a => a.type === 'mdat');
  assert.ok(moov && mdat && moov.offset < mdat.offset);
  const metadata = bytes.subarray(moov.offset,moov.offset+moov.size);
  assert.ok(metadata.includes(Buffer.from('avc1')));
  assert.ok(metadata.includes(Buffer.from('soun')));
});
