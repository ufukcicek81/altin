/* Asil Kuyumculuk - Supabase cross-device sync fix v4 */
(function(){
  'use strict';
  var SUPABASE_URL='https://isrcaoulynycmwnxofgn.supabase.co';
  var SUPABASE_KEY='sb_publishable_2lHpVrZEgHmPjWD8kOEuLA_Fz6gzZEe';
  var TABLE=SUPABASE_URL+'/rest/v1/app_settings';
  var APP_ID='asil-kuyumculuk-v2';
  var LOCAL_KEY='asil_settings_v2';
  var POLL_MS=2000;

  window.SUPABASE_URL=window.SUPABASE_URL||SUPABASE_URL;
  window.SUPABASE_KEY=window.SUPABASE_KEY||SUPABASE_KEY;
  window.SUPABASE_SETTINGS_URL=window.SUPABASE_SETTINGS_URL||TABLE;

  function headers(extra){
    var h={'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Accept':'application/json'};
    if(extra) Object.keys(extra).forEach(function(k){h[k]=extra[k];});
    return h;
  }

  function loadRemote(cb){
    var url=TABLE+'?id=eq.asil_settings&select=data,updated_at&limit=1&_sync='+Date.now();
    fetch(url,{method:'GET',cache:'no-store',headers:headers()})
      .then(function(r){if(!r.ok)throw new Error('Supabase GET '+r.status);return r.json();})
      .then(function(rows){
        var row=Array.isArray(rows)&&rows.length?rows[0]:null;
        if(cb)cb(row&&row.data?row.data:null,row&&row.updated_at?row.updated_at:null);
      })
      .catch(function(e){console.warn('[Supabase sync] load failed:',e);if(cb)cb(null,null,e);});
  }

  function saveRemote(data,cb){
    var payload;
    try{payload=JSON.parse(JSON.stringify(data||{}));}catch(e){payload={};}
    delete payload.logoData;
    payload.appId=APP_ID;
    var row={id:'asil_settings',data:payload,updated_at:new Date().toISOString()};
    fetch(TABLE+'?on_conflict=id',{
      method:'POST',cache:'no-store',
      headers:headers({'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'}),
      body:JSON.stringify(row)
    }).then(function(r){
      if(!r.ok)return r.text().then(function(t){throw new Error('Supabase POST '+r.status+' '+t);});
      if(cb)cb(true);
    }).catch(function(e){console.warn('[Supabase sync] save failed:',e);if(cb)cb(false);});
  }

  function readLocal(){try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');}catch(e){return null;}}
  function sameSettings(a,b){try{return JSON.stringify(a||null)===JSON.stringify(b||null);}catch(e){return false;}}
  function isEditing(){try{return typeof window.isAdminEditing==='function'&&!!window.isAdminEditing();}catch(e){return false;}}

  /* Eski sürüm localStorage yazıp reload yapıyordu. PWA cache yüzünden PC eski ekranı tekrar açabiliyordu. */
  function applyRemote(data,updatedAt){
    if(!data||data.appId!==APP_ID||isEditing())return;
    if(sameSettings(readLocal(),data))return;
    try{
      localStorage.setItem(LOCAL_KEY,JSON.stringify(data));
      if(typeof window.settings!=='undefined')window.settings=data;
      if(data.adminPass&&typeof window.ADMIN_PASS!=='undefined')window.ADMIN_PASS=data.adminPass;
      if(data.aktifMod&&typeof window.aktifMod!=='undefined'){
        window.aktifMod=data.aktifMod;
        try{localStorage.setItem('asil_mod_v1',data.aktifMod);}catch(e){}
      }
      if(typeof window.applyShopLogo==='function')window.applyShopLogo();
      if(typeof window.applyTheme==='function')window.applyTheme();
      if(typeof window.updateModBtn==='function')window.updateModBtn();
      var rows=document.getElementById('priceRows');if(rows)rows.innerHTML='';
      if(typeof window.renderTable==='function')window.renderTable();
      if(typeof window.renderDesktopPanel==='function')window.renderDesktopPanel();
      if(typeof window.renderEkstraDoviz==='function')window.renderEkstraDoviz();
      if(typeof window.renderEkstraHurda==='function')window.renderEkstraHurda();
      if(typeof window.refreshAdminDataViews==='function')window.refreshAdminDataViews();
      if(typeof window.updateCustomerLink==='function')window.updateCustomerLink();
      console.log('[Supabase sync] remote settings applied',updatedAt||'');
    }catch(e){console.warn('[Supabase sync] apply failed:',e);}
  }

  function install(){
    window.jsonbinLoad=loadRemote;
    window.jsonbinSave=saveRemote;
    if(window.__supabaseSettingsPoll)clearInterval(window.__supabaseSettingsPoll);
    var lastRemote='';
    function poll(){
      loadRemote(function(data,updatedAt){
        if(!data)return;
        try{var marker=(updatedAt||'')+'|'+JSON.stringify(data);if(marker===lastRemote)return;lastRemote=marker;}catch(e){}
        applyRemote(data,updatedAt);
      });
    }
    poll();
    window.__supabaseSettingsPoll=setInterval(poll,POLL_MS);
    window.addEventListener('focus',poll);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)poll();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
