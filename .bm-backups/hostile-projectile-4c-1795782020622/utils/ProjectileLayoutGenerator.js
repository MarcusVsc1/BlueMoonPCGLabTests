/* BM_PROJECTILE_LAYOUT_GENERATOR_4B */
(function(root){
'use strict';
const node=typeof module==='object'&&module.exports;
const lab=node?require('./HostileProjectileLab'):root.BMHostileProjectileLab;
const {validate}=node?require('./ProjectileTraversalValidator'):root.BMProjectileTraversalValidator;
const {runWindows}=node?require('./SequentialRunValidator'):root.BMSequentialRunValidator;
const modes=['open','fixed','mobile','run'];
function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
function eligibility({width:w,height:h,level,mode,divider='auto'}){
 if(![w,h,level].every(Number.isInteger)||w<6||h<6||w>10||h>10||level<1||level>4||!modes.includes(mode))return false;
 if(!['auto','wall','pit','mixed'].includes(divider)||divider!=='auto'&&(mode!=='fixed'||level<3))return false;
 const p=lab.PROFILES[level-1],n=h-4;
 if(mode==='fixed'&&level>=3)return w>=8&&n>=p.lines&&(divider==='auto'||divider==='wall'&&w%2===0||['pit','mixed'].includes(divider)&&w%2===1);
 if(mode==='mobile')return w>=8&&h>=8;
 return n>=(mode==='run'?p.runLines:p.lines);
}
function candidate(o,attempt=0){
 const {width:w,height:h,level,mode,seed}=o;
 if(!eligibility(o)||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Geometria, nivel, divisor ou seed inelegivel.');
 const r=rng((seed+Math.imul(attempt+1,0x9e3779b9))>>>0),p=lab.PROFILES[level-1],left=1,right=w,bottom=h-2,first=2,last=h-3;
 const rows=Array.from({length:h-4},(_,i)=>i+first),n=mode==='mobile'?rows.length:mode==='run'?p.runLines:p.lines;
 let lanes=[...rows];while(lanes.length>n)lanes.splice(1+Math.floor(r()*(lanes.length-2)),1);
 const side=r()<.5?0:1,phase=Math.floor(r()*10)*.01;
 let divider='none',barriers=[],pits=[];
 if(mode==='fixed'){
  if(level>=3){divider=o.divider&&o.divider!=='auto'?o.divider:w%2===0?'wall':r()<.5?'pit':'mixed';const mid=Math.floor((left+right)/2);
   for(const y of rows){const alt=(y-first+side)%2;if(w%2===0)barriers.push({x:mid+alt,y});else{if(divider==='mixed'&&(y-first)%2===0)barriers.push({x:mid,y});else pits.push({x:mid,y});barriers.push({x:mid+(alt?1:-1),y});}}
  }else{const cx=Math.floor((left+right)/2);for(const [i,y] of lanes.entries())if(i%2===0&&i<lanes.length-1)barriers.push({x:cx+(w>=8&&r()<.5?1:0),y});}
 }
 const has=(a,x,y)=>a.some(b=>b.x===x&&b.y===y),tiles=[];
 for(let x=0;x<13;x++)for(let y=0;y<10;y++)tiles.push({x,y,tipo:x<=left||x>=right||y===0||y>=h-1||has(barriers,x,y)?6:has(pits,x,y)?8:y===1||y===bottom?2:0});
 const dense=mode==='mobile'||mode==='run',center=(left+right+1)*16,top=48,end=(bottom+.5)*32,x=mode==='mobile'?80:center;
 const run=mode==='run'?{...lab.RUN,x,top,bottom:end,gapHalf:p.gapHalf,cueHalf:p.cueHalf,down:1+phase,up:5+phase}:null;
 const movingBarriers=mode==='mobile'?[{...lab.MOBILE,yMin:(first+.5)*32,yMax:(last+.5)*32,h:p.shieldH,pause:p.pause,speed:((last-first)*32)/p.travel,phase:0}]:[];
 const emitters=lanes.map((y,i)=>{const direction=dense?1:level===1?(side?1:2):mode==='fixed'&&level>=3?((y-first+side)%2?1:2):((i+side)%2?1:2),ex=direction===1?right:left;
 const d={id:mode+(i+1),x:ex,y,direction,period:p.period,phase:(i*p.phaseStep+phase+Math.floor(r()*9)*.01)%p.period,speed:140,muzzle:24};
 if(mode==='mobile')Object.assign(d,{period:.15,phase:(i*.025+phase)%.15});
 if(run){const wy=(y+.5)*32,flight=((ex+.5)*32-24-run.x)/d.speed,quiet=[run.down+(wy-run.top)/run.speed-flight,run.up+(run.bottom-wy)/run.speed-flight];const dist=(a,b)=>Math.abs(((a-b+4)%8+8)%8-4);const offsets=Array.from({length:80},(_,k)=>k/10).filter(t=>quiet.every(q=>dist(t,q)>=run.gapHalf-1e-8));Object.assign(d,{period:8,phase:offsets[0],offsets});}return d;});
 return {mode,level,seed,attempt,divider,profile:p,tiles,emitters,barriers,pits,movingBarriers,anchors:[{id:'A',x,y:top},{id:'B',x,y:end}],...(run?{run}:{}),footprint:{x:1,y:0,w,h}};
}
function certify(layout,physics={}){
 const opts={...physics,timingMarginMs:layout.profile.margin},a=validate(layout,opts);if(!a.pass)return {pass:false,reason:'traversal'};
 if(layout.mode==='run'&&!runWindows(layout,a.tracks,opts).pass)return {pass:false,reason:'run-window'};
 if(layout.mode==='mobile'){const no=validate({...layout,mode:'mobileWithoutShield',movingBarriers:[]},{...physics,timingMarginMs:0,frameMarginMs:0,spaceMargin:0,step:4,dtMs:30});if(no.routes.some(q=>q.reachablePhases>0))return {pass:false,reason:'shield-bypass'};}
 if(layout.mode==='fixed'&&layout.level>=3){const w=layout.footprint.w,mid=(w+2)*16;for(const [l,r] of [[64,mid],[mid,w*32]]){const x=Math.round((l+r)/16)*8;const q=validate(layout,{...opts,anchors:layout.anchors.map(a=>({...a,x})),walkBounds:{l,r,t:0,b:layout.footprint.h*32}});if(!q.pass)return {pass:false,reason:'side-route'};}}
 return {pass:true,phaseCount:a.phaseCount,routes:a.routes.map(({from,to,reachablePhases,totalPhases,fastestMs,slowestMs})=>({from,to,reachablePhases,totalPhases,fastestMs,slowestMs}))};
}
function generate(options,physics={},maxAttempts=4){if(!eligibility(options))return {pass:false,reason:'ineligible',attempts:0};const rejected=[];for(let i=0;i<maxAttempts;i++)try{const layout=candidate(options,i),certificate=certify(layout,physics);if(certificate.pass)return {pass:true,layout,certificate,attempts:i+1,rejected};rejected.push(certificate.reason);}catch(e){rejected.push(e.message);}return {pass:false,reason:'no-certified-layout',attempts:maxAttempts,rejected};}
const api={eligibility,candidate,certify,generate};if(node)module.exports=api;else{root.BMProjectileLayoutGenerator=api;const p=new URLSearchParams(root.location.search);if(p.get('bmProjectileLab')==='1'&&p.has('bmProjectileSeed')){const options={mode:p.get('bmProjectileLayout')||'fixed',level:Number(p.get('bmProjectileLevel')||4),width:Number(p.get('bmProjectileWidth')||10),height:Number(p.get('bmProjectileHeight')||10),seed:Number(p.get('bmProjectileSeed')),divider:p.get('bmProjectileDivider')||'auto'};const result=generate(options);root.BMProjectileGenerationResult=result;if(result.pass){lab.install(Scene,true,CollisionSystem,options.mode,options.level,result.layout);console.info('[BlueMoon] 4B',options,result.certificate);}else{console.warn('[BlueMoon] 4B rejeitado',result);root.alert('Layout rejeitado: '+result.reason+'. Consulte o console.');}}}
})(typeof globalThis!=='undefined'?globalThis:this);
