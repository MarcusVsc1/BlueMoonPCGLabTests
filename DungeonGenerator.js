// BlueMoon: Kruskal adaptativo, A* e estilos ortogonais de corredores.
class DungeonGenerator {
    constructor(MAP_SIZE=70, NUM_ROOMS=20) {
        this.MAP_SIZE=MAP_SIZE; this.NUM_ROOMS=NUM_ROOMS;
        this.MIN_ROOM_SIZE=5; this.MAX_ROOM_SIZE=10; this.BUFFER=3;
        this.graph=new Graph(); this.toDebug=[]; this.sucesso=false;
        this.entrySpacing=3; this.minimumEntrySpacing=1; this.turnPenalty=.35;
        // Pesos relativos, nao cotas. Zerar todos restaura o A* da revisao anterior.
        this.corridorStyleWeights={straight:15,angular:25,diagonal:40,organic:20};
        this.corridorStyleExtraTiles=4;
        this.maxPlacementAttempts=5000;
    }
    isOverlapWithBuffer(rooms,r,b) {
        return rooms.some(a=>r.x-b<a.x+a.width && r.x+r.width+b>a.x && r.y-b<a.y+a.height && r.y+r.height+b>a.y);
    }
    createMap() {
        this.sucesso=false; this.lastError=null; this.lastValidation=null; this.lastRouting=null;
        // Permite repetir uma tentativa sem herdar salas/arestas da anterior.
        const maxDegree=this.graph.MAX_EDGES_PER_ROOM;
        this.graph.nodes.length=0; this.graph.adjacencyList.length=0;
        this.graph.MAX_EDGES_PER_ROOM=maxDegree;
        const n=this.MAP_SIZE, map=Array.from({length:n},()=>Array(n).fill(9)), placed=[];
        if(!Number.isInteger(n)||n<this.MIN_ROOM_SIZE+2||!Number.isInteger(this.NUM_ROOMS)||this.NUM_ROOMS<1) return this.fail('Dimensoes invalidas');
        const rnd=()=>random.nextRandFloat();
        for(let i=0;i<this.NUM_ROOMS;i++) {
            const size=()=>this.MIN_ROOM_SIZE+Math.floor(rnd()*(this.MAX_ROOM_SIZE-this.MIN_ROOM_SIZE+1));
            const w=size(),h=size(); let r=null;
            if(w>n-2||h>n-2) return this.fail('Sala maior que o mapa');
            for(let t=0;t<this.maxPlacementAttempts;t++) {
                const p={x:1+Math.floor(rnd()*(n-w-1)),y:1+Math.floor(rnd()*(n-h-1)),width:w,height:h};
                if(!this.isOverlapWithBuffer(placed,p,this.BUFFER)){r=p;break;}
            }
            if(!r)return this.fail('Nao foi possivel posicionar todas as salas');
            const cells=[];
            for(let y=r.y;y<r.y+h;y++)for(let x=r.x;x<r.x+w;x++){cells.push({x,y});map[y][x]=0;}
            this.graph.addNode(new Room(cells,h,w)); placed.push(r);
        }
        if(!this.kruskal(map))return this.fail(this.lastError||'Conexoes insuficientes');
        this.postProcessing(map,n,n);
        this.lastValidation=this.validateConnectivity(map);
        if(!this.lastValidation.ok)return this.fail(this.lastValidation.errors.join('; '));
        this.sucesso=true; return map;
    }
    fail(message){this.sucesso=false;this.lastError=message;return null;}
    static dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    static findNeighbors(map,c){return this.dirs.map(([dx,dy])=>({x:c.x+dx,y:c.y+dy})).filter(p=>p.y>=0&&p.y<map.length&&p.x>=0&&p.x<map[0].length);}
    static findNeighborsByType(map,c,type){return this.findNeighbors(map,c).filter(p=>map[p.y][p.x]===type);}
    key(c){return c.y*this.MAP_SIZE+c.x;}
    // Dados da geometria: cada tile externo sabe quais salas toca.
    routingContext(map){
        const w=map[0].length,h=map.length, owner=new Int32Array(w*h).fill(-1),touch=Array(w*h),blocked=new Uint8Array(w*h);
        this.graph.nodes.forEach((r,i)=>r.cells.forEach(c=>owner[c.y*w+c.x]=i));
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
            const k=y*w+x;
            if(x===0||y===0||x===w-1||y===h-1||owner[k]>=0||map[y][x]!==9){blocked[k]=1;continue;}
            const near=[];
            for(const [dx,dy] of DungeonGenerator.dirs){const j=(y+dy)*w+x+dx;if(map[y+dy][x+dx]===4)blocked[k]=1;if(owner[j]>=0)near.push({index:owner[j],cell:{x:x+dx,y:y+dy}});}
            touch[k]=near;
            if(near.length>1)blocked[k]=1;
        }
        return {w,h,owner,touch,blocked};
    }
    portals(ctx,roomIndex,spacing){
        const r=this.graph.nodes[roomIndex],out=[];
        for(const c of r.findEdgeCells()){
            // Chebyshev: preserva a intencao original de espacamento; relaxa apenas se necessario.
            if(r.terminalCells.some(t=>Math.max(Math.abs(t.x-c.x),Math.abs(t.y-c.y))<=spacing))continue;
            for(let d=0;d<4;d++){
                const [dx,dy]=DungeonGenerator.dirs[d],x=c.x+dx,y=c.y+dy,k=y*ctx.w+x;
                if(x<=0||y<=0||x>=ctx.w-1||y>=ctx.h-1||ctx.blocked[k])continue;
                const t=ctx.touch[k];
                if(t?.length===1&&t[0].index===roomIndex&&t[0].cell.x===c.x&&t[0].cell.y===c.y)out.push({k,x,y,d,terminal:{x:c.x,y:c.y}});
            }
        }
        return out;
    }
    // A* multi-origem e multi-destino. Estado inclui direcao para cobrar curvas.
    route(ctx,starts,ends){
        if(!starts.length||!ends.length)return null;
        const w=ctx.w, goals=new Map(ends.map(p=>[p.k,p]));
        const minX=Math.min(...ends.map(p=>p.x)),maxX=Math.max(...ends.map(p=>p.x)),minY=Math.min(...ends.map(p=>p.y)),maxY=Math.max(...ends.map(p=>p.y));
        const heuristic=k=>{const x=k%w,y=Math.floor(k/w);return Math.max(minX-x,0,x-maxX)+Math.max(minY-y,0,y-maxY);};
        const cost=new Float64Array(ctx.w*ctx.h*4).fill(Infinity),parent=new Int32Array(cost.length).fill(-1),origins=new Map();
        const heap=[];let order=0;
        const less=(a,b)=>a.f<b.f||(a.f===b.f&&a.order<b.order);
        const push=e=>{let i=heap.length;heap.push(e);while(i){let p=(i-1)>>1;if(!less(e,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=e;};
        const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&less(heap[j+1],heap[j]))j++;if(!less(heap[j],last))break;heap[i]=heap[j];i=j;}heap[i]=last;}return top;};
        for(const s of starts){const id=s.k*4+s.d;if(cost[id]===0)continue;cost[id]=0;origins.set(id,s);push({id,g:0,f:heuristic(s.k),order:order++});}
        let best=Infinity,bestId=-1;
        while(heap.length){
            const e=pop();if(e.g!==cost[e.id])continue;if(e.f>=best)break;
            const k=e.id>>2,d=e.id%4,goal=goals.get(k);
            if(goal){const g=e.g+(d===(goal.d^1)?0:this.turnPenalty);if(g<best){best=g;bestId=e.id;}continue;}
            const x=k%w,y=Math.floor(k/w);
            for(let nd=0;nd<4;nd++){
                const [dx,dy]=DungeonGenerator.dirs[nd],nx=x+dx,ny=y+dy,nk=ny*w+nx;
                if(nx<=0||ny<=0||nx>=w-1||ny>=ctx.h-1||ctx.blocked[nk])continue;
                if(ctx.touch[nk]?.length&&!goals.has(nk))continue;
                const id=nk*4+nd,g=e.g+1+(nd===d?0:this.turnPenalty);
                if(g>=cost[id])continue;cost[id]=g;parent[id]=e.id;push({id,g,f:g+heuristic(nk),order:order++});
            }
        }
        if(bestId<0)return null;
        const cells=[];let id=bestId;
        while(id>=0){const k=id>>2;cells.push({x:k%w,y:Math.floor(k/w)});if(parent[id]<0)break;id=parent[id];}
        cells.reverse();return {cells,cellA:origins.get(id).terminal,cellB:goals.get(bestId>>2).terminal,cost:best+2};
    }
    // Classifica apenas o traçado externo (sem contar as entradas nas salas).
    corridorShape(cells){
        let turns=0,last=-1,steps=Math.max(0,cells.length-1);
        for(let i=1;i<cells.length;i++){
            const dx=cells[i].x-cells[i-1].x,dy=cells[i].y-cells[i-1].y;
            const d=DungeonGenerator.dirs.findIndex(v=>v[0]===dx&&v[1]===dy);
            if(last>=0&&d!==last)turns++;last=d;
        }
        const style=turns===0?'straight':turns<=2?'angular':turns>=.7*(steps-1)?'diagonal':'organic';
        return {style,turns,steps};
    }
    selectCorridorStyle(){
        const entries=['straight','angular','diagonal','organic'].map(k=>[k,Number(this.corridorStyleWeights?.[k])]).filter(v=>Number.isFinite(v[1])&&v[1]>0);
        const total=entries.reduce((n,v)=>n+v[1],0);if(!total||!Number.isFinite(total))return null;
        let r=random.nextRandFloat()*total;
        for(const [style,weight] of entries){r-=weight;if(r<0)return style;}
        return entries[entries.length-1][0];
    }
    // Toda variante usa a mesma geometria de bloqueios do A*, sem tocar outros
    // corredores/salas. Apenas os dois portais escolhidos podem tocar salas.
    validStyledPath(ctx,cells,start,end){
        if(!cells.length||cells[0].x!==start.x||cells[0].y!==start.y||cells.at(-1).x!==end.x||cells.at(-1).y!==end.y)return false;
        const keys=new Set(),w=ctx.w;
        for(let i=0;i<cells.length;i++){
            const {x,y}=cells[i],k=y*w+x;
            if(x<=0||y<=0||x>=w-1||y>=ctx.h-1||ctx.blocked[k]||keys.has(k))return false;
            const touches=ctx.touch[k]||[];
            const isPortal=i===0||i===cells.length-1;
            if(isPortal){
                const p=i===0?start:end;
                if(touches.length!==1||touches[0].cell.x!==p.terminal.x||touches[0].cell.y!==p.terminal.y)return false;
                // Um único tile nao pode ser portal de duas salas distintas.
                if(cells.length===1)return false;
            }else if(touches.length)return false;
            if(i&&Math.abs(x-cells[i-1].x)+Math.abs(y-cells[i-1].y)!==1)return false;
            let neighbors=0;
            for(const [dx,dy] of DungeonGenerator.dirs)if(keys.has((y+dy)*w+x+dx))neighbors++;
            if(neighbors!==(i?1:0))return false;
            keys.add(k);
        }
        return true;
    }
    // Traçados monotônicos: sempre ortogonais, com comprimento de Manhattan.
    // Variantes diagonais balanceiam o progresso de X e Y (escada de Bresenham).
    styleSequences(style,nx,ny){
        const out=[],seen=new Set();
        const add=s=>{const k=s.join('');if(!seen.has(k)){seen.add(k);out.push(s);}};
        const run=(axis,n)=>Array(n).fill(axis);
        if(style==='straight'){if(!nx||!ny)add([...run(0,nx),...run(1,ny)]);return out;}
        if(!nx||!ny)return out;
        if(style==='angular'){
            add([...run(0,nx),...run(1,ny)]);add([...run(1,ny),...run(0,nx)]);
            for(const [axis,a,b] of [[0,nx,ny],[1,ny,nx]])for(const split of new Set([1,Math.floor(a/2),a-1]))if(split>0&&split<a)add([...run(axis,split),...run(1-axis,b),...run(axis,a-split)]);
        }else if(style==='diagonal'){
            for(const tie of [0,1]){let x=0,y=0;const seq=[];while(x<nx||y<ny){
                const delta=(x+1)*ny-(y+1)*nx;
                if(y===ny||(x<nx&&(delta<0||(delta===0&&tie===0)))){seq.push(0);x++;}else{seq.push(1);y++;}
            }add(seq);}
            // Outra escada começa pelo eixo curto, útil quando o portal limita a primeira curva.
            for(const first of [0,1]){let x=nx,y=ny,axis=first;const seq=[];while(x||y){if((axis===0&&x)||(axis===1&&y)){seq.push(axis);if(axis===0)x--;else y--;}axis=1-axis;}add(seq);}
        }else if(style==='organic'){
            for(const [axis,a,b] of [[0,nx,ny],[1,ny,nx]]){
                if(a<2||b<2)continue;
                for(const i of new Set([1,Math.floor(a/2),a-1]))for(const j of new Set([1,Math.floor(b/2),b-1]))if(i>0&&i<a&&j>0&&j<b)add([...run(axis,i),...run(1-axis,j),...run(axis,a-i),...run(1-axis,b-j)]);
            }
        }
        return out;
    }
    stylePath(start,end,seq){
        let x=start.x,y=start.y;const dx=Math.sign(end.x-x),dy=Math.sign(end.y-y),cells=[{x,y}];
        for(const axis of seq){if(axis===0)x+=dx;else y+=dy;cells.push({x,y});}return cells;
    }
    // Seleciona a conexão por A* PRIMEIRO; estiliza somente a aresta vencedora.
    // Pode trocar os portais dessa mesma dupla para recuperar diagonais que
    // seriam impossíveis entre os portais mais próximos (frequentemente alinhados).
    styleRoute(ctx,starts,ends,base,requested){
        if(!requested)return base;
        const extra=Number(this.corridorStyleExtraTiles),maxLength=base.cells.length+Math.max(0,Math.min(20,Number.isFinite(extra)?Math.floor(extra):0));
        let length=Infinity,options=[];
        const offer=(cells,a,b)=>{
            if(cells.length>maxLength||cells.length>length||this.corridorShape(cells).style!==requested||!this.validStyledPath(ctx,cells,a,b))return;
            if(cells.length<length){length=cells.length;options=[];}
            options.push({cells,cellA:a.terminal,cellB:b.terminal,cost:cells.length+1});
        };
        // Inclui a rota A* quando ela já tem a forma pedida.
        const s=starts.find(p=>p.x===base.cells[0].x&&p.y===base.cells[0].y),e=ends.find(p=>p.x===base.cells.at(-1).x&&p.y===base.cells.at(-1).y);
        if(s&&e)offer(base.cells,s,e);
        for(const a of starts)for(const b of ends){
            const nx=Math.abs(b.x-a.x),ny=Math.abs(b.y-a.y),len=nx+ny+1;
            if(len>maxLength||len>length||len<2)continue;
            for(const seq of this.styleSequences(requested,nx,ny))offer(this.stylePath(a,b,seq),a,b);
        }
        return options.length?options[Math.floor(random.nextRandFloat()*options.length)]:base;
    }
    kruskal(map){
        const rooms=this.graph.nodes,n=rooms.length,par=rooms.map((_,i)=>i),rank=new Uint8Array(n),degree=new Uint16Array(n);
        const find=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
        const union=(a,b)=>{a=find(a);b=find(b);if(a===b)return;if(rank[a]<rank[b])[a,b]=[b,a];par[b]=a;if(rank[a]===rank[b])rank[a]++;};
        let spacing=this.entrySpacing,added=0;this.lastRouting={searches:0,relaxations:0,requestedStyles:{},actualStyles:{},fallbacks:0,corridors:[]};
        while(added<n-1){
            const ctx=this.routingContext(map), portals=rooms.map((_,i)=>this.portals(ctx,i,spacing)),pairs=[];
            for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){
                if(find(a)===find(b)||degree[a]>=this.graph.MAX_EDGES_PER_ROOM||degree[b]>=this.graph.MAX_EDGES_PER_ROOM||!portals[a].length||!portals[b].length)continue;
                let lower=Infinity;for(const p of portals[a])for(const q of portals[b])lower=Math.min(lower,Math.abs(p.x-q.x)+Math.abs(p.y-q.y)+2);
                pairs.push({a,b,lower});
            }
            pairs.sort((a,b)=>a.lower-b.lower||a.a-b.a||a.b-b.b);let best=null;
            for(const p of pairs){if(best&&p.lower>=best.route.cost)break;this.lastRouting.searches++;const route=this.route(ctx,portals[p.a],portals[p.b]);if(route&&(!best||route.cost<best.route.cost))best={...p,route};}
            if(!best){if(spacing>this.minimumEntrySpacing){spacing--;this.lastRouting.relaxations++;continue;}this.lastError='Nao ha corredor valido entre os componentes';return false;}
            const {a,b}=best,ra=rooms[a],rb=rooms[b];
            const requested=this.selectCorridorStyle(),route=this.styleRoute(ctx,portals[a],portals[b],best.route,requested);
            const shape=this.corridorShape(route.cells),stats=this.lastRouting;
            if(requested)stats.requestedStyles[requested]=(stats.requestedStyles[requested]||0)+1;
            stats.actualStyles[shape.style]=(stats.actualStyles[shape.style]||0)+1;
            if(requested&&requested!==shape.style)stats.fallbacks++;
            stats.corridors.push({requested,actual:shape.style,turns:shape.turns,tiles:route.cells.length,baseTiles:best.route.cells.length});
            ra.addTerminalCell(route.cellA);rb.addTerminalCell(route.cellB);
            for(const [r,c] of [[ra,route.cellA],[rb,route.cellB]])r.unavailableCells.push(c,...this.findNeighborCells(c,spacing));
            this.fillCorridor(route.cells,map);this.graph.addEdge(ra,rb,route.cells);degree[a]++;degree[b]++;union(a,b);added++;
        }
        return true;
    }
    postProcessing(map,w,h){this.addWalls(h,w,map);}
    // Rotas ja possuem somente celulas externas. Nao recortar depois de construir.
    removeCorridorUnnecessaryCells(map){return map;}
    addWalls(h,w,map){for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(map[y][x]===0||map[y][x]===4)this.addWallsToNeighbors(map,{x,y});}
    addWallsToNeighbors(map,c){for(const p of DungeonGenerator.findNeighborsByType(map,c,9))map[p.y][p.x]=6;}
    findNeighborCells(c,distance){const out=[];for(let dx=-distance;dx<=distance;dx++)for(let dy=-distance;dy<=distance;dy++){const x=c.x+dx,y=c.y+dy;if((dx||dy)&&x>=0&&y>=0&&x<this.MAP_SIZE&&y<this.MAP_SIZE)out.push({x,y});}return out;}
    fillCorridor(cells,map){for(const c of cells)map[c.y][c.x]=4;}
    fillRoomInteriorWithEmpty(cells,map){for(const c of cells)map[c.y][c.x]=0;}
    addWallsToRoom(room,map){for(const c of room.cells)if(DungeonGenerator.findNeighborsByType(map,c,9).length)map[c.y][c.x]=6;}
    disjoint(a,b){const keys=new Set(a.map(c=>`${c.x},${c.y}`));return b.every(c=>!keys.has(`${c.x},${c.y}`));}
    removerDuplicatas(arr){return [...new Map(arr.map(c=>[`${c.x},${c.y}`,c])).values()];}
    // Compatibilidade para chamadas antigas: traçado via A* entre dois portais concretos.
    createCorridorBetweenCells(a,b,map){if(!map)return [];const ctx=this.routingContext(map),i=ctx.owner[a.y*ctx.w+a.x],j=ctx.owner[b.y*ctx.w+b.x];if(i<0||j<0||i===j)return [];const match=c=>p=>p.terminal.x===c.x&&p.terminal.y===c.y;const r=this.route(ctx,this.portals(ctx,i,-1).filter(match(a)),this.portals(ctx,j,-1).filter(match(b)));return r?[a,...r.cells,b]:[];}
    corridorHasObstacles(cells,map){return cells.length<3||cells.slice(1,-1).some(c=>map[c.y]?.[c.x]!==9);}
    corridorPassesByRoom(cells,map,a,b){return cells.some(c=>DungeonGenerator.findNeighbors(map,c).some(p=>{const r=this.graph.findRoomByCoordinates(p.x,p.y);return r&&r!==a&&r!==b;}));}
    fillAdjacentCells(){/* Nao modificar salas durante a busca. */}
    validateConnectivity(map){
        const errors=[],w=map[0].length,h=map.length,rooms=this.graph.nodes,edges=this.graph.adjacencyList,key=c=>c.y*w+c.x,roomByCell=new Map(),edgeByCell=new Map(),roomById=new Map(rooms.map(r=>[r.roomId,r]));
        const walk=c=>map[c.y]?.[c.x]===0||map[c.y]?.[c.x]===4;
        const same=(a,b)=>a.x===b.x&&a.y===b.y;
        for(const r of rooms)for(const c of r.cells){if(roomByCell.has(key(c))||map[c.y]?.[c.x]!==0)errors.push('Sala sobreposta ou bloqueada');roomByCell.set(key(c),r);}
        if(edges.length!==Math.max(0,rooms.length-1))errors.push('Quantidade incorreta de arestas');
        const contacts=new Map(rooms.map(r=>[r,new Set()]));
        for(const e of edges){
            const a=roomById.get(e.fromRoom),b=roomById.get(e.toRoom);
            if(!a||!b||a===b||!e.cells.length){errors.push('Aresta invalida');continue;}
            for(let i=0;i<e.cells.length;i++){
                const c=e.cells[i],k=key(c);if(edgeByCell.has(k)||map[c.y]?.[c.x]!==4)errors.push('Corredor sobreposto ou bloqueado');edgeByCell.set(k,e);
                if(i&&Math.abs(c.x-e.cells[i-1].x)+Math.abs(c.y-e.cells[i-1].y)!==1)errors.push('Corredor descontínuo');
            }
            for(const [r,c] of [[a,e.cells[0]],[b,e.cells[e.cells.length-1]]]){const near=DungeonGenerator.findNeighbors(map,c).filter(p=>roomByCell.get(key(p))===r);if(near.length!==1||!r.terminalCells.some(t=>same(t,near[0])))errors.push('Entrada incorreta');else contacts.get(r).add(key(near[0]));}
        }
        for(const e of edges)for(let i=0;i<e.cells.length;i++){
            const c=e.cells[i];for(const p of DungeonGenerator.findNeighbors(map,c)){
                const k=key(p),r=roomByCell.get(k),other=edgeByCell.get(k);
                if(r&&!((i===0&&r.roomId===e.fromRoom)||(i===e.cells.length-1&&r.roomId===e.toRoom)))errors.push('Atalho corredor-sala');
                if(other&&(other!==e||!(same(p,e.cells[i-1]||{x:-1,y:-1})||same(p,e.cells[i+1]||{x:-1,y:-1}))))errors.push('Atalho entre corredores');
            }
        }
        for(const r of rooms){if(contacts.get(r).size!==r.terminalCells.length||r.terminalCells.length!==this.graph.countEdges(r))errors.push('Entradas divergentes do grafo');for(const c of r.cells)for(const p of DungeonGenerator.findNeighbors(map,c)){const other=roomByCell.get(key(p));if(other&&other!==r)errors.push('Salas adjacentes sem corredor');}}
        const start=rooms[0]?.cells[0],queue=start?[start]:[],seen=new Set(queue.map(key));
        for(let i=0;i<queue.length;i++)for(const p of DungeonGenerator.findNeighbors(map,queue[i]))if(walk(p)&&!seen.has(key(p))){seen.add(key(p));queue.push(p);}
        let count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(walk({x,y})){count++;if(!roomByCell.has(y*w+x)&&!edgeByCell.has(y*w+x))errors.push('Piso sem dono');}
        if(count!==seen.size)errors.push('Mapa fisico desconectado');
        if(rooms.length&&rooms.some(r=>!this.graph.areNodesConnected(rooms[0],r)))errors.push('Grafo desconectado');
        return {ok:errors.length===0,errors:[...new Set(errors)],reachable:seen.size,walkable:count,rooms:rooms.length,edges:edges.length};
    }
}
