(function (factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else document.addEventListener('DOMContentLoaded', api.init);
})(function () {
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
    if (params.get('sent') === '1') return;
    const form = document.querySelector('.form-card form');
    if (!form) return;
    const chinese = document.documentElement.lang.toLowerCase().startsWith('zh');
    let basket;
    try { basket = JSON.parse(localStorage.getItem('inquiryList') || '[]'); } catch { basket = []; }
    const single = params.get('model');
    let list = mergeModels(single, basket);
    if (!list.length) return;
    const message = form.querySelector('textarea[name="message"]');
    const sentence = () => !list.length ? '' : chinese
      ? '我想為以下型號索取報價:' + list.join('、') + '。'
      : 'I would like to request a quote for the following ' + (list.length > 1 ? 'models' : 'model') + ': ' + list.join(', ') + '.';
    let generated = '';
    if (message && !message.value.trim()) {
      generated = sentence();
      message.value = generated + '\n\n';
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
    if (validModel(single) && window.matchMedia('(max-width: 760px)').matches && !location.hash) {
      requestAnimationFrame(() => {
        document.getElementById('inquiry-form').scrollIntoView({block:'start'});
      });
    }
  }
  return { validModel, mergeModels, updateMessage, init };
});
