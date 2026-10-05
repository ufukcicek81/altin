const CACHE='asil-v51-static';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim()})()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET') return;
  const u=new URL(r.url);
  if(r.mode==='navigate'||/\.(?:html?)$/i.test(u.pathname)){
    e.respondWith(fetch(r,{cache:'no-store'}).catch(()=>caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(resp=>{if(resp&&resp.ok&&u.origin===location.origin){const cp=resp.clone();caches.open(CACHE).then(x=>x.put(r,cp));}return resp;})));
});
