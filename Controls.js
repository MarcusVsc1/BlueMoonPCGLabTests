'use strict';
// BM_CONTROLS_V1 / BM_CONTROLS_V2 — perfil de entrada compartilhado entre jogo, mapa e menus.
const BMControls=(()=>{
 const storage='bm.controls.v1';
 const defaults={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',sword:'KeyK',fire:'KeyJ',previous:'KeyT',next:'KeyY',map:'KeyM',resetSokoban:'KeyP',confirm:'Enter',pause:'Escape'};
 const fixed={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'confirm',Space:'confirm',Escape:'pause'};
 const standard={sword:0,fire:1,previous:4,next:5,map:3,resetSokoban:7,confirm:0,pause:9};
 const raw={...standard,sword:2,map:0,confirm:2};
 const labels={up:'Cima',down:'Baixo',left:'Esquerda',right:'Direita',sword:'Espada / confirmar' ,fire:'Magia / voltar',previous:'Item anterior / zoom −',next:'Próximo item / zoom +',map:'Abrir / fechar mapa',resetSokoban:'Restaurar selos / mapa',confirm:'Confirmar / centralizar',pause:'Pausar / voltar'};
 const keyNames=Object.keys(defaults),padNames=Object.keys(standard).filter(a=>a!=='confirm');
 const allowedKey=k=>typeof k==='string'&&(/^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Enter|Space|Escape|Arrow(?:Up|Down|Left|Right))$/.test(k))&&k!=='KeyN';
 const rawPS=g=>g?.mapping!=='standard'&&/2563.*0575|PS3\/PC Gamepad/i.test(String(g?.id||''));
 const id=g=>String(g?.mapping||'raw')+':'+String(g?.id||'');
 let prefs={keys:{...defaults},pads:{},deadzone:35},storageOK=true;
 function validKeys(k){return keyNames.every(a=>allowedKey(k[a])&&(!fixed[k[a]]||fixed[k[a]]===a))&&new Set(keyNames.map(a=>k[a])).size===keyNames.length;}
 function validPad(p){const values=padNames.map(a=>a==='sword'?p.confirm??p.sword:p[a]);return values.every(i=>Number.isInteger(i)&&i>=0&&i<32&&![12,13,14,15].includes(i))&&new Set(values).size===values.length;}
 try{const p=JSON.parse(localStorage.getItem(storage)||'null');if(p&&typeof p==='object'){
   if(p.keys&&validKeys(p.keys))prefs.keys=Object.fromEntries(keyNames.map(a=>[a,p.keys[a]]));
   if(p.pads&&typeof p.pads==='object')for(const [k,v] of Object.entries(p.pads))if(v&&validPad(v))Object.defineProperty(prefs.pads,k,{value:Object.fromEntries(padNames.map(a=>[a,a==='sword'?v.confirm??v.sword:v[a]])),writable:true,enumerable:true,configurable:true});
   if(Number.isFinite(p.deadzone))prefs.deadzone=Math.max(10,Math.min(70,Math.round(p.deadzone/5)*5));
 }}catch(_){storageOK=false;}
 function save(){try{localStorage.setItem(storage,JSON.stringify(prefs));storageOK=true;}catch(_){storageOK=false;}}
 function pads(){try{return Array.from(navigator.getGamepads?.()||[]).filter(g=>g&&g.connected!==false);}catch(_){return [];}}
 function preferred(list=pads(),index=0){return list.find(g=>g.index===index)||list[0];}
 function button(g,i){const b=g?.buttons?.[i];return !!b&&(!!b.pressed||b.value>=.5);}
 function profile(g){const base={...(rawPS(g)?raw:standard)}, saved=Object.hasOwn(prefs.pads,id(g))?prefs.pads[id(g)]:null;
   if(saved&&padNames.every(a=>saved[a]<(g?.buttons?.length??0)))return {...saved,confirm:saved.sword,back:saved.fire,center:saved.sword,reset:saved.resetSokoban,start:saved.pause};
   // Migra o ajuste de confirmacao anterior, trocando a acao que ocupava o botao.
   if(g&&!saved)try{const n=JSON.parse(localStorage.getItem('bm.gameover.pad:'+String(g.id||''))||'null')?.confirm;if(Number.isInteger(n)&&n>=0&&n<Math.min(32,g.buttons.length)&&![12,13,14,15,base.fire].includes(n)){const other=padNames.find(a=>base[a]===n);if(other)base[other]=base.sword;base.sword=n;}}catch(_){}
   return {...base,confirm:base.sword,back:base.fire,center:base.sword,reset:base.resetSokoban,start:base.pause};
 }
 function keyAction(code){return fixed[code]||keyNames.find(a=>prefs.keys[a]===code);}
 function menuKey(code){const a=keyAction(code);return a==='fire'||a==='pause'?'back':a==='sword'?'confirm':a;}
 function keyLabel(code){return ({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Escape:'Esc',Space:'Espaço',Enter:'Enter'})[code]||String(code).replace(/^Key|^Digit/,'').replace(/^Numpad/,'Num ');}
 function key(a){return prefs.keys[a];}
 function bindKey(a,code){if(!keyNames.includes(a)||!allowedKey(code)||fixed[code]&&fixed[code]!==a)return 'Tecla reservada ou não suportada.';const other=keyNames.find(k=>prefs.keys[k]===code&&k!==a);if(other)return 'Já usada: '+labels[other]+'.';prefs.keys[a]=code;save();return '';}
 function bindPad(g,a,i){if(a==='confirm')a='sword';if(!g||!padNames.includes(a)||!Number.isInteger(i)||i<0||i>=Math.min(32,g.buttons.length)||[12,13,14,15].includes(i))return 'Botão reservado para o direcional ou inválido.';const p=profile(g);const other=padNames.find(k=>p[k]===i&&k!==a);if(other)p[other]=p[a];p[a]=i;const next=Object.fromEntries(padNames.map(k=>[k,p[k]]));if(!validPad(next))return 'Mapeamento inválido.';Object.defineProperty(prefs.pads,id(g),{value:next,writable:true,enumerable:true,configurable:true});save();return '';}
 function resetKeys(){prefs.keys={...defaults};save();}
 function resetPad(g){if(g){const p=rawPS(g)?raw:standard;Object.defineProperty(prefs.pads,id(g),{value:Object.fromEntries(padNames.map(a=>[a,p[a]])),writable:true,enumerable:true,configurable:true});save();}}
 function deadzone(){return prefs.deadzone/100;}
 function setDeadzone(n){prefs.deadzone=Math.max(10,Math.min(70,Math.round(n/5)*5));save();}
 function direction(g){const axis=i=>{const n=Number(g?.axes?.[i]);return Number.isFinite(n)&&Math.abs(n)>=deadzone()?Math.max(-1,Math.min(1,n)):0;};let x=axis(0),y=axis(1),l=false,r=false,u=false,d=false;
 if(rawPS(g)){const hat=g.axes?.[9];if(Number.isFinite(hat)&&hat>=-1.01&&hat<=1.01){const i=Math.round((hat+1)*3.5);if(Math.abs(hat-(-1+2*i/7))<.08){u=[0,1,7].includes(i);r=[1,2,3].includes(i);d=[3,4,5].includes(i);l=[5,6,7].includes(i);}}}
 else{u=button(g,12);d=button(g,13);l=button(g,14);r=button(g,15);}
 if(l||r)x=Number(r)-Number(l);if(u||d)y=Number(d)-Number(u);const len=Math.hypot(x,y);return len>1?{x:x/len,y:y/len}:{x,y};}
 function pressed(g,a){return button(g,profile(g)[a]);}
 function menuPad(g){const s=new Set(),d=direction(g);if(d.x<0)s.add('left');if(d.x>0)s.add('right');if(d.y<0)s.add('up');if(d.y>0)s.add('down');if(pressed(g,'confirm'))s.add('confirm');if(pressed(g,'fire'))s.add('back');if(pressed(g,'pause'))s.add('start');return s;}
 function held(g){const d=direction(g);return !!g&&(Array.from(g.buttons||[]).some((_,i)=>button(g,i))||!!(d.x||d.y));}
 function padLabel(g,a){const i=profile(g)[a],names=rawPS(g)?{0:'Triângulo',1:'Círculo',2:'X',3:'Quadrado',4:'L1',5:'R1',7:'R2',9:'Start'}:{0:'A / X',1:'B / Círculo',2:'X / Quadrado',3:'Y / Triângulo',4:'LB / L1',5:'RB / R1',7:'RT / R2',9:'Start'};return names[i]||'Botão '+i;}
 function combo(a,g=preferred()){return keyLabel(key(a))+' / '+padLabel(g,a);}
 function validEvent(e){return !e.ctrlKey&&!e.altKey&&!e.metaKey&&!e.isComposing&&!e.target?.isContentEditable&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'');}
 const legacy={espada:'sword',fireball:'fire',resetSokoban:'resetSokoban',itemAnterior:'previous',itemProximo:'next',mapa:'map',cima:'up',baixo:'down',esquerda:'left',direita:'right'};
 const legacyKeys={sword:'espada',fire:'fireball',resetSokoban:'resetSokoban',up:'w',down:'s',left:'a',right:'d'};
 return {keyNames,padNames,labels,key,keyAction,menuKey,keyLabel,bindKey,bindPad,resetKeys,resetPad,deadzone,setDeadzone,pads,preferred,button,profile,pressed,direction,menuPad,held,padLabel,combo,validEvent,legacy,legacyKeys,id,storageOK:()=>storageOK};
})();
