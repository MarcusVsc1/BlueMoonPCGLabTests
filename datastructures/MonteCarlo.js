/** Monte Carlo Tree Search para geração de Sokoban. */
class MonteCarlo {
    constructor(game, UCB1ExploreParam = 2, options = {}) {
        this.game = game
        this.UCB1ExploreParam = UCB1ExploreParam
        this.nodes = new Map() // índice diagnóstico por chave canônica + horizonte
        this.stateNodes = new WeakMap() // consulta por identidade, sem depender do histórico
        this.roots = new Map() // raízes independentes, por identidade do estado
        this.best = null
        this.bestScore = -Infinity
        this.candidateLimit = Math.max(1, options.candidateLimit ?? 20)
        this.candidates = new Map()
        this.minBoxes = Math.max(2, options.minBoxes || 2)
        this.maxDepth = options.maxDepth || 1024
        this.scoreBounds = { min: Infinity, max: -Infinity }
        // Compartilha apenas estatísticas de estados, não objetos de estado,
        // pais, ações ou resultados individuais de simulações.
        this.transpositionTable = new Map()
        this.maxTranspositions = options.maxTranspositions ?? 4096
        this.transpositionHits = 0
        this.transpositionUpdates = 0
    }

    makeNode(state) {
        if (!this.roots.has(state)) {
            const plays = state.finish ? [] : this.game.legalPlays(state)
            const node = new MonteCarloNode(null, null, state, plays)
            this.roots.set(state, node)
            this.indexNode(node)
        }
        return this.roots.get(state)
    }

    stateKey(state, depth) {
        // Horizontes diferentes podem ter distribuições de recompensa diferentes.
        // A profundidade crescente também impede ciclos na mesma chave durante
        // a retropropagação, mesmo quando a configuração física se repete.
        if (typeof state.canonicalHash !== 'function') return null
        return `${this.maxDepth - depth}:${state.canonicalHash()}`
    }

    indexNode(node) {
        node.transpositionKey = this.stateKey(node.state, node.depth)
        this.stateNodes.set(node.state, node)
        const key = node.transpositionKey
        if (key !== null && !this.nodes.has(key)) {
            // Índice diagnóstico também limitado; a árvore mantém seus filhos.
            if (this.nodes.size >= Math.max(1, this.maxTranspositions)) {
                this.nodes.delete(this.nodes.keys().next().value)
            }
            this.nodes.set(key, node)
        }
    }

    sharedStats(node, create = false) {
        const key = node.transpositionKey
        if (key == null || this.maxTranspositions <= 0) return null
        let stats = this.transpositionTable.get(key)
        if (stats) {
            // LRU: preserva estados reutilizados recentemente.
            this.transpositionTable.delete(key)
            this.transpositionTable.set(key, stats)
        } else if (create) {
            if (this.transpositionTable.size >= this.maxTranspositions) {
                this.transpositionTable.delete(this.transpositionTable.keys().next().value)
            }
            stats = { n_plays: 0, n_valid: 0, n_wins: 0 }
            this.transpositionTable.set(key, stats)
        }
        return stats || null
    }

    getTranspositionStats() {
        return { size: this.transpositionTable.size, hits: this.transpositionHits,
            updates: this.transpositionUpdates }
    }

    /** deadline é um timestamp absoluto (Date.now()). */
    runSearch(state, totalMoves = 1000, deadline = Infinity) {
        if (Date.now() >= deadline) return this.best
        const root = this.makeNode(state)
        for (let moves = 0; moves < totalMoves && Date.now() < deadline; moves++) {
            let node = this.select(state, deadline)
            if (!node) break
            let score
            if (node.state.finish) {
                score = this.evaluateTerminal(node.state)
            } else if (node.isLeaf() || node.depth >= this.maxDepth) {
                score = null // ramo sem saída ou além do limite de profundidade
            } else {
                if (Date.now() >= deadline) break
                node = this.expand(node)
                score = this.simulate(node, deadline)
            }
            // undefined: interrupção por tempo, não uma recompensa ruim.
            if (score === undefined) break
            this.backpropagate(node, score)
            if (root.state.finish || root.isLeaf()) break
        }
        return this.best
    }

    select(state, deadline = Infinity) {
        let node = this.roots.get(state)
        while (node.isFullyExpanded() && !node.isLeaf() && !node.state.finish && node.depth < this.maxDepth) {
            if (Date.now() >= deadline) return null
            let bestPlay
            let bestUCB1 = -Infinity
            for (const play of node.allPlays()) {
                const child = node.childNode(play)
                const shared = this.sharedStats(child)
                // Visitas da aresta local governam exploração. A média pode
                // aproveitar amostras adicionais de outros caminhos.
                const useShared = shared && shared.n_plays > child.n_plays
                if (useShared) this.transpositionHits++
                const value = child.getUCB1(this.UCB1ExploreParam, this.scoreBounds,
                    useShared ? shared : child)
                if (bestPlay === undefined || value > bestUCB1) {
                    bestPlay = play
                    bestUCB1 = value
                }
            }
            node = node.childNode(bestPlay)
        }
        return node
    }

