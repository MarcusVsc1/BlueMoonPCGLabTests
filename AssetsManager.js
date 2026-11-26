function AssetsManager() {
    this.aCarregar = 0;
    this.carregadas = 0;
    this.images = {};
    this.audios = {};
    this.channels = [];
    this.MAX_CHANNELS = 20;
    for(var i = 0; i< this.MAX_CHANNELS; i++){
        this.channels[i] = {
            audio: new Audio(),
            fim: -1
        };
    }
}

AssetsManager.prototype.loadImage = function (key, url) {
    //console.log(`Carregando imagem ${url}...`);

    this.aCarregar++;
    var imagem = new Image();
    imagem.src = url;
    this.images[key] = imagem;
    var that = this;
    imagem.addEventListener("load", function () {
        that.carregadas++;
        //console.log(`Imagem ${that.carregadas}/${that.aCarregar} ${key}: ${url} carregada.`);
    });
}

AssetsManager.prototype.img = function (key) {
    return this.images[key];
}

AssetsManager.prototype.progresso = function () {
    if (this.aCarregar != 0) {
        return this.carregadas / this.aCarregar * 100.0;
    } else return 0.0;

}


AssetsManager.prototype.loadAudio = function (key, url) {
    //console.log(`Carregando audio ${key}: ${url}...`);
    //this.aCarregar++;
    var audio = new Audio();
    audio.src = url;
    audio.load();
    this.audios[key] = audio;
    var that = this;
    /*audio.addEventListener("canplay", function () {
        //that.carregadas++;
        console.log(`Audio ${that.carregadas}/${that.aCarregar} ${key}: ${url} carregado.`);
    });
    */
}

AssetsManager.prototype.play = function (key, volume = 1) { /* BM_PAUSE_AUDIO_V2 */
    const source = this.audios[key];
    if (!source) throw new Error('Chave de audio inválida: '+key+'!');
    const now = Date.now();
    const duration = Number.isFinite(source.duration) && source.duration > 0 ? source.duration * 1000 : 1000;
    for (const channel of this.channels) {
        // Nunca reutiliza um canal que ainda esta tocando. A reserva protege play pendente.
        if (channel.fim < 0 || channel.audio.ended || (channel.audio.paused && channel.fim < now)) {
            channel.audio.src = source.src;
            BMSettings.effect(channel.audio,volume);
            channel.fim = now + duration;
            BMGameOver.playAudio(channel.audio, key);
            break;
        }
    }
}