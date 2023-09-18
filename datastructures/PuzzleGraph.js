class PuzzleGraph {
    constructor(mapGraph){
        this.states = [];
        this.actions = [];
        this.iniciarPuzzleGraph(mapGraph);
    }

    iniciarPuzzleGraph(mapGraph){
        this.states.push(new PuzzleState(mapGraph, mapGraph.nodes, [0], 'Ps*'))
        this.states.push(new PuzzleState(mapGraph, mapGraph.nodes, [0], 'PsG'))
        this.actions.push({fromState: 'Ps*', toState: 'PsG'})
    }
}