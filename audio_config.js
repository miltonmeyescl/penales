// Configuración de audios reales del juego.
// Si un MP3 falta o no puede cargarse, game.js usa automáticamente el sonido sintetizado original.
window.PENALES_AUDIO = {
  enabled: true,
  base: 'audio',
  files: {
    kick: 'efectos/patada.mp3',
    net: 'efectos/red.mp3',
    woodwork: 'efectos/palo.mp3',
    glove: 'efectos/guantes.mp3',
    whistle: 'efectos/silbato.mp3',
    crowd_goal: 'ambiente/grito_gol.mp3',
    crowd_save: 'ambiente/atajada.mp3',
    crowd_miss: 'ambiente/uhhh.mp3',
    crowd_hush: 'ambiente/silencio.mp3',
    rival_whistles: 'ambiente/pifias_rival.mp3',
    chant: 'ambiente/cantico_01.mp3',
    stadium_loop: 'ambiente/publico_loop.mp3',
    victory: 'musica/victoria.mp3',
    defeat: 'musica/derrota.mp3'
  },
  volumes: {
    kick: 0.78,
    net: 0.66,
    woodwork: 0.78,
    glove: 0.72,
    whistle: 0.58,
    crowd_goal: 0.78,
    crowd_save: 0.72,
    crowd_miss: 0.68,
    crowd_hush: 0.46,
    rival_whistles: 0.52,
    chant: 0.48,
    stadium_loop: 0.20,
    victory: 0.64,
    defeat: 0.56
  }
};
