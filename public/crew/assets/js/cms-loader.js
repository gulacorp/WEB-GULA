// GULA · CMS loader. Lee bloques de page_blocks y los aplica a elementos con data-cms-key.
// Uso en HTML:  <h1 data-cms-key="hero.title">Texto fallback</h1>
//               <img data-cms-key="hero.image" data-cms-attr="src" src="...">
(function () {
  const SUPABASE_URL = 'https://gblmjealpcyswcgjrhzk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdibG1qZWFscGN5c3djZ2pyaHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NDQzNDQsImV4cCI6MjA5MjUyMDM0NH0.KdQC9ZWuSmayOkLGr7Rrcz9i1PtW2ieIL-ZVVm4s7cA';
  function pagePath() {
    const p = location.pathname.replace(/^\//, '');
    return p || 'index.html';
  }
  async function load() {
    try {
      const url = SUPABASE_URL + '/rest/v1/page_blocks?select=block_key,block_type,value&active=eq.true&page=eq.' + encodeURIComponent(pagePath());
      const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
      if (!res.ok) return;
      const blocks = await res.json();
      const map = {};
      blocks.forEach(b => map[b.block_key] = b);
      document.querySelectorAll('[data-cms-key]').forEach(el => {
        const block = map[el.dataset.cmsKey];
        if (!block) return;
        const attr = el.dataset.cmsAttr;
        if (attr) el.setAttribute(attr, block.value);
        else if (block.block_type === 'html') el.innerHTML = block.value;
        else if (block.block_type === 'image') el.setAttribute('src', block.value);
        else if (block.block_type === 'color') el.style.color = block.value;
        else if (block.block_type === 'font') el.style.fontFamily = block.value;
        else el.textContent = block.value;
      });
      window.dispatchEvent(new CustomEvent('gula:cms-ready', { detail: blocks }));
    } catch (e) { console.warn('CMS loader', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
