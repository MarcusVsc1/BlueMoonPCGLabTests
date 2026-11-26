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
            playTheme(numero + 1);
        };
    };

    // BLUEMOON_30_40_ROOMS_V1: seis cristais em hexagono, em ordem crescente no sentido horario.
    const roomPortals = [
        { rooms: 6,  option: 0, x: 3.75, y: 2 },
        { rooms: 12, option: 1, x: 8.25, y: 2 },
        { rooms: 16, option: 2, x: 10.5, y: 4.5 },
        { rooms: 20, option: 3, x: 8.25, y: 7 },
        { rooms: 30, option: 4, x: 3.75, y: 7 },
        { rooms: 40, option: 5, x: 1.5,  y: 4.5 }
    ];
    var eventoInicial = function () {
        if (!cena1.sceneMessages.some(message => message.text === 'Blue Moon')) { /* BM_GAMEOVER_LOBBY_V3 */
            var fillStyle = 'rgba(255, 255, 255, 1)';
            var font = '15px Tahoma';
            var text;
            roomPortals.forEach(portal => {
                const label = portal.rooms + ' Salas';
                cena1.sceneMessages.push({ fillStyle, font, text: label,
                    x: portal.x * 32 + 16 - (portal.rooms < 10 ? 25 : 30),
                    y: portal.y * 32 + 39 });
            });
            fillStyle = `rgba(255, 255, 255, 1)`;
            font = "50px Medieval2";
            text = 'Blue Moon'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 110, y: 360 })
            font = "30px Medieval2";
            text = 'Roguelike'
            cena1.sceneMessages.push({ fillStyle: fillStyle, font: font, text: text, x: 155, y: 390 })
        }
        cena1.dialogo = BMTutorial.lobbyText(); /* BM_TUTORIAL_V1 */
        /* A lista de mensagens da cena e a fonte de verdade. */}

    roomPortals.forEach(portal => {
        spriteLista.push(this.criarTeleporte(portal.x, portal.y, 2, 2, 0,
            this.inicializarDungeonAleatoria(portal.option)));
    });

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
            BMGameOver.win(cena1); // BM_VICTORY_V1
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

GameManager.prototype.inicializarDungeonAleatoria = function (numero) {
    return function () {
        BMRun.request(cena1, numero, seedValueURL); // BM_RUN_V1
    };
}

