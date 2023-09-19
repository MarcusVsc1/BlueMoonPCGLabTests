class PuzzleAgentsManager {
    constructor (mapGraph) {
        this.mapGraph = mapGraph,
        this.raffle = [
            new LavaRoomAgent(), 
            new LeverAgent(), 
            new KeyAndDoorAgent(), 
        ],
        this.createPuzzleGraph()
    }

    createPuzzleGraph() {
        /*
        loop para geração do grafo de puzzle
        */
        /*
        var puzzleGraph = new PuzzleGraph(this.mapGraph);
        var falhas = 0;
        var finalizou = false;
        while(!finalizou){
            var agent = selecionarAgente(puzzleGraph, raffle)
            var pgNew = agent.gerarPuzzle(puzzleGraph)
            if(pgNew != null && this.possuiSolucao(pgNew)) {
                puzzleGraph = pgNew;
                var complexidade = calcularComplexidadeSolucao(puzzleGraph)
            } else {
                falhas++;
            }
            finalizou = deveParar(puzzleGraph, falhas, complexidade)
        }
        return puzzleGraph;
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
        */
        //para testes de maze
        var mz = new MazeAgent()
        //mz.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        
        //para testes de sokoban
        var sk = new SokobanAgent()
        //sk.gerarPuzzle(this.mapGraph, this.puzzleGraph)
        
    }
}