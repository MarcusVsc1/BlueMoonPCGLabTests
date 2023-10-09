class CombatRoom {
    constructor() {
        this.defaultTag = { tipo: "combatRoom", subTipo: "CombatRoom", auxiliar: "CombatRoom" }
    }

    gerarTag(mapGraph, room) {
        const neighbors = mapGraph.getNeighbors(room)
        if (neighbors.length == 1 || room.tag.auxiliar) {
            return false
        }

        room.tag = this.defaultTag
        return true
    }
}