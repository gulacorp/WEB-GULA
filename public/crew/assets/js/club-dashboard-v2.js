// GULA · Club dashboard wallet-style v2
// Reemplaza el contenido de #step11 por una experiencia tipo Apple Wallet con scroll infinito,
// QR, código de miembro, misiones y eventos publicados desde el admin, y feed de blog.
(function () {
  const SUPABASE_URL = 'https://gblmjealpcyswcgjrhzk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA';

  const state = { missionsLimit: 4, eventsLimit: 4, blogLimit: 3 };

  const safe = v => String(v == null ? '' : v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const fmtDate = s => { if (!s) return ''; const d = new Date(s); return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); };

  async function fetchTable(tableName, query) {
    const url = SUPABASE_URL + '/rest/v1/' + tableName + '?' + query;
    const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
    if (!res.ok) return [];
    return res.json();
  }

  function getMember() {
    try {
      return JSON.parse(localStorage.getItem('gulaCurrentMember') || sessionStorage.getItem('gulaCurrentMember') || 'null') || {
        nombre: localStorage.getItem('gulaNombre') || 'CREW',
        member_code: localStorage.getItem('gulaMemberCode') || 'GULA-CREW',
        puntos: Number(localStorage.getItem('gulaPuntos') || 0),
        nivel: localStorage.getItem('gulaNivel') || 'Bronce',
        email: localStorage.getItem('gulaEmail') || ''
      };
    } catch (e) { return { nombre: 'CREW', member_code: 'GULA-CREW', puntos: 0, nivel: 'Bronce' }; }
  }

  function tierProgress(points) {
    const tiers = [{ name: 'Bronce', min: 0, max: 250 }, { name: 'Plata', min: 250, max: 600 }, { name: 'Oro', min: 600, max: 1200 }, { name: 'Diamante', min: 1200, max: 9999 }];
    const t = tiers.find(x => points < x.max) || tiers[tiers.length - 1];
    const pct = Math.min(100, Math.round((points - t.min) / (t.max - t.min) * 100));
    return { tier: t.name, pct, next: t.max - points };
  }

  function buildShell(member) {
    const tp = tierProgress(member.puntos || 0);
    return `
    <div class="gd2">
      <div class="gd2-wallet">
        <div class="gd2-wallet-top">
          <div>
            <div class="gd2-eyebrow" style="color:#0a0a0a">Club Gula · CREW</div>
            <div class="gd2-wallet-name">${safe(member.nombre || 'Crew')}</div>
            <span class="gd2-wallet-tier">Tier ${safe(tp.tier)}</span>
          </div>
          <div class="gd2-avatar">${safe((member.nombre || 'G').charAt(0).toUpperCase())}</div>
        </div>
        <div class="gd2-wallet-mid">
          <div>
            <div class="gd2-points">${Number(member.puntos || 0)}</div>
            <div class="gd2-points-sub">Puntos GULA</div>
          </div>
          <div class="gd2-qr-wrap" id="gd2Qr"></div>
        </div>
        <div class="gd2-wallet-bottom">
          <span class="gd2-code">${safe(member.member_code || 'GULA-CREW')}</span>
          <span>${tp.next > 0 ? tp.next + ' pts a ' + (tierProgress((member.puntos || 0) + tp.next).tier) : 'Top tier'}</span>
        </div>
        <div class="gd2-progress"><div class="gd2-progress-bar" style="width:${tp.pct}%"></div></div>
      </div>

      <div class="gd2-quick">
        <button onclick="window.gdAction&&window.gdAction('scan')"><span class="ico">⌘</span>Escanear</button>
        <button onclick="window.gdAction&&window.gdAction('rewards')"><span class="ico">★</span>Premios</button>
        <button onclick="window.gdAction&&window.gdAction('history')"><span class="ico">↻</span>Historial</button>
        <button onclick="window.gdAction&&window.gdAction('profile')"><span class="ico">☰</span>Perfil</button>
      </div>

      <div class="gd2-card">
        <div class="gd2-eyebrow">Tu actividad</div>
        <div class="gd2-stat-row">
          <div class="gd2-stat"><div class="v" id="gdStatVisits">0</div><div class="l">Visitas</div></div>
          <div class="gd2-stat"><div class="v" id="gdStatPoints">${Number(member.puntos || 0)}</div><div class="l">Pts totales</div></div>
          <div class="gd2-stat"><div class="v" id="gdStatBadges">0</div><div class="l">Logros</div></div>
        </div>
      </div>

      <div class="gd2-section-h"><h3>Misiones activas</h3><a href="#" id="gdMoreMissions">Ver más</a></div>
      <div id="gdMissions"><div class="gd2-empty">Cargando misiones…</div></div>

      <div class="gd2-section-h"><h3>Próximos eventos</h3><a href="#" id="gdMoreEvents">Ver más</a></div>
      <div id="gdEvents"><div class="gd2-empty">Cargando eventos…</div></div>

      <div class="gd2-section-h"><h3>Blog Club</h3><a href="#" id="gdMoreBlog">Ver más</a></div>
      <div id="gdBlog"><div class="gd2-empty">Cargando blog…</div></div>
    </div>`;
  }

  function renderMissions(rows) {
    const el = document.getElementById('gdMissions');
    if (!rows.length) { el.innerHTML = '<div class="gd2-empty">Aún no hay misiones publicadas.</div>'; return; }
    el.innerHTML = rows.map(m => `<a class="gd2-mission" href="${safe(m.cta_url || '#')}" target="${m.cta_url ? '_blank' : '_self'}" rel="noopener">${m.image_url ? `<img src="${safe(m.image_url)}" alt="">` : '<div style="width:84px;height:84px;border-radius:14px;background:linear-gradient(135deg,#FF5800,#FF8C42);display:flex;align-items:center;justify-content:center;font-family:Aveline,sans-serif;font-size:24px;color:#0a0a0a">★</div>'}<div><h4>${safe(m.title)}</h4><p>${safe(m.description || '')}</p>${m.reward_points ? `<span class="pts">+${m.reward_points} pts</span>` : ''}${m.reward_label ? ` <span class="pts" style="background:#0a0a0a;color:#FF5800">${safe(m.reward_label)}</span>` : ''}</div></a>`).join('');
  }

  function renderEvents(rows) {
    const el = document.getElementById('gdEvents');
    if (!rows.length) { el.innerHTML = '<div class="gd2-empty">No hay eventos próximos.</div>'; return; }
    el.innerHTML = rows.map(ev => `<a class="gd2-event" href="${safe(ev.cta_url || '#')}" target="${ev.cta_url ? '_blank' : '_self'}" rel="noopener">${ev.cover_image ? `<img src="${safe(ev.cover_image)}" alt="">` : '<div style="width:84px;height:84px;border-radius:14px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;color:#FF5800;font-family:Aveline,sans-serif;font-size:22px">EV</div>'}<div><h4>${safe(ev.title)}</h4><time>${fmtDate(ev.starts_at)}${ev.location ? ' · ' + safe(ev.location) : ''}</time><p>${safe(ev.description || '')}</p></div></a>`).join('');
  }

  function renderBlog(rows) {
    const el = document.getElementById('gdBlog');
    if (!rows.length) { el.innerHTML = '<div class="gd2-empty">Sin posts todavía.</div>'; return; }
    el.innerHTML = rows.map(p => `<a class="gd2-blog" href="${safe(p.slug ? './blog.html?slug=' + p.slug : '#')}">${p.cover_image ? `<img src="${safe(p.cover_image)}" alt="">` : '<div style="width:84px;height:84px;border-radius:14px;background:#1a1a1a;display:flex;align-items:center;justify-content:center;color:#FF5800;font-family:Aveline,sans-serif;font-size:24px">B</div>'}<div><h4>${safe(p.title)}</h4><p>${safe(p.excerpt || '')}</p><time style="color:#FF5800;font-size:10px;letter-spacing:.8px;text-transform:uppercase;font-weight:900">${(p.published_at || '').slice(0, 10)} · ${p.reading_minutes || 3} min</time></div></a>`).join('');
  }

  function renderQR(member) {
    const wrap = document.getElementById('gd2Qr');
    if (!wrap) return;
    wrap.innerHTML = '';
    const data = JSON.stringify({ member_code: member.member_code, nombre: member.nombre, ts: Date.now() });
    if (window.QRCode) {
      try { new QRCode(wrap, { text: data, width: 80, height: 80, colorDark: '#000', colorLight: '#fff', correctLevel: QRCode.CorrectLevel.M }); }
      catch (e) { wrap.textContent = 'QR'; }
    } else {
      const img = new Image();
      img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(data);
      img.style.width = '80px';
      img.style.height = '80px';
      wrap.appendChild(img);
    }
  }

  async function loadAll() {
    const [missions, events, posts] = await Promise.all([
      fetchTable('club_missions', 'select=*&active=eq.true&order=sort_order.asc&limit=' + state.missionsLimit),
      fetchTable('club_events', 'select=*&active=eq.true&order=starts_at.asc&limit=' + state.eventsLimit),
      fetchTable('blog_posts', 'select=*&published=eq.true&order=published_at.desc&limit=' + state.blogLimit)
    ]);
    renderMissions(missions);
    renderEvents(events);
    renderBlog(posts);
  }

  function setupInfiniteScroll() {
    let busy = false;
    window.addEventListener('scroll', async () => {
      if (busy) return;
      const reachedBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 320;
      if (!reachedBottom) return;
      busy = true;
      state.missionsLimit += 3; state.eventsLimit += 3; state.blogLimit += 3;
      await loadAll();
      setTimeout(() => { busy = false; }, 600);
    });
  }

  function bindShortcuts() {
    document.getElementById('gdMoreMissions').onclick = e => { e.preventDefault(); state.missionsLimit += 4; loadAll(); };
    document.getElementById('gdMoreEvents').onclick = e => { e.preventDefault(); state.eventsLimit += 4; loadAll(); };
    document.getElementById('gdMoreBlog').onclick = e => { e.preventDefault(); state.blogLimit += 3; loadAll(); };
    window.gdAction = function (kind) {
      if (kind === 'profile' && typeof window.openProfile === 'function') return window.openProfile();
      if (kind === 'history' && typeof window.openPointsHistory === 'function') return window.openPointsHistory();
      if (kind === 'rewards' && typeof window.openMissionsModal === 'function') return window.openMissionsModal();
      if (kind === 'scan') alert('Escanea el QR de tu tarjeta GULA en sala para sumar puntos.');
    };
  }

  function mount() {
    const step = document.getElementById('step11');
    if (!step) return;
    const member = getMember();
    step.innerHTML = buildShell(member);
    renderQR(member);
    bindShortcuts();
    setupInfiniteScroll();
    loadAll();
  }

  // Sustituye solo cuando step11 esté visible
  function watchStep11() {
    const step = document.getElementById('step11');
    if (!step) { setTimeout(watchStep11, 400); return; }
    const obs = new MutationObserver(() => {
      const visible = step.classList.contains('active') || step.style.display === 'block';
      if (visible && !step.dataset.gd2) { step.dataset.gd2 = '1'; mount(); }
    });
    obs.observe(step, { attributes: true, attributeFilter: ['class', 'style'] });
    if (step.classList.contains('active')) { step.dataset.gd2 = '1'; mount(); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchStep11);
  else watchStep11();
})();
