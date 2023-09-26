class SpikeAgent {

    celulasEmCruz(sala) {
        const celulasMeio = [];
        const celulaInit = sala.cells[0]
        const m = sala.roomWidth;
        const n = sala.roomHeight;
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

    criarSpikesEmCruz(room) {
        const celulas = this.celulasEmCruz(room)
        var timer = 180
        celulas.forEach(cell => cena1.adicionar(gerenciador.criarEspinho(cell.x, cell.y, 0, timer)))

        var spikePlay = this.spikeEvent(timer, room)
        cena1.estagio.eventos.push(spikePlay)
    }

    criarSpikesDinamicos(room) {
        const celulas = room.cells
        var timer = 180
        for(var i = 0; i < room.cells.length; i++) {
            var cell = room.cells[i]
            cena1.adicionar(gerenciador.criarEspinho(cell.x, cell.y, 0, timer))
        }
        

        var spikePlay = this.spikeEvent(timer, room)
        cena1.estagio.eventos.push(spikePlay)
    }

    spikeEvent(timer, room) {
        return function () {
            var counter = cena1.globalCounter;
            var position = { x: (room.cells[0].x + room.roomWidth) * 32, y: (room.cells[0].y + room.roomHeight) * 32 };
            if (counter % timer == 0) {
                var spikeSE = assetsMng.audios["spike"];
                var hypot = Math.hypot((room.roomWidth * 32) / 2, (room.roomHeight * 32) / 2);
                if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot) {
                    spikeSE.volume = 1;
                    spikeSE.play()
                } else if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot * 1.3) {
                    spikeSE.volume = 0.5;
                    spikeSE.play()
                } else if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot * 1.6) {
                    spikeSE.volume = 0.3;
                    spikeSE.play()
                } else if (Math.hypot(pc.x - position.x, pc.y - position.y) < hypot * 2) {
                    spikeSE.volume = 0.2;
                    spikeSE.play()
                }
            }
        }
    }


}