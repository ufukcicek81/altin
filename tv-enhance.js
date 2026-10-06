(function(){'use strict';
if(location.pathname.indexOf('/tv.html')===-1)return;
var URL='https://isrcaoulynycmwnxofgn.supabase.co';
var KEY='sb_publishable_2lHpVrZEgHmPjWD8kOEuLA_Fz6gzZEe';
var style=document.createElement('style');
style.textContent='\n'+
'.tv-enhance-motion .dot{animation:tvDotPulse 1.2s ease-in-out infinite}.tv-enhance-motion .status{box-shadow:0 0 0 1px rgba(255,255,255,.03),0 8px 28px rgba(20,40,60,.08)}'+
'.tv-enhance-motion .row,.tv-enhance-motion .side-row{animation:tvRowGlow 4s ease-in-out infinite}.tv-enhance-motion .row:nth-child(2),.tv-enhance-motion .side-row:nth-child(2){animation-delay:.35s}.tv-enhance-motion .row:nth-child(3),.tv-enhance-motion .side-row:nth-child(3){animation-delay:.7s}.tv-enhance-motion .row:nth-child(4),.tv-enhance-motion .side-row:nth-child(4){animation-delay:1.05s}.tv-enhance-motion .row:nth-child(5),.tv-enhance-motion .side-row:nth-child(5){animation-delay:1.4s}.tv-enhance-motion .row:nth-child(6),.tv-enhance-motion .side-row:nth-child(6){animation-delay:1.75s}.tv-enhance-motion .row:nth-child(7),.tv-enhance-motion .side-row:nth-child(7){animation-delay:2.1s}.tv-enhance-motion .row:nth-child(8),.tv-enhance-motion .side-row:nth-child(8){animation-delay:2.45s}.tv-enhance-motion .row:nth-child(9),.tv-enhance-motion .side-row:nth-child(9){animation-delay:2.8s}.tv-enhance-motion .row:nth-child(10),.tv-enhance-motion .side-row:nth-child(10){animation-delay:3.15s}'+
'@keyframes tvDotPulse{0%,100%{transform:scale(1);opacity:1;box-shadow:0 0 0 0 rgba(21,200,117,.35)}50%{transform:scale(1.18);opacity:.82;box-shadow:0 0 0 7px rgba(21,200,117,0)}}'+
'@keyframes tvRowGlow{0%,72%,100%{filter:none}80%{filter:brightness(1.035)}}'+
'.tv-enhance-motion .val{transition:transform .35s ease,text-shadow .35s ease}.tv-enhance-motion .val:hover{transform:scale(1.025)}'+
'.tv-enhance-normal .row,.tv-enhance-normal .side-row{animation:none!important}'+
'.tv-enhance-normal .dot{animation:none!important}'+
'@media(min-width:900px){.title{font-size:clamp(22px,1.8vw,30px)!important}.head{font-size:clamp(13px,1vw,17px)!important}.name{font-size:clamp(19px,1.6vw,29px)!important;line-height:1.08!important}.num{font-size:clamp(24px,2.15vw,38px)!important;line-height:1.02!important}.chg{font-size:clamp(10px,.9vw,15px)!important}.side-title{font-size:clamp(20px,1.55vw,27px)!important}.side-head{font-size:clamp(12px,.9vw,16px)!important}.side-name{font-size:clamp(17px,1.4vw,25px)!important}.side-num{font-size:clamp(21px,1.75vw,31px)!important}.live{font-size:clamp(21px,1.65vw,28px)!important}.sub,.lab{font-size:clamp(12px,.95vw,16px)!important}.val{font-size:clamp(30px,2.55vw,44px)!important}}'+
'@media(max-height:820px) and (min-width:900px){.title{font-size:clamp(19px,1.55vw,25px)!important}.head{font-size:clamp(11px,.82vw,14px)!important}.name{font-size:clamp(16px,1.3vw,23px)!important}.num{font-size:clamp(21px,1.75vw,31px)!important}.chg{font-size:clamp(8px,.7vw,12px)!important}.side-title{font-size:clamp(17px,1.3vw,22px)!important}.side-head{font-size:clamp(10px,.72vw,13px)!important}.side-name{font-size:clamp(14px,1.05vw,19px)!important}.side-num{font-size:clamp(17px,1.35vw,24px)!important}.live{font-size:clamp(18px,1.35vw,23px)!important}.val{font-size:clamp(25px,2vw,34px)!important}}\n';
document.head.appendChild(style);
document.documentElement.classList.add('tv-enhance-ready');
function applyMotion(s){
 var v=s&& (s.motionMode!==undefined?s.motionMode:(s.tvMotion!==undefined?s.tvMotion:(s.displayMode!==undefined?s.displayMode:s.tvMode)));
 var on=v===true||v==='hareketli'||v==='Hareketli'||v==='animated'||v==='animation'||v==='motion';
 var off=v===false||v==='normal'||v==='Normal'||v==='static';
 if(!on&&!off)return;
 document.body.classList.toggle('tv-enhance-motion',on);
 document.body.classList.toggle('tv-enhance-normal',!on);
}
function applyTheme(s){
 var mode=s&&(s.theme||s.mode||s.appearance);
 if(mode!=='dark'&&mode!=='light')return;
 localStorage.setItem('asil_theme_local',mode);
 document.body.classList.toggle('dark',mode==='dark');
}
async function row(id){
 var r=await fetch(URL+'/rest/v1/app_settings?id=eq.'+encodeURIComponent(id)+'&select=data,updated_at',{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'});
 if(!r.ok)throw new Error('settings '+r.status);
 var a=await r.json();return a&&a[0]&&a[0].data?a[0]:null;
}
async function sync(){
 try{
  var a=await row('asil_settings');
  if(a){applyTheme(a.data||{});applyMotion(a.data||{});}
 }catch(e){}
}
sync();setInterval(sync,3000);
})();