/* Blue Moon - inventario persistente. Sem dependencias de Canvas ou DOM. */
class InventoryNode {
    constructor(item) { this.item = item; this.quantity = 1; this.prev = this.next = this; }
}
class ConsumableInventory {
    constructor() { this.head = this.tail = this.selected = null; this.size = 0; }
    *nodes() { let node = this.head; for (let i=0; i<this.size; i++, node=node.next) yield node; }
    add(item) {
        // Empilhamento somente por identidade explicita; chaves nunca se misturam.
        const id = item.props?.stackId;
        if (id != null && item.keyId == null) {
            for (const n of this.nodes()) if (n.item.keyId == null && n.item.props?.stackId === id) { n.quantity++; return n; }
        }
        const n = new InventoryNode(item);
        if (!this.selected) this.head = this.tail = this.selected = n;
        else {
            const a = this.selected, b = a.next;
            n.prev = a; n.next = b; a.next = n; b.prev = n;
            if (a === this.tail) this.tail = n;
        }
        this.size++; return n;
    }
    select(direction) {
        if (this.size < 2) return false;
        this.selected = direction < 0 ? this.selected.prev : this.selected.next;
        return true;
    }
    consume() {
        const n = this.selected; if (!n) return null;
        if (n.quantity > 1) { n.quantity--; return n.item; }
        if (this.size === 1) this.head = this.tail = this.selected = null;
        else {
            n.prev.next = n.next; n.next.prev = n.prev;
            if (this.head === n) this.head = n.next;
            if (this.tail === n) this.tail = n.prev;
            this.selected = n.next;
        }
        this.size--; n.prev = n.next = null; return n.item;
    }
    count() { let count=0; for (const n of this.nodes()) count+=n.quantity; return count; }
}
class InventoryMetrics {
    constructor() {
        this.seconds=0; this.distanceTiles=0; this.revisitedCorridorTiles=0;
        this.swaps=0; this.maxConsumables=0; this.visited=new Set();
        this.corridors=null; this.lastTile=null; this.active=false; this.status='not_started';
    }
    track(scene, dt, from, to) {
        if (!this.corridors) {
            this.corridors=new Set();
            for (const edge of scene.gamer?.dungeonGenerator?.graph?.adjacencyList || [])
                for (const c of edge.cells || []) this.corridors.add(`${c.x},${c.y}`);
        }
        this.active=true; this.status='in_progress'; this.seconds+=dt;
        const size=scene.map?.SIZE || 32;
        this.distanceTiles+=Math.hypot(to.x-from.x,to.y-from.y)/size;
        const a=`${Math.floor(from.x/size)},${Math.floor(from.y/size)}`;
        const b=`${Math.floor(to.x/size)},${Math.floor(to.y/size)}`;
        this.visited.add(a);
        if (a!==b) {
            if (this.corridors.has(b) && this.visited.has(b)) this.revisitedCorridorTiles++;
            this.visited.add(b);
        }
        this.lastTile=b;
    }
    snapshot() {
        return { status:this.status, seconds:+this.seconds.toFixed(2), distanceTiles:+this.distanceTiles.toFixed(2),
            revisitedCorridorTiles:this.revisitedCorridorTiles, swaps:this.swaps, maxConsumables:this.maxConsumables };
    }
    finish(status) { if (!this.active || this.status!=='in_progress') return; this.status=status; console.info('[BlueMoon inventory metrics]', this.snapshot()); }
}
class Inventory {
    constructor() {
        this.consumables=new ConsumableInventory(); this.permanentItems=new Map();
        this.collected=new WeakSet(); this.openedDoors=new WeakSet(); this.doorAttempts=new WeakMap();
        this.metrics=new InventoryMetrics();
    }
    hasPermanent(id) { return this.permanentItems.has(id); }
    selectedItem() { return this.consumables.selected?.item ?? null; }
    add(item) {
        if (this.collected.has(item)) return {added:false};
        const props=item.props || {};
        const permanentId=props.permanentId || (props.event==='lava' ? 'lavaBoots' : null);
        this.collected.add(item);
        if (permanentId) {
            const added=!this.permanentItems.has(permanentId);
            if (added) this.permanentItems.set(permanentId,item);
            return {added,permanentId};
        }
        this.consumables.add(item);
        this.metrics.maxConsumables=Math.max(this.metrics.maxConsumables,this.consumables.count());
        return {added:true};
    }
    hidden(sprite) { return this.collected.has(sprite)||this.openedDoors.has(sprite); }
    collect(scene,item) {
        if (this.hidden(item)||scene.toRemove.includes(item)) return false;
        const result=this.add(item);
        scene.toRemove.push(item); item.swCD=.6;
        if (!result.added) return false;
        scene.dialogo=item.props.mensagem; scene.frameCounter=0;
        scene.assets.play('quest');
        if (result.permanentId) scene.inventoryHUD.permanentAcquired(result.permanentId);
        else scene.inventoryHUD.inventoryChanged();
        if (item.onGet) item.onGet();
        return true;
    }
    tryDoor(scene,door,sword) {
        if (this.hidden(door)||scene.toRemove.includes(door)) return false;
        // Uma tentativa por porta por golpe, inclusive enquanto a espada permanece ativa.
        let seen=this.doorAttempts.get(sword);
        if (!seen) { seen=new WeakSet(); this.doorAttempts.set(sword,seen); }
        if (seen.has(door)) return false; seen.add(door);
        const item=this.selectedItem();
        if (!item || item.keyId==null || item.keyId!==door.doorId) { scene.inventoryHUD.feedback(false); return false; }
        scene.map.cells[door.posX][door.posY].tipo=4;
        this.openedDoors.add(door); scene.toRemove.push(door);
        this.consumables.consume(); scene.inventoryHUD.inventoryChanged();
        scene.inventoryHUD.feedback(true); scene.assets.play('key'); return true;
    }
}
if (typeof module !== 'undefined' && module.exports) module.exports={InventoryNode,ConsumableInventory,Inventory,InventoryMetrics};
