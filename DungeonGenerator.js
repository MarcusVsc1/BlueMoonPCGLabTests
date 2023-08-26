class DungeonGenerator {
    constructor() {
        this.MAP_SIZE = 80;
        this.NUM_ROOMS = 20;
        this.MIN_ROOM_SIZE = 5;
        this.MAX_ROOM_SIZE = 10;
        this.BUFFER = 2;
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
            do {
                x = Math.floor(Math.random() * (width - roomWidth - 1)) + 1;
                y = Math.floor(Math.random() * (height - roomHeight - 1)) + 1;
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

            const room = new Room(roomCells);
            this.graph.addNode(room);
            generatedRooms.push({ x, y, width: roomWidth, height: roomHeight, id: room.roomId });
        }
        /*
        for (let i = 0; i < this.graph.nodes.length; i++) {
            this.createCorridorForRoom(this.graph.nodes[i], map);
        }*/
        this.sucesso = this.kruskal(map)
        
        this.postProcessing(map, width, height);
        return map;
    }

    postProcessing(map, width, height) {
        this.graph.nodes.forEach(room => {
            this.fillRoomInteriorWithEmpty(room.cells, map, width, height);
            //this.addWallToNonTerminalCellsWithCorridorNeighbor(room, map);
        });
        this.addWalls(height, width, map);
        this.removeIsolatedWalls(map);
    }

    addWalls(height, width, map) {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {

                if (map[y][x] === 0 || map[y][x] === 4) {
                    if (x > 0 && map[y][x - 1] === 9) map[y][x - 1] = 6; // Left wall
                    if (x < width - 1 && map[y][x + 1] === 9) map[y][x + 1] = 6; // Right wall
                    if (y > 0 && map[y - 1][x] === 9) map[y - 1][x] = 6; // Top wall
                    if (y < height - 1 && map[y + 1][x] === 9) map[y + 1][x] = 6;
                }
            }
        }
    }

    createCorridorForRoom(room, map) {
        let generatedRooms = this.graph.nodes;
        let minDistanceInfo = { distance: Infinity, cells: [] };
        let closestRoom = null;
        let corridor = []
        let closestRooms = []

        for (let j = 0; j < generatedRooms.length; j++) {
            const otherRoom = generatedRooms[j];
            if (room !== otherRoom && this.graph.countEdges(otherRoom) < this.graph.MAX_EDGES_PER_ROOM && !this.graph.hasEdge(room, otherRoom)) {
                const distanceInfos = this.graph.getClosestCellsAndDistances(room, otherRoom);
                closestRooms.push({ distanceInfos: distanceInfos, roomId: otherRoom.roomId })
            }
        }
        closestRooms = closestRooms.filter(room => room.distanceInfos.length > 0)
        closestRooms.sort(room => room.distanceInfos[0].distance)

        for (const closestR of closestRooms) {

            closestRoom = null

            for (const distanceInfo of closestR.distanceInfos) {

                const cellA = {
                    x: distanceInfo.cells.cellA.x,
                    y: distanceInfo.cells.cellA.y
                };

                const cellB = {
                    x: distanceInfo.cells.cellB.x,
                    y: distanceInfo.cells.cellB.y
                };
                var previousCorridor = corridor
                corridor = this.createCorridorBetweenCells(cellA, cellB, map)
                var cellprint = "Células do corredor: "
                corridor.forEach(cell => { cellprint = cellprint + "[" + cell.x + "]" + "[" + cell.y + "]/" })
                if (!this.corridorHasObstacles(corridor, map)) {
                    minDistanceInfo = distanceInfo;
                    closestRoom = this.graph.getNodeById(closestR.roomId);
                    //console.log("Não tem obstáculos: " + room.roomId + " - " + closestRoom.roomId)
                    //console.log("Adicionando aresta: " + room.roomId + " - " + closestRoom.roomId)
                    break;
                } else {
                    corridor = previousCorridor
                }

            }
            if (closestRoom) { break; }
        }
        if (closestRoom) {
            this.corridorPassesByRoom([...corridor], map, room, closestRoom);
            room.unavailableCells.push(... this.findNeighborCells(minDistanceInfo.cells.cellA, 2))
            room.addTerminalCell(minDistanceInfo.cells.cellA)
            closestRoom.unavailableCells.push(... this.findNeighborCells(minDistanceInfo.cells.cellB, 2))
            closestRoom.addTerminalCell(minDistanceInfo.cells.cellB)
            this.fillCorridor(corridor, map)
            this.graph.addEdge(room, closestRoom, corridor)
            this.toDebug.push(...corridor)
            // console.log("Aresta adicionada: " + room.roomId + " - " + closestRoom.roomId)
        } else {
            //console.log("Não foi possível criar um corredor a partir da sala " + room.roomId)
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
        var val = ""
        for (const cell of corridorWithoutEndpoints) {
            val = val + " " + map[cell.y][cell.x]
            if (map[cell.y][cell.x] != 9
            ) {
                return true; // Corridor has obstacles
            }
        }
        return false; // Corridor is obstacle-free
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

            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
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

    removeIsolatedWalls(map) {
        const height = map.length;
        const width = map[0].length;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (map[y][x] === 6) { // Check if current cell is a wall
                    const neighborOffsets = [
                        { dx: -1, dy: 0 }, // Left
                        { dx: 1, dy: 0 },  // Right
                        { dx: 0, dy: -1 }, // Up
                        { dx: 0, dy: 1 }   // Down
                    ];

                    let hasCorridorOrEmptyNeighbor = false;

                    for (const offset of neighborOffsets) {
                        const neighborX = x + offset.dx;
                        const neighborY = y + offset.dy;

                        if (
                            neighborX >= 0 && neighborX < width &&
                            neighborY >= 0 && neighborY < height &&
                            (map[neighborY][neighborX] === 4 || map[neighborY][neighborX] === 0) // Check if neighbor is a corridor or empty
                        ) {
                            hasCorridorOrEmptyNeighbor = true;
                            break;
                        }
                    }

                    if (!hasCorridorOrEmptyNeighbor) {
                        map[y][x] = 9; // Set to empty
                    }
                }
            }
        }
    }

    addWallToNonTerminalCellsWithCorridorNeighbor(room, map) {
        for (const cell of room.cells) {
            if (!room.terminalCells.includes(cell) && this.hasCorridorNeighbor(cell, map)) {
                map[cell.y][cell.x] = 6; // Set cell to wall
            }
        }
    }

    hasCorridorNeighbor(cell, map) {
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
                map[neighborY][neighborX] === 4 // Check if neighbor is a corridor
            ) {
                return true;
            }
        }

        return false;
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
                    if (!this.corridorHasObstacles(corridor, map) && !roomA.unavailableCells.includes(cellA) && !roomB.unavailableCells.includes(cellB)) {
                        this.corridorPassesByRoom([...corridor], map, roomA, roomB);
                        roomA.unavailableCells.push(... this.findNeighborCells(cellA, 3))
                        roomA.addTerminalCell(cellA)
                        roomB.unavailableCells.push(... this.findNeighborCells(cellB, 3))
                        roomB.addTerminalCell(cellB)
                        this.fillCorridor(corridor, map)
                        this.graph.addEdge(roomA, roomB, corridor)
                        break;
                    }
                }
            }
        }  
        var contadorConectados = 0
        for(var node of this.graph.nodes){
            for(var otherNode of this.graph.nodes){
                if(node != otherNode && this.graph.areNodesConnected(node, otherNode)){
                    contadorConectados++;
                    break;
                }
            }
        }
    
        return contadorConectados == this.graph.nodes.length;

    }

}