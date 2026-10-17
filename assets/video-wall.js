(() => {
  const cards = document.querySelectorAll('.v-card');
  if (!cards.length) return;
  const chinese = document.documentElement.lang === 'zh-Hant';
  const labels = chinese ? {
    video: '影片', close: '關閉', loading: '影片載入中...', retry: '重試影片',
    failed: '影片未能載入，請重試。', slow: '影片載入時間較長，請重試。',
    paused: '影片已暫停。', resume: '繼續播放', original: '原畫質影片'
  } : {
    video: 'Video', close: 'Close', loading: 'Loading video...', retry: 'Retry video',
    failed: "Video couldn't load. Please try again.", slow: 'Video is taking too long to load. Please try again.',
    paused: 'Playback paused.', resume: 'Resume video', original: 'Original video'
  };
  const lb = document.createElement('dialog');
  lb.className = 'v-lightbox';
  lb.setAttribute('aria-label', labels.video);
  lb.setAttribute('aria-modal', 'true');
  const closeButton = document.createElement('button');
  closeButton.className = 'v-lightbox-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', labels.close);
  closeButton.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
  lb.appendChild(closeButton);
  document.body.appendChild(lb);
  let active = null;
  let trigger;
  let previousOverflow = '';

  function current(session, attempt) {
    return active === session && session.attempt === attempt && attempt.allowed && lb.open;
  }

  function cancelPlayback(attempt) {
    if (!attempt) return;
    attempt.allowed = false;
    attempt.playId++;
    clearTimeout(attempt.timer);
    attempt.video.pause();
  }

  // Closing or a media error discards the resource; slow startup keeps its buffer.
  function stop(attempt, remove = false) {
    if (!attempt) return;
    cancelPlayback(attempt);
    attempt.video.removeAttribute('src');
    attempt.video.load();
    if (remove) attempt.video.remove();
  }

  function fail(session, attempt, message, keepBuffer = false) {
    if (!current(session, attempt)) return;
    if (keepBuffer) cancelPlayback(attempt);
    else stop(attempt);
    attempt.retryBuffered = keepBuffer;
    session.resumePending = false;
    session.player.setAttribute('aria-busy', 'false');
    session.status.textContent = message;
    session.message.hidden = false;
    session.retry.hidden = false;
    session.retry.textContent = labels.retry;
  }

  function loading(session, attempt) {
    if (!current(session, attempt) || attempt.state === 'loading') return;
    attempt.state = 'loading';
    session.player.setAttribute('aria-busy', 'true');
    session.status.textContent = labels.loading;
    session.message.hidden = false;
    session.retry.hidden = true;
    session.retry.textContent = labels.retry;
    clearTimeout(attempt.timer);
    attempt.timer = setTimeout(() => fail(session, attempt, labels.slow, true), 15000);
  }

  function requestPlay(session, attempt) {
    const playId = ++attempt.playId;
    try {
      const request = attempt.video.play();
      if (request && request.catch) request.catch(() => {
        if (playId === attempt.playId && !attempt.suspended) fail(session, attempt, labels.failed);
      });
    } catch (_) { fail(session, attempt, labels.failed); }
  }

  function showResume(session) {
    session.resumePending = true;
    session.player.setAttribute('aria-busy', 'false');
    session.status.textContent = labels.paused;
    session.message.hidden = false;
    session.retry.textContent = labels.resume;
    session.retry.hidden = false;
  }

  function start(session) {
    if (active !== session || !lb.open || document.hidden) return;
    stop(session.attempt, true);
    session.resumePending = false;
    const video = document.createElement('video');
    video.controls = true;
    video.playsInline = true;
    video.muted = false;
    video.preload = 'auto';
    video.poster = session.poster;
    video.setAttribute('playsinline', '');
    video.setAttribute('controlsList', 'nofullscreen');
    video.setAttribute('aria-label', session.title);
    const attempt = {video, allowed: true, playId: 0, state: 'idle', started: false, suspended: false, timer: null};
    session.attempt = attempt;
    session.player.prepend(video);
    loading(session, attempt);
    video.addEventListener('playing', () => {
      if (!current(session, attempt) || document.hidden || attempt.suspended) { video.pause(); return; }
      clearTimeout(attempt.timer);
      attempt.state = 'playing';
      attempt.started = true;
      session.resumePending = false;
      session.player.setAttribute('aria-busy', 'false');
      session.message.hidden = true;
    });
    video.addEventListener('play', () => {
      if (!current(session, attempt) || document.hidden || attempt.suspended) { video.pause(); return; }
      session.resumePending = false;
      loading(session, attempt);
    });
    video.addEventListener('waiting', () => { if (!video.paused) loading(session, attempt); });
    video.addEventListener('pause', () => {
      if (!current(session, attempt) || !video.paused) return;
      clearTimeout(attempt.timer);
      attempt.state = 'paused';
      session.player.setAttribute('aria-busy', 'false');
      session.message.hidden = true;
      if (attempt.suspended) showResume(session);
    });
    video.addEventListener('ended', () => {
      if (!current(session, attempt)) return;
      clearTimeout(attempt.timer);
      attempt.state = 'ended';
      session.player.setAttribute('aria-busy', 'false');
      session.message.hidden = true;
    });
    video.addEventListener('error', () => fail(session, attempt, labels.failed));
    video.addEventListener('pointerdown', () => {
      if (current(session, attempt) && !document.hidden) attempt.suspended = false;
    });
    video.addEventListener('keydown', event => {
      if ((event.key === ' ' || event.key === 'Enter') && current(session, attempt) && !document.hidden) attempt.suspended = false;
    });
    video.src = session.src;
    requestPlay(session, attempt);
  }

  function close() {
    if (!active) return;
    const session = active;
    active = null;
    stop(session.attempt, true);
    session.player.remove();
    session.originalLink?.remove();
    lb.classList.remove('open');
    if (lb.open) lb.close();
    document.documentElement.style.overflow = previousOverflow;
    if (trigger && trigger.isConnected) trigger.focus({preventScroll: true});
  }
  closeButton.addEventListener('click', close);
  lb.addEventListener('cancel', event => { event.preventDefault(); close(); });
  lb.addEventListener('click', event => { if (event.target === lb) close(); });
  lb.addEventListener('close', () => { if (!lb.open) close(); });
  window.addEventListener('pagehide', close);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !active) return;
    const attempt = active.attempt;
    if (!attempt || !attempt.allowed) return;
    if (attempt.started && attempt.state !== 'loading') {
      attempt.suspended = true;
      clearTimeout(attempt.timer);
      attempt.video.pause();
      showResume(active);
    } else fail(active, attempt, labels.paused);
  });

  cards.forEach(card => {
    const src = card.getAttribute('data-src');
    const frame = card.querySelector('.v-frame');
    const image = frame && frame.querySelector('img');
    if (!src || !frame || !image) return;
    frame.addEventListener('click', () => {
      if (active || lb.open) return;
      trigger = frame.querySelector('.v-play') || frame;
      const player = document.createElement('div');
      player.className = 'v-lightbox-player';
      const message = document.createElement('div');
      message.className = 'v-lightbox-message';
      const status = document.createElement('p');
      status.className = 'v-lightbox-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      const retry = document.createElement('button');
      retry.className = 'v-lightbox-retry';
      retry.type = 'button';
      retry.textContent = labels.retry;
      retry.hidden = true;
      message.append(status, retry);
      player.appendChild(message);
      const original = card.getAttribute('data-original-src');
      let originalLink;
      if (original && original !== src) {
        originalLink = document.createElement('a');
        originalLink.className = 'v-lightbox-original';
        originalLink.href = original;
        originalLink.target = '_blank';
        originalLink.rel = 'noopener';
        originalLink.innerHTML = '<span>' + labels.original + '</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6m0-6L10 14M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/></svg>';
        lb.appendChild(originalLink);
      }
      const session = {src, poster: image.getAttribute('src'), title: card.querySelector('.v-title')?.textContent || image.alt || labels.video, player, message, status, retry, originalLink, attempt: null};
      retry.addEventListener('click', () => {
        if (active !== session || document.hidden || retry.hidden) return;
        if (session.resumePending && session.attempt.allowed) {
          const attempt = session.attempt;
          attempt.suspended = false;
          session.resumePending = false;
          loading(session, attempt);
          requestPlay(session, attempt);
        } else if (session.attempt.retryBuffered && !session.attempt.video.error) {
          const attempt = session.attempt;
          attempt.allowed = true;
          attempt.retryBuffered = false;
          attempt.state = 'idle';
          loading(session, attempt);
          requestPlay(session, attempt);
        } else start(session);
      });
      active = session;
      lb.appendChild(player);
      previousOverflow = document.documentElement.style.overflow;
      lb.classList.add('open');
      lb.showModal();
      closeButton.focus({preventScroll: true});
      document.documentElement.style.overflow = 'hidden';
      start(session);
    });
  });
})();
