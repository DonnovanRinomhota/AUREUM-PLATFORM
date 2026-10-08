/* AUREUM website — the only JavaScript: mobile menu, demo dialog, walkthrough player, reveal-on-scroll, header shadow. */
(() => {
  const d = document, root = d.documentElement;

  /* mobile menu */
  const btn = d.getElementById('menu-btn'), menu = d.getElementById('mobile-menu');
  if (btn && menu) {
    const set = open => { btn.setAttribute('aria-expanded', String(open)); btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); menu.hidden = !open; };
    btn.addEventListener('click', () => set(menu.hidden));
    d.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) set(false); });
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

  /* walkthrough player: step through real screens; play/pause, previous/next, chapters */
  d.querySelectorAll('[data-player]').forEach(p => {
    const frames = [...p.querySelectorAll('.pf')], bar = p.querySelector('.player-progress span'), count = p.querySelector('.player-count');
    const title = p.querySelector('.pc-title'), text = p.querySelector('.pc-text'), chapters = [...p.querySelectorAll('.player-chapters button')];
    const playBtn = p.querySelector('.pb-play'), ms = +p.dataset.interval || 3800;
    let i = 0, timer = null, visible = true;
    p.style.setProperty('--dur', ms + 'ms');
    const restartBar = () => { bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = ''; };
    const go = n => {
      i = (n + frames.length) % frames.length;
      frames.forEach((f, k) => f.classList.toggle('active', k === i));
      title.textContent = frames[i].dataset.title; text.textContent = frames[i].dataset.text;
      count.textContent = (i + 1) + ' / ' + frames.length;
      const ch = +frames[i].dataset.ch; let on = 0; chapters.forEach((b, k) => { if (+b.dataset.go <= i) on = k; });
      chapters.forEach((b, k) => b.classList.toggle('on', k === on));
      if (p.classList.contains('playing')) restartBar();
    };
    const stop = () => { clearInterval(timer); timer = null; p.classList.remove('playing'); playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Play'); };
    const start = () => { if (timer) return; p.classList.add('playing'); playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Pause'); restartBar(); timer = setInterval(() => { if (visible && !d.hidden) go(i + 1); }, ms); };
    p.querySelector('.player-play').addEventListener('click', start);
    playBtn.addEventListener('click', () => (timer ? stop() : start()));
    p.querySelector('.pb-prev').addEventListener('click', () => { go(i - 1); if (timer) { stop(); start(); } });
    p.querySelector('.pb-next').addEventListener('click', () => { go(i + 1); if (timer) { stop(); start(); } });
    chapters.forEach(b => b.addEventListener('click', () => { go(+b.dataset.go); if (timer) { stop(); start(); } }));
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.2 }).observe(p);
  });

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
