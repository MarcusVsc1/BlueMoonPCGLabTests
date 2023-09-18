'use strict'

/** Class representing a state transition. */
class Play {

    static id = 0
    static boxId = 0
    constructor(params) {
        this.direction = params.direction
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

    hash() {
        return "PlayId: " + this.id 
    }
}