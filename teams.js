// ============================================================
// teams.js — Configuración de equipos (nombres y colores)
//
// Edita este archivo para cambiar nombres o uniformes sin
// tocar la lógica del juego (game.js).
//
// Campos de un uniforme (kit = jugador de campo, gk = arquero):
//   shirt  : color de la camiseta
//   trim   : color secundario (cuello, franjas, nombre y número)
//   shorts : color del pantalón
//   socks  : color de las medias
//   band   : (opcional) franja horizontal al medio de la camiseta
//   skin   : tono de piel del jugador
//   hair   : color de pelo
//   name   : texto corto en la espalda (solo pateadores)
//
// Campo opcional por equipo:
//   crest  : ruta a una imagen del escudo (png/jpg en esta misma
//            carpeta, ej: 'escudo_curico.png'). Se muestra en la
//            presentación previa a la tanda; si no existe, el juego
//            dibuja un escudo vectorial con los colores del club.
// ============================================================

const TEAMS = {

  // ---------- Tu equipo ----------
  local: {
    displayName: 'CURICÓ UNIDO',
    crest: 'insignias/curico.png',
    roster: [
      { number: 9, name: 'Leandro Venegas', position: 'DEL', precision: 91, power: 84, composure: 92 },
      { number: 13, name: 'Cristián Bustamante',  position: 'DEL', precision: 82, power: 93, composure: 80 },
      { number: 7,  name: 'Nicolas Fernández',  position: 'EXT', precision: 88, power: 79, composure: 86 },
      { number: 25, name: 'Mauro Lópes', position: 'EXT', precision: 85, power: 87, composure: 78 },
      { number: 10,  name: 'Javier Retamales',  position: 'VOL', precision: 79, power: 81, composure: 90 },
      { number: 17,  name: 'Benjamín Inostroza',  position: 'VOL', precision: 83, power: 80, composure: 84 },
      { number: 4,  name: 'Rodrigo Colombo',  position: 'DEF', precision: 76, power: 86, composure: 82 },
      { number: 14,  name: 'Cristopher Medina',  position: 'DEF', precision: 78, power: 83, composure: 85 },
      { number: 37,  name: 'Ronald Guzmán',  position: 'DEF', precision: 74, power: 88, composure: 77 },
      { number: 3,  name: 'Gabriel Sarria',  position: 'DEF', precision: 77, power: 82, composure: 81 },
      { number: 22,  name: 'Damián Tello',   position: 'ARQ', keeper: true, precision: 69, power: 85, composure: 88 }
    ],
    kit: { shirt: '#f8f8f8', trim: '#d81e1a', shorts: '#1a1a1a', socks: '#f8f8f8', band: '#d81e1a', skin: '#e8b58a', hair: '#2b1c10', name: 'CURICÓ' },
    gk:  { shirt: '#cfdb60', trim: '#d81e1a', shorts: '#cfdb60', socks: '#f0f0f0', band: '#d81e1a', skin: '#e8b58a', hair: '#2b1c10' }
  },

  // ---------- Rival del Partido rápido y del modo 2 Jugadores ----------
  rival: {
    displayName: 'AMARGOS FC',
    crest: 'insignias/3.png',
    roster: [
      { number: 10, name: 'PATEADOR #10', position: 'DEL', precision: 84, power: 86, composure: 83 },
      { number: 9,  name: 'PATEADOR #9',  position: 'DEL', precision: 80, power: 91, composure: 79 },
      { number: 7,  name: 'PATEADOR #7',  position: 'EXT', precision: 87, power: 78, composure: 86 },
      { number: 11, name: 'PATEADOR #11', position: 'EXT', precision: 82, power: 84, composure: 81 },
      { number: 8,  name: 'PATEADOR #8',  position: 'VOL', precision: 78, power: 80, composure: 88 },
      { number: 6,  name: 'PATEADOR #6',  position: 'VOL', precision: 81, power: 82, composure: 80 },
      { number: 5,  name: 'PATEADOR #5',  position: 'DEF', precision: 75, power: 87, composure: 81 },
      { number: 4,  name: 'PATEADOR #4',  position: 'DEF', precision: 76, power: 84, composure: 82 },
      { number: 3,  name: 'PATEADOR #3',  position: 'DEF', precision: 73, power: 88, composure: 77 },
      { number: 2,  name: 'PATEADOR #2',  position: 'DEF', precision: 77, power: 81, composure: 79 },
      { number: 1,  name: 'ARQUERO #1',   position: 'ARQ', keeper: true, precision: 67, power: 84, composure: 86 }
    ],
    kit: { shirt: '#1c1c1c', trim: '#e4231f', shorts: '#1c1c1c', socks: '#1c1c1c', skin: '#c98e64', hair: '#111', name: 'AMARGOS' },
    gk:  { shirt: '#534a4a', trim: '#e4231f', shorts: '#534a4a', socks: '#232323', band: '#e4231f', skin: '#c98e64', hair: '#111' }
  },

  // ---------- Rivales del Modo Copa, en orden de ronda ----------
  // Dificultad de cada rival:
  //   kMult  : calidad de su arquero (1 = normal, mayor = ataja más)
  //   missP  : probabilidad de que sus pateadores tiren afuera
  //   powMax : potencia máxima de sus disparos (hasta 100)
  copa: [
    {
      name: 'DEPORTES MAULE', round: 'Cuartos de final',
      crest: 'insignias/1.png',
      kMult: 0.8, missP: 0.14, powMax: 82,
      kit: { shirt: '#e8c517', trim: '#1a3f8f', shorts: '#1a3f8f', socks: '#e8c517', skin: '#d8a878', hair: '#222', name: 'MAULE' },
      gk:  { shirt: '#3d5a2e', trim: '#e8c517', shorts: '#3d5a2e', socks: '#2c401f', band: '#e8c517', skin: '#d8a878', hair: '#222' }
    },
    {
      name: 'ATLÉTICO TALCA', round: 'Semifinal',
      crest: 'insignias/2.png',
      kMult: 1.0, missP: 0.08, powMax: 90,
      kit: { shirt: '#1f7a3d', trim: '#ffffff', shorts: '#ffffff', socks: '#1f7a3d', skin: '#c98e64', hair: '#3a2510', name: 'TALCA' },
      gk:  { shirt: '#7a4fa3', trim: '#ffffff', shorts: '#5d3b7d', socks: '#4a2f63', band: '#ffffff', skin: '#c98e64', hair: '#3a2510' }
    },
    {
      name: 'AMARGOS FC', round: 'Gran Final',
      crest: 'insignias/3.png',
      kMult: 1.18, missP: 0.05, powMax: 95,
      kit: null, // null = usa el uniforme del rival principal (definido arriba)
      gk: null
    }
  ]
};

