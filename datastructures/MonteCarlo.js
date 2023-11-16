/** Class representing the Monte Carlo search tree. */
class MonteCarlo {

    constructor(game, UCB1ExploreParam = 2) {
        this.game = game
        this.UCB1ExploreParam = UCB1ExploreParam
        this.nodes = new Map() // map: State.hash() => MonteCarloNode
        this.best = null
        this.bestScore = 0
        this.transpositionTable = {};
    }

    /** If given state does not exist, create dangling node. */
    makeNode(state) {
        if (!this.nodes.has(state.hash())) {
            let unexpandedPlays = this.game.legalPlays(state).slice()
            let node = new MonteCarloNode(null, null, state, unexpandedPlays)
            this.nodes.set(state.hash(), node)
        }
    }

    /** From given state, repeatedly run MCTS to build statistics. */
    runSearch(state, totalMoves = 1000) {
        this.makeNode(state)
        let moves = 0
        let start = Date.now()
        while (moves < totalMoves) {
            var score = 0
            let node = this.select(state)
            if (!node.prunning) {
                if (node.isLeaf() === false) {
                    node = this.expand(node)
                    score = this.simulate(node)
                }
                this.backpropagate(node, score)

            }
            moves++
        }
        console.log("Movimentos:"+moves)
        var time = Date.now() - start
        console.log("Tempo: "+time)
        return this.best
    }

    /** Phase 1, Selection: Select until not fully expanded OR leaf */
    select(state) {
        let node = this.nodes.get(state.hash())
        while (node.isFullyExpanded() && !node.isLeaf()) {
            let plays = node.allPlays()
            let bestPlay
            let bestUCB1 = -Infinity
            for (let play of plays) {
                let childUCB1 = node.childNode(play)
                    .getUCB1(this.UCB1ExploreParam)
                if (childUCB1 > bestUCB1) {
                    bestPlay = play
                    bestUCB1 = childUCB1
                }
            }
            node = node.childNode(bestPlay)
        }

        return node
    }

    /** Phase 2, Expansion: Expand a random unexpanded child node */
    expand(node) {
        let plays = node.unexpandedPlays()
        let index = Math.floor(random.nextRandFloat() * plays.length)
        let play = plays[index]
        let childState = this.game.nextState(node.state, play)
        let childUnexpandedPlays = this.game.legalPlays(childState)
        let childNode = node.expand(play, childState, childUnexpandedPlays)
        this.nodes.set(childState.hash(), childNode)

        return childNode
    }

    /** Phase 3, Simulation: Play game to terminal state, return winner */
    simulate(node) {
        const stateHash = node.state.hash();
    
        // Check if the state has been visited before
        if (this.transpositionTable[stateHash]) {
            return this.transpositionTable[stateHash].score;
        }
    
        let state = node.state;
    
        while (!state.finish) {
            let plays = this.game.legalPlays(state);
            let play = plays[Math.floor(random.nextRandFloat() * plays.length)];
            state = this.game.nextState(state, play);
        }
    
        if (state.score > this.bestScore &&
            Game.countCells(state.board, { x: 0, y: 0 }, { x: state.board.length - 1, y: state.board[0].length - 1 }, "caixa") >= 2) {
            this.bestScore = state.score;
            this.best = state;
        }
    
        // Store the result in the transposition table
        this.transpositionTable[stateHash] = { score: state.score };
    
        return state.score;
    }
    

    /** Phase 4, Backpropagation: Update ancestor statistics */
    backpropagate(node, score) {

        while (node !== null) {
            node.n_plays += 1
            node.n_wins += score
            node = node.parent
        }
    }

    /** Return MCTS statistics for this node and children nodes */
    getStats(state) {
        let node = this.nodes.get(state.hash())
        let stats = {
            n_plays: node.n_plays,
            n_wins: node.n_wins,
            children: []
        }

        for (let child of node.children.values()) {
            if (child.node === null)
                stats.children.push({
                    play: child.play,
                    n_plays: null,
                    n_wins: null
                })
            else
                stats.children.push({
                    play: child.play,
                    n_plays: child.node.n_plays,
                    n_wins: child.node.n_wins
                })
        }
        return stats
    }
}