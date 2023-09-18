class KeyAndDoorAgent {


    gerarPuzzle(puzzleGraph) {
        var ps = selecionarPuzzleState(puzzleGraph);
        var gargalo = encontrarGargalo(ps.mapGraph)
        if(gargalo == null) {return null;}
        var rt = encontrarAreaIsolada(ps.mapGraph)
        if(rt == null) {return null;}
        return atualizarPuzzleGraph(puzzleGraph, rt, gargalo)
        /*
        //para teste
        var indiceAleatorio = Math.floor(Math.random() * mapGraph.adjacencyList.length);
        var x = mapGraph.adjacencyList[indiceAleatorio].cells[0].y
        var y = mapGraph.adjacencyList[indiceAleatorio].cells[0].x

        cena1.adicionar(gerenciador.criarChave(18, 18, 0));
        cena1.adicionar(gerenciador.criarChave(18, 19, 1));
        cena1.adicionar(gerenciador.criarChave(19, 20, 2));
        cena1.adicionar(gerenciador.criarChave(19, 18, 3));
        cena1.adicionar(gerenciador.criarPorta(y, x, 3));

        gerenciador.estagios[0].mapa.cells[y][x].tipo = 10
        */
    }

}