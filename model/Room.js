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
    }

    addTerminalCell(cell) {
        this.terminalCells.push(cell);
    }

    findEdgeCells() {
        const edgeCells = [];

        for (let i = 0; i < this.roomWidth; i++) {
            for (let j = 0; j < this.roomHeight; j++) {
                const index = i * this.roomHeight + j;
    
                if (i === 0 || i === this.roomWidth - 1 || j === 0 || j === this.roomWidth - 1) {
                    edgeCells.push(this.cells[index]);
                }
            }
        }

        return edgeCells;
    }

}