'use strict'

/** Class representing the game board. */
class Game {
    constructor() {
        this.winner = null
        this.evaluationCache = new Map()
        this.maxEvaluationCache = 2048
    }
    /** Generate and return the initial game state. */
    start(initialPosition, m, n) {
        const objetoInicial = {
            tipo: "vazio",
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

    /** Retorna ações legais nas duas fases de geração. */
    legalPlays(state) {
        if (state.finish) return []
        const legalPlays = []
        if (!state.snapped) {
            const empty = this.findPositionByType(state.board, "vazio")
            const boxes = this.findPositionByType(state.board, "caixa").length
            // Duas caixas finais continuam sendo o mínimo; caixas do rascunho
            // podem virar paredes ou ser descartadas. Reserva espaço para manobra.
            if (empty.length > 2) {
                for (const cell of empty) legalPlays.push(new Play({ ...cell, tipo: "caixa" }))
            }
            if (boxes >= 2 || !legalPlays.length) legalPlays.push(new Play({}))
        } else {
            const player = this.findPositionByType(state.board, "jogador")[0]
            if (player && this.findPositionByType(state.snapshot, "caixa").length) {
                for (const direction of Game.directions()) {
                    if (this.isMoveValid(player, direction, state.board)) legalPlays.push(new Play({ direction }))
                }
            }
            // Encerrar é legal inclusive em becos sem saída. A aceitação final
            // (>= 2 caixas, objetivos diferentes) continua responsabilidade do MCTS.
            legalPlays.push(new Play({}))
        }
        return legalPlays
    }

    static directions() {
        return [{ x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 }]
    }

    static copyBoard(board) {
        return board.map(row => row.map(cell => ({ ...cell })))
    }

    /** Copia por demanda: tabuleiros compartilhados nunca são mutados. */
    copyState(state, changes) {
        return Object.assign(new SokobanState(), state, changes)
    }

    /** Política estocástica: somente rollouts, não elimina ações da árvore. */
    chooseRolloutPlay(state, plays, nextRandom = () => random.nextRandFloat()) {
        if (!plays.length) return undefined
        // Mantém exploração aleatória, inclusive alternativas pouco promissoras.
        if (nextRandom() < 0.12) return plays[Math.floor(nextRandom() * plays.length)]
        const boxes = this.findPositionByType(state.board, "caixa")
        let weights
        if (!state.snapped) {
            const area = state.board.length * state.board[0].length
            const target = Math.max(3, Math.min(12, Math.round(area * 0.22)))
            const placementCount = plays.filter(p => p.tipo).length
            weights = plays.map(p => {
                if (!p.tipo) return Math.max(1, placementCount) * (boxes.length >= target ? 3 : 0.06)
                return 1
            })
        } else {
            const player = this.findPositionByType(state.board, "jogador")[0]
            const useful = this.findPositionByType(state.finalBoard || state.board, "caixa")
                .filter(p => (state.finalBoard || state.board)[p.x][p.y].moves >= 2).length
            weights = plays.map(p => {
                if (!p.direction) return useful >= 2 ? 0.8 : (plays.length === 1 ? 1 : 0.015)
                if (!player) return 1
                const cell = state.board[player.x + p.direction.x][player.y + p.direction.y]
                if (cell.tipo === "caixa") {
                    // Favorece a inclusão de outras caixas e mudanças de direção.
                    const changed = cell.lastDirection && (cell.lastDirection.x !== p.direction.x || cell.lastDirection.y !== p.direction.y)
                    return (cell.moves < 2 ? 5 : 2) * (changed ? 1.7 : 1)
                }
                return cell.visitado ? 0.7 : 1.7
            })
        }
        let threshold = nextRandom() * weights.reduce((a, b) => a + b, 0)
        for (let i = 0; i < plays.length; i++) {
            threshold -= weights[i]
            if (threshold < 0) return plays[i]
        }
        return plays[plays.length - 1]
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
        const board = Game.copyBoard(state.board)
        board[play.x][play.y] = { tipo: play.tipo, moves: 0, boxId: play.boxId, visitado: false }
        return this.copyState(state, { board, playHistory: newHistory })
    }

    freezeLevel(state, newHistory) {
        const snapshot = Game.copyBoard(state.board)
        return this.copyState(state, {
            snapped: true, snapshot, finalBoard: Game.copyBoard(state.board), playHistory: newHistory
        })
    }

    movePlayer(state, play, newHistory) {
        const board = Game.copyBoard(state.board)
        const { direction } = play
        const player = this.findPositionByType(board, "jogador")[0]
        const x = player.x + direction.x, y = player.y + direction.y
        const next = board[x][y]
        let moved = false
        if (next.tipo === "caixa") {
            moved = next.moves > 0
            board[x + direction.x][y + direction.y] = {
                tipo: "caixa", moves: next.moves + 1, boxId: next.boxId,
                visitado: true, lastDirection: { ...direction }
            }
        }
        // Limpa metadados de caixa da célula agora ocupada pelo jogador.
        board[player.x][player.y] = { tipo: "vazio", visitado: true }
        board[x][y] = { tipo: "jogador", visitado: true }
        return this.copyState(state, {
            board, playHistory: newHistory, finalBoard: moved ? board : state.finalBoard
        })
    }

    finishGame(state, newHistory) {
        const newState = this.copyState(state, {
            finish: true, playHistory: newHistory,
            board: Game.copyBoard(state.finalBoard || state.board),
            snapshot: Game.copyBoard(state.snapshot || state.board)
        })
        this.postProcessing(newState)
        const key = this.evaluationKey(newState)
        if (this.evaluationCache.has(key)) {
            newState.score = this.evaluationCache.get(key)
        } else {
            newState.score = this.calculateScore(newState)
            if (this.evaluationCache.size >= this.maxEvaluationCache) {
                this.evaluationCache.delete(this.evaluationCache.keys().next().value)
            }
            this.evaluationCache.set(key, newState.score)
        }
        return newState
    }

    /** Cache de avaliações finais, não compartilha nós ou estados da árvore.
     * IDs globais de caixas são substituídos por correspondências de coordenadas.
     */
    evaluationKey(state) {
        const types = board => board.map(row => row.map(cell => cell.tipo))
        const pairs = this.findSameBoxIdBoxPositions(state.board, state.snapshot)
            .map(p => [p.matrix1.x, p.matrix1.y, p.matrix2.x, p.matrix2.y])
        return JSON.stringify([types(state.snapshot), types(state.board), pairs])
    }

    /*
        finalização de um tabuleiro
    */

    postProcessing(state) {
        const positions = this.findSameBoxIdBoxPositions(state.board, state.snapshot)
        for (const p of positions) {
            const box = state.board[p.matrix1.x][p.matrix1.y]
            if (box.moves === 0) {
                state.snapshot[p.matrix2.x][p.matrix2.y] = { tipo: "parede", visitado: false }
                state.board[p.matrix1.x][p.matrix1.y] = { tipo: "parede", visitado: false }
            } else if (box.moves === 1) {
                state.snapshot[p.matrix2.x][p.matrix2.y] = { tipo: "vazio", visitado: true }
                state.board[p.matrix1.x][p.matrix1.y] = { tipo: "vazio", visitado: true }
            }
        }
        this.removeUnreachableCells(state)
    }

    calculateScore(state, wb = 5, wc = 10, wn = 1, k = 50, wd = 20) {
        const pairs = this.findSameBoxIdBoxPositions(state.board, state.snapshot)
        if (pairs.length < 2) return 0
        const area = state.board.length * state.board[0].length
        // Componentes limitados, evitando que distância ou tamanho dominem a avaliação.
        const heterogeneity = this.calcularScoreHeterogeneo(state) / area
        const congestion = this.calcularScoreCongestionamento(state)
        const conflict = congestion > 0 ? congestion / (75 + congestion) : 0
        const boxes = Math.min(1, pairs.length / 6)
        const difficulty = this.calcularScoreDificuldade(state)
        // Sem mudanças de direção nem congestionamento, a geometria por si só
        // não deve elevar muito a pontuação. Pesos experimentais, não calibrados.
        const logicFactor = 0.15 + 0.85 * Math.max(difficulty, conflict)
        const raw = Math.sqrt(Math.max(0, wb * heterogeneity + wc * conflict + wn * boxes + wd * difficulty)) * logicFactor / Math.max(1, k)
        return Game.normalizarScore(raw)
    }

    /** Proxy de dificuldade: mínimo de segmentos de empurrão para cada caixa
     * em isolamento, relaxando outras caixas e acesso do jogador entre empurrões.
     * Não é uma prova de dificuldade humana nem um solver do puzzle completo.
     */
    calcularScoreDificuldade(state) {
        const pairs = this.findSameBoxIdBoxPositions(state.board, state.snapshot)
        if (!pairs.length) return 0
        let score = 0
        for (const p of pairs) {
            const lines = this.minimumBoxLines(state.snapshot, p.matrix2, p.matrix1)
            if (!Number.isFinite(lines)) continue
            // Um corredor reto, independentemente do comprimento, vale zero.
            score += Math.min(1, Math.max(0, lines - 1) / 4)
        }
        return score / pairs.length
    }

    minimumBoxLines(board, start, goal) {
        if (start.x === goal.x && start.y === goal.y) return 0
        const dirs = Game.directions(), rows = board.length, cols = board[0].length
        const floor = (x, y) => x >= 0 && x < rows && y >= 0 && y < cols && board[x][y].tipo !== "parede"
        const dist = new Int16Array(rows * cols * 4).fill(32767)
        const index = (x, y, d) => (x * cols + y) * 4 + d
        const queue = []
        for (let d = 0; d < 4; d++) {
            const v = dirs[d], x = start.x + v.x, y = start.y + v.y
            if (floor(x, y) && floor(start.x - v.x, start.y - v.y)) {
                dist[index(x, y, d)] = 1
                queue.push([x, y, d])
            }
        }
        // Relaxamento de arestas com custo 0 (mesma direção) ou 1 (nova linha).
        for (let head = 0; head < queue.length; head++) {
            const [x, y, prev] = queue[head], base = dist[index(x, y, prev)]
            for (let d = 0; d < 4; d++) {
                const v = dirs[d], nx = x + v.x, ny = y + v.y
                if (!floor(nx, ny) || !floor(x - v.x, y - v.y)) continue
                const i = index(nx, ny, d), cost = base + (d === prev ? 0 : 1)
                if (cost < dist[i]) {
                    dist[i] = cost
                    queue.push([nx, ny, d])
                }
            }
        }
        const best = Math.min(...dirs.map((_, d) => dist[index(goal.x, goal.y, d)]))
        return best === 32767 ? Infinity : best
    }

    /*
        Normaliza o score bruto para o intervalo [0,1), faixa que o UCB1 assume.
        A transformação é monotônica, então preserva a ordem entre estados, e
        também absorve NaN/Infinity (ex.: divisão por zero no congestionamento).
    */
    static normalizarScore(scoreBruto) {
        if (!Number.isFinite(scoreBruto) || scoreBruto <= 0) return 0
        return scoreBruto / (1 + scoreBruto)
    }

    calcularScoreHeterogeneo(state) {
        var celulasHeterogeneas = this.countCellsWithDifferentBeighbors(state.board);
        return celulasHeterogeneas /// Math.sqrt(state.board.length * state.board[0].length)
    }

    /* 
        inicie delimitando um retângulo entre a caixa e seu objetivo
        cálculo: (alfa * numero de caixas + beta * número de células objetivo) / (gama * (área do retângulo * número de células de parede))
        usar para número de caixas a matriz snapshot e para células objetivo a matriz avaliada
    */
    calcularScoreCongestionamento(state, alfa = 300, beta = 300, gama = 4) {
        var snapshotMatrix = state.snapshot;
        var evalMatrix = state.board;
        var boxPositions = this.findSameBoxIdBoxPositions(evalMatrix, snapshotMatrix)
        var scoreCongestionamento = 0;
        for (var position of boxPositions) {
            var matrix1 = position.matrix1
            var matrix2 = position.matrix2

            var boxCount = Game.countCells(snapshotMatrix, matrix1, matrix2, "caixa") - 1
            var goalCount = Game.countCells(evalMatrix, matrix1, matrix2, "caixa") - 1
            var wallCount = Game.countCells(evalMatrix, matrix1, matrix2, "parede")
            var rectangleArea = (Math.abs(matrix2.x - matrix1.x) + 1) * (Math.abs(matrix2.y - matrix1.y) + 1)
            var denominator = gama * (rectangleArea - wallCount)
            if (denominator <= 0) continue
            var boxScore = (alfa * Math.max(0, boxCount) + beta * Math.max(0, goalCount)) / denominator
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
                if (matriz[i] && matriz[i][j] && matriz[i][j].tipo == tipo) {
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
        const vizinhos = new Map();

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
                    vizinhos.set(`${newX},${newY}`, { x: newX, y: newY, tipo: "vazio" });
                }
            }
        }

        return Array.from(vizinhos.values()); // Converter o conjunto em uma matriz
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
        const byId = new Map(), posicoes = []
        for (let x = 0; x < matriz2.length; x++) {
            for (let y = 0; y < matriz2[x].length; y++) {
                const cell = matriz2[x][y]
                if (cell.tipo === "caixa") byId.set(cell.boxId, { x, y })
            }
        }
        for (let x = 0; x < matriz1.length; x++) {
            for (let y = 0; y < matriz1[x].length; y++) {
                const cell = matriz1[x][y]
                if (cell.tipo === "caixa" && byId.has(cell.boxId)) {
                    posicoes.push({ matrix1: { x, y }, matrix2: byId.get(cell.boxId) })
                }
            }
        }
        return posicoes
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
        const { board, snapshot } = state
        for (let i = 0; i < snapshot.length; i++) {
            for (let j = 0; j < snapshot[i].length; j++) {
                const before = snapshot[i][j], after = board[i][j]
                // Somente fecha células vazias em ambos os tabuleiros que não
                // participaram do trajeto do jogador nem de uma caixa empurrada.
                if (before.tipo === "vazio" && after.tipo === "vazio" &&
                    !before.visitado && !after.visitado) {
                    snapshot[i][j] = { tipo: "parede", visitado: false }
                    board[i][j] = { tipo: "parede", visitado: false }
                }
            }
        }
    }
}
