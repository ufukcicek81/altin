/* Asil Kuyumculuk - direct cloud-to-screen sync */
(function(){
  'use strict';
  var last='';
  var busy=false;
  function pull(){
    if(busy || typeof window.jsonbinLoad!=='function') return;
    if(typeof window.isAdminEditing==='function' && window.isAdminEditing()) return;
    busy=true;
    try{
      window.jsonbinLoad(function(data){
        busy=false;
        if(!data) return;
        var text;
        try{text=JSON.stringify(data);}catch(e){return;}
        if(text===last) return;
        last=text;
        try{window.settings=data;}catch(e){return;}
        try{localStorage.setItem('asil_settings_v2',text);}catch(e){}
        try{if(typeof window.applyShopLogo==='function')window.applyShopLogo();}catch(e){}
        try{if(typeof window.applyTheme==='function')window.applyTheme();}catch(e){}
        try{if(typeof window.renderTable==='function')window.renderTable();}catch(e){console.error('[Asil remote render]',e);}
        try{if(typeof window.renderDesktopPanel==='function')window.renderDesktopPanel();}catch(e){}
      });
    }catch(e){busy=false;console.error('[Asil cloud sync]',e);}
  }
  function start(){
    pull();
    setInterval(pull,1500);
    window.addEventListener('focus',pull);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)pull();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(start,500);});
  else setTimeout(start,500);
})();
