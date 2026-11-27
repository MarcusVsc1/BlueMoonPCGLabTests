/* BlueMoon - mapa permanente, memoria de exploracao sem revelar drops ocultos. */
class DungeonMapSystem {
    // BM_MAP_V2: faixa, teleportes e mecanismos consumidos.
    static placementBounds(n){return {min:Math.ceil(n*.15),max:Math.min(n,Math.ceil(n*(n>=40?.40:n>=30?.45:n>=20?.50:.55)))};}
    static id='dungeonMap';
    static usedLavaDevices=new WeakSet();
    static key(x,y){return `${x},${y}`;}
    static cell(s,z){return {x:Math.floor(s.x/z),y:Math.floor(s.y/z)};}
    static tile(map,x,y){return map.cells?.[x]?.[y]?.tipo;}
    static safe(t){return t===0||t===1||t===2||t===4;}
    static opaque(t){return t==null||t===-1||t>=6;}
    static neighbors(x,y){return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]];}
    static reachable(map,pc){
        const p=this.cell(pc,map.SIZE),q=[p],dist=new Map([[this.key(p.x,p.y),0]]);
        for(let i=0;i<q.length;i++)for(const [x,y] of this.neighbors(q[i].x,q[i].y)){
            const k=this.key(x,y);if(dist.has(k)||!this.safe(this.tile(map,x,y)))continue;
            dist.set(k,dist.get(this.key(q[i].x,q[i].y))+1);q.push({x,y});
        }
        return {dist,cells:q};
    }
    static newItem(x,y){
        return new Sprite({x,y,w:32,h:32,spriteSize:32,vm:0,imgX:0,imgY:0,imagem:'dungeonMapIcon',swCD:.6,
            desenhar:desenharColecionavel,props:{tipo:'objeto',subtipo:'colecionavel',permanentId:this.id,inventoryKind:'permanent',droppable:false,mensagem:'Mapa adquirido! Consulte o comando do mapa nos controles.' /* BM_TUTORIAL_V1 */}});
    }
    static state(scene){return scene.stageIndex===0?scene.map?._bmDungeonMap:null;}
    static owned(scene){return !!scene.inventory?.hasPermanent(this.id);}
    static prepare(graph,map,scene,rand=()=>random.nextRandFloat()){
        const rooms=graph.nodes;if(rooms.length<16)return null;
        const owner=new Map(), corridors=new Set();
        for(const r of rooms)for(const c of r.cells)owner.set(this.key(c.x,c.y),r);
        for(const e of graph.adjacencyList)for(const c of e.cells||[])if(!owner.has(this.key(c.x,c.y)))corridors.add(this.key(c.x,c.y));
        const s={map,graph,owner,corridors,rooms:new Set(),terrain:new Map(),walked:new Set(),stubs:new Set(),markers:new Map(),puzzles:new Map(),arenaStates:new Map(),open:false,elapsed:1,last:null,zoom:1,panX:0,panY:0,carrier:null,item:null,placed:false};
        map._bmDungeonMap=s;
        const start=rooms.find(r=>r.tag?.tipo==='inicio')||owner.get(this.key(Math.floor(scene.pc.x/map.SIZE),Math.floor(scene.pc.y/map.SIZE)));
        // BM_MAP_CARRIER_V3: mapa nao cria inimigos, nem expande a faixa de progresso.
        const d=graph.calculateDistancesFromStart(start),ordered=[...rooms].sort((a,b)=>(d.get(a)??Infinity)-(d.get(b)??Infinity)||a.roomId-b.roomId);
        const bounds=this.placementBounds(rooms.length);
        const preferred=new Set(ordered.slice(bounds.min,bounds.max));
        const eligibleRoom=r=>preferred.has(r)&&r!==start&&r.tag?.tipo!=='pathAgent';
        const z=map.SIZE, candidates=[];
        const roomOf=e=>{const p=this.cell(e,z);return owner.get(this.key(p.x,p.y));};
        const alive=e=>e?.props?.tipo==='npc'&&e.vidas>0&&!e.drop&&!e.props.summoned&&e.imagem!=='flame2';
        const stageSprites=scene.gamer.estagios[0].sprites||[];
        for(const e of new Set([...(scene.spritesE||[]),...stageSprites])){
            const r=roomOf(e);
            if(alive(e)&&eligibleRoom(r))candidates.push({enemy:e,room:r});
        }
        for(const a of map._bmCombatArenas||[]){
            if(!eligibleRoom(a.room)||!a.specs?.length)continue;
            a.specs.forEach((spec,index)=>{
                if(spec.type!=='ignisFatuus'&&!spec.drop)candidates.push({arena:a,index,room:a.room});
            });
        }
        const select=list=>list[Math.min(list.length-1,Math.max(0,Math.floor(rand()*list.length)))];
        const chosen=candidates.length?select(candidates):null;
        s.placementBounds=bounds;
        s.placementBand=chosen?'preferred':'ground';
        s.item=this.newItem(scene.pc.x,scene.pc.y);
        if(chosen){
            s.carrier=chosen;
            if(chosen.enemy)chosen.enemy.drop=s.item;
            else chosen.arena._bmMapCarrier={index:chosen.index,item:s.item};
        } else {
            // Fallback: somente piso livre na faixa, nunca em PathAgent.
            // Acessibilidade imediata e preferencia, nao requisito (portas podem abrir).
            const reach=this.reachable(map,scene.pc);
            const occupied=[...(scene.spritesE||[]),...(scene.spritesO||[]),...(scene.spritesPoder||[]),...(scene.spritesTP||[]),...(scene.spritesEV||[]),...(scene.spritesSpike||[]),...stageSprites,scene.pc];
            const blocked=new Set(occupied.map(o=>{const p=this.cell(o,z);return this.key(p.x,p.y);}));
            const arenas=new Set((map._bmCombatArenas||[]).map(a=>a.room));
            const floor=[];
            for(const r of ordered.filter(eligibleRoom)){
                // Preferir celulas normais; nunca buracos, lava, portas, espinhos ou objetos.
                for(const c of r.cells){
                    const k=this.key(c.x,c.y);
                    if(owner.get(k)!==r||![0,2,4].includes(this.tile(map,c.x,c.y))||blocked.has(k))continue;
                    floor.push({c,r,rank:(arenas.has(r)?2:0)+(reach.dist.has(k)?0:1)});
                }
            }
            // Priorizar piso atualmente alcancavel, fora de arenas; depois, piso de salas fechadas.
            const best=floor.length?Math.min(...floor.map(p=>p.rank)):Infinity;
            const target=floor.length?select(floor.filter(p=>p.rank===best)):null;
            if(target){
                s.item.x=(target.c.x+.5)*z;s.item.y=(target.c.y+.5)*z;
                // Posicionamento inicial deliberado: beforeAdd so corrige drops em runtime.
                s.placed=true;scene.adicionar(s.item);
                s.placementRoom=target.r.roomId;
            }else{
                // Nao violar a faixa nem inventar um inimigo em geometria excepcional.
                s.item=null;s.placementBand='unavailable';
                console.warn('[DungeonMap V3] sem piso livre na faixa',bounds);
            }
        }
        if(chosen)s.placementRoom=chosen.room.roomId;
        console.debug('[DungeonMap V3] distribuicao',{bounds,eligible:candidates.length,placement:s.placementBand,roomId:s.placementRoom,carrier:chosen?(chosen.enemy?'enemy':'arena'):null});
        return s;
    }
    static armArena(a,made){const c=a._bmMapCarrier;if(!c)return;if(made[c.index]&&!made[c.index].drop){made[c.index].drop=c.item;const s=a.map._bmDungeonMap;if(s?.carrier)s.carrier.enemy=made[c.index];}}
    static beforeAdd(scene,sprite){
        if(sprite?.props?.permanentId!==this.id)return;
        const s=this.state(scene);if(!s||sprite!==s.item||s.placed)return;
        const map=s.map,z=map.SIZE,p=this.cell(sprite,z),reach=this.reachable(map,scene.pc);
        const valid=c=>reach.dist.has(this.key(c.x,c.y))&&[0,2,4].includes(this.tile(map,c.x,c.y))&&!(scene.spritesSpike||[]).some(o=>{const q=this.cell(o,z);return q.x===c.x&&q.y===c.y;});
        if(!valid(p)){
            const c=reach.cells.filter(valid).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
            if(c){sprite.x=(c.x+.5)*z;sprite.y=(c.y+.5)*z;}else{sprite.x=scene.pc.x;sprite.y=scene.pc.y;}
        }
        s.placed=true;
    }
    static recover(scene,s){
        if(s.placed||this.owned(scene)||!s.carrier)return;
        const c=s.carrier;
        // Arena cancelada antes de materializar; ou portador removido sem a rotina normal de morte.
        const gone=c.enemy&&!scene.spritesE.includes(c.enemy)&&!scene.estagio?.sprites?.includes(c.enemy);
        if((c.arena?.state==='cancelled'&&(!c.enemy||gone))||(!c.arena&&gone)||(c.arena?.state==='cleared'&&gone)){
            s.item.x=scene.pc.x;s.item.y=scene.pc.y;scene.adicionar(s.item);
        }
    }
    // BM_MAP_KNOWN_HOLES_V1: buracos observados, sem revelar areas novas.
    static hole(t){return t===-1||t===8||t===9;}
    static visible(scene,s,x,y,terrainOnly=false){
        const z=s.map.SIZE,pc=scene.pc;
        if(x<scene.cameraX||x>=scene.cameraX+scene.w||y<scene.cameraY||y>=scene.cameraY+Math.max(1,scene.h-120))return false;
        const p=this.cell({x,y},z),room=s.owner.get(this.key(p.x,p.y));
        if((scene.darkRooms||[]).includes(room)&&Math.hypot(x-pc.x,y-pc.y)>44)return false;
        // Amostragem conservadora: paredes e grades ocultam objetos atras delas.
        const n=Math.ceil(Math.hypot(x-pc.x,y-pc.y)/(z/4));
        const end=this.key(p.x,p.y),start=this.key(Math.floor(pc.x/z),Math.floor(pc.y/z));
        for(let i=1;i<n;i++){const a=this.cell({x:pc.x+(x-pc.x)*i/n,y:pc.y+(y-pc.y)*i/n},z),k=this.key(a.x,a.y);if(k!==start&&k!==end&&this.opaque(this.tile(s.map,a.x,a.y))&&!(terrainOnly&&this.hole(this.tile(s.map,a.x,a.y))))return false;}
        return true;
    }
    static classify(o){
        const p=o.props||{};
        if(p.tipo==='teleporte')return 'teleport';
        if(p.subtipo==='porta')return 'door';
        if(p.subtipo==='colecionavel')return o.keyId!=null?'key':p.permanentId==='lavaBoots'||p.event==='lava'?'boots':p.permanentId===this.id?'map':'item';
        if(p.tipo==='poder')return p.modelo==='heart'||p.modelo==='hp'?'heart':'mana';
        if(p.subtipo==='alavanca')return 'switch';
        return null;
    }
    static isUsedLavaDevice(o){
        const device=o?.props?.subtipo==='alavanca'&&o.imagem==='switch'&&o.room?.cells&&
            ((typeof CollisionSystem!=='undefined'&&CollisionSystem.isLavaDevice?.(o))||(o.imgX===0&&o.imgY===0));
        if(device&&o.toggled)this.usedLavaDevices.add(o);
        return !!(o&&this.usedLavaDevices.has(o));
    }
    static observe(scene,dt=0,force=false){
        const s=this.state(scene);if(!s||scene.pc?.vidas<=0||scene.theEnd>0)return;
        const z=s.map.SIZE,p=this.cell(scene.pc,z),k=this.key(p.x,p.y),r=s.owner.get(k);
        if(r)s.rooms.add(r);else if(s.corridors.has(k))s.walked.add(k);
        // BM_ABYSS_MAP_V4: only after entering this room. Terrain only; markers retain visibility rules.
        if(r?.bmAbyss)for(const c of r.cells)s.terrain.set(this.key(c.x,c.y),this.tile(s.map,c.x,c.y));
        s.elapsed+=Math.max(0,Number.isFinite(dt)?dt:0);
        if(!force&&s.last===k&&s.elapsed<.10)return;
        s.elapsed=0;s.last=k;this.recover(scene,s);
        // O contorno da sala visitada e conhecido, mas sua topologia interna e obstaculos
        // so sao registrados quando visiveis. Corredores nao percorridos nao sao revelados.
        const cx=Math.floor(scene.cameraX/z),cy=Math.floor(scene.cameraY/z);
        for(let x=Math.max(0,cx);x<=Math.min(s.map.COLUMNS-1,cx+Math.ceil(scene.w/z));x++)for(let y=Math.max(0,cy);y<=Math.min(s.map.LINES-1,cy+Math.ceil((scene.h-120)/z));y++){
            const q=this.key(x,y),rr=s.owner.get(q),t=this.tile(s.map,x,y);
            const visited=rr&&s.rooms.has(rr),corr=s.walked.has(q),stub=s.corridors.has(q)&&this.neighbors(x,y).some(([a,b])=>s.rooms.has(s.owner.get(this.key(a,b))));
            // Uma celula de buraco no corredor nao pode ser percorrida. Aceitar a
            // vizinhanca de corredor ja percorrido, somente sob linha de visao.
            const nearHole=s.corridors.has(q)&&this.hole(t)&&this.neighbors(x,y).some(([a,b])=>s.walked.has(this.key(a,b)));
            const known=s.terrain.has(q);
            if(!(visited||corr||stub||nearHole||known||t===5)||!this.visible(scene,s,(x+.5)*z,(y+.5)*z,this.hole(t)))continue;
            if(stub&&!corr)s.stubs.add(q);
            s.terrain.set(q,t);
        }
        // Atualiza o estado 4 <-> 8 das passagens JA descobertas. Nao cria novas entradas.
        for(const [q,t] of s.terrain){
            if(t!==4&&t!==8)continue;
            const [x,y]=q.split(',').map(Number),now=this.tile(s.map,x,y);
            if(now===4||now===8)s.terrain.set(q,now);
        }
        // Atualiza apenas tiles de lava ja conhecidos quando o dispositivo foi acionado.
        for(const o of scene.spritesO||[]){
            if(!this.isUsedLavaDevice(o))continue;
            for(const c of o.room?.cells||[]){const q=this.key(c.x,c.y);if(s.terrain.get(q)===5&&this.tile(s.map,c.x,c.y)!==5)s.terrain.set(q,this.tile(s.map,c.x,c.y));}
        }
        const objects=[...(scene.spritesO||[]),...(scene.spritesPoder||[]),...(scene.spritesTP||[])],present=new Set(objects);
        for(const [o,m] of s.markers){if(this.isUsedLavaDevice(o)||scene.inventory?.hidden(o)||(!present.has(o)&&this.visible(scene,s,m.x,m.y)))s.markers.delete(o);}
        for(const o of objects){
            const kind=this.classify(o);if(!kind||this.isUsedLavaDevice(o)||scene.toRemove?.includes(o)||scene.inventory?.hidden(o))continue;
            const c=this.cell(o,z),q=this.key(c.x,c.y),rr=s.owner.get(q);
            if(!(s.rooms.has(rr)||s.walked.has(q)||s.stubs.has(q)||s.corridors.has(q)&&this.neighbors(c.x,c.y).some(([x,y])=>s.walked.has(this.key(x,y))))||!this.visible(scene,s,o.x,o.y))continue;
            if(kind==='switch'&&o.switchId&&typeof SwitchAgent!=='undefined'&&SwitchAgent.switchGroups?.[Math.floor((o.switchId-1)/4)]?.rewardCount===4){s.markers.delete(o);if(rr)s.puzzles.set(rr,'done');continue;}
            s.markers.set(o,{kind,x:o.x,y:o.y,asset:o.imagem,keyId:o.keyId??o.doorId,spriteSize:o.spriteSize,imgX:o.imgX});
        }
        for(const sp of scene.spritesSpike||[]){const c=this.cell(sp,z),rr=s.owner.get(this.key(c.x,c.y));if(s.rooms.has(rr)&&this.visible(scene,s,sp.x,sp.y))s.puzzles.set(rr,'hazard');}
        if(r&&s.puzzles.get(r)==='hazard'&&!(scene.spritesSpike||[]).some(sp=>{const c=this.cell(sp,z);return s.owner.get(this.key(c.x,c.y))===r;}))s.puzzles.delete(r);
        const puzzles=new Set(scene.sokobans||[]);
        for(const puzzle of puzzles){if(s.rooms.has(puzzle.room)&&(puzzle.boxes||[]).some(o=>this.visible(scene,s,o.x,o.y)))s.puzzles.set(puzzle.room,'sokoban');}
        for(const [rr,status] of s.puzzles)if(status==='sokoban'&&rr===r&&![...puzzles].some(a=>a.room===rr))s.puzzles.set(rr,'done');
        for(const a of s.map._bmCombatArenas||[])if(s.rooms.has(a.room)){if(['closing','active','cleared'].includes(a.state))s.arenaStates.set(a.room,a.state);else if(a.state==='cancelled')s.arenaStates.delete(a.room);}
    }
    static removed(scene){const s=this.state(scene);if(!s)return;for(const o of scene.toRemove||[]){const m=s.markers.get(o);if(m&&(scene.inventory?.hidden(o)||Math.hypot(m.x-scene.pc.x,m.y-scene.pc.y)<=s.map.SIZE*2))s.markers.delete(o);}}
    static toggle(scene){const s=this.state(scene);if(!s||!this.owned(scene)||scene.pc?.vidas<=0||scene.theEnd>0)return false;if(s.open){this.close(scene,s);return true;}if(scene.paused)return false;this.observe(scene,0,true);s.open=true;s.previousPaused=scene.paused;scene.paused=true;s.zoom=1;s.panX=0;s.panY=0;return true;}
    static close(scene,s=this.state(scene)){if(s?.open){s.open=false;scene.paused=s.previousPaused;s.drag=null;}}
    static pause(scene){const s=this.state(scene);if(!s?.open)return false;if(!this.owned(scene)||scene.pc.vidas<=0){this.close(scene,s);return false;}this.draw(scene,s);return true;}
    static bind(scene,canvas,target){BMMapGamepad.bind(scene,target);}
    static draw(scene,s){
        const ctx=scene.ctx,w=scene.w,h=scene.h,z=s.map.SIZE,pc=scene.pc;
        const frame={x:18,y:64,w:w-36,h:h-158},center={x:pc.x/z,y:pc.y/z};
        const points=[...s.rooms].flatMap(r=>r.cells).concat([...s.walked,...s.stubs,...s.terrain.keys()].map(k=>{const [x,y]=k.split(',').map(Number);return {x,y};}));
        const dx=Math.max(2,...points.map(c=>Math.abs(c.x+.5-center.x))),dy=Math.max(2,...points.map(c=>Math.abs(c.y+.5-center.y)));
        const scale=Math.max(1,Math.min(20,(frame.w-30)/(2*dx+2),(frame.h-30)/(2*dy+2)))*s.zoom;
        const X=x=>frame.x+frame.w/2+(x-center.x)*scale+s.panX,Y=y=>frame.y+frame.h/2+(y-center.y)*scale+s.panY;
        const rect=(x,y,color)=>{ctx.fillStyle=color;ctx.fillRect(X(x),Y(y),scale+.2,scale+.2);};
        const text=(str,x,y,size=14,color='#e7e0cf',align='left')=>{ctx.fillStyle=color;ctx.font=`${size}px Arial`;ctx.textAlign=align;ctx.fillText(str,x,y);};
        const roomPoint=r=>({x:r.cells.reduce((n,c)=>n+c.x+.5,0)/r.cells.length,y:r.cells.reduce((n,c)=>n+c.y+.5,0)/r.cells.length});
        ctx.save();try{
            ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#181b24';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#af9864';ctx.strokeRect(8,8,w-16,h-16);
            text('MAPA DA MASMORRA',24,35,22,'#f1d495');text(`${s.rooms.size} / ${s.graph.nodes.length} salas visitadas`,w-24,35,14,'#c5c9d2','right');
            ctx.fillStyle='#0d1119';ctx.fillRect(frame.x,frame.y,frame.w,frame.h);ctx.save();ctx.beginPath();ctx.rect(frame.x,frame.y,frame.w,frame.h);ctx.clip();
            for(const r of s.rooms)for(const c of r.cells)rect(c.x,c.y,r===s.owner.get(this.key(Math.floor(center.x),Math.floor(center.y)))?'#344d61':'#343b49');
            for(const k of s.walked){const [x,y]=k.split(',').map(Number);rect(x,y,'#858b98');}
            for(const k of s.stubs)if(!s.walked.has(k)){const [x,y]=k.split(',').map(Number);rect(x,y,'#626879');}
            for(const [k,t] of s.terrain){const [x,y]=k.split(',').map(Number);if(t===5)rect(x,y,'#b7583e');else if(t===1)rect(x,y,'#477e9a');else if(this.hole(t))rect(x,y,'#806581');else if(t===4&&!s.owner.has(k)&&!s.walked.has(k)&&!s.stubs.has(k))rect(x,y,'#626879');else if(t===13)rect(x,y,'#b6554c');else if(t>=6&&t!==10)rect(x,y,'#20252d');}
            for(const [r,status] of s.puzzles){if(status==='done')continue;const p=roomPoint(r);text(status==='hazard'?'!':'◇',X(p.x),Y(p.y)+5,16,status==='hazard'?'#f18a6a':'#c2a2eb','center');}
            for(const [r,status] of s.arenaStates){if(status==='cleared')continue;const p=roomPoint(r);text('!',X(p.x),Y(p.y)+5,18,'#ff8c7e','center');}
            const symbols={key:'⚿',door:'▣',boots:'B',map:'M',item:'◆',heart:'♥',mana:'✦',teleport:'⇥',switch:'◇'};
            const colors={key:'#f2d384',door:'#e2bd75',boots:'#f2d384',map:'#f2d384',item:'#f2d384',heart:'#ff8790',mana:'#8ed7ff',teleport:'#8bd6a4',switch:'#c2a2eb'};
            const iconSize=Math.max(12,Math.min(26,scale*1.7));
            for(const m of s.markers.values()){
                const x=X(m.x/z),y=Y(m.y/z);let img;try{img=scene.assets.img(m.asset);}catch(_){}
                if(img&&img.naturalWidth>0&&m.asset!=='crystal'&&['key','door','boots','map','item','heart','mana'].includes(m.kind)){
                    // Usar os assets reais para preservar as cores das chaves/portas.
                    const size=m.kind==='door'||m.kind==='key'?32:m.spriteSize||32,sx=m.kind==='door'?96*(m.imgX||0):size*(m.imgX||0);
                    if(sx+size<=img.naturalWidth&&size<=img.naturalHeight){ctx.drawImage(img,sx,0,size,size,x-iconSize/2,y-iconSize/2,iconSize,iconSize);continue;}
                }
                text(symbols[m.kind]||'◆',x,y+5,iconSize,colors[m.kind]||'#e7e0cf','center');
            }
            ctx.fillStyle='#a8dfff';ctx.strokeStyle='#eef9ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(center.x),Y(center.y),Math.max(4,Math.min(8,scale*.5)),0,2*Math.PI);ctx.fill();ctx.stroke();ctx.restore();
            ctx.strokeStyle='#525d6d';ctx.strokeRect(frame.x,frame.y,frame.w,frame.h);
            text('● Lyra',24,h-70,14,'#a8dfff');text('◆ Itens / portas',110,h-70,14,'#f2d384');text('◇ Mecanismos',253,h-70,14,'#c2a2eb');text('! Perigo',390,h-70,14,'#f18a6a');text('⇥ Teleporte',485,h-70,14,'#8bd6a4');text('■ Buraco',610,h-70,14,'#bda1c2');
            text('Cinza claro: corredor percorrido  |  Cinza escuro: passagem nao explorada',24,h-50,12,'#b9bfcc');
            text('Setas: mover | '+BMControls.keyLabel(BMControls.key('previous'))+'/'+BMControls.keyLabel(BMControls.key('next'))+': zoom | '+BMControls.keyLabel(BMControls.key('confirm'))+'/'+BMControls.keyLabel(BMControls.key('sword'))+': centro | '+BMControls.keyLabel(BMControls.key('resetSokoban'))+': reset | '+BMControls.keyLabel(BMControls.key('map'))+'/Esc: fechar',24,h-31,12,'#c5c9d2');
            if(BMMapGamepad.connected()){const g=BMControls.preferred(),b=a=>BMControls.padLabel(g,a);text('Direcional: mover | '+b('previous')+'/'+b('next')+': zoom | '+b('confirm')+': centro | '+b('resetSokoban')+': reset | '+b('map')+'/'+b('fire')+': fechar',24,h-15,11,'#c5c9d2');}
        }finally{ctx.restore();}
    }
}
if(typeof module!=='undefined'&&module.exports)module.exports=DungeonMapSystem;

