class DungeonGenerator {
    constructor() {
        this.MAP_SIZE = 40;
        this.NUM_ROOMS = 8;
        this.MIN_ROOM_SIZE = 5;
        this.MAX_ROOM_SIZE = 10;
        this.BUFFER = 3;
        this.graph = new Graph();
        this.toDebug = [];
    }

    isOverlapWithBuffer(rooms, newRoom, buffer) {
        for (const room of rooms) {
            if (
                newRoom.x - buffer < room.x + room.width &&
                newRoom.x + newRoom.width + buffer > room.x &&
                newRoom.y - buffer < room.y + room.height &&
                newRoom.y + newRoom.height + buffer > room.y
            ) {
                return true;
            }
        }
        return false;
    }

    createMap() {
        const width = this.MAP_SIZE;
        const height = this.MAP_SIZE;

        const map = [];



        for (let y = 0; y < height; y++) {
            map.push(new Array(width).fill(9));
        }

        const generatedRooms = [];

        for (let i = 0; i < this.NUM_ROOMS; i++) {
            const roomWidth = Math.floor(Math.random() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE + 1)) + this.MIN_ROOM_SIZE;
            const roomHeight = Math.floor(Math.random() * (this.MAX_ROOM_SIZE - this.MIN_ROOM_SIZE + 1)) + this.MIN_ROOM_SIZE;

            let x, y;
            var end = Date.now() + this.MAP_SIZE * 5
            do {
                x = Math.floor(Math.random() * (width - roomWidth - 1)) + 1;
                y = Math.floor(Math.random() * (height - roomHeight - 1)) + 1;
                if (Date.now() > end) {
                    this.sucesso = false
                    console.log('Erro ao iniciar as salas')
                    return null
                }
            } while (this.isOverlapWithBuffer(generatedRooms, { x, y, width: roomWidth, height: roomHeight }, this.BUFFER));
            for (let ty = y; ty < y + roomHeight; ty++) {
                for (let tx = x; tx < x + roomWidth; tx++) {
                    map[ty][tx] = 0; // Floor
                }
            }

            const roomCells = [];
            for (let ty = y; ty < y + roomHeight; ty++) {
                for (let tx = x; tx < x + roomWidth; tx++) {
                    map[ty][tx] = 0;
                    roomCells.push({ x: tx, y: ty });
                }
            }

            const room = new Room(roomCells, roomHeight, roomWidth);
            this.addWallsToRoom(room, map)
            this.graph.addNode(room);
            generatedRooms.push({ x, y, width: roomWidth, height: roomHeight, id: room.roomId });
        }

        this.sucesso = this.kruskal(map)

