(function (factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', api.init);
  else api.init();
})(function () {
  const KEY = 'inquiryList';
  const validModel = value => typeof value === 'string' && /^[A-Z]{1,3}\d{3,4}(?:-[A-Z0-9]{1,8})?$/.test(value);
  function read(storage) {
    const raw = storage.getItem(KEY);
    let value;
    try { value = JSON.parse(raw || '[]'); } catch { value = []; }
    return [...new Set((Array.isArray(value) ? value : []).filter(validModel))];
  }
  function add(storage, model) {
    if (!validModel(model)) throw Error('Invalid product model');
    const list = read(storage);
    if (!list.includes(model)) {
      storage.setItem(KEY, JSON.stringify([...list, model]));
      if (!read(storage).includes(model)) throw Error('Inquiry list was not saved');
    }
    return read(storage);
  }
  function init() {
    const button = document.getElementById('addInquiry');
    const model = location.pathname.match(/\/products\/([^/]+)\/?$/)?.[1];
    if (!button || !validModel(model) || button.dataset.inquiryReady) return;
    button.dataset.inquiryReady = 'true';
    const chinese = document.documentElement.lang.toLowerCase().startsWith('zh');
    const originalLabel = button.textContent;
    const originalOpacity = button.style.opacity;
    const error = document.createElement('p');
    error.id = 'inquiry-save-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    error.style.cssText = 'font-size:13px;line-height:1.5;margin:12px 0 0;';
    button.parentElement.after(error);
    function render(list) {
      const selected = list.includes(model);
      button.disabled = selected;
      button.textContent = selected ? (chinese ? '\u2713 已加入詢價清單' : '\u2713 In Inquiry List') : originalLabel;
      button.style.opacity = selected ? '0.6' : originalOpacity;
    }
    function sync() {
      try { render(read(localStorage)); error.hidden = true; }
      catch { render([]); }
    }
    button.addEventListener('click', () => {
      try { render(add(localStorage, model)); error.hidden = true; }
      catch {
        render([]);
        error.textContent = chinese
          ? '此瀏覽器無法儲存詢價清單。請使用旁邊的「索取報價」直接詢問此型號，或稍後重試。'
          : 'This browser could not save your inquiry list. Use Request Quote beside this button to inquire about this model, or try again.';
        error.hidden = false;
      }
    });
    // BFCache keeps the old DOM; always reconcile it with current storage.
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', event => {
      if (event.key === KEY || event.key === null) sync();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') sync();
    });
    sync();
  }
  return { KEY, validModel, read, add, init };
});
