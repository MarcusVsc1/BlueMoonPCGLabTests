class Hub {
    constructor() {
        this.defaultTag = { tipo: "hub", subTipo: "Hub", auxiliar: "Hub" }
    }

    gerarTag(mapGraph, room) {
        const neighbors = mapGraph.getNeighbors(room)
        if (neighbors.length == 1 || room.tag.auxiliar ||
            neighbors.some(neighbor => { return neighbor.tag.tipo === 'inicio' }) ) {
            return false
        }

        room.tag = this.defaultTag
        return true
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        
    }
}