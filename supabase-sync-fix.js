/* Asil Kuyumculuk - Supabase cross-device sync fix v12 */
(function(){
  'use strict';
  var SUPABASE_URL='https://isrcaoulynycmwnxofgn.supabase.co';
  var SUPABASE_KEY='sb_publishable_2lHpVrZEgHmPjWD8kOEuLA_Fz6gzZEe';
  var TABLE=SUPABASE_URL+'/rest/v1/app_settings';
  var APP_ID='asil-kuyumculuk-v2';
  var LOCAL_KEY='asil_settings_v2';
  /* 2-second polling was unnecessarily expensive on the Free plan. 10 seconds
     is still fast enough for cross-device settings while greatly reducing
     Supabase egress. Explicit saves remain immediate. */
  var POLL_MS=10000;
  var saveInProgress=false;
  var lastLocalSaveAt=0;
  var adminDirty=false;
  var lastSavedPayload='';

  window.SUPABASE_URL=SUPABASE_URL;
  window.SUPABASE_KEY=SUPABASE_KEY;
  window.SUPABASE_SETTINGS_URL=TABLE;

  /* Safety net: some older app code appends ?v=95 to the Supabase REST URL.
     PostgREST treats unknown query parameters as filters and returns PGRST100.
     Strip only the cache-busting v parameter from app_settings requests. */
  var originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){
    try{
      var rawUrl=typeof input==='string' ? input : (input&&input.url)||'';
      var u=new URL(rawUrl,location.href);
      if(u.origin===new URL(SUPABASE_URL).origin && u.pathname==='/rest/v1/app_settings' && u.searchParams.has('v')){
        u.searchParams.delete('v');
        if(typeof input==='string')input=u.href;
        else if(input instanceof Request)input=new Request(u.href,input);
        else input=u.href;
      }
    }catch(e){}
    return originalFetch(input,init);
  };

  function headers(extra){
    var h={
      'apikey':SUPABASE_KEY,
      'Authorization':'Bearer '+SUPABASE_KEY,
      'Accept':'application/json',
      'Cache-Control':'no-cache',
      'Pragma':'no-cache'
    };
    if(extra)Object.keys(extra).forEach(function(k){h[k]=extra[k];});
    return h;
  }

  function markAdminDirty(e){
    try{
      var t=e&&e.target;
      if(!t)return;
      var panel=t.closest&&t.closest('.admin-panel');
      if(panel)adminDirty=true;
    }catch(err){}
  }

  function isAdminInputActive(){
    try{
      var a=document.activeElement;
      if(!a)return false;
      var tag=String(a.tagName||'').toLowerCase();
      if(tag!=='input'&&tag!=='textarea'&&tag!=='select'&&a.isContentEditable!==true)return false;
      return !!(a.closest&&a.closest('.admin-panel'));
    }catch(e){return false;}
  }

  function loadRemote(cb){
    var url=TABLE+'?id=eq.asil_settings&select=data,updated_at&limit=1';
    fetch(url,{method:'GET',cache:'no-store',headers:headers()})
      .then(function(r){
        if(!r.ok)return r.text().then(function(t){throw new Error('Supabase GET '+r.status+' '+t);});
        return r.json();
      })
      .then(function(rows){
        var row=Array.isArray(rows)&&rows.length?rows[0]:null;
        if(cb)cb(row&&row.data?row.data:null,row&&row.updated_at?row.updated_at:null);
      })
      .catch(function(e){
        console.warn('[Supabase sync] load failed:',e);
        window.__lastSupabaseLoadError=String(e&&e.message||e);
        if(cb)cb(null,null,e);
      });
  }

  function saveRemote(data,cb){
    var payload;
    try{payload=JSON.parse(JSON.stringify(data||{}));}catch(e){payload={};}
    delete payload.logoData;
    payload.appId=APP_ID;

    /* Do not issue a database write when the exact same settings payload was
       already saved in this page session. */
    var payloadKey='';
    try{payloadKey=JSON.stringify(payload);}catch(e){}
    if(payloadKey && payloadKey===lastSavedPayload){
      adminDirty=false;
      if(cb)cb(true,null,null);
      return;
    }

    var row={id:'asil_settings',data:payload,updated_at:new Date().toISOString()};
    saveInProgress=true;
    lastLocalSaveAt=Date.now();

    fetch(TABLE+'?id=eq.asil_settings',{
      method:'PATCH',
      cache:'no-store',
      headers:headers({'Content-Type':'application/json','Prefer':'return=minimal'}),
      body:JSON.stringify({data:row.data,updated_at:row.updated_at})
    })
    .then(function(r){
      if(!r.ok)return r.text().then(function(t){throw new Error('Supabase PATCH '+r.status+' '+t);});
      return r;
    })
    .then(function(){
      saveInProgress=false;
      lastSavedPayload=payloadKey;
      adminDirty=false;
      console.log('[Supabase sync] SAVE OK',row.updated_at);
      window.__lastSupabaseSaveError='';
      if(cb)cb(true,null,row.updated_at);
    })
    .catch(function(e){
      saveInProgress=false;
      console.error('[Supabase sync] SAVE FAILED:',e);
      window.__lastSupabaseSaveError=String(e&&e.message||e);
      if(cb)cb(false,e);
    });
  }

  function isEditing(){
    try{
      return adminDirty || isAdminInputActive() ||
        (typeof window.isAdminEditing==='function'&&!!window.isAdminEditing());
    }catch(e){return adminDirty||isAdminInputActive();}
  }

  function applyRemote(data,updatedAt){
    if(!data||data.appId!==APP_ID||isEditing())return;
    if(saveInProgress || (Date.now()-lastLocalSaveAt)<4000)return;
    try{
      localStorage.setItem(LOCAL_KEY,JSON.stringify(data));
      window.settings=data;
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
    document.addEventListener('input',markAdminDirty,true);
    document.addEventListener('change',markAdminDirty,true);

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
