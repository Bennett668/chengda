const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/video-wall.js'), 'utf8');

function setup(lang = 'en', originalSource = null) {
  class Element {
    constructor(tag) { this.tag = tag; this.attrs = {}; this.events = {}; this.children = []; this.hidden = false; this.isConnected = true; this.classes = new Set(); this.classList = {add: x => this.classes.add(x), remove: x => this.classes.delete(x)}; }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return this.attrs[k] ?? null; }
    removeAttribute(k) { delete this.attrs[k]; }
    addEventListener(k, fn) { (this.events[k] ||= []).push(fn); }
    emit(k, event = {}) { for (const fn of this.events[k] || []) fn(event); }
    appendChild(child) { this.children.push(child); child.parent = this; }
    append(...children) { children.forEach(c => this.appendChild(c)); }
    prepend(child) { this.children.unshift(child); child.parent = this; }
    remove() { this.parent.children = this.parent.children.filter(x => x !== this); this.isConnected = false; }
    focus(options) { this.focused = (this.focused || 0) + 1; this.focusOptions = options; }
    showModal() { this.open = true; }
    close() { this.open = false; this.emit('close'); }
  }
  const body = new Element('body'), frame = new Element('div'), trigger = new Element('button');
  const image = new Element('img'); image.attrs.src = '/assets/videos/example-poster.webp'; image.alt = 'Actual poster';
  frame.querySelector = s => s === 'img' ? image : trigger;
  const card = new Element('figure'); card.attrs['data-src'] = '/assets/videos/example.mp4';
  if (originalSource) card.attrs['data-original-src'] = originalSource;
  card.querySelector = s => s === '.v-frame' ? frame : {textContent: 'Example clip'};
  const videos = [], docEvents = {}, winEvents = {}, timers = new Map(); let clock = 0, requests = 0;
  const document = {body, hidden: false, documentElement: {lang, style: {overflow: 'clip'}}, querySelectorAll: () => [card], addEventListener: (k, fn) => { docEvents[k] = fn; }, createElement(tag) {
    const el = new Element(tag);
    if (tag === 'video') {
      el.paused = true; el.loads = 0; el.plays = 0;
      Object.defineProperty(el, 'src', {set(value) { this.attrs.src = value; requests++; }});
      Object.defineProperty(el, 'poster', {set(value) { this.attrs.poster = value; }});
      el.pause = () => { el.paused = true; el.emit('pause'); };
      el.load = () => { el.loads++; };
      el.play = () => { el.plays++; el.paused = false; return new Promise((resolve, reject) => { el.resolve = resolve; el.reject = reject; }); };
      videos.push(el);
    }
    return el;
  }};
  vm.runInNewContext(source, {document, window: {addEventListener: (k, fn) => { winEvents[k] = fn; }}, setTimeout(fn, delay) { timers.set(++clock, {fn, delay}); return clock; }, clearTimeout(id) { timers.delete(id); }});
  const dialog = body.children[0];
  return {document, frame, trigger, videos, dialog, timers, docEvents, winEvents, get requests() { return requests; }, open() { frame.emit('click'); return videos.at(-1); }, get player() { return dialog.children.find(x => x.className === 'v-lightbox-player'); }, get message() { return this.player.children.find(x => x.className === 'v-lightbox-message'); }, get retry() { return this.message.children[1]; }};
}

test('Video wall is cold until explicit click, then uses the real poster and manual sound', () => {
  const s = setup(); assert.equal(s.requests, 0); assert.equal(s.videos.length, 0);
  const video = s.open();
  assert.equal(s.requests, 1); assert.equal(video.plays, 1); assert.equal(video.muted, false); assert.equal(video.controls, true);
  assert.equal(video.attrs.poster, '/assets/videos/example-poster.webp'); assert.equal(video.autoplay, undefined);
  assert.equal(s.player.attrs['aria-busy'], 'true'); assert.equal(s.message.hidden, false); assert.equal(s.retry.hidden, true);
  assert.equal(s.message.children[0].textContent, 'Loading video...');
  assert.equal([...s.timers.values()][0].delay, 15000);
  video.emit('playing'); assert.equal(s.message.hidden, true); assert.equal(s.timers.size, 0);
});

test('Error gives an explicit localized retry and no automatic request', () => {
  for (const lang of ['en', 'zh-Hant']) {
    const s = setup(lang), video = s.open(); video.emit('error');
    assert.equal(s.retry.hidden, false); assert.equal(s.requests, 1); assert.equal(video.paused, true); assert.equal(video.attrs.src, undefined);
    assert.equal(s.retry.textContent, lang === 'en' ? 'Retry video' : '重試影片');
    assert.equal(s.player.attrs['aria-busy'], 'false'); assert.equal(s.timers.size, 0);
    s.retry.emit('click'); assert.equal(s.requests, 2); assert.equal(s.videos.length, 2);
    assert.equal(video.isConnected, false); assert.equal(s.videos[1].muted, false);
  }
});

