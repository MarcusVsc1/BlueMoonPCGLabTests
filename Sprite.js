function Sprite(params = {}) {
    var exemplo = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        h: 10,
        w: 10,
        a: 0,
        va: 0,
        vm: 0,
        w: 32,
        h: 32,
        imgX: 0,
        imgY: 0,
        direcao: 0,
        frame: 0,
        props: {},
        spCD: 0,
        swCD: 0,
        globalCD: 0,
        color: "blue",
        imune: 0,
        atirando: 0,
        comportar: undefined,
        scene: undefined,
        imagem: null,
        vidas: 1,
        maxVidas: this.vidas,
        lifebar: 23,
        mana: 5,
        charStop: 0,
        atingido: 0,
        atravessa: 0,
        ortogonal: 0,
        getCd: 0,
        cameraX: 0,
        cameraY: 0,
        standardSpd: 135,
        lavaImmunity: false,
        desaceleracao: 1,
        opacity: 1
    }
    Object.assign(this, exemplo, params);
    // Dimensoes fisicas e visuais independentes. Valores originais por padrao.
    this.collisionBox = { w: this.w, h: this.h, ...(params.collisionBox || {}) };
    this.hurtBox = { w: this.w, h: this.h, ...(params.hurtBox || {}) };
    this.renderOffset = { x: -this.w - 3.1, y: -this.h - 12, ...(params.renderOffset || {}) };
}
Sprite.prototype = new Sprite();
Sprite.prototype.constructor = Sprite;

Sprite.prototype.desenhar = function (ctx) {
    this.cameraX = this.x - this.scene.cameraX
    this.cameraY = this.y - this.scene.cameraY
    ctx.save();
    // BM_CAMERA_PIXEL_V2: quantizar a ancora visual no mesmo referencial da camera.
    // Preserva x/y fisicos, cameraX/Y legados do sprite e offsets do desenho.
    if (this.props.tipo === "pc" && Number.isFinite(this.scene.w) && Number.isFinite(this.scene.h) && Number.isInteger(this.scene.cameraX) && Number.isInteger(this.scene.cameraY)) {
        const cx = this.scene.w / 2, cy = this.scene.h / 2;
        ctx.translate(cx + (Math.round(this.x - cx) - this.scene.cameraX),
                      cy + (Math.round(this.y - cy) - this.scene.cameraY));
    } else {
        ctx.translate(this.cameraX, this.cameraY);
    }
    if (this.imune > 0 && this.atingido <= 0) {
        ctx.globalAlpha = 0.5 * Math.cos(60 * this.imune);
    }
    if (this.lavaImmunity) { ctx.globalAlpha = 0.5 }
    var d = this.direcao;
    var img = this.imagem;
    var picX = this.imgX;
    var picY = this.imgY;

    // BLUEMOON_LAVA_TERRAIN_V1: expressao de dano sem parar a movimentacao nem alterar imune.
    if ((this.atingido > 0 && this.imune > 0) || (this.props.tipo === "pc" && this._bmLavaHit > 0)) {
        d = 0;
        img = "expressoes";
        picX = 0;
        picY = 1;
    }

    if (this.atravessa == 1) { ctx.globalAlpha = 0.5; }

    var F = Math.floor(this.frame);
    if (this.vx == 0 && this.vy == 0 && this.props.tipo == "pc") { F = 1; }
    if (this.charStop > 0) { F = 0; }
    // LYRA_HD_RECORTE: escala do arquivo, nao do mundo.
    const sheet = this.scene.assets.img(img);
    const ratio = sheet.naturalWidth / 576;
    const hd = img === "hero" && Number.isInteger(ratio) && ratio > 1 && sheet.naturalHeight === 384 * ratio;
    const sourceScale = hd ? ratio : 1;
    if (hd) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
    }
    ctx.drawImage(
        sheet,
        (144 * picX + (F % 3) * 48) * sourceScale,
        (192 * picY + d * 48 + (hd ? 0 : 1)) * sourceScale,
        48 * sourceScale,
        48 * sourceScale,
        this.renderOffset.x,
        this.renderOffset.y,
        30,
        30
    );
    if(this.props.tipo == "npc" && this.maxVidas > 1){
        ctx.fillStyle = "white";
        ctx.fillRect(-this.w,-this.h * 2.5,this.lifebar,5);
        ctx.fillStyle = "red";
        ctx.fillRect(-this.w,-this.h * 2.5,(this.lifebar*this.vidas)/this.maxVidas,5);
    }

    ctx.restore();
    ctx.globalAlpha = 1.0;

};

Sprite.prototype.mover = function (dt) {
    if (this.imune > 0 && this.atingido <= 0) {
        this.imune = this.imune - 1 * dt;
    }
    if (this.charStop <= 0 && this.atingido <= 0) {
        if (this.ortogonal == 0) { this.moverOrtogonal(dt); }
        else this.moverCircular(dt);
    } else {
        if (this.imune <= 0) { this.frame += 8 * dt; }
        if (this.atingido > 0) { this.atingido = this.atingido - 1 * dt; }
        this.vx = 0;
        this.vy = 0;
        this.x = this.x + this.vx * dt;
        this.y = this.y + this.vy * dt;
        this.mc = Math.floor(this.x / this.scene.map.SIZE);
        this.ml = Math.floor(this.y / this.scene.map.SIZE);
        if (this.charStop > 0) {
            this.charStop = this.charStop - 1 * dt;
        }
    }

}

Sprite.prototype.moverCircular = function (dt) {
    this.a = this.a + this.va * dt;

    this.vx = this.vm * Math.cos(this.a);
    this.vy = this.vm * Math.sin(this.a);

    if (CollisionSystem.projectile(this)) CollisionSystem.moveProjectile(this, dt);
    else CollisionSystem.move(this, dt);

    this.spCD = this.spCD - dt;
    this.swCD = this.swCD - dt;
    this.globalCD = this.globalCD - dt;
}

Sprite.prototype.moverOrtogonal = function (dt) {
    this.a = this.a + this.va * dt;
    this.frame += 8 * dt;


    this.mc = Math.floor((this.x) / this.scene.map.SIZE);
    this.ml = Math.floor((this.y) / this.scene.map.SIZE);

    this.aplicaRestricoes(dt);
    this.spCD = this.spCD - dt;
    this.swCD = this.swCD - dt;
    this.globalCD = this.globalCD - dt;
}
Sprite.prototype.aplicaRestricoes = function (dt) {
    CollisionSystem.move(this, dt);
};

Sprite.prototype.colidiuCom = function (alvo) {
    return CollisionSystem.intersects(this, alvo);
};
