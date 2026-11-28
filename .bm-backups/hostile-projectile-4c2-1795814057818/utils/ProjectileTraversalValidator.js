/* BM_PROJECTILE_TRAVERSAL_VALIDATOR_3B -- static and dynamic, periodic projectile arenas. */
(function(root){
'use strict';
const motion=typeof module==='object'&&module.exports?require('./HostileProjectileLab'):root.BMHostileProjectileLab;
const EPS=1e-8, DIR=[[0,1],[-1,0],[1,0],[0,-1]];
const gcd=(a,b)=>b?gcd(b,a%b):a;
const lcm=(a,b)=>a/gcd(a,b)*b;
const rect=(x,y,w,h)=>({l:x-w/2,r:x+w/2,t:y-h/2,b:y+h/2});
const intersects=(a,b)=>a.l<=b.r+EPS&&a.r>=b.l-EPS&&a.t<=b.b+EPS&&a.b>=b.t-EPS;
const swept=(a,b,w,h)=>({l:Math.min(a.x,b.x)-w/2,r:Math.max(a.x,b.x)+w/2,t:Math.min(a.y,b.y)-h/2,b:Math.max(a.y,b.y)+h/2});
function requireThat(ok,message){if(!ok)throw Error(message);}
function validate(layout,options={}){
 const o={tileSize:32,playerSpeed:135,playerW:12,playerH:12,hurtW:12,hurtH:12,projectileW:12,projectileH:12,emitterW:20,emitterH:20,step:8,dtMs:100,spaceMargin:2,frameMarginMs:34,timingMarginMs:100,...options};
 for(const k of ['tileSize','playerSpeed','playerW','playerH','hurtW','hurtH','projectileW','projectileH','emitterW','emitterH','step','dtMs'])requireThat(Number.isFinite(o[k])&&o[k]>0,'Parametro invalido: '+k);
 for(const k of ['spaceMargin','frameMarginMs','timingMarginMs'])requireThat(Number.isFinite(o[k])&&o[k]>=0,'Margem invalida: '+k);
 requireThat(Number.isInteger(o.dtMs)&&Number.isInteger(o.step)&&o.dtMs>=20&&o.dtMs<=500&&o.step/o.playerSpeed<=o.dtMs/1000+EPS,'Passo excede velocidade ou resolucao suportada.');
 requireThat(layout&&Array.isArray(layout.tiles)&&layout.tiles.length&&Array.isArray(layout.emitters),'Layout completo exigido.');
 const z=o.tileSize, width=Math.max(...layout.tiles.map(t=>t.x))+1,height=Math.max(...layout.tiles.map(t=>t.y))+1;
 requireThat(width>0&&height>0&&width*height===layout.tiles.length&&width*height<=1024,'Mapa incompleto ou grande demais.');
 const seen=new Set();for(const t of layout.tiles){requireThat(Number.isInteger(t.x)&&Number.isInteger(t.y)&&t.x>=0&&t.y>=0&&[0,1,2,4,6,7,8,9,10,11,12,13].includes(t.tipo),'Tile nao suportado (lava/buraco exige outro modelo).');const key=t.x+','+t.y;requireThat(!seen.has(key),'Tile duplicado');seen.add(key);}
 const walls=layout.tiles.filter(t=>t.tipo>=6&&![8,9].includes(t.tipo)).map(t=>rect((t.x+.5)*z,(t.y+.5)*z,z,z));
 const emitters=layout.emitters;requireThat(emitters.length<=32,'Muitos disparadores.');
 let periodMs=o.dtMs;
 for(const e of emitters){const p=e.period*1000;requireThat(DIR[e.direction]&&Number.isInteger(e.x)&&Number.isInteger(e.y)&&seen.has(e.x+','+e.y)&&Number.isFinite(e.speed)&&e.speed>0&&Number.isFinite(e.phase)&&e.phase>=0&&e.phase<e.period&&Number.isFinite(p)&&Math.abs(p-Math.round(p))<EPS&&p>=20,'Disparador/periodo invalido.');requireThat(motion.shotOffsets(e).length>0&&motion.shotOffsets(e).every((v,i,a)=>Number.isFinite(v)&&v>=0&&v<e.period&&(!i||v>a[i-1])),'Agenda de tiros invalida');periodMs=lcm(periodMs,Math.round(p));requireThat(periodMs<=60000,'Ciclo conjunto excede 60 s.');}
 const moving=layout.movingBarriers||[];
 for(const b of moving){requireThat(motion&&[b.x,b.yMin,b.yMax,b.w,b.h,b.speed,b.pause,b.phase].every(Number.isFinite)&&b.yMax>b.yMin&&b.w>0&&b.h>0&&b.speed>0&&b.pause>=0,'Barreira movel invalida.');const p=motion.barrierPeriod(b)*1000;requireThat(Math.abs(p-Math.round(p))<EPS,'Periodo da barreira deve ser inteiro em ms.');periodMs=lcm(periodMs,Math.round(p));requireThat(periodMs<=60000,'Ciclo conjunto excede 60 s.');}
 const P=periodMs/o.dtMs, dt=o.dtMs/1000, padding=(o.frameMarginMs+o.timingMarginMs)/1000;
 const emitRects=emitters.map(e=>rect((e.x+.5)*z,(e.y+.5)*z,o.emitterW,o.emitterH));
 const solids=walls.concat(emitRects);
 const walkSolids=solids.concat(layout.tiles.filter(t=>[8,9].includes(t.tipo)).map(t=>rect((t.x+.5)*z,(t.y+.5)*z,z,z)));
 const worldW=width*z,worldH=height*z;
 // The hostile projectile is clipped at the first expanded wall/emitter face.
 const tracks=emitters.map((e,i)=>{
   const [dx,dy]=DIR[e.direction], muzzle=e.muzzle??18;
   requireThat(Number.isFinite(muzzle)&&muzzle>=0,'Boca invalida.');
   const x=(e.x+.5)*z+dx*muzzle,y=(e.y+.5)*z+dy*muzzle;
   const a=rect(x,y,o.projectileW,o.projectileH);
   requireThat(a.l>=0&&a.t>=0&&a.r<=worldW&&a.b<=worldH&&!solids.some(b=>a.l<b.r-EPS&&a.r>b.l+EPS&&a.t<b.b-EPS&&a.b>b.t+EPS),'Boca sobreposta a obstaculo: '+e.id);
   let distance=dx>0?worldW-a.r:dx<0?a.l:dy>0?worldH-a.b:a.t;
   for(const b of solids){
     if(dx&&a.t<b.b-EPS&&a.b>b.t+EPS){const d=dx>0?b.l-a.r:a.l-b.r;if(d>=-EPS)distance=Math.min(distance,Math.max(0,d));}
     if(dy&&a.l<b.r-EPS&&a.r>b.l+EPS){const d=dy>0?b.t-a.b:a.t-b.b;if(d>=-EPS)distance=Math.min(distance,Math.max(0,d));}
   }
   return {id:e.id,x,y,dx,dy,speed:e.speed,period:e.period,phase:e.phase,offsets:motion.shotOffsets(e),distance,duration:distance/e.speed,endX:x+dx*distance,endY:y+dy*distance};
 });
 // Guaranteed interception: clip only when the barrier covers the lane at the
 // entry face for every independently perturbed emission/barrier phase.
 // Otherwise retain the entire static trajectory (pessimistic, no false shelter).
 const shotDuration=(tr,start)=>{
   let duration=tr.duration;
   for(const b of moving){
     if(!tr.dx)continue; // dynamic validator currently covers horizontal shots only
     const face=b.x-tr.dx*(b.w+o.projectileW)/2, age=(face-tr.x)/(tr.dx*tr.speed);
     if(age<0||age>=duration)continue;
     const env=motion.barrierEnvelope(b,start+age-2*padding,start+age+2*padding);
     const min=env.y-(env.h-b.h)/2,max=env.y+(env.h-b.h)/2;
     if(Math.max(Math.abs(tr.y-min),Math.abs(tr.y-max))<(b.h+o.projectileH)/2-EPS)duration=age;
   }return duration;
 };
 requireThat(!moving.length||tracks.every(t=>t.dy===0),'Validador movel 3A suporta linhas horizontais.');
 const at=(tr,age)=>({x:tr.x+tr.dx*tr.speed*age,y:tr.y+tr.dy*tr.speed*age});
 // Conservative occupancy: union of projectile positions over the full action
 // interval, including phase jitter and one 30Hz frame. Pre-roll previous cycles.
 const dangers=Array.from({length:P},(_,phase)=>{
   const a=phase*dt-padding,b=(phase+1)*dt+padding,out=[];
   for(const tr of tracks)for(const offset of tr.offsets){const first=Math.ceil((a-tr.duration-offset-EPS)/tr.period),last=Math.floor((b-offset+EPS)/tr.period);
     for(let k=first;k<=last;k++){const start=offset+k*tr.period,lo=Math.max(0,a-start),hi=Math.min(shotDuration(tr,start),b-start);if(hi>=lo-EPS)out.push(swept(at(tr,lo),at(tr,Math.max(lo,hi)),o.projectileW,o.projectileH));}
   }return out;
 });
 const mobileSolids=Array.from({length:P},(_,p)=>moving.map(b=>{const e=motion.barrierEnvelope(b,p*dt-padding,(p+1)*dt+padding);return rect(e.x,e.y,e.w,e.h);}));
 const permanent=tracks.map(tr=>swept({x:tr.x,y:tr.y},{x:tr.endX,y:tr.endY},o.projectileW,o.projectileH));
 const walkW=o.playerW+2*o.spaceMargin,walkH=o.playerH+2*o.spaceMargin,hurtW=o.hurtW+2*o.spaceMargin,hurtH=o.hurtH+2*o.spaceMargin;
 // Optional player-only restriction for independent corridor validation. Never
 // change projectile geometry when certifying a side of a divided room.
 const walk=o.walkBounds||{l:0,r:worldW,t:0,b:worldH};
 requireThat([walk.l,walk.r,walk.t,walk.b].every(Number.isFinite)&&walk.l>=0&&walk.t>=0&&walk.r<=worldW&&walk.b<=worldH&&walk.l<walk.r&&walk.t<walk.b,'Limites de movimento invalidos.');
 const free=a=>a.l>=walk.l&&a.t>=walk.t&&a.r<=walk.r&&a.b<=walk.b&&!walkSolids.some(b=>intersects(a,b));
 const points=[],index=new Map();
 for(let y=0;y<=worldH;y+=o.step)for(let x=0;x<=worldW;x+=o.step)if(free(rect(x,y,walkW,walkH))){index.set(x+','+y,points.length);points.push({x,y});}
 const N=points.length;requireThat(N>0&&N*P<=800000,'Grafo vazio ou acima do limite de 800 mil estados.');
 const anchor=o.anchors||layout.anchors||[{id:'A',x:6.5*z,y:1.5*z},{id:'B',x:6.5*z,y:8.5*z}];
 requireThat(Array.isArray(anchor)&&anchor.length>=2&&anchor.length<=8&&new Set(anchor.map(a=>a.id)).size===anchor.length,'Acessos invalidos.');
 const anchors=anchor.map(a=>{const id=index.get(a.x+','+a.y);requireThat(id!==undefined,'Acesso fora da malha ou bloqueado: '+a.id);return {...a,node:id};});
 const incoming=Array.from({length:N},()=>[]),outgoing=Array.from({length:N},()=>[]);
 const edges=[];
 for(let i=0;i<N;i++)for(const [dx,dy] of [[0,0],...DIR]){
   const a=points[i],j=index.get((a.x+dx*o.step)+','+(a.y+dy*o.step));if(j===undefined)continue;
   const b=points[j];if(!free(swept(a,b,walkW,walkH)))continue;
   const dangerBox=swept(a,b,hurtW,hurtH),safe=new Uint8Array(P);
   for(let p=0;p<P;p++)safe[p]=dangers[p].every(d=>!intersects(dangerBox,d))&&mobileSolids[p].every(ob=>!intersects(swept(a,b,walkW,walkH),ob))?1:0;
   const edge={from:i,to:j,safe,permanentSafe:permanent.every(d=>!intersects(dangerBox,d))};edges.push(edge);incoming[j].push(edge);outgoing[i].push(edge);
 }
 function permanentReach(start,goal){const visited=new Uint8Array(N),q=[start];visited[start]=1;for(let h=0;h<q.length;h++){const i=q[h];if(i===goal)return true;for(const e of outgoing[i])if(e.permanentSafe&&!visited[e.to]){visited[e.to]=1;q.push(e.to);}}return false;}
 function solve(goal){
   const dist=new Int32Array(N*P).fill(-1),next=new Int32Array(N*P).fill(-1),queue=new Int32Array(N*P);let head=0,tail=0;
   const wait=outgoing[goal].find(e=>e.to===goal);
   // Goal is safe through the following interval (conservative).
   for(let p=0;p<P;p++)if(wait.safe[p]){const id=p*N+goal;dist[id]=0;queue[tail++]=id;}
   while(head<tail){const id=queue[head++],phase=Math.floor(id/N),node=id%N,prev=(phase+P-1)%P;
     for(const e of incoming[node]){const from=prev*N+e.from;if(e.safe[prev]&&dist[from]<0){dist[from]=dist[id]+1;next[from]=id;queue[tail++]=from;}}
   }return {dist,next,visited:tail};
 }
 const routes=[];
 for(const goal of anchors){const solved=solve(goal.node);for(const start of anchors){if(start.id===goal.id)continue;
   const phases=Array.from({length:P},(_,p)=>solved.dist[p*N+start.node]);const ok=phases.map(v=>v>=0),reachable=ok.filter(Boolean).length;
   let run=0,maxRun=0;for(let k=0;k<P*2;k++){run=ok[k%P]?Math.min(P,run+1):0;maxRun=Math.max(maxRun,run);}
   const valid=phases.filter(v=>v>=0),min=valid.length?Math.min(...valid):null,max=valid.length?Math.max(...valid):null;
   const samplePhase=ok[0]?0:ok.indexOf(true),witness=[];
   if(samplePhase>=0){let id=samplePhase*N+start.node;for(let i=0;id>=0&&i<=N*P;i++){const pt=points[id%N];witness.push({tMs:(samplePhase+i)*o.dtMs,x:pt.x,y:pt.y,phase:Math.floor(id/N)});id=solved.next[id];}}
   const waits=witness.slice(1).filter((v,i)=>v.x===witness[i].x&&v.y===witness[i].y).length;
   const startWait=outgoing[start.node].find(e=>e.to===start.node).safe.every(Boolean),goalWait=outgoing[goal.node].find(e=>e.to===goal.node).safe.every(Boolean);
   routes.push({from:start.id,to:goal.id,reachablePhases:reachable,totalPhases:P,allPhases:reachable===P,largestContinuousSampleWindowMs:maxRun*o.dtMs,startAlwaysSafe:startWait,goalAlwaysSafe:goalWait,fastestMs:min===null?null:min*o.dtMs,slowestMs:max===null?null:max*o.dtMs,bypassWithoutTiming:permanentReach(start.node,goal.node),samplePhaseMs:samplePhase<0?null:samplePhase*o.dtMs,sampleWaitMs:waits*o.dtMs,visitedStates:solved.visited,witness});
 }}
 // Fixed layouts: check EVERY straight vertical crossing on a finer sampled grid,
 // using 1px resolution and nominal hitboxes (no extra margin).
 let straightExposure=null;
 if(layout.mode==='fixed'&&layout.level!=null&&anchors.length===2&&tracks.every(t=>t.dy===0)){
   const low=Math.min(...anchors.map(a=>a.y)),high=Math.max(...anchors.map(a=>a.y));
   const candidates=[];
   for(let x=0;x<=worldW;x++){
     const a={x,y:low},b={x,y:high};
     if(!free(swept(a,b,o.playerW,o.playerH)))continue;
     const hits=permanent.map((d,i)=>intersects(swept(a,b,o.hurtW,o.hurtH),d)?tracks[i].id:null).filter(Boolean);
     candidates.push({x,exposedLines:hits.length,tracks:hits});
   }
   const minimum=candidates.length?Math.min(...candidates.map(c=>c.exposedLines)):null;
   // Short corner layouts use four alternating lanes (two per side).
   const required=layout.level>=4?(layout.objective?.kind==='corner'&&tracks.length===4&&new Set(tracks.map(t=>t.y)).size===4?2:3):layout.level>=3?2:1;
   straightExposure={minimum,required,straightPaths:candidates.length,pass:minimum===null||minimum>=required,candidates};
 }
 const pass=routes.every(r=>r.allPhases&&r.startAlwaysSafe&&r.goalAlwaysSafe&&!r.bypassWithoutTiming)&&(!straightExposure||straightExposure.pass);
 return {movingBarriers:moving,layout:layout.mode??'custom',pass,periodMs,phaseCount:P,positions:N,edges:edges.length,parameters:o,tracks,routes,straightExposure};
}
const api={validate};if(typeof module==='object'&&module.exports)module.exports=api;else root.BMProjectileTraversalValidator=api;
})(typeof globalThis!=='undefined'?globalThis:this);
