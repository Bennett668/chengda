const test = require('node:test');
const assert = require('node:assert/strict');
const { phoneIsValid, contextFor, buildPayload, sendRequest, autoEligible, COPY } = require('../assets/catalog-request.js');

const input = {
  method: 'email', contact: ' customer@example.com ', name: ' Customer ', company: ' Company ',
  updates: false, language: 'en', url: 'https://www.gdchengda.hk/products/A107/?email=private@example.com#contact',
  timestamp: '2026-09-09T12:00:00Z', requestId: 'test-request'
};

test('WhatsApp requires an international number, not a local number or URL', () => {
  for (const value of ['+852 9123 4567', ' +1 (213) 216-0960 ', '+86 13829094740']) assert.equal(phoneIsValid(value), true, value);
  for (const value of ['', '13829094740', '+0123456789', '+1abc2345678', '+123', '+1234567890123456', 'https://wa.me/12345678']) assert.equal(phoneIsValid(value), false, value);
});

test('page context never includes query strings, fragments or unrelated path names in the subject', () => {
  assert.deepEqual(contextFor(input.url), { page: 'https://www.gdchengda.hk/products/A107/', product: 'A107' });
  assert.equal(contextFor('https://www.gdchengda.hk/zh/products/T101/').product, 'T101');
  assert.equal(contextFor('https://www.gdchengda.hk/products/?model=T101').product, '');
  assert.equal(contextFor('https://www.gdchengda.hk/products/%0AInjected/').product, '');
});

test('email request sends only the selected contact and does not opt into marketing', () => {
  const payload = buildPayload(input);
  assert.equal(payload.email, 'customer@example.com');
  assert.equal(payload.name, 'Customer');
  assert.equal(payload.company, 'Company');
  assert.equal(payload.interested_product, 'A107');
  assert.equal(payload._subject, 'Catalog request | A107 | gdchengda.hk');
  assert.equal(payload.request_id, 'test-request');
  assert.match(payload.request, /No catalog has been sent automatically/);
  assert.match(payload.product_updates, /^NOT opted in/);
  assert.equal(payload.update_consent_text, 'No marketing consent given');
  for (const key of ['whatsapp', '_autoresponse', '_captcha', 'browsing_history']) assert.equal(key in payload, false, key);
  assert.equal(JSON.stringify(payload).includes('private@example.com'), false);
});

test('WhatsApp-only requests record the selected language and explicit channel consent', () => {
  const payload = buildPayload({ ...input, method: 'whatsapp', contact: '+852 9123 4567', language: 'zh', updates: true });
  assert.equal(payload.whatsapp, '+852 9123 4567');
  assert.equal('email' in payload, false);
  assert.equal(payload.language, 'Traditional Chinese');
  assert.equal(payload.product_updates, 'OPTED IN - WhatsApp');
  assert.equal(payload.update_consent_text, COPY.zh.updatesPhone);
  assert.equal(buildPayload({ ...input, updates: true }).update_consent_text, COPY.en.updatesEmail);
});

test('optional fields are bounded and missing consent defaults to no subscription', () => {
  const payload = buildPayload({ ...input, updates: undefined, name: 'x'.repeat(200), company: 'y'.repeat(300) });
  assert.equal(payload.name.length, 80);
  assert.equal(payload.company.length, 120);
  assert.match(payload.product_updates, /^NOT opted in/);
});

test('English and Traditional Chinese have matching UI strings', () => {
  assert.deepEqual(Object.keys(COPY.en).sort(), Object.keys(COPY.zh).sort());
  for (const dictionary of Object.values(COPY)) for (const value of Object.values(dictionary)) assert.ok(value.trim());
});

test('automatic prompting is limited to browsing routes, in both languages', () => {
  for (const path of ['/', '/zh/', '/products/', '/products/A107/', '/zh/products/T101/', '/about/', '/zh/oem/']) assert.equal(autoEligible(path), true, path);
  for (const path of ['/contact/', '/zh/contact/', '/blog/', '/videos/', '/privacy/', '/unknown/']) assert.equal(autoEligible(path), false, path);
});

test('transport accepts only an explicit success response and sends one private POST', async () => {
  for (const success of [true, 'true']) {
    let calls = 0;
    const payload = buildPayload(input);
    await sendRequest(payload, async (url, options) => {
      calls++;
      assert.equal(url, 'https://formsubmit.co/ajax/sales@gdchengda.hk');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.referrerPolicy, 'strict-origin-when-cross-origin');
      assert.equal(options.headers.Accept, 'application/json');
      assert.deepEqual(JSON.parse(options.body), payload);
      assert.equal(options.signal.aborted, false);
      return { ok: true, json: async () => ({ success }) };
    });
    assert.equal(calls, 1);
  }
});

test('rejected, unconfirmed and failed requests never report success or silently retry', async () => {
  for (const response of [
    { ok: true, json: async () => ({ success: 'false', message: 'Please activate' }) },
    { ok: true, json: async () => ({ message: 'Unknown result' }) },
    { ok: true, json: async () => null },
    { ok: false, json: async () => ({ success: true }) },
    { ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }
  ]) {
    let calls = 0;
    await assert.rejects(sendRequest({}, async () => { calls++; return response; }));
    assert.equal(calls, 1);
  }
  await assert.rejects(sendRequest({}, async () => { throw new TypeError('Network failure'); }));
});

test('a stalled request aborts so the customer can retry', async () => {
  await assert.rejects(sendRequest({}, async (_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('Request aborted')), { once: true });
  }), 10), /Request aborted/);
});
