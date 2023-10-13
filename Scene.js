function Scene(params) {
    var exemplo = {
        pc: null,
        boss: null,
        spritesE: [],
        spritesSpike: [],
        spritesT: [],
        spritesTE: [],
        spritesPoder: [],
        spritesTP: [],
        spritesXP: [],
        spritesO: [],
        toRemove: [],
        ctx: null,
        w: 1600,
        h: 1600,
        assets: null,
        map: null,
        stageIndex: 0,
        estagio: null,
        gamer: null,
        spriteCounter: 0,
        frameCounter: 0,
        globalCounter: 0,
        mensagemOpacity: 1,
        caution: false,
        dialogo: "",
        theEnd: 0,
        cameraX: 0,
        cameraY: 0,
        extras: [],
        paintCorridor: [],
        darkRooms: [],
        inventoryItem: null,
        sokobans: []
    }
    Object.assign(this, exemplo, params);
}

Scene.prototype = new Scene();
Scene.prototype.constructor = Scene;

//adiciona os sprites ao scene
Scene.prototype.adicionar = function (sprite) {
    if (sprite.props.tipo == "pc") {
        this.pc = sprite;
    }

    if (sprite.props.tipo == "tiro") {
        this.spritesT.push(sprite);
    }

    if (sprite.props.tipo == "espinho") {
        this.spritesSpike.push(sprite);
    }

    if (sprite.props.tipo == "npc") {
        if (sprite.props.boss == 1) {
            this.boss = sprite;
        }
        this.spritesE.push(sprite);
    }
    if (sprite.props.tipo == "objeto") {
        this.spritesO.push(sprite);
    }
    if (sprite.props.tipo == "poder") {
        this.spritesPoder.push(sprite);
    }

    if (sprite.props.tipo == "boom") {
        this.spritesXP.push(sprite);
    }

    if (sprite.props.tipo == "tiroE" || sprite.props.tipo == "tiroQ") {
        this.spritesTE.push(sprite);
    }

    if (sprite.props.tipo == "teleporte") {
        this.spritesTP.push(sprite);
    }

    sprite.scene = this;
};

//desenha os sprites. os ifs são para colcoar o sprites em cima ou não do pc
Scene.prototype.desenhar = function () {
    this.updateCameraPosition();

    for (var i = 0; i < this.spritesSpike.length; i++) {
        this.spritesSpike[i].desenhar(this.ctx);
    }
    for (var i = 0; i < this.spritesO.length; i++) {
        if (this.spritesO[i].y < this.pc.y || this.spritesO[i].switchId)
            this.spritesO[i].desenhar(this.ctx);
    }
    for (var sokoban of this.sokobans) {
        for (var i = 0; i < sokoban.goals.length; i++) {
            sokoban.goals[i].desenhar(this.ctx);
        }
        for (var i = 0; i < sokoban.boxes.length; i++) {
            sokoban.boxes[i].desenhar(this.ctx);
        }
    }
    for (var i = 0; i < this.spritesE.length; i++) {
        if (this.spritesE[i].y <= this.pc.y) this.spritesE[i].desenhar(this.ctx);
    }
    if (this.pc.direcao == 0) {
        if (this.pc.desenhar) { this.pc.desenhar(this.ctx); }
    }

    for (var i = 0; i < this.spritesXP.length; i++) {
        this.spritesXP[i].desenhar(this.ctx);
    }
    for (var i = 0; i < this.spritesT.length; i++) {
        this.spritesT[i].desenhar(this.ctx);
    }
    for (var i = 0; i < this.spritesPoder.length; i++) {
        this.spritesPoder[i].desenhar(this.ctx);
    }
    for (var i = 0; i < this.spritesTE.length; i++) {
        this.spritesTE[i].desenhar(this.ctx);
    }

    for (var i = 0; i < this.spritesTP.length; i++) {
        this.spritesTP[i].desenhar(this.ctx);
    }

    if (this.pc.direcao != 0) {
        if (this.pc.desenhar) { this.pc.desenhar(this.ctx); }
    }
    this.pc.desenhar(this.ctx)

    for (var i = 0; i < this.spritesO.length; i++) {
        if (this.spritesO[i].y > this.pc.y && this.spritesO[i].switchId == null) this.spritesO[i].desenhar(this.ctx);
    }


    for (var i = 0; i < this.spritesE.length; i++) {
        if (this.spritesE[i].y > this.pc.y) this.spritesE[i].desenhar(this.ctx);
    }
    desenharCelulas(this.extras, 'rgba(0, 0, 255, 0.2)')
    desenharCelulas(this.paintCorridor, 'rgba(125, 0, 125, 0.2)')
    for(const room of this.darkRooms){
        preencherComPreto(room)
    }
   // ctx.restore();
   this.updateCameraPosition();
};



