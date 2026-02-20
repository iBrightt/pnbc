document.addEventListener('DOMContentLoaded', function () {
  // Build playlist from DOM track data-src when available, otherwise fallback to window.PLAYLIST
  const playBtn = document.getElementById('play-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const player = document.getElementById('player');
  const playerSource = document.getElementById('player-source');
  const progress = document.getElementById('progress');
  const timeCurrent = document.getElementById('time-current');
  const timeRemaining = document.getElementById('time-remaining');
  const trackNodes = Array.from(document.querySelectorAll('.playlist .track')).filter(n => !n.classList.contains('placeholder'));
  const jsPlaylist = Array.isArray(window.PLAYLIST) ? window.PLAYLIST.slice() : [];
  // prefer data-src values from DOM for correct relative paths
  const combined = trackNodes.length ? trackNodes.map(n => n.dataset.src || n.getAttribute('data-src')) : jsPlaylist;

  let current = 0;
  let playing = false;

  function updatePlayBtn() {
    if (!playBtn) return; 
    // swap icon inside button
    const icon = playBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('bi-play-fill', !playing);
      icon.classList.toggle('bi-pause-fill', playing);
    } else {
      playBtn.textContent = playing ? 'Pause' : 'Play';
    }
    playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }

  function formatTime(ts) {
    if (!isFinite(ts) || ts < 0) return '00:00';
    const total = Math.floor(ts);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }

  function updateTimeDisplays() {
    if (!player || !progress) return;
    const dur = isFinite(player.duration) ? player.duration : NaN;
    const cur = isFinite(player.currentTime) ? player.currentTime : 0;
    // update progress percent
    let pct = 0;
    if (isFinite(dur) && dur > 0) {
      pct = (cur / dur) * 100;
      progress.value = pct;
    } else {
      progress.value = 0;
    }
    // paint the progress background so the blue fill moves
    paintProgressBackground(progress, pct);
    // update labels: current and remaining (negative like -03:46)
    timeCurrent && (timeCurrent.textContent = formatTime(cur));
    const remaining = isFinite(dur) ? Math.max(0, dur - cur) : 0;
    timeRemaining && (timeRemaining.textContent = '-' + formatTime(remaining));
  }

  // Paints the input[type=range] background to show filled portion.
  function paintProgressBackground(el, pct) {
    if (!el) return;
    // clamp pct
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    // Use CSS variables so changing body.dark updates colors immediately.
    // var(--player-accent) and var(--glass) are defined in the stylesheet.
    el.style.background = `linear-gradient(90deg, var(--player-accent) 0%, var(--player-accent) ${p}%, var(--glass) ${p}%, var(--glass) 100%)`;
  }

  function setTrack(index, autoplay = false) {
    if (!combined.length) return;
    current = (index + combined.length) % combined.length;
    const src = combined[current];
    if (!src) return;
    if (playerSource) playerSource.src = src;
    try { if (player) player.load(); } catch (e) { /* ignore */ }
    // update UI active state
    trackNodes.forEach((n, i) => {
      n.classList.toggle('active', i === current);
      // remove playing class on all immediately; actual playing class will be set on 'play' event
      n.classList.remove('playing');
    });
    // reset UI/time when track changes
    updateTimeDisplays();
    // ensure progress background shows initial 0%
    paintProgressBackground(progress, 0);
    if (autoplay && player) {
      const p = player.play();
      if (p && p.then) {
        p.then(() => { playing = true; updatePlayBtn(); })
         .catch(() => { playing = false; updatePlayBtn(); });
      } else {
        playing = !player.paused;
        updatePlayBtn();
      }
    } else {
      playing = false;
      updatePlayBtn();
    }
  }

  // init
  if (combined.length) setTrack(0, false);

  // play/pause toggle
  if (playBtn) {
    playBtn.addEventListener('click', function () {
      if (!combined.length || !player) return;
      if (player.paused) {
        const p = player.play();
        if (p && p.then) p.then(() => { playing = true; updatePlayBtn(); }).catch(() => { playing = false; updatePlayBtn(); });
        else { playing = true; updatePlayBtn(); }
      } else {
        player.pause();
        playing = false;
        updatePlayBtn();
      }
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { if (combined.length) setTrack(current - 1, true); });
  if (nextBtn) nextBtn.addEventListener('click', function () { if (combined.length) setTrack(current + 1, true); });

  // clicking / keyboard on a track toggles that track and plays
  trackNodes.forEach((node, i) => {
    node.addEventListener('click', () => setTrack(i, true));
    node.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') setTrack(i, true); });
  });

  // when a track ends, go to next
  if (player) player.addEventListener('ended', () => { if (combined.length) setTrack(current + 1, true); });

  // toggle playing class on the active track when the audio actually plays/pauses
  if (player) {
    player.addEventListener('play', () => {
      playing = true;
      updatePlayBtn();
      trackNodes.forEach((n, i) => n.classList.toggle('playing', i === current));
      // mark document as playing to enable animated thumb/dot via CSS
      try { document.body.classList.add('player-playing'); } catch(e){/* ignore */ }
    });
    player.addEventListener('pause', () => {
      playing = false;
      updatePlayBtn();
      trackNodes.forEach(n => n.classList.remove('playing'));
      // remove playing marker so animation stops
      try { document.body.classList.remove('player-playing'); } catch(e){/* ignore */ }
    });
    // update time display as audio plays
    player.addEventListener('timeupdate', updateTimeDisplays);
    player.addEventListener('loadedmetadata', updateTimeDisplays);
    // allow seeking via the range input
    if (progress) {
      let seeking = false;
      progress.addEventListener('input', function (e) {
        // live preview while dragging
        if (!player || !isFinite(player.duration)) return;
        const pct = Number(progress.value) / 100;
        const seekTime = pct * player.duration;
        timeCurrent && (timeCurrent.textContent = formatTime(seekTime));
        const rem = Math.max(0, (isFinite(player.duration) ? player.duration : 0) - seekTime);
        timeRemaining && (timeRemaining.textContent = '-' + formatTime(rem));
        // update visual fill while dragging (pct as percentage)
        paintProgressBackground(progress, Number(progress.value));
      });
      progress.addEventListener('change', function () {
        if (!player || !isFinite(player.duration)) return;
        const pct = Number(progress.value) / 100;
        player.currentTime = pct * player.duration;
        // ensure background matches final position
        paintProgressBackground(progress, Number(progress.value));
      });
    }
  }

  // Ensure progress is repainted if theme class on <body> changes.
  // This is a fallback to force re-evaluation in environments that may not repaint pseudo-elements immediately.
  try {
    const body = document.body;
    const observer = new MutationObserver(() => {
      if (progress) paintProgressBackground(progress, progress.value || 0);
    });
    observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    window.__playlistThemeObserver = observer;
  } catch (e) { /* ignore if MutationObserver not available */ }

  // Responsive playlist placement: move playlist into .info before the Timeline on narrow screens
  (function () {
    const bp = 920; // matches CSS breakpoint
    const playlistBox = document.getElementById('playlist-box');
    const leftCol = document.querySelector('.left-col');
    const info = document.querySelector('.info');
    if (!playlistBox || !leftCol || !info) return;

    // record original parent and the element that followed it (use nextElementSibling for reliability)
    const originalParent = playlistBox.parentNode;
    const originalNextEl = playlistBox.nextElementSibling || null;

    // small debounce helper
    let t = null;
    function debounce(fn, ms = 50) { clearTimeout(t); t = setTimeout(fn, ms); }

    function placePlaylist() {
      const shouldMove = window.matchMedia(`(max-width: ${bp}px)`).matches;
      if (shouldMove) {
        const timeline = info.querySelector('.messagescontainer:not(.left)');
        if (timeline && playlistBox.parentNode !== info) {
          info.insertBefore(playlistBox, timeline);
        }
      } else {
        if (playlistBox.parentNode !== originalParent) {
          // try to restore to original position using the saved nextElementSibling
          if (originalNextEl && originalNextEl.parentNode === originalParent) {
            originalParent.insertBefore(playlistBox, originalNextEl);
          } else {
            // fall back to appending to the original parent
            originalParent.appendChild(playlistBox);
          }
        }
      }
    }

    // initial placement
    placePlaylist();

    // respond to viewport breakpoint changes and to resize/orientation
    const mq = window.matchMedia(`(max-width: ${bp}px)`);
    if (mq.addEventListener) mq.addEventListener('change', () => debounce(placePlaylist));
    else if (mq.addListener) mq.addListener(() => debounce(placePlaylist));
    window.addEventListener('resize', () => debounce(placePlaylist));
    window.addEventListener('orientationchange', () => debounce(placePlaylist));
  })();
 
}); // end of DOMContentLoaded
