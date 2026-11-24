/* F2 liga/desliga; nenhum efeito sobre a fisica. */
class CollisionDebug {
    static draw(scene) {
        if(!this.enabled || !scene.map || !scene.ctx) return;
        const c=scene.ctx,z=CollisionSystem.size(scene.map),n=CollisionSystem.bounds(scene.map);
        c.save();c.lineWidth=1;
        const x0=Math.max(0,Math.floor(scene.cameraX/z)),y0=Math.max(0,Math.floor(scene.cameraY/z));
        for(let x=x0;x<Math.min(n.w,x0+Math.ceil(scene.w/z)+1);x++) for(let y=y0;y<Math.min(n.h,y0+Math.ceil(scene.h/z)+1);y++) {
            if(!CollisionSystem.solid(scene.map,x,y,{atravessa:0})) continue;
            c.strokeStyle='#f55';c.strokeRect(x*z-scene.cameraX+.5,y*z-scene.cameraY+.5,z-1,z-1);
        }
        const rect=(s,k,color)=>{const b=CollisionSystem.box(s,k);c.strokeStyle=color;c.strokeRect(b.x-b.w/2-scene.cameraX,b.y-b.h/2-scene.cameraY,b.w,b.h);};
        for(const s of [scene.pc,...scene.spritesE,...scene.spritesTE,...scene.spritesT,...scene.sokobans.flatMap(p=>p.boxes)].filter(Boolean)) {
            if(s.props?.modelo==='espada') rect(s,'attackBox','#ffcf40');
            else {rect(s,'collisionBox','#45b9ff');if(s.hurtBox) rect(s,'hurtBox','#54e98b');}
        }
        c.font='12px monospace';c.fillStyle='#fff';c.fillText('F2: colisao | azul: corpo | amarelo: ataque | vermelho: tile',8,16);c.restore();
    }
}
CollisionDebug.enabled=false;
addEventListener('keydown',e=>{if(e.key==='F2'&&!e.repeat){e.preventDefault();CollisionDebug.enabled=!CollisionDebug.enabled;}});