//move os sprites
Scene.prototype.mover = function (dt) {
    for (var i = 0; i < this.spritesSpike.length; i++) {
        this.spritesSpike[i].mover(dt);
    }
    for (var i = 0; i < this.spritesE.length; i++) {
        this.spritesE[i].mover(dt);
    }
    for (var i = 0; i < this.spritesT.length; i++) {
        this.spritesT[i].mover(dt);
    }
    for (var i = 0; i < this.spritesPoder.length; i++) {
        this.spritesPoder[i].mover(dt);
    }
    for (var i = 0; i < this.spritesTP.length; i++) {
        this.spritesTP[i].mover(dt);
    }
    for (var i = 0; i < this.spritesTE.length; i++) {
        this.spritesTE[i].mover(dt);
    }
    for (var i = 0; i < this.spritesO.length; i++) {
        this.spritesO[i].mover(dt);
    }
    for (var i = 0; i < this.spritesXP.length; i++) {
        this.spritesXP[i].mover(dt);
    }
    if (this.pc != null) {
        this.pc.mover(dt);
    }

    if (this.bruxa != null) {
        this.bruxa.mover(dt);
    }

};

//adiciona o comportamento dos sprites
Scene.prototype.comportar = function () {
    for (var i = 0; i < this.spritesSpike.length; i++) {
        if (this.spritesSpike[i].comportar) {
            this.spritesSpike[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesTP.length; i++) {
        if (this.spritesTP[i].comportar) {
            this.spritesTP[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesE.length; i++) {
        if (this.spritesE[i].comportar && (Math.hypot(this.spritesE[i].x - this.pc.x, this.spritesE[i].y - this.pc.y) < 256 || this.spritesE[i].provocou)) {
            this.spritesE[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesT.length; i++) {
        if (this.spritesT[i].comportar) {
            this.spritesT[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesTE.length; i++) {
        if (this.spritesTE[i].comportar) {
            this.spritesTE[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesO.length; i++) {
        if (this.spritesO[i].comportar) {
            this.spritesO[i].comportar();
        }
    }

    if (this.pc != null && this.pc.comportar) {
        this.pc.comportar();
    }

    if (this.bruxa != null && this.bruxa.comportar) {
        this.bruxa.comportar();
    }

    for (var sokoban of this.sokobans) {
        comportarSokoban(sokoban)
    }

};


Scene.prototype.limpar = function () {
    this.ctx.clearRect(0, 0, this.w, this.h);
}

//checa colisao entre sprites
Scene.prototype.checaColisao = function () {
    for (var j = 0; j < this.spritesT.length; j++){
        //remoção do tiro do pc quando sai da tela
        var x = Math.floor(this.spritesT[j].x /32)
        var y = Math.floor(this.spritesT[j].y /32)
        if (this.spritesT[j].y > this.map.LINES * 32 - this.spritesT[j].h - 8 + this.cameraX || this.spritesT[j].y < 0
            || this.spritesT[j].x > this.map.COLUMNS * 32 || this.spritesT[j].x < 0) {
            this.toRemove.push(this.spritesT[j]);
        } else if (this.map.cells[x][y].tipo == 9 ){
            this.spritesT[j].comportar = apagarFogo
        }
        
        
    }
    for (var i = 0; i < this.spritesE.length; i++) {
        //colisao inimigo com pc
        if (this.spritesE[i].colidiuCom(this.pc)) {
            if (this.pc.imune <= 0) {
                this.pc.vidas--;
                this.pc.imune = 2;
                this.pc.atingido = 0.3;
                this.assets.play("damage");
            }
        }
        for (var j = 0; j < this.spritesT.length; j++) {
            

            //colisao tiro aliado com inimigo
            if (this.spritesE[i].colidiuCom(this.spritesT[j]) && this.spritesT[j].imune == 0 && this.spritesE[i].imune <= 0) {
                this.spritesT[j].imune == 3;
                if (this.spritesT[j].props.modelo == "fireball") {
                    this.adicionar(new Animation({ x: this.spritesE[i].x, y: this.spritesE[i].y, imagem: "explosion" }));
                    this.assets.play("explosion");
                    this.toRemove.push(this.spritesT[j]);

                }
                if (this.spritesT[j].props.modelo == "espada") {
                    this.adicionar(new Animation({ x: this.spritesE[i].x, y: this.spritesE[i].y, imagem: "sword" }));
                    this.assets.play("sword2");
                }
                this.spritesE[i].vidas--;
                if (this.spritesE[i].vidas == 0) {
                    this.toRemove.push(this.spritesE[i]);
                    if (this.spritesE[i].drop != null) {
                        this.spritesE[i].drop.x = this.spritesE[i].x
                        this.spritesE[i].drop.y = this.spritesE[i].y
                        this.adicionar(this.spritesE[i].drop)
                    } else {
                        var chance = Math.random()
                        if (chance < 0.18 && !this.spritesE[i].props.summoned) {
                            var item = gerenciador.criarPoder('heart', this.spritesE[i].x / 32, this.spritesE[i].y / 32)
                            item.timer = 60
                            var evento = function (item) {
                                item.timer--
                                if (item.timer <= 0) {
                                    cena1.adicionar(item)
                                    var idx = cena1.estagio.eventos.indexOf(this);
                                    cena1.estagio.eventos.splice(idx, 1);
                                }
                            }
                            this.estagio.eventos.push(() => evento(item))
                        }
                    }
                } else {
                    this.spritesE[i].imune = 0.3;
                }
            }
        }
    }

    //colisao tiro inimigo com pc
    for (var i = 0; i < this.spritesTE.length; i++) {
        if (this.spritesTE[i].y > this.map.LINES * 32 - this.spritesTE[i].h - 8 + this.cameraX || this.spritesTE[i].y < 0
            || this.spritesTE[i].x > this.map.COLUMNS * 32 || this.spritesTE[i].x < 0) {
            this.toRemove.push(this.spritesTE[i]);
        }
        if (this.spritesTE[i].colidiuCom(this.pc) && this.spritesTE[i].props.tipo == "tiroE") {
            if (this.pc.imune <= 0) {
                this.pc.atingido = 0.3;
                this.pc.vidas--;
                this.pc.imune = 2;
            }
        }
    }

    //colisao pc com poder
    for (var i = 0; i < this.spritesPoder.length; i++) {
        if (this.spritesPoder[i].colidiuCom(this.pc)) {
            this.assets.play("heal");
            switch (this.spritesPoder[i].props.modelo) {
                case 'hp':
                    this.pc.vidas = 7;
                    break
                case 'heart':
                    if (this.pc.vidas < 7) { this.pc.vidas++ }
                    break
                case 'mana':
                    this.pc.mana = 5
                    break
            }
            var idx = this.estagio.sprites.indexOf(this.spritesPoder[i]);
            this.estagio.sprites.splice(idx, 1);
            this.toRemove.push(this.spritesPoder[i]);
        }
    }

    //colisao com item de inventario
    for (var k = 0; k < this.spritesO.length; k++) {
        for (var j = 0; j < this.spritesT.length; j++) {
            if (this.spritesT[j].colidiuCom(this.spritesO[k]) && this.spritesT[j].props.modelo == "espada" &&
                this.spritesO[k].swCD < 0) {
                switch (this.spritesO[k].props.subtipo) {
                    case 'colecionavel':
                        if (this.inventoryItem) {
                            this.inventoryItem.x = this.spritesO[k].x
                            this.inventoryItem.y = this.spritesO[k].y
                            this.spritesO.push(this.inventoryItem)
                        }
                        this.dialogo = this.spritesO[k].props.mensagem
                        this.toRemove.push(this.spritesO[k])
                        this.inventoryItem = this.spritesO[k]
                        this.assets.play("quest");
                        this.spritesO[k].swCD = 0.6;
                        this.frameCounter = 0
                        if (this.spritesO[k].onGet) { this.spritesO[k].onGet() }
                        break;
                    case 'porta':
                        if (this.inventoryItem != null && this.inventoryItem.keyId == this.spritesO[k].doorId) {
                            this.map.cells[this.spritesO[k].posX][this.spritesO[k].posY].tipo = 4;
                            this.toRemove.push(this.spritesO[k])
                            this.toRemove.push(this.inventoryItem);
                            this.inventoryItem = null;
                            this.assets.play("key");
                        }
                        break;
                    case 'alavanca':
                        this.spritesO[k].swCD = 0.6;
                        this.spritesO[k].event();
                        break;
                }

            }

        }
    }

    //colisão com espinho
    for (var k = 0; k < this.spritesSpike.length; k++) {
        if (this.spritesSpike[k].colidiuCom(this.pc) && this.spritesSpike[k].toggled) {
            if (this.pc.imune <= 0) {
                this.pc.vidas--;
                this.pc.imune = 2;
                this.pc.atingido = 0.3;
                this.assets.play("damage");
            }
        }
    }

    //colisao com teleporte
    for (var i = 0; i < this.spritesTP.length; i++) {
        if (this.pc.colidiuCom(this.spritesTP[i])) {
            this.stageIndex = this.spritesTP[i].props.idx;
            this.pc.x = this.spritesTP[i].tX;
            this.pc.y = this.spritesTP[i].tY;
            this.spritesTP = [];
            this.spritesE = [];
            this.spritesT = [];
            this.spritesO = [];
            this.spritesD = [];
            this.spritesTE = [];
            this.spritesEV = [];
            this.spritesXP = [];
            this.spritesPoder = [];
            this.spritesSpike = [];
            this.darkRooms = []
            this.sokobans = [];
            this.spriteCounter = 0;

        }
    }

    //não exatamente colisão, mas verifica se a posição do jogador é em lava
    var playerPositionX = Math.floor(this.pc.x / 32);
    var playerPositionY = Math.floor(this.pc.y / 32);
    if (this.map.cells[playerPositionX][playerPositionY].tipo == 5) {
        if (this.inventoryItem != null && this.inventoryItem.props.event == "lava") {
            this.pc.lavaImmunity = true;
        } else {
            if (this.pc.imune <= 0) {
                this.pc.vidas--;
                this.pc.imune = 2;
                this.pc.atingido = 0.3;
                this.assets.play("damage");
            }
        }
    } else { this.pc.lavaImmunity = false }

    //verifica se o piso é de gelo
    if (this.map.cells[playerPositionX][playerPositionY].tipo == 1) {
        this.pc.desaceleracao = 0.95
    } else {
        this.pc.desaceleracao = 1
    }

    // checa colisão dos sokobans
    for (var sokoban of this.sokobans) {
        for (var box of sokoban.boxes) {
            for (var spriteT of this.spritesT) {
                if (spriteT.colidiuCom(box) && box.swCD <= 0 && spriteT.props.modelo == "espada") {
                    box.swCD = 0.4
                    moverCaixa(box, pc)
                }
                box.swCD = box.swCD - 0.03
            }
        }
    }


    if (this.pc.vidas == 0 && this.pc.atingido > 0) {
        this.gamer.tema.pause();
    }
    if (this.pc.vidas == 0 && this.pc.atingido <= 0) {
        this.pc.mana = 0;
        this.spritesTP = [];
        this.spritesE = [];
        this.spritesT = [];
        this.spritesO = [];
        this.spritesTE = [];
        this.spritesXP = [];
        this.spritesTE = [];
        this.spritesPoder = [];
        this.darkRooms = []
        this.sokobans = [];
        this.extras = []
        this.paintCorridor = []
        this.spriteCounter = 0;
        this.stageIndex = 1;
        this.pc.x = 1
        this.pc.y = 1
        this.dialogo = "Fim de jogo."
    }
};

Scene.prototype.removeSprites = function () {
    for (var i = 0; i < this.toRemove.length; i++) {

        if (this.toRemove[i].props.tipo == "npc") {
            var idx = this.estagio.sprites.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.estagio.sprites.splice(idx, 1);
            }
            idx = this.spritesE.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesE.splice(idx, 1);
            }

        }
        if (this.toRemove[i] != null && this.toRemove[i].props.tipo == "tiro") {
            var idx = this.spritesT.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesT.splice(idx, 1);
            }
        }
        if (this.toRemove[i] != null && this.toRemove[i].props.tipo == "tiroE") {
            var idx = this.spritesTE.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesTE.splice(idx, 1);
            }
        }
        if (this.toRemove[i] != null && this.toRemove[i].props.tipo == "boom") {
            var idx = this.spritesXP.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesXP.splice(idx, 1);
            }
        }
        if (this.toRemove[i] != null && this.toRemove[i].props.tipo == "poder") {
            var idx = this.spritesPoder.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesPoder.splice(idx, 1);
            }
        }
        if (this.toRemove[i] != null && this.toRemove[i].props.tipo == "tiroQ") {
            var idx = this.spritesTE.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesTE.splice(idx, 1);
            }
        }
        if (this.toRemove[i] != null && this.toRemove[i].props.tipo == "objeto") {
            var idx = this.spritesO.indexOf(this.toRemove[i]);
            if (idx >= 0) {
                this.spritesO.splice(idx, 1);
            }
        }
    }
    this.toRemove = [];
};



Scene.prototype.desenharMapa = function () {
    this.map.desenhar(this.ctx, this);
}

Scene.prototype.incluirInimigos = function () {
    while (this.spriteCounter < this.estagio.sprites.length) {
        var inimigo = this.estagio.sprites[this.spriteCounter];
        this.adicionar(inimigo);
        this.spriteCounter++;
    }
}

Scene.prototype.rodarEventos = function (evento) {
    evento();
}

Scene.prototype.gameDefiner = function () {
    this.estagio = this.gamer.estagios[this.stageIndex];
    this.map = this.estagio.mapa;
    this.incluirInimigos();
    this.estagio.eventos.forEach(this.rodarEventos);
}


Scene.prototype.desenharHUD = function () {

    //desenha o nome da personagem
    ctx.font = "30px Medieval";
    ctx.fillStyle = "white";
    ctx.fillText("Lyra", 24, this.h - 120);
    ctx.save();
    //desenha as vidas
    var posCoracao = 90;
    for (var i = 0; i < this.pc.vidas; i++) {
        ctx.drawImage(this.assets.img("heart"),
            posCoracao, this.h - 53,
            20, 17
        );
        posCoracao = posCoracao + 20;
    }
    //desenha a mana
    posCoracao = 90;
    for (var i = 0; i < this.pc.mana; i++) {
        ctx.drawImage(this.assets.img("mana"),
            posCoracao, this.h - 33,
            16, 13
        );
        posCoracao = posCoracao + 16;
    }

    //desenha a caixa de dialogo
    var imgX = 2;
    var imgY = 7;
    //this.desenharCaixaDialogo(imgX,imgY);
    var imgX = 1;
    this.desenharCaixaDialogo2(imgX, imgY);
    this.desenharInventory(this.inventoryItem)
    this.desenharDialogo()
}

Scene.prototype.desenharCaixaDialogo = function (imgX, imgY) {
    var pX = 0
    var pY = 0
    for (var i = 0; i < 23; i++) {
        for (var j = 0; j < 3; j++) {
            ctx.drawImage(
                this.assets.img("hud"),
                288 + 96 * imgX + 32 * pX + 5,
                96 * imgY + 32 * pY,
                32,
                32,
                i * 16,
                this.h - 100 + j * 16,
                16,
                16,
            );
        }
        ctx.drawImage(
            this.assets.img("hud"),
            288 + 96 * imgX + 32 * (pX + 1),
            96 * imgY + 32 * (pY + 2),
            32,
            32,
            i * 16,
            this.h - 100 + 48,
            16,
            16,
        );

    }
    pY = 1;
    pX = 2;
    for (var i = 0; i < 3; i++) {
        ctx.drawImage(
            this.assets.img("hud"),
            288 + 96 * imgX + 32 * (pX),
            96 * imgY + 32 * (pY),
            32,
            32,
            this.w - 16,
            this.h - 100 + i * 16,
            16,
            16,
        );
    }

    pY = 2;
    ctx.drawImage(
        this.assets.img("hud"),
        288 + 96 * imgX + 32 * (pX),
        96 * imgY + 32 * (pY),
        32,
        32,
        this.w - 16,
        this.h - 100 + 48,
        16,
        16,
    );

}



Scene.prototype.desenharCaixaDialogo2 = function (imgX, imgY) {
    var pY = 0;
    var pX = 0;

    ctx.drawImage(
        this.assets.img("hud"),
        96 * imgX + 32 * pX,
        96 * imgY + 32 * pY,
        32,
        32,
        0 + 24,
        this.h - 100,
        16,
        16,
    );

    pY = 2

    ctx.drawImage(
        this.assets.img("hud"),
        96 * imgX + 32 * pX,
        96 * imgY + 32 * pY,
        32,
        32,
        24,
        this.h - 100 + 48,
        16,
        16,
    );

    pX = 2
    pY = 0;

    ctx.drawImage(
        this.assets.img("hud"),
        96 * imgX + 32 * pX,
        96 * imgY + 32 * pY,
        32,
        32,
        72,
        this.h - 100,
        16,
        16,
    );


    pX = 1
    for (var i = 1; i < 3; i++) {

        ctx.drawImage(
            this.assets.img("hud"),
            96 * imgX + 32 * pX + 5,
            96 * imgY + 32 * pY,
            32,
            32,
            i * 16 + 24,
            this.h - 100,
            16,
            16,
        );

        ctx.drawImage(
            this.assets.img("hud"),
            96 * imgX + 32 * (pX) - 5,
            96 * imgY + 32 * (pY + 2),
            32,
            32,
            i * 16 + 24,
            this.h - 100 + 48,
            16,
            16,
        );

    }
    pY = 1;
    for (var i = 1; i < 3; i++) {
        pX = 2;
        ctx.drawImage(
            this.assets.img("hud"),
            96 * imgX + 32 * (pX),
            96 * imgY + 32 * (pY),
            32,
            32,
            72,
            this.h - 100 + i * 16,
            16,
            16,
        );
        pX = 0;
        ctx.drawImage(
            this.assets.img("hud"),
            96 * imgX + 32 * (pX),
            96 * imgY + 32 * (pY),
            56,
            32,
            24,
            this.h - 100 + i * 16,
            16,
            16,
        );
    }
    pX = 2;
    pY = 2;
    ctx.drawImage(
        this.assets.img("hud"),
        96 * imgX + 32 * (pX),
        96 * imgY + 32 * (pY),
        32,
        32,
        72,
        this.h - 100 + 48,
        16,
        16,
    );
}

Scene.prototype.desenharInventory = function (item) {
    if (this.inventoryItem) {
        ctx.drawImage(
            this.assets.img(item.imagem),
            item.spriteSize * item.imgX,
            0,
            item.spriteSize,
            item.spriteSize,
            32,
            this.h - 90,
            48,
            48,
        );
    }
}

Scene.prototype.desenharDialogo = function () {
    if (this.dialogo != null) {
        this.frameCounter++
        ctx.font = "30px Medieval";
        ctx.fillStyle = this.caution ? `rgba(255, 0, 0, ${this.mensagemOpacity})` : `rgba(255, 255, 255, ${this.mensagemOpacity})`;
        ctx.fillText(this.dialogo, 90, this.h - 75);
        if (this.frameCounter >= 180 && this.stageIndex < 1) {
            this.mensagemOpacity -= 0.02;
        }
        if (this.mensagemOpacity <= 0) {
            this.dialogo = null;
            this.mensagemOpacity = 1;
            this.frameCounter = 0;
            this.caution = false
        }
    }
}

Scene.prototype.updateCameraPosition = function () {
    // Ajuste a posição da câmera conforme a movimentação do elemento central
    const cameraCenterX = pc.x;
    const cameraCenterY = pc.y;

    // Defina a metade da largura e altura da tela
    const halfScreenWidth = this.w / 2;
    const halfScreenHeight = this.h / 2;

    // Calcule os limites do cenário (em termos de tamanho real do mapa)
    const maxCameraX = (this.mapXY()) - this.w;
    const maxCameraY = (this.mapXY()) - this.h;

    // Ajuste a posição da câmera para manter o elemento centralizado na tela
    this.cameraX = Math.max(0, Math.min(cameraCenterX - halfScreenWidth, maxCameraX));
    this.cameraY = Math.max(0, Math.min(cameraCenterY - halfScreenHeight, maxCameraY));
};

Scene.prototype.mapXY = function () {
    return this.map.COLUMNS * this.map.SIZE
}

Scene.prototype.atualizarCamera = function (x, y) {
    this.cameraX = x; // Atualize a posição X da câmera com a coordenada X do personagem
    this.cameraY = y; // Atualize a posição Y da câmera com a coordenada Y do personagem
}

Scene.prototype.passo = function (dt) {
    this.globalCounter++
    if (this.theEnd <= 0) {
        this.gameDefiner();
        this.limpar();
        this.desenharMapa();
        this.comportar();
        this.mover(dt);
        this.desenhar();
        this.checaColisao();
        this.removeSprites();
        this.desenharHUD();
    }
    if (this.theEnd >= 10 && this.theEnd < 60) {
        this.theEnd -= 8 * dt;
        if (this.theEnd <= 20) {
            this.theEnd = 60;
        }
    }
    if (this.theEnd == 60) {
        this.desenharHUD();
        this.limpar();
        this.dialogo = "Obrigado por jogar! Jogo criado por: _Marcus Vinicius V. A. Cunha - Mat. SIGA 201776013_" +
            "Jogo baseado no álbum \"Story of Lyra \" de Cashew.";
        ctx.drawImage(
            this.assets.img("bluemoon"),
            0, 0, 384, 320
        );
    }
}








