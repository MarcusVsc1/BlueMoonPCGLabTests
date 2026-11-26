/* BM_RUN_V1: ciclo de vida da partida, sem checkpoints ou persistencia de progresso. */
const BMRun = (() => {
    const sizes=[6,12,16,20,30,40];
    let recipe=null, replayPending=false, replaying=false, pending=null, busy=false;
    function validate(option,seed){
        if(!Number.isInteger(option)||option<0||option>=sizes.length||!Number.isSafeInteger(seed))throw Error('Opcao ou seed invalida.');
    }
    function request(scene,option,seed){
        validate(option,seed);
        if(busy||pending||scene._bmRun)return false;
        pending={scene,option,seed};return true;
    }
    function take(scene){if(pending?.scene!==scene)return null;const next=pending;pending=null;return next;}
    function finish(scene,status){
        const r=scene._bmRun;if(!r||!['playing','generating'].includes(r.status))return false;
        if(!['victory','defeat','restarted','abandoned','failed'].includes(status))throw Error('Resultado invalido.');
        r.status=status;scene.inventory?.metrics?.finish(status);return true;
    }
    function snapshot(scene){const r=scene._bmRun;return r?{option:r.option,seed:r.seed,seconds:r.seconds,kills:r.kills,visited:r.visited.size,total:r.total,cause:r.cause,status:r.status}:null;}
    function resetSwitches(){
        if(typeof SwitchAgent !== 'undefined'){
            SwitchAgent.id=0;
            SwitchAgent.switchGroups=[];
        }
    }
    function start(scene,option,seed){
        validate(option,seed);
        resetSwitches();
        replaying=replayPending&&recipe?.seed===seed&&recipe.option===option;
        replayPending=false;
        if(!replaying)recipe={seed,option,puzzles:new Map(),signature:null};
        scene._bmRun={option,seed,seconds:0,kills:0,visited:new Set(),owners:new Map(),total:sizes[option],cause:null,status:"generating"};
    }
    // Sokoban tem deadline de relogio. Reproduz exclusivamente o resultado inicial
    // e a quantidade de hashes consumidos; nenhuma caixa movida ou progresso e salvo.
    function sokoban(room,game,state,options){
        // BM_SEED_V1: orçamento por trabalho, nunca por relógio.
        // Mantém os limites individuais do solver e do MCTS; limita a 4 lotes.
        options={...options,deadline:Infinity,maxAttempts:Math.min(options?.maxAttempts??20,4)};
        if(!recipe)return SokobanDifficulty.generate(game,state,options);
        const key=JSON.stringify([room.roomId,room.cells[0],room.roomWidth,room.roomHeight]);
        if(replaying){const entry=recipe.puzzles.get(key);if(!entry)throw Error('Sokoban divergente na repeticao: '+key);
            for(let i=0;i<entry.draws;i++)random.seed32();Play.id=entry.playId;Play.boxId=entry.boxId;
            return structuredClone(entry.result);
        }
        const original=random.seed32;let draws=0;random.seed32=function(){draws++;return original.call(this);};
        try{const result=SokobanDifficulty.generate(game,state,options),winner=result.winner;
            recipe.puzzles.set(key,{draws,playId:Play.id,boxId:Play.boxId,result:structuredClone({winner:winner?{snapshot:winner.snapshot,board:winner.board,score:winner.score}:null,analysis:result.analysis,stats:result.stats})});return result;
        }finally{random.seed32=original;}
    }
    function firstDifference(a,b,path=''){
        if(Object.is(a,b))return null;
        if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return {path,original:a,repeticao:b};
        if(Array.isArray(a)&&a.length!==b.length)return {path:path+'.length',original:a.length,repeticao:b.length};
        for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
            const d=firstDifference(a[k],b[k],Array.isArray(a)?`${path}[${k}]`:`${path}.${k}`);
            if(d)return d;
        }
        return null;
    }
    function prepare(scene,graph){const r=scene._bmRun;if(!r)return; r.total=graph.nodes.length;for(const room of graph.nodes)for(const c of room.cells)r.owners.set(`${c.x},${c.y}`,room.roomId);
        const stage=scene.gamer?.estagios?.[0], map=stage?.mapa;
        const point=o=>({x:o.x,y:o.y,posX:o.posX,posY:o.posY,imagem:o.imagem,imgX:o.imgX,imgY:o.imgY,direcao:o.direcao,vidas:o.vidas,vm:o.vm,keyId:o.keyId,doorId:o.doorId,tipo:o.props?.tipo,modelo:o.props?.modelo,subtipo:o.props?.subtipo,idx:o.props?.idx,tX:o.tX,tY:o.tY,switchId:o.switchId,coordenadas:o.coordenadas});
        const signature=JSON.stringify({tiles:map?.cells?.map(col=>col.map(t=>t.tipo)),salas:graph.nodes.map(r=>[r.roomId,r.cells.map(c=>[c.x,c.y]),r.tag?.tipo,r.tag?.auxiliar,r.tag?.subTipo,r.tag?.id]),corredores:graph.adjacencyList?.map(e=>[e.fromRoom,e.toRoom,e.cells.map(c=>[c.x,c.y]),e.tags]),spritesEstagio:stage?.sprites?.map(point),...Object.fromEntries(['spritesE','spritesO','spritesTP','spritesEV','spritesSpike','spritesPoder'].map(k=>[k,(scene[k]||[]).map(point)])),sokobans:(scene.sokobans||[]).map(p=>[p.room.roomId,p.boxes.map(point),p.goals.map(point)]),arenas:map?._bmCombatArenas?.map(a=>[a.room.roomId,a.specs]),interruptores:typeof SwitchAgent==='undefined'?[]:SwitchAgent.switchGroups.map(g=>({correctCombination:g.correctCombination,reward:g.reward?point(g.reward):null})),inicio:[scene.pc.x,scene.pc.y]});
        if(replaying&&recipe.signature!==signature){
            const a=JSON.parse(recipe.signature),b=JSON.parse(signature);
            const details=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const d=firstDifference(a[k],b[k],k);if(d)details.push(d);}
            console.error('[Blue Moon Run] Divergencias da geracao',JSON.stringify({seed:r.seed,option:r.option,details}));
            throw Error('A geracao inicial divergiu da run original em '+details.map(d=>d.path).join(', ')+'; repeticao cancelada.');
        }
        recipe.signature=signature;replaying=false;r.status="playing";
        if(typeof console.info==='function')console.info('[Blue Moon Run] Geracao inicial validada', {seed:r.seed,option:r.option});
    }
    function observe(scene,dt){const r=scene._bmRun;if(!r||r.status!=="playing"||scene.paused||![0,3].includes(scene.stageIndex))return;
        r.seconds+=dt;if(scene.stageIndex===0){const z=scene.map?.SIZE||32;const id=r.owners.get(`${Math.floor(scene.pc.x/z)},${Math.floor(scene.pc.y/z)}`);if(id!==undefined)r.visited.add(id);}}
    function kill(scene){if(scene._bmRun?.status==="playing")scene._bmRun.kills++;}
    function rebuild(scene,request,stopAudio){ // BM_LOADING_V1
        for(const _ of rebuildSteps(scene,request,stopAudio)){};
    }
    function* rebuildSteps(scene,{mode,option,seed},stopAudio){
        if(busy)throw Error('Transicao de run ja em andamento.');
        if(!['new','retry','selection'].includes(mode))throw Error('Modo de run invalido.');
        if(mode!=='selection')validate(option,seed);
        if(mode==='retry'&&(!recipe||recipe.option!==option||recipe.seed!==seed||!recipe.signature))throw Error('Receita inicial indisponivel para esta seed.');
        busy=true;pending=null;
        try{
            if(mode!=='selection')yield {phase:0,label:'Preparando nova partida'};
            finish(scene,mode==='retry'?'restarted':'abandoned');
            stopAudio(scene,true,true);
            scene.limparCena();
            const player=new Sprite({x:206,y:176,w:12,h:12,imgX:0,imgY:0,vidas:7,maxVidas:7,imagem:'hero',comportar:porTeclasDirecionais(teclas),props:{tipo:'pc'}});
            pc=player;
            seedValueURL=mode==='selection'?Math.floor(Math.random()*4500000)+500000:seed;
            random=new SeedGenerator(String(seedValueURL),'sfc32');
            Room.id=0;Play.id=0;Play.boxId=0;resetSwitches();
            gerenciador=new GameManager(pc);
            const freshScene=new Scene({ctx:scene.ctx,w:scene.w,h:scene.h,assets:scene.assets,gamer:gerenciador});
            for(const k of Object.keys(scene))delete scene[k];Object.assign(scene,freshScene);scene.adicionar(pc);
            if(mode==='selection'){recipe=null;replayPending=false;replaying=false;scene.stageIndex=1;}
            else{
                replayPending=mode==='retry';scene.stageIndex=0;
                yield* gerenciador.criarNovaDungeonEtapas(option);
                yield {phase:6,label:'Masmorra pronta'};
                playTheme(option+1);
            }
            pc.vx=pc.vy=0;
        }catch(e){finish(scene,'failed');replayPending=false;replaying=false;throw e;}
        finally{busy=false;}
    }
    return {start,prepare,sokoban,observe,kill,finish,snapshot,request,take,rebuild,rebuildSteps};
})();
