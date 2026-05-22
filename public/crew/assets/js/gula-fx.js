// GULA · capa global de micro-interacciones. No altera layout.
(function () {
  // 1) Reveal on scroll para títulos y secciones
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 }) : null;
  function autoReveal() {
    document.querySelectorAll('h1, h2, .reveal, [data-reveal]').forEach(el => {
      if (!el.classList.contains('gfx-reveal') && !el.dataset.gfxNoReveal) {
        el.classList.add('gfx-reveal');
        io && io.observe(el);
      }
    });
  }

  // 2) Magnetic + ripple en botones
  function magnetize(el) {
    el.classList.add('gfx-magnetic', 'gfx-ripple', 'gfx-glow');
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.transform = `translate(${(x - r.width / 2) / 12}px, ${(y - r.height / 2) / 14}px)`;
      el.style.setProperty('--mx', x + 'px');
      el.style.setProperty('--my', y + 'px');
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    el.addEventListener('click', e => {
      const r = el.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(r.width, r.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }
  function autoMagnet() {
    document.querySelectorAll('button, .btn, a[role="button"], input[type="submit"]').forEach(b => {
      if (b.dataset.gfx) return;
      if (b.closest('.no-fx')) return;
      b.dataset.gfx = '1';
      magnetize(b);
    });
  }

  // 3) Toast system global
  const stack = document.createElement('div');
  stack.className = 'gfx-toast-stack';
  function ensureStack() { if (!stack.parentNode) document.body.appendChild(stack); }
  window.gulaToast = function (title, body, kind) {
    ensureStack();
    const t = document.createElement('div');
    t.className = 'gfx-toast ' + (kind || '');
    t.innerHTML = '<div class="title">' + (title || 'GULA') + '</div><div>' + (body || '') + '</div>';
    stack.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 500); }, 4200);
  };

  // 4) Auto inicialización
  function init() { autoReveal(); autoMagnet(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 5) Observa cambios DOM (para inputs/botones añadidos dinámicamente)
  const mo = new MutationObserver(() => { autoReveal(); autoMagnet(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
