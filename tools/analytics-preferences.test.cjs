const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const guard = JSON.parse(execFileSync('python3', ['-c', 'import json; from tools.check_tracking import GUARD; print(json.dumps(GUARD))'], { cwd: root, encoding: 'utf8' }));
const code = guard.match(/<script>([\s\S]*)<\/script>/)[1];
const key = 'chengda.analytics.exclude.v1';
const disable = 'ga-disable-G-J7PPP48QXC';

function browser(value = null, fail = '') {
  const values = new Map(value === null ? [] : [[key, value]]);
  const listeners = {};
  const window = {
    localStorage: {
      getItem(k) { if (fail === 'read') throw new Error('blocked'); return values.get(k) ?? null; },
      setItem(k, v) { if (fail === 'write') throw new Error('quota'); values.set(k, v); },
      removeItem(k) { values.delete(k); }
    },
    addEventListener(event, callback) { listeners[event] = callback; }
  };
  return { window, values, listeners };
}

test('ordinary visitors remain enabled; only the explicit browser marker disables GA4', () => {
  for (const value of [null, '0', 'true', '1']) {
    const state = browser(value);
    vm.runInNewContext(code, state);
    assert.equal(state.window[disable], value === '1');
  }
});

test('the preference persists across page loads and synchronizes other tabs', () => {
  const state = browser();
  vm.runInNewContext(code, state);
  state.values.set(key, '1');
  state.listeners.storage({ key });
  assert.equal(state.window[disable], true);
  vm.runInNewContext(code, state);
  assert.equal(state.window[disable], true);
  state.values.clear();
  state.listeners.storage({ key: null });
  assert.equal(state.window[disable], false);
});

test('restricted storage does not break the website', () => {
  assert.doesNotThrow(() => vm.runInNewContext(code, browser(null, 'read')));
});

test('settings UI saves, reloads and reverses the preference, and reports storage failures', () => {
  const settings = fs.readFileSync(path.join(root, 'assets/analytics-preferences.js'), 'utf8');
  for (const fail of ['', 'read', 'write']) {
    const state = browser(null, fail);
    let change;
    const checkbox = { checked: false, disabled: true, addEventListener: (_, fn) => { change = fn; } };
    const status = {};
    state.document = { getElementById: id => id === 'status' ? status : checkbox };
    vm.runInNewContext(settings, state);
    if (fail === 'read') {
      assert.equal(checkbox.disabled, true);
      assert.match(status.textContent, /unavailable/);
      continue;
    }
    checkbox.checked = true;
    change();
    if (fail === 'write') {
      assert.match(status.textContent, /not saved/);
      assert.notEqual(state.values.get(key), '1');
      continue;
    }
    assert.equal(state.values.get(key), '1');
    vm.runInNewContext(settings, state);
    assert.equal(checkbox.checked, true);
    assert.match(status.textContent, /is excluded/);
    checkbox.checked = false;
    change();
    assert.equal(state.values.has(key), false);
    assert.match(status.textContent, /not excluded/);
  }
});

test('every tracked GA4 page checks the preference before loading the Google tag', () => {
  const names = execFileSync('git', ['ls-files', '-z', '*.html'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  let checked = 0;
  for (const name of names) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    if (!html.includes('googletagmanager.com/gtag/js')) continue;
    assert.equal(html.split(guard).length, 2, name);
    assert.ok(html.indexOf(guard) < html.indexOf('<script async src="https://www.googletagmanager.com/gtag/js'), name);
    checked++;
  }
  assert.ok(checked > 600);
  const settings = fs.readFileSync(path.join(root, 'analytics-preferences/index.html'), 'utf8');
  assert.match(settings, /content="noindex, nofollow"/);
  assert.ok(!settings.includes('googletagmanager.com'));
});
