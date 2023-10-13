class Hub {
    constructor() {
        this.defaultTag = { tipo: "hub", subTipo: "Hub", auxiliar: "Hub" }
        this.commons = new CommonsFactory()

        this.levelMapper = new Map()
        this.levelMapper.set(1, function () {})
        this.levelMapper.set(2, function () {})
        this.levelMapper.set(3, function (room) {
            this.commons.posicionarPoderes(room, 1)
        }.bind(this))
        this.levelMapper.set(4, function (room) {
            this.commons.posicionarPoderes(room, 2)
        }.bind(this))
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
        this.levelMapper.get(level)(room)
    }
}