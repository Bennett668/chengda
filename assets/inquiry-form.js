(function (factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else document.addEventListener('DOMContentLoaded', api.init);
})(function () {
  const DRAFT_KEY = 'chengda.inquiry.language-draft.v1';
  const DRAFT_FIELDS = ['name', 'company', 'email', 'phone', 'country', 'quantity', 'message'];
  function readDraft(storage, pathname, now = Date.now()) {
    try {
      const raw = storage.getItem(DRAFT_KEY);
      storage.removeItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (draft.target !== pathname || !Number.isFinite(draft.savedAt) || now < draft.savedAt || now - draft.savedAt > 30 * 60 * 1000) return null;
      if (!draft.fields || DRAFT_FIELDS.some(key => typeof draft.fields[key] !== 'string')) return null;
      if (typeof draft.generated !== 'string' || !Array.isArray(draft.models)) return null;
      if (!Number.isInteger(draft.orderType) || draft.orderType < 0 || draft.orderType > 3) return null;
      return draft;
    } catch { return null; }
  }
  const validModel = (value) => typeof value === 'string' && /^[A-Z]{1,3}\d{3,4}(?:-[A-Z0-9]{1,8})?$/.test(value);
  function mergeModels(single, basket) {
    return [...new Set([single, ...(Array.isArray(basket) ? basket : [])].filter(validModel))];
  }
  function updateMessage(value, previous, next) {
    if (!previous || !value.startsWith(previous)) return value;
    const suffix = value.slice(previous.length);
    return next ? next + suffix : suffix.replace(/^\n{1,2}/, '');
  }
  function init() {
    const params = new URLSearchParams(location.search);
    if (params.get('sent') === '1') {
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      return;
    }
    const form = document.querySelector('.form-card form');
    if (!form) return;
    const chinese = document.documentElement.lang.toLowerCase().startsWith('zh');
    let basket;
    try { basket = JSON.parse(localStorage.getItem('inquiryList') || '[]'); } catch { basket = []; }
    const single = params.get('model');
    let list = mergeModels(single, basket);
    let draft;
    try { draft = readDraft(sessionStorage, location.pathname); } catch {}
    if (draft) list = mergeModels(null, draft.models);
    const message = form.querySelector('textarea[name="message"]');
    const sentence = () => !list.length ? '' : chinese
      ? '我想為以下型號索取報價:' + list.join('、') + '。'
      : 'I would like to request a quote for the following ' + (list.length > 1 ? 'models' : 'model') + ': ' + list.join(', ') + '.';
    let generated = '';
    if (draft) {
      for (const key of DRAFT_FIELDS) if (form.elements[key]) form.elements[key].value = draft.fields[key];
      form.elements.order_type.selectedIndex = draft.orderType;
      generated = sentence();
      if (message) message.value = updateMessage(message.value, draft.generated, generated);
    } else if (message && !message.value.trim()) {
      generated = sentence();
      if (generated) message.value = generated + '\n\n';
    }
    const hidden = document.createElement('input');
    hidden.type = 'hidden'; hidden.name = 'inquiry_models';
    form.appendChild(hidden);
    const wrap = document.createElement('div');
    wrap.className = 'full inquiry-chips';
    const label = message?.closest('label');
    if (label) label.before(wrap); else form.prepend(wrap);
    function sync() {
      hidden.value = list.join(', ');
      try { localStorage.setItem('inquiryList', JSON.stringify(list)); } catch {}
      wrap.replaceChildren();
      if (!list.length) return;
      const heading = document.createElement('div');
      heading.className = 'inq-label';
      heading.textContent = (chinese ? '您的詢價清單' : 'Your inquiry list') + ' (' + list.length + ')';
      const pills = document.createElement('div');
      pills.className = 'inq-pills';
      list.forEach((code) => {
        const pill = document.createElement('span');
        pill.className = 'inq-pill';
        pill.textContent = code;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = '\u00d7';
        button.setAttribute('aria-label', (chinese ? '移除 ' : 'Remove ') + code);
        button.addEventListener('click', () => {
          list = list.filter((item) => item !== code);
          const next = sentence();
          if (message) message.value = updateMessage(message.value, generated, next);
          generated = next;
          const url = new URL(location.href);
          if (!list.includes(url.searchParams.get('model'))) url.searchParams.delete('model');
          history.replaceState(null, '', url);
          window.updateLanguageLinks?.();
          sync();
          (wrap.querySelector('button') || message)?.focus();
        });
        pill.appendChild(button);
        pills.appendChild(pill);
      });
      wrap.append(heading, pills);
    }
    sync();
    // A one-use, same-tab handoff. Personal fields never enter URLs or persistent storage.
    document.addEventListener('click', event => {
      const link = event.target.closest('a.lang-switch');
      if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      window.updateLanguageLinks?.();
      const target = new URL(link.href, location.href);
      if (target.origin !== location.origin || !/^\/(?:zh\/)?contact\/$/.test(target.pathname)) return;
      const fields = Object.fromEntries(DRAFT_FIELDS.map(key => [key, form.elements[key]?.value || '']));
      const next = {target:target.pathname, savedAt:Date.now(), fields, generated, models:list, orderType:form.elements.order_type.selectedIndex};
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next)); }
      catch {
        const edited = DRAFT_FIELDS.some(key => key === 'message' ? fields[key].trim() !== generated : fields[key].trim()) || next.orderType !== 0;
        if (edited && !window.confirm(chinese ? '無法暫存未提交的詢價內容。切換語言將清空內容，確定仍要切換？' : 'Your unsent inquiry cannot be kept in this browser. Switch languages and discard it? Choose Cancel to keep editing.')) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    }, true);
    if (validModel(single) && window.matchMedia('(max-width: 760px)').matches && !location.hash) {
      requestAnimationFrame(() => {
        document.getElementById('inquiry-form').scrollIntoView({block:'start'});
      });
    }
  }
  return { validModel, mergeModels, updateMessage, readDraft, DRAFT_KEY, init };
});
