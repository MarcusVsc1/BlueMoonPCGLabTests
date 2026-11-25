'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function patchDrawing(s) {
    const marker=/function desenhaEspada\(\) \{\s*ctx\.save\(\);\s*ctx\.translate\(this\.x - this\.scene\.cameraX, this\.y - this\.scene\.cameraY\);/g;
    if([...s.matchAll(marker)].length!==1 || !s.includes('this.renderOffsetSword')) throw Error('DrawingUtils.js nao corresponde a revisao anterior ou ja foi corrigido. Nenhuma alteracao realizada.');
    return s.replace(marker,`function desenhaEspada() {
    if (this._collisionExpired || !CollisionSystem.swordPose(this)) return;
    ctx.save();
    ctx.translate(this.x - this.scene.cameraX, this.y - this.scene.cameraY);`);
}
function main(){
    const args=process.argv.slice(2),root=path.resolve(args[0]||'.'),ei=args.indexOf('--export'),dry=args.includes('--dry-run');
    if(ei>=0&&!args[ei+1]) throw Error('Informe a pasta para --export.');
    const files=['utils/CollisionSystem.js','utils/CollisionDebug.js','utils/DrawingUtils.js'];
    const changes=files.map(name=>{
        const file=path.join(root,name),original=fs.readFileSync(file,'utf8');
        if(name.endsWith('CollisionSystem.js')&&!original.includes('static sword(s,dt)'))throw Error('CollisionSystem anterior nao identificado.');
        if(name.endsWith('CollisionDebug.js')&&!original.includes('class CollisionDebug'))throw Error('CollisionDebug anterior nao identificado.');
        const updated=name.endsWith('DrawingUtils.js')?patchDrawing(original):fs.readFileSync(path.join(__dirname,name),'utf8');
        new vm.Script(updated,{filename:name});return {name,file,original,updated};
    });
    if(dry){console.log('Verificacao OK.');return;}
    if(ei>=0){const dest=path.resolve(args[ei+1]);if(fs.existsSync(dest))throw Error('A pasta de exportacao deve ser nova.');for(const c of changes){const f=path.join(dest,c.name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,c.updated);}console.log('Exportado: '+dest);return;}
    const backup=path.join(root,'.backup-espada-'+Date.now());
    for(const c of changes){const f=path.join(backup,c.name);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,c.original);}
    const written=[];try{for(const c of changes){written.push(c);fs.writeFileSync(c.file,c.updated);}}catch(e){for(const c of written.reverse())fs.writeFileSync(c.file,c.original);throw e;}
    console.log('Corrigido: '+files.join(', ')+'\nBackup: '+backup);
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={patchDrawing};
