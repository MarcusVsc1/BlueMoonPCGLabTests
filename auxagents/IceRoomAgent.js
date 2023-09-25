class IceRoomAgent {

    gerarAgenteAuxiliar(room, collectible, level){
        this.fillRoomInteriorWithIce(room.cells)
        this.insertCollectible(room, collectible)
    }

    fillRoomInteriorWithIce(cells) {
        for (const cell of cells) {
            if (gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo != 6) {
                gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo = 1; // Ice tile
            }
        }
    }

    insertCollectible(room, collectible){
        var itemX = (room.cells[0].y + room.roomHeight / 2) * 32 + 16
        var itemY = (room.cells[0].x + room.roomWidth / 2) * 32 + 16
        cena1.adicionar(collectible)
    }

}