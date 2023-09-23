class Edge {
    constructor(fromRoom, toRoom, cells, tag = {}){
        this.fromRoom = fromRoom
        this.toRoom = toRoom
        this.cells = cells
        this.tag = tag
    }

    hash() {
        return JSON.stringify("fromRoom: [" + this.fromRoom + "], toRoom: ["+this.toRoom+"]")
    }
}