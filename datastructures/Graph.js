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
        this.adjacencyList.push(new Edge(fromRoom.roomId, toRoom.roomId, cells));
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

    getEdge(roomA, roomB) {
        for (const edge of this.adjacencyList) {
            if ((edge.fromRoom === roomA.roomId && edge.toRoom === roomB.roomId) ||
                (edge.fromRoom === roomB.roomId && edge.toRoom === roomA.roomId)) {
                return edge;
            }
        }
        return null; // Retorna null se a aresta não for encontrada
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

    getCorridorsFromRoom(room) {
        return this.adjacencyList.filter(edge =>
            edge.fromRoom === room.roomId || edge.toRoom === room.roomId
        );
    }

    getOtherRoomInCorridor(corridor, room) {
        if (corridor.fromRoom === room.roomId) {
            return this.getNodeById(corridor.toRoom);
        } else if (corridor.toRoom === room.roomId) {
            return this.getNodeById(corridor.fromRoom);
        }
        return null;
    }

    getNodeById(id) {
        return this.nodes.find((node) => node.roomId == id)
    }

    hasEdgeBetweenRooms(roomA, roomB) {
        for (const edge of this.adjacencyList) {
            if ((edge.fromRoom === roomA.roomId && edge.toRoom === roomB.roomId) ||
                (edge.fromRoom === roomB.roomId && edge.toRoom === roomA.roomId)) {
                return true;
            }
        }
        return false;
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

        return closestCellsAndDistances.slice(0, Math.floor(closestCellsAndDistances.length / 2));
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

    getCorridorsFromRoom(room) {
        return this.adjacencyList.filter(edge => edge.fromRoom === room.roomId || edge.toRoom === room.roomId);
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

    /*
      métodos de puzzle
    */

    findCollectibleRoomsInPathByCorridor(startRoom, corridor) {
        const collectibleRooms = [];
        const visited = new Set();
        const queue = [startRoom]; // Inicie com a sala inicial como ponto de partida.

        while (queue.length > 0) {
            const currentRoom = queue.shift();

            // Verifique se o nó atual é uma sala com a tag "colecionável".
            if (currentRoom.tag.tipo === "colecionável") {
                collectibleRooms.push(currentRoom);
            }

            visited.add(currentRoom);

            for (const neighbor of this.getNeighbors(currentRoom)) {
                // Verifique se a aresta entre a sala atual e o vizinho é o corredor passado por parâmetro (corridor).
                const edge = this.getEdge(currentRoom, neighbor);
                if (edge && !(edge === corridor) && !visited.has(neighbor)) {
                    queue.push(neighbor);
                }
            }
        }

        return collectibleRooms;
    }

    findCollectibleRoomsInPathByRoom(startRoom, room) {
        const collectibleRooms = [];
        const visited = new Set();
        const queue = [startRoom]; // Inicie com a sala inicial como ponto de partida.

        while (queue.length > 0) {
            const currentRoom = queue.shift();

            // Verifique se o nó atual é uma sala com a tag "colecionável".
            if (currentRoom.tag.tipo === "colecionável") {
                collectibleRooms.push(currentRoom);
            }

            visited.add(currentRoom);

            if (currentRoom.roomId !== room.roomId) {
                for (const neighbor of this.getNeighbors(currentRoom)) {
                    // Verifique se a aresta entre a sala atual e o vizinho é o corredor passado por parâmetro (corridor).
                    if (!visited.has(neighbor)) {
                        queue.push(neighbor);
                    }
                }
            }

        }

        return collectibleRooms;
    }

    calculateDistancesFromStart(startRoom) {
        const distances = new Map(); // Mapa para armazenar as distâncias de cada sala.
        const visited = new Set();
        const queue = [{ room: startRoom, distance: 0 }]; // Inicie com a sala inicial e distância zero.

        while (queue.length > 0) {
            const { room, distance } = queue.shift();

            distances.set(room, distance);

            visited.add(room);

            for (const neighbor of this.getNeighbors(room)) {
                if (!visited.has(neighbor)) {
                    queue.push({ room: neighbor, distance: distance + 1 });
                }
            }
        }

        return distances;
    }

    // Função para ordenar todas as salas pela distância em relação à sala inicial
    sortRoomsByDistanceFromStart(startRoom) {
        const distances = this.calculateDistancesFromStart(startRoom);

        // Ordenar as salas com base nas distâncias calculadas.
        const sortedRooms = Array.from(this.nodes);
        sortedRooms.sort((roomA, roomB) => {
            const distanceA = distances.get(roomA) || Infinity;
            const distanceB = distances.get(roomB) || Infinity;
            return distanceA - distanceB;
        });

        return sortedRooms;
    }

    isCorridorWithinDistance(startRoom, targetCorridor, maxDistance) {
        const visited = new Set();
        const queue = [{ room: startRoom, distance: 0 }];

        while (queue.length > 0) {
            const { room, distance } = queue.shift();

            if (distance <= maxDistance) {
                visited.add(room);

                // Buscar os corredores vizinhos a partir da sala
                const neighboringCorridors = this.getCorridorsFromRoom(room);

                // Adicionar a sala do outro lado do corredor à fila
                for (const corridor of neighboringCorridors) {
                    if (corridor === targetCorridor) {
                        return true
                    }
                    const otherRoomId = (corridor.fromRoom === room.roomId) ? corridor.toRoom : corridor.fromRoom;
                    const otherRoom = this.getNodeById(otherRoomId)
                    if (!visited.has(otherRoom)) {
                        queue.push({ room: otherRoom, distance: distance + 1 });
                    }
                }
            }
        }

        return false; // O corredor alvo não foi encontrado dentro da distância especificada
    }

    findShortestPath(roomA, roomB) {
        const visited = new Set();
        const queue = [{ room: roomA, path: [roomA] }];

        while (queue.length > 0) {
            const { room, path } = queue.shift();

            if (room === roomB) {
                return path; // Caminho encontrado
            }

            visited.add(room);

            for (const neighbor of this.getNeighbors(room)) {
                if (!visited.has(neighbor)) {
                    queue.push({ room: neighbor, path: [...path, neighbor] });
                }
            }
        }

        return null; // Não há caminho entre as salas
    }

    findMinimumPathFromRoomToEdge(startRoom, targetEdge) {
        const visited = new Set();
        const queue = [{ room: startRoom, edges: [] }];

        while (queue.length > 0) {
            const { room, edges } = queue.shift();

            visited.add(room);

            for (const neighborEdge of this.getCorridorsFromRoom(room)) {
                if (!visited.has(neighborEdge)) {
                    const otherRoomId = (neighborEdge.fromRoom === room.roomId) ? neighborEdge.toRoom : neighborEdge.fromRoom;
                    const otherRoom = this.getNodeById(otherRoomId);

                    const newEdges = [...edges, neighborEdge];

                    if (neighborEdge === targetEdge) {
                        return newEdges; // Encontramos o edge de destino
                    }

                    queue.push({ room: otherRoom, edges: newEdges });
                }
            }
        }

        return null; // Caminho mínimo não encontrado
    }

    hasLeverDeadlock() {
        var startRoom = this.nodes.filter(node => node.tag.tipo === "inicio")[0].roomId
        var tamanho = this.nodes.filter(node => node.tag.subTipo === "LeverAgent").length
        var visitedStates = []
        var visitedRooms = new Set()
        var state = { roomId: startRoom, leversState: new Array(tamanho).fill(1) }
        visitedStates.push(state)
        var queue = [state]
        while (queue.length > 0) {
            var actualState = queue.shift()
            var stateVisitedRooms = []
            var stateLeverRoomIds = []
            var stateQueue = [actualState.roomId]
            while(stateQueue.length > 0) {
                var actualRoom = this.getNodeById(stateQueue.shift())
                visitedRooms.add(actualRoom.roomId)
                stateVisitedRooms.push(actualRoom.roomId)
                var edges = this.getCorridorsFromRoom(actualRoom)
                if(actualRoom.tag.subTipo == "LeverAgent") {
                    stateLeverRoomIds.push(actualRoom.roomId)
                }
                for(const edge of edges) {
                    var tag = edge.tags.find(tag => {return tag.subTipo == "LeverAgent"})
                    if(tag == null || actualState.leversState[tag.id] != tag.holeNumber) {
                        var otherRoom = this.getOtherRoomInCorridor(edge, actualRoom)
                        if(!stateVisitedRooms.includes(otherRoom.roomId)){
                            stateQueue.push(otherRoom.roomId)
                        }
                    }
                }
            }
            for(var leverRoomId of stateLeverRoomIds) {
                var newLeverState = JSON.parse(JSON.stringify(actualState.leversState))
                var tag = this.getNodeById(leverRoomId).tag
                newLeverState[tag.id] = newLeverState[tag.id] == 1 ? 2 : 1
                if(!queue.some(state => {return UtilityMethods.arraysEqual(newLeverState, state.leversState)}) &&
                !visitedStates.some(visited => {return UtilityMethods.arraysEqual(newLeverState, visited.leversState)})) {
                    queue.push({ roomId: leverRoomId, leversState: newLeverState })
                }
            }
            visitedStates.push(actualState)
        }
        var deadlock = visitedRooms.size !== this.nodes.length
        if(deadlock) {
            console.log("Tem deadlock")
        }
        return deadlock
    }




}