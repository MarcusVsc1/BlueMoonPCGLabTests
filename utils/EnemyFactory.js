class EnemyFactory {

    constructor() {
        this.enemyList = [
            { tipo: "diabinho", nivel: 1 },
            { tipo: "caveira", nivel: 1 },
            { tipo: "morcego", nivel: 2 },
            { tipo: "ogro", nivel: 3 },
            { tipo: "necromante", nivel: 4 },
        ]
    }

    createEnemyWithDrop(level, room, drop) {
        const possibleEnemies = this.enemyList.filter(enemy => enemy.nivel <= level)
        const enemyType = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)].tipo
        const positionX = room.cells[0].x + Math.random() * (room.roomWidth - 1) 
        const positionY = room.cells[0].y + Math.random() * (room.roomHeight - 1) 
        var enemy = gerenciador.criarInimigo(enemyType, positionX, positionY)
        if(drop){
            drop.swCD = 0.6
        }
        enemy.drop = drop
        cena1.adicionar(enemy)
    }

}