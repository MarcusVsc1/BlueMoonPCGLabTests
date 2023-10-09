function Grid(modelo) {
    exemplo = {
        cells: [],
        LINES: 32,
        COLUMNS: 32,
        SIZE: 32,
        assets: undefined
    }
    Object.assign(this, exemplo, modelo);
    for (var c = 0; c < this.COLUMNS; c++) {
        this.cells[c] = [];
        for (var l = 0; l < this.LINES; l++) {
            if (c === 0 || l === 0 || c === 49 || l === 49) {
                exemplo.cells[c][l] = { tipo: 6 };
            } else {
                exemplo.cells[c][l] = { tipo: 0 };
            }
        }
    }
    if (modelo.m) {
        for (var c = 0; c < this.COLUMNS; c++) {
            for (var l = 0; l < this.LINES; l++) {
                this.cells[c][l] = { tipo: modelo.m[l][c] };
            }
        }
    }
}

Grid.prototype.desenhar = function (ctx, scene) {
    //x e y na imagem
    var y = 0;
    var x = 0;

    var positionX = 0;
    var positionY = 0;
    for (var c = 0; c < this.COLUMNS; c++) {
        for (var l = 0; l < this.LINES; l++) {
            var standardTileset = this.assets.img("cenario");
            //posicao de parede
            var positionX = 0;
            var positionY = 0;
            switch (this.cells[c][l].tipo) {
                case 0:
                    //chao
                    y = 1;
                    x = 1;
                    break;
                case 1:
                    //gelo
                    y = 3;
                    x = 0;
                    standardTileset = this.assets.img("dungeon");
                    break;
                case 2:
                    //piso frio
                    y = 2;
                    x = 0;
                    break;
                case 3:
                    //escada de pedra: direita
                    y = 0;
                    x = 6;
                    positionY = 2;
                    positionX = 4;
                    break;
                case 3.5:
                    //escada de pedra: esquerda
                    y = 0;
                    x = 6;
                    positionY = 2;
                    break;
                case 4:
                    //cascalho laranja e verde
                    y = 0;
                    x = 1;
                    break;
                case 5:
                    //lava
                    y = 0;
                    x = 0;
                    standardTileset = this.assets.img("lava");
                    break;
                case 5.1:
                    x = 2;
                    y = 3;
                    positionY = 2;
                    break;
                case 5.2:
                    x = 2;
                    y = 3;
                    positionY = 3;
                    break;
                case 5.3:
                    x = 2;
                    y = 3;
                    positionY = 4;
                    break;
                case 5.4:
                    x = 2;
                    y = 3;
                    positionY = 2;
                    positionX = 1;
                    break;
                case 5.5:
                    x = 2;
                    y = 3;
                    positionY = 3;
                    positionX = 1;
                    break;
                case 5.6:
                    x = 2;
                    y = 3;
                    positionY = 4;
                    positionX = 1;
                    break;
                case 5.7:
                    x = 2;
                    y = 3;
                    positionY = 2;
                    positionX = 2;
                    break;
                case 5.8:
                    x = 2;
                    y = 3;
                    positionY = 3;
                    positionX = 2;
                    break;
                case 5.9:
                    x = 2;
                    y = 3;
                    positionY = 4;
                    positionX = 2;
                    break;
                case 6:
                    //parede
                    y = 2;
                    x = 5;
                    break;
                case 7:
                    //chão bloqueado
                    y = 1;
                    x = 1;

                    break;
                case 8:
                    //buraco sombreado
                    y = 3;
                    x = 4;
                    positionX = 0;
                    positionY = 2;
                    break;
                case 9:
                    //fundo preto de buraco
                    y = 3;
                    x = 4;
                    positionX = 1;
                    positionY = 3;
                    break;
                case 10:
                    //barreira
                    y = 0;
                    x = 1;
                    break;
                case 11:
                    // parede diferente
                    y = 3;
                    x = 5;
                    break;
                case 12:
                    //parede de blocos
                    y = 0;
                    x = 4;
                    positionX = 1;
                    positionY = 2;
                    break;
                default:
                    cor = "black";
            }
            ctx.drawImage(
                standardTileset,
                x * 24 * 4 + 24 * positionX,
                y * 36 * 4 + 24 * positionY,
                48,
                48,
                c * this.SIZE - scene.cameraX,
                l * this.SIZE - scene.cameraY,
                this.SIZE,
                this.SIZE
            );
            /*
            ctx.fillStyle = cor;
            ctx.fillRect(c * this.SIZE, l * this.SIZE, this.SIZE, this.SIZE);
            ctx.strokeStyle = "black";
            ctx.strokeRect(c * this.SIZE, l * this.SIZE, this.SIZE, this.SIZE);
            */
        }
    }
}