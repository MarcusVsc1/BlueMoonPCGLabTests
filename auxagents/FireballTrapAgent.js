class FireballTrapAgent {

    gerarAgenteAuxiliar(room, collectible, level){
        var cell = this.encontrarCelulaInicial(room)
        var fireBallInicial = gerenciador.criarFireball(cell.x, cell.y)
        cena1.adicionar(fireBallInicial)
    }

    encontrarCelulaInicial(room){
        var edgeCells = room.findEdgeCells()
        var terminalCells = room.terminalCells
        var largestDistance = 0
        var bestCell
        for(var edgeCell of edgeCells){
            var totalDistance = 0
            for(var terminalCell of terminalCells){
                totalDistance += Math.sqrt(Math.pow(edgeCell.x - terminalCell.x, 2) + Math.pow(edgeCell.y - terminalCell.y, 2));
            }
            if(totalDistance > largestDistance){
                bestCell = edgeCell
                largestDistance = totalDistance
            }
        }
        return bestCell
    }

}