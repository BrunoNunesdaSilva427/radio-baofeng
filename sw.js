const CACHE = "baofeng777s-v3";
const FILES = ["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png",
  "1.mp3","2.mp3","3.mp3","4.mp3","5.mp3","6.mp3","7.mp3","8.mp3","1med.mp3","2med.mp3","3med.mp3","4med.mp3"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function ranged(req, res){            // Safari/iOS exige suporte a Range para áudio
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range"));
  const start = m[1] ? parseInt(m[1]) : 0;
  const end = m[2] ? Math.min(parseInt(m[2]), buf.byteLength-1) : buf.byteLength-1;
  return new Response(buf.slice(start, end+1), {status:206, headers:{
    "Content-Type": res.headers.get("Content-Type") || "audio/mpeg",
    "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
    "Content-Length": String(end-start+1), "Accept-Ranges":"bytes"}});
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isCode = req.mode === "navigate" || /\/(index\.html|sw\.js|manifest\.webmanifest)?$/.test(url.pathname);
  e.respondWith((async () => {
    if (isCode && !req.headers.get("range")){      // página: tenta a versão nova e guarda; sem internet, usa a guardada
      try {
        const net = await fetch(req, {cache:"no-cache"});
        if (net.ok){ const c = await caches.open(CACHE); c.put(req, net.clone()); }
        return net;
      } catch(err){
        return (await caches.match(req, {ignoreSearch:true})) || (await caches.match("index.html")) || Response.error();
      }
    }
    const hit = await caches.match(req, {ignoreSearch:true});   // áudios e ícones: direto do aparelho
    if (hit) return req.headers.get("range") ? ranged(req, hit) : hit;
    try { return await fetch(req); } catch(err) { return Response.error(); }
  })());
});