// BM_MAP_KEYBOARD_V2: teclado e joystick compartilham os comandos do mapa.
const BMMapGamepad = (() => {
    const held = new Set();
    const blocked = new Set();
    const keys = new Set(), captured = new Set(), pending = new Set();
    // BM_CONTROLS_V1 / BM_CONTROLS_V2 — mesmas acoes do gameplay.
    const keyAction=code=>{const a=BMControls.keyAction(code);return ({previous:'out',next:'in',confirm:'center',sword:'center',fire:'back',pause:'back',resetSokoban:'reset'})[a]||a;};
    const activeKey=name=>[...keys].some(k=>keyAction(k)===name);
    const bound = new WeakSet();
    function bind(scene,target) {
        if(bound.has(target))return;bound.add(target);
        target.addEventListener('keydown',e=>{
            const code=e.code,name=keyAction(code);
            if(!name||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||e.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||''))return;
            const s=DungeonMapSystem.state(scene),open=!!s?.open;
            const canOpen=name==='map'&&DungeonMapSystem.owned(scene)&&s&&scene.pc?.vidas>0&&!(scene.theEnd>0)&&!scene.paused;
            const first=!keys.has(code)&&!e.repeat;
            keys.add(code);
            if(!open&&!canOpen&&!captured.has(code))return;
            e.preventDefault();e.stopImmediatePropagation();captured.add(code);
            if(!first)return;
            if(name==='map'){DungeonMapSystem.toggle(scene);pending.clear();}
            else if(open&&name==='back'){DungeonMapSystem.close(scene,s);pending.clear();}
            else if(open&&(name==='center'||name==='reset'))pending.add(name);
        },true);
        target.addEventListener('keyup',e=>{keys.delete(e.code);captured.delete(e.code);},true);
        target.addEventListener('blur',()=>{keys.clear();captured.clear();pending.clear();});
    }
    const PAN_SPEED=280,ZOOM_SPEED=1.5;
    const button=BMControls.button,profile=BMControls.profile,direction=BMControls.direction;
    function update(scene,controller,dt){
        const g=controller.getJoystick(0),p=profile(g),now=new Set();
        if(g)for(const [name,i] of Object.entries(p))if(button(g,i))now.add(name);
        const rising=name=>now.has(name)&&!held.has(name);
        const s=DungeonMapSystem.state(scene);
        const wasOpen=!!s?.open;
        let consumed=wasOpen;
        if(typeof BMGameOver!=='undefined'&&BMGameOver.active?.()){held.clear();for(const a of now)held.add(a);pending.clear();return true;}
        if(rising('map')) {DungeonMapSystem.toggle(scene);consumed=true;}
        else if(wasOpen&&rising('back')) {DungeonMapSystem.close(scene,s);consumed=true;}
        else if(wasOpen){
            const step=Number.isFinite(dt)?Math.max(0,Math.min(.05,dt)):0;
            if(rising('reset')||pending.has('reset')) {s.zoom=1;s.panX=0;s.panY=0;}
            else if(rising('center')||pending.has('center')) {s.panX=0;s.panY=0;}
            else {
                const d=direction(g);
                const kx=Number(activeKey('right'))-Number(activeKey('left'));
                const ky=Number(activeKey('down'))-Number(activeKey('up'));
                d.x=kx||d.x;d.y=ky||d.y;
                const len=Math.hypot(d.x,d.y);if(len>1){d.x/=len;d.y/=len;}
                // Direcional move a camera do mapa, nao o desenho em si.
                s.panX-=d.x*PAN_SPEED*step;s.panY-=d.y*PAN_SPEED*step;
                const zoom=Number(BMControls.pressed(g,'next')||activeKey('in'))-Number(BMControls.pressed(g,'previous')||activeKey('out'));
                if(zoom){const old=s.zoom;const next=Math.max(.7,Math.min(8,old*Math.exp(zoom*ZOOM_SPEED*step)));s.zoom=next;s.panX*=next/old;s.panY*=next/old;}
            }
        }
        pending.clear();
        // Captura tambem teclas que ja estavam pressionadas ao abrir o mapa.
        if(wasOpen||s?.open)for(const k of keys)captured.add(k);
        // Zera o estado legado de acoes capturadas; keyup continua chegando ao InputController.
        const legacy={fire:'fireball',sword:'espada',resetSokoban:'resetSokoban'};
        for(const k of captured){
            controller._bmKeys?.delete(k);const name=legacy[BMControls.keyAction(k)];if(!name)continue;
            const c=controller.comandos[name];if(!c)continue;
            if(controller.teclas&&c.tecla)controller.teclas[c.tecla]=false;
            if(controller.teclas&&c.tecla2)controller.teclas[c.tecla2]=false;
            if(!BMControls.pressed(g,BMControls.legacy[name]))c.valor=false;
        }
        controller._bmSyncKeys?.();
        // Impede que o botao usado para sair dispare magia ou espada no primeiro
        // frame de gameplay. So bloqueia o componente do controle; teclado intacto.
        if(wasOpen||s?.open)for(const name of ['espada','fireball','resetSokoban']){
            const c=controller.comandos[name];if(c&&BMControls.pressed(g,BMControls.legacy[name]))blocked.add(name);
        }
        for(const name of [...blocked]){
            const c=controller.comandos[name];
            if(!c||!BMControls.pressed(g,BMControls.legacy[name])){blocked.delete(name);continue;}
            c.valor=!!(controller.teclas?.[c.tecla]||controller.teclas?.[c.tecla2]);
        }
        held.clear();for(const name of now)held.add(name);
        return consumed||!!s?.open;
    }
    function connected(){try{return Array.from(navigator.getGamepads?.()||[]).some(g=>g&&g.connected!==false);}catch(_){return false;}}
    return Object.freeze({update,connected,profile,direction,bind});
})();
