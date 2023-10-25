class PuzzleAgentsManager {
    constructor(mapGraph) {

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
                ['SokobanAgent', { agent: new SokobanAgent(), chance: 1, factor: 0.5 }],
                ['SpikeAgent', { agent: new SpikeAgent(), chance: 1, factor: 0.5 }],
                ['SwitchAgent', { agent: new SwitchAgent(), chance: 1, factor: 0.5 }]
            ]);
        this.commons = new CommonsFactory();
        this.populatePuzzles()
    }

    populatePuzzles() {
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

        for(var room of orderedRooms){
            if(room.tag.auxiliar != 'ignore' && room.tag.auxiliar != null){
                var agent = this.auxAgents.get(room.tag.auxiliar) ?? this.mainAgents.get(room.tag.auxiliar)
                if(agent) {
                    agent.agent.gerarAgenteAuxiliar(room, room.tag.collectible,this.calcularNivel(orderedRooms.indexOf(room), orderedRooms.length - 2))
                }
            }
        }

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

    criarTagAuxiliar(room) {
        var availableAgents = this.verificarAgentesDisponiveis(room, 'auxiliar', this.auxAgents);
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