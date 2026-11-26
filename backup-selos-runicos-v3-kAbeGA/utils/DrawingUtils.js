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
    ctx.globalAlpha = this.opacity <= 1 && this.opacity >= 0 ? this.opacity : 0
    if (this.toggled) { ctx.globalAlpha = 0.5 }
    ctx.drawImage(
        this.scene.assets.img(this.imagem),
        144 * this.imgX + (F % 3) * 48,
        192 * this.imgY + this.direcao * 48 + 1,
        48,
        48,
        -16 - this.scene.cameraX,
        -16 - this.scene.cameraY,
        32,
        32,
    );

    ctx.restore();
}

//direcao => 0: baixo 1: esquerda, 2: direita, 3: cima
function desenhaEspada() {
    if (this._collisionExpired || !CollisionSystem.swordPose(this)) return;
    ctx.save();
    ctx.translate(this.x - this.scene.cameraX, this.y - this.scene.cameraY);
    const offset = this.renderOffsetSword || { x: 0, y: 0 };
    ctx.drawImage(this.scene.assets.img(this.imagem),
        144 * this.imgX, 192 * this.imgY + this.direcao * 48 - 1, 48, 48,
        -12.5 + offset.x, -12.5 + offset.y, 25, 25);
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

// BM_DARKROOM_SOFT_V1: mascara separada do canvas do jogo.
const BMDarkRoom = (() => {
    let layer, mask;
    const black = 'rgba(0,0,0,1)', clear = 'rgba(0,0,0,0)';
    function draw(room, scene) {
        if (!room?.cells?.length || !scene?.ctx || !scene.pc) return;
        const ctx = scene.ctx, z = scene.map?.SIZE || 32;
        const x0 = room.cells[0].x * z, y0 = room.cells[0].y * z;
        const w = room.roomWidth * z, h = room.roomHeight * z;
        if (![x0,y0,w,h].every(Number.isFinite) || w <= 0 || h <= 0) return;
        const feather = z / 2, radius = z * 1.5, inner = z;
        const x = x0 - scene.cameraX, y = y0 - scene.cameraY;
        const left = Math.max(0, Math.floor(x - feather)), top = Math.max(0, Math.floor(y - feather));
        const right = Math.min(ctx.canvas.width, Math.ceil(x + w + feather));
        const bottom = Math.min(ctx.canvas.height, Math.ceil(y + h + feather));
        if (right <= left || bottom <= top) return;
        if (!layer) { layer = document.createElement('canvas'); mask = layer.getContext('2d'); }
        const bw = right-left, bh = bottom-top;
        // Uma unica superficie reutilizada; tamanho limitado a viewport.
        if (layer.width < bw || layer.height < bh) {
            layer.width = Math.max(bw,layer.width); layer.height = Math.max(bh,layer.height);
        }
        mask.setTransform(1,0,0,1,0,0);
        mask.globalAlpha = 1;
        mask.globalCompositeOperation = 'source-over';
        mask.clearRect(0,0,bw,bh);
        const a = x-left, b = y-top, c = a+w, d = b+h;
        mask.fillStyle = black;
        mask.fillRect(a,b,w,h);
        function strip(x1,y1,x2,y2,rx,ry,rw,rh) {
            const g = mask.createLinearGradient(x1,y1,x2,y2);
            g.addColorStop(0,black); g.addColorStop(0.5,'rgba(0,0,0,0.5)'); g.addColorStop(1,clear);
            mask.fillStyle = g; mask.fillRect(rx,ry,rw,rh);
        }
        strip(a,b,a-feather,b,a-feather,b,feather,h);
        strip(c,b,c+feather,b,c,b,feather,h);
        strip(a,b,a,b-feather,a,b-feather,w,feather);
        strip(a,d,a,d+feather,a,d,w,feather);
        for (const [cx,cy,rx,ry] of [[a,b,a-feather,b-feather],[c,b,c,b-feather],[a,d,a-feather,d],[c,d,c,d]]) {
            const g = mask.createRadialGradient(cx,cy,0,cx,cy,feather);
            g.addColorStop(0,black); g.addColorStop(0.5,'rgba(0,0,0,0.5)'); g.addColorStop(1,clear);
            mask.fillStyle = g; mask.fillRect(rx,ry,feather,feather);
        }
        const pc = scene.pc;
        // Mesmo criterio de entrada e deslocamento do centro da versao original.
        if (pc.x >= x0 && pc.x <= x0+w && pc.y >= y0 && pc.y <= y0+h) {
            const cx = pc.x-scene.cameraX-left-2, cy = pc.y-scene.cameraY-top-4;
            const light = mask.createRadialGradient(cx,cy,inner,cx,cy,radius);
            light.addColorStop(0,black); light.addColorStop(1,clear);
            mask.globalCompositeOperation = 'destination-out';
            mask.fillStyle = light;
            mask.fillRect(cx-radius,cy-radius,radius*2,radius*2);
            mask.globalCompositeOperation = 'source-over';
        }
        ctx.save();
        try {
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(layer,0,0,bw,bh,left,top,bw,bh);
        } finally { ctx.restore(); }
    }
    return Object.freeze({draw});
})();
function preencherComPreto(room) {
    BMDarkRoom.draw(room, cena1);
}

// BM_RUNE_SEALS_V1: apenas renderização; os identificadores e as coordenadas lógicas são mantidos.
function bmDrawRuneTile(sprite, ctx, key, offset) {
    const scene = sprite.scene;
    const img = scene.assets.img(key);
    ctx.save();
    try {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, Math.round(sprite.x - scene.cameraX - offset), Math.round(sprite.y - scene.cameraY - offset), 32, 32);
    } finally { ctx.restore(); }
}
function desenharQuadradoComX(ctx) {
    bmDrawRuneTile(this, ctx, 'runeSeal', 0);
}
// BM_RUNE_SLIDE_V2: posicao visual nao modifica o sprite nem o mapa.
function desenharCaixa(ctx) {
    const pos=CollisionSystem.runeSlidePosition(this);
    const scene=this.scene;
    const key=!this._bmRuneSlide && this.props.placed ? 'runeBlockOn' : 'runeBlockOff';
    ctx.save();
    try {
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(scene.assets.img(key),Math.round(pos.x-scene.cameraX-16),Math.round(pos.y-scene.cameraY-16),32,32);
    } finally {ctx.restore();}
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