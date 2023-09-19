class SokobanAgent {

    gerarPuzzle(mapGraph, puzzleGraph) {
        var rooms = mapGraph.nodes.filter(node => node.roomHeight * node.roomWidth < 49)
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
            var winner = state;
            var tentativas = 0
            // From initial state, take turns to play game until finished
            while (Game.countCells(winner.board, { x: 0, y: 0 }, { x: winner.board.length - 1, y: winner.board[0].length - 1 }, "caixa") <2) {
                winner =  mcts.runSearch(state, 1.5)     
                tentativas ++      
            }

        }

    }

}