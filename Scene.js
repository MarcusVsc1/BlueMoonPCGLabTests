function Scene(params) {
    var exemplo = {
        pc: null,
        boss: null,
        spritesE: [],
        spritesSpike: [],
        spritesT: [],
        spritesTE: [],
        spritesPoder: [],
        spritesEV: [],
        spritesTP: [],
        spritesXP: [],
        spritesO: [],
        toRemove: [],
        sceneMessages:[],
        ctx: null,
        w: 1600,
        h: 1600,
        assets: null,
        map: null,
        stageIndex: 1,
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
        sokobans: []
    }
    Object.assign(this, exemplo, params);
    // BLUEMOON_PERSISTENT_INVENTORY_V1
    this.inventory = new Inventory();
    this.inventoryHUD = new InventoryHUD(this.inventory);
}

Scene.prototype = new Scene();
Scene.prototype.constructor = Scene;

//adiciona os sprites ao scene
Scene.prototype.adicionar = function (sprite) {
    DungeonMapSystem.beforeAdd(this, sprite);
    if (this.inventory.hidden(sprite)) return;
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

    if (sprite.props.tipo == "evento") {
        this.spritesEV.push(sprite);
    }

    sprite.scene = this;
    CombatArena.add(this, sprite);
};

//desenha os sprites. os ifs são para colcoar o sprites em cima ou não do pc
Scene.prototype.desenhar = function () {
    // BM_WITCH_AI_V1: marcadores no chao, antes dos sprites.
    BMWitch.draw(this);
    // LYRA_GAMEOVER_DRAW: tela de derrota independente da lista de objetos e da camera.
    if (this.stageIndex === 2 && this.pc && this.pc.vidas <= 0) {
        const sheet = this.assets.img("expressoes");
        const ctx = this.ctx;
        ctx.save();
        try {
            ctx.globalAlpha = 1;
            ctx.drawImage(sheet, 336, 241, 48, 48, (this.w - 120) / 2, (this.h - 120) / 2 - 22.5, 120, 120);
        } finally { ctx.restore(); }
        return;
    }

    // Dispositivo antilava: abaixo das labaredas, uma unica vez.
    for (const obj of this.spritesO) {
        if (CollisionSystem.isLavaDevice(obj)) obj.desenhar(this.ctx);
    }

    for (var i = 0; i < this.spritesSpike.length; i++) {
        this.spritesSpike[i].desenhar(this.ctx);
    }
    for (var i = 0; i < this.spritesO.length; i++) {
        if (!CollisionSystem.isLavaDevice(this.spritesO[i]) && (this.spritesO[i].y < this.pc.y || this.spritesO[i].switchId))
            this.spritesO[i].desenhar(this.ctx);
    }
    // BM_RUNE_COMPLETE_V4: renderiza o puzzle e a previa da recompensa, sem registrar objeto coletavel.
    for (var sokoban of this.sokobans) BMRuneComplete.draw(this,sokoban);
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

    for (var i = 0; i < this.spritesEV.length; i++) {
        this.spritesEV[i].desenhar(this.ctx);
    }

    if (this.pc.direcao != 0) {
        if (this.pc.desenhar) { this.pc.desenhar(this.ctx); }
    }
    for (var i = 0; i < this.spritesO.length; i++) {
        if (!CollisionSystem.isLavaDevice(this.spritesO[i]) && this.spritesO[i].y > this.pc.y && this.spritesO[i].switchId == null) this.spritesO[i].desenhar(this.ctx);
    }


    for (var i = 0; i < this.spritesE.length; i++) {
        if (this.spritesE[i].y > this.pc.y) this.spritesE[i].desenhar(this.ctx);
    }
    desenharCelulas(this.extras, 'rgba(0, 0, 255, 0.2)')
    desenharCelulas(this.paintCorridor, 'rgba(125, 0, 125, 0.2)')
    for (const room of this.darkRooms) {
        preencherComPreto(room)
    }
    // A camera e atualizada uma unica vez antes de renderizar.
};



