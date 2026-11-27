/* BM_ABYSS_COMBAT_V5 — combat for a single ordered, one-tile-wide route. */
const BMAbyssCombat = (()=>{
    const key=p=>`${p.x},${p.y}`;
    const manhattan=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    const tile=(p,z)=>({x:Math.floor(p.x/z),y:Math.floor(p.y/z)});
    const center=(p,z)=>({x:(p.x+.5)*z,y:(p.y+.5)*z});
    const level=n=>Math.max(1,Math.min(4,Math.ceil(Number(n)||1)));
    // Prefer straight portions, at least 3 steps from each end, 4 apart.
    // A short path is allowed to have fewer enemies. No extra generation draw.
    function plan(path,n,rand){
        n=level(n);if(n===1)return [];
        const wanted=n===2?1:n===3?1+Math.floor(rand()*2):2+Math.floor(rand()*2);
        const options=[],turns=[];
        for(let i=3;i<path.length-3;i++){
            if(manhattan(path[i-1],path[i+1])!==2)continue;
            if(path[i-1].x!==path[i+1].x&&path[i-1].y!==path[i+1].y){turns.push(i);continue;}
            options.push(i);
        }
        // Try all feasible sets (at most 3) and prefer evenly spaced positions.
        const straight=new Set(options);options.push(...turns);options.sort((a,b)=>a-b);
        let best=[],score=-Infinity;
        function search(chosen,start){
            const k=chosen.length;
            const value=k*10000+chosen.filter(i=>straight.has(i)).length*100-(k?chosen.reduce((s,i,j)=>s+Math.abs(i-(j+1)*(path.length-1)/(k+1)),0):0);
            if(value>score){score=value;best=chosen.slice();}
            if(k===wanted)return;
            for(let j=start;j<options.length;j++)if(!k||options[j]-chosen[k-1]>=4)search([...chosen,options[j]],j+1);
        }
        search([],0);
        // Turns may host only slow, one-hit enemies.
        if(!best.length&&path.length>=7)best=[Math.floor((path.length-1)/2)];
        return best.map((i,j)=>({index:i,x:path[i].x,y:path[i].y,type:n===4&&j===0&&best.length>=2&&straight.has(i)?'ogro':(!straight.has(i)?'diabinho':(rand()<.5?'caveira':'diabinho'))}));
    }
    function attach(enemy,route,scene){
        const path=route.path,indices=new Map(path.map((p,i)=>[key(p),i]));
        const original=enemy.mover;
        if(typeof original!=='function')throw Error('Inimigo sem mover original');
        enemy.props={...enemy.props,bmAbyssEnemy:true};enemy.atravessa=0;
        enemy.bmAbyssRoute=route;enemy.bmAbyssIndex=indices.get(key(tile(enemy,32)));
        enemy.comportar=function(){this.provocou=true;};
        enemy.mover=function(dt){
            const pc=this.scene?.pc,map=this.scene?.map,z=map?.SIZE||32;
            if(!(dt>0)||!Number.isFinite(dt)||!pc||!map||this.scene!==scene)return original.call(this,dt);
            this.vx=this.vy=0;
            const i=indices.get(key(tile(this,z))),j=indices.get(key(tile(pc,z)));
            if(i!==undefined)this.bmAbyssIndex=i;
            // Remain on this route. Engage only on this path and within 3 steps,
            // not across a pit or before the player enters the room.
            if(i!==undefined&&j!==undefined&&Math.abs(i-j)<=3&&!(this.charStop>0)&&!(this.atingido>0)&&!BMAbyss.isFalling(pc)){
                const sign=Math.sign(j-i),here=center(path[i],z),next=center(path[i+sign],z);
                let target=j===i?{x:pc.x,y:pc.y}:next;
                if(sign){
                    // Align with the centerline before turning. Otherwise an
                    // axis-aligned collision box can get stuck at a pit corner.
                    const horizontal=path[i+sign].x!==path[i].x;
                    if(horizontal&&Math.abs(this.y-here.y)>.1)target={x:this.x,y:here.y};
                    if(!horizontal&&Math.abs(this.x-here.x)>.1)target={x:here.x,y:this.y};
                    // Keep following enemies from packing into a single strike.
                    if((scene.spritesE||[]).some(e=>e!==this&&e.vidas>0&&e.bmAbyssRoute===route&&!(scene.toRemove||[]).includes(e)&&
                        (indices.get(key(tile(e,z)))-i)*sign>=0&&(indices.get(key(tile(e,z)))-i)*sign<=1&&Math.hypot(e.x-this.x,e.y-this.y)<24&&
                        (indices.get(key(tile(e,z)))!==i||(e.x-this.x)*(next.x-here.x)+(e.y-this.y)*(next.y-here.y)>0)))target={x:this.x,y:this.y};
                }
                const dx=target.x-this.x,dy=target.y-this.y,d=Math.hypot(dx,dy);
                if(d>.01){const v=Math.min(this.vm,d/dt);this.vx=dx/d*v;this.vy=dy/d*v;if(dy>.1)this.direcao=0;else if(dy<-.1)this.direcao=3;}
            }
            const x=this.x,y=this.y;const result=original.call(this,dt);
            if(!indices.has(key(tile(this,z)))){this.x=x;this.y=y;this.vx=this.vy=0;this.mc=Math.floor(x/z);this.ml=Math.floor(y/z);}
            return result;
        };
        return enemy;
    }
    function spawn(room,manager,scene){
        const route=room.bmAbyss;if(!route||route.combat)return;
        const map=manager.estagios[0].mapa,path=route.path;
        const rand=BMAbyssPath.rng(`${room.roomId}:${route.level}:${route.mode}:${path.map(key).join(';')}:combat5`);
        const specs=plan(path,route.level,rand);
        const enemies=[];
        for(const spec of specs){const c=map.cells[spec.x]?.[spec.y];if(c?.tipo!==0||c.bmAbyssTerrain!=='floor')continue;
            const e=attach(manager.criarInimigo(spec.type,spec.x,spec.y),route,scene);scene.adicionar(e);enemies.push({...spec});}
        route.combat={requestedLevel:route.level,spawnCount:enemies.length,enemies};
    }
    // Relocate the original Hub 3/4 resources only to an adjacent normal Hub.
    // Reserve interior tiles away from its own central column and entrances.
    function reserveResources(graph,room,level,rooms,map){
        if(level<=2)return {items:[]};
        const types=level===3?['heart']:['heart','manaHeart'];
        for(const n of graph.getNeighbors(room)){
            const edge=graph.getCorridorsFromRoom(room).find(e=>e.fromRoom===n.roomId||e.toRoom===n.roomId);
            if(!edge||edge.restricoes?.length)continue;
            if(!rooms.includes(n)||n.tag?.tipo!=='hub'||n.tag?.subTipo!=='Hub'||n.tag?.auxiliar!=='Hub'||n.tag?.collectible||n.restricoes?.length||n.bmAbyssResourceReserved)continue;
            const b=n.cells?.[0],w=n.roomWidth,h=n.roomHeight;if(!b||w<5||h<5)continue;
            const cells=n.cells.filter(p=>p.x>b.x&&p.x<b.x+w-1&&p.y>b.y&&p.y<b.y+h-1&&Math.abs(p.x-(b.x+(w-1)/2))>=1.5&&
                map.cells[p.x]?.[p.y]?.tipo===0&&!map.cells[p.x][p.y].bmAbyssTerrain&&n.terminalCells.every(t=>manhattan(p,t)>=2));
            const chosen=[];for(const p of cells){if(chosen.every(q=>manhattan(p,q)>=2))chosen.push(p);if(chosen.length===types.length)break;}
            if(chosen.length===types.length)return {recipient:n,items:chosen.map((p,i)=>({x:p.x,y:p.y,type:types[i]}))};
        }
        return null;
    }
    function placeResources(room,manager,scene){
        for(const p of room.bmAbyssMovedResources||[])scene.adicionar(manager.criarPoder(p.type,p.x,p.y));
        if(room.bmAbyssMovedResources)room.bmAbyss.relocatedResources=room.bmAbyssMovedResources.map(p=>({...p}));
        delete room.bmAbyssMovedResources;
    }
    return Object.freeze({plan,attach,spawn,reserveResources,placeResources});
})();
if(typeof module==='object'&&module.exports)module.exports=BMAbyssCombat;
