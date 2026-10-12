(() => {
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
