class MazeAgent {
    constructor() {
        this.frontierCells = []
    }

    gerarPuzzle(mapGraph, puzzleGraph) {
        this.frontierCells = []
        var rooms = mapGraph.nodes.filter(node => node.roomHeight * node.roomWidth >= 48  && node.terminalCells.length == 1)
        if (rooms.length > 0) {
            var room = rooms[0]
            console.log("Id da sala " + room.roomId)
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

        } else {
            console.log("Salas indisponíveis")
        }

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
            var frontierCell = SwitchAgent.fisherYales(this.frontierCells).pop()
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