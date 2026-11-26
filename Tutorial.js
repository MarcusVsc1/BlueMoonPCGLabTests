/* BM_TUTORIAL_V1 — dicas opcionais; nenhuma alteracao de simulacao ou RNG. */
const BMTutorial=(()=>{
 const key='bm.tutorial.v1',duration=7,ids=['training','objective','collect','inventory','map','door','lever','switch','sokoban','spike','fire','lava','arena','boss'];
 let enabled=true,seen=new Set(),states=new WeakMap(),storageOK=true;
 try{const v=JSON.parse(localStorage.getItem(key)||'null');if(v){enabled=v.enabled!==false;seen=new Set(Array.isArray(v.seen)?v.seen.filter(x=>ids.includes(x)):[]);}}catch(_){storageOK=false;}
 function save(){try{localStorage.setItem(key,JSON.stringify({enabled,seen:[...seen]}));storageOK=true;}catch(_){storageOK=false;}}
 function setEnabled(v){enabled=!!v;states=new WeakMap();save();}
 function reset(){seen.clear();states=new WeakMap();enabled=true;save();}
 const label=a=>BMControls.combo(a),keyLabel=a=>BMControls.keyLabel(BMControls.key(a));
 function lobbyText(){return ['up','left','down','right'].map(keyLabel).join('/')+': Mover | '+keyLabel('sword')+': Espada | '+keyLabel('fire')+': Magia | '+keyLabel('resetSokoban')+': Reset | '+keyLabel('previous')+'/'+keyLabel('next')+': Item';}
 const tips={
 training:()=>['Área de treinamento','Mova-se com '+['up','left','down','right'].map(keyLabel).join('/')+' ou o direcional.','Teste espada ('+label('sword')+') e magia ('+label('fire')+').','Entre em um cristal para escolher o tamanho da masmorra.'],
 objective:()=>['Sua jornada','Explore a masmorra, resolva os desafios e encontre a Bruxa.','Derrote-a para salvar seu pai.'],
 collect:()=>['Coletar itens','Golpeie o item com a espada ('+label('sword')+') para coletá-lo.'],
 inventory:()=>['Inventário','Alterne o item selecionado com '+label('previous')+' ou '+label('next')+'.','Selecione a chave correspondente antes de golpear uma porta.'],
 map:()=>['Mapa adquirido','Abra ou feche o mapa com '+label('map')+'.','Use o direcional para navegar e os botões de troca de item para o zoom.'],
 door:()=>['Porta trancada','Selecione a chave correspondente e golpeie a porta com a espada.'],
 lever:()=>['Alavanca','Use a espada ('+label('sword')+') para acionar o mecanismo.','Observe o que muda no cenário.'],
 switch:()=>['Interruptores','Golpeie os interruptores com a espada para ativá-los.','Experimente combinações e observe a resposta do mecanismo.'],
 sokoban:()=>['Selos Rúnicos','Golpeie os blocos de pedra com a espada para alinhá-los aos selos.','Se ficar sem saída, use '+label('resetSokoban')+' para restaurar os blocos.'],
 spike:()=>['Espinhos','Observe o ritmo dos espinhos e atravesse enquanto estiverem recolhidos.'],
 fire:()=>['Onda de fogo','A onda avança pelo piso. Planeje uma rota de fuga e não fique parado.'],
 lava:()=>['Lava','A lava reduz sua velocidade e causa dano. Evite atravessá-la sem proteção.'],
 arena:()=>['Arena de combate','As passagens se fecham durante o combate. Derrote os inimigos para liberá-las.'],
 boss:()=>['A Bruxa','Desvie dos projéteis e das invocações. Encontre uma abertura para atacar.']};
 const cell=(o,z)=>({x:Math.floor(o.x/z),y:Math.floor(o.y/z)}), tile=(m,x,y)=>m.cells?.[x]?.[y]?.tipo;
 function visible(s,o){const p=s.pc,m=s.map,z=m?.SIZE||32;if(!m||!p||!Number.isFinite(o?.x)||!Number.isFinite(o?.y))return false;
  const d=Math.hypot(o.x-p.x,o.y-p.y);if(d>z*3)return false;
  if(Number.isFinite(s.cameraX)&&Number.isFinite(s.cameraY)&&(o.x<s.cameraX||o.x>=s.cameraX+s.w||o.y<s.cameraY||o.y>=s.cameraY+s.h-120))return false;
  const a=cell(p,z),b=cell(o,z),k=c=>`${c.x},${c.y}`,owners=s._bmRun?.owners,room=owners?.get(k(a));
  if(room!=null&&owners.get(k(b))!==room)return false;
  if((s.darkRooms||[]).some(r=>r?.cells?.some(c=>c.x===b.x&&c.y===b.y))&&d>44)return false;
  const n=Math.ceil(d/(z/4));for(let i=1;i<n;i++){const c=cell({x:p.x+(o.x-p.x)*i/n,y:p.y+(o.y-p.y)*i/n},z);if(k(c)===k(a)||k(c)===k(b))continue;const t=tile(m,c.x,c.y);if(t==null||t===-1||t>=6)return false;}return true;
 }
 function candidates(s){if(s.stageIndex===1)return ['training'];if(s.stageIndex===3)return ['boss'];if(s.stageIndex!==0)return [];
  const out=[],add=(id,ok)=>{if(ok)out.push(id);},has=(list,fn)=>Array.isArray(list)&&list.some(fn),near=o=>visible(s,o)&&!s.toRemove?.includes(o);
  const inv=s.inventory;add('map',inv?.hasPermanent?.('dungeonMap'));add('inventory',(inv?.consumables?.size||0)>0);
  add('arena',['closing','active'].includes(s.map?._bmCombatArenaActive?.state));
  add('sokoban',has(s.sokobans,p=>has(p.boxes,near)));
  add('switch',has(s.spritesO,o=>o.switchId!=null&&near(o)));
  add('lever',has(s.spritesO,o=>o.props?.subtipo==='alavanca'&&o.switchId==null&&near(o)));
  add('door',has(s.spritesO,o=>o.props?.subtipo==='porta'&&near(o)));
  add('collect',has(s.spritesO,o=>o.props?.subtipo==='colecionavel'&&!inv?.hidden?.(o)&&near(o)));
  add('spike',has(s.spritesSpike,near));add('fire',has(s.spritesTE,o=>Array.isArray(o.firePlaces)&&near(o)));
  if(s.map&&s.pc){const z=s.map.SIZE||32,p=cell(s.pc,z);let lava=false;for(let x=p.x-2;x<=p.x+2;x++)for(let y=p.y-2;y<=p.y+2;y++)if(tile(s.map,x,y)===5&&near({x:(x+.5)*z,y:(y+.5)*z}))lava=true;add('lava',lava);}
  add('objective',true);return out;
 }
 function update(s,dt){if(!enabled||!s?.pc||s.pc.vidas<=0||s.paused||s.theEnd>0||![0,1,3].includes(s.stageIndex)||s.map?._bmDungeonMap?.open)return null;
  let a=states.get(s);if(!a||a.pc!==s.pc||a.map!==s.map||a.stage!==s.stageIndex||a.run!==s._bmRun){a={pc:s.pc,map:s.map,stage:s.stageIndex,run:s._bmRun,tip:null,elapsed:0,gap:0,scan:0};states.set(s,a);}
  const d=Math.max(0,Math.min(.1,Number(dt)||0));if(a.tip){a.elapsed+=d;if(a.elapsed>=duration){seen.add(a.tip);save();a.tip=null;a.gap=1;}}
  if(!a.tip){a.gap=Math.max(0,a.gap-d);a.scan=Math.max(0,a.scan-d);if(!a.gap&&!a.scan&&seen.size<ids.length){a.tip=candidates(s).find(id=>!seen.has(id))||null;a.elapsed=0;a.scan=.15;}}
  return a.tip?{id:a.tip,elapsed:a.elapsed,lines:tips[a.tip]()}:null;
 }
 function draw(s,dt){const tip=update(s,dt);if(!tip)return;const c=s.ctx,w=s.w,h=s.h;if(!c||!(w>0&&h>0))return;
  c.save();try{c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=Math.min(1,(tip.elapsed+.1)*5,(duration-tip.elapsed)*3);
   const scale=Math.min(w/860,h/640),bw=Math.min(500*scale,w-24),bh=(tip.lines.length===4?111:91)*scale,x=(w-bw)/2,y=12*scale;
   c.fillStyle='rgba(10,19,33,.9)';c.fillRect(x,y,bw,bh);c.strokeStyle='#7799c5';c.strokeRect(x+.5,y+.5,bw-1,bh-1);c.fillStyle='#a9c9f4';c.fillRect(x,y+bh-3*scale,bw*Math.max(0,1-tip.elapsed/duration),3*scale);
   c.textAlign='center';c.textBaseline='middle';c.font=`bold ${17*scale}px Arial`;c.fillStyle='#d8e9ff';c.fillText(tip.lines[0],w/2,y+19*scale,bw-16);
   c.font=`${14*scale}px Arial`;c.fillStyle='#e3eaf4';tip.lines.slice(1).forEach((t,i)=>c.fillText(t,w/2,y+(44+i*20)*scale,bw-16));
  }finally{c.restore();}
 }
 return {enabled:()=>enabled,setEnabled,reset,storageOK:()=>storageOK,lobbyText,draw,update};
})();
