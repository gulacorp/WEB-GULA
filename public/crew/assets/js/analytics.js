/**
 * GULA — Analytics (PostHog + Supabase events mirror)
 *
 * Doble destino:
 *   1. PostHog: para dashboards, funnels, retention en posthog.com
 *   2. Tabla `events` de Supabase: para que las KPIs del CEO Dashboard
 *      se calculen vía SQL sin depender de la API de PostHog.
 *
 * Catálogo cerrado de eventos (NO inventar nuevos sin documentar primero):
 *   page_view, cta_click, uber_redirect, whatsapp_click,
 *   club_signup_started, club_signup_completed,
 *   order_started, order_paid,
 *   mi_cuenta_view, reorder_click,
 *   referral_link_copied, nps_submitted
 *
 * Uso:
 *   gula.track('cta_click', { cta_id: 'pedir-online' });
 *   gula.identify(memberId, { store: 'mostoles' });
 *   gula.getAnonId();
 */
(function () {
  'use strict';

  var ANON_KEY = 'gula_anon_id';
  var MEMBER_KEY = 'gula_member_id';

  function uuid() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getAnonId() {
    var id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = uuid();
      try { localStorage.setItem(ANON_KEY, id); } catch (e) { /* noop */ }
    }
    return id;
  }

  function getMemberId() {
    return localStorage.getItem(MEMBER_KEY) || null;
  }

  function setMemberId(id) {
    if (id) {
      try { localStorage.setItem(MEMBER_KEY, id); } catch (e) { /* noop */ }
    } else {
      localStorage.removeItem(MEMBER_KEY);
    }
  }

  // ─── PostHog loader oficial ───────────────────────────────────────────
  function loadPostHog(apiKey, host) {
    if (window.posthog && window.posthog.__loaded) return;
    !function (t, e) { var o, n, p, r; e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) { function g(t, e) { var o = e.split('.'); 2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; } (p = t.createElement('script')).type = 'text/javascript', p.crossOrigin = 'anonymous', p.async = !0, p.src = s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js', (r = t.getElementsByTagName('script')[0]).parentNode.insertBefore(p, r); var u = e; for (void 0 !== a ? u = e[a] = [] : a = 'posthog', u.people = u.people || [], u.toString = function (t) { var e = 'posthog'; return 'posthog' !== a && (e += '.' + a), t || (e += ' (stub)'), e; }, u.people.toString = function () { return u.toString(1) + '.people (stub)'; }, o = 'init bs ws ge fs capture De Ai $s register register_once register_for_session unregister unregister_for_session Is getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Ts $t Rs createPersonProfile Es opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing Ss debug ks getPageViewId captureTraceFeedback captureTraceMetric'.split(' '), n = 0; n < o.length; n++) g(u, o[n]); e._i.push([i, s, a]); }, e.__SV = 1); }(document, window.posthog || []);

    posthog.init(apiKey, {
      api_host: host || 'https://us.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,    // lo manejamos manual con gula.track('page_view')
      capture_pageleave: true,
      autocapture: true
    });
  }

  // ─── Doble envío: PostHog + Supabase events ─────────────────────────
  function postToSupabase(eventName, properties) {
    if (!window.GULA_CONFIG || !window.GULA_CONFIG.supabaseUrl || !window.GULA_CONFIG.supabaseAnonKey) return;
    var attr = (window.gulaAttr && window.gulaAttr.get()) || {};
    var body = {
      member_id:  getMemberId(),
      anon_id:    getAnonId(),
      event_name: eventName,
      store:      properties.store || attr.store || null,
      properties: properties || {},
      utm:        attr.utm || {},
      page_path:  window.location.pathname,
      referrer:   document.referrer || null,
      user_agent: navigator.userAgent
    };
    fetch(window.GULA_CONFIG.supabaseUrl + '/rest/v1/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': window.GULA_CONFIG.supabaseAnonKey,
        'Authorization': 'Bearer ' + window.GULA_CONFIG.supabaseAnonKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body),
      keepalive: true
    }).catch(function () { /* silencioso */ });
  }

  function track(eventName, properties) {
    properties = properties || {};
    if (window.posthog && window.posthog.capture) {
      window.posthog.capture(eventName, properties);
    }
    postToSupabase(eventName, properties);
  }

  function identify(memberId, traits) {
    if (!memberId) return;
    setMemberId(memberId);
    if (window.posthog && window.posthog.identify) {
      window.posthog.identify(memberId, traits || {});
    }
  }

  function reset() {
    setMemberId(null);
    if (window.posthog && window.posthog.reset) window.posthog.reset();
  }

  // ─── Auto-tracking ──────────────────────────────────────────────────
  function trackPageView() {
    track('page_view', {
      path: window.location.pathname,
      title: document.title
    });
  }

  function bindCtaClicks() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-track]');
      if (!el) return;
      var ctaId = el.getAttribute('data-track');
      var props = { cta_id: ctaId };
      // Permite añadir propiedades extra desde data-track-*
      Array.prototype.forEach.call(el.attributes, function (attr) {
        if (attr.name.indexOf('data-track-') === 0 && attr.name !== 'data-track') {
          props[attr.name.replace('data-track-', '')] = attr.value;
        }
      });
      track('cta_click', props);
    }, { passive: true });
  }

  // ─── Inicialización ─────────────────────────────────────────────────
  function init() {
    if (!window.GULA_CONFIG_READY) return;
    window.GULA_CONFIG_READY.then(function (cfg) {
      if (cfg.posthog && cfg.posthog.apiKey) {
        loadPostHog(cfg.posthog.apiKey, cfg.posthog.host);
        var memberId = getMemberId();
        if (memberId && window.posthog && window.posthog.identify) {
          window.posthog.identify(memberId);
        }
      }
      trackPageView();
      bindCtaClicks();
    });
  }

  // API pública
  window.gula = {
    track: track,
    identify: identify,
    reset: reset,
    getAnonId: getAnonId,
    getMemberId: getMemberId
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