//move os sprites
// BM_ENEMY_AGGRO_V1: distancias em tiles, medidas em coordenadas de mundo.
Scene.prototype.bmEnemyAggroRules = Object.freeze({ activation: 8, release: 20 });
Scene.prototype.bmEnemyAggroExempt = function (enemy) {
    // Identificadores reais da fabrica. Nao usar atravessa: a bruxa tambem invoca
    // outros NPCs que atravessam paredes, e a excecao solicitada e o fogo-fatuo.
    return enemy.imagem === 'flame2' || enemy.imagem === 'bruxa' ||
        enemy === this.boss || enemy === this.bruxa || enemy.props?.boss == 1;
};
// BM_NECROMANCER_ROOM_V1: sala real do grafo, sem depender de possuir o mapa.
Scene.prototype.bmIsNecromancer = function(enemy) {
    return enemy?.props?.tipo === 'npc' && enemy.imagem === 'monster' && enemy.imgX === 3 && enemy.imgY === 1 && !enemy.props?.summoned;
};
Scene.prototype.bmNecromancerSameRoom = function(enemy) {
    if (this.stageIndex !== 0 || !this.pc || !this.map || !(enemy.vidas > 0) || (this.toRemove || []).includes(enemy)) return false;
    const graph = this.gamer?.dungeonGenerator?.graph;
    if (!Array.isArray(graph?.nodes)) return false;
    let cache = this._bmNecromancerRooms;
    if (!cache || cache.graph !== graph || cache.map !== this.map) {
        const owners = new Map();
        for (const room of graph.nodes) for (const c of room.cells || []) owners.set(`${c.x},${c.y}`, room);
        cache = this._bmNecromancerRooms = {graph, map:this.map, owners};
    }
    const z = this.map.SIZE || 32;
    const key = e => `${Math.floor(e.x / z)},${Math.floor(e.y / z)}`;
    const room = cache.owners.get(key(enemy));
    return !!room && room === cache.owners.get(key(this.pc));
};
Scene.prototype.bmEnemyShouldAct = function (enemy) {
    if (!this.pc) return false;
    if (this.bmIsNecromancer(enemy)) {
        enemy.provocou = this.bmNecromancerSameRoom(enemy);
        return enemy.provocou;
    }
    const d = Math.hypot(enemy.x - this.pc.x, enemy.y - this.pc.y);
    // Excecoes conservam a condicao original, inclusive a primeira ativacao.
    if (this.bmEnemyAggroExempt(enemy)) return d < 256 || !!enemy.provocou;
    const z = this.map?.SIZE || 32;
    const rules = this.bmEnemyAggroRules;
    if (enemy.provocou) {
        if (d <= rules.release * z) return true;
        enemy.provocou = false;
    } else if (d < rules.activation * z) {
        enemy.provocou = true;
        return true;
    }
    return false;
};
Scene.prototype.bmEnemyWait = function (enemy, dt = 0) {
    enemy.vx = 0;
    enemy.vy = 0;
    // Escudeiro: a perseguicao reside no proprio mover(). Cancela a virada
    // pendente e conserva os relogios que ele atualiza nesse metodo.
    if (ShieldEnemy.is(enemy)) {
        enemy.frame = 1;
        enemy.moving = false;
        enemy.pendingDirection = null;
        enemy.turnRemaining = 0;
        if (Number.isFinite(dt) && dt > 0) {
            for (const key of ['blockFlash','turnCooldown','imune','blockRemaining']) {
                enemy[key] = Math.max(0, (enemy[key] || 0) - dt);
            }
        }
        return;
    }
    if (!(Number.isFinite(dt) && dt > 0)) return;
    // Replica apenas os relogios de Sprite.mover/Ortogonal, sem deslocamento,
    // aceleracao circular, IA ou novas invocacoes.
    if (enemy.imune > 0 && enemy.atingido <= 0) enemy.imune -= dt;
    // BM_ENEMY_AGGRO_ANIMATION_V2: replica o relogio de Sprite.moverOrtogonal, sem mover ou atacar.
    // A chamada de comportar() sem dt nao avanca nem reinicia a animacao.
    const normal = enemy.charStop <= 0 && enemy.atingido <= 0;
    if ((normal && enemy.ortogonal == 0) || (!normal && enemy.imune <= 0)) {
        enemy.frame = (Number.isFinite(enemy.frame) ? enemy.frame : 0) + 8 * dt;
    }
    if (enemy.charStop <= 0 && enemy.atingido <= 0) {
        for (const key of ['spCD','swCD','globalCD']) {
            // Necromante fora da sala: congelar o relogio de invocacao, sem acumular tentativas.
            if (key === 'globalCD' && this.bmIsNecromancer(enemy)) continue;
            if (Number.isFinite(enemy[key])) enemy[key] -= dt;
        }
    } else {
        if (enemy.atingido > 0) enemy.atingido -= dt;
        if (enemy.charStop > 0) enemy.charStop -= dt;
    }
};

