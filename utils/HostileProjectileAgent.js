/* BM_HOSTILE_PROJECTILE_AGENT_5C2 — native population. BM_HOSTILE_PROJECTILE_LOTTERY_5D */
(function(root){'use strict';
const node=typeof module==='object'&&module.exports;
const A=node?require('./ProjectileRoomAdapter'):root.BMProjectileRoomAdapter,R=node?require('./ProjectileDungeonRuntime'):root.BMProjectileDungeonRuntime;
const levelOf=(manager,rooms,room)=>Math.max(1,Math.min(4,Math.ceil(Number(manager.calcularNivel(rooms.indexOf(room),rooms.length-2))||1)));
const SETTINGS=Object.freeze({chance:1,factor:0.5,passagePreference:0.40,maxPassageTrials:4});
// Registration participates in the existing weighted auxiliary draw. The tagger
// contains no references to the manager/scene (the manager JSON-clones its maps).
const ticketMaps=new WeakMap();
class ProjectileTicket {
 constructor(map){this.open=true;this.defaultTag=R.KEY;ticketMaps.set(this,map);}
 gerarTagAuxiliar(graph,room){
  if(!this.open||room.tag?.auxiliar!=null||room.restricoes?.length)return false;
  const info=A.inspect(graph,room,'corner',{map:ticketMaps.get(this)});
  if(!info.pass||!A.compatibleModes(info,{level:1}).length)return false;
  if(graph.getNeighbors(room).some(n=>n.tag?.auxiliar===R.KEY))return false;
  room.tag.auxiliar=R.KEY;return true;
 }
 gerarAgenteAuxiliar(){return false;} // Real population is done by the prepared agent.
}
function register(manager,map){manager.auxAgents.set(R.KEY,{agent:new ProjectileTicket(map),chance:SETTINGS.chance,factor:SETTINGS.factor});}
function replacement(manager,room,allowBare){
 const original=room.tag;room.tag={...original,auxiliar:null};
 // The other passage allocations already ran. Do not introduce a new ticket or
 // a late geometry-dependent donor. Standard alternative agents keep their own weights.
 manager.criarTagAuxiliar(room,new Set([R.KEY,'MazeAgent','AbyssAgent','SokobanAgent']));
 if(!room.tag.auxiliar){if(!allowBare){room.tag=original;return false;}room.tag.auxiliar='AbyssFallback';}
 room.bmProjectileReallocated=true;return true;
}
const comparable=x=>JSON.stringify({w:x.w,h:x.h,base:x.base,ports:x.ports,role:x.role});
class HostileProjectileAgent {
 constructor(manager,scene,map,C,SpriteClass){this.manager=manager;this.scene=scene;this.map=map;this.C=C;this.SpriteClass=SpriteClass;this.plans=new Map();this.results=[];}
 // Pure eligibility/selection, shared by the corner and passage roles.
 prepare(room,role,level,seed,opts,expected=null){
  const info=A.inspect(this.manager.mapGraph,room,role,opts);if(!info.pass)return info;
  if(expected&&comparable(info)!==comparable(expected.info))return {pass:false,reason:'geometria divergente do relatorio'};
  const plan=A.prepareAny(info,{level,seed});if(!plan.pass)return plan;
  if(expected&&(plan.mode!==expected.mode||plan.mirrored!==expected.mirrored))return {pass:false,reason:'certificado divergente',trials:plan.trials};
  const reward=role==='corner'?room.tag.collectible:null;
  const invalid=R.canMount(this.scene,this.map,info,plan,reward);if(invalid)return {pass:false,reason:invalid};
  return {pass:true,info,plan,reward};
 }
 reserve(room,prepared,spec=null){
  if(!prepared.pass||this.plans.has(room)||!room.tag?.auxiliar)return false;
  const {plan,reward}=prepared,originalTag=room.tag;
  // Never discard a resource or an already allocated passage puzzle.
  if(originalTag.tipo==='pathAgent'||(plan.role==='corner'&&originalTag.collectible!==reward))return false;
  const assigned=plan.role==='corner'?{...originalTag,auxiliar:R.KEY}:{tipo:'pathAgent',subTipo:'HostileProjectilePassage',auxiliar:R.KEY};
  this.plans.set(room,{...prepared,originalTag,assigned,spec});room.tag=assigned;
  this.publish({state:'planned',roomId:room.roomId,case:spec,role:plan.role,mode:plan.mode,level:plan.level});return true;
 }
 publish(result){this.results.push(result);if(!node)console.info('[Projetil 5B]',result);}
 gerarAgenteAuxiliar(room,item,level){
  const p=this.plans.get(room);if(!p||p.mounted)return false;
  const invalid=room.tag!==p.assigned?'tag alterada':p.plan.level!==Math.max(1,Math.min(4,Math.ceil(Number(level)||1)))?'nivel divergente':p.reward!==(item??null)?'recompensa divergente':R.canMount(this.scene,this.map,p.info,p.plan,p.reward);
  if(invalid){if(room.tag===p.assigned)room.tag=p.originalTag;this.plans.delete(room);this.publish({state:'skipped',roomId:room.roomId,case:p.spec,reason:invalid});return false;}
  const s=R.mount(this.scene,this.map,p.info,p.plan,p.reward,this.C,this.SpriteClass);s.roomId=room.roomId;p.mounted=true;
  this.publish({state:'mounted',roomId:room.roomId,case:p.spec,mode:p.plan.mode,orientation:p.plan.orientation,anchor:p.plan.anchors.find(a=>a.id==='B'),reward:p.plan.reward});return true;
 }
 // Called at the ordinary room population point. On a preflight refusal the
 // manager continues with the untouched original agent; no random draws here.
 populate(room,level){if(!this.plans.has(room))return false;const p=this.plans.get(room);const ok=this.gerarAgenteAuxiliar(room,room.tag?.collectible,level);if(!ok&&p.natural&&p.plan.role==='corner'&&room.tag?.auxiliar===R.KEY)replacement(this.manager,room,true);return ok;}
 static natural(manager,ordered,opts,rng,scene,map,C,SpriteClass){
  const entry=manager.auxAgents.get(R.KEY);if(!entry)return null;entry.agent.open=false;
  const rooms=[...new Set(ordered)],agent=new HostileProjectileAgent(manager,scene,map,C,SpriteClass);
  const donors=rooms.filter(r=>r.tag?.auxiliar===R.KEY),stats={settings:SETTINGS,tickets:donors.length,weightAfterDraw:entry.chance,requestedPassage:0,corner:0,passage:0,discarded:0,attempts:[],assignments:[]};agent.lottery=stats;
  const seed=()=>Math.floor(rng.nextRandFloat()*4294967296)>>>0;
  const eligible=(r,donor)=>r!==donor&&r.bmPathSlot===true&&!agent.plans.has(r)&&!manager.mapGraph.getNeighbors(r).some(n=>n!==donor&&n.tag?.auxiliar===R.KEY)&&A.inspect(manager.mapGraph,r,'passage',opts).pass;
  const plan=(r,role)=>{const level=levelOf(manager,ordered,r),p=agent.prepare(r,role,level,seed(),opts);stats.attempts.push({roomId:r.roomId,role,level,pass:p.pass,reason:p.reason,mode:p.plan?.mode});return p;};
  for(const donor of donors){
   const prefer=rng.nextRandFloat()<SETTINGS.passagePreference;if(prefer)stats.requestedPassage++;
   const corner=()=>{const p=plan(donor,'corner');if(!p.pass||!agent.reserve(donor,p))return false;agent.plans.get(donor).natural=true;stats.corner++;stats.assignments.push({donorId:donor.roomId,roomId:donor.roomId,role:'corner',level:p.plan.level,mode:p.plan.mode});return true;};
   const passage=()=>{const candidates=rooms.filter(r=>eligible(r,donor)&&A.compatibleModes(A.inspect(manager.mapGraph,r,'passage',opts),{level:levelOf(manager,ordered,r)}).length);for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng.nextRandFloat()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    for(const target of candidates.slice(0,SETTINGS.maxPassageTrials)){const p=plan(target,'passage');if(!p.pass||!agent.reserve(target,p))continue;
     if(!replacement(manager,donor,false)){const old=agent.plans.get(target);target.tag=old.originalTag;agent.plans.delete(target);agent.publish({state:'skipped',roomId:target.roomId,reason:'no-donor-replacement'});return false;}
     agent.plans.get(target).natural=true;stats.passage++;stats.assignments.push({donorId:donor.roomId,roomId:target.roomId,role:'passage',level:p.plan.level,mode:p.plan.mode,replacement:donor.tag.auxiliar});return true;
    }return false;};
   if(!(prefer?(passage()||corner()):(corner()||passage()))){replacement(manager,donor,true);stats.discarded++;}
  }
  // Defensive: an unreachable ticket must not remain a population no-op.
  for(const r of manager.mapGraph.nodes)if(r.tag?.auxiliar===R.KEY&&!agent.plans.has(r)){replacement(manager,r,true);stats.discarded++;stats.tickets++;}
  return agent;
 }
 report(){return {lottery:this.lottery??null,results:this.results.slice(),mounted:R.allStatus(this.scene)};}
 status(roomId){const r=this.results.filter(x=>roomId===undefined||x.roomId===roomId).at(-1);return {...(r||{state:'waiting'}),runtime:R.status(this.scene,roomId)};}
 static allocate(manager,rooms,opts,specs,scene,map,C,SpriteClass){
  if(!specs.length)return null;
  const agent=new HostileProjectileAgent(manager,scene,map,C,SpriteClass);
  for(const spec of specs){const room=rooms.find(r=>r.roomId===spec.roomId);let reason=null;
   if(!room)reason='sala ausente';else if(levelOf(manager,rooms,room)!==spec.level)reason='nivel divergente';
   else {const p=agent.prepare(room,spec.role,spec.level,spec.layoutSeed,opts,spec);if(!p.pass)reason=p.reason;else if(!agent.reserve(room,p,spec))reason='reserva recusada';}
   if(reason)agent.publish({state:'skipped',roomId:spec.roomId,case:spec,reason});
  }
  return agent;
 }
}
const api={HostileProjectileAgent,levelOf,register,SETTINGS,ProjectileTicket};
if(node)module.exports=api;else{
 let current=null;const params=new URLSearchParams(root.location.search);
 const enabled=params.has('bmProjectileRoom')&&params.get('bmProjectileControl')!=='1'&&params.get('bmProjectileLab')!=='1';
 const natural=!params.has('bmProjectileRoom')&&params.get('bmProjectileControl')!=='1'&&params.get('bmProjectileLab')!=='1'&&params.get('bmProjectileNatural')!=='0';
 api.register=function(manager){current=null;if(natural)register(manager,gerenciador.estagios[0].mapa.cells);};
 api.allocate=function(manager,rooms,opts){current=null;if(natural){R.install(Scene,CollisionSystem);current=HostileProjectileAgent.natural(manager,rooms,opts,random,cena1,gerenciador.estagios[0].mapa,CollisionSystem,Sprite);if(current)console.info('[Projetil 5D]',current.lottery);return current;}if(!enabled)return null;
  const ids=new Set(params.get('bmProjectileRoom').split(',').map(Number));
  const specs=(root.BMProjectileCases||[]).filter(c=>c.size===manager.mapGraph.nodes.length&&c.seed===Number(seedValueURL)&&ids.has(c.roomId));
  if(!specs.length)return null;R.install(Scene,CollisionSystem);current=HostileProjectileAgent.allocate(manager,rooms,opts,specs,cena1,gerenciador.estagios[0].mapa,CollisionSystem,Sprite);return current;
 };
 if(natural||enabled)root.BMProjectileTest5B={status(roomId){return current?current.status(roomId):{state:'waiting',runtime:null};},all(){return current?R.allStatus(current.scene):[];},report(){return current?current.report():null;},go(side,roomId){return current?R.go(current.scene,CollisionSystem,side,roomId):false;}};
 root.BMHostileProjectileAgent=api;
}
})(typeof globalThis!=='undefined'?globalThis:this);
