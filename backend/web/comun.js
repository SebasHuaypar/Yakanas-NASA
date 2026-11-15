/* API address shared by the pages.
   On this computer it uses port 8000. Anywhere else (the public bucket, for
   example) it uses the Cloud Run API. ?api= replaces it, and links between
   pages pass it along so they do not have to look up the local port again. */
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