GameManager.prototype.criarNovaDungeon = function (opcao) { // BM_LOADING_V1
    for(const _ of this.criarNovaDungeonEtapas(opcao)){};
};
GameManager.prototype.criarNovaDungeonEtapas = function* (opcao) {
    // BM_GAMEOVER_V1: cada geracao comeca no estado inicial da seed e dos IDs.
    random = new SeedGenerator(String(seedValueURL), 'sfc32');
    Room.id = 0; Play.id = 0; Play.boxId = 0;
    BMGameOver.start(cena1, opcao, seedValueURL);
    this.pc.atravessa = 0; // BM_NOCLIP_V2: nova partida sempre normal.

    // BLUEMOON_PERSISTENT_INVENTORY_V1: cada nova masmorra e uma nova partida.
    cena1.inventory = new Inventory();
    cena1.inventoryHUD = new InventoryHUD(cena1.inventory);
    this.pc.lavaImmunity = false;
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
        case 4:
            novaDungeon = { NUM_ROOMS: 30, MAP_SIZE: 90 };
            break;
        case 5:
            novaDungeon = { NUM_ROOMS: 40, MAP_SIZE: 105 };
            break;
    }

    var spriteLista = [];
    var eventoLista = [];

    var contador = 0;
    yield {phase:1,label:'Construindo salas e corredores'};
    console.time('createMap');
    this.dungeonGenerator = new DungeonGenerator(novaDungeon.MAP_SIZE, novaDungeon.NUM_ROOMS);
    var dungeonCriada = this.dungeonGenerator.createMap();
    while (!this.dungeonGenerator.sucesso) {
        console.log("Erro na criação do mapa")
        contador++
        yield {phase:1,label:`Reconstruindo salas e corredores (tentativa ${contador+1})`};
        Room.id = 0
        this.dungeonGenerator.graph = new Graph();
        var dungeonCriada = this.dungeonGenerator.createMap();
        console.log("Quantidade de vezes que a dungeon foi refeita: " + contador)
    }

    console.timeEnd('createMap');
    yield {phase:2,label:'Preparando o cenário'};

    mapa = new Grid({
        COLUMNS: this.dungeonGenerator.MAP_SIZE, LINES: this.dungeonGenerator.MAP_SIZE,
        assets: assetsMng, m: dungeonCriada
    });
    console.log("Kruskal com sucesso")
    var estagio = this.fabricaDeEstagios(mapa, spriteLista, eventoLista)
    this.estagios[0] = estagio

    CombatArenaAgent.ensureCombatRoomHook(); // BM_ARENA_INTEGRATION_V13
    yield {phase:3,label:'Distribuindo puzzles e desafios'};
    const puzzleManager = new PuzzleAgentsManager(this.dungeonGenerator.graph, true);
    yield* puzzleManager.populatePuzzlesEtapas();
    yield {phase:4,label:'Preparando arenas e mapa'};
    // BLUEMOON_COMBAT_ARENA_V1: todos os puzzles, portas e teleportes ja foram posicionados.
    CombatArenaAgent.finalize(this.dungeonGenerator.graph, this.estagios[0].mapa, cena1);
    // BM_DUNGEON_MAP_V1: apos toda a geracao, sem mudar puzzles ou quantidade de chaves.
    DungeonMapSystem.prepare(this.dungeonGenerator.graph, this.estagios[0].mapa, cena1);
    yield {phase:5,label:'Validando a geração inicial'};
    BMGameOver.prepare(cena1, this.dungeonGenerator.graph);
    this.pc.mana = 5

}

//direcao => 0: baixo 1: esquerda, 2: direita, 3: cima
//cria um inimigo passando como parâmetro seu tipo e sua posição X e Y
GameManager.prototype.criarInimigo = function (tipo, posX, posY) {
    var inimigo;
    switch (tipo) {
        //morcego
        case "morcego":
            inimigo = new Sprite({
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 40 + random.nextRandFloat() * 25, imgX: 0, imgY: 0,
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
        // BLUEMOON_SHIELD_ENEMY_V1
        case "escudeiro":
            inimigo = new ShieldEnemy(posX, posY);
            break;
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
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 29 + random.nextRandFloat() * 11, imgX: 0, imgY: 1,
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
                x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12, vm: 0, direcao: 0, imgX: 1, imgY: 3,
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
            droppable: false, inventoryKind: "consumable"
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
            droppable: false, inventoryKind: "permanent", permanentId: "lavaBoots"
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
        x: posX * 32 + 12, y: posY * 32 + 12, w: 24, h: 24, spriteSize: 48, vm: 0, imgX: 10, imgY: 1, event: evento, switchId: switchId,
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

// BM_HAZARDS_V2: cadencia da onda definida por nivel (atualizada em BM_FIRE_WAVE_V1).
function bmFireSpreadSeconds(level) {
    const n = Math.max(1, Math.min(4, Math.trunc(Number(level) || 1)));
    return [0.40, 0.35, 0.30, 0.26][n - 1]; // BM_FIRE_WAVE_V1: mesma cadencia para raiz e filhos.
}
GameManager.prototype.criarFireball = function (posX, posY, level, fireplaces) {
    return new Sprite({
        x: posX * 32 + 16, y: posY * 32 + 16, posX: posX, posY: posY, w: 32, h: 32, vm: 0, imgX: 0, imgY: 1, globalCD: bmFireSpreadSeconds(level), firePlaces: fireplaces == null ? [{ x: posX, y: posY }] : fireplaces,
        contador: 0, comportar: multiplicarFogo, imagem: "flame", desenhar: desenhaTiro, level: level, toggled: false, props: { tipo: "tiroE" }
    });
}