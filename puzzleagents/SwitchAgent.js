class SwitchAgent {

    static id = 0;
    static switchGroups = []

    switchEvent() {
        if(!this.toggled){
            cena1.assets.play('switchOn2')
            this.toggled = !this.toggled
            var groupId = Math.floor((this.switchId-1)/4)
            SwitchAgent.switchGroups[groupId].actualCombination.push(this.switchId)
            var idx = SwitchAgent.switchGroups[groupId].actualCombination.indexOf(this.switchId)
            if(SwitchAgent.switchGroups[groupId].correctCombination[idx] == SwitchAgent.switchGroups[groupId].actualCombination[idx]){
                SwitchAgent.switchGroups[groupId].rewardCount++
                if(SwitchAgent.switchGroups[groupId].rewardCount == 4) {
                    cena1.dialogo = 'Conseguiu apertar na ordem certa.'
                }
            } else {
                SwitchAgent.switchGroups[groupId].rewardCount = 0;
                SwitchAgent.switchGroups[groupId].actualCombination = []
                const numeroInicial = Math.floor((this.switchId-1) / 4) * 4;
                for(var sprite of cena1.spritesO) {
                    if(sprite.switchId-1 >= numeroInicial && sprite.switchId-1 < numeroInicial + 4){
                        sprite.toggled = false
                    }
                }
            }
        }
    }

    gerarPuzzle(mapGraph, puzzleGraph) {
        var room = mapGraph.nodes[0]
        var posicoes = this.posicoesDiagonaisElementoCentral(room)
        var switches = []
        for(posicao of posicoes){
            cena1.adicionar(gerenciador.criarInterruptor(posicao.x, posicao.y, this.switchEvent,  ++SwitchAgent.id)) 
            switches.push(SwitchAgent.id)
        }
        switches = this.fisherYales(switches)
        SwitchAgent.switchGroups.push({
            correctCombination: switches,
            actualCombination:[],
            rewardCount: 0,
            reward: null
        })
        
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

    fisherYales(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
      }

}
