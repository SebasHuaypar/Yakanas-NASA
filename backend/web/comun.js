/* Dirección de la API, compartida por las páginas.
   En esta computadora usa el puerto 8000. En cualquier otro sitio (el bucket
   público, por ejemplo) usa la API de Cloud Run. ?api= la reemplaza, y los
   enlaces entre páginas se la pasan para no volver a buscar el puerto local. */
const API_PUBLICA = "https://calendario-fuego-1022991169828.southamerica-west1.run.app";
const _parametros = new URLSearchParams(location.search);
const _enLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "file:";
const API = _parametros.get("api") || (_enLocal ? "http://127.0.0.1:8000" : API_PUBLICA);

function enlace(pagina) {
  const q = new URLSearchParams();
  const api = _parametros.get("api") || (!_enLocal ? API : "");
  if (api) q.set("api", api);
  const s = q.toString();
  return pagina + (s ? "?" + s : "");
}

function mensajeApi(err) {
  const donde = _enLocal && !API.startsWith("https")
    ? "¿Está encendida en el puerto 8000?"
    : "No respondió " + API + ".";
  return "No pude leer la API. " + donde + " " + (err && err.message ? err.message : "");
}

document.querySelectorAll("a[data-pagina]").forEach(a => { a.href = enlace(a.dataset.pagina); });
