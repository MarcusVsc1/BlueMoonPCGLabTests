class SokobanState {
    constructor(board, snapped = false, finish = false) {
        this.playHistory = []
        this.board = board
        this.snapped = snapped
        this.finish = finish
    }

    // Compatibilidade: identificador do histórico, não uma chave de transposição.
    hash() {
        return JSON.stringify(this.playHistory)
    }

    /** Chave semântica para as regras de Game.js da revisão 3.
     * IDs são renumerados a partir das posições iniciais (ou atuais, antes
     * do freeze). Conserva a correspondência da mesma caixa entre matrizes.
     * O histórico permanece no objeto para reproduzir a solução, mas não
     * participa das regras de transição, rollout ou avaliação desta versão.
     */
    canonicalHash() {
        const ids = new Map()
        const boxId = id => {
            if (!ids.has(id)) ids.set(id, ids.size)
            return ids.get(id)
        }
        const encode = board => !Array.isArray(board) ? null : board.map(row => row.map(cell => {
            if (cell.tipo === 'caixa') {
                const direction = cell.lastDirection
                return ['c', boxId(cell.boxId), cell.moves ?? null, !!cell.visitado,
                    direction ? [direction.x, direction.y] : null]
            }
            return [cell.tipo, !!cell.visitado]
        }))
        const snapshot = encode(this.snapshot)
        const board = encode(this.board)
        const finalBoard = encode(this.finalBoard)
        return JSON.stringify([!!this.snapped, !!this.finish, snapshot, board, finalBoard,
            this.finish ? (this.score ?? null) : null])
    }
}
