const test = require('node:test');
const assert = require('node:assert/strict');
const {mergeModels, updateMessage, readDraft, DRAFT_KEY} = require('../assets/inquiry-form.js');

test('inquiry models reject markup, malformed storage, duplicates and oversized input', () => {
  assert.deepEqual(mergeModels('T201',['T201','T202','UB0124-A','<img src=x onerror=alert(1)>',null,123]), ['T201','T202','UB0124-A']);
  assert.deepEqual(mergeModels('<script>', {invalid:true}), []);
});

test('language handoff is single-use, target-bound and expires after thirty minutes', () => {
  const good = {target:'/zh/contact/',savedAt:1000,models:['T201'],generated:'System sentence.',orderType:1,
    fields:{name:'Audit',company:'Audit',email:'audit@example.invalid',phone:'',country:'CA',quantity:'1',message:'System sentence.\nBuyer notes.'}};
  const storage = value => ({value, getItem(key){assert.equal(key,DRAFT_KEY);return this.value;},removeItem(){this.value=null;}});
  const store = storage(JSON.stringify(good));
  assert.deepEqual(readDraft(store,'/zh/contact/',1500),good);
  assert.equal(store.value,null);
  assert.equal(readDraft(store,'/zh/contact/',1500),null);
  for(const [value,target,now] of [
    [good,'/contact/',1500], [good,'/zh/contact/',2000000], [good,'/zh/contact/',500],
    [{...good,orderType:99},'/zh/contact/',1500], [{...good,fields:{}},'/zh/contact/',1500]
  ]) assert.equal(readDraft(storage(JSON.stringify(value)),target,now),null);
  assert.equal(readDraft(storage('not json'),'/zh/contact/',1500),null);
  assert.equal(readDraft({getItem(){throw Error('Storage unavailable');}},'/zh/contact/'),null);
});
test('removing a model only replaces the exact system sentence, preserving customer notes', () => {
  for (const [before,after] of [
    ['I would like to request a quote for the following models: T201, T202.','I would like to request a quote for the following model: T202.'],
    ['我想為以下型號索取報價:T201、T202。','我想為以下型號索取報價:T202。']
  ]) {
    const notes = '\n\nPlease keep this delivery requirement.\nShip in October.';
    assert.equal(updateMessage(before+notes,before,after),after+notes);
    assert.equal(updateMessage(after+notes,after,''),notes.slice(2));
    assert.equal(updateMessage('Buyer rewrote everything',before,after),'Buyer rewrote everything');
    assert.equal(updateMessage(before+' Same-line comment',before,after),after+' Same-line comment');
  }
});