        this.postProcessing(map, width, height);
        return map;
    }

    postProcessing(map, width, height) {
        this.graph.nodes.forEach(room => {
            this.fillRoomInteriorWithEmpty(room.cells, map, width, height);
        });
        this.removeCorridorUnnecessaryCells(map)
        this.addWalls(height, width, map);
    }

    removeCorridorUnnecessaryCells(map) {
        for (var corridor of this.graph.adjacencyList) {
            var toRemove = []
            if (corridor.cells.length > 3) {
                for (var i = 0; i < corridor.cells.length / 2; i++) {
                    var actualNeighbors = DungeonGenerator.findNeighborsByType(map, corridor.cells[i], 0)
                    var nextNeighbors = DungeonGenerator.findNeighborsByType(map, corridor.cells[i + 1], 0)
                    if (actualNeighbors.length > 0 && nextNeighbors.length > 0) {
                        var newTerminalCell = nextNeighbors[0]
                        toRemove.push(corridor.cells[i])
                        var room = this.graph.findRoomByCoordinates(newTerminalCell.x, newTerminalCell.y)
                        room.addTerminalCell(newTerminalCell)
                        map[corridor.cells[i].y][corridor.cells[i].x] = 6
                    }
                    else {
                        break;
                    }
                }
                for (var i = corridor.cells.length - 1; i >= corridor.cells.length / 2; i--) {
                    actualNeighbors = DungeonGenerator.findNeighborsByType(map, corridor.cells[i], 0)
                    nextNeighbors = DungeonGenerator.findNeighborsByType(map, corridor.cells[i - 1], 0)
                    if (actualNeighbors.length > 0 && nextNeighbors.length > 0) {
                        var newTerminalCell = nextNeighbors[0]
                        toRemove.push(corridor.cells[i])
                        var room = this.graph.findRoomByCoordinates(newTerminalCell.x, newTerminalCell.y)
                        room.addTerminalCell(newTerminalCell)
                        map[corridor.cells[i].y][corridor.cells[i].x] = 6
                    } else {
                        break;
                    }
                }
            }
            corridor.cells = corridor.cells.filter(cell => !toRemove.some(removed => cell.x == removed.x && cell.y == removed.y))
        }
        for (var room of this.graph.nodes) {
            var toRemove = []
            for (var terminalCell of room.terminalCells) {
                if (DungeonGenerator.findNeighborsByType(map, terminalCell, 4).length == 0) {
                    toRemove.push(terminalCell)
                }
            }
            room.terminalCells = room.terminalCells.filter(cell => !toRemove.some(removed => cell.x == removed.x && cell.y == removed.y))
        }
    }

    addWalls(height, width, map) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (map[y][x] === 0 || map[y][x] === 4) {
                    if (x > 0 && map[y][x - 1] === 9) map[y][x - 1] = 6; // Left wall
                    if (x < width - 1 && map[y][x + 1] === 9) map[y][x + 1] = 6; // Right wall
                    if (y > 0 && map[y - 1][x] === 9) map[y - 1][x] = 6; // Top wall
                    if (y < height - 1 && map[y + 1][x] === 9) map[y + 1][x] = 6; // Bottom Wall
                }
            }
        }
    }

    findNeighborCells(cell, distance) {
        const neighborCells = [];

        for (let dx = -distance; dx <= distance; dx++) {
            for (let dy = -distance; dy <= distance; dy++) {

                const neighborX = cell.x + dx;
                const neighborY = cell.y + dy;
                // Ensure the cell is within the specified distance and not the center cell itself
                if (neighborX != cell.X && neighborY != cell.Y) {
                    neighborCells.push({ x: neighborX, y: neighborY });
                }
            }
        }
        return neighborCells;
    }

    createCorridorBetweenCells(cellA, cellB) {
        const dx = Math.abs(cellB.x - cellA.x);
        const dy = Math.abs(cellB.y - cellA.y);
        const sx = cellA.x < cellB.x ? 1 : -1;
        const sy = cellA.y < cellB.y ? 1 : -1;

        let x = cellA.x;
        let y = cellA.y;
        let err = dx - dy;
        let horizontal = false;

        const corridorCells = [];

        while (x !== cellB.x || y !== cellB.y) {
            corridorCells.push({ x, y }); // Add the current cell to the corridor array

            const e2 = 2 * err;

            if (horizontal) {
                if (e2 > -dy) {
                    err -= dy;
                    x += sx;
                }
            } else {
                if (e2 < dx) {
                    err += dx;
                    y += sy;
                }
            }

            horizontal = !horizontal; // Toggle direction
        }

        corridorCells.push({ x, y });

        return corridorCells;
    }

    corridorHasObstacles(corridorCells, map) {
        const corridorWithoutEndpoints = corridorCells.slice(1, -1); // Remove initial and final cells
        for (const cell of corridorWithoutEndpoints) {
            if (map[cell.y][cell.x] != 9
            ) {
                return true; // Corridor has obstacles
            }
        }

        var roomsCells = this.graph.nodes.map(node => node.cells).flatMap(cells => cells);
        var init = 0
        var end = corridorWithoutEndpoints.length - 1
        while (map[corridorWithoutEndpoints[init].y][corridorWithoutEndpoints[init].x] != 9) {
            init++
        }
        while (map[corridorWithoutEndpoints[end].y][corridorWithoutEndpoints[end].x] != 9) {
            end--
        }
        var neighborCells = new Set()
        for (var i = init +2; i < end-2; i++) {
            neighborCells.add(DungeonGenerator.findNeighbors(map, corridorWithoutEndpoints[i]))
        }
        neighborCells = [].concat(...Array.from(neighborCells))
        if (!this.disjoint(neighborCells, roomsCells)) {
            return true
        }

        return false; // Corridor is obstacle-free
    }

    disjoint(array1, array2) {
        return array1.every(elemento1 => !array2.some(elemento2 => elemento1.x === elemento2.x && elemento1.y === elemento2.y));
      }

    fillCorridor(corridorCells, map) {
        for (const cell of corridorCells) {
            map[cell.y][cell.x] = 4; // Corridor tile
        }

        const corridorWithoutEndpoints = corridorCells.slice(2, -2)
        for (const cell of corridorWithoutEndpoints) {
            this.addWallsToNeighbors(map, cell)
        }
    }

    addWallsToNeighbors(map, cell) {
        const neighborOffsets = [
            { dx: -1, dy: 0 },   // Left
            { dx: 1, dy: 0 },    // Right
            { dx: 0, dy: -1 },   // Up
            { dx: 0, dy: 1 }     // Down
        ];

        for (const offset of neighborOffsets) {
            const neighborX = cell.x + offset.dx;
            const neighborY = cell.y + offset.dy;

            if (
                neighborX >= 0 && neighborX < map[0].length &&
                neighborY >= 0 && neighborY < map.length &&
                map[neighborY][neighborX] !== 4 // Check if neighbor is not a corridor
            ) {
                map[neighborY][neighborX] = 6; // Set neighbor to wall
            }
        }
    }

    fillRoomInteriorWithEmpty(cells, map, width, height) {
        for (const cell of cells) {
            const { x, y } = cell;

            if (x > 0 && x < width - 1 && y > 0 && y < height - 1 /* && map[y][x] == 4*/) {
                map[y][x] = 0; // Empty tile
            }
        }
    }

    corridorPassesByRoom(corridor, map, roomA, roomB) {
        for (const cell of corridor) {
            for (const room of this.graph.nodes) {
                if (room.roomId != roomA.roomId && room.roomId != roomB.roomId) {
                    this.fillAdjacentCells(cell, room, map)
                }
            }
        }
        return false;
    }

    fillAdjacentCells(cell, room, map) {
        const neighbors = [
            { dx: -1, dy: 0 }, // Left
            { dx: 1, dy: 0 },  // Right
            { dx: 0, dy: -1 }, // Up
            { dx: 0, dy: 1 }   // Down
        ];

        for (const neighbor of neighbors) {
            const neighborX = cell.x + neighbor.dx;
            const neighborY = cell.y + neighbor.dy;
            for (const node of room.cells) {
                if (node.x == neighborX && node.y == neighborY) {
                    map[neighborX][neighborY] == 9
                }
            }
        }
    }

    addWallsToRoom(room, map) {
        for (const cell of room.cells) {
            if (
                cell.x > 0 && map[cell.y][cell.x - 1] === 9 ||
                cell.x < map[0].length - 1 && map[cell.y][cell.x + 1] === 9 ||
                cell.y > 0 && map[cell.y - 1][cell.x] === 9 ||
                cell.y < map.length - 1 && map[cell.y + 1][cell.x] === 9
            ) {
                map[cell.y][cell.x] = 6; // Set to wall
            }
        }
    }

    kruskal(map) {
        let possibleEdges = []
        for (let i = 0; i < this.graph.nodes.length; i++) {
            var generatedRoom = this.graph.nodes[i]
            let roomEdges = []
            for (let j = 0; j < this.graph.nodes.length; j++) {
                const otherRoom = this.graph.nodes[j];
                if (generatedRoom !== otherRoom && this.graph.countEdges(otherRoom) < this.graph.MAX_EDGES_PER_ROOM) {
                    const distanceInfos = this.graph.getClosestCellsAndDistances(generatedRoom, otherRoom);
                    roomEdges.push({ distanceInfos: distanceInfos, fromRoom: generatedRoom.roomId, toRoom: otherRoom.roomId })
                }
            }
            roomEdges = roomEdges.filter(edge => edge.distanceInfos.length > 0)
            possibleEdges.push(...roomEdges)
        }

        possibleEdges.sort((edgeA, edgeB) => edgeA.distanceInfos[0].distance - edgeB.distanceInfos[0].distance);

        for (var i = 0; i < possibleEdges.length; i++) {
            var edge = possibleEdges[i]
            const roomA = this.graph.getNodeById(edge.fromRoom);
            const roomB = this.graph.getNodeById(edge.toRoom);
            if (!this.graph.areNodesConnected(roomA, roomB) && !(this.graph.hasEdge(roomA, roomB))) {
                for (var j = 0; j < edge.distanceInfos.length; j++) {
                    var distanceInfo = edge.distanceInfos[j]
                    const cellA = {
                        x: distanceInfo.cells.cellA.x,
                        y: distanceInfo.cells.cellA.y
                    };

                    const cellB = {
                        x: distanceInfo.cells.cellB.x,
                        y: distanceInfo.cells.cellB.y
                    };
                    var corridor = this.createCorridorBetweenCells(cellA, cellB, map)
                    if (!roomA.unavailableCells.find(cell => cell.x === cellA.x && cell.y === cellA.y) &&
                        !roomB.unavailableCells.find(cell => cell.x === cellB.x && cell.y === cellB.y) &&
                        !this.corridorHasObstacles(corridor, map)) {
                        this.removerDuplicatas(corridor)
                        roomA.unavailableCells.push(... this.findNeighborCells(cellA, 3))
                        roomA.addTerminalCell(cellA)
                        roomB.unavailableCells.push(... this.findNeighborCells(cellB, 3))
                        roomB.addTerminalCell(cellB)
                        var corridorClone = this.removerDuplicatas(corridor)
                        this.fillCorridor(corridor, map)
                        var corridorClone = corridorClone.slice(1, -1)
                        this.graph.addEdge(roomA, roomB, corridorClone)
                        this.corridorPassesByRoom([...corridorClone], map, roomA, roomB);
                        break;
                    }
                }
            }
        }
        for (var node of this.graph.nodes) {
            for (var otherNode of this.graph.nodes) {
                if (node != otherNode && !this.graph.areNodesConnected(node, otherNode)) {
                    console.log("Erro no kruskal")
                    return false;
                }
            }
        }

        return true;

    }


    /*
    Métodos auxiliares
    */

    removerDuplicatas(arr) {
        const uniqueSet = new Set(arr.map(elemento => JSON.stringify(elemento)));
        return Array.from(uniqueSet).map(item => JSON.parse(item));
    }

    static findNeighborsByType(map, cell, type) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const neighbors = [];

        const numLinhas = map.length;
        const numColunas = map[0].length;

        for (const [dx, dy] of directions) {
            const newX = cell.x + dx;
            const newY = cell.y + dy;
            if (newX >= 0 && newX < numColunas && newY >= 0 && newY < numLinhas &&
                map[newY][newX] === type) {
                neighbors.push({ x: newX, y: newY });
            }
        }

        return neighbors;
    }

    static findNeighbors(map, cell) {
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const neighbors = [];

        const numLinhas = map.length;
        const numColunas = map[0].length;

        for (const [dx, dy] of directions) {
            const newX = cell.x + dx;
            const newY = cell.y + dy;

            neighbors.push({ x: newX, y: newY });

        }

        return neighbors;
    }

}