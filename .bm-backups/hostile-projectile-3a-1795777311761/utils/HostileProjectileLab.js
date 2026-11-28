/* BM_HOSTILE_PROJECTILE_LAB_2A1 -- opt-in fixed/open traversal lab, no procedural integration. */
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
    function layoutFor(mode) {
        if(mode==='classic') return {mode,emitters:LAYOUT,tiles:[],barriers:[]};
        if(!['open','fixed'].includes(mode)) throw Error('Unknown projectile layout: '+mode);
        const barriers=mode==='fixed'?FIXED:[], tiles=[];
        for(let x=0;x<13;x++)for(let y=0;y<10;y++) {
            const boundary=x<=1||x>=11||y===0||y===9;
            const shield=barriers.some(b=>b.x===x&&b.y===y);
            tiles.push({x,y,tipo:boundary||shield?6:y===1||y===8?2:0});
        }
        return {mode,emitters:LANES,tiles,barriers};
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
        const end=x>=2&&x<=10&&(y===1||y===8)?y:null;
        if(end!==null&&end!==st.lastEnd){
            if(st.lastEnd!==null){const direction=end===1?'ida':'volta';st.traversals[direction]++;if(scene.pc.vidas>=st.lastEndHP)st.traversals[direction+'SemDano']++;}
            st.lastEnd=end;st.lastEndHP=scene.pc.vidas;
        } else if(end!==null)st.lastEndHP=Math.max(st.lastEndHP,scene.pc.vidas);
    }
    class ShotClock {
        constructor(layout = LAYOUT) {
            this.time = 0;
            this.entries = layout.map(d => {
                if (!Number.isFinite(d.period) || d.period <= 0 || !Number.isFinite(d.phase) || d.phase < 0 || !DIRECTIONS[d.direction]) throw new Error('Invalid emitter timing/direction');
                return {d, count:0};
            });
        }
        advance(dt) {
            if (!Number.isFinite(dt) || dt <= 0) return [];
            const end = this.time + dt, events = [];
            for (const e of this.entries) {
                let at = e.d.phase + e.count * e.d.period;
                while (at <= end + EPS) {
                    events.push({emitter:e.d, at, age:Math.max(0,end-at)});
                    e.count++;
                    at = e.d.phase + e.count * e.d.period;
                }
            }
            this.time = end;
            return events.sort((a,b) => a.at-b.at || a.emitter.id.localeCompare(b.emitter.id));
        }
    }
    const isLab = s => s.stageIndex === 1 && s.map && (!s.gamer?.estagios?.[1]?.mapa || s.gamer.estagios[1].mapa===s.map) && s.pc && s.pc.vidas > 0;
    const owned = p => p?.props?.bmDamageOrigin === 'hostileProjectileLab';
    const states = new WeakMap();
    function reset(scene) {
        const previous=states.get(scene);
        if(previous){
            restoreTiles(previous.changes);
            if(scene.stageIndex===1&&scene.map===previous.map&&previous.portalList===scene.spritesTP)for(const p of previous.portals)if(!scene.spritesTP.includes(p))scene.spritesTP.push(p);
        }
        states.delete(scene);
        if(owned(scene._bmFatalWitchExplosion))delete scene._bmFatalWitchExplosion;
        for (const list of [scene.spritesTE,scene.spritesXP,scene.toRemove]) {
            if (!Array.isArray(list)) continue;
            for (let i=list.length-1;i>=0;i--) if (owned(list[i])) list.splice(i,1);
        }
    }
    function state(scene,mode,C) {
        let st = states.get(scene);
        if (st && st.map === scene.map && st.pc === scene.pc) {hidePortals(scene,st);return st;}
        reset(scene);
        const z = scene.map.SIZE || 32;
        const layout=layoutFor(mode),changes=applyTiles(scene.map,layout);
        st = {mode,map:scene.map,pc:scene.pc,changes,barriers:layout.barriers,portals:[],portalList:null, clock:new ShotClock(layout.emitters), shots:0, impacts:0, impactKinds:{}, traversals:{ida:0,volta:0,idaSemDano:0,voltaSemDano:0},lastEnd:null,lastEndHP:null,emitters:layout.emitters.map(d => {
            const sprite = new Sprite({x:(d.x+.5)*z,y:(d.y+.5)*z,w:20,h:20,vm:0,direcao:d.direction,imgX:0,imgY:0,imagem:'gargoyle',renderOffset:{x:-15,y:-15},props:{tipo:'bmHostileEmitter'}});
            sprite.scene=scene;
            return {d,sprite};
        })};
        states.set(scene,st);
        hidePortals(scene,st);
        if(mode!=='classic'){
            scene.pc.x=6.5*z;scene.pc.y=8.5*z;scene.pc.vx=scene.pc.vy=0;C.sync(scene.pc,scene.map);
            trackTraversal(scene,st);
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
    function fire(scene,st,event) {
        const e = st.emitters.find(e => e.d === event.emitter);
        const d = e.d, dir = DIRECTIONS[d.direction];
        const x = e.sprite.x + dir.x * (d.muzzle||18), y = e.sprite.y + dir.y * (d.muzzle||18);
        // Use the existing hostile factory, NOT an alternate damage implementation.
        const p = criarFireball(0,'tiroE',d.direction,x,y,shotVolume(scene.pc,e.sprite,scene.map.SIZE||32));
        p.vm = d.speed;
        p.props.bmDamageOrigin = 'hostileProjectileLab';
        p.props.bmEmitter = d.id;
        scene.adicionar(p);
        st.shots++;
        // The original mover already ran for this frame. Advance only the fraction
        // since the scheduled emission, before the game's regular collision pass.
        if (event.age > EPS) p.mover(event.age);
        return p;
    }
    // Dynamic, world-space blockers. Do not mutate map tiles or other sprites.
    function blockers(scene) {
        const st=states.get(scene);
        return st && scene.stageIndex===1 && st.map===scene.map && st.pc===scene.pc ? st.emitters.map(e=>e.sprite) : [];
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
        const st=states.get(scene);
        if(!st || p._bmLabImpactCounted)return;
        p._bmLabImpactCounted=true;
        st.impacts++;
        let kind=impactKind||p._projectileImpact?.kind||'player';
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
                const obs=blockers(s.scene);
                if(obs.length)delta=axisLimit(this.box(s),delta,dir,obs.map(o=>this.box(o)));
            }
            return axis.call(this,s,map,delta,dir);
        };
        C.moveProjectile=function(p,dt) {
            const vx=p.vx,vy=p.vy;
            const result=move.call(this,p,dt);
            if(!owned(p)||p._collisionExpired||!p._collisionSweep) return result;
            const segment=p._collisionSweep;
            let t=1;
            for(const o of blockers(p.scene)) {
                const hit=this.sweep(segment.a,segment.dx,segment.dy,this.box(o));
                if(hit!==null && hit<t)t=hit;
            }
            if(t<1) {
                p.x-=segment.dx*(1-t);p.y-=segment.dy*(1-t);
                segment.dx*=t;segment.dy*=t;
                p._collisionWall=true;p._projectileImpact={kind:'barrier',vx,vy};
                p.vx=p.vy=0;this.sync(p,p.scene.map);
            }
            return result;
        };
        C.cleanupProjectiles=function(scene,...args) {
            if(scene.stageIndex===1 && states.has(scene)) {
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
    function install(SceneClass, enabled, C=CollisionSystem, mode='classic') {
        if (!enabled) return false;
        layoutFor(mode);
        const proto = SceneClass.prototype;
        if (proto._bmHostileProjectileLab1B) return false;
        installCollision(C);
        for (const k of ['mover','desenhar','limparCena']) if(typeof proto[k] !== 'function') throw new Error('Missing Scene.'+k);
        const mover=proto.mover, draw=proto.desenhar, clear=proto.limparCena;
        proto.mover = function(dt,...args) {
            // Do not touch normal scenes. Clean only owned projectiles on a transition.
            if (!isLab(this)) {
                if(states.has(this) && this.stageIndex!==1) reset(this);
                return mover.call(this,dt,...args);
            }
            const st=state(this,mode,C);
            const result=mover.call(this,dt,...args);
            if (!isLab(this) || this.paused || this.theEnd>0) return result;
            trackTraversal(this,st);
            for(const event of st.clock.advance(dt)) fire(this,st,event);
            return result;
        };
        proto.desenhar = function(...args) {
            if(isLab(this) || (this.stageIndex===1 && states.has(this))) {
                const st=isLab(this)?state(this,mode,C):states.get(this);
                for(const e of st.emitters) e.sprite.desenhar(this.ctx);
            }
            return draw.apply(this,args);
        };
        if(typeof proto.desenharMapa==='function'){
            const drawMap=proto.desenharMapa;
            proto.desenharMapa=function(...args){if(isLab(this))state(this,mode,C);return drawMap.apply(this,args);};
        }
        if(typeof proto.desenharMensagensPersistentes==='function'){
            const messages=proto.desenharMensagensPersistentes;
            proto.desenharMensagensPersistentes=function(...args){
                const st=states.get(this);
                if(this.stageIndex!==1||!st||st.mode==='classic')return messages.apply(this,args);
                const previous=this.sceneMessages;
                const z=this.map.SIZE||32;
                this.sceneMessages=[{text:'EXTREMIDADE A',x:4.5*z,y:1.5*z+4,font:'12px Tahoma',fillStyle:'white'},{text:'EXTREMIDADE B',x:4.5*z,y:8.5*z+4,font:'12px Tahoma',fillStyle:'white'}];
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
    const api={ShotClock,LAYOUT,LANES,FIXED,SHOT_GAIN,shotVolume,layoutFor,applyTiles,restoreTiles,axisLimit,installCollision,playerImpact,install, status(scene){const s=states.get(scene);return s ? {layout:s.mode,time:s.clock.time,shots:s.shots,impacts:s.impacts,impactKinds:{...s.impactKinds},traversals:{...s.traversals},barriers:s.barriers.map(b=>({...b})),live:scene.spritesTE.filter(owned).length,emitters:s.emitters.map(e=>({id:e.d.id,x:e.sprite.x,y:e.sprite.y,direction:e.d.direction}))}:null;}};
    if(typeof module==='object' && module.exports) module.exports=api;
    else {
        root.BMHostileProjectileLab=api;
        const params=new URLSearchParams(root.location.search),enabled=params.get('bmProjectileLab')==='1';
        const mode=params.get('bmProjectileLayout')||'fixed';
        if(enabled && install(Scene,true,CollisionSystem,mode)) console.info('[BlueMoon] HostileProjectileLab 2A.1: '+mode);
    }
})(typeof globalThis!=='undefined'?globalThis:this);
