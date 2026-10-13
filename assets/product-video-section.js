(() => {
  const video = document.getElementById('pd-video');
  const start = document.querySelector('.pd-film-start');
  const error = document.getElementById('pd-video-error');
  if (!video || !start || !error) return;
  const player = video.parentElement;
  const label = start.getAttribute('aria-label');
  const title = start.title || label;
  const chinese = document.documentElement.lang === 'zh-Hant';
  const loadingLabel = chinese ? '\u8f09\u5165\u5f71\u7247\u4e2d...' : 'Loading video...';
  const retryLabel = chinese ? '\u91cd\u8a66\u5f71\u7247' : 'Retry video';
  const slowLabel = chinese ? '\u8f09\u5165\u6642\u9593\u8f03\u9577...' : 'Taking longer than usual...';
  const status = document.createElement('span');
  status.className = 'pd-film-status';
  status.setAttribute('role', 'status');
  status.hidden = true;
  status.textContent = loadingLabel;
  player.append(status);
  let requested = false;
  let attempt = 0;
  let pendingTimer;
  let retryPending = false;

  function loading(active) {
    clearTimeout(pendingTimer);
    player.setAttribute('aria-busy', String(active));
    start.classList.toggle('is-loading', active);
    start.disabled = active;
    start.setAttribute('aria-label', active ? loadingLabel : label);
    start.title = active ? loadingLabel : title;
    status.textContent = loadingLabel;
    status.hidden = !active;
    if (active && !start.hidden) {
      pendingTimer = setTimeout(() => {
        video.pause();
        reset();
        video.preload = 'none';
        retryPending = true;
        start.disabled = false;
        start.classList.toggle('is-loading', false);
        start.setAttribute('aria-label', retryLabel);
        start.title = retryLabel;
        status.textContent = slowLabel;
        status.hidden = false;
      }, 15000);
    }
  }

  function prepare() {
    if (document.hidden || video.getAttribute('src')) return;
    video.preload = 'metadata';
    video.src = video.dataset.src;
  }

  // Keep distant videos unloaded; respect a visitor's data-saving connection.
  const connection = navigator.connection;
  const economical = connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || '');
  let observer;
  if (!economical) {
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting) && !document.hidden) {
          prepare();
          observer.disconnect();
        }
      }, { rootMargin: '400px 0px' });
      observer.observe(player);
    }
    start.addEventListener('pointerenter', prepare);
    start.addEventListener('focus', prepare);
  }

  function reset() {
    requested = false;
    retryPending = false;
    attempt++;
    loading(false);
    start.hidden = false;
  }

  video.addEventListener('loadedmetadata', () => {
    if (!requested) video.preload = 'none';
  });

  start.addEventListener('click', async () => {
    observer?.disconnect();
    const restart = retryPending;
    retryPending = false;
    requested = true;
    const current = ++attempt;
    loading(true);
    error.hidden = true;
    video.preload = 'auto';
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    else if (video.error || restart) video.load();
    video.muted = false;
    video.controls = true;
    try {
      await video.play();
    } catch {
      if (current !== attempt) return;
      reset();
      error.hidden = false;
    }
  });
  video.addEventListener('playing', () => {
    if (!requested || document.hidden) { video.pause(); return; }
    loading(false);
    start.hidden = true;
    error.hidden = true;
  });
  video.addEventListener('waiting', () => { if (requested && !video.paused) loading(true); });
  video.addEventListener('pause', () => {
    if (!requested && retryPending) return;
    loading(false);
    if (requested && !start.hidden) reset();
  });
  video.addEventListener('error', () => {
    const showError = requested;
    reset();
    error.hidden = !showError;
  });
  function pause() {
    video.pause();
    if (requested && !start.hidden) reset();
    else loading(false);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('pagehide', () => { observer?.disconnect(); pause(); });
  window.addEventListener('pageshow', () => {
    if (!economical && !video.getAttribute('src')) observer?.observe(player);
  });
})();
