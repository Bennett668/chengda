const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/site-shell.js'), 'utf8');
const start = source.indexOf('  function bindWechatCopy() {');
const code = source.slice(start, source.indexOf('  function languageTarget()', start)) + '\nbindWechatCopy();';
function setup({zh = false, clipboard} = {}) {
  const element = () => ({hidden: true, events: {}, addEventListener(k, fn) { this.events[k] = fn; }});
  const button = element(), status = element(), fallback = element(), select = element(), input = element();
  input.focus = options => { input.focusOptions = options; }; input.select = () => { input.selected = (input.selected || 0) + 1; };
  fallback.querySelector = () => select;
  const document = {querySelector: () => button, getElementById: id => ({'footer-wechat-status': status, 'footer-wechat-fallback': fallback, 'footer-wechat-id': input})[id]};
  vm.runInNewContext(code, {document, navigator: clipboard ? {clipboard} : {}, ZH: zh});
  return {button, status, fallback, input, select};
}
test('Successful clipboard writes show bilingual success only after the write resolves', async () => {
  for (const zh of [false, true]) {
    const writes = [], s = setup({zh, clipboard: {writeText: async text => writes.push(text)}});
    await s.button.events.click(); assert.deepEqual(writes, ['Chengda_koi888']);
    assert.equal(s.status.textContent, zh ? '微信號已複製。' : 'WeChat ID copied.');
    assert.equal(s.fallback.hidden, true); assert.equal(s.status.hidden, false); assert.equal(s.button.disabled, false);
  }
});
test('Denied or unavailable clipboard exposes a selected unchanged ID, never false success', async () => {
  for (const zh of [false, true]) for (const clipboard of [undefined, {writeText: async () => { throw new Error('NotAllowedError'); }}]) {
    const s = setup({zh, clipboard}); await s.button.events.click();
    assert.equal(s.fallback.hidden, false); assert.equal(s.input.selected, 1); assert.equal(s.input.focusOptions.preventScroll, true);
    assert.doesNotMatch(s.status.textContent, /copied|已複製/); assert.equal(s.status.hidden, false);
    s.select.events.click(); assert.equal(s.input.selected, 2);
  }
});
test('Repeated clicks cannot race a pending clipboard write', async () => {
  let done, writes = 0;
  const s = setup({clipboard: {writeText: () => { writes++; return new Promise(resolve => { done = resolve; }); }}});
  const first = s.button.events.click(); await s.button.events.click();
  assert.equal(writes, 1); assert.equal(s.status.hidden, true); assert.equal(s.button.disabled, true);
  done(); await first; assert.equal(s.button.disabled, false); assert.equal(s.status.textContent, 'WeChat ID copied.');
});
test('Shared footer exposes real keyboard buttons, retains ID, and never requests clipboard-read permission', () => {
  assert.match(source, /<button class="footer-wechat" type="button"/);
  assert.match(source, /value="Chengda_koi888" readonly/);
  assert.doesNotMatch(source, /href="#">WeChat/);
  assert.doesNotMatch(code, /readText|permissions\.|location\.|execCommand/);
  assert.match(source, /if \(f\) f\.outerHTML = FOOTER;\s*bindWechatCopy\(\);/);
});
