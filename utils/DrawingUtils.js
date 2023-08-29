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
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        144 * this.imgX + (F % 3) * 48,
        192 * this.imgY + this.direcao * 48 + 1,
        48,
        48,
        -this.w - 4 - cena1.cameraX,
        -this.h / 2 - 15 - cena1.cameraY,
        30,
        30,
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
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        this.spriteSize * this.imgX,
        0,
        this.spriteSize,
        this.spriteSize,
        - this.w / 2 - cena1.cameraX,
        - this.h / 2 - cena1.cameraY,
        24,
        24,
    );

    ctx.restore();
}