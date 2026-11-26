'use strict';
// BM_SETTINGS_V1 — preferencias, sem dados de uma run.
const BMSettings=(()=>{
    const key='bm.settings.v1', defaults={bgm:100,sfx:100};
    const clamp=(v)=>Number.isFinite(v)?Math.max(0,Math.min(100,Math.round(v))):100;
    const unit=(v)=>Number.isFinite(v)?Math.max(0,Math.min(1,v)):1;
    let values={...defaults},storageOK=true;
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object')for(const k of Object.keys(defaults))if(typeof saved[k]==='number'&&Number.isFinite(saved[k]))values[k]=clamp(saved[k]);}catch(_){storageOK=false;}
    const musicBase=new WeakMap(),effectBase=new WeakMap();
    function persist(){try{localStorage.setItem(key,JSON.stringify(values));storageOK=true;}catch(_){storageOK=false;}}
    function get(k){return values[k];}
    function set(k,v){if(!Object.hasOwn(defaults,k))return false;const n=clamp(v);if(values[k]===n)return false;values[k]=n;persist();return true;}
    function reset(){values={...defaults};persist();}
    function nominal(audio){if(!audio)return 0;if(!musicBase.has(audio))musicBase.set(audio,unit(audio.volume));return musicBase.get(audio)*values.bgm/100;}
    function attach(audio){if(audio&&!musicBase.has(audio))audio.volume=nominal(audio);}
    function effect(audio,volume){if(!audio)return;effectBase.set(audio,unit(volume));audio.volume=effectBase.get(audio)*values.sfx/100;}
    function refreshEffects(assets){for(const ch of assets?.channels||[])if(effectBase.has(ch.audio))ch.audio.volume=effectBase.get(ch.audio)*values.sfx/100;for(const a of Object.values(assets?.audios||{}))if(effectBase.has(a))a.volume=effectBase.get(a)*values.sfx/100;}
    return {get,set,reset,nominal,attach,effect,refreshEffects,storageOK:()=>storageOK};
})();
