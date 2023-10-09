class Edge {
    constructor(fromRoom, toRoom, cells){
        this.fromRoom = fromRoom
        this.toRoom = toRoom
        this.cells = cells
        this.tags = []
        this.restricoes = []
    }

    hash() {
        return JSON.stringify("fromRoom: [" + this.fromRoom + "], toRoom: ["+this.toRoom+"]")
    }

}