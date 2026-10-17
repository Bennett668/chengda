const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),data=require('./video-wall-playback.json');
const key='basin-life-story-01-raw-materials',entry=data[key];
test('Only the reviewed first clip has an immutable lightweight derivative and intact original',()=>{
  assert.deepEqual(Object.keys(data),[key]);
  const hash=url=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,url))).digest('hex');
  assert.equal(hash(entry.source),entry.sourceSha256);assert.equal(hash(entry.playback),entry.sha256);
  assert.equal(entry.width,540);assert.equal(entry.height,960);assert.equal(entry.fps,25);assert.equal(entry.frames,1029);assert.equal(entry.duration,41.16);
  assert.equal(entry.audioPayloadSha256,'5fc5243ef4f3c05956636c8f987ea50c690d67723831d3bfc222a03a8e4d1835');
  assert.ok(entry.bytes<entry.sourceBytes*.12);
});
for(const prefix of ['', 'zh/'])test(prefix+'video metadata and first-card playback agree, with an original-quality fallback',()=>{
  const html=fs.readFileSync(path.join(root,prefix+'videos/index.html'),'utf8');
  assert.ok(html.includes('data-src="'+entry.playback+'" data-original-src="'+entry.source+'"'));
  const ld=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(ld['@graph'][0].contentUrl,'https://www.gdchengda.hk'+entry.playback);
  assert.equal(ld['@graph'][0].duration,'PT41.17S');
  assert.equal((html.match(/data-original-src=/g)||[]).length,1);
  assert.equal((html.match(/data-src="\/assets\/videos\/playback\//g)||[]).length,1);
});
