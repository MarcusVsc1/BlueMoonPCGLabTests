/* BM_PROJECTILE_OBJECTIVE_4C4 — compact reward, delayed persistent aggro. */
(function(root){'use strict';
const z=32, guardsByLevel=[[],['diabinho'],['caveira','diabinho'],['ogro','caveira']];
function railClear(layout,x,y,half=8){return !(layout.movingBarriers||[]).some(q=>Math.abs((x+.5)*z-q.x)<=q.w/2+half&&(y+.5)*z+half>=q.yMin-q.h/2&&(y+.5)*z-half<=q.yMax+q.h/2);}
function activationBoundary(layout){
 const rows=[...new Set(layout.emitters.map(e=>e.y))].sort((a,b)=>a-b);
 // Cross the penultimate firing row toward A; the last row remains ahead.
 return (rows[1]??rows[0]??2)*z;
}
function rewardPosition(layout,cells){
 if(layout.restriction){const arrival=layout.anchors[0].x/z-.5;if(layout.level===1)return arrival;
  const ends=[cells[0],cells[cells.length-1]];return ends.sort((a,b)=>Math.abs(b-arrival)-Math.abs(a-arrival)||(((layout.seed+layout.attempt)&1)?b-a:a-b))[0];}
 return layout.mode==='mobile'?Math.floor(layout.anchors[0].x/z):(2+layout.footprint.w-1)/2;
}
function plan(layout){
 const w=layout.footprint.w,level=layout.level,mid=(2+w-1)/2,flip=((layout.seed+layout.attempt)>>>0)%2;
 const cells=Array.from({length:w-2},(_,i)=>i+2).filter(x=>railClear(layout,x,1));
 const rewardX=rewardPosition(layout,cells);
 const available=cells.filter(x=>Math.abs(x-rewardX)>=1),positions=flip?available.slice().reverse():available;
 const chosen=[positions[0],positions[positions.length-1]];
 return {kind:'corner',activationY:activationBoundary(layout),bounds:{l:64,r:w*z,t:z,b:2*z},reward:{type:'hp',x:rewardX,y:1},guards:guardsByLevel[level-1].map((type,i)=>({x:chosen[i],y:1,type})),requestedLevel:level,originalLineCount:layout.mode==='run'?layout.profile.runLines:layout.mode==='mobile'?null:layout.profile.lines,lineCount:layout.emitters.length};
}
function check(layout,tracks,physics={}){
 const p=layout.objective;if(!p||p.kind!=='corner'||layout.anchors[0].y!==48)return false;
 const b=p.bounds,at=(x,y)=>layout.tiles.find(t=>t.x===x&&t.y===y)?.tipo;
 if(b.t!==32||b.b!==64||p.activationY!==activationBoundary(layout))return false;
 for(let x=2;x<layout.footprint.w;x++)if(![0,2].includes(at(x,1)))return false;
 // Projectile bodies never enter the objective row. Player fully inside the row is safe.
 const half=(physics.projectileH??12)/2+2;
 if(tracks.some(t=>Math.min(t.y,t.endY)-half<=b.b))return false;
 const reward=p.reward,expectedX=rewardPosition(layout,Array.from({length:layout.footprint.w-2},(_,i)=>i+2).filter(x=>railClear(layout,x,1)));
 // Reward coordinates may fall between tile centers. Check every tile touched by its 12px hitbox.
 if(reward.x!==expectedX||reward.y!==1||!railClear(layout,reward.x,reward.y))return false;
 const center=(reward.x+.5)*z,halfReward=6;
 if(center-halfReward<b.l||center+halfReward>b.r)return false;
 for(let x=Math.floor((center-halfReward)/z);x<=Math.floor((center+halfReward-1e-8)/z);x++)if(![0,2].includes(at(x,1)))return false;
 if(new Set(p.guards.map(q=>q.x+','+q.y)).size!==p.guards.length)return false;
 return p.guards.every(q=>Number.isInteger(q.x)&&q.x>=2&&q.x<layout.footprint.w&&q.y===1&&Math.abs(q.x-reward.x)>=1&&[0,2].includes(at(q.x,q.y))&&railClear(layout,q.x,q.y))&&p.guards.length===guardsByLevel[layout.level-1].length;
}
function activate(scene,state,C){
 if(state.activated)return true;
 if(scene!==state.scene||!scene.pc||scene.pc.vidas<=0||scene.paused||scene.theEnd>0)return false;
 const pc=state.toLocal?state.toLocal(C.box(scene.pc)):C.box(scene.pc),b=state.plan.bounds;
 const damaged=state.guards.some(e=>Number.isFinite(e.vidas)&&e.vidas<state.initialHealth.get(e));
 const reached=pc.x-pc.w/2>=b.l&&pc.x+pc.w/2<=b.r&&pc.y-pc.h/2>=b.t&&pc.y+pc.h/2<=state.plan.activationY;
 if(!damaged&&!reached)return false;
 state.activated=true;state.activationReason=damaged?'damage':'approach';for(const e of state.guards)e.provocou=true;return true;
}
const guardStates=new WeakMap();
function shouldAct(scene,enemy,C){const state=guardStates.get(enemy);if(!state||state.scene!==scene)return null;return activate(scene,state,C)&&enemy.vidas>0;}
function attach(enemy,scene,state,C){
 if(typeof enemy.mover!=='function'||typeof enemy.comportar!=='function')throw Error('NPC sem comportamento/movimento nativo');
 enemy.props={...enemy.props,bmProjectileGuard:true};enemy.atravessa=0;enemy.provocou=false;guardStates.set(enemy,state);
 const move=enemy.mover,behave=enemy.comportar;
 // Fallback also protects direct calls outside the Scene aggro dispatcher.
 enemy.comportar=function(...args){if(!shouldAct(scene,this,C)){this.vx=this.vy=0;return;}this.provocou=true;return behave.apply(this,args);};
 enemy.mover=function(...args){if(!shouldAct(scene,this,C)){this.vx=this.vy=0;return;}return move.apply(this,args);};
 return enemy;
}
function spawn(scene,plan,C){
 const gm=scene.gamer;if(!gm||typeof gm.criarInimigo!=='function'||typeof gm.criarPoder!=='function')throw Error('Fabrica nativa de NPC/recompensa indisponivel');
 const state={plan,guards:[],reward:null,released:true,activated:false,activationReason:null,initialHealth:new Map(),scene,C};
 state.guards=plan.guards.map(g=>attach(gm.criarInimigo(g.type,g.x,g.y),scene,state,C));
 for(const e of state.guards)state.initialHealth.set(e,e.vidas);
 state.reward=gm.criarPoder(plan.reward.type,plan.reward.x,plan.reward.y);state.reward.props={...state.reward.props,bmProjectileObjective:true};
 for(const e of state.guards)scene.adicionar(e);scene.adicionar(state.reward);return state;
}
function update(scene,s){activate(scene,s,s.C);}
function cleanup(scene,s){for(const e of s.guards)guardStates.delete(e);for(const list of [scene.spritesE,scene.spritesPoder,scene.toRemove])if(Array.isArray(list))for(let i=list.length-1;i>=0;i--)if(s.guards.includes(list[i])||(s.reward&&list[i]===s.reward))list.splice(i,1);}
function status(scene,s){return {kind:s.plan.kind,level:s.plan.requestedLevel,guards:s.guards.length,alive:s.guards.filter(e=>e.vidas>0).length,activated:s.activated,activationReason:s.activationReason,activationY:s.plan.activationY,released:s.released,collected:!scene.spritesPoder?.includes(s.reward),lineCount:s.plan.lineCount,originalLineCount:s.plan.originalLineCount};}
const api={plan,check,attach,spawn,update,cleanup,status,shouldAct};if(typeof module==='object'&&module.exports)module.exports=api;else root.BMProjectileObjective=api;
})(typeof globalThis!=='undefined'?globalThis:this);
