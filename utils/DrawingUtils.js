function desenhaDisp() {
    ctx.save();
    ctx.translate(this.x, this.y);
    var F = Math.floor(this.frame);
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        144 * this.imgX + (F % 3) * 48,
        192 * this.imgY + this.direcao * 48 + 1,
        48,
        48,
        -this.w + 5,
        -this.h,
        30,
        30,
    );

    ctx.restore();
}

function desenhaTiro() {
    ctx.save();
    ctx.translate(this.x, this.y);
    var F = Math.floor(this.frame);
    if(this.toggled) {ctx.globalAlpha = 0.5}
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        144 * this.imgX + (F % 3) * 48,
        192 * this.imgY + this.direcao * 48 + 1,
        48,
        48,
        -this.w - 4 - cena1.cameraX,
        -this.h / 2 - 15 - cena1.cameraY,
        32,
        32,
    );

    ctx.restore();
}

//direcao => 0: baixo 1: esquerda, 2: direita, 3: cima
function desenhaEspada() {
    ctx.save();
    /*ctx.fillStyle = "midnightblue";
    ctx.fillRect(this.x,this.y,this.w,this.h);
    ctx.strokeStyle = "black";
    ctx.strokeRect(this.x,this.y,this.w,this.h);*/
    var posX = this.x;
    var posY = this.y;
    switch (this.direcao) {
        case 0:
            posX = posX + 8;
            posY = posY - 9;
            break;
        case 1:
            posX = posX + 7.7;
            break;
        case 3:
            posY = posY + 5;
            posX = posX + 2;
            break;
    }
    ctx.translate(posX, posY);
    var F = Math.floor(this.frame);
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        144 * this.imgX,
        192 * this.imgY + this.direcao * 48 - 1,
        48,
        48,
        -this.w - cena1.cameraX,
        -this.h / 2 - cena1.cameraY,
        25,
        25,
    );

    ctx.restore();
}

//desenha o chefe 1. necessário pelo tamanho e pelo esquema da imagem do chefe, que são diferentes dos outros sprites
function desenharChefe(ctx) {

    ctx.save();
    ctx.fillStyle = "midnightblue";

    ctx.translate(this.x, this.y);
    if (this.imune > 0 && this.atingido <= 0) {
        ctx.globalAlpha = 0.5 * Math.cos(60 * this.imune);
    }

    var F = Math.floor(this.frame);
    if (this.charStop > 0) { F = 0; }
    if (this.vx == 0 && this.vy == 0) { F = 0; }
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        (F % 3) * 96,
        96 * this.imgY,
        96,
        96,
        -this.w - 2,
        -this.h - 12,
        48,
        48,
    );

    ctx.restore();
    ctx.globalAlpha = 1.0;

};

function desenharChave() {
    ctx.save();
    ctx.translate(this.x, this.y);
    var F = Math.floor(this.frame) * 2;
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        (F % 24) * this.spriteSize,
        0,
        this.spriteSize,
        this.spriteSize,
        - this.w / 2 - cena1.cameraX,
        - this.h / 2 - cena1.cameraY,
        32,
        32,
    );

    ctx.restore();
}

function desenharPorta() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        96 * this.imgX,
        0,
        32,
        32,
        - this.w / 2 - cena1.cameraX,
        - this.h / 2 - cena1.cameraY,
        32,
        32,
    );

    ctx.restore();
}

function desenharColecionavel() {
    const floatAmplitude = 3.8; // Amplitude do movimento de flutuação
    const floatSpeed = 0.005; // Velocidade de flutuação

    // Calcula a posição y com base na flutuação
    const offsetY = floatAmplitude * Math.sin(floatSpeed * Date.now());

    ctx.save();
    ctx.translate(this.x, this.y + offsetY); // Adiciona offsetY ao y
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        this.spriteSize * this.imgX,
        0,
        this.spriteSize,
        this.spriteSize,
        -this.w / 2 - cena1.cameraX,
        -this.h / 2 - cena1.cameraY,
        24,
        24
    );

    ctx.restore();
}

function desenharAlavanca() {
    ctx.save();
    ctx.translate(this.x, this.y); // Adiciona offsetY ao y
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        this.spriteSize * this.imgX,
        this.spriteSize * 2 * this.toggled + this.spriteSize * 4 * this.imgY,
        this.spriteSize,
        this.spriteSize,
        -this.w / 2 - cena1.cameraX,
        -this.h / 2 - cena1.cameraY,
        24,
        24
    );

    ctx.restore();
}

function desenharCelulas(cells, fillStyle) {
    ctx.fillStyle = fillStyle;
    cells.forEach(element => {
        ctx.fillRect(element.x * 32 - cena1.cameraX, element.y * 32 - cena1.cameraY, 32, 32);
    });
}

function preencherComPreto(rooms) {
    ctx.save();
    for (var room of rooms) {
        const salaX = room.cells[0].x * 32
        const salaY = room.cells[0].y * 32
        const larguraSala = room.roomWidth * 32
        const alturaSala = room.roomHeight * 32      

        const pcX = pc.x/* posição X do personagem */;
        const pcY = pc.y/* posição Y do personagem */;

        // Raio do buraco circular
        const raioDoBuraco = 48;

        // Posição do buraco em relação ao canto superior esquerdo da sala (considerando a translação)
        const buracoX = pcX - salaX - raioDoBuraco - cena1.cameraX;
        const buracoY = pcY - salaY - raioDoBuraco - cena1.cameraY;

        ctx.translate(salaX, salaY)

        ctx.save();
        ctx.beginPath();
        ctx.rect(- cena1.cameraX, - cena1.cameraY, larguraSala, alturaSala)
        if(pc.x >= salaX && pc.x <= salaX + larguraSala && pc.y >= salaY && pc.y <= salaY + alturaSala){
            ctx.arc(buracoX + raioDoBuraco - 2, buracoY + raioDoBuraco - 4, raioDoBuraco, 0, Math.PI * 2);
        }
        ctx.clip('evenodd');
        ctx.closePath();

        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
        
        ctx.restore();

    }

    ctx.restore();

}

function desenharQuadradoComX(ctx) {
    var tamanho = 32
    // Salve o estado atual do contexto
    ctx.save();

    // Translade o contexto para as coordenadas x e y
    ctx.translate(this.x - cena1.cameraX, this.y - cena1.cameraY);

    // Deixa a linha mais grossa
    ctx.lineWidth = 2;

    // Defina a cor do traço (contorno) para vermelho
    ctx.strokeStyle = "red";

    // Desenhe o quadrado sem preenchimento
    ctx.strokeRect(0, 0, tamanho, tamanho);

    // Desenhe o "X" no meio do quadrado
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(tamanho, tamanho);
    ctx.moveTo(0, tamanho);
    ctx.lineTo(tamanho, 0);
    ctx.stroke();
    ctx.closePath();

    // Restaure o estado do contexto para não afetar outros desenhos
    ctx.restore();
}

function desenharCaixa(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(
        this.scene.assets.img(this.imagem+this.props.placed),
        0,
        0,
        255,
        256,
        -this.w / 2 - cena1.cameraX,
        -this.h / 2 - cena1.cameraY,
        32,
        32
    );

    ctx.restore();
}

function desenharEspinho() {
    ctx.save();
    ctx.translate(this.x, this.y); 
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        this.spriteSize * this.imgX,
        this.spriteSize * 3 * this.toggled + this.spriteSize * 4 * this.imgY,
        this.spriteSize,
        this.spriteSize,
        -this.w / 2 - cena1.cameraX,
        -this.h / 2 - cena1.cameraY,
        24,
        24
    );

    ctx.restore();
}