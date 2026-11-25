'use strict';
// Patch localizado: nao substitui personalizacoes existentes dos demais metodos.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
function once(s,re,replacement,label){
    const matches=[...s.matchAll(new RegExp(re.source,re.flags.replace(/g/g,'')+'g'))];
    if(matches.length!==1) throw Error(`${label}: esperado 1 trecho, encontrados ${matches.length}.`);
    return s.replace(re,replacement);
}
function patchCollision(s){
    if(s.includes('static projectileFadeSeconds')) throw Error('CollisionSystem: correcao ja presente.');
    s=once(s,/static moveProjectile\(s,dt\) \{/,`// Dissipacao exclusivamente visual, em segundos e pixels de mundo.
    static projectileFadeSeconds = 0.12;
    static projectileFadePixels = 16;
    static projectileBarrierFadeSeconds = 0.06;
    static projectileBarrierFadePixels = 2;
    static moveProjectile(s,dt) {`, 'configuracao');
    s=once(s,/(static moveProjectile\(s,dt\) \{\s*)const map=s\.scene\?\.map;/,`$1if(s._collisionExpired) return;
        const map=s.scene?.map;`,'movimento');
    s=once(s,/let t=1;\s*\/\/ Examina a caixa envolvente/,`let t=1, impact=null;
        // Examina a caixa envolvente`,'impacto');
    s=once(s,/if\(!this\.solid\(map,x,y,s\)\) continue;\s*const hit=this\.sweep\(a,dx,dy,\{x:\(x\+\.5\)\*z,y:\(y\+\.5\)\*z,w:z,h:z\}\);\s*if\(hit!==null\) t=Math\.min\(t,hit\);/,`const tile=this.tile(map,x,y);
            // Buraco preto tambem encerra tiros comuns; atravessa=1 preservado.
            if(!this.solid(map,x,y,s) && !(s.atravessa!=1 && Number(tile?.tipo)===-1)) continue;
            const hit=this.sweep(a,dx,dy,{x:(x+.5)*z,y:(y+.5)*z,w:z,h:z});
            const kind=!tile?'bounds':[7,10].includes(Number(tile.tipo))?'barrier':'wall';
            const rank={wall:0,barrier:1,bounds:2};
            if(hit!==null && (hit<t || (hit===t && impact && rank[kind]>rank[impact]))) {
                t=hit;impact=kind;
            }`, 'classificacao do impacto');
    s=once(s,/if\(t<1\) s\._collisionWall=true;/,`if(t<1) {
            s._collisionWall=true;
            s._projectileImpact={kind:impact,vx:s.vx,vy:s.vy};
        }`, 'registro do impacto');
    s=once(s,/static cleanupProjectiles\(scene\) \{[\s\S]*?\n    \}(?=\s*\}\s*$)/,`// Efeitos fora de spritesT/spritesTE: nunca participam de mover,
    // comportar, colisao, dano, F2, nem da contagem de tiros ativos.
    static projectileFades(scene) {
        let state=scene._projectileFadeState;
        if(!state || state.map!==scene.map || state.stage!==scene.stageIndex) {
            state={map:scene.map,stage:scene.stageIndex,items:[]};
            scene._projectileFadeState=state;
        }
        return state.items;
    }
    static clearProjectileFades(scene) { delete scene._projectileFadeState; }
    static startProjectileFade(scene,s) {
        const hit=s._projectileImpact;
        if(!hit || hit.kind==='bounds' || typeof s.desenhar!=='function') return;
        const speed=Math.hypot(hit.vx,hit.vy);
        if(!Number.isFinite(speed) || speed<=this.eps) return;
        const barrier=hit.kind==='barrier';
        const duration=barrier?this.projectileBarrierFadeSeconds:this.projectileFadeSeconds;
        const cap=barrier?this.projectileBarrierFadePixels:this.projectileFadePixels;
        if(!(duration>0) || !(cap>=0)) return;
        const opacity=s.toggled?.5:Math.max(0,Math.min(1,Number.isFinite(s.opacity)?s.opacity:1));
        if(opacity<=0) return;
        // Copia de render apenas; nao e um Sprite ativo e nao possui hitbox.
        // Reutiliza desenhaTiro e sua opacidade/recorte originais.
        const visual={scene,x:s.x,y:s.y,imagem:s.imagem,imgX:s.imgX,imgY:s.imgY,
            direcao:s.direcao,frame:s.frame,w:s.w,h:s.h,opacity,toggled:false,
            desenhar:s.desenhar};
        const distance=Math.min(cap,speed*duration);
        this.projectileFades(scene).push({visual,x:s.x,y:s.y,frame:s.frame||0,opacity,
            dx:hit.vx/speed*distance,dy:hit.vy/speed*distance,duration,age:0,
            enemy:s.props.tipo!=='tiro'});
    }
    static updateProjectileFades(scene,dt) {
        const items=this.projectileFades(scene);
        const step=Number.isFinite(dt)?Math.max(0,dt):0;
        for(let i=items.length-1;i>=0;i--) {
            const f=items[i];f.age+=step;
            if(f.age>=f.duration) {items.splice(i,1);continue;}
            const t=f.age/f.duration;
            f.visual.x=f.x+f.dx*t;f.visual.y=f.y+f.dy*t;
            f.visual.frame=f.frame+8*f.age;
            f.visual.opacity=f.opacity*(1-t);
        }
    }
    static drawProjectileFades(scene,enemy) {
        for(const f of this.projectileFades(scene)) {
            if(f.enemy!==enemy) continue;
            scene.ctx.save();
            try {
                scene.ctx.globalAlpha=f.visual.opacity;
                f.visual.desenhar(scene.ctx);
            } finally {scene.ctx.restore();}
        }
    }
    static cleanupProjectiles(scene,dt=1/60) {
        this.updateProjectileFades(scene,dt);
        const map=scene.map,z=this.size(map),n=this.bounds(map);
        for(const s of [...scene.spritesT,...scene.spritesTE]) {
            if(s.props?.modelo==='espada') continue;
            const outside=s.x<0 || s.y<0 || s.x>=n.w*z || s.y>=n.h*z;
            if(s._collisionWall || outside) {
                // Alvos atingidos antes da parede preservam a remocao original.
                if(!scene.toRemove.includes(s)) {
                    if(!outside && this.projectile(s) && !s._collisionExpired) this.startProjectileFade(scene,s);
                    scene.toRemove.push(s);
                }
                s._collisionExpired=true;
            }
            s._collisionSweep=null;
        }
    }`,'limpeza de projeteis');
    return s;
}
function patchScene(s){
    if(s.includes('CollisionSystem.drawProjectileFades')) throw Error('Scene: correcao ja presente.');
    if(!s.includes('CollisionSystem.updateBoxes') || !s.includes('CollisionSystem.cleanupProjectiles')) throw Error('Scene sem a revisao anterior de colisoes.');
    for(const [list,enemy] of [['spritesT',false],['spritesTE',true]]) {
        const re=new RegExp('(for \\(var i = 0; i < this\\.'+list+'\\.length; i\\+\\+\\) \\{\\s*this\\.'+list+'\\[i\\]\\.desenhar\\(this\\.ctx\\);\\s*\\})');
        s=once(s,re,`$1\n    CollisionSystem.drawProjectileFades(this, ${enemy});`,'render '+list);
    }
    s=once(s,/CollisionSystem\.cleanupProjectiles\(this\);/, 'CollisionSystem.cleanupProjectiles(this, dt);','dt da dissipacao');
    s=once(s,/Scene\.prototype\.limparCena = function \(\) \{/, '$&\n    CollisionSystem.clearProjectileFades(this);','limpar cena');
    return s;
}
function main(){
    const args=process.argv.slice(2),root=path.resolve(args.find(a=>!a.startsWith('--'))||'.');
    const files=[['utils/CollisionSystem.js',patchCollision],['Scene.js',patchScene]].map(([name,patch])=>{
        const file=path.join(root,name),original=fs.readFileSync(file,'utf8');
        let updated=patch(original.replace(/\r\n/g,'\n'));
        new vm.Script(updated,{filename:name});
        if(original.includes('\r\n')) updated=updated.replace(/\n/g,'\r\n');
        return {name,file,original,updated};
    });
    if(args.includes('--dry-run')) {console.log('Verificacao OK: '+files.map(f=>f.name).join(', '));return;}
    const backup=path.join(root,'.backup-projeteis-'+Date.now());
    for(const f of files){const dst=path.join(backup,f.name);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,f.original);}
    const written=[];
    try{for(const f of files){written.push(f);fs.writeFileSync(f.file,f.updated);}}
    catch(e){for(const f of written)fs.writeFileSync(f.file,f.original);throw e;}
    console.log('Correcao aplicada em '+files.map(f=>f.name).join(', ')+'\nBackup: '+backup);
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={patchCollision,patchScene};
