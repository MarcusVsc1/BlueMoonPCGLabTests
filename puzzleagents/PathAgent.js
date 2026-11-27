'use strict';
// BM_PATH_AGENT_1B: reserve alternatives during planning, not empty PathAgents.
class PathAgent {
    static rules = Object.freeze({MazeAgent:Object.freeze({enemies:false,rewards:false,minConnections:2})});
    static supports(key) { return Object.hasOwn(this.rules,key); }
    static degree(graph,room) { return graph.getNeighbors(room).length; }
    static filterAuxiliary(graph,room,candidates) {
        const t=room.tag||{};
        if(t.tipo==='hub'||t.subTipo==='Hub'||t.auxiliar==='Hub') { candidates.clear(); return candidates; }
        if(this.degree(graph,room)!==1) for(const key of ['MazeAgent','AbyssAgent','SokobanAgent']) candidates.delete(key);
        return candidates;
    }
    static inspect(graph,room,{initialRoom,exitRoom,map}={}) {
        const reasons=[], t=room?.tag;
        if(!t)return {eligible:false,potential:false,degree:0,reasons:['missing-tag']};
        const degree=this.degree(graph,room);
        if(degree<2)reasons.push('degree');
        if(room===initialRoom||room===exitRoom||t.tipo==='inicio')reasons.push('endpoint');
        if(t.tipo==='hub'||t.subTipo==='Hub'||t.auxiliar==='Hub')reasons.push('hub');
        if(t.collectible!=null||room.restricoes?.length||t.tipo==='colecionável')reasons.push('reserved-resource');
        // All rooms with null auxiliary are reserved for powers/exit by the manager.
        // Only an ordinary combat alternative can be reserved in this phase.
        if(t.tipo!=='combatRoom'||t.subTipo!=='CombatRoom'||t.auxiliar!=='CombatRoom')reasons.push('existing-role');
        const cells=room.cells||[], terminals=room.terminalCells||[], w=room.roomWidth,h=room.roomHeight;
        const k=p=>`${p.x},${p.y}`, own=new Set(cells.map(k)), base=cells[0];
        if(!base||!Number.isInteger(w)||!Number.isInteger(h)||w<5||h<5||cells.length<36||own.size!==w*h||cells.length!==w*h||cells.some(p=>p.x<base.x||p.x>=base.x+w||p.y<base.y||p.y>=base.y+h)) reasons.push('geometry');
        const edges=graph.getCorridorsFromRoom(room);
        const portals=edges.map(e=>e.fromRoom===room.roomId?e.cells?.[0]:e.toRoom===room.roomId?e.cells?.at(-1):null);
        const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
        if(terminals.length!==degree||edges.length!==degree||new Set(terminals.map(k)).size!==degree||terminals.some(t=>!own.has(k(t))||!base||!(t.x===base.x||t.x===base.x+w-1||t.y===base.y||t.y===base.y+h-1))||portals.some(p=>!p||own.has(k(p))||terminals.filter(t=>distance(p,t)===1).length!==1)||terminals.some(t=>portals.filter(p=>p&&distance(p,t)===1).length!==1))reasons.push('portals');
        if(edges.some(e=>e.restricoes?.length||e.tags?.length))reasons.push('restricted-corridor');
        // unavailableCells is the generator's portal-spacing buffer, not a resource reservation.
        if(!map||cells.some(p=>map[p.x]?.[p.y]?.tipo!==0||map[p.x]?.[p.y]?.bmAbyssTerrain))reasons.push('non-plain');
        const potential=reasons.length===0;
        if(room.bmPathSlot!==true)reasons.push('not-reserved');
        return {eligible:reasons.length===0,potential,degree,reasons};
    }
    static reserve(graph,rooms,options) {
        const slots=[];
        for(const room of new Set(rooms)){
            delete room.bmPathSlot;
            if(!this.inspect(graph,room,options).potential)continue;
            room.bmPathSlot=true;
            slots.push(room);
        }
        return slots;
    }
    static report(graph,rooms,options) {
        return [...new Set(rooms)].map(room=>({roomId:room.roomId,tagType:room.tag?.tipo,tagSubtype:room.tag?.subTipo,auxiliary:room.tag?.auxiliar,reserved:room.bmPathSlot===true,active:this.isActive(room),...this.inspect(graph,room,options)}));
    }
    // BM_PATH_AGENT_2: the same MazeAgent ticket is relocated, never drawn twice.
    static isActive(room) { return room?.tag?.tipo==='pathAgent' && room.tag.auxiliar==='MazeAgent' && !!room.bmPassageMaze; }
    static shuffle(items,rng) {
        const a=items.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng.nextRandFloat()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;
    }
    static localTerminals(room) {
        const b=room.cells?.[0],h=room.roomHeight,w=room.roomWidth;
        if(!b||!Number.isInteger(h)||!Number.isInteger(w)||h<5||w<5||room.terminalCells?.length<2||!room.terminalCells)return null;
        const ts=room.terminalCells.map(t=>({x:t.y-b.y,y:t.x-b.x}));
        if(ts.some(t=>!Number.isInteger(t.x)||!Number.isInteger(t.y)||t.x<0||t.y<0||t.x>=h||t.y>=w||!(t.x===0||t.y===0||t.x===h-1||t.y===w-1))||new Set(ts.map(t=>`${t.x},${t.y}`)).size!==ts.length)return null;
        return ts;
    }
    // Analyze every pair, not just the first two. Coordinates x=row, y=column.
    static passageMetrics(m,ts) {
        if(!Array.isArray(m)||!m.length||!Array.isArray(m[0])||!m[0].length||!Array.isArray(ts)||ts.length<2)return null;
        const h=m.length,w=m[0].length,key=p=>p.x*w+p.y,open=p=>m[p.x]?.[p.y]==='passagem';
        if(m.some(r=>r.length!==w||r.some(v=>v!=='passagem'&&v!=='bloqueado'))||!ts.every(open)||new Set(ts.map(key)).size!==ts.length)return null;
        const near=p=>[{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y-1},{x:p.x,y:p.y+1}].filter(open);
        const bfs=s=>{const q=[s],d=new Map([[key(s),0]]),prev=new Map();let degree=0;for(let i=0;i<q.length;i++){const ns=near(q[i]);degree+=ns.length;for(const p of ns)if(!d.has(key(p))){d.set(key(p),d.get(key(q[i]))+1);prev.set(key(p),q[i]);q.push(p);}}return {q,d,prev,degree};};
        const first=bfs(ts[0]),walkable=m.reduce((n,r)=>n+r.filter(v=>v==='passagem').length,0);
        if(first.q.length!==walkable||first.degree!==2*(walkable-1)||walkable>=h*w)return null;
        const pairs=[],meaningful=Array(ts.length).fill(false);
        for(let i=0;i<ts.length;i++){
            const a=ts[i],search=i===0?first:bfs(a);
            for(let j=i+1;j<ts.length;j++){
                const b=ts[j],distance=search.d.get(key(b)),manhattan=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
                if(!Number.isInteger(distance)||distance>30)return null;
                const route=[];for(let p=b;p;p=search.prev.get(key(p)))route.push(p);route.reverse();
                const span=Math.max((Math.max(...route.map(p=>p.x))-Math.min(...route.map(p=>p.x)))/(h-1),(Math.max(...route.map(p=>p.y))-Math.min(...route.map(p=>p.y)))/(w-1));
                const shared=[];
                if(a.x===0&&b.x===0)shared.push([p=>p.x,Math.ceil((h-1)/2)]);
                if(a.x===h-1&&b.x===h-1)shared.push([p=>h-1-p.x,Math.ceil((h-1)/2)]);
                if(a.y===0&&b.y===0)shared.push([p=>p.y,Math.ceil((w-1)/2)]);
                if(a.y===w-1&&b.y===w-1)shared.push([p=>w-1-p.y,Math.ceil((w-1)/2)]);
                const deep=shared.every(([depth,limit])=>route.some(p=>depth(p)>=limit));
                const challenge=distance>=10&&distance>=1.5*manhattan&&span>=.5&&deep;
                if(challenge){meaningful[i]=true;meaningful[j]=true;}
                pairs.push({from:i,to:j,distance,manhattan,span,deep,challenge});
            }
        }
        // Two ports retain the old strict rule. With branches, each entrance must
        // have at least one meaningful route; nearby exits may have shorter routes.
        if(!meaningful.every(Boolean))return null;
        const distances=pairs.map(p=>p.distance),qualifying=pairs.filter(p=>p.challenge).length;
        return {terminalCount:ts.length,pairs,qualifyingPairs:qualifying,minPassageDistance:Math.min(...distances),maxPassageDistance:Math.max(...distances),passageDistance:Math.max(...distances),distance:Math.max(...distances),deadEnds:first.q.filter(p=>near(p).length===1&&!ts.some(t=>key(t)===key(p))).length,walkable,coverage:walkable/(h*w),cycles:0,shortcuts:0};
    }
    static validPassage(room,layout) {
        const ts=this.localTerminals(room),m=layout?.matrix;
        return !!(ts&&m?.length===room.roomHeight&&m.every(r=>r.length===room.roomWidth)&&this.passageMetrics(m,ts));
    }
    static generatePassage(maze,room,rng) {
        const ts=this.localTerminals(room);if(!ts)return null;
        if(ts.length===2){const p=maze.generatePassage(room);if(this.validPassage(room,p))return {...p,metrics:{...this.passageMetrics(p.matrix,ts),...p.metrics}};}
        const h=room.roomHeight,w=room.roomWidth;let best=null;
        // Reuse the original randomized Prim and entrance attachment. Search is bounded.
        // Four parities and shuffled entrance orders allow asymmetric layouts.
        for(let i=0;i<32;i++){
            const order=this.shuffle(ts,rng),start=order[0],a=i%2,b=Math.floor(i/2)%2;
            const nearest=(v,p,n)=>v%2===p?v:(v>0?v-1:Math.min(n-1,v+1));
            const root={x:nearest(start.x,a,h),y:nearest(start.y,b,w)};
            const m=maze.randomizedPrim(root,maze.inicializarMatriz(h,w));
            if(!order.every(t=>maze.connectEntrance(m,t)))continue;
            const metrics=this.passageMetrics(m,ts);if(!metrics)continue;
            const score=metrics.qualifyingPairs*100+metrics.deadEnds+metrics.coverage;
            if(!best||score>best.score)best={matrix:m,terminals:ts,metrics:{...metrics,generationAttempts:i+1,additionalSearch:ts.length===2},score};
            if(metrics.qualifyingPairs===metrics.pairs.length)break;
        }
        return best;
    }
    static allocate(manager,orderedRooms,options,rng) {
        const graph=manager.mapGraph,maze=manager.auxAgents.get('MazeAgent')?.agent;
        const rooms=[...new Set(orderedRooms)],slots=[...new Set(manager.bmPathSlots||[])];
        const donors=rooms.filter(r=>r.tag?.auxiliar==='MazeAgent'&&!r.bmPassageMaze);
        const summary={tickets:donors.length,requestedPassage:0,active:0,corner:donors.length,noCandidate:0,noLayout:0,noReplacement:0,assignments:[]};
        if(!maze||!this.supports('MazeAgent'))return summary;
        for(const donor of donors){
            if(rng.nextRandFloat()>=.40)continue;
            summary.requestedPassage++;
            if(!donor.tag?.collectible||this.degree(graph,donor)!==1){summary.noCandidate++;continue;}
            const candidates=this.shuffle(slots.filter(r=>rooms.includes(r)&&!this.isActive(r)&&this.inspect(graph,r,options).eligible&&!graph.getNeighbors(r).some(n=>n!==donor&&['MazeAgent','AbyssAgent'].includes(n.tag?.auxiliar))),rng);
            if(!candidates.length){summary.noCandidate++;continue;}
            let committed=false,foundLayout=false;
            for(const target of candidates){
                const layout=this.generatePassage(maze,target,rng);if(!layout)continue;
                foundLayout=true;
                // The collectible remains on the same room and with the same main agent.
                // Use the existing weighted auxiliary replacement and its existing fallback.
                const oldTag=donor.tag;
                donor.tag={...oldTag,auxiliar:null};
                manager.criarTagAuxiliar(donor,new Set(['MazeAgent','AbyssAgent']));
                if(!donor.tag.auxiliar){donor.tag=oldTag;summary.noReplacement++;break;}
                donor.bmMazeReallocated=true;
                target.bmPathOriginalTag=target.tag;
                target.tag={tipo:'pathAgent',subTipo:'MazePassage',auxiliar:'MazeAgent'};
                target.bmPassageMaze=layout;
                summary.active++;summary.corner--;committed=true;
                summary.assignments.push({roomId:target.roomId,donorId:donor.roomId,degree:this.degree(graph,target),replacement:donor.tag.auxiliar,metrics:layout.metrics});
                break;
            }
            if(!committed&&!foundLayout)summary.noLayout++;
        }
        return summary;
    }
}
if(typeof module!=='undefined'&&module.exports)module.exports=PathAgent;
