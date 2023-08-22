class Graph {
    constructor() {
        this.nodes = [];
        this.adjacencyList = [],
        this.MAX_EDGES_PER_ROOM = 3
    }

    addNode(room) {
        this.nodes.push(room);
    }

    addEdge(fromRoom, toRoom, cells) {
        this.adjacencyList.push({fromRoom: fromRoom.roomId, toRoom: toRoom.roomId, cells: cells});
    }

    getAdjacentRooms(room) {
        return this.adjacencyList.get(room.id).map(roomId => this.nodes.find(node => node.id === roomId));
    }

    hasEdge(fromRoom, toRoom) {
        for (const edge of this.adjacencyList) {
            if ((edge.fromRoom === fromRoom.roomId && edge.toRoom === toRoom.roomId) ||
                (edge.fromRoom === toRoom.roomId && edge.toRoom === fromRoom.roomId)) {
                return true;
            }
        }
        return false;
    }

    getWeight(roomA, roomB) {
        let minDistance = Infinity;
        let closestCells = {};

        let availableCellsA = this.removeCellsFromArray(roomA.findEdgeCells(), roomA.unavailableCells);
        let availableCellsB = this.removeCellsFromArray(roomB.findEdgeCells(), roomB.unavailableCells);

        for (const cellA of availableCellsA) {
            for (const cellB of availableCellsB) {
                const distance = Math.sqrt(Math.pow(cellB.x - cellA.x, 2) + Math.pow(cellB.y - cellA.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCells = { cellA, cellB };
                }
            }
        }
        
        return { distance: minDistance, cells: closestCells };
    }   

    removeCellsFromArray(mainArray, cellsToRemove) {
        return mainArray.filter(cell => {
            // Check if the current cell is not present in the cellsToRemove array
            return !cellsToRemove.some(cellToRemove => cellToRemove.x === cell.x && cellToRemove.y === cell.y);
        });
    }


    countEdges(room) {
        let roomId = room.roomId
        let count = 0;
        for (const edge of this.adjacencyList) {
            if (edge.fromRoom === roomId || edge.toRoom === roomId) {
                count++;
            }
        }
        return count;
    }

    getNodeById (id) {
        return this.nodes.filter((node) => node.roomId == id)[0]
    }

    findRoomByCoordinates(x, y) {
        for (const room of this.nodes) {
            const { x: roomX, y: roomY, width, height } = room;
    
            if (x >= roomX && x < roomX + width && y >= roomY && y < roomY + height) {
                return room;
            }
        }
    
        return null; 
    }

    getClosestRoomId(roomId) {
        const sourceRoom = this.graph.getNodeById(roomId);
        let minDistance = Infinity;
        let closestRoomId = null;
    
        for (const room of this.graph.nodes) {
            if (room.roomId !== roomId) {
                for (const cellA of sourceRoom.cells) {
                    for (const cellB of room.cells) {
                        const distance = Math.abs(cellA.x - cellB.x) + Math.abs(cellA.y - cellB.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestRoomId = room.roomId;
                        }
                    }
                }
            }
        }
    
        return closestRoomId;
    }
    

}