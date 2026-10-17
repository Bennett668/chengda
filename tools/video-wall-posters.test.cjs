const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const manifest = require('./video-wall-posters.json');
const key = 'basin-life-story-01-raw-materials';
const entry = manifest[key];
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

test('Only the first poster has lossless full-frame display variants and an unchanged original', () => {
  assert.deepEqual(Object.keys(manifest), [key]);
  const original = fs.readFileSync(path.join(root, entry.source));
  assert.equal(hash(original), '9e1cef76c15d8e63e137c802295560f5f46687ca2b4cdf43cb7c135c1cd984d8');
  assert.equal(hash(original), entry.sourceSha256); assert.equal(original.length, entry.sourceBytes);
  assert.deepEqual(entry.variants.map(v => v.width), [360, 540, 864]);
  for (const variant of entry.variants) {
    const bytes = fs.readFileSync(path.join(root, variant.src));
    assert.equal(hash(bytes), variant.sha256); assert.equal(bytes.length, variant.bytes);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(bytes.toString('ascii', 12, 16), 'VP8L'); assert.equal(bytes[20], 0x2f);
    const dimensions = bytes.readUInt32LE(21);
    assert.equal((dimensions & 0x3fff) + 1, variant.width);
    assert.equal(((dimensions >>> 14) & 0x3fff) + 1, variant.height);
    assert.equal(variant.width * 16, variant.height * 9);
    assert.ok(variant.bytes < entry.sourceBytes);
  }
});

for (const prefix of ['', 'zh/']) test(prefix + 'first card has matching responsive and modal sources, preserving original metadata', () => {
  const html = fs.readFileSync(path.join(root, prefix + 'videos/index.html'), 'utf8');
  const tag = html.match(/<img[^>]*data-poster-sources='([^']+)'[^>]*>/)[0];
  const sources = [...entry.variants.map(({src, width}) => ({src, width})), {src: entry.source, width: entry.width}];
  assert.deepEqual(JSON.parse(tag.match(/data-poster-sources='([^']+)'/)[1]), sources);
  assert.equal(tag.match(/\ssrcset="([^"]+)"/)[1], sources.map(v => v.src + ' ' + v.width + 'w').join(', '));
  assert.equal(tag.match(/\ssrc="([^"]+)"/)[1], entry.variants[1].src);
  assert.ok(tag.includes('sizes="auto, ')); assert.ok(tag.includes('loading="lazy"'));
  assert.equal((html.match(/data-poster-sources=/g) || []).length, 1);
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@graph'][0].thumbnailUrl, 'https://www.gdchengda.hk' + entry.source);
});
