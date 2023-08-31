class PuzzleAgentsManager {
    constructor (mapGraph) {
        this.mapGraph = mapGraph,
        this.puzzleGraph = new Graph(),
        this.raffle = [
            new SwitchAgent(), 
            new LavaRoomAgent(), 
            new LeverAgent(), 
            new KeyAndDoorAgent(), 
            null, 
            null
        ],
        this.createPuzzleGraph()
    }

    createPuzzleGraph() {
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
        
    }
}