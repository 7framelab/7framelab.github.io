/* 7FrameLab · app.js
   Reglas de seguridad de este archivo:
   - Sin innerHTML, eval, Function ni document.write (compatible con Trusted Types).
   - No envía datos a ningún servidor; no usa cookies ni almacenamiento del navegador.
   - Todo texto que escribe el visitante se trata como texto plano. */
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Antiencuadre (clickjacking). En servidores que permiten cabeceras, la
     protección principal es frame-ancestors 'none' en _headers. */
  /*@FRAMEBUSTER@*/
  if (window.top !== window.self) {
    document.documentElement.classList.add('framed');
    document.body.replaceChildren();
    const p = document.createElement('p');
    p.textContent = 'Esta página solo se puede ver en 7FrameLab. Ábrela directamente en tu navegador.';
    document.body.append(p);
    return;
  }
  /*@END@*/

  /* Correo armado en el navegador para dificultar la recolección automática */
  $$('[data-mail-user]').forEach(el => {
    const addr = `${el.dataset.mailUser}@${el.dataset.mailDomain}`;
    el.textContent = addr;
    const btn = el.parentElement && el.parentElement.querySelector('.copy');
    if (btn) btn.dataset.copy = addr;
  });

  /* Menú móvil */
  const menu = $('#menu'), mb = $('#menuBtn');
  if (menu && mb) {
    const close = () => { menu.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); mb.textContent = 'Menú'; };
    mb.addEventListener('click', () => {
      const o = menu.classList.toggle('open');
      mb.setAttribute('aria-expanded', String(o)); mb.textContent = o ? 'Cerrar' : 'Menú';
    });
    menu.addEventListener('click', e => { if (e.target.tagName === 'A') close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }

  /* Hero: los marcos del logo se abren */
  const stack = $('#stack');
  if (stack) {
    const openStack = () => stack.classList.remove('closed');
    if (reduce || !('IntersectionObserver' in window)) openStack();
    else { const so = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setTimeout(openStack, 200); so.disconnect(); } }, { threshold: 0.35 }); so.observe(stack); }
    if (!reduce && matchMedia('(pointer: fine)').matches) {
      const figs = $$('figure', stack);
      const base = [[9, 9, -6], [4, 4, -3], [-3, 0, 0]];
      let raf = 0;
      window.addEventListener('pointermove', e => {
        if (raf || stack.classList.contains('closed')) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
          figs.forEach((f, i) => {
            const d = (3 - i) * 1.4, [r, tx, ty] = base[i];
            f.style.transform = `rotate(${r + x * d * .6}deg) translate(${tx + x * d}%,${ty + y * d}%)`;
          });
        });
      }, { passive: true });
    }
  }


  /* Hero con video: franjas de cine que se abren, sonido opcional, pausa fuera de pantalla */
  const hf = $('#heroFilm'), hv = $('#heroVideo'), hs = $('#heroSnd');
  if (hf && hv) {
    const open = () => hf.classList.add('open');
    if (reduce) { hv.removeAttribute('autoplay'); hv.pause(); open(); }
    else {
      hv.addEventListener('playing', () => setTimeout(open, 150), { once: true });
      setTimeout(open, 1200);
      hv.play().catch(open);
      if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => {
        if (en.isIntersecting) hv.play().catch(() => {}); else hv.pause();
      }, { threshold: 0.15 }).observe(hf);
    }
    if (hs) hs.addEventListener('click', () => {
      hv.muted = !hv.muted; hs.setAttribute('aria-pressed', String(!hv.muted));
      hs.textContent = hv.muted ? 'Activar sonido' : 'Silenciar';
      if (!hv.muted) { $$('.clip video').forEach(o => { o.muted = true; }); $$('.clip .snd').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.textContent = 'Activar sonido'; }); hv.play().catch(() => {}); }
    });
  }

  /* Timecode a 24 fps */
  const tcs = $$('[data-tc]');
  if (tcs.length) {
    const t0 = performance.now(), pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const s = (performance.now() - t0) / 1000, f = Math.floor(s * 24) % 24, S = Math.floor(s);
      const t = `${pad(Math.floor(S / 3600))}:${pad(Math.floor(S / 60) % 60)}:${pad(S % 60)}:${pad(f)}`;
      tcs.forEach(el => { el.textContent = t; });
      if (!reduce) requestAnimationFrame(tick);
    };
    tick();
  }

  /* Filtros del trabajo */
  const chips = $$('.filters .chip'), shots = $$('.shot');
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-pressed', String(x === c)));
    shots.forEach(s => { s.hidden = !(c.dataset.f === 'all' || s.dataset.k === c.dataset.f); });
  }));

  /* Lightbox: solo abre imágenes propias de la carpeta img/ */
  const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), SAFE_IMG = /^img\/[a-z0-9-]+\.jpg$/;
  if (lb && lbImg) {
    shots.forEach(s => s.addEventListener('click', () => {
      const i = $('img', s), src = i && i.getAttribute('src');
      if (!src || !SAFE_IMG.test(src)) return;
      lbImg.src = src; lbImg.alt = i.alt;
      lbCap.textContent = $$('figcaption span', s).map(x => x.textContent).join(' · ');
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
    }));
    $('#lbClose').addEventListener('click', () => lb.close());
    lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  }


  /* Video: vistas previas sin sonido cuando están a la vista; clic abre la versión completa */
  const cards = $$('.vcard'), vlb = $('#vlb'), vlbV = $('#vlbVideo'), vlbCap = $('#vlbCap'), SAFE_VID = /^video\/[a-z0-9-]+\.mp4$/;
  if (cards.length) {
    const previews = cards.map(c => $('video', c));
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => entries.forEach(en => {
        const v = en.target.querySelector('video');
        if (en.isIntersecting && !(vlb && vlb.open)) v.play().catch(() => {}); else v.pause();
      }), { threshold: 0.4 });
      cards.forEach(c => io.observe(c));
    }
    const closeV = () => { if (!vlbV) return; vlbV.pause(); vlbV.removeAttribute('src'); vlbV.load(); };
    cards.forEach(c => c.addEventListener('click', () => {
      const full = c.dataset.full;
      if (!vlb || !full || !SAFE_VID.test(full)) return;
      previews.forEach(v => v.pause());
      const hv0 = $('#heroVideo'); if (hv0) { hv0.muted = true; const hb = $('#heroSnd'); if (hb) { hb.setAttribute('aria-pressed', 'false'); hb.textContent = 'Activar sonido'; } }
      vlbV.poster = $('video', c).getAttribute('poster') || '';
      vlbV.src = full; vlbCap.textContent = c.dataset.title || '';
      if (typeof vlb.showModal === 'function') vlb.showModal(); else vlb.setAttribute('open', '');
      vlbV.play().catch(() => {});
    }));
    if (vlb) {
      $('#vlbClose').addEventListener('click', () => vlb.close());
      vlb.addEventListener('click', e => { if (e.target === vlb) vlb.close(); });
      vlb.addEventListener('close', closeV);
    }
  }

  /* Laboratorio de color (aproximaciones con filtros CSS) */
  const LOOKS = Object.freeze({
    film: [
      ['Kodak Portra 400', 'sepia(.14) saturate(.92) contrast(.94) brightness(1.05)', 'linear-gradient(rgba(255,180,120,.10),rgba(255,200,160,.06))', 'soft-light'],
      ['Fuji Classic Chrome', 'saturate(.62) contrast(1.12) brightness(.98) hue-rotate(-6deg)', 'linear-gradient(rgba(40,70,80,.18),rgba(40,70,80,.10))', 'soft-light'],
      ['Kodak Tri-X 400', 'grayscale(1) contrast(1.35) brightness(.98)', 'none', 'normal']
    ],
    nineties: [
      ['Minilab', 'sepia(.18) saturate(1.1) contrast(.86) brightness(1.08)', 'linear-gradient(rgba(255,215,120,.16),rgba(255,215,120,.06))', 'soft-light'],
      ['Cross Process', 'saturate(1.55) contrast(1.22) hue-rotate(12deg)', 'linear-gradient(135deg,rgba(255,235,0,.22),rgba(0,170,200,.24))', 'overlay'],
      ['Camcorder Hi8', 'blur(.5px) saturate(1.3) contrast(.88) brightness(1.06)', 'repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px)', 'normal'],
    ]
  });
  const graded = $('#graded'), tint = $('#tint'), lookName = $('#lookName'), viewer = $('#viewer'), cut = $('#cut');
  if (graded && tint && viewer) {
    const lookBtns = [];
    const apply = (l, btn) => {
      graded.style.filter = l[1]; tint.style.background = l[2]; tint.style.mixBlendMode = l[3];
      lookName.textContent = l[0];
      lookBtns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    };
    [['looksFilm', LOOKS.film], ['looks90', LOOKS.nineties]].forEach(([id, arr]) => {
      const box = document.getElementById(id);
      arr.forEach(l => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'chip'; b.textContent = l[0]; b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => apply(l, b));
        box.append(b); lookBtns.push(b);
      });
    });
    apply(LOOKS.film[0], lookBtns[0]);
    const setCut = () => viewer.style.setProperty('--cut', `${Math.min(100, Math.max(0, Number(cut.value) || 0))}%`);
    cut.addEventListener('input', setCut); setCut();
  }

  /* Copiar al portapapeles (sin leerlo nunca) */
  const copy = async (text, ok, fail) => { try { await navigator.clipboard.writeText(text); ok(); } catch { fail(); } };
  $$('.copy').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy || '',
    () => { b.textContent = 'Copiado'; setTimeout(() => { b.textContent = 'Copiar'; }, 1600); },
    () => {
      const t = b.parentElement.querySelector('[data-mail-user]');
      if (t) { const r = document.createRange(); r.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      b.textContent = 'Selecciónalo';
    })));

  /* Brief: arma el mensaje en el navegador. No se envía ni se guarda. */
  const kinds = $$('#kinds .chip'), msg = $('#msg'), status = $('#status'), brief = $('#brief');
  if (brief && msg) {
    const MAX = 1000;
    const clean = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '').trim().slice(0, MAX);
    kinds.forEach(k => k.addEventListener('click', () => k.setAttribute('aria-pressed', String(k.getAttribute('aria-pressed') !== 'true'))));
    brief.addEventListener('submit', e => {
      e.preventDefault();
      const sel = kinds.filter(k => k.getAttribute('aria-pressed') === 'true').map(k => k.textContent);
      const body = clean(msg.value);
      if (!sel.length && !body) { status.textContent = 'Elige un tipo de proyecto o escribe tu idea.'; return; }
      const mail = ($('[data-mail-user]') || {}).textContent || 'nuestro correo';
      const text = `Hola 7FrameLab.\n${sel.length ? 'Proyecto: ' + sel.join(', ') + '\n' : ''}${body}`;
      copy(text,
        () => { status.textContent = `Mensaje copiado. Envíalo a ${mail} o por DM.`; },
        () => { msg.value = text; msg.select(); status.textContent = 'Selecciona el texto y cópialo.'; });
    });
  }
})();
