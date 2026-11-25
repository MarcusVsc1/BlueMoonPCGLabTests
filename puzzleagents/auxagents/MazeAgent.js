// Prim aleatorizado por arestas; coordenadas locais x=linha, y=coluna (legado).
class MazeAgent {
    constructor(){
        this.defaultTag='MazeAgent';this.frontierCells=[];this.candidateCount=12;
        this.levelMapper=new Map();
        this.levelMapper.set(1,(r,c)=>this.posicionarColecionavel(r,c));
        for(let i=2;i<=4;i++)this.levelMapper.set(i,(r,c,l)=>this.createEnemy(r,c,l));
    }
    gerarTagAuxiliar(graph,room){
        if(graph.getNeighbors(room).length>1||room.cells.length<36||room.terminalCells.length!==1)return false;
        room.tag.auxiliar=this.defaultTag;return true;
    }
    gerarAgenteAuxiliar(room,collectible,level){
        if(!this.criarLabirinto(room))return false;
        const fn=this.levelMapper.get(level)||this.levelMapper.get(1);fn(room,collectible,level);return true;
    }
    inicializarMatriz(m,n){return Array.from({length:m},()=>Array(n).fill('bloqueado'));}
    static dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    static key(c){return `${c.x},${c.y}`;}
    static inBounds(m,x,y){return x>=0&&x<m.length&&y>=0&&y<m[0].length;}
    static neighbors(m,c){return this.dirs.map(([dx,dy])=>({x:c.x+dx,y:c.y+dy})).filter(p=>this.inBounds(m,p.x,p.y));}
    getFrontierCells(m,x,y){const f=[];for(const [dx,dy] of MazeAgent.dirs){const a=x+2*dx,b=y+2*dy;if(MazeAgent.inBounds(m,a,b)&&m[a][b]==='bloqueado')f.push({x:a,y:b,inBetween:{x:x+dx,y:y+dy}});}return f;}
    randomizedPrim(cell,matrix){
        this.frontierCells=[];matrix[cell.x][cell.y]='passagem';this.frontierCells.push(...this.getFrontierCells(matrix,cell.x,cell.y));
        while(this.frontierCells.length){
            const f=this.frontierCells,i=Math.floor(random.nextRandFloat()*f.length),edge=f[i];f[i]=f[f.length-1];f.pop();
            if(matrix[edge.x][edge.y]!=='bloqueado')continue; // aresta obsoleta: ja visitado
            matrix[edge.x][edge.y]='passagem';matrix[edge.inBetween.x][edge.inBetween.y]='passagem';
            f.push(...this.getFrontierCells(matrix,edge.x,edge.y));
        }
        return matrix;
    }
    diffArraysByXY(a,b){return a.filter(p=>!b.some(q=>p.x===q.x&&p.y===q.y));} // API legada, nao usada pelo Prim
    // Conecta entrada real ao labirinto por uma unica passagem. Se criar ciclo,
    // o candidato e descartado. A grade da mesma paridade da entrada e o fallback.
    connectEntrance(m,start){
        if(m[start.x][start.y]==='passagem')return true;
        const q=[start],prev=new Map([[MazeAgent.key(start),null]]);let end=null;
        for(let i=0;i<q.length&&!end;i++){
            const c=q[i],near=MazeAgent.neighbors(m,c),open=near.filter(p=>m[p.x][p.y]==='passagem');
            if(open.length===1){end=c;break;}if(open.length>1)continue;
            for(const p of near){const k=MazeAgent.key(p);if(m[p.x][p.y]==='bloqueado'&&!prev.has(k)){prev.set(k,c);q.push(p);}}
        }
        if(!end)return false;
        for(let c=end;c;c=prev.get(MazeAgent.key(c)))m[c.x][c.y]='passagem';
        return true;
    }
    analyze(m,start){
        const key=MazeAgent.key,open=c=>m[c.x][c.y]==='passagem',near=c=>MazeAgent.neighbors(m,c).filter(open);
        if(!MazeAgent.inBounds(m,start.x,start.y)||!open(start))return null;
        const q=[start],d=new Map([[key(start),0]]),prev=new Map(),children=new Map();let degreeSum=0;
        for(let i=0;i<q.length;i++){const c=q[i],ns=near(c);degreeSum+=ns.length;children.set(key(c),ns.length);for(const p of ns)if(!d.has(key(p))){d.set(key(p),d.get(key(c))+1);prev.set(key(p),c);q.push(p);}}
        const count=m.reduce((s,r)=>s+r.filter(v=>v==='passagem').length,0);
        if(q.length!==count||degreeSum/2!==count-1)return null;
        const distance=Math.max(...d.values());let best=null;
        // Apenas objetivos de distancia maxima, como na implementacao original.
        for(const goal of q.filter(c=>d.get(key(c))===distance)){
            const path=[];for(let c=goal;c;c=prev.get(key(c)))path.push(c);path.reverse();
            const pathKeys=new Set(path.map(key));let branches=0,detourDepth=0,turns=0;
            for(let i=0;i<path.length;i++){
                const c=path[i],off=near(c).filter(p=>!pathKeys.has(key(p)));
                if(off.length)branches++;
                for(const p of off){let max=1;const stack=[{c:p,from:c,depth:1}];while(stack.length){const t=stack.pop();max=Math.max(max,t.depth);for(const n of near(t.c))if(key(n)!==key(t.from)&&!pathKeys.has(key(n)))stack.push({c:n,from:t.c,depth:t.depth+1});}detourDepth+=max;}
                if(i>1){const a=path[i-2],b=path[i-1];if(b.x-a.x!==c.x-b.x||b.y-a.y!==c.y-b.y)turns++;}
            }
            const area=m.length*m[0].length,den=Math.max(1,count-1),deadEnds=q.filter(c=>children.get(key(c))===1&&key(c)!==key(start)).length;
            const metrics={distance,branches,detourDepth,turns,deadEnds,walkable:count,coverage:count/area};
            // Pesos experimentais; comprimento nao e a unica medida de dificuldade.
            const score=100*(.30*distance/den+.25*Math.min(1,branches/Math.max(1,distance/4))+.20*Math.min(1,detourDepth/den)+.15*turns/Math.max(1,distance-1)+.10*count/area);
            const candidate={goal,path,metrics,score};if(!best||score>best.score)best=candidate;
        }
        return best;
    }
    generateMaze(h,w,start){
        if(!Number.isInteger(h)||!Number.isInteger(w)||h<1||w<1||!MazeAgent.inBounds(Array.from({length:h},()=>Array(w)),start.x,start.y))return null;
        const parity=[[start.x%2,start.y%2],...[ [0,0],[0,1],[1,0],[1,1] ].filter(([a,b])=>a!==start.x%2||b!==start.y%2)];let best=null;
        for(let i=0;i<Math.max(1,this.candidateCount);i++){
            const [a,b]=parity[i%4];if(a>=h||b>=w)continue;
            const nearest=(v,p,n)=>{let k=Math.min(n-1,v);if(k%2!==p)k=k>0?k-1:k+1;return k;};
            const root={x:nearest(start.x,a,h),y:nearest(start.y,b,w)},m=this.randomizedPrim(root,this.inicializarMatriz(h,w));
            if(!this.connectEntrance(m,start))continue;
            const analysis=this.analyze(m,start);if(!analysis)continue;
            if(!best||analysis.score>best.score)best={matrix:m,...analysis};
        }
        return best;
    }
    criarLabirinto(room){
        if(room.terminalCells.length!==1)return false;
        const base=room.cells[0],t=room.terminalCells[0],start={x:t.y-base.y,y:t.x-base.x};
        this.roomTotalCells=room.roomHeight*room.roomWidth;
        const candidate=this.generateMaze(room.roomHeight,room.roomWidth,start);if(!candidate)return false;
        this.lastMaze=candidate;room.mazeDifficulty={score:candidate.score,...candidate.metrics};
        room.mazeGoal={x:base.x+candidate.goal.y,y:base.y+candidate.goal.x};
        darkRoom(room.roomId);this.mapToDungeon(base,candidate.matrix.map(r=>r.map(v=>v==='passagem'?0:6)));return true;
    }
    posicionarColecionavel(room,collectible){
        let goal=room.mazeGoal;
        if(!goal){const start=room.terminalCells[0];if(!start)return false;const q=[{...start,distance:0}],seen=new Set([MazeAgent.key(start)]),allowed=new Set(room.cells.map(MazeAgent.key));for(let i=0;i<q.length;i++)for(const n of this.getFloorNeighbors(q[i]))if(allowed.has(MazeAgent.key(n))&&!seen.has(MazeAgent.key(n))){seen.add(MazeAgent.key(n));q.push(n);}goal=q[q.length-1];}
        collectible.x=goal.x*32+16;collectible.y=goal.y*32+16;cena1.adicionar(collectible);return true;
    }
    getFloorNeighbors(c){const cells=gerenciador.estagios[0].mapa.cells;return MazeAgent.dirs.map(([dx,dy])=>({x:c.x+dx,y:c.y+dy,distance:(c.distance??0)+1})).filter(p=>cells[p.x]?.[p.y]?.tipo===0);}
    createEnemy(room,collectible,level){collectible.enemyFactory=new EnemyFactory();collectible.level=level-1;collectible.startCell=room.terminalCells[0];collectible.onGet=this.onGet;this.posicionarColecionavel(room,collectible);}
    onGet(){assetsMng.play('darkness');cena1.dialogo='CUIDADO! Um inimigo apareceu!';cena1.caution=true;this.enemyFactory.createEnemyWithDrop(this.level,null,null,this.startCell.x,this.startCell.y);this.onGet=null;}
    mapToDungeon(cell,m){const cells=gerenciador.estagios[0].mapa.cells;for(let i=0;i<m.length;i++)for(let j=0;j<m[i].length;j++)cells[cell.x+j][cell.y+i].tipo=m[i][j];}
}
