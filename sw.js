const CACHE = "baofeng777s-v1";
const FILES = ["./","index.html","manifest.webmanifest","icon-192.png","icon-512.png",
  "1.mp3","2.mp3","3.mp3","4.mp3","5.mp3","6.mp3","7.mp3","8.mp3"];
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
  e.respondWith((async () => {
    const hit = await caches.match(req, {ignoreSearch:true});
    if (hit) return req.headers.get("range") ? ranged(req, hit) : hit;
    try { return await fetch(req); } catch(err) { return (await caches.match("index.html")) || Response.error(); }
  })());
});
