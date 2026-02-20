document.addEventListener('DOMContentLoaded', function () {
  // Countdown target provided by server (ms since epoch for Manila midnight)
  const targetMs = window.BDAY_TARGET || 0;
  // disable automatic confetti if no valid server target provided
  const autoConfettiEnabled = !!window.BDAY_TARGET;
  let target = new Date(targetMs); // make mutable so we can roll to next year without reload

  const bdMd = (window.BDAY_MD || '').toString(); // "MM-DD"
  let bdMonth = null, bdDay = null;
  if (bdMd && /^\d{2}-\d{2}$/.test(bdMd)) {
    const parts = bdMd.split('-');
    bdMonth = parseInt(parts[0], 10);
    bdDay = parseInt(parts[1], 10);
  }

  const daysEl = document.getElementById('cd-days');
  const hrsEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  function nextValidDateFor(month, day, startYear) {
    // month: 1-12, day: 1-31, startYear: integer
    for (let i = 0; i < 6; i++) {
      const y = startYear + i;
      const cand = new Date(y, month - 1, day, 0, 0, 0, 0);
      if (cand.getMonth() === (month - 1) && cand.getDate() === day) return cand;
    }
    return null;
  }

  // helper: update visible "Date:" text (e.g. "November 13, 2026")
  const displayDateEl = document.getElementById('display-date');
  const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  function updateDisplayDateFor(dateObj) {
    if (!displayDateEl || !dateObj || isNaN(dateObj.getTime())) return;
    displayDateEl.textContent = dateFormatter.format(dateObj);
  }

  // Confetti (moved here from darkmode.js)
  const confettiBtn = document.getElementById('confetti-btn');
  const canvas = document.getElementById('confetti');

  // add a flag so confetti runs only once per birthday cycle
  let confettiLaunched = false;

  function startConfetti(){
    console.debug && console.debug('confetti: startConfetti() called', { confettiLaunched });
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = canvas.width = innerWidth, h = canvas.height = innerHeight;
    window.addEventListener('resize', ()=>{ w=canvas.width=innerWidth; h=canvas.height=innerHeight; });
    const colors = ['#ff6b81','#ffd966','#7ee3b7','#7cc0ff','#d6a8ff'];
    const pieces = [];
    for(let i=0;i<120;i++){
      pieces.push({
        x: Math.random()*w,
        y: Math.random()*-h,
        vx: (Math.random()-0.5)*6,
        vy: Math.random()*6+2,
        r: Math.random()*6+4,
        c: colors[Math.floor(Math.random()*colors.length)],
        rot: Math.random()*360,
        vr: (Math.random()-0.5)*10
      });
    }
    let t=0;
    function frame(){
      ctx.clearRect(0,0,w,h);
      for(let p of pieces){
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rot*Math.PI/180);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r);
        ctx.restore();
      }
      t++;
      if (t<300) requestAnimationFrame(frame);
      else ctx.clearRect(0,0,w,h);
    }
    frame();
  }

  // mark flag if user manually triggers confetti so auto won't duplicate
  if (confettiBtn) confettiBtn.addEventListener('click', function(){
    startConfetti();
    confettiLaunched = true;
    console.debug && console.debug('confetti: manual launch, flag set');
  });

  function updateCountdown(){
    const now = new Date();
    let diff = target - now;

    // If diff is negative, show zeros (birthday day case). If the birthday day has fully passed (>=24h),
    // compute the next valid year's target and switch to it.
    if (isNaN(diff)) {
      // invalid target: clear displays
      if (daysEl) daysEl.textContent = '--';
      if (hrsEl) hrsEl.textContent = '--';
      if (minsEl) minsEl.textContent = '--';
      if (secsEl) secsEl.textContent = '--';
      return;
    }

    if (diff <= 0) {
      // show zeroed countdown during the birthday day
      if (daysEl) daysEl.textContent = '0';
      if (hrsEl) hrsEl.textContent = '00';
      if (minsEl) minsEl.textContent = '00';
      if (secsEl) secsEl.textContent = '00';

      // start confetti once when we first hit the zero state on the birthday day
      if (autoConfettiEnabled && !confettiLaunched) {
        console.debug && console.debug('confetti: auto-launch condition met, launching now');
        startConfetti();
        confettiLaunched = true;
      } else if (!autoConfettiEnabled) {
        console.debug && console.debug('confetti: auto disabled (no valid BDAY_TARGET)');
      }

      // If more than (approximately) 24 hours have passed since the target midnight,
      // roll to the next valid year (handles Feb 29).
      const oneDay = 24 * 60 * 60 * 1000;
      if ((now - target) >= (oneDay - 1000)) { // small tolerance
        if (bdMonth && bdDay) {
          const baseYear = target.getFullYear() + 1;
          const next = nextValidDateFor(bdMonth, bdDay, baseYear);
          if (next) {
            target = next;
            updateDisplayDateFor(target);
            // reset confetti flag so it can fire next year
            confettiLaunched = false;
            console.debug && console.debug('confetti: rolled to next year, reset flag', { newTarget: target.toISOString() });
            // recompute diff for immediate update
            diff = target - now;
          }
        } else {
          // fallback: advance by 1 year using Date; will adjust for invalid dates automatically (but may shift to Mar 1 for Feb29 -> acceptable fallback)
          const tryYear = target.getFullYear() + 1;
          const cand = new Date(tryYear, target.getMonth(), target.getDate(), 0, 0, 0, 0);
          target = cand;
          updateDisplayDateFor(target);
          // reset confetti flag so it can fire next year
          confettiLaunched = false;
          console.debug && console.debug('confetti: rolled fallback to next year, reset flag', { newTarget: target.toISOString() });
          diff = target - now;
        }
      } else {
        return; // stay displaying zeros for the birthday day
      }
    } else {
      // countdown is active (not yet birthday) — ensure flag is false so next transition will trigger confetti
      confettiLaunched = confettiLaunched || false;
    }

    if (diff < 0) diff = 0;
    const days = Math.floor(diff / (1000*60*60*24));
    const hrs = Math.floor((diff / (1000*60*60)) % 24);
    const mins = Math.floor((diff / (1000*60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    if (daysEl) daysEl.textContent = days;
    if (hrsEl) hrsEl.textContent = String(hrs).padStart(2,'0');
    if (minsEl) minsEl.textContent = String(mins).padStart(2,'0');
    if (secsEl) secsEl.textContent = String(secs).padStart(2,'0');
  }
  console.debug && console.debug('countdown initialized', { targetMs, autoConfettiEnabled, target: target.toISOString(), bdMd });

  // ensure initial display date matches server target
  updateDisplayDateFor(target);

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // --- Cake interactivity: toggle flame, smoke puffs, keyboard support ---
  const cakeWrap = document.getElementById('cake-btn');
  if (cakeWrap) {
    const smokeContainer = cakeWrap.querySelector('.cake-smoke');

    function makeSmokePuff(delay, leftOffset) {
      const puff = document.createElement('div');
      puff.className = 'puff';
      puff.style.left = (50 + leftOffset) + '%';
      puff.style.animationDelay = delay + 'ms';
      return puff;
    }

    function extinguish() {
      cakeWrap.setAttribute('data-flame','0');
      cakeWrap.setAttribute('aria-pressed','false');
      // create 3 staggered puffs
      smokeContainer.innerHTML = '';
      const offsets = [-6, 0, 6];
      offsets.forEach((o,i)=> {
        const p = makeSmokePuff(i*120, o);
        // slightly vary size
        p.style.width = (6 + Math.random()*6) + 'px';
        p.style.height = p.style.width;
        p.style.opacity = 0.85 - Math.random()*0.4;
        smokeContainer.appendChild(p);
      });
      // remove smoke after animation completes
      setTimeout(()=> { smokeContainer.innerHTML = ''; }, 1800 + 300);
    }

    function relight() {
      cakeWrap.setAttribute('data-flame','1');
      cakeWrap.setAttribute('aria-pressed','true');
      // small wobble feedback
      cakeWrap.classList.remove('wobble');
      // trigger reflow to restart animation
      // eslint-disable-next-line no-unused-expressions
      cakeWrap.offsetWidth;
      cakeWrap.classList.add('wobble');
      // remove wobble class after animation
      setTimeout(()=> cakeWrap.classList.remove('wobble'), 700);
    }

    function toggleFlame() {
      const on = cakeWrap.getAttribute('data-flame') !== '0';
      if (on) extinguish(); else relight();
    }

    cakeWrap.addEventListener('click', toggleFlame);
    cakeWrap.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        toggleFlame();
      }
    });
    // ensure initial ARIA state matches attribute
    cakeWrap.setAttribute('aria-pressed', cakeWrap.getAttribute('data-flame') === '1' ? 'true' : 'false');
  }

});
