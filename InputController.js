function InputController() {
	this.nomes = {};
	this.codigos = {};
	this.teclas = {};
	this.joysticks = {};
	this.comandos = {};
	this.movimentos = {};
}


InputController.prototype.setupKeyboard = function (novasTeclas) {
	for (var t = novasTeclas.length - 1; t >= 0; t--) {
		const tecla = novasTeclas[t];
		this.nomes[tecla.codigo] = tecla.nome;
		this.codigos[tecla.nome] = tecla.codigo;
		this.teclas[tecla.nome] = false;
	}
	var that = this;
	addEventListener("keydown", function (e) {
		var nome = that.nomes[e.keyCode];
		if (nome) {
			that.teclas[nome] = true;
			e.preventDefault();
		}
	});
	addEventListener("keyup", function (e) {
		var nome = that.nomes[e.keyCode];
		if (nome) {
			that.teclas[nome] = false;
			e.preventDefault();
		}
	});
}

// BM_GAMEPAD_V1: teclado e controle usam o mesmo sinal; axes sao digitais para o jogo.
InputController.prototype.getJoystick = function (index) {
    const preferred = this.joysticks[index];
    if (preferred && preferred.connected !== false) return preferred;
    return Object.values(this.joysticks).find(p => p && p.connected !== false);
};
InputController.prototype.updateMovimentos = function () {
    for (const movimento of Object.values(this.movimentos)) {
        const pad = this.getJoystick(movimento.joystick);
        const raw = Number(pad?.axes?.[movimento.eixo]);
        const jv = Number.isFinite(raw) && Math.abs(raw) >= 0.35 ? Math.sign(raw) : 0;
        const tv = Number(!!this.teclas[movimento.positivo]) - Number(!!this.teclas[movimento.negativo]);
        movimento.valor = jv || tv;
    }
};

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

InputController.prototype.updateComandos = function () {
    for (const comando of Object.values(this.comandos)) {
        const pad = this.getJoystick(comando.joystick);
        const b = pad?.buttons?.[comando.botao];
        const jv = !!b && (b.pressed || b.value >= 0.5);
        comando.valor = !!(this.teclas[comando.tecla] || this.teclas[comando.tecla2] || jv);
    }
};
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