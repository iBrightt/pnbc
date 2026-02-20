document.addEventListener('DOMContentLoaded', function () {
  // Song control
  const hasSong = !!window.HAS_SONG;
  const songBtn = document.getElementById('song-btn');
  const audio = document.getElementById('song');
  if (songBtn && audio && hasSong) {
    songBtn.addEventListener('click', function (e) {
      if (audio.paused) {
        audio.play();
        songBtn.textContent = 'Pause Song';
      } else {
        audio.pause();
        songBtn.textContent = 'Play Song';
      }
    });
    // reset button text when song ends
    audio.addEventListener('ended', function () { songBtn.textContent = 'Play Song'; });
  }

  // Image toggle: click the photo to switch to alternate image (and back)
  const hero = document.getElementById('hero-photo');
  if (hero) {
    const alt = hero.dataset.alt;
    const hover = hero.dataset.hover;
    if (alt && alt.trim() !== '') {
      hero.style.cursor = 'pointer';
      hero.addEventListener('click', function () {
        const cur = hero.getAttribute('src') || '';
        const orig = hero.dataset.original || '';
        const next = (cur === alt) ? orig : alt;
        if (!hero.dataset.original) hero.dataset.original = cur;
        if (next) hero.setAttribute('src', next);
      });
    }

    // Hover behavior: temporarily show hover image, then restore the currently active image
    if (hover && hover.trim() !== '') {
      let preHoverSrc = '';
      hero.addEventListener('mouseenter', function () {
        try {
          preHoverSrc = hero.getAttribute('src') || '';
          if (preHoverSrc !== hover) hero.setAttribute('src', hover);
        } catch (e) { /* ignore */ }
      });
      hero.addEventListener('mouseleave', function () {
        try {
          // restore the src that was active before hover (could be original or alt)
          if (preHoverSrc) hero.setAttribute('src', preHoverSrc);
        } catch (e) { /* ignore */ }
      });
    }
  }

  // View all: if the control is a BUTTON, attach navigation handler.
  // If it's an anchor (<a href="all.php">), it will navigate without JS.
  const viewBtn = document.getElementById('view-all-btn');
  if (viewBtn) {
    if (viewBtn.tagName === 'BUTTON') {
      viewBtn.addEventListener('click', function () {
        // navigate relative to the current site folder
        window.location.href = 'controller/timeline.php';
      });
    }
  }

  // Theme toggle: respects localStorage then system preference; stores choice
  (function(){
    const toggle = document.getElementById('themeToggle');
    const storageKey = 'theme';
    const bodyEl = document.body;

    function getInitialTheme(){
      const saved = localStorage.getItem(storageKey);
      if (saved === 'light' || saved === 'dark') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      return 'light';
    }

    function applyTheme(theme){
      const isDark = theme === 'dark';
      if (isDark) {
        bodyEl.classList.add('dark');
      } else {
        bodyEl.classList.remove('dark');
      }
      // update toggle only if it exists on this page
      if (toggle) {
        toggle.setAttribute('aria-pressed', String(isDark));
        const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
      }
    }

    // init from storage / system (applies theme even if there's no toggle)
    applyTheme(getInitialTheme());

    // if toggle exists, attach click handler to update stored pref
    if (toggle) {
      toggle.addEventListener('click', function () {
        const isNowDark = bodyEl.classList.toggle('dark');
        const next = isNowDark ? 'dark' : 'light';
        localStorage.setItem(storageKey, next);
        toggle.setAttribute('aria-pressed', String(isNowDark));
        const label = isNowDark ? 'Switch to light theme' : 'Switch to dark theme';
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
      });
    }

    // if user hasn't chosen explicitly, respond to system changes
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener?.('change', e => {
        if (!localStorage.getItem(storageKey)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      });
    }
  })();

});
