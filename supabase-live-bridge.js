/* ASIL KUYUMCULUK — live Supabase settings bridge
   This runs before the main app code. It keeps the existing save/load UI intact
   while making asil_settings writes deterministic against the existing row. */
(function(){
  'use strict';
  if (window.__asilSupabaseLiveBridge) return;
  window.__asilSupabaseLiveBridge = true;

  var SUPABASE_URL='https://isrcaoulynycmwnxofgn.supabase.co';
  var SUPABASE_KEY='sb_publishable_2lHpVrZEgHmPjWD8kOEuLA_Fz6gzZEe';
  var TABLE=SUPABASE_URL+'/rest/v1/app_settings';
  var originalFetch=window.fetch.bind(window);

  function isSettingsWrite(url){
    try{
      var u=new URL(url,location.href);
      return u.origin===new URL(TABLE).origin && u.pathname==='/rest/v1/app_settings' && u.search.indexOf('on_conflict=id')!==-1;
    }catch(e){return false;}
  }

  window.fetch=function(input,init){
    var url='';
    try{url=typeof input==='string'?input:(input&&input.url)||'';}catch(e){}
    if(!isSettingsWrite(url)) return originalFetch(input,init);

    var method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
    if(method!=='POST') return originalFetch(input,init);

    return (async function(){
      var raw=init&&init.body!==undefined?init.body:await input.clone().text();
      var body=typeof raw==='string'?JSON.parse(raw):raw;
      var id=body&&body.id;
      if(!id) return originalFetch(input,init);

      var updateBody={data:body.data,updated_at:body.updated_at};
      var target=TABLE+'?id=eq.'+encodeURIComponent(id);
      var headers={
        'Content-Type':'application/json',
        'apikey':SUPABASE_KEY,
        'Prefer':'return=representation'
      };

      /* Existing row: update it directly. */
      var r=await originalFetch(target,{method:'PATCH',cache:'no-store',headers:headers,body:JSON.stringify(updateBody)});
      if(r.ok){
        var rows=await r.clone().json().catch(function(){return[];});
        if(Array.isArray(rows)&&rows.length){
          console.log('[Asil Supabase] settings UPDATE OK',id,rows[0].updated_at||'');
          return r;
        }
      }

      /* If the row does not exist, fall back to the original upsert. */
      var fallback=await originalFetch(url,init);
      if(!fallback.ok){
        var detail=await fallback.clone().text().catch(function(){return'';});
        console.error('[Asil Supabase] settings SAVE FAILED',fallback.status,detail);
      }else{
        console.log('[Asil Supabase] settings UPSERT OK',id);
      }
      return fallback;
    })();
  };
})();
