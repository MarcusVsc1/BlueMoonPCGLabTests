class LeverAgent {

    constructor(agentLevel = 0) {
        this.agentLevel = 0
        this.defaultTag = { tipo: "colecionável", subTipo: "LeverAgent", id: agentLevel }
    }

    leverEvent() {
        this.toggled = !this.toggled;
        cena1.map.cells[this.coordenadas[!this.toggled ? 1 : 0].y][this.coordenadas[!this.toggled ? 1 : 0].x].tipo = 4
        cena1.map.cells[this.coordenadas[this.toggled ? 1 : 0].y][this.coordenadas[this.toggled ? 1 : 0].x].tipo = 8
        cena1.assets.play("switchOn");
        if(this.onGet){this.onGet()}
    }

    // BM_LEVER_DISTANCE_V1: distancias topologicas, sem depender de tempo real.
    // Corredor incidente na sala = 1; os demais = distancia ate o extremo + 1.
    _bmChooseLeverPair(mapGraph, room, candidates) {
        const distances = mapGraph.calculateDistancesFromStart(room);
        const ends = e => [mapGraph.getNodeById(e.fromRoom), mapGraph.getNodeById(e.toRoom)];
        const distance = e => 1 + Math.min(...ends(e).map(n => distances.get(n) ?? Infinity));
        const within = e => distance(e) >= 1 && distance(e) <= 3;
        // Sorteia primeiro a faixa, depois um corredor nela; renormaliza faixas ausentes.
        const weights = [0, 20, 55, 25];
        const choose = list => {
            const groups = [[], [], [], []];
            for (const e of list) groups[distance(e)].push(e);
            const available = [1,2,3].filter(d => groups[d].length);
            if (!available.length) return null;
            const total = available.reduce((sum,d) => sum + weights[d], 0);
            let r = random.nextRandFloat() * total;
            let d = available[available.length-1];
            for (const k of available) { if (r < weights[k]) { d = k; break; } r -= weights[k]; }
            const group = groups[d];
            return group[Math.floor(random.nextRandFloat() * group.length)];
        };
        const local = mapGraph.adjacencyList.filter(within);
        const firsts = candidates.filter(within);
        while (firsts.length) {
            const first = choose(firsts);
            firsts.splice(firsts.indexOf(first), 1);
            const fromEnds = ends(first).map(n => mapGraph.calculateDistancesFromStart(n));
            // Distancia no grafo de corredores: corredores que compartilham sala = 1.
            const between = e => 1 + Math.min(...ends(e).flatMap(n => fromEnds.map(d => d.get(n) ?? Infinity)));
            const path1 = mapGraph.findMinimumPathFromRoomToEdge(room, first);
            if (!path1) continue;
            const tag1 = {...this.defaultTag, holeNumber: 1};
            first.tags.push(tag1);
            try {
                const seconds = local.filter(e => {
                    if (e === first || between(e) > 4 || path1.includes(e) || e.tags.some(t => t.subTipo === 'LeverAgent')) return false;
                    const path2 = mapGraph.findMinimumPathFromRoomToEdge(room, e);
                    return !!path2 && !path2.includes(first);
                });
                // Testa apenas candidatos locais, na ordem sorteada; sem gravar tiles antes da escolha.
                while (seconds.length) {
                    const second = choose(seconds);
                    seconds.splice(seconds.indexOf(second), 1);
                    const tag2 = {...this.defaultTag, holeNumber: 2};
                    second.tags.push(tag2);
                    try {
                        if (!mapGraph.hasLeverDeadlock()) return [first, second];
                    } finally {
                        second.tags.splice(second.tags.indexOf(tag2), 1);
                    }
                }
            } finally {
                first.tags.splice(first.tags.indexOf(tag1), 1);
            }
        }
        return null;
    }

    gerarTag(mapGraph, room) {

        //inicialização da sala
        var lastTag = JSON.parse(JSON.stringify(room.tag))
        room.tag = JSON.parse(JSON.stringify(this.defaultTag))
        var collectibles = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável")
        var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]

        //inicialização do corredor que vai conter o buraco #1
        var validCorridors = mapGraph.adjacencyList
            .filter(corridor => { return mapGraph.findCollectibleRoomsInPathByCorridor(startRoom, corridor).length == collectibles.length })
            .filter(corridor => { return !corridor.tags.some(tag => tag.subTipo === 'LeverAgent') })
        let pair;
        try { pair = this._bmChooseLeverPair(mapGraph, room, validCorridors); }
        catch (error) { room.tag = lastTag; throw error; }
        if (!pair) { room.tag = lastTag; return false; }
        var selectedCorridor = pair[0];
        var newTag = JSON.parse(JSON.stringify(this.defaultTag)) 
        newTag.holeNumber = 1

        selectedCorridor.tags.push(newTag)
        var restricao = { tipo: "LeverAgent", id: this.agentLevel }
        selectedCorridor.restricoes.push(restricao)

        var x1 = selectedCorridor.cells[1].y
        var y1 = selectedCorridor.cells[1].x

        gerenciador.estagios[0].mapa.cells[y1][x1].tipo = 8

        var pos1 = { x: x1, y: y1 }

        //inicialização do corredor que vai conter o buraco #2
        var selectedCorridor2 = pair[1];

        var newTag = JSON.parse(JSON.stringify(this.defaultTag)) 
        newTag.holeNumber = 2

        selectedCorridor2.tags.push(newTag)

        var x2 = selectedCorridor2.cells[1].y
        var y2 = selectedCorridor2.cells[1].x

        var pos2 = { x: x2, y: y2 }

        var coordenadas = [pos1, pos2]

        //posicionamento da alavanca
        var leverX = room.cells[0].x + (room.roomWidth - 1) / 2
        var leverY = room.cells[0].y + (room.roomHeight - 1) / 2
        room.tag.collectible = gerenciador.criarAlavanca(leverX, leverY, this.leverEvent, coordenadas)
        //cena1.adicionar(gerenciador.criarAlavanca(leverX, leverY, this.leverEvent, coordenadas));

        this.agentLevel++
        this.defaultTag.id++
        if (lastTag.auxiliar) {
            room.tag.auxiliar = lastTag.auxiliar
        } 

        return true

    }

    verificarRestricoes(collectible, restricao) {
        var r = restricao.restricoes.find(r => {return r.tipo == collectible.subTipo && r.id == collectible.id})
        if(r != null) {
            var idx = restricao.restricoes.indexOf(r)
            restricao.restricoes.splice(idx, 1)
        }
    }
}