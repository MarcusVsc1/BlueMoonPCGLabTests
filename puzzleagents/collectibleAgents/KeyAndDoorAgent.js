class KeyAndDoorAgent {

    constructor(agentLevel = 0) {
        this.agentLevel = agentLevel
        this.defaultTag = { tipo: "colecionável", subTipo: "KeyAndDoorAgent", id: agentLevel }
    }


    gerarTag(mapGraph, room) {

        var lastTag = room.tag
        room.tag = this.defaultTag
        var collectible = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável")
        var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]
        var validCorridors = mapGraph.adjacencyList
            .filter(
                corridor => { return mapGraph.findCollectibleRoomsInPathByCorridor(startRoom, corridor).length == collectible.length })
            .filter(corridor => {return !corridor.tags.some(tag => tag.subTipo === 'KeyAndDoorAgent')})
        //.filter(corridor => {return mapGraph.isCorridorWithinDistance(startRoom, corridor, 3)})

        if (validCorridors.length == 0) {
            room.tag = lastTag
            console.log("Não foram encontrados corredores válidos para posicionar porta")
            return false
        }

        var selectedCorridor = validCorridors[Math.floor(Math.random() * validCorridors.length)];
        selectedCorridor.tags.push(this.defaultTag)

        //cria a porta no cenário e adiciona a chave à tag
        var doorX = selectedCorridor.cells[0].y
        var doorY = selectedCorridor.cells[0].x
        var keyX = room.cells[0].y + Math.floor(room.roomHeight / 2)
        var keyY = room.cells[0].x + Math.floor(room.roomWidth / 2)

        cena1.adicionar(gerenciador.criarChave(keyY, keyX, this.agentLevel));
        room.tag.collectible = gerenciador.criarChave(keyY, keyX, this.agentLevel)
        
        gerenciador.estagios[0].mapa.cells[doorY][doorX].tipo = 10
        cena1.adicionar(gerenciador.criarPorta(doorY, doorX, this.agentLevel));

        this.agentLevel++
        this.defaultTag.id++
        if(lastTag.auxiliar) {
            room.tag.auxiliar = lastTag.auxiliar
        }

        return true

    }

    selecionarSubAgente(auxAgents) {

        const jsonString = JSON.stringify([...auxAgents]);
        var auxAgentsClone = JSON.parse(jsonString);

        var agent = UtilityMethods.lottery(auxAgentsClone)

        for (const [key, { agent, chance }] of auxAgentsClone) {
            if (auxAgents.has(key)) {
                auxAgents.set(key, { agent, chance });
            }
        }
        return agent;
    }

}