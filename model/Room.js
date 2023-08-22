class Room {

    static id = 0
    constructor(cells) {
        this.roomId = Room.id++;
        this.cells = cells;
        this.unavailableCells = [];
        this.terminalCells = []
    }

    addTerminalCell(cell) {
        this.terminalCells.push(cell);
    }

    findEdgeCells() {
        const edgeCells = [];

        for (const cell of this.cells) {
            const { x, y } = cell;
            const isEdgeCell = x === this.getLeftX() || x === this.getRightX() || y === this.getTopY() || y === this.getBottomY();

            if (isEdgeCell) {
                edgeCells.push(cell);
            }
        }

        return edgeCells;
    }

    getLeftX() {
        return Math.min(...this.cells.map(cell => cell.x));
    }

    getRightX() {
        return Math.max(...this.cells.map(cell => cell.x));
    }

    getTopY() {
        return Math.min(...this.cells.map(cell => cell.y));
    }

    getBottomY() {
        return Math.max(...this.cells.map(cell => cell.y));
    }

}