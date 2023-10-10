class KeyAndDoorAgent {

    constructor(agentLevel = 0) {
        this.agentLevel = agentLevel
        this.defaultTag = { tipo: "colecionável", subTipo: "KeyAndDoorAgent", id: agentLevel }
    }


    gerarTag(mapGraph, room) {

        var lastTag = JSON.parse(JSON.stringify(room.tag))
        room.tag = JSON.parse(JSON.stringify(this.defaultTag))
        var collectibles = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável")
        var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]
        var validCorridors = mapGraph.adjacencyList
            .filter(corridor => { return mapGraph.findCollectibleRoomsInPathByCorridor(startRoom, corridor).length == collectibles.length })
            .filter(corridor => { return !corridor.tags.some(tag => tag.subTipo === 'KeyAndDoorAgent') })
            .filter(corridor => { return corridor.fromRoom != room.roomId && corridor.toRoom != room.roomId })
        //.filter(corridor => {return mapGraph.isCorridorWithinDistance(startRoom, corridor, 3)})

        if (validCorridors.length == 0) {
            room.tag = lastTag
            return false
        }

        var selectedCorridor = validCorridors[Math.floor(Math.random() * validCorridors.length)];
        selectedCorridor.tags.push(JSON.parse(JSON.stringify(this.defaultTag)))
        selectedCorridor.restricoes.push({ tipo: "KeyAndDoorAgent", id: this.agentLevel })

        //cria a porta no cenário e adiciona a chave à tag
        var doorX = selectedCorridor.cells[0].y
        var doorY = selectedCorridor.cells[0].x
        var keyX = room.cells[0].y + (room.roomHeight - 1) / 2
        var keyY = room.cells[0].x + (room.roomWidth - 1) / 2

        //cena1.adicionar(gerenciador.criarChave(keyY, keyX, this.agentLevel));
        room.tag.collectible = gerenciador.criarChave(keyY, keyX, this.agentLevel)

        gerenciador.estagios[0].mapa.cells[doorY][doorX].tipo = 10
        cena1.adicionar(gerenciador.criarPorta(doorY, doorX, this.agentLevel));

        this.agentLevel++
        this.defaultTag.id++
        if (lastTag.auxiliar) {
            room.tag.auxiliar = lastTag.auxiliar
        } else {

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

    verificarRestricoes(collectible, restricao) {
        var r = restricao.restricoes.find(r => {return r.tipo == collectible.subTipo && r.id == collectible.id})
        if(r != null) {
            var idx = restricao.restricoes.indexOf(r)
            restricao.restricoes.splice(idx, 1)
        }
    }

}