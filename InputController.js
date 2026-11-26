function InputController() {
	this.nomes = {};
	this.codigos = {};
	this.teclas = {};
	this.joysticks = {};
	this.comandos = {};
	this.movimentos = {};
}


// BM_CONTROLS_V1 — os nomes legados continuam sendo usados pela fisica.
InputController.prototype.setupKeyboard = function(novasTeclas){
    this._bmKeys=new Set();
    for(const t of novasTeclas){this.nomes[t.codigo]=t.nome;this.codigos[t.nome]=t.codigo;this.teclas[t.nome]=false;}
    const sync=()=>{for(const n of Object.values(BMControls.legacyKeys))this.teclas[n]=false;for(const k of this._bmKeys){const n=BMControls.legacyKeys[BMControls.keyAction(k)];if(n)this.teclas[n]=true;}};
    this._bmSyncKeys=sync;
    addEventListener('keydown',e=>{if(!BMControls.validEvent(e))return;const n=BMControls.legacyKeys[BMControls.keyAction(e.code)];if(n){this._bmKeys.add(e.code);sync();e.preventDefault();}});
    addEventListener('keyup',e=>{this._bmKeys.delete(e.code);sync();});
    addEventListener('blur',()=>{this._bmKeys.clear();sync();});
};
// BM_GAMEPAD_V1: teclado e controle usam o mesmo sinal; axes sao digitais para o jogo.
InputController.prototype.getJoystick = function(index){return BMControls.preferred(Object.values(this.joysticks),index);};
InputController.prototype.updateMovimentos = function(){for(const m of Object.values(this.movimentos)){const d=BMControls.direction(this.getJoystick(m.joystick));const jv=Math.sign(m.eixo===0?d.x:d.y);const tv=Number(!!this.teclas[m.positivo])-Number(!!this.teclas[m.negativo]);m.valor=jv||tv;}};
InputController.prototype.setupMovimentos = function (novosMovimentos) {
	for (var c = 0; c < novosMovimentos.length; c++) {
		var movimento = novosMovimentos[c];

		this.movimentos[movimento.movimento] = {
			"movimento": movimento.movimento,
			"eixo": movimento.eixo,
			"positivo": movimento.positivo,
			"joystick": movimento.joystick,
			"negativo": movimento.negativo
		};
	}
}

InputController.prototype.setupJoysticks = function () {
	var that = this;
	addEventListener("gamepadconnected", function (e) {
		var gamepad = e.gamepad;
		console.log(`${gamepad}.id is connected!`);
		that.joysticks[gamepad.index] = gamepad;
	});
	addEventListener("gamepaddisconnected", function (e) {
		var gamepad = e.gamepad;
		console.log(`${gamepad}.id is disconnected!`);
		delete that.joysticks[gamepad.index];
	});
}

InputController.prototype.updateJoysticks = function () {
    let pads = [];
    try { if (typeof navigator.getGamepads === 'function') pads = navigator.getGamepads(); }
    catch (_) { /* API indisponivel: teclado continua funcionando. */ }
    this.joysticks = {};
    for (const pad of pads || []) {
        if (pad && pad.connected !== false) this.joysticks[pad.index] = pad;
    }
}

InputController.prototype.setupComandos = function (novosComandos) {
	for (var c = 0; c < novosComandos.length; c++) {
		var comando = novosComandos[c];

		this.comandos[comando.comando] = {
			"comando": comando.comando,
			"tecla": comando.tecla,
			"tecla2": comando.tecla2,
			"joystick": comando.joystick,
			"botao": comando.botao,
			"valor": false
		};
	}
};

InputController.prototype.updateComandos = function(){for(const c of Object.values(this.comandos)){const g=this.getJoystick(c.joystick),a=BMControls.legacy[c.comando];const d=BMControls.direction(g);const directions={up:d.y<0,down:d.y>0,left:d.x<0,right:d.x>0};const jv=a in directions?directions[a]:a?BMControls.pressed(g,a):BMControls.button(g,c.botao);c.valor=!!(this.teclas[c.tecla]||this.teclas[c.tecla2]||jv);}};
InputController.prototype.bmGamepadStatus = function () {
    this.updateJoysticks();
    return Object.values(this.joysticks).map(p => ({
        id: p.id, index: p.index, mapping: p.mapping,
        axes: Array.from(p.axes || []),
        buttons: Array.from(p.buttons || [], (b, i) => ({index: i, pressed: b.pressed, value: b.value}))
    }));
};

InputController.prototype.update = function () {
	this.updateJoysticks();
	this.updateComandos();
	this.updateMovimentos();
 }