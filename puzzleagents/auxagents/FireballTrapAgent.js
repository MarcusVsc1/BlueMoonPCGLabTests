class FireballTrapAgent {
    constructor() {
        this.defaultTag = "FireballTrapAgent"
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        var cell = this.encontrarCelulaInicial(room)
        collectible.fireBallInicial = gerenciador.criarFireball(cell.x, cell.y, level)
        collectible.onGet = this.onGet
        this.insertCollectible(room, collectible)
    }

    encontrarCelulaInicial(room) {
        var edgeCells = room.findEdgeCells()
        var terminalCells = room.terminalCells
        var largestDistance = 0
        var bestCell
        for (var edgeCell of edgeCells) {
            var totalDistance = 0
            for (var terminalCell of terminalCells) {
                totalDistance += Math.sqrt(Math.pow(edgeCell.x - terminalCell.x, 2) + Math.pow(edgeCell.y - terminalCell.y, 2));
            }
            if (totalDistance > largestDistance) {
                bestCell = edgeCell
                largestDistance = totalDistance
            }
        }
        return bestCell
    }

    onGet() {
        assetsMng.play('shot')
        cena1.adicionar(this.fireBallInicial)
        this.onGet = null
    }

    insertCollectible(room, collectible) {
        var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
        collectible.x = position.x
        collectible.y = position.y
        cena1.adicionar(collectible)
    }

}