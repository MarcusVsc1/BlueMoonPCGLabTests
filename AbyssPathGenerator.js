/* BM_ABYSS_PATH_V3_1 — pure, bounded, seeded path generation. No scene mutation. */
const BMAbyssPath = (() => {
    'use strict';
    // Maximum geometry (the former level 4) for every puzzle level.
    // Keep the four profile entries and level metadata for API compatibility.
    const maxProfile=Object.freeze({minTurns:5,maxTurns:12,extra:8,ratio:1.65,coverage:.55});
    const profiles=Object.freeze(Array(4).fill(maxProfile));
    const dirs=[[1,0],[0,1],[-1,0],[0,-1]],key=p=>`${p.x},${p.y}`;
    const dist=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
    const equal=(a,b)=>a.x===b.x&&a.y===b.y;
    const inBounds=(p,w,h)=>Number.isInteger(p?.x)&&Number.isInteger(p?.y)&&p.x>=0&&p.y>=0&&p.x<w&&p.y<h;
    const boundary=(p,w,h)=>p.x===0||p.y===0||p.x===w-1||p.y===h-1;
    const near=(p,w,h)=>dirs.map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).filter(q=>inBounds(q,w,h));
    function rng(seed){let s=2166136261;for(const c of String(seed)){s^=c.charCodeAt(0);s=Math.imul(s,16777619);}return ()=>{s=(s+0x6D2B79F5)|0;let t=Math.imul(s^(s>>>15),1|s);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
    function shuffle(a,random){for(let i=a.length-1;i>0;i--){let j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    function turns(path){let n=0;for(let i=2;i<path.length;i++)if(path[i].x-path[i-1].x!==path[i-1].x-path[i-2].x||path[i].y-path[i-1].y!==path[i-1].y-path[i-2].y)n++;return n;}
    // A corner naturally has diagonal contact between cells two steps apart.
    // Any other diagonal contact is forbidden, even if orthogonal edges are absent.
    function shapeOK(path,w,h){const seen=new Map();for(let i=0;i<path.length;i++){const p=path[i];if(!inBounds(p,w,h)||seen.has(key(p))||(i&&dist(p,path[i-1])!==1))return false;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const j=seen.get(key({x:p.x+dx,y:p.y+dy}));if(j===undefined)continue;if(Math.abs(dx)+Math.abs(dy)===1&&j!==i-1)return false;if(dx&&dy&&j!==i-2)return false;}seen.set(key(p),i);}return true;}
    function metrics(path,w,h){const d=dist(path[0],path.at(-1));return {length:path.length-1,turns:turns(path),manhattan:d,detourRatio:(path.length-1)/Math.max(1,d),coverage:path.length/(w*h)};}
    function limits(w,h,level,d){const p=maxProfile;return {minLength:Math.max(d,Math.min(d+p.extra,Math.ceil((w+h)*p.coverage))),maxLength:Math.max(d,Math.min(Math.floor(w*h*.48)-1,Math.ceil(d*p.ratio)+p.extra+2)),minTurns:p.minTurns,maxTurns:p.maxTurns};}
    function quality(m,l){return m.length>=l.minLength&&m.length<=l.maxLength&&m.turns>=l.minTurns&&m.turns<=l.maxTurns;}
    function validate(result){if(!result||!Array.isArray(result.path)||result.path.length<2)return false;const {width:w,height:h,level,mode,start,goal,path,rows}=result;if(!Number.isInteger(w)||!Number.isInteger(h)||!profiles[level-1]||!['passage','treasure'].includes(mode)||!inBounds(start,w,h)||!inBounds(goal,w,h)||!boundary(start,w,h)||!equal(path[0],start)||!equal(path.at(-1),goal)||(mode==='passage'?!boundary(goal,w,h):boundary(goal,w,h))||!shapeOK(path,w,h))return false;
        // Only the specified terminals may touch the perimeter; this prevents accidental entrances.
        if(path.slice(1,-1).some(p=>boundary(p,w,h)))return false;
        const cells=new Set(path.map(key));if(!Array.isArray(rows)||rows.length!==h||rows.some((r,y)=>typeof r!=='string'||r.length!==w||[...r].some((c,x)=>c!==(cells.has(key({x,y}))?'C':'P'))))return false;
        return quality(metrics(path,w,h),limits(w,h,level,dist(start,goal)));
    }
    function generate({width:w,height:h,level,mode='passage',start,goal,seed='0',random,blocked=[],maxExpansions=12000}={}){
        if(!Number.isInteger(w)||!Number.isInteger(h)||w<5||h<5||w>14||h>14||!Number.isInteger(level)||!profiles[level-1]||!['passage','treasure'].includes(mode)||!Number.isInteger(maxExpansions)||maxExpansions<1||maxExpansions>100000)throw new RangeError('Dimensões 5–14, nível 1–4, modo e orçamento válidos são obrigatórios.');
        if(random!==undefined&&typeof random!=='function')throw new TypeError('random deve ser função.');
        const rand=random||rng(seed),invalid=new Set(blocked.map(key));
        const edge=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p={x,y};if(boundary(p,w,h)&&!((x===0||x===w-1)&&(y===0||y===h-1))&&!invalid.has(key(p)))edge.push(p);}
        if(start&&!edge.some(p=>equal(p,start)))return {ok:false,reason:'entrada-invalida',expansions:0};
        const starts=start?[{...start}]:shuffle(edge.slice(),rand);
        if(goal&&(!inBounds(goal,w,h)||invalid.has(key(goal))||(mode==='passage'?!edge.some(p=>equal(p,goal)):boundary(goal,w,h))))return {ok:false,reason:'destino-invalido',expansions:0};
        let expansions=0, best=null;
        for(const a of starts){
            let goals=[];if(goal)goals=[{...goal}];else if(mode==='passage')goals=edge.filter(b=>!equal(a,b));else for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(!invalid.has(key({x,y})))goals.push({x,y});
            shuffle(goals,rand);goals.sort((u,v)=>Math.abs(dist(a,u)-(w+h)*.55)-Math.abs(dist(a,v)-(w+h)*.55));
            for(const b of goals){if(equal(a,b))continue;const lim=limits(w,h,level,dist(a,b));if(lim.minLength>lim.maxLength)continue;
                const path=[a],seen=new Map([[key(a),0]]);let local=0;
                // Separate budgets per endpoint pair prevent one impossible pair consuming all attempts.
                const pairBudget=Math.min(3000,maxExpansions-expansions);
                function canAdd(q){if(invalid.has(key(q))||seen.has(key(q))||(!equal(q,b)&&boundary(q,w,h)))return false;const i=path.length;for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const j=seen.get(key({x:q.x+dx,y:q.y+dy}));if(j===undefined)continue;if(Math.abs(dx)+Math.abs(dy)===1&&j!==i-1)return false;if(dx&&dy&&j!==i-2)return false;}return true;}
                function dfs(){if(expansions>=maxExpansions||local>=pairBudget)return false;expansions++;local++;const p=path.at(-1),length=path.length-1,nTurns=turns(path);if(length+dist(p,b)>lim.maxLength||nTurns>lim.maxTurns)return false;
                    if(equal(p,b)){const m=metrics(path,w,h);if(!quality(m,lim))return false;best={path:path.map(q=>({...q})),metrics:m,limits:lim,start:a,goal:b};return true;}
                    let next=shuffle(near(p,w,h).filter(canAdd),rand);
                    // Prefer detours until minimum length/curves are reached, then close toward goal.
                    if(length>=lim.minLength-2&&nTurns>=lim.minTurns)next.sort((u,v)=>dist(u,b)-dist(v,b));
                    for(const q of next){path.push(q);seen.set(key(q),path.length-1);if(dfs())return true;seen.delete(key(q));path.pop();if(local>=pairBudget||expansions>=maxExpansions)break;}return false;}
                if(dfs())break;if(expansions>=maxExpansions)break;
            }if(best||expansions>=maxExpansions)break;
        }
        if(!best)return {ok:false,reason:'sem-caminho-valido',expansions};
        const cells=new Set(best.path.map(key)),rows=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>cells.has(key({x,y}))?'C':'P').join(''));
        const result={ok:true,width:w,height:h,level,mode,...best,rows,expansions};if(!validate(result))throw Error('Falha interna de validação.');return result;
    }
    return Object.freeze({generate,validate,profiles,metrics,limits,rng});
})();
if(typeof module==='object'&&module.exports)module.exports=BMAbyssPath;
