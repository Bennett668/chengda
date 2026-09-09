(function () {
  'use strict';
  var key = 'chengda.analytics.exclude.v1';
  var checkbox = document.getElementById('exclude-analytics');
  var status = document.getElementById('status');

  function render() {
    try {
      checkbox.checked = window.localStorage.getItem(key) === '1';
      checkbox.disabled = false;
      status.textContent = checkbox.checked
        ? '\u5df2\u6392\u9664\u6b64\u700f\u89bd\u5668 / This browser is excluded'
        : '\u6b64\u700f\u89bd\u5668\u672a\u6392\u9664 / This browser is not excluded';
    } catch (error) {
      checkbox.disabled = true;
      status.textContent = '\u7121\u6cd5\u5132\u5b58\u8a2d\u5b9a / Browser storage is unavailable';
    }
  }

  checkbox.addEventListener('change', function () {
    try {
      if (checkbox.checked) window.localStorage.setItem(key, '1');
      else window.localStorage.removeItem(key);
      render();
    } catch (error) {
      checkbox.checked = false;
      checkbox.disabled = true;
      status.textContent = '\u8a2d\u5b9a\u672a\u5132\u5b58 / Preference was not saved';
    }
  });
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) render();
  });
  render();
}());
