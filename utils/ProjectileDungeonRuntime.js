/* BM_PROJECTILE_DUNGEON_5B: native dungeon runtime, no natural lottery. */
/* BM_PROJECTILE_WAKE_5C21: live emission only; no retroactive projectile reconstruction. */
(function(root){'use strict';
const node=typeof module==='object'&&module.exports;
const L=node?require('./HostileProjectileLab'):root.BMHostileProjectileLab,A=node?require('./ProjectileRoomAdapter'):root.BMProjectileRoomAdapter,O=node?require('./ProjectileObjective'):root.BMProjectileObjective;
const H=L.dungeonHooks,Z=32,KEY='HostileProjectileAgent';
function toLocal(info,plan){const tr=A.transform(info,plan.orientation,plan.mirrored),o=tr.pixel(0,0),a=tr.pixel(1,0),b=tr.pixel(0,1),ux=a.x-o.x,uy=a.y-o.y,vx=b.x-o.x,vy=b.y-o.y;return p=>{const x=p.x-info.base.x*Z-o.x,y=p.y-info.base.y*Z-o.y;return {x:x*ux+y*uy,y:x*vx+y*vy,w:Math.abs(ux)*p.w+Math.abs(uy)*p.h,h:Math.abs(vx)*p.w+Math.abs(vy)*p.h};};}
// Start dense streams early, with two tiles of hysteresis on exit. The
// camera test also covers a room visible from a neighboring corridor.
function near(scene,s){
 const {l,r,t,b}=s.bounds,p=scene.pc,extra=s.awake?2:0;
 const radius=((s.mode==='mobile'||s.mode==='run'?14:8)+extra)*Z;
 if(Math.hypot(Math.max(l-p.x,0,p.x-r),Math.max(t-p.y,0,p.y-b))<=radius)return true;
 const canvas=scene.ctx?.canvas,dx=scene.cameraX,dy=scene.cameraY;
 if(!canvas||![dx,dy,canvas.width,canvas.height].every(Number.isFinite)||canvas.width<=0||canvas.height<=0)return false;
 const margin=(2+extra)*Z;
 return r+margin>=dx&&l-margin<=dx+canvas.width&&b+margin>=dy&&t-margin<=dy+canvas.height;
}
function active(scene,s){return !!(s&&s.dungeon&&scene.stageIndex===0&&scene.map===s.map&&scene.pc===s.pc);}
function removeShots(scene,s){for(const list of [scene.spritesTE,scene.toRemove])if(Array.isArray(list))for(let i=list.length-1;i>=0;i--)if(H.owner(list[i])===s)list.splice(i,1);}
// Passage defense is a runtime addition only: no geometry, clock, reward or
// original certificate is mutated. Both possible sides are planned at mount.
const passageTypes=[[],['diabinho'],['caveira','diabinho'],['ogro','caveira']];
function passageGuardPlan(info,plan,entry){
 if(plan.role!=='passage'||!['A','B'].includes(entry))return null;
 const l=plan.canonical,{w,h}=l.footprint,goal=entry==='A'?'B':'A',row=goal==='A'?1:h-2;
 const tr=A.transform(info,plan.orientation,plan.mirrored),anchor=l.anchors.find(a=>a.id===goal),port=info.ports.map(p=>tr.inverse(p.x,p.y)).find(p=>p.y===(goal==='A'?0:h-1));
 if(!anchor||!port)return null;
 const types=passageTypes[plan.level-1],at=(x,y)=>l.tiles.find(t=>t.x===x&&t.y===y)?.tipo;
 const portalX=(port.x+.5)*Z;
 const candidates=[];
 for(let x=2;x<w;x++){
  const px=(x+.5)*Z,py=(row+.5)*Z;
  if(![0,2].includes(at(x,row))||Math.abs(px-anchor.x)<Z||Math.abs(px-portalX)<Z)continue;
  if((l.movingBarriers||[]).some(b=>Math.abs(px-b.x)<b.w/2+12&&py+12>=b.yMin-b.h/2&&py-12<=b.yMax+b.h/2))continue;
  candidates.push({x,y:row,portalDistance:Math.abs(px-portalX),arrivalDistance:Math.abs(px-anchor.x)});
 }
 // First guard protects the actual exit. Second protects the crossing arrival.
 // Retain the clearance from both and the rail envelope.
 const chosen=[];
 for(const type of types){const key=chosen.length?'arrivalDistance':'portalDistance';candidates.sort((a,b)=>a[key]-b[key]||a[chosen.length?'portalDistance':'arrivalDistance']-b[chosen.length?'portalDistance':'arrivalDistance']||a.x-b.x);const g=candidates.shift();if(!g)return null;chosen.push({x:g.x,y:g.y,type});}
 const rows=[...new Set(l.emitters.map(e=>e.y))].sort((a,b)=>a-b);
 const boundary=entry==='B'?(rows[1]??rows[0])*Z:((rows[rows.length-2]??rows[0])+1)*Z;
 const activationY=entry==='B'?boundary:h*Z-boundary;
 const guards=chosen.map(g=>{const p=tr.tile(g.x,g.y);return {...g,x:p.x+info.base.x,y:p.y+info.base.y};});
 return {kind:'passage',entry,goal,guards,activationY,canonicalBoundary:boundary,bounds:{l:64,r:w*Z,t:Z,b:2*Z},requestedLevel:plan.level,lineCount:l.emitters.length,originalLineCount:l.emitters.length};
}
function firstEntry(scene,s,C){
 const p=s.passage;if(!p||p.entry||s.level===1)return;
 const box=toLocal(s.info,s.plan)(C.box(scene.pc)),{w,h}=s.layout.footprint;
 // Only a real entry into one of the two end strips commits the side. Being
 // near a wall, e.g. on a different corridor, does not spawn the defense.
 if(box.x<Z||box.x>=(w+1)*Z||box.y<0||box.y>=h*Z)return;
 const entry=box.y<2*Z?'A':box.y>=(h-2)*Z?'B':null;if(!entry)return;
 const plan=p.plans[entry],local=toLocal(s.info,s.plan),os={scene,C,plan,guards:[],reward:null,released:true,activated:false,activationReason:null,initialHealth:new Map(),toLocal:q=>{const v=local(q);return entry==='A'?{...v,y:h*Z-v.y}:v;}};
 os.guards=plan.guards.map(g=>O.attach(scene.gamer.criarInimigo(g.type,g.x,g.y),scene,os,C));for(const e of os.guards)os.initialHealth.set(e,e.vidas);
 // Commit once; subsequent returns never relocate or recreate the enemies.
 p.entry=entry;s.objectiveState=os;for(const e of os.guards)scene.adicionar(e);
}
function canMount(scene,map,info,plan,reward){
 if(plan.mode==='fixed'&&plan.level<=2)return 'Barreiras fixas N1/N2 desativadas';
 if(!plan.pass||!plan.certificate?.pass||!map||map.SIZE!==32||H.all(scene).some(s=>s.map!==map||s.pc!==scene.pc||!(info.base.x+info.w<=s.info.base.x||s.info.base.x+s.info.w<=info.base.x||info.base.y+info.h<=s.info.base.y||s.info.base.y+s.info.h<=info.base.y)))return 'Plano/mapa invalido ou sobreposto';
 const footprint=new Set(plan.tiles.map(t=>`${t.x},${t.y}`));if(footprint.size!==info.w*info.h||plan.tiles.some(t=>t.x<info.base.x||t.y<info.base.y||t.x>=info.base.x+info.w||t.y>=info.base.y+info.h||map.cells[t.x]?.[t.y]?.tipo!==0))return 'Footprint alterado antes da populacao';
 if((plan.role==='corner')!==!!reward)return 'Recompensa original divergente';
 if(plan.role==='passage'&&(plan.guards.length||plan.reward))return 'Path com objetivo';
 if(plan.role==='passage'&&plan.level>=2&&(!passageGuardPlan(info,plan,'A')||!passageGuardPlan(info,plan,'B')))return 'Sem posicoes seguras para guardioes de passagem';
 return null;
}
function mount(scene,map,info,plan,reward,C,SpriteClass){
 const invalid=canMount(scene,map,info,plan,reward);if(invalid)throw Error(invalid);
 const emitters=plan.emitters.map(d=>{const sprite=new SpriteClass({x:(d.x+.5)*Z,y:(d.y+.5)*Z,w:20,h:20,vm:0,direcao:d.direction,imgX:0,imgY:0,imagem:'gargoyle',renderOffset:{x:-15,y:-15},props:{tipo:'bmHostileEmitter'}});sprite.scene=scene;return {d,sprite};});
 const s={dungeon:true,mode:plan.mode,level:plan.level,layout:plan.canonical,map,pc:scene.pc,changes:[],barriers:plan.tiles.filter(t=>t.tipo===6),movingBarriers:plan.movingBarriers,motion:null,lastAudible:-Infinity,prefilled:0,portals:[],portalList:null,clock:new L.ShotClock(plan.emitters),shots:0,impacts:0,impactKinds:{},traversals:{ida:0,volta:0,idaSemDano:0,voltaSemDano:0},emitters,plan,info,awake:false,wakeCount:0,sleepCount:0,bounds:{l:info.base.x*Z,r:(info.base.x+info.w)*Z,t:info.base.y*Z,b:(info.base.y+info.h)*Z}};
 if(plan.role==='passage'&&plan.level>=2){const plans={A:passageGuardPlan(info,plan,'A'),B:passageGuardPlan(info,plan,'B')};if(!plans.A||!plans.B)throw Error('Sem posicoes seguras para guardioes de passagem');s.passage={entry:null,plans};}
 // Construct guards before changing the map. Preserve the actual collectible object and its progression identity.
 if(reward){const os={scene,C,plan:plan.canonical.objective,toLocal:toLocal(info,plan),guards:[],reward,released:true,activated:false,activationReason:null,initialHealth:new Map()};os.guards=plan.guards.map(g=>O.attach(scene.gamer.criarInimigo(g.type,g.x,g.y),scene,os,C));for(const e of os.guards)os.initialHealth.set(e,e.vidas);s.objectiveState=os;}
 for(const t of plan.tiles){const c=map.cells[t.x][t.y];s.changes.push({cell:c,before:c.tipo,after:t.tipo});c.tipo=t.tipo;}
 H.set(scene,s);
 if(reward){reward.x=plan.reward.x;reward.y=plan.reward.y;for(const e of s.objectiveState.guards)scene.adicionar(e);scene.adicionar(reward);}
 return s;
}
function guardDisplacement(scene,s,C){if(scene.pc.atravessa===1)return;for(const b of H.mobileEnvelopes(s)){const p=C.box(scene.pc);if(Math.abs(p.x-b.x)>=(p.w+b.w)/2||Math.abs(p.y-b.y)>=(p.h+b.h)/2)continue;const rail=s.movingBarriers.find(q=>q.id===b.id)||s.movingBarriers[0],axis=rail.start.x===rail.end.x?'x':'y',dim=axis==='x'?'w':'h',half=(p[dim]+b[dim])/2;const target=b[axis]+(p[axis]<=b[axis]?-half:half);scene.pc[axis]+=target-p[axis];scene.pc[axis==='x'?'vx':'vy']=0;C.sync(scene.pc,scene.map);}}
function draw(scene,s){const c=scene.ctx,dx=scene.cameraX||0,dy=scene.cameraY||0;c.save();try{for(const b of s.movingBarriers){const p=L.barrierAt(b,s.clock.time);c.strokeStyle='#55545b';c.lineWidth=4;c.beginPath();c.moveTo(b.start.x-dx,b.start.y-dy);c.lineTo(b.end.x-dx,b.end.y-dy);c.stroke();c.fillStyle='#393a41';c.fillRect(p.x-p.w/2-dx,p.y-p.h/2-dy,p.w,p.h);c.fillStyle='#93949e';c.fillRect(p.x-p.w/2-dx+2,p.y-p.h/2-dy+2,p.w-4,p.h-4);}}finally{c.restore();}for(const e of s.emitters)e.sprite.desenhar(c);}
function install(SceneClass,C){const proto=SceneClass.prototype;if(proto._bmProjectileDungeon5B)return;L.installCollision(C);const move=proto.mover,render=proto.desenhar,clear=proto.limparCena,aggro=proto.bmEnemyShouldAct;
 proto.mover=function(dt,...args){const list=H.all(this).filter(s=>active(this,s));if(!list.length||this.paused||this.theEnd>0||this.pc.vidas<=0||!(dt>0)||!Number.isFinite(dt))return move.call(this,dt,...args);
  for(const s of list){firstEntry(this,s,C);const wake=near(this,s);if(wake&&!s.awake){s.awake=true;s.wakeCount++;}if(!wake&&s.awake){s.awake=false;s.sleepCount++;removeShots(this,s);}if(s.movingBarriers.length){s.motion={start:s.clock.time,end:s.clock.time+dt};guardDisplacement(this,s,C);}}
  let result;try{result=move.call(this,dt,...args);}finally{for(const s of list)s.motion=null;}
  if(this.paused||this.theEnd>0)return result;for(const s of list){if(!active(this,s)||!H.all(this).includes(s))continue;firstEntry(this,s,C);if(s.objectiveState)O.update(this,s.objectiveState);for(const e of s.clock.advance(dt))if(s.awake)H.fire(this,s,e);}return result;
 };
 proto.desenhar=function(...args){for(const s of H.all(this))if(active(this,s))draw(this,s);return render.apply(this,args);};
 proto.limparCena=function(...args){if(H.all(this).length)H.reset(this);return clear.apply(this,args);};
 proto.bmEnemyShouldAct=function(e,...args){if(H.all(this).some(s=>active(this,s))&&e.props?.bmProjectileGuard){const a=O.shouldAct(this,e,C);if(a!==null)return a;}return aggro.call(this,e,...args);};
 Object.defineProperty(proto,'_bmProjectileDungeon5B',{value:true});
}
function status(scene,roomId){const s=H.all(scene).find(s=>roomId===undefined||s.roomId===roomId);if(!s?.dungeon)return null;return {ready:active(scene,s),mode:s.mode,level:s.level,role:s.plan.role,orientation:s.plan.orientation,roomId:s.roomId,awake:s.awake,wakeCount:s.wakeCount,sleepCount:s.sleepCount,emissionPolicy:'live-only',clock:s.clock.time,shots:s.shots,impacts:s.impactKinds,prefilled:s.prefilled,live:scene.spritesTE.filter(p=>H.owner(p)===s).length,reward:s.plan.reward,composition:s.layout.restriction?{quality:s.plan.certificate.quality,widthTiles:s.layout.restriction.width,lines:s.layout.restriction.lanes,pitTiles:s.layout.pits.length,rewardRule:s.plan.role==='passage'?'none':s.level===1?'arrival':'far-corner'}:{preserved:true},passageGuards:s.plan.role==='passage'?{state:s.level===1?'disabled':s.passage.entry?'spawned':'awaiting-entry',entry:s.passage?.entry??null,goal:s.passage?.entry?s.passage.plans[s.passage.entry].goal:null,guards:s.objectiveState?.guards.map((e,i)=>({type:s.objectiveState.plan.guards[i].type,x:e.x,y:e.y,vidas:e.vidas}))??[],alive:s.objectiveState?.guards.filter(e=>e.vidas>0).length??0,activated:s.objectiveState?.activated??false,activationReason:s.objectiveState?.activationReason??null,canonicalBoundary:s.objectiveState?.plan.canonicalBoundary??null}:null,objective:s.plan.role==='corner'&&s.objectiveState?{...O.status(scene,s.objectiveState),collected:![scene.spritesPoder,scene.spritesO,scene.spritesTP,scene.spritesEV].some(a=>a?.includes(s.objectiveState.reward))}:null};}
function go(scene,C,side='B',roomId){const s=H.all(scene).find(s=>roomId===undefined||s.roomId===roomId);if(!active(scene,s)||scene.pc.vidas<=0||scene.paused||scene.theEnd>0)return false;if(!['A','B'].includes(side)||s.plan.role==='corner'&&side!=='B')return false;const p=s.plan.anchors.find(a=>a.id===side);if(!p)return false;scene.pc.x=p.x;scene.pc.y=p.y;scene.pc.vx=scene.pc.vy=0;C.sync(scene.pc,scene.map);firstEntry(scene,s,C);return true;}
const api={mount,canMount,install,status,allStatus:scene=>H.all(scene).map(s=>status(scene,s.roomId)),toLocal,near,go,passageGuardPlan,KEY};if(node)module.exports=api;else root.BMProjectileDungeonRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
