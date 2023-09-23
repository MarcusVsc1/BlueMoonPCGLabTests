class PuzzleAgentsManager {
    constructor(mapGraph) {
        this.mapGraph = mapGraph,
            this.raffle = [
                //new LavaRoomAgent(),
                //new LeverAgent(),
                new KeyAndDoorAgent()
            ],
            this.initialRoom = null
        this.finalRoom = null

        this.populatePuzzles()
    }

    populatePuzzles() {
        this.initiate()
        /*
        console.time("puzzles")
        var sortedRooms = this.mapGraph.sortRoomsByDistanceFromStart(this.initialRoom)
            .filter(room => room.roomId != this.initialRoom.roomId &&
                room.roomId != this.finalRoom.roomId &&
                (this.mapGraph.getNeighbors(room).length < 3 ||
                    (this.mapGraph.getNeighbors(room).length == 3 && this.mapGraph.hasEdgeBetweenRooms(room, this.initialRoom)) ||
                    (this.mapGraph.getNeighbors(room).length == 3 && this.mapGraph.hasEdgeBetweenRooms(room, this.finalRoom))
                ))

        this.initialRoom.tag = {"tipo": "inicio"}
        this.finalRoom.tag = {"tipo": "final"}

        /*
        loop para popular os puzzles no grafo de mapa
        */
        /*
        var roomIdx = 0
        var falhas = 0
        var finalizou = false
        while (!finalizou) {
            var room = sortedRooms[roomIdx]
            var agent = this.selecionarAgente(room)
            if (agent == null || agent.gerarPuzzle(this.mapGraph, room)) {
                roomIdx++
            } else {
                falhas++
            }
            finalizou = this.deveParar(roomIdx, sortedRooms, falhas)
        }
        
        console.timeEnd("puzzles")
        */
        /*
        //para teste de switch (interruptor)
        var sw = new SwitchAgent()
        sw.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        // para testes de sala de lava
        var lr = new LavaRoomAgent()
        lr.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        // para testes de alavanca
        var lv = new LeverAgent()
        lv.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        // testes de chave e porta
        var kd = new KeyAndDoorAgent()
        kd.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        //para testes de maze
        var mz = new MazeAgent()
        //mz.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        //para testes de sokoban
        */
        var sk = new SokobanAgent()
        sk.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        
    }

    initiate() {
        this.initialRoom = this.mapGraph.nodes.filter(node => node.terminalCells.length <= 2)[0]
        this.finalRoom = this.mapGraph.findFarthestRoomFromStart(this.initialRoom)
        console.log("Final room: " + this.finalRoom.roomId)
        var posicao = calcularPosicaoMedia(this.initialRoom.cells)

        cena1.pc.x = posicao.x * 32
        cena1.pc.y = posicao.y * 32
    }

    selecionarAgente(room){
        if(room.tag.tipo == undefined) {
            return this.raffle[0]
        } else {return null}
    }

    deveParar(roomIdx, sortedRooms, falhas) {
        return roomIdx >= sortedRooms.length || falhas > sortedRooms.length
    }
}