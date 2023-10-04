class LavaRoomAgent {
    constructor() {
        this.hasBoots = false
        this.defaultTag = { tipo: "colecionável", subTipo: "LavaRoomAgent" }
    }

    gerarTag(mapGraph, room) {
        var lavaRoom = room
        if(this.hasBoots) {

            if(mapGraph.getNeighbors(room).some(neighbor => {return neighbor.tag.subTipo === "LavaRoomAgent" }) ||
                mapGraph.getNeighbors(room).length == 1 || Object.keys(room.tag).length > 0) {
                return false
            }
            lavaRoom = room

        } else {

            var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]
            room.tag = this.defaultTag  
            var collectible = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável")
            var validRooms = mapGraph.nodes
            .filter(node => {return !mapGraph.getNeighbors(node).some(node => {return node.tag.tipo === "colecionável" && node.tag.subTipo === "LavaRoomAgent"})})
            .filter(node => {return Object.keys(node.tag).length == 0})
            .filter(node => {return mapGraph.getNeighbors(node).length > 1})
            .filter(node => {return mapGraph.findCollectibleRoomsInPathByRoom(startRoom, node).length == collectible.length})
            if(validRooms.length == 0){
                return false
            }
            lavaRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
            this.positionLavaBoots(room)
            this.hasBoots = true

        }

        lavaRoom.tag = { tipo: "obstáculo", subTipo: "LavaRoomAgent" }
        this.fillRoomInteriorWithLava(lavaRoom.cells);
        this.createLavaRemoverDevice(lavaRoom)
    }

    fillRoomInteriorWithLava(cells) {
        for (const cell of cells) {
            if (gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo != 6) {
                gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo = 5; // Lava tile
            }
        }
    }

    positionLavaBoots(node) {
        var posicao = this.calcularPosicaoMedia(node.roomHeight, node.roomWidth)
        node.tag.collectible = gerenciador.criarBotaAntiLava(Math.floor(posicao.x / 32) + node.cells[0].x, Math.floor(posicao.y / 32) + node.cells[0].y)
        cena1.adicionar(gerenciador.criarBotaAntiLava(Math.floor(posicao.x / 32) + node.cells[0].x, Math.floor(posicao.y / 32) + node.cells[0].y))
    }

    calcularPosicaoMedia(rows, cols) {

        const posicaoMedia = {
            x: (cols / 2) * 32,
            y: (rows / 2) * 32
        };

        return posicaoMedia;
    }

    createLavaRemoverDevice(room) {
        var posicao = this.calcularPosicaoMedia(room.roomHeight, room.roomWidth)
        cena1.adicionar(gerenciador.criarDispositivoAntiLava(posicao.x + room.cells[0].x * 32, posicao.y + (room.cells[0].y + 2) * 32, this.lavaRemoverEvent, room))
    }

    lavaRemoverEvent() {
        this.toggled = !this.toggled;
        cena1.assets.play("water");
        for (const cell of this.room.cells) {
            if (gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo != 6) {// Lava tile
                gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo = 2;
            }
        }
        this.event = function () { }
    }

}