const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const api = require('../assets/product-inquiry.js');
const {migrate} = require('./migrate-product-inquiry.cjs');
function storage(value) { return {value, getItem(){return this.value;}, setItem(key, next){assert.equal(key,api.KEY);this.value=next;}}; }
test('product inquiry preserves other models and deduplicates against fresh storage', () => {
  const store=storage('["A101","T201","T201","invalid"]');
  assert.deepEqual(api.read(store),['A101','T201']);
  assert.deepEqual(api.add(store,'UB0124-A'),['A101','T201','UB0124-A']);
  assert.deepEqual(api.add(store,'T201'),['A101','T201','UB0124-A']);
  store.value='["A101"]';
  assert.deepEqual(api.add(store,'T201'),['A101','T201']);
});
test('product inquiry repairs malformed or wrong-type lists on a real add', () => {
  for(const value of ['{bad','null','{}','"T201"','42']) {
    const store=storage(value);assert.deepEqual(api.read(store),[]);
    assert.deepEqual(api.add(store,'T201'),['T201']);
  }
  assert.throws(()=>api.add(storage('[]'),'<script>'));
});
test('product inquiry never reports storage failure or ignored writes as success', () => {
  assert.throws(()=>api.read({getItem(){throw Error('blocked');}}));
  assert.throws(()=>api.add({getItem(){throw Error('blocked');},setItem(){assert.fail('must not overwrite');}},'T201'));
  assert.throws(()=>api.add({getItem(){return '[]';},setItem(){throw Error('quota');}},'T201'));
  assert.throws(()=>api.add({getItem(){return '[]';},setItem(){}},'T201'));
});
test('all product pages use the shared inquiry lifecycle and no legacy inline writer', () => {
  const root=path.resolve(__dirname,'..');
  const files=execFileSync('git',['ls-files','products/*/index.html','zh/products/*/index.html'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  assert.equal(files.length,538);
  for(const file of files){
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.equal(migrate(html,file.split('/').at(-2)),html,file);
    assert.ok(!html.includes('const addBtn'),file);
  }
});
test('inquiry migration rejects unknown code instead of silently deleting it', () => {
  assert.throws(()=>migrate('<script>const addBtn = 1; unexpected();</script>','T201'),/Unreviewed/);
});