// La final de la copa se juega contra el rival principal
TEAMS.copa.forEach(stage => {
  if (!stage.kit) stage.kit = TEAMS.rival.kit;
  if (!stage.gk) stage.gk = TEAMS.rival.gk;
});


// ============================================================
// Sobrescrituras administrativas
// teams_custom.js define window.PENALES_ADMIN_TEAMS cuando el
// administrador guarda cambios desde admin.php.
// ============================================================
(function applyAdminTeamOverrides(){
  const o = window.PENALES_ADMIN_TEAMS;
  if (!o || typeof o !== 'object') return;
  if (o.local) {
    if (o.local.displayName) TEAMS.local.displayName = o.local.displayName;
    if (Array.isArray(o.local.roster) && o.local.roster.length) TEAMS.local.roster = o.local.roster;
  }
  if (o.rival) {
    if (o.rival.displayName) TEAMS.rival.displayName = o.rival.displayName;
    if (Array.isArray(o.rival.roster) && o.rival.roster.length) TEAMS.rival.roster = o.rival.roster;
  }
  if (Array.isArray(o.copa)) {
    o.copa.forEach((stage, i) => {
      if (!TEAMS.copa[i] || !stage) return;
      if (stage.name) TEAMS.copa[i].name = stage.name;
      if (Array.isArray(stage.roster) && stage.roster.length) TEAMS.copa[i].roster = stage.roster;
    });
  }
})();