    expand(node) {
        const plays = node.unexpandedPlays()
        const play = plays[Math.floor(random.nextRandFloat() * plays.length)]
        const childState = this.game.nextState(node.state, play)
        const childPlays = childState.finish ? [] : this.game.legalPlays(childState)
        const childNode = node.expand(play, childState, childPlays)
        this.indexNode(childNode)
        return childNode
    }

    /** Validação estrutural; não substitui um solver de Sokoban. */
    static isValidCandidate(state, minBoxes = 2) {
        if (!state || !state.finish || !Number.isFinite(state.score)) return false
        const { board, snapshot } = state
        if (!Array.isArray(board) || !Array.isArray(snapshot) || !board.length || board.length !== snapshot.length) return false
        const width = Array.isArray(board[0]) ? board[0].length : 0
        if (!width) return false
        let boxes = 0, goals = 0, different = false
        for (let i = 0; i < board.length; i++) {
            if (!Array.isArray(board[i]) || !Array.isArray(snapshot[i]) || board[i].length !== width || snapshot[i].length !== width) return false
            for (let j = 0; j < width; j++) {
                const before = snapshot[i][j], after = board[i][j]
                if (!before || !after || typeof before.tipo !== 'string' || typeof after.tipo !== 'string') return false
                if ((before.tipo === 'parede') !== (after.tipo === 'parede')) return false
                const box = before.tipo === 'caixa', goal = after.tipo === 'caixa'
                if (box) boxes++
                if (goal) goals++
                if (box !== goal) different = true
            }
        }
        return boxes >= Math.max(2, minBoxes) && boxes === goals && different
    }

    /** Puzzles jogáveis iguais não ocupam múltiplas vagas no pool. */
    static candidateKey(state) {
        const types = board => board.map(row => row.map(c => c.tipo === 'parede' ? '#' : c.tipo === 'caixa' ? '$' : c.tipo === 'jogador' ? '@' : '.').join('')).join('/')
        const goals = state.board.map(row => row.map(c => c.tipo === 'caixa' ? '$' : '.').join('')).join('/')
        return types(state.snapshot) + '|' + goals
    }

    rememberCandidate(state) {
        const key = MonteCarlo.candidateKey(state)
        const existing = this.candidates.get(key)
        if (existing && existing.score >= state.score) return
        if (!existing && this.candidates.size >= this.candidateLimit) {
            let worstKey, worstScore = Infinity
            for (const [k, v] of this.candidates) if (v.score < worstScore) { worstKey = k; worstScore = v.score }
            if (state.score <= worstScore) return
            this.candidates.delete(worstKey)
        }
        this.candidates.set(key, state)
    }

    getCandidates() { return [...this.candidates.values()].sort((a,b) => b.score-a.score) }

    evaluateTerminal(state) {
        if (!MonteCarlo.isValidCandidate(state, this.minBoxes)) return null
        const score = state.score
        this.rememberCandidate(state)
        this.scoreBounds.min = Math.min(this.scoreBounds.min, score)
        this.scoreBounds.max = Math.max(this.scoreBounds.max, score)
        if (this.best === null || score > this.bestScore) {
            this.bestScore = score
            this.best = state
        }
        return score
    }

    /** null = candidato inválido; undefined = simulação interrompida por tempo. */
    simulate(node, deadline = Infinity) {
        let state = node.state
        let depth = node.depth
        while (!state.finish) {
            if (Date.now() >= deadline) return undefined
            if (depth >= this.maxDepth) return null
            const plays = this.game.legalPlays(state)
            if (!plays.length) return null
            const play = typeof this.game.chooseRolloutPlay === 'function'
                ? this.game.chooseRolloutPlay(state, plays)
                : plays[Math.floor(random.nextRandFloat() * plays.length)]
            state = this.game.nextState(state, play)
            depth++
        }
        return this.evaluateTerminal(state)
    }

    backpropagate(node, score) {
        const valid = Number.isFinite(score)
        const updated = new Set()
        while (node !== null) {
            const shared = this.sharedStats(node, true)
            if (shared && !updated.has(node.transpositionKey)) {
                updated.add(node.transpositionKey)
                shared.n_plays++
                if (valid) {
                    shared.n_wins += score
                    shared.n_valid++
                }
                this.transpositionUpdates++
            }
            node.n_plays += 1
            if (valid) {
                node.n_wins += score // soma bruta dos scores válidos
                node.n_valid += 1
            }
            node = node.parent
        }
    }

    getStats(state) {
        const node = this.roots.get(state) || this.stateNodes.get(state)
        if (!node) return null
        const stats = {
            n_plays: node.n_plays,
            n_wins: node.n_wins,
            n_valid: node.n_valid,
            children: []
        }
        for (const child of node.children.values()) {
            stats.children.push({
                play: child.play,
                n_plays: child.node ? child.node.n_plays : null,
                n_wins: child.node ? child.node.n_wins : null,
                n_valid: child.node ? child.node.n_valid : null
            })
        }
        return stats
    }
}
