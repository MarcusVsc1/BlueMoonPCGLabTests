class LeverAgent {

    leverEvent() {
        this.toggled = !this.toggled;
        cena1.map.cells[this.coordenadas[!this.toggled ? 1 : 0].y][this.coordenadas[!this.toggled ? 1 : 0].x].tipo = 4
        cena1.map.cells[this.coordenadas[this.toggled ? 1 : 0].y][this.coordenadas[this.toggled ? 1 : 0].x].tipo = 8
        cena1.assets.play("switchOn");
    }

    gerarPuzzle(mapGraph, puzzleGraph) {
        const indiceAleatorio = Math.floor(Math.random() * mapGraph.adjacencyList.length);
        var x = mapGraph.adjacencyList[indiceAleatorio].cells[1].y
        var y = mapGraph.adjacencyList[indiceAleatorio].cells[1].x

        gerenciador.estagios[0].mapa.cells[y][x].tipo = 8

        var pos1 = { x: x, y: y }

        var x = mapGraph.adjacencyList[indiceAleatorio > 0 ? 0 : 1].cells[1].y
        var y = mapGraph.adjacencyList[indiceAleatorio > 0 ? 0 : 1].cells[1].x

        var pos2 = { x: x, y: y }
        
        var coordenadas = [pos1, pos2]

        cena1.adicionar(gerenciador.criarAlavanca(19, 19, this.leverEvent, coordenadas))
    }
}