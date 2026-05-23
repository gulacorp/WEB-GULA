/* GULA · Atmosphere helpers
   - Spawns floating embers
   - Tracks cursor for .spotlight elements
   - Triggers reveal animations
   - Magnetic effect on .btn-pill */
(function(){
  'use strict';

  // ---------- Embers ----------
  function spawnEmbers(){
    const c = document.getElementById('embers');
    if(!c) return;
    const count = window.innerWidth < 600 ? 12 : 22;
    for(let i=0;i<count;i++){
      const e = document.createElement('span');
      e.className = 'ember';
      e.style.left = Math.random()*100 + '%';
      e.style.animationDuration = (10 + Math.random()*14) + 's';
      e.style.animationDelay = (Math.random()*12) + 's';
      const size = 2 + Math.random()*2.5;
      e.style.width = size + 'px';
      e.style.height = size + 'px';
      c.appendChild(e);
    }
  }

  // ---------- Spotlight cursor ----------
  function bindSpotlight(){
    document.querySelectorAll('.spotlight').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top)/r.height*100) + '%');
      });
    });
  }

  // ---------- Reveal on scroll ----------
  function bindReveal(){
    if(!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:0.12, rootMargin:'0px 0px -60px 0px'});
    document.querySelectorAll('.reveal-up').forEach(el => io.observe(el));
  }

  // ---------- Magnetic buttons ----------
  function bindMagnetic(){
    document.querySelectorAll('.btn-pill').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width/2;
        const y = e.clientY - r.top - r.height/2;
        btn.style.transform = `translate(${x*0.18}px,${y*0.25}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform=''; });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => { spawnEmbers(); bindSpotlight(); bindReveal(); bindMagnetic(); });
  } else { spawnEmbers(); bindSpotlight(); bindReveal(); bindMagnetic(); }
})();
