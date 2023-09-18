'use strict'

/** Class representing the game board. */
class Game {
    static winnerScore = 0
    constructor() {
        this.winner = null

    }
    /** Generate and return the initial game state. */
    start(initialPosition, m, n) {
        const objetoInicial = {
            tipo: "parede",
            visitado: false
        };

        const matriz = new Array(m);

        for (let i = 0; i < m; i++) {
            matriz[i] = new Array(n);
            for (let j = 0; j < n; j++) {
                matriz[i][j] = { ...objetoInicial };
            }
        }

        matriz[initialPosition.x][initialPosition.y] = { tipo: "jogador", visitado: true }

        return new SokobanState(matriz)
    }

    /** Return the current player’s legal moves from given state. */
    legalPlays(state) {
        let legalPlays = []

        if (!state.finish) {
            var player = this.findPositionByType(state.board, "jogador")[0]
            //verifica se já congelou o tabuleiro
            if (!state.snapped) {
                //conjunto de jogadas: inserir uma caixa em um espaço vazio (Place Box)
                var candidateCells = this.findPositionByType(state.board, "vazio")
                for (var cell of candidateCells) {
                    cell.tipo = "caixa"
                    legalPlays.push(new Play(cell))
                }
                //conjunto de jogadas: inserir um espaço vazio próximo a um espaço que não é parede (Delete obstacle)
                candidateCells.push(player)
                candidateCells.push(... this.findPositionByType(state.board, "caixa"))
                var newEmptyCells = this.findWallNeighbors(candidateCells, state.board)
                for (var cell of newEmptyCells) {
                    cell.tipo = "vazio"
                    legalPlays.push(new Play(cell))
                }
            } else {
                // conjunto de jogadas: mover jogador (Move Agent)
                const directions = [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }];
                for (const direction of directions) {
                    if (this.isMoveValid(player, direction, state.board)) {
                        var params = { direction: null }
                        params.direction = direction
                        legalPlays.push(new Play(params))
                    }
                }
            }
            //adiciona uma jogada vazia. no método nextState(), verifica se há congelou o nível
            //serve tanto para o Freeze Level quanto para o Evaluate Level
            legalPlays.push(new Play({}))
        }
        return legalPlays
    }

    /** Advance the given state and return it. */
    nextState(state, play) {
        let newHistory = state.playHistory.slice() // 1-deep copy
        newHistory.push(play)
        if (play.tipo) {
            return this.positionNewElement(state, play, newHistory)
        }
        if (play.direction) {
            return this.movePlayer(state, play, newHistory)
        }
        if (!state.snapped) {
            return this.freezeLevel(state, newHistory)
        } else {
            return this.finishGame(state, newHistory)
        }
    }

    positionNewElement(state, play, newHistory) {
        var newCell = {
            tipo: play.tipo,
            moves: 0,
            boxId: play.boxId
        }
        var newState = JSON.parse(JSON.stringify(state))
        newState.board[play.x][play.y] = newCell
        newState.playHistory = newHistory
        return Object.assign(new SokobanState(), newState)
    }

    freezeLevel(state, newHistory) {
        var newState = JSON.parse(JSON.stringify(state))
        newState.snapped = true
        newState.snapshot = state.board
        newState.playHistory = newHistory
        return Object.assign(new SokobanState(), newState)
    }

    movePlayer(state, play, newHistory) {
        var newState = JSON.parse(JSON.stringify(state))
        var direction = play.direction
        var player = this.findPositionByType(newState.board, "jogador")[0]
        var nextPosition = newState.board[player.x + direction.x][player.y + direction.y]
        if (nextPosition.tipo == "caixa") {
            newState.board[player.x + direction.x * 2][player.y + direction.y * 2] = {
                tipo: "caixa",
                moves: nextPosition.moves + 1,
                boxId: nextPosition.boxId
            }
        }
        newState.board[player.x][player.y].tipo = "vazio"
        newState.board[player.x + direction.x][player.y + direction.y].tipo = "jogador"
        newState.board[player.x + direction.x][player.y + direction.y].visitado = true
        newState.board[player.x + direction.x][player.y + direction.y].moves = undefined
        newState.playHistory = newHistory
        return Object.assign(new SokobanState(), newState)
    }

    finishGame(state, newHistory) {
        var newState = JSON.parse(JSON.stringify(state))
        newState.finish = true
        newState.playHistory = newHistory
        this.postProcessing(newState)
        newState.score = this.calculateScore(newState)
        return Object.assign(new SokobanState(), newState)
    }


    /*
        finalização de um tabuleiro
    */

    postProcessing(state) {
        var boxPositions = this.findSameBoxIdBoxPositions(state.board, state.snapshot)
        for (var position of boxPositions) {
            var box = state.board[position.matrix1.x][position.matrix1.y]
            if (box.moves == 0) {
                state.snapshot[position.matrix2.x][position.matrix2.y].tipo = "parede"
                state.board[position.matrix1.x][position.matrix1.y].tipo = "parede"
            }
            if (box.moves == 1) {
                state.snapshot[position.matrix2.x][position.matrix2.y].tipo = "vazio"
                state.board[position.matrix1.x][position.matrix1.y].tipo = "vazio"
            }
        }
        this.removeUnreachableCells(state)
    }

    calculateScore(state) {
        const k = 50;
        const wc = 10;
        const wb = 5;
        const wn = 1;

        var scoreCaixas = Game.countCells(state.snapshot, { x: 0, y: 0 }, { x: state.board.length - 1, y: state.board[0].length - 1 }, "caixa")
        var scoreCongestionamento = this.calcularScoreCongestionamento(state);
        var scoreHeterogeneo = this.countCellsWithDifferentBeighbors(state.board);
        return Math.sqrt(wb * scoreHeterogeneo + wc * scoreCongestionamento + wn * scoreCaixas) / k
    }

    /* 
        inicie delimitando um retângulo entre a caixa e seu objetivo
        cálculo: (alfa * numero de caixas + beta * número de células objetivo) / (gama * (área do retângulo * número de células de parede))
        usar para número de caixas a matriz snapshot e para células objetivo a matriz avaliada
    */
    calcularScoreCongestionamento(state, alfa = 4, beta = 4, gama = 1) {
        var snapshotMatrix = state.snapshot;
        var evalMatrix = state.board;
        var boxPositions = this.findSameBoxIdBoxPositions(evalMatrix, snapshotMatrix)
        var scoreCongestionamento = 0;
        for (var position of boxPositions) {
            var matrix1 = position.matrix1
            var matrix2 = position.matrix2

            var boxCount = Game.countCells(snapshotMatrix, matrix1, matrix2, "caixa")
            var goalCount = Game.countCells(evalMatrix, matrix1, matrix2, "caixa")
            var wallCount = Game.countCells(evalMatrix, matrix1, matrix2, "parede")
            var rectangleArea = (Math.abs(matrix2.x - matrix1.x) + 1) * (Math.abs(matrix2.y - matrix1.y) + 1)
            var boxScore = (alfa * boxCount + beta * goalCount) / (gama * (rectangleArea + wallCount))
            scoreCongestionamento = scoreCongestionamento + boxScore

        }
        return scoreCongestionamento
    }

    static countCells(matriz, coordenada1, coordenada2, tipo) {
        const { x: x1, y: y1 } = coordenada1;
        const { x: x2, y: y2 } = coordenada2;

        const min_x = Math.min(x1, x2);
        const max_x = Math.max(x1, x2);
        const min_y = Math.min(y1, y2);
        const max_y = Math.max(y1, y2);

        let contador = 0;

        for (let i = min_x; i <= max_x; i++) {
            for (let j = min_y; j <= max_y; j++) {
                if (matriz[i] && matriz[i][j].tipo == tipo) {
                    contador++;
                }
            }
        }

        return contador;
    }

    /*
        Funções de suporte
    */

    /*
        localiza quais posições da matriz têm um tipo específico
    */
    findPositionByType(matriz, tipo) {
        const posicoes = [];

        for (let i = 0; i < matriz.length; i++) {
            for (let j = 0; j < matriz[i].length; j++) {
                const celula = matriz[i][j];

                if (celula.tipo === tipo) {
                    const posicao = { x: i, y: j, tipo: tipo };

                    if (celula.hasOwnProperty("boxId")) {
                        posicao.boxId = celula.boxId;
                    }

                    posicoes.push(posicao);
                }
            }
        }

        return posicoes;
    }

    /*
        checa se o jogador pode se mover na direção especificada, a fim de criar um movimento válido
    */
    isMoveValid(player, direction, board) {

        const { x, y } = player, [dx, dy] = [x + direction.x, y + direction.y];
        return dx >= 0 && dx < board.length && dy >= 0 && dy < board[0].length && (
            (board[dx][dy].tipo === "vazio") ||
            (board[dx][dy].tipo === "caixa" &&
                dx + direction.x >= 0 && dx + direction.x < board.length &&
                dy + direction.y >= 0 && dy + direction.y < board[0].length &&
                board[dx + direction.x][dy + direction.y].tipo === "vazio")
        );
    }

    /*
        busca células vizinhas de parede para posições específicas
        as posições passadas por parâmetro são garantidas de ser espaços vazios ou o jogador
    */
    findWallNeighbors(posicoes, board) {
        const vizinhos = new Set();

        const numRows = board.length;
        const numCols = board[0].length;

        const direcoes = [
            { x: -1, y: 0 }, // Vizinho acima
            { x: 1, y: 0 },  // Vizinho abaixo
            { x: 0, y: -1 }, // Vizinho à esquerda
            { x: 0, y: 1 }   // Vizinho à direita
        ];

        for (const posicao of posicoes) {
            for (const direcao of direcoes) {
                const newX = posicao.x + direcao.x;
                const newY = posicao.y + direcao.y;

                if (
                    newX >= 0 && newX < numRows &&
                    newY >= 0 && newY < numCols &&
                    board[newX][newY].tipo === "parede"
                ) {
                    vizinhos.add({ x: newX, y: newY, tipo: "vazio" });
                }
            }
        }

        return Array.from(vizinhos); // Converter o conjunto em uma matriz
    }

    /*
        conta quantas células não têm vizinhos iguais
        a intenção deste método é recompensar a heterogeneidade da matriz, evitando que blocos 3x3
        de células iguais aconteçam
    */
    countCellsWithDifferentBeighbors(matriz) {
        let contador = 0;
        const linhas = matriz.length;
        const colunas = matriz[0].length;

        for (let i = 0; i < linhas; i++) {
            for (let j = 0; j < colunas; j++) {
                const valorCelula = matriz[i][j].tipo;

                // Verifica se a célula é vazia ou parede e tem pelo menos um vizinho diferente
                if ((valorCelula === "vazio" || valorCelula === "parede") && this.hasDifferenteNeighbor(matriz, i, j)) {
                    contador++;
                }
            }
        }

        return contador;
    }

    /*
        verifica se há alguma célula vizinha (horizontal, vertical e diagonal) de tipo diferente
    */
    hasDifferenteNeighbor(matriz, linha, coluna) {
        const valorCelula = matriz[linha][coluna];
        const linhas = matriz.length;
        const colunas = matriz[0].length;

        // Define as coordenadas dos vizinhos (horizontal, vertical e diagonal)
        const vizinhosCoordenadas = [
            [-1, 0], // Vizinho acima
            [1, 0],  // Vizinho abaixo
            [0, -1], // Vizinho à esquerda
            [0, 1],  // Vizinho à direita
            [-1, -1], // Vizinho superior esquerdo (diagonal)
            [-1, 1],  // Vizinho superior direito (diagonal)
            [1, -1],  // Vizinho inferior esquerdo (diagonal)
            [1, 1]    // Vizinho inferior direito (diagonal)
        ];

        for (const [dx, dy] of vizinhosCoordenadas) {
            const novoLinha = linha + dx;
            const novoColuna = coluna + dy;

            if (
                novoLinha >= 0 && novoLinha < linhas &&
                novoColuna >= 0 && novoColuna < colunas
            ) {
                const valorVizinho = matriz[novoLinha][novoColuna];

                // Verifica se pelo menos um vizinho é diferente da célula atual
                if (valorCelula.tipo !== valorVizinho.tipo) {
                    return true; // Se encontrar um vizinho diferente, retorna true
                }
            }
        }

        return false; // Se nenhum vizinho diferente for encontrado, retorna false
    }

    /*
        localiza nas matrizes as posições de caixas de mesmo id
    */
    findSameBoxIdBoxPositions(matriz1, matriz2) {
        const posicoes = [];

        for (let i = 0; i < matriz1.length; i++) {
            for (let j = 0; j < matriz1[i].length; j++) {
                const caixa1 = matriz1[i][j];
                for (let x = 0; x < matriz2.length; x++) {
                    for (let y = 0; y < matriz2[x].length; y++) {
                        const caixa2 = matriz2[x][y];
                        if (caixa1.tipo === "caixa" && caixa2.tipo === "caixa" && caixa1.boxId === caixa2.boxId) {
                            posicoes.push({ matrix1: { x: i, y: j }, matrix2: { x, y } });
                        }
                    }
                }
            }
        }

        return posicoes;
    }

    static mapearMatriz(matriz) {
        const mapeamento = {
            jogador: "J",
            parede: "X",
            vazio: " " // Adicionado mapeamento para "vazio"
        };

        return matriz.map((linha) => {
            return linha.map((elemento) => {
                if (elemento.tipo in mapeamento) {
                    return mapeamento[elemento.tipo];
                } else if (elemento.tipo === "caixa") {
                    return "C"
                } else {
                    // Se o tipo não corresponder a nenhum mapeamento, mantém o tipo original
                    return elemento.tipo;
                }
            });
        });
    }



    removeUnreachableCells(state) {
        var board = state.board
        var snapshot = state.snapshot
        const rows = board.length;
        const cols = board[0].length;

        // Remove unreachable cells
        for (let i = 0; i < snapshot.length; i++) {
            for (let j = 0; j < snapshot[i].length; j++) {
                if (board[i][j].tipo === "vazio" && !board[i][j].visitado) {
                    board[i][j].tipo = "parede";
                    snapshot[i][j].tipo = "parede";
                }
            }
        }
    }
}