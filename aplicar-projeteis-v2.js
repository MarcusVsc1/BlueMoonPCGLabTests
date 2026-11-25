'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=require('./patch-base.js');
function replace(s,re,to,label){const matches=[...s.matchAll(new RegExp(re.source,re.flags.replace(/g/g,'')+'g'))];if(matches.length!==1)throw Error(label+': esperado 1 trecho, encontrados '+matches.length);return s.replace(re,to);}
function patchCollision(s){
 if(!s.includes('static projectileFadeSeconds'))s=base.patchCollision(s);
 s=replace(s,/static projectileFadeSeconds\s*=\s*[\d.]+;/,'static projectileFadeSeconds = 0.22;','duracao');
 s=replace(s,/static projectileFadePixels\s*=\s*[\d.]+;/,'static projectileFadePixels = 32;','distancia');
 if(!s.includes('static projectileFadeLeadPixels'))s=replace(s,/static projectileFadePixels = 32;/,'$&\n    static projectileFadeLeadPixels = 6;','entrada visual');
 s=replace(s,/const distance=Math\.min\(cap,speed\*duration\);[\s\S]*?enemy:s\.props\.tipo!==\x27tiro\x27\}\);/,`// A opacidade so comeca a cair depois de avancar ate perto da borda.
        // Movimento visual limitado a um tile, sem qualquer dano.
        const lead=barrier?0:Math.min(this.projectileFadeLeadPixels,cap*.25,speed*.06);
        const total=duration+lead/speed;
        const distance=Math.min(cap,speed*total);
        this.projectileFades(scene).push({visual,x:s.x,y:s.y,frame:s.frame||0,opacity,
            dx:hit.vx/speed*distance,dy:hit.vy/speed*distance,duration:total,fadeDuration:duration,
            leadFraction:lead/Math.max(distance,this.eps),age:0,
            enemy:s.props.tipo!=='tiro'});`,'trajetoria');
 s=replace(s,/f\.visual\.opacity=f\.opacity\*\(1-t\);/,`const fade=Math.max(0,Math.min(1,(t-f.leadFraction)/(1-f.leadFraction)));
            // Smoothstep: nao ha queda abrupta no primeiro frame de dissipacao.
            f.visual.opacity=f.opacity*(1-fade*fade*(3-2*fade));`,'opacidade');
 return s;
}
function patchScene(s){
 if(!s.includes('CollisionSystem.drawProjectileFades'))return base.patchScene(s);
 for(const re of [/CollisionSystem\.drawProjectileFades\(this,\s*false\)/,/CollisionSystem\.drawProjectileFades\(this,\s*true\)/,/CollisionSystem\.cleanupProjectiles\(this,\s*dt\)/,/CollisionSystem\.clearProjectileFades\(this\)/])if(!re.test(s))throw Error('Scene: integracao incompleta: '+re);
 return s;
}
function main(){
 const args=process.argv.slice(2),root=path.resolve(args.find(a=>!a.startsWith('--'))||'.');
 const files=[['utils/CollisionSystem.js',patchCollision],['Scene.js',patchScene]].map(([name,patch])=>{const file=path.join(root,name),original=fs.readFileSync(file,'utf8');let updated=patch(original.replace(/\r\n/g,'\n'));new vm.Script(updated,{filename:name});if(original.includes('\r\n'))updated=updated.replace(/\n/g,'\r\n');return {name,file,original,updated};});
 if(args.includes('--dry-run')){console.log('OK: integracao verificada nos dois arquivos; nenhuma gravacao.');return;}
 const backup=path.join(root,'.backup-projeteis-v2-'+Date.now());for(const f of files){const dst=path.join(backup,f.name);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,f.original);}
 try{for(const f of files)fs.writeFileSync(f.file,f.updated);}catch(e){for(const f of files)fs.writeFileSync(f.file,f.original);throw e;}
 console.log('Dissipacao V2 aplicada. Backup: '+backup+'\nRecarregue o jogo com Ctrl+F5.');
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={patchCollision,patchScene};
