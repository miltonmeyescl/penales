(() => {
  // ---------- Referencias DOM ----------
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const msgEl = document.getElementById('message');
  const instrEl = document.getElementById('instruction');
  const powerWrap = document.getElementById('powerwrap');
  const shooterSelectEl = document.getElementById('shooterselect');
  const shooterCardsEl = document.getElementById('shootercards');
  const shooterAutoEl = document.getElementById('shooterauto');
  const shooterConfirmEl = document.getElementById('shooterconfirm');
  const progressLineEl = document.getElementById('progressline');
  const cupTrackEl = document.getElementById('cuptrack');
  const cupStepsEl = document.getElementById('cupsteps');
  const powerMask = document.getElementById('powermask');
  const bigScore = document.getElementById('bigscore');
  const dotsUserEl = document.getElementById('dotsUser');
  const dotsCpuEl = document.getElementById('dotsCpu');
  const restartBtn = document.getElementById('restart');
  const statusTextEl = document.getElementById('statusText');
  const roundMiniEl = document.getElementById('roundmini');
  const modeChipEl = document.getElementById('modechip');
  const phaseIconEl = document.getElementById('phaseicon');
  const rivalCrestEl = document.getElementById('rivalcrest');
  const localCrestEl = document.getElementById('localcrest');
  const bodyEl = document.body;
  const appShellEl = document.getElementById('appShell');
  const gameWrapEl = document.getElementById('gamewrap');
  const topbarEl = document.getElementById('topbar');
  const scoreboardEl = document.getElementById('scoreboard');
  const instructionBarEl = document.getElementById('instructionbar');
  const helpBtnEl = document.getElementById('helpbtn');
  const matchStatusEl = document.getElementById('matchstatus');

  mountBroadcastOverlay();

  // ---------- Geometría ----------
  const W = 900, H = 560;
  const GOAL_L = 230, GOAL_R = 670, BAR_Y = 135, GND_Y = 345;
  const BALL_START = { x: 450, y: 472 };
  const KEEPER_BASE = { x: 450, y: GND_Y };

  const COLS = 4, ROWS = 3;
  function zoneRect(c, r) {
    const inL = GOAL_L + 8, inR = GOAL_R - 8, inT = BAR_Y + 8, inB = GND_Y - 6;
    const zw = (inR - inL) / COLS, zh = (inB - inT) / ROWS;
    return { x: inL + c * zw, y: inT + r * zh, w: zw, h: zh };
  }
  function zoneCenter(c, r) {
    const z = zoneRect(c, r);
    return { x: z.x + z.w / 2, y: z.y + z.h / 2 };
  }
  function pointInGoal(p) {
    return p && p.x >= GOAL_L + 8 && p.x <= GOAL_R - 8 && p.y >= BAR_Y + 8 && p.y <= GND_Y - 6;
  }
  function zoneFromPoint(p) {
    const x = Math.max(GOAL_L + 8, Math.min(GOAL_R - 8.001, p.x));
    const y = Math.max(BAR_Y + 8, Math.min(GND_Y - 6.001, p.y));
    const c = Math.max(0, Math.min(COLS - 1, Math.floor((x - (GOAL_L + 8)) / ((GOAL_R - GOAL_L - 16) / COLS))));
    const r = Math.max(0, Math.min(ROWS - 1, Math.floor((y - (BAR_Y + 8)) / ((GND_Y - BAR_Y - 14) / ROWS))));
    return { c, r };
  }
  function shotTypeFor(target, power, curve = 0) {
    const cx = (GOAL_L + GOAL_R) / 2;
    const central = Math.abs(target.x - cx) < 78;
    const high = target.y < BAR_Y + 85;
    const low = target.y > GND_Y - 72;
    const mid = !high && !low;
    const sideDist = Math.min(Math.abs(target.x - GOAL_L), Math.abs(GOAL_R - target.x));
    const corner = sideDist < 72 && target.y < GND_Y - 45;
    const tightPost = sideDist < 42 && !high;
    const strongCurve = Math.abs(curve) >= 0.70;
    const mediumCurve = Math.abs(curve) >= 0.36;

    if (central && power <= 32) return { key: 'panenka', label: 'PANENKA', arcBonus: 78, saveMult: 0.72, fx: 'lob' };
    if (strongCurve && !low) return { key: 'trivela', label: 'TRIVELA', arcBonus: 18, saveMult: 0.66, fx: 'curve' };
    if (mediumCurve && corner) return { key: 'rosca', label: 'ROSCA AL PALO', arcBonus: 13, saveMult: 0.70, fx: 'curve' };
    if (power >= 96) return { key: 'canonazo', label: 'CAÑONAZO', arcBonus: 1, saveMult: 0.62, fx: 'power' };
    if (power >= 88) return { key: 'misil', label: 'MISIL', arcBonus: 4, saveMult: 0.70, fx: 'power' };
    if (tightPost && power >= 45 && power <= 82) return { key: 'palo', label: 'AJUSTADO AL PALO', arcBonus: 5, saveMult: 0.71, fx: 'precision' };
    if (low && power >= 72) return { key: 'latigazo', label: 'LATIGAZO RASO', arcBonus: -15, saveMult: 0.80, fx: 'power' };
    if (central && mid && power >= 70 && power <= 87) return { key: 'seco', label: 'TIRO SECO', arcBonus: -2, saveMult: 0.82, fx: 'power' };
    if (corner && power >= 38 && power <= 76) return { key: 'colocado', label: 'TIRO COLOCADO', arcBonus: 10, saveMult: 0.78, fx: 'precision' };
    if (low) return { key: 'raso', label: 'TIRO RASO', arcBonus: -10, saveMult: 0.92, fx: 'ground' };
    if (high && power >= 62) return { key: 'angulo', label: 'AL ÁNGULO', arcBonus: 8, saveMult: 0.74, fx: 'precision' };
    return { key: 'normal', label: 'DISPARO', arcBonus: 0, saveMult: 1, fx: 'normal' };
  }

  function mountBroadcastOverlay() {
    if (!gameWrapEl) return;
    bodyEl.classList.add('broadcast-shell');
    let topLayer = document.getElementById('broadcastTopLayer');
    let bottomLayer = document.getElementById('broadcastBottomLayer');
    let actions = document.getElementById('broadcastActions');
    if (!topLayer) {
      topLayer = document.createElement('div');
      topLayer.id = 'broadcastTopLayer';
      gameWrapEl.appendChild(topLayer);
    }
    if (!bottomLayer) {
      bottomLayer = document.createElement('div');
      bottomLayer.id = 'broadcastBottomLayer';
      gameWrapEl.appendChild(bottomLayer);
    }
    if (!actions) {
      actions = document.createElement('div');
      actions.id = 'broadcastActions';
      topLayer.appendChild(actions);
    }
    if (scoreboardEl && scoreboardEl.parentElement !== topLayer) topLayer.prepend(scoreboardEl);
    if (matchStatusEl && matchStatusEl.parentElement !== actions) actions.appendChild(matchStatusEl);
    if (helpBtnEl && helpBtnEl.parentElement !== actions) actions.appendChild(helpBtnEl);
    if (instructionBarEl && instructionBarEl.parentElement !== bottomLayer) bottomLayer.appendChild(instructionBarEl);
    if (cupTrackEl && cupTrackEl.parentElement !== gameWrapEl) gameWrapEl.appendChild(cupTrackEl);
  }

  function setPlayingLayout(active) {
    bodyEl.classList.toggle('playing-match', !!active);
    if (!active && topbarEl) topbarEl.style.display = '';
  }

  // ---------- Equipos (nombres y colores editables en teams.js) ----------
  const CURI = TEAMS.local.kit;
  const GK_CURI = TEAMS.local.gk;
  const RIVAL = TEAMS.rival.kit;
  const GK_RIVAL = TEAMS.rival.gk;
  const LOCAL_NAME = TEAMS.local.displayName;
  const RIVAL_NAME = TEAMS.rival.displayName;

  // ---------- Estado del juego ----------
  let state = 'idle'; // aim | power | shootAnim | keeperChoose | cpuAnim | between | over
  let game;
  let hoverZone = null;
  let hoverAim = null;      // punto libre de apuntado dentro del arco
  let pendingAim = null;    // punto confirmado antes de fijar potencia
  let anim = null;       // animación de disparo en curso
  let powerVal = 0, powerT0 = 0;
  let shotCurve = 0;      // -1 izquierda, +1 derecha: efecto aplicado durante la carga
  let curveGesture = null;
  let keeperSwipe = null;
  let humanDiveGesture = null;
  let suppressClickUntil = 0;
  let keeperPose = { dive: 0, dirX: 0, dirY: 0, colors: GK_RIVAL };
  let playerReaction = null; // reacción breve del pateador tras el resultado
  let keeperReaction = null; // celebración/reacción breve del arquero
  let replayTransitionT0 = -1;
  let shooterSwing = 0;  // 0-1 durante la patada
  let shooterNum = 10;   // dorsal del pateador de turno (el arquero siempre usa el 1)
  let shooterProfile = null;
  let keeperProfile = null;
  let duelIntro = null;       // presentación PATEADOR vs ARQUERO antes de cada penal
  let preKickCountdown = null; // cuenta regresiva dramática previa al penal
  let momentReaction = null;  // lower-third cinematográfico tras gol/atajada/palo
  let cupPostMatch = null;     // resumen visual de avance/campeonato en modo copa

  const rosterUsage = { user: {}, rival: {} };
  let penaltyOrder = { user: [], rival: [] };
  let penaltyOrderIndex = { user: 0, rival: 0 };
  let lineupDraft = [];
  let lineupSide = 'user';
  let dragLineupIndex = null;
  function configuredRoster(side) {
    let team;
    if (side === 'user') team = TEAMS.local;
    else if (mode === 'copa' && TEAMS.copa && TEAMS.copa[copaStage]) team = TEAMS.copa[copaStage];
    else team = TEAMS.rival;
    return (team.roster && team.roster.length ? team.roster : [10,9,7,11,8,6,5,4,3,2,1].map(number => ({ number, name:number===1?'ARQUERO #1':`PATEADOR #${number}`, position:number===1?'ARQ':'JUG', keeper:number===1, precision:number===1?68:82, power:82, composure:82 })));
  }

  function formatBroadcastPlayerName(player, fallbackLabel = 'JUGADOR') {
    if (!player) return fallbackLabel;
    const num = player.number != null ? `#${player.number}` : '';
    let raw = String(player.name || '').trim();
    raw = raw.replace(/^PATEADOR\s*/i, '').replace(/^ARQUERO\s*/i, '').trim();
    raw = raw.replace(new RegExp(`^#?${player.number}\b`), '').trim();
    if (!raw) return num || fallbackLabel;
    return `${num} ${raw}`.trim();
  }

  function buildShooterProfile(side, number) {
    const roster = configuredRoster(side);
    const base = roster.find(p => p.number === number) || roster[0];
    const uses = rosterUsage[side][base.number] || 0;
    const fatigue = Math.min(18, Math.max(0, uses - 1) * 4);
    return {
      ...base,
      displayName: formatBroadcastPlayerName(base, 'PATEADOR'),
      precision: Math.max(55, base.precision - fatigue),
      power: Math.max(55, base.power - Math.round(fatigue * .65)),
      composure: Math.max(55, base.composure - Math.round(fatigue * .45)),
      fatigue, uses
    };
  }

  function buildKeeperProfile(side) {
    const roster = configuredRoster(side);
    const base = roster.find(p => p.keeper || p.position === 'ARQ' || Number(p.number) === 1) || roster[roster.length - 1] || { number: 1, name: 'ARQUERO' };
    return {
      ...base,
      displayName: formatBroadcastPlayerName(base, 'ARQUERO'),
      reflexes: base.reflexes != null ? base.reflexes : (side === 'user' ? 86 : Math.round(76 + Math.min(18, diffKMult * 10))),
      reach: base.reach != null ? base.reach : (side === 'user' ? 84 : Math.round(74 + Math.min(20, diffKMult * 11)))
    };
  }

  function isKeeperPlayer(player) {
    return !!(player && (player.keeper || player.position === 'ARQ' || Number(player.number) === 1));
  }

  function getShooterKit(side, player = null) {
    const fieldKit = side === 'user' ? CURI : rivalKit;
    const keeperKit = side === 'user' ? GK_CURI : rivalGk;
    return isKeeperPlayer(player) ? keeperKit : fieldKit;
  }

  function startDuelIntro(side, afterFn) {
    shooterSide = side;
    shooterProfile = buildShooterProfile(side, shooterNum);
    keeperProfile = buildKeeperProfile(side === 'user' ? 'rival' : 'user');
    duelIntro = { side, t0: performance.now(), afterFn };
    state = 'duelIntro';
    setInstruction(`🎬 <b>${roundLabel()}</b> — ${shooterProfile.name} vs ${keeperProfile.name}`);
    updateBroadcastHud();
    setTimeout(() => {
      if (!duelIntro || state !== 'duelIntro') return;
      const fn = duelIntro.afterFn;
      duelIntro = null;
      fn();
    }, 1750);
  }

  function beginKickCountdown(side, readyFn) {
    const decisive = kickIsDecisive(side === 'rival' ? 'cpu' : side);
    announceDecisive(side === 'rival' ? 'cpu' : side);
    preKickCountdown = {
      side,
      t0: performance.now(),
      readyFn,
      decisive,
      whistleDone: false,
      crowdRiseDone: false
    };
    state = 'countdown';
    pendingAim = null;
    hoverAim = null;
    hoverZone = null;
    crowdLevel(decisive ? 0.004 : 0.009, 0.45);
    if (decisive) sndCrowdHush();
    setInstruction(`<b>${roundLabel()}</b> — ${decisive ? 'Momento decisivo. ' : ''}<b>Respira...</b> El árbitro prepara el silbato.`);
    updateBroadcastHud();
  }

  function updateKickCountdown(now) {
    if (!preKickCountdown || state !== 'countdown') return;
    const dt = now - preKickCountdown.t0;
    if (!preKickCountdown.whistleDone && dt >= 1760) {
      preKickCountdown.whistleDone = true;
      sndRefWhistle();
      crowdLevel(preKickCountdown.decisive ? 0.02 : 0.024, 0.14);
      vibrate(18);
      setInstruction(`<b>${roundLabel()}</b> — <b>¡Ahora sí!</b> Juega tras el silbato.`);
    }
    if (!preKickCountdown.crowdRiseDone && dt >= 1960) {
      preKickCountdown.crowdRiseDone = true;
      crowdLevel(preKickCountdown.decisive ? 0.026 : 0.03, 0.24);
    }
    if (dt >= 2140) {
      const fn = preKickCountdown.readyFn;
      preKickCountdown = null;
      fn();
    }
  }

  function drawKickCountdown(now) {
    if (!preKickCountdown) return;
    const dt = now - preKickCountdown.t0;
    const secs = dt < 600 ? 3 : dt < 1200 ? 2 : dt < 1760 ? 1 : 0;
    const label = secs > 0 ? String(secs) : '¡YA!';
    const segStart = secs === 3 ? 0 : secs === 2 ? 600 : secs === 1 ? 1200 : 1760;
    const segDur = secs > 0 ? 600 : 380;
    const local = Math.max(0, Math.min(1, (dt - segStart) / segDur));
    const pop = 1 + (1 - local) * 0.24;
    const alpha = secs > 0 ? (0.28 + (1 - local) * 0.72) : (0.42 + Math.sin(now / 36) * 0.08);
    const decisive = preKickCountdown.decisive;

    ctx.save();
    ctx.fillStyle = decisive ? 'rgba(2,8,14,.44)' : 'rgba(2,8,14,.30)';
    ctx.fillRect(0, 0, W, H);

    // cabecera compacta
    ctx.fillStyle = 'rgba(4,12,22,.90)';
    rrPath(W/2 - 124, 102, 248, 34, 13); ctx.fill();
    ctx.strokeStyle = decisive ? 'rgba(255,215,0,.26)' : 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1; rrPath(W/2 - 124, 102, 248, 34, 13); ctx.stroke();
    ctx.fillStyle = decisive ? '#ffd166' : '#dbe8f5';
    ctx.font = '900 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText(decisive ? 'PENAL DECISIVO · TODO EL ESTADIO CONTIENE EL ALIENTO' : 'CUENTA REGRESIVA · TODO LISTO PARA EL REMATE', W/2, 123);

    // número central
    ctx.save();
    ctx.translate(W/2, 284);
    ctx.scale(pop, pop);
    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 84);
    glow.addColorStop(0, decisive ? 'rgba(255,215,0,.26)' : 'rgba(255,255,255,.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 86, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${Math.max(.58, alpha).toFixed(3)})`;
    ctx.font = secs > 0 ? '900 88px Arial' : '900 68px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.restore();

    // subtítulo
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 20px Arial';
    ctx.fillText(secs > 0 ? 'PREPÁRATE' : '¡SILBATO Y ACCIÓN!', W/2, 352);
    ctx.fillStyle = decisive ? '#ffd166' : '#9fb4ca';
    ctx.font = 'bold 12px Arial';
    const sideName = preKickCountdown.side === 'user' ? (shooterProfile ? shooterProfile.name : LOCAL_NAME) : (shooterProfile ? shooterProfile.name : rivalName);
    ctx.fillText(`${roundLabel()} · ${sideName}`, W/2, 372);

    // pequeñas marcas tipo broadcast: movidas hacia la derecha y un poco más arriba
    const cueW = 292;
    const cueH = 24;
    const cueX = W - cueW - 26;
    const cueY = H - 98;
    ctx.fillStyle = 'rgba(4,12,22,.86)'; rrPath(cueX, cueY, cueW, cueH, 11); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; rrPath(cueX, cueY, cueW, cueH, 11); ctx.stroke();
    ctx.fillStyle = '#c7d6e7'; ctx.font = 'bold 10px Arial';
    ctx.fillText(secs > 0 ? 'FOCO TOTAL · RESPIRA · ESPERA EL PITAZO' : 'APUNTA · CARGA · DISPARA', cueX + cueW / 2, cueY + 16);
    ctx.restore();
  }

  function setMomentReaction(kind, title, subtitle = '') {
    momentReaction = { kind, title, subtitle, t0: performance.now(), dur: 1850 };
  }

  // dorsal al azar entre 2 y 30 (el 1 queda reservado para los arqueros)
  function randomShirtNumber() {
    return 2 + Math.floor(Math.random() * 29);
  }
  let netWave = null;    // ondulación de la red: {x, y, t0, strength}
  let ballContact = null; // impacto visual: {x,y,t0,type,color}
  let flashUntil = 0;    // hasta cuándo disparan flashes los reporteros
  let stadiumFx = { kind: 'idle', t0: -1, dur: 0 }; // atmósfera del estadio según el momento

  // reporteros gráficos detrás de la línea de fondo, a los lados del arco
  const PHOTOGS = [
    { x: 128, y: GND_Y - 64, dir: 1, vest: '#2277cc', s: 1.12 },
    { x: 178, y: GND_Y - 52, dir: 1, vest: '#1f8f4d', s: 1.22 },
    { x: W - 128, y: GND_Y - 64, dir: -1, vest: '#c9a227', s: 1.12 },
    { x: W - 178, y: GND_Y - 52, dir: -1, vest: '#7a4fa3', s: 1.22 }
  ];

  // ---------- Modos de juego, copa y récords ----------
  let mode = 'quick'; // 'quick' | 'copa' | '2p'
  let copaStage = 0;
  let nextAction = 'menu'; // qué hace el botón al terminar: 'menu' | 'copaNext'
  const COPA = TEAMS.copa; // rivales del modo copa definidos en teams.js
  let rivalName = RIVAL_NAME, rivalKit = RIVAL, rivalGk = GK_RIVAL;
  let diffKMult = 1, diffMissP = 0.08, diffPowMax = 95;
  const rivalNameEl = document.getElementById('rivalname');

  function applyRival() {
    if (mode === 'copa') {
      const s = COPA[copaStage];
      rivalName = s.name; rivalKit = s.kit; rivalGk = s.gk;
      diffKMult = s.kMult; diffMissP = s.missP; diffPowMax = s.powMax;
    } else {
      rivalName = RIVAL_NAME; rivalKit = RIVAL; rivalGk = GK_RIVAL;
      diffKMult = 1; diffMissP = 0.08; diffPowMax = 95;
    }
    rivalCrest = mode === 'copa'
      ? (COPA[copaStage].crest || TEAMS.rival.crest || null)
      : (TEAMS.rival.crest || null);
    rivalNameEl.textContent = rivalName;
    if (rivalCrestEl && rivalCrest) rivalCrestEl.src = rivalCrest;
    updateCupTrack();
  }

  // 2 jugadores: quién patea y elección secreta del arquero humano
  let shooterSide = 'user';   // 'user' | 'rival'
  let humanDiveZone = null; // fallback por clic
  let diveSecretFor = null;   // 'p2' (J2 ataja a J1) | 'p1' (J1 ataja a J2)

  // IA adaptativa: historial de columnas del pateador humano
  const userColHist = [];
  function pickKeeperCol() {
    // si el jugador repite esquina, el arquero rival empieza a adivinarla
    const recent = userColHist.slice(-4);
    if (recent.length >= 3) {
      const counts = [0, 0, 0, 0];
      recent.forEach(c => counts[c]++);
      const maxC = counts.indexOf(Math.max(...counts));
      if (counts[maxC] >= 3 && Math.random() < 0.55) return maxC;
    }
    return pickWeighted([0.32, 0.18, 0.18, 0.32]);
  }

  // estadísticas del partido y récords persistentes
  let stats = { userShots: [], gkSaves: 0, userMisses: 0 };
  let streak = 0; // racha actual de penales convertidos
  let records = { wins: 0, losses: 0, titles: 0, bestStreak: 0, goals: 0, saves: 0, matches: 0, perfect: 0, achievements: [] };
  try {
    const r = JSON.parse(localStorage.getItem('penales_records') || 'null');
    if (r) records = { ...records, ...r };
  } catch (e) { /* sin almacenamiento */ }
  function saveRecords() {
    try { localStorage.setItem('penales_records', JSON.stringify(records)); } catch (e) {}
  }
  function unlockAchievement(id, label) {
    records.achievements = records.achievements || [];
    if (!records.achievements.includes(id)) { records.achievements.push(id); saveRecords(); showMessage(`🏅 LOGRO: ${label}`, '#ffd166', 1800); }
  }
  function updateRecordsLine() {
    const el = document.getElementById('recordsline');
    if (el) el.innerHTML = `🏆 Títulos: <b>${records.titles}</b> · ✅ Victorias: <b>${records.wins}</b> · ❌ Derrotas: <b>${records.losses}</b> · 🔥 Mejor racha: <b>${records.bestStreak}</b>`;
    if (progressLineEl) progressLineEl.innerHTML = `⚽ Goles históricos: <b>${records.goals||0}</b> · 🧤 Atajadas: <b>${records.saves||0}</b> · 🎖️ Logros: <b>${(records.achievements||[]).length}</b>`;
  }

  // cámara (zoom en cámara lenta), vibración y destello de gol
  let camS = 1, camX = W / 2, camY = H / 2;
  let shakeT0 = -1;
  const shakeDur = 450, shakeMag = 8;
  let flashT0 = -1;
  function goalJuice() {
    shakeT0 = performance.now();
    flashT0 = performance.now();
  }

  // Calcula el objetivo de vuelo del arquero para que, con la estirada completa,
  // su guante quede exactamente sobre el punto (tx, ty) donde llega el balón.
  // Geometría inversa de drawKeeper: cuerpo = base + (dir - base) * 0.85, guante a
  // ±110.8 px del cuerpo con la inclinación de 1.05 rad, y altura guante = cuerpo - 19.8.
  function keeperDirForSave(tx, ty) {
    const off = tx - KEEPER_BASE.x;
    if (Math.abs(off) < 115) {
      // tiro central: bloqueo de frente — el cuerpo se planta sobre el balón,
      // con salto si viene alto (los guantes en posición erguida quedan a cuerpo - 106)
      const dirY = ty < 239 ? (KEEPER_BASE.y - 60) + (ty - 239) / 0.55 : ty;
      return { x: tx, y: dirY, block: true };
    }
    const s = Math.sign(off);
    return {
      x: KEEPER_BASE.x + (tx - s * 110.8 - KEEPER_BASE.x) / 0.85,
      y: (KEEPER_BASE.y - 60) + Math.min(0, ty - 325.2) / 0.55,
      block: false
    };
  }


  function keeperDiveFromGesture(start, end, dtMs = 220) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy);
    const mag = Math.min(1, dist / 180);
    const nx = dist > 1 ? dx / dist : 0;
    const ny = dist > 1 ? dy / dist : 0;
    const speed = Math.min(1, dist / Math.max(90, dtMs) / 1.35);

    // Un swipe hacia arriba representa una estirada alta; hacia los lados, una estirada lateral.
    const sideReach = 215 + 55 * speed;
    const upReach = 150 + 35 * speed;
    const dirX = KEEPER_BASE.x + nx * sideReach * Math.max(0.28, mag);
    const dirY = (KEEPER_BASE.y - 60) + ny * upReach * Math.max(0.28, mag);
    const clampedX = Math.max(GOAL_L + 18, Math.min(GOAL_R - 18, dirX));
    const clampedY = Math.max(BAR_Y + 18, Math.min(GND_Y - 12, dirY));
    return {
      x: clampedX,
      y: clampedY,
      speed,
      power: mag,
      block: Math.abs(clampedX - KEEPER_BASE.x) < 90 && Math.abs(ny) < 0.55,
      zone: zoneFromPoint({ x: clampedX, y: clampedY })
    };
  }

  function saveStyleFor(tx, ty, pose, power = 70, shotType = null) {
    const low = ty > GND_Y - 82;
    const central = Math.abs(tx - KEEPER_BASE.x) < 105;
    const high = ty < BAR_Y + 92;
    const lateral = !central;
    const specialCurve = shotType && (shotType.key === 'trivela' || shotType.key === 'rosca');
    const powerShot = power >= 86 || (shotType && (shotType.key === 'misil' || shotType.key === 'canonazo'));

    if (low && central) return 'legs';
    if (high && lateral && (powerShot || specialCurve)) return 'fingertip';
    if (high && central && powerShot) return 'punch';
    if (lateral && powerShot && !high) return 'parry';
    if (central && !high && !low && power <= 72) return 'catch';
    if (high && lateral) return 'onehand';
    return 'twohands';
  }

  function saveStyleLabel(style) {
    const labels = {
      legs: '¡CON LOS PIES!',
      fingertip: '¡PUNTA DE DEDOS!',
      punch: '¡PUÑETAZO!',
      parry: '¡MANOTAZO!',
      catch: '¡BLOCAJE!',
      onehand: '¡A UNA MANO!',
      twohands: '¡DOS MANOS!'
    };
    return labels[style] || '¡ATAJADÓN!';
  }

  function shotResultMessage(shotType) {
    const map = {
      panenka: '¡PANENKA! ⚽',
      canonazo: '¡CAÑONAZO! 💥',
      misil: '¡MISIL! ⚡',
      trivela: '¡TRIVELA! 🌀',
      rosca: '¡ROSCA PERFECTA! 🎯',
      latigazo: '¡LATIGAZO RASO! 🔥',
      seco: '¡TIRO SECO! ⚽',
      palo: '¡PEGADA AL PALO! 🎯',
      angulo: '¡AL ÁNGULO! 🎯'
    };
    return map[shotType && shotType.key] || '¡GOOOL!';
  }

  function humanKeeperSaveChance(tx, ty, power, shotType, curve, dive) {
    const dist = Math.hypot(tx - dive.x, ty - dive.y);
    let reach = 72 + dive.speed * 52 + dive.power * 18;
    if (dive.block) reach += 20;
    const proximity = Math.max(0, 1 - dist / reach);
    let chance = (0.06 + proximity * 0.9) * (1 - power / 185) * shotType.saveMult;
    chance *= 0.9 + dive.speed * 0.18;
    chance *= (1 - Math.min(0.22, Math.abs(curve) * 0.22));
    if (Math.abs(tx - KEEPER_BASE.x) < 82 && ty > GND_Y - 80 && dive.block) chance += 0.16;
    if (shotType.key === 'panenka' && Math.abs(dive.x - KEEPER_BASE.x) > 90) chance *= 0.25;
    return Math.min(0.95, Math.max(0.015, chance));
  }

  // desplazamiento de la red en un punto: onda que se expande desde el impacto y se amortigua
  function netOffset(x, y, now) {
    if (!netWave) return 0;
    const t = (now - netWave.t0) / 1000;
    if (t > 1.45) { netWave = null; return 0; }
    const d = Math.hypot(x - netWave.x, y - netWave.y);
    const strength = netWave.strength || 1;
    const decay = Math.exp(-t * 2.8) * Math.exp(-d / 105);
    return Math.sin(d / 12 - t * 25) * 13 * strength * decay;
  }

  function triggerBallContact(x, y, type = 'kick', color = '#ffffff') {
    ballContact = { x, y, type, color, t0: performance.now() };
  }

  function drawBallContact(now) {
    if (!ballContact) return;
    const dt = now - ballContact.t0;
    const dur = ballContact.type === 'net' ? 300 : 210;
    if (dt > dur) { ballContact = null; return; }
    const p = Math.max(0, Math.min(1, dt / dur));
    const fade = 1 - p;
    const radius = 8 + p * (ballContact.type === 'wood' ? 34 : 24);
    ctx.save();
    ctx.globalAlpha = fade * .9;
    ctx.strokeStyle = ballContact.color;
    ctx.lineWidth = Math.max(1, 4 - p * 3);
    ctx.beginPath(); ctx.arc(ballContact.x, ballContact.y, radius, 0, Math.PI * 2); ctx.stroke();
    // pequeñas chispas/fragmentos gráficos de impacto
    const rays = ballContact.type === 'wood' ? 8 : 6;
    for (let i = 0; i < rays; i++) {
      const a = (Math.PI * 2 * i / rays) + p * .7;
      const r1 = radius + 2, r2 = radius + 8 + p * 8;
      ctx.beginPath();
      ctx.moveTo(ballContact.x + Math.cos(a) * r1, ballContact.y + Math.sin(a) * r1);
      ctx.lineTo(ballContact.x + Math.cos(a) * r2, ballContact.y + Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function newGame() {
    game = {
      round: 1,
      total: 5,
      sudden: false,
      user: [],   // 'goal' | 'fail'
      cpu: [],
      over: false,
      winner: null
    };
    preKickCountdown = null;
    duelIntro = null;
    cupPostMatch = null;
    stats = { userShots: [], gkSaves: 0, userMisses: 0 };
  }

  // ---------- Audio simple ----------
  let actx = null;
  let chantTimer = null;

  function ensureAudio() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      return true;
    } catch (e) { return false; }
  }

  // ---------- Audio real MP3 + fallback sintetizado ----------
  const AUDIO_CFG = window.PENALES_AUDIO || { enabled: false, files: {}, volumes: {} };
  const realAudioBase = new Map();
  const realAudioFailed = new Set();
  const realLoopPlayers = new Map();

  function audioUrl(key) {
    if (!AUDIO_CFG.enabled || !AUDIO_CFG.files || !AUDIO_CFG.files[key]) return null;
    const base = String(AUDIO_CFG.base || 'audio').replace(/\/$/, '');
    return `${base}/${AUDIO_CFG.files[key]}`;
  }

  function audioVolume(key, fallback = 1) {
    const v = AUDIO_CFG.volumes && Number(AUDIO_CFG.volumes[key]);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  }

  function getRealAudioBase(key) {
    if (realAudioFailed.has(key)) return null;
    if (realAudioBase.has(key)) return realAudioBase.get(key);
    const url = audioUrl(key);
    if (!url || typeof Audio === 'undefined') return null;
    try {
      const a = new Audio(url);
      a.preload = 'auto';
      a.addEventListener('error', () => realAudioFailed.add(key), { once: true });
      a.load();
      realAudioBase.set(key, a);
      return a;
    } catch (e) {
      realAudioFailed.add(key);
      return null;
    }
  }

  function preloadRealAudio() {
    if (!AUDIO_CFG.enabled || !AUDIO_CFG.files) return;
    Object.keys(AUDIO_CFG.files).forEach(getRealAudioBase);
  }

  function realAudioReady(key) {
    const a = getRealAudioBase(key);
    return !!(a && !realAudioFailed.has(key) && a.readyState >= 2);
  }

  function playRealAudio(key, opts = {}) {
    const base = getRealAudioBase(key);
    if (!base || realAudioFailed.has(key) || base.readyState < 2) return false;
    try {
      const a = base.cloneNode(true);
      a.volume = Math.max(0, Math.min(1, opts.volume != null ? opts.volume : audioVolume(key, 1)));
      a.loop = !!opts.loop;
      a.currentTime = Math.max(0, Number(opts.startAt) || 0);
      const pr = a.play();
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
      return true;
    } catch (e) { return false; }
  }

  function startRealLoop(key, opts = {}) {
    if (realLoopPlayers.has(key)) return realLoopPlayers.get(key);
    const base = getRealAudioBase(key);
    if (!base || realAudioFailed.has(key) || base.readyState < 2) return null;
    try {
      const a = base.cloneNode(true);
      a.loop = true;
      a.volume = Math.max(0, Math.min(1, opts.volume != null ? opts.volume : audioVolume(key, 1)));
      const pr = a.play();
      if (pr && typeof pr.catch === 'function') pr.catch(() => {});
      realLoopPlayers.set(key, a);
      return a;
    } catch (e) { return null; }
  }

  function stopRealLoop(key) {
    const a = realLoopPlayers.get(key);
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
    realLoopPlayers.delete(key);
  }

  function hybridOneShot(key, fallbackFn, opts = {}) {
    if (playRealAudio(key, opts)) return true;
    if (typeof fallbackFn === 'function') fallbackFn();
    return false;
  }

  function vibrate(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    } catch (e) { /* sin vibración */ }
  }

  function beep(freqs, dur = 0.12, type = 'square', vol = 0.15) {
    try {
      if (!ensureAudio()) return;
      let t = actx.currentTime;
      freqs.forEach(f => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + dur);
        t += dur * 0.9;
      });
    } catch (e) { /* sin audio */ }
  }

  function toneSweep(fromHz, toHz, dur = 0.12, type = 'sine', vol = 0.09, delay = 0) {
    try {
      if (!ensureAudio()) return;
      const t = actx.currentTime + delay;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(fromHz, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, toHz), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur);
    } catch (e) { /* sin audio */ }
  }

  function noiseBurst(dur = 0.08, vol = 0.05, filterType = 'bandpass', freq = 1200, q = 1.1, delay = 0) {
    try {
      if (!ensureAudio()) return;
      const len = Math.max(1, Math.floor(actx.sampleRate * dur));
      const buf = actx.createBuffer(1, len, actx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource();
      src.buffer = buf;
      const filt = actx.createBiquadFilter();
      filt.type = filterType;
      filt.frequency.value = freq;
      filt.Q.value = q;
      const g = actx.createGain();
      const t = actx.currentTime + delay;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(filt); filt.connect(g); g.connect(actx.destination);
      src.start(t); src.stop(t + dur);
    } catch (e) { /* sin audio */ }
  }

  function sndKick() {
    hybridOneShot('kick', () => {
      toneSweep(145, 88, 0.05, 'triangle', 0.22);
      noiseBurst(0.028, 0.045, 'bandpass', 1450, 1.3);
    });
    vibrate(20);
  }
  function sndNet() {
    hybridOneShot('net', () => {
      noiseBurst(0.11, 0.032, 'lowpass', 1000, 0.7);
      toneSweep(430, 250, 0.09, 'sine', 0.035);
    });
  }
  function sndWoodwork() {
    hybridOneShot('woodwork', () => {
      beep([1420, 980], 0.08, 'square', 0.08);
      toneSweep(1080, 760, 0.12, 'triangle', 0.055, 0.03);
    });
    vibrate(80);
  }
  function sndGlove() {
    hybridOneShot('glove', () => {
      noiseBurst(0.055, 0.032, 'bandpass', 760, 0.9);
      toneSweep(220, 145, 0.07, 'triangle', 0.04);
    });
  }
  function sndCrowdRoar() {
    hybridOneShot('crowd_goal', () => {
      noiseBurst(0.35, 0.028, 'lowpass', 720, 0.6);
      noiseBurst(0.22, 0.018, 'bandpass', 1500, 0.9, 0.05);
    });
  }
  function sndCrowdSave() {
    hybridOneShot('crowd_save', () => {
      noiseBurst(0.28, 0.024, 'lowpass', 760, 0.6);
      noiseBurst(0.16, 0.014, 'bandpass', 1350, 0.8, 0.04);
    });
  }
  function sndCrowdGroan() {
    hybridOneShot('crowd_miss', () => {
      toneSweep(420, 180, 0.24, 'sawtooth', 0.03);
      noiseBurst(0.20, 0.018, 'lowpass', 540, 0.7);
    });
  }
  function sndCrowdHush() {
    hybridOneShot('crowd_hush', () => noiseBurst(0.18, 0.012, 'lowpass', 420, 0.4));
  }
  function sndChant() {
    hybridOneShot('chant', () => playTune([
      { f: [196, 247], d: 0.45 },
      { f: null, d: 0.10 },
      { f: [220, 262], d: 0.35 },
      { f: null, d: 0.10 },
      { f: [196, 247], d: 0.55 }
    ], { bpm: 112, wave: 'triangle', vol: 0.028 }));
  }
  function startCrowdChants() {
    stopCrowdChants();
    chantTimer = setInterval(() => {
      if (document.hidden) return;
      if (!actx && !AUDIO_CFG.enabled) return;
      if (game && game.over) return;
      if (['presentation', 'power', 'shootAnim', 'cpuAnim', 'duelIntro', 'replay'].includes(state)) return;
      if (Math.random() < 0.78) sndChant();
    }, 9800);
  }
  function stopCrowdChants() {
    if (chantTimer) { clearInterval(chantTimer); chantTimer = null; }
  }
  function sndGoal() {
    if (!realAudioReady('crowd_goal')) beep([523, 659, 784, 1046], 0.14, 'square', 0.11);
    setTimeout(sndNet, 70);
    setTimeout(sndCrowdRoar, 130);
    vibrate([40, 20, 80]);
  }
  function sndSave() {
    sndGlove();
    if (!realAudioReady('crowd_save')) beep([300, 180], 0.14, 'sawtooth', 0.1);
    setTimeout(sndCrowdSave, 110);
    vibrate([40, 30, 40]);
  }
  function sndMiss() {
    if (!realAudioReady('crowd_miss')) beep([400, 250, 150], 0.13, 'triangle', 0.11);
    setTimeout(sndCrowdGroan, 80);
    vibrate(55);
  }

  // reproductor de melodías: notas {f: frecuencia (o acorde como array, null = silencio), d: duración en tiempos}
  function playTune(notes, opts = {}) {
    try {
      if (!ensureAudio()) return;
      const beat = 60 / (opts.bpm || 140);
      let t = actx.currentTime + 0.05;
      const master = actx.createGain();
      master.gain.value = opts.vol || 0.1;
      master.connect(actx.destination);
      for (const n of notes) {
        const dur = n.d * beat;
        if (n.f) {
          (Array.isArray(n.f) ? n.f : [n.f]).forEach(freq => {
            const o = actx.createOscillator(), g = actx.createGain();
            o.type = opts.wave || 'square';
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(1, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.95);
            o.connect(g); g.connect(master);
            o.start(t); o.stop(t + dur);
          });
        }
        t += dur;
      }
    } catch (e) { /* sin audio */ }
  }

  // fanfarria de triunfo: arpegio ascendente, repique y acorde mayor final
  const TUNE_WIN = [
    { f: 523, d: 0.5 }, { f: 659, d: 0.5 }, { f: 784, d: 0.5 }, { f: 1046, d: 0.9 },
    { f: null, d: 0.1 },
    { f: 784, d: 0.45 }, { f: 1046, d: 1.1 },
    { f: null, d: 0.15 },
    { f: 880, d: 0.35 }, { f: 988, d: 0.35 }, { f: 1046, d: 0.35 }, { f: 1175, d: 0.5 },
    { f: [659, 784, 1046, 1318], d: 2.4 }
  ];
  // lamento de derrota: frase menor descendente y acorde menor apagado
  const TUNE_LOSE = [
    { f: 466, d: 1 }, { f: 440, d: 1 }, { f: 415, d: 1 },
    { f: 392, d: 1.6 }, { f: null, d: 0.3 },
    { f: [220, 262, 330], d: 3 }
  ];
  const musicWin = () => hybridOneShot('victory', () => playTune(TUNE_WIN, { bpm: 150, wave: 'square', vol: 0.1 }));
  const musicLose = () => hybridOneShot('defeat', () => playTune(TUNE_LOSE, { bpm: 80, wave: 'triangle', vol: 0.12 }));

  // ---------- Ambiente de estadio (MP3 real en loop o ruido filtrado de respaldo) ----------
  let crowdGain = null;
  let realCrowdLoop = null;
  function initCrowd() {
    preloadRealAudio();
    realCrowdLoop = startRealLoop('stadium_loop', { volume: audioVolume('stadium_loop', 0.20) });
    const realBase = getRealAudioBase('stadium_loop');
    if (!realCrowdLoop && realBase && !realAudioFailed.has('stadium_loop')) {
      realBase.addEventListener('canplay', () => {
        if (realCrowdLoop) return;
        realCrowdLoop = startRealLoop('stadium_loop', { volume: audioVolume('stadium_loop', 0.20) });
        if (realCrowdLoop && crowdGain && actx) {
          try { crowdGain.gain.setValueAtTime(0.0001, actx.currentTime); } catch (e) {}
        }
      }, { once: true });
    }
    if (realCrowdLoop) return;
    try {
      if (!ensureAudio()) return;
      if (crowdGain) return;
      const len = Math.floor(actx.sampleRate * 2);
      const buf = actx.createBuffer(1, len, actx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = actx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filt = actx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 850;
      const g = actx.createGain();
      g.gain.value = 0.012;
      src.connect(filt); filt.connect(g); g.connect(actx.destination);
      src.start();
      crowdGain = g;
    } catch (e) { /* sin audio */ }
  }
  function crowdLevel(v, t = 0.5) {
    if (realCrowdLoop) {
      const target = Math.max(0.02, Math.min(0.55, v * 4.2));
      try { realCrowdLoop.volume = target; } catch (e) {}
    }
    if (!crowdGain || !actx) return;
    const t0 = actx.currentTime;
    crowdGain.gain.cancelScheduledValues(t0);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, t0);
    crowdGain.gain.linearRampToValueAtTime(v, t0 + t);
  }
  function crowdBurst(v = 0.09) {
    crowdLevel(v, 0.08);
    setTimeout(() => crowdLevel(0.012, 1.4), 900);
  }

  // silbato del árbitro antes de cada penal
  function sndRefWhistle() {
    hybridOneShot('whistle', () => {
      try {
        if (!ensureAudio()) return;
        const t = actx.currentTime;
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(2350, t);
        o.frequency.setValueAtTime(2100, t + 0.12);
        o.frequency.setValueAtTime(2350, t + 0.2);
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + 0.42);
      } catch (e) {}
    });
    vibrate(12);
  }
  // pitos de la hinchada cuando patea el rival
  function sndPitos() {
    if (playRealAudio('rival_whistles')) return;
    for (let i = 0; i < 6; i++) {
      setTimeout(() => beep([1600 + Math.random() * 900], 0.12, 'square', 0.03), i * 130);
    }
  }

  // latidos de corazón en los penales decisivos
  let heartbeatTimer = null;
  function startHeartbeat() {
    if (heartbeatTimer) return;
    const thump = () => {
      beep([62], 0.09, 'sine', 0.5);
      setTimeout(() => beep([52], 0.08, 'sine', 0.4), 180);
    };
    thump();
    heartbeatTimer = setInterval(thump, 850);
  }
  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  // relator con síntesis de voz del navegador
  function say(text, opts = {}) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'es-ES';
      u.rate = opts.rate || 1.05;
      u.pitch = opts.pitch || 1.15;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }
  const GOAL_CALLS = [
    '¡Goooooool de Curicó Unidooo!',
    '¡Golaaazo albirrojo!',
    '¡Gol, gol, gol de Curicó!'
  ];

  function triggerStadiumFx(kind = 'idle', dur = 1700) {
    stadiumFx = { kind, t0: performance.now(), dur };
  }

  function currentPenaltySideForAtmosphere() {
    if (state === 'duelIntro' && duelIntro && duelIntro.side) return duelIntro.side === 'rival' ? 'cpu' : 'user';
    if (state === 'countdown' && preKickCountdown && preKickCountdown.side) return preKickCountdown.side === 'rival' ? 'cpu' : 'user';
    if (shooterSide === 'rival') return 'cpu';
    return 'user';
  }

  function getStadiumMood(now) {
    const active = stadiumFx && stadiumFx.t0 >= 0 && (now - stadiumFx.t0) < stadiumFx.dur;
    const decisiveLive = ['aim', 'power', 'keeperChoose', 'diveSecret', 'duelIntro', 'countdown'].includes(state)
      && kickIsDecisive(currentPenaltySideForAtmosphere());
    const kind = active ? stadiumFx.kind : (decisiveLive ? 'decisive' : 'idle');
    return { kind, active, decisiveLive, pulse: 0.5 + 0.5 * Math.sin(now / 120) };
  }

  // ---------- Dibujo de escena ----------
  function drawPitch(now) {
    const mood = getStadiumMood(now);
    const colorMap = {
      idle: { a: '#d81e1a', b: '#ffffff', c: '#f8d66d', ledA: '#d81e1a', ledB: '#8c0f0c', glow: 'rgba(255,255,220,.14)', crowd: 1, pitch: 'rgba(255,255,220,.08)' },
      goal: { a: '#ff3b30', b: '#ffffff', c: '#ffd166', ledA: '#ff3b30', ledB: '#b61612', glow: 'rgba(255,245,215,.28)', crowd: 1.65, pitch: 'rgba(255,235,170,.14)' },
      save: { a: '#2ec5ff', b: '#ffffff', c: '#9fe6ff', ledA: '#2295d6', ledB: '#0f4f7a', glow: 'rgba(210,240,255,.22)', crowd: 1.35, pitch: 'rgba(180,225,255,.12)' },
      wood: { a: '#f1c40f', b: '#ffffff', c: '#ffd166', ledA: '#d4a70a', ledB: '#7b5a07', glow: 'rgba(255,230,170,.18)', crowd: 1.1, pitch: 'rgba(255,224,128,.10)' },
      silence: { a: '#6a7684', b: '#d7deea', c: '#93abc2', ledA: '#465260', ledB: '#202a35', glow: 'rgba(190,210,230,.08)', crowd: 0.42, pitch: 'rgba(160,175,190,.05)' },
      decisive: { a: '#ffd700', b: '#ffffff', c: '#ff8c42', ledA: '#cc9f00', ledB: '#5b4300', glow: 'rgba(255,235,150,.24)', crowd: 1.2, pitch: 'rgba(255,226,120,.10)' }
    };
    const pal = colorMap[mood.kind] || colorMap.idle;
    const energy = pal.crowd;
    const moodPulse = 0.72 + Math.sin(now / 160) * 0.12 + mood.pulse * 0.1;

    // cielo nocturno
    const sky = ctx.createLinearGradient(0, 0, 0, 130);
    sky.addColorStop(0, '#05101d');
    sky.addColorStop(1, mood.kind === 'goal' ? '#29496a' : mood.kind === 'save' ? '#173b55' : '#17324e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 130);

    // torres y resplandor de iluminación
    for (const lx of [68, W - 68]) {
      ctx.fillStyle = 'rgba(30,40,55,.9)';
      ctx.fillRect(lx - 3, 18, 6, 64);
      for (let yy = 24; yy <= 48; yy += 8) {
        ctx.fillStyle = 'rgba(55,70,90,.8)';
        ctx.fillRect(lx - 22, yy, 44, 2);
      }
      for (let yy = 20; yy <= 44; yy += 10) {
        for (let xx = -16; xx <= 16; xx += 8) {
          ctx.fillStyle = `rgba(255,255,220,${(0.35 + 0.12 * Math.sin(now / 110 + xx + yy)).toFixed(3)})`;
          ctx.fillRect(lx + xx, yy, 5, 5);
        }
      }
      const fg = ctx.createRadialGradient(lx, 20, 4, lx, 20, 110 + 26 * energy);
      fg.addColorStop(0, 'rgba(255,255,240,.62)');
      fg.addColorStop(0.45, pal.glow);
      fg.addColorStop(1, 'rgba(255,255,240,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(lx, 20, 110 + 26 * energy, 0, Math.PI * 2); ctx.fill();
    }

    // tribunas
    ctx.fillStyle = '#0a1a2c'; ctx.fillRect(0, 24, W, 44);
    ctx.fillStyle = '#0d2034'; ctx.fillRect(0, 70, W, 38);
    ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, 24, W, 3); ctx.fillRect(0, 70, W, 2);

    // público: dos bandejas, con más movimiento y variación de tamaño
    const crowdCols = ['#d81e1a', '#f0f0f0', '#8899aa', '#e4231f', '#556677', '#cc3333', '#e8d27b', '#1e90ff'];
    const drawCrowdBand = (y0, y1, count, scale = 1) => {
      for (let i = 0; i < count; i++) {
        const px = ((i * 37.7) + (i % 7) * 11) % W;
        const span = y1 - y0;
        const baseY = y0 + ((i * 19.3) % span);
        const sway = Math.sin(now / (130 - energy * 18) + i * 0.93) * (0.8 + energy * 0.75) * scale;
        const lift = (mood.kind === 'goal' || mood.kind === 'save') ? Math.max(0, Math.sin(now / 90 + i * 1.7)) * 1.8 : 0;
        const h = 4 + (i % 3);
        const w = 3 + (i % 2);
        ctx.fillStyle = crowdCols[i % crowdCols.length];
        ctx.globalAlpha = Math.max(0.18, Math.min(0.9, 0.28 + 0.22 * moodPulse + 0.14 * Math.sin(now / 300 + i * 1.17)));
        ctx.fillRect(px, baseY + sway - lift, w, h);
        if ((i % 9) === 0) {
          ctx.fillStyle = pal.b;
          ctx.fillRect(px - 1, baseY + sway - 4 - lift, w + 2, 1.5);
        }
      }
    };
    drawCrowdBand(30, 62, 210, 1);
    drawCrowdBand(73, 103, 190, 0.8);
    ctx.globalAlpha = 1;

    // flashes del público cuando sube la tensión o hay celebración
    const flashMode = mood.kind === 'goal' || mood.kind === 'save' || mood.kind === 'decisive' || now < flashUntil;
    if (flashMode) {
      for (let i = 0; i < 18; i++) {
        const fx = 18 + ((i * 67) % (W - 36));
        const fy = 28 + ((i * 31) % 72);
        const amp = Math.sin(now / 82 + i * 2.1);
        if (amp > (mood.kind === 'decisive' ? 0.1 : 0.35)) {
          const a = Math.min(0.72, (amp + 1) * 0.28 * (mood.kind === 'goal' ? 1.15 : 1));
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 12);
          g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(fx, fy, 12, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // barandillas y paños de color
    ctx.strokeStyle = 'rgba(160,190,220,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 68); ctx.lineTo(W, 68); ctx.stroke();

    // lienzos de la hinchada y banderas albirrojas
    const supporterBanners = [
      { x: 36, y: 80, w: 156, h: 18, bg: '#b61513', text: 'LOS MARGINALES' },
      { x: W/2 - 96, y: 82, w: 192, h: 18, bg: '#f2f2f2', text: 'AGUANTE CURICÓ UNIDO' },
      { x: W - 224, y: 80, w: 182, h: 18, bg: '#b61513', text: 'PASIÓN ALBIRROJA' }
    ];
    supporterBanners.forEach((b, idx) => {
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(b.x + 1, b.y + 2, b.w, b.h);
      ctx.fillStyle = b.bg;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1);
      // franjas Curicó en el banner blanco central
      if (idx === 1) {
        ctx.fillStyle = '#c71f1d';
        ctx.fillRect(b.x + 4, b.y + 3, 18, b.h - 6);
        ctx.fillRect(b.x + b.w - 22, b.y + 3, 18, b.h - 6);
      }
      ctx.fillStyle = idx === 1 ? '#111' : '#fff';
      ctx.font = '900 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(b.text, b.x + b.w / 2, b.y + 12.5);
    });

    const flagXs = [118, 215, W - 260, W - 150, W/2 + 150];
    flagXs.forEach((fx, i) => {
      const fy = 58 + (i % 2) * 12;
      const wave = Math.sin(now / 180 + i * 0.9);
      ctx.strokeStyle = 'rgba(185,195,210,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 26);
      ctx.lineTo(fx, fy - 12);
      ctx.stroke();
      ctx.save();
      ctx.translate(fx, fy - 10);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, 3 + wave * 2);
      ctx.lineTo(42, 9 + wave * 4);
      ctx.lineTo(42, 22 + wave * 2);
      ctx.lineTo(24, 17 + wave * 2);
      ctx.lineTo(0, 14);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#c81e1c' : '#f4f4f4';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#c81e1c';
      ctx.fillRect(8, 0.5, 8, 14);
      ctx.fillRect(26, 4.5, 8, 14);
      ctx.restore();
    });

    // carteles LED animados
    const ledMsgs = {
      idle: ['MULTIHOGAR', 'COCA-COLA', 'CARNES GUERRA', 'ELIOTEC', '¡VAMOS CURICÓ!', 'AGUANTE CURICÓ'],
      goal: ['¡GOOOL!', 'CURICÓ UNIDO', 'EL ESTADIO EXPLOTA'],
      save: ['¡ATAJADÓN!', 'MURALLA ALBIRROJA', 'NADIE PASA'],
      wood: ['¡UUUY!', 'CASI ENTRA', 'SE SALVAN'],
      silence: ['SILENCIO EN LA TRIBUNA', 'RESPIRA EL ESTADIO', 'TODAVÍA QUEDA TANDA'],
      decisive: ['PENAL DECISIVO', 'TODOS DE PIE', 'NO APTA PARA CARDÍACOS']
    };
    const msgList = ledMsgs[mood.kind] || ledMsgs.idle;
    const ledY = 108, ledH = 22, panelW = 150;
    for (let i = 0; i < 6; i++) {
      const x = i * panelW;
      const msg = msgList[i % msgList.length];
      const sponsorStyles = {
        'MULTIHOGAR': ['#3f9cff', '#1f67d8'],
        'COCA-COLA': ['#e1261c', '#b20f11'],
        'CARNES GUERRA': ['#5b3520', '#2d1a12'],
        'ELIOTEC': ['#53b7ff', '#2376d2']
      };
      const g = ctx.createLinearGradient(x, ledY, x, ledY + ledH);
      if (sponsorStyles[msg]) {
        g.addColorStop(0, sponsorStyles[msg][0]);
        g.addColorStop(1, sponsorStyles[msg][1]);
      } else {
        g.addColorStop(0, pal.ledA);
        g.addColorStop(1, pal.ledB);
      }
      ctx.fillStyle = g;
      ctx.fillRect(x, ledY, panelW - 2, ledH);
      const shimmer = Math.max(0, Math.sin(now / 140 + i * 1.4));
      ctx.fillStyle = `rgba(255,255,255,${(0.05 + shimmer * 0.10).toFixed(3)})`;
      ctx.fillRect(x, ledY, panelW - 2, 4);
      ctx.fillStyle = '#fff';
      ctx.font = sponsorStyles[msg] ? '900 12px Arial' : 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(msg, x + (panelW - 2) / 2, 123);
    }

    // vallas publicitarias detrás del arco
    const adBoards = [
      { brand: 'MULTIHOGAR', bg: '#2f8ef7', fg: '#ffffff' },
      { brand: 'COCA-COLA', bg: '#d51317', fg: '#ffffff' },
      { brand: 'CARNES GUERRA', bg: '#432819', fg: '#f8e7c0' },
      { brand: 'ELIOTEC', bg: '#d8ecff', fg: '#cf2228' },
      { brand: 'MULTIHOGAR', bg: '#2f8ef7', fg: '#ffffff' },
      { brand: 'COCA-COLA', bg: '#d51317', fg: '#ffffff' }
    ];
    const adY = 128, adH = 18, adW = W / adBoards.length;
    ctx.fillStyle = 'rgba(12,22,30,.80)';
    ctx.fillRect(0, adY - 2, W, adH + 4);
    adBoards.forEach((ad, i) => {
      const x = i * adW + 1;
      const w = adW - 2;
      const gg = ctx.createLinearGradient(x, adY, x, adY + adH);
      gg.addColorStop(0, ad.bg);
      gg.addColorStop(1, 'rgba(0,0,0,.22)');
      ctx.fillStyle = gg;
      ctx.fillRect(x, adY, w, adH);
      ctx.strokeStyle = 'rgba(255,255,255,.14)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + .5, adY + .5, w - 1, adH - 1);
      ctx.fillStyle = ad.fg;
      ctx.font = i === 1 ? 'italic bold 11px Arial' : '900 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(ad.brand, x + w / 2, adY + 12.5);
    });

    // césped
    const gr = ctx.createLinearGradient(0, 130, 0, H);
    gr.addColorStop(0, '#2f7d32');
    gr.addColorStop(1, '#1d5720');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 130, W, H - 130);
    // franjas de corte
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    for (let i = 1; i < 7; i += 2) ctx.fillRect(0, 130 + i * 62, W, 62);
    ctx.globalAlpha = 1;

    // iluminación dinámica sobre el césped
    const gl = ctx.createRadialGradient(W / 2, GND_Y - 5, 80, W / 2, GND_Y, 470);
    gl.addColorStop(0, pal.pitch);
    gl.addColorStop(0.55, pal.glow.replace('.14', '.06').replace('.28', '.10').replace('.22', '.10').replace('.18', '.08').replace('.08', '.04').replace('.24', '.11'));
    gl.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 130, W, H - 130);
    if (mood.kind === 'decisive') {
      const spot = ctx.createRadialGradient(BALL_START.x, BALL_START.y - 22, 14, BALL_START.x, BALL_START.y - 22, 95);
      spot.addColorStop(0, 'rgba(255,235,150,.22)');
      spot.addColorStop(1, 'rgba(255,235,150,0)');
      ctx.fillStyle = spot;
      ctx.beginPath(); ctx.arc(BALL_START.x, BALL_START.y - 22, 95, 0, Math.PI * 2); ctx.fill();
    }

    // área penal: angosta al fondo y se abre hacia la cámara (perspectiva)
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(150, GND_Y + 4);
    ctx.lineTo(80, 505);
    ctx.moveTo(W - 150, GND_Y + 4);
    ctx.lineTo(W - 80, 505);
    ctx.stroke();
    // área chica alrededor del arco
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(195, GND_Y + 4);
    ctx.lineTo(186, 415);
    ctx.lineTo(W - 186, 415);
    ctx.lineTo(W - 195, GND_Y + 4);
    ctx.stroke();
    // línea de fondo: cruza todo el ancho de la cancha
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GND_Y + 4);
    ctx.lineTo(W, GND_Y + 4);
    ctx.stroke();
    // punto penal
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(BALL_START.x, BALL_START.y + 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGoal(now) {
    // red (las líneas se muestrean por tramos para poder ondularlas con netOffset)
    ctx.strokeStyle = 'rgba(235,245,255,.42)';
    ctx.lineWidth = 1.05;
    for (let x = GOAL_L; x <= GOAL_R; x += 22) {
      const xb = GOAL_L + (x - GOAL_L) * 0.92 + 18;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) {
        const f = i / 10;
        const py = BAR_Y + (GND_Y - BAR_Y) * f;
        const px = x + (xb - x) * f + netOffset(x + (xb - x) * f, py, now);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    for (let y = BAR_Y; y <= GND_Y; y += 20) {
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const f = i / 20;
        const px = GOAL_L + (GOAL_R - GOAL_L) * f;
        const py = y + netOffset(px, y, now);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // profundidad del arco: travesaño trasero y tirantes
    const backT = 14;
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(GOAL_L + 16, BAR_Y + backT);
    ctx.lineTo(GOAL_R - 16, BAR_Y + backT);
    ctx.moveTo(GOAL_L, BAR_Y);
    ctx.lineTo(GOAL_L + 16, BAR_Y + backT);
    ctx.moveTo(GOAL_R, BAR_Y);
    ctx.lineTo(GOAL_R - 16, BAR_Y + backT);
    ctx.stroke();
    // redes laterales (malla en los triángulos de los costados)
    ctx.strokeStyle = 'rgba(255,255,255,.22)';
    ctx.lineWidth = 1;
    for (let k = 0; k <= 6; k++) {
      const f = k / 6;
      ctx.beginPath();
      ctx.moveTo(GOAL_L, BAR_Y + (GND_Y - BAR_Y) * f);
      ctx.lineTo(GOAL_L + 16, BAR_Y + backT + (GND_Y - BAR_Y - backT) * f);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(GOAL_R, BAR_Y + (GND_Y - BAR_Y) * f);
      ctx.lineTo(GOAL_R - 16, BAR_Y + backT + (GND_Y - BAR_Y - backT) * f);
      ctx.stroke();
    }
    // postes y travesaño con volumen (base gris + brillo blanco)
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#aeb4ba';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(GOAL_L, GND_Y);
    ctx.lineTo(GOAL_L, BAR_Y);
    ctx.lineTo(GOAL_R, BAR_Y);
    ctx.lineTo(GOAL_R, GND_Y);
    ctx.stroke();
    ctx.strokeStyle = '#fbfbfb';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(GOAL_L - 1, GND_Y);
    ctx.lineTo(GOAL_L - 1, BAR_Y - 1);
    ctx.lineTo(GOAL_R - 1, BAR_Y - 1);
    ctx.lineTo(GOAL_R - 1, GND_Y);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // reportero gráfico arrodillado; dir: hacia dónde apunta la cámara (+1 derecha, -1 izquierda)
  function drawPhotographer(p, i, now, flashing) {
    const dir = p.dir;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.s, p.s); // más pequeños por estar más lejos
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // piernas: una rodilla al piso, la otra flectada
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4 * dir, -14); ctx.lineTo(-9 * dir, 0);
    ctx.moveTo(4 * dir, -14); ctx.lineTo(9 * dir, -8); ctx.lineTo(9 * dir, 0);
    ctx.stroke();
    // torso con chaleco de prensa
    ctx.fillStyle = p.vest;
    rrPath(-8, -34, 16, 20, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // brazos sosteniendo la cámara
    ctx.strokeStyle = p.vest;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-3 * dir, -30); ctx.lineTo(9 * dir, -37);
    ctx.moveTo(3 * dir, -26); ctx.lineTo(9 * dir, -34);
    ctx.stroke();
    // cabeza con gorra
    ctx.fillStyle = '#e0b48c';
    ctx.beginPath();
    ctx.arc(1 * dir, -41, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(1 * dir, -43, 6, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // visera hacia adelante
    ctx.fillRect(1 * dir - (dir > 0 ? 0 : 9), -45, 9, 2.2);
    // cámara frente a la cara
    ctx.fillStyle = '#111';
    ctx.fillRect(9 * dir - 5, -43, 10, 8);
    // lente apuntando al arco
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(14 * dir, -39, 3, 0, Math.PI * 2);
    ctx.fill();
    // flash intermitente
    if (flashing && Math.sin(now / 85 + i * 2.6) > 0.55) {
      const fx = 17 * dir, fy = -40;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 15);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, 15, 0, Math.PI * 2);
      ctx.fill();
      // destello en cruz
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fx - 9, fy); ctx.lineTo(fx + 9, fy);
      ctx.moveTo(fx, fy - 9); ctx.lineTo(fx, fy + 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawZones(clickable, showHover) {
    if (!clickable) return;

    // Al patear ya no mostramos una matriz rígida: se dibuja una única mira libre.
    if (state === 'countdown') return;
    if (state === 'aim') {
      const p = showHover && hoverAim && pointInGoal(hoverAim)
        ? hoverAim
        : (pendingAim && pointInGoal(pendingAim) ? pendingAim : { x: (GOAL_L + GOAL_R) / 2, y: BAR_Y + 105 });
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.12;
      ctx.save();
      const g = ctx.createRadialGradient(p.x, p.y, 3, p.x, p.y, 34 * pulse);
      g.addColorStop(0, 'rgba(255,211,90,.35)');
      g.addColorStop(1, 'rgba(255,211,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, 34 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd35a';
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 14 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x - 25, p.y); ctx.lineTo(p.x - 7, p.y);
      ctx.moveTo(p.x + 7, p.y); ctx.lineTo(p.x + 25, p.y);
      ctx.moveTo(p.x, p.y - 25); ctx.lineTo(p.x, p.y - 7);
      ctx.moveTo(p.x, p.y + 7); ctx.lineTo(p.x, p.y + 25);
      ctx.stroke();
      ctx.fillStyle = '#ffd35a'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }

    // Para atajar (CPU/2P) se mantienen zonas internas, pero visualmente son discretas.
    const pulse = 0.5 + Math.sin(performance.now() / 360) * 0.12;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const p = zoneCenter(c, r);
        const hovered = showHover && hoverZone && hoverZone.c === c && hoverZone.r === r;
        ctx.strokeStyle = hovered ? '#ffd35a' : `rgba(255,255,255,${(0.18 + pulse * 0.06).toFixed(2)})`;
        ctx.lineWidth = hovered ? 2.2 : 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, hovered ? 16 : 9, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  // ---------- Helpers de detalle de jugadores ----------
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function rrPath(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  // extremidad con contorno oscuro para dar definición
  function limb(x1, y1, x2, y2, color, width) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = width + 2.4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function joint(x, y, color, r = 4.3) {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.arc(x, y, r + 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function handDraw(x, y, skin, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.ellipse(0, 0, 4.8, 5.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = .9; ctx.stroke();
    ctx.restore();
  }
  function torsoDraw(colors, x, y, w, h) {
    // camiseta con silueta trapezoidal: hombros más anchos y cintura más estrecha
    const left = x, right = x + w, top = y, bottom = y + h;
    const waistInset = Math.max(2, w * 0.10);
    const g = ctx.createLinearGradient(left, top, right, bottom);
    g.addColorStop(0, shade(colors.shirt, 34));
    g.addColorStop(0.52, colors.shirt);
    g.addColorStop(1, shade(colors.shirt, -34));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left + 3, top + 4);
    ctx.quadraticCurveTo(left + w * .18, top - 3, left + w * .32, top + 1);
    ctx.lineTo(right - w * .32, top + 1);
    ctx.quadraticCurveTo(right - w * .18, top - 3, right - 3, top + 4);
    ctx.lineTo(right - waistInset, bottom - 2);
    ctx.quadraticCurveTo(right - w * .30, bottom + 1, x + w / 2, bottom);
    ctx.quadraticCurveTo(left + w * .30, bottom + 1, left + waistInset, bottom - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.34)';
    ctx.lineWidth = 1.35;
    ctx.stroke();

    // sombreado lateral suave
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.beginPath();
    ctx.moveTo(left + 5, top + 7); ctx.lineTo(left + w * .22, top + 4);
    ctx.lineTo(left + waistInset + 2, bottom - 4); ctx.lineTo(left + 5, bottom - 7); ctx.closePath(); ctx.fill();

    // franja horizontal al medio (uniforme de Curicó Unido)
    if (colors.band) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(left + 1, top + h * .40);
      ctx.lineTo(right - 1, top + h * .40);
      ctx.lineTo(right - waistInset + 1, top + h * .62);
      ctx.lineTo(left + waistInset - 1, top + h * .62);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = colors.band;
      ctx.fillRect(left, top + h * .40, w, h * .22);
      ctx.restore();
    }

    // costuras de hombro y cintura
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = .9;
    ctx.beginPath();
    ctx.moveTo(left + 5, top + 6); ctx.lineTo(left + w * .30, top + 3);
    ctx.moveTo(right - 5, top + 6); ctx.lineTo(right - w * .30, top + 3);
    ctx.moveTo(left + waistInset + 2, bottom - 3); ctx.lineTo(right - waistInset - 2, bottom - 3);
    ctx.stroke();
  }

  function shortsDraw(colors, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, shade(colors.shorts, 26));
    g.addColorStop(1, shade(colors.shorts, -26));
    ctx.fillStyle = g;
    rrPath(x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // franjas laterales
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, y + 2); ctx.lineTo(x + 1.5, y + h - 2);
    ctx.moveTo(x + w - 1.5, y + 2); ctx.lineTo(x + w - 1.5, y + h - 2);
    ctx.stroke();
  }
  function bootDraw(x, y, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir || 1, 1);
    const g = ctx.createLinearGradient(-7, -4, 8, 4);
    g.addColorStop(0, '#303030'); g.addColorStop(1, '#0b0b0b');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-6, -3); ctx.quadraticCurveTo(1, -5, 8, -1);
    ctx.quadraticCurveTo(10, 2, 5, 4); ctx.lineTo(-6, 4);
    ctx.quadraticCurveTo(-9, 1, -6, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(5, 1); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    for (const sx of [-3,1,5]) { ctx.beginPath(); ctx.arc(sx, 4, .8, 0, Math.PI*2); ctx.fill(); }
    ctx.restore();
  }

  function gloveDraw(x, y) {
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
    // dedos
    ctx.beginPath();
    ctx.arc(x - 3.4, y - 4.6, 2.3, 0, Math.PI * 2);
    ctx.arc(x, y - 5.8, 2.3, 0, Math.PI * 2);
    ctx.arc(x + 3.4, y - 4.6, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.stroke();
  }
  function headDraw(x, y, r, colors, view, mood) {
    // cara con volumen (luz desde arriba a la izquierda)
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.25, x, y, r * 1.05);
    g.addColorStop(0, shade(colors.skin, 24));
    g.addColorStop(1, shade(colors.skin, -20));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // orejas
    ctx.fillStyle = shade(colors.skin, -10);
    ctx.beginPath();
    ctx.arc(x - r * 0.98, y + r * 0.05, r * 0.24, 0, Math.PI * 2);
    ctx.arc(x + r * 0.98, y + r * 0.05, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    // pelo
    ctx.fillStyle = colors.hair;
    if (view === 'back') {
      // nuca: el pelo cubre casi toda la cabeza
      ctx.beginPath();
      ctx.arc(x, y, r * 0.99, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.arc(x, y - r * 0.12, r, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    // flequillo
    ctx.beginPath();
    ctx.arc(x - r * 0.45, y - r * 0.62, r * 0.3, 0, Math.PI * 2);
    ctx.arc(x + r * 0.3, y - r * 0.68, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // cejas
    ctx.strokeStyle = colors.hair;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y - r * 0.28); ctx.lineTo(x - r * 0.18, y - r * 0.33);
    ctx.moveTo(x + r * 0.18, y - r * 0.33); ctx.lineTo(x + r * 0.55, y - r * 0.28);
    ctx.stroke();
    // ojos
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.08, r * 0.13, 0, Math.PI * 2);
    ctx.arc(x + r * 0.35, y - r * 0.08, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    // nariz y brillo facial
    ctx.strokeStyle = 'rgba(110,60,30,.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y - r * .02); ctx.lineTo(x - r * .05, y + r * .18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.20)';
    ctx.beginPath(); ctx.arc(x - r * .28, y - r * .30, r * .12, 0, Math.PI * 2); ctx.fill();
    // boca según el ánimo
    ctx.strokeStyle = '#7a3d12';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (mood === 'happy') {
      ctx.arc(x, y + r * 0.22, r * 0.42, 0.15 * Math.PI, 0.85 * Math.PI);
    } else if (mood === 'sad') {
      ctx.arc(x, y + r * 0.75, r * 0.35, 1.2 * Math.PI, 1.8 * Math.PI);
    } else {
      ctx.moveTo(x - r * 0.22, y + r * 0.45);
      ctx.lineTo(x + r * 0.22, y + r * 0.45);
    }
    ctx.stroke();
  }

  function drawKeeper(pose) {
    const { dive, dirX, dirY, colors } = pose;
    const krAge = keeperReaction ? Math.max(0, performance.now() - keeperReaction.t0) : 9999;
    const krActive = keeperReaction && krAge < 1050 && keeperReaction.side === (colors === GK_CURI ? 'user' : 'rival');
    const krSave = krActive && keeperReaction.type === 'save';
    const krBeat = krSave ? Math.sin(Math.min(1, krAge / 760) * Math.PI) : 0;
    // interpola posición desde el centro hacia el objetivo del vuelo (más el amague lateral)
    // block: bloqueo frontal (tiros centrales) — se planta sobre el balón casi sin inclinarse
    const bxMove = pose.block ? 1 : 0.9;
    const sideSign = Math.sign(dirX - KEEPER_BASE.x) || 1;
    const lateralStretch = pose.block ? 0 : dive * dive * 20 * sideSign;
    const bx = KEEPER_BASE.x + (dirX - KEEPER_BASE.x) * dive * bxMove + lateralStretch + (pose.swayX || 0) * (1 - dive);
    const verticalTarget = Math.min(0, (dirY - (KEEPER_BASE.y - 60)));
    const landingDrop = pose.block ? 0 : Math.max(0, dive - 0.62) * 42;
    const by = KEEPER_BASE.y + verticalTarget * dive * 0.58 + landingDrop - krBeat * 6;
    const diveBoost = 0.9 + (pose.diveSpeed || 0.55) * 0.28;
    const supportDx = pose.block ? 0 : Math.sin(Math.min(1, dive) * Math.PI * 0.9) * 4 * sideSign;
    const lean = pose.block
      ? dive * ((dirX - KEEPER_BASE.x) / 115) * 0.3
      : dive * sideSign * 1.22 * diveBoost; // caída más horizontal en la estirada

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(lean);

    // sombra
    ctx.save();
    ctx.rotate(-lean);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // piernas: se modifica la pierna existente al atajar con los pies; nunca se agrega una tercera pierna
    const legSave = pose.saveStyle === 'legs' && dive > 0.45;
    const legSide = legSave ? (Math.sign(dirX - KEEPER_BASE.x) || 1) : 0;
    const lKneeX = -11, lKneeY = -20;
    const rKneeX = 11, rKneeY = -20;
    const lFootX = legSave && legSide < 0 ? -35 : -11;
    const lFootY = legSave && legSide < 0 ? -8 : -6;
    const rFootX = legSave && legSide > 0 ? 35 : 11;
    const rFootY = legSave && legSide > 0 ? -8 : -6;
    limb(-7, -38, lKneeX, lKneeY, shade(colors.skin, -6), 9.5); joint(lKneeX,lKneeY,shade(colors.skin,-6),4.1);
    limb(7, -38, rKneeX, rKneeY, shade(colors.skin, -6), 9.5); joint(rKneeX,rKneeY,shade(colors.skin,-6),4.1);
    limb(lKneeX, lKneeY, lFootX, lFootY, colors.socks || colors.shirt, 8);
    limb(rKneeX, rKneeY, rFootX, rFootY, colors.socks || colors.shirt, 8);
    // vuelta de la media
    ctx.strokeStyle = colors.trim;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -19); ctx.lineTo(-11, -16);
    ctx.moveTo(11, -19); ctx.lineTo(11, -16);
    ctx.stroke();
    bootDraw(lFootX + supportDx * .20, lFootY + 3, -1);
    bootDraw(rFootX, rFootY + 3, 1);
    // shorts con franja lateral
    shortsDraw(colors, -14, -50, 28, 15);
    // torso con volumen (la franja la dibuja torsoDraw)
    torsoDraw(colors, -16, -86, 32, 40);
    // número 1 al pecho
    ctx.fillStyle = colors.trim;
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('1', 0, -74);
    // escudo simple al pecho y cuello
    ctx.fillStyle = colors.trim;
    ctx.beginPath(); ctx.moveTo(-11,-80); ctx.lineTo(-5,-80); ctx.lineTo(-5.5,-73); ctx.lineTo(-8,-70); ctx.lineTo(-10.5,-73); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(colors.skin,-5); rrPath(-5,-91,10,7,3); ctx.fill();
    ctx.fillStyle = colors.trim; rrPath(-7, -88, 14, 4, 2); ctx.fill();
    // brazos: cada lado conserva un único brazo articulado. Las atajadas especiales extienden ese brazo, no crean otro.
    const armUp = Math.min(1.05, 0.6 + dive * (0.34 + (pose.diveSpeed || 0.55) * 0.16) + (krSave ? krBeat * .22 : 0));
    const fistPump = krSave ? Math.sin(Math.min(1, krAge / 520) * Math.PI) * 12 : 0;
    const saveSide = Math.sign(dirX - KEEPER_BASE.x) || 1;
    const extendedSave = dive > 0.4 && (pose.saveStyle === 'onehand' || pose.saveStyle === 'fingertip' || pose.saveStyle === 'parry');
    const ext = extendedSave ? (pose.saveStyle === 'fingertip' ? 17 : pose.saveStyle === 'parry' ? 13 : 10) : 0;
    const lift = extendedSave ? (pose.saveStyle === 'fingertip' ? 7 : 4) : 0;
    const elLx = -14 - 11 * armUp, elLy = -78 - 13 * armUp - fistPump * .28;
    const elRx = 14 + 11 * armUp, elRy = -78 - 13 * armUp - fistPump * .62;
    const haLx = -14 - 24 * armUp - (saveSide < 0 ? ext : 0);
    const haLy = -78 - 28 * armUp - fistPump * .35 - (saveSide < 0 ? lift : 0);
    const haRx = 14 + 24 * armUp + (saveSide > 0 ? ext : 0);
    const haRy = -78 - 28 * armUp - fistPump * .72 - (saveSide > 0 ? lift : 0);
    limb(-14, -78, elLx, elLy, colors.shirt, 9.5); joint(elLx,elLy,shade(colors.skin,-4),4.2);
    limb(14, -78, elRx, elRy, colors.shirt, 9.5); joint(elRx,elRy,shade(colors.skin,-4),4.2);
    limb(elLx, elLy, haLx, haLy, shade(colors.skin, -4), 7.2);
    limb(elRx, elRy, haRx, haRy, shade(colors.skin, -4), 7.2);
    // un guante por brazo
    gloveDraw(haLx, haLy);
    gloveDraw(haRx, haRy);
    if (pose.saveStyle === 'fingertip' && extendedSave) {
      const gx = saveSide > 0 ? haRx : haLx;
      const gy = saveSide > 0 ? haRy : haLy;
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.beginPath(); ctx.arc(gx + saveSide * 5, gy - 1, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    if (pose.saveStyle === 'punch' && dive > 0.35) {
      // resalta el guante que golpea la pelota sin dibujar una mano adicional
      const side = Math.sign(dirX - KEEPER_BASE.x) || 1;
      const px = side > 0 ? haRx : haLx;
      const py = side > 0 ? haRy : haLy;
      ctx.strokeStyle = 'rgba(255,255,255,.72)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 8.5, 0, Math.PI * 2); ctx.stroke();
    }
    if (pose.saveStyle === 'catch' && dive > 0.25) {
      ctx.fillStyle = 'rgba(255,255,255,.13)';
      ctx.beginPath(); ctx.ellipse(0, -70, 24, 18, 0, 0, Math.PI * 2); ctx.fill();
    }
    // cabeza concentrada
    headDraw(0, -97, 11, colors, 'front', 'focus');

    ctx.restore();
  }

  function drawShooter(colors, swing, runProgress = 1, reaction = null, now = 0) {
    // jugador de espaldas junto al balón, con carrera previa y postura más natural
    const rp = Math.max(0, Math.min(1, runProgress));
    const stride = rp < 1 ? Math.sin(rp * Math.PI * 5) : 0;
    const runX = -28 * (1 - rp);
    const runY = 34 * (1 - rp);
    const bob = rp < 1 ? -Math.abs(Math.sin(rp * Math.PI * 5)) * 3 : 0;
    const x = 505 + runX, y = 500 + runY + bob;
    const phase = Math.max(0, Math.min(1, swing || 0));
    const kick = Math.sin(phase * Math.PI) * 1.05;
    const reactAge = reaction ? Math.max(0, now - reaction.t0) : 9999;
    const reacting = reaction && reactAge < 1150;
    const celebrate = reacting && reaction.type === 'goal';
    const frustrate = reacting && reaction.type !== 'goal';
    const reactionP = reacting ? Math.min(1, reactAge / 850) : 0;
    const reactPulse = reacting ? Math.sin(reactionP * Math.PI) : 0;
    const variant = reaction && reaction.variant ? reaction.variant : 'arms';
    const kneeSlide = celebrate && variant === 'knee';
    const runCelebrate = celebrate && variant === 'run';
    const handsHead = frustrate;
    const torsoLean = -kick * .09 + (frustrate ? .12 * reactPulse : 0) + (kneeSlide ? -.10 * reactPulse : 0);
    ctx.save();
    ctx.translate(x + (runCelebrate ? reactPulse * 18 : 0), y + (kneeSlide ? reactPulse * 10 : 0));

    // sombra ovalada con pequeño desplazamiento durante el remate
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(2 + kick * 3, 4, 24, 6.5, -.04, 0, Math.PI * 2); ctx.fill();

    // pierna de apoyo
    const supportDx = rp < 1 ? stride * 7 : (kneeSlide ? reactPulse * 8 : 0);
    limb(-8, -45, -12 + supportDx, -24, shade(colors.skin, -5), 9.5); joint(-12 + supportDx,-24,shade(colors.skin,-5),4.2);
    limb(-12 + supportDx, -24, -11 + supportDx * .45, -7, colors.socks || colors.shirt, 8.5);
    ctx.strokeStyle = colors.trim; ctx.lineWidth = 8.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-11.6,-22); ctx.lineTo(-11.3,-18); ctx.stroke();
    bootDraw(-11, -3, -1);

    // pierna que patea, articulada en cadera y rodilla
    ctx.save();
    ctx.translate(8, -45);
    ctx.rotate(-kick + (rp < 1 ? -stride * .30 : 0) + (kneeSlide ? reactPulse * .42 : 0));
    limb(0, 0, 3, 19, shade(colors.skin, -5), 9.5); joint(3,19,shade(colors.skin,-5),4.1);
    ctx.save(); ctx.translate(3,19); ctx.rotate(kick * .34);
    limb(0, 0, 3, 18, colors.socks || colors.shirt, 8.5);
    ctx.strokeStyle = colors.trim; ctx.lineWidth = 8.5;
    ctx.beginPath(); ctx.moveTo(1,3); ctx.lineTo(1.7,7); ctx.stroke();
    bootDraw(4, 21, 1);
    ctx.restore();
    ctx.restore();

    // cadera y pantalón
    shortsDraw(colors, -16, -59, 32, 18);

    // torso ligeramente inclinado en el golpeo
    ctx.save();
    ctx.translate(0,-58);
    ctx.rotate(torsoLean);
    torsoDraw(colors, -19, -39, 38, 43);

    // cuello y nuca
    ctx.fillStyle = shade(colors.skin, -5); rrPath(-5, -46, 10, 9, 3); ctx.fill();
    ctx.fillStyle = colors.trim; rrPath(-8, -41, 16, 5, 2); ctx.fill();

    // brazos con codos: longitudes anatómicas limitadas durante remate, celebración y frustración
    const armSpread = handsHead ? .46 : Math.min(1.35, 1 + Math.abs(kick) * .30 + (celebrate ? .24 + reactPulse * .10 : 0));
    const armRaise = celebrate ? 12 + reactPulse * 12 : (frustrate ? 12 * reactPulse : 0);
    const lElx = handsHead ? -12 : -26 * armSpread;
    const rElx = handsHead ? 12 : 26 * armSpread;
    const lEly = handsHead ? -42 - reactPulse * 6 : -20 - Math.abs(kick) * 2 - armRaise;
    const rEly = handsHead ? -42 - reactPulse * 6 : -20 + Math.abs(kick) * 2 - armRaise;
    limb(-16,-30,lElx,lEly,colors.shirt,9); joint(lElx,lEly,shade(colors.skin,-3),4);

    let lHandX, lHandY, rHandX, rHandY;
    if (handsHead) {
      lHandX = -7; lHandY = -50;
      rHandX = 7;  rHandY = -50;
    } else if (celebrate) {
      // las manos acompañan al codo hacia arriba; evita antebrazos que crucen medio cuerpo
      const runDrop = runCelebrate ? 8 : 0;
      lHandX = lElx - 10; lHandY = lEly - 16 + runDrop;
      rHandX = rElx + 10; rHandY = rEly - 16 + runDrop;
    } else {
      lHandX = lElx - 5; lHandY = lEly + 17;
      rHandX = rElx + 5; rHandY = rEly + 17;
    }
    limb(lElx,lEly,lHandX,lHandY,shade(colors.skin,-3),7);
    handDraw(lHandX,lHandY+2,colors.skin,-.2);
    limb(16,-30,rElx,rEly,colors.shirt,9); joint(rElx,rEly,shade(colors.skin,-3),4);
    limb(rElx,rEly,rHandX,rHandY,shade(colors.skin,-3),7);
    handDraw(rHandX,rHandY+2,colors.skin,.2);

    // espalda: nombre, dorsal y pequeñas costuras
    ctx.fillStyle = colors.trim; ctx.textAlign = 'center';
    ctx.font = 'bold 8.5px Arial'; ctx.fillText(colors.name || '', 0, -28);
    ctx.font = '900 20px Arial'; ctx.lineWidth = 2.8; ctx.strokeStyle = colors.shirt;
    ctx.strokeText(String(shooterNum), 0, -8); ctx.fillText(String(shooterNum), 0, -8);
    ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(-12,-35); ctx.lineTo(12,-35); ctx.stroke();

    // cabeza y pelo
    headDraw(0, -51 + (celebrate ? -2 : frustrate ? 2 : 0), 12.5, colors, 'back');
    ctx.restore();
    ctx.restore();
  }

  function drawWinnerPlayer(x, y, colors, now) {
    const jump = -Math.abs(Math.sin(now / 260)) * 34;
    ctx.save();
    ctx.translate(x, y);
    // sombra en el piso (se achica cuando está en el aire)
    const air = -jump / 34;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 20 - air * 6, 6 - air * 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, jump);
    // piernas que se flectan levemente en el aire
    const bend = air * 5;
    limb(-7, -40, -9, -22, shade(colors.skin, -6), 9);
    limb(7, -40, 9, -22, shade(colors.skin, -6), 9);
    limb(-9, -22, -9, -6 - bend, colors.socks || colors.shirt, 8);
    limb(9, -22, 9, -6 - bend, colors.socks || colors.shirt, 8);
    bootDraw(-9, -3 - bend, -1);
    bootDraw(9, -3 - bend, 1);
    // shorts y torso con volumen
    shortsDraw(colors, -14, -52, 28, 14);
    torsoDraw(colors, -16, -88, 32, 38);
    // escudo al pecho
    ctx.fillStyle = colors.trim;
    ctx.beginPath();
    ctx.moveTo(-9, -80); ctx.lineTo(-2, -80); ctx.lineTo(-2.5, -73);
    ctx.lineTo(-5.5, -70); ctx.lineTo(-8.5, -73);
    ctx.closePath();
    ctx.fill();
    // cuello
    ctx.fillStyle = colors.trim;
    rrPath(-6, -90, 12, 4, 2);
    ctx.fill();
    // brazos en V: manga + antebrazo + manos
    limb(-14, -82, -21, -96, colors.shirt, 8);
    limb(14, -82, 21, -96, colors.shirt, 8);
    limb(-21, -96, -28, -112, shade(colors.skin, -4), 6.5);
    limb(21, -96, 28, -112, shade(colors.skin, -4), 6.5);
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.arc(-29, -114, 4.8, 0, Math.PI * 2);
    ctx.arc(29, -114, 4.8, 0, Math.PI * 2);
    ctx.fill();
    // cabeza feliz
    headDraw(0, -100, 11, colors, 'front', 'happy');
    ctx.restore();
  }


  function drawRunningCelebrator(x, y, colors, now, dir = 1) {
    const run = Math.sin(now / 120 + x * 0.01);
    const hop = Math.abs(Math.sin(now / 210 + x * 0.02)) * 10;
    ctx.save();
    ctx.translate(x + run * 10 * dir, y - hop);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(0, 5, 18, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(dir * 0.05);
    limb(-7, -40, -12 + run * 5, -20, shade(colors.skin, -6), 8.5);
    limb(7, -40, 10 - run * 5, -20, shade(colors.skin, -6), 8.5);
    limb(-12 + run * 5, -20, -15 + run * 7, -4, colors.socks || colors.shirt, 7.5);
    limb(10 - run * 5, -20, 12 - run * 7, -4, colors.socks || colors.shirt, 7.5);
    bootDraw(-15 + run * 7, -1, -1);
    bootDraw(12 - run * 7, -1, 1);
    shortsDraw(colors, -13, -50, 26, 13);
    ctx.save();
    ctx.translate(0, -49);
    ctx.rotate(-dir * 0.12);
    torsoDraw(colors, -16, -34, 32, 36);
    limb(-13, -27, -26 - run * 4, -40, colors.shirt, 8);
    limb(13, -27, 20 + run * 4, -44, colors.shirt, 8);
    limb(-26 - run * 4, -40, -31 - run * 4, -54, shade(colors.skin, -4), 6);
    limb(20 + run * 4, -44, 26 + run * 4, -57, shade(colors.skin, -4), 6);
    ctx.fillStyle = colors.skin;
    ctx.beginPath(); ctx.arc(-32 - run * 4, -56, 4.5, 0, Math.PI * 2); ctx.arc(27 + run * 4, -59, 4.5, 0, Math.PI * 2); ctx.fill();
    headDraw(0, -43, 10.5, colors, 'front', 'happy');
    ctx.restore();
    ctx.restore();
  }

  function drawHugPair(x, y, colorsA, colorsB, now) {
    const sway = Math.sin(now / 240 + x * 0.01) * 4;
    function drawMate(dx, colors, mirror = 1) {
      ctx.save();
      ctx.translate(x + dx + sway * mirror * 0.3, y + Math.abs(Math.sin(now / 270 + dx)) * -6);
      ctx.rotate(mirror * 0.13);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.beginPath(); ctx.ellipse(0, 5, 18, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      limb(-7, -38, -10, -20, shade(colors.skin, -6), 8);
      limb(7, -38, 9, -20, shade(colors.skin, -6), 8);
      limb(-10, -20, -10, -4, colors.socks || colors.shirt, 7.5);
      limb(9, -20, 9, -4, colors.socks || colors.shirt, 7.5);
      bootDraw(-10, -1, -1); bootDraw(9, -1, 1);
      shortsDraw(colors, -12, -47, 24, 12);
      torsoDraw(colors, -15, -82, 30, 36);
      limb(-12, -74, -22 * mirror, -62, colors.shirt, 7.5);
      limb(-22 * mirror, -62, -11 * mirror, -48, shade(colors.skin, -4), 6);
      limb(12, -74, 8 * mirror, -58, colors.shirt, 7.5);
      limb(8 * mirror, -58, 3 * mirror, -47, shade(colors.skin, -4), 6);
      ctx.fillStyle = colors.skin;
      ctx.beginPath(); ctx.arc(-12 * mirror, -46, 4.5, 0, Math.PI * 2); ctx.arc(2 * mirror, -45, 4.5, 0, Math.PI * 2); ctx.fill();
      headDraw(0, -93, 10.5, colors, 'front', 'happy');
      ctx.restore();
    }
    drawMate(-17, colorsA, 1);
    drawMate(17, colorsB, -1);
  }

  function drawCupLifter(x, y, colors, now) {
    const hop = Math.abs(Math.sin(now / 250)) * 8;
    const armLift = 16 + Math.sin(now / 220) * 2;
    ctx.save();
    ctx.translate(x, y - hop);
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(0, 5, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
    limb(-8, -40, -10, -18, shade(colors.skin, -6), 9);
    limb(8, -40, 10, -18, shade(colors.skin, -6), 9);
    limb(-10, -18, -10, -3, colors.socks || colors.shirt, 8);
    limb(10, -18, 10, -3, colors.socks || colors.shirt, 8);
    bootDraw(-10, 0, -1); bootDraw(10, 0, 1);
    shortsDraw(colors, -14, -51, 28, 14);
    torsoDraw(colors, -17, -90, 34, 40);
    limb(-14, -82, -18, -98 - armLift, colors.shirt, 8.5);
    limb(14, -82, 18, -98 - armLift, colors.shirt, 8.5);
    limb(-18, -98 - armLift, -22, -113 - armLift, shade(colors.skin, -4), 6.5);
    limb(18, -98 - armLift, 22, -113 - armLift, shade(colors.skin, -4), 6.5);
    ctx.fillStyle = colors.skin;
    ctx.beginPath(); ctx.arc(-22, -114 - armLift, 4.8, 0, Math.PI * 2); ctx.arc(22, -114 - armLift, 4.8, 0, Math.PI * 2); ctx.fill();
    headDraw(0, -101, 11.5, colors, 'front', 'happy');

    const glow = ctx.createRadialGradient(0, -164 - armLift, 8, 0, -164 - armLift, 58);
    glow.addColorStop(0, 'rgba(255,224,102,.34)');
    glow.addColorStop(1, 'rgba(255,224,102,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-70, -225 - armLift, 140, 140);
    drawTrophy(0, -124 - armLift, .92, now);
    ctx.restore();
  }

  function drawLoserPlayer(x, y, colors) {
    ctx.save();
    ctx.translate(x, y);
    // sombra
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // piernas en cuclillas: muslo, rodilla y canilla con media
    limb(-8, -26, -15, -16, shade(colors.skin, -6), 8);
    limb(8, -26, 15, -16, shade(colors.skin, -6), 8);
    limb(-15, -16, -13, -4, colors.socks || colors.shirt, 7);
    limb(15, -16, 13, -4, colors.socks || colors.shirt, 7);
    bootDraw(-13, -2, -1);
    bootDraw(13, -2, 1);
    // shorts
    shortsDraw(colors, -12, -34, 24, 10);
    // torso encorvado hacia adelante, cabeza gacha y brazos colgando
    ctx.save();
    ctx.translate(0, -34);
    ctx.rotate(0.5);
    torsoDraw(colors, -12, -28, 24, 28);
    ctx.fillStyle = colors.trim;
    ctx.fillRect(-12, -28, 24, 4);
    // brazos caídos: manga + antebrazo + manos
    limb(-10, -20, -14, -6, colors.shirt, 7);
    limb(10, -20, 12, -6, colors.shirt, 7);
    limb(-14, -6, -16, 4, shade(colors.skin, -4), 6);
    limb(12, -6, 14, 4, shade(colors.skin, -4), 6);
    ctx.fillStyle = colors.skin;
    ctx.beginPath();
    ctx.arc(-17, 7, 4.5, 0, Math.PI * 2);
    ctx.arc(15, 7, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // cabeza gacha con gesto triste
    headDraw(0, -34, 10, colors, 'front', 'sad');
    ctx.restore();
    ctx.restore();
  }

  function computeBestShooter() {
    const list = mode === '2p' ? teamUsers.user : teamUsers.cpu;
    const fallback = (list && list[0]) ? list[0] : { number: 10, name: 'Jugador destacado', role: 'DEL' };
    const best = list.reduce((acc, p) => {
      const goals = Number(p.goalsScored || 0);
      const order = Number.isFinite(p.orderIndex) ? p.orderIndex : 99;
      if (!acc) return { p, goals, order };
      if (goals > acc.goals) return { p, goals, order };
      if (goals === acc.goals && order < acc.order) return { p, goals, order };
      return acc;
    }, null);
    const player = best ? best.p : fallback;
    return { number: player.number, name: player.name, goals: best ? best.goals : 0 };
  }

  function cupMatchSummary() {
    const gu = game.user.filter(x => x === 'goal').length;
    const gc = game.cpu.filter(x => x === 'goal').length;
    const attempts = Math.max(1, game.user.length);
    const eff = Math.round((gu / attempts) * 100);
    const byPlayer = {};
    stats.userShots.forEach(s => {
      const key = `${s.number || ''}|${s.player || 'Pateador'}`;
      if (!byPlayer[key]) byPlayer[key] = { name: s.player || 'Pateador', number: s.number || '', goals: 0, shots: 0 };
      byPlayer[key].shots++;
      if (s.result === 'goal') byPlayer[key].goals++;
    });
    const best = Object.values(byPlayer).sort((a,b)=>b.goals-a.goals || a.shots-b.shots)[0] || {name:'Curicó Unido', number:'', goals:gu};
    return { gu, gc, eff, saves: stats.gkSaves, misses: stats.userMisses, best };
  }

  function drawTrophy(x, y, scale = 1, now = 0) {
    ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
    const bob = Math.sin(now/260)*2;
    ctx.translate(0,bob);
    const gold = ctx.createLinearGradient(-28,-70,28,20);
    gold.addColorStop(0,'#fff0a3'); gold.addColorStop(.45,'#f7c843'); gold.addColorStop(1,'#b47709');
    ctx.fillStyle=gold;
    ctx.beginPath(); ctx.moveTo(-26,-62); ctx.quadraticCurveTo(-24,-20,-8,-8); ctx.lineTo(8,-8); ctx.quadraticCurveTo(24,-20,26,-62); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#8b5b08'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.arc(-29,-42,18,Math.PI*.55,Math.PI*1.45); ctx.arc(29,-42,18,Math.PI*1.55,Math.PI*.45); ctx.stroke();
    ctx.fillStyle='#d89e20'; ctx.fillRect(-5,-8,10,27); ctx.fillRect(-19,18,38,8); ctx.fillStyle='#f7c843'; ctx.fillRect(-25,26,50,10);
    ctx.fillStyle='#8b1111'; ctx.font='900 9px Arial'; ctx.textAlign='center'; ctx.fillText('CAMPEÓN',0,-37);
    ctx.restore();
  }

  function fitFontPx(text, maxWidth, startPx, minPx = 12, weight = '900', family = 'Arial') {
    let size = startPx;
    for (; size > minPx; size--) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
    }
    return size;
  }

  function drawCupPostMatch(now) {
    if (!cupPostMatch || mode !== 'copa' || !game.over || game.winner !== 'user') return;
    const s = cupPostMatch.summary;
    ctx.save();
    ctx.fillStyle = 'rgba(2,7,14,.26)';
    ctx.fillRect(0, 0, W, H);

    const scoreText = `${LOCAL_NAME} ${s.gu} - ${s.gc} ${rivalName}`;
    const figureText = `FIGURA · #${s.best.number} ${s.best.name} · ${s.best.goals} gol(es)`;
    const next = COPA[copaStage + 1];

    function sidePanel(x, y, w, h, accent, title) {
      ctx.fillStyle = 'rgba(5,13,24,.92)'; rrPath(x, y, w, h, 18); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; rrPath(x, y, w, h, 18); ctx.stroke();
      const chipW = Math.min(w - 24, Math.max(124, Math.min(176, title.length * 8.6)));
      ctx.fillStyle = accent; rrPath(x + 12, y + 12, chipW, 24, 10); ctx.fill();
      ctx.fillStyle = '#09131f'; ctx.font = '900 11px Arial'; ctx.textAlign = 'center';
      ctx.fillText(title, x + 12 + chipW / 2, y + 28);
      ctx.textAlign = 'left';
    }

    function statRow(x, y, w, h, label, value) {
      ctx.fillStyle = 'rgba(255,255,255,.06)'; rrPath(x, y, w, h, 10); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; rrPath(x, y, w, h, 10); ctx.stroke();
      ctx.fillStyle = '#8fa8c0'; ctx.font = '900 10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 14, y + h / 2 + 1);
      ctx.fillStyle = '#fff'; ctx.font = '900 16px Arial'; ctx.textAlign = 'right';
      ctx.fillText(value, x + w - 14, y + h / 2 + 1);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }


    function beginPanelClip(x, y, w, h, inset = 8) {
      ctx.save();
      rrPath(x + inset, y + inset, w - inset * 2, h - inset * 2, 12);
      ctx.clip();
    }

    function endPanelClip() {
      ctx.restore();
    }

    if (cupPostMatch.final) {
      const glow = ctx.createRadialGradient(W / 2, 108, 30, W / 2, 108, 220);
      glow.addColorStop(0, 'rgba(255,215,102,.18)');
      glow.addColorStop(1, 'rgba(255,215,102,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(W / 2 - 240, 0, 480, 240);

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(14,24,35,.92)'; rrPath(W / 2 - 120, 40, 240, 28, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; rrPath(W / 2 - 120, 40, 240, 28, 14); ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.font = '900 12px Arial'; ctx.fillText('🏆 EDICIÓN HISTÓRICA', W / 2, 58);
      ctx.fillStyle = '#ffd166'; ctx.font = '900 34px Arial'; ctx.fillText('CAMPEÓN DE LA COPA', W / 2, 100);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 25px Arial'; ctx.fillText(LOCAL_NAME, W / 2, 132);
      ctx.fillStyle = '#dbe8f5'; ctx.font = 'bold 13px Arial'; ctx.fillText(`Final ganada ante ${rivalName}`, W / 2, 154);

      drawTrophy(W / 2, 255, 1.45, now);

      // panel izquierdo: resultado bien legible en varias líneas
      const lx = 26, ly = 248, lw = 270, lh = 150;
      sidePanel(lx, ly, lw, lh, '#ffd166', 'RESUMEN DE LA FINAL');
      beginPanelClip(lx, ly, lw, lh, 10);
      ctx.fillStyle = '#9ab2c8'; ctx.font = '900 10px Arial'; ctx.fillText('RESULTADO', lx + 16, ly + 52);
      let nameSize = fitFontPx(LOCAL_NAME, lw - 32, 18, 12);
      ctx.fillStyle = '#ffffff'; ctx.font = `900 ${nameSize}px Arial`; ctx.fillText(LOCAL_NAME, lx + 16, ly + 80);
      ctx.fillStyle = '#ffd166'; ctx.font = '900 24px Arial'; ctx.fillText(`${s.gu} - ${s.gc}`, lx + 16, ly + 104);
      nameSize = fitFontPx(rivalName, lw - 32, 18, 12);
      ctx.fillStyle = '#ffffff'; ctx.font = `900 ${nameSize}px Arial`; ctx.fillText(rivalName, lx + 16, ly + 126);
      ctx.fillStyle = '#ffd166';
      const figSize = fitFontPx(figureText, lw - 32, 11, 8);
      ctx.font = `900 ${figSize}px Arial`; ctx.fillText(figureText, lx + 16, ly + 144);
      endPanelClip();

      // panel derecho: estadísticas ordenadas y alineadas
      const rx = W - 26 - 220, ry = 248, rw = 220, rh = 150;
      sidePanel(rx, ry, rw, rh, '#2ecc71', 'ESTADÍSTICAS');
      beginPanelClip(rx, ry, rw, rh, 10);
      statRow(rx + 14, ry + 46, rw - 28, 24, 'EFECTIVIDAD', `${s.eff}%`);
      statRow(rx + 14, ry + 76, rw - 28, 24, 'ATAJADAS', `${s.saves}`);
      statRow(rx + 14, ry + 106, rw - 28, 24, 'FALLOS', `${s.misses}`);
      endPanelClip();

      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(6,15,27,.84)'; rrPath(W / 2 - 148, H - 138, 296, 36, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; rrPath(W / 2 - 148, H - 138, 296, 36, 16); ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.font = '900 14px Arial'; ctx.fillText('LA COPA SE QUEDA EN LA GRANJA', W / 2, H - 115);
      ctx.textAlign = 'left';
    } else {
      // avance de ronda: paneles laterales con resultado en varias líneas para evitar desbordes
      const lx = 24, ly = 246, lw = 274, lh = 154;
      const rx = W - 24 - 234, ry = 246, rw = 234, rh = 154;
      sidePanel(lx, ly, lw, lh, '#2ecc71', `${COPA[copaStage].round.toUpperCase()} SUPERADA`);
      beginPanelClip(lx, ly, lw, lh, 10);
      ctx.fillStyle = '#ffffff'; ctx.font = '900 18px Arial'; ctx.fillText('CURICÓ AVANZA', lx + 16, ly + 54);
      const elimText = `${LOCAL_NAME} eliminó a ${rivalName}.`;
      const elimSize = fitFontPx(elimText, lw - 32, 11, 8, 'bold');
      ctx.fillStyle = '#9ab2c8'; ctx.font = `bold ${elimSize}px Arial`; ctx.fillText(elimText, lx + 16, ly + 72);
      ctx.fillStyle = '#dce8f5'; ctx.font = '900 10px Arial'; ctx.fillText('RESULTADO DE LA TANDA', lx + 16, ly + 90);
      const scoreTop = `${LOCAL_NAME} ${s.gu} - ${s.gc}`;
      const scoreTopSize = fitFontPx(scoreTop, lw - 32, 17, 11);
      ctx.fillStyle = '#ffffff'; ctx.font = `900 ${scoreTopSize}px Arial`; ctx.fillText(scoreTop, lx + 16, ly + 112);
      const rivalLineSize = fitFontPx(rivalName, lw - 32, 17, 11);
      ctx.fillStyle = '#ffffff'; ctx.font = `900 ${rivalLineSize}px Arial`; ctx.fillText(rivalName, lx + 16, ly + 130);
      ctx.fillStyle = '#ffd166';
      const fig2Size = fitFontPx(figureText, lw - 32, 10, 7);
      ctx.font = `900 ${fig2Size}px Arial`; ctx.fillText(figureText, lx + 16, ly + 145);
      endPanelClip();

      sidePanel(rx, ry, rw, rh, '#ffd166', 'PRÓXIMO PARTIDO');
      beginPanelClip(rx, ry, rw, rh, 10);
      if (next) {
        ctx.fillStyle = '#ffffff'; ctx.font = '900 18px Arial'; ctx.fillText(next.round.toUpperCase(), rx + 16, ry + 56);
        ctx.fillStyle = '#9ab2c8'; ctx.font = 'bold 11px Arial'; ctx.fillText('Rival confirmado', rx + 16, ry + 73);
        const nextSize = fitFontPx(next.name, rw - 32, 19, 12);
        ctx.fillStyle = '#ffffff'; ctx.font = `900 ${nextSize}px Arial`; ctx.fillText(next.name, rx + 16, ry + 98);
      }
      const stats = [
        ['EFECT.', `${s.eff}%`],
        ['ATAJ.', `${s.saves}`],
        ['FALLOS', `${s.misses}`]
      ];
      stats.forEach((st, i) => {
        const sy = ry + 119;
        const sw = 60, sh = 20, sx = rx + 13 + i * 68;
        ctx.fillStyle = 'rgba(255,255,255,.06)'; rrPath(sx, sy, sw, sh, 8); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.08)'; rrPath(sx, sy, sw, sh, 8); ctx.stroke();
        ctx.fillStyle = '#8fa8c0'; ctx.font = '900 8px Arial'; ctx.textAlign = 'center'; ctx.fillText(st[0], sx + sw/2, sy + 8);
        ctx.fillStyle = '#fff'; ctx.font = '900 10px Arial'; ctx.fillText(st[1], sx + sw/2, sy + 17);
      });
      endPanelClip();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(7,18,31,.88)'; rrPath(W / 2 - 142, 184, 284, 34, 16); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.10)'; rrPath(W / 2 - 142, 184, 284, 34, 16); ctx.stroke();
      ctx.fillStyle = '#dbe8f5'; ctx.font = '900 14px Arial';
      ctx.fillText(`SIGUIENTE PARADA: ${next ? next.round.toUpperCase() : 'LA COPA'}`, W / 2, 205);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawCelebration(now) {
    const winColors = game.winner === 'user' ? CURI : rivalKit;
    const loseColors = game.winner === 'user' ? rivalKit : CURI;
    const finalChampion = mode === 'copa' && copaStage === COPA.length - 1 && game.winner === 'user';
    if (finalChampion) {
      drawRunningCelebrator(W * 0.24, H - 34, CURI, now, 1);
      drawHugPair(W * 0.36, H - 38, CURI, CURI, now + 80);
      drawCupLifter(W * 0.50, H - 24, CURI, now);
      drawHugPair(W * 0.64, H - 38, CURI, CURI, now + 160);
      drawRunningCelebrator(W * 0.76, H - 34, CURI, now + 120, -1);
    } else if (game.winner === 'user') {
      drawRunningCelebrator(W * 0.34, H - 30, winColors, now, 1);
      drawHugPair(W * 0.49, H - 36, winColors, winColors, now + 90);
      drawWinnerPlayer(W * 0.66, H - 18, winColors, now + 180);
      drawLoserPlayer(W * 0.81, H - 28, loseColors);
    } else {
      drawLoserPlayer(W * 0.27, H - 28, loseColors);
      drawRunningCelebrator(W * 0.50, H - 28, winColors, now, 1);
      drawHugPair(W * 0.66, H - 36, winColors, winColors, now + 90);
      drawWinnerPlayer(W * 0.80, H - 18, winColors, now + 180);
    }
  }

  function drawBall(x, y, scale, rot, squash = 0) {
    ctx.save();
    ctx.translate(x, y);

    // sombra separada de la pelota para reforzar profundidad
    ctx.save();
    const shadowStretch = 1 + Math.abs(squash) * .7;
    ctx.scale(scale * shadowStretch, scale * .75);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(2, 15, 10, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // leve deformación al impacto
    const sx = 1 + Math.max(0, squash) * .18;
    const sy = 1 - Math.max(0, squash) * .14;
    ctx.scale(scale * sx, scale * sy);
    ctx.rotate(rot || 0);

    // volumen con degradado radial
    const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(.58, '#f4f4f4');
    g.addColorStop(1, '#cfd3d6');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#7d858b'; ctx.lineWidth = 1; ctx.stroke();

    // panel central pentagonal aproximado
    ctx.fillStyle = '#1e2226';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI/2 + i * Math.PI * 2/5;
      const px = Math.cos(a) * 4.1, py = Math.sin(a) * 4.1;
      if (i === 0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.fill();

    // parches periféricos y costuras
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + 0.28;
      const cx = Math.cos(a) * 8.1, cy = Math.sin(a) * 8.1;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(a);
      ctx.fillStyle = '#25292d';
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const aa = -Math.PI/2 + k * Math.PI * 2/5;
        const px = Math.cos(aa) * 2.15, py = Math.sin(aa) * 2.15;
        if (k === 0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(70,78,84,.45)'; ctx.lineWidth = .7;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*4.4, Math.sin(a)*4.4); ctx.lineTo(Math.cos(a)*6.2, Math.sin(a)*6.2); ctx.stroke();
    }

    // brillo especular
    ctx.fillStyle = 'rgba(255,255,255,.52)';
    ctx.beginPath(); ctx.ellipse(-3.6, -4.4, 2.5, 1.5, -.55, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ---------- Utilidades de azar ----------
  function pickWeighted(weights) {
    let r = Math.random(), acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i];
      if (r <= acc) return i;
    }
    return weights.length - 1;
  }

  // ---------- Confeti y serpentinas ----------
  let party = null;

  function startParty(colors) {
    const confetti = [];
    for (let i = 0; i < 130; i++) {
      confetti.push({
        x: Math.random() * W,
        y: -Math.random() * H,
        w: 6 + Math.random() * 5,
        h: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 1.2 + Math.random() * 2.2,
        sway: 20 + Math.random() * 30,
        phase: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * 0.15,
        angle: Math.random() * Math.PI
      });
    }
    const streamers = [];
    for (let i = 0; i < 14; i++) {
      streamers.push({
        x: Math.random() * W,
        y: -Math.random() * H * 1.5,
        len: 90 + Math.random() * 70,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 0.8 + Math.random() * 1.2,
        amp: 10 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        freq: 0.05 + Math.random() * 0.04
      });
    }
    party = { confetti, streamers, last: null };
  }

  function drawParty(now) {
    if (!party) return;
    if (party.last == null) party.last = now;
    const dt = Math.min(40, now - party.last) / 16.7;
    party.last = now;

    // confeti: rectángulos que giran y se balancean al caer
    for (const p of party.confetti) {
      p.y += p.vy * dt;
      p.phase += 0.03 * dt;
      p.angle += p.spin * dt;
      const x = p.x + Math.sin(p.phase) * p.sway * 0.3;
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(1, Math.abs(Math.sin(p.phase * 1.7)) * 0.7 + 0.3);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    // serpentinas: cintas onduladas que caen lentamente
    for (const s of party.streamers) {
      s.y += s.vy * dt;
      s.phase += 0.05 * dt;
      if (s.y - s.len > H + 30) { s.y = -30; s.x = Math.random() * W; }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= s.len; i += 6) {
        const yy = s.y - i;
        const xx = s.x + Math.sin(yy * s.freq + s.phase) * s.amp;
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }
  }

  // ---------- Presentación previa a la tanda ----------
  let presT0 = 0, presAfter = null, presTimer = null;
  let rivalCrest = null; // ruta opcional a la imagen del escudo rival

  function startPresentation(afterFn) {
    state = 'presentation';
    presT0 = performance.now();
    presAfter = typeof afterFn === 'function' ? afterFn : startUserTurn;
    if (presTimer) clearTimeout(presTimer);
    // Watchdog: la presentación jamás debe bloquear el partido aunque una animación se detenga.
    presTimer = setTimeout(() => {
      if (state === 'presentation') finishPresentation();
    }, 7200);
    shooterSwing = 0;
    keeperPose = { dive: 0, dirX: KEEPER_BASE.x, dirY: KEEPER_BASE.y - 60, colors: rivalGk };
    crowdLevel(0.05, 1.5);
    say(`Bienvenidos al Estadio La Granja. ${LOCAL_NAME} y ${rivalName} definen desde el punto penal.`, { rate: 1.02 });
    setInstruction('🎬 Presentación del duelo — <b>toca o haz clic para continuar</b>.');
    updateBroadcastHud();
  }

  function finishPresentation() {
    if (state !== 'presentation') return;
    if (presTimer) { clearTimeout(presTimer); presTimer = null; }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    const fn = presAfter;
    presAfter = null;
    state = 'idle';
    // Dejar que el navegador pinte el cambio de estado antes de abrir la siguiente UI.
    requestAnimationFrame(() => {
      try { (typeof fn === 'function' ? fn : startUserTurn)(); }
      catch (err) {
        console.error('Error al continuar después de la presentación:', err);
        state = 'idle';
        startUserTurn();
      }
    });
  }

  // escudos: usa la imagen del equipo si existe (campo `crest` en teams.js); si no, dibuja uno vectorial
  const crestCache = {};
  function crestImage(src) {
    if (!src) return null;
    if (!crestCache[src]) {
      const im = new Image();
      im.src = src;
      crestCache[src] = im;
    }
    const im = crestCache[src];
    return im.complete && im.naturalWidth ? im : null;
  }

  function drawCrest(cx, cy, scale, kit, label, opts = {}) {
    function shieldPath(w, hBot) {
      ctx.beginPath();
      ctx.moveTo(-w, -66);
      ctx.lineTo(w, -66);
      ctx.lineTo(w, 18);
      ctx.quadraticCurveTo(w, hBot - 18, 0, hBot);
      ctx.quadraticCurveTo(-w, hBot - 18, -w, 18);
      ctx.closePath();
    }
    const img = crestImage(opts.crest);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    if (img) {
      // encaja la imagen en la caja del escudo conservando su proporción
      const r = Math.min(130 / img.naturalWidth, 156 / img.naturalHeight);
      const w = img.naturalWidth * r, h = img.naturalHeight * r;
      ctx.drawImage(img, -w / 2, -h / 2 - 4, w, h);
      ctx.restore();
      return;
    }
    // corona amarilla (equipo local, como el escudo curicano)
    if (opts.crown) {
      ctx.fillStyle = '#f4c714';
      for (let i = -2; i <= 2; i++) {
        ctx.save();
        ctx.rotate(i * 0.22);
        ctx.fillRect(-9, -94, 18, 16);
        ctx.restore();
      }
      ctx.fillRect(-52, -80, 104, 9);
    }
    // borde del escudo
    shieldPath(58, 72);
    ctx.fillStyle = opts.crown ? '#f4c714' : kit.trim;
    ctx.fill();
    // interior con franjas verticales en los colores del club
    ctx.save();
    shieldPath(50, 64);
    ctx.clip();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 === 0 ? kit.shirt : kit.trim;
      ctx.fillRect(-50 + i * 10, -70, 10, 140);
    }
    // banda blanca con el nombre
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(-50, -58, 100, 22);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-50, -58, 100, 22);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -43);
    // balón al centro
    drawBall(0, 12, 1.6);
    ctx.restore();
    // contorno
    shieldPath(58, 72);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawPresentation(now) {
    const t = (now - presT0) / 1000;
    const easeOut = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

    // telón oscuro sobre el estadio
    ctx.fillStyle = 'rgba(3, 8, 18, .72)';
    ctx.fillRect(0, 0, W, H);

    // Fase 1: bienvenida
    if (t < 1.9) {
      const a = t < 0.4 ? t / 0.4 : t > 1.5 ? Math.max(0, (1.9 - t) / 0.4) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 42px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('ESTADIO LA GRANJA', W / 2, 245);
      ctx.fillStyle = '#cfe0f2';
      ctx.font = 'italic 20px Georgia';
      ctx.fillText(
        mode === 'copa' ? COPA[copaStage].round + ' de la Copa' :
        mode === '2p' ? 'Duelo mano a mano' : 'Noche de definición por penales',
        W / 2, 285);
      ctx.globalAlpha = 1;
    }

    // Fase 2: los escudos entran desde los costados
    if (t >= 1.9 && t < 5.3) {
      const p = easeOut((t - 1.9) / 0.7);
      const lx = -160 + 410 * p;
      const rx = W + 160 - 410 * p;
      drawCrest(lx, 260, 1.15, CURI, LOCAL_NAME, { crown: true, crest: TEAMS.local.crest });
      drawCrest(rx, 260, 1.15, rivalKit, rivalName, { crest: rivalCrest });
      if (p > 0.9) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(LOCAL_NAME, 250, 385);
        ctx.fillText(rivalName, W - 250, 385);
      }
      // VS pulsante al centro
      if (t > 2.7) {
        const pulse = 1 + Math.sin((t - 2.7) * 6) * 0.08;
        ctx.save();
        ctx.translate(W / 2, 262);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#e4231f';
        ctx.font = 'bold 64px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('VS', 0, 22);
        ctx.restore();
      }
    }

    // Fase 3: anuncio de la tanda
    if (t >= 5.3) {
      const p = easeOut((t - 5.3) / 0.5);
      ctx.save();
      ctx.translate(W / 2, 280);
      ctx.scale(0.5 + p * 0.5, 0.5 + p * 0.5);
      ctx.globalAlpha = p;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 56px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('¡TANDA DE PENALES!', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if (t >= 6.8) finishPresentation();
  }

  function drawStatChip(x, y, label, value) {
    ctx.fillStyle = 'rgba(7,18,31,.84)';
    rrPath(x, y, 104, 24, 8); ctx.fill();
    ctx.fillStyle = '#8ea8c2'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 10);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
    ctx.fillText(String(value), x + 95, y + 17);
  }

  function drawTvStatBar(x, y, w, label, value, accent) {
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    const rowH = 20;
    const barX = x + 58;
    const barW = Math.max(56, w - 84);
    ctx.fillStyle = 'rgba(8,18,31,.88)';
    rrPath(x, y, w, rowH, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    rrPath(barX, y + 7, barW, 6, 3); ctx.fill();
    ctx.fillStyle = accent;
    rrPath(barX, y + 7, Math.max(8, barW * clamped / 100), 6, 3); ctx.fill();
    ctx.fillStyle = '#c7d6e7'; ctx.font = 'bold 7px Arial'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 8, y + 13);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'right';
    ctx.fillText(String(clamped), x + w - 8, y + 14);
  }

  function drawTvDuelPanel(x, y, w, h, side, roleLabel, accent, name, statRows) {
    const headerH = 26;
    const nameGap = 28;
    const statGap = 22;
    const panelH = Math.max(h || 0, headerH + nameGap + 8 + statRows.length * statGap + 12);

    // outer panel
    ctx.fillStyle = 'rgba(6,14,26,.78)';
    rrPath(x, y, w, panelH, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.13)'; ctx.lineWidth = 1; rrPath(x, y, w, panelH, 12); ctx.stroke();

    // header band
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    rrPath(x, y, w, headerH, 12); ctx.fill();
    ctx.fillStyle = accent; ctx.fillRect(x + 10, y + 9, 5, 12);
    ctx.fillStyle = '#c7d6e7'; ctx.font = '900 8px Arial';
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.fillText(roleLabel, side === 'left' ? x + 24 : x + w - 24, y + 17);

    // fitted name
    const pad = 12;
    const maxNameW = w - pad * 2;
    let nameSize = 16;
    while (nameSize > 11) {
      ctx.font = `900 ${nameSize}px Arial`;
      if (ctx.measureText(name).width <= maxNameW) break;
      nameSize -= 1;
    }
    ctx.fillStyle = '#fff';
    const nx = side === 'left' ? x + pad : x + w - pad;
    ctx.textAlign = side === 'left' ? 'left' : 'right';
    ctx.fillText(name, nx, y + 42);

    // separator
    ctx.fillStyle = accent; ctx.globalAlpha = .95;
    ctx.fillRect(x + pad, y + 50, w - pad * 2, 2);
    ctx.globalAlpha = 1;

    // stats
    let sy = y + 60;
    for (const [label, value] of statRows) {
      drawTvStatBar(x + pad, sy, w - pad * 2, label, value, accent);
      sy += statGap;
    }

    return { x, y, w, h: panelH };
  }

  function drawDuelIntro(now) {
    if (!duelIntro || !shooterProfile || !keeperProfile) return;
    const t = Math.min(1, (now - duelIntro.t0) / 1500);
    const a = Math.min(1, t * 3, (1 - t) * 5 + .15);
    const slide = 32 * (1 - Math.min(1, t * 2.2));
    ctx.save();
    ctx.globalAlpha = Math.max(.18, a);
    ctx.fillStyle = 'rgba(2,8,15,.50)'; ctx.fillRect(0,0,W,H);

    // cabecera estilo TV
    ctx.fillStyle = 'rgba(4,12,22,.92)';
    rrPath(W/2 - 170, 92, 340, 34, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    rrPath(W/2 - 170, 92, 340, 34, 14); ctx.stroke();
    ctx.fillStyle = '#e4231f'; ctx.fillRect(W/2 - 170, 92, 9, 34);
    ctx.fillStyle = '#dbe8f5'; ctx.font = '900 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('TRANSMISIÓN EN VIVO · TANDA DE PENALES', W/2, 114);

    // bloque central compacto
    ctx.fillStyle = 'rgba(4,12,22,.90)';
    rrPath(W/2 - 88, 250, 176, 54, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1;
    rrPath(W/2 - 88, 250, 176, 54, 14); ctx.stroke();
    ctx.fillStyle = '#8ea8c2'; ctx.font = '900 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText('DUELO DESDE LOS DOCE PASOS', W/2, 269);
    ctx.fillStyle = '#fff'; ctx.font = '900 20px Arial';
    ctx.fillText(roundLabel().toUpperCase(), W/2, 290);

    // paneles laterales tipo gráfica de TV
    const leftStats = [
      ['PRECISIÓN', shooterProfile.precision],
      ['POTENCIA', shooterProfile.power],
      ['COMPOSTURA', shooterProfile.composure]
    ];
    const rightStats = [
      ['REFLEJOS', keeperProfile.reflexes],
      ['ALCANCE', keeperProfile.reach]
    ];
    const leftPanelH = Math.max(126, 26 + 28 + 8 + leftStats.length * 22 + 12);
    const rightPanelH = Math.max(104, 26 + 28 + 8 + rightStats.length * 22 + 12);
    const panelW = 250;
    const leftPanelX = 26;
    const rightPanelX = W - 26 - panelW;
    const baseTop = 214;
    const leftPanelY = baseTop + 14;
    const rightPanelY = baseTop + 28;

    ctx.save(); ctx.translate(-slide,0);
    drawTvDuelPanel(leftPanelX, leftPanelY, panelW, leftPanelH, 'left', 'PATEADOR', '#e4231f', (shooterProfile.displayName || shooterProfile.name), leftStats);
    ctx.restore();

    ctx.save(); ctx.translate(slide,0);
    drawTvDuelPanel(rightPanelX, rightPanelY, panelW, rightPanelH, 'right', 'ARQUERO', '#ffd166', (keeperProfile.displayName || keeperProfile.name), rightStats);
    ctx.restore();

    // pie de transmisión
    ctx.fillStyle = 'rgba(4,12,22,.86)';
    rrPath(W/2 - 220, H - 42, 440, 22, 11); ctx.fill();
    ctx.fillStyle = '#c7d6e7'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`${LOCAL_NAME} · ${rivalName}`, W/2, H - 27);
    ctx.restore();
  }

  function drawMomentReaction(now) {
    if (!momentReaction) return;
    const dt = now - momentReaction.t0;
    if (dt > momentReaction.dur) { momentReaction = null; return; }
    const p = Math.min(1, dt / 220);
    const fade = dt > momentReaction.dur - 350 ? Math.max(0, (momentReaction.dur - dt) / 350) : 1;
    const y = H - 126 + (1-p) * 22;
    ctx.save(); ctx.globalAlpha = fade;
    const w = 470, x = (W-w)/2;
    ctx.fillStyle = 'rgba(3,12,22,.9)'; rrPath(x,y,w,72,14); ctx.fill();
    ctx.fillStyle = momentReaction.kind === 'goal' ? '#2ecc71' : momentReaction.kind === 'save' ? '#e74c3c' : '#f1c40f';
    ctx.fillRect(x, y, 7, 72);
    ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='900 22px Arial'; ctx.fillText(momentReaction.title, x+24, y+31);
    ctx.fillStyle='#93abc2'; ctx.font='bold 11px Arial'; ctx.fillText(momentReaction.subtitle, x+24, y+53);
    ctx.restore();
  }

  // ---------- Bucle principal ----------
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function render(now) {
    ctx.clearRect(0, 0, W, H);

    updateKickCountdown(now);

    // cámara: fija al apuntar, zoom suave hacia el arco en cámara lenta
    if (state === 'countdown') {
      camS += (1.082 - camS) * 0.085; camX += (W/2 - camX) * 0.085; camY += (H/2 + 8 - camY) * 0.085;
    } else if (state === 'aim' || state === 'power') {
      // encuadre más cercano, simulando cámara detrás del pateador
      camS += (1.055 - camS) * 0.09; camX += (W/2 - camX) * 0.09; camY += (H/2 + 20 - camY) * 0.09;
    } else if (state === 'diveSecret' || state === 'keeperChoose' || state === 'duelIntro') {
      camS += (1 - camS) * 0.09; camX += (W/2 - camX) * 0.09; camY += (H/2 - camY) * 0.09;
    } else {
      let tS = 1, tX = W / 2, tY = H / 2;
      if (anim && anim.replay && anim.phase !== 'rest') {
        const rp = Math.min(1, Math.max(0, (now - anim.t0) / anim.dur));
        const cam2 = rp >= .52;
        anim.replayCamera = cam2 ? 2 : 1;
        if (!cam2) {
          // Cámara 1: lateral, siguiendo el viaje del balón
          tS = 1.20;
          tX = Math.max(W*.34, Math.min(W*.66, anim.to.x + (anim.who === 'user' ? -105 : 105)));
          tY = H * .44;
        } else {
          // Cámara 2: encuadre más cerrado desde detrás del arco
          tS = 1.34;
          tX = W/2 + (anim.to.x - W/2) * .24;
          tY = H * .34;
        }
      } else if (anim && anim.slowmo && anim.phase !== 'rest') {
        tS = 1.16;
        tX = (anim.to.x + W / 2) / 2;
        tY = Math.min(H / 2, (anim.to.y + H * 0.55) / 2);
      }
      camS += (tS - camS) * 0.07;
      camX += (tX - camX) * 0.07;
      camY += (tY - camY) * 0.07;
    }
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(camS, camS);
    ctx.translate(-camX, -camY);
    // vibración de pantalla al convertir un gol
    if (shakeT0 >= 0) {
      const st = (now - shakeT0) / shakeDur;
      if (st < 1) {
        const m = shakeMag * (1 - st);
        ctx.translate((Math.random() * 2 - 1) * m, (Math.random() * 2 - 1) * m);
      } else shakeT0 = -1;
    }

    drawPitch(now);
    drawGoal(now);

    // reporteros gráficos: sacan fotos tras un gol y durante la celebración final
    const flashing = now < flashUntil || state === 'over';
    PHOTOGS.forEach((p, i) => drawPhotographer(p, i, now, flashing));

    // ¿quién está sobre el balón? (en 2P el rival también apunta y patea)
    const rivalOnBall = state === 'keeperChoose' || state === 'cpuAnim' ||
      ((state === 'aim' || state === 'power') && shooterSide === 'rival') ||
      (state === 'diveSecret' && diveSecretFor === 'p1');

    // zonas: al apuntar, al atajar y en la elección secreta (sin resaltado para no delatarla)
    drawZones(state === 'aim' || state === 'keeperChoose' || state === 'diveSecret',
      state !== 'diveSecret');

    // --- animación en curso ---
    let ballPos = null;
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / anim.dur);
      const et = ease(t);
      if (anim.phase === 'fly') {
        let x = BALL_START.x + (anim.to.x - BALL_START.x) * et;
        x += Math.sin(Math.PI * et) * (anim.curve || 0) * 72;
        let y = BALL_START.y + (anim.to.y - BALL_START.y) * et;
        y -= Math.sin(Math.PI * et) * anim.arc;
        const sc = 1 - 0.3 * et;
        ballPos = { x, y, sc, rot: et * 14 };
        // estela del disparo
        if (!anim.trail) anim.trail = [];
        anim.trail.push({ x, y, sc });
        if (anim.trail.length > 7) anim.trail.shift();
        keeperPose.dive = Math.min(1, et * 1.25); // llega justo antes que el balón
        shooterSwing = Math.min(1, t * 2.2);
        if (t >= 1) {
          // si fue gol, la pelota toca la red y la hace ondular; los reporteros disparan
          if (anim.isGoal) {
            netWave = { x: anim.to.x, y: anim.to.y, t0: now, strength: 1.2 };
            triggerBallContact(anim.to.x, anim.to.y, 'net', '#d9f7ff');
            flashUntil = now + 1800;
          }
          if (anim.deflect) {
            triggerBallContact(anim.to.x, anim.to.y, 'save', '#8fd3ff');
            anim.phase = 'deflect';
            anim.t0 = now;
            anim.dur = 420;
            anim.from = { ...anim.to };
            // bloqueo frontal: el balón cae adelante del arquero; estirada: sale hacia el costado
            if (anim.saveStyle === 'legs') {
              anim.to = { x: anim.to.x + (Math.random() * 120 - 60), y: GND_Y + 45 + Math.random() * 30 };
            } else if (anim.saveStyle === 'catch') {
              anim.dur = 280;
              anim.to = { x: anim.from.x + (Math.random() * 26 - 13), y: Math.min(GND_Y + 18, anim.from.y + 42) };
            } else if (anim.saveStyle === 'punch') {
              const side = anim.to.x < W / 2 ? -1 : 1;
              anim.to = { x: anim.to.x + side * (150 + Math.random() * 50), y: Math.min(GND_Y + 25, anim.to.y + 60 + Math.random() * 35) };
            } else if (anim.saveStyle === 'fingertip') {
              const side = anim.to.x < W / 2 ? -1 : 1;
              anim.to = { x: anim.to.x + side * (135 + Math.random() * 35), y: Math.min(GND_Y + 40, anim.to.y + 95 + Math.random() * 35) };
            } else if (anim.saveStyle === 'parry') {
              const side = anim.to.x < W / 2 ? -1 : 1;
              anim.to = { x: anim.to.x + side * (110 + Math.random() * 55), y: GND_Y + 30 + Math.random() * 40 };
            } else if (anim.saveStyle === 'onehand') {
              anim.to = { x: anim.to.x + (anim.to.x < W / 2 ? -125 : 125), y: Math.min(GND_Y + 55, anim.to.y + 115 + Math.random() * 45) };
            } else {
              anim.to = anim.blockSave
                ? { x: anim.to.x + (Math.random() * 55 - 27), y: GND_Y + 65 + Math.random() * 35 }
                : { x: anim.to.x + (anim.to.x < W / 2 ? -82 : 82), y: GND_Y + 38 + Math.random() * 35 };
            }
          } else if (anim.woodwork) {
            triggerBallContact(anim.to.x, anim.to.y, 'wood', '#ffd166');
            anim.phase = 'woodwork';
            anim.t0 = now;
            anim.dur = 560;
            anim.from = { ...anim.to };
            const side = anim.to.x < W / 2 ? 1 : -1;
            anim.to = anim.woodwork === 'TRAVESAÑO'
              ? { x: anim.from.x + side * (55 + Math.random() * 70), y: GND_Y + 55 + Math.random() * 45 }
              : { x: anim.from.x + side * (95 + Math.random() * 75), y: GND_Y + 35 + Math.random() * 45 };
          } else {
            anim.phase = 'rest';
            anim.t0 = now;
            anim.dur = 550;
          }
        }
      } else if (anim.phase === 'deflect') {
        const x = anim.from.x + (anim.to.x - anim.from.x) * t;
        const y = anim.from.y + (anim.to.y - anim.from.y) * t + Math.sin(Math.PI * t) * -25;
        ballPos = { x, y, sc: 0.75, rot: 14 + t * 5 };
        if (anim.trail) {
          anim.trail.push({ x, y, sc: 0.75 });
          if (anim.trail.length > 7) anim.trail.shift();
        }
        if (t >= 1) { anim.phase = 'rest'; anim.t0 = now; anim.dur = 450; anim.restPos = { ...anim.to }; }
      } else if (anim.phase === 'woodwork') {
        const wt = Math.min(1, (now - anim.t0) / anim.dur);
        const x = anim.from.x + (anim.to.x - anim.from.x) * wt;
        const y = anim.from.y + (anim.to.y - anim.from.y) * wt - Math.sin(Math.PI * wt) * 54;
        ballPos = { x, y, sc: 0.72, rot: 14 + wt * 10 };
        if (anim.trail) {
          anim.trail.push({ x, y, sc: 0.72 });
          if (anim.trail.length > 7) anim.trail.shift();
        }
        if (wt >= 1) { anim.phase = 'rest'; anim.t0 = now; anim.dur = 500; anim.restPos = { ...anim.to }; }
      } else if (anim.phase === 'rest') {
        const p = anim.restPos || anim.to;
        ballPos = { x: p.x, y: p.y, sc: 0.72 };
        if (anim.trail && anim.trail.length) anim.trail.shift(); // la estela se desvanece
        if (now - anim.t0 >= anim.dur) {
          const done = anim.onDone;
          anim = null;
          if (done) done();
        }
      }
    }

    if (state === 'over') {
      // escena final: el ganador salta y el perdedor queda agachado
      drawCelebration(now);
    } else {
      // arquero (con amagues laterales mientras el pateador apunta)
      keeperPose.swayX = ((state === 'aim' || state === 'power' || state === 'diveSecret') && keeperPose.dive === 0)
        ? Math.sin(now / 270) * 8 : 0;
      drawKeeper(keeperPose);

      // pateador
      if (rivalOnBall) {
        const runP = (anim && anim.phase === 'fly') ? Math.min(1, (now - anim.t0) / Math.max(180, anim.dur * .30)) : 1;
        drawShooter(getShooterKit('rival', shooterProfile), shooterSwing, runP, playerReaction && playerReaction.side === 'rival' ? playerReaction : null, now);
      } else {
        const runP = (anim && anim.phase === 'fly') ? Math.min(1, (now - anim.t0) / Math.max(180, anim.dur * .30)) : 1;
        drawShooter(getShooterKit('user', shooterProfile), shooterSwing, runP, playerReaction && playerReaction.side === 'user' ? playerReaction : null, now);
      }

      // balón (con estela mientras vuela)
      if (ballPos) {
        if (anim && anim.trail) {
          anim.trail.forEach((p, i) => {
            ctx.globalAlpha = ((i + 1) / anim.trail.length) * 0.2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 8 * p.sc, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        let squash = 0;
        if (anim && anim.phase === 'fly') {
          const fp = Math.min(1, Math.max(0, (now - anim.t0) / anim.dur));
          squash = Math.max(0, (1 - fp * 7)) * .75 + Math.max(0, (fp - .94) / .06) * .5;
        } else if (anim && (anim.phase === 'deflect' || anim.phase === 'woodwork')) squash = .25;
        drawBall(ballPos.x, ballPos.y, ballPos.sc, ballPos.rot || 0, squash);
      } else {
        drawBall(BALL_START.x, BALL_START.y, 1);
      }
    }

    drawBallContact(now);

    ctx.restore(); // fin de la cámara

    // destello blanco del gol
    if (flashT0 >= 0) {
      const ft = (now - flashT0) / 260;
      if (ft < 1) {
        ctx.fillStyle = 'rgba(255,255,255,' + ((1 - ft) * 0.45).toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      } else flashT0 = -1;
    }

    // gráfica de repetición estilo TV
    if (anim && anim.replay) {
      const camNo = anim.replayCamera || 1;
      ctx.fillStyle = 'rgba(3,10,19,.90)';
      rrPath(14, 14, 250, 38, 10); ctx.fill();
      ctx.fillStyle = '#e4231f'; ctx.fillRect(14, 14, 7, 38);
      ctx.fillStyle = Math.sin(now / 240) > 0 ? '#ff3b30' : '#7a1d18';
      ctx.beginPath(); ctx.arc(34, 33, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 14px Arial'; ctx.textAlign = 'left';
      ctx.fillText('REPETICIÓN', 48, 31);
      ctx.fillStyle = '#8ea8c2'; ctx.font = 'bold 10px Arial';
      ctx.fillText(`CÁMARA ${camNo}  ·  0.4x`, 48, 44);
      ctx.fillStyle = 'rgba(3,10,19,.82)'; rrPath(W-180, 16, 164, 30, 10); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.font = '900 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(anim.replayLabel || 'JUGADA DESTACADA', W-98, 35);
    }
    if (replayTransitionT0 >= 0) {
      const rt = (now - replayTransitionT0) / 360;
      if (rt < 1) {
        const sweep = Math.min(1, rt * 1.45);
        ctx.fillStyle = 'rgba(4,12,22,.96)';
        ctx.fillRect(0, 0, W * sweep, H);
        ctx.fillStyle = '#e4231f';
        ctx.fillRect(Math.max(0, W * sweep - 14), 0, 14, H);
        if (rt > .22) {
          ctx.fillStyle = '#fff'; ctx.font = '900 28px Arial'; ctx.textAlign = 'center';
          ctx.fillText('REPETICIÓN', Math.min(W/2, W*sweep*.55), H/2);
        }
      } else replayTransitionT0 = -1;
    }

    // viñeta: oscurece suavemente los bordes para dar profundidad
    const vig = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.55, H * 0.9);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // presentación previa al duelo
    if (state === 'presentation') drawPresentation(now);
    if (state === 'duelIntro') drawDuelIntro(now);
    if (state === 'countdown') drawKickCountdown(now);
    drawMomentReaction(now);

    // celebración: confeti y serpentinas sobre toda la escena
    if (state === 'over') { drawParty(now); drawCupPostMatch(now); }

    // barra de potencia dibujada en el canvas: visible en cualquier dispositivo
    // (más nerviosa en penales decisivos y muerte súbita)
    if (state === 'power') {
      const oscMs = (game && game.sudden) || heartbeatTimer ? 480 : 750;
      const phase = ((now - powerT0) / oscMs) % 2;
      powerVal = Math.round((phase < 1 ? phase : 2 - phase) * 100);

      const bw = 340, bh = 24, bx = (W - bw) / 2, by = H - 48;
      // panel de fondo
      ctx.fillStyle = 'rgba(7, 20, 38, .8)';
      rrPath(bx - 14, by - 32, bw + 28, bh + 46, 10);
      ctx.fill();
      // etiqueta
      ctx.fillStyle = '#ffffdd';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('POTENCIA — toca la pantalla para fijar', W / 2, by - 11);
      // barra con degradado verde → rojo y máscara del avance
      const grd = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grd.addColorStop(0, '#2ecc71');
      grd.addColorStop(0.55, '#f1c40f');
      grd.addColorStop(1, '#e74c3c');
      const fw = bw * (powerVal / 100);
      ctx.save();
      rrPath(bx, by, bw, bh, bh / 2);
      ctx.clip();
      ctx.fillStyle = grd;
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = 'rgba(10, 26, 46, .92)';
      ctx.fillRect(bx + fw, by, bw - fw, bh);
      ctx.restore();
      rrPath(bx, by, bw, bh, bh / 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      // porcentaje
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Arial';
      ctx.fillText(powerVal + '%', W / 2, by + bh - 6);

      // indicador de efecto: aparece solo mientras se arrastra
      if (Math.abs(shotCurve) > 0.03 || curveGesture) {
        const pct = Math.round(Math.abs(shotCurve) * 100);
        ctx.font = 'bold 13px Arial';
        ctx.fillStyle = Math.abs(shotCurve) > 0.72 ? '#ffd166' : '#d9f7ff';
        ctx.fillText(`${shotCurve < 0 ? '↶' : shotCurve > 0 ? '↷' : '•'} EFECTO ${pct}%`, W / 2, by - 47);
      }
    }

    requestAnimationFrame(render);
  }

  // ---------- Utilidades de UI ----------
  function showMessage(text, color, ms = 1400) {
    msgEl.innerHTML = text;
    msgEl.style.color = color;
    msgEl.classList.add('show');
    if (ms > 0) setTimeout(() => msgEl.classList.remove('show'), ms);
  }
  function setInstruction(html) { instrEl.innerHTML = html; }

  function updateBroadcastHud() {
    if (!game) return;
    const modeNames = { quick: 'PARTIDO RÁPIDO', copa: 'MODO COPA', '2p': '2 JUGADORES' };
    if (modeChipEl) modeChipEl.textContent = modeNames[mode] || 'PENALES';
    if (roundMiniEl) roundMiniEl.textContent = game.over ? 'FINAL' : roundLabel().toUpperCase();
    if (statusTextEl) {
      statusTextEl.textContent = game.over ? 'PARTIDO FINALIZADO' :
        state === 'power' ? 'CARGANDO DISPARO' :
        state === 'aim' ? 'TURNO DE CURICÓ' :
        state === 'keeperChoose' ? 'TURNO DEL RIVAL' :
        state === 'presentation' ? 'PRESENTACIÓN' :
        state === 'duelIntro' ? 'PATEADOR VS ARQUERO' :
        state === 'countdown' ? 'CUENTA REGRESIVA' : 'PARTIDO EN CURSO';
    }
    if (phaseIconEl) {
      phaseIconEl.textContent = state === 'keeperChoose' || (state === 'diveSecret' && diveSecretFor === 'p1') ? '🧤' :
        state === 'power' ? '⚡' : state === 'over' ? '🏁' : '⚽';
    }
  }

  function updateScoreboard() {
    const total = Math.max(game.total, game.user.length, game.cpu.length,
      game.sudden ? game.round : game.total);
    const build = (arr, el) => {
      el.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('div');
        d.className = 'dot ' + (arr[i] === 'goal' ? 'goal' : arr[i] === 'fail' ? 'fail' : 'pending');
        el.appendChild(d);
      }
    };
    build(game.user, dotsUserEl);
    build(game.cpu, dotsCpuEl);
    const gu = game.user.filter(x => x === 'goal').length;
    const gc = game.cpu.filter(x => x === 'goal').length;
    bigScore.innerHTML = gu + ' <span>-</span> ' + gc;
    updateBroadcastHud();
  }

  // ---------- Lógica de turnos ----------
  function roundLabel() {
    return game.sudden ? `Muerte súbita · Penal ${game.round - game.total}` : `Penal ${game.round} de ${game.total}`;
  }

  // ¿este remate puede definir la tanda? (para cámara lenta y latidos)
  function kickIsDecisive(side) {
    if (game.sudden) return true;
    const gu = game.user.filter(x => x === 'goal').length;
    const gc = game.cpu.filter(x => x === 'goal').length;
    const remU = game.total - game.user.length;
    const remC = game.total - game.cpu.length;
    if (side === 'user') return (gu + 1 > gc + remC) || (gc > gu + remU - 1);
    return (gc + 1 > gu + remU) || (gu > gc + remC - 1);
  }

  function announceDecisive(side) {
    if (kickIsDecisive(side)) {
      showMessage('¡PENAL DECISIVO!', '#ffd700', 1300);
      startHeartbeat();
      crowdLevel(0.004, 0.5);
      sndCrowdHush();
      triggerStadiumFx('decisive', 1700);
      vibrate(35);
    } else {
      stopHeartbeat();
    }
  }

  // repetición en cámara lenta de atajadas y golazos
  function maybeReplay(shot, nextFn) {
    const worth = shot.decisive || shot.deflect || shot.woodwork || (shot.isGoal && (shot.power >= 80 || shot.slowmo || Math.abs(shot.curve || 0) > 0.45));
    if (!worth) { setTimeout(nextFn, 1500); return; }
    setTimeout(() => {
      if (game.over) return;
      replayTransitionT0 = performance.now();
      setTimeout(() => {
        if (game.over) return;
        keeperPose = { dive: 0, dirX: shot.kDir.x, dirY: shot.kDir.y, colors: shot.kColors, block: shot.kBlock };
        shooterSwing = 0;
        netWave = null;
        const replayLabel = shot.decisive ? (shot.isGoal ? 'PENAL DECISIVO' : 'ÚLTIMO SUSPENSO') : (shot.deflect ? 'ATAJADA' : shot.woodwork ? shot.woodwork : shot.isGoal ? 'GOL' : 'JUGADA');
        setInstruction(`📺 <b>Repetición</b> · ${replayLabel.toLowerCase()} en cámara lenta`);
        anim = {
          who: shot.who,
          phase: 'fly',
          t0: performance.now(),
          dur: shot.dur * 2.65,
          slowmo: true,
          replay: true,
          replayCamera: 1,
          replayLabel,
          to: { ...shot.to },
          arc: shot.arc,
          curve: shot.curve || 0,
          woodwork: shot.woodwork || null,
          deflect: shot.deflect,
          blockSave: shot.deflect && shot.kBlock,
          saveStyle: shot.saveStyle || null,
          isGoal: shot.isGoal,
          onDone: () => setTimeout(nextFn, 420)
        };
      }, 330);
    }, 850);
  }

  function updateCupTrack() {
    if (!cupTrackEl || !cupStepsEl) return;
    if (mode !== 'copa') { cupTrackEl.classList.add('hidden'); return; }
    cupTrackEl.classList.remove('hidden');
    cupStepsEl.innerHTML = COPA.map((st,i) => `<div class="cupstep ${i<copaStage?'done':i===copaStage?'active':''}"><b>${i<copaStage?'✓ ':''}${st.round}</b>${st.name}</div>`).join('');
  }

  function lineupScore(p) {
    // La selección automática prioriza precisión y compostura, pero no excluye al arquero.
    return (p.precision || 75) * 1.15 + (p.composure || 75) * 1.05 + (p.power || 75) * .72;
  }

  function makeAutomaticOrder(side) {
    return configuredRoster(side).map(p => buildShooterProfile(side, p.number)).sort((a,b) => lineupScore(b) - lineupScore(a));
  }

  function ensurePenaltyOrder(side) {
    const roster = configuredRoster(side);
    if (!penaltyOrder[side] || penaltyOrder[side].length !== roster.length) {
      penaltyOrder[side] = makeAutomaticOrder(side);
      penaltyOrderIndex[side] = 0;
    }
  }

  function renderLineupDraft() {
    shooterCardsEl.innerHTML = '';
    lineupDraft.forEach((p, idx) => {
      const row = document.createElement('div');
      row.className = `lineup-row ${p.keeper ? 'is-keeper' : ''}`;
      row.draggable = true;
      row.dataset.index = idx;
      row.innerHTML = `
        <div class="lineup-rank"><span>${idx + 1}</span><small>°</small></div>
        <div class="lineup-player">
          <div class="lineup-shirt">${p.keeper ? '🧤' : '👕'}<b>#${p.number}</b></div>
          <div><strong>${p.name}</strong><small>${p.keeper ? 'ARQUERO · también disponible como pateador' : (p.position || 'JUGADOR')}${p.fatigue ? ` · CANSANCIO −${p.fatigue}` : ''}</small></div>
        </div>
        <div class="lineup-attrs">
          <span title="Precisión">🎯 <b>${p.precision}</b></span>
          <span title="Potencia">⚡ <b>${p.power}</b></span>
          <span title="Compostura">🧊 <b>${p.composure}</b></span>
        </div>
        <div class="lineup-move">
          <button type="button" class="move-up" aria-label="Subir a ${p.name}" ${idx===0?'disabled':''}>↑</button>
          <button type="button" class="move-down" aria-label="Bajar a ${p.name}" ${idx===lineupDraft.length-1?'disabled':''}>↓</button>
          <span class="drag-handle" title="Arrastrar">☰</span>
        </div>`;
      row.querySelector('.move-up').onclick = () => moveLineupPlayer(idx, -1);
      row.querySelector('.move-down').onclick = () => moveLineupPlayer(idx, 1);
      row.addEventListener('dragstart', ev => {
        dragLineupIndex = idx;
        row.classList.add('dragging');
        if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', String(idx)); }
      });
      row.addEventListener('dragend', () => { dragLineupIndex = null; row.classList.remove('dragging'); });
      row.addEventListener('dragover', ev => { ev.preventDefault(); row.classList.add('dragover'); });
      row.addEventListener('dragleave', () => row.classList.remove('dragover'));
      row.addEventListener('drop', ev => {
        ev.preventDefault(); row.classList.remove('dragover');
        const from = dragLineupIndex !== null ? dragLineupIndex : Number(ev.dataTransfer?.getData('text/plain'));
        const to = idx;
        if (!Number.isInteger(from) || from === to) return;
        const [item] = lineupDraft.splice(from, 1);
        lineupDraft.splice(to, 0, item);
        renderLineupDraft();
      });
      shooterCardsEl.appendChild(row);
    });
  }

  function moveLineupPlayer(index, delta) {
    const to = index + delta;
    if (to < 0 || to >= lineupDraft.length) return;
    [lineupDraft[index], lineupDraft[to]] = [lineupDraft[to], lineupDraft[index]];
    renderLineupDraft();
  }

  function setupPenaltyOrder(side, done) {
    lineupSide = side;
    lineupDraft = configuredRoster(side).map(p => ({...buildShooterProfile(side, p.number)}));
    const title = document.getElementById('shooterselecttitle');
    if (title) title.textContent = mode === '2p'
      ? `Orden de pateadores · ${side === 'user' ? LOCAL_NAME : rivalName}`
      : 'Define el orden de los 11 pateadores';
    renderLineupDraft();
    state = 'lineupSetup';
    shooterAutoEl.onclick = () => {
      lineupDraft = makeAutomaticOrder(side).map(p => ({...p}));
      renderLineupDraft();
    };
    shooterConfirmEl.onclick = () => {
      penaltyOrder[side] = lineupDraft.map(p => ({...p}));
      penaltyOrderIndex[side] = 0;
      shooterSelectEl.classList.add('hidden');
      done();
    };
    shooterSelectEl.classList.remove('hidden');
  }

  function chooseShooter(side, done) {
    ensurePenaltyOrder(side);
    const order = penaltyOrder[side];
    const idx = penaltyOrderIndex[side] % order.length;
    const pick = order[idx];
    penaltyOrderIndex[side] = (penaltyOrderIndex[side] + 1) % order.length;
    shooterNum = pick.number;
    done();
  }

  function startUserTurn() {
    if (game.over) return;
    shooterSide = 'user';
    keeperPose = { dive: 0, dirX: KEEPER_BASE.x, dirY: KEEPER_BASE.y - 60, colors: rivalGk };
    shooterSwing = 0;
    chooseShooter('user', () => {
      rosterUsage.user[shooterNum] = (rosterUsage.user[shooterNum] || 0) + 1;
      startDuelIntro('user', activateUserTurn);
    });
  }

  function activateUserTurn() {
    beginKickCountdown('user', () => {
      if (mode === '2p') {
        state = 'diveSecret';
        diveSecretFor = 'p2';
        humanDiveZone = null;
        humanDiveGesture = null;
        setInstruction(`<b>${roundLabel()}</b> — Patea <b>Jugador 1 (Curicó)</b>. Primero el <b>arquero (J2)</b> hace un <b>swipe EN SECRETO</b> hacia donde quiere lanzarse. Un clic sigue disponible como alternativa.`);
      } else {
        state = 'aim';
        pendingAim = null;
        setInstruction(`<b>${roundLabel()}</b> — <b>${shooterProfile ? shooterProfile.name : 'Curicó'}</b>: apunta libremente dentro del arco y toca para confirmar. Después fija la potencia.`);
      }
      updateBroadcastHud();
    });
  }

  function startPowerPhase() {
    state = 'power';
    powerT0 = performance.now();
    shotCurve = 0;
    curveGesture = null;
    powerWrap.classList.add('visible');
    crowdLevel(0.03, 0.6); // la hinchada contiene el aliento
    vibrate(10);
    setInstruction(`<b>${roundLabel()}</b> — Mantén y <b>arrastra horizontalmente</b> para dar efecto; suelta para patear. También puedes tocar una vez para disparar sin efecto. 40–75% favorece colocados; 88%+ es misil y 96%+ cañonazo. Mucho efecto puede generar rosca o trivela.`);
    updateBroadcastHud();
  }

  function resolveUserShot(aim, power, curve = 0) {
    powerWrap.classList.remove('visible');
    state = 'shootAnim';
    stopHeartbeat();
    crowdLevel(0.035, 0.3);

    const target = pointInGoal(aim) ? { x: aim.x, y: aim.y } : zoneCenter(1, 1);
    const zone = zoneFromPoint(target);
    userColHist.push(zone.c);
    let shotType = shotTypeFor(target, power, curve);
    if (Math.abs(curve) >= 0.28 && shotType.key === 'normal') shotType = { ...shotType, key: 'efecto', label: 'TIRO CON EFECTO', saveMult: 0.84, fx: 'curve' };

    // La precisión tiene un punto dulce alrededor de 60–70%. Los extremos agregan dispersión.
    const attrPrecision = shooterProfile ? shooterProfile.precision : 82;
    const attrComposure = shooterProfile ? shooterProfile.composure : 82;
    const pressurePenalty = kickIsDecisive('user') ? Math.max(0, 88 - attrComposure) * 0.34 : 0;
    const precisionPenalty = Math.abs(power - 64) * 0.42;
    const spread = Math.max(2.8, 5 + precisionPenalty + (power > 88 ? (power - 88) * 1.25 : 0) + pressurePenalty - (attrPrecision - 80) * 0.24);
    let tx = target.x + (Math.random() * 2 - 1) * spread;
    let ty = target.y + (Math.random() * 2 - 1) * spread;

    // Panenka: más bombeada y con menor dispersión horizontal.
    if (shotType.key === 'panenka') {
      tx = target.x + (Math.random() * 2 - 1) * 7;
      ty = target.y + (Math.random() * 2 - 1) * 6;
    }

    // Posibilidad de pegar en palo/travesaño cuando se busca demasiado el límite.
    let woodwork = null;
    const nearLeft = Math.abs(tx - GOAL_L) < 15;
    const nearRight = Math.abs(tx - GOAL_R) < 15;
    const nearBar = Math.abs(ty - BAR_Y) < 14;
    if ((nearLeft || nearRight || nearBar) && Math.random() < 0.24) {
      woodwork = nearBar ? 'TRAVESAÑO' : 'PALO';
      if (woodwork === 'TRAVESAÑO') ty = BAR_Y + 2;
      else tx = nearLeft ? GOAL_L + 2 : GOAL_R - 2;
    }

    // Mucha fuerza puede mandar el balón fuera, especialmente si se busca el borde.
    let missed = false;
    const edgeRisk = Math.min(1, Math.min(Math.abs(target.x - GOAL_L), Math.abs(GOAL_R - target.x), Math.abs(target.y - BAR_Y)) / 55);
    if (power > 90 && Math.random() < (power - 90) * 0.018 * (1.35 - edgeRisk)) {
      missed = true;
      if (target.y < BAR_Y + 85) {
        ty = BAR_Y - 28 - Math.random() * 42;
      } else {
        tx = target.x < W / 2 ? GOAL_L - 35 - Math.random() * 45 : GOAL_R + 35 + Math.random() * 45;
      }
    }

    const effectivePower = Math.max(5, Math.min(100, power + ((shooterProfile ? shooterProfile.power : 82) - 82) * 0.18));

    let kCol, kRow, kTarget, humanDive = null;
    if (mode === '2p' && humanDiveGesture) {
      humanDive = humanDiveGesture;
      kTarget = { x: humanDive.x, y: humanDive.y };
      kCol = humanDive.zone.c; kRow = humanDive.zone.r;
    } else if (mode === '2p' && humanDiveZone) {
      kCol = humanDiveZone.c; kRow = humanDiveZone.r;
      kTarget = zoneCenter(kCol, kRow);
    } else {
      kCol = pickKeeperCol();
      kRow = pickWeighted([0.25, 0.3, 0.45]);
      kTarget = zoneCenter(kCol, kRow);
    }

    // Atajada por distancia real. En 2P, el swipe del arquero suma velocidad y alcance.
    let saved = false;
    if (!missed && !woodwork) {
      if (humanDive) {
        saved = Math.random() < humanKeeperSaveChance(tx, ty, effectivePower, shotType, curve, humanDive);
      } else {
        const dx = tx - kTarget.x, dy = ty - kTarget.y;
        const dist = Math.hypot(dx, dy);
        let reach = 72;
        if (kCol === 1 || kCol === 2) reach += 14;
        if (kRow === 2) reach += 12;
        const proximity = Math.max(0, 1 - dist / reach);
        let saveChance = (0.08 + proximity * 0.86) * (1 - effectivePower / 180) * shotType.saveMult * diffKMult;
        saveChance *= (1 - Math.min(0.22, Math.abs(curve) * 0.22));
        if (Math.abs(tx - KEEPER_BASE.x) < 85 && ty > GND_Y - 82) saveChance += 0.18;
        if (shotType.key === 'panenka' && Math.abs(kTarget.x - KEEPER_BASE.x) > 90) saveChance *= 0.28;
        saved = Math.random() < Math.min(0.94, Math.max(0.02, saveChance));
      }
    }

    keeperPose = {
      dive: 0, dirX: kTarget.x, dirY: kTarget.y, colors: rivalGk,
      block: humanDive ? humanDive.block : Math.abs(kTarget.x - KEEPER_BASE.x) < 115,
      diveSpeed: humanDive ? humanDive.speed : 0.6
    };
    if (saved) {
      const kd = keeperDirForSave(tx, ty);
      keeperPose.dirX = kd.x; keeperPose.dirY = kd.y; keeperPose.block = kd.block; keeperPose.saveStyle = saveStyleFor(tx, ty, keeperPose, power, shotType);
    }

    const isGoal = !missed && !saved && !woodwork;
    const decisive = kickIsDecisive('user');
    const baseDur = Math.max(470, 980 - effectivePower * 4.7);
    const baseArc = [55, 40, 25][zone.r] + (100 - power) * 0.42;
    const shotInfo = {
      who: 'user', to: { x: tx, y: ty },
      arc: Math.max(8, baseArc + shotType.arcBonus),
      dur: baseDur, deflect: saved, isGoal, power, slowmo: decisive || !!woodwork, curve, woodwork, decisive,
      kDir: { x: keeperPose.dirX, y: keeperPose.dirY }, kColors: keeperPose.colors,
      kBlock: keeperPose.block, saveStyle: keeperPose.saveStyle || null
    };

    sndKick();
    triggerBallContact(BALL_START.x, BALL_START.y, 'kick', '#ffffff');
    anim = {
      who: 'user', phase: 'fly', t0: performance.now(),
      dur: baseDur * ((decisive || woodwork) ? 1.8 : 1), slowmo: decisive || !!woodwork,
      to: { x: tx, y: ty }, arc: shotInfo.arc, curve, woodwork, deflect: saved,
      blockSave: saved && keeperPose.block, saveStyle: keeperPose.saveStyle || null, isGoal,
      onDone: () => {
        const result = isGoal ? 'goal' : 'fail';
        game.user.push(result);
        stats.userShots.push({ x: tx, y: ty, result, type: shotType.key, player: shooterProfile ? shooterProfile.name : 'Pateador', number: shooterNum });
        if (isGoal) {
          streak++; records.goals = (records.goals||0)+1; saveRecords();
          if (streak > records.bestStreak && mode !== '2p') { records.bestStreak = streak; saveRecords(); }
          showMessage(shotResultMessage(shotType), '#2ecc71');
          setMomentReaction('goal', 'GOOOL DE CURICÓ', `${shooterProfile ? shooterProfile.name : 'Pateador'} · ${shotType.label} · ${power}%`);
          sndGoal(); goalJuice(); crowdBurst(0.1); triggerStadiumFx('goal', 2200);
          say(GOAL_CALLS[Math.floor(Math.random() * GOAL_CALLS.length)]);
        } else {
          streak = 0;
          if (woodwork) { stats.userMisses++; showMessage(`¡${woodwork}!`, '#f1c40f'); setMomentReaction('wood', woodwork, `${shooterProfile ? shooterProfile.name : 'Pateador'} estuvo a centímetros`); sndWoodwork(); sndMiss(); crowdLevel(0.018, 0.8); triggerStadiumFx('wood', 1500); }
          else if (missed) { stats.userMisses++; showMessage('¡AFUERA!', '#f39c12'); setMomentReaction('wood', 'REMATE DESVIADO', `${shooterProfile ? shooterProfile.name : 'Pateador'} no encontró el arco`); sndMiss(); crowdLevel(0.018, 0.8); triggerStadiumFx('wood', 1400); }
          else { const saveLabel = saveStyleLabel(keeperPose.saveStyle); showMessage(saveLabel, '#e74c3c'); setMomentReaction('save', saveLabel.replace(/¡|!/g,''), `${keeperProfile ? keeperProfile.name : 'Arquero'} ganó el duelo`); sndSave(); crowdLevel(0.02, 0.8); triggerStadiumFx('save', 1700); }
        }
        playerReaction = { side: 'user', type: isGoal ? 'goal' : 'miss', variant: isGoal ? (power >= 88 ? 'run' : (Math.random() < .45 ? 'knee' : 'arms')) : 'head', t0: performance.now() };
        if (saved) keeperReaction = { side: 'rival', type: 'save', t0: performance.now() };
        updateScoreboard();
        const early = checkEarlyWin();
        maybeReplay(shotInfo, early ? () => finishGame(early) : startCpuTurn);
      }
    };
    const curveTxt = Math.abs(curve) >= 0.12 ? ` · Efecto: <b>${curve < 0 ? '↶ izquierda' : '↷ derecha'} ${Math.round(Math.abs(curve) * 100)}%</b>` : '';
    setInstruction(`<b>${roundLabel()}</b> — ${shotType.label} · Potencia: <b>${power}%</b>${curveTxt}`);
  }

  function startCpuTurn() {
    if (game.over) return;
    shooterSwing = 0;
    if (playerReaction && performance.now() - playerReaction.t0 > 1150) playerReaction = null;
    if (keeperReaction && performance.now() - keeperReaction.t0 > 1100) keeperReaction = null;
    keeperPose = { dive: 0, dirX: KEEPER_BASE.x, dirY: KEEPER_BASE.y - 60, colors: GK_CURI };
    chooseShooter('rival', () => {
      rosterUsage.rival[shooterNum] = (rosterUsage.rival[shooterNum] || 0) + 1;
      startDuelIntro('rival', activateCpuTurn);
    });
  }

  function activateCpuTurn() {
    beginKickCountdown('rival', () => {
      sndPitos(); // la hinchada silba al rival
      if (mode === '2p') {
        shooterSide = 'rival';
        state = 'diveSecret';
        diveSecretFor = 'p1';
        humanDiveZone = null;
        humanDiveGesture = null;
        setInstruction(`<b>${roundLabel()}</b> — Patea <b>Jugador 2 (${rivalName})</b>. Primero el <b>arquero (J1)</b> hace un <b>swipe EN SECRETO</b> hacia donde quiere lanzarse. También puede usar clic.`);
      } else {
        shooterSide = 'rival';
        state = 'keeperChoose';
        setInstruction(`<b>${roundLabel()}</b> — Patea <b>${shooterProfile ? shooterProfile.name : rivalName}</b> de ${rivalName}. ¡Eres el arquero! <b>Desliza</b> hacia donde quieres lanzarte; la velocidad del gesto aumenta tu alcance. También puedes hacer clic.`);
      }
      updateBroadcastHud();
    });
  }

  function resolveCpuShot(userZone) {
    state = 'cpuAnim';
    stopHeartbeat();
    crowdLevel(0.035, 0.3);

    // el rival elige zona y potencia (prefiere los palos; en la copa mejora por ronda)
    const sCol = pickWeighted([0.36, 0.14, 0.14, 0.36]);
    const sRow = pickWeighted([0.3, 0.25, 0.45]);
    const cpuPower = 55 + Math.random() * (diffPowMax - 55);
    const center = zoneCenter(sCol, sRow);
    let tx = center.x + (Math.random() * 2 - 1) * 15;
    let ty = center.y + (Math.random() * 2 - 1) * 15;

    // el rival también puede fallar
    let missed = false;
    if (Math.random() < diffMissP) {
      missed = true;
      if (sRow === 0) { ty = BAR_Y - 30 - Math.random() * 30; }
      else { tx = sCol <= 1 ? GOAL_L - 40 - Math.random() * 30 : GOAL_R + 40 + Math.random() * 30; }
    }

    const swipeDive = userZone && userZone.gesture ? userZone : null;
    const clickZone = swipeDive ? swipeDive.zone : userZone;
    const dive = swipeDive ? { x: swipeDive.x, y: swipeDive.y } : zoneCenter(clickZone.c, clickZone.r);

    // ¿ataja el usuario? — con swipe se usa distancia real + velocidad del gesto.
    let saved = false;
    if (!missed) {
      if (swipeDive) {
        const genericShot = { key: 'normal', saveMult: 1 };
        saved = Math.random() < humanKeeperSaveChance(tx, ty, cpuPower, genericShot, 0, swipeDive);
      } else {
        const colDiff = Math.abs(clickZone.c - sCol);
        const rowDiff = Math.abs(clickZone.r - sRow);
        let base = 0;
        if (colDiff === 0) base = rowDiff === 0 ? 0.85 : rowDiff === 1 ? 0.45 : 0.18;
        else if (colDiff === 1 && rowDiff <= 1) base = rowDiff === 0 ? 0.25 : 0.1;
        const powerFactor = 1 - (cpuPower - 55) / 150;
        saved = Math.random() < base * powerFactor;
      }
    }

    keeperPose = {
      dive: 0, dirX: dive.x, dirY: dive.y, colors: GK_CURI,
      block: swipeDive ? swipeDive.block : Math.abs(dive.x - KEEPER_BASE.x) < 115,
      diveSpeed: swipeDive ? swipeDive.speed : 0.55
    };
    if (saved) {
      const kd = keeperDirForSave(tx, ty);
      keeperPose.dirX = kd.x;
      keeperPose.dirY = kd.y;
      keeperPose.block = kd.block;
      keeperPose.saveStyle = saveStyleFor(tx, ty, keeperPose, cpuPower, null);
    }
    finishRivalShot(tx, ty, sRow, cpuPower, missed, saved);
  }

  // 2 jugadores: el Jugador 2 patea con puntería y potencia propias contra la zona secreta de J1
  function resolveRivalHumanShot(aim, power, curve = 0) {
    powerWrap.classList.remove('visible');
    state = 'cpuAnim';
    stopHeartbeat();
    crowdLevel(0.035, 0.3);

    const target = pointInGoal(aim) ? { x: aim.x, y: aim.y } : zoneCenter(2, 1);
    const zone = zoneFromPoint(target);
    let shotType = shotTypeFor(target, power, curve);
    if (Math.abs(curve) >= 0.28 && shotType.key === 'normal') shotType = { ...shotType, key: 'efecto', label: 'TIRO CON EFECTO', saveMult: 0.84, fx: 'curve' };
    const spread = 5 + Math.abs(power - 64) * 0.42 + (power > 88 ? (power - 88) * 1.25 : 0);
    let tx = target.x + (Math.random() * 2 - 1) * spread;
    let ty = target.y + (Math.random() * 2 - 1) * spread;
    if (shotType.key === 'panenka') {
      tx = target.x + (Math.random() * 2 - 1) * 7;
      ty = target.y + (Math.random() * 2 - 1) * 6;
    }

    let missed = false;
    if (power > 90 && Math.random() < (power - 90) * 0.018) {
      missed = true;
      if (target.y < BAR_Y + 85) ty = BAR_Y - 28 - Math.random() * 42;
      else tx = target.x < W / 2 ? GOAL_L - 35 - Math.random() * 45 : GOAL_R + 35 + Math.random() * 45;
    }

    const kZone = humanDiveZone || { c: 1, r: 1 };
    const kTarget = humanDiveGesture ? { x: humanDiveGesture.x, y: humanDiveGesture.y } : zoneCenter(kZone.c, kZone.r);
    let saved = false;
    if (!missed) {
      if (humanDiveGesture) {
        saved = Math.random() < humanKeeperSaveChance(tx, ty, power, shotType, curve, humanDiveGesture);
      } else {
        const dist = Math.hypot(tx - kTarget.x, ty - kTarget.y);
        let reach = 72 + ((kZone.c === 1 || kZone.c === 2) ? 14 : 0) + (kZone.r === 2 ? 12 : 0);
        const proximity = Math.max(0, 1 - dist / reach);
        let chance = (0.08 + proximity * 0.86) * (1 - power / 180) * shotType.saveMult;
        chance *= (1 - Math.min(0.22, Math.abs(curve) * 0.22));
        if (shotType.key === 'panenka' && Math.abs(kTarget.x - KEEPER_BASE.x) > 90) chance *= 0.28;
        saved = Math.random() < Math.min(0.94, Math.max(0.02, chance));
      }
    }

    keeperPose = {
      dive: 0, dirX: kTarget.x, dirY: kTarget.y, colors: GK_CURI,
      block: humanDiveGesture ? humanDiveGesture.block : Math.abs(kTarget.x - KEEPER_BASE.x) < 115,
      diveSpeed: humanDiveGesture ? humanDiveGesture.speed : 0.55
    };
    if (saved) {
      const kd = keeperDirForSave(tx, ty);
      keeperPose.dirX = kd.x; keeperPose.dirY = kd.y; keeperPose.block = kd.block; keeperPose.saveStyle = saveStyleFor(tx, ty, keeperPose, power, shotType);
    }
    finishRivalShot(tx, ty, zone.r, power, missed, saved, shotType, curve);
  }

  function finishRivalShot(tx, ty, sRow, power, missed, saved, shotType = null, curve = 0) {
    const isGoal = !missed && !saved;
    const decisive = kickIsDecisive('cpu');
    const baseDur = 950 - power * 4.5;
    const shotInfo = {
      who: 'cpu', to: { x: tx, y: ty },
      arc: Math.max(8, [55, 40, 25][sRow] + (100 - power) * 0.45 + (shotType ? shotType.arcBonus : 0)),
      dur: baseDur, deflect: saved, isGoal, power, slowmo: decisive, curve, decisive,
      kDir: { x: keeperPose.dirX, y: keeperPose.dirY }, kColors: keeperPose.colors,
      kBlock: keeperPose.block, saveStyle: keeperPose.saveStyle || null
    };
    sndKick();
    triggerBallContact(BALL_START.x, BALL_START.y, 'kick', '#ffffff');
    anim = {
      who: 'cpu',
      phase: 'fly',
      t0: performance.now(),
      dur: baseDur * (decisive ? 2.2 : 1),
      slowmo: decisive,
      to: { x: tx, y: ty },
      arc: shotInfo.arc,
      curve,
      deflect: saved,
      blockSave: saved && keeperPose.block,
      saveStyle: keeperPose.saveStyle || null,
      isGoal,
      onDone: () => {
        const result = isGoal ? 'goal' : 'fail';
        game.cpu.push(result);
        if (isGoal) {
          showMessage('GOL RIVAL', '#e74c3c');
          setMomentReaction('goal', `GOL DE ${rivalName}`, `${shooterProfile ? shooterProfile.name : 'Pateador rival'} venció al arquero`);
          sndNet(); sndMiss(); goalJuice(); crowdLevel(0.008, 1); sndCrowdHush(); triggerStadiumFx('silence', 2100); // la hinchada enmudece
          say('Gol de ' + rivalName.toLowerCase(), { pitch: 0.9, rate: 1 });
        } else if (missed) {
          showMessage('¡LO TIRÓ AFUERA!', '#2ecc71');
          setMomentReaction('wood', 'RIVAL DESVIADO', `${shooterProfile ? shooterProfile.name : 'Pateador rival'} no encontró el arco`);
          sndWoodwork(); sndGoal(); crowdBurst(0.08); triggerStadiumFx('goal', 1800);
        } else {
          stats.gkSaves++;
          const saveLabel = saveStyleLabel(keeperPose.saveStyle);
          showMessage(saveLabel, '#2ecc71');
          records.saves = (records.saves||0)+1; saveRecords();
          setMomentReaction('save', saveLabel.replace(/¡|!/g,''), `${keeperProfile ? keeperProfile.name : 'Arquero Curicó'} ganó el duelo`);
          sndGlove(); sndGoal(); crowdBurst(0.09); triggerStadiumFx('save', 1800);
          say('¡Qué atajada!');
        }
        playerReaction = { side: 'rival', type: isGoal ? 'goal' : 'miss', variant: isGoal ? (power >= 86 ? 'run' : (Math.random() < .4 ? 'knee' : 'arms')) : 'head', t0: performance.now() };
        if (saved) keeperReaction = { side: 'user', type: 'save', t0: performance.now() };
        updateScoreboard();
        maybeReplay(shotInfo, endOfRound);
      }
    };
    setInstruction(`<b>${roundLabel()}</b> — ${mode === '2p' ? '¡Disparo del Jugador 2!' : '¡Te lanzaste!'}`);
  }

  // Si a un equipo ya no le alcanzan los penales restantes para igualar, la tanda se define
  function checkEarlyWin() {
    if (game.sudden) return null;
    const gu = game.user.filter(x => x === 'goal').length;
    const gc = game.cpu.filter(x => x === 'goal').length;
    const remU = game.total - game.user.length;
    const remC = game.total - game.cpu.length;
    if (gu > gc + remC) return 'user';
    if (gc > gu + remU) return 'cpu';
    return null;
  }

  function endOfRound() {
    const early = checkEarlyWin();
    if (early) return finishGame(early);

    const gu = game.user.filter(x => x === 'goal').length;
    const gc = game.cpu.filter(x => x === 'goal').length;

    if (game.round >= game.total) {
      if (gu !== gc) return finishGame(gu > gc ? 'user' : 'cpu');
      // empate: muerte súbita
      if (!game.sudden) {
        game.sudden = true;
        showMessage('¡MUERTE SÚBITA!', '#ffd700', 1800);
      } else {
        showMessage('¡SIGUE EL EMPATE!', '#ffd700', 1600);
      }
      game.round++;
      updateScoreboard();
      setTimeout(startUserTurn, 1900);
      return;
    }

    game.round++;
    startUserTurn();
  }

  function finishGame(winner) {
    game.over = true;
    game.winner = winner;
    state = 'over';
    keeperPose.dive = 0;
    stopHeartbeat();
    const isFinalCopa = mode === 'copa' && copaStage === COPA.length - 1;
    cupPostMatch = mode === 'copa' && winner === 'user' ? { final: isFinalCopa, summary: cupMatchSummary(), t0: performance.now() } : null;

    if (winner === 'user') {
      if (mode === 'copa' && !isFinalCopa) {
        // eliminatoria ganada: se avanza a la siguiente ronda
        const next = COPA[copaStage + 1];
        msgEl.style.fontSize = 'clamp(20px, 3.8vw, 34px)';
        msgEl.style.top = '19%';
        showMessage(`<span class="multi">¡A ${next.round.toUpperCase()}!</span>`, '#2ecc71', 0);
        setInstruction(`<b>¡Victoria!</b> Curicó Unido elimina a ${rivalName} y jugará la ${next.round.toLowerCase()} contra ${next.name}. 🎉`);
        say('¡Curicó Unido avanza en la copa!');
        if (mode !== '2p') { records.wins++; records.matches=(records.matches||0)+1; if (records.wins===1) unlockAchievement('first_win','Primera victoria'); saveRecords(); }
        nextAction = 'copaNext';
        restartBtn.textContent = 'Siguiente partido ▶';
      } else {
        msgEl.style.fontSize = isFinalCopa ? 'clamp(18px, 3.6vw, 30px)' : 'clamp(22px, 4vw, 34px)';
        msgEl.style.top = isFinalCopa ? '14%' : '20%';
        showMessage(isFinalCopa ? '¡CAMPEÓN!' : '¡VICTORIA!', '#2ecc71', 0);
        setInstruction(isFinalCopa
          ? '<b>¡CAMPEÓN DE LA COPA!</b> Curicó Unido levanta el trofeo en La Granja. 🏆🎉'
          : '<b>¡Victoria albirroja!</b> La hinchada de Curicó Unido celebra en el Estadio La Granja. 🎉');
        if (mode !== '2p') {
          records.wins++;
          records.matches = (records.matches || 0) + 1;
          if (records.wins === 1) unlockAchievement('first_win', 'Primera victoria');
          if (streak >= 5) unlockAchievement('streak5', '5 goles seguidos');
          if (isFinalCopa) {
            records.titles++;
            unlockAchievement('champion', 'Campeón de Copa');
          }
          saveRecords();
        }
        say(isFinalCopa ? '¡Curicó Unido, campeón de la copa!' : '¡Curicó Unido campeón!');
        nextAction = 'menu';
        restartBtn.textContent = 'Jugar de nuevo';
        setTimeout(showNewspaper, isFinalCopa ? 7600 : 4200);
      }
      musicWin();
      crowdLevel(0.11, 0.2);
      setTimeout(() => crowdLevel(0.03, 3), 5000);
      startParty(['#e4231f', '#ffffff', '#ffd700', '#ff6b66']);
    } else {
      msgEl.style.fontSize = 'clamp(24px, 4.8vw, 44px)';
      msgEl.style.top = '24%';
      showMessage('¡DERROTA!', '#e74c3c', 0);
      setInstruction(mode === 'copa'
        ? `<b>Eliminado...</b> ${rivalName} deja a Curicó fuera de la copa. ¡El próximo año será!`
        : `<b>Derrota...</b> Esta vez ganó ${rivalName}. ¡La próxima tanda es tuya!`);
      if (mode !== '2p') { records.losses++; records.matches=(records.matches||0)+1; saveRecords(); }
      say('Ganó ' + rivalName.toLowerCase(), { pitch: 0.9, rate: 0.95 });
      musicLose();
      startParty([rivalKit.shirt, rivalKit.trim, '#666666', '#b3b3b3']);
      nextAction = 'menu';
      restartBtn.textContent = 'Volver al menú';
      setTimeout(showNewspaper, 4200);
    }
    if (winner === 'user' && game.user.length >= 5 && game.user.every(x => x === 'goal')) { records.perfect=(records.perfect||0)+1; unlockAchievement('perfect','Tanda perfecta'); saveRecords(); }
    updateRecordsLine();
    updateCupTrack();
    restartBtn.textContent = restartBtn.textContent || 'Jugar de nuevo';
    restartBtn.style.zIndex = '12';
    restartBtn.classList.toggle('postmatch-action', mode === 'copa');
    restartBtn.style.bottom = '';
    restartBtn.style.display = 'inline-block';
  }

  // ---------- Portada de diario con la foto del final ----------
  function showNewspaper() {
    if (!game.over) return;
    const paper = document.getElementById('paper');
    const card = document.getElementById('papercard');
    const top = document.getElementById('papertop');
    const date = document.getElementById('paperdate');
    const strap = document.getElementById('paperstrap');
    const headlineEl = document.getElementById('paperheadline');
    const deck = document.getElementById('paperdeck');
    const score = document.getElementById('paperscore');
    const statsEl = document.getElementById('paperstats');
    const shotmapLabel = document.getElementById('shotmaplabel');
    const closeBtn = document.getElementById('paperclose');
    const ribbon = document.getElementById('paperribbon');

    try {
      document.getElementById('paperphoto').src = cv.toDataURL('image/png');
    } catch (e) { /* sin captura */ }

    const gu = game.user.filter(x => x === 'goal').length;
    const gc = game.cpu.filter(x => x === 'goal').length;
    const attempts = game.user.length;
    const eff = attempts ? Math.round((gu / attempts) * 100) : 0;
    const isFinalCopa = mode === 'copa' && copaStage === COPA.length - 1;
    const championEdition = game.winner === 'user' && isFinalCopa;
    const best = stats.bestShooter || computeBestShooter();

    card.classList.toggle('champion-edition', championEdition);
    strap.style.display = 'none';
    deck.style.display = 'none';
    strap.textContent = '';
    deck.textContent = '';
    top.textContent = 'DIARIO EL CURICANO';
    date.textContent = 'Edición especial · Estadio La Granja · Curicó, Chile';
    closeBtn.textContent = 'Cerrar 📰';

    if (championEdition) {
      top.textContent = 'EL CURICANO · EXTRA';
      date.textContent = 'Edición de Campeón · Estadio La Granja · Curicó, Chile';
      strap.style.display = 'inline-block';
      strap.textContent = 'EDICIÓN HISTÓRICA · CURICÓ CAMPEÓN';
      ribbon.style.display = 'inline-block';
      ribbon.textContent = 'PORTADA DE COLECCIÓN · LA COPA ES ALBIRROJA';
      headlineEl.textContent = '¡CURICÓ UNIDO CAMPEÓN!';
      deck.style.display = 'block';
      deck.textContent = `${LOCAL_NAME} venció a ${rivalName} en una definición inolvidable, levantó la copa y dejó una portada para la historia en La Granja.`;
      score.textContent = `${LOCAL_NAME} ${gu} - ${gc} ${rivalName} · CAMPEÓN`; 
      statsEl.innerHTML = `
        <div class="paper-metrics">
          <div class="metric"><b>EFECTIVIDAD</b><span>${eff}%</span></div>
          <div class="metric"><b>ATAJADAS</b><span>${stats.gkSaves}</span></div>
          <div class="metric"><b>FALLOS</b><span>${stats.userMisses}</span></div>
        </div>
        <div class="paper-highlight">FIGURA DEL PARTIDO · #${best.number} ${best.name}<small>${best.goals} gol(es) en la tanda · portada para el héroe de la jornada</small></div>`;
      shotmapLabel.textContent = 'Ruta de los penales campeones';
      closeBtn.textContent = 'Cerrar portada histórica 📰';
    } else {
      ribbon.style.display = 'none';
      ribbon.textContent = '';
      const headline = game.winner === 'user'
        ? '¡CURICÓ SE LLEVA LA TANDA!'
        : `${rivalName} AMARGA LA NOCHE CURICANA`;
      headlineEl.textContent = headline;
      score.textContent = `${LOCAL_NAME} ${gu} - ${gc} ${rivalName} (def. por penales)`;
      statsEl.textContent = `Efectividad: ${eff}% (${gu}/${attempts}) · Atajadas del arquero curicano: ${stats.gkSaves} · Tiros desviados: ${stats.userMisses}`;
      shotmapLabel.textContent = 'Mapa de tus disparos';
    }

    drawShotMap();
    paper.classList.remove('hidden');
  }
  function hideNewspaper() {
    document.getElementById('paper').classList.add('hidden');
    document.getElementById('papercard').classList.remove('champion-edition');
    document.getElementById('paperstrap').style.display = 'none';
    document.getElementById('paperdeck').style.display = 'none';
    document.getElementById('paperribbon').style.display = 'none';
    document.getElementById('paperribbon').textContent = '';
  }

  // mini diagrama del arco con los disparos del jugador
  function drawShotMap() {
    const sc = document.getElementById('shotmap');
    const c2 = sc.getContext('2d');
    c2.clearRect(0, 0, sc.width, sc.height);
    const x0 = GOAL_L - 70, x1 = GOAL_R + 70, y0 = BAR_Y - 50, y1 = GND_Y + 18;
    const mapX = x => (x - x0) / (x1 - x0) * sc.width;
    const mapY = y => (y - y0) / (y1 - y0) * sc.height;
    // arco
    c2.strokeStyle = '#1c1a14';
    c2.lineWidth = 3;
    c2.beginPath();
    c2.moveTo(mapX(GOAL_L), mapY(GND_Y));
    c2.lineTo(mapX(GOAL_L), mapY(BAR_Y));
    c2.lineTo(mapX(GOAL_R), mapY(BAR_Y));
    c2.lineTo(mapX(GOAL_R), mapY(GND_Y));
    c2.stroke();
    c2.strokeStyle = '#8a8264';
    c2.lineWidth = 1;
    c2.beginPath();
    c2.moveTo(0, mapY(GND_Y));
    c2.lineTo(sc.width, mapY(GND_Y));
    c2.stroke();
    // disparos: verde = gol, rojo = fallado
    stats.userShots.forEach(s => {
      c2.fillStyle = s.result === 'goal' ? '#1f8f4d' : '#c0201c';
      c2.beginPath();
      c2.arc(mapX(s.x), mapY(s.y), 5, 0, Math.PI * 2);
      c2.fill();
      c2.strokeStyle = '#1c1a14';
      c2.stroke();
    });
  }

  // ---------- Entradas ----------
  function canvasPos(ev) {
    const rect = cv.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (W / rect.width),
      y: (ev.clientY - rect.top) * (H / rect.height)
    };
  }
  function zoneAt(p) {
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const z = zoneRect(c, r);
        if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) return { c, r };
      }
    }
    return null;
  }

  // en pantallas táctiles no hay hover real: el navegador emite un mousemove
  // sintético al tocar y la zona quedaría "seleccionada" en amarillo para siempre
  let touchMode = false;
  cv.addEventListener('touchstart', () => {
    touchMode = true;
    hoverZone = null;
    hoverAim = null;
  }, { passive: true });

  document.addEventListener('pointerdown', () => { ensureAudio(); preloadRealAudio(); }, { passive: true });

  // La presentación se puede saltar desde cualquier punto del área de juego.
  // Se usa captura para evitar que el mismo clic se interprete además como un disparo.
  const gameWrapClickEl = document.getElementById('gamewrap');
  if (gameWrapClickEl) {
    gameWrapClickEl.addEventListener('click', ev => {
      if (state !== 'presentation') return;
      ev.preventDefault();
      ev.stopPropagation();
      finishPresentation();
    }, true);
    gameWrapClickEl.addEventListener('touchend', ev => {
      if (state !== 'presentation') return;
      ev.preventDefault();
      ev.stopPropagation();
      finishPresentation();
    }, { capture: true, passive: false });
  }

  cv.addEventListener('mousemove', ev => {
    if (touchMode) { hoverZone = null; hoverAim = null; return; }
    const p = canvasPos(ev);
    if (state === 'aim') {
      hoverAim = pointInGoal(p) ? p : null;
      hoverZone = null;
      cv.style.cursor = hoverAim ? 'crosshair' : 'default';
      return;
    }
    hoverAim = null;
    if (state !== 'keeperChoose' && state !== 'diveSecret') { hoverZone = null; return; }
    hoverZone = zoneAt(p);
    cv.style.cursor = hoverZone ? 'pointer' : 'default';
  });

  cv.addEventListener('click', ev => {
    if (performance.now() < suppressClickUntil) return;
    if (state === 'presentation') { finishPresentation(); return; }
    if (state === 'countdown') return;
    hoverZone = null; // que no quede ninguna zona marcada tras elegir
    const p = canvasPos(ev);
    if (state === 'aim') {
      if (pointInGoal(p)) { pendingAim = { x: p.x, y: p.y }; pendingZone = zoneFromPoint(p); startPowerPhase(); }
    } else if (state === 'power') {
      lockPower();
    } else if (state === 'keeperChoose') {
      const z = zoneAt(p);
      if (z) resolveCpuShot(z);
    } else if (state === 'diveSecret') {
      // el arquero humano elige sin que se marque nada en pantalla
      const z = zoneAt(p);
      if (z) {
        humanDiveZone = z;
        humanDiveGesture = null;
        pendingAim = null;
        pendingZone = null;
        state = 'aim';
        const shooterLabel = diveSecretFor === 'p2' ? 'Jugador 1 (Curicó)' : `Jugador 2 (${rivalName})`;
        setInstruction(`<b>${roundLabel()}</b> — Arquero listo 🤫. <b>${shooterLabel}</b>: apunta libremente dentro del arco y toca donde quieres patear.`);
      }
    }
  });

  // Gesto de efecto durante la carga: arrastra a izquierda/derecha y suelta para disparar.
  cv.addEventListener('pointerdown', ev => {
    const p = canvasPos(ev);
    if (state === 'countdown') return;
    if (state === 'keeperChoose' || state === 'diveSecret') {
      keeperSwipe = { start: p, last: p, pointerId: ev.pointerId, t0: performance.now(), secret: state === 'diveSecret' };
      try { cv.setPointerCapture(ev.pointerId); } catch (_) {}
      ev.preventDefault();
      return;
    }
    if (state !== 'power') return;
    curveGesture = { startX: p.x, pointerId: ev.pointerId };
    shotCurve = 0;
    try { cv.setPointerCapture(ev.pointerId); } catch (_) {}
    ev.preventDefault();
  });
  cv.addEventListener('pointermove', ev => {
    const p = canvasPos(ev);
    if (keeperSwipe && keeperSwipe.pointerId === ev.pointerId) {
      keeperSwipe.last = p;
      if (!keeperSwipe.secret) {
        const preview = keeperDiveFromGesture(keeperSwipe.start, p, performance.now() - keeperSwipe.t0);
        keeperPose.dirX = preview.x;
        keeperPose.dirY = preview.y;
        keeperPose.block = preview.block;
        keeperPose.dive = Math.min(0.42, preview.power * 0.42);
      }
      ev.preventDefault();
      return;
    }
    if (state !== 'power' || !curveGesture || curveGesture.pointerId !== ev.pointerId) return;
    shotCurve = Math.max(-1, Math.min(1, (p.x - curveGesture.startX) / 150));
    ev.preventDefault();
  });
  cv.addEventListener('pointerup', ev => {
    const p = canvasPos(ev);
    if (keeperSwipe && keeperSwipe.pointerId === ev.pointerId) {
      const ks = keeperSwipe;
      keeperSwipe = null;
      const dist = Math.hypot(p.x - ks.start.x, p.y - ks.start.y);
      try { cv.releasePointerCapture(ev.pointerId); } catch (_) {}
      if (dist >= 22) {
        const dive = keeperDiveFromGesture(ks.start, p, performance.now() - ks.t0);
        dive.gesture = true;
        suppressClickUntil = performance.now() + 450;
        if (ks.secret) {
          humanDiveGesture = dive;
          humanDiveZone = null;
          pendingAim = null;
          pendingZone = null;
          state = 'aim';
          keeperPose.dive = 0;
          keeperPose.dirX = KEEPER_BASE.x;
          keeperPose.dirY = KEEPER_BASE.y - 60;
          const shooterLabel = diveSecretFor === 'p2' ? 'Jugador 1 (Curicó)' : `Jugador 2 (${rivalName})`;
          setInstruction(`<b>${roundLabel()}</b> — Arquero listo 🤫. <b>${shooterLabel}</b>: apunta libremente dentro del arco y toca donde quieres patear.`);
          updateBroadcastHud();
        } else {
          resolveCpuShot(dive);
        }
      } else {
        keeperPose.dive = 0;
        keeperPose.dirX = KEEPER_BASE.x;
        keeperPose.dirY = KEEPER_BASE.y - 60;
      }
      ev.preventDefault();
      return;
    }
    if (state !== 'power' || !curveGesture || curveGesture.pointerId !== ev.pointerId) return;
    shotCurve = Math.max(-1, Math.min(1, (p.x - curveGesture.startX) / 150));
    curveGesture = null;
    try { cv.releasePointerCapture(ev.pointerId); } catch (_) {}
    ev.preventDefault();
    lockPower();
  });
  cv.addEventListener('pointercancel', () => {
    curveGesture = null;
    keeperSwipe = null;
    keeperPose.dive = 0;
  });

  let pendingZone = null;
  function lockPower() {
    if (state !== 'power') return;
    const pw = Math.max(5, powerVal);
    if (shooterSide === 'user') resolveUserShot(pendingAim || zoneCenter(pendingZone.c, pendingZone.r), pw, shotCurve);
    else resolveRivalHumanShot(pendingAim || zoneCenter(pendingZone.c, pendingZone.r), pw, shotCurve);
  }
  document.addEventListener('keydown', ev => {
    if (state === 'presentation' && (ev.code === 'Space' || ev.code === 'Enter' || ev.code === 'Escape')) {
      ev.preventDefault();
      finishPresentation();
      return;
    }
    if (ev.code === 'Space') {
      ev.preventDefault();
      lockPower();
    }
  });
  powerWrap.addEventListener('click', lockPower);

  // panel de instrucciones
  const helpBtn = document.getElementById('helpbtn');
  const helpPanel = document.getElementById('helppanel');
  helpBtn.addEventListener('click', () => helpPanel.classList.toggle('hidden'));
  document.getElementById('helpclose').addEventListener('click', () => helpPanel.classList.add('hidden'));
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') helpPanel.classList.add('hidden');
  });

  restartBtn.addEventListener('click', () => {
    restartBtn.style.display = 'none';
    restartBtn.classList.remove('postmatch-action');
    restartBtn.style.bottom = '';
    msgEl.classList.remove('show');
    msgEl.style.fontSize = '';
    msgEl.style.top = '';
    party = null;
    hideNewspaper();
    if (nextAction === 'copaNext') {
      // siguiente ronda de la copa, con su propia presentación
      copaStage++;
      applyRival();
      newGame();
      updateScoreboard();
      penaltyOrder = { user: [], rival: makeAutomaticOrder('rival') };
      penaltyOrderIndex = { user: 0, rival: 0 };
      setupPenaltyOrder('user', () => startPresentation(startUserTurn));
    } else {
      // volver al menú principal
      newGame();
      updateScoreboard();
      updateRecordsLine();
      stopCrowdChants();
      state = 'idle';
      setPlayingLayout(false);
      document.getElementById('intro').classList.remove('hidden');
      setInstruction('Elige un <b>modo de juego</b> para comenzar.');
      updateBroadcastHud();
    }
  });

  document.getElementById('paperclose').addEventListener('click', hideNewspaper);
  document.getElementById('paperx').addEventListener('click', hideNewspaper);

  // ---------- Inicio ----------
  function startMatch(m) {
    mode = m;
    setPlayingLayout(true);
    copaStage = 0;
    streak = 0;
    userColHist.length = 0;
    rosterUsage.user = {}; rosterUsage.rival = {};
    penaltyOrder = { user: [], rival: [] };
    penaltyOrderIndex = { user: 0, rival: 0 };
    applyRival();
    document.getElementById('intro').classList.add('hidden');
    if (localCrestEl && TEAMS.local.crest) localCrestEl.src = TEAMS.local.crest;
    ensureAudio();
    initCrowd();
    startCrowdChants();
    newGame();
    updateScoreboard();
    penaltyOrder = { user: [], rival: [] };
    penaltyOrderIndex = { user: 0, rival: 0 };
    const beginAfterLineups = () => startPresentation(startUserTurn);
    if (mode === '2p') {
      setupPenaltyOrder('user', () => setupPenaltyOrder('rival', beginAfterLineups));
    } else {
      // El rival define su orden automáticamente; el usuario lo configura una sola vez.
      penaltyOrder.rival = makeAutomaticOrder('rival');
      setupPenaltyOrder('user', beginAfterLineups);
    }
    updateBroadcastHud();
  }
  document.getElementById('playquick').addEventListener('click', () => startMatch('quick'));
  document.getElementById('playcopa').addEventListener('click', () => startMatch('copa'));
  document.getElementById('play2p').addEventListener('click', () => startMatch('2p'));

  // nombres del marcador desde la configuración (teams.js)
  document.querySelector('.team.curi .name').textContent = LOCAL_NAME;
  rivalNameEl.textContent = RIVAL_NAME;

  newGame();
  updateScoreboard();
  updateRecordsLine();
  setInstruction('Elige un <b>modo de juego</b> para comenzar.');
  requestAnimationFrame(render);
})();
