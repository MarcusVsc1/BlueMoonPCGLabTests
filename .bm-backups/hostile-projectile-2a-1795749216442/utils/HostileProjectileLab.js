/* BM_HOSTILE_PROJECTILE_LAB_1B -- opt-in lobby only, no procedural integration. */
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
    const isLab = s => s.stageIndex === 1 && s.map && s.pc && s.pc.vidas > 0;
    const owned = p => p?.props?.bmDamageOrigin === 'hostileProjectileLab';
    const states = new WeakMap();
    function reset(scene) {
        states.delete(scene);
        if(owned(scene._bmFatalWitchExplosion))delete scene._bmFatalWitchExplosion;
        for (const list of [scene.spritesTE,scene.spritesXP,scene.toRemove]) {
            if (!Array.isArray(list)) continue;
            for (let i=list.length-1;i>=0;i--) if (owned(list[i])) list.splice(i,1);
        }
    }
    function state(scene) {
        let st = states.get(scene);
        if (st && st.map === scene.map && st.pc === scene.pc) return st;
        reset(scene);
        const z = scene.map.SIZE || 32;
        st = {map:scene.map,pc:scene.pc, clock:new ShotClock(), shots:0, impacts:0, emitters:LAYOUT.map(d => {
            const sprite = new Sprite({x:(d.x+.5)*z,y:(d.y+.5)*z,w:20,h:20,vm:0,direcao:d.direction,imgX:0,imgY:0,imagem:'gargoyle',renderOffset:{x:-15,y:-15},props:{tipo:'bmHostileEmitter'}});
            sprite.scene=scene;
            return {d,sprite};
        })};
        states.set(scene,st);
        return st;
    }
    function fire(scene,st,event) {
        const e = st.emitters.find(e => e.d === event.emitter);
        const d = e.d, dir = DIRECTIONS[d.direction];
        const x = e.sprite.x + dir.x * 18, y = e.sprite.y + dir.y * 18;
        // Use the existing hostile factory, NOT an alternate damage implementation.
        const p = criarFireball(0,'tiroE',d.direction,x,y);
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
    function explode(scene,p,x,y) {
        if(p._bmLabImpactDone) return null;
        p._bmLabImpactDone=true;
        p._collisionExpired=true;p._collisionSweep=null;p.vx=p.vy=0;
        const animation=new Animation({x,y,a:0,imagem:'explosion',props:{tipo:'boom',bmDamageOrigin:'hostileProjectileLab'}});
        scene.adicionar(animation);
        scene.assets.play('explosion');
        const st=states.get(scene);if(st) st.impacts++;
        if(!scene.toRemove.includes(p))scene.toRemove.push(p);
        return animation;
    }
    // Invoked inside the existing damage branch, before fatal() returns.
    function playerImpact(scene,p,index) {
        if(!owned(p)) return null;
        const effect=explode(scene,p,scene.pc.x,scene.pc.y);
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
                    if(!owned(p)||p._collisionExpired||scene.toRemove.includes(p)) continue;
                    const outside=p.x<0||p.y<0||p.x>=n.w*z||p.y>=n.h*z;
                    if(p._collisionWall||outside) {
                        // World bounds are invisible; silently remove there.
                        if(outside||p._projectileImpact?.kind==='bounds') {
                            p._collisionExpired=true;p._collisionSweep=null;scene.toRemove.push(p);
                        } else explode(scene,p,p.x,p.y);
                    }
                }
            }
            return cleanup.call(this,scene,...args);
        };
        Object.defineProperty(C,'_bmHostileProjectileLab1B',{value:true});
        return true;
    }
    function install(SceneClass, enabled, C=CollisionSystem) {
        if (!enabled) return false;
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
            const st=state(this);
            const result=mover.call(this,dt,...args);
            if (!isLab(this) || this.paused || this.theEnd>0) return result;
            for(const event of st.clock.advance(dt)) fire(this,st,event);
            return result;
        };
        proto.desenhar = function(...args) {
            if(isLab(this) || (this.stageIndex===1 && states.has(this))) {
                const st=isLab(this)?state(this):states.get(this);
                for(const e of st.emitters) e.sprite.desenhar(this.ctx);
            }
            return draw.apply(this,args);
        };
        proto.limparCena = function(...args) {
            if(states.has(this)) reset(this);
            return clear.apply(this,args);
        };
        Object.defineProperty(proto,'_bmHostileProjectileLab1B',{value:true});
        return true;
    }
    const api={ShotClock,LAYOUT,axisLimit,installCollision,playerImpact,install, status(scene){const s=states.get(scene);return s ? {time:s.clock.time,shots:s.shots,impacts:s.impacts,live:scene.spritesTE.filter(owned).length,emitters:s.emitters.map(e=>({id:e.d.id,x:e.sprite.x,y:e.sprite.y,direction:e.d.direction}))}:null;}};
    if(typeof module==='object' && module.exports) module.exports=api;
    else {
        root.BMHostileProjectileLab=api;
        const enabled=new URLSearchParams(root.location.search).get('bmProjectileLab')==='1';
        if(enabled && install(Scene,true)) console.info('[BlueMoon] HostileProjectileLab 1B ativo na selecao de fase.');
    }
})(typeof globalThis!=='undefined'?globalThis:this);
