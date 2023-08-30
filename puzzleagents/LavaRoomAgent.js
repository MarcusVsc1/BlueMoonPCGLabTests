class LavaRoomAgent {

    gerarPuzzle(mapGraph, puzzleGraph) {
        this.fillRoomInteriorWithLava(mapGraph.nodes[1].cells);
        this.positionLavaBoots(mapGraph.nodes[2])
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
        cena1.adicionar(gerenciador.criarBotaAntiLava(posicao.x + node.cells[0].x, posicao.y + node.cells[0].y))
    }

    calcularPosicaoMedia(rows, cols) {

        const posicaoMedia = {
            x: Math.floor(cols / 2),
            y: Math.floor(rows / 2)
        };

        return posicaoMedia;
    }

}