(() => {
  const main = document.getElementById('pd-main');
  const thumbs = Array.from(document.querySelectorAll('.pd-thumb'));
  let index = 0;
  function select(next) {
    index = (next + thumbs.length) % thumbs.length;
    main.src = thumbs[index].dataset.src;
    main.alt = thumbs[index].dataset.alt || main.alt;
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle('is-active', i === index);
      thumb.setAttribute('aria-selected', String(i === index));
      thumb.tabIndex = i === index ? 0 : -1;
    });
  }
  if (main && thumbs.length) {
    thumbs.forEach((thumb, i) => {
      thumb.addEventListener('click', () => select(i));
      thumb.addEventListener('keydown', event => {
        const next = {ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: thumbs.length - 1}[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next);
        thumbs[index].focus();
      });
    });
    document.querySelector('.pd-arrow.prev')?.addEventListener('click', () => select(index - 1));
    document.querySelector('.pd-arrow.next')?.addEventListener('click', () => select(index + 1));
    select(0);
  }

  const video = document.getElementById('pd-video');
  const start = document.querySelector('.pd-film-start');
  const error = document.getElementById('pd-video-error');
  if (!video || !start) return;
  // Audio starts only with the visitor's explicit play click.
  start.addEventListener('click', async () => {
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    video.muted = false;
    video.controls = true;
    start.hidden = true;
    error.hidden = true;
    try {
      await video.play();
    } catch {
      error.hidden = true;
      if (video.error) error.hidden = false;
    }
  });
  video.addEventListener('error', () => { error.hidden = false; start.hidden = true; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  window.addEventListener('pagehide', () => video.pause());
})();
