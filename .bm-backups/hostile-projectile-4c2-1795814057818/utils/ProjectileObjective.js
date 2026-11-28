/* BM_PROJECTILE_OBJECTIVE_4C — optional corner reward, native NPCs/pickup. */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function plan(layout){
 const w=layout.footprint.w,level=layout.level,mid=Math.floor((2+w-1)/2),flip=((layout.seed+layout.attempt)>>>0)%2;
 const types=level===1?[]:level===2?['diabinho']:level===3?['caveira','diabinho']:['ogro','caveira'];
 const positions=[{x:flip?w-2:3,y:2},{x:flip?3:w-2,y:2}];
 return {kind:'corner',bounds:{l:64,r:w*32,t:32,b:96},transition:{l:64,r:w*32,t:96,b:128},reward:{type:'hp',x:mid,y:1},guards:types.map((type,i)=>({...positions[i],type})),requestedLevel:level,originalLineCount:layout.mode==='run'?layout.profile.runLines:layout.mode==='mobile'?null:layout.profile.lines,lineCount:layout.emitters.length};
}
function check(layout,tracks,physics={}){
 const p=layout.objective;if(!p||p.kind!=='corner'||layout.anchors[0].y!==112)return false;
 const b=p.bounds,z=32,at=(x,y)=>layout.tiles.find(t=>t.x===x&&t.y===y)?.tipo;
 for(let x=2;x<layout.footprint.w;x++)for(let y=1;y<=3;y++)if(![0,2].includes(at(x,y)))return false;
 const half=(physics.projectileH??12)/2+(physics.hurtH??12)/2+2;
 if(tracks.some(t=>Math.min(t.y,t.endY)-half<=p.transition.b-8))return false;
 if((layout.movingBarriers||[]).some(q=>q.yMin-q.h/2<b.b))return false;
 const cells=[p.reward,...p.guards];if(new Set(cells.map(q=>q.x+','+q.y)).size!==cells.length)return false;
 return cells.every(q=>q.x>=2&&q.x<layout.footprint.w&&q.y>=1&&q.y<=2&&[0,2].includes(at(q.x,q.y)))&&p.guards.length===[0,1,2,2][layout.level-1];
}
function attach(enemy,scene,b,C){
 if(typeof enemy.mover!=='function'||typeof enemy.comportar!=='function')throw Error('NPC sem comportamento/movimento nativo');
 enemy.props={...enemy.props,bmProjectileGuard:true};enemy.atravessa=0;
 const move=enemy.mover,behave=enemy.comportar;
 const inside=()=>scene.pc&&scene.pc.x>=b.l&&scene.pc.x<b.r&&scene.pc.y>=b.t&&scene.pc.y<b.b;
 enemy.comportar=function(...args){if(!inside()){this.vx=this.vy=0;return;}return behave.apply(this,args);};
 enemy.mover=function(...args){if(!inside())this.vx=this.vy=0;const r=move.apply(this,args),box=C.box(this),hx=box.w/2+1,hy=box.h/2+1;
  const x=clamp(this.x,b.l+hx,b.r-hx),y=clamp(this.y,b.t+hy,b.b-hy);if(x!==this.x)this.vx=0;if(y!==this.y)this.vy=0;this.x=x;this.y=y;C.sync(this,scene.map);return r;};return enemy;
}
function spawn(scene,plan,C){
 const gm=scene.gamer;if(!gm||typeof gm.criarInimigo!=='function'||typeof gm.criarPoder!=='function')throw Error('Fabrica nativa de NPC/recompensa indisponivel');
 const state={plan,guards:[],reward:null,released:false,scene};
 // Create all objects before adding to avoid a partially initialized group.
 state.guards=plan.guards.map(g=>attach(gm.criarInimigo(g.type,g.x,g.y),scene,plan.bounds,C));
 state.reward=gm.criarPoder(plan.reward.type,plan.reward.x,plan.reward.y);state.reward.props={...state.reward.props,bmProjectileObjective:true};
 for(const e of state.guards)scene.adicionar(e);update(scene,state);return state;
}
function update(scene,s){if(s.released||scene!==s.scene||scene.pc?.vidas<=0)return;if(s.guards.every(e=>e.vidas<=0)){scene.adicionar(s.reward);s.released=true;}}
function cleanup(scene,s){for(const list of [scene.spritesE,scene.spritesPoder,scene.toRemove])if(Array.isArray(list))for(let i=list.length-1;i>=0;i--)if(s.guards.includes(list[i])||list[i]===s.reward)list.splice(i,1);}
function status(scene,s){return {kind:s.plan.kind,level:s.plan.requestedLevel,guards:s.guards.length,alive:s.guards.filter(e=>e.vidas>0).length,released:s.released,collected:s.released&&!scene.spritesPoder?.includes(s.reward),lineCount:s.plan.lineCount,originalLineCount:s.plan.originalLineCount};}
const api={plan,check,attach,spawn,update,cleanup,status};if(typeof module==='object'&&module.exports)module.exports=api;else root.BMProjectileObjective=api;
})(typeof globalThis!=='undefined'?globalThis:this);
