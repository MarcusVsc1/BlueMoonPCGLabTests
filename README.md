# BlueMoon - dissipacao V2

Extraia a pasta inteira. No PowerShell, dentro dela:

```powershell
node .\aplicar-projeteis-v2.js "C:\Users\Marcus\Documents\BlueMoonPCGLabTests"
```

Aceita a revisao de colisoes anterior a dissipacao ou a primeira revisao dos projeteis. Verifica a integracao em Scene.js e faz backup. Opcional: acrescente --dry-run para verificar sem gravar. Recarregue o navegador com Ctrl+F5. Nao copie patch-base.js ou tests para o jogo.

Parede/vazio: 220 ms de tempo-base, mais uma pequena entrada visual (ate 6 px, no maximo 60 ms de tempo adicional); 32 px de deslocamento total no maximo. A opacidade cai suavemente apos a entrada visual. O tiro fisico continua parando no primeiro impacto e nao causa dano apos sua remocao. Bloqueios de tipo 7/10 mantem 60 ms e 2 px; limites de mapa continuam com remocao direta. Espada, espinhos, colisoes de movimento, Kruskal, Prim, Sokoban e renderizacao global nao sao modificados.

Para conferir se a revisao esta carregada, abra o Console do navegador (F12) e digite:

```js
[CollisionSystem.projectileFadeSeconds, CollisionSystem.projectileFadePixels,
 typeof cena1.desenhar === 'function' && cena1.desenhar.toString().includes('drawProjectileFades')]
```

Esperado: [0.22, 32, true]. Se continuar abrupto apesar disso, envie Scene.js e utils/CollisionSystem.js da copia local, e informe se o efeito ocorre no tiro da personagem ou inimigo.

Testes: 68 de regressao e 16 especificos, incluindo desenho com as coordenadas/recorte/alpha do desenho real em um Canvas simulado, 60 FPS, remocao fisica, limites e integracao das chamadas. Tambem verificada a equivalencia de atualizar a V1 ou a revisao anterior. Nao executado o jogo completo em navegador. A origem exata do sintoma na maquina local ainda nao esta confirmada.
