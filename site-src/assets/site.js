/* AUREUM website — the only JavaScript: mobile menu, demo dialog, reveal-on-scroll, header shadow. */
(() => {
  const d = document, root = d.documentElement;

  /* the floating bar: Explore opens / closes the menu */
  const dbtn = d.getElementById('dock-btn'), dmenu = d.getElementById('dock-menu');
  if (dbtn && dmenu) {
    const set = open => { dbtn.setAttribute('aria-expanded', String(open)); dmenu.hidden = !open; };
    dbtn.addEventListener('click', () => set(dmenu.hidden));
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && !dmenu.hidden) { set(false); dbtn.focus(); } });
    d.addEventListener('click', e => { if (!dmenu.hidden && !e.target.closest('.dock')) set(false); });
    dmenu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  }

  /* demo dialog — plays a real video only when one has been configured */
  const dlg = d.getElementById('demo-dialog');
  if (dlg) {
    let opener = null;
    const holder = dlg.querySelector('.demo-video');
    const embed = url => {
      let m;
      if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return `<video controls playsinline autoplay src="${url}"></video>`;
      if ((m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/))) return `<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0" title="${holder.dataset.title}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
      if ((m = url.match(/vimeo\.com\/(\d+)/))) return `<iframe src="https://player.vimeo.com/video/${m[1]}?autoplay=1" title="${holder.dataset.title}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
      return `<iframe src="${url}" title="${holder.dataset.title}" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    };
    const open = e => { opener = e.currentTarget; if (holder) holder.innerHTML = embed(holder.dataset.video); dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', ''); };
    const close = () => { dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
    d.querySelectorAll('[data-open-demo]').forEach(b => b.addEventListener('click', open));
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close-demo]')) close(); });
    dlg.addEventListener('close', () => { if (holder) holder.innerHTML = ''; if (opener) opener.focus(); });
  }


  /* hero: the video plays once; when it ends it shrinks into the laptop screen, which becomes the dashboard, and the tablet and phone slide in */
  const stage = d.getElementById('hm-stage'), vid = d.getElementById('hm-vid'), vbox = d.getElementById('hm-video');
  if (stage && vid && vbox) {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let started = false;
    const finish = () => { stage.classList.remove('morphing'); stage.classList.add('done'); vid.pause(); };
    const morph = () => {
      if (started) return; started = true;
      if (still || !vbox.animate) { finish(); return; }
      stage.classList.add('morphing');
      const dev = stage.querySelector('.dev-laptop'), scr = stage.querySelector('.dev-laptop .lp-screen img'), tab = stage.querySelector('.dev-tablet'), ph = stage.querySelector('.dev-phone');
      const sr = stage.getBoundingClientRect(), r = scr.getBoundingClientRect();
      const t = Math.max(0, r.top - sr.top), l = Math.max(0, r.left - sr.left), rt = Math.max(0, sr.right - r.right), b = Math.max(0, sr.bottom - r.bottom);
      const ease = 'cubic-bezier(.65,0,.2,1)', T = 1150;
      const anims = [
        vbox.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: `inset(${t}px ${rt}px ${b}px ${l}px round 6px)` }], { duration: T, easing: ease, fill: 'forwards' }),
        vbox.animate([{ opacity: 1 }, { opacity: 1, offset: .86 }, { opacity: 0 }], { duration: T + 280, easing: 'linear', fill: 'forwards' }),
        dev.animate([{ opacity: 0 }, { opacity: 0, offset: .8 }, { opacity: 1 }], { duration: T + 280, easing: 'linear', fill: 'both' }),
        tab.animate([{ opacity: 0, transform: 'translateY(46px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: T - 120, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }),
        ph.animate([{ opacity: 0, transform: 'translateY(60px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: T + 90, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' })
      ];
      Promise.all(anims.map(a => a.finished)).then(() => { finish(); anims.forEach(a => a.cancel()); }).catch(finish);
    };
    if (still) { finish(); }
    else {
      vid.addEventListener('ended', morph);
      vid.addEventListener('error', () => { started = true; finish(); });
      const go = vid.play && vid.play();
      if (go && go.catch) go.catch(() => setTimeout(morph, 2200));      /* autoplay blocked: show the first frame briefly, then morph anyway */
      setTimeout(() => { if (!started && vid.paused && vid.currentTime === 0) morph(); }, 7000);
    }
  }

  /* reveal on scroll (CSS only hides these when JS is running) */
  const items = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(el => io.observe(el));
  } else items.forEach(el => el.classList.add('in'));

  /* header shadow once scrolled */
  const h = d.querySelector('.site-header');
  if (h) { const on = () => h.classList.toggle('scrolled', scrollY > 8); addEventListener('scroll', on, { passive: true }); on(); }
})();
