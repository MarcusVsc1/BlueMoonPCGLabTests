'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

const C=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../utils/CollisionSystem.js'),'utf8')+'\nCollisionSystem');
let count=0;function test(name,fn){fn();count++;console.log('OK '+name);}
const map=(w=6,h=5)=>({SIZE:32,COLUMNS:w,LINES:h,cells:Array.from({length:w},()=>Array.from({length:h},()=>({tipo:0})))});
const sprite=(m,opts={})=>({x:48,y:48,w:12,h:12,vx:0,vy:0,atravessa:0,scene:{map:m,toRemove:[],sokobans:[],spritesT:[],spritesTE:[]},...opts});
const eq=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(const [label,vx,vy,wx,wy,ex,ey] of [['direita',200,0,2,1,58,48],['esquerda',-200,0,0,1,38,48],['baixo',0,200,1,2,48,58],['cima',0,-200,1,0,48,38]]) test('parede '+label,()=>{const m=map();m.cells[wx][wy].tipo=6;const s=sprite(m,{vx,vy});C.move(s,1);eq(s.x,ex);eq(s.y,ey);});
test('quina diagonal',()=>{const m=map();m.cells[2][2].tipo=6;const s=sprite(m,{vx:20,vy:20,x:55,y:55});C.move(s,1);eq(s.x,75);eq(s.y,58);});
test('hitbox cobre mais que uma linha',()=>{const m=map();m.cells[2][2].tipo=6;const s=sprite(m,{vx:40,y:61});C.move(s,1);eq(s.x,58);});
test('desliza na parede',()=>{const m=map();m.cells[2][1].tipo=6;m.cells[2][2].tipo=6;const s=sprite(m,{vx:20,vy:20,x:58});C.move(s,1);eq(s.x,58);eq(s.y,68);});
test('nao atravessa parede distante',()=>{const m=map();m.cells[3][1].tipo=11;const s=sprite(m,{vx:150});C.move(s,1);eq(s.x,90);});
test('borda direita e inferior retangular',()=>{const m=map(7,3);const s=sprite(m,{vx:1000,vy:1000});C.move(s,1);eq(s.x,218);eq(s.y,90);});
test('borda esquerda e superior',()=>{const s=sprite(map(),{vx:-1000,vy:-1000});C.move(s,1);eq(s.x,6);eq(s.y,6);});
test('spawn na borda pode sair',()=>{const s=sprite(map(),{x:1,y:1,vx:20,vy:20});C.move(s,1);eq(s.x,26);eq(s.y,26);});
test('atravessa preservado',()=>{const m=map();m.cells[2][1].tipo=11;const s=sprite(m,{vx:100,atravessa:1});C.move(s,1);eq(s.x,148);});
test('lava e gelo passaveis',()=>{const m=map();m.cells[2][1].tipo=5;m.cells[3][1].tipo=1;const s=sprite(m,{vx:100});C.move(s,1);eq(s.x,148);});
test('diagonal normalizada no jogador',()=>{const s=sprite(map(),{vx:30,vy:30,standardSpd:30,props:{tipo:'pc'}});C.move(s,1);eq(Math.hypot(s.x-48,s.y-48),30);});
test('dt zero seguro',()=>{const s=sprite(map(),{vx:20,vy:20});C.move(s,0);eq(s.x,48);eq(s.y,48);});
test('coordenadas da celula atualizadas',()=>{const s=sprite(map(),{vx:32});C.move(s,1);assert.equal(s.mc,2);assert.equal(s.ml,1);});
test('hitbox independente e offset',()=>{const s=sprite(map(),{collisionBox:{w:20,h:8,offsetX:2}});assert.equal(C.box(s).x,50);assert.equal(C.box(s).w,20);assert.equal(C.box(s,'hurtBox').w,12);});
for(const type of [6,7,9,10,11,12]) test('projetil bloqueado no tile '+type,()=>{const m=map();m.cells[3][1].tipo=type;const s=sprite(m,{vx:140,props:{tipo:'tiro',modelo:'fireball'}});C.moveProjectile(s,1);eq(s.x,90);assert.equal(s._collisionWall,true);});
test('projetil cruza tile liberado com atravessa',()=>{const m=map();m.cells[2][1].tipo=6;const s=sprite(m,{vx:80,atravessa:1});C.moveProjectile(s,1);eq(s.x,128);assert.ok(!s._collisionWall);});
test('projetil detecta alvo no caminho',()=>{const m=map();m.cells[4][1].tipo=6;const s=sprite(m,{vx:160,props:{tipo:'tiro',modelo:'fireball'}});C.moveProjectile(s,1);assert.ok(C.intersects(s,sprite(m,{x:80})));assert.ok(!C.intersects(s,sprite(m,{x:155})));});
test('projetil tangente desliza sem falso impacto',()=>{const m=map();m.cells[2][2].tipo=6;const s=sprite(m,{vx:80,y:58});C.moveProjectile(s,1);eq(s.x,128);});
test('limpeza de projeteis',()=>{const s=sprite(map());s._collisionWall=true;s.scene.spritesT.push(s);C.cleanupProjectiles(s.scene);assert.equal(s.scene.toRemove[0],s);});
function puzzle(){const m=map(),pc=sprite(m,{x:48,y:80,direcao:2,props:{tipo:'pc'}}),scene=pc.scene;scene.pc=pc;const b=(x,y)=>({x:x*32+16,y:y*32+16,w:32,h:32,posX:x,posY:y,initialX:x,initialY:y,scene,props:{tipo:'box',placed:false},swCD:0});const boxes=[b(2,2),b(4,2)];for(const b of boxes)m.cells[b.posX][b.posY].tipo=7;const p={boxes,goals:[],room:{cells:m.cells.flatMap((col,x)=>col.map((_,y)=>({x,y})))},startCell:{x:2,y:1}};scene.sokobans=[p];return {m,pc,scene,boxes,p};}
for(let d=0;d<4;d++) test('espada ancorada na mao '+d,()=>{const pc=sprite(map(),{x:80,y:80}),s=sprite(pc.scene.map,{pc,direcao:d,frame:0,props:{modelo:'espada'}});C.sword(s,1/60);const dir=C.direction(d),box=C.box(s,'attackBox');eq(box.x,s._swordHand.x+dir.x*10);eq(box.y,s._swordHand.y+dir.y*10);eq(dir.x?box.w:box.h,16);pc.x+=4;C.swordPose(s);eq(C.box(s,'attackBox').x,box.x+4);});
test('espada expirada nao colide',()=>{const pc=sprite(map()),s=sprite(pc.scene.map,{pc,direcao:2,frame:4,props:{modelo:'espada'}});C.sword(s,.1);assert.ok(!C.intersects(s,sprite(pc.scene.map,{x:s.x,y:s.y})));});
test('empurrar caixa valida',()=>{const {m,pc,boxes}=puzzle();assert.equal(C.pushBox(boxes[0],pc),true);assert.equal(boxes[0].posX,3);assert.equal(m.cells[2][2].tipo,0);assert.equal(m.cells[3][2].tipo,11);});
test('nao empilha caixas',()=>{const {m,pc,boxes}=puzzle();m.cells[3][2].tipo=7;assert.equal(C.pushBox(boxes[0],pc),false);});
test('nao empurra por diagonal ou lado errado',()=>{const {pc,boxes}=puzzle();pc.y=48;assert.equal(C.pushBox(boxes[0],pc),false);});
test('regra esquerda bloqueia piso nao zero',()=>{const {m,pc,boxes}=puzzle();pc.x=112;pc.direcao=1;m.cells[1][2].tipo=5;assert.equal(C.pushBox(boxes[0],pc),false);});
test('caixa nao sai da sala',()=>{const {pc,boxes,p}=puzzle();p.room.cells=p.room.cells.filter(c=>c.x!==3);assert.equal(C.pushBox(boxes[0],pc),false);});
test('uma caixa por ataque',()=>{const {scene,pc,boxes}=puzzle();const s=sprite(scene.map,{pc,direcao:2,frame:0,props:{modelo:'espada'},scene});C.sword(s,1/60);scene.spritesT=[s];C.updateBoxes(scene,1/60);assert.equal(boxes[0].posX,3);assert.equal(s._pushedBox,true);C.updateBoxes(scene,1);assert.equal(boxes[0].posX,3);});
test('cooldown sem tiros',()=>{const {scene,boxes}=puzzle();boxes[0].swCD=.4;C.updateBoxes(scene,.2);eq(boxes[0].swCD,.2);C.updateBoxes(scene,.2);eq(boxes[0].swCD,0);});
test('reset com origens sobrepostas a iniciais',()=>{const {m,scene,boxes,p}=puzzle();m.cells[2][2].tipo=0;boxes[0].posX=4;boxes[1].posX=3;m.cells[3][2].tipo=11;C.resetPuzzle(p,scene);assert.equal(m.cells[2][2].tipo,11);assert.equal(m.cells[4][2].tipo,11);assert.equal(m.cells[3][2].tipo,0);assert.equal(scene.pc.x,48);});
console.log(`${count} testes de regressao aprovados.`);
