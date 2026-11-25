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
const BMAutoTile = (() => {
    const dirs = [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[1,1],[-1,1]];
    const isHole = t => t === -1 || t === 8 || t === 9;
    const isWall = t => t === 6 || t === 11 || t === 12;
    const type = (g,x,y) => g.cells[x]?.[y]?.tipo;
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
    function maskFor(g,x,y,t){
        let mask=0;
        for(let i=0;i<dirs.length;i++){
            const [dx,dy]=dirs[i],n=type(g,x+dx,y+dy);
            if(isHole(t)?(isHole(n)||n===undefined):n===t)mask|=1<<i;
        }
        return mask;
    }
    function draw(g,ctx,scene,x,y,img){
        const t=type(g,x,y);
        if(t!==6&&t!==11&&!isHole(t))return false;
        const z=g.SIZE,dx=x*z-scene.cameraX,dy=y*z-scene.cameraY;
        // Apenas os tiles deste modulo sao descartados fora da viewport;
        // o desenho legado dos outros tiles permanece inalterado.
        if(Number.isFinite(scene.w)&&Number.isFinite(scene.h)&&scene.w>0&&scene.h>0&&
            (dx+z<=0||dy+z<=0||dx>=scene.w||dy>=scene.h))return true;
        const ox=isHole(t)?384:480,oy=isHole(t)?432:t===6?288:432;
        const mask=maskFor(g,x,y,t);
        // Fundo externo: mantenha preto onde nao ha piso adjacente.
        // O tipo 8 representa o buraco de alavanca e sempre tem borda.
        if(isHole(t)&& (mask===255 || (t!==8&&dirs.every(([a,b])=>{
            const n=type(g,x+a,y+b);return n===undefined||isHole(n)||isWall(n);
        })))){
            // BM_AUTOTILE_FACES_V1: fundo preto, mas preserve a face que desce da parede ao norte.
            ctx.drawImage(img,408,504,48,48,dx,dy,z,z);
            const north = typeof visualType === 'function' ? visualType(g,x,y-1) : type(g,x,y-1);
            if(t===9 && isWall(north)) {
                const half=z/2;
                // A borda norte do autotile de buraco (y=480) contem a face
                // sombreada original. Mesmos quadrantes do caminho normal.
                const edgeMask=mask & ~1;
                for(let i=0;i<2;i++) {
                    const [sx,sy]=recipes[edgeMask][i];
                    ctx.drawImage(img,ox+sx,oy+sy,24,24,dx+i*half,dy,half,half);
                }
            }
            return true;
        }
        // Forma isolada: o quadrante de amostra do A2 e a forma completa.
        // O bloco completo tambem preserva o aspecto de um pilar isolado.
        if((mask&15)===0){ctx.drawImage(img,ox,oy,48,48,dx,dy,z,z);return true;}
        const h=z/2;
        for(let i=0;i<4;i++){
            const [sx,sy]=recipes[mask][i];
            ctx.drawImage(img,ox+sx,oy+sy,24,24,dx+(i%2)*h,dy+(i>>1)*h,h,h);
        }
        return true;
    }
    return Object.freeze({draw,maskFor,recipes});
})();

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