const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/product-video-section.js'), 'utf8');

function setup({connection = {}, lang = 'en', intersection = true} = {}) {
  function element(attrs = {}) {
    const classes = new Set();
    return {attrs, hidden: false, events: {}, classes,
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
      getAttribute(name) { return this.attrs[name] ?? null; },
      classList: {toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }},
    };
  }
  const status = element(), player = element(), start = element({'aria-label': 'Play video'}), error = element();
  player.append = child => { assert.equal(child, status); };
  const video = element();
  Object.assign(video, {dataset: {src: '/assets/products/T208/video-with-audio.mp4'}, parentElement: player,
    paused: true, plays: 0, loads: 0, muted: false,
    load() { this.loads++; this.error = null; },
    pause() { this.paused = true; this.events.pause(); },
    play() { this.plays++; this.paused = false; return new Promise((resolve, reject) => { this.resolve = resolve; this.reject = reject; }); },
  });
  Object.defineProperty(video, 'src', {set(value) { this.attrs.src = value; }});
  const docEvents = {}, windowEvents = {}, observers = [];
  const document = {hidden: false, documentElement: {lang}, createElement: () => status,
    getElementById: id => ({'pd-video': video, 'pd-video-error': error})[id],
    querySelector: () => start, addEventListener: (name, fn) => { docEvents[name] = fn; },
  };
  const window = {addEventListener: (name, fn) => { windowEvents[name] = fn; }};
  const IntersectionObserver = class {
    constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
    observe(target) { this.target = target; this.connected = true; }
    disconnect() { this.connected = false; }
  };
  if (intersection) window.IntersectionObserver = IntersectionObserver;
  vm.runInNewContext(source, {document, window, navigator: {connection}, IntersectionObserver});
  return {video, start, status, error, player, observers, document, docEvents, windowEvents};
}

test('Distant video stays unloaded; approaching it prepares metadata without playback', () => {
  const s = setup();
  assert.equal(s.video.attrs.src, undefined);
  assert.equal(s.video.plays, 0);
  s.observers[0].callback([{isIntersecting: false}]);
  assert.equal(s.video.attrs.src, undefined);
  s.observers[0].callback([{isIntersecting: true}]);
  assert.equal(s.video.attrs.src, s.video.dataset.src);
  assert.equal(s.video.preload, 'metadata');
  assert.equal(s.video.plays, 0);
  assert.equal(s.video.paused, true);
  assert.equal(s.status.hidden, true);
  assert.equal(s.observers[0].connected, false);
  s.video.events.loadedmetadata();
  assert.equal(s.video.preload, 'none');
  assert.equal(s.video.plays, 0);
});

test('Data saver and slow connections keep video unloaded until explicit click', async () => {
  for (const connection of [{saveData: true}, {effectiveType: '2g'}, {effectiveType: 'slow-2g'}]) {
    const s = setup({connection});
    assert.equal(s.observers.length, 0);
    assert.equal(s.start.events.pointerenter, undefined);
    const click = s.start.events.click();
    assert.equal(s.video.attrs.src, s.video.dataset.src);
    assert.equal(s.video.preload, 'auto');
    assert.equal(s.video.muted, false);
    s.video.events.playing(); s.video.resolve(); await click;
  }
});

test('Explicit play shows localized loading until actual playback and preserves controls', async () => {
  const s = setup({lang: 'zh-Hant'});
  const click = s.start.events.click();
  assert.equal(s.start.hidden, false);
  assert.equal(s.start.disabled, true);
  assert.equal(s.start.classes.has('is-loading'), true);
  assert.equal(s.status.hidden, false);
  assert.equal(s.status.textContent, '\u8f09\u5165\u5f71\u7247\u4e2d...');
  assert.equal(s.player.attrs['aria-busy'], 'true');
  s.video.events.playing(); s.video.resolve(); await click;
  assert.equal(s.start.hidden, true);
  assert.equal(s.start.disabled, false);
  assert.equal(s.status.hidden, true);
  assert.equal(s.video.controls, true);
  s.video.events.waiting();
  assert.equal(s.status.hidden, false);
  assert.equal(s.start.hidden, true);
  s.video.pause();
  assert.equal(s.status.hidden, true);
});

test('Metadata failure is silent and explicit retry resets media error', async () => {
  const s = setup();
  s.observers[0].callback([{isIntersecting: true}]);
  s.video.error = {code: 2}; s.video.events.error();
  assert.equal(s.error.hidden, true);
  assert.equal(s.start.hidden, false);
  const click = s.start.events.click();
  assert.equal(s.video.loads, 1);
  s.video.events.playing(); s.video.resolve(); await click;
  assert.equal(s.error.hidden, true);
});

test('Playback rejection exposes retry and direct-file fallback', async () => {
  const s = setup();
  const click = s.start.events.click();
  s.video.reject(new Error('NotAllowedError')); await click;
  assert.equal(s.error.hidden, false);
  assert.equal(s.start.hidden, false);
  assert.equal(s.start.disabled, false);
  assert.equal(s.status.hidden, true);
  const retry = s.start.events.click();
  assert.equal(s.error.hidden, true);
  s.video.events.playing(); s.video.resolve(); await retry;
  assert.equal(s.start.hidden, true);
});

test('Leaving during startup restores retry; a stale play rejection cannot undo a new click', async () => {
  const s = setup();
  const first = s.start.events.click(), reject = s.video.reject;
  s.windowEvents.pagehide();
  assert.equal(s.video.paused, true);
  assert.equal(s.start.disabled, false);
  assert.equal(s.start.hidden, false);
  s.windowEvents.pageshow();
  assert.equal(s.video.plays, 1);
  const retry = s.start.events.click();
  reject(new Error('AbortError')); await first;
  assert.equal(s.status.hidden, false);
  assert.equal(s.error.hidden, true);
  s.video.events.playing(); s.video.resolve(); await retry;
});

test('Hidden pages never warm metadata; observer fallback still supports focus preparation', () => {
  const hidden = setup();
  hidden.document.hidden = true;
  hidden.observers[0].callback([{isIntersecting: true}]);
  assert.equal(hidden.video.attrs.src, undefined);
  assert.equal(hidden.observers[0].connected, true);
  const fallback = setup({intersection: false});
  assert.equal(fallback.video.attrs.src, undefined);
  fallback.start.events.focus();
  assert.equal(fallback.video.preload, 'metadata');
  assert.equal(fallback.video.plays, 0);
});
