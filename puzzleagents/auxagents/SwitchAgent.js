class SwitchAgent {

    static id = 0;
    static switchGroups = []

    constructor() {
        this.enemyFactory = new EnemyFactory()
        this.levelMapper = new Map()
        this.levelMapper.set(1, function (room, collectible) {
            this.criarPuzzle(room, collectible)
        }.bind(this))
        this.levelMapper.set(2, function (room, collectible, level) {
            this.createEnemies(room, collectible, level)
        }.bind(this))
        this.levelMapper.set(3, function (room, collectible, level) {
            this.createEnemies(room, collectible, level)
        }.bind(this))
        this.levelMapper.set(4, function (room, collectible, level) {
            this.createEnemies(room, collectible, level)
        }.bind(this))
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        this.levelMapper.get(level)(room, collectible, level)
    }

    createEnemies(room, collectible, level) {
        var nrEnemies = Math.ceil(level / 2)
        for (var i = 0; i < nrEnemies; i++) {
            this.enemyFactory.createEnemyWithDrop(level, room)
        }
        this.criarPuzzle(room, collectible)
    }

    criarPuzzle(room, collectible) {
        var posicoes = this.posicoesDiagonaisElementoCentral(room)
        var switches = []
        for (var posicao of posicoes) {
            cena1.adicionar(gerenciador.criarInterruptor(posicao.x, posicao.y, this.switchEvent, ++SwitchAgent.id))
            switches.push(SwitchAgent.id)
        }
        var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
        collectible.x = position.x
        collectible.y = position.y
        switches = UtilityMethods.fisherYales(switches)
        SwitchAgent.switchGroups.push({
            correctCombination: switches,
            actualCombination: [],
            rewardCount: 0,
            reward: collectible
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

    switchEvent() {
        if (!this.toggled) {
            cena1.assets.play('switchOn2')
            this.toggled = !this.toggled
            var groupId = Math.floor((this.switchId - 1) / 4)
            SwitchAgent.switchGroups[groupId].actualCombination.push(this.switchId)
            var idx = SwitchAgent.switchGroups[groupId].actualCombination.indexOf(this.switchId)
            if (SwitchAgent.switchGroups[groupId].correctCombination[idx] == SwitchAgent.switchGroups[groupId].actualCombination[idx]) {
                SwitchAgent.switchGroups[groupId].rewardCount++
                if (SwitchAgent.switchGroups[groupId].rewardCount == 4) {
                    cena1.dialogo = 'Tesouro liberado'
                    cena1.adicionar(SwitchAgent.switchGroups[groupId].reward)
                }
            } else {
                SwitchAgent.switchGroups[groupId].rewardCount = 0;
                SwitchAgent.switchGroups[groupId].actualCombination = []
                const numeroInicial = Math.floor((this.switchId - 1) / 4) * 4;
                for (var sprite of cena1.spritesO) {
                    if (sprite.switchId - 1 >= numeroInicial && sprite.switchId - 1 < numeroInicial + 4) {
                        sprite.toggled = false
                    }
                }
            }
        }
    }

    translate(posicoes, translado) {
        for (var posicao of posicoes) {
            posicao.x = posicao.x + translado.x
            posicao.y = posicao.y + translado.y
        }
        return posicoes;
    }

}