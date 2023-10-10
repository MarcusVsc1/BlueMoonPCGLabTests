class IceRoomAgent extends AuxAgent {
    constructor() {
        super()
        this.defaultTag = "IceRoomAgent"
    
        this.enemyFactory = new EnemyFactory()
        this.levelMapper = new Map()
        this.levelMapper.set(1, function (room, collectible, level) {
            this.insertCollectible(room, collectible)
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

    createEnemies(room, collectible, level) {
        if(collectible.props.droppable){
            this.enemyFactory.createEnemyWithDrop(level - 1, room, collectible)
        } else {
            this.enemyFactory.createEnemyWithDrop(level - 1, room)
            this.insertCollectible(room, collectible)
        }
    }

}