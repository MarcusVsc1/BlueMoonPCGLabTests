/*
variaveis globais:
0: libera a passagem do estagio 3, derrotando os inimigos do 4 e do 5
*/
function GameManager(pc) {
    this.pc = pc;
    this.dungeonGenerator = null
    this.estagios = [];
    this.criarEstagios();
    this.tema = new Audio();
    this.globalVar = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

/*modelo de mapa
mapa = new Grid({COLUMNS:12, LINES:10, assets: assetsMng, m:
        [
        [6,6,6,6,6,6,6,6,6,6,6,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,0,0,0,0,0,0,0,0,0,0,6],
        [6,6,6,6,6,6,6,6,6,6,6,6],
        ]
        });*/

//contem os dados de cada estágio do jogo
GameManager.prototype.criarEstagios = function () {
    var spriteLista = [];
    var eventoLista = [];
    //estagio mockup

    mapa = new Grid({
        COLUMNS: 110,
        LINES: 110,
        assets: assetsMng,
        m: Array.from({ length: 110 }, () => Array(110).fill(9)),
    });

    this.estagios.push(this.fabricaDeEstagios(mapa, spriteLista, eventoLista));

    //fase inicial
    mapa = new Grid({
        COLUMNS: 13, LINES: 10, assets: assetsMng, m:
            [
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
            ]
    });

    var evento = function (numero) {
        return function () {
            gerenciador.criarNovaDungeon(numero);
            playTheme(numero + 1 == 4 ? 3 : numero + 1);
        };
    };

    var eventoInicial = function () {
        if (!this.preencheu) {
            var fillStyle = 'rgba(255, 255, 255, 1'
            var font = "15px Tahoma";
            var text = '6 Salas'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 55, y: 103 })
            var text = '16 Salas'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 307, y: 103 })
            var text = '12 Salas'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 52, y: 262 })
            var text = '20 Salas'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 307, y: 262 })

            fillStyle = `rgba(255, 255, 255, 1)`;
            font = "50px Medieval";
            text = 'Blue Moon'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 110, y: 360 })
            font = "30px Medieval";
            text = 'Roguelike'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 155, y: 390 })
        }
        cena1.dialogo = "Controles: Direcionais WASD, K: Espada, J: Magia. P: Reseta sokoban"
        this.preencheu = true
    }

    spriteLista.push(this.criarTeleporte(2, 2, 2, 2, 0, evento(0)));
    spriteLista.push(this.criarTeleporte(2, 7, 2, 2, 0, evento(1)));
    spriteLista.push(this.criarTeleporte(10, 2, 2, 2, 0, evento(2)));
    spriteLista.push(this.criarTeleporte(10, 7, 2, 2, 0, evento(3)));

    eventoLista.push(eventoInicial)

    this.estagios.push(this.fabricaDeEstagios(mapa, spriteLista, eventoLista));

    // tela de game over

    mapa = new Grid({
        COLUMNS: 12, LINES: 10, assets: assetsMng, m:
            [
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
                [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
            ]
    });
    spriteLista = [];
    eventoLista = [];

    spriteLista.push(this.criarObjeto("derrota", 5.5, 4.5, 1));

    evento1 = function () {
        pc.comportar = function () { };
        pc.desenhar = function () { };
        cena1.dialogo = "Você perdeu! A pequena Lyra não consegue salvar seu pai..._Aperte F5 para reiniciar o jogo."
        gerenciador.tema.src = "assets/gameover.ogg";
        gerenciador.tema.loop = false;
        gerenciador.tema.play();

        var idx = cena1.estagio.eventos.indexOf(this);
        cena1.estagio.eventos.splice(idx, 1);

    }

    eventoLista.push(evento1);
    this.estagios.push(this.fabricaDeEstagios(mapa, spriteLista, eventoLista));

    //chefe

    mapa = new Grid({
        COLUMNS: 12, LINES: 10, assets: assetsMng, m:
            [
                [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
                [6, 6, 6, 0, 0, 0, 0, 0, 0, 6, 6, 6],
                [6, 6, 0, 0, 6, 0, 0, 6, 0, 0, 6, 6],
                [6, 0, 0, 6, 5.1, 5.4, 5.4, 5.7, 6, 0, 0, 6],
                [6, 0, 0, 0, 5.2, 5.5, 5.5, 5.8, 0, 0, 0, 6],
                [6, 0, 0, 0, 5.2, 5.5, 5.5, 5.8, 0, 0, 0, 6],
                [6, 0, 0, 6, 5.3, 5.6, 5.6, 5.9, 6, 0, 0, 6],
                [6, 6, 0, 0, 6, 3.5, 3, 6, 0, 0, 6, 6],
                [6, 6, 6, 0, 0, 3.5, 3, 0, 0, 6, 6, 6],
                [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
            ]
    });
    spriteLista = [];
    eventoLista = [];

    //spriteLista.push(this.criarTeleporte(5.2,0.2,6,8.9,2));
    spriteLista.push(this.criarInimigo("bruxa", 5.5, 4.5));

    evento2 = function () {
        if (cena1.spritesE.length == 0) {
            cena1.dialogo = "";
            gerenciador.tema.src = "assets/final.ogg";
            gerenciador.tema.loop = true;
            gerenciador.tema.play();
            cena1.dialogo = "Parabéns, você venceu o jogo. Aperte F5 para reiniciar";
            var idx = cena1.estagio.eventos.indexOf(this);
            cena1.estagio.eventos.splice(idx, 1);
        }


    }
    evento1 = function () {
        gerenciador.tema.src = "assets/boss.mp3";
        gerenciador.tema.loop = true;
        gerenciador.tema.play();
        cena1.dialogo = "Você chegou ao fim da masmorra! Derrote a bruxa!";
        var idx = cena1.estagio.eventos.indexOf(this);
        cena1.estagio.eventos.splice(idx, 1);
    }

    eventoLista.push(evento2);
    eventoLista.push(evento1);
    this.estagios.push(this.fabricaDeEstagios(mapa, spriteLista, eventoLista));


}

GameManager.prototype.criarNovaDungeon = function (opcao) {
    var novaDungeon
    switch (opcao) {
        case 0:
            novaDungeon = { NUM_ROOMS: 6, MAP_SIZE: 45 }
            break;
        case 1:
            novaDungeon = { NUM_ROOMS: 12, MAP_SIZE: 55 }
            break;
        case 2:
            novaDungeon = { NUM_ROOMS: 16, MAP_SIZE: 65 }
            break;
        case 3:
            novaDungeon = { NUM_ROOMS: 20, MAP_SIZE: 70 }
            break;
    }

    var spriteLista = [];
    var eventoLista = [];

    var contador = 0;
    console.time('createMap');
    this.dungeonGenerator = new DungeonGenerator(novaDungeon.MAP_SIZE, novaDungeon.NUM_ROOMS);
    var dungeonCriada = this.dungeonGenerator.createMap();
    while (!this.dungeonGenerator.sucesso) {
        console.log("Erro na criação do mapa")
        contador++
        Room.id = 0
        this.dungeonGenerator.graph = new Graph();
        var dungeonCriada = this.dungeonGenerator.createMap();
        console.log("Quantidade de vezes que a dungeon foi refeita: " + contador)
    }

    console.timeEnd('createMap');

    mapa = new Grid({
        COLUMNS: this.dungeonGenerator.MAP_SIZE, LINES: this.dungeonGenerator.MAP_SIZE,
        assets: assetsMng, m: dungeonCriada
    });
    console.log("Kruskal com sucesso")
    var estagio = this.fabricaDeEstagios(mapa, spriteLista, eventoLista)
    this.estagios[0] = estagio

    new PuzzleAgentsManager(this.dungeonGenerator.graph)

}

//direcao => 0: baixo 1: esquerda, 2: direita, 3: cima
//cria um inimigo passando como parâmetro seu tipo e sua posição X e Y
GameManager.prototype.criarInimigo = function (tipo, posX, posY) {
    var inimigo;
    switch (tipo) {
        //morcego
        case "morcego":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 40 + Math.random() * 25, imgX: 0, imgY: 0,
                imagem: "monster", comportar: persegue(this.pc), props: { tipo: "npc" }
            });
            break;
        //diabinho
        case "diabinho":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 20, imgX: 0, imgY: 1,
                imagem: "monster", comportar: persegue(this.pc), props: { tipo: "npc" }
            });
            break;
        //caveira
        case "caveira":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 30, imgX: 1, imgY: 1,
                imagem: "monster", comportar: persegue(this.pc), props: { tipo: "npc" }
            });
            break;
        //ogro
        case "ogro":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 20, imgX: 2, imgY: 0,
                vidas: 2, maxVidas: 2, imagem: "monster", comportar: persegue(this.pc), props: { tipo: "npc" }
            });
            break;
        //touro a esquerda
        case 4:
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, imgX: 3, imgY: 0, vx: 0, vy: 0,
                direcao: 1, imagem: "monster", comportar: atirarRochas, props: { tipo: "npc" }
            });
            break;
        //touro a direita
        case 5:
            inimigo = new Sprite({
                x: posX * 32 + 26, y: posY * 32 + 16, w: 12, h: 12, vm: 0, imgX: 3, imgY: 0, vx: 0, vy: 0,
                direcao: 2, imagem: "monster", comportar: atirarRochas, props: { tipo: "npc" }
            });
            break;
        //necromante
        case "necromante":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, imgX: 3, imgY: 1, vx: 0, vy: 0, globalCD: 2.0,
                vidas: 1, maxVidas: 1, imagem: "monster", comportar: necromancia, props: { tipo: "npc" }
            });
            break;
        // touro para baixo
        case 8:
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, imgX: 3, imgY: 0, vx: 0, vy: 0,
                direcao: 0, imagem: "monster", comportar: atirarRochas, props: { tipo: "npc" }
            });
            break;
        case "bruxa":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, imgX: 1, imgY: 1, vx: 0, vy: 0, vidas: 18,
                direcao: 0, imagem: "bruxa", globalCD: 2, fireCount: 0, mod: 0, comportar: bruxaria, baseCD: 2, props: { tipo: "npc" }
            });
            break;
        case "ignisFatuus":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 29 + Math.random() * 11, imgX: 0, imgY: 1,
                imagem: "flame2", atravessa: 1, comportar: persegue(pc), props: { tipo: "npc" }
            });
            break;
    }
    return inimigo;
}

