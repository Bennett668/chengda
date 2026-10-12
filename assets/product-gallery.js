(() => {
  const main = document.getElementById('pd-main');
  const thumbs = Array.from(document.querySelectorAll('.pd-thumb'));
  if (!main || !thumbs.length) return;
  const chinese = document.documentElement.lang.toLowerCase().startsWith('zh');
  const panel = document.querySelector('.pd-hero');
  const list = document.querySelector('.pd-thumbs');
  if (panel) { panel.id = 'pd-gallery-panel'; panel.setAttribute('role', 'tabpanel'); }
  if (list) {
    list.setAttribute('role', 'tablist');
    if (!list.getAttribute('aria-label')) list.setAttribute('aria-label', chinese ? '產品圖片' : 'Product photos');
  }
  let index = Math.max(0, thumbs.findIndex(thumb => thumb.getAttribute('aria-selected') === 'true'));
  function select(next) {
    index = (next + thumbs.length) % thumbs.length;
    // Only the chosen full-resolution photo is requested; no automatic advance.
    main.src = thumbs[index].dataset.src;
    main.alt = thumbs[index].dataset.alt || main.alt;
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === index);
      thumb.setAttribute('aria-selected', String(i === index));
      thumb.tabIndex = i === index ? 0 : -1;
    });
    if (panel) panel.setAttribute('aria-labelledby', thumbs[index].id);
  }
  thumbs.forEach((thumb, i) => {
    thumb.id = 'pd-gallery-tab-' + (i + 1);
    thumb.setAttribute('role', 'tab');
    const label = thumb.getAttribute('aria-label') || thumb.dataset.alt || main.alt || (chinese ? '產品圖片' : 'Product photo');
    thumb.setAttribute('aria-label', label + ' (' + (i + 1) + '/' + thumbs.length + ')');
    if (panel) thumb.setAttribute('aria-controls', panel.id);
    thumb.addEventListener('click', () => select(i));
    thumb.addEventListener('keydown', event => {
      const next = {ArrowLeft:index - 1, ArrowRight:index + 1, Home:0, End:thumbs.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      thumbs[index].focus({preventScroll:true});
    });
  });
  document.querySelector('.pd-arrow.prev')?.addEventListener('click', () => select(index - 1));
  document.querySelector('.pd-arrow.next')?.addEventListener('click', () => select(index + 1));
  select(index);
})();
