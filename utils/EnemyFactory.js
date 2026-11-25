class EnemyFactory {

    constructor() {
        this.enemyList = [
            { tipo: "diabinho", nivel: 1 },
            { tipo: "caveira", nivel: 1 },
            { tipo: "morcego", nivel: 2 },
            { tipo: "ogro", nivel: 3 },
            { tipo: "necromante", nivel: 4 },
            { tipo: "escudeiro", nivel: 4 }, /* BLUEMOON_SHIELD_ENEMY_V1 */
        ]
    }

    createEnemyWithDrop(level, room, drop, posX, posY) {
        const possibleEnemies = this.enemyList.filter(enemy => enemy.nivel <= level && (enemy.tipo !== "escudeiro" || (drop && ShieldEnemy.eligible(room, cena1)) /* BLUEMOON_COMBAT_ARENA_V1 */))
        let enemyType = possibleEnemies[Math.floor(random.nextRandFloat() * possibleEnemies.length)].tipo
        var positionX = posX
        var positionY = posY
        if (!posX && !posY) {
            positionX = room.cells[0].x + random.nextRandFloat() * (room.roomWidth - 1)
            positionY = room.cells[0].y + random.nextRandFloat() * (room.roomHeight - 1)
        }
        if (enemyType === "escudeiro") {
            const cell = ShieldEnemy.spawnPosition(room, positionX, positionY);
            if (cell) { positionX = cell.x; positionY = cell.y; }
            else { enemyType = "caveira"; }
        }
        var enemy = gerenciador.criarInimigo(enemyType, positionX, positionY);
        if (ShieldEnemy.is(enemy)) enemy.shieldSpawnRoom = room;if (drop) {
            drop.swCD = 0.6
        }
        enemy.drop = drop
        cena1.adicionar(enemy)
    }

    createIgnisFatuus(room){
        var positionX = room.cells[0].x + random.nextRandFloat() * (room.roomWidth - 1)
        var positionY = room.cells[0].y + random.nextRandFloat() * (room.roomHeight - 1)
        var enemy = gerenciador.criarInimigo("ignisFatuus", positionX, positionY)
        enemy.roomId = room.roomId
        cena1.adicionar(enemy)
    }

}