//criador de teleporte
GameManager.prototype.criarTeleporte = function (posX, posY, telX, telY, idxMapa, evento) {
    var teleporte = new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 0, imgX: 2, imgY: 0, tX: telX * 32, tY: telY * 32,
        imagem: "crystal", desenhar: desenhaTiro, evento: evento, props: { tipo: "teleporte", idx: idxMapa }
    });
    return teleporte;
}

//cria estagios
GameManager.prototype.fabricaDeEstagios = function (map, spriteLista, eventoLista) {
    var estagio = {
        mapa: null,
        eventos: [],
        sprites: []
    }
    estagio.mapa = map;
    estagio.sprites = spriteLista;
    estagio.eventos = eventoLista;
    return estagio;
}

//criador de eventador
GameManager.prototype.criarEventador = function (posX, posY, evento) {
    var teleporte = new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 0, imgX: 3, imgY: 1, evento: evento,
        imagem: "flame", desenhar: desenhaTiro, props: { tipo: "evento" }
    });
    return teleporte;
}

//cria objetos
GameManager.prototype.criarObjeto = function (tipo, posX, posY, direct) {
    var objeto;
    switch (tipo) {
        //gargula
        case "gargula":
            objeto = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: direct, imgX: 0, imgY: 0,
                imagem: "gargoyle", mover: moverObjeto, props: { tipo: "objeto" }
            });
            break;
        //lyra caida
        case "derrota":
            objeto = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 1, imgX: 2, imgY: 1,
                imagem: "expressoes", mover: moverObjeto, props: { tipo: "objeto" }
            });
            break;
        case "biribinha":
            objeto = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 0, imgX: 3, imgY: 0,
                imagem: "gargoyle", desenhar: desenhaTiro, props: { tipo: "objeto" }
            });
            break;
    }
    return objeto;
}

