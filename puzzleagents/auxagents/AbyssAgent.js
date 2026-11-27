/* BM_ABYSS_AGENT_V4 — auxiliary puzzle, shared budget for both variants. */
class AbyssAgent extends AuxAgent {
    constructor(){super();this.defaultTag='AbyssAgent';}
    static isRestHub(room){const t=room?.tag;return t?.tipo==='hub'||t?.subTipo==='Hub'||t?.auxiliar==='Hub';}
    static hazard(room){return ['MazeAgent','AbyssAgent'].includes(room?.tag?.auxiliar);}
    static lever(room){const t=room?.tag;return t?.subTipo==='LeverAgent'||t?.collectible?.props?.subtipo==='alavanca';}
    static level(n){return Math.max(1,Math.min(4,Math.ceil(Number(n)||1)));}
    static key(p){return `${p.x},${p.y}`;}
    geometry(graph,room,count){
        const w=room.roomWidth,h=room.roomHeight,base=room.cells?.[0],map=gerenciador.estagios[0].mapa.cells;
        if(!base||!Number.isInteger(w)||!Number.isInteger(h)||w<5||h<5||w>14||h>14||room.cells.length!==w*h||room.restricoes?.length)return null;
        const own=new Set(room.cells.map(AbyssAgent.key));
        if(own.size!==w*h)return null;
        for(let x=0;x<w;x++)for(let y=0;y<h;y++){
            const p={x:base.x+x,y:base.y+y},c=map[p.x]?.[p.y];
            if(!own.has(AbyssAgent.key(p))||c?.tipo!==0||c.bmAbyssTerrain)return null;
        }
        const neighbors=graph.getNeighbors(room),edges=graph.getCorridorsFromRoom(room),ts=room.terminalCells||[];
        if(neighbors.length!==count||edges.length!==count||ts.length!==count||new Set(ts.map(AbyssAgent.key)).size!==count)return null;
        if(ts.some(t=>!own.has(AbyssAgent.key(t))))return null;
        const portals=[];
        for(const e of edges){
            if(e.fromRoom!==room.roomId&&e.toRoom!==room.roomId)return null;
            if(!e.cells?.length||e.cells.some(p=>own.has(AbyssAgent.key(p))))return null;
            const p=e.fromRoom===room.roomId?e.cells[0]:e.cells.at(-1);
            if(!p)return null;portals.push(p);
        }
        const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
        if(!portals.every(p=>ts.filter(t=>distance(t,p)===1).length===1)||!ts.every(t=>portals.filter(p=>distance(t,p)===1).length===1))return null;
        return {width:w,height:h,base:{x:base.x,y:base.y},terminals:ts.map(t=>({x:t.x-base.x,y:t.y-base.y}))};
    }
    plan(graph,room,mode,level){
        const g=this.geometry(graph,room,mode==='passage'?2:1);if(!g)return null;
        // One draw from the run RNG. The bounded search itself uses a local seed.
        const seed=`${random.nextRandFloat()}:${g.base.x}:${g.base.y}:${mode}`;
        for(let i=0;i<(mode==='passage'?4:2);i++){
            const a=g.terminals[i%g.terminals.length],b=mode==='passage'?g.terminals[1-i%2]:undefined;
            const result=BMAbyssPath.generate({width:g.width,height:g.height,level:AbyssAgent.level(level),mode,start:a,goal:b,seed:seed+':'+i,maxExpansions:12000});
            if(result.ok&&BMAbyssPath.validate(result))return {base:g.base,result};
        }
        return null;
    }
    gerarTagAuxiliar(graph,room){
        if(AbyssAgent.isRestHub(room))return false; // BM_ABYSS_NO_HUB_V5_1
        // Main agent assigns its collectible first. Never accept a lever in a dead end.
        if(!room.tag?.collectible||AbyssAgent.lever(room)||graph.getNeighbors(room).some(AbyssAgent.hazard))return false;
        const plan=this.plan(graph,room,'treasure',4);if(!plan)return false;
        room.bmAbyssPlan=plan;room.tag.auxiliar=this.defaultTag;return true;
    }
    gerarAgenteAuxiliar(room,collectible,level){
        if(AbyssAgent.isRestHub(room))return false;
        const plan=room.bmAbyssPlan;if(!plan||!BMAbyssPath.validate(plan.result))return false;
        const r=plan.result,base=plan.base,passage=r.mode==='passage';
        if(passage?!!collectible:(!collectible||AbyssAgent.lever(room)))return false;
        const map=gerenciador.estagios[0].mapa.cells;
        const changes=[];
        for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
            const c=map[base.x+x]?.[base.y+y];if(c?.tipo!==0||c.bmAbyssTerrain)return false;
            changes.push({cell:c,pit:r.rows[y][x]==='P'});
        }
        // All checks precede writes. Never alter corridors, original lever holes or walls.
        for(const {cell,pit} of changes){cell.tipo=pit?8:0;cell.bmAbyssTerrain=pit?'pit':'floor';}
        if(!passage){collectible.x=(base.x+r.goal.x+.5)*32;collectible.y=(base.y+r.goal.y+.5)*32;cena1.adicionar(collectible);}
        room.bmAbyss={mode:r.mode,level:AbyssAgent.level(level),path:r.path.map(p=>({x:base.x+p.x,y:base.y+p.y})),metrics:{...r.metrics},expansions:r.expansions};
        BMAbyssCombat.spawn(room,gerenciador,cena1); // BM_ABYSS_COMBAT_V5
        BMAbyssCombat.placeResources(room,gerenciador,cena1);
        delete room.bmAbyssPlan;return true;
    }
}
if(typeof module==='object'&&module.exports)module.exports=AbyssAgent;
