class SpikeAgent extends AuxAgent {
    constructor() {
        super()
        this.defaultTag = "SpikeAgent"
        
        this.enemyFactory = new EnemyFactory()
        this.levelMapper = new Map()
        this.levelMapper.set(1, function (room, level) {
            this.criarSpikesEmCruz(room, level)
        }.bind(this))
        this.levelMapper.set(2, function (room, level) {
            this.criarSpikesEmCruz(room, level)
        }.bind(this))
        this.levelMapper.set(3, function (room, level) {
            this.criarSpikesPreenchendoSala(room, level)
        }.bind(this))
        this.levelMapper.set(4, function (room, level) {
            this.criarSpikesPreenchendoSala(room, level)
        }.bind(this))
    }

    gerarAgenteAuxiliar(room, collectible, level) {
        this.levelMapper.get(level)(room, level)
        this.insertCollectible(room, collectible, level)
    }

    celulasEmCruz(room) {
        const celulasMeio = [];
        const celulaInit = room.cells[0]
        const m = room.roomWidth;
        const n = room.roomHeight;
        const linhaMeio = Math.floor(m / 2);
        const colunaMeio = Math.floor(n / 2);

        for (let coluna = 0; coluna < n; coluna++) {
            celulasMeio.push({ x: celulaInit.x + linhaMeio, y: celulaInit.y + coluna });
            if (m % 2 === 0) {
                celulasMeio.push({ x: celulaInit.x + linhaMeio - 1, y: celulaInit.y + coluna });
            }
        }

        for (let linha = 0; linha < m; linha++) {
            if (linha !== linhaMeio) {
                celulasMeio.push({ x: celulaInit.x + linha, y: celulaInit.y + colunaMeio });
                if (n % 2 === 0) {
                    celulasMeio.push({ x: celulaInit.x + linha, y: celulaInit.y + colunaMeio - 1 });
                }
            }
        }

        return celulasMeio;
    }

    criarSpikesEmCruz(room, level) {
        const celulas = this.celulasEmCruz(room)
        var timer = 90 - 12 * (level - 1)
        celulas.forEach(cell => cena1.adicionar(gerenciador.criarEspinho(cell.x, cell.y, 0, timer)))

        var spikePlay = this.spikeEvent(timer, room)
        gerenciador.estagios[0].eventos.push(spikePlay)
    }

    criarSpikesPreenchendoSala(room, level) {
        const celulas = room.cells
        var timer = 240 - 30 * (level - 3)
        for (var cell of room.cells) {
            cena1.adicionar(gerenciador.criarEspinho(cell.x, cell.y, 0, timer))
        }

        var spikePlay = this.spikeEvent(timer, room)
        gerenciador.estagios[0].eventos.push(spikePlay)
    }

    spikeEvent(timer, room) {
        return function () {
            var counter = cena1.globalCounter;
            var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
            //verifica a distância do jogador até a sala para poder ajustar o volume
            if (counter % timer == 0) {
                var spikeSE = assetsMng.audios["spike"];
                var hypot = Math.hypot((room.roomWidth * 32) / 2, (room.roomHeight * 32) / 2);
                if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot) {
                    spikeSE.volume = 0.8;
                    spikeSE.play()
                } else if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot * 1.3) {
                    spikeSE.volume = 0.4;
                    spikeSE.play()
                } else if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot * 1.6) {
                    spikeSE.volume = 0.25;
                    spikeSE.play()
                } else if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot * 2) {
                    spikeSE.volume = 0.17;
                    spikeSE.play()
                }
            }
        }
    }

    insertCollectible(room, collectible, level) {
        var position = { x: (room.cells[0].x + room.roomWidth / 2) * 32, y: (room.cells[0].y + room.roomHeight / 2) * 32 };
        collectible.x = position.x
        collectible.y = position.y
        cena1.adicionar(collectible)
        
        if(level > 1){this.enemyFactory.createEnemyWithDrop(level - 1, room)}
        

    }
}