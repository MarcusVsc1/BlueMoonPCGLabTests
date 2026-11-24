/* BlueMoon - colisao em coordenadas de mundo; mapa indexado por [x][y]. */
class CollisionSystem {
    static get eps() { return 1e-7; }
    static direction(d) { return [{x:0,y:1},{x:-1,y:0},{x:1,y:0},{x:0,y:-1}][d]; }
    static tile(map, x, y) { return map?.cells?.[x]?.[y]; }
    static size(map) { return map.SIZE || 32; }
    static bounds(map) { return {w: map.COLUMNS ?? map.cells.length, h: map.LINES ?? map.cells[0].length}; }
    static box(s, kind = 'collisionBox') {
        const b = s[kind] || {};
        return {x: s.x + (b.offsetX ?? 0), y: s.y + (b.offsetY ?? 0), w: b.w ?? s.w, h: b.h ?? s.h};
    }
    static overlaps(a,b, touching = true) {
        if (![a.x,a.y,a.w,a.h,b.x,b.y,b.w,b.h].every(Number.isFinite)) return false;
        const dx = Math.abs(a.x-b.x), dy = Math.abs(a.y-b.y);
        return touching ? dx <= (a.w+b.w)/2 && dy <= (a.h+b.h)/2 : dx < (a.w+b.w)/2 && dy < (a.h+b.h)/2;
    }
    static solid(map,x,y,s) {
        const tile = this.tile(map,x,y);
        return !tile || (s.atravessa != 1 && Number(tile.tipo) >= 6);
    }
    static sync(s,map) { s.mc=Math.floor(s.x/this.size(map)); s.ml=Math.floor(s.y/this.size(map)); }
    // Percorre todas as fronteiras cruzadas pela borda dianteira da AABB.
    // O eixo transversal usa a posicao ja resolvida pelo eixo anterior.
    static axis(s,map,delta,axis) {
        if (!Number.isFinite(delta) || delta === 0) return 0;
        const b=this.box(s), z=this.size(map), e=this.eps, n=this.bounds(map);
        const horizontal=axis==='x', p=horizontal?b.x:b.y, q=horizontal?b.y:b.x;
        const half=(horizontal?b.w:b.h)/2, other=(horizontal?b.h:b.w)/2;
        const dir=Math.sign(delta), lead=p+dir*half, end=lead+delta;
        const start=dir>0?Math.floor((lead+e)/z):Math.floor((lead-e)/z);
        const last=dir>0?Math.floor((end-e)/z):Math.floor((end+e)/z);
        const q0=Math.floor((q-other+e)/z), q1=Math.floor((q+other-e)/z);
        let actual=delta;
        // Limites do mundo valem inclusive para atravessa=1.
        const max=(horizontal?n.w:n.h)*z;
        actual=dir>0?Math.max(0,Math.min(actual,max-lead)):Math.min(0,Math.max(actual,-lead));
        const limit=horizontal?n.w:n.h;
        for(let i=start; dir>0?i<=last:i>=last; i+=dir) {
            if(i<0 || i>=limit) break;
            let blocked=false;
            for(let j=q0;j<=q1;j++) if(this.solid(map,horizontal?i:j,horizontal?j:i,s)) {blocked=true;break;}
            if(blocked) {
                const boundary=(dir>0?i:i+1)*z;
                const distance=boundary-lead;
                // Nao desloca o sprite para tras caso ja esteja sobreposto.
                actual=dir>0?Math.max(0,Math.min(actual,distance)):Math.min(0,Math.max(actual,distance));
                break;
            }
        }
        s[axis]+=actual;
        return actual;
    }
    static move(s,dt) {
        const map=s.scene?.map;
        if(!map || !Number.isFinite(dt) || dt<=0) return;
        // Corrige apenas posicoes fora dos limites (ex.: spawn na borda).
        const b=this.box(s), n=this.bounds(map), z=this.size(map);
        if (b.w <= n.w*z) s.x += Math.max(b.w/2,Math.min(b.x,n.w*z-b.w/2))-b.x;
        if (b.h <= n.h*z) s.y += Math.max(b.h/2,Math.min(b.y,n.h*z-b.h/2))-b.y;
        let dx=s.vx*dt,dy=s.vy*dt;
        if(s.props?.tipo==='pc' && s.standardSpd>0) {
            const length=Math.hypot(dx,dy), max=s.standardSpd*dt;
            if(length>max) {dx*=max/length;dy*=max/length;}
        }
        const ax=this.axis(s,map,dx,'x'),ay=this.axis(s,map,dy,'y');
        s.vx=ax/dt; s.vy=ay/dt; this.sync(s,map);
    }
    // Segmento contra AABB expandida (Minkowski). Retorna instante de impacto.
    static sweep(a,dx,dy,b) {
        let lo=0,hi=1;
        for(const [p,d,c,r] of [[a.x,dx,b.x,(a.w+b.w)/2],[a.y,dy,b.y,(a.h+b.h)/2]]) {
            const min=c-r,max=c+r;
            if(Math.abs(d)<this.eps) {if(p<=min || p>=max) return null; continue;}
            let t1=(min-p)/d,t2=(max-p)/d;
            if(t1>t2) [t1,t2]=[t2,t1];
            lo=Math.max(lo,t1); hi=Math.min(hi,t2);
            if(lo>=hi) return null;
        }
        return lo>=0 && lo<=1 ? lo:null;
    }
    static moveProjectile(s,dt) {
        const map=s.scene?.map;
        if(!map || !Number.isFinite(dt) || dt<=0) return;
        const a=this.box(s),dx=s.vx*dt,dy=s.vy*dt,z=this.size(map),n=this.bounds(map);
        if(!Number.isFinite(dx)||!Number.isFinite(dy)) return;
        let t=1;
        // Examina a caixa envolvente da trajetoria e seleciona o primeiro impacto.
        const x0=Math.max(-1,Math.floor((Math.min(a.x,a.x+dx)-a.w/2)/z));
        const x1=Math.min(n.w,Math.floor((Math.max(a.x,a.x+dx)+a.w/2)/z));
        const y0=Math.max(-1,Math.floor((Math.min(a.y,a.y+dy)-a.h/2)/z));
        const y1=Math.min(n.h,Math.floor((Math.max(a.y,a.y+dy)+a.h/2)/z));
        for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) {
            if(!this.solid(map,x,y,s)) continue;
            const hit=this.sweep(a,dx,dy,{x:(x+.5)*z,y:(y+.5)*z,w:z,h:z});
            if(hit!==null) t=Math.min(t,hit);
        }
        s._collisionSweep={a,dx:dx*t,dy:dy*t};
        s.x+=dx*t;s.y+=dy*t; this.sync(s,map);
        if(t<1) s._collisionWall=true;
    }
    static projectile(s) { return ['tiro','tiroE','tiroQ'].includes(s?.props?.tipo) && s.props.modelo!=='espada'; }
    static intersects(a,b) {
        if (!a || !b) return false;
        const swordA=a.props?.modelo==='espada', swordB=b.props?.modelo==='espada';
        const aa=this.box(a,swordA?'attackBox':(swordB||this.projectile(b))?'hurtBox':'collisionBox');
        const bb=this.box(b,swordB?'attackBox':(swordA||this.projectile(a))?'hurtBox':'collisionBox');
        if(a._collisionExpired||b._collisionExpired) return false;
        if(this.overlaps(aa,bb)) return true;
        if(a._collisionSweep && this.sweep(a._collisionSweep.a,a._collisionSweep.dx,a._collisionSweep.dy,bb)!==null) return true;
        if(b._collisionSweep && this.sweep(b._collisionSweep.a,b._collisionSweep.dx,b._collisionSweep.dy,aa)!==null) return true;
        return false;
    }
    static sword(s,dt) {
        const dir=this.direction(s.direcao); if(!dir || !s.pc) return;
        const body=this.box(s.pc), reach=s.reach??24, width=s.attackWidth??20;
        s.x=body.x+dir.x*(body.w/2+reach/2);s.y=body.y+dir.y*(body.h/2+reach/2);
        s.attackBox={w:dir.x?reach:width,h:dir.y?reach:width};
        // w/h originais continuam sendo usados por outros elementos do jogo.
        s.frame+=20*Math.max(0,dt||0);
        if(Math.floor(s.frame)>4.2) {s._collisionExpired=true;s.scene.toRemove.push(s);}
    }
    static pushBox(box,pc,dirIndex=pc.direcao) {
        const scene=box.scene||pc.scene, map=scene?.map,dir=this.direction(dirIndex);
        if(!map || pc.scene!==scene || !dir) return false;
        const z=this.size(map), x=box.posX,y=box.posY;
        const from=this.tile(map,x,y), dest=this.tile(map,x+dir.x,y+dir.y);
        const player=this.box(pc);
        if(Math.floor(player.x/z)!==x-dir.x || Math.floor(player.y/z)!==y-dir.y) return false;
        if(!from || ![7,11].includes(from.tipo) || !dest || dest.tipo!==0) return false;
        const puzzle=scene.sokobans?.find(p=>p.boxes.includes(box));
        if(puzzle?.room?.cells && !puzzle.room.cells.some(c=>c.x===x+dir.x && c.y===y+dir.y)) return false;
        if(scene.sokobans?.some(p=>p.boxes.some(b=>b!==box && b.posX===x+dir.x && b.posY===y+dir.y))) return false;
        from.tipo=0; box.posX+=dir.x;box.posY+=dir.y;
        box.x=(box.posX+.5)*z;box.y=(box.posY+.5)*z;dest.tipo=11;
        return true;
    }
    static updateBoxes(scene,dt) {
        for(const puzzle of scene.sokobans) for(const box of puzzle.boxes) {
            box.swCD=Math.max(0,(box.swCD||0)-dt);
            for(const sword of scene.spritesT) {
                if(box.swCD>0 || sword.props?.modelo!=='espada' || sword._pushedBox || sword._collisionExpired) continue;
                if(this.intersects(sword,box) && this.pushBox(box,scene.pc,sword.direcao)) {box.swCD=.4;sword._pushedBox=true;break;}
            }
        }
    }
    static resetPuzzle(puzzle,scene) {
        const map=scene.map,z=this.size(map);
        // Limpa TODAS as origens antes de marcar os destinos do reset.
        for(const b of puzzle.boxes) if(!this.tile(map,b.posX,b.posY)||!this.tile(map,b.initialX,b.initialY)) return false;
        for(const b of puzzle.boxes) this.tile(map,b.posX,b.posY).tipo=0;
        for(const b of puzzle.boxes) {
            b.posX=b.initialX;b.posY=b.initialY;b.x=(b.posX+.5)*z;b.y=(b.posY+.5)*z;
            this.tile(map,b.posX,b.posY).tipo=11;b.swCD=0;b.props.placed=false;
        }
        const p=scene.pc;p.x=(puzzle.room.cells[0].x+puzzle.startCell.y+.5)*z;p.y=(puzzle.room.cells[0].y+puzzle.startCell.x+.5)*z;
        p.vx=p.vy=0;this.sync(p,map);puzzle.countDown=.5;
        for(const sword of scene.spritesT) if(sword.props?.modelo==='espada') {sword._collisionExpired=true;scene.toRemove.push(sword);}
        return true;
    }
    static cleanupProjectiles(scene) {
        const map=scene.map,z=this.size(map),n=this.bounds(map);
        for(const s of [...scene.spritesT,...scene.spritesTE]) {
            if(s.props?.modelo==='espada') continue;
            if(s._collisionWall || s.x<0 || s.y<0 || s.x>=n.w*z || s.y>=n.h*z) scene.toRemove.push(s);
            s._collisionSweep=null;
        }
    }
}
