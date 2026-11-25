/* Blue Moon - renderizacao do inventario, independente do armazenamento. */
class InventoryHUD {
    constructor(inventory) {
        this.inventory=inventory; this.reveal=0; this.transition=null;
        this.flash=0; this.flashColor=''; this.glows=new Map();
    }
    // Coordenadas relativas ao centro original (56, h-66).
    // A esquerda tem apenas 24 px livres. As previas ficam em arco, acima
    // da linha de dialogo, sem mover a HUD ou sobrepor os coracoes.
    static slots = { '-1':{x:12,y:-113,size:22,alpha:.55}, '0':{x:56,y:-66,size:48,alpha:1}, '1':{x:101,y:-113,size:22,alpha:.55} };
    inventoryChanged() { this.transition=null; if (this.inventory.consumables.size<2) this.reveal=0; }
    permanentAcquired(id) { this.glows.set(id,.5); }
    feedback(success) { this.flash=.32; this.flashColor=success?'#f3d37b':'#ff4343'; }
    select(direction) {
        const list=this.inventory.consumables;
        if (list.size<2) return false;
        const before=this.transition ? new Map(this.frame().map(({node,...p})=>[node,p])) : this.layout();
        if (!list.select(direction)) return false;
        this.inventory.metrics.swaps++; this.reveal=1.8;
        this.transition={elapsed:0,before, direction}; return true;
    }
    update(dt) {
        dt=Number.isFinite(dt)?Math.max(0,dt):0;
        this.reveal=Math.max(0,this.reveal-dt); this.flash=Math.max(0,this.flash-dt);
        if (this.transition) { this.transition.elapsed+=dt; if (this.transition.elapsed>=.15) this.transition=null; }
        for (const [id,time] of this.glows) { if (time<=dt) this.glows.delete(id); else this.glows.set(id,time-dt); }
    }
    previewAlpha() { return Math.min(1,this.reveal/.6); }
    layout() {
        const l=this.inventory.consumables, map=new Map();
        if (!l.selected) return map;
        const put=(node,slot)=>map.set(node,{...InventoryHUD.slots[slot]});
        put(l.selected,0);
        if (l.size>=2) put(l.selected.next,1);
        if (l.size>=3) put(l.selected.prev,-1);
        return map;
    }
    frame() {
        const target=this.layout(), visibility=this.previewAlpha(), tr=this.transition;
        if (!tr) return [...target].map(([node,p])=>({node,...p,alpha:p.alpha===1?1:p.alpha*visibility})).filter(p=>p.alpha>0);
        const t=Math.min(1,tr.elapsed/.15), ease=t*t*(3-2*t);
        const all=new Set([...tr.before.keys(),...target.keys()]);
        const out=[];
        for (const node of all) {
            let a=tr.before.get(node), b=target.get(node);
            if (!a) a={...b,x:b.x+tr.direction*23,alpha:0};
            if (!b) b={...a,x:a.x-tr.direction*23,alpha:0};
            const mix=k=>a[k]+(b[k]-a[k])*ease;
            const alpha=mix('alpha');
            if (alpha>0) out.push({node,x:mix('x'),y:mix('y'),size:mix('size'),alpha});
        }
        // O selecionado fica por cima se os sprites se cruzarem.
        return out.sort((a,b)=>Number(a.node===this.inventory.consumables.selected)-Number(b.node===this.inventory.consumables.selected));
    }
    drawIcon(ctx,assets,item,x,y,size,alpha=1,glow=0) {
        if (!item || !item.spriteSize || !item.imagem || alpha<=0) return;
        ctx.save();
        try {
            ctx.globalAlpha=alpha;
            if (glow>0) { ctx.shadowColor='#ffe8a2'; ctx.shadowBlur=12*glow/.5; }
            const s=item.spriteSize;
            ctx.drawImage(assets.img(item.imagem),s*item.imgX,0,s,s,x-size/2,y-size/2,size,size);
        } finally { ctx.restore(); }
    }
    draw(scene) {
        const ctx=scene.ctx, h=scene.h;
        for (const p of this.frame()) this.drawIcon(ctx,scene.assets,p.node.item,p.x,h+p.y,p.size,p.alpha);
        const selected=this.inventory.consumables.selected;
        if (selected?.quantity>1) {
            ctx.save(); try { ctx.globalAlpha=1; ctx.font='bold 13px Arial'; ctx.textAlign='right'; ctx.fillStyle='#fff'; ctx.fillText('×'+selected.quantity,80,h-44); } finally { ctx.restore(); }
        }
        if (this.flash>0) {
            ctx.save(); try { ctx.globalAlpha=this.flash/.32; ctx.strokeStyle=this.flashColor; ctx.lineWidth=2; ctx.strokeRect(25,h-99,62,62); } finally { ctx.restore(); }
        }
    }
    drawPermanents(scene) {
        const ctx=scene.ctx; ctx.save();
        try {
            ctx.font='30px Medieval'; ctx.textAlign='left';
            let x=24+ctx.measureText('Lyra').width+14;
            for (const [id,item] of this.inventory.permanentItems) {
                this.drawIcon(ctx,scene.assets,item,x+12,scene.h-137,24,1,this.glows.get(id)||0); x+=30;
            }
        } finally { ctx.restore(); }
    }
    static bindControls(scene, target) {
        const held=new Set();
        const key=e=>e.code==='KeyT'||e.code==='KeyY'?e.code:null;
        target.addEventListener('keydown',e=>{
            const k=key(e); if (!k || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return;
            if (e.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')) return;
            e.preventDefault(); if (e.repeat||held.has(k)) return; held.add(k);
            if (scene.pc?.vidas>0 && scene.theEnd<=0 && (scene.stageIndex===0||scene.stageIndex===3) && !scene.paused) scene.inventoryHUD.select(k==='KeyT'?-1:1);
        });
        target.addEventListener('keyup',e=>{ const k=key(e); if (k) held.delete(k); });
        target.addEventListener('blur',()=>held.clear());
    }
}
if (typeof module !== 'undefined' && module.exports) module.exports=InventoryHUD;
