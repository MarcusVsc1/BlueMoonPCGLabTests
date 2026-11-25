/* BlueMoon: escudeiro. Tempos em segundos, velocidade em pixels/s. */
class ShieldEnemy extends Sprite {
    static get rules() {
        return { speed: 18, turnDelay: .4, turnCooldown: .5, blockPause: .3,
            blockFlash: .16, detection: 256, walkFPS: 5, minRoomSide: 5 };
    }
    constructor(posX, posY) {
        super({ x: posX * 32 + 16, y: posY * 32 + 16, w: 12, h: 12,
            vm: ShieldEnemy.rules.speed, imgX: 0, imgY: 0, imagem: 'zombie',
            vidas: 1, maxVidas: 1, props: { tipo: 'npc', modelo: 'escudeiro' } });
        this.turnRemaining = 0;
        this.turnCooldown = 0;
        this.pendingDirection = null;
        this.blockRemaining = 0;
        this.blockFlash = 0;
        this.moving = false;
        this.frame = 1;
    }
    static is(s) { return s?.props?.modelo === 'escudeiro' && s.props.tipo === 'npc'; }
    static direction(dx, dy, fallback) {
        if (Math.hypot(dx,dy) < 1e-6) return fallback;
        return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    }
    static isRear(enemy, attacker) {
        if (!attacker) return false;
        const f = CollisionSystem.direction(enemy.direcao);
        if (!f) return false;
        const dx = attacker.x - enemy.x, dy = attacker.y - enemy.y;
        // Cone traseiro de 90 graus, bordas e sobreposicao protegidas.
        const rear = -(dx*f.x + dy*f.y);
        const lateral = Math.abs(dx*f.y - dy*f.x);
        return rear > lateral + 1e-6;
    }
    static blocksSword(enemy, sword, scene) {
        if (!this.is(enemy) || sword?.props?.modelo !== 'espada') return false;
        if (this.isRear(enemy, sword.pc || scene.pc)) return false;
        enemy.blockRemaining = this.rules.blockPause;
        enemy.blockFlash = this.rules.blockFlash;
        enemy.pendingDirection = null;
        enemy.turnRemaining = 0;
        enemy.moving = false;
        enemy.vx = enemy.vy = 0;
        enemy.provocou = true;
        scene.assets.play('sword3');
        return true;
    }
    static canContact(s) { return !this.is(s) || (s.moving && s.blockRemaining <= 0 && s.pendingDirection === null); }
    static eligible(room, scene) {
        if (!room || room.roomWidth < this.rules.minRoomSide || room.roomHeight < this.rules.minRoomSide || !room.cells?.length) return false;
        if (/lava|spike|maze|fireball|ice|sokoban/i.test(`${room.tag?.tipo || ''} ${room.tag?.subTipo || ''} ${room.tag?.auxiliar || ''}`)) return false;
        // Nao coloca dois escudeiros na mesma sala, mesmo se fabricas diferentes forem usadas.
        if (scene?.spritesE?.some(e => this.is(e) && e.shieldSpawnRoom === room)) return false;
        return true;
    }
    static spawnPosition(room, posX, posY) {
        const cells = room.cells;
        const has = (x,y) => cells.some(c => c.x === x && c.y === y);
        const inner = cells.filter(c => [[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dy]) => has(c.x+dx,c.y+dy)));
        if (!inner.length) return null;
        // Usar a celula interna mais proxima da posicao sorteada, sem RNG extra.
        return inner.reduce((a,b) => Math.hypot(b.x-posX,b.y-posY) < Math.hypot(a.x-posX,a.y-posY) ? b : a);
    }
    mover(dt) {
        if (!Number.isFinite(dt) || dt <= 0 || this.vidas <= 0 || !this.scene?.pc) return;
        const r = ShieldEnemy.rules, pc = this.scene.pc;
        this.moving = false;
        this.vx = this.vy = 0;
        this.blockFlash = Math.max(0, this.blockFlash-dt);
        this.turnCooldown = Math.max(0, this.turnCooldown-dt);
        this.imune = Math.max(0, this.imune-dt);
        if (this.blockRemaining > 0) {
            this.blockRemaining = Math.max(0,this.blockRemaining-dt);
            this.frame = 1;
            return;
        }
        const dx = pc.x-this.x, dy = pc.y-this.y, dist = Math.hypot(dx,dy);
        if (!this.provocou && dist >= r.detection) { this.frame=1; return; }
        this.provocou = true;
        if (this.pendingDirection !== null) {
            this.turnRemaining -= dt;
            if (this.turnRemaining <= 1e-9) {
                this.direcao = this.pendingDirection;
                this.pendingDirection = null;
                this.turnRemaining = 0;
                this.turnCooldown = r.turnCooldown;
            }
            this.frame = 1;
            return;
        }
        const wanted = ShieldEnemy.direction(dx,dy,this.direcao);
        if (wanted !== this.direcao) {
            if (this.turnCooldown <= 0) {
                this.pendingDirection = wanted;
                this.turnRemaining = r.turnDelay;
            }
            this.frame = 1;
            return;
        }
        if (dist < 1e-6) { this.frame=1; return; }
        const speed = Math.min(r.speed, dist/dt);
        this.vx = dx/dist*speed;
        this.vy = dy/dist*speed;
        const x=this.x,y=this.y;
        CollisionSystem.move(this,dt);
        this.moving = Math.hypot(this.x-x,this.y-y) > 1e-7;
        this.frame = this.moving ? (this.frame + r.walkFPS*dt)%3 : 1;
    }
    desenhar(ctx) {
        this.cameraX = this.x-this.scene.cameraX;
        this.cameraY = this.y-this.scene.cameraY;
        const image = this.scene.assets.img('zombie');
        if (!image || !image.naturalWidth) return;
        ctx.save();
        try {
            ctx.translate(this.cameraX,this.cameraY);
            const frame = this.moving ? Math.floor(this.frame)%3 : 1;
            // Sheet 144x192: recorte exato, sem o +1 vertical do Sprite comum.
            ctx.drawImage(image,frame*48,this.direcao*48,48,48,this.renderOffset.x,this.renderOffset.y,30,30);
            if (this.blockFlash > 0) {
                const f = CollisionSystem.direction(this.direcao);
                const x = this.renderOffset.x+15+f.x*8, y=this.renderOffset.y+15+f.y*8;
                ctx.globalAlpha *= Math.min(1,this.blockFlash/.08);
                ctx.strokeStyle='#fff1b6'; ctx.lineWidth=1.5;
                ctx.beginPath();
                for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,-.7]]) {
                    ctx.moveTo(x+dx*3,y+dy*3);ctx.lineTo(x+dx*7,y+dy*7);
                }
                ctx.stroke();
            }
        } finally { ctx.restore(); }
    }
}
