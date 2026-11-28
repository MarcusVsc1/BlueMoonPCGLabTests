(function(){
'use strict';
// Continuous interval certificate for a straight run at constant speed.
// Hazard intervals in departure time are exact for horizontal constant-speed
// shots and a vertical straight trajectory; phase/frame uncertainty expands them.
function runWindows(layout,tracks,options={}){
 const r=layout.run;if(!r)throw Error('Expected sequential layout');
 const o={playerSpeed:135,hurtW:12,hurtH:12,projectileW:12,projectileH:12,spaceMargin:2,frameMarginMs:34,timingMarginMs:200,...options};
 const P=r.period, pad=(o.frameMarginMs+o.timingMarginMs)/1000, hx=(o.hurtW+o.projectileW)/2+o.spaceMargin,hy=(o.hurtH+o.projectileH)/2+o.spaceMargin;
 const travel=(r.bottom-r.top)/o.playerSpeed;
 const directions=[];
 for(const from of ['A','B']){
  const target=from==='A'?r.down:r.up, startY=from==='A'?r.top:r.bottom, blockers=[];
  for(const tr of tracks){
   if(!tr.dx||tr.dy)throw Error('Run certificate requires transverse projectiles');
   const crossing=Math.abs(tr.y-startY)/o.playerSpeed, v=hy/o.playerSpeed;
   const age=(r.x-tr.x)/(tr.dx*tr.speed), hw=hx/tr.speed;
   const lo=Math.max(0,age-hw),hi=Math.min(tr.duration,age+hw);
   if(lo>hi)continue;
   for(const offset of tr.offsets){
    const a=offset+lo-crossing-v-pad,b=offset+hi-crossing+v+pad;
    for(let k=Math.floor(-b/P);k<=Math.ceil((P-a)/P);k++){
     const l=Math.max(0,a+k*P),h=Math.min(P,b+k*P);if(h>=l)blockers.push([l,h]);
    }
   }
  }
  blockers.sort((a,b)=>a[0]-b[0]);let end=0;const windows=[];
  for(const [a,b] of blockers){if(a>end)windows.push([end,a]);end=Math.max(end,b);}
  if(end<P)windows.push([end,P]);
  // Require the entire cue interval to be strictly interior to a proven window.
  const cue=[target-r.cueHalf,target+r.cueHalf];
  const cueSafe=windows.some(([a,b])=>a<cue[0]-1e-8&&b>cue[1]+1e-8);
  directions.push({from,to:from==='A'?'B':'A',travelMs:travel*1000,cueMs:cue.map(t=>t*1000),cueSafe,windowsMs:windows.map(w=>w.map(t=>t*1000)),hasUnsafeDeparture:blockers.some(([a,b])=>b>a)});
 }
 return {pass:directions.every(d=>d.cueSafe&&d.hasUnsafeDeparture),directions,parameters:o};
}
if(typeof module==='object'&&module.exports)module.exports={runWindows};else globalThis.BMSequentialRunValidator={runWindows};

})();
