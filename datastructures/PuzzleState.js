class PuzzleState {
    static puzzleLabel = 0;

    constructor(mapGraph, reachableRooms, statesVector, label){
        this.mapGraph = mapGraph;
        this.reachableRooms = reachableRooms;
        this.statesVector = statesVector;
        this.label = label ? label : 'Ps' + (PuzzleState.puzzleLabel++)
    }

}