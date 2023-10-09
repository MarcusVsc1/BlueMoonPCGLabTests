class UtilityMethods {

    static fisherYales(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    static lottery(map) {
        // Calcula a soma total das chances
        let totalWeight = 0;
        for (const [, { chance }] of map) {
            totalWeight += chance;
        }

        // Gera um número aleatório entre 0 e a soma total das chances
        const randomValue = Math.random() * totalWeight;

        // Percorre o mapa para encontrar o elemento sorteado
        let accumulatedWeight = 0;
        for (const [key, { chance }] of map) {
            accumulatedWeight += chance;
            if (randomValue < accumulatedWeight) {
                return key;
            }
        }
    }

    static calcularAngulo(x1, y1, x2, y2) {
        const angleRadians = Math.atan2(y2 - y1, x2 - x1);
        let angleDegrees = angleRadians * 180 / Math.PI;
        angleDegrees = (angleDegrees < 0) ? angleDegrees + 360 : angleDegrees;
        return angleDegrees;
    }


}