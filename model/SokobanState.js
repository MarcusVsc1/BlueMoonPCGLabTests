class SokobanState {

  constructor(board, snapped = false, finish = false) {
    this.playHistory = []
    this.board = board
    this.snapped = snapped
    this.finish = finish
    this.boardHistory = []
  }

  hash() {
    return JSON.stringify(this.playHistory)
  }

}