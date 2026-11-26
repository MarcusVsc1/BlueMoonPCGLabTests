/* BM_GAMEOVER_V5. Interface independente da HUD; um unico loop e listeners. */
const BMGameOver = (() => {
    const sizes=[6,12,16,20,30,40];
    const art=new Image(); art.src='assets/gameover.webp';
    let menu=null, keys=new Set(), lastPad=new Set(), resumeBlocked=false, entryFade=null, dying=null;
    let recipe=null, replayPending=false, replaying=false;
    const labels=['Reiniciar esta run (mesma seed)','Voltar à seleção de fases'];
    const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    const keyboard=new Set(['ArrowUp','ArrowDown','KeyW','KeyS','Enter','Space','Escape']);
    // Pad generico 2563:0575 pode expor triangulo=0, circulo=1, X=2.
    // Mapeamento standard continua com X/A=0. Ajuste local por dispositivo.
    const profiles=new Map();
    function connectedPads(){try{return Array.from(navigator.getGamepads?.()||[]).filter(g=>g&&g.connected!==false);}catch(_){return [];}}
    function button(g,i){const b=g.buttons?.[i];return !!b&&(!!b.pressed||b.value>=.5);}
    function profile(g){
        const id=String(g.id||'');
        const rawPS=g.mapping!=='standard'&&(/2563.*0575|PS3\/PC Gamepad/i.test(id));
        const fallback={confirm:rawPS?2:0,back:1};
        if(profiles.has(id))return profiles.get(id);
        try{const saved=localStorage.getItem('bm.gameover.pad:'+id);if(saved){const n=JSON.parse(saved);if(Number.isInteger(n.confirm)&&n.confirm>=0&&n.confirm<g.buttons.length&&n.confirm!==fallback.back)return {...fallback,confirm:n.confirm};}}catch(_){}
        return fallback;
    }
    function setConfirmButton(deviceIndex,buttonIndex){
        const g=connectedPads().find(g=>g.index===deviceIndex);
        if(!g||!Number.isInteger(buttonIndex)||buttonIndex<0||buttonIndex>=g.buttons.length||buttonIndex===profile(g).back)throw Error('Controle ou botao invalido (confirmacao nao pode ser o circulo).');
        const n={...profile(g),confirm:buttonIndex};profiles.set(String(g.id||''),n);
        try{localStorage.setItem('bm.gameover.pad:'+String(g.id||''),JSON.stringify(n));}catch(_){}return n;
    }
    function pad(){
        const held=new Set();
        for(const g of connectedPads()){
            const p=profile(g);
            if(button(g,12)||g.axes?.[1]<-.5)held.add('up');
            if(button(g,13)||g.axes?.[1]>.5)held.add('down');
            if(button(g,p.confirm))held.add('confirm');
            if(button(g,p.back))held.add('back');
        }return held;
    }
    function anyPadHeld(){return connectedPads().some(g=>Array.from(g.buttons||[]).some((_,i)=>button(g,i))||Math.abs(g.axes?.[0]||0)>.5||Math.abs(g.axes?.[1]||0)>.5);}
    const cursorAudio=new Audio('assets/cursor.ogg');cursorAudio.preload='auto';cursorAudio.volume=.65;
    function playCursor(){try{cursorAudio.currentTime=0;playAudio(cursorAudio,'cursor');}catch(e){console.warn('[Blue Moon Audio] cursor',e);}}
    const FADE_OUT=.55, FADE_IN=.6, DEATH_HOLD=.3, DEATH_FADE=.6;
    function black(scene,alpha){const c=scene.ctx;c.save();try{c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=Math.max(0,Math.min(1,alpha));c.fillStyle='#000';c.fillRect(0,0,scene.w,scene.h);}finally{c.restore();}}
    function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
    function resetSwitches(){
        if(typeof SwitchAgent !== 'undefined'){
            SwitchAgent.id=0;
            SwitchAgent.switchGroups=[];
        }
    }
    function start(scene,option,seed){
        resetSwitches();
        replaying=replayPending&&recipe?.seed===seed&&recipe.option===option;
        replayPending=false;
        if(!replaying)recipe={seed,option,puzzles:new Map(),signature:null};
        scene._bmRun={option,seed,seconds:0,kills:0,visited:new Set(),owners:new Map(),total:sizes[option],cause:null};
    }
    // Sokoban tem deadline de relogio. Reproduz exclusivamente o resultado inicial
    // e a quantidade de hashes consumidos; nenhuma caixa movida ou progresso e salvo.
    function sokoban(room,game,state,options){
        if(!recipe)return SokobanDifficulty.generate(game,state,options);
        const key=JSON.stringify([room.roomId,room.cells[0],room.roomWidth,room.roomHeight]);
        if(replaying){const entry=recipe.puzzles.get(key);if(!entry)throw Error('Sokoban divergente na repeticao: '+key);
            for(let i=0;i<entry.draws;i++)random.seed32();Play.id=entry.playId;Play.boxId=entry.boxId;
            return structuredClone(entry.result);
        }
        const original=random.seed32;let draws=0;random.seed32=function(){draws++;return original.call(this);};
        try{const result=SokobanDifficulty.generate(game,state,options),winner=result.winner;
            recipe.puzzles.set(key,{draws,playId:Play.id,boxId:Play.boxId,result:structuredClone({winner:winner?{snapshot:winner.snapshot,board:winner.board,score:winner.score}:null,analysis:result.analysis,stats:result.stats})});return result;
        }finally{random.seed32=original;}
    }
    function firstDifference(a,b,path=''){
        if(Object.is(a,b))return null;
        if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return {path,original:a,repeticao:b};
        if(Array.isArray(a)&&a.length!==b.length)return {path:path+'.length',original:a.length,repeticao:b.length};
        for(const k of new Set([...Object.keys(a),...Object.keys(b)])){
            const d=firstDifference(a[k],b[k],Array.isArray(a)?`${path}[${k}]`:`${path}.${k}`);
            if(d)return d;
        }
        return null;
    }
    function prepare(scene,graph){const r=scene._bmRun;if(!r)return; r.total=graph.nodes.length;for(const room of graph.nodes)for(const c of room.cells)r.owners.set(`${c.x},${c.y}`,room.roomId);
        const stage=scene.gamer?.estagios?.[0], map=stage?.mapa;
        const point=o=>({x:o.x,y:o.y,posX:o.posX,posY:o.posY,imagem:o.imagem,imgX:o.imgX,imgY:o.imgY,direcao:o.direcao,vidas:o.vidas,vm:o.vm,keyId:o.keyId,doorId:o.doorId,tipo:o.props?.tipo,modelo:o.props?.modelo,subtipo:o.props?.subtipo,idx:o.props?.idx,tX:o.tX,tY:o.tY,switchId:o.switchId,coordenadas:o.coordenadas});
        const signature=JSON.stringify({tiles:map?.cells?.map(col=>col.map(t=>t.tipo)),salas:graph.nodes.map(r=>[r.roomId,r.cells.map(c=>[c.x,c.y]),r.tag?.tipo,r.tag?.auxiliar,r.tag?.subTipo,r.tag?.id]),corredores:graph.adjacencyList?.map(e=>[e.fromRoom,e.toRoom,e.cells.map(c=>[c.x,c.y]),e.tags]),spritesEstagio:stage?.sprites?.map(point),...Object.fromEntries(['spritesE','spritesO','spritesTP','spritesEV','spritesSpike','spritesPoder'].map(k=>[k,(scene[k]||[]).map(point)])),sokobans:(scene.sokobans||[]).map(p=>[p.room.roomId,p.boxes.map(point),p.goals.map(point)]),arenas:map?._bmCombatArenas?.map(a=>[a.room.roomId,a.specs]),interruptores:typeof SwitchAgent==='undefined'?[]:SwitchAgent.switchGroups.map(g=>({correctCombination:g.correctCombination,reward:g.reward?point(g.reward):null})),inicio:[scene.pc.x,scene.pc.y]});
        if(replaying&&recipe.signature!==signature){
            const a=JSON.parse(recipe.signature),b=JSON.parse(signature);
            const details=[];for(const k of new Set([...Object.keys(a),...Object.keys(b)])){const d=firstDifference(a[k],b[k],k);if(d)details.push(d);}
            console.error('[Blue Moon Game Over] Divergencias da geracao',JSON.stringify({seed:r.seed,option:r.option,details}));
            throw Error('A geracao inicial divergiu da run original em '+details.map(d=>d.path).join(', ')+'; repeticao cancelada.');
        }
        recipe.signature=signature;replaying=false;
        if(typeof console.info==='function')console.info('[Blue Moon Game Over] Geracao inicial validada', {seed:r.seed,option:r.option});
    }
    function observe(scene,dt){const r=scene._bmRun;if(!r||scene.paused||![0,3].includes(scene.stageIndex))return;
        r.seconds+=dt;if(scene.stageIndex===0){const z=scene.map?.SIZE||32;const id=r.owners.get(`${Math.floor(scene.pc.x/z)},${Math.floor(scene.pc.y/z)}`);if(id!==undefined)r.visited.add(id);}}
    function kill(scene){if(scene._bmRun)scene._bmRun.kills++;}
    // BM_GAMEOVER_CAUSE_V6: a origem do ataque e registrada na criacao, nao inferida pela sala.
    function enemyName(e){
        if(e?.imagem==='bruxa')return 'Bruxa';
        if(e?.props?.bmDamageOrigin==='witchSummon')return 'Invocação da Bruxa';
        if(e?.imagem==='flame2')return 'Fogo-fátuo';
        if(e?.constructor?.name==='ShieldEnemy')return 'Escudeiro';
        if(e?.imagem==='monster'){
            // Compatibilidade com invocacoes antigas sem metadado explicito.
            if(e.imgX===2&&e.imgY===1&&e.props?.summoned)return 'Invocação da Bruxa';
            return ({'0,0':'Morcego','0,1':'Diabinho','1,1':'Caveira','2,0':'Ogro','3,0':'Touro','3,1':'Necromante'})[`${e.imgX},${e.imgY}`]||'Inimigo';
        }
        return 'Inimigo';
    }
    function projectileName(e){
        if(e?.props?.bmDamageOrigin==='witchFireball')return 'Bola de fogo da Bruxa';
        return e?.props?.modelo==='rocha'?'Rocha':'Projétil / armadilha de fogo';
    }
    function fatal(scene,cause){if(scene.pc.vidas>0)return false;if(scene._bmRun&&!scene._bmRun.cause)scene._bmRun.cause=cause;return true;}
    // AbortError e esperado quando pause() ou a troca de src interrompem play().
    function playAudio(audio,label='audio'){
        if(!audio)return;
        const report=e=>{if(e?.name!=='AbortError')console.warn('[Blue Moon Audio] '+label,e);};
        try{const pending=audio.play();if(pending?.catch)pending.catch(report);}catch(e){report(e);}
    }
    function updateDefeatMusic(m){
        if(m.musicStarted)return;
        m.musicStarted=true;
        const a=m.theme;if(!a)return;
        a.pause();a.src='assets/gameover.ogg';a.loop=false;a.volume=m.volume;
        playAudio(a,'game over');
    }
    // BM_GAMEOVER_V5: interrompe a musica imediatamente, mas conserva o quadro
    // de dano durante a pausa dramatica. Nenhum passo de gameplay e executado.
    function beginDeath(scene){
        if(dying||menu)return;
        const player=scene.pc;
        dying={elapsed:0,hold:Math.max(DEATH_HOLD,Number(player.atingido)||0)};
        scene.gamer?.tema?.pause();
        DungeonMapSystem.close(scene,scene.map?._bmDungeonMap);
        scene.paused=true;player.vx=player.vy=0;player.vidas=0;
        // fatal() retorna antes de algumas atribuicoes antigas de dano.
        player.atingido=dying.hold;player.imune=Math.max(1,Number(player.imune)||0);
    }
    function drawDeath(scene){
        // Redesenha somente a parte visual, sem eventos, IA, HUD ou camera nova.
        if(scene.map&&scene.stageIndex!==2){
            scene.limpar();scene.desenharMapa();
            if(typeof CombatArena!=='undefined')CombatArena.draw(scene);
            scene.desenhar();
        }else black(scene,1);
        black(scene,ease((dying.elapsed-dying.hold)/DEATH_FADE));
    }
    function deathTick(scene,delta){
        drawDeath(scene);
        if(dying.elapsed+1e-9>=dying.hold+DEATH_FADE){
            dying=null;begin(scene);updateDefeatMusic(menu);draw(scene);return;
        }
        dying.elapsed=Math.min(dying.hold+DEATH_FADE,dying.elapsed+delta);
    }
    function stopAudio(scene,theme=true){if(theme)scene.gamer?.tema?.pause();for(const channel of scene.assets?.channels||[]){channel.audio.pause();channel.fim=-1;}for(const a of Object.values(scene.assets?.audios||{}))a.pause?.();}
    function begin(scene){if(menu)return;const r=scene._bmRun;menu={elapsed:0,choice:0,armed:false,error:null,stats:{option:r?.option,seed:r?.seed,seconds:r?.seconds||0,kills:r?.kills||0,visited:r?.visited.size||0,total:r?.total||0,cause:r?.cause||'Desconhecida'}};
        scene.inventory?.metrics?.finish('defeat');DungeonMapSystem.close(scene,scene.map?._bmDungeonMap);scene.pc.vx=scene.pc.vy=0;scene.pc.vidas=0;menu.theme=scene.gamer?.tema;menu.volume=menu.theme?.volume??1;menu.musicStarted=false;stopAudio(scene,false);scene.stageIndex=2;scene.paused=true;lastPad=pad();}
    function restart(scene,retry){const {option,seed}=menu.stats;if(retry&&!Number.isInteger(option))return;
        // Manter a identidade de cena1: os listeners de inventario e mapa capturam essa referencia.
        try{stopAudio(scene);scene.limparCena();const freshPlayer=new Sprite({x:206,y:176,w:12,h:12,imgX:0,imgY:0,vidas:7,maxVidas:7,imagem:'hero',comportar:porTeclasDirecionais(teclas),props:{tipo:'pc'}});
            pc=freshPlayer;seedValueURL=retry?seed:Math.floor(Math.random()*4500000)+500000;
            random=new SeedGenerator(String(seedValueURL),'sfc32');Room.id=0;
            gerenciador=new GameManager(pc);
            const freshScene=new Scene({ctx:scene.ctx,w:scene.w,h:scene.h,assets:scene.assets,gamer:gerenciador});
            for(const k of Object.keys(scene))delete scene[k];Object.assign(scene,freshScene);scene.adicionar(pc);
            if(retry){replayPending=true;scene.stageIndex=0;gerenciador.inicializarDungeonAleatoria(option)();}
            else{resetSwitches();recipe=null;replayPending=false;replaying=false;scene.stageIndex=1;}
            pc.vx=pc.vy=0;menu=null;resumeBlocked=true;entryFade={elapsed:0};
        }catch(e){console.error('[Blue Moon Game Over]',e);menu.error='Falha ao reiniciar. Confira o console (F12).';scene.paused=true;scene.stageIndex=2;scene.pc.vidas=0;const oldVolume=menu.exit?.volume;menu.exit=null;menu.armed=false;if(menu.theme&&oldVolume!==undefined){menu.theme.volume=oldVolume;playAudio(menu.theme,'game over');}}}
    function action(scene,name){
        if(!menu?.armed||menu.elapsed<1.5||menu.exit)return;
        if(name==='up'||name==='down'){menu.choice=1-menu.choice;playCursor();return;}
        if(name==='back'||name==='confirm'){
            const retry=name==='confirm'&&menu.choice===0&&Number.isInteger(menu.stats.option);
            menu.exit={retry,elapsed:0,blackFrame:false,volume:menu.theme?.volume??1};
            menu.armed=false;
        }
    }
    addEventListener('keydown',e=>{if(keyboard.has(e.code)){keys.add(e.code);if(menu||dying){e.preventDefault();e.stopImmediatePropagation();if(menu&&!e.repeat)action(cena1,({ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Enter:'confirm',Space:'confirm',Escape:'back'})[e.code]);}}},true);
    addEventListener('keyup',e=>keys.delete(e.code),true);addEventListener('blur',()=>{keys.clear();if(menu)menu.armed=false;});
    function draw(scene){const c=scene.ctx,w=scene.w,h=scene.h,m=menu,r=m.stats;c.save();try{c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#080b13';c.fillRect(0,0,w,h);
        const a=Math.min(1,m.elapsed/0.9);c.globalAlpha=a;
        if(art.complete&&art.naturalWidth){const scale=w/art.naturalWidth;const ih=art.naturalHeight*scale;c.drawImage(art,0,0,w,ih);const grad=c.createLinearGradient(0,ih*.68,0,Math.max(ih, h*.69));grad.addColorStop(0,'rgba(8,11,19,0)');grad.addColorStop(1,'#080b13');c.fillStyle=grad;c.fillRect(0,ih*.68,w,h-ih*.68);}
        const scale=Math.min(w/860,h/640),cx=w/2;function text(t,y,size,color='#e1e5f0',font='Georgia'){c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font=`${size*scale}px ${font}`;c.fillText(t,cx,y*h/640);}
        text('G A M E  O V E R',340,38);text('A pequena Lyra caiu antes de salvar seu pai...',380,19,'#b6bfd5');
        c.strokeStyle='#52617d';c.beginPath();c.moveTo(w*.23,h*402/640);c.lineTo(w*.77,h*402/640);c.stroke();
        text(`Seed: ${r.seed??'—'}    •    Fase: ${r.total||'—'} salas`,423,17);text(`Tempo: ${time(r.seconds)}    •    Inimigos derrotados: ${r.kills}    •    Salas: ${r.visited}/${r.total}`,450,15,'#b6bfd5','Arial');text(`Causa da morte: ${r.cause}`,474,15,'#b6bfd5','Arial');
        if(m.elapsed>=1.1){for(let i=0;i<2;i++){const y=h*(493+i*44)/640,hh=37*h/640,bw=w*.53;c.fillStyle=m.choice===i?'#25344f':'#111a29';c.fillRect(cx-bw/2,y,bw,hh);c.strokeStyle=m.choice===i?'#b9cbe9':'#3a465f';c.strokeRect(cx-bw/2,y,bw,hh);text((m.choice===i?'›  ':'')+labels[i],512+i*44,18);}
        text(m.error||'↑ ↓ / D-pad: navegar  •  Enter / ✕: confirmar  •  Esc / ○: seleção',603,14,'#a2aec6','Arial');}
    }finally{c.restore();}}
    function tick(scene,dt){
        if(!menu&&!dying&&scene.pc?.vidas<=0){entryFade=null;beginDeath(scene);}
        // Limita o avanço dos fades caso a geração ou uma aba inativa cause um dt grande.
        const delta=Math.max(0,Math.min(.1,Number(dt)||0));
        if(dying){deathTick(scene,delta);return;}
        if(menu){
            if(menu.exit){
                const e=menu.exit;
                if(e.blackFrame){restart(scene,e.retry);if(menu)draw(scene);else black(scene,1);return;}
                e.elapsed=Math.min(FADE_OUT,e.elapsed+delta);
                const alpha=ease(e.elapsed/FADE_OUT);
                if(menu.theme)menu.theme.volume=e.volume*(1-alpha);
                draw(scene);black(scene,alpha);
                if(e.elapsed>=FADE_OUT)e.blackFrame=true;
                return;
            }
            menu.elapsed+=delta;updateDefeatMusic(menu);
            const now=pad();if(menu.elapsed>=1.5&&!keys.size&&!anyPadHeld())menu.armed=true;
            if(menu.armed){for(const k of ['up','down','back','confirm'])if(now.has(k)&&!lastPad.has(k)){action(scene,k);break;}}lastPad=now;
            if(menu)draw(scene);return;
        }
        if(resumeBlocked){if(keys.size||anyPadHeld()){black(scene,1);return;}resumeBlocked=false;}
        observe(scene,entryFade?delta:dt);scene.passo(entryFade?delta:dt);
        if(scene.pc?.vidas<=0){entryFade=null;beginDeath(scene);deathTick(scene,0);return;}
        if(entryFade){black(scene,1-ease(entryFade.elapsed/FADE_IN));entryFade.elapsed+=delta;if(entryFade.elapsed>FADE_IN)entryFade=null;}
    }
    return {start,prepare,sokoban,kill,fatal,enemyName,projectileName,tick,playAudio,setConfirmButton,active:()=>!!dying||!!menu||!!entryFade};
})();
