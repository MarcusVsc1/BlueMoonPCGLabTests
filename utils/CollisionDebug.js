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
        const worldRect=(b,color)=>{c.strokeStyle=color;c.strokeRect(b.x-b.w/2-scene.cameraX,b.y-b.h/2-scene.cameraY,b.w,b.h);};
        const rect=(s,k,color)=>worldRect(CollisionSystem.box(s,k),color);
        // Mostra exatamente os retangulos usados no teste de dano.
        for(const s of scene.spritesSpike||[]) {
            if(s._collisionExpired) continue;
            const b=CollisionSystem.hazardRect(s);
            if(b.x+b.w/2<scene.cameraX || b.y+b.h/2<scene.cameraY ||
               b.x-b.w/2>scene.cameraX+scene.w || b.y-b.h/2>scene.cameraY+scene.h) continue;
            c.fillStyle=s.toggled?'rgba(255,130,40,.25)':'rgba(160,160,160,.12)';
            c.fillRect(b.x-b.w/2-scene.cameraX,b.y-b.h/2-scene.cameraY,b.w,b.h);
            worldRect(b,s.toggled?'#ff8228':'#999');
        }
        for(const s of [scene.pc,...scene.spritesE,...scene.spritesTE,...scene.spritesT,...scene.sokobans.flatMap(p=>p.boxes)].filter(Boolean)) {
            if(s.props?.modelo==='espada') {
                if(s._collisionExpired) continue;
                CollisionSystem.swordPose(s);
                rect(s,'attackBox','#ffcf40');
                c.fillStyle='rgba(255,207,64,.38)';
                for(const b of s._swordBlade||[]) c.fillRect(b.x-b.w/2-scene.cameraX,b.y-b.h/2-scene.cameraY,b.w,b.h);
                if(s._swordHand) {c.fillStyle='#fff';c.fillRect(s._swordHand.x-scene.cameraX-1,s._swordHand.y-scene.cameraY-1,2,2);}
            }
            else {rect(s,'collisionBox','#45b9ff');if(s.hurtBox) rect(s,'hurtBox','#54e98b');}
        }
        if(scene.pc) worldRect(CollisionSystem.groundRect(scene.pc),'#00ffb0');
        for(const s of scene.spritesO||[]) {
            if(s.props?.subtipo!=='alavanca') continue;
            const rs=CollisionSystem.leverRects(s);
            c.fillStyle='rgba(255,100,230,.38)';
            for(const b of rs) c.fillRect(b.x-b.w/2-scene.cameraX,b.y-b.h/2-scene.cameraY,b.w,b.h);
        }
        c.font='12px monospace';c.fillStyle='#fff';c.fillText('F2: azul: corpo | amarelo: lamina | rosa: alavanca | branco: mao',8,16);c.fillText('Verde agua: pes | laranja: espinhos ativos | cinza: recolhidos',8,30);c.restore();
    }
}
CollisionDebug.enabled=false;
addEventListener('keydown',e=>{if(e.key==='F2'&&!e.repeat){e.preventDefault();CollisionDebug.enabled=!CollisionDebug.enabled;}});
