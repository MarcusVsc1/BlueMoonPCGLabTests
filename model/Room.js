class Room {

    static id = 0
    constructor(cells, roomHeight, roomWidth, tag = {}) {
        this.roomId = Room.id++;
        this.roomHeight = roomHeight;
        this.roomWidth = roomWidth
        this.cells = cells;
        this.unavailableCells = [];
        this.terminalCells = []
        this.tag = tag
        this.restricoes = []
    }

    addTerminalCell(cell) {
        this.terminalCells.push(cell);
    }

    findEdgeCells() {
        var borderCells = [];

        for (var i = 0; i < this.roomWidth; i++) {
            for (var j = 0; j < this.roomHeight; j++) {
                if (i === 0 || i === this.roomWidth - 1 || j === 0 || j === this.roomHeight - 1) {
                    borderCells.push({x: i + this.cells[0].x, y: j + this.cells[0].y});
                }
            }
        }
        return borderCells
    }

}