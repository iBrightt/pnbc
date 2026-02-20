(function(){
  const STORAGE_KEY_ID = 'pm_open_id';
  const STORAGE_KEY_SCROLL = 'pm_open_scroll';

  const modal = document.getElementById('pm-modal');
  if (!modal) return;

  const avatarEl = document.getElementById('pm-modal-avatar');
  const titleEl = document.getElementById('pm-modal-title');
  const textEl = document.getElementById('pm-modal-text');
  const dropcapEl = document.getElementById('pm-modal-dropcap');
  const mediaEl = document.getElementById('pm-modal-media');
  const closeBtn = modal.querySelector('.pm-modal-close');
  const backdrop = modal.querySelector('[data-action="backdrop"]');

  let _scrollTop = 0;
  let _currentPmId = null;

  function lockBodyScroll() {
    _scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.body.classList.add('pm-modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_scrollTop}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  }

  function unlockBodyScroll() {
    document.body.classList.remove('pm-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, _scrollTop);
  }

  // name, message, initial, photo (image), video (mp4/webm/ogg), pmId
  function showModal(name, msg, initial, photo, video, pmId) {
    if (photo) {
      avatarEl.innerHTML = '<img src="' + escapeHtml(photo) + '" alt="Avatar of ' + escapeHtml(name) + '">';
    } else {
      avatarEl.textContent = initial || (name ? name.charAt(0).toUpperCase() : '?');
    }

    dropcapEl.textContent = initial;
    titleEl.textContent = name;

    (function(){
      var raw = String(msg || '');
      var urlRegex = /(https?:\/\/[^\s]+)/g;
      var escaped = raw.replace(/\r\n/g,'\n').split('\n').map(escapeHtml).join('<br>');
      var matches = raw.match(urlRegex) || [];
      matches.forEach(function(url){
        var escapedUrl = escapeHtml(url);
        var href = encodeURI(url);
        escaped = escaped.split(escapedUrl).join('<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + escapedUrl + '</a>');
      });
      textEl.innerHTML = escaped;
    })();

    // populate media container: prefer video if provided, otherwise nothing (images shown as avatar)
    if (mediaEl) {
      mediaEl.innerHTML = '';
      if (video) {
        try {
          var src = video;
          var ext = (src.split('.').pop() || '').toLowerCase();
          var type = 'video/mp4';
          if (ext === 'webm') type = 'video/webm';
          else if (ext === 'ogg') type = 'video/ogg';

          var v = document.createElement('video');
          v.controls = true;
          v.setAttribute('playsinline', '');
          v.setAttribute('preload', 'metadata');
          v.style.maxWidth = '100%';
          v.style.height = 'auto';
          v.style.display = 'block';
          v.style.margin = '0 auto 0.5rem';

          var s = document.createElement('source');
          s.src = src;
          s.type = type;
          v.appendChild(s);
          mediaEl.appendChild(v);
          // make media container visible for assistive tech / CSS
          mediaEl.setAttribute('aria-hidden', 'false');
          mediaEl.style.display = 'block';
          // ensure browser loads metadata so dimensions/poster are available
          try { v.load(); } catch (e) { /* ignore */ }
        } catch (e) {
          mediaEl.innerHTML = '';
        }
      } else {
        // hide media container when there's no media
        mediaEl.setAttribute('aria-hidden', 'true');
        mediaEl.style.display = 'none';
      }
    }

    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');

    // Persist the opened pm id and scroll position (session-scoped)
    _currentPmId = pmId || null;
    try {
      if (_currentPmId) {
        sessionStorage.setItem(STORAGE_KEY_ID, _currentPmId);
        sessionStorage.setItem(STORAGE_KEY_SCROLL, String(window.pageYOffset || document.documentElement.scrollTop || 0));
      } else {
        sessionStorage.removeItem(STORAGE_KEY_ID);
        sessionStorage.removeItem(STORAGE_KEY_SCROLL);
      }
    } catch (e) { /* ignore storage errors */ }

    lockBodyScroll();
    if (closeBtn) closeBtn.focus();
  }

  function hideModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    unlockBodyScroll();

    // clear media node (stop video)
    if (mediaEl) {
      // if video element exists, try to pause it
      var vid = mediaEl.querySelector('video');
      if (vid && typeof vid.pause === 'function') {
        try { vid.pause(); } catch (e) {}
      }
      // hide + clear media container
      mediaEl.setAttribute('aria-hidden', 'true');
      mediaEl.style.display = 'none';
      mediaEl.innerHTML = '';
    }

    // clear persisted state
    _currentPmId = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY_ID);
      sessionStorage.removeItem(STORAGE_KEY_SCROLL);
    } catch (e) { /* ignore */ }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function findPmItemById(id) {
    if (!id) return null;
    return document.querySelector('.pm-item[data-pm-id="' + CSS.escape(id) + '"]');
  }

  // attach handlers
  document.querySelectorAll('.pm-item').forEach(function(el){
    el.addEventListener('click', function(){
      const pmId = el.dataset.pmId || null;
      // store scroll before locking body (showModal will also persist)
      try { sessionStorage.setItem(STORAGE_KEY_SCROLL, String(window.pageYOffset || document.documentElement.scrollTop || 0)); } catch(e){}
      showModal(el.dataset.name || '', el.dataset.message || '', el.dataset.initial || '', el.dataset.photo || '', el.dataset.video || '', pmId);
    });
    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', hideModal);
  if (backdrop) backdrop.addEventListener('click', hideModal);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal.classList.contains('show')) hideModal();
  });

  // restore modal open state after reload (sessionStorage)
  try {
    const savedId = sessionStorage.getItem(STORAGE_KEY_ID);
    const savedScrollStr = sessionStorage.getItem(STORAGE_KEY_SCROLL);
    const savedScroll = savedScrollStr ? parseInt(savedScrollStr, 10) : NaN;

    if (savedId) {
      const el = findPmItemById(savedId);
      if (el) {
        // restore scroll position first so the user sees the same place
        if (!Number.isNaN(savedScroll)) {
          window.scrollTo(0, savedScroll);
        }
        // then open modal using the saved item's data
        showModal(el.dataset.name || '', el.dataset.message || '', el.dataset.initial || '', el.dataset.photo || '', el.dataset.video || '', savedId);
      } else {
        // clear stale value
        sessionStorage.removeItem(STORAGE_KEY_ID);
        sessionStorage.removeItem(STORAGE_KEY_SCROLL);
      }
    }
  } catch (e) {
    // ignore storage errors
  }
})();
