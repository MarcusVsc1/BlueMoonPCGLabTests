/* BM_WITCH_AI_V3_2: logica exclusiva da chefe; tempo de simulacao, sem alterar RNG de geracao. */
const BMWitch = (() => {
    const rules = Object.freeze({initialWait:2, shotCount:6, shotInterval:.3, rest:2,
        summonCount:4, maxGhosts:6, summonWarning:.55, summonInterval:.85,
        nearTiles:1.5, nearTime:2.5, teleportCD:5, fadeOut:.35, fadeIn:.35, teleportRest:1,
        pulseWarning:1, pulseRadius:2, pulseRest:2, pulseCD:8, pulseFlash:.35,
        volleyWarning:.65, fanCount:5, fanStep:Math.PI/10, radialCount:10});
    // A fase apenas governa novas decisoes; avisos e recuperacoes em curso mantem seus tempos.
    const phases=Object.freeze([
        Object.freeze({label:'Controle',patterns:Object.freeze(['fire']),rest:2,teleportCD:5}),
        Object.freeze({label:'Pressão',patterns:Object.freeze(['fan','fire']),rest:1.8,teleportCD:4.5}),
        Object.freeze({label:'Desespero',patterns:Object.freeze(['radial','fire','fan']),rest:1.6,teleportCD:4.5})
    ]);
    const phaseForHP=hp=>hp<=6?3:hp<=12?2:1;
    const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const isGhost=e=>e?.props?.bmDamageOrigin==='witchSummon';
    const live=(s)=>s.spritesE.filter(e=>e.vidas>0&&!s.toRemove?.includes(e));
    const ghosts=s=>live(s).filter(isGhost);
    const floor=(m,x,y)=>{const t=m.cells?.[x]?.[y]?.tipo;return Number.isFinite(t)&&t>=0&&t<6&&t!==5;};
    function reachable(s){
        const m=s.map,z=m.SIZE||32, x=Math.floor(s.pc.x/z),y=Math.floor(s.pc.y/z);
        if(!floor(m,x,y))return [];
        const q=[{x,y}], seen=new Set([`${x},${y}`]);
        for(let i=0;i<q.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
            const a=q[i].x+dx,b=q[i].y+dy,k=`${a},${b}`;
            if(!seen.has(k)&&floor(m,a,b)){seen.add(k);q.push({x:a,y:b});}
        }
        return q.map(p=>({x:(p.x+.5)*z,y:(p.y+.5)*z}));
    }
    function vacant(s,p,boss,forTeleport){
        const z=s.map.SIZE||32;
        if(!floor(s.map,Math.floor(p.x/z),Math.floor(p.y/z)))return false;
        if(dist(p,s.pc)<(forTeleport?2:1.25)*z)return false;
        if(dist(p,boss)<(forTeleport?1.75:1.5)*z)return false;
        const others=[...live(s),...(s.spritesO||[]),...(s.spritesTP||[]),...(s.spritesSpike||[]),...(s.spritesPoder||[])];
        if(others.some(e=>e!==boss&&dist(e,p)<z*.8))return false;
        return true;
    }
    function teleportTarget(s,boss){
        const z=s.map.SIZE||32;
        const valid=reachable(s).filter(p=>vacant(s,p,boss,true));
        const preferred=valid.filter(p=>dist(p,s.pc)>=3*z&&dist(p,s.pc)<=5*z);
        // Prioridade para a faixa proposta; fallback para piso livre e alcançavel.
        return (preferred.length?preferred:valid).sort((a,b)=>Math.abs(dist(a,s.pc)-4*z)-Math.abs(dist(b,s.pc)-4*z)||dist(b,boss)-dist(a,boss)||a.y-b.y||a.x-b.x)[0]||null;
    }
    function summonTargets(s,boss,n){
        const z=s.map.SIZE||32, valid=reachable(s).filter(p=>vacant(s,p,boss,false)&&dist(p,s.pc)>=2*z);
        const chosen=[];
        while(chosen.length<n&&valid.length){
            const score=p=>{const anchors=[...chosen,...ghosts(s)];return (anchors.length?Math.min(...anchors.map(a=>dist(a,p))):dist(p,boss))-.25*Math.abs(dist(p,s.pc)-3*z);};
            valid.sort((a,b)=>score(b)-score(a)||a.y-b.y||a.x-b.x);
            const p=valid.shift();if(chosen.every(a=>dist(a,p)>=1.5*z))chosen.push(p);
        }
        return chosen;
    }
    // Preserva direcao, aggro e demais efeitos de persegue; limita o modulo da velocidade.
    function ghostChase(api,pc){
        const chase=api.persegue(pc);
        return function(...args){
            const result=chase.apply(this,args);
            const speed=Math.hypot(this.vx,this.vy);
            if(Number.isFinite(this.vm)&&this.vm>0&&Number.isFinite(speed)&&speed>this.vm){
                const factor=this.vm/speed;
                this.vx*=factor;this.vy*=factor;
            }
            return result;
        };
    }
    function enter(st,phase,time){st.phase=phase;st.timer=time;}
    function play(s,name){s.assets.play(name);}
    function makeShot(s,boss,api){
        const shot=new api.Sprite({x:boss.x,y:boss.y,imagem:'flame',direcao:0,vm:35,w:12,h:12,imgX:1,imgY:1,vx:1,vy:1,imune:0,mover:api.moverCircular,a:0,props:{tipo:'tiroE',modelo:'fireball',bmDamageOrigin:'witchFireball'},desenhar:api.desenhaTiro,atravessa:1});
        api.alinharOrigemFireball(shot,boss);
        return shot;
    }
    function prepareVolley(s,boss,api,kind){
        const count=kind==='fan'?rules.fanCount:rules.radialCount;
        const shots=Array.from({length:count},()=>makeShot(s,boss,api));
        const origin=shots[0], aim=Math.atan2(s.pc.y-origin.y,s.pc.x-origin.x);
        shots.forEach((shot,i)=>{shot.a=aim+(kind==='fan'?(i-(count-1)/2)*rules.fanStep:(i+.5)*2*Math.PI/count);});
        return shots;
    }
    // Executado em checaColisao, depois de mover o jogador e de resolver golpes na chefe.
    // Consumir o evento mesmo quando a Lyra esta imune ou fora do raio.
    function resolvePulse(s){
        if(s.stageIndex!==3||s.paused||s.theEnd>0||!(s.pc?.vidas>0))return false;
        const boss=live(s).find(e=>e.imagem==='bruxa'), st=boss?._bmWitch;
        if(!st?.pulsePending||st.map!==s.map||st.pc!==s.pc)return false;
        st.pulsePending=false;
        st.flash=rules.pulseFlash;
        play(s,'explosion');
        if(dist(st.pulseOrigin,s.pc)>rules.pulseRadius*(s.map.SIZE||32)||!(s.pc.imune<=0))return false;
        s.pc.vidas--;s.pc.imune=2;s.pc.atingido=.3;
        play(s,'damage');
        return BMGameOver.fatal(s,'Explosão mágica da Bruxa');
    }
    function update(boss,api){
        const s=boss.scene,pc=s?.pc;
        if(!s||s.stageIndex!==3||s.paused||s.theEnd>0||!(pc?.vidas>0)||!(boss.vidas>0)||s.toRemove?.includes(boss))return;
        const dt=s._bmTimingStep;
        if(!(dt>0&&Number.isFinite(dt)))return;
        let st=boss._bmWitch;
        if(!st||st.map!==s.map||st.pc!==pc){st=boss._bmWitch={map:s.map,pc,phase:'wait',timer:rules.initialWait,near:0,cooldown:0,next:'fire',count:0,markers:[],target:null,lastTick:null,pattern:0,pulseCooldown:0,pulsePending:false,pulseOrigin:null,flash:0,volley:[],tier:1};boss._bmWitchHidden=false;boss._bmWitchAlpha=1;}
        if(Number.isFinite(s.globalCounter)&&st.lastTick===s.globalCounter)return;
        st.lastTick=s.globalCounter;
        const tier=phaseForHP(boss.vidas);
        if(tier>st.tier){
            st.tier=tier;st.pattern=0;
            // Som da transicao; sem texto, interrupcao ou imunidade adicional.
            play(s,tier===3?'darkness2':'darkness');
        }
        const profile=phases[st.tier-1];
        boss.provocou=true;boss.vx=boss.vy=0;
        const angle=(Math.atan2(pc.y-boss.y,pc.x-boss.x)*180/Math.PI+360)%360;
        boss.direcao=angle>=45&&angle<135?0:angle>=135&&angle<225?1:angle>=225&&angle<315?3:2;
        const z=s.map.SIZE||32;
        st.cooldown=Math.max(0,st.cooldown-dt);
        st.pulseCooldown=Math.max(0,st.pulseCooldown-dt);
        st.flash=Math.max(0,st.flash-dt);
        st.near=dist(boss,pc)<=rules.nearTiles*z?st.near+dt:0;
        const teleporting=st.phase==='vanish'||st.phase==='appear';
        const startTeleport=()=>{
            if(st.cooldown>1e-7)return false;
            const target=teleportTarget(s,boss);if(!target)return false;
            st.target=target;st.markers=[];st.near=0;st.cooldown=profile.teleportCD;
            boss._bmWitchHidden=true;boss._bmWitchAlpha=1;
            enter(st,'vanish',rules.fadeOut);play(s,'darkness');return true;
        };
        // Avisos e janelas de recuperacao nao podem ser interrompidos.
        const locked=teleporting||['teleportRest','pulseWarning','pulseRest','volleyWarning'].includes(st.phase);
        if(!locked&&st.near>=rules.nearTime-1e-7){
            if(st.pulseCooldown<=1e-7){
                st.pulseOrigin={x:boss.x,y:boss.y};st.pulseCooldown=rules.pulseCD;
                st.markers=[];st.completed=false;st.near=0;
                enter(st,'pulseWarning',rules.pulseWarning);return;
            }
            if(startTeleport())return;
        }
        st.timer-=dt;
        if(st.phase==='vanish'){
            boss._bmWitchAlpha=Math.max(0,st.timer/rules.fadeOut);
            if(st.timer>1e-7)return;
            // Lyra pode ter corrido para o destino durante o aviso. Revalidar.
            const p=vacant(s,st.target,boss,true)&&reachable(s).some(q=>q.x===st.target.x&&q.y===st.target.y)?st.target:teleportTarget(s,boss);
            if(p){boss.x=p.x;boss.y=p.y;CollisionSystem.sync(boss,s.map);}
            st.target=null;boss._bmWitchAlpha=0;enter(st,'appear',rules.fadeIn);return;
        }
        if(st.phase==='appear'){
            boss._bmWitchAlpha=Math.min(1,Math.max(0,1-st.timer/rules.fadeIn));
            if(st.timer>1e-7)return;
            boss._bmWitchAlpha=1;boss._bmWitchHidden=false;st.near=0;enter(st,'teleportRest',rules.teleportRest);return;
        }
        if(st.timer>1e-7)return;
        if(st.phase==='pulseWarning'){
            st.pulsePending=true;st.near=0;enter(st,'pulseRest',rules.pulseRest);return;
        }
        if(st.phase==='pulseRest'){
            // A esquiva deve garantir a janela de contra-ataque inteira.
            st.near=0;st.completed=false;enter(st,'wait',0);return;
        }
        if(st.phase==='volleyWarning'){
            for(const shot of st.volley)s.adicionar(shot);
            st.volley=[];play(s,'shot');st.completed=true;enter(st,'wait',profile.rest);return;
        }
        if(st.phase==='wait'||st.phase==='teleportRest'){
            if(st.phase==='wait'&&st.completed&&startTeleport()){st.completed=false;return;}
            st.completed=false;
            if(st.next==='summon'){
                st.next='fire';st.markers=summonTargets(s,boss,Math.min(rules.summonCount,Math.max(0,rules.maxGhosts-ghosts(s).length)));
                if(st.markers.length){enter(st,'summon',rules.summonWarning);return;}
            }
            st.next='summon';st.count=0;
            const kind=profile.patterns[st.pattern++%profile.patterns.length];
            if(kind!=='fire'){
                st.volley=prepareVolley(s,boss,api,kind);
                enter(st,'volleyWarning',rules.volleyWarning);return;
            }
            enter(st,'fire',0);
        }
        if(st.phase==='fire'){
            const tiro=makeShot(s,boss,api);tiro.a=Math.atan2(pc.y-tiro.y,pc.x-tiro.x);s.adicionar(tiro);play(s,'shot');
            if(++st.count>=rules.shotCount){st.completed=true;enter(st,'wait',profile.rest);}else st.timer+=rules.shotInterval;
            return;
        }
        if(st.phase==='summon'){
            const p=st.markers.shift();
            // Nao criar em cima do jogador; nao remapear de surpresa para um ponto sem aviso.
            if(p&&ghosts(s).length<rules.maxGhosts&&vacant(s,p,boss,false)){
                s.adicionar(new api.Sprite({x:p.x,y:p.y,w:12,h:12,vm:29+Math.random()*11,imgX:2,imgY:1,imagem:'monster',atravessa:1,comportar:ghostChase(api,pc),props:{tipo:'npc',summoned:true,bmDamageOrigin:'witchSummon'}}));play(s,'darkness');
            }
            if(!st.markers.length||ghosts(s).length>=rules.maxGhosts){st.markers=[];st.completed=true;enter(st,'wait',profile.rest);}else st.timer+=rules.summonInterval;
        }
    }
    function draw(s){
        if(s.stageIndex!==3)return;
        const boss=live(s).find(e=>e.imagem==='bruxa'),st=boss?._bmWitch;if(!st)return;
        const c=s.ctx; c.save();try{
            c.strokeStyle='#d6b7ff';c.fillStyle='#a679e3';c.lineWidth=1.5;
            const ring=(p,r,a)=>{const x=p.x-s.cameraX,y=p.y-s.cameraY;c.globalAlpha=a;c.beginPath();c.arc(x,y,r,0,2*Math.PI);c.stroke();c.globalAlpha=a*.22;c.fill();};
            if(st.phase==='summon')st.markers.forEach((p,i)=>ring(p,i===0?13:10,i===0?.8:.4));
            if(st.phase==='vanish'){ring(boss,15,.8);if(st.target)ring(st.target,16,.75);}
            if(st.phase==='appear')ring(boss,15,.65);
            if(st.phase==='pulseWarning'||st.flash>0){
                const warning=st.phase==='pulseWarning', r=rules.pulseRadius*(s.map.SIZE||32);
                const progress=warning?1-Math.max(0,st.timer)/rules.pulseWarning:1;
                c.strokeStyle=warning?'#ffd28b':'#fff0bd';c.fillStyle='#f89a45';c.lineWidth=warning?2:3;
                ring(st.pulseOrigin,r,warning?.65+.3*progress:st.flash/rules.pulseFlash);
                if(warning)ring(st.pulseOrigin,Math.max(3,r*progress),.65);
            }
            if(st.phase==='volleyWarning'){
                c.strokeStyle='#ffc585';c.lineWidth=1.5;c.globalAlpha=.75;
                for(const t of st.volley){
                    const x=t.x-s.cameraX,y=t.y-s.cameraY,l=(s.map.SIZE||32)*3;
                    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(t.a)*l,y+Math.sin(t.a)*l);c.stroke();
                }
            }
        }finally{c.restore();}
    }
    return {rules,phases,phaseForHP,update,draw,resolvePulse,reachable,teleportTarget,summonTargets,vacant};
})();
