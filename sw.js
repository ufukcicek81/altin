const CACHE='asil-v64-static';
const SYNC_FIX='supabase-sync-fix.js';

self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);
  await self.clients.claim();
  try{await self.registration.update();}catch(e){}
})()));

async function injectScripts(resp){
  try{
    if(!resp||!resp.ok)return resp;
    const type=resp.headers.get('content-type')||'';
    if(type.indexOf('text/html')===-1)return resp;
    let text=await resp.text();
    const fixUrl=new URL(SYNC_FIX,self.registration.scope).href;
    const tag='<script src="'+fixUrl+'"></script>\n';
    if(text.indexOf(SYNC_FIX)===-1){
      if(/<\/head>/i.test(text))text=text.replace(/<\/head>/i,tag+'</head>');
      else text=tag+text;
    }
    const headers=new Headers(resp.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('Cache-Control','no-store');
    return new Response(text,{status:resp.status,statusText:resp.statusText,headers:headers});
  }catch(e){return resp;}
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(r.mode==='navigate'||/\.(?:html?)$/i.test(u.pathname)){
    e.respondWith(fetch(r,{cache:'no-store'}).then(injectScripts).catch(()=>caches.match(r)));
    return;
  }
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(resp=>{
    if(resp&&resp.ok&&u.origin===location.origin){const cp=resp.clone();caches.open(CACHE).then(x=>x.put(r,cp));}
    return resp;
  })));
});
