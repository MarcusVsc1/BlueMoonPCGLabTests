'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {patchScene,patchCollision}=require('../aplicar-projeteis.js');
const C=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../utils/CollisionSystem.js'),'utf8')+'\nCollisionSystem');
let count=0;
function test(name,f){f();count++;console.log('OK '+name);}
function eq(a,b){assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);}
function fixture(type=6,opts={}){
    const map={SIZE:32,COLUMNS:6,LINES:5,cells:Array.from({length:6},()=>Array.from({length:5},()=>({tipo:0})))};
    map.cells[2][1].tipo=type;
    const calls=[],stack=[];
    const ctx={globalAlpha:1,save(){stack.push(this.globalAlpha);},restore(){this.globalAlpha=stack.pop();}};
    const scene={map,stageIndex:0,spritesT:[],spritesTE:[],toRemove:[],ctx,cameraX:0,cameraY:0};
    const s={scene,x:48,y:48,w:12,h:12,vx:220,vy:0,frame:0,opacity:1,props:{tipo:'tiro',modelo:'fireball'},
        desenhar(ctx){ctx.globalAlpha=this.opacity;calls.push({x:this.x,y:this.y,alpha:ctx.globalAlpha,frame:this.frame});},...opts};
    scene[s.props.tipo==='tiro'?'spritesT':'spritesTE'].push(s);
    return {map,scene,s,calls};
}
function hit(f,dt=.2){C.moveProjectile(f.s,dt);C.cleanupProjectiles(f.scene,dt);return C.projectileFades(f.scene)[0];}
for(const type of [6,8,9,11,12,-1])test('dissipacao em parede/vazio '+type,()=>{const f=fixture(type);const ghost=hit(f);eq(f.s.x,58);assert.ok(f.scene.toRemove.includes(f.s));assert.ok(f.s._collisionExpired);assert.equal(ghost.duration,.12);eq(ghost.dx,16);eq(ghost.visual.x,58);});
for(const type of [7,10])test('dissipacao curta em bloqueio '+type,()=>{const f=fixture(type);const ghost=hit(f);eq(ghost.duration,.06);eq(ghost.dx,2);});
test('sem dano atras da parede e preserva alvo anterior',()=>{const f=fixture();C.moveProjectile(f.s,.2);assert.ok(C.intersects(f.s,{x:45,y:48,w:8,h:8}));assert.ok(!C.intersects(f.s,{x:110,y:48,w:12,h:12}));C.cleanupProjectiles(f.scene,.2);assert.ok(!C.intersects(f.s,{x:58,y:48,w:12,h:12}));assert.equal(C.projectileFades(f.scene)[0].visual.props,undefined);});
test('alvo ja atingido nao cria efeito de parede',()=>{const f=fixture();C.moveProjectile(f.s,.2);f.scene.toRemove.push(f.s);C.cleanupProjectiles(f.scene,.2);assert.equal(C.projectileFades(f.scene).length,0);assert.equal(f.scene.toRemove.length,1);});
test('movimento visual sem movimentar original e sem duplicar efeito',()=>{const f=fixture();const ghost=hit(f);f.scene.spritesT=[];C.cleanupProjectiles(f.scene,.06);eq(ghost.visual.opacity,.5);eq(ghost.visual.x,66);eq(f.s.x,58);eq(ghost.visual.frame,.48);C.cleanupProjectiles(f.scene,.06);assert.equal(C.projectileFades(f.scene).length,0);});
test('limite de mapa sem efeito',()=>{const f=fixture(0,{x:170});assert.equal(hit(f),undefined);assert.equal(f.s._projectileImpact.kind,'bounds');assert.ok(f.scene.toRemove.includes(f.s));});
test('atravessa intencional preservado',()=>{const f=fixture(6,{atravessa:1});assert.equal(hit(f),undefined);eq(f.s.x,92);assert.equal(f.scene.toRemove.length,0);});
test('efeitos separados por camada aliada e inimiga, alpha restaurado',()=>{const a=fixture(),b=fixture(6,{props:{tipo:'tiroE',modelo:'fireball'},opacity:.8});hit(a);hit(b);C.updateProjectileFades(b.scene,.06);C.drawProjectileFades(b.scene,false);assert.equal(b.calls.length,0);C.drawProjectileFades(b.scene,true);eq(b.calls[0].alpha,.4);eq(b.scene.ctx.globalAlpha,1);C.drawProjectileFades(a.scene,false);eq(a.calls[0].alpha,1);});
test('tiroQ preservado em camada inimiga',()=>{const f=fixture(6,{props:{tipo:'tiroQ'}});const ghost=hit(f);assert.equal(ghost.enemy,true);});
test('espada nao entra na dissipacao',()=>{const f=fixture(6,{props:{tipo:'tiro',modelo:'espada'}});assert.equal(hit(f),undefined);assert.equal(f.scene.toRemove.length,0);});
test('opacidade preexistente e toggled preservados',()=>{const f=fixture(6,{toggled:true,opacity:.9});const ghost=hit(f);eq(ghost.visual.opacity,.5);assert.equal(ghost.visual.toggled,false);});
test('rocha lenta preserva velocidade e nao avanca 16 px artificialmente',()=>{const f=fixture(6,{vx:20});const ghost=hit(f,1);eq(ghost.dx,2.4);});
test('troca de mapa, fase ou limpeza descarta efeitos',()=>{const f=fixture();hit(f);f.scene.stageIndex++;assert.equal(C.projectileFades(f.scene).length,0);f.s._collisionExpired=false;f.scene.toRemove=[];hit(f);C.clearProjectileFades(f.scene);assert.equal(C.projectileFades(f.scene).length,0);});
test('patch Scene preserva camadas, dt e limpeza; rejeita duplicacao',()=>{const source=`function Scene(){}\nScene.prototype.desenhar = function () {\n    for (var i = 0; i < this.spritesT.length; i++) {\n        this.spritesT[i].desenhar(this.ctx);\n    }\n    for (var i = 0; i < this.spritesTE.length; i++) {\n        this.spritesTE[i].desenhar(this.ctx);\n    }\n};\nScene.prototype.checaColisao = function (dt=1/60) {CollisionSystem.updateBoxes(this, dt); CollisionSystem.cleanupProjectiles(this);};\nScene.prototype.limparCena = function () {};`;const patched=patchScene(source);new vm.Script(patched);assert.match(patched,/drawProjectileFades\(this, false\)/);assert.match(patched,/drawProjectileFades\(this, true\)/);assert.match(patched,/cleanupProjectiles\(this, dt\)/);assert.match(patched,/clearProjectileFades\(this\)/);assert.throws(()=>patchScene(patched));assert.throws(()=>patchCollision(fs.readFileSync(path.join(__dirname,'../utils/CollisionSystem.js'),'utf8')));});
console.log(`${count} testes de dissipacao aprovados.`);
