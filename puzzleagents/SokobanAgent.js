class SokobanAgent {

    gerarPuzzle(mapGraph, puzzleGraph) {
        var rooms = mapGraph.nodes.filter(node => node.roomHeight * node.roomWidth < 48 && node.terminalCells.length == 1)
        if (rooms.length > 0) {
            var room = rooms[0]
            console.log("Id da sala " + room.roomId)

            this.roomTotalCells = room.roomHeight * room.roomWidth

            var startCell = {
                x: room.terminalCells[0].y - room.cells[0].y,
                y: room.terminalCells[0].x - room.cells[0].x,
            }

            let game = new Game()
            let mcts = new MonteCarlo(game)
            let state = game.start(startCell, room.roomHeight, room.roomWidth)
            var winner = null;
            // From initial state, take turns to play game until finished
            while (winner === null) {
                winner =  mcts.runSearch(state, 5)           
            }
            console.log(winner)
        }

    }

}