//cria poder de recuperar hp e mana
GameManager.prototype.criarPoder = function (tipo, posX, posY) {
    var poder;
    switch (tipo) {
        case 'hp':
            poder = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 0, imgX: 0, imgY: 1,
                imagem: "crystal", swCD: 0, desenhar: desenhaTiro, props: { tipo: "poder", modelo: "hp" }
            });
            break;
        case 'mana':
            poder = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 0, imgX: 1, imgY: 1,
                imagem: "crystal", swCD: 0, desenhar: desenhaTiro, props: { tipo: "poder", modelo: "mana" }
            });
            break;
        case 'heart':
            poder = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 36, h: 36, vm: 0, direcao: 0, imgX: 0, imgY: 0,
                imagem: "heart2", swCD: 2, spriteSize: 32, desenhar: desenharColecionavel, props: { tipo: "poder", modelo: "heart" }
            });
            break;
        case 'manaHeart':
            poder = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 36, h: 36, vm: 0, direcao: 0, imgX: 0, imgY: 0,
                imagem: "manaHeart", swCD: 2, spriteSize: 32, desenhar: desenharColecionavel, props: { tipo: "poder", modelo: "manaHeart" }
            });
            break;
    }
    return poder;
}

//cria uma chave.
GameManager.prototype.criarChave = function (posX, posY, keyId) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 32, h: 32, spriteSize: 32, vm: 0, imgX: 0, imgY: 0, keyId: keyId,
        imagem: "key_" + keyId, desenhar: desenharChave, props: {
            tipo: "objeto", subtipo: "colecionavel",
            mensagem: 'Adquirida Chave ' + KeyColorEnum[keyId],
            droppable: true
        }
    });
}

