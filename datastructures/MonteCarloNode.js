/**
 * Class representing a node in the search tree.
 * Stores tree search stats for UCB1.
 */
class MonteCarloNode {
	/**
	 * Create a new MonteCarloNode in the search tree.
	 * @param {MonteCarloNode} parent - The parent node.
	 * @param {Play} play - Last play played to get to this state.
	 * @param {State} state - The corresponding state.
	 * @param {Play[]} unexpandedPlays - The node's unexpanded child plays.
	 */
	constructor(parent, play, state, unexpandedPlays) {

		this.play = play
		this.state = state

		// Monte Carlo stuff
		this.n_plays = 0
		this.n_wins = 0 // soma dos scores válidos, antes da normalização
		this.n_valid = 0

		// Tree stuff
		this.parent = parent
		this.depth = parent === null ? 0 : parent.depth + 1
		this.children = new Map()
		for (let play of unexpandedPlays) {
			this.children.set(play.hash(), { play: play, node: null })
		}
	}

	/**
	 * Get the MonteCarloNode corresponding to the given play.
	 * @param {Play} play - The play leading to the child node.
	 * @return {MonteCarloNode} The child node corresponding to the play given.
	 */
	childNode(play) {
		let child = this.children.get(play.hash())
		if (child === undefined) {
			throw new Error('No such play!')
		}
		else if (child.node === null) {
			throw new Error("Child is not expanded!")
		}
		return child.node
	}

	/**
	 * Expand the specified child play and return the new child node.
	 * Add the node to the array of children nodes.
	 * Remove the play from the array of unexpanded plays.
	 * @param {Play} play - The play to expand.
	 * @param {State} childState - The child state corresponding to the given play.
	 * @param {Play[]} unexpandedPlays - The given child's unexpanded child plays; typically all of them.
	 * @return {MonteCarloNode} The new child node.
	 */
	expand(play, childState, unexpandedPlays) {
		if (!this.children.has(play.hash())) throw new Error("No such play!")
		if (this.children.get(play.hash()).node !== null) throw new Error("Child already expanded!")
		let childNode = new MonteCarloNode(this, play, childState, unexpandedPlays)
		this.children.set(play.hash(), { play: play, node: childNode })
		return childNode
	}

	/**
	 * Get all legal plays from this node.
	 * @return {Play[]} All plays.
	 */
	allPlays() {
		let ret = []
		for (let child of this.children.values()) {
			ret.push(child.play)
		}
		return ret
	}

	/**
	 * Get all unexpanded legal plays from this node.
	 * @return {Play[]} All unexpanded plays.
	 */
	unexpandedPlays() {
		let ret = []
		for (let child of this.children.values()) {
			if (child.node === null) ret.push(child.play)
		}
		return ret
	}

	/**
	 * Whether this node is fully expanded.
	 * @return {boolean} Whether this node is fully expanded.
	 */
	isFullyExpanded() {
		for (let child of this.children.values()) {
			if (child.node === null) return false
		}
		return true
	}

	/**
	 * Whether this node is terminal in the game tree, NOT INCLUSIVE of termination due to winning.
	 * @return {boolean} Whether this node is a leaf in the tree.
	 */
	isLeaf() {
		return this.children.size === 0;
	}

	/**
	 * Get the UCB1 value for this node.
	 * @param {number} biasParam - The square of the bias parameter in the UCB1 algorithm, defaults to 2.
	 * @return {number} The UCB1 value of this node.
	 */
	getUCB1(biasParam = 2, bounds = { min: 0, max: 1 }, stats = this) {
		if (this.n_plays === 0) return Infinity
		// Recompensa inválida = 0; válida = [0.5, 1]. As médias
		// são normalizadas com os mesmos limites globais a cada seleção.
		let exploitation = 0
		if (stats.n_valid > 0 && stats.n_plays > 0) {
			const mean = stats.n_wins / stats.n_valid
			const range = bounds.max - bounds.min
			const scaled = Number.isFinite(range) && range > 0
				? Math.max(0, Math.min(1, (mean - bounds.min) / range)) : 0.5
			exploitation = (stats.n_valid / stats.n_plays) * (0.5 + 0.5 * scaled)
		}
		if (this.parent === null) return exploitation
		const exploration = Math.sqrt(Math.max(0, biasParam) * Math.log(Math.max(1, this.parent.n_plays)) / this.n_plays)
		return exploitation + exploration
	}

}