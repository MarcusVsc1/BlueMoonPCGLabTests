// Graph: mesmas interfaces de Room/Edge, BFS sem duplicar entradas na fila.
class Graph {
    constructor(){this.nodes=[];this.adjacencyList=[];this.MAX_EDGES_PER_ROOM=Infinity;}
    addNode(room){this.nodes.push(room);}
    addEdge(a,b,cells){this.adjacencyList.push(new Edge(a.roomId,b.roomId,cells));}
    hasEdge(a,b){return this.getEdge(a,b)!==null;}
    hasEdgeBetweenRooms(a,b){return this.hasEdge(a,b);}
    getEdge(a,b){return this.adjacencyList.find(e=>(e.fromRoom===a.roomId&&e.toRoom===b.roomId)||(e.fromRoom===b.roomId&&e.toRoom===a.roomId))||null;}
    countEdges(r){return this.getCorridorsFromRoom(r).length;}
    getCorridorsFromRoom(r){return this.adjacencyList.filter(e=>e.fromRoom===r.roomId||e.toRoom===r.roomId);}
    getOtherRoomInCorridor(e,r){return e.fromRoom===r.roomId?this.getNodeById(e.toRoom):e.toRoom===r.roomId?this.getNodeById(e.fromRoom):null;}
    getNodeById(id){return this.nodes.find(n=>n.roomId==id);}
    getNeighbors(r){return this.getCorridorsFromRoom(r).map(e=>this.getOtherRoomInCorridor(e,r)).filter(Boolean);}
    findRoomByCoordinates(x,y){return this.nodes.find(r=>r.cells.some(c=>c.x===x&&c.y===y))||null;}
    removeCellsFromArray(a,b){const s=new Set(b.map(c=>`${c.x},${c.y}`));return a.filter(c=>!s.has(`${c.x},${c.y}`));}
    getClosestCellsAndDistances(a,b){
        const result=[],aa=this.removeCellsFromArray(a.findEdgeCells(),a.unavailableCells),bb=this.removeCellsFromArray(b.findEdgeCells(),b.unavailableCells);
        for(const cellA of aa)for(const cellB of bb)result.push({cells:{cellA,cellB},distance:Math.abs(cellA.x-cellB.x)+Math.abs(cellA.y-cellB.y)});
        return result.sort((x,y)=>x.distance-y.distance);
    }
    getWeight(a,b){return this.getClosestCellsAndDistances(a,b)[0]||{distance:Infinity,cells:{}};}
    getClosestRoomId(id){const a=this.getNodeById(id);if(!a)return null;let best=null,dist=Infinity;for(const b of this.nodes)if(b!==a)for(const p of a.cells)for(const q of b.cells){const d=Math.abs(p.x-q.x)+Math.abs(p.y-q.y);if(d<dist){best=b.roomId;dist=d;}}return best;}
    // A busca marca cada sala no enfileiramento e guarda o predecessor.
    _bfs(start,canExpand=()=>true,canCross=()=>true){
        const distances=new Map(),previous=new Map(),rooms=[];
        if(!start)return {distances,previous,rooms};
        distances.set(start,0);rooms.push(start);
        for(let i=0;i<rooms.length;i++){
            const r=rooms[i];if(!canExpand(r))continue;
            for(const e of this.getCorridorsFromRoom(r)){
                const n=this.getOtherRoomInCorridor(e,r);
                if(!n||distances.has(n)||!canCross(e,r,n))continue;
                distances.set(n,distances.get(r)+1);previous.set(n,{room:r,edge:e});rooms.push(n);
            }
        }
        return {distances,previous,rooms};
    }
    areNodesConnected(a,b){return !!b&&this._bfs(a).distances.has(b);}
    calculateDistancesFromStart(r){return this._bfs(r).distances;}
    findFarthestRoomFromStart(r){const b=this._bfs(r);let farthest=r,max=-1;for(const n of b.rooms){const d=b.distances.get(n);if(d>max){farthest=n;max=d;}}return farthest;}
    sortRoomsByDistanceFromStart(r){const d=this.calculateDistancesFromStart(r);return [...this.nodes].sort((a,b)=>(d.get(a)??Infinity)-(d.get(b)??Infinity));}
    findCollectibleRoomsInPathByCorridor(r,c){return this._bfs(r,()=>true,e=>e!==c).rooms.filter(n=>n.tag.tipo==='colecionável');}
    findCollectibleRoomsInPathByRoom(r,stop){return this._bfs(r,n=>n.roomId!==stop.roomId).rooms.filter(n=>n.tag.tipo==='colecionável');}
    isCorridorWithinDistance(r,target,maxDistance){const d=this.calculateDistancesFromStart(r);return this.nodes.some(n=>(d.get(n)??Infinity)<=maxDistance&&this.getCorridorsFromRoom(n).includes(target));}
    findShortestPath(a,b){const t=this._bfs(a);if(!t.distances.has(b))return null;const path=[b];while(path[0]!==a)path.unshift(t.previous.get(path[0]).room);return path;}
    findMinimumPathFromRoomToEdge(r,target){
        const t=this._bfs(r),n=t.rooms.find(a=>this.getCorridorsFromRoom(a).includes(target));if(!n)return null;
        const path=[target];let cur=n;while(cur!==r){const p=t.previous.get(cur);path.unshift(p.edge);cur=p.room;}return path;
    }
    // Metodo de progressao original: fora do escopo desta revisao.
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
        return deadlock
    }
}
