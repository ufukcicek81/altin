/* Asil Kuyumculuk local customer display + portfolio aggregation patch v3 */
(function(){
  'use strict';
  var DISPLAY_KEYS={doviz:'asil_customer_show_doviz_local',hurda:'asil_customer_show_hurda_local'};
  var PORTFOLIO_KEY='asil_portfolio_v1';
  var ASSET_KEY_RE=/(varlik|varlık|asset|portfolio|holding)/i;
  var GOLD_KEY_RE=/(ayar|altın|altin|gram|çeyrek|ceyrek|yarım|yarim|tam|ata|reşat|resat|cumhuriyet|ziynet)/i;
  var installed=false;
  function text(el){return String(el&&el.textContent||'').replace(/\s+/g,' ').trim();}
  function has(t,needle){return t.toLocaleLowerCase('tr-TR').indexOf(needle.toLocaleLowerCase('tr-TR'))!==-1;}
  function closest(el,selectors){while(el&&el!==document.body){for(var i=0;i<selectors.length;i++){try{if(el.matches&&el.matches(selectors[i]))return el;}catch(e){}}el=el.parentElement;}return null;}
  function findToggle(kind){var labelNeedle=kind==='doviz'?'Döviz Kurlarını Göster':'Hurda Altını Göster';var inputs=[].slice.call(document.querySelectorAll('input[type="checkbox"]'));for(var i=0;i<inputs.length;i++){var p=inputs[i].parentElement;for(var depth=0;p&&depth<5;depth++,p=p.parentElement){var tx=text(p);if(has(tx,labelNeedle)&&has(tx,'müşteri'))return inputs[i];}}for(var j=0;j<inputs.length;j++){var p2=inputs[j].parentElement;for(var d=0;p2&&d<4;d++,p2=p2.parentElement){if(has(text(p2),labelNeedle))return inputs[j];}}return null;}
  function loadDisplayPrefs(){var out={};try{out.doviz=localStorage.getItem(DISPLAY_KEYS.doviz);out.hurda=localStorage.getItem(DISPLAY_KEYS.hurda);}catch(e){}return out;}
  function saveDisplayPref(kind,val){try{localStorage.setItem(DISPLAY_KEYS[kind],val?'1':'0');}catch(e){}}
  function installToggleHandlers(){['doviz','hurda'].forEach(function(kind){var cb=findToggle(kind);if(!cb||cb.__asilLocalBound)return;cb.__asilLocalBound=true;var stored=null;try{stored=localStorage.getItem(DISPLAY_KEYS[kind]);}catch(e){}if(stored!==null)cb.checked=stored==='1';cb.addEventListener('change',function(){saveDisplayPref(kind,cb.checked);setTimeout(applyCustomerPanels,0);},true);});}
  function headingPanel(needle){var all=[].slice.call(document.querySelectorAll('body *'));for(var i=0;i<all.length;i++){var el=all[i],tx=text(el);if(!tx||tx.length>80||!has(tx,needle))continue;if(el.children&&el.children.length>8)continue;var p=closest(el,['.extra-panel','.ekstra-panel','.panel','.card','.price-panel','section','aside']);if(p)return p;if(el.parentElement)return el.parentElement;}return null;}
  function setPanelVisible(panel,visible){if(!panel)return;panel.style.display=visible?'':'none';panel.setAttribute('data-asil-local-visible',visible?'1':'0');}
  function applyCustomerPanels(){var path=location.pathname||'';var isTv=/\btv\.html$/i.test(path)||/[?&]tv=1(?:&|$)/.test(location.search);if(isTv)return;var prefs=loadDisplayPrefs();if(prefs.doviz!==null){var p1=headingPanel('Döviz Kurları');if(p1)setPanelVisible(p1,prefs.doviz==='1');}if(prefs.hurda!==null){var p2=headingPanel('Hurda Altın');if(p2)setPanelVisible(p2,prefs.hurda==='1');}}
  function closeOpenPanels(){var overlays=document.querySelectorAll('.overlay.open,.admin-overlay.open,[role="dialog"].open');for(var i=0;i<overlays.length;i++){overlays[i].classList.remove('open');overlays[i].style.display='none';}var panels=document.querySelectorAll('.admin-panel.open');for(var j=0;j<panels.length;j++)panels[j].classList.remove('open');}
  function installCloseFix(){document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('.close-btn,[data-close],button'):null;if(!t)return;var tx=text(t);if(tx==='×'||tx==='✕'||tx==='X'||has(tx,'kapat'))setTimeout(closeOpenPanels,0);},true);}
  function num(v){if(typeof v==='number'&&isFinite(v))return v;if(v==null)return NaN;var s=String(v).trim().replace(/₺/g,'').replace(/\s/g,'');if(s.indexOf(',')>=0&&s.indexOf('.')>=0)s=s.replace(/\./g,'').replace(',','.');else if(s.indexOf(',')>=0)s=s.replace(',','.');var n=Number(s.replace(/[^0-9.\-]/g,''));return isFinite(n)?n:NaN;}
  function pick(o,names){for(var i=0;i<names.length;i++)if(o&&o[names[i]]!=null)return o[names[i]];return undefined;}
  function setFirst(o,names,val){for(var i=0;i<names.length;i++)if(Object.prototype.hasOwnProperty.call(o,names[i])){o[names[i]]=val;return names[i];}return null;}
  function identity(o){var raw=pick(o,['assetKey','symbol','type','assetType','urun','ürün','urunAdi','ürünAdi','name','ad','title','label','birim','karat','ayar']);var s=String(raw==null?'':raw).toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim();var ayar=String(pick(o,['karat','ayar','purity','milyem'])||'').toLocaleLowerCase('tr-TR');return s+'|'+ayar;}
  function normalizeGenericArray(arr){if(!Array.isArray(arr)||arr.length<2)return arr;var groups={};arr.forEach(function(o,idx){if(!o||typeof o!=='object')return;var label=String(pick(o,['assetKey','symbol','type','assetType','urun','ürün','urunAdi','ürünAdi','name','ad','title','label','birim','karat','ayar'])||'');if(!GOLD_KEY_RE.test(label)&&!GOLD_KEY_RE.test(JSON.stringify(o).slice(0,500)))return;var qty=pick(o,['quantity','qty','miktar','adet','gram','amount','units','count']);var cost=pick(o,['unitCost','costPerUnit','averageCost','maliyetBirim','birimMaliyet','maliyet','cost','alisFiyati','alışFiyatı','fiyat','price']);qty=num(qty);cost=num(cost);if(!(qty>0)||!(cost>=0))return;var key=identity(o);if(!groups[key])groups[key]={items:[],qty:0,total:0};groups[key].items.push({o:o,idx:idx,qty:qty,cost:cost});groups[key].qty+=qty;groups[key].total+=qty*cost;});Object.keys(groups).forEach(function(k){var g=groups[k];if(g.items.length<2)return;var first=g.items[0].o;var avg=g.total/g.qty;setFirst(first,['quantity','qty','miktar','adet','gram','amount','units','count'],g.qty);setFirst(first,['unitCost','costPerUnit','averageCost','maliyetBirim','birimMaliyet','maliyet','cost','alisFiyati','alışFiyatı','fiyat','price'],avg);setFirst(first,['totalCost','toplamMaliyet','toplam','total'],g.total);for(var i=g.items.length-1;i>0;i--)arr.splice(g.items[i].idx,1);});return arr;}

  /* Portfolio UI stores `cost` as TOTAL cost of the purchase, not unit cost. */
  function normalizePortfolio(arr){
    if(!Array.isArray(arr)||arr.length<2)return arr;
    var groups=Object.create(null),order=[];
    arr.forEach(function(o){
      if(!o||!o.type)return;
      var key=String(o.type);
      if(!groups[key]){groups[key]={id:o.id||('pf_'+Date.now()+'_'+order.length),type:key,qty:0,cost:0,note:o.note||''};order.push(key);}
      groups[key].qty+=Number(o.qty||0);
      groups[key].cost+=Number(o.cost||0);
      if(o.note)groups[key].note=String(o.note);
    });
    return order.map(function(key){return groups[key];});
  }

  function normalizeStorageValue(key,value){
    try{
      var parsed=JSON.parse(value);
      if(String(key)===PORTFOLIO_KEY && Array.isArray(parsed)){
        var normalized=normalizePortfolio(parsed);
        return JSON.stringify(normalized);
      }
      if(!ASSET_KEY_RE.test(key))return value;
      var before=JSON.stringify(parsed);
      if(Array.isArray(parsed))normalizeGenericArray(parsed);
      else if(parsed&&typeof parsed==='object')Object.keys(parsed).forEach(function(k){if(Array.isArray(parsed[k]))normalizeGenericArray(parsed[k]);});
      return before!==JSON.stringify(parsed)?JSON.stringify(parsed):value;
    }catch(e){return value;}
  }

  function installStorageNormalizer(){
    var nativeSet=Storage.prototype.setItem;
    if(nativeSet.__asilPortfolioWrapped)return;
    var wrapped=function(key,value){try{if(this===localStorage)value=normalizeStorageValue(String(key),String(value));}catch(e){}return nativeSet.call(this,key,value);};
    wrapped.__asilPortfolioWrapped=true;
    Storage.prototype.setItem=wrapped;
    function scan(){try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k)continue;var v=localStorage.getItem(k),nv=normalizeStorageValue(k,v);if(nv!==v)nativeSet.call(localStorage,k,nv);}}catch(e){}}
    scan();
    setInterval(scan,2000);
  }

  function init(){
    if(installed)return;
    installed=true;
    installStorageNormalizer();
    installToggleHandlers();
    installCloseFix();
    applyCustomerPanels();
    var mo=new MutationObserver(function(){installToggleHandlers();applyCustomerPanels();});
    mo.observe(document.documentElement,{subtree:true,childList:true});
    window.addEventListener('storage',function(e){if(e.key===DISPLAY_KEYS.doviz||e.key===DISPLAY_KEYS.hurda)applyCustomerPanels();});
    window.aggregateVarliklar=function(){try{var v=localStorage.getItem(PORTFOLIO_KEY),nv=normalizeStorageValue(PORTFOLIO_KEY,v);if(nv!==v)localStorage.setItem(PORTFOLIO_KEY,nv);if(typeof window.renderPortfolio==='function')window.renderPortfolio();}catch(e){}};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
