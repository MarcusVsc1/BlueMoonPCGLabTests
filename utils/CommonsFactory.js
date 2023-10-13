class CommonsFactory {

    constructor() {
        this.poderes = new Map([
            [1, function (x, y) {
                cena1.adicionar(gerenciador.criarPoder("heart", x, y))
            }],
            [2, function (x, y) {
                cena1.adicionar(gerenciador.criarPoder("manaHeart", x, y))
            }],
            [3, function (x, y) {
                cena1.adicionar(gerenciador.criarPoder("hp", x, y))
            }],
            [4, function (x, y) {
                cena1.adicionar(gerenciador.criarPoder("mana", x, y))
            }]
        ])
    }


    posicionarPoderes(sala, level) {
        var quantidade = level % 2 == 0 ? 2 : 1
        if (quantidade == 1) {
            var x = sala.cells[0].x + (sala.roomWidth - 1) / 2
            var y = sala.cells[0].y + (sala.roomHeight - 1) / 2
            this.poderes.get(level)(x, y)
        } else {
            var x1 = sala.cells[0].x + (sala.roomWidth - 1) / 2
            var y1 = sala.cells[0].y + (sala.roomHeight - 1) / 3
            var x2 = sala.cells[0].x + (sala.roomWidth - 1) / 2
            var y2 = sala.cells[0].y + (sala.roomHeight - 1) * 2 / 3
            this.poderes.get(level - 1)(x1, y1)
            this.poderes.get(level)(x2, y2)
        }

    }

    posicionarTeleporte(indice, sala, novoX, novoY) {
        var x = sala.cells[0].x + (sala.roomWidth - 1) / 2
        var y = sala.cells[0].y + (sala.roomHeight - 1) / 2
        cena1.adicionar(gerenciador.criarTeleporte(x, y, novoX, novoY, indice))
    }

    posicionarBiribinha(room) {

        var positionX = room.cells[0].x + Math.random() * (room.roomWidth - 1)
        var positionY = room.cells[0].y + Math.random() * (room.roomHeight - 1)

        var biribinha = gerenciador.criarObjeto("biribinha", positionX, positionY)
        biribinha.roomId = room.roomId
        cena1.adicionar(biribinha)
    }
}