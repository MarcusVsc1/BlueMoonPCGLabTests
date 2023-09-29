class LavaRoomAgent {
    constructor(){
        this.hasBoots = false
    }

    gerarPuzzle(mapGraph) {
        var room = mapGraph.nodes[1]
        if(!this.hasBoots){

        }
        this.fillRoomInteriorWithLava(room.cells);
        this.createLavaRemoverDevice(room)
        this.positionLavaBoots(mapGraph.nodes[0])
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
        for(const cell of this.room.cells) {
            if (gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo != 6) {// Lava tile
                gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo = 2; 
            }
        }
        this.event = function() {} 
    }

}