// BM_ENEMY_SPACING_V2: snapshot de posicoes, uma correcao limitada por inimigo.
Scene.prototype.bmSeparateEnemies = function(dt, moved) {
    if ((this.stageIndex !== 0 && this.stageIndex !== 3) || this.paused || this.theEnd > 0 || !(dt > 0) || !Number.isFinite(dt) || !this.map) return;
    const map = this.map, z = map.SIZE || 32, step = Math.min(dt,.05);
    const removed = new Set(this.toRemove || []), arena = CombatArena.active(this);
    const live = this.spritesE.filter(e => e && e.vidas > 0 && !removed.has(e) && Number.isFinite(e.x) && Number.isFinite(e.y) && CombatArena.canContact(this,e));
    const radius = b => Math.max(1,Math.min(z/4, Math.min(b.w,b.h)/2));
    const cell = z, buckets = new Map(), key = (x,y) => `${x},${y}`;
    const entries = live.map((e,i)=>{
        const b = CollisionSystem.box(e);
        const movable = moved.has(e) && Number.isFinite(e.vm) && e.vm > 0 && !(e.charStop > 0) && !(e.atingido > 0) &&
            (e.props?.modelo !== 'escudeiro' || e.moving) && e !== this.boss && e !== this.bruxa && e.imagem !== 'bruxa' && !e.props?.boss;
        // BM_WITCH_GHOST_SPACING_V1: fantasmas da Bruxa <= 25%; demais <= 50%.
        const ratio = e.props?.bmDamageOrigin === 'witchSummon' ? .25 : .5;
        const limit = movable ? Math.min(80, e.vm*ratio) * step : 0;
        return {e,i,b,r:radius(b),limit,inside:arena?CombatArena.fullInside(arena,e):false,dx:0,dy:0};
    }).filter(p=>[p.b.x,p.b.y,p.r].every(Number.isFinite));
    if (!entries.some(p=>p.limit>0)) return;
    for (const p of entries) {
        p.gx=Math.floor(p.b.x/cell);p.gy=Math.floor(p.b.y/cell);
        const k=key(p.gx,p.gy);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(p);
    }
    // Todos os pares leem o mesmo snapshot; nenhuma posicao muda nesta fase.
    for (const p of entries) {
        for(let gx=p.gx-1;gx<=p.gx+1;gx++)for(let gy=p.gy-1;gy<=p.gy+1;gy++)for(const q of buckets.get(key(gx,gy))||[]) {
            if(q.i<=p.i||(!p.limit&&!q.limit))continue;
            const a=p.e,b=q.e;
            if((a.atravessa==1)!==(b.atravessa==1) || (arena && p.inside!==q.inside))continue;
            const min=p.r+q.r;
            let dx=q.b.x-p.b.x,dy=q.b.y-p.b.y,dist=Math.hypot(dx,dy);
            if(!(dist<min))continue;
            if(dist<1e-7){
                dx=(b.vx||0)-(a.vx||0);dy=(b.vy||0)-(a.vy||0);
                if(Math.hypot(dx,dy)<1e-7 && !!p.limit!==!!q.limit && this.pc){
                    const mover=p.limit?p.b:q.b, sign=p.limit?-1:1;
                    dx=(this.pc.x-mover.x)*sign;dy=(this.pc.y-mover.y)*sign;
                }
                if(Math.hypot(dx,dy)<1e-7){dx=(q.i-p.i)%2?1:0;dy=dx?0:1;}
                const n=Math.hypot(dx,dy);dx/=n;dy/=n;
            }else{dx/=dist;dy/=dist;}
            const overlap=min-dist, aShare=p.limit?(q.limit?overlap/2:overlap):0,bShare=q.limit?(p.limit?overlap/2:overlap):0;
            p.dx-=dx*aShare;p.dy-=dy*aShare;q.dx+=dx*bShare;q.dy+=dy*bShare;
        }
    }
    // Uma unica correcao por inimigo; sem redistribuir deslocamento bloqueado,
    // sem alterar vx/vy, sem impulso transferido para o proximo par.
    for(const p of entries){
        const len=Math.hypot(p.dx,p.dy);
        if(!(p.limit>0&&len>0))continue;
        const f=Math.min(1,p.limit/len),e=p.e,x=e.x,y=e.y;
        CollisionSystem.axis(e,map,p.dx*f,'x');
        CollisionSystem.axis(e,map,p.dy*f,'y');
        if(arena&&CombatArena.fullInside(arena,e)!==p.inside){e.x=x;e.y=y;}
        CollisionSystem.sync(e,map);
    }
};

