// Se inyecta inline en <head> (antes de pintar). Mantiene el comportamiento
// anterior: ?lang= > preferencia guardada > idioma del navegador.
(function () {
  var KEY = 'system_core_lang';
  var html = document.documentElement;
  var page = html.lang === 'es' ? 'es' : 'en';
  var alt = {
    en: html.getAttribute('data-href-en'),
    es: html.getAttribute('data-href-es'),
  };
  if (/bot|crawl|spider|slurp|lighthouse/i.test(navigator.userAgent || '')) return;
  var params = new URLSearchParams(location.search);
  var query = (params.get('lang') || '').toLowerCase();
  var stored = null;
  try { stored = (localStorage.getItem(KEY) || '').toLowerCase(); } catch (e) {}
  var target;
  if (query === 'en' || query === 'es') target = query;
  else if (stored === 'en' || stored === 'es') target = stored;
  // Sin preferencia: un enlace explícito a /es/ se respeta; en las rutas por defecto decide el navegador.
  else if (page === 'es') target = 'es';
  else target = (navigator.language || 'en').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  try { localStorage.setItem(KEY, target); } catch (e) {}
  if (query) params.delete('lang');
  var search = params.toString();
  if (target !== page && alt[target]) {
    location.replace(alt[target] + (search ? '?' + search : '') + location.hash);
  } else if (query) {
    history.replaceState(null, '', location.pathname + (search ? '?' + search : '') + location.hash);
  }
})();
