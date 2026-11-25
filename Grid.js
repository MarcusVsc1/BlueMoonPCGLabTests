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

// BlueMoon - autotile visual A2/A4-top, 24px por quadrante, 48px por tile fonte.
// Nenhum tipo de celula e alterado. A tabela e calculada a partir dos vizinhos.
// BM_AUTOTILE_CONECTIVIDADE_V1 - continuidade visual de paredes/buracos e barreiras de arena.
// Mantem as celulas originais; apenas a renderizacao e a leitura visual de vizinhos mudam.
// BM_AUTOTILE_CONECTIVIDADE_V2 - continuidade visual de paredes/buracos e barreiras de arena.
// Mantem as celulas originais; apenas a renderizacao e a leitura visual de vizinhos mudam.
const BMAutoTile = (() => {
    const dirs = [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[1,1],[-1,1]];
    const cardinals = dirs.slice(0,4);
    const cornerPairs = [[0,1],[1,2],[2,3],[3,0]];
    const isHole = t => t === -1 || t === 8 || t === 9;
    const type = (g,x,y) => g.cells[x]?.[y]?.tipo;
    const walk = t => [0,1,2,3,3.5,4,5,7,10].includes(t) || (t > 5 && t < 6);
    const wallVisual = t => t === 13 ? 6 : (t === 6 || t === 11 ? t : null);
    const has = (mask,i) => (mask & (1 << i)) !== 0;

    // Cada quadrante possui 5 possibilidades: canto exterior, aresta vertical,
    // aresta horizontal, canto interior, e interior cheio. Diagonal importa
    // somente quando as duas direcoes cardinais estao conectadas.
    const corners = [
        [0,3,4, 0,2, 2,2, 0,4, 2,0, 2,4], // superior esquerdo
        [0,1,5, 3,2, 1,2, 3,4, 3,0, 1,4], // superior direito
        [2,3,7, 0,5, 2,5, 0,3, 2,1, 2,3], // inferior esquerdo
        [2,1,6, 3,5, 1,5, 3,3, 3,1, 1,3]  // inferior direito
    ];
    const recipes = Array.from({length:256},(_,mask)=>corners.map(q=>{
        const v=has(mask,q[0]),h=has(mask,q[1]),d=has(mask,q[2]);
        const k=!v&&!h?3:!v?5:!h?7:!d?9:11;
        return [q[k]*24,q[k+1]*24];
    }));

    // Duas etapas locais e deterministicas. Nao ha busca recursiva,
    // nem cache persistente que sobreviva a mudancas do mapa.
    function baseType(g,x,y) {
        const raw=type(g,x,y);
        return raw===13 ? 6 : raw;
    }
    function cornerType(g,x,y,read) {
        const raw=baseType(g,x,y);
        if(raw!==9) return raw;
        let match=0;
        for(const [a,b] of cornerPairs) {
            const [ax,ay]=cardinals[a], [bx,by]=cardinals[b];
            // Teste barato primeiro: sem piso diagonal, nao ha canto.
            if(!walk(type(g,x+ax+bx,y+ay+by))) continue;
            const wa=wallVisual(read(g,x+ax,y+ay));
            if(!wa || wa!==wallVisual(read(g,x+bx,y+by))) continue;
            if(match && match!==wa) return 9;
            match=wa;
        }
        return match || 9;
    }
    function firstPass(g,x,y) { return cornerType(g,x,y,baseType); }
    function visualType(g,x,y) {
        const first=firstPass(g,x,y);
        return first!==9 ? first : cornerType(g,x,y,firstPass);
    }

    function maskFor(g,x,y,t){
        let mask=0;
        for(let i=0;i<dirs.length;i++){
            const [dx,dy]=dirs[i],n=visualType(g,x+dx,y+dy);
            if(isHole(t)?(isHole(n)||n===undefined):n===t)mask|=1<<i;
        }
        return mask;
    }

    function draw(g,ctx,scene,x,y,img){
        const raw=type(g,x,y);
        if(raw!==6&&raw!==11&&raw!==13&&!isHole(raw))return false;
        const z=g.SIZE,dx=x*z-scene.cameraX,dy=y*z-scene.cameraY;
        if(Number.isFinite(scene.w)&&Number.isFinite(scene.h)&&scene.w>0&&scene.h>0&&
            (dx+z<=0||dy+z<=0||dx>=scene.w||dy>=scene.h))return true;
        const t=visualType(g,x,y);
        const ox=isHole(t)?384:480,oy=isHole(t)?432:t===6?288:432;
        const mask=maskFor(g,x,y,t);

        // Fundo externo: mantenha preto puro apenas em vazio livre.
        // Se houver parede adjacente, desenhe a borda correspondente para
        // preservar a face inferior das paredes e a continuidade nos cantos.
        if(isHole(t)&&mask===255){
            ctx.drawImage(img,408,504,48,48,dx,dy,z,z);return true;
        }

        if((mask&15)===0){ctx.drawImage(img,ox,oy,48,48,dx,dy,z,z);return true;}
        const h=z/2;
        for(let i=0;i<4;i++){
            const [sx,sy]=recipes[mask][i];
            ctx.drawImage(img,ox+sx,oy+sy,24,24,dx+(i%2)*h,dy+(i>>1)*h,h,h);
        }
        return true;
    }

    return Object.freeze({draw,maskFor,recipes,visualType});
})();;

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
            // BM_AUTOTILE_V1: desenho apenas; as celulas continuam intactas.
            if (BMAutoTile.draw(this, ctx, scene, c, l, standardTileset)) continue;
            switch (this.cells[c][l].tipo) {
                case -1:
                    //fundo preto de buraco
                    y = 3;
                    x = 4;
                    positionX = 1;
                    positionY = 3;
                    break;
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
                case 13: // BM_ARENA_VISUAL_V14: barreira de arena, recorte direto (528,432,48,48).
                    ctx.drawImage(this.assets.img("cenario"), 528, 432, 48, 48,
                        c * this.SIZE - scene.cameraX, l * this.SIZE - scene.cameraY,
                        this.SIZE, this.SIZE);
                    continue; // proxima celula: nao herdar o tile anterior.
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