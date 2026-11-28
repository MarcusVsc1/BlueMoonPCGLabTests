/* BM_PROJECTILE_LAYOUT_GENERATOR_5B5 */
(function(root){
'use strict';
const node=typeof module==='object'&&module.exports;
const lab=node?require('./HostileProjectileLab'):root.BMHostileProjectileLab;
const {validate}=node?require('./ProjectileTraversalValidator'):root.BMProjectileTraversalValidator;
const {runWindows}=node?require('./SequentialRunValidator'):root.BMSequentialRunValidator;
const modes=['open','fixed','mobile','run'];
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function eligibility({width:w,height:h,level,mode,divider='auto',objective=false,arrangement=(objective&&mode==='fixed'&&level>=3?'paired':'alternating')}){
 if(![w,h,level].every(Number.isInteger)||w<6||h<6||w>10||h>10||level<1||level>4||!modes.includes(mode))return false;
 if(mode==='fixed'&&level<=2)return false;
 if(!['auto','wall','pit','mixed'].includes(divider)||divider!=='auto'&&(mode!=='fixed'||level<3))return false;
 if(!['alternating','paired','auto'].includes(arrangement)||arrangement!=='alternating'&&(!objective||mode!=='fixed'||level<3))return false;
 const p=lab.PROFILES[level-1],n=h-4;
 if(objective){if(typeof objective!=='boolean'||w<8||n<(level>=3?5:3))return false;}
 if(mode==='fixed'&&level>=3)return w>=8&&n>=(objective?Math.min(p.lines,level>=3?5:3):p.lines)&&(divider==='auto'||divider==='wall'&&w%2===0||['pit','mixed'].includes(divider)&&w%2===1);
 if(mode==='mobile')return w>=8&&h>=8;
 return n>=(objective?Math.min(mode==='run'?p.runLines:p.lines,level>=3?5:3):mode==='run'?p.runLines:p.lines);
}
const restrictedMode=(mode,level)=>mode==='open';
// Timing at the actual crossing axis (not at the gargoyle's muzzle).
const OPEN_PERIODS=[3.2,2.6,2.04,1.6];
const OPEN_DIRECT_LIMIT=[.76,.62,.22,.18],OPEN_ROUND_LIMIT=[.55,.40,0,0];
const mod=(x,p)=>(x%p+p)%p;
// Exact continuous-time union of forbidden starting phases for a player moving
// at native speed on the centerline. No waiting, no lateral input, no extra
// conservative padding: this is a difficulty metric, not the safety proof.
function continuousTiming(layout,tracks,physics={}){
 const [a,b]=layout.anchors,P=layout.emitters[0].period,v=physics.playerSpeed??135;
 const hx=((physics.hurtW??12)+(physics.projectileW??12))/2,hy=((physics.hurtH??12)+(physics.projectileH??12))/2;
 if(!(v>0&&P>0&&a.x===b.x&&a.y!==b.y&&tracks.every(t=>t.dx&&t.dy===0&&Math.abs(t.period-P)<1e-8)))throw Error('Metricas de corredor incompatíveis');
 const T=Math.abs(b.y-a.y)/v;
 function forbidden(start,offset){return tracks.flatMap(t=>{
  const age=(start.x-t.x)/(t.dx*t.speed),lo=Math.max(0,age-hx/t.speed),hi=Math.min(t.duration,age+hx/t.speed);
  const at=Math.abs(t.y-start.y)/v,ylo=Math.max(0,at-hy/v),yhi=Math.min(T,at+hy/v);
  if(hi<lo||yhi<ylo)return [];
  return t.offsets.map(shot=>[shot+lo-yhi-offset,shot+hi-ylo-offset]);
 });}
 function safeFraction(intervals){const parts=[];for(const [a,b] of intervals){const len=b-a;if(len>=P)return 0;const s=mod(a,P),e=s+len;if(e>P)parts.push([s,P],[0,e-P]);else parts.push([s,e]);}
  parts.sort((a,b)=>a[0]-b[0]);let total=0,end=0;for(const [l,r] of parts)if(r>end){total+=r-Math.max(end,l);end=r;}return Math.max(0,Math.min(1,1-total/P));}
 return {playerSpeed:v,travelMs:Math.round(T*1000),centerlineOnly:true,nominalHitboxes:true,routes:[[a,b],[b,a]].map(([start,end])=>{
  const direct=forbidden(start,0);return {from:start.id,to:end.id,directFraction:safeFraction(direct),immediateRoundTripFraction:safeFraction(direct.concat(forbidden(end,T)))};
 })};
}
function candidate(o,attempt=0){
 const {width:w,height:h,level,mode,seed}=o;
 if(!eligibility(o)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Geometria, nivel, divisor ou seed inelegivel.');
 const r=rng((seed+Math.imul(attempt+1,0x9e3779b9))>>>0),p=lab.PROFILES[level-1],left=1,right=w,bottom=h-2,first=2,last=h-3;
 const rows=Array.from({length:last-first+1},(_,i)=>i+first),n=mode==='mobile'?rows.length:Math.min(rows.length,mode==='run'?p.runLines:p.lines);
 let lanes=[...rows];while(lanes.length>n)lanes.splice(1+Math.floor(r()*(lanes.length-2)),1);
 const side=r()<.5?0:1,phase=Math.floor(r()*10)*.01;
 const arrangement=o.arrangement??(o.objective&&mode==='fixed'&&level>=3?'paired':'alternating');
 const paired=o.objective&&mode==='fixed'&&level>=3&&(arrangement==='paired'||arrangement==='auto'&&r()<.5);
 if(paired)lanes=rows.filter((_,i)=>i%2===0);
 let divider='none',barriers=[],pits=[];
 if(mode==='fixed'){
  divider=o.divider&&o.divider!=='auto'?o.divider:w%2===0?'wall':r()<.5?'pit':'mixed';const mid=Math.floor((left+right)/2);
   for(const y of rows){const alt=(y-first+side)%2;if(w%2===0)barriers.push({x:mid+alt,y});else{if(divider==='mixed'&&(y-first)%2===0)barriers.push({x:mid,y});else pits.push({x:mid,y});barriers.push({x:mid+(alt?1:-1),y});}}
 }
 // Only open uses a narrow path; preserve approved fixed N3/N4, mobile and run.
 let restriction=null;
 if(restrictedMode(mode,level)){
  // Fill the entire traversable length with a narrow axis; leave both end strips open.
  // Balanced firing rows; preserve end waiting strips.
  const spacing=Math.max(1,Math.floor((last-first)/Math.max(1,n-1))),span=(n-1)*spacing;
  const startRow=first+Math.floor((last-first-span)/2);
  lanes=Array.from({length:n},(_,i)=>startRow+i*spacing);
  const width=level===1?2:1;
  const start=Math.floor((left+right-width+1)/2),end=start+width-1;
  const floor=new Set(),key=(x,y)=>`${x},${y}`;
  for(const y of rows)for(let x=start;x<=end;x++)floor.add(key(x,y));
  barriers=[];pits=[];
  for(const y of rows)for(let x=left+1;x<right;x++)if(!floor.has(key(x,y))&&!barriers.some(b=>b.x===x&&b.y===y))pits.push({x,y});
  restriction={width,start,end,first,last,lanes:lanes.slice()};
 }

 const has=(a,x,y)=>a.some(b=>b.x===x&&b.y===y),tiles=[];
 for(let x=0;x<13;x++)for(let y=0;y<10;y++)tiles.push({x,y,tipo:x<=left||x>=right||y===0||y>=h-1||has(barriers,x,y)?6:has(pits,x,y)?8:y<first||y===bottom?2:0});
 const dense=mode==='mobile'||mode==='run',center=(left+right+1)*16,top=(first-.5)*32,end=(bottom+.5)*32,x=restriction?(restriction.start+restriction.end+1)*16:mode==='mobile'?80:center;
 const run=mode==='run'?{...lab.RUN,x,top,bottom:end,gapHalf:p.gapHalf,cueHalf:p.cueHalf,down:1+phase,up:5+phase}:null;
 const movingBarriers=mode==='mobile'?[{...lab.MOBILE,yMin:(first+.5)*32,yMax:(last+.5)*32,h:p.shieldH,pause:p.pause,speed:((last-first)*32)/p.travel,phase:0}]:[];
 const emitters=lanes.flatMap((y,i)=>(paired?[1,2]:[null]).map(forced=>{const direction=forced??(restriction?((i+side)%2?1:2):dense?1:level===1?(side?1:2):mode==='fixed'&&level>=3?((y-first+side)%2?1:2):((i+side)%2?1:2)),ex=direction===1?right:left;
 const d={id:mode+(i+1)+(paired?'-'+direction:''),x:ex,y,direction,period:p.period,phase:(i*p.phaseStep+phase+Math.floor(r()*9)*.01+(paired&&direction===2?p.period/2:0))%p.period,speed:140,muzzle:24};
 if(restriction&&mode==='open'){
  const period=OPEN_PERIODS[level-1];
  // N1 grouped, N2/N3 interleaved; N4 adds a small directional phase drift.
  // The seed still chooses the starting side and the clock origin.
  const arrival=phase+(level===1?0:(i%2)*period/2)+(level===4?(side?1:-1)*i*.08:0);
  const flight=Math.abs(x-((ex+.5)*32+(direction===1?-24:24)))/d.speed;
  Object.assign(d,{period,phase:((arrival-flight)%period+period)%period});
 }
 if(mode==='mobile')Object.assign(d,{period:.15,phase:(i*.025+phase)%.15});
 if(run){const wy=(y+.5)*32,flight=((ex+.5)*32-24-run.x)/d.speed,quiet=[run.down+(wy-run.top)/run.speed-flight,run.up+(run.bottom-wy)/run.speed-flight];const dist=(a,b)=>Math.abs(((a-b+4)%8+8)%8-4);const offsets=Array.from({length:80},(_,k)=>k/10).filter(t=>quiet.every(q=>dist(t,q)>=run.gapHalf-1e-8));Object.assign(d,{period:8,phase:offsets[0],offsets});}return d;}));

 const layout={mode,level,seed,attempt,divider,profile:p,tiles,emitters,barriers,pits,movingBarriers,anchors:[{id:'A',x,y:top},{id:'B',x,y:end}],...(run?{run}:{}),footprint:{x:1,y:0,w,h},...(paired?{arrangement:'paired'}:{}),...(restriction?{restriction}:{})};
 if(o.objective){const obj=node?require('./ProjectileObjective'):root.BMProjectileObjective;layout.objective=obj.plan(layout);}
 return layout;
}
function checkRestriction(layout,tracks,physics={}){
 const q=layout.restriction;if(!q)return true;
 const at=(x,y)=>layout.tiles.find(t=>t.x===x&&t.y===y)?.tipo,walk=(x,y)=>[0,2].includes(at(x,y));
 const w=layout.footprint.w,half=(physics.projectileW??12)/2;
 const lanes=layout.emitters.map(e=>e.y).sort((a,b)=>a-b);
 if(lanes.join(',')!==q.lanes.join(',')||new Set(lanes).size!==lanes.length)return false;
 const gaps=lanes.slice(1).map((y,i)=>y-lanes[i]);if(gaps.length&&Math.max(...gaps)-Math.min(...gaps)>1)return false;
 if(q.width!==q.end-q.start+1||q.start<2||q.end>=w||q.first!==2||q.last!==layout.footprint.h-3)return false;
 for(let y=q.first;y<=q.last;y++)for(let x=q.start;x<=q.end;x++)if(!walk(x,y))return false;
 if(layout.mode!=='open'||layout.barriers.length||gaps.some(g=>g!==gaps[0])||layout.emitters.some((e,i)=>i>0&&e.direction===layout.emitters[i-1].direction))return false;
 // Every firing line must span the full width of the compulsory lane.
 for(const y of lanes){const t=tracks.find(t=>t.id===layout.emitters.find(e=>e.y===y).id);if(!t||Math.min(t.x,t.endX)-half>q.start*32||Math.max(t.x,t.endX)+half<(q.end+1)*32)return false;}
 // No lateral walkable cells in the traversal zone.
 for(let y=q.first;y<=q.last;y++)for(let x=2;x<w;x++)if((x<q.start||x>q.end)&&walk(x,y))return false;
 const ay=1,by=layout.footprint.h-2,ax=Math.floor(layout.anchors[0].x/32),bx=Math.floor(layout.anchors[1].x/32);
 // Every firing row must intersect every route.
 for(const cut of lanes){
  const queue=[[ax,ay]],seen=new Set([`${ax},${ay}`]);for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===bx&&y===by)return false;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=`${xx},${yy}`;if(xx<2||xx>=w||yy<ay||yy>by||yy===cut&&(()=>{const t=tracks.find(t=>t.id===layout.emitters.find(e=>e.y===cut).id);return (xx+.5)*32>=Math.min(t.x,t.endX)-half&&(xx+.5)*32<=Math.max(t.x,t.endX)+half;})()||!walk(xx,yy)||seen.has(k))continue;seen.add(k);queue.push([xx,yy]);}}}

 return true;
}
function certify(layout,physics={}){
 if(layout.mode==='fixed'&&layout.level<=2)return {pass:false,reason:'ineligible'};
 const q=layout.restriction;
 const opts={...(layout.objective&&layout.mode==='fixed'&&layout.level===4?{step:4,dtMs:50}:{}),...physics,timingMarginMs:layout.profile.margin};
 if(q)Object.assign(opts,{step:4,dtMs:40,spaceMargin:4,timingMarginMs:[250,220,180,150][layout.level-1],phaseTimes:true});
 // Axis lock is validator-only: no runtime input restrictions.
 if(q&&layout.mode==='open'){const x=layout.anchors[0].x,half=(opts.playerW??12)/2+opts.spaceMargin;opts.walkBounds={l:x-half,r:x+half,t:0,b:layout.footprint.h*32};}
 const a=validate(layout,opts);if(layout.objective){const obj=node?require('./ProjectileObjective'):root.BMProjectileObjective;if(!obj.check(layout,a.tracks,physics))return {pass:false,reason:'objective-unsafe'};}if(!a.pass)return {pass:false,reason:'traversal'};if(!checkRestriction(layout,a.tracks,physics))return {pass:false,reason:'restricted-composition'};
 let quality=null;
 if(q&&layout.mode==='open'){
  const limit=[9500,10000,11000,12000][layout.level-1];if(a.routes.some(r=>r.slowestMs>limit))return {pass:false,reason:'axis-too-slow'};
  const timing=continuousTiming(layout,a.tracks,physics),directLimit=OPEN_DIRECT_LIMIT[layout.level-1],roundTripLimit=OPEN_ROUND_LIMIT[layout.level-1];
  if(timing.routes.some(r=>r.directFraction>directLimit+1e-8||r.immediateRoundTripFraction>roundTripLimit+1e-8))return {pass:false,reason:'axis-too-permissive',timing};
  quality={axisOnly:true,step:opts.step,dtMs:opts.dtMs,spaceMargin:opts.spaceMargin,timingMarginMs:opts.timingMarginMs,period:layout.emitters[0].period,timing:{...timing,directLimit,roundTripLimit}};
 }
 if(layout.mode==='run'&&!runWindows(layout,a.tracks,opts).pass)return {pass:false,reason:'run-window'};
 if(layout.mode==='mobile'){const no=validate({...layout,mode:'mobileWithoutShield',movingBarriers:[]},{...physics,timingMarginMs:0,frameMarginMs:0,spaceMargin:0,step:4,dtMs:30});if(no.routes.some(q=>q.reachablePhases>0))return {pass:false,reason:'shield-bypass'};}
 if(layout.mode==='fixed'&&layout.level>=3){const w=layout.footprint.w,mid=(w+2)*16;for(const [l,r] of [[64,mid],[mid,w*32]]){const x=Math.round((l+r)/16)*8;const q=validate(layout,{...opts,anchors:layout.anchors.map(a=>({...a,x})),walkBounds:{l,r,t:0,b:layout.footprint.h*32}});if(!q.pass)return {pass:false,reason:'side-route'};}}
 return {pass:true,...(quality?{quality}:{}),phaseCount:a.phaseCount,routes:a.routes.map(({from,to,reachablePhases,totalPhases,fastestMs,slowestMs})=>({from,to,reachablePhases,totalPhases,fastestMs,slowestMs}))};
}
function generate(options,physics={},maxAttempts=4){if(!eligibility(options))return {pass:false,reason:'ineligible',attempts:0};const rejected=[];for(let i=0;i<maxAttempts;i++)try{const layout=candidate(options,i),certificate=certify(layout,physics);if(certificate.pass)return {pass:true,layout,certificate,attempts:i+1,rejected};rejected.push(certificate.reason);}catch(e){rejected.push(e.message);}return {pass:false,reason:'no-certified-layout',attempts:maxAttempts,rejected};}
const api={eligibility,candidate,certify,generate,checkRestriction,restrictedMode,continuousTiming};if(node)module.exports=api;else{root.BMProjectileLayoutGenerator=api;const p=new URLSearchParams(root.location.search);if(p.get('bmProjectileLab')==='1'&&p.has('bmProjectileSeed')){const options={mode:p.get('bmProjectileLayout')||'fixed',level:Number(p.get('bmProjectileLevel')||4),width:Number(p.get('bmProjectileWidth')||10),height:Number(p.get('bmProjectileHeight')||10),seed:Number(p.get('bmProjectileSeed')),divider:p.get('bmProjectileDivider')||'auto',objective:p.get('bmProjectileObjective')==='1',arrangement:p.get('bmProjectileArrangement')||undefined};const result=generate(options);root.BMProjectileGenerationResult=result;if(result.pass){lab.install(Scene,true,CollisionSystem,options.mode,options.level,result.layout);console.info('[BlueMoon] 5B.5',options,result.certificate);}else{console.warn('[BlueMoon] 5B.5 rejeitado',result);root.alert('Layout rejeitado: '+result.reason+'. Consulte o console.');}}}
})(typeof globalThis!=='undefined'?globalThis:this);
