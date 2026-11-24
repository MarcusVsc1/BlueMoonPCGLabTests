class SokobanAgent {
    constructor(){
        this.defaultTag = "SokobanAgent"
        this.defaultSearchTotalMoves = 1000
        this.defaultMaxAttempts = 20
        this.defaultTimeBudgetMs = 2000
        this.defaultRestartEveryAttempts = 10
        this.targetDifficulty = null // null = qualquer nível; 1..5 = faixa obrigatória
        this.difficultyCalibration = {} // pesos e limiares opcionais
        this.rejectTrivial = false // true rejeita puzzles com solução direta comprovada
        this.defaultSolverMaxExpanded = 4000
        this.defaultCandidatesPerBatch = 8
        this.defaultSolverReserveMs = 250
        this.lastGeneration = null
    }

    gerarAgenteAuxiliar(room, collectible) {
        this.posicionarCollectible(room, collectible)
        return this.gerarSokoban(room, collectible)
    }

    gerarTagAuxiliar(mapGraph, room) {
        if(mapGraph.getNeighbors(room).length > 1 || room.cells.length > 70) return false
        room.tag.auxiliar = this.defaultTag
        return true
    }

    posicionarCollectible(room, collectible){
        collectible.swCD = 0.6
        var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
        collectible.x = position.x
        collectible.y = position.y
    }

    gerarSokoban(room, collectible) {

        this.lastGeneration = null
        this.roomTotalCells = room.roomHeight * room.roomWidth
        const deadline = Date.now() + this.defaultTimeBudgetMs
        const fail = () => {
            // Mantém a geometria original e não registra um Sokoban inválido.
            if (room.tag && room.tag.auxiliar === this.defaultTag) {
                room.tag.auxiliar = null
            }
            console.warn("SokobanAgent: nenhum puzzle válido com pelo menos 2 caixas na sala " + room.roomId)
            return false
        }
        if (!room.cells.length || !room.terminalCells || !room.terminalCells.length) return fail()

        const startCell = {
            x: room.terminalCells[0].y - room.cells[0].y,
            y: room.terminalCells[0].x - room.cells[0].x,
        }
        if (!Number.isInteger(startCell.x) || !Number.isInteger(startCell.y) ||
            startCell.x < 0 || startCell.y < 0 || startCell.x >= room.roomHeight || startCell.y >= room.roomWidth) return fail()
        const game = new Game()
        const state = game.start(startCell, room.roomHeight, room.roomWidth)
        this.lastGeneration = SokobanDifficulty.generate(game, state, {
            deadline, totalMoves: this.defaultSearchTotalMoves, maxAttempts: this.defaultMaxAttempts,
            restartEvery: this.defaultRestartEveryAttempts, targetDifficulty: this.targetDifficulty,
            rejectTrivial: this.rejectTrivial, calibration: this.difficultyCalibration, maxExpanded: this.defaultSolverMaxExpanded,
            maxCandidatesPerBatch: this.defaultCandidatesPerBatch, solverReserveMs: this.defaultSolverReserveMs
        })
        const {winner, analysis} = this.lastGeneration
        if (!winner || winner.snapshot.length !== room.roomHeight || winner.snapshot[0].length !== room.roomWidth ||
            winner.snapshot[startCell.x][startCell.y].tipo !== 'jogador') return fail()

        //console.log("Score: " + winner.score)
        var matrizMapeada = this.mapBoardToGameMap(winner)

        var boxes = this.placeBoxes(winner, room.cells[0])
        var goals = this.placeGoals(winner, room.cells[0])
        this.mapToDungeon(room.cells[0], matrizMapeada)
        cena1.sokobans.push({ boxes: boxes, goals: goals, room: room, startCell: startCell, countdown: 0.5, collectible: collectible, difficulty: analysis })
        return true
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