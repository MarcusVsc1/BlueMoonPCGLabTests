/* BM_HOSTILE_PROJECTILE_LAB_4B -- opt-in static, mobile and sequential traversal lab, no procedural integration. */
(function(root) {
    'use strict';
    const EPS = 1e-8;
    const DIRECTIONS = Object.freeze([{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:0,y:-1}]);
    // Tile coordinates; original gargoyle sprite. Avoid the six selection crystals.
    const LAYOUT = Object.freeze([
        {id:'east', x:1, y:3, direction:2, period:1.5, phase:0.45},
        {id:'west', x:11,y:6, direction:1, period:1.5, phase:1.20},
        {id:'south',x:5,y:1, direction:0, period:2.0, phase:0.75},
        {id:'north',x:7,y:8, direction:3, period:2.0, phase:1.50}
    ].map(d => Object.freeze({...d, speed:140})));
    // Dedicated test arenas use the actual 13x10 lobby grid. The ordinary lobby
    // and the 1B four-direction demonstration remain separate.
    const LANES = Object.freeze([
        {id:'lane1',x:1,y:2,direction:2,period:1.5,phase:.45},
        {id:'lane2',x:11,y:4,direction:1,period:1.5,phase:1.2},
        {id:'lane3',x:1,y:5,direction:2,period:2,phase:.75},
        {id:'lane4',x:11,y:7,direction:1,period:2,phase:1.5}
    ].map(d=>Object.freeze({...d,speed:140,muzzle:24})));
    const FIXED = Object.freeze([{x:6,y:2},{x:6,y:4},{x:5,y:7}].map(Object.freeze));
    const MOBILE_LANES = Object.freeze(Array.from({length:6},(_,i)=>Object.freeze({id:'mobile'+(i+1),x:8,y:2+i,direction:1,period:.15,phase:i*.025,speed:140,muzzle:24})));
    // Six transverse fire streams. Each opens two independent quiet windows,
    // propagating first A->B and then B->A. All times refer to the same clock.
    // Aim the quiet windows at the reference running line, compensating travel time.
    const RUN = Object.freeze({period:8,x:144,top:48,bottom:272,speed:135,down:1,up:5,cueHalf:.25,gapHalf:.8,pulse:.1});
    const circularDistance=(a,b,p)=>Math.abs(((a-b+p/2)%p+p)%p-p/2);
    const RUN_LANES=Object.freeze(Array.from({length:6},(_,i)=>{
        const y=2+i, worldY=(y+.5)*32, flight=(248-RUN.x)/140;
        const quiet=[RUN.down+(worldY-RUN.top)/RUN.speed-flight,RUN.up+(RUN.bottom-worldY)/RUN.speed-flight];
        const offsets=Array.from({length:80},(_,k)=>k/10).filter(t=>quiet.every(q=>circularDistance(t,q,RUN.period)>=RUN.gapHalf-EPS));
        return Object.freeze({id:'run'+(i+1),x:8,y,direction:1,period:RUN.period,phase:offsets[0],offsets:Object.freeze(offsets),speed:140,muzzle:24});
    }));
    function shotOffsets(d){return d.offsets||[d.phase];}
    function emissionAt(d,index){const offsets=shotOffsets(d);return Math.floor(index/offsets.length)*d.period+offsets[((index%offsets.length)+offsets.length)%offsets.length];}
    function runCue(t,from,r=RUN){return circularDistance(t,from==='A'?r.down:r.up,r.period)<=r.cueHalf+EPS;}
    // World coordinates (32px lobby tiles). Independent triangular motion with endpoint pauses.
    const MOBILE = Object.freeze({id:'shield',x:112,yMin:80,yMax:240,w:24,h:88,speed:40,pause:.5,phase:0});
    function barrierTravel(b){return b.start?Math.hypot(b.end.x-b.start.x,b.end.y-b.start.y)/b.speed:(b.yMax-b.yMin)/b.speed;}
    function barrierPeriod(b){return 2*(barrierTravel(b)+b.pause);}
    function barrierAt(b,t){
        const travel=barrierTravel(b), period=barrierPeriod(b);
        let q=((t+b.phase)%period+period)%period;
        if(b.start){const f=q<b.pause?0:q<b.pause+travel?(q-b.pause)/travel:q<2*b.pause+travel?1:1-(q-2*b.pause-travel)/travel;return {id:b.id,x:b.start.x+(b.end.x-b.start.x)*f,y:b.start.y+(b.end.y-b.start.y)*f,w:b.w,h:b.h};}
        let y=q<b.pause?b.yMax:q<b.pause+travel?b.yMax-(q-b.pause)*b.speed:q<2*b.pause+travel?b.yMin:b.yMin+(q-2*b.pause-travel)*b.speed;
        return {id:b.id,x:b.x,y,w:b.w,h:b.h};
    }
    function barrierSegments(b,start,end){
        const travel=barrierTravel(b), period=barrierPeriod(b), cuts=[start,end];
        for(let k=Math.floor((start+b.phase)/period)-1;k<=Math.ceil((end+b.phase)/period)+1;k++)for(const offset of [0,b.pause,b.pause+travel,2*b.pause+travel]){
            const t=k*period+offset-b.phase;if(t>start+EPS&&t<end-EPS)cuts.push(t);
        }
        cuts.sort((a,b)=>a-b);
        return cuts.slice(1).map((t,i)=>({start:cuts[i],end:t,a:barrierAt(b,cuts[i]),b:barrierAt(b,t)}));
    }
    // Continuous relative sweep, including direction reversals within a frame.
    function relativeSweep(a,dx,dy,b){
        let lo=0,hi=1;
        for(const [p,d,c,r] of [[a.x,dx,b.x,(a.w+b.w)/2],[a.y,dy,b.y,(a.h+b.h)/2]]){
            if(Math.abs(d)<EPS){if(p<=c-r||p>=c+r)return null;continue;}
            let l=(c-r-p)/d,h=(c+r-p)/d;if(l>h)[l,h]=[h,l];lo=Math.max(lo,l);hi=Math.min(hi,h);if(lo>=hi-EPS)return null;
        }
        return lo>=0&&lo<1?lo:null;
    }
    function movingHit(a,vx,vy,start,end,barriers){
        if(end<=start+EPS)return null;
        let best=null;
        for(const barrier of barriers)for(const seg of barrierSegments(barrier,start,end)){
            const dt=seg.end-seg.start, offset=seg.start-start;
            const p={...a,x:a.x+vx*offset,y:a.y+vy*offset};
            const hit=relativeSweep(p,vx*dt-(seg.b.x-seg.a.x),vy*dt-(seg.b.y-seg.a.y),seg.a);
            if(hit!==null){const t=seg.start+hit*dt;if(best===null||t<best)best=t;}
        }
        return best;
    }
    function barrierEnvelope(b,start,end){
        if(b.start){const points=[barrierAt(b,start),barrierAt(b,end)];for(const s of barrierSegments(b,start,end))points.push(s.a,s.b);const xs=points.map(p=>p.x),ys=points.map(p=>p.y),l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),bot=Math.max(...ys);return {x:(l+r)/2,y:(t+bot)/2,w:b.w+r-l,h:b.h+bot-t};}
        const ys=[barrierAt(b,start).y,barrierAt(b,end).y];for(const s of barrierSegments(b,start,end))ys.push(s.a.y,s.b.y);
        const min=Math.min(...ys),max=Math.max(...ys);return {x:b.x,y:(min+max)/2,w:b.w,h:b.h+max-min};
    }
    // Optional test profiles. These consume the existing level (1..4), not a new difficulty system.
    // The padded 13x10 lobby hosts a bounded 10x10 test footprint, x=1..10.
    const PROFILES = Object.freeze([
        {lines:3,period:2.0,phaseStep:.4,shieldH:88,travel:4,pause:.5,gapHalf:.8,cueHalf:.25,runLines:4,margin:200},
        {lines:4,period:1.5,phaseStep:.3,shieldH:80,travel:3.2,pause:.4,gapHalf:.65,cueHalf:.18,runLines:5,margin:150},
        {lines:5,period:1.2,phaseStep:.2,shieldH:72,travel:2.5,pause:.5,gapHalf:.55,cueHalf:.12,runLines:6,margin:100},
        {lines:6,period:.9,phaseStep:.15,shieldH:64,travel:2.4,pause:.6,gapHalf:.45,cueHalf:.08,runLines:6,margin:60}
    ].map(Object.freeze));
    function profileLayout(mode,level){
        if(!Number.isInteger(level)||level<1||level>4||!['open','fixed','mobile','run'].includes(mode))throw Error('Invalid projectile test profile');
        const p=PROFILES[level-1], dense=mode==='mobile'||mode==='run', right=dense?8:10;
        const rows=n=>Array.from({length:n},(_,i)=>2+Math.round(i*5/(n-1)));
        const lanes=rows(mode==='mobile'?6:mode==='run'?p.runLines:p.lines);
        // High-level fixed rooms: centered, corner-touching zigzag (two central columns).
        // Equal 3-tile clear side corridors; no continuous central passage.
        const fixed=mode!=='fixed'?[]:level>=3?Array.from({length:6},(_,i)=>({x:5+i%2,y:2+i})):lanes.slice(0,-1).filter((_,i)=>i%2===0).map(y=>({x:5,y}));
        const tiles=[];
        for(let x=0;x<13;x++)for(let y=0;y<10;y++)tiles.push({x,y,tipo:x<=1||x>=right||y===0||y===9||fixed.some(b=>b.x===x&&b.y===y)?6:y===1||y===8?2:0});
        const run=mode==='run'?{...RUN,gapHalf:p.gapHalf,cueHalf:p.cueHalf}:null;
        const moving=mode==='mobile'?[{...MOBILE,h:p.shieldH,speed:160/p.travel,pause:p.pause}]:[];
        const emitters=lanes.map((y,i)=>{
            const direction=dense?1:(level===1||i%2===0?2:1),x=direction===1?right:1;
            const d={id:mode+(i+1),x,y,direction,period:p.period,phase:(i*p.phaseStep)%p.period,speed:140,muzzle:24};
            if(mode==='mobile')Object.assign(d,{period:.15,phase:i*.025});
            if(run){const worldY=(y+.5)*32,flight=((x+.5)*32-24-run.x)/d.speed;
                const quiet=[run.down+(worldY-run.top)/run.speed-flight,run.up+(run.bottom-worldY)/run.speed-flight];
                const offsets=Array.from({length:80},(_,k)=>k/10).filter(t=>quiet.every(q=>circularDistance(t,q,run.period)>=run.gapHalf-EPS));
                Object.assign(d,{period:run.period,phase:offsets[0],offsets});}
            return d;
        });
        const x=mode==='mobile'?80:mode==='run'?run.x:mode==='fixed'&&level>=3?192:176;
        return {mode,level,profile:p,tiles,emitters,barriers:fixed,movingBarriers:moving,anchors:[{id:'A',x,y:48},{id:'B',x,y:272}],...(run?{run}:{}),footprint:{x:1,y:0,w:right,h:10}};
    }
    function layoutFor(mode,level=null) {
        if(level!==null)return profileLayout(mode,level);
        if(mode==='classic') return {mode,emitters:LAYOUT,tiles:[],barriers:[]};
        if(!['open','fixed','mobile','run'].includes(mode)) throw Error('Unknown projectile layout: '+mode);
        const barriers=mode==='fixed'?FIXED:[], tiles=[];
        for(let x=0;x<13;x++)for(let y=0;y<10;y++) {
            const boundary=x<=1||x>=(['mobile','run'].includes(mode)?8:11)||y===0||y===9;
            const shield=barriers.some(b=>b.x===x&&b.y===y);
            tiles.push({x,y,tipo:boundary||shield?6:y===1||y===8?2:0});
        }
        if(mode==='run')return {mode,emitters:RUN_LANES,tiles,barriers,anchors:[{id:'A',x:RUN.x,y:RUN.top},{id:'B',x:RUN.x,y:RUN.bottom}],run:RUN};
        return mode==='mobile'?{mode,emitters:MOBILE_LANES,tiles,barriers,movingBarriers:[MOBILE],anchors:[{id:'A',x:80,y:48},{id:'B',x:80,y:272}]}:{mode,emitters:LANES,tiles,barriers};
    }
    function applyTiles(map,layout) {
        if(!layout.tiles.length)return [];
        if(map.COLUMNS!==13||map.LINES!==10||!layout.tiles.every(t=>map.cells?.[t.x]?.[t.y] && Number.isFinite(map.cells[t.x][t.y].tipo))) throw Error('Projectile lab requires the 13x10 lobby grid.');
        const changes=layout.tiles.map(t=>({cell:map.cells[t.x][t.y],before:map.cells[t.x][t.y].tipo,after:t.tipo}));
        for(const c of changes)c.cell.tipo=c.after;
        return changes;
    }
    function restoreTiles(changes) {for(const c of changes)if(c.cell.tipo===c.after)c.cell.tipo=c.before;}
    function hidePortals(scene,st) {
        if(st.mode==='classic'||!Array.isArray(scene.spritesTP))return;
        // Repeated gameDefiner calls must not re-enable portals inside the arena.
        if(st.portalList!==scene.spritesTP){st.portalList=scene.spritesTP;st.portals=[];}
        for(const p of scene.spritesTP)if(!st.portals.includes(p))st.portals.push(p);
        scene.spritesTP.length=0;
    }
    function trackTraversal(scene,st) {
        if(st.mode==='classic')return;
        if(scene.pc.atravessa===1){st.lastEnd=null;st.lastEndHP=null;return;}
        const z=scene.map.SIZE||32, x=Math.floor(scene.pc.x/z),y=Math.floor(scene.pc.y/z);
        const top=st.layout.anchors?Math.floor(st.layout.anchors[0].y/z):1;
        const end=x>=2&&x<=(st.level?st.layout.footprint.w-1:['mobile','run'].includes(st.mode)?7:10)&&(y===top||y===(st.layout.footprint?st.layout.footprint.h-2:8))?y:null;
        if(end!==null&&end!==st.lastEnd){
            if(st.lastEnd!==null){const direction=end===top?'ida':'volta';st.traversals[direction]++;if(scene.pc.vidas>=st.lastEndHP)st.traversals[direction+'SemDano']++;}
            st.lastEnd=end;st.lastEndHP=scene.pc.vidas;
        } else if(end!==null)st.lastEndHP=Math.max(st.lastEndHP,scene.pc.vidas);
    }
    class ShotClock {
        constructor(layout = LAYOUT) {
            this.time = 0;
            this.entries = layout.map(d => {
                if (!Number.isFinite(d.period) || d.period <= 0 || !Number.isFinite(d.phase) || d.phase < 0 || !DIRECTIONS[d.direction]) throw new Error('Invalid emitter timing/direction');
                const offsets=shotOffsets(d);if(!offsets.length||offsets.some((v,i)=>!Number.isFinite(v)||v<0||(d.offsets&&(v>=d.period||i>0&&v<=offsets[i-1]))))throw Error('Invalid emission offsets');
                return {d, count:0};
            });
        }
        advance(dt) {
            if (!Number.isFinite(dt) || dt <= 0) return [];
            const end = this.time + dt, events = [];
            for (const e of this.entries) {
                let at = emissionAt(e.d,e.count);
                while (at <= end + EPS) {
                    events.push({emitter:e.d, at, age:Math.max(0,end-at)});
                    e.count++;
                    at = emissionAt(e.d,e.count);
                }
            }
            this.time = end;
            return events.sort((a,b) => a.at-b.at || a.emitter.id.localeCompare(b.emitter.id));
        }
    }
    const isLab = s => s.stageIndex === 1 && s.map && (!s.gamer?.estagios?.[1]?.mapa || s.gamer.estagios[1].mapa===s.map) && s.pc && s.pc.vidas > 0;
    const owned = p => p?.props?.bmDamageOrigin === 'hostileProjectileLab';
    const states = new WeakMap(); // laboratory only
    const dungeonStates = new WeakMap(), projectileStates = new WeakMap();
    const allStates = scene => [...(states.has(scene)?[states.get(scene)]:[]),...(dungeonStates.get(scene)||[])];
    const activeStates = scene => allStates(scene).filter(st=>scene.stageIndex===(st.dungeon?0:1)&&st.map===scene.map&&st.pc===scene.pc);
    const owner = (scene,p) => projectileStates.get(p)||activeStates(scene)[0];
    const objectiveApi=()=>typeof module==='object'&&module.exports?require('./ProjectileObjective'):root.BMProjectileObjective;
    function reset(scene) {
        for(const previous of allStates(scene)){
            if(previous.objectiveState)objectiveApi().cleanup(scene,previous.objectiveState);
            restoreTiles(previous.changes);
            if(scene.stageIndex===1&&scene.map===previous.map&&previous.portalList===scene.spritesTP)for(const p of previous.portals)if(!scene.spritesTP.includes(p))scene.spritesTP.push(p);
        }
        states.delete(scene);dungeonStates.delete(scene);
        if(owned(scene._bmFatalWitchExplosion))delete scene._bmFatalWitchExplosion;
        for (const list of [scene.spritesTE,scene.spritesXP,scene.toRemove]) {
            if (!Array.isArray(list)) continue;
            for (let i=list.length-1;i>=0;i--) if (owned(list[i])) list.splice(i,1);
        }
    }
    function state(scene,mode,C,level=null,custom=null) {
        let st = states.get(scene);
        if (st && st.map === scene.map && st.pc === scene.pc) {hidePortals(scene,st);return st;}
        reset(scene);
        const z = scene.map.SIZE || 32;
        const layout=custom||layoutFor(mode,level),changes=applyTiles(scene.map,layout);
        st = {mode,level,layout,map:scene.map,pc:scene.pc,changes,barriers:layout.barriers,movingBarriers:layout.movingBarriers||[],motion:null,lastAudible:-Infinity,prefilled:0,portals:[],portalList:null, clock:new ShotClock(layout.emitters), shots:0, impacts:0, impactKinds:{}, traversals:{ida:0,volta:0,idaSemDano:0,voltaSemDano:0},lastEnd:null,lastEndHP:null,emitters:layout.emitters.map(d => {
            const sprite = new Sprite({x:(d.x+.5)*z,y:(d.y+.5)*z,w:20,h:20,vm:0,direcao:d.direction,imgX:0,imgY:0,imagem:'gargoyle',renderOffset:{x:-15,y:-15},props:{tipo:'bmHostileEmitter'}});
            sprite.scene=scene;
            return {d,sprite};
        })};
        states.set(scene,st);
        hidePortals(scene,st);
        if(mode!=='classic'){
            scene.pc.x=layout.anchors?.[1].x??6.5*z;scene.pc.y=layout.anchors?.[1].y??8.5*z;scene.pc.vx=scene.pc.vy=0;C.sync(scene.pc,scene.map);
            trackTraversal(scene,st);
            if(mode==='mobile'||mode==='run')prewarm(scene,st,C);
            if(layout.objective)st.objectiveState=objectiveApi().spawn(scene,layout.objective,C);
        }
        return st;
    }
    // Local source gain, in tiles. The spike effects use similar volume levels;
    // interpolate continuously between them and do not allocate a channel at zero.
    const SHOT_GAIN = Object.freeze([[2,.8],[4,.4],[5,.25],[6,.17],[8,0]].map(Object.freeze));
    function shotVolume(pc,source,tile=32) {
        const distance=Math.hypot(pc.x-source.x,pc.y-source.y)/tile;
        if(!Number.isFinite(distance)||distance>=8)return 0;
        if(distance<=2)return .8;
        for(let i=1;i<SHOT_GAIN.length;i++){
            const [a,v]=SHOT_GAIN[i-1], [b,w]=SHOT_GAIN[i];
            if(distance<=b)return v+(w-v)*(distance-a)/(b-a);
        }
        return 0;
    }
    function fire(scene,st,event,quiet=false) {
        const e = st.emitters.find(e => e.d === event.emitter);
        const d = e.d, dir = DIRECTIONS[d.direction];
        const x = e.sprite.x + dir.x * (d.muzzle||18), y = e.sprite.y + dir.y * (d.muzzle||18);
        // Use the existing hostile factory, NOT an alternate damage implementation.
        let gain=quiet?0:shotVolume(scene.pc,e.sprite,scene.map.SIZE||32);
        // Dense variant: limit overlapping SFX to one real emission per 180ms.
        if(['mobile','run'].includes(st.mode)&&gain>0){if(event.at-st.lastAudible<.18-EPS)gain=0;else st.lastAudible=event.at;}
        const p = criarFireball(0,'tiroE',d.direction,x,y,gain);
        p.vm = d.speed;
        p.props.bmDamageOrigin = 'hostileProjectileLab';
        p.props.bmEmitter = d.id;
        projectileStates.set(p,st);
        p._bmLabEmittedAt=event.at;
        scene.adicionar(p);
        if(!quiet)st.shots++;
        // The original mover already ran for this frame. Advance only the fraction
        // since the scheduled emission, before the game's regular collision pass.
        if (event.age > EPS) {
            const old=st.motion;
            if(st.movingBarriers.length)st.motion={start:event.at,end:event.at+event.age};
            try{p.mover(event.age);}finally{st.motion=old;}
        }
        return p;
    }
    function prewarm(scene,st,C){
        // Seed previous-cycle live projectiles, preventing a free initial sprint.
        for(const {d} of st.emitters){
            const x=(d.x+.5)*32-d.muzzle,y=(d.y+.5)*32,life=(x-70)/d.speed;
            for(let k=-1;emissionAt(d,k)>=-life-EPS;k--){
                const at=emissionAt(d,k),age=-at;
                if(age<=EPS||age>=life-EPS||movingHit({x,y,w:12,h:12},-d.speed,0,at,0,st.movingBarriers)!==null)continue;
                const p=fire(scene,st,{emitter:d,at,age:0},true);p.x=x-d.speed*age;p.y=y;C.sync(p,scene.map);st.prefilled++;
            }
        }
    }
    function mobileEnvelopes(st){const m=st.motion||{start:st.clock.time,end:st.clock.time};return st.movingBarriers.map(b=>barrierEnvelope(b,m.start,m.end));}
    function avoidCrush(scene,st,C){
        if(scene.pc.atravessa===1)return;
        for(const b of mobileEnvelopes(st)){
            const p=C.box(scene.pc),half=(p.w+b.w)/2;
            if(Math.abs(p.x-b.x)>=half-EPS||Math.abs(p.y-b.y)>=(p.h+b.h)/2-EPS)continue;
            // Rail has free floor on both sides in this lab. Eject horizontally,
            // never carry Lyra, inflict damage, or modify the shield's schedule.
            scene.pc.x+=b.x+(p.x<=b.x?-half:half)-p.x;
            scene.pc.vx=0;C.sync(scene.pc,scene.map);
        }
    }
    function drawMobile(scene,st){
        if(!st.movingBarriers.length)return;
        const ctx=scene.ctx;ctx.save();
        try{for(const b of st.movingBarriers){
            ctx.fillStyle='#55545b';ctx.fillRect(b.x-2,b.yMin,4,b.yMax-b.yMin);
            const p=barrierAt(b,st.clock.time),l=p.x-p.w/2,t=p.y-p.h/2;
            ctx.fillStyle='#393a41';ctx.fillRect(l,t,p.w,p.h);ctx.fillStyle='#93949e';ctx.fillRect(l+2,t+2,p.w-4,p.h-4);
            ctx.fillStyle='#676a75';for(let y=t+12;y<t+p.h-4;y+=16)ctx.fillRect(l+3,y,p.w-6,2);
            ctx.fillStyle='#c6bba0';ctx.fillRect(l+3,t+3,3,p.h-6);ctx.fillRect(l+p.w-6,t+3,3,p.h-6);
        }}finally{ctx.restore();}
    }
    // Dynamic, world-space blockers. Do not mutate map tiles or other sprites.
    function blockers(scene) {
        return activeStates(scene).flatMap(st=>st.emitters.map(e=>e.sprite));
    }
    function axisLimit(a, delta, axis, obstacles) {
        if(!Number.isFinite(delta)||!delta) return delta;
        const other=axis==='x'?'y':'x', dim=axis==='x'?'w':'h', cross=axis==='x'?'h':'w';
        let allowed=delta;
        for(const b of obstacles) {
            if(Math.abs(a[other]-b[other]) >= (a[cross]+b[cross])/2-EPS) continue;
            const half=(a[dim]+b[dim])/2, d=b[axis]-a[axis];
            // If overlapping (e.g. external teleport), allow motion out, not deeper.
            if(Math.abs(d)<half-EPS) {
                if(d*delta>0) allowed=0;
                continue;
            }
            if(delta>0 && d>=half-EPS) allowed=Math.max(0,Math.min(allowed,d-half));
            if(delta<0 && d<=-half+EPS) allowed=Math.min(0,Math.max(allowed,d+half));
        }
        return allowed;
    }
    function recordImpact(scene,p,x,y,impactKind) {
        const st=owner(scene,p);
        if(!st || p._bmLabImpactCounted)return;
        p._bmLabImpactCounted=true;
        st.impacts++;
        let kind=impactKind||p._projectileImpact?.kind||'player';if(kind==='barrier'&&p._bmMobileBarrierHit)kind='mobileBarrier';
        if(kind==='wall'&&st.mode!=='classic'){
            const z=scene.map.SIZE||32, dir=DIRECTIONS[p.direcao];
            if(dir){const cellX=Math.floor((x+dir.x*(p.w/2+.01))/z),cellY=Math.floor((y+dir.y*(p.h/2+.01))/z);if(st.barriers.some(b=>b.x===cellX&&b.y===cellY))kind='fixedBarrier';}
        }
        st.impactKinds[kind]=(st.impactKinds[kind]||0)+1;
    }
    function explode(scene,p,x,y,impactKind) {
        if(p._bmLabImpactDone) return null;
        p._bmLabImpactDone=true;
        p._collisionExpired=true;p._collisionSweep=null;p.vx=p.vy=0;
        const animation=new Animation({x,y,a:0,imagem:'explosion',props:{tipo:'boom',bmDamageOrigin:'hostileProjectileLab'}});
        scene.adicionar(animation);
        scene.assets.play('explosion');
        recordImpact(scene,p,x,y,impactKind);
        if(!scene.toRemove.includes(p))scene.toRemove.push(p);
        return animation;
    }
    // Invoked inside the existing damage branch, before fatal() returns.
    function playerImpact(scene,p,index) {
        if(!owned(p)) return null;
        const effect=explode(scene,p,scene.pc.x,scene.pc.y,'player');
        if(effect && scene.pc.vidas<=0) {
            const i=scene.spritesTE.indexOf(p);
            if(i>=0)scene.spritesTE.splice(i,1);
            // Existing death renderer advances this effect during the dramatic pause.
            scene._bmFatalWitchExplosion=effect;
        }
        return effect;
    }
    function installCollision(C) {
        if(C._bmHostileProjectileLab1B) return false;
        for(const k of ['axis','moveProjectile','cleanupProjectiles','box','sweep','sync','size','bounds']) if(typeof C[k]!=='function') throw Error('Missing CollisionSystem.'+k);
        const axis=C.axis, move=C.moveProjectile, cleanup=C.cleanupProjectiles;
        C.axis=function(s,map,delta,dir) {
            if(s===s.scene?.pc && s.scene.map===map) {
                const obs=blockers(s.scene).map(o=>this.box(o));
                for(const st of activeStates(s.scene))obs.push(...mobileEnvelopes(st));
                if(obs.length)delta=axisLimit(this.box(s),delta,dir,obs);
            }
            return axis.call(this,s,map,delta,dir);
        };
        C.moveProjectile=function(p,dt) {
            const vx=p.vx,vy=p.vy;
            const result=move.call(this,p,dt);
            const candidates=activeStates(p.scene);
            const friendlyMobile=!!(candidates.some(st=>st.motion&&st.movingBarriers.length)&&p.props?.tipo==='tiro'&&p.props?.modelo==='fireball');
            if((!owned(p)&&!friendlyMobile)||p._collisionExpired||!p._collisionSweep) return result;
            const segment=p._collisionSweep;
            let t=1,mobile=false;
            for(const st of candidates){const m=st.motion;if(!m||!st.movingBarriers.length)continue;
                // Native wall clipping may shorten the segment; reconstruct its actual duration.
                const span=m.end-m.start, requested=Math.hypot(vx,vy)*dt, fraction=requested>EPS?Math.min(1,Math.hypot(segment.dx,segment.dy)/requested):1;
                const end=m.start+span*fraction;
                const hit=movingHit(segment.a,vx,vy,m.start,end,st.movingBarriers);
                if(hit!==null&&end>m.start+EPS){const q=(hit-m.start)/(end-m.start);if(q<t){t=q;mobile=true;}}
            }
            for(const o of owned(p)?blockers(p.scene):[]) {
                const hit=this.sweep(segment.a,segment.dx,segment.dy,this.box(o));
                if(hit!==null && hit<t){t=hit;mobile=false;}
            }
            if(t<1) {
                p.x-=segment.dx*(1-t);p.y-=segment.dy*(1-t);
                segment.dx*=t;segment.dy*=t;
                p._collisionWall=true;p._projectileImpact={kind:'barrier',vx,vy};if(mobile)p._bmMobileBarrierHit=true;
                p.vx=p.vy=0;this.sync(p,p.scene.map);
            }
            return result;
        };
        C.cleanupProjectiles=function(scene,...args) {
            if(activeStates(scene).length) {
                const z=this.size(scene.map), n=this.bounds(scene.map);
                for(const p of [...scene.spritesTE]) {
                    if(!owned(p)||p._collisionExpired||p._stationaryFade||scene.toRemove.includes(p)) continue;
                    const outside=p.x<0||p.y<0||p.x>=n.w*z||p.y>=n.h*z;
                    // Only count here. Native cleanup handles stop/fade/removal for
                    // BOTH friendly and hostile projectiles, including our blockers.
                    if(p._collisionWall||outside)recordImpact(scene,p,p.x,p.y,outside?'bounds':undefined);
                }
            }
            return cleanup.call(this,scene,...args);
        };
        Object.defineProperty(C,'_bmHostileProjectileLab1B',{value:true});
        return true;
    }
    function install(SceneClass, enabled, C=CollisionSystem, mode='classic', level=null, custom=null) {
        if (!enabled) return false;
        if(!custom)layoutFor(mode,level);
        const proto = SceneClass.prototype;
        if (proto._bmHostileProjectileLab1B) return false;
        installCollision(C);
        for (const k of ['mover','desenhar','limparCena']) if(typeof proto[k] !== 'function') throw new Error('Missing Scene.'+k);
        const mover=proto.mover, draw=proto.desenhar, clear=proto.limparCena;
        // Delay only the objective guards; preserve the original aggro logic for all other NPCs.
        if(typeof proto.bmEnemyShouldAct==='function'){
            const original=proto.bmEnemyShouldAct;
            proto.bmEnemyShouldAct=function(enemy,...args){
                if(this.stageIndex===1&&states.has(this)&&enemy?.props?.bmProjectileGuard){
                    const active=objectiveApi().shouldAct(this,enemy,C);
                    if(active!==null)return active;
                }
                return original.call(this,enemy,...args);
            };
        }
        proto.mover = function(dt,...args) {
            // Do not touch normal scenes. Clean only owned projectiles on a transition.
            if (!isLab(this)) {
                if(states.has(this) && this.stageIndex!==1) reset(this);
                return mover.call(this,dt,...args);
            }
            const st=state(this,mode,C,level,custom);
            const active=!this.paused&&!(this.theEnd>0)&&Number.isFinite(dt)&&dt>0;
            if(active&&st.movingBarriers.length){st.motion={start:st.clock.time,end:st.clock.time+dt};avoidCrush(this,st,C);}
            let result;try{result=mover.call(this,dt,...args);}finally{st.motion=null;}
            if (!isLab(this) || !active || this.paused || this.theEnd>0) return result;
            trackTraversal(this,st);
            if(st.objectiveState)objectiveApi().update(this,st.objectiveState);
            for(const event of st.clock.advance(dt)) fire(this,st,event);
            return result;
        };
        proto.desenhar = function(...args) {
            if(isLab(this) || (this.stageIndex===1 && states.has(this))) {
                const st=isLab(this)?state(this,mode,C,level,custom):states.get(this);
                drawMobile(this,st);
                if(st.mode==='run'){const RUN=st.layout.run,c=this.ctx;c.save();try{for(const [id,y] of [['A',RUN.top],['B',RUN.bottom]]){c.fillStyle=runCue(st.clock.time,id,RUN)?'#80c695':'#857e69';c.fillRect(RUN.x-8,y-8,16,16);c.fillStyle='#45434c';c.fillRect(RUN.x-5,y-5,10,10);}}finally{c.restore();}}
                for(const e of st.emitters) e.sprite.desenhar(this.ctx);
            }
            return draw.apply(this,args);
        };
        if(typeof proto.desenharMapa==='function'){
            const drawMap=proto.desenharMapa;
            proto.desenharMapa=function(...args){if(isLab(this))state(this,mode,C,level,custom);return drawMap.apply(this,args);};
        }
        if(typeof proto.desenharMensagensPersistentes==='function'){
            const messages=proto.desenharMensagensPersistentes;
            proto.desenharMensagensPersistentes=function(...args){
                const st=states.get(this);
                if(this.stageIndex!==1||!st||st.mode==='classic')return messages.apply(this,args);
                const previous=this.sceneMessages;
                const z=this.map.SIZE||32;
                const labelX=st.mode==='mobile'?2.2*z:4.5*z;
                this.sceneMessages=[{text:'EXTREMIDADE A',x:labelX,y:(st.layout.anchors?.[0].y??1.5*z)+4,font:'12px Tahoma',fillStyle:'white'},{text:'EXTREMIDADE B',x:labelX,y:(st.layout.footprint?st.layout.footprint.h-1.5:8.5)*z+4,font:'12px Tahoma',fillStyle:'white'}];
                if(st.mode==='run'){const RUN=st.layout.run;this.sceneMessages=[{text:runCue(st.clock.time,'A',RUN)?'A: CORRA ↓':'A: AGUARDE',x:3*z,y:(st.layout.anchors?.[0].y??1.5*z)+4,font:'12px Tahoma',fillStyle:runCue(st.clock.time,'A',RUN)?'#9de5a6':'white'},{text:runCue(st.clock.time,'B',RUN)?'B: CORRA ↑':'B: AGUARDE',x:3*z,y:(st.layout.footprint?st.layout.footprint.h-1.5:8.5)*z+4,font:'12px Tahoma',fillStyle:runCue(st.clock.time,'B',RUN)?'#9de5a6':'white'}];}
                if(st.objectiveState&&st.mode!=='run')this.sceneMessages[0]={text:'OBJETIVO',x:labelX,y:(st.layout.anchors[0].y)+4,font:'12px Tahoma',fillStyle:'white'};
                try{return messages.apply(this,args);}finally{this.sceneMessages=previous;}
            };
        }
        proto.limparCena = function(...args) {
            if(states.has(this)) reset(this);
            return clear.apply(this,args);
        };
        Object.defineProperty(proto,'_bmHostileProjectileLab1B',{value:true});
        return true;
    }
    const dungeonHooks={set(scene,st){if(states.has(scene))throw Error('Laboratorio ativo');const list=dungeonStates.get(scene)||[];if(list.includes(st))throw Error('Estado duplicado');list.push(st);dungeonStates.set(scene,list);},get:scene=>allStates(scene)[0],all:scene=>(dungeonStates.get(scene)||[]).slice(),owner:(p)=>projectileStates.get(p),reset,fire,owned,mobileEnvelopes};
    const api={dungeonHooks,PROFILES,profileLayout,ShotClock,RUN,RUN_LANES,shotOffsets,emissionAt,runCue,LAYOUT,LANES,FIXED,MOBILE,MOBILE_LANES,barrierAt,barrierPeriod,barrierSegments,barrierEnvelope,movingHit,relativeSweep,SHOT_GAIN,shotVolume,layoutFor,applyTiles,restoreTiles,axisLimit,installCollision,playerImpact,install, status(scene){const s=states.get(scene);return s ? {layout:s.mode,level:s.level,seed:s.layout.seed,footprint:s.layout.footprint,divider:s.layout.divider,...(s.objectiveState?{objective:objectiveApi().status(scene,s.objectiveState)}:{}),time:s.clock.time,shots:s.shots,impacts:s.impacts,impactKinds:{...s.impactKinds},traversals:{...s.traversals},barriers:s.barriers.map(b=>({...b})),prefilled:s.prefilled,movingBarriers:s.movingBarriers.map(b=>barrierAt(b,s.clock.time)),live:scene.spritesTE.filter(owned).length,emitters:s.emitters.map(e=>({id:e.d.id,x:e.sprite.x,y:e.sprite.y,direction:e.d.direction}))}:null;}};
    if(typeof module==='object' && module.exports) module.exports=api;
    else {
        root.BMHostileProjectileLab=api;
        const params=new URLSearchParams(root.location.search),enabled=params.get('bmProjectileLab')==='1';
        const mode=params.get('bmProjectileLayout')||'fixed';
        const level=params.has('bmProjectileLevel')?Number(params.get('bmProjectileLevel')):null;
        if(enabled && !params.has('bmProjectileSeed') && install(Scene,true,CollisionSystem,mode,level)) console.info('[BlueMoon] HostileProjectileLab 4C: '+mode+(level===null?' (classic parameters)':' level '+level));
    }
})(typeof globalThis!=='undefined'?globalThis:this);
