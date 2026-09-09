// Isolated browser QA. Every analytics collection request is blocked locally.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const origin = 'https://www.gdchengda.hk';
const tag = fs.readFileSync(process.env.GA_TAG_FILE, 'utf8');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext();
    const collections = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname.endsWith('google-analytics.com') || url.hostname.endsWith('analytics.google.com')) {
        collections.push(url.href);
        return route.abort();
      }
      if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') {
        return route.fulfill({ contentType: 'application/javascript', body: tag });
      }
      if (url.origin === origin) {
        const file = path.join(root, decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
        if (file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file });
      }
      return route.abort();
    });
    const page = await context.newPage();
    await page.goto(origin + '/products/');
    await page.waitForTimeout(4000);
    assert.ok(collections.length > 0, 'normal visitor must attempt collection');
    const normal = collections.length;
    await page.goto(origin + '/analytics-preferences/');
    assert.equal(await page.locator('#exclude-analytics').isChecked(), false);
    await page.locator('#exclude-analytics').check();
    assert.match(await page.locator('#status').innerText(), /is excluded/);
    await page.reload();
    assert.equal(await page.locator('#exclude-analytics').isChecked(), true);
    for (const viewport of [{width: 1280, height: 800}, {width: 375, height: 812}]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      await page.screenshot({ path: `/tmp/chengda-analytics-preferences-${viewport.width}.png` });
    }
    const before = collections.length;
    for (const pathname of ['/products/', '/zh/products/', '/blog/sanitaryware-certifications-for-export/']) {
      await page.goto(origin + pathname);
      await page.waitForTimeout(2500);
      assert.equal(await page.evaluate(() => window['ga-disable-G-J7PPP48QXC']), true);
    }
    assert.equal(collections.length, before, 'excluded browser must not attempt collection');
    await page.goto(origin + '/analytics-preferences/');
    await page.locator('#exclude-analytics').uncheck();
    assert.match(await page.locator('#status').innerText(), /not excluded/);
    await page.goto(origin + '/products/');
    assert.equal(await page.evaluate(() => window['ga-disable-G-J7PPP48QXC']), false);
    await page.waitForTimeout(12000);
    assert.ok(collections.length > before, 'disabling exclusion must restore collection: ' + JSON.stringify(collections));
    console.log(JSON.stringify({normalVisitorCollectionAttempts: normal, excludedAcrossThreePages: 0, restoredCollection: true, requestsSentToAnalytics: 0, screenshots: [1280,375]}));
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
