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
    { comando: "espada", tecla: "espada", joystick: 0, botao: 2 },
    { comando: "fireball", tecla: "fireball", joystick: 0, botao: 3 },
    { comando: "resetSokoban", tecla: "resetSokoban", joystick: 0, botao: 8 },

    { comando: "cima", tecla: "w", joystick: 0, botao: 15 },
    { comando: "baixo", tecla: "s", joystick: 0, botao: 15 },
    { comando: "esquerda", tecla: "a", joystick: 0, botao: 15 },
    { comando: "direita", tecla: "d", joystick: 0, botao: 15 },

]);

input.setupMovimentos([
    { movimento: "horizontal", negativo: "a", positivo: "d", joystick: 0, eixo: 0 },
    { movimento: "vertical", negativo: "s", positivo: "w", joystick: 0, eixo: 1 },
]);