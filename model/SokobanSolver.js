/** Sokoban clássico: caixas indistinguíveis, quatro direções, apenas empurrões.
 * Coordenadas x = linha, y = coluna, como Game.js. Sem dependências do jogo. */
class SokobanSolver {
    constructor(snapshot, goalBoard) {
        if (!Array.isArray(snapshot) || !snapshot.length || !Array.isArray(snapshot[0]) || !snapshot[0].length ||
            !Array.isArray(goalBoard) || goalBoard.length !== snapshot.length) throw new Error('Matrizes inválidas')
        this.rows = snapshot.length; this.cols = snapshot[0].length
        this.size = this.rows * this.cols
        this.walls = new Uint8Array(this.size); this.boxes = []; this.goals = []; this.player = -1
        let players = 0
        const types = ['vazio', 'parede', 'jogador', 'caixa']
        for (let x=0; x<this.rows; x++) {
            if (!Array.isArray(snapshot[x]) || !Array.isArray(goalBoard[x]) || snapshot[x].length !== this.cols || goalBoard[x].length !== this.cols) throw new Error('Matrizes não retangulares')
            for (let y=0; y<this.cols; y++) {
                const a=snapshot[x][y]?.tipo, b=goalBoard[x][y]?.tipo, i=x*this.cols+y
                if (!types.includes(a) || !types.includes(b) || (a==='parede') !== (b==='parede')) throw new Error('Geometria ou tipos inconsistentes')
                this.walls[i] = +(a==='parede')
                if (a==='caixa') this.boxes.push(i)
                if (b==='caixa') this.goals.push(i)
                if (a==='jogador') { this.player=i; players++ }
            }
        }
        if (players!==1 || !this.boxes.length || this.boxes.length!==this.goals.length) throw new Error('Jogador, caixas ou destinos inválidos')
        this.goalSet = new Set(this.goals)
        this.directions = [{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}]
        this.neighbors = Array.from({length:this.size}, (_,i)=>this.directions.map(d=>{
            const x=Math.floor(i/this.cols)+d.x, y=i%this.cols+d.y
            return x>=0&&x<this.rows&&y>=0&&y<this.cols ? x*this.cols+y : -1
        }))
        this.distances = this.goals.map(g=>this.reverseDistances(g))
        this.hCache = new Map()
    }
    static fromState(state) { return new SokobanSolver(state.snapshot,state.board) }
    floor(i) { return i>=0 && i<this.size && !this.walls[i] }
    reverseDistances(goal) {
        const dist=new Int32Array(this.size).fill(-1), q=[goal]; dist[goal]=0
        for(let j=0;j<q.length;j++) {
            const i=q[j]
            for(let d=0;d<4;d++) {
                const prev=this.neighbors[i][d^1]
                if(!this.floor(prev)||!this.floor(this.neighbors[prev][d^1])||dist[prev]>=0) continue
                dist[prev]=dist[i]+1; q.push(prev)
            }
        }
        return dist
    }
    /** Distância de empurrões relaxada, com atribuição exclusiva de destinos.
     * DP exata até 10 caixas; acima disso limite inferior mais barato. */
    heuristic(boxes) {
        const key=boxes.join(','); if(this.hCache.has(key)) return this.hCache.get(key)
        const n=boxes.length, cost=boxes.map(b=>this.distances.map(d=>d[b]<0?Infinity:d[b]))
        let h=Infinity
        if(n<=10) {
            const dp=new Float64Array(1<<n).fill(Infinity); dp[0]=0
            const counts=new Uint8Array(1<<n)
            for(let m=1;m<dp.length;m++) counts[m]=counts[m>>1]+(m&1)
            for(let m=0;m<dp.length-1;m++) if(Number.isFinite(dp[m])) {
                for(let j=0;j<n;j++) if(!(m&(1<<j))) {
                    const next=m|(1<<j); dp[next]=Math.min(dp[next],dp[m]+cost[counts[m]][j])
                }
            }
            h=dp[dp.length-1]
        } else {
            const a=cost.reduce((s,r)=>s+Math.min(...r),0)
            let b=0; for(let j=0;j<n;j++) b+=Math.min(...cost.map(r=>r[j]))
            h=Math.max(a,b)
        }
        if(this.hCache.size<50000) this.hCache.set(key,h)
        return h
    }
    flood(player, occupied, withPath=false) {
        const seen=new Uint8Array(this.size), q=[player], prev=withPath?new Int32Array(this.size).fill(-1):null
        seen[player]=1; let rep=player
        for(let j=0;j<q.length;j++) for(const next of this.neighbors[q[j]]) {
            if(!this.floor(next)||seen[next]||occupied.has(next)) continue
            seen[next]=1; if(prev) prev[next]=q[j]; q.push(next); rep=Math.min(rep,next)
        }
        return {seen,rep,prev}
    }
    solved(boxes) { return boxes.every(b=>this.goalSet.has(b)) }
    key(boxes,rep) { return boxes.join(',')+'|'+rep }
    /** Detecta bloco 2x2 totalmente ocupado que congela uma caixa fora de destino. */
    frozenSquare(boxes, moved) {
        const set=new Set(boxes), x=Math.floor(moved/this.cols),y=moved%this.cols
        for(const a of [x-1,x]) for(const b of [y-1,y]) {
            let solid=true,bad=false
            for(let r=a;r<=a+1;r++) for(let c=b;c<=b+1;c++) {
                if(r<0||r>=this.rows||c<0||c>=this.cols) continue
                const i=r*this.cols+c
                if(!this.walls[i]&&!set.has(i)) solid=false
                if(set.has(i)&&!this.goalSet.has(i)) bad=true
            }
            if(solid&&bad) return true
        }
        return false
    }
    successors(node, counters) {
        const occupied=new Set(node.boxes), reach=this.flood(node.player,occupied), out=[]
        for(const from of node.boxes) for(let d=0;d<4;d++) {
            const to=this.neighbors[from][d], stand=this.neighbors[from][d^1]
            if(!this.floor(to)||!this.floor(stand)||!reach.seen[stand]||occupied.has(to)) continue
            counters.legalPushes++
            const boxes=node.boxes.map(b=>b===from?to:b).sort((a,b)=>a-b)
            const h=this.heuristic(boxes)
            if(!Number.isFinite(h)||this.frozenSquare(boxes,to)) { counters.deadlockPrunes++; continue }
            const rep=this.flood(from,new Set(boxes)).rep
            out.push({boxes,player:from,rep,h,push:{from,to,stand,direction:d},parent:node,g:node.g+1})
        }
        return out
    }
    root() {
        return {boxes:this.boxes.slice(),player:this.player,rep:this.flood(this.player,new Set(this.boxes)).rep,h:this.heuristic(this.boxes),g:0,parent:null,push:null}
    }
    /** Busca A* por empurrões. A primeira solução é ótima em empurrões.
     * Limite atingido não equivale a insolubilidade. */
    solve({maxExpanded=6000,deadline=Infinity,greedy=false}={}) {
        const start=Date.now(), root=this.root(), counters={expanded:0,generated:0,legalPushes:0,deadlockPrunes:0}
        const result=(status,node=null)=>({status,optimal:status==='solved'&&!greedy, ...counters,
            initialLowerBound:Number.isFinite(root.h)?root.h:null, elapsedMs:Date.now()-start,
            pushes:node?this.trace(node):null})
        if(this.solved(root.boxes)) return result('solved',root)
        if(!Number.isFinite(root.h)) return result('unsolvable')
        const heap=[], compare=(a,b)=>(greedy?a.h-b.h:a.g+a.h-b.g-b.h)||a.h-b.h||a.order-b.order
        let order=0
        const put=n=>{n.order=order++;heap.push(n);let i=heap.length-1;while(i){let p=(i-1)>>1;if(compare(heap[p],n)<=0)break;heap[i]=heap[p];i=p}heap[i]=n}
        const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&compare(heap[j+1],heap[j])<0)j++;if(compare(last,heap[j])<=0)break;heap[i]=heap[j];i=j}heap[i]=last}return top}
        const best=new Map([[this.key(root.boxes,root.rep),0]]);put(root)
        while(heap.length) {
            if(Date.now()>=deadline) return result('timeout')
            const n=pop(),key=this.key(n.boxes,n.rep)
            if(best.get(key)!==n.g) continue
            if(this.solved(n.boxes)) return result('solved',n)
            if(counters.expanded>=maxExpanded) return result('limit')
            counters.expanded++
            for(const child of this.successors(n,counters)) {
                // Agente limitado: nunca aceita empurrões que não reduzam h.
                if(greedy&&child.h>=n.h) continue
                counters.generated++
                const k=this.key(child.boxes,child.rep)
                if(best.has(k)&&best.get(k)<=child.g) continue
                best.set(k,child.g);put(child)
            }
        }
        return result(greedy?'greedy_failed':'unsolvable')
    }
    trace(node) {
        const pushes=[]
        while(node.parent) { pushes.push({...node.push,hBefore:node.parent.h,hAfter:node.h});node=node.parent }
        return pushes.reverse()
    }
    /** Verifica cada empurrão e reconstrói os passos do jogador para replay. */
    replay(pushes) {
        let player=this.player, boxes=new Set(this.boxes), steps=[]
        for(const p of pushes) {
            if(!Number.isInteger(p.direction)||p.direction<0||p.direction>3||!boxes.has(p.from)||!this.floor(p.to)||boxes.has(p.to)||!this.floor(p.stand)||this.neighbors[p.from][p.direction]!==p.to||this.neighbors[p.from][p.direction^1]!==p.stand) return {valid:false,steps:[]}
            const reach=this.flood(player,boxes,true)
            if(!reach.seen[p.stand]) return {valid:false,steps:[]}
            const path=[]; for(let i=p.stand;i!==player;i=reach.prev[i]) path.push(i)
            for(const next of path.reverse()) {const d=this.neighbors[player].indexOf(next);steps.push({...this.directions[d]});player=next}
            steps.push({...this.directions[p.direction]});boxes.delete(p.from);boxes.add(p.to);player=p.from
        }
        return {valid:this.solved([...boxes]),steps}
    }
}
