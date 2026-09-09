/* Catalog requests use the site's existing FormSubmit mailbox. */
(function (factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else window.initCatalogRequest = api.init;
})(function () {
  const ENDPOINT = 'https://formsubmit.co/ajax/sales@gdchengda.hk';
  const SESSION_KEY = 'chengda.catalog.prompt.v1';
  const COPY = {
    en: {
      launch: 'Get the catalog', close: 'Close catalog request', title: 'Latest product catalog.',
      intro: 'Leave your email or WhatsApp. Our team will contact you with the catalog.',
      method: 'How should we contact you?', email: 'Email', emailLabel: 'Email address', phoneLabel: 'WhatsApp number',
      optional: 'Company details (optional)', name: 'Name', company: 'Company',
      updatesEmail: 'Also send me occasional product updates by email.',
      updatesPhone: 'Also send me occasional product updates on WhatsApp.',
      submit: 'Send me the catalog', sending: 'Sending request...', dismiss: 'No thanks, keep browsing',
      privacy: 'Your details are used for this request. Product updates are optional.',
      privacyTitle: 'How we use your details',
      privacyDetails: 'Submitting shares your chosen contact details, optional company details and this page with Chengda via FormSubmit. We use them to respond to your catalog request. We do not send your form entries before you submit. To withdraw an update subscription or request deletion, contact sales@gdchengda.hk.',
      processor: 'FormSubmit privacy policy',
      invalidEmail: 'Please enter a valid email address.',
      invalidPhone: 'Please include your country code, for example +1 234 567 8900.',
      failure: "We couldn't confirm your request. Please try again or contact us on WhatsApp.",
      fallback: 'Contact us on WhatsApp', success: 'Request received.',
      successEmail: 'Our team will contact you by email to share the catalog and discuss your needs.',
      successPhone: 'Our team will contact you on WhatsApp to share the catalog and discuss your needs.',
      continue: 'Continue browsing',
      fallbackMessage: "Hi Chengda, I'd like to receive your latest product catalog."
    },
    zh: {
      launch: '領取產品目錄', close: '關閉目錄申請', title: '領取最新產品目錄',
      intro: '留下郵箱或 WhatsApp，我們會聯絡您並提供產品目錄。',
      method: '您希望我們如何聯絡您？', email: '郵箱', emailLabel: '郵箱地址', phoneLabel: 'WhatsApp 號碼',
      optional: '公司資料（選填）', name: '姓名', company: '公司',
      updatesEmail: '我也願意透過郵箱接收新品消息。',
      updatesPhone: '我也願意透過 WhatsApp 接收新品消息。',
      submit: '發送產品目錄給我', sending: '正在提交申請…', dismiss: '暫時不用，繼續瀏覽',
      privacy: '資料用於處理本次目錄申請；新品消息可自由選擇訂閱。',
      privacyTitle: '資料使用說明',
      privacyDetails: '提交後，您選擇的聯絡資料、選填的公司資料及本頁網址會透過 FormSubmit 傳送給程達，用於回覆本次目錄申請。在您提交前，我們不會傳送表單內容。如需取消新品消息或申請刪除資料，請聯絡 sales@gdchengda.hk。',
      processor: 'FormSubmit 私隱政策',
      invalidEmail: '請輸入有效的郵箱地址。',
      invalidPhone: '請包含國際區號，例如 +852 9123 4567。',
      failure: '未能確認申請是否送達，請重試，或透過 WhatsApp 聯絡我們。',
      fallback: '透過 WhatsApp 聯絡我們', success: '已收到您的申請。',
      successEmail: '我們會透過郵箱聯絡您，提供產品目錄並了解您的需求。',
      successPhone: '我們會透過 WhatsApp 聯絡您，提供產品目錄並了解您的需求。',
      continue: '繼續瀏覽', fallbackMessage: '您好，程達衛浴，我想索取最新產品目錄。'
    }
  };

  function phoneIsValid(value) {
    const phone = value.trim();
    const digits = phone.replace(/\D/g, '');
    return /^\+[1-9][\d ()-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15;
  }

  function contextFor(url) {
    const page = new URL(url);
    const match = page.pathname.match(/^\/(?:zh\/)?products\/([A-Z0-9-]{1,24})\/?$/);
    return { page: page.origin + page.pathname, product: match ? match[1] : '' };
  }

  function buildPayload(input) {
    const context = contextFor(input.url);
    const method = input.method === 'whatsapp' ? 'WhatsApp' : 'Email';
    const text = COPY[input.language] || COPY.en;
    const consentText = method === 'Email' ? text.updatesEmail : text.updatesPhone;
    const payload = {
      _subject: 'Catalog request' + (context.product ? ' | ' + context.product : '') + ' | gdchengda.hk',
      _template: 'table',
      _honey: '',
      request: 'Please contact this customer personally with the latest product catalog. No catalog has been sent automatically.',
      preferred_contact: method,
      name: input.name.trim().slice(0, 80),
      company: input.company.trim().slice(0, 120),
      source_page: context.page,
      interested_product: context.product || 'Not specified',
      language: input.language === 'zh' ? 'Traditional Chinese' : 'English',
      product_updates: input.updates ? 'OPTED IN - ' + method : 'NOT opted in - reply to this catalog request only',
      update_consent_text: input.updates ? consentText : 'No marketing consent given',
      privacy_notice_version: 'catalog-request-2026-09-09',
      submitted_at: input.timestamp,
      request_id: input.requestId
    };
    if (method === 'Email') payload.email = input.contact.trim();
    else payload.whatsapp = input.contact.trim();
    return payload;
  }

  async function sendRequest(payload, fetcher, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs || 20000);
    try {
      const response = await fetcher(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
        credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin'
      });
      const result = await response.json();
      if (!response.ok || !result || (result.success !== true && result.success !== 'true')) {
        throw new Error('Catalog request was not accepted');
      }
    } finally {
      clearTimeout(timer);
    }
  }

  function autoEligible(pathname) {
    const path = pathname.replace(/^\/zh(?=\/|$)/, '') || '/';
    return path === '/' || /^\/(?:products(?:\/[A-Z0-9-]+)?|about|oem)\/?$/.test(path);
  }

  function init() {
    if (document.getElementById('catalog-request')) return;
    const language = /^\/zh(?:\/|$)/.test(location.pathname) ? 'zh' : 'en';
    const text = COPY[language];
    const icon = name => '<span class="catalog-icon catalog-icon-' + name + '" aria-hidden="true"></span>';
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'catalog-launch';
    launcher.setAttribute('aria-controls', 'catalog-request');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = icon('book') + '<span>' + text.launch + '</span>';
    const panel = document.createElement('aside');
    panel.id = 'catalog-request';
    panel.className = 'catalog-request';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'catalog-request-title');
    panel.innerHTML = `
      <div class="catalog-header">
        <span class="catalog-brand">Chengda</span>
        <button type="button" class="catalog-close" aria-label="${text.close}" title="${text.close}">${icon('close')}</button>
      </div>
      <div class="catalog-content">
        <h2 id="catalog-request-title">${text.title}</h2>
        <form class="catalog-form" action="https://formsubmit.co/sales@gdchengda.hk" method="POST" novalidate>
          <p class="catalog-intro">${text.intro}</p>
          <fieldset class="catalog-fields">
            <fieldset class="catalog-methods">
              <legend class="catalog-sr">${text.method}</legend>
              <label><input type="radio" name="catalog_method" value="email" checked /><span>${text.email}</span></label>
              <label><input type="radio" name="catalog_method" value="whatsapp" /><span>WhatsApp</span></label>
            </fieldset>
            <label class="catalog-field" data-contact-field="email"><span>${text.emailLabel} *</span><input id="catalog-email" name="email" type="email" autocomplete="email" placeholder="you@company.com" required maxlength="120" /></label>
            <label class="catalog-field" data-contact-field="whatsapp" hidden><span>${text.phoneLabel} *</span><input id="catalog-whatsapp" name="whatsapp" type="tel" inputmode="tel" autocomplete="tel" placeholder="+1 234 567 8900" maxlength="30" disabled /></label>
            <p class="catalog-validation" id="catalog-validation" role="alert" hidden></p>
            <details class="catalog-details"><summary>${text.optional}</summary>
              <div class="catalog-optional">
                <label class="catalog-field"><span>${text.name}</span><input name="name" type="text" autocomplete="name" maxlength="80" /></label>
                <label class="catalog-field"><span>${text.company}</span><input name="company" type="text" autocomplete="organization" maxlength="120" /></label>
              </div>
            </details>
            <label class="catalog-updates"><input type="checkbox" name="product_updates" /><span>${text.updatesEmail}</span></label>
            <label class="catalog-trap" aria-hidden="true">Leave this field empty<input name="_honey" type="text" tabindex="-1" autocomplete="off" /></label>
            <button class="catalog-submit" type="submit"><span>${text.submit}</span>${icon('arrow')}</button>
          </fieldset>
          <div class="catalog-error" role="alert" hidden><p>${text.failure}</p><a class="catalog-fallback" target="_blank" rel="noopener">${text.fallback}</a></div>
          <p class="catalog-privacy">${text.privacy}</p>
          <details class="catalog-privacy-details"><summary>${text.privacyTitle}</summary><p>${text.privacyDetails}</p><a href="https://formsubmit.co/privacy.pdf" target="_blank" rel="noopener">${text.processor}</a></details>
          <button class="catalog-dismiss" type="button">${text.dismiss}</button>
        </form>
        <div class="catalog-success" role="status" tabindex="-1" hidden>
          ${icon('check')}<h3>${text.success}</h3><p></p>
          <button type="button" class="catalog-done">${text.continue}</button>
        </div>
      </div>`;
    document.body.append(launcher, panel);
    const form = panel.querySelector('form');
    const fields = form.querySelector('.catalog-fields');
    const validation = form.querySelector('.catalog-validation');
    const error = form.querySelector('.catalog-error');
    const success = panel.querySelector('.catalog-success');
    const title = panel.querySelector('h2');
    const updates = form.elements.product_updates;
    const submit = form.querySelector('.catalog-submit');
    const fallback = form.querySelector('.catalog-fallback');
    fallback.href = 'https://wa.me/12132160960?text=' + encodeURIComponent(text.fallbackMessage);
    let method = 'email';
    let pending = false;
    let timer;
    let remaining = 30000;
    let started = 0;
    let shown = false;
    let requestId = '';
    try { shown = sessionStorage.getItem(SESSION_KEY) === 'shown'; } catch (_) {}

    function rememberShown() {
      shown = true;
      clearTimeout(timer);
      started = 0;
      try { sessionStorage.setItem(SESSION_KEY, 'shown'); } catch (_) {}
    }
    function open(manual) {
      rememberShown();
      panel.hidden = false;
      launcher.hidden = true;
      launcher.setAttribute('aria-expanded', 'true');
      if (manual) {
        if (!success.hidden) success.focus();
        else form.elements[method].focus();
      }
    }
    function close() {
      const hadFocus = panel.contains(document.activeElement);
      rememberShown();
      panel.hidden = true;
      launcher.hidden = false;
      launcher.setAttribute('aria-expanded', 'false');
      if (hadFocus) launcher.focus();
    }
    launcher.addEventListener('click', () => open(true));
    panel.querySelectorAll('.catalog-close, .catalog-dismiss, .catalog-done').forEach(button => button.addEventListener('click', close));
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    });
    form.querySelectorAll('input[name="catalog_method"]').forEach(radio => radio.addEventListener('change', () => {
      method = radio.value;
      ['email', 'whatsapp'].forEach(channel => {
        form.querySelector('[data-contact-field="' + channel + '"]').hidden = method !== channel;
        form.elements[channel].disabled = method !== channel;
        form.elements[channel].required = method === channel;
        form.elements[channel].removeAttribute('aria-invalid');
      });
      updates.checked = false;
      updates.nextElementSibling.textContent = method === 'email' ? text.updatesEmail : text.updatesPhone;
      validation.hidden = true;
      error.hidden = true;
      requestId = '';
    }));
    form.addEventListener('input', () => {
      form.elements[method].removeAttribute('aria-invalid');
      validation.hidden = true;
      requestId = '';
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (pending) return;
      const input = form.elements[method];
      input.value = input.value.trim();
      const valid = method === 'email' ? input.checkValidity() : phoneIsValid(input.value);
      if (!valid) {
        validation.textContent = method === 'email' ? text.invalidEmail : text.invalidPhone;
        validation.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'catalog-validation');
        input.focus();
        return;
      }
      if (form.elements._honey.value) { error.hidden = false; return; }
      if (!requestId) requestId = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random().toString(36).slice(2);
      const payload = buildPayload({
        method, contact: input.value, name: form.elements.name.value, company: form.elements.company.value,
        updates: updates.checked, language, url: location.href, timestamp: new Date().toISOString(), requestId
      });
      const submittedMethod = method;
      pending = true;
      fields.disabled = true;
      form.setAttribute('aria-busy', 'true');
      submit.querySelector('span').textContent = text.sending;
      error.hidden = true;
      validation.hidden = true;
      try {
        await sendRequest(payload, window.fetch.bind(window));
        const hadFocus = panel.contains(document.activeElement);
        form.reset();
        form.hidden = true;
        title.hidden = true;
        success.querySelector('p').textContent = submittedMethod === 'email' ? text.successEmail : text.successPhone;
        success.hidden = false;
        rememberShown();
        if (!panel.hidden && hadFocus) success.focus();
      } catch (_) {
        error.hidden = false;
      } finally {
        pending = false;
        fields.disabled = false;
        form.setAttribute('aria-busy', 'false');
        submit.querySelector('span').textContent = text.submit;
      }
    });

    function schedule() {
      clearTimeout(timer);
      if (shown || document.hidden || !autoEligible(location.pathname)) return;
      started = Date.now();
      timer = setTimeout(() => {
        remaining = 0;
        started = 0;
        const focused = document.activeElement;
        const editing = focused && (focused.matches('input, textarea, select') || focused.isContentEditable);
        const overlay = Array.from(document.querySelectorAll('.nav-drawer.open, dialog[open], [aria-modal="true"]:not([hidden])'))
          .some(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
        if (editing || overlay) { remaining = 5000; schedule(); return; }
        if (!document.hidden && !shown) open(false);
      }, remaining);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && started) remaining = Math.max(0, remaining - (Date.now() - started));
      schedule();
    });
    window.addEventListener('pagehide', () => clearTimeout(timer));
    window.addEventListener('pageshow', schedule);
    schedule();
  }
  return { init, phoneIsValid, contextFor, buildPayload, sendRequest, autoEligible, COPY };
});
