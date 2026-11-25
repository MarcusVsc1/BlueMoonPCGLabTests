/* BlueMoon: arena de progressao. Nenhum inimigo e criado antes da entrada. */
class CombatArena {
    static get rules(){return {tile:13, minArea:36, minSide:6, intro:.75, telegraph:.25, safeTiles:2};}
    static key(c){return `${c.x},${c.y}`;}
    static tile(map,c){return map.cells?.[c.x]?.[c.y];}
    static around(c){return [[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>({x:c.x+x,y:c.y+y}));}
    static floor(t){return t===0||t===2||t===4;}
    static box(s){return CollisionSystem.box(s);}
    static center(c,z){return {x:(c.x+.5)*z,y:(c.y+.5)*z,w:z,h:z};}
    static point(s,z){return {x:Math.floor(s.x/z),y:Math.floor(s.y/z)};}
    static fullInside(a,s){
        const b=this.box(s),z=a.map.SIZE;
        if(![b.x,b.y,b.w,b.h].every(Number.isFinite))return false;
        for(let x=Math.floor((b.x-b.w/2+1e-5)/z);x<=Math.floor((b.x+b.w/2-1e-5)/z);x++)
            for(let y=Math.floor((b.y-b.h/2+1e-5)/z);y<=Math.floor((b.y+b.h/2-1e-5)/z);y++)
                if(!a.cells.has(this.key({x,y})))return false;
        return true;
    }
    static objects(scene){return ['spritesO','spritesPoder','spritesTP','spritesEV','spritesSpike'].flatMap(k=>scene[k]||[]);}
    static live(scene){return (scene.spritesE||[]).filter(e=>e.vidas>0&&!scene.toRemove?.includes(e));}
    static overlapsTile(s,c,z){return CollisionSystem.overlaps(this.box(s),this.center(c,z),false);}
    static active(scene){return scene.map?._bmCombatArenaActive||null;}
    static activeFor(scene,a){return a&&scene.stageIndex===0&&scene.map===a.map&&scene.pc?.vidas>0;}
    static finish(a,state='cleared'){
        for(const g of a.saved){const t=this.tile(a.map,g);if(t?.tipo===this.rules.tile)t.tipo=g.before;}
        a.saved=[];a.state=state;a.markers=[];a.members.clear();
        if(a.map._bmCombatArenaActive===a)a.map._bmCombatArenaActive=null;
    }
    static reset(scene){const a=this.active(scene);if(a)this.finish(a,'cancelled');}
    static canSeal(a,scene){
        if(a.gates.some(g=>!this.floor(this.tile(a.map,g)?.tipo)))return false;
        const objects=this.objects(scene), enemies=this.live(scene),z=a.map.SIZE;
        // Uma porta distante, no mesmo corredor de entrada, tambem precisa estar aberta.
        if(a.gates.some(g=>g.edge?.cells?.some(c=>this.tile(a.map,c)?.tipo===10||objects.some(o=>o.props?.subtipo==='porta'&&this.overlapsTile(o,c,z)))))return false;
        return !a.gates.some(g=>[scene.pc,...objects,...enemies].some(s=>this.overlapsTile(s,g,z)));
    }
    static safePositions(a,scene){
        const z=a.map.SIZE,player=this.box(scene.pc),occupied=[...this.objects(scene),...this.live(scene)];
        const valid=a.spawnCells.filter(c=>{
            const b=this.center(c,z);
            return this.tile(a.map,c)?.tipo===0&&Math.hypot(b.x-player.x,b.y-player.y)>=this.rules.safeTiles*z&&
                !CollisionSystem.overlaps(b,player,true)&&!occupied.some(o=>this.overlapsTile(o,c,z));
        });
        // A ordem de preferencia e pre-sorteada; escolher a celula valida mais proxima
        // da posicao prevista, sem sortear durante a entrada.
        const chosen=[];
        const ordered=a.specs.map(spec=>{
            const dist=c=>Math.hypot(c.x-spec.preferred.x,c.y-spec.preferred.y);
            return [...valid].sort((x,y)=>dist(x)-dist(y)||x.y-y.y||x.x-y.x);
        });
        const search=i=>{
            if(i===ordered.length)return true;
            for(const c of ordered[i]){
                if(chosen.some(p=>Math.max(Math.abs(c.x-p.x),Math.abs(c.y-p.y))<=1))continue;
                chosen.push(c);if(search(i+1))return true;chosen.pop();
            }
            return false;
        };
        return search(0)?chosen:null;
    }
    static start(a,scene){
        if(!this.canSeal(a,scene)||!this.safePositions(a,scene))return false;
        a.saved=a.gates.map(g=>({...g,before:this.tile(a.map,g).tipo}));
        for(const g of a.saved)this.tile(a.map,g).tipo=this.rules.tile;
        a.state='closing';a.elapsed=0;a.map._bmCombatArenaActive=a;
        for(const e of this.live(scene))if(this.fullInside(a,e))a.members.add(e);
        return true;
    }
    static spawn(a,scene){
        const positions=this.safePositions(a,scene);
        if(!positions){this.finish(a,'cancelled');return false;}
        // Nao inserir parcialmente se uma fabrica falhar. O mapa deve sempre reabrir.
        const made=[];
        try{
            for(let i=0;i<a.specs.length;i++){
                const spec=a.specs[i],p=positions[i];
                const e=scene.gamer.criarInimigo(spec.type,p.x,p.y);
                if(!e)throw Error('Tipo de inimigo indisponivel: '+spec.type);
                e.direcao=spec.direction;e.provocou=true;
                if(spec.speed!=null)e.vm=spec.speed;
                made.push(e);
            }
            // BM_DUNGEON_MAP_V1: so entregar o drop depois que a fabrica criou todos os membros.
            DungeonMapSystem.armArena(a, made);
            a.oldAttacks=new WeakSet(scene.spritesT||[]);
            a.state='active';a.markers=[];
            for(const e of made){scene.adicionar(e);a.members.add(e);e._bmCombatArena=a;}
        }catch(err){
            for(const e of made){const i=scene.spritesE.indexOf(e);if(i>=0)scene.spritesE.splice(i,1);}
            this.finish(a,'cancelled');console.warn('[BlueMoon Arena] Invocacao cancelada:',err);return false;
        }
        // Som uma vez, no aparecimento efetivo. Falha de audio nao trava a arena.
        try{scene.assets.play('combatArenaMagic');}catch(err){console.warn('[BlueMoon Arena] Audio:',err);}
        return true;
    }
    static update(scene,dt){
        const map=scene.map;if(scene.stageIndex!==0||!map||!scene.pc||scene.pc.vidas<=0)return;
        const a=this.active(scene);
        if(a){
            if(!this.fullInside(a,scene.pc)){this.finish(a,'cancelled');return;}
            if(a.state==='closing'){
                a.elapsed+=Math.max(0,Number.isFinite(dt)?dt:0);
                if(a.elapsed>=this.rules.intro)this.spawn(a,scene);
                else if(a.elapsed>=this.rules.telegraph)a.markers=this.safePositions(a,scene)||[];
            }
            return;
        }
        for(const candidate of map._bmCombatArenas||[]){
            if(candidate.state==='ready'&&this.fullInside(candidate,scene.pc)&&this.start(candidate,scene))break;
        }
    }
    static add(scene,e){
        const a=this.active(scene);
        if(a&&e.props?.tipo==='npc'&&this.fullInside(a,e)){a.members.add(e);e._bmCombatArena=a;}
    }
    static capture(scene){
        const a=this.active(scene);
        if(!a)return null;
        return {a,positions:this.live(scene).map(e=>({e,x:e.x,y:e.y,inside:this.fullInside(a,e)}))};
    }
    static confine(scene,snapshot){
        if(!snapshot||this.active(scene)!==snapshot.a)return;
        const a=snapshot.a;
        for(const {e,x,y,inside} of snapshot.positions){
            const now=this.fullInside(a,e);
            if((a.members.has(e)&&!now)||(inside!==now&&!a.members.has(e))){e.x=x;e.y=y;e.vx=e.vy=0;CollisionSystem.sync(e,a.map);}
        }
    }
    static canHit(scene,e,attack){
        const a=this.active(scene);
        if(!a||!a.members.has(e))return true;
        return a.state==='active'&&!a.oldAttacks?.has(attack);
    }
    static canContact(scene,e){const a=this.active(scene);return !a||!a.members.has(e)||a.state==='active';}
    static afterCombat(scene){
        const a=this.active(scene);if(!a)return;
        if(!this.activeFor(scene,a)){this.finish(a,'cancelled');return;}
        if(a.state!=='active')return;
        const live=new Set(this.live(scene));
        for(const e of a.members)if(!live.has(e))a.members.delete(e);
        if(!a.members.size)this.finish(a);
    }
    static draw(scene){
        const a=this.active(scene);if(!a||a.state!=='closing'||!a.markers.length)return;
        const ctx=scene.ctx,z=a.map.SIZE,phase=(a.elapsed-this.rules.telegraph)/(this.rules.intro-this.rules.telegraph);
        ctx.save();try{
            ctx.strokeStyle='#d3b8fa';ctx.fillStyle='#a58ada';ctx.lineWidth=1.5;ctx.globalAlpha=.35+.35*Math.max(0,Math.min(1,phase));
            for(const c of a.markers){const b=this.center(c,z),x=b.x-scene.cameraX,y=b.y-scene.cameraY;
                ctx.beginPath();ctx.arc(x,y,8+6*phase,0,Math.PI*2);ctx.stroke();ctx.fillRect(x-2,y-2,4,4);}
        }finally{ctx.restore();}
    }
}
