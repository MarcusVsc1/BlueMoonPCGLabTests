class PuzzleAgentsManager {
    constructor (mapGraph) {
        this.mapGraph = mapGraph,
        this.puzzleGraph = new Graph(),
        this.raffle = [
            new SwitchAgent(), 
            null, null, null, null, null],
        this.createPuzzleGraph()
    }

    createPuzzleGraph() {
          //para teste de switch (interruptor)
        var sw = new SwitchAgent()
        sw.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        
    }
}