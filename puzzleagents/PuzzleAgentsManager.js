class PuzzleAgentsManager {
    constructor(mapGraph) {

        this.mapGraph = mapGraph,
            this.initialRoom = null,
            this.finalRoom = null,
            this.mainAgents = new Map([
                ['LavaRoomAgent', { agent: new LavaRoomAgent(), chance: 1 }],
                ['LeverAgent', { agent: new LeverAgent(), chance: 1 }],
                //['CombatRoom', { agent: new CombatRoom(), chance: 1 }],
                //['Hub', { agent: new Hub(), chance: 0.5 }],
                ['KeyAndDoorAgent', { agent: new KeyAndDoorAgent(), chance: 1 }]
            ]),

            this.auxAgents = new Map([
                ['FireballTrapAgent', { agent: new FireballTrapAgent(), chance: 1 }],
                ['IceRoomAgent', { agent: new IceRoomAgent(), chance: 1 }],
                ['MazeAgent', { agent: new MazeAgent(), chance: 1 }],
                ['SokobanAgent', { agent: new SokobanAgent(), chance: 1 }],
                ['SpikeAgent', { agent: new SpikeAgent(), chance: 1 }],
                ['SwitchAgent', { agent: new SwitchAgent(), chance: 1 }]
            ]);

        this.populatePuzzles()
    }

    populatePuzzles() {
        this.initiate()

        console.time("puzzles")
        var sortedRooms = this.mapGraph.sortRoomsByDistanceFromStart(this.initialRoom)
            .filter(room => room.roomId != this.initialRoom.roomId &&
                (this.mapGraph.getNeighbors(room).length < 5 ||
                    (this.mapGraph.getNeighbors(room).length == this.mainAgents.length && this.mapGraph.hasEdgeBetweenRooms(room, this.initialRoom)) ||
                    (this.mapGraph.getNeighbors(room).length == this.mainAgents.length && this.mapGraph.hasEdgeBetweenRooms(room, this.finalRoom))
                ))

        this.initialRoom.tag = { "tipo": "inicio" }
        console.log("Room inicial: " + this.initialRoom.roomId)

        /*
        loop para popular os puzzles no grafo de mapa
        */

        var roomIdx = 0
        while (roomIdx < sortedRooms.length) {
            var room = sortedRooms[roomIdx]
            if (room.tag != null) {
                var availableAgents = this.verificarAgentesDisponiveis(room)
                while (availableAgents.size > 0) {
                    const agentKey = this.selecionarAgente(availableAgents)
                    var agent = this.mainAgents.get(agentKey).agent
                    if (!agent.gerarTag(this.mapGraph, room, this.auxAgents)) {
                        availableAgents.delete(agentKey)
                    } else {
                        var newAgent = this.mainAgents.get(agentKey)
                        newAgent.chance /= 2
                        this.mainAgents.set(agentKey, newAgent)
                        break
                    }

                }
            }
            roomIdx++
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
        var tags = this.mapGraph.nodes.map(node => { return { room: node.roomId, tag: node.tag.subTipo } })
        console.log(tags)
    }

    initiate() {
        this.initialRoom = this.mapGraph.nodes.filter(node => node.terminalCells.length <= 2)[0]
        this.finalRoom = this.mapGraph.findFarthestRoomFromStart(this.initialRoom)
        console.log("Final room: " + this.finalRoom.roomId)
        var posicao = calcularPosicaoMedia(this.initialRoom.cells)

        cena1.pc.x = posicao.x * 32
        cena1.pc.y = posicao.y * 32
    }

    selecionarAgente(agents) {
        return UtilityMethods.lottery(agents)
    }

    calcularNivel(distancia, total) {
        return Math.ceil((distancia / total) * 4);
    }

    verificarAgentesDisponiveis(room) {
        const neighbors = this.mapGraph.getNeighbors(room)
        const jsonString = JSON.stringify([...this.mainAgents]);
        return this.filterMainAgents(JSON.parse(jsonString), neighbors);
    }

    filterMainAgents(mainAgents, rooms) {
        const subTipos = new Set();

        rooms.forEach(room => {
            subTipos.add(room.tag.subTipo);
        })

        const filteredMainAgents = new Map([...mainAgents].filter(([key, value]) => {
            return !subTipos.has(key);
        }));

        return filteredMainAgents;
    }
}