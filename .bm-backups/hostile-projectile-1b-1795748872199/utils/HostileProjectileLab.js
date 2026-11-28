/* BM_HOSTILE_PROJECTILE_LAB_1A -- opt-in lobby only, no procedural integration. */
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
        for (const list of [scene.spritesTE,scene.toRemove]) {
            if (!Array.isArray(list)) continue;
            for (let i=list.length-1;i>=0;i--) if (owned(list[i])) list.splice(i,1);
        }
    }
    function state(scene) {
        let st = states.get(scene);
        if (st && st.map === scene.map && st.pc === scene.pc) return st;
        reset(scene);
        const z = scene.map.SIZE || 32;
        st = {map:scene.map,pc:scene.pc, clock:new ShotClock(), shots:0, emitters:LAYOUT.map(d => {
            const sprite = new Sprite({x:(d.x+.5)*z,y:(d.y+.5)*z,w:12,h:12,vm:0,direcao:d.direction,imgX:0,imgY:0,imagem:'gargoyle',renderOffset:{x:-15,y:-15},props:{tipo:'bmHostileEmitter'}});
            sprite.scene=scene;
            return {d,sprite};
        })};
        states.set(scene,st);
        return st;
    }
    function fire(scene,st,event) {
        const e = st.emitters.find(e => e.d === event.emitter);
        const d = e.d, dir = DIRECTIONS[d.direction];
        const x = e.sprite.x + dir.x * 12, y = e.sprite.y + dir.y * 12;
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
    function install(SceneClass, enabled) {
        if (!enabled) return false;
        const proto = SceneClass.prototype;
        if (proto._bmHostileProjectileLab1A) return false;
        for (const k of ['mover','desenhar','limparCena']) if(typeof proto[k] !== 'function') throw new Error('Missing Scene.'+k);
        const mover=proto.mover, draw=proto.desenhar, clear=proto.limparCena;
        proto.mover = function(dt,...args) {
            // Do not touch normal scenes. Clean only owned projectiles on a transition.
            if (!isLab(this)) {
                if(states.has(this)) reset(this);
                return mover.call(this,dt,...args);
            }
            const st=state(this);
            const result=mover.call(this,dt,...args);
            if (!isLab(this) || this.paused || this.theEnd>0) return result;
            for(const event of st.clock.advance(dt)) fire(this,st,event);
            return result;
        };
        proto.desenhar = function(...args) {
            if(isLab(this)) {
                const st=state(this);
                for(const e of st.emitters) e.sprite.desenhar(this.ctx);
            }
            return draw.apply(this,args);
        };
        proto.limparCena = function(...args) {
            if(states.has(this)) reset(this);
            return clear.apply(this,args);
        };
        Object.defineProperty(proto,'_bmHostileProjectileLab1A',{value:true});
        return true;
    }
    const api={ShotClock,LAYOUT,install, status(scene){const s=states.get(scene);return s ? {time:s.clock.time,shots:s.shots,live:scene.spritesTE.filter(owned).length,emitters:s.emitters.map(e=>({id:e.d.id,x:e.sprite.x,y:e.sprite.y,direction:e.d.direction}))}:null;}};
    if(typeof module==='object' && module.exports) module.exports=api;
    else {
        root.BMHostileProjectileLab=api;
        const enabled=new URLSearchParams(root.location.search).get('bmProjectileLab')==='1';
        if(enabled && install(Scene,true)) console.info('[BlueMoon] HostileProjectileLab 1A ativo na selecao de fase.');
    }
})(typeof globalThis!=='undefined'?globalThis:this);
