const test = require('node:test');
const assert = require('node:assert/strict');
const {mergeModels, updateMessage} = require('../assets/inquiry-form.js');

test('inquiry models reject markup, malformed storage, duplicates and oversized input', () => {
  assert.deepEqual(mergeModels('T201',['T201','T202','UB0124-A','<img src=x onerror=alert(1)>',null,123]), ['T201','T202','UB0124-A']);
  assert.deepEqual(mergeModels('<script>', {invalid:true}), []);
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
