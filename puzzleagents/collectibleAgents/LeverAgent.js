class LeverAgent {

    constructor(agentLevel = 0) {
        this.agentLevel = 0
        this.defaultTag = { tipo: "alavanca", subTipo: "LeverAgent", id: agentLevel }
    }

    leverEvent() {
        this.toggled = !this.toggled;
        cena1.map.cells[this.coordenadas[!this.toggled ? 1 : 0].y][this.coordenadas[!this.toggled ? 1 : 0].x].tipo = 4
        cena1.map.cells[this.coordenadas[this.toggled ? 1 : 0].y][this.coordenadas[this.toggled ? 1 : 0].x].tipo = 8
        cena1.assets.play("switchOn");
    }

    gerarTag(mapGraph, room) {

        //inicialização da sala
        var lastTag = room.tag
        room.tag = this.defaultTag
        var collectibles = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável" || node.tag.tipo === "alavanca")
        var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]

        //inicialização do corredor que vai conter o buraco #1
        var validCorridors = mapGraph.adjacencyList
            .filter(corridor => { return mapGraph.findCollectibleRoomsInPathByCorridor(startRoom, corridor).length == collectibles.length })
            .filter(corridor => { return !corridor.tags.some(tag => tag.subTipo === 'LeverAgent') })
        //.filter(corridor => {return mapGraph.isCorridorWithinDistance(startRoom, corridor, 3)})
        if (validCorridors.length == 0) {
            room.tag = lastTag
            console.log("Não foram encontrados corredores válidos para posicionar buraco #1")
            return false
        }

        var selectedCorridor = validCorridors[Math.floor(Math.random() * validCorridors.length)];
        var newTag = this.defaultTag
        newTag.holeNumber = 1

        selectedCorridor.tags.push(newTag)

        var x1 = selectedCorridor.cells[1].y
        var y1 = selectedCorridor.cells[1].x

        gerenciador.estagios[0].mapa.cells[y1][x1].tipo = 8

        var pos1 = { x: x1, y: y1 }
        
        //inicialização do corredor que vai conter o buraco #2
        const pathToSelectedCorridor = mapGraph.findMinimumPathFromRoomToEdge(room, selectedCorridor);

        validCorridors = mapGraph.adjacencyList.filter(corridor => {
            const isNotInPathToSelected = !pathToSelectedCorridor.includes(corridor);
            const pathToCorridorY = mapGraph.findMinimumPathFromRoomToEdge(room, corridor);
            const notContainsSelectedInPathToY = !pathToCorridorY.includes(selectedCorridor);
            const doesNotHaveLeverAgentTag = !corridor.tags.some(tag => tag.subTipo === 'LeverAgent');
            return isNotInPathToSelected && notContainsSelectedInPathToY && doesNotHaveLeverAgentTag;
        });

        if (validCorridors.length == 0) {
            var idx = selectedCorridor.tags.indexOf(newTag)
            selectedCorridor.tags.splice(idx)
            room.tag = lastTag
            console.log("Não foram encontrados corredores válidos para posicionar buraco #2")
            return false
        }

        var selectedCorridor2 = validCorridors[Math.floor(Math.random() * validCorridors.length)];

        var newTag = this.defaultTag
        newTag.holeNumber = 2

        selectedCorridor2.tags.push(newTag)

        var x2 = selectedCorridor2.cells[1].y
        var y2 = selectedCorridor2.cells[1].x

        var pos2 = { x: x2, y: y2 }
        
        var coordenadas = [pos1, pos2]

        //posicionamento da alavanca
        var leverX = room.cells[0].x + Math.floor(room.roomWidth / 2)
        var leverY = room.cells[0].y + Math.floor(room.roomHeight / 2)
        room.tag.collectible = gerenciador.criarAlavanca(leverX, leverY, this.leverEvent, coordenadas)
        cena1.adicionar(gerenciador.criarAlavanca(leverX, leverY, this.leverEvent, coordenadas));

        this.agentLevel++
        this.defaultTag.id++
        if (lastTag.auxiliar) {
            room.tag.auxiliar = lastTag.auxiliar
        } else {

        }

        return true

    }
}