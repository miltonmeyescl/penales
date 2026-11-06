# Audios reales para Penales Curicó Unido

El juego usa un sistema híbrido. Si encuentra el MP3 indicado en `audio_config.js`, reproduce ese archivo. Si el archivo no existe, tarda en cargar o el navegador lo rechaza, mantiene el sonido sintetizado original como respaldo.

## Formato recomendado

- Formato principal: **MP3**.
- Códec: MPEG-1 Audio Layer III.
- Frecuencia de muestreo: **44.1 kHz** o **48 kHz**. Recomendado: 44.1 kHz para efectos y 48 kHz si el material original ya viene de video/broadcast.
- Bitrate:
  - Efectos cortos: **160 kbps CBR**.
  - Público/cánticos/música: **192 kbps CBR**.
  - Si quieres máxima calidad sin aumentar demasiado el peso: 224 kbps para música, pero no es necesario para el juego.
- Canales:
  - Patada, palo, guantes y silbato: **mono** o estéreo muy estrecho. Mono reduce peso y localiza mejor el efecto.
  - Público, cánticos, celebraciones y música: **estéreo**.
- Pico máximo recomendado: **-1 dBFS**.
- Loudness orientativo:
  - efectos: entre **-16 y -12 LUFS short-term**;
  - público/cánticos: entre **-20 y -16 LUFS integrated**;
  - música: entre **-18 y -14 LUFS integrated**.
- Evitar clipping, normalización excesiva y compresión agresiva.
- No agregar largos silencios al comienzo de los efectos. Para patada/palo/guantes/silbato, el sonido debe comenzar idealmente dentro de los primeros **10–30 ms**.

## Archivos requeridos y duración recomendada

| Archivo | Uso | Duración ideal | Canales | Bitrate recomendado |
|---|---|---:|---|---:|
| `efectos/patada.mp3` | contacto pie-balón | 0.15–0.45 s | mono | 160 kbps |
| `efectos/red.mp3` | balón golpeando/moviendo la red | 0.30–0.90 s | mono/estéreo | 160 kbps |
| `efectos/palo.mp3` | poste o travesaño | 0.25–0.70 s | mono | 160 kbps |
| `efectos/guantes.mp3` | contacto fuerte del arquero con la pelota | 0.20–0.60 s | mono | 160 kbps |
| `efectos/silbato.mp3` | árbitro habilita el penal | 0.35–0.90 s | mono | 160 kbps |
| `ambiente/grito_gol.mp3` | explosión de público por gol de Curicó | 2.5–5.0 s | estéreo | 192 kbps |
| `ambiente/atajada.mp3` | reacción positiva por atajada de Curicó | 1.8–4.0 s | estéreo | 192 kbps |
| `ambiente/uhhh.mp3` | reacción de casi gol/fallo/palo | 1.2–3.0 s | estéreo | 192 kbps |
| `ambiente/silencio.mp3` | caída del ambiente/tensión | 1.0–2.5 s | estéreo | 160–192 kbps |
| `ambiente/pifias_rival.mp3` | pifias/silbidos cuando patea el rival | 2.0–5.0 s | estéreo | 192 kbps |
| `ambiente/cantico_01.mp3` | cántico breve de Curicó | 4–9 s | estéreo | 192 kbps |
| `ambiente/publico_loop.mp3` | murmullo permanente del estadio | 20–45 s | estéreo | 192 kbps |
| `musica/victoria.mp3` | cierre de victoria/campeonato | 6–15 s | estéreo | 192–224 kbps |
| `musica/derrota.mp3` | cierre de derrota | 5–12 s | estéreo | 192 kbps |

## Reglas importantes por archivo

### `publico_loop.mp3`
Debe poder repetirse sin un salto evidente. Lo ideal es crear un crossfade entre el final y el inicio. Evita aplausos o gritos muy reconocibles justo en el punto del loop, porque al repetirse se notarán artificiales.

### `grito_gol.mp3`
Debe comenzar rápido, sin 1–2 segundos de silencio. Conviene que tenga una subida fuerte en los primeros 200–500 ms y luego una cola natural. No incluyas narración con nombres específicos, porque el mismo archivo se reutiliza con distintos pateadores.

### `atajada.mp3`
Reacción positiva, pero ligeramente menor que el gol. Puede contener aplausos, gritos y celebración del público.

### `uhhh.mp3`
Un “uuuh” colectivo sirve para tiro fuera, palo o remate cercano. Evita que termine con una celebración, porque también se usa para fallos.

### `silencio.mp3`
No tiene que ser silencio absoluto. Funciona mejor como ambiente contenido: murmullo muy bajo, respiración del estadio o caída rápida del volumen.

### `cantico_01.mp3`
Usa una frase corta y cíclica. Debe funcionar aunque se reproduzca entre penales. No conviene una canción completa de varios minutos.

### Música de victoria/derrota
No debe incluir silencios largos al inicio. Para victoria, una fanfarria o fragmento instrumental de 8–12 segundos funciona muy bien. Para derrota, una pieza corta y sobria de 6–10 segundos.

## Tamaño aproximado

Con MP3 CBR:

- 160 kbps ≈ **20 KB por segundo**.
- 192 kbps ≈ **24 KB por segundo**.
- 224 kbps ≈ **28 KB por segundo**.

Ejemplos:

- patada de 0.3 s a 160 kbps: alrededor de 6–10 KB;
- grito de gol de 4 s a 192 kbps: alrededor de 95 KB;
- público loop de 30 s a 192 kbps: alrededor de 720 KB;
- música de victoria de 10 s a 192 kbps: alrededor de 240 KB.

Un paquete completo bien preparado normalmente puede quedar entre **1.5 y 4 MB**.

## Cómo instalar los audios

1. Exporta cada audio en MP3 con el nombre exacto indicado arriba.
2. Copia el archivo en la carpeta correspondiente.
3. No cambies mayúsculas/minúsculas ni nombres si no vas a modificar `audio_config.js`.
4. Sube toda la carpeta `audio/` al mismo directorio donde están `index.html` y `game.js`.
5. Abre/reinstala la PWA si tienes una versión instalada.
6. Prueba cada acción dentro de una tanda.

Ejemplo:

```text
penales/
├── audio_config.js
├── audio/
│   ├── efectos/
│   │   ├── patada.mp3
│   │   ├── red.mp3
│   │   ├── palo.mp3
│   │   ├── guantes.mp3
│   │   └── silbato.mp3
│   ├── ambiente/
│   │   ├── publico_loop.mp3
│   │   ├── cantico_01.mp3
│   │   ├── grito_gol.mp3
│   │   ├── atajada.mp3
│   │   ├── uhhh.mp3
│   │   ├── silencio.mp3
│   │   └── pifias_rival.mp3
│   └── musica/
│       ├── victoria.mp3
│       └── derrota.mp3
```

## Cómo ajustar el volumen sin editar el MP3

En `audio_config.js` está el bloque `volumes`. Los valores van de 0.0 a 1.0. Por ejemplo:

```js
volumes: {
  kick: 0.78,
  crowd_goal: 0.78,
  stadium_loop: 0.20
}
```

Si el público tapa demasiado la patada, baja `crowd_goal` o `stadium_loop`; no es necesario volver a exportar el MP3.

## Derechos de uso

Usa audios propios, licenciados o de bancos que permitan uso en este proyecto. Para cánticos reales grabados en un estadio, revisa también derechos de grabación y cualquier contenido musical reconocible antes de distribuir públicamente la PWA.
