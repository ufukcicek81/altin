/* Asil Kuyumculuk - Supabase cross-device sync fix v2
   Uses the current Supabase publishable key through the apikey header.
*/
(function(){
  'use strict';

  var SUPABASE_URL = 'https://isrcaoulynycmwnxofgn.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_2lHpVrZEgHmPjWD8kOEuLA_Fz6gzZEe';
  var TABLE = SUPABASE_URL + '/rest/v1/app_settings';

  window.SUPABASE_URL = window.SUPABASE_URL || SUPABASE_URL;
  window.SUPABASE_KEY = window.SUPABASE_KEY || SUPABASE_KEY;
  window.SUPABASE_SETTINGS_URL = window.SUPABASE_SETTINGS_URL || TABLE;

  function headers(extra){
    var h={
      'apikey':SUPABASE_KEY,
      'Accept':'application/json'
    };
    if(extra) Object.keys(extra).forEach(function(k){h[k]=extra[k];});
    return h;
  }

  function loadRemote(cb){
    var url=TABLE+'?id=eq.asil_settings&select=data,updated_at&limit=1&_ts='+Date.now();
    fetch(url,{method:'GET',cache:'no-store',headers:headers()})
      .then(function(r){
        if(!r.ok) throw new Error('Supabase GET '+r.status);
        return r.json();
      })
      .then(function(rows){
        var row=Array.isArray(rows)&&rows.length?rows[0]:null;
        if(cb) cb(row&&row.data?row.data:null,row&&row.updated_at?row.updated_at:null);
      })
      .catch(function(e){
        console.warn('[Supabase sync] load failed:',e);
        if(cb) cb(null,null,e);
      });
  }

  function saveRemote(data,cb){
    var payload;
    try{ payload=JSON.parse(JSON.stringify(data||{})); }catch(e){ payload={}; }
    delete payload.logoData;
    payload.appId='asil-kuyumculuk-v2';

    var row={
      id:'asil_settings',
      data:payload,
      updated_at:new Date().toISOString()
    };

    fetch(TABLE+'?on_conflict=id',{
      method:'POST',
      cache:'no-store',
      headers:headers({
        'Content-Type':'application/json',
        'Prefer':'resolution=merge-duplicates,return=minimal'
      }),
      body:JSON.stringify(row)
    })
    .then(function(r){
      if(!r.ok) return r.text().then(function(t){throw new Error('Supabase POST '+r.status+' '+t);});
      if(cb) cb(true);
    })
    .catch(function(e){
      console.warn('[Supabase sync] save failed:',e);
      if(cb) cb(false);
    });
  }

  function apply(data){
    if(!data || data.appId!=='asil-kuyumculuk-v2') return;
    try{
      if(typeof window.applyRemoteSettings==='function'){
        window.applyRemoteSettings(data,false);
        return;
      }
      if(typeof window.settings!=='undefined'){
        window.settings=data;
        localStorage.setItem('asil_settings_v2',JSON.stringify(data));
        if(typeof window.renderTable==='function') window.renderTable();
      }
    }catch(e){ console.warn('[Supabase sync] apply failed:',e); }
  }

  function install(){
    window.jsonbinLoad=loadRemote;
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
