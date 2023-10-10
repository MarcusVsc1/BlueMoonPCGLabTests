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

    gerarTag(mapGraph, room, auxAgents) {

        //inicialização da sala
        var lastTag = JSON.parse(JSON.stringify(room.tag))
        room.tag = JSON.parse(JSON.stringify(this.defaultTag))
        var collectibles = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável")
        var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]

        //inicialização do corredor que vai conter o buraco #1
        var validCorridors = mapGraph.adjacencyList
            .filter(corridor => { return mapGraph.findCollectibleRoomsInPathByCorridor(startRoom, corridor).length == collectibles.length })
            .filter(corridor => { return !corridor.tags.some(tag => tag.subTipo === 'LeverAgent') })
        //.filter(corridor => {return mapGraph.isCorridorWithinDistance(startRoom, corridor, 3)})
        if (validCorridors.length == 0) {
            room.tag = lastTag
            return false
        }

        var selectedCorridor = validCorridors[Math.floor(Math.random() * validCorridors.length)];
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
        const pathToSelectedCorridor = mapGraph.findMinimumPathFromRoomToEdge(room, selectedCorridor);

        validCorridors = mapGraph.adjacencyList
            .filter(corridor => {
                const isNotInPathToSelected = !pathToSelectedCorridor.includes(corridor);
                const pathToCorridorY = mapGraph.findMinimumPathFromRoomToEdge(room, corridor);
                const notContainsSelectedInPathToY = !pathToCorridorY.includes(selectedCorridor);
                const doesNotHaveLeverAgentTag = !corridor.tags.some(tag => tag.subTipo === 'LeverAgent');
                return isNotInPathToSelected && notContainsSelectedInPathToY && doesNotHaveLeverAgentTag;
            })/*
            .filter(corridor => {
                var newTag = JSON.parse(JSON.stringify(this.defaultTag)) 
                newTag.holeNumber = 2
                corridor.tags.push(newTag)

                var alavancas = mapGraph.nodes
                    .filter(node => node.tag.subTipo === "LeverAgent")
                    .map(node => { return node.tag })

                var cycle = mapGraph.verificaRestricoesCirculares(alavancas)

                var idx = corridor.tags.indexOf(newTag)
                corridor.tags.splice(idx, 1)

                return !cycle
            });*/

        if (validCorridors.length == 0) {
            gerenciador.estagios[0].mapa.cells[y1][x1].tipo = 4
            var idx = selectedCorridor.tags.indexOf(newTag)
            selectedCorridor.tags.splice(idx, 1)
            room.tag = lastTag
            var idRestricao = selectedCorridor.restricoes.indexOf(restricao)
            selectedCorridor.restricoes.splice(idRestricao, 1)
            return false
        }

        var selectedCorridor2 = validCorridors[Math.floor(Math.random() * validCorridors.length)];

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
        } else {
            //selecionarSubAgente(room, auxAgents)
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