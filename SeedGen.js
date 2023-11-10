// SeedGenerator ===> Utilizado para retornar ao mesmo mapa com apenas o código da seed
let seedValueURL = location.search;

if (seedValueURL.length != 0) {                   //SEED PASSADA NA URL
    let aux = "?seed=";
    seedValueURL = seedValueURL.substring(aux.length, seedValueURL.length);
    seedValueURL = parseInt(seedValueURL.toString(), 10);
}
else {                                           //SEED ALEATÓRIA
    let maxValue = 5000000;
    let minValue = 500000;
    seedValueURL = (Math.floor(Math.random() * (maxValue - minValue)) + minValue);
}
const random = new SeedGenerator(seedValueURL.toString(), "sfc32");