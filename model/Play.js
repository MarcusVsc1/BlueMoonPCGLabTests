'use strict'

/** Class representing a state transition. */
class Play {

    static id = 0
    static boxId = 0
    constructor(params = {}) {
        this.direction = params.direction ? { ...params.direction } : params.direction
        this.x = params.x
        this.y = params.y
        this.tipo = params.tipo
        if(params.tipo == "caixa") {
            this.boxId = Play.boxId
            Play.boxId++
        }
        this.id = Play.id
        Play.id++
    }

    // Chave semântica da ação, independente dos contadores globais.
    actionKey() {
        if (this.tipo) return JSON.stringify(["place", this.tipo, this.x, this.y])
        if (this.direction) return JSON.stringify(["move", this.direction.x, this.direction.y])
        return "freeze-or-finish" // interpretação depende da fase do estado
    }

    // Preserva o hash original para compatibilidade com SokobanState.
    hash() {
        return "PlayId: " + this.id 
    }
}