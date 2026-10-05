/* Asil Kuyumculuk - Supabase cross-device sync fix
   Publishable keys must be sent via `apikey`, not Authorization: Bearer.
*/
(function(){
  'use strict';

  function getUrl(){ return window.SUPABASE_SETTINGS_URL || (window.SUPABASE_URL ? window.SUPABASE_URL + '/rest/v1/app_settings' : ''); }
  function getKey(){ return window.SUPABASE_KEY || ''; }

  function loadRemote(cb){
    var url=getUrl(); var key=getKey();
    if(!url || !key){ if(cb) cb(null); return; }
    fetch(url+'?id=eq.asil_settings&select=data,updated_at&limit=1&v='+Date.now(),{
      cache:'no-store',
      headers:{'apikey':key,'Accept':'application/json'}
    }).then(function(r){
      if(!r.ok) throw new Error('Supabase GET '+r.status);
      return r.json();
    }).then(function(rows){
      var row=Array.isArray(rows)&&rows.length?rows[0]:null;
      if(cb) cb(row&&row.data?row.data:null);
    }).catch(function(e){
      console.warn('[Supabase sync] load failed',e);
      if(cb) cb(null);
    });
  }

  function saveRemote(data,cb){
    var url=getUrl(); var key=getKey();
    if(!url || !key){ if(cb) cb(false); return; }
    var payload;
    try{ payload=JSON.parse(JSON.stringify(data||{})); }catch(e){ payload={}; }
    delete payload.logoData;
    payload.appId='asil-kuyumculuk-v2';
    var row={id:'asil_settings',data:payload,updated_at:new Date().toISOString()};
    fetch(url+'?on_conflict=id',{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':key,'Prefer':'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(row)
    }).then(function(r){
      if(!r.ok) throw new Error('Supabase POST '+r.status);
      if(cb) cb(true);
    }).catch(function(e){
      console.warn('[Supabase sync] save failed',e);
      if(cb) cb(false);
    });
  }

  function apply(data){
    if(!data || data.appId!=='asil-kuyumculuk-v2') return;
    try{
      if(typeof applyRemoteSettings==='function') applyRemoteSettings(data,false);
      else if(typeof window.settings!=='undefined'){
        window.settings=data;
        localStorage.setItem('asil_settings_v2',JSON.stringify(data));
        if(typeof renderTable==='function') renderTable();
      }
    }catch(e){ console.warn('[Supabase sync] apply failed',e); }
  }

  function install(){
    if(typeof window.jsonbinLoad==='function') window.jsonbinLoad=loadRemote;
    else window.jsonbinLoad=loadRemote;
    window.jsonbinSave=saveRemote;

    if(window.__supabaseSettingsPoll) clearInterval(window.__supabaseSettingsPoll);
    var last='';
    function poll(){
      loadRemote(function(data){
        if(!data) return;
        try{
          var text=JSON.stringify(data);
          if(text===last) return;
          last=text;
        }catch(e){}
        apply(data);
      });
    }
    poll();
    window.__supabaseSettingsPoll=setInterval(poll,2000);
    window.addEventListener('focus',poll);
    document.addEventListener('visibilitychange',function(){if(!document.hidden) poll();});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
