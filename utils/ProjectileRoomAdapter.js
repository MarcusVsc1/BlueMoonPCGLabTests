/* BM_PROJECTILE_ROOM_ADAPTER_5A1: read-only planning. No map or sprite mutation. */
(function(root){'use strict';
const node=typeof module==='object'&&module.exports;
const gen=node?require('./ProjectileLayoutGenerator'):root.BMProjectileLayoutGenerator;
const motion=node?require('./HostileProjectileLab'):root.BMHostileProjectileLab;
const Z=32, dirs=[[0,1],[-1,0],[1,0],[0,-1]], key=p=>`${p.x},${p.y}`;
const hub=t=>t.tipo==='hub'||t.subTipo==='Hub'||t.auxiliar==='Hub';
const sides=['bottom','right','top','left'];
function inspect(graph,room,role,{initialRoom,exitRoom,map}={}){
 const t=room.tag||{},cells=room.cells||[],terminals=room.terminalCells||[],w=room.roomWidth,h=room.roomHeight, b=cells[0];
 const bad=reason=>({pass:false,reason});
 if(!['corner','passage'].includes(role))return bad('role');
 if(room===initialRoom||room===exitRoom||t.tipo==='inicio'||hub(t))return bad('protected-role');
 if(role==='passage'&&(t.tipo!=='combatRoom'||t.subTipo!=='CombatRoom'||t.auxiliar!=='CombatRoom'||t.collectible!=null||room.restricoes?.length))return bad('existing-role');
 if(role==='corner'&&(!t.collectible||t.subTipo==='LeverAgent'||t.collectible.props?.subtipo==='alavanca'||t.collectible.props?.tipo==='alavanca'||t.collectible.props?.modelo==='alavanca'||t.collectible.imagem==='lever'||t.collectible.imagem==='alavanca'))return bad('reward');
 if(!b||!Number.isInteger(w)||!Number.isInteger(h)||Math.min(w,h)<6||Math.max(w,h)>10||cells.length!==w*h||new Set(cells.map(key)).size!==w*h||cells.some(c=>c.x<b.x||c.x>=b.x+w||c.y<b.y||c.y>=b.y+h))return bad('rectangle');
 if(map&&cells.some(c=>map[c.x]?.[c.y]?.tipo!==0||map[c.x]?.[c.y]?.bmAbyssTerrain))return bad('non-plain');
 const degree=graph.getNeighbors(room).length, edges=graph.getCorridorsFromRoom(room);
 if(degree!==(role==='corner'?1:2)||terminals.length!==degree||edges.length!==degree||new Set(terminals.map(key)).size!==degree)return bad('degree');
 const own=new Set(cells.map(key)), ports=[];
 const blockedOutside=(x,y)=>{const t=map?.[x]?.[y]?.tipo;return Number.isInteger(t)&&t>=6&&t!==8&&t!==9;};
 const restrictions=edges.filter(e=>e.restricoes?.length||e.tags?.length).map(e=>({from:e.fromRoom,to:e.toRoom,restrictions:e.restricoes?.length||0,tags:e.tags?.length||0}));
 for(const e of edges){
  if(role==='passage'&&(e.restricoes?.length||e.tags?.length))return {...bad('restricted-corridor'),restrictions};
  const p=e.fromRoom===room.roomId?e.cells?.[0]:e.toRoom===room.roomId?e.cells?.at(-1):null;
  if(!p||own.has(key(p))||map&&![0,4].includes(map[p.x]?.[p.y]?.tipo))return bad('external-portal');
  const ts=terminals.filter(c=>Math.abs(c.x-p.x)+Math.abs(c.y-p.y)===1&&own.has(key(c)));
  if(ts.length!==1)return bad('portal-contact');
  const c=ts[0], dx=p.x-c.x,dy=p.y-c.y,side=dy===1?'bottom':dx===1?'right':dy===-1?'top':'left';
  const corner=(c.x===b.x||c.x===b.x+w-1)&&(c.y===b.y||c.y===b.y+h-1);
  // Opening a corner requires a second boundary tile on the same end row.
  // Prove both new exterior contacts remain walls; otherwise do not carve.
  if(corner){
   const tx=dy?(c.x===b.x?1:-1):0,ty=dx?(c.y===b.y?1:-1):0;
   if(!blockedOutside(c.x-tx,c.y-ty)||!blockedOutside(c.x+tx+dx,c.y+ty+dy))return bad('corner-portal');
  }
  if(side==='bottom'&&c.y!==b.y+h-1||side==='top'&&c.y!==b.y||side==='right'&&c.x!==b.x+w-1||side==='left'&&c.x!==b.x)return bad('portal-side');
  ports.push({x:c.x-b.x,y:c.y-b.y,side,...(corner?{corner:true}: {})});
 }
 if(new Set(ports.map(key)).size!==degree)return bad('duplicate-portal');
 if(role==='passage'&&((sides.indexOf(ports[0].side)+2)%4!==sides.indexOf(ports[1].side)))return bad('non-opposite');
 return {pass:true,role,w,h,base:{x:b.x,y:b.y},ports};
}
// Local canonical coordinates have entry B on bottom. Rotations preserve the
// certified geometry; horizontal moving shields use the same canonical clock.
function transform(info,side,mirror=false){
 const k=sides.indexOf(side), W=k%2?info.h:info.w,H=k%2?info.w:info.h;
 const forward=(x,y,unit=1)=>{const a=x-unit,b=y;return k===0?{x:a,y:b}:k===1?{x:b,y:W*unit-a-(unit===1?1:0)}:k===2?{x:W*unit-a-(unit===1?1:0),y:H*unit-b-(unit===1?1:0)}:{x:H*unit-b-(unit===1?1:0),y:a};};
 // Use separate center/pixel transform so boundaries do not incur tile off-by-one.
 const pixel=(x,y)=>{const a=(mirror?(W+2)*Z-x:x)-Z,b=y;return k===0?{x:a,y:b}:k===1?{x:b,y:W*Z-a}:k===2?{x:W*Z-a,y:H*Z-b}:{x:H*Z-b,y:a};};
 const tile=(x,y)=>forward(mirror?W+1-x:x,y);
 const inv=(x,y)=>k===0?{x:x+1,y}:k===1?{x:W-y,y:x}:k===2?{x:W-x,y:H-1-y}:{x:y+1,y:H-1-x};
 const inverse=(x,y)=>{const p=inv(x,y);return {x:mirror?W+1-p.x:p.x,y:p.y};};
 const direction=d=>{const [rawX,y]=dirs[d],x=mirror?-rawX:rawX;const v=k===0?[x,y]:k===1?[y,-x]:k===2?[-x,-y]:[-y,x];return dirs.findIndex(q=>q[0]===v[0]&&q[1]===v[1]);};
 return {W,H,k,mirror,tile,pixel,inverse,direction};
}
function prepare(info,opts,physics={},mirror=false){
 if(!info.pass)return info;
 const role=info.role,side=info.ports[0].side,tr=transform(info,side,mirror), {W,H}=tr;
 const options={...opts,width:W,height:H,objective:role==='corner'};
 if(!gen.eligibility(options))return {pass:false,reason:'ineligible-profile'};
 const ports=info.ports.map(p=>({...tr.inverse(p.x,p.y),corner:p.corner===true}));
 // The waiting strip must connect the actual portal to the certified anchor.
 // Mobile rail can enter a waiting strip: do not assume it can be crossed safely.
 function connect(layout){
  const extra=[];
  for(const p of ports){
   const bottom=p.y===H-1, anchor=layout.anchors.find(a=>a.id===(bottom?'B':'A'));
   if(!anchor||(!bottom&&p.y!==0))return null;
   const x=(p.x+.5)*Z,y=(p.y+.5)*Z,half=(physics.playerW??12)/2+(physics.spaceMargin??2),innerY=bottom?H-2:1;
   const entryX=p.corner?(p.x===1?2:p.x===W?W-1:null):p.x;
   if(entryX===null||entryX<2||entryX>W-1)return null;
   const at=(x,y)=>layout.tiles.find(t=>t.x===x&&t.y===y);
   const tile=at(p.x,p.y),inner=at(entryX,innerY),adjacent=at(entryX,p.y);
   if(!tile||!adjacent||!inner||![0,2].includes(inner.tipo))return null;
   // Check the whole L-shaped approach against the rail envelope (conservative).
   if((layout.movingBarriers||[]).some(b=>Math.min(x,anchor.x)-half<=b.x+b.w/2&&Math.max(x,anchor.x)+half>=b.x-b.w/2))return null;
   tile.tipo=0;if(p.corner)adjacent.tipo=0;
   // Verify all cells touched by the player along each axis-aligned leg.
   const way=[{x,y},{x:(entryX+.5)*Z,y},{x:(entryX+.5)*Z,y:anchor.y},anchor];
   const hy=(physics.playerH??12)/2+(physics.spaceMargin??2);
   for(let i=1;i<way.length;i++){
    const a=way[i-1],b=way[i];
    for(let tx=Math.floor((Math.min(a.x,b.x)-half)/Z);tx<=Math.floor((Math.max(a.x,b.x)+half)/Z);tx++)for(let ty=Math.floor((Math.min(a.y,b.y)-hy)/Z);ty<=Math.floor((Math.max(a.y,b.y)+hy)/Z);ty++)if(![0,2].includes(at(tx,ty)?.tipo))return null;
   }
   extra.push({id:bottom?'portal-B':'portal-A',x,y});
  }
  return extra;
 }
 const rejected=[];
 for(let attempt=0;attempt<4;attempt++)try{
  const layout=gen.candidate(options,attempt),extra=connect(layout);if(!extra){rejected.push('unsafe-portal-approach');continue;}
  const certificate=gen.certify(layout,physics);if(!certificate.pass){rejected.push(certificate.reason);continue;}
  // All approaches lie in the firing-free end rows. With no rail crossing,
  // a cardinal path exists between portal center and the existing safe anchor.
  const minY=Math.min(...layout.emitters.map(e=>(e.y+.5)*Z)),maxY=Math.max(...layout.emitters.map(e=>(e.y+.5)*Z));
  const margin=((physics.hurtH??12)+(physics.projectileH??12))/2+2;
  if(minY-layout.anchors[0].y<=margin||layout.anchors[1].y-maxY<=margin){rejected.push('unsafe-wait-strip');continue;}
  // Only the original room footprint is returned (no padded lobby tiles).
  const tileWorld=(x,y)=>{const q=tr.tile(x,y);return {x:q.x+info.base.x,y:q.y+info.base.y};};
  const pixelWorld=(x,y)=>{const q=tr.pixel(x,y);return {x:q.x+info.base.x*Z,y:q.y+info.base.y*Z};};
  const tiles=layout.tiles.filter(t=>t.x>=1&&t.x<=W&&t.y>=0&&t.y<H).map(t=>({...tileWorld(t.x,t.y),tipo:t.tipo}));
  const emitters=layout.emitters.map(e=>({...e,...tileWorld(e.x,e.y),direction:tr.direction(e.direction)}));
  const anchors=layout.anchors.concat(extra).map(a=>({id:a.id,...pixelWorld(a.x,a.y)}));
  const guards=(layout.objective?.guards||[]).map(g=>({...g,...tileWorld(g.x,g.y)}));
  const reward=layout.objective?{...pixelWorld((layout.objective.reward.x+.5)*Z,(layout.objective.reward.y+.5)*Z)}:null;
  const movingBarriers=(layout.movingBarriers||[]).map(b=>({id:b.id,start:pixelWorld(b.x,b.yMax),end:pixelWorld(b.x,b.yMin),w:tr.k%2?b.h:b.w,h:tr.k%2?b.w:b.h,speed:b.speed,pause:b.pause,phase:b.phase}));
  return {pass:true,role,mode:layout.mode,level:layout.level,seed:layout.seed,attempts:attempt+1,orientation:side,mirrored:mirror,tiles,emitters,anchors,guards,reward,movingBarriers,canonical:layout,certificate,rejected};
 }catch(e){rejected.push(String(e.message||e));}
 return {pass:false,reason:'no-certified-layout',rejected};
}
const modes=['open','fixed','mobile','run'];
function compatibleModes(info,opts){if(!info.pass)return [];const {W,H}=transform(info,info.ports[0].side);return modes.filter(mode=>gen.eligibility({...opts,mode,width:W,height:H,objective:info.role==='corner'}));}
function prepareAny(info,opts,physics={}){
 if(!info.pass)return info;
 const compatible=compatibleModes(info,opts),order=compatible.slice(),trials=[];
 // Keep the old seed permutation for surviving modes: the removed slot only
 // participates in ranking, never in compatibility, generation or retries.
 if(opts.level<=2&&compatible.includes('open'))order.splice(order.indexOf('open')+1,0,'fixed');
 // Private deterministic RNG, independent of the dungeon generator. Draw without replacement.
 let state=opts.seed>>>0;const next=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
 for(let i=order.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 if(opts.level<=2){const retired=order.indexOf('fixed');if(retired!==-1)order.splice(retired,1);}
 for(const mode of order){
  for(const mirrored of mode==='mobile'?[false,true]:[false]){
   const p=prepare(info,{...opts,mode},physics,mirrored);trials.push({mode,mirrored,pass:p.pass,reason:p.reason,rejected:p.rejected});
   if(p.pass)return {...p,compatible,order,trials};
  }
 }
 return {pass:false,reason:compatible.length?'no-certified-layout':'ineligible-profile',compatible,order,trials};
}
const api={inspect,prepare,transform,compatibleModes,prepareAny};if(node)module.exports=api;else root.BMProjectileRoomAdapter=api;
})(typeof globalThis!=='undefined'?globalThis:this);
