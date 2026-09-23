const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const articles = ['sanitaryware-certifications-for-export', 'how-to-source-bathroom-fixtures-from-china', 'ceramic-basin-vs-resin-basin', 'round-vs-square-basin'];
const placeholders = [
  'sanitaryware-certifications-for-export-hero', 'ceramic-basin-inspection-gloved-hand-clipboard',
  'sanitary-ware-quality-control-testing-line', 'sanitary-ware-export-cartons-ready-shipment',
  'how-to-source-bathroom-fixtures-from-china', 'china-bathroom-fixtures-supplier-audit',
  'bathroom-fixture-sample-approval', 'sanitary-ware-production-quality-control', 'china-bathroom-fixtures-export-packing',
  'ceramic-vs-resin-basin-hero', 'ceramic-resin-basin-material-detail', 'ceramic-resin-basin-surface-qc',
  'ceramic-resin-basin-project-use', 'ceramic-resin-basin-export-package', 'round-vs-square-basin-hero',
  'round-square-basin-vanity-fit', 'round-square-basin-water-test', 'round-square-basin-project-use', 'round-square-basin-product-range'
];

test('published HTML has no references to the nineteen confirmed placeholder assets or ten broken links', () => {
  const files = execFileSync('git', ['ls-files', '*.html'], {cwd:root, encoding:'utf8'}).trim().split('\n');
  for (const file of files) {
    const html = read(file);
    for (const name of placeholders) assert.ok(!html.includes('/assets/blog/'+name+'.jpg'), file+': '+name);
    for (const slug of ['how-to-choose-a-ceramic-wash-basin','bathroom-vanity-basin-size-guide','toilet-buying-guide']) {
      assert.ok(!html.includes('/blog/'+slug+'/'), file+': '+slug);
    }
  }
});

for (const prefix of ['', 'zh/']) {
  for (const slug of articles) test(prefix+slug+' uses real existing assets and valid matching sharing metadata', () => {
    const html = read(prefix+'blog/'+slug+'/index.html');
    const hero = html.match(/<figure class="hero-card"[^>]*>([\s\S]*?)<\/figure>/)[1];
    const src = hero.match(/src="([^"]+)"/)[1];
    assert.ok(fs.existsSync(path.join(root,src)));
    assert.ok(html.includes('property="og:image" content="https://www.gdchengda.hk'+src+'"'));
    assert.ok(html.includes('name="twitter:image" content="https://www.gdchengda.hk'+src+'"'));
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
    assert.ok(ld.some(item=>item.image==='https://www.gdchengda.hk'+src));
    for (const image of html.matchAll(/<img\b[^>]*src="(\/assets\/[^"?]+)[^"]*"[^>]*>/g)) {
      assert.ok(fs.existsSync(path.join(root,image[1])), image[1]);
      assert.match(image[0], /alt="[^"]+"/);
    }
    assert.match(html,/width: 100%; height: auto; aspect-ratio: 16 \/ 9/);
    if (slug==='round-vs-square-basin') {
      assert.ok(hero.includes('/A201/') && hero.includes('/A132/'));
      assert.equal((hero.match(/object-fit:contain/g)||[]).length,2);
      assert.ok(html.includes(prefix?'並非等比例':'not to a common scale'));
    }
    if (slug==='ceramic-basin-vs-resin-basin') assert.ok(html.includes(prefix?'未展示樹脂樣品':'No resin sample is pictured'));
    if (slug==='sanitaryware-certifications-for-export') assert.ok(html.includes(prefix?'工廠照片不能證明認證資格':'Factory photographs do not establish certification'));
  });
  test(prefix+'replacement related links have real destinations and matching titles', () => {
    const pairs = [
      ['countertop-basin-height-faucet-guide','how-to-choose-ceramic-basin','如何挑選陶瓷面盆','How to choose a ceramic wash basin'],
      ['how-to-measure-a-toilet-seat','ceramic-toilet-buying-guide-importers','陶瓷馬桶採購指南','Ceramic Toilet Buying Guide for Importers'],
      ...['left-vs-right-offset-vanity-basin-guide','single-vs-double-sink-vanity-guide','shallow-depth-ceramic-vanity-basin-guide'].map(s=>[s,'how-to-choose-basin-size','如何選擇浴室面盆尺寸','How to Choose the Right Bathroom Basin Size'])
    ];
    for (const [source,target,zh,en] of pairs) {
      const html = read(prefix+'blog/'+source+'/index.html');
      assert.ok(html.includes('href="/'+prefix+'blog/'+target+'/"'));
      assert.ok(html.includes(prefix?zh:en));
      assert.ok(fs.existsSync(path.join(root,prefix,'blog',target,'index.html')));
    }
  });
  test(prefix+'video close returns focus to the actual play button', () => {
    assert.ok(read(prefix+'videos/index.html').includes("trigger = frame.querySelector('.v-play') || frame;"));
  });
}
