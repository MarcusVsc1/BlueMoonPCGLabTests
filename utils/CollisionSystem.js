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
    // Dissipacao exclusivamente visual, em segundos e pixels de mundo.
    static projectileFadeSeconds = 0.35;
        static moveProjectile(s,dt) {
        if(s._collisionExpired) return;
        const map=s.scene?.map;
        if(!map || !Number.isFinite(dt) || dt<=0) return;
        const a=this.box(s),dx=s.vx*dt,dy=s.vy*dt,z=this.size(map),n=this.bounds(map);
        if(!Number.isFinite(dx)||!Number.isFinite(dy)) return;
        let t=1, impact=null;
        // Examina a caixa envolvente da trajetoria e seleciona o primeiro impacto.
        const x0=Math.max(-1,Math.floor((Math.min(a.x,a.x+dx)-a.w/2)/z));
        const x1=Math.min(n.w,Math.floor((Math.max(a.x,a.x+dx)+a.w/2)/z));
        const y0=Math.max(-1,Math.floor((Math.min(a.y,a.y+dy)-a.h/2)/z));
        const y1=Math.min(n.h,Math.floor((Math.max(a.y,a.y+dy)+a.h/2)/z));
        for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) {
            const tile=this.tile(map,x,y);
            // Buraco preto tambem encerra tiros comuns; atravessa=1 preservado.
            if(!this.solid(map,x,y,s) && !(s.atravessa!=1 && Number(tile?.tipo)===-1)) continue;
            const hit=this.sweep(a,dx,dy,{x:(x+.5)*z,y:(y+.5)*z,w:z,h:z});
            const kind=!tile?'bounds':[7,10].includes(Number(tile.tipo))?'barrier':'wall';
            const rank={wall:0,barrier:1,bounds:2};
            if(hit!==null && (hit<t || (hit===t && impact && rank[kind]>rank[impact]))) {
                t=hit;impact=kind;
            }
        }
        s._collisionSweep={a,dx:dx*t,dy:dy*t};
        s.x+=dx*t;s.y+=dy*t; this.sync(s,map);
        if(t<1) {
            s._collisionWall=true;
            s._projectileImpact={kind:impact,vx:s.vx,vy:s.vy};
            // Para no impacto. A checagem de alvos usa somente o segmento anterior;
            // a limpeza no mesmo frame desativa definitivamente a colisao.
            s.vx=0;s.vy=0;
        }
    }
    static projectile(s) { return ['tiro','tiroE','tiroQ'].includes(s?.props?.tipo) && s.props.modelo!=='espada'; }
    // A mesma janela do spritesheet usada por desenhaEspada/desenharAlavanca.
    // Cache por imagem e recorte: le os pixels apenas uma vez, sem custo por frame.
    static maskCache = new WeakMap();
    static imageReady(image) {
        return !!(image && (image.naturalWidth || image.width) && (image.naturalHeight || image.height) && image.complete!==false);
    }
    static frameMask(image,sx,sy,w,h) {
        if(!this.imageReady(image)) return null;
        if(sx<0||sy<0||sx+w>(image.naturalWidth||image.width)||sy+h>(image.naturalHeight||image.height)) return null;
        let cache=this.maskCache.get(image);
        if(!cache) {cache=new Map();this.maskCache.set(image,cache);}
        const key=[sx,sy,w,h].join(',');
        if(cache.has(key)) return cache.get(key);
        try {
            const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):document.createElement('canvas');
            canvas.width=w;canvas.height=h;
            const c=canvas.getContext('2d',{willReadFrequently:true});
            c.drawImage(image,sx,sy,w,h,0,0,w,h);
            const data=c.getImageData(0,0,w,h).data;
            const runs=[];
            for(let y=0;y<h;y++) {
                let start=-1;
                for(let x=0;x<=w;x++) {
                    const opaque=x<w && data[(y*w+x)*4+3]>=64;
                    if(opaque&&start<0) start=x;
                    if(!opaque&&start>=0) {runs.push({x:start,y,w:x-start,h:1});start=-1;}
                }
            }
            const result={runs,w,h};cache.set(key,result);return result;
        } catch(e) {
            // file:// ou CORS podem bloquear a leitura. A geometria reduzida
            // mantem o jogo utilizavel, sem voltar ao alcance antigo de 32 px.
            if(!this.maskWarning) {
                this.maskWarning=true;
                console.warn('BlueMoon: leitura alfa indisponivel; contato espada/alavanca usa geometria aproximada. Prefira servir o jogo via HTTP local.',e.message);
            }
            cache.set(key,null);return null;
        }
    }
    static swordFrame(s) {
        const img=s.scene?.assets?.img?.(s.imagem);
        return this.frameMask(img,144*s.imgX,192*s.imgY+s.direcao*48-1,48,48);
    }
    static rectBounds(rects) {
        if(!rects.length) return null;
        const x0=Math.min(...rects.map(r=>r.x)),y0=Math.min(...rects.map(r=>r.y));
        const x1=Math.max(...rects.map(r=>r.x+r.w)),y1=Math.max(...rects.map(r=>r.y+r.h));
        return {x:x0,y:y0,w:x1-x0,h:y1-y0};
    }
    static worldRects(runs,left,top,sx,sy=sx) {
        return runs.map(r=>({x:left+(r.x+r.w/2)*sx,y:top+(r.y+r.h/2)*sy,w:r.w*sx,h:r.h*sy}));
    }
    // Coordenadas na imagem de 30x30 do heroi, medidas a partir de renderOffset.
    // Ajuste fino por direcao sem alterar a hitbox fisica do jogador.
    static handAnchors=[{x:18,y:23},{x:9,y:18},{x:21,y:18},{x:13,y:13}];
    static swordPose(s) {
        const dir=this.direction(s.direcao),pc=s.pc;
        if(!dir||!pc) return false;
        const anchor=(pc.swordHandAnchors||this.handAnchors)[s.direcao];
        const ro=pc.renderOffset||{x:-pc.w-3.1,y:-pc.h-12};
        const hand={x:pc.x+ro.x+anchor.x,y:pc.y+ro.y+anchor.y};
        const mask=this.swordFrame(s), scale=25/48;
        const bounds=mask&&this.rectBounds(mask.runs);
        // A origem visual e o ponto onde se segura o cabo (extremidade oposta a ponta).
        // A faixa posterior de 22% e reservada ao cabo; somente a frente conta como lamina.
        let localGrip, blade=[];
        if(bounds) {
            const horizontal=!!dir.x, positive=dir.x+dir.y>0;
            const start=horizontal?bounds.x:bounds.y, span=horizontal?bounds.w:bounds.h;
            const grip=start+span*(positive?.12:.88), cut=start+span*(positive?.22:.78);
            localGrip=horizontal?{x:grip,y:bounds.y+bounds.h/2}:{x:bounds.x+bounds.w/2,y:grip};
            // Usa o centro transversal dos pixels no cabo, nao o centro da guarda.
            const gripBand=mask.runs.filter(r=>horizontal?r.x<=grip+1&&r.x+r.w>=grip-1:r.y<=grip+1&&r.y+r.h>=grip-1);
            const gb=this.rectBounds(gripBand);
            if(gb) {if(horizontal)localGrip.y=gb.y+gb.h/2;else localGrip.x=gb.x+gb.w/2;}
            for(const r of mask.runs) {
                const p=horizontal?r.x:r.y,end=p+(horizontal?r.w:r.h);
                const lo=positive?Math.max(p,cut):p,hi=positive?end:Math.min(end,cut);
                if(hi<=lo) continue;
                blade.push(horizontal?{...r,x:lo,w:hi-lo}:{...r,y:lo,h:hi-lo});
            }
        } else {
            // Fallback estreito para ambientes sem acesso aos pixels.
            localGrip={x:24-dir.x*15,y:24-dir.y*15};
        }
        const left=hand.x-localGrip.x*scale,top=hand.y-localGrip.y*scale;
        s.x=left+12.5;s.y=top+12.5;s.renderOffsetSword={x:0,y:0};
        s._swordHand=hand;s._swordBlade=this.worldRects(blade,left,top,scale);
        const bb=this.rectBounds(blade);
        if(bb) s.attackBox={offsetX:left+(bb.x+bb.w/2)*scale-s.x,offsetY:top+(bb.y+bb.h/2)*scale-s.y,w:bb.w*scale,h:bb.h*scale};
        else {
            s.attackBox={offsetX:hand.x+dir.x*10-s.x,offsetY:hand.y+dir.y*10-s.y,w:dir.x?16:4,h:dir.y?16:4};
            if(!mask && this.imageReady(s.scene?.assets?.img?.(s.imagem))) s._swordBlade=[this.box(s,'attackBox')];
        }
        return true;
    }
    static leverRects(s) {
        const size=s.spriteSize;
        if(!(size>0))return [];
        const img=s.scene?.assets?.img?.(s.imagem);
        const mask=this.frameMask(img,size*s.imgX,size*2*Number(s.toggled)+size*4*s.imgY,size,size);
        if(!mask) {
            if(!this.imageReady(img)) return [];
            // Botao de piso: fallback aproximado do contorno visivel, distinto da alavanca.
            // A mascara alfa real continua tendo prioridade quando disponivel.
            const cx=s.x-s.w/2+12, cy=s.y-s.h/2+12;
            if(s.imagem==='switch' && s.imgX===10 && s.imgY===1) {
                return [
                    {x:cx-.25,y:cy-4.75,w:12,h:3},
                    {x:cx-.75,y:cy+.75,w:15,h:8},
                    {x:cx-.75,y:cy+6.25,w:11,h:3}
                ];
            }
            // Alavanca comum: faixas aproximadas do sprite (24x24), incluindo a base.
            // Nao altera o botao nem o dispositivo antilava. Mascara alfa tem prioridade.
            if(s.imagem==='switch' && s.imgX===2 && s.imgY===0) {
                return [
                    {x:cx,y:cy-4.5,w:12,h:3},
                    {x:cx,y:cy+1,w:15,h:8},
                    {x:cx,y:cy+8,w:17,h:6}
                ];
            }
            // Dispositivo antilava: fallback proprio, incluindo a parte superior visivel.
            // Coordenadas relativas ao centro do desenho 24x24, nao ao centro do tile.
            if(s.imagem==='switch' && s.imgX===0 && s.imgY===0) {
                return [
                    {x:cx+.5,y:cy-10.5,w:16,h:3},
                    {x:cx,y:cy-3.5,w:15,h:11},
                    {x:cx,y:cy+4.5,w:15,h:5}
                ];
            }
            return [{x:cx,y:cy,w:12,h:12}];
        }
        // Iguais aos deslocamentos e tamanho em desenharAlavanca().
        return this.worldRects(mask.runs,s.x-s.w/2,s.y-s.h/2,24/size);
    }
    static leverContact(s,lever) {
        if(!s._swordBlade?.length)return false;
        const rects=this.leverRects(lever);
        // Contato entre pixels visiveis (sem contar bordas apenas tangentes).
        return rects.some(r=>s._swordBlade.some(b=>this.overlaps(b,r,false)));
    }
    // Contato com o chao, separado da colisao fisica e do combate.
    // O sprite do heroi termina em y+6; os pes ocupam a metade inferior
    // da hitbox fisica original. Personalizavel sem modificar w/h.
    // LYRA_SPIKE_GAP_FIX
    static groundRect(pc) {
        const b=this.box(pc), g=pc.groundBox||{};
        return {x:pc.x+(g.offsetX??(b.x-pc.x)),
            y:pc.y+(g.offsetY??(b.y-pc.y+b.h/2-5)),
            w:g.w??10,h:g.h??10};
    }
    // desenharEspinho: imagem 24x24 em (x-w/2,y-h/2).
    // Area visual completa de 24 px; centro visual em x-4,y-4
    // quando as dimensoes do sprite sao 32x32.
    static hazardRect(spike) {
        const b=spike.hazardBox||{};
        return {x:spike.x+(b.offsetX??(12-spike.w/2)),
            y:spike.y+(b.offsetY??(12-spike.h/2)),
            w:b.w??24,h:b.h??24};
    }
    static spikeContact(pc,spike) {
        if(!spike.toggled) return false;
        const feet=this.groundRect(pc), hazard=this.hazardRect(spike);
        if(!(feet.w>0&&feet.h>0&&hazard.w>0&&hazard.h>0)) return false;
        return this.overlaps(feet,hazard,false);
    }
    static intersects(a,b) {
        if (!a || !b || a._collisionExpired || b._collisionExpired) return false;
        // Se a parede foi atingida neste frame, so vale o caminho anterior ao impacto.
        if(a._collisionWall && this.projectile(a)) return this.preWallContact(a,b);
        if(b._collisionWall && this.projectile(b)) return this.preWallContact(b,a);
        // Apenas jogador x espinho: preserva todas as demais interacoes.
        if(a.props?.tipo==='pc' && b.props?.tipo==='espinho') return this.spikeContact(a,b);
        if(b.props?.tipo==='pc' && a.props?.tipo==='espinho') return this.spikeContact(b,a);
        const swordA=a.props?.modelo==='espada', swordB=b.props?.modelo==='espada';
        if(swordA) this.swordPose(a);
        if(swordB) this.swordPose(b);
        if(swordA && b.props?.subtipo==='alavanca') return this.leverContact(a,b);
        if(swordB && a.props?.subtipo==='alavanca') return this.leverContact(b,a);
        const aa=this.box(a,swordA?'attackBox':(swordB||this.projectile(b))?'hurtBox':'collisionBox');
        const bb=this.box(b,swordB?'attackBox':(swordA||this.projectile(a))?'hurtBox':'collisionBox');
        if(this.overlaps(aa,bb)) return true;
        if(a._collisionSweep && this.sweep(a._collisionSweep.a,a._collisionSweep.dx,a._collisionSweep.dy,bb)!==null) return true;
        if(b._collisionSweep && this.sweep(b._collisionSweep.a,b._collisionSweep.dx,b._collisionSweep.dy,aa)!==null) return true;
        return false;
    }
    static sword(s,dt) {
        if(!this.swordPose(s)) return;
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
    static preWallContact(s,target) {
        const p=s._collisionSweep;
        if(!p || Math.hypot(p.dx,p.dy)<=this.eps) return false;
        return this.sweep(p.a,p.dx,p.dy,this.box(target,'hurtBox'))!==null;
    }
    static stopProjectile(s,kind) {
        if(s._stationaryFade) return;
        s._collisionExpired=true;
        s._collisionSweep=null;
        s.vx=0;s.vy=0;
        if(kind==='bounds') {
            if(!s.scene.toRemove.includes(s)) s.scene.toRemove.push(s);
            return;
        }
        const alpha=s.toggled?0.5:Math.max(0,Math.min(1,Number.isFinite(s.opacity)?s.opacity:1));
        s.toggled=false;s.opacity=alpha;
        s._stationaryFade={age:0,alpha,x:s.x,y:s.y};
    }
    static tickStationaryProjectile(s,dt) {
        const f=s._stationaryFade;
        if(!f) return false;
        const step=Number.isFinite(dt)?Math.max(0,dt):0;
        f.age+=step;
        s.x=f.x;s.y=f.y;s.vx=0;s.vy=0;
        const t=Math.min(1,f.age/Math.max(this.eps,this.projectileFadeSeconds));
        s.opacity=f.alpha*(1-t);
        if(t>=1 && !s.scene.toRemove.includes(s))s.scene.toRemove.push(s);
        return true;
    }
    static isLavaDevice(s) {
        return s?.props?.subtipo==='alavanca' && s.imagem==='switch' && s.imgX===0 && s.imgY===0;
    }
    static cleanupProjectiles(scene,dt=1/60) {
        const map=scene.map,z=this.size(map),n=this.bounds(map);
        for(const s of [...scene.spritesT,...scene.spritesTE]) {
            if(s.props?.modelo==='espada' || s._stationaryFade) continue;
            const outside=s.x<0 || s.y<0 || s.x>=n.w*z || s.y>=n.h*z;
            if(s._collisionWall || outside) {
                if(!scene.toRemove.includes(s)) {
                    if(outside || !s._projectileImpact || s._projectileImpact.kind==='bounds') {
                        s._collisionExpired=true;scene.toRemove.push(s);
                    } else this.stopProjectile(s,s._projectileImpact.kind);
                } else s._collisionExpired=true;
            }
            s._collisionSweep=null;
        }
    }
}
