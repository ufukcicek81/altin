const CACHE='asil-v57-static';
const SYNC_FIX='supabase-sync-fix.js';
const REMOTE_RENDER='remote-render.js';
const SYNC_VER='57';

self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
  await self.clients.claim();
})()));

async function injectSyncFix(resp){
  try{
    if(!resp||!resp.ok)return resp;
    const type=resp.headers.get('content-type')||'';
    if(type.indexOf('text/html')===-1)return resp;
    let text=await resp.text();
    if(text.indexOf(SYNC_FIX+'?v='+SYNC_VER)===-1){
      const tag='<script src="/'+SYNC_FIX+'?v='+SYNC_VER+'"></script>\n<script src="/'+REMOTE_RENDER+'?v='+SYNC_VER+'"></script>\n';
      text=text.replace(/<\/body>/i,tag+'</body>');
    }
    const headers=new Headers(resp.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(text,{status:resp.status,statusText:resp.statusText,headers:headers});
  }catch(e){return resp;}
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(r.mode==='navigate'||/\.(?:html?)$/i.test(u.pathname)){
    e.respondWith(fetch(r,{cache:'no-store'}).then(injectSyncFix).catch(()=>caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(resp=>{
    if(resp&&resp.ok&&u.origin===location.origin){const cp=resp.clone();caches.open(CACHE).then(x=>x.put(r,cp));}
    return resp;
  })));
});
