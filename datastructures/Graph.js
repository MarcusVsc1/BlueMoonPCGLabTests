class Graph {
    constructor() {
        this.nodes = [];
        this.adjacencyList = [],
            this.MAX_EDGES_PER_ROOM = Infinity
    }

    addNode(room) {
        this.nodes.push(room);
    }

    addEdge(fromRoom, toRoom, cells) {
        this.adjacencyList.push({ fromRoom: fromRoom.roomId, toRoom: toRoom.roomId, cells: cells });
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

    getNodeById(id) {
        return this.nodes.filter((node) => node.roomId == id)[0]
    }

    findRoomByCoordinates(x, y) {
        for (const node of this.nodes) {
            for (const cell of node.cells) {
                if (cell.x === x && cell.y === y) {
                    return node;
                }
            }
        }
        return null; // Caso não encontre nenhum nó correspondente
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

    getClosestCellsAndDistances(roomA, roomB) {
        const closestCellsAndDistances = [];
        const availableCellsA = this.removeCellsFromArray(roomA.findEdgeCells(), roomA.unavailableCells);
        const availableCellsB = this.removeCellsFromArray(roomB.findEdgeCells(), roomB.unavailableCells);

        for (const cellA of availableCellsA) {
            for (const cellB of availableCellsB) {
                const distance = Math.hypot((cellB.x - cellA.x), (cellB.y - cellA.y));
                closestCellsAndDistances.push({ cells: { cellA, cellB }, distance });
            }
        }

        closestCellsAndDistances.sort((a, b) => a.distance - b.distance);

        return closestCellsAndDistances;
    }

    getNeighbors(room) {
        const neighbors = [];

        this.adjacencyList.forEach(edge => {
            if (edge.fromRoom == room.roomId) {
                neighbors.push(this.getNodeById(edge.toRoom))
            }
            if (edge.toRoom == room.roomId) {
                neighbors.push(this.getNodeById(edge.fromRoom))
            }
        })

        return neighbors;
    }

    areNodesConnected(nodeA, nodeB) {
        const visited = new Set();
        const queue = [nodeA];

        while (queue.length > 0) {
            const currentNode = queue.shift();

            if (currentNode.roomId == nodeB.roomId) {
                return true; // Nodes are connected
            }

            visited.add(currentNode);

            var neighbors = this.getNeighbors(currentNode).filter(neighbor => !visited.has(neighbor));

            queue.push(...neighbors);

        }

        return false; // Nodes are not connected
    }

    findFarthestRoomFromStart(startRoom) {
        const visited = new Set();
        const queue = [{ room: startRoom, distance: 0 }];
        let farthestRoom = startRoom;
        let maxDistance = 0;
      
        while (queue.length > 0) {
          const { room, distance } = queue.shift();
      
          if (distance > maxDistance) {
            maxDistance = distance;
            farthestRoom = room;
          }
      
          visited.add(room);
      
          const neighbors = this.getNeighbors(room).filter(neighbor => !visited.has(neighbor));
      
          for (const neighbor of neighbors) {
            queue.push({ room: neighbor, distance: distance + 1 });
          }
        }
      
        return farthestRoom;
      }


}