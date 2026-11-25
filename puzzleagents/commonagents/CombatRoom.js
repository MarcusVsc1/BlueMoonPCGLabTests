class CombatRoom {
    constructor() {
        this.defaultTag = { tipo: "combatRoom", subTipo: "CombatRoom", auxiliar: "CombatRoom" }
        this.enemyFactory = new EnemyFactory()
    }

    gerarTag(mapGraph, room) {
        const neighbors = mapGraph.getNeighbors(room)
        if (neighbors.length == 1 || room.tag.auxiliar) {
            return false
        }

        room.tag = this.defaultTag
        return true
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        // BLUEMOON_COMBAT_ARENA_V1: adiar a decisao ate todas as portas estarem posicionadas.
        CombatArenaAgent.defer(room, collectible, level, () => {
            this.enemyFactory.createEnemyWithDrop(level, room, collectible);
            this.enemyFactory.createEnemyWithDrop(level, room, collectible);
        });
    }
}