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
        for (const [, { chance }] of map.entries()) {
            totalWeight += chance;
        }

        // Gera um número aleatório entre 0 e a soma total das chances
        const randomValue = Math.random() * totalWeight;

        // Percorre o mapa para encontrar o elemento sorteado
        let accumulatedWeight = 0;
        for (const [key, { chance }] of map.entries()) {
            accumulatedWeight += chance;
            if (randomValue < accumulatedWeight) {
                // Reduz a chance do elemento pela metade
                map.set(key, { agent: map.get(key).agent, chance: chance / 2 });
                return key;
            }
        }
    }


}