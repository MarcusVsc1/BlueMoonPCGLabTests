/* BM_ABYSS_FALL_V2 — estado de queda isolado da geração e do autotile. */
const BMAbyss = (() => {
    const states=new WeakMap(), duration=.8, damageAt=.6, immunity=2;
    const clamp=t=>Math.max(0,Math.min(1,t));
    const tile=(map,x,y)=>map?.cells?.[x]?.[y];
    const size=map=>map.SIZE||32;
    const isPit=t=>t?.bmAbyssTerrain==='pit'&&Number(t.tipo)===8;
    const player=(pc,map)=>!!pc&&pc.props?.tipo==='pc'&&pc.scene?.pc===pc&&pc.scene.map===map&&pc.scene.stageIndex===0;
    function current(pc){
        if(!pc)return null;
        const s=states.get(pc),scene=pc.scene;
        if(s&&(s.scene!==scene||s.map!==scene?.map||s.run!==scene?._bmRun||scene.stageIndex!==0)) {states.delete(pc);return null;}
        return s||null;
    }
    function state(pc){let s=current(pc);if(!s){s={scene:pc.scene,map:pc.scene.map,run:pc.scene._bmRun,safe:null,history:[],fall:null,blockX:0,blockY:0,tracking:false};states.set(pc,s);}return s;}
    function safeTile(pc,map,x,y){
        const t=tile(map,x,y),z=size(map);
        // Exige piso real e espaço para a caixa física no centro. Nunca usa vazio,
        // lava, buraco antigo, barreira ou caixa como posição de retorno.
        if(!t||isPit(t)||![0,1,2,3,3.5,4].includes(Number(t.tipo)))return false;
        const b=pc.collisionBox||{},cx=(x+.5)*z+(b.offsetX||0),cy=(y+.5)*z+(b.offsetY||0),hw=(b.w??pc.w??12)/2,hh=(b.h??pc.h??12)/2;
        for(let i=Math.floor((cx-hw+1e-7)/z);i<=Math.floor((cx+hw-1e-7)/z);i++)for(let j=Math.floor((cy-hh+1e-7)/z);j<=Math.floor((cy+hh-1e-7)/z);j++){
            const q=tile(map,i,j);if(!q||isPit(q)||![0,1,2,3,3.5,4].includes(Number(q.tipo)))return false;
        }
        return true;
    }
    function remember(pc,s,x,y){
        if(s.safe?.x===x&&s.safe?.y===y)return;
        if(safeTile(pc,s.map,x,y)){s.safe={x,y};s.history.push(s.safe);if(s.history.length>16)s.history.shift();}
    }
    function isFalling(pc){return !!current(pc)?.fall;}
    function allowsPit(pc,map){const s=current(pc);return player(pc,map)&&!!s?.tracking&&!!s.safe&&safeTile(pc,map,s.safe.x,s.safe.y);}
    function begin(pc,s,x,y){
        if(s.fall||!s.safe||!safeTile(pc,s.map,s.safe.x,s.safe.y))return false;
        const scene=s.scene;
        s.fall={age:0,safe:{...s.safe},pitX:x,pitY:y,x:pc.x,y:pc.y,damaged:false,fatal:false};
        s.blockX=Math.sign(s.intentX||0);s.blockY=Math.sign(s.intentY||0);
        pc.vx=pc.vy=0;pc.charStop=0;pc.atingido=0;pc.imune=Math.max(immunity,pc.imune||0);
        for(const sword of scene.spritesT||[])if(sword.props?.modelo==='espada'){
            sword._collisionExpired=true;if(!scene.toRemove.includes(sword))scene.toRemove.push(sword);
        }
        scene.assets.play('fall');
        return true;
    }
    // Chamado após cada eixo resolvido pelo motor. Examina TODAS as fronteiras
    // cruzadas pelo centro da sustentação, inclusive em dt grande ou diagonais.
    function afterAxis(pc,map,axis,actual){
        const s=current(pc);if(!player(pc,map)||!s?.tracking||!actual||pc.atravessa===1)return actual;
        const z=size(map),start=pc[axis]-actual,end=pc[axis],dir=Math.sign(actual);
        const other=Math.floor(pc[axis==='x'?'y':'x']/z);
        const first=Math.floor(start/z),last=Math.floor(end/z);
        for(let i=first;;i+=dir){
            const x=axis==='x'?i:other,y=axis==='x'?other:i;
            if(isPit(tile(map,x,y))){
                // A caixa pode sobrepor a borda; a queda ocorre quando o centro entra.
                const edge=dir>0?i*z:(i+1)*z;
                const stop=dir>0?Math.max(start,Math.min(end,edge+2)):Math.min(start,Math.max(end,edge-2));
                pc[axis]=stop;
                if(begin(pc,s,x,y))return stop-start;
                pc[axis]=start;return 0;
            }
            remember(pc,s,x,y);
            if(i===last)break;
        }
        return actual;
    }
    function advance(pc,s,dt,fatal){
        const f=s.fall;if(f.fatal)return;
        f.age=Math.min(duration,f.age+Math.max(0,Number.isFinite(dt)?dt:0));
        pc.vx=pc.vy=0;
        // Enquanto cai, os demais atores continuam se movendo; a colisão ignora Lyra.
        if(!f.damaged&&f.age+1e-8>=damageAt){f.damaged=true;f.remaining=Math.max(0,pc.vidas-1);if(f.remaining>0)pc.vidas=f.remaining;}
        if(f.age+1e-8<duration)return;
        if(f.remaining===0){f.fatal=true;pc.vidas=0;fatal(s.scene,'Queda no abismo');return;}
        const z=size(s.map),r=f.safe;
        // O gerador não altera pisos da travessia; fallback para a última posição
        // validada se algum sistema externo tiver modificado o tile nesse intervalo.
        let dest=r;
        if(!safeTile(pc,s.map,r.x,r.y)){
            dest=[...s.history].reverse().find(q=>safeTile(pc,s.map,q.x,q.y))||null;
            if(!dest){
                let best=Infinity;
                for(let x=0;x<s.map.cells.length;x++)for(let y=0;y<(s.map.cells[x]?.length||0);y++){
                    const d=Math.abs(x-r.x)+Math.abs(y-r.y);
                    if(d<best&&safeTile(pc,s.map,x,y)){best=d;dest={x,y};}
                }
            }
            // Apenas para mapa inválido (nenhum piso válido restante).
            if(!dest){console.error('[Blue Moon] Abismo sem piso seguro para retorno.');f.fatal=true;pc.vidas=0;fatal(s.scene,'Queda no abismo');return;}
        }
        pc.x=(dest.x+.5)*z;pc.y=(dest.y+.5)*z;pc.mc=dest.x;pc.ml=dest.y;
        pc.imune=immunity;pc.atingido=0;pc.charStop=0;pc.vx=pc.vy=0;
        s.safe=dest;s.fall=null;
    }
    function movePlayer(pc,dt,fatal){
        const map=pc.scene?.map;
        if(!player(pc,map)||!map||pc.vidas<=0){current(pc);return pc.mover(dt);}
        const s=state(pc);
        if(s.fall){advance(pc,s,dt,fatal);return;}
        const z=size(map);remember(pc,s,Math.floor(pc.x/z),Math.floor(pc.y/z));
        s.intentX=pc.vx;s.intentY=pc.vy;s.tracking=true;
        try{pc.mover(dt);}finally{s.tracking=false;}
        if(s.fall){pc.vx=pc.vy=0;return;}
        const x=Math.floor(pc.x/z),y=Math.floor(pc.y/z);
        if(pc.atravessa!==1&&isPit(tile(map,x,y)))begin(pc,s,x,y);else remember(pc,s,x,y);
    }
    function filterInput(pc,x,y){
        const s=current(pc);if(!s)return [x,y];
        if(s.blockX&&x!==s.blockX)s.blockX=0;
        if(s.blockY&&y!==s.blockY)s.blockY=0;
        return [s.blockX===x?0:x,s.blockY===y?0:y];
    }
    function drawFalling(pc,ctx){
        const s=current(pc),f=s?.fall;if(!f)return false;
        if(f.fatal||f.age>=damageAt)return true;
        const p=clamp(f.age/damageAt),z=size(s.map),scene=s.scene;
        const anchorX=f.x+((f.pitX+.5)*z-f.x)*p,anchorY=f.y+((f.pitY+.5)*z-f.y)*p;
        const scale=1-.9*p*p,ro=pc.renderOffset||{x:-15.1,y:-24};
        ctx.save();try{
            ctx.translate(Math.round(anchorX-scene.cameraX),Math.round(anchorY-scene.cameraY));ctx.scale(scale,scale);ctx.globalAlpha=clamp(1-p*p);
            const img=scene.assets.img('expressoes');ctx.drawImage(img,48,193,48,48,ro.x,ro.y,30,30);
        }finally{ctx.restore();}
        return true;
    }
    return Object.freeze({isPit,isFalling,allowsPit,afterAxis,movePlayer,filterInput,drawFalling});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=BMAbyss;
