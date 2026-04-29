/**
 * GULA — Captura y persistencia de UTM + parámetros de origen
 * Persiste utm_*, src, store, ref durante 30 días en localStorage
 * para atribuir cualquier evento posterior a la campaña original.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'gula_attr';
  var TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
  var UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var EXTRA_PARAMS = ['src', 'store', 'ref'];

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt) return null;
      if (Date.now() - parsed.savedAt > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function captureFromUrl() {
    var qs = new URLSearchParams(window.location.search);
    var utm = {};
    var extra = {};
    var hasAny = false;

    UTM_PARAMS.forEach(function (k) {
      var v = qs.get(k);
      if (v) { utm[k] = v; hasAny = true; }
    });
    EXTRA_PARAMS.forEach(function (k) {
      var v = qs.get(k);
      if (v) { extra[k] = v; hasAny = true; }
    });

    if (!hasAny) return null;

    var stored = readStored() || {};
    var merged = {
      utm: Object.assign({}, stored.utm || {}, utm),
      src: extra.src || stored.src || null,
      store: extra.store || stored.store || null,
      ref: extra.ref || stored.ref || null,
      firstReferrer: stored.firstReferrer || document.referrer || null,
      firstLandingPath: stored.firstLandingPath || window.location.pathname,
      savedAt: Date.now()
    };

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) { /* noop */ }
    return merged;
  }

  // Captura al cargar
  captureFromUrl();

  // API pública
  window.gulaAttr = {
    get: function () {
      return readStored() || {
        utm: {}, src: null, store: null, ref: null,
        firstReferrer: document.referrer || null,
        firstLandingPath: window.location.pathname
      };
    },
    clear: function () { localStorage.removeItem(STORAGE_KEY); }
  };
})();