//cria uma porta.
GameManager.prototype.criarPorta = function (posX, posY, doorId) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, posX: posX, posY: posY, w: 32, h: 32, vm: 0, imgX: 2, imgY: 1, doorId: doorId,
        imagem: "door_" + doorId, desenhar: desenharPorta, props: { tipo: "objeto", subtipo: "porta" }
    });
}

GameManager.prototype.criarBotaAntiLava = function (posX, posY) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 32, h: 32, spriteSize: 16, vm: 0, imgX: 17, imgY: 0,
        imagem: "gear", desenhar: desenharColecionavel, props: {
            tipo: "objeto", subtipo: "colecionavel", event: "lava",
            mensagem: 'Adquirida Bota Antilava',
            droppable: true
        }
    });
}

GameManager.prototype.criarAlavanca = function (posX, posY, evento, coordenadas) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 32, h: 32, spriteSize: 48, vm: 0, imgX: 2, imgY: 0, event: evento,
        imagem: "switch", desenhar: desenharAlavanca, coordenadas: coordenadas, toggled: false, props: { tipo: "objeto", subtipo: "alavanca" }
    });
}

GameManager.prototype.criarInterruptor = function (posX, posY, evento, switchId) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 32, h: 32, spriteSize: 48, vm: 0, imgX: 10, imgY: 1, event: evento, switchId: switchId,
        imagem: "switch", desenhar: desenharAlavanca, toggled: false, props: { tipo: "objeto", subtipo: "alavanca" }
    });
}

GameManager.prototype.criarGoalSokoban = function (posX, posY) {
    return new Sprite({
        x: posX * 32, y: posY * 32, w: 32, h: 32, vm: 0, posX: posX, posY: posY,
        desenhar: desenharQuadradoComX, props: { tipo: "goal" }
    });
}

GameManager.prototype.criarCaixaSokoban = function (posX, posY) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, posX: posX, posY: posY, w: 32, h: 32, vm: 0, imagem: "box_",
        initialX: posX, initialY: posY, desenhar: desenharCaixa, props: { tipo: "box", placed: false }
    });
}

GameManager.prototype.criarDispositivoAntiLava = function (x, y, evento, room) {
    return new Sprite({
        x: x, y: y, w: 32, h: 32, spriteSize: 48, vm: 0, imgX: 0, imgY: 0, event: evento,
        imagem: "switch", desenhar: desenharAlavanca, room: room, toggled: false, props: { tipo: "objeto", subtipo: "alavanca" }
    });
}

GameManager.prototype.criarEspinho = function (posX, posY, startCd, repeatCd) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, w: 32, h: 32, spriteSize: 48, vm: 0, imgX: 0, imgY: 1, startCd: startCd, repeatCd: repeatCd,
        contador: 0, comportar: ativarEspinho, imagem: "object", desenhar: desenharEspinho, toggled: false, props: { tipo: "espinho" }
    });
}

GameManager.prototype.criarFireball = function (posX, posY, level, fireplaces) {
    return new Sprite({
        x: posX * 32 + 32, y: posY * 32 + 32, posX: posX, posY: posY, w: 32, h: 32, vm: 0, imgX: 0, imgY: 1, globalCD: 0.4 - (level - 1) * 0.1, firePlaces: fireplaces == null ? [{ x: posX, y: posY }] : fireplaces,
        contador: 0, comportar: multiplicarFogo, imagem: "flame", desenhar: desenhaTiro, level: level, toggled: false, props: { tipo: "tiroE" }
    });
}