class MazeAgent{
    constructor() {
        this.defaultTag = "MazeAgent"

        this.frontierCells = []
        this.levelMapper = new Map()
        this.levelMapper.set(1, function (room, collectible) {
            this.posicionarColecionavel(room, collectible)
        }.bind(this))
        this.levelMapper.set(2, function (room, collectible, level) {
            this.createEnemy(room, collectible, level)
        }.bind(this))
        this.levelMapper.set(3, function (room, collectible, level) {
            this.createEnemy(room, collectible, level)
        }.bind(this))
        this.levelMapper.set(4, function (room, collectible, level) {
            this.createEnemy(room, collectible, level)
        }.bind(this))
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        this.criarLabirinto(room)
        this.levelMapper.get(level)(room, collectible, level)
    }

    gerarTagAuxiliar(mapGraph, room) {
        if(mapGraph.getNeighbors(room).length > 1 || room.cells.length < 36) return false
        room.tag.auxiliar = this.defaultTag
        return true
    }

    posicionarColecionavel(room, collectible){
        var startCell = {
            x: room.terminalCells[0].x,
            y: room.terminalCells[0].y,
            distance: 0
        }
        var queue = [startCell]
        var visitados = []
        while(queue.length > 0){
            var atual = queue.shift()
            visitados.push(atual)
            var proximos = this.getFloorNeighbors(atual)
            proximos.forEach(proximo => {
                if(!visitados.some(visitado => { return visitado.x === proximo.x && visitado.y === proximo.y})){
                    queue.push(proximo)
                }
            })
        }
       
        const visitadosOrdenados = visitados.sort((pos1, pos2) => pos2.distance - pos1.distance);
        collectible.x = visitadosOrdenados[0].x * 32 + 16
        collectible.y = visitadosOrdenados[0].y * 32 + 16

        cena1.adicionar(collectible)

    }

    getFloorNeighbors(cell) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const neighbors = [];
        var map = gerenciador.estagios[0].mapa

        const numLinhas = map.cells.length;
        const numColunas = map.cells[0].length;

        for (const [dx, dy] of directions) {
            const newX = cell.x + dx;
            const newY = cell.y + dy;
            if (newX >= 0 && newX < numColunas && newY >= 0 && newY < numLinhas &&
                map.cells[newX][newY].tipo === 0) {
                neighbors.push({ x: newX, y: newY, distance: cell.distance + 1 });
            }
        }

        return neighbors;
    }

    createEnemy(room, collectible, level){
        collectible.enemyFactory = new EnemyFactory()
        collectible.level = level - 1
        collectible.startCell = room.terminalCells[0]
        collectible.onGet = this.onGet
        this.posicionarColecionavel(room, collectible)
    }

    onGet() {
        assetsMng.play("darkness")
        cena1.dialogo = "CUIDADO! Um inimigo apareceu!"
        cena1.caution = true
        this.enemyFactory.createEnemyWithDrop(this.level, null, null, this.startCell.x, this.startCell.y)
        this.onGet = null
    }

    criarLabirinto(room) {
        this.frontierCells = []

        darkRoom(room.roomId)

        this.roomTotalCells = room.roomHeight * room.roomWidth
        var roomMatrix = this.inicializarMatriz(room.roomHeight, room.roomWidth)

        var startCell = {
            x: room.terminalCells[0].y - room.cells[0].y,
            y: room.terminalCells[0].x - room.cells[0].x,
        }

        var matrizFinal = this.randomizedPrim(startCell, roomMatrix)
        var matrizMapeada = matrizFinal.map((linha) => {
            return linha.map((elemento) => {
                if (elemento === "bloqueado") {
                    return 6;
                } else if (elemento === "passagem") {
                    return 0;
                } else {
                    return elemento; // Se for outro valor, mantenha-o inalterado
                }
            });
        });
        room.terminalCells.forEach(element => {
            matrizMapeada[element.y - room.cells[0].y][element.x - room.cells[0].x] = 0
        });
        this.mapToDungeon(room.cells[0], matrizMapeada)

    }

    inicializarMatriz(m, n) {
        // Crie uma matriz vazia
        const matriz = [];

        // Preencha a matriz com o valor 6
        for (let i = 0; i < m; i++) {
            const linha = [];
            for (let j = 0; j < n; j++) {
                linha.push("bloqueado");
            }
            matriz.push(linha);
        }

        return matriz;
    }

    getFrontierCells(matrix, x, y) {
        const frontierCells = [];
        const numRows = matrix.length;
        const numCols = matrix[0].length;

        const directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (newX >= 0 && newX < numRows && newY >= 0 && newY < numCols &&
                matrix[newX][newY] === "bloqueado") {
                frontierCells.push({ x: newX, y: newY, inBetween: { x: x + dx / 2, y: y + dy / 2 } });
            }
        }

        return frontierCells;
    }

    randomizedPrim(cell, matrix) {
        matrix[cell.x][cell.y] = "passagem"
        this.frontierCells.push(... this.getFrontierCells(matrix, cell.x, cell.y))
        while (this.frontierCells.length > 0) {
            var frontierCell = UtilityMethods.fisherYales(this.frontierCells).pop()
            if (frontierCell != null) {
                matrix[frontierCell.x][frontierCell.y] = "passagem"
                matrix[frontierCell.inBetween.x][frontierCell.inBetween.y] = "passagem"
                var newFrontier = this.getFrontierCells(matrix, frontierCell.x, frontierCell.y)
                this.frontierCells.push(... this.diffArraysByXY(newFrontier, this.frontierCells))
            }
        }
        return matrix;
    }

    diffArraysByXY(array1, array2) {
        // Filtrar elementos do array1 que não estejam em array2
        const diffArray = array1.filter((element1) => {
            // Verificar se não existe um elemento em array2 com os mesmos valores de x e y
            return !array2.some((element2) => element1.x === element2.x && element1.y === element2.y);
        });

        return diffArray;
    }

    mapToDungeon(cell, matrix) {
        const numRows = matrix.length;
        const numCols = matrix[0].length;

        for (let i = 0; i < numRows; i++) {
            for (let j = 0; j < numCols; j++) {
                var pos1 = j + cell.x
                var pos2 = i + cell.y
                //console.log(pos1 + " " + pos2)
                gerenciador.estagios[0].mapa.cells[pos1][pos2].tipo = matrix[i][j]

            }
        }

    }
}