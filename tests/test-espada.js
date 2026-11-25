'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const {patchDrawing}=require('./aplicar-espada.js');
let reads=0;
class Canvas {
  constructor(w,h){this.width=w;this.height=h;}
  getContext(){const canvas=this;let img,src;return {drawImage(i,...args){img=i;src=args.slice(0,4);},getImageData(){reads++;if(img.tainted)throw Error('tainted');const [sx,sy,w,h]=src;const data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data[(y*w+x)*4+3]=img.alpha(x,y,sx,sy)?255:0;return {data};}};}
}
const ctx={OffscreenCanvas:Canvas,console:{warn(){}}};
const C=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../utils/CollisionSystem.js'),'utf8')+'\nCollisionSystem',ctx);
const image=(alpha,tainted=false)=>({width:1024,height:1024,complete:true,alpha,tainted});
// Synthetic 48px sprites: narrow blade and wider guard. Each direction has the
// same transparent margins as a sheet with isolated weapon frames.
const swordImage=image((x,y,sx,sy)=>{const d=Math.round((sy-191)/48),p=d===0?y:d===1?47-x:d===2?x:47-y,q=d===0||d===3?x:y;return p>=4&&p<42&&Math.abs(q-24)<(p>=10&&p<14?7:2);});
const leverImage=image((x,y)=>x>=14&&x<34&&y>=17&&y<32);
const scene={assets:{img(k){return k==='object'?swordImage:leverImage;}},toRemove:[]};
const pc={x:100,y:100,w:12,h:12,renderOffset:{x:-15.1,y:-24},scene};
const sword=d=>({pc,scene,direcao:d,imgX:3,imgY:1,imagem:'object',w:12,h:12,frame:0,props:{modelo:'espada'}});
const lever=(x,y,extra={})=>({x,y,w:32,h:32,spriteSize:48,imgX:2,imgY:0,toggled:false,scene,imagem:'switch',props:{subtipo:'alavanca'},...extra});
let count=0;function test(n,f){f();count++;console.log('OK '+n);}
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
for(let d=0;d<4;d++)test('ancora e alcance baseado nos pixels, direcao '+d,()=>{const s=sword(d);C.sword(s,1/60);const dir=C.direction(d),a=C.box(s,'attackBox');assert.ok(s._swordBlade.length>0);assert.ok((a.x-s._swordHand.x)*dir.x+(a.y-s._swordHand.y)*dir.y>0);const hand=s._swordHand;const offset=s.x;pc.x+=3;C.swordPose(s);approx(s._swordHand.x,hand.x+3);approx(s.x,offset+3);pc.x-=3;});
test('cache de pixels nao rele o frame',()=>{const s=sword(0);C.swordPose(s);const n=reads;C.swordPose(s);assert.equal(reads,n);});
test('alavanca: aciona apenas quando lamina e pixels visiveis se cruzam',()=>{const s=sword(0);C.swordPose(s);const blade=s._swordBlade.at(-1);const l=lever(blade.x+4,blade.y+4);assert.equal(C.intersects(s,l),true);assert.equal(C.intersects(l,s),true);l.y+=18;assert.equal(C.intersects(s,l),false);});
test('alavanca: sobreposicao com hitbox antiga nao basta',()=>{const s=sword(2);C.swordPose(s);const a=C.box(s,'attackBox');const l=lever(a.x+a.w/2+12,a.y);assert.ok(C.overlaps(a,C.box(l,'hurtBox')));assert.equal(C.intersects(s,l),false);});
test('alavanca: cabo nao aciona',()=>{const s=sword(2);C.swordPose(s);const a=s._swordHand;const tiny=image((x,y)=>x===24&&y===24);const l=lever(a.x+4-.25,a.y+4-.25,{scene:{assets:{img(){return tiny;}}}});assert.equal(C.intersects(s,l),false);});
test('interruptor 24px usa origem visual propria',()=>{const l=lever(100,100,{w:24,h:24,imgX:10,imgY:1});const rs=C.leverRects(l);assert.ok(rs.length);approx(rs[0].x,100);});
test('fallback CORS: geometria reduzida e jogavel',()=>{const img=image(()=>true,true),sc={assets:{img(){return img;}},toRemove:[]},s={...sword(0),scene:sc};C.swordPose(s);assert.equal(s._swordBlade.length,1);const b=s._swordBlade[0];const l=lever(b.x+4,b.y+4,{scene:sc});assert.equal(C.intersects(s,l),true);l.y+=24;assert.equal(C.intersects(s,l),false);});
test('espada expirada nao ativa a alavanca',()=>{const s=sword(0);C.swordPose(s);const b=s._swordBlade[0];s._collisionExpired=true;assert.equal(C.intersects(s,lever(b.x+4,b.y+4)),false);});
test('patch de desenho preserva demais funcoes e nao reaplica',()=>{const src='function desenhaEspada() {\n    ctx.save();\n    ctx.translate(this.x - this.scene.cameraX, this.y - this.scene.cameraY);\n    const offset = this.renderOffsetSword || { x: 0, y: 0 };\n    ctx.restore();\n}\nfunction outra(){return 1;}';const out=patchDrawing(src);assert.ok(out.includes('CollisionSystem.swordPose(this)'));assert.ok(out.endsWith('function outra(){return 1;}'));new vm.Script(out);assert.throws(()=>patchDrawing(out));});
console.log(`${count} testes especificos aprovados.`);
