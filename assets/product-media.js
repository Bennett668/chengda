(() => {
  const main = document.getElementById('pd-main');
  const video = document.getElementById('pd-video');
  const thumbs = Array.from(document.querySelectorAll('.pd-thumb'));
  if (!main || !video || !thumbs.length) return;
  const error = document.getElementById('pd-video-error');
  let index = 0;

  function select(next, play = false) {
    index = (next + thumbs.length) % thumbs.length;
    const thumb = thumbs[index];
    const isVideo = thumb.dataset.media === 'video';
    video.pause();
    main.hidden = isVideo;
    video.hidden = !isVideo;
    error.hidden = true;
    if (isVideo) {
      // Fetch the video only after a visitor selects it, not on page load.
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      if (play) {
        video.play().catch(() => {});
        video.parentElement?.scrollIntoView({block: 'center', behavior: 'smooth'});
      }
    } else {
      main.src = thumb.dataset.src;
      main.alt = thumb.dataset.alt || main.alt;
    }
    thumbs.forEach((item, i) => {
      item.classList.toggle('is-active', i === index);
      item.setAttribute('aria-selected', String(i === index));
      item.tabIndex = i === index ? 0 : -1;
    });
  }

  thumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => select(i, true));
    thumb.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = index + 1;
      else if (event.key === 'ArrowLeft') next = index - 1;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = thumbs.length - 1;
      else return;
      event.preventDefault();
      select(next);
      thumbs[index].focus();
    });
  });
  document.querySelector('.pd-arrow.prev')?.addEventListener('click', () => select(index - 1, true));
  document.querySelector('.pd-arrow.next')?.addEventListener('click', () => select(index + 1, true));
  video.addEventListener('error', () => { error.hidden = false; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  window.addEventListener('pagehide', () => video.pause());
  select(0);
})();