Scene.prototype.mover = function (dt) {
    for (var i = 0; i < this.spritesSpike.length; i++) {
        this.spritesSpike[i].mover(dt);
    }
    const bmMovedEnemies = new Set();
    for (var i = 0; i < this.spritesE.length; i++) {
        const enemy = this.spritesE[i];
        if (!CombatArena.canContact(this, enemy)) continue;
        if (this.bmEnemyAggroExempt(enemy) || this.bmEnemyShouldAct(enemy)) {
            enemy.mover(dt);
            bmMovedEnemies.add(enemy);
        } else this.bmEnemyWait(enemy, dt);
    }
    this.bmSeparateEnemies(dt, bmMovedEnemies);
    for (var i = 0; i < this.spritesT.length; i++) {
        if (!CollisionSystem.tickStationaryProjectile(this.spritesT[i], dt)) this.spritesT[i].mover(dt);
    }
    for (var i = 0; i < this.spritesPoder.length; i++) {
        this.spritesPoder[i].mover(dt);
    }
    for (var i = 0; i < this.spritesTP.length; i++) {
        this.spritesTP[i].mover(dt);
    }
    for (var i = 0; i < this.spritesTE.length; i++) {
        if (!CollisionSystem.tickStationaryProjectile(this.spritesTE[i], dt)) this.spritesTE[i].mover(dt);
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

    for (var i = 0; i < this.spritesEV.length; i++) {
        this.spritesEV[i].mover(dt);
    }

};

//adiciona o comportamento dos sprites
// BM_HAZARDS_V2: som segue a mudanca efetiva, nunca um segundo contador.
Scene.prototype.bmPlaySpikeTransition = function (rooms) {
    if (!rooms.size || !this.pc) return;
    const audio = this.assets?.audios?.spike;
    if (!audio) return;
    const tile = this.map?.SIZE || 32;
    let volume = 0;
    for (const room of rooms) {
        const origin = room.cells?.[0];
        if (!origin) continue;
        const x = (origin.x + room.roomWidth / 2) * tile;
        const y = (origin.y + room.roomHeight / 2) * tile;
        const radius = Math.hypot(room.roomWidth * tile / 2, room.roomHeight * tile / 2);
        const distance = Math.hypot(this.pc.x - x, this.pc.y - y);
        const v = distance < radius ? 0.8 : distance < radius * 1.3 ? 0.4 : distance < radius * 1.6 ? 0.25 : distance < radius * 2 ? 0.17 : 0;
        volume = Math.max(volume, v);
    }
    if (!volume) return;
    try {
        BMSettings.effect(audio,volume);
        audio.currentTime = 0;
        const playing = audio.play();
        if (playing && typeof playing.catch === 'function') playing.catch(() => {});
    } catch (_) { /* audio indisponivel nao interrompe a simulacao */ }
};
Scene.prototype.comportar = function () {
    const bmSpikeChangedRooms = new Set();
    for (var i = 0; i < this.spritesSpike.length; i++) {
        const spike = this.spritesSpike[i];
        if (spike.comportar) {
            const before = !!spike.toggled;
            spike.comportar();
            if (spike._bmSpikeRoom && spike.repeatCd > 0 && before !== !!spike.toggled) {
                bmSpikeChangedRooms.add(spike._bmSpikeRoom);
            }
        }
    }
    this.bmPlaySpikeTransition(bmSpikeChangedRooms);
    for (var i = 0; i < this.spritesTP.length; i++) {
        if (this.spritesTP[i].comportar) {
            this.spritesTP[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesE.length; i++) {
        const enemy = this.spritesE[i];
        if (!CombatArena.canContact(this, enemy)) continue;
        if (this.bmEnemyShouldAct(enemy)) {
            if (enemy.comportar) enemy.comportar();
        } else if (!this.bmEnemyAggroExempt(enemy)) {
            this.bmEnemyWait(enemy);
        }
    }
    for (var i = 0; i < this.spritesT.length; i++) {
        if (!this.spritesT[i]._stationaryFade && this.spritesT[i].comportar) {
            this.spritesT[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesTE.length; i++) {
        if (!this.spritesTE[i]._stationaryFade && this.spritesTE[i].comportar) {
            this.spritesTE[i].comportar();
        }
    }
    for (var i = 0; i < this.spritesO.length; i++) {
        if (this.spritesO[i].comportar) {
            this.spritesO[i].comportar();
        }
    }

    if (this.pc != null && this.pc.comportar && !this.pc.onTP) {
        this.pc.comportar();
    }

    if (this.bruxa != null && this.bruxa.comportar) {
        this.bruxa.comportar();
    }

};


Scene.prototype.limpar = function () {
    this.ctx.clearRect(0, 0, this.w, this.h);
}

//checa colisao entre sprites
Scene.prototype.checaColisao = function (dt = 1/60) {
    // LYRA_GAMEOVER_GUARD: nao repetir a transicao nem limpar os objetos da tela.
    if (this.stageIndex === 2 && this.pc && this.pc.vidas <= 0) return;

    //não exatamente colisão, mas verifica se a posição do jogador é em lava
    var playerPositionX = Math.floor(this.pc.x / this.map.SIZE);
    var playerPositionY = Math.floor(this.pc.y / this.map.SIZE);
    var playerTile = CollisionSystem.tile(this.map, playerPositionX, playerPositionY);
    this.updateLavaTerrain(playerTile, dt);
    // BM_GAMEOVER_V1: a morte e definitiva, antes de curas/teleportes no mesmo tick.
    if (BMGameOver.fatal(this, 'Lava')) return;

    //verifica se o piso é de gelo
    if (playerTile?.tipo == 1) {
        this.pc.desaceleracao = 0.95
    } else {
        this.pc.desaceleracao = 1
    }

    // Projeteis moveis sao limitados na propria movimentacao. A remocao
    // acontece depois das interacoes para considerar o trajeto ate a parede.
    for (var i = 0; i < this.spritesE.length; i++) {
        //colisao inimigo com pc
        if (!this.spritesE[i]._bmWitchHidden && CombatArena.canContact(this, this.spritesE[i]) && this.spritesE[i].colidiuCom(this.pc) && ShieldEnemy.canContact(this.spritesE[i])) {
            if (this.pc.imune <= 0) {
                this.pc.vidas--;
                if (BMGameOver.fatal(this, BMGameOver.enemyName(this.spritesE[i]))) { this.assets.play('damage'); return; }
                this.pc.imune = 2;
                this.pc.atingido = 0.3;
                this.assets.play("damage");
            }
        }
        for (var j = 0; j < this.spritesT.length; j++) {


            //colisao tiro aliado com inimigo
            if (!this.toRemove.includes(this.spritesT[j]) && !this.toRemove.includes(this.spritesE[i]) &&
                !this.spritesE[i]._bmWitchHidden && CombatArena.canHit(this, this.spritesE[i], this.spritesT[j]) && this.spritesE[i].colidiuCom(this.spritesT[j]) && this.spritesT[j].imune == 0 && this.spritesE[i].imune <= 0 &&
                !this.spritesT[j]._hitEnemies?.has(this.spritesE[i])) {
                if (this.spritesT[j].props.modelo === 'espada') {
                    (this.spritesT[j]._hitEnemies ||= new WeakSet()).add(this.spritesE[i]);
                    // BLUEMOON_SHIELD_ENEMY_V1: golpe bloqueado ja foi registrado neste ataque.
                    if (ShieldEnemy.blocksSword(this.spritesE[i], this.spritesT[j], this)) continue;
                } else { this.spritesT[j].imune = 3; }
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
                    BMGameOver.kill(this);
                    this.toRemove.push(this.spritesE[i]);
                    if (this.spritesE[i].drop != null) {
                        this.spritesE[i].drop.x = this.spritesE[i].x
                        this.spritesE[i].drop.y = this.spritesE[i].y
                        this.adicionar(this.spritesE[i].drop)
                    } else {
                        var chance = random.nextRandFloat()
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

    // BM_WITCH_AI_V2: resolver area apos movimento e golpes na chefe.
    if (BMWitch.resolvePulse(this)) return;
    //colisao tiro inimigo com pc
    for (var i = 0; i < this.spritesTE.length; i++) {
        // Limites em coordenadas de mundo verificados por cleanupProjectiles.
        if (!this.toRemove.includes(this.spritesTE[i]) && this.spritesTE[i].colidiuCom(this.pc) && this.spritesTE[i].props.tipo == "tiroE") {
            if (this.pc.imune <= 0) {
                this.pc.atingido = 0.3;
                this.pc.vidas--;
                // BM_WITCH_IMPACT_V1: somente o disparo da Bruxa que realmente causa dano.
                const projectile = this.spritesTE[i];
                const witchImpact = projectile.props.bmDamageOrigin === 'witchFireball' && projectile.props.modelo === 'fireball';
                if (witchImpact) {
                    const explosion = new Animation({ x: this.pc.x, y: this.pc.y, imagem: 'explosion' });
                    this.adicionar(explosion);
                    this.assets.play('explosion');
                    // Golpe fatal retorna antes de removeSprites(); retirar o tiro agora.
                    if (this.pc.vidas <= 0) {
                        this.spritesTE.splice(i, 1);
                        this._bmFatalWitchExplosion = explosion;
                    } else {
                        this.toRemove.push(projectile);
                    }
                }
                if (BMGameOver.fatal(this, BMGameOver.projectileName(projectile))) { this.assets.play('damage'); return; }
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
                case 'manaHeart':
                    if (this.pc.mana < 5) { this.pc.mana++ }
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
                        this.inventory.collect(this, this.spritesO[k]);
                        break;
                    case 'porta':
                        this.inventory.tryDoor(this, this.spritesO[k], this.spritesT[j]);
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
                if (BMGameOver.fatal(this, 'Espinhos')) { this.assets.play('damage'); return; }
                this.pc.imune = 2;
                this.pc.atingido = 0.3;
                this.assets.play("damage");
            }
        }
    }
    this.pc.onTP = false
    //colisao com teleporte
    for (var i = 0; i < this.spritesTP.length; i++) {
        if (this.pc.colidiuCom(this.spritesTP[i])) {
            this.stageIndex = this.spritesTP[i].props.idx;
            this.pc.x = this.spritesTP[i].tX;
            this.pc.y = this.spritesTP[i].tY;
            var evento = this.spritesTP[i].evento
            this.limparCena()

            if (evento) {
                evento()
            }
            this.pc.vx = 0
            this.pc.vy = 0
            this.pc.onTP = true
        }
    }

    for (var i = 0; i < this.spritesEV.length; i++) {
        if (this.pc.colidiuCom(this.spritesEV[i])) {
            this.spritesEV[i].evento()
        }
    }

    // Cada espada empurra no maximo uma caixa, e o cooldown independe dos tiros.
    if (!this.pc.onTP) {
        CollisionSystem.updateBoxes(this, dt);
        for (const puzzle of [...this.sokobans]) comportarSokoban(puzzle, dt);
    }
    CollisionSystem.cleanupProjectiles(this);

    if (this.pc.vidas <= 0 && this.pc.atingido > 0) {
        this.gamer.tema.pause();
    }
    if (this.pc.vidas <= 0 && this.pc.atingido <= 0) {
        this.pc.vidas = 0;
        this.pc.mana = 0;
        this.spritesTP = [];
        this.sceneMessages = [];
        this.spritesE = [];
        this.spritesT = [];
        this.spritesO = [];
        this.spritesTE = [];
        this.spritesXP = [];
        this.spritesTE = [];
        this.spritesPoder = [];
        this.spritesSpike = []
        this.darkRooms = []
        this.sokobans = [];
        this.extras = []
        this.paintCorridor = []
        this.spriteCounter = 0;
        this.stageIndex = 2;
        this.pc.x = 1
        this.pc.y = 1
        this.dialogo = "Fim de jogo. Aperte F5 para reiniciar"
    }
};

Scene.prototype.removeSprites = function () {
    DungeonMapSystem.removed(this);
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
    this.inventoryHUD.drawPermanents(this);
    // BM_NOCLIP_V2: indicador de debug, sem interferir nos slots.
    if (this.pc?.atravessa === 1 && this.pc.vidas > 0) {
        const nc = this.ctx;
        nc.save();
        try {
            nc.setTransform(1,0,0,1,0,0);
            nc.globalAlpha = 1; nc.font = 'bold 12px Arial'; nc.textAlign = 'right';
            nc.fillStyle = '#20232a'; nc.fillRect(this.w-133,8,125,24);
            nc.fillStyle = '#f2cd81'; nc.fillText('NOCLIP ATIVO',this.w-16,24);
        } finally { nc.restore(); }
    }
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
    this.desenharInventory()
    this.desenharDialogo()
    this.desenharMensagensPersistentes()
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

Scene.prototype.desenharInventory = function () {
    this.inventoryHUD.draw(this);
}

Scene.prototype.desenharDialogo = function () {
    if (this.dialogo != null) {
        // BM_TIMING_60_V1: conta ticks virtuais, sem envelhecer duas vezes no mesmo passo.
        const bmDialogBefore = Math.floor((this.frameCounter || 0) + 1e-7);
        this.frameCounter = (this.frameCounter || 0) + (this._bmDialogStepPending || 0) * 60;
        this._bmDialogStepPending = 0;
        const bmDialogFadeTicks = Math.max(0, Math.floor(this.frameCounter + 1e-7) - Math.max(179, bmDialogBefore));
        ctx.font = "30px Medieval";
        ctx.fillStyle = this.caution ? `rgba(255, 0, 0, ${this.mensagemOpacity})` : `rgba(255, 255, 255, ${this.mensagemOpacity})`;
        // BlueMoon: separadores de linha do dialogo
        const linhasDialogo = String(this.dialogo).split(/_|\r?\n/);
        linhasDialogo.forEach((linha, indice) => {
            ctx.fillText(linhasDialogo.length === 1 ? linha : linha.trim(), 90, this.h - 75 + indice * 30);
        });
        if (bmDialogFadeTicks > 0 && this.stageIndex < 1) {
            this.mensagemOpacity = Math.max(0, this.mensagemOpacity - 0.02 * bmDialogFadeTicks);
        }
        if (this.mensagemOpacity <= 0) {
            this.dialogo = null;
            this.mensagemOpacity = 1;
            this.frameCounter = 0;
            this.caution = false
        }
    }
}

Scene.prototype.desenharMensagensPersistentes = function () {
    for(var message of this.sceneMessages) {
        ctx.font = message.font
        ctx.fillStyle = message.fillStyle
        ctx.fillText(message.text, message.x, message.y)
    }
}

Scene.prototype.updateCameraPosition = function () {
    // BM_CAMERA_PIXEL_V1: alinhar a camera visual ao pixel interno do Canvas, sem arredondar o jogador.
    // Ajuste a posição da câmera conforme a movimentação do elemento central
    const cameraCenterX = this.pc.x;
    const cameraCenterY = this.pc.y;

    // Defina a metade da largura e altura da tela
    const halfScreenWidth = this.w / 2;
    const halfScreenHeight = this.h / 2;

    // Calcule os limites do cenário (em termos de tamanho real do mapa)
    const maxCameraX = this.map.COLUMNS * this.map.SIZE - this.w;
    const maxCameraY = this.map.LINES * this.map.SIZE - this.h;

    // Ajuste a posição da câmera para manter o elemento centralizado na tela
    this.cameraX = Math.round(Math.max(0, Math.min(cameraCenterX - halfScreenWidth, maxCameraX)));
    this.cameraY = Math.round(Math.max(0, Math.min(cameraCenterY - halfScreenHeight, maxCameraY)));
};

Scene.prototype.mapXY = function () {
    return this.map.COLUMNS * this.map.SIZE
}

Scene.prototype.atualizarCamera = function (x, y) {
    this.cameraX = Math.round(x); // Atualize a posição X da câmera com a coordenada X do personagem
    this.cameraY = Math.round(y); // Atualize a posição Y da câmera com a coordenada Y do personagem
}

// BM_SPIKE_CLOCK_V1: relogio exclusivo dos espinhos, em ticks virtuais de 1/60 s.
Scene.prototype.bmAdvanceSpikeClock = function (dt) {
    const old = this._bmSpikeElapsed ?? 0;
    const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this._bmSpikeElapsed = old + step * 60;
    this._bmSpikeTickBefore = Math.floor(old + 1e-7);
    this._bmSpikeTick = Math.floor(this._bmSpikeElapsed + 1e-7);
};
Scene.prototype.bmSpikeTransitions = function (period, after = this._bmSpikeTickBefore ?? 0) {
    if (!Number.isFinite(period) || period <= 0) return 0;
    return Math.max(0, Math.floor((this._bmSpikeTick ?? 0) / period) - Math.floor(after / period));
};
Scene.prototype.passo = function (dt) {
    // BM_DUNGEON_MAP_V1: pausa a simulacao inteira, sem acumular dt.
    if (DungeonMapSystem.pause(this)) return;
    // BM_TIMING_60_V1: segundos de simulacao (o limite de dt do loop permanece).
    this._bmTimingStep = Number.isFinite(dt) && dt > 0 ? dt : 0;
    this._bmDialogStepPending = this._bmTimingStep;
    if (!this.paused && this.theEnd <= 0) this.inventoryHUD.update(dt);
    this.globalCounter++;
    this.bmAdvanceSpikeClock(dt);
    if (this.theEnd <= 0) {
        this.gameDefiner();
        if (BMGameOver.victoryPending()) return; // BM_VICTORY_V1
        const currentStage = this.stageIndex;
        this.comportar();
        const inventoryTrack = currentStage === 0 && this.pc.vidas > 0 && !this.paused;
        const inventoryFrom = inventoryTrack ? { x: this.pc.x, y: this.pc.y } : null;
        // BLUEMOON_COMBAT_ARENA_V1: ativar apenas apos o deslocamento real do jogador.
        const bmArenaMovement = CombatArena.capture(this);
        this.mover(dt);
        CombatArena.confine(this, bmArenaMovement);
        if (inventoryTrack) this.inventory.metrics.track(this, dt, inventoryFrom, this.pc);
        CombatArena.update(this, dt);
        this.checaColisao(dt);
        if (this.pc.vidas <= 0) return;
        if (currentStage === 0 && this.stageIndex !== 0) {
            this.inventory.metrics.finish(this.stageIndex === 2 ? 'defeat' : 'dungeon_exit');
        }
        this.removeSprites();
        CombatArena.afterCombat(this);
        if (currentStage === 3 && this.stageIndex === 3 && BMGameOver.win(this)) return; // BM_VICTORY_V1
        // Em uma troca de fase, gameDefiner carregara o novo mapa no proximo frame.
        if (this.stageIndex === currentStage) {
            this.updateCameraPosition();
            DungeonMapSystem.observe(this, dt);
            this.limpar();
            this.desenharMapa();
            CombatArena.draw(this);
            this.desenhar();
            CollisionDebug.draw(this);
            this.desenharHUD();
        }
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

Scene.prototype.limparCena = function () {
    DungeonMapSystem.close(this, this.map?._bmDungeonMap);
    CombatArena.reset(this);
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
    this.sceneMessages = [];
    this.spriteCounter = 0;
}

// BLUEMOON_LAVA_TERRAIN_V1: parametros de balanceamento em segundos e fracao da velocidade.
Scene.prototype.lavaTerrainRules = Object.freeze({
    speedFactor: 0.25,
    damage: 1,
    damageInterval: 0.8,
    hitVisualSeconds: 0.18
});

Scene.prototype.hasLavaTerrainProtection = function () {
    return this.inventory.hasPermanent("lavaBoots");
};

Scene.prototype.updateLavaTerrain = function (tile, dt) {
    const pc = this.pc;
    const rules = this.lavaTerrainRules;
    const elapsed = Number.isFinite(dt) && dt > 0 ? dt : 0;
    // Reinicia o estado quando o mapa, a partida ou o jogador mudam.
    if (!this._bmLavaContact || this._bmLavaContact.map !== this.map ||
        this._bmLavaContact.inventory !== this.inventory || this._bmLavaContact.pc !== pc) {
        this._bmLavaContact = {map: this.map, inventory: this.inventory, pc, active: false, remaining: 0};
        pc._bmLavaHit = 0;
    }
    const state = this._bmLavaContact;
    pc._bmLavaHit = Math.max(0, (pc._bmLavaHit || 0) - elapsed);
    const onLava = Number(tile?.tipo) === 5;
    const protectedByBoot = this.hasLavaTerrainProtection();
    pc.lavaImmunity = onLava && protectedByBoot;
    if (!onLava || protectedByBoot || pc.vidas <= 0) {
        state.active = false;
        state.remaining = 0;
        return;
    }
    if (!state.active) {
        state.active = true;
        state.remaining = 0; // primeiro contato: dano imediato
    } else {
        state.remaining -= elapsed;
    }
    // O relogio e independente de pc.imune, e conserva o resto do frame.
    while (state.remaining <= 1e-9 && pc.vidas > 0) {
        state.remaining += rules.damageInterval;
        pc.vidas = Math.max(0, pc.vidas - rules.damage);
        pc._bmLavaHit = rules.hitVisualSeconds;
        this.assets.play("damage");
        // Dano nao letal nao paralisa nem concede imunidade de combate.
        // A morte continua usando o tempo da animacao original.
        if (pc.vidas === 0) {
            pc.atingido = Math.max(pc.atingido || 0, 0.3);
            pc._bmLavaHit = Math.max(pc._bmLavaHit, pc.atingido);
        }
    }
};
