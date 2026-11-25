/* BlueMoon: converte parte das CombatRoom ja existentes; nao cria chaves/itens. */
class CombatArenaAgent {
    // BM_ARENA_INTEGRATION_V13: reparar tambem a classe efetivamente carregada pelo navegador.
    static ensureCombatRoomHook(){
        const proto=CombatRoom.prototype;
        const original=proto.gerarAgenteAuxiliar;
        if(typeof original!=='function')throw Error('CombatRoom sem gerarAgenteAuxiliar');
        if(original._bmArenaDeferred || /CombatArenaAgent\s*\.\s*defer\s*\(/.test(Function.prototype.toString.call(original)))return 'already-deferred';
        function arenaDeferred(room,collectible,level){
            const owner=this;
            CombatArenaAgent.defer(room,collectible,level,()=>original.call(owner,room,collectible,level));
        }
        arenaDeferred._bmArenaDeferred=true;
        proto.gerarAgenteAuxiliar=arenaDeferred;
        console.info('[BlueMoon Arena] CombatRoom runtime hook restaurado');
        return 'runtime-restored';
    }

    static defer(room,collectible,level,ordinary){
        const map=gerenciador.estagios[0].mapa;
        (map._bmCombatCandidates ||= []).push({room,collectible,level,ordinary});
    }
    static limit(n){return n<=6?1:n<=16?2:n<=20?3:n<=30?4:5;}
    static incoming(graph,room,edge){
        const start=graph.nodes.find(r=>r.tag?.tipo==='inicio');if(!start)return false;
        const seen=new Set([start]),queue=[start];
        for(let i=0;i<queue.length;i++)for(const e of graph.getCorridorsFromRoom(queue[i])){
            if(e===edge)continue;const next=graph.getOtherRoomInCorridor(e,queue[i]);
            if(next&&!seen.has(next)){seen.add(next);queue.push(next);}
        }
        return !seen.has(room)&&seen.has(graph.getOtherRoomInCorridor(edge,room));
    }
    static geometry(graph,map,scene,candidate,diagnostic=null){
        const reject=(reason,detail={})=>{if(diagnostic){diagnostic.reason=reason;Object.assign(diagnostic,detail);}return null;};
        const {room,collectible}=candidate,r=CombatArena.rules;
        if(collectible||room.tag?.collectible)return reject('colecionavel');
        if(room.tag?.tipo!=='combatRoom'||room.tag?.auxiliar!=='CombatRoom')return reject('tag_incompativel');
        if(room.roomWidth<r.minSide||room.roomHeight<r.minSide||room.cells.length<r.minArea)return reject('dimensoes');
        if(room.restricoes?.length)return reject('restricoes_sala',{restricoes:room.restricoes.map(t=>t.tipo||t.subTipo)});
        const edges=graph.getCorridorsFromRoom(room);if(edges.length<2)return reject('menos_de_duas_conexoes');
        const key=c=>CombatArena.key(c),tile=c=>CombatArena.tile(map,c)?.tipo;
        const cells=new Set(room.cells.map(key));
        const badFloor=room.cells.filter(c=>tile(c)!==0);
        if(badFloor.length)return reject('piso_nao_comum',{tiles:[...new Set(badFloor.map(tile))],totalTiles:badFloor.length});
        const objs=CombatArena.objects(scene),z=map.SIZE;
        const insideObjects=objs.filter(o=>cells.has(key(CombatArena.point(o,z))));
        if(insideObjects.length)return reject('objeto_na_sala',{objetos:insideObjects.map(o=>o.props?.subtipo||o.props?.modelo||o.props?.tipo||o.imagem||'?')});
        const locked=edges.filter(e=>[...(e.tags||[]),...(e.restricoes||[])].some(t=>(t.subTipo||t.tipo)==='KeyAndDoorAgent')||e.cells.some(c=>tile(c)===10));
        if(locked.length>1)return reject('multiplas_portas',{portas:locked.length});
        if(locked.length===1&&!this.incoming(graph,room,locked[0]))return reject('porta_na_saida');
        const gates=[];
        for(const e of edges){
            const end=e.fromRoom===room.roomId?e.cells[0]:e.cells[e.cells.length-1];
            if(!end||cells.has(key(end))||!CombatArena.around(end).some(c=>cells.has(key(c))))return reject('portal_invalido',{portal:end?key(end):null,edge:[e.fromRoom,e.toRoom]});
            const door=locked.includes(e);
            if(!CombatArena.floor(tile(end))&&!(door&&tile(end)===10))return reject('portal_tile_especial',{portal:key(end),tile:tile(end)});
            if(objs.some(o=>CombatArena.overlapsTile(o,end,z)&&!(door&&o.props?.subtipo==='porta')))return reject('objeto_no_portal',{portal:key(end)});
            gates.push({...end,edge:e});
        }
        const gateKeys=new Set(gates.map(key));if(gateKeys.size!==edges.length)return reject('portais_duplicados');
        // Toda abertura fisica precisa corresponder a um portal do grafo.
        for(const c of room.cells)for(const p of CombatArena.around(c)){
            if(cells.has(key(p))||gateKeys.has(key(p)))continue;
            if(!CollisionSystem.solid(map,p.x,p.y,{atravessa:0}))return reject('abertura_nao_registrada',{portal:key(p),tile:tile(p)});
        }
        const spawnCells=room.cells.filter(c=>CombatArena.around(c).every(p=>cells.has(key(p)))&&!gates.some(g=>Math.hypot(c.x-g.x,c.y-g.y)<2));
        if(spawnCells.length<9)return reject('poucos_spawns',{spawns:spawnCells.length});
        if(diagnostic){diagnostic.reason='elegivel';diagnostic.spawns=spawnCells.length;}
        return {map,room,cells,gates,spawnCells,state:'ready',saved:[],members:new Set(),markers:[],level:Math.max(1,Math.min(4,Number(candidate.level)||1))};
    }
    static composition(a,rand){
        const level=a.level,draw=list=>list[Math.min(list.length-1,Math.floor(rand()*list.length))];
        const pools={1:['caveira','diabinho'],2:['caveira','diabinho','morcego'],3:['caveira','diabinho','morcego','ogro'],4:['caveira','diabinho','morcego','ogro','necromante']};
        const count=a.room.cells.length>=49&&level>=3?3:2;
        const types=[];
        // No nivel do necromante, priorizar o escudeiro; maximo um por arena.
        if(level>=4&&typeof ShieldEnemy!=='undefined')types.push('escudeiro');
        while(types.length<count){const pool=pools[level].filter(t=>t!=='necromante'||!types.includes(t));types.push(draw(pool));}
        a.specs=types.map(type=>({type,preferred:{...draw(a.spawnCells)},direction:Math.floor(rand()*4),speed:type==='morcego'?40+rand()*25:null}));
    }
    static finalize(graph,map,scene,rand=()=>random.nextRandFloat()){
        const candidates=map._bmCombatCandidates||[];map._bmCombatCandidates=[];map._bmCombatArenas=[];
        const report={version:'1.3-integracao',rooms:graph.nodes.length,tagged:graph.nodes.filter(r=>r.tag?.auxiliar==='CombatRoom').map(r=>r.roomId),candidates:candidates.length,details:[],counts:{},selected:[]};
        map._bmCombatArenaReport=report;
        const eligible=candidates.map(c=>{
            const d={room:c.room.roomId,level:c.level,width:c.room.roomWidth,height:c.room.roomHeight,connections:graph.getCorridorsFromRoom(c.room).length,tipo:c.room.tag?.tipo,auxiliar:c.room.tag?.auxiliar};
            const a=this.geometry(graph,map,scene,c,d);report.details.push(d);
            return {c,a,tie:rand(),d};
        }).filter(x=>x.a);
        eligible.sort((x,y)=>y.a.level-x.a.level||x.tie-y.tie);
        // Ate metade das salas comuns elegiveis, com ao menos uma quando possivel.
        const cap=Math.min(this.limit(graph.nodes.length),Math.ceil(eligible.length/2));
        const chosen=new Set();
        for(const {c,a,d} of eligible){
            if(chosen.size>=cap){d.reason='limite';continue;}
            if(map._bmCombatArenas.some(b=>graph.getNeighbors(b.room).includes(a.room))){d.reason='arena_vizinha';continue;}
            this.composition(a,rand);map._bmCombatArenas.push(a);chosen.add(c);
            // Nao tocar nas tags compartilhadas da CombatRoom; apenas anotacao local.
            a.room.combatArena=true;d.reason='selecionada';report.selected.push(a.room.roomId);
        }
        for(const c of candidates)if(!chosen.has(c))c.ordinary();
        for(const d of report.details){const reason=d.reason||'sem_motivo';report.counts[reason]=(report.counts[reason]||0)+1;}
        report.eligible=eligible.length;report.cap=cap;
        console.info('[BlueMoon Arena diagnostico]',report);
        console.info('[BlueMoon Arena]',map._bmCombatArenas.map(a=>({room:a.room.roomId,level:a.level,enemies:a.specs.map(s=>s.type),gates:a.gates.map(({x,y})=>({x,y}))})));
        return map._bmCombatArenas;
    }
}
