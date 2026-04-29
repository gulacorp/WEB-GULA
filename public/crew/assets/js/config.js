/**
 * GULA — Configuración global del frontend
 * Carga las claves públicas desde /api/config (servidas por server.js)
 * y las expone en window.GULA_CONFIG. Resuelve la promesa GULA_CONFIG_READY
 * cuando ya se puede usar.
 */
(function () {
  'use strict';

  var STORES = {
    mostoles:  { name: 'Móstoles',  wa: '+34000000000', uber: 'https://www.ubereats.com/store/gula-mostoles' },
    valencia:  { name: 'Valencia',  wa: '+34000000000', uber: 'https://www.ubereats.com/store/gula-valencia' },
    cartagena: { name: 'Cartagena', wa: '+34000000000', uber: 'https://www.ubereats.com/store/gula-cartagena' },
    sevilla:   { name: 'Sevilla',   wa: '+34000000000', uber: 'https://www.ubereats.com/store/gula-sevilla' }
  };

  window.GULA_CONFIG = {
    ready: false,
    posthog: { apiKey: null, host: 'https://us.posthog.com' },
    supabaseUrl: null,
    supabaseAnonKey: null,
    googleMapsApiKey: null,
    crispWebsiteId: null,
    stores: STORES
  };

  window.GULA_CONFIG_READY = new Promise(function (resolve) {
    fetch('/api/config', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (cfg) {
        if (cfg.posthog) window.GULA_CONFIG.posthog = cfg.posthog;
        if (cfg.supabaseUrl) window.GULA_CONFIG.supabaseUrl = cfg.supabaseUrl;
        if (cfg.supabaseAnonKey) window.GULA_CONFIG.supabaseAnonKey = cfg.supabaseAnonKey;
        if (cfg.googleMapsApiKey) window.GULA_CONFIG.googleMapsApiKey = cfg.googleMapsApiKey;
        if (cfg.crispWebsiteId) window.GULA_CONFIG.crispWebsiteId = cfg.crispWebsiteId;
        window.GULA_CONFIG.ready = true;
        resolve(window.GULA_CONFIG);
      })
      .catch(function () {
        window.GULA_CONFIG.ready = true;
        resolve(window.GULA_CONFIG);
      });
  });
})();
