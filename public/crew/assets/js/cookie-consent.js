(function () {
  'use strict';

  var STORAGE_KEY = 'gula_cookie_consent';
  var VERSION = '2026-04';
  var FALLBACK_SUPABASE_URL = 'https://gblmjealpcyswcgjrhzk.supabase.co';
  var FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA';

  function getStoredConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function hasAnalyticsConsent() {
    var consent = getStoredConsent();
    return !!(consent && consent.analytics === true && consent.version === VERSION);
  }

  function saveConsent(options) {
    var consent = {
      version: VERSION,
      necessary: true,
      analytics: !!options.analytics,
      marketing: !!options.marketing,
      privacyAccepted: !!options.privacyAccepted,
      createdAt: new Date().toISOString(),
      pagePath: window.location.pathname
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(consent)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('gula:consent-updated', { detail: consent }));
    persistConsent(consent);
    hideBanner();
    return consent;
  }

  function persistConsent(consent) {
    var supabaseUrl = (window.GULA_CONFIG && window.GULA_CONFIG.supabaseUrl) || FALLBACK_SUPABASE_URL;
    var supabaseAnonKey = (window.GULA_CONFIG && window.GULA_CONFIG.supabaseAnonKey) || FALLBACK_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return;
    var anonId = window.gula && window.gula.getAnonId ? window.gula.getAnonId() : localStorage.getItem('gula_anon_id');
    fetch(supabaseUrl + '/rest/v1/consents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': 'Bearer ' + supabaseAnonKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        anon_id: anonId,
        source: 'cookie_banner',
        necessary: true,
        analytics: consent.analytics,
        marketing: consent.marketing,
        privacy_accepted: consent.privacyAccepted,
        consent_version: consent.version,
        page_path: consent.pagePath,
        user_agent: navigator.userAgent
      }),
      keepalive: true
    }).catch(function () {});
  }

  function hideBanner() {
    var banner = document.getElementById('gula-cookie-banner');
    if (banner) banner.remove();
  }

  function renderBanner() {
    var storedConsent = getStoredConsent();
    if (storedConsent && storedConsent.version === VERSION) {
      window.dispatchEvent(new CustomEvent('gula:consent-updated', { detail: storedConsent }));
      return;
    }
    if (document.getElementById('gula-cookie-banner')) return;

    var banner = document.createElement('div');
    banner.id = 'gula-cookie-banner';
    banner.innerHTML = '<div class="gula-cookie-card"><div><strong>Cookies en GULA</strong><p>Usamos cookies necesarias para que la web funcione y, solo con tu permiso, analítica para mejorar la experiencia.</p><label><input type="checkbox" id="gula-cookie-analytics"> Analítica</label><label><input type="checkbox" id="gula-cookie-marketing"> Marketing</label></div><div class="gula-cookie-actions"><button type="button" data-cookie-action="reject">Rechazar</button><button type="button" data-cookie-action="save">Guardar</button><button type="button" data-cookie-action="accept">Aceptar todo</button></div></div>';

    var style = document.createElement('style');
    style.textContent = '#gula-cookie-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:99999}.gula-cookie-card{max-width:960px;margin:auto;background:#111;color:#fff;border:1px solid #ff5800;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:18px;display:flex;gap:18px;justify-content:space-between;align-items:center;font-family:Inter,Arial,sans-serif}.gula-cookie-card p{margin:6px 0 12px;color:#d1d5db;font-size:14px}.gula-cookie-card label{display:inline-flex;gap:8px;align-items:center;margin-right:14px;font-size:13px}.gula-cookie-actions{display:flex;gap:10px;flex-wrap:wrap}.gula-cookie-actions button{border:1px solid #ff5800;background:transparent;color:#fff;border-radius:999px;padding:10px 14px;font-weight:800;cursor:pointer}.gula-cookie-actions button[data-cookie-action="accept"]{background:#ff5800;color:#111}@media(max-width:720px){.gula-cookie-card{display:block}.gula-cookie-actions{margin-top:14px}}';
    document.head.appendChild(style);
    document.body.appendChild(banner);

    banner.addEventListener('click', function (event) {
      var action = event.target && event.target.getAttribute('data-cookie-action');
      if (!action) return;
      if (action === 'reject') saveConsent({ analytics: false, marketing: false, privacyAccepted: true });
      if (action === 'save') saveConsent({ analytics: document.getElementById('gula-cookie-analytics').checked, marketing: document.getElementById('gula-cookie-marketing').checked, privacyAccepted: true });
      if (action === 'accept') saveConsent({ analytics: true, marketing: true, privacyAccepted: true });
    });
  }

  window.gulaConsent = {
    get: getStoredConsent,
    save: saveConsent,
    hasAnalytics: hasAnalyticsConsent,
    version: VERSION
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderBanner);
  } else {
    renderBanner();
  }
})();
