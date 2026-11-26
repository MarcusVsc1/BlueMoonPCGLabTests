var input = new InputController();
input.setupKeyboard([
    { nome: "fireball", codigo: 74 },
    { nome: "espada", codigo: 75 },
    { nome: "a", codigo: 65 },
    { nome: "w", codigo: 87 },
    { nome: "d", codigo: 68 },
    { nome: "s", codigo: 83 },
    { nome: "resetSokoban", codigo: 80 },
]);
input.setupJoysticks();

input.setupComandos([
    // BM_GAMEPAD_ACTIONS_V2: atalhos exclusivos do gamepad; T/Y/M continuam nos listeners originais.
    { comando: "itemAnterior", joystick: 0, botao: 4 },
    { comando: "itemProximo", joystick: 0, botao: 5 },
    { comando: "mapa", joystick: 0, botao: 3 },
    { comando: "espada", tecla: "espada", joystick: 0, botao: 2 },
    { comando: "fireball", tecla: "fireball", joystick: 0, botao: 1 },
    { comando: "resetSokoban", tecla: "resetSokoban", joystick: 0, botao: 7 },

    { comando: "cima", tecla: "w", joystick: 0, botao: 12 },
    { comando: "baixo", tecla: "s", joystick: 0, botao: 13 },
    { comando: "esquerda", tecla: "a", joystick: 0, botao: 14 },
    { comando: "direita", tecla: "d", joystick: 0, botao: 15 },

]);

input.setupMovimentos([
    { movimento: "horizontal", negativo: "a", positivo: "d", joystick: 0, eixo: 0 },
    { movimento: "vertical", negativo: "w", positivo: "s", joystick: 0, eixo: 1 },
]);