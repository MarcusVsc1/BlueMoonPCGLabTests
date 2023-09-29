class KeyAndDoorAgent {

    constructor(agentLevel = 0) {
        this.agentLevel = agentLevel
        this.defaultTag = { "tipo": "colecionável", "subTipo": "chavePorta" }
    }

    gerarPuzzle(mapGraph, room) {
        if (this.agentLevel > 5) {
            return false
        }

        room.tag = this.defaultTag

        var collectible = mapGraph.nodes.filter(node => node.tag.tipo === "colecionável")
        var startRoom = mapGraph.nodes.filter(node => node.tag.tipo === "inicio")[0]
        var validCorridors = mapGraph.adjacencyList
            .filter(
                corridor => { return mapGraph.findCollectibleRoomsInPath(startRoom, corridor).length == collectible.length })
            .filter(corridor => corridor.tag.subTipo != "chavePorta")
            //.filter(corridor => {return mapGraph.isCorridorWithinDistance(startRoom, corridor, 3)})
        if (validCorridors.length == 0) {
            console.log("Não foram encontradas salas válidas")
            room.tag = {}
            return false
        }

        

        var selectedCorridor = validCorridors[Math.floor(Math.random() * validCorridors.length)];
        selectedCorridor.tag = this.defaultTag
        
        //para teste
        var doorX = selectedCorridor.cells[0].y
        var doorY = selectedCorridor.cells[0].x

        var keyX = room.cells[0].y + Math.floor(room.roomHeight / 2)
        var keyY = room.cells[0].x + Math.floor(room.roomWidth / 2)

        cena1.adicionar(gerenciador.criarChave(keyY, keyX, this.agentLevel));
        cena1.adicionar(gerenciador.criarPorta(doorY, doorX, this.agentLevel));

        gerenciador.estagios[0].mapa.cells[doorY][doorX].tipo = 10

        this.agentLevel++
        
    }

}