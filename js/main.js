/* =============================================================
   PREMIER SCHOOLS EXHIBITION 2025
   main.js  |  No frameworks  |  WCAG 2.2 AA
   ============================================================= */

'use strict';

(function () {

  /* ─── Utility ─────────────────────────────────────────────── */
  const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  /* ─── Collage: pause animation on focusin ─────────────────── */
  function initCollage() {
    const collage = document.getElementById('collage-slider');
    if (!collage) return;

    const pauseStrips  = () => collage.querySelectorAll('.collage__strip').forEach(s => { s.style.animationPlayState = 'paused'; });
    const resumeStrips = () => { if (!prefersReduced()) collage.querySelectorAll('.collage__strip').forEach(s => { s.style.animationPlayState = 'running'; }); };

    /* Pause on keyboard focus (CSS handles hover) */
    collage.addEventListener('focusin',  pauseStrips);
    collage.addEventListener('focusout', resumeStrips);

    /* Pause on touch — lets users inspect images without motion */
    collage.addEventListener('touchstart', pauseStrips,  { passive: true });
    collage.addEventListener('touchend',   resumeStrips, { passive: true });

    /* Global CSS already disables animation for prefers-reduced-motion;
       JS mirrors it so dynamic resumeStrips() never re-enables animation. */
    if (prefersReduced()) pauseStrips();
  }


  /* ─── Exhibition Slider ───────────────────────────────────── */
  function initExhibitionSlider() {
    const region = document.getElementById('exhibition-slider');
    if (!region) return;

    const track   = document.getElementById('exhibition-track');
    const cards   = Array.from(track.querySelectorAll('.exhi-card'));
    const dots    = Array.from(region.querySelectorAll('.exhibition__dot'));
    const prevBtn = region.querySelector('.exhibition__arrow--prev');
    const nextBtn = region.querySelector('.exhibition__arrow--next');

    let current     = 0;
    let timer       = null;
    let touchStartX = 0;

    function visibleCount() {
      /* Match CSS breakpoints exactly so slider logic stays in sync */
      const vw = window.innerWidth;
      if (vw <= 640)  return 1;
      if (vw <= 860)  return 2;
      if (vw <= 1100) return 3;
      return 4;
    }

    function maxIndex() {
      return Math.max(0, cards.length - visibleCount());
    }

    function cardStep() {
      if (!cards[0]) return 0;
      return cards[0].offsetWidth + 22; /* gap = 22px */
    }

    function goTo(idx) {
      const max = maxIndex();
      current = Math.max(0, Math.min(idx, max));
      track.style.transform = `translateX(-${current * cardStep()}px)`;

      /* Update dots */
      const dotMax = dots.length - 1;
      const dotIdx = dotMax > 0 ? Math.round((current / Math.max(1, max)) * dotMax) : 0;
      dots.forEach((d, i) => {
        const active = i === dotIdx;
        d.classList.toggle('exhibition__dot--active', active);
        d.setAttribute('aria-selected', String(active));
        d.tabIndex = active ? 0 : -1;
      });

      /* Announce to screen readers */
      track.setAttribute('aria-label', `Exhibition highlights, showing cards ${current + 1}–${Math.min(current + visibleCount(), cards.length)} of ${cards.length}`);
    }

    function startAuto() {
      stopAuto();
      if (prefersReduced()) return;
      timer = setInterval(() => goTo(current >= maxIndex() ? 0 : current + 1), 4000);
    }
    function stopAuto() { clearInterval(timer); timer = null; }

    prevBtn && prevBtn.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
    nextBtn && nextBtn.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });

    dots.forEach((d, i) => {
      d.addEventListener('click', () => {
        stopAuto();
        const max  = maxIndex();
        const step = dots.length > 1 ? Math.round((i / (dots.length - 1)) * max) : 0;
        goTo(step);
        startAuto();
      });
    });

    /* Only run auto-play while the section is visible — prevents the timer
       from advancing slides before the user has even scrolled to this section */
    let sectionVisible = false;
    const io = new IntersectionObserver(entries => {
      sectionVisible = entries[0].isIntersecting;
      if (sectionVisible) startAuto(); else stopAuto();
    }, { threshold: 0.15 });
    io.observe(region);

    region.addEventListener('mouseenter', stopAuto);
    region.addEventListener('mouseleave', () => { if (sectionVisible) startAuto(); });
    region.addEventListener('focusin',    stopAuto);
    region.addEventListener('focusout',   () => { if (sectionVisible) startAuto(); });

    region.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    region.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 48) {
        stopAuto();
        goTo(diff > 0 ? current + 1 : current - 1);
        if (sectionVisible) startAuto();
      }
    });

    region.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); stopAuto(); goTo(current - 1); if (sectionVisible) startAuto(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); goTo(current + 1); if (sectionVisible) startAuto(); }
      if (e.key === 'Home')       { e.preventDefault(); stopAuto(); goTo(0);           if (sectionVisible) startAuto(); }
      if (e.key === 'End')        { e.preventDefault(); stopAuto(); goTo(maxIndex());   if (sectionVisible) startAuto(); }
    });

    goTo(0); /* always initialise at slide 1, dot 1 */

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        track.style.transition = 'none';
        goTo(0);
        requestAnimationFrame(() => { track.style.transition = ''; });
      }, 120);
    });
  }


  /* ─── Choose-the-School — mobile horizontal swipe ────────── */
  function initChooseSlider() {
    const dotsWrap = document.getElementById('choose-dots');
    const track    = document.getElementById('choose-track');
    if (!track || !dotsWrap) return;

    const cards = Array.from(track.querySelectorAll('.school-card'));
    const dots  = Array.from(dotsWrap.querySelectorAll('.choose__dot'));

    /* Only activate as a JS swipe-slider on mobile */
    if (window.innerWidth > 640) return;

    let current = 0;

    function updateDots(idx) {
      dots.forEach((d, i) => {
        const active = i === idx;
        d.classList.toggle('choose__dot--active', active);
        d.setAttribute('aria-selected', String(active));
        d.tabIndex = active ? 0 : -1;
      });
      current = idx;
    }

    /* Click dot → scroll to card */
    dots.forEach((d, i) => {
      d.addEventListener('click', () => {
        if (!cards[i]) return;
        track.scrollTo({ left: cards[i].offsetLeft, behavior: 'smooth' });
        updateDots(i);
      });
    });

    /* Sync dots on scroll */
    let scrollTimer;
    track.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const cardW  = (cards[0] ? cards[0].offsetWidth : 288) + 12; /* gap: 12px on mobile */
        const newIdx = Math.max(0, Math.min(Math.round(track.scrollLeft / cardW), cards.length - 1));
        if (newIdx !== current) updateDots(newIdx);
      }, 80);
    }, { passive: true });

    /* Keyboard within dots — roving tabindex pattern (ARIA APG carousel) */
    dotsWrap.addEventListener('keydown', e => {
      const last = dots.length - 1;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); dots[Math.max(0, current - 1)]?.click(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); dots[Math.min(last, current + 1)]?.click(); }
      if (e.key === 'Home')       { e.preventDefault(); dots[0]?.click(); }
      if (e.key === 'End')        { e.preventDefault(); dots[last]?.click(); }
    });

    updateDots(0);
  }


  /* ─── Enquiry form validation ─────────────────────────────── */
  function initForms() {
    document.querySelectorAll('.enquiry-form').forEach(form => {

      form.addEventListener('submit', e => {
        e.preventDefault();
        const fields  = Array.from(form.querySelectorAll('[aria-required="true"]'));
        let   isValid = true;

        fields.forEach(field => {
          const empty = !field.value.trim();
          field.setAttribute('aria-invalid', String(empty));
          let err = form.querySelector(`[data-err="${field.id}"]`);

          if (empty) {
            isValid = false;
            if (!err) {
              err = document.createElement('span');
              err.setAttribute('data-err', field.id);
              err.setAttribute('role', 'alert');
              err.style.cssText = 'color:#ff8080;font-size:.72rem;margin-top:3px;display:block;';
              field.parentNode.appendChild(err);
              field.setAttribute('aria-describedby', `err-${field.id}`);
              err.id = `err-${field.id}`;
            }
            err.textContent = 'This field is required.';
          } else {
            if (err) err.textContent = '';
          }
        });

        if (!isValid) {
          const first = fields.find(f => f.getAttribute('aria-invalid') === 'true');
          first && first.focus();
          return;
        }

        /* Success state */
        const btn = form.querySelector('.enquiry-form__submit');
        if (btn) {
          const html = btn.innerHTML;
          btn.textContent = 'Enquiry Sent!';
          btn.style.background = '#1d7a42';
          btn.disabled = true;
          setTimeout(() => {
            btn.innerHTML    = html;
            btn.style.background = '';
            btn.disabled     = false;
            form.reset();
          }, 3500);
        }
      });

      /* Live validation clear */
      form.querySelectorAll('input,textarea').forEach(field => {
        field.addEventListener('input', () => {
          if (field.value.trim()) {
            field.setAttribute('aria-invalid', 'false');
            const err = form.querySelector(`[data-err="${field.id}"]`);
            if (err) err.textContent = '';
          }
        });
      });
    });
  }


  /* ─── Header scroll shadow ────────────────────────────────── */
  function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('header--scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }


  /* ─── Boot ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    initCollage();
    initExhibitionSlider();
    initChooseSlider();
    initForms();
    initHeader();
  });

})();
