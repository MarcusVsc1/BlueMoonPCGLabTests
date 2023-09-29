class IceRoomAgent {
    constructor() {
        this.enemyFactory = new EnemyFactory()
        this.levelMapper = new Map()
        this.levelMapper.set(1, function (room, collectible, level) {
            this.insertCollectible(room, collectible)
        }.bind(this))
        this.levelMapper.set(2, function (room, collectible, level) {
            this.bindCollectingToEnemy(room, collectible, level)
        }.bind(this))
        this.levelMapper.set(3, function (room, collectible, level) {
            this.createEnemies(room, collectible, level)
        }.bind(this))
        this.levelMapper.set(4, function (room, collectible, level) {
            this.createEnemies(room, collectible, level)
        }.bind(this))
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        this.fillRoomInteriorWithIce(room.cells)
        this.levelMapper.get(level)(room, collectible, level)
    }

    fillRoomInteriorWithIce(cells) {
        for (const cell of cells) {
            if (gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo != 6) {
                gerenciador.estagios[0].mapa.cells[cell.x][cell.y].tipo = 1; // Ice tile
            }
        }
    }

    insertCollectible(room, collectible) {
        var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
        collectible.x = position.x
        collectible.y = position.y

        cena1.adicionar(collectible)
    }

    bindCollectibleToEnemy(room, collectible, level) {
        this.enemyFactory.createEnemyWithDrop(level, room, collectible)
    }

    createEnemies(room, collectible, level) {
        var niveis = [level, level < 4 ? level - 2: level]
        niveis = SwitchAgent.fisherYales(niveis)
        this.enemyFactory.createEnemyWithDrop(niveis[0], room, collectible)
        this.enemyFactory.createEnemyWithDrop(niveis[1], room)
    }

}