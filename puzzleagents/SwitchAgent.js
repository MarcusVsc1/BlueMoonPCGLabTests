class SwitchAgent {

    gerarPuzzle(mapGraph, puzzleGraph) {
        var room = mapGraph.nodes[0]
        var posicoes = this.posicoesDiagonaisElementoCentral(room)
        for(posicao of posicoes){
            cena1.adicionar(gerenciador.criarInterruptor(posicao.x, posicao.y, null, 0)) 
        }
        
    }

    posicoesDiagonaisElementoCentral(room) {
        const numCols = room.roomWidth
        const numRows = room.roomHeight;

        const indiceCentralColuna = Math.floor(numCols / 2);
        const indiceCentralLinha = Math.floor(numRows / 2);

        const posicoesDiagonais = [];

        if (numCols % 2 === 0 && numRows % 2 === 0) {
            posicoesDiagonais.push({ x: indiceCentralColuna - 2, y: indiceCentralLinha - 2 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha - 2 });
            posicoesDiagonais.push({ x: indiceCentralColuna - 2, y: indiceCentralLinha + 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha + 1 });
        } else if (numCols % 2 === 0) {
            posicoesDiagonais.push({ x: indiceCentralColuna - 2, y: indiceCentralLinha - 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha - 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna - 2, y: indiceCentralLinha + 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha + 1 });
        } else if (numRows % 2 === 0) {
            posicoesDiagonais.push({ x: indiceCentralColuna - 1, y: indiceCentralLinha - 2 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha - 2 });
            posicoesDiagonais.push({ x: indiceCentralColuna - 1, y: indiceCentralLinha + 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha + 1 });
        } else {
            posicoesDiagonais.push({ x: indiceCentralColuna - 1, y: indiceCentralLinha - 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna - 1, y: indiceCentralLinha + 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha + 1 });
            posicoesDiagonais.push({ x: indiceCentralColuna + 1, y: indiceCentralLinha - 1 });
        }

        return this.translate(posicoesDiagonais, room.cells[0]);
    }

    translate(posicoes, translado) {
        for(posicao of posicoes) {
            posicao.x = posicao.x + translado.x
            posicao.y = posicao.y + translado.y
        }
        return posicoes;
    }

}
