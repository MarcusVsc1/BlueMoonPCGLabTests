class SokobanAgent {
    constructor(){
        this.defaultTag = "SokobanAgent"
        this.defaultSearchTime = 2
    }

    gerarAgenteAuxiliar(room, collectible) {
        this.posicionarCollectible(room, collectible)
        this.gerarSokoban(room, collectible)
    }

    gerarTagAuxiliar(mapGraph, room) {
        if(mapGraph.getNeighbors(room).length > 1 || room.cells.length > 70) return false
        room.tag.auxiliar = this.defaultTag
        return true
    }

    posicionarCollectible(room, collectible){
        var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
        collectible.x = position.x
        collectible.y = position.y
    }

    gerarSokoban(room, collectible) {

        //console.log("Id da sala " + room.roomId)

        this.roomTotalCells = room.roomHeight * room.roomWidth

        var startCell = {
            x: room.terminalCells[0].y - room.cells[0].y,
            y: room.terminalCells[0].x - room.cells[0].x,
        }
        let game = new Game()
        let mcts = new MonteCarlo(game)
        let state = game.start(startCell, room.roomHeight, room.roomWidth)
        var winner = state;
        winner.score = 0
        var tentativas = 0
        mcts.best = winner
        // From initial state, take turns to play game until finished
        //console.time("total mcts")
        while (Game.countCells(winner.board, { x: 0, y: 0 }, { x: winner.board.length - 1, y: winner.board[0].length - 1 }, "caixa") < 2) {
            winner = mcts.runSearch(state, this.defaultSearchTime)
            tentativas++
            if (tentativas == 20) {
                mcts = new MonteCarlo(game)
                tentativas = 0
            }
        }
        //console.timeEnd("total mcts")

        //console.log("Score: " + winner.score)
        var matrizMapeada = this.mapBoardToGameMap(winner)

        var boxes = this.placeBoxes(winner, room.cells[0])
        var goals = this.placeGoals(winner, room.cells[0])
        this.mapToDungeon(room.cells[0], matrizMapeada)
        cena1.sokobans.push({ boxes: boxes, goals: goals, room: room, startCell: startCell, countdown: 0.5, collectible: collectible })


    }

    formatMatrix(matrix) {
        return matrix.map(row => row.map(item => "['" + item + "']").join(', ')).join('\n');
    }

    mapBoardToGameMap(winner) {
        return winner.snapshot.map((linha) => {
            return linha.map((elemento) => {
                switch (elemento.tipo) {
                    case "parede":
                        return 11
                    case "vazio":
                        return 0
                    case "jogador":
                        return 0
                    case "caixa":
                        return 7
                    default:
                        return 0
                }
            })
        })
    }

    placeBoxes(winner, cell) {
        const numRows = winner.snapshot.length;
        const numCols = winner.snapshot[0].length;
        var boxes = []

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (winner.snapshot[i][j].tipo == "caixa") {
                    //console.log(pos1 + " " + pos2)
                    var pos1 = j + cell.x
                    var pos2 = i + cell.y
                    var caixa = gerenciador.criarCaixaSokoban(pos1, pos2)
                    caixa.scene = cena1
                    boxes.push(caixa)
                }
            }
        }
        return boxes
    }

    placeGoals(winner, cell) {
        const numRows = winner.snapshot.length;
        const numCols = winner.snapshot[0].length;
        var boxes = []

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                if (winner.board[i][j].tipo == "caixa") {
                    //console.log(pos1 + " " + pos2)
                    var pos1 = j + cell.x
                    var pos2 = i + cell.y
                    var caixa = gerenciador.criarGoalSokoban(pos1, pos2)
                    caixa.scene = cena1
                    boxes.push(caixa)
                }
            }
        }
        return boxes
    }

    mapToDungeon(cell, matrix) {
        const numRows = matrix.length;
        const numCols = matrix[0].length;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                var pos1 = j + cell.x
                var pos2 = i + cell.y
                //console.log(pos1 + " " + pos2)
                gerenciador.estagios[0].mapa.cells[pos1][pos2].tipo = matrix[i][j]

            }
        }

    }
}