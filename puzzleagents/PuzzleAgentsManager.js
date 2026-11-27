class PuzzleAgentsManager {
    constructor(mapGraph, deferPopulation = false) { // BM_LOADING_V1

        this.mapGraph = mapGraph,
            this.initialRoom = null,
            this.mainAgents = new Map([
                ['LavaRoomAgent', { agent: new LavaRoomAgent(), chance: 1, factor: 0.5 }],
                ['LeverAgent', { agent: new LeverAgent(), chance: 0.5, factor: 0.1 }],
                ['CombatRoom', { agent: new CombatRoom(), chance: 1, factor: 0.5 }],
                ['Hub', { agent: new Hub(), chance: 0.5, factor: 0.5 }],
                ['KeyAndDoorAgent', { agent: new KeyAndDoorAgent(), chance: 1, factor: 0.5 }]
            ]),

            this.auxAgents = new Map([
                ['FireballTrapAgent', { agent: new FireballTrapAgent(), chance: 1, factor: 0.5 }],
                ['IceRoomAgent', { agent: new IceRoomAgent(), chance: 1, factor: 0.5 }],
                ['MazeAgent', { agent: new MazeAgent(), chance: 1, factor: 0.5 }],
                ['AbyssAgent', { agent: new AbyssAgent(), chance: 1, factor: 0.5 }],
                ['SokobanAgent', { agent: new SokobanAgent(), chance: 1, factor: 0.5 }],
                ['SpikeAgent', { agent: new SpikeAgent(), chance: 1, factor: 0.5 }],
                ['SwitchAgent', { agent: new SwitchAgent(), chance: 1, factor: 0.5 }]
            ]);
        this.commons = new CommonsFactory();
        if(!deferPopulation)this.populatePuzzles()
    }

    populatePuzzles() { for(const _ of this.populatePuzzlesEtapas()){} }
    *populatePuzzlesEtapas() {
        this.initiate()

        console.time("puzzles")
        var sortedRooms = this.mapGraph.sortRoomsByDistanceFromStart(this.initialRoom)
            .filter(room => room.roomId != this.initialRoom.roomId &&
                (this.mapGraph.getNeighbors(room).length < this.mainAgents.size ||
                    (this.mapGraph.getNeighbors(room).length == this.mainAgents.length && this.mapGraph.hasEdgeBetweenRooms(room, this.initialRoom)) ||
                    (this.mapGraph.getNeighbors(room).length == this.mainAgents.length && this.mapGraph.hasEdgeBetweenRooms(room, this.finalRoom))
                ))

        this.initialRoom.tag = { tipo: "inicio", auxiliar: "ignore" }
        console.log("Room inicial: " + this.initialRoom.roomId)

        /*
        loop para popular os puzzles no grafo de mapa
        */

        this.criarTags(sortedRooms);
        var orderedRooms = this.ordenarPorNivel(this.mapGraph)
        // BM_PATH_AGENT_V1: diagnostic only, no RNG, no mutation of room tags.
        this.bmPathAgentReport = PathAgent.report(this.mapGraph, orderedRooms, {
            initialRoom:this.initialRoom,
            exitRoom:orderedRooms.filter(r=>r.tag?.auxiliar==null).at(-1)
        });
        console.debug('[PathAgent V1] candidatos e bloqueios', this.bmPathAgentReport);
        this.bmAllocatePassageMazes(orderedRooms);
        this.bmAllocateAbyss(orderedRooms);

        let bmRoomIndex=0;
        for(var room of orderedRooms){
            const bmPuzzle=room.tag?.auxiliar==='SokobanAgent'?' — Selos Rúnicos':'';
            yield {phase:3,label:'Preparando desafios'+bmPuzzle,done:bmRoomIndex,total:orderedRooms.length};
            bmRoomIndex++;
            if(room.tag.auxiliar != 'ignore' && room.tag.auxiliar != null){
                var agent = this.auxAgents.get(room.tag.auxiliar) ?? this.mainAgents.get(room.tag.auxiliar)
                if(room.tag.auxiliar==='AbyssFallback')this.bmAbyssFallback(room);
                if(agent) {
                    this.bmGenerateAuxiliary(agent, room, this.calcularNivel(orderedRooms.indexOf(room), orderedRooms.length - 2))
                }
            }
        }

        yield {phase:3,label:'Distribuindo recompensas e saída',done:bmRoomIndex,total:orderedRooms.length};
        var undefinedAuxOrederedRooms = orderedRooms.filter(room => {return room.tag.auxiliar == null})
        this.commons.posicionarTeleporte(3, undefinedAuxOrederedRooms[undefinedAuxOrederedRooms.length - 1],6,8.9)
        for(var i = undefinedAuxOrederedRooms.length - 2; i >= 0; i --) {
            var room = undefinedAuxOrederedRooms[i]
            this.commons.posicionarPoderes(room,this.calcularNivel(orderedRooms.indexOf(room), orderedRooms.length))
        }

        console.timeEnd("puzzles")

        /*
        //para teste de switch (interruptor)
        var sw = new SwitchAgent()
        sw.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        // para testes de sala de lava
        // para testes de alavanca
        // testes de chave e porta
        var kd = new KeyAndDoorAgent()
        kd.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        var lv = new LeverAgent()
        lv.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        //para testes de maze
        var mz = new MazeAgent()
        //mz.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        //para testes de sokoban
        
        var sk = new SokobanAgent()
        sk.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        
        var lr = new LavaRoomAgent()
        lr.gerarTag(this.mapGraph, this.puzzleGraph)
        */
    }

    initiate() {
        this.initialRoom = this.mapGraph.nodes.filter(node => node.terminalCells.length <= 2)[0]
        var posicao = calcularPosicaoMedia(this.initialRoom.cells)

        cena1.pc.x = posicao.x * 32
        cena1.pc.y = posicao.y * 32
    }

    criarTags(sortedRooms) {
        var roomIdx = 0;
        while (roomIdx < sortedRooms.length) {
            var room = sortedRooms[roomIdx];
            if (room.tag != null) {
                var availableAgents = this.verificarAgentesDisponiveis(room, 'subTipo', this.mainAgents);
                // BLUEMOON_LAVA_UNICA_SORTEIO: exclui somente do sorteio, preserva o registro do agente.
                if (this.mainAgents.get('LavaRoomAgent').agent.hasBoots) {
                    availableAgents.delete('LavaRoomAgent');
                }
                while (availableAgents.size > 0) {
                    const agentKey = this.sortearAgente(availableAgents);
                    var agent = this.mainAgents.get(agentKey).agent;
                    if (!agent.gerarTag(this.mapGraph, room)) {
                        availableAgents.delete(agentKey);
                    } else {
                        var newAgent = this.mainAgents.get(agentKey);
                        newAgent.chance *= newAgent.factor;
                        this.mainAgents.set(agentKey, newAgent);
                        if (!room.tag.auxiliar) { 
                            this.criarTagAuxiliar(room)
                        }
                        break;
                    }

                }
            }
            roomIdx++;
        }
    }

    criarTagAuxiliar(room, excluded = new Set()) {
        var availableAgents = this.verificarAgentesDisponiveis(room, 'auxiliar', this.auxAgents);
        for(const key of excluded)availableAgents.delete(key);
        if(room.tag?.tipo==='hub'||room.tag?.subTipo==='Hub'||room.tag?.auxiliar==='Hub')availableAgents.delete('MazeAgent'); // BM_MAZE_NO_HUB_V1
        if(AbyssAgent.isRestHub(room))availableAgents.delete('AbyssAgent'); // BM_ABYSS_NO_HUB_V5_1
        if(this.mapGraph.getNeighbors(room).some(AbyssAgent.hazard)) {availableAgents.delete('MazeAgent');availableAgents.delete('AbyssAgent');}
        while (availableAgents.size > 0) {
            const agentKey = this.sortearAgente(availableAgents);
            var agent = this.auxAgents.get(agentKey).agent;
            if (!agent.gerarTagAuxiliar(this.mapGraph, room)) {
                availableAgents.delete(agentKey);
            } else {
                var newAgent = this.auxAgents.get(agentKey);
                newAgent.chance *= newAgent.factor;
                this.auxAgents.set(agentKey, newAgent);
                break;
            }

        }
    }

    // BM_PASSAGE_MAZE_V1: cada MazeAgent sorteado fornece no maximo um labirinto.
    bmAllocatePassageMazes(orderedRooms) {
        const graph=this.mapGraph, maze=this.auxAgents.get('MazeAgent').agent;
        const rooms=[...new Set(orderedRooms)];
        const donors=rooms.filter(r=>r.tag?.auxiliar==='MazeAgent'&&!r.bmPassageMaze);
        const isMaze=r=>AbyssAgent.hazard(r);
        const map=gerenciador.estagios[0].mapa.cells;
        const plain=r=>r.cells.every(c=>map[c.x]?.[c.y]?.tipo===0);
        // A ultima sala sem auxiliar e reservada ao teleporte de saida.
        const exit=rooms.filter(r=>r.tag?.auxiliar==null).at(-1);
        const eligible=(r,donor)=>{
            if(r===exit||r===this.initialRoom||r===donor||r.tag?.collectible||r.restricoes?.length)return false;
            // Nao retirar nenhum desafio ou item de progressao ja atribuido.
            // Never convert a rest hub. Only a dedicated passage slot may be used.
            if(r.tag?.tipo==='hub'||r.tag?.subTipo==='Hub'||r.tag?.auxiliar==='Hub')return false;
            if(r.bmMazePassageSlot!==true||r.tag?.auxiliar!=='ignore')return false;
            if(r.roomWidth<5||r.roomHeight<5||r.cells.length<36||r.cells.length!==r.roomWidth*r.roomHeight)return false;
            if(graph.getNeighbors(r).length!==2||r.terminalCells.length!==2||!plain(r))return false;
            if(graph.getNeighbors(r).some(n=>n!==donor&&isMaze(n)))return false;
            const edges=graph.getCorridorsFromRoom(r);
            if(edges.length!==2)return false;
            // A geometria atual do gerador garante que cada corredor toca uma unica entrada.
            const portals=edges.map(e=>e.fromRoom===r.roomId?e.cells[0]:e.cells[e.cells.length-1]);
            return portals.every(p=>p&&r.terminalCells.filter(t=>Math.abs(t.x-p.x)+Math.abs(t.y-p.y)===1).length===1)
                &&r.terminalCells.every(t=>portals.filter(p=>Math.abs(t.x-p.x)+Math.abs(t.y-p.y)===1).length===1);
        };
        // Orcamento e decaimento originais ja foram aplicados durante criarTags.
        // Sem candidato, mantem o labirinto original e a recompensa.
        for(const donor of donors){
            if(random.nextRandFloat()>=0.40)continue;
            if(!donor.tag.collectible)continue;
            const candidates=rooms.filter(r=>eligible(r,donor));
            while(candidates.length){
                const target=candidates.splice(Math.floor(random.nextRandFloat()*candidates.length),1)[0];
                const layout=maze.generatePassage(target);if(!layout)continue;
                const oldTag=donor.tag;
                donor.tag={...oldTag,auxiliar:null};
                this.criarTagAuxiliar(donor,new Set(['MazeAgent','AbyssAgent']));
                if(!donor.tag.auxiliar){donor.tag=oldTag;break;}
                donor.bmMazeReallocated=true;
                target.tag={tipo:'mazePassage',subTipo:'MazePassage',auxiliar:'MazeAgent'};
                target.bmPassageMaze=layout;
                break;
            }
        }
    }
    // BM_ABYSS_AGENT_V4: a selected auxiliary ticket can move to an empty hub.
    bmAllocateAbyss(orderedRooms) {
        const graph=this.mapGraph,abyss=this.auxAgents.get('AbyssAgent').agent;
        const rooms=[...new Set(orderedRooms)],exit=rooms.filter(r=>r.tag?.auxiliar==null).at(-1);
        const level=r=>AbyssAgent.level(this.calcularNivel(orderedRooms.indexOf(r),orderedRooms.length-2));
        const donors=rooms.filter(r=>r.tag?.auxiliar==='AbyssAgent'&&r.bmAbyssPlan?.result.mode==='treasure');
        const eligible=(r,donor)=>!AbyssAgent.isRestHub(r)&&r!==exit&&r!==this.initialRoom&&r!==donor&&!r.tag?.collectible&&
            r.bmAbyssPassageSlot===true&&r.tag?.auxiliar==='ignore'&&!r.restricoes?.length&& // BM_ABYSS_COMBAT_V5
            !graph.getNeighbors(r).some(n=>n!==donor&&AbyssAgent.hazard(n))&&!!abyss.geometry(graph,r,2);
        for(const donor of donors){
            if(AbyssAgent.lever(donor)||!donor.tag.collectible||graph.getNeighbors(donor).some(AbyssAgent.hazard)){
                this.bmReplaceAbyss(donor);continue;
            }
            if(random.nextRandFloat()>=.40)continue;
            const candidates=rooms.filter(r=>eligible(r,donor));
            while(candidates.length){
                const target=candidates.splice(Math.floor(random.nextRandFloat()*candidates.length),1)[0];
                const resources={items:[]}; // Dedicated passage slots have no Hub resources.
                const plan=abyss.plan(graph,target,'passage',level(target));if(!plan)continue;
                const oldTag=donor.tag;
                donor.tag={...oldTag,auxiliar:null};
                this.criarTagAuxiliar(donor,new Set(['MazeAgent','AbyssAgent']));
                if(!donor.tag.auxiliar){donor.tag=oldTag;break;}
                delete donor.bmAbyssPlan;
                donor.bmAbyssReallocated=true;
                target.bmAbyssOriginalTag=target.tag;
                target.tag={tipo:'abyssPassage',subTipo:'AbyssPassage',auxiliar:'AbyssAgent'};
                target.bmAbyssPlan=plan;
                if(resources.recipient){resources.recipient.bmAbyssResourceReserved=true;target.bmAbyssMovedResources=resources.items;}
                break;
            }
        }
    }
    bmReplaceAbyss(room) {
        delete room.bmAbyssPlan;
        if(room.bmAbyssOriginalTag){room.tag=room.bmAbyssOriginalTag;delete room.bmAbyssOriginalTag;delete room.bmAbyssMovedResources;return;}
        room.tag={...room.tag,auxiliar:null};
        this.criarTagAuxiliar(room,new Set(['AbyssAgent','MazeAgent']));
        // Never turn a failed auxiliary into a final exit / power room.
        if(!room.tag.auxiliar)room.tag.auxiliar='AbyssFallback';
        room.bmAbyssReallocated=true;
    }
    bmAbyssFallback(room) {
        const item=room.tag.collectible;
        if(item){const base=room.cells[0];item.x=(base.x+room.roomWidth/2)*32;item.y=(base.y+room.roomHeight/2)*32;cena1.adicionar(item);}
        room.tag.auxiliar='ignore';return true;
    }
    bmGenerateAuxiliary(agent,room,level) {
        const previousType=room.tag.auxiliar;
        if(previousType==='AbyssFallback')return this.bmAbyssFallback(room);
        const result=agent.agent.gerarAgenteAuxiliar(room,room.tag.collectible,level);
        // Sokoban pode falhar na busca sem alterar a geometria (retorna false).
        // Para uma extremidade realocada, garante um segundo puzzle, nunca outro labirinto.
        if(result!==false)return result;
        if(previousType==='AbyssAgent'){
            this.bmReplaceAbyss(room);
            const alternative=this.auxAgents.get(room.tag.auxiliar)??this.mainAgents.get(room.tag.auxiliar);
            if(alternative&&alternative.agent.gerarAgenteAuxiliar(room,room.tag.collectible,level)!==false)return true;
            return this.bmAbyssFallback(room);
        }
        if(!room.bmMazeReallocated&&!room.bmAbyssReallocated)return result;
        const rejected=new Set(['MazeAgent','AbyssAgent','SokobanAgent',previousType]);
        room.tag.auxiliar=null;
        this.criarTagAuxiliar(room,rejected);
        if(room.tag.auxiliar){
            const alternative=this.auxAgents.get(room.tag.auxiliar);
            if(alternative && alternative.agent.gerarAgenteAuxiliar(room,room.tag.collectible,level)!==false)return true;
        }
        // Defesa final: nao perder uma chave/alavanca se nenhum puzzle aceitar a sala.
        const collectible=room.tag.collectible;
        const base=room.cells[0];
        collectible.x=(base.x+room.roomWidth/2)*32;
        collectible.y=(base.y+room.roomHeight/2)*32;
        room.tag.auxiliar='ignore';
        cena1.adicionar(collectible);
        return true;
    }
    sortearAgente(agents) {
        return UtilityMethods.lottery(agents)
    }

    verificarAgentesDisponiveis(room, tipo, agents) {
        const neighbors = this.mapGraph.getNeighbors(room)
        const jsonString = JSON.stringify([...agents]);
        return this.filterMainAgents(JSON.parse(jsonString), neighbors, tipo);
    }

    filterMainAgents(mainAgents, rooms, type) {
        const subTipos = new Set();

        rooms.forEach(room => {
            subTipos.add(room.tag[type]);
        })

        const filteredMainAgents = new Map([...mainAgents].filter(([key, value]) => {
            return !subTipos.has(key);
        }));

        return filteredMainAgents;
    }

    calcularNivel(distancia, total) {
        return Math.ceil((distancia / total) * 4);
    }

    /*
        este método ordena a sala de acordo com a progressão dos puzzles 
        (ex: uma sala que depende de uma chave pra entrar só vai entrar pra ordenação depois de encontrada a chave)
    */
    ordenarPorNivel(mapGraph) {
        var visitados = []
        var fila = [this.initialRoom]
        var colecionaveis = []
        var restricoes = []
        while (fila.length > 0) {
            var roomAtual = fila.shift()
            if (roomAtual.restricoes.length > 0) {
                restricao = { room: roomAtual, restricoes: [...roomAtual.restricoes] }
                restricoes.push(restricao)

                for (var collectible of colecionaveis) {
                    var agent = this.mainAgents.get(collectible.subTipo).agent
                    agent.verificarRestricoes(collectible, restricao)
                }
                if (restricao.restricoes.length == 0) {
                    var idx = restricoes.indexOf(restricao)
                    restricoes.splice(idx, 1)
                }

            }
            var restricao = restricoes.find(restricao => { return restricao.room == roomAtual })
            if (restricao == null) {
                if (roomAtual.tag.tipo == "colecionável") {
                    colecionaveis.push(roomAtual.tag)
                    this.verificarDependenciaRestricao(roomAtual.tag, restricoes, fila)
                }

                var unvisitedCorridors = mapGraph.getCorridorsFromRoom(roomAtual)
                    .filter(edge => { return !visitados.includes(mapGraph.getOtherRoomInCorridor(edge, roomAtual)) })

                for (const corridor of unvisitedCorridors) {
                    var neighbor = mapGraph.getOtherRoomInCorridor(corridor, roomAtual)
                    if (corridor.restricoes.length > 0) {
                        var restricao = { room: neighbor, restricoes: [...corridor.restricoes] }
                        for (var collectible of colecionaveis) {
                            var agent = this.mainAgents.get(collectible.subTipo).agent
                            agent.verificarRestricoes(collectible, restricao)
                        }
                        if (restricao.restricoes.length == 0) {
                            fila.push(neighbor)
                        } else {
                            restricoes.push(restricao)
                        }
                    } else {
                        fila.push(neighbor)
                    }
                }
                visitados.push(roomAtual)
            }
        }
        return visitados
    }

    verificarDependenciaRestricao(collectible, restricoes, fila) {
        var agent = this.mainAgents.get(collectible.subTipo).agent
        for (var restricao of restricoes) {
            agent.verificarRestricoes(collectible, restricao)
        }
        for (var restricao of restricoes) {
            if (restricao.restricoes.length == 0) {
                fila.push(restricao.room)
                var idx = restricoes.indexOf(restricao)
                restricoes.splice(idx, 1)
            }
        }
    }

}