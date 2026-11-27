/* BM_RUN_V1 / BM_GAMEOVER_V5. Interface independente da HUD; um unico loop e listeners. */
const BMGameOver = (() => {
    const art=new Image(); art.src='assets/gameover.webp';
    const victoryArt=new Image(); victoryArt.src='assets/victory.webp'; // BM_VICTORY_V1
    let loading=null; // BM_LOADING_V1
    let menu=null, keys=new Set(), lastPad=new Set(), resumeBlocked=false, entryFade=null, dying=null;
    const labels=['Reiniciar esta run (mesma seed)','Voltar à seleção de fases'];
    const time=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
    const keyboard={has:code=>!!BMControls.keyAction(code)||code==='KeyN'};
    const connectedPads=BMControls.pads,button=BMControls.button,profile=BMControls.profile;
    function setConfirmButton(deviceIndex,buttonIndex){const g=connectedPads().find(p=>p.index===deviceIndex);if(!g||buttonIndex===profile(g).back)throw Error('Controle ou botao invalido.');const err=BMControls.bindPad(g,'confirm',buttonIndex);if(err)throw Error(err);return profile(g);}
    function pad(){return BMControls.menuPad(BMControls.preferred());}
    function anyPadHeld(){return connectedPads().some(BMControls.held);}
    // BM_PAUSE_AUDIO_V2: todos os menus usam o pool do AssetsManager.
    const CURSOR_KEY='bmMenuCursor', DECISION_KEY='bmMenuDecision', CURSOR_VOLUME=.65, DECISION_VOLUME=.65, PAUSE_BGM_FACTOR=.35; // BM_MENU_DECISION_V1
    function ensureCursor(scene){
        const a=scene?.assets;
        if(!a?.audios||typeof a.loadAudio!=='function'||typeof a.play!=='function')return null;
        if(!a.audios[CURSOR_KEY])a.loadAudio(CURSOR_KEY,'assets/cursor.ogg');
        if(!a.audios[DECISION_KEY])a.loadAudio(DECISION_KEY,'assets/decision.ogg');
        return a;
    }
    function playCursor(scene){try{ensureCursor(scene)?.play(CURSOR_KEY,CURSOR_VOLUME);}catch(e){console.warn('[Blue Moon Audio] cursor',e);}}
    function playDecision(scene){try{ensureCursor(scene)?.play(DECISION_KEY,DECISION_VOLUME);}catch(e){console.warn('[Blue Moon Audio] decision',e);}}
    const FADE_OUT=.55, FADE_IN=.6, DEATH_HOLD=.3, DEATH_FADE=.6, WIN_HOLD=.65, WIN_FADE=.8;
    function black(scene,alpha){const c=scene.ctx;c.save();try{c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=Math.max(0,Math.min(1,alpha));c.fillStyle='#000';c.fillRect(0,0,scene.w,scene.h);}finally{c.restore();}}
    function ease(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
    const {start,prepare,sokoban,observe,kill}=BMRun; // compatibilidade dos hooks existentes
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
        a.pause();a.src=m.victory?'assets/final.ogg':'assets/gameover.ogg';a.loop=!!m.victory;a.volume=m.volume;
        playAudio(a,m.victory?'vitória':'game over');
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
    // A vitoria conserva a vida e as estatisticas; nenhuma simulacao apos o resultado.
    function win(scene){
        if(menu||dying||scene.stageIndex!==3||!(scene.pc?.vidas>0)||!scene._bmRun||scene.spritesE.length!==0)return false;
        dying={elapsed:0,hold:WIN_HOLD,victory:true};entryFade=null;
        DungeonMapSystem.close(scene,scene.map?._bmDungeonMap);
        scene.paused=true;scene.pc.vx=scene.pc.vy=0;
        scene.gamer?.tema?.pause();
        return true;
    }
    function drawDeath(scene){
        // Redesenha somente a parte visual, sem eventos, IA, HUD ou camera nova.
        // BM_WITCH_IMPACT_V1: avanca exclusivamente o efeito visual do impacto fatal.
        const explosion=scene._bmFatalWitchExplosion;
        if(!dying.victory&&explosion){
            explosion.frame=26*dying.elapsed;
            if(Math.floor(explosion.frame)>16){
                const i=scene.spritesXP.indexOf(explosion);
                if(i>=0)scene.spritesXP.splice(i,1);
                delete scene._bmFatalWitchExplosion;
            }
        }
        if(scene.map&&scene.stageIndex!==2){
            scene.limpar();scene.desenharMapa();
            if(typeof CombatArena!=='undefined')CombatArena.draw(scene);
            scene.desenhar();
        }else black(scene,1);
        black(scene,ease((dying.elapsed-dying.hold)/(dying.victory?WIN_FADE:DEATH_FADE)));
    }
    function deathTick(scene,delta){
        drawDeath(scene);
        const duration=dying.hold+(dying.victory?WIN_FADE:DEATH_FADE);
        if(dying.elapsed+1e-9>=duration){
            const victory=!!dying.victory;dying=null;begin(scene,victory);updateDefeatMusic(menu);draw(scene);return;
        }
        dying.elapsed=Math.min(duration,dying.elapsed+delta);
    }
    function stopAudio(scene,theme=true,preserveDecision=false){if(theme)scene.gamer?.tema?.pause();const decision=scene.assets?.audios?.[DECISION_KEY];for(const channel of scene.assets?.channels||[]){if(preserveDecision&&decision&&channel.audio.src===decision.src&&channel.fim>=0&&!channel.audio.ended)continue;channel.audio.pause();channel.fim=-1;}for(const a of Object.values(scene.assets?.audios||{}))a.pause?.();}
    function begin(scene,victory=false){if(menu)return;const r=BMRun.snapshot(scene);menu={victory,health:scene.pc.vidas,elapsed:0,choice:0,armed:false,error:null,stats:{option:r?.option,seed:r?.seed,seconds:r?.seconds||0,kills:r?.kills||0,visited:r?.visited||0,total:r?.total||0,cause:r?.cause||'Desconhecida'}};
        BMRun.finish(scene,victory?'victory':'defeat');DungeonMapSystem.close(scene,scene.map?._bmDungeonMap);scene.pc.vx=scene.pc.vy=0;if(!victory)scene.pc.vidas=0;menu.theme=scene.gamer?.tema;menu.volume=menu.theme?.volume??1;menu.musicStarted=false;stopAudio(scene,false);scene.stageIndex=2;scene.paused=true;lastPad=pad();}
    function restart(scene,retry){const {option,seed}=menu.stats;if(retry&&!Number.isInteger(option))return;
        // Manter a identidade de cena1: os listeners de inventario e mapa capturam essa referencia.
        if(retry){beginLoading(scene,{mode:'retry',option,seed},menu);return;}
        try{neutralize();BMRun.rebuild(scene,{mode:'selection',option,seed},stopAudio);
            menu=null;resumeBlocked=true;entryFade={elapsed:0};
        }catch(e){console.error('[Blue Moon Game Over]',e);menu.error='Falha ao reiniciar. Confira o console (F12).';scene.paused=true;scene.stageIndex=2;if(scene.pc)scene.pc.vidas=(menu.victory||menu.pauseOrigin)?menu.health:0;const oldVolume=menu.exit?.volume;menu.exit=null;menu.armed=false;if(menu.theme&&oldVolume!==undefined){menu.theme.volume=oldVolume;playAudio(menu.theme,menu.victory?'vitória':'game over');}}}
    function action(scene,name){
        if(!menu?.armed||menu.elapsed<1.5||menu.exit)return;
        if(name==='right'){copySeed(menu,menu.stats.seed);playDecision(scene);return;}
        if(name==='up'||name==='down'){menu.choice=1-menu.choice;playCursor(scene);return;}
        if(name==='back'||name==='confirm'){
            if(name==='confirm')playDecision(scene);
            const retry=name==='confirm'&&menu.choice===0&&Number.isInteger(menu.stats.option);
            menu.exit={retry,elapsed:0,blackFrame:false,volume:menu.theme?.volume??1};
            menu.armed=false;
        }
    }
    addEventListener('keydown',e=>{if(loading){if(BMControls.validEvent(e)&&keyboard.has(e.code)){keys.add(e.code);e.preventDefault();e.stopImmediatePropagation();}return;}if(bindingKey(e)||seedKey(e))return;if(!BMControls.validEvent(e))return;if(keyboard.has(e.code)){keys.add(e.code);if(titleKey(e)||pauseKey(e))return;if(menu||dying){e.preventDefault();e.stopImmediatePropagation();if(menu&&!e.repeat)action(cena1,BMControls.menuKey(e.code));}}},true);
    addEventListener('keyup',e=>keys.delete(e.code),true);addEventListener('blur',()=>{pauseBlur();if(menu)menu.armed=false;});
    // BM_PAUSE_V1: pausa modal, sem executar Scene.passo ou observe.
    let pausedMenu=null, pauseRelease=null, pauseLast=new Set(), activePad=null, focusLost=false, lastScene=null;
    // BM_SETTINGS_V1 — mesmo submenu no titulo e na pausa.
    const settingsLabels=['Música (BGM)','Efeitos sonoros','Tela cheia','Remapear teclado','Configurar joystick','Zona morta do analógico','Restaurar volumes padrão','Dicas contextuais','Redefinir dicas do tutorial','Voltar' /* BM_TUTORIAL_V1 */];
    function openSettings(owner){owner.screen='settings';owner.settingsChoice=0;owner.settingsMessage='';}
    function syncSettings(scene,pause){const theme=scene.gamer?.tema;
        if(theme){const v=BMSettings.nominal(theme);if(pause){pause.volume=v;theme.volume=v*PAUSE_BGM_FACTOR;}else theme.volume=v;}
        BMSettings.refreshEffects(scene.assets);
    }
    function fullscreenState(){return typeof document!=='undefined'&&!!document.fullscreenElement;}
    function toggleFullscreen(scene,owner){
        try{const d=typeof document!=='undefined'?document:null;const target=scene.ctx.canvas;
            if(!d||(!d.fullscreenElement&&!target?.requestFullscreen)|| (d.fullscreenElement&&!d.exitFullscreen))throw Error('indisponível');
            const result=d.fullscreenElement?d.exitFullscreen():target.requestFullscreen();
            owner.settingsMessage='';
            if(result?.catch)result.catch(()=>{owner.settingsMessage='Tela cheia bloqueada. Tente confirmar pelo teclado.';});
        }catch(_){owner.settingsMessage='Tela cheia indisponível. Use F11 no navegador.';}
    }
    function settingsAction(scene,owner,name,pause){
        const i=owner.settingsChoice;
        if(name==='back'||name==='start'){owner.screen='main';return;}
        if(name==='up'||name==='down'){owner.settingsChoice=(i+(name==='up'?-1:1)+settingsLabels.length)%settingsLabels.length;playCursor(scene);return;}
        if((name==='left'||name==='right')&&i<2){const k=i===0?'bgm':'sfx';if(BMSettings.set(k,BMSettings.get(k)+(name==='left'?-10:10))){syncSettings(scene,pause);playCursor(scene);}return;}
        if((name==='left'||name==='right')&&i===5){BMControls.setDeadzone(BMControls.deadzone()*100+(name==='left'?-5:5));playCursor(scene);return;}
        if((name==='left'||name==='right')&&i===7){BMTutorial.setEnabled(!BMTutorial.enabled());playCursor(scene);return;}
        if(name!=='confirm')return;
        if(i<2){playDecision(scene);return;} // ouvir o efeito com o volume atual
        if(i===2)toggleFullscreen(scene,owner);
        if(i===3||i===4){playDecision(scene);openBindings(owner,i===3?'keyboard':'pad');return;}
        if(i===6){BMSettings.reset();syncSettings(scene,pause);}
        if(i===7)BMTutorial.setEnabled(!BMTutorial.enabled());
        if(i===8){BMTutorial.reset();owner.settingsMessage='As dicas serão exibidas novamente ao encontrar cada mecânica.';}
        playDecision(scene);
        if(i===9)owner.screen='main';
    }
    function drawSettings(c,owner){
        c.save();try{
            c.fillStyle='rgba(8,15,28,.98)';c.fillRect(90,56,680,528);c.strokeStyle='#7086aa';c.strokeRect(90.5,56.5,679,527);
            const txt=(str,x,y,size,color='#e2edff',align='center',font='Arial')=>{c.fillStyle=color;c.font=`${size}px ${font}`;c.textAlign=align;c.textBaseline='middle';c.fillText(str,x,y,638);};
            txt('CONFIGURAÇÕES',430,103,32,'#d3e4ff','center','Georgia');
            txt('ÁUDIO, VÍDEO E JOGABILIDADE',430,140,14,'#9eb6d8');
            settingsLabels.forEach((s,i)=>{const y=151+i*32,sel=i===owner.settingsChoice;
                c.fillStyle=sel?'#293d58':'#152236';c.fillRect(126,y,608,29);c.strokeStyle=sel?'#aac3ea':'#354760';c.strokeRect(126.5,y+.5,607,28);
                txt((sel?'›  ':'')+s,146,y+14.5,18,sel?'#edf4ff':'#c5cfdf','left');
                if(i<2){const v=BMSettings.get(i===0?'bgm':'sfx');c.fillStyle='#0b1526';c.fillRect(450,y+9,155,11);c.fillStyle='#87b2e7';c.fillRect(450,y+9,155*v/100,11);txt(`‹  ${v}%  ›`,713,y+14.5,16,'#e2edff','right');}
                if(i===2)txt(fullscreenState()?'Ativada':'Desativada',713,y+14.5,16,'#e2edff','right');
                if(i===5)txt('‹  '+Math.round(BMControls.deadzone()*100)+'%  ›',713,y+14.5,16,'#e2edff','right');
                if(i===7)txt(BMTutorial.enabled()?'‹  Ativadas  ›':'‹  Desativadas  ›',713,y+14.5,16,'#e2edff','right');
            });
            txt(owner.settingsMessage||(!BMSettings.storageOK()||!BMTutorial.storageOK()?'Preferências disponíveis apenas nesta sessão.':'Preferências salvas automaticamente.'),430,492,15,'#a9bddb');
            txt('↑ ↓ / W S: navegar  •  ← → / A D: ajustar',430,531,15,'#a3b5d1');
            txt(menuHint(),430,555,15,'#a3b5d1');
        }finally{c.restore();}
    }
    const pauseLabels=['Continuar','Controles','Reiniciar esta run','Abandonar run','Configurações'];
    // BM_CONTROLS_V1 / BM_CONTROLS_V2 — editor modal compartilhado.
    function openBindings(owner,kind){owner.screen='bindings';owner.bindingKind=kind;owner.bindingChoice=0;owner.capture=null;owner.bindingMessage='';}
    function bindingItems(owner){return [...(owner.bindingKind==='keyboard'?BMControls.keyNames:BMControls.padNames),'defaults','return'];}
    function bindingAction(scene,owner,name){
        if(owner.capture)return;
        const items=bindingItems(owner),a=items[owner.bindingChoice],g=preferredPad();
        if(name==='back'||name==='start'){owner.screen='settings';return;}
        if(name==='up'||name==='down'){owner.bindingChoice=(owner.bindingChoice+(name==='up'?-1:1)+items.length)%items.length;owner.bindingMessage='';playCursor(scene);return;}
        if(name!=='confirm')return;
        if(a==='return'){playDecision(scene);owner.screen='settings';return;}
        if(owner.bindingKind==='pad'&&!g){owner.bindingMessage='Conecte um controle para configurar.';return;}
        playDecision(scene);
        if(a==='defaults'){if(owner.bindingKind==='keyboard')BMControls.resetKeys();else BMControls.resetPad(g);owner.bindingMessage='Padrões restaurados.';owner.armed=false;neutralize();return;}
        owner.capture={action:a,device:g?BMControls.id(g):null,released:false,remaining:10};owner.bindingMessage=owner.bindingKind==='keyboard'?'Pressione uma tecla. Esc cancela.':'Solte os botões e pressione o novo. Esc ou 10 s: cancelar.';
    }
    function bindingKey(e){const owner=title||pausedMenu;if(owner?.screen!=='bindings'||!owner.capture)return false;
        keys.add(e.code);e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return true;
        if(e.code==='Escape'){owner.capture=null;owner.bindingMessage='Alteração cancelada.';owner.armed=false;return true;}
        if(owner.bindingKind!=='keyboard')return true;
        if(!BMControls.validEvent(e))return true;
        const error=BMControls.bindKey(owner.capture.action,e.code);owner.bindingMessage=error||'Tecla salva.';
        if(!error){owner.capture=null;owner.armed=false;neutralize();playDecision(title?titleScene:owner.scene);}return true;
    }
    function bindingPoll(scene,owner,g,dt){if(owner.screen!=='bindings'||!owner.capture)return false;
        if(owner.bindingKind==='keyboard')return true;
        const cap=owner.capture;
        if(focusLost)return true;
        cap.remaining-=Math.max(0,dt||0);if(cap.remaining<=0){owner.capture=null;owner.bindingMessage='Tempo esgotado. Alteração cancelada.';owner.armed=false;return true;}
        if(!g||BMControls.id(g)!==cap.device){owner.capture=null;owner.bindingMessage='Controle desconectado.';owner.armed=false;return true;}
        const pressed=Array.from(g.buttons||[],(_,i)=>i).filter(i=>BMControls.button(g,i));
        if(!cap.released){if(!pressed.length)cap.released=true;return true;}
        if(pressed.length===1){const error=BMControls.bindPad(g,cap.action,pressed[0]);owner.bindingMessage=error||'Botão salvo (conflitos trocados).';cap.released=false;if(!error){owner.capture=null;owner.armed=false;neutralize();playDecision(scene);}}return true;
    }
    function drawBindings(c,owner){c.save();try{
        c.fillStyle='rgba(8,15,28,.98)';c.fillRect(90,45,680,550);c.strokeStyle='#7086aa';c.strokeRect(90.5,45.5,679,549);
        const txt=(s,x,y,size,color='#e2edff',align='center')=>{c.fillStyle=color;c.font=`${size}px Arial`;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y,620);};
        const g=preferredPad(),items=bindingItems(owner),pad=owner.bindingKind==='pad';
        txt(pad?'CONFIGURAR JOYSTICK':'REMAPEAR TECLADO',430,85,28,'#d3e4ff');
        txt(pad?(g?String(g.id):'Nenhum controle conectado'):'Setas, Enter, Espaço e Esc continuam disponíveis.',430,118,14,'#a9bddb');
        const start=Math.max(0,Math.min(items.length-8,owner.bindingChoice-4));
        items.slice(start,start+8).forEach((a,i)=>{const y=145+i*42,sel=start+i===owner.bindingChoice;
            c.fillStyle=sel?'#293d58':'#152236';c.fillRect(125,y,610,37);c.strokeStyle=sel?'#aac3ea':'#354760';c.strokeRect(125.5,y+.5,609,36);
            const label=BMControls.labels[a]||(a==='defaults'?'Restaurar controles padrão':'Voltar');
            txt((sel?'›  ':'')+label,145,y+18,17,sel?'#edf4ff':'#c5cfdf','left');
            if(BMControls.labels[a])txt(owner.capture?.action===a?'…':pad?(g?BMControls.padLabel(g,a)+' ['+BMControls.profile(g)[a]+']':'—'):BMControls.keyLabel(BMControls.key(a)),710,y+18,15,'#e2edff','right');
        });
        txt(`${owner.bindingChoice+1}/${items.length}`,430,492,13,'#a9bddb');
        txt(owner.bindingMessage||(!BMControls.storageOK()?'Preferências apenas nesta sessão.':'Alterações salvas automaticamente.'),430,522,15,'#a9bddb');
        txt(owner.capture?'Esc: cancelar':'↑ ↓: navegar   •   Enter: alterar   •   Esc: voltar',430,560,15,'#a3b5d1');
    }finally{c.restore();}}
    function controlRows(){const g=preferredPad();return [
        [['up','left','down','right'].map(a=>BMControls.keyLabel(BMControls.key(a))).join('/')+' / direcional','Movimentar'],
        [BMControls.combo('sword',g),'Espada'],[BMControls.combo('fire',g),'Magia'],
        [BMControls.combo('previous',g)+' e '+BMControls.combo('next',g),'Trocar item'],[BMControls.combo('map',g),'Mapa'],[BMControls.combo('resetSokoban',g),'Restaurar selos'],[BMControls.combo('pause',g),'Pausar'],[BMControls.keyLabel(BMControls.key('sword'))+'/'+BMControls.combo('confirm',g),'Confirmar nos menus']];}
    function menuHint(){return '↑ ↓ / direcional: navegar  •  '+BMControls.keyLabel(BMControls.key('sword'))+'/'+BMControls.combo('confirm')+': confirmar  •  Esc / '+BMControls.padLabel(preferredPad(),'fire')+': voltar';}
    const pauseEligible=s=>!loading&&!!s&&!!s._bmRun&&[0,3].includes(s.stageIndex)&&s.pc?.vidas>0&&!(s.theEnd>0)&&!menu&&!dying&&!entryFade&&!resumeBlocked;
    function preferredPad(){return BMControls.preferred();}
    function padIdentity(g){return g?`${g.index}:${g.id}`:null;}
    function pausePad(g){return BMControls.menuPad(g);}
    function pauseHeld(g){return BMControls.held(g);}
    function neutralize(){
        if(typeof input!=='undefined')input._bmKeys?.clear();
        if(typeof input!=='undefined')for(const bag of [input.teclas,input.comandos,input.movimentos])for(const k of Object.keys(bag||{})){if(typeof bag[k]==='object'&&bag[k])bag[k].valor=0;else bag[k]=false;}
        if(typeof teclas!=='undefined')for(const k of Object.keys(teclas))teclas[k]=0;
        if(typeof keyPressed!=='undefined')keyPressed={};
    }
    function captureFrame(scene){try{const c=document.createElement('canvas');c.width=scene.w;c.height=scene.h;c.getContext('2d').drawImage(scene.ctx.canvas,0,0);return c;}catch(_){return null;}}
    function openPause(scene,reason='manual'){
        if(pausedMenu||pauseRelease||!pauseEligible(scene))return false;
        const theme=scene.gamer?.tema;
        pausedMenu={scene,reason,screen:'main',choice:0,armed:false,previousPaused:scene.paused,frame:captureFrame(scene),theme,volume:theme?.volume??1,wasPlaying:!!theme&&!theme.paused&&!theme.ended,exit:null};
        scene.paused=true;neutralize();
        if(theme)theme.volume=pausedMenu.volume*PAUSE_BGM_FACTOR; // BGM continua; efeitos de gameplay param.
        stopAudio(scene,false,true);
        pauseLast=pausePad(preferredPad());return true;
    }
    function resumePause(){const p=pausedMenu;if(!p||p.failed)return;pausedMenu=null;pauseRelease=p;neutralize();}
    function pauseAction(name){const p=pausedMenu;if(!p||!p.armed||p.exit||!name||focusLost)return;
        if(p.screen==='bindings'){bindingAction(p.scene,p,name);return;}
        if(p.screen==='settings'){settingsAction(p.scene,p,name,p);return;}
        if(p.failed){if(name==='confirm'){playDecision(p.scene);p.exit={retry:false,elapsed:0};}return;}
        if(name==='back'||name==='start'){
            if(p.screen==='main')resumePause();else{p.screen='main';p.choice=p.mainChoice??0;playCursor(p.scene);}return;
        }
        if(p.screen==='main'&&name==='right'){copySeed(p,p.scene._bmRun?.seed);playDecision(p.scene);return;}
        if(p.screen==='controls'){if(name==='confirm'){playDecision(p.scene);p.screen='main';p.choice=1;}return;}
        if(name==='up'||name==='down'){const n=p.screen==='confirm'?2:pauseLabels.length;p.choice=(p.choice+(name==='up'?-1:1)+n)%n;playCursor(p.scene);return;}
        if(name!=='confirm')return;
        playDecision(p.scene);
        if(p.screen==='confirm'){
            if(p.choice===0){p.screen='main';p.choice=p.mainChoice;}else p.exit={retry:p.mainChoice===2,elapsed:0};return;
        }
        if(p.choice===0)resumePause();else if(p.choice===1){p.mainChoice=1;p.screen='controls';}else if(p.choice===4){openSettings(p);}else{p.mainChoice=p.choice;p.screen='confirm';p.choice=0;}
    }
    function drawPause(scene,p){const c=scene.ctx,w=scene.w,h=scene.h;
        c.save();try{c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';
            if(p.frame)c.drawImage(p.frame,0,0,w,h);else{c.fillStyle='#080b13';c.fillRect(0,0,w,h);}
            c.fillStyle='rgba(4,8,16,.72)';c.fillRect(0,0,w,h);
            const scale=Math.min(w/860,h/640);c.translate(w/2,h/2);c.scale(scale,scale);
            if(p.screen==='bindings'){c.translate(-430,-320);drawBindings(c,p);return;}
            if(p.screen==='settings'){c.translate(-430,-320);drawSettings(c,p);return;}
            const panel=(x,y,bw,bh)=>{c.fillStyle='#101827';c.fillRect(x,y,bw,bh);c.strokeStyle='#7086aa';c.lineWidth=1;c.strokeRect(x+.5,y+.5,bw-1,bh-1);};
            const text=(s,y,size,color='#e3e9f5',x=0,align='center')=>{c.fillStyle=color;c.font=`${size}px ${size>=26?'Georgia':'Arial'}`;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y,570);};
            const item=(s,y,selected)=>{c.fillStyle=selected?'#2b3c59':'#192337';c.fillRect(-205,y,410,44);c.strokeStyle=selected?'#aac3ea':'#384761';c.strokeRect(-204.5,y+.5,409,43);text((selected?'›  ':'')+s,y+22,19,selected?'#edf4ff':'#c5cfdf');};
            panel(-310,-258,620,516);
            text(p.failed?(p.initialFailure?'FALHA AO INICIAR':'FALHA AO REINICIAR'):p.screen==='controls'?'CONTROLES':p.screen==='confirm'?'CONFIRMAR':'P A U S A D O',-208,32,'#c8dcfa');
            if(p.failed){text(p.initialFailure?'Não foi possível gerar a run. Confira o console (F12).':'Não foi possível recriar a run. Confira o console (F12).',-110,16);item('Voltar à seleção de fases',0,true);}
            else if(p.screen==='controls'){controlRows().forEach(([a,b],i)=>{text(a,-151+i*37,16,'#b3c9ed',-250,'left');text(b,-151+i*37,16,'#e3e9f5',250,'right');});text(menuHint(),204,15,'#a3b5d1');}
            else if(p.screen==='confirm'){text(p.mainChoice===2?'Reiniciar esta run com a mesma seed?':'Abandonar a run e voltar à seleção?',-132,19);text('Todo o progresso atual será perdido.',-97,16,'#e7b6a8');item('Cancelar',-30,p.choice===0);item(p.mainChoice===2?'Reiniciar desde o início':'Abandonar run',26,p.choice===1);}
            else{const r=scene._bmRun;const reason=({blur:'Janela sem foco — retome quando estiver pronto.',disconnect:'Controle desconectado — use o teclado ou reconecte.'})[p.reason];text(p.seedMessage||reason||`Seed: ${r?.seed??'—'}  •  Tempo: ${time(r?.seconds||0)}  •  →: copiar seed`,-151,15,'#a8bad6');pauseLabels.forEach((s,i)=>item(s,-115+i*60,p.choice===i));}
            if(p.screen!=='controls')text(p.failed?'Enter / X: confirmar':menuHint(),205,14,'#a3b5d1');
        }finally{c.restore();}}
    function pauseTick(scene,dt){lastScene=scene;const g=preferredPad(),id=padIdentity(g),now=pausePad(g);
        const disconnected=activePad!==null&&!connectedPads().some(q=>padIdentity(q)===activePad);activePad=id;
        const start=now.has('start')&&!pauseLast.has('start');
        if(!pausedMenu&&!pauseRelease){if(disconnected)openPause(scene,'disconnect');else if(focusLost)openPause(scene,'blur');else if(start)openPause(scene);}
        if(pauseRelease){const p=pauseRelease;
            if(focusLost||disconnected){pauseRelease=null;pausedMenu=p;p.armed=false;p.reason=disconnected?'disconnect':'blur';}
            else if(!keys.size&&!pauseHeld(g)){neutralize();scene.paused=p.previousPaused;pauseRelease=null;if(p.theme)p.theme.volume=p.volume;if(p.frame){const c=scene.ctx;c.save();try{c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(p.frame,0,0);}finally{c.restore();}}pauseLast=now;return true;}
            else{drawPause(scene,p);pauseLast=now;return true;}
        }
        if(!pausedMenu){pauseLast=now;return false;}
        const p=pausedMenu;
        if(!focusLost&&!keys.size&&!pauseHeld(g))p.armed=true;
        if(!bindingPoll(scene,p,g,dt)&&p.armed&&!focusLost)for(const name of ['start','back','up','down','left','right','confirm'])if(now.has(name)&&!pauseLast.has(name)){pauseAction(name);break;}
        pauseLast=now;
        if(!pausedMenu)return true;
        drawPause(scene,p);
        if(p.exit){p.exit.elapsed+=dt;const alpha=ease(p.exit.elapsed/FADE_OUT);if(p.theme)p.theme.volume=p.volume*PAUSE_BGM_FACTOR*(1-alpha);black(scene,alpha);if(p.exit.elapsed>=FADE_OUT&&p.exit.blackFrame){
            const r=scene._bmRun;menu={pauseOrigin:p,stats:{option:r?.option,seed:r?.seed},health:scene.pc?.vidas??1,theme:p.theme,volume:p.theme?.volume??1};
            pausedMenu=null;neutralize();restart(scene,p.exit.retry);
            if(!loading&&menu?.pauseOrigin){pausedMenu=p;p.failed=true;p.exit=null;p.armed=false;menu=null;scene.paused=true;if(p.theme){p.theme.volume=p.volume*PAUSE_BGM_FACTOR;if(p.wasPlaying&&p.theme.paused)playAudio(p.theme,'tema da pausa');}}
        }else if(p.exit.elapsed>=FADE_OUT)p.exit.blackFrame=true;}return true;
    }
    function pauseKey(e){if(!keyboard.has(e.code))return false;
        if(pausedMenu||pauseRelease){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat&&!pauseRelease)pauseAction(BMControls.menuKey(e.code));return true;}
        if(BMControls.keyAction(e.code)==='pause'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!(lastScene&&DungeonMapSystem.state(lastScene)?.open)&&openPause(lastScene)){e.preventDefault();e.stopImmediatePropagation();return true;}return false;
    }
    function pauseBlur(){focusLost=true;keys.clear();neutralize();if(title)title.armed=false;if(pausedMenu)pausedMenu.armed=false;else if(!pauseRelease)openPause(lastScene,'blur');}
    addEventListener('focus',()=>{focusLost=false;});
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseBlur();else if(document.hasFocus?.())focusLost=false;});
    function drawVictory(scene){
        const c=scene.ctx,w=scene.w,h=scene.h,m=menu,r=m.stats;
        c.save();try{
            c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#080b13';c.fillRect(0,0,w,h);
            c.globalAlpha=Math.min(1,m.elapsed/.9);
            if(victoryArt.complete&&victoryArt.naturalWidth){
                const ih=w*victoryArt.naturalHeight/victoryArt.naturalWidth;
                c.drawImage(victoryArt,0,0,w,ih);
                const grad=c.createLinearGradient(0,ih*.67,0,ih);
                grad.addColorStop(0,'rgba(8,11,19,0)');grad.addColorStop(1,'#080b13');
                c.fillStyle=grad;c.fillRect(0,ih*.67,w,Math.max(0,h-ih*.67));
            }
            const scale=Math.min(w/860,h/640),cx=w/2;
            function text(t,y,size,color='#e8e9ee',font='Georgia'){
                c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font=`${size*scale}px ${font}`;c.fillText(t,cx,y*h/640,w*.95);
            }
            text('V I T Ó R I A',398,40,'#f5dfaa');
            text('Lyra finalmente reencontrou seu pai.',437,20,'#e5d9c6');
            c.strokeStyle='#857759';c.beginPath();c.moveTo(w*.23,h*457/640);c.lineTo(w*.77,h*457/640);c.stroke();
            text(menu.seedMessage||`Seed: ${r.seed??'—'}    •    Fase: ${r.total||'—'} salas    •    →: copiar`,477,17);
            text(`Tempo: ${time(r.seconds)}    •    Inimigos derrotados: ${r.kills}    •    Salas: ${r.visited}/${r.total}`,503,15,'#c2c8d5','Arial');
            if(m.elapsed>=1.1){
                for(let i=0;i<2;i++){
                    const y=h*(520+i*40)/640,hh=34*h/640,bw=w*.59;
                    c.fillStyle=m.choice===i?'#413725':'#151d2b';c.fillRect(cx-bw/2,y,bw,hh);
                    c.strokeStyle=m.choice===i?'#e4c88c':'#4a5365';c.strokeRect(cx-bw/2,y,bw,hh);
                    text((m.choice===i?'›  ':'')+labels[i],537+i*40,18,m.choice===i?'#fff0cf':'#e0e4ec');
                }
                text(m.error||menuHint(),616,14,'#a9b4c9','Arial');
            }
        }finally{c.restore();}
    }
    function draw(scene){if(menu.victory){drawVictory(scene);return;}const c=scene.ctx,w=scene.w,h=scene.h,m=menu,r=m.stats;c.save();try{c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.fillStyle='#080b13';c.fillRect(0,0,w,h);
        const a=Math.min(1,m.elapsed/0.9);c.globalAlpha=a;
        if(art.complete&&art.naturalWidth){const scale=w/art.naturalWidth;const ih=art.naturalHeight*scale;c.drawImage(art,0,0,w,ih);const grad=c.createLinearGradient(0,ih*.68,0,Math.max(ih, h*.69));grad.addColorStop(0,'rgba(8,11,19,0)');grad.addColorStop(1,'#080b13');c.fillStyle=grad;c.fillRect(0,ih*.68,w,h-ih*.68);}
        const scale=Math.min(w/860,h/640),cx=w/2;function text(t,y,size,color='#e1e5f0',font='Georgia'){c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font=`${size*scale}px ${font}`;c.fillText(t,cx,y*h/640);}
        text('G A M E  O V E R',340,38);text('A pequena Lyra caiu antes de salvar seu pai...',380,19,'#b6bfd5');
        c.strokeStyle='#52617d';c.beginPath();c.moveTo(w*.23,h*402/640);c.lineTo(w*.77,h*402/640);c.stroke();
        text(menu.seedMessage||`Seed: ${r.seed??'—'}    •    Fase: ${r.total||'—'} salas    •    →: copiar`,423,17);text(`Tempo: ${time(r.seconds)}    •    Inimigos derrotados: ${r.kills}    •    Salas: ${r.visited}/${r.total}`,450,15,'#b6bfd5','Arial');text(`Causa da morte: ${r.cause}`,474,15,'#b6bfd5','Arial');
        if(m.elapsed>=1.1){for(let i=0;i<2;i++){const y=h*(493+i*44)/640,hh=37*h/640,bw=w*.53;c.fillStyle=m.choice===i?'#25344f':'#111a29';c.fillRect(cx-bw/2,y,bw,hh);c.strokeStyle=m.choice===i?'#b9cbe9':'#3a465f';c.strokeRect(cx-bw/2,y,bw,hh);text((m.choice===i?'›  ':'')+labels[i],512+i*44,18);}
        text(m.error||menuHint(),603,14,'#a2aec6','Arial');}
    }finally{c.restore();}}
    // BM_TITLE_V1: menu modal anterior ao lobby, sem simular a cena.
    let titleEnabled=false,title=null,titleLast=new Set(),titleScene=null;
    // BM_TITLE_IMAGE_V2
    // Imagem externa; false desativa os textos do logotipo caso ja estejam na arte.
    const TITLE_IMAGE='assets/title.png', TITLE_LOGO=true;
    const titleArt=new Image(); titleArt.src=TITLE_IMAGE;
    function drawTitleImage(c){
        if(!titleArt.complete||!(titleArt.naturalWidth>0)||!(titleArt.naturalHeight>0))return false;
        // Cover: preenche 860 x 640 preservando a proporcao; recorte central.
        const scale=Math.max(860/titleArt.naturalWidth,640/titleArt.naturalHeight);
        const iw=titleArt.naturalWidth*scale,ih=titleArt.naturalHeight*scale;
        c.save();try{
            c.beginPath();c.rect(0,0,860,640);c.clip();
            c.imageSmoothingEnabled=true;
            c.drawImage(titleArt,(860-iw)/2,(640-ih)/2,iw,ih);
            c.fillStyle='rgba(5,10,20,.13)';c.fillRect(0,0,860,640);
            const shade=c.createLinearGradient(0,230,0,640);
            shade.addColorStop(0,'rgba(5,10,20,0)');
            shade.addColorStop(.55,'rgba(5,10,20,.28)');
            shade.addColorStop(1,'rgba(5,10,20,.78)');
            c.fillStyle=shade;c.fillRect(0,230,860,410);
        }finally{c.restore();}
        return true;
    }
    const titleLabels=['Jogar','Como jogar','Créditos','Jogar com seed','Configurações'];
    // BM_SEED_V1: seed numerica e tamanho da dungeon, sem mouse.
    const seedSizes=[6,12,16,20,30,40];
    const seedRows=['Editar seed','Salas','Sortear seed','Copiar seed','Iniciar run','Voltar'];
    function openSeed(t){
        const s=Number.isSafeInteger(seedValueURL)&&seedValueURL>=0?seedValueURL:Math.floor(Math.random()*4500000)+500000;
        t.screen='seed';t.seedForm={digits:String(s).padStart(16,'0'),option:0,row:0,edit:false,pos:0,message:''};
    }
    function seedNumber(f){return Number(f.digits);}
    function validSeed(f){return Number.isSafeInteger(seedNumber(f))&&seedNumber(f)>=0;}
    function copySeed(owner,seed){
        if(!Number.isSafeInteger(seed)){owner.seedMessage='Seed indisponível.';return;}
        const value=String(seed);owner.seedMessage='Seed: '+value;
        // Clipboard pode ser bloqueado pelo navegador, sobretudo por joystick/file://.
        try{
            if(typeof navigator.clipboard?.writeText==='function'){
                Promise.resolve(navigator.clipboard.writeText(value)).then(()=>{owner.seedMessage='Seed copiada: '+value;},()=>{owner.seedMessage='Cópia bloqueada. Seed: '+value;});return;
            }
        }catch(_){}
        owner.seedMessage='Cópia indisponível. Seed: '+value;
    }
    function seedAction(scene,t,name){const f=t.seedForm;if(!name||!f)return;
        if(f.edit){
            if(name==='back'){f.digits=f.before;f.edit=false;return;}
            if(name==='confirm'){if(!validSeed(f)){f.message='Seed fora do intervalo permitido.';return;}f.edit=false;f.message='';playDecision(scene);return;}
            if(name==='left'||name==='right'){f.pos=(f.pos+(name==='left'?15:1))%16;playCursor(scene);return;}
            if(name==='up'||name==='down'){const n=(Number(f.digits[f.pos])+(name==='up'?1:9))%10;f.digits=f.digits.slice(0,f.pos)+n+f.digits.slice(f.pos+1);f.message='';playCursor(scene);}return;
        }
        if(name==='back'){t.screen='main';return;}
        if(name==='up'||name==='down'){f.row=(f.row+(name==='up'?5:1))%6;playCursor(scene);return;}
        if((name==='left'||name==='right')&&f.row===1){f.option=(f.option+(name==='left'?5:1))%6;playCursor(scene);return;}
        if(name!=='confirm')return;
        if(f.row===4&&!validSeed(f)){f.message='Seed fora do intervalo permitido.';return;}
        playDecision(scene);
        if(f.row===0){f.edit=true;f.before=f.digits;f.pos=15;f.typed=false;f.typedCount=0;f.message='';f.seedMessage='';}
        else if(f.row===1){f.option=(f.option+1)%6;}
        else if(f.row===2){f.digits=String(Math.floor(Math.random()*4500000)+500000).padStart(16,'0');f.message='';f.seedMessage='';}
        else if(f.row===3){copySeed(f,seedNumber(f));}
        else if(f.row===4){t.seedStart={option:f.option,seed:seedNumber(f)};t.exit=0;t.armed=false;}
        else t.screen='main';
    }
    function seedKey(e){
        if(title?.screen!=='seed'||!title.seedForm?.edit||!BMControls.validEvent(e))return false;
        const f=title.seedForm;const match=/^(?:Digit|Numpad)([0-9])$/.exec(e.code);
        if(!match&&e.code!=='Backspace')return false;
        e.preventDefault();e.stopImmediatePropagation();if(e.repeat||!title.armed||focusLost)return true;
        if(!f.typed){f.digits='0000000000000000';f.typed=true;f.typedCount=0;}
        if(match&&f.typedCount>=16){f.message='Máximo de 16 dígitos.';return true;}
        f.typedCount=Math.max(0,f.typedCount+(match?1:-1));f.digits=match?f.digits.slice(1)+match[1]:'0'+f.digits.slice(0,-1);f.pos=15;f.message='';playCursor(titleScene);return true;
    }
    function drawSeed(c,t){const f=t.seedForm;
        c.fillStyle='rgba(6,12,23,.96)';c.fillRect(82,42,696,556);c.strokeStyle='#7086aa';c.strokeRect(82.5,42.5,695,555);
        const text=(s,x,y,n=18,color='#e2edff')=>{c.font=n+'px Arial';c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.fillText(s,x,y,650);};
        text('JOGAR COM SEED',430,83,30,'#d3e4ff');text('Geração v9 • mesma seed e quantidade de salas',430,120,15,'#a9bcd4');
        for(let i=0;i<6;i++){
            const y=145+i*55,selected=f.row===i;c.fillStyle=selected?'#293d58':'#152236';c.fillRect(120,y,620,48);c.strokeStyle=selected?'#aac3ea':'#354760';c.strokeRect(120.5,y+.5,619,47);
            if(i===0){text(f.edit?'Editando seed':'Editar seed',205,y+24,16);for(let j=0;j<16;j++){const x=304+j*25;if(f.edit&&j===f.pos){c.fillStyle='#7393bd';c.fillRect(x-11,y+7,22,34);}text(f.digits[j],x,y+24,20,validSeed(f)?'#f0f6ff':'#f2a9a0');}}
            else text(i===1?'Salas:  ‹  '+seedSizes[f.option]+'  ›':seedRows[i],430,y+24,19);
        }
        text(f.message||f.seedMessage|| (f.edit?'↑ ↓: alterar dígito • ← →: posição • números: digitar':'↑ ↓: navegar • ← →: tamanho • '+BMControls.combo('confirm')+': confirmar'),430,505,15,'#a9c7ec');
        text(f.edit?'Confirmar: aceitar • Voltar: cancelar edição':'Voltar: retorna ao título',430,538,15,'#a9bcd4');
        text('Seed: 0 a 9007199254740991',430,565,13,'#8fa2bf');
    }

    function openTitle(scene){
        if(loading||!scene||scene.stageIndex!==1||scene._bmRun||menu||dying||pausedMenu||pauseRelease||entryFade||resumeBlocked)return false;
        titleScene=scene;title={choice:0,screen:'main',armed:false,elapsed:0,exit:null,previousPaused:scene.paused};
        scene.paused=true;scene.pc.vx=scene.pc.vy=0;neutralize();ensureCursor(scene);
        titleLast=pausePad(preferredPad());return true;
    }
    function bootTitle(scene){titleEnabled=true;return openTitle(scene);}
    function titleAction(name){
        if(!title?.armed||title.exit!==null||focusLost)return;
        if(title.screen==='seed'){seedAction(titleScene,title,name);return;}
        if(title.screen==='bindings'){bindingAction(titleScene,title,name);return;}
        if(title.screen==='settings'){settingsAction(titleScene,title,name,null);return;}
        if(title.screen!=='main'){
            if(name==='confirm'||name==='back'){if(name==='confirm')playDecision(titleScene);title.screen='main';}return;
        }
        if(name==='up'||name==='down'){title.choice=(title.choice+(name==='up'?-1:1)+titleLabels.length)%titleLabels.length;playCursor(titleScene);return;}
        if(name!=='confirm')return;
        playDecision(titleScene);
        if(title.choice===0){title.exit=0;title.armed=false;}
        else if(title.choice===3)openSeed(title);
        else if(title.choice===4)openSettings(title);
        else title.screen=title.choice===1?'help':'credits';
    }
    function titleKey(e){
        if(!title){if(titleEnabled&&BMControls.keyAction(e.code)==='pause'&&!e.repeat&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&openTitle(lastScene)){e.preventDefault();e.stopImmediatePropagation();return true;}return false;}
        e.preventDefault();e.stopImmediatePropagation();
        if(!e.repeat)titleAction(BMControls.menuKey(e.code));return true;
    }
    function drawTitle(scene,t){
        const c=scene.ctx,w=scene.w,h=scene.h;
        c.save();try{
            c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.globalAlpha=1;
            c.fillStyle='#070c17';c.fillRect(0,0,w,h);
            const scale=Math.min(w/860,h/640);c.translate((w-860*scale)/2,(h-640*scale)/2);c.scale(scale,scale);
            const hasTitleImage=drawTitleImage(c);
            if(!hasTitleImage){
            const sky=c.createLinearGradient(0,0,0,640);sky.addColorStop(0,'#080f24');sky.addColorStop(.55,'#1b3553');sky.addColorStop(1,'#080d17');c.fillStyle=sky;c.fillRect(0,0,860,640);
            const moonX=430,moonY=125;
            const glow=c.createRadialGradient(moonX,moonY,8,moonX,moonY,182);glow.addColorStop(0,'rgba(125,181,245,.32)');glow.addColorStop(1,'rgba(90,150,230,0)');c.fillStyle=glow;c.fillRect(220,0,420,330);
            for(let i=0;i<76;i++){const x=(i*137.51+29)%860,y=(i*73.37+17)%320;if(Math.hypot(x-moonX,y-moonY)<80)continue;c.globalAlpha=.22+.5*((i*17)%19)/19;c.fillStyle='#c3d8ff';c.fillRect(x,y,i%9===0?2:1,i%9===0?2:1);}c.globalAlpha=1;
            c.beginPath();c.arc(moonX,moonY,73,0,Math.PI*2);c.fillStyle='#b7d6f8';c.fill();
            c.save();c.clip();for(const [x,y,r,a] of [[408,106,23,.15],[454,94,18,.16],[454,145,27,.12],[393,150,16,.12],[433,175,20,.09]]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=`rgba(66,112,169,${a})`;c.fill();}c.restore();
            const silhouette=(pts,color)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
            silhouette([[0,385],[112,290],[190,365],[270,301],[370,410],[486,315],[572,365],[700,270],[860,370],[860,640],[0,640]],'#11223a');
            silhouette([[0,640],[0,350],[44,350],[44,298],[74,298],[74,350],[120,350],[120,400],[155,400],[155,470],[225,490],[290,540],[430,520],[570,540],[635,490],[705,470],[705,400],[740,400],[740,350],[786,350],[786,298],[816,298],[816,350],[860,350],[860,640]],'#090f1b');
            const fade=c.createLinearGradient(0,285,0,640);fade.addColorStop(0,'rgba(5,10,20,0)');fade.addColorStop(1,'rgba(5,10,20,.96)');c.fillStyle=fade;c.fillRect(0,285,860,355);
            }
            const text=(str,x,y,size,color='#e2edff',font='Arial')=>{c.textAlign='center';c.textBaseline='middle';c.fillStyle=color;c.font=`${size}px ${font}`;c.fillText(str,x,y,760);};
            const rule=y=>{c.strokeStyle='#7392b5';c.lineWidth=1;c.beginPath();c.moveTo(240,y);c.lineTo(620,y);c.stroke();};
            const item=(label,y,selected)=>{c.fillStyle=selected?'#223750':'rgba(12,23,39,.94)';c.fillRect(239,y,382,39);c.strokeStyle=selected?'#b5d4fa':'#39516b';c.strokeRect(239.5,y+.5,381,38);text((selected?'›  ':'')+label,430,y+19.5,20,selected?'#f0f6ff':'#bacbe0');};
            if(t.screen==='seed'){drawSeed(c,t);return;}
            if(t.screen==='bindings'){drawBindings(c,t);return;}
            if(t.screen==='settings'){drawSettings(c,t);return;}
            if(t.screen==='main'){
                if(TITLE_LOGO||!hasTitleImage){c.shadowColor='#76b3ff';c.shadowBlur=16;text('Blue Moon',430,235,80,'#dfedff','Medieval2, Georgia');c.shadowBlur=0;
                text('R O G U E L I K E',430,290,19,'#a8c4e7','Georgia');rule(314);}
                titleLabels.forEach((s,i)=>item(s,319+i*43,t.choice===i));
                text('Explore a masmorra. Enfrente a Bruxa. Salve seu pai.',430,550,16,'#a9bcd4');
                text(menuHint(),430,583,14,'#a3b6d0');
                text('Em desenvolvimento • Roadmap 1.0',430,616,12,'#7188a7');
            }else{
                c.fillStyle='rgba(6,12,23,.94)';c.fillRect(90,58,680,524);c.strokeStyle='#7086aa';c.strokeRect(90.5,58.5,679,523);
                text(t.screen==='help'?'COMO JOGAR':'CRÉDITOS',430,108,32,'#d3e4ff','Georgia');rule(137);
                if(t.screen==='help'){
                    text('Escolha um cristal para definir o tamanho da masmorra.',430,162,16);
                    controlRows().forEach(([a,b],i)=>{c.font='16px Arial';c.textBaseline='middle';c.textAlign='left';c.fillStyle='#a9c7ec';c.fillText(a,136,198+i*32,275);c.textAlign='right';c.fillStyle='#e2edff';c.fillText(b,724,198+i*32,280);});
                    text('Derrote os inimigos, resolva os puzzles e encontre a Bruxa.',430,474,16);
                    text('Uma run termina na vitória ou na derrota. Não há checkpoints.',430,503,15,'#a9bcd4');
                }else{
                    text('Blue Moon Roguelike',430,205,34,'#d3e4ff','Georgia');
                    text('Desenvolvimento: Marcus Vinicius V. A. Cunha',430,250,19);
                    text('Inspirado no álbum Story of Lyra, de Cashew.',430,292,17,'#a9bcd4');
                    text('Projeto acadêmico com ênfase em puzzles.',430,332,16);
                    text('Repositório: MarcusVsc1 / BlueMoonPCGLabTests',430,365,16);
                    text('Créditos completos de personagem, arte e áudio',430,416,16,'#a9bcd4');
                    text('serão revisados antes da distribuição pública.',430,445,16,'#a9bcd4');
                }
                item('Voltar',520,true);
            }
        }finally{c.restore();}
    }
    function titleTick(scene,dt){
        if(!titleEnabled)return false;
        const g=preferredPad(),now=pausePad(g),start=now.has('start')&&!titleLast.has('start');
        if(!title&&start)openTitle(scene);
        if(!title){titleLast=now;return false;}
        const t=title;
        if(!focusLost&&!keys.size&&!pauseHeld(g)&&!anyPadHeld())t.armed=true;
        if(!bindingPoll(scene,t,g,dt)&&t.armed&&!focusLost)for(const k of ['back','up','down','left','right','confirm'])if(now.has(k)&&!titleLast.has(k)){titleAction(k);break;}
        titleLast=now;drawTitle(scene,t);t.elapsed+=dt;
        if(t.exit!==null){t.exit=Math.min(FADE_OUT,t.exit+dt);black(scene,ease(t.exit/FADE_OUT));
            if(t.exit>=FADE_OUT&&!keys.size&&!anyPadHeld()&&!pauseHeld(g)&&!focusLost){scene.paused=t.previousPaused;title=null;neutralize();pauseLast=now;entryFade={elapsed:0};if(t.seedStart)BMRun.request(scene,t.seedStart.option,t.seedStart.seed);}
        }else if(t.elapsed<FADE_IN)black(scene,1-ease(t.elapsed/FADE_IN));
        return true;
    }

    // Cada next() executa uma unidade real de trabalho; o RAF seguinte pinta o
    // estado antes da proxima unidade. Sem timers ou RNG extras na geracao.
    function beginLoading(scene,request,origin=null){
        neutralize();entryFade=null;scene.paused=true;
        loading={request,origin,iterator:BMRun.rebuildSteps(scene,request,stopAudio),progress:{phase:0,label:'Preparando nova partida'},elapsed:0};
        drawLoading(scene,loading);
    }
    function drawLoading(scene,l){const c=scene.ctx,w=scene.w,h=scene.h,p=l.progress;
        c.save();try{c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.globalCompositeOperation='source-over';c.fillStyle='#080e1a';c.fillRect(0,0,w,h);
            const scale=Math.min(w/860,h/640);c.translate((w-860*scale)/2,(h-640*scale)/2);c.scale(scale,scale);
            const glow=c.createRadialGradient(430,154,4,430,154,140);glow.addColorStop(0,'rgba(116,174,248,.32)');glow.addColorStop(1,'rgba(116,174,248,0)');c.fillStyle=glow;c.fillRect(290,14,280,280);
            c.beginPath();c.arc(430,154,49,0,Math.PI*2);c.fillStyle='#b9d8ff';c.fill();
            const text=(s,y,size,color='#dbe8fa',font='Arial')=>{c.fillStyle=color;c.font=`${size}px ${font}`;c.textAlign='center';c.textBaseline='middle';c.fillText(s,430,y,760);};
            text('Gerando masmorra...',252,40,'#dbe8fa','Medieval2, Georgia');
            text(p.label,315,20,'#c4d6ef');
            text(`Seed: ${l.request.seed}  •  ${[6,12,16,20,30,40][l.request.option]} salas`,354,16,'#a1b5d0');
            // Segmentos são etapas concluídas, não estimativa de duração.
            for(let i=0;i<6;i++){c.fillStyle=i<p.phase?'#94b8ed':i===p.phase?'#47688e':'#233248';c.fillRect(154+i*93,402,87,9);}
            text(p.phase===6?'6 de 6 etapas concluídas':`${p.phase} de 6 etapas concluídas`,440,16,'#a1b5d0');
            if(Number.isInteger(p.done)&&p.total>0){c.fillStyle='#233248';c.fillRect(154,475,552,5);c.fillStyle='#94b8ed';c.fillRect(154,475,552*p.done/p.total,5);text(`${p.done} / ${p.total} salas processadas`,502,15,'#a1b5d0');}
            text('A mesma seed utiliza a mesma ordem de geração.',584,14,'#8199b8');
        }finally{c.restore();}}
    function loadingTick(scene,dt){const l=loading;
        try{
            const next=l.iterator.next();
            if(!next.done){scene.paused=true;l.progress=next.value;drawLoading(scene,l);return;}
            loading=null;menu=null;pausedMenu=null;scene.paused=false;neutralize();resumeBlocked=true;entryFade={elapsed:0};black(scene,1);
        }catch(e){
            loading=null;entryFade=null;console.error('[Blue Moon Run] Falha ao gerar',e);scene.stageIndex=2;scene.paused=true;
            if(l.origin&&!l.origin.pauseOrigin){menu=l.origin;menu.error='Falha ao reiniciar. Confira o console (F12).';menu.exit=null;menu.armed=false;if(scene.pc)scene.pc.vidas=menu.victory?menu.health:0;const a=menu.theme;if(a){a.volume=menu.volume;playAudio(a); }draw(scene);}
            else{menu=null;pausedMenu={scene,screen:'main',choice:0,armed:false,failed:true,initialFailure:!l.origin,previousPaused:false,frame:null,theme:scene.gamer?.tema,volume:scene.gamer?.tema?.volume??1,wasPlaying:false,exit:null};drawPause(scene,pausedMenu);}
        }
    }

    function tick(scene,dt){
        BMSettings.attach(scene.gamer?.tema);
        // Precarrega o efeito no gerenciador antes da primeira navegacao.
        ensureCursor(scene);
        if(loading){loadingTick(scene,dt);return;}
        const requested=BMRun.take(scene);
        if(requested){beginLoading(scene,{mode:'new',option:requested.option,seed:requested.seed});return;}
        if(titleTick(scene,Math.max(0,Math.min(.1,Number(dt)||0))))return;
        if(!menu&&!dying&&!pausedMenu&&scene.pc?.vidas<=0){entryFade=null;beginDeath(scene);}
        // Limita o avanço dos fades caso a geração ou uma aba inativa cause um dt grande.
        const delta=Math.max(0,Math.min(.1,Number(dt)||0));
        if(dying){deathTick(scene,delta);return;}
        if(menu){
            if(menu.exit){
                const e=menu.exit;
                if(e.blackFrame){restart(scene,e.retry);if(!loading){if(menu)draw(scene);else black(scene,1);}return;}
                e.elapsed=Math.min(FADE_OUT,e.elapsed+delta);
                const alpha=ease(e.elapsed/FADE_OUT);
                if(menu.theme)menu.theme.volume=e.volume*(1-alpha);
                draw(scene);black(scene,alpha);
                if(e.elapsed>=FADE_OUT)e.blackFrame=true;
                return;
            }
            menu.elapsed+=delta;updateDefeatMusic(menu);
            const now=pad();if(menu.elapsed>=1.5&&!keys.size&&!anyPadHeld())menu.armed=true;
            if(menu.armed){for(const k of ['up','down','right','back','confirm'])if(now.has(k)&&!lastPad.has(k)){action(scene,k);break;}}lastPad=now;
            if(menu)draw(scene);return;
        }
        if(pauseTick(scene,delta))return;
        if(resumeBlocked){if(keys.size||anyPadHeld()){black(scene,1);return;}resumeBlocked=false;}
        const tutorialStage=scene.stageIndex;
        observe(scene,entryFade?delta:dt);scene.passo(entryFade?delta:dt);
        if(scene.pc?.vidas<=0&&!dying){entryFade=null;beginDeath(scene);deathTick(scene,0);return;}
        if(dying){deathTick(scene,0);return;}
        if(!entryFade&&scene.stageIndex===tutorialStage)BMTutorial.draw(scene,delta);
        if(entryFade){black(scene,1-ease(entryFade.elapsed/FADE_IN));entryFade.elapsed+=delta;if(entryFade.elapsed>FADE_IN)entryFade=null;}
    }
    return {bootTitle,titleActive:()=>!!title,start,prepare,sokoban,kill,fatal,enemyName,projectileName,win,victoryPending:()=>!!dying?.victory||!!menu?.victory,tick,playAudio,setConfirmButton,pauseActive:()=>!!pausedMenu||!!pauseRelease,active:()=>!!loading||!!title||!!dying||!!menu||!!entryFade||!!pausedMenu||!!pauseRelease};
})();