test('Timeout aborts old playback; stale events and rejections cannot undo a fresh retry', async () => {
  const s = setup(), old = s.open(), rejectOld = old.reject; [...s.timers.values()][0].fn();
  assert.equal(s.retry.hidden, false); assert.equal(old.paused, true); assert.equal(old.attrs.src, '/assets/videos/example.mp4');
  old.emit('playing'); assert.equal(old.paused, true); assert.equal(s.requests, 1);
  s.retry.emit('click'); const fresh = s.videos.at(-1);
  assert.equal(fresh, old); assert.equal(fresh.loads, 0);
  rejectOld(new Error('Late AbortError')); await Promise.resolve(); await Promise.resolve();
  assert.equal(s.message.children[0].textContent, 'Loading video...'); assert.equal(s.retry.hidden, true);
  fresh.emit('playing'); assert.equal(s.message.hidden, true); assert.equal(s.requests, 1);
});

test('Close, Escape cancellation, backdrop and pagehide all cancel and restore the real trigger', () => {
  for (const method of ['button', 'escape', 'backdrop', 'pagehide', 'native']) {
    const s = setup(), video = s.open();
    if (method === 'button') s.dialog.children[0].emit('click');
    if (method === 'escape') s.dialog.emit('cancel', {preventDefault() {}});
    if (method === 'backdrop') s.dialog.emit('click', {target: s.dialog});
    if (method === 'pagehide') s.winEvents.pagehide();
    if (method === 'native') s.dialog.close();
    assert.equal(s.dialog.open, false); assert.equal(s.dialog.children.length, 1); assert.equal(video.attrs.src, undefined);
    assert.equal(video.paused, true); assert.equal(s.timers.size, 0); assert.equal(s.trigger.focused, 1);
    assert.equal(s.trigger.focusOptions.preventScroll, true); assert.equal(s.document.documentElement.style.overflow, 'clip');
    video.emit('playing'); assert.equal(video.paused, true); assert.equal(s.requests, 1);
  }
});

test('A rejected play promise exposes recovery and hidden pages cannot restart', async () => {
  const s = setup(), video = s.open(); video.reject(new Error('NotAllowedError')); await Promise.resolve(); await Promise.resolve();
  assert.equal(s.retry.hidden, false);
  s.retry.emit('click'); const next = s.videos.at(-1);
  s.document.hidden = true; s.docEvents.visibilitychange();
  assert.equal(next.paused, true); assert.equal(next.attrs.src, undefined); assert.equal(s.retry.hidden, false);
  s.retry.emit('click'); assert.equal(s.requests, 2);
  s.document.hidden = false; assert.equal(s.requests, 2);
  s.retry.emit('click'); assert.equal(s.requests, 3);
});

test('Buffering is bounded and a native pause clears the loading deadline', () => {
  const s = setup(), video = s.open(); video.emit('playing'); video.emit('waiting');
  assert.equal(s.message.hidden, false); assert.equal(s.timers.size, 1);
  video.emit('waiting'); assert.equal(s.timers.size, 1);
  video.pause(); assert.equal(s.timers.size, 0); assert.equal(s.message.hidden, true);
});

test('Hiding an already-playing clip preserves its source and position until explicit resume', () => {
  const s = setup(), video = s.open(); video.emit('playing'); video.currentTime = 8.5;
  s.document.hidden = true; s.docEvents.visibilitychange();
  assert.equal(video.attrs.src, '/assets/videos/example.mp4'); assert.equal(video.currentTime, 8.5);
  assert.equal(video.paused, true); assert.equal(s.retry.textContent, 'Resume video');
  s.document.hidden = false; s.docEvents.visibilitychange();
  video.emit('playing'); assert.equal(video.paused, true); assert.equal(video.plays, 1);
  s.retry.emit('click'); assert.equal(video.plays, 2); assert.equal(s.videos.length, 1); assert.equal(video.currentTime, 8.5);
  assert.equal(s.requests, 1); video.emit('playing'); assert.equal(s.message.hidden, true);
});

test('An optional original-quality link points to the untouched source and is removed on close', () => {
  const s = setup('en', '/assets/videos/original.mp4');s.open();
  const link = s.dialog.children.find(x => x.className === 'v-lightbox-original');
  assert.equal(link.href, '/assets/videos/original.mp4');assert.equal(link.target, '_blank');assert.equal(link.rel, 'noopener');
  s.dialog.children[0].emit('click');assert.equal(link.isConnected, false);assert.equal(s.dialog.children.length, 1);
});

test('Hiding during buffering after real playback preserves the existing position too', () => {
  const s=setup(),video=s.open();video.emit('playing');video.currentTime=3.5;video.emit('waiting');
  s.document.hidden=true;s.docEvents.visibilitychange();
  assert.equal(video.attrs.src,'/assets/videos/example.mp4');assert.equal(video.currentTime,3.5);assert.equal(video.paused,true);
  s.document.hidden=false;s.docEvents.visibilitychange();assert.equal(video.plays,1);
  s.retry.emit('click');assert.equal(video.plays,2);assert.equal(video.currentTime,3.5);assert.equal(s.videos.length,1);
});
