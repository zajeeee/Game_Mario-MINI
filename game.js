/* ===========================
   Super Galicto Bros — MVP
   Canvas platformer game
   =========================== */

(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // DOM elements
  const coinsEl = document.getElementById('coins');
  const scoreEl = document.getElementById('score');
  const timeEl = document.getElementById('time');
  const startScreen = document.getElementById('startScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const gameOverTitle = document.getElementById('gameOverTitle');
  const gameOverText = document.getElementById('gameOverText');
  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const gameSelectScreen = document.getElementById('gameSelectScreen');
  const gameSelectBackBtn = document.getElementById('gameSelectBackBtn');
  const gameSelectNextBtn = document.getElementById('gameSelectNextBtn');
  const gameCards = document.querySelectorAll('.game-card');
  const pauseScreen = document.getElementById('pauseScreen');
  const resumeBtn = document.getElementById('resumeBtn');
  const quitBtn = document.getElementById('quitBtn');
  const charSelectScreen = document.getElementById('charSelectScreen');
  const mapSelectScreen = document.getElementById('mapSelectScreen');
  const charGrid = document.getElementById('charGrid');
  const mapGrid = document.getElementById('mapGrid');
  const charBackBtn = document.getElementById('charBackBtn');
  const charNextBtn = document.getElementById('charNextBtn');
  const mapBackBtn = document.getElementById('mapBackBtn');
  const mapStartBtn = document.getElementById('mapStartBtn');
  const levelScreen = document.getElementById('levelScreen');
  const levelTitle = document.getElementById('levelTitle');
  const levelText = document.getElementById('levelText');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const levelNumEl = document.getElementById('levelNum');
  const levelMapScreen = document.getElementById('levelMapScreen');
  const levelMapGrid = document.getElementById('levelMapGrid');
  const levelMapName = document.getElementById('levelMapName');
  const levelMapStats = document.getElementById('levelMapStats');
  const levelMapBackBtn = document.getElementById('levelMapBackBtn');
  const levelMapPlayBtn = document.getElementById('levelMapPlayBtn');
  const playerCountScreen = document.getElementById('playerCountScreen');
  const playerCountBackBtn = document.getElementById('playerCountBackBtn');
  const playerCountNextBtn = document.getElementById('playerCountNextBtn');
  const charSelectTitle = document.getElementById('charSelectTitle');
  const hudP1 = document.getElementById('hudP1');
  const hudP2 = document.getElementById('hudP2');
  const p1LivesEl = document.getElementById('p1Lives');
  const p1PowerEl = document.getElementById('p1Power');
  const p2LivesEl = document.getElementById('p2Lives');
  const p2PowerEl = document.getElementById('p2Power');
  const p2ControlsHint = document.getElementById('p2Controls');
  const p2TouchGroups = document.querySelectorAll('.touch__p2');
  const muteBtn = document.getElementById('muteBtn');
  const storeScreen = document.getElementById('storeScreen');
  const storeGrid = document.getElementById('storeGrid');
  const storeCoinsEl = document.getElementById('storeCoins');
  const storeBackBtn = document.getElementById('storeBackBtn');
  const storePlayBtn = document.getElementById('storePlayBtn');
  const levelMapStoreBtn = document.getElementById('levelMapStoreBtn');
  const storeHud = document.getElementById('storeHud');

  // ===== Constants =====
  const GRAVITY = 0.6;
  const FRICTION = 0.82;
  const MOVE_SPEED = 4;
  const JUMP_FORCE = 13;
  const GROUND_Y = H - 40;

  // ===== Delta-time scaling =====
  // All per-frame physics values assume 60 FPS. On higher-refresh monitors
  // requestAnimationFrame fires faster, so we scale by dtRatio = actual/16.67.
  let lastFrameTime = 0;
  let dtRatio = 1; // multiplier applied to all velocity/acceleration values

  // ===== Sound Engine (Web Audio API — procedural SFX, no files) =====
  const Sound = (function () {
    let ctx = null;
    let muted = false;
    let masterGain = null;

    function init() {
      if (ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(ctx.destination);
      } catch (e) { /* audio not supported */ }
    }

    function resume() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    // Play a tone with optional pitch sweep
    function tone(opts) {
      if (!ctx || muted) return;
      const {
        freq, freqEnd, type = 'square', dur = 0.1,
        vol = 0.3, attack = 0.005, release = 0.02,
      } = opts;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
      }
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + attack);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(t0);
      osc.stop(t0 + dur + release);
    }

    // Play a short noise burst (for explosions, hits)
    function noise(opts) {
      if (!ctx || muted) return;
      const { dur = 0.15, vol = 0.2, freq = 1000 } = opts;
      const t0 = ctx.currentTime;
      const bufSize = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(masterGain);
      src.start(t0);
    }

    // Named sound effects
    const sfx = {
      jump: () => tone({ freq: 400, freqEnd: 700, type: 'square', dur: 0.1, vol: 0.15 }),
      djump: () => tone({ freq: 600, freqEnd: 1000, type: 'square', dur: 0.1, vol: 0.15 }),
      walk: () => tone({ freq: 150, freqEnd: 120, type: 'square', dur: 0.04, vol: 0.05 }),
      land: () => tone({ freq: 200, freqEnd: 80, type: 'square', dur: 0.06, vol: 0.1 }),
      coin: () => {
        tone({ freq: 988, type: 'square', dur: 0.06, vol: 0.15 });
        setTimeout(() => tone({ freq: 1319, type: 'square', dur: 0.12, vol: 0.15 }), 60);
      },
      shoot: () => tone({ freq: 800, freqEnd: 200, type: 'sawtooth', dur: 0.12, vol: 0.12 }),
      stomp: () => tone({ freq: 300, freqEnd: 60, type: 'square', dur: 0.1, vol: 0.2 }),
      bump: () => tone({ freq: 250, freqEnd: 100, type: 'square', dur: 0.08, vol: 0.18 }),
      powerup: () => {
        const notes = [523, 659, 784, 1047];
        notes.forEach((f, i) => {
          setTimeout(() => tone({ freq: f, type: 'square', dur: 0.1, vol: 0.15 }), i * 70);
        });
      },
      powerdown: () => tone({ freq: 400, freqEnd: 100, type: 'sawtooth', dur: 0.3, vol: 0.15 }),
      star: () => {
        const notes = [659, 784, 988, 1319, 988, 1319];
        notes.forEach((f, i) => {
          setTimeout(() => tone({ freq: f, type: 'square', dur: 0.08, vol: 0.12 }), i * 50);
        });
      },
      checkpoint: () => {
        tone({ freq: 659, type: 'square', dur: 0.08, vol: 0.15 });
        setTimeout(() => tone({ freq: 880, type: 'square', dur: 0.12, vol: 0.15 }), 80);
      },
      die: () => {
        const notes = [523, 392, 330, 262];
        notes.forEach((f, i) => {
          setTimeout(() => tone({ freq: f, type: 'square', dur: 0.15, vol: 0.2 }), i * 120);
        });
      },
      win: () => {
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((f, i) => {
          setTimeout(() => tone({ freq: f, type: 'square', dur: 0.15, vol: 0.18 }), i * 130);
        });
      },
      gameover: () => {
        const notes = [392, 330, 262, 196];
        notes.forEach((f, i) => {
          setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.2 }), i * 200);
        });
      },
      firebounce: () => tone({ freq: 500, freqEnd: 200, type: 'sine', dur: 0.05, vol: 0.08 }),
      firehit: () => {
        noise({ dur: 0.12, vol: 0.15, freq: 800 });
        tone({ freq: 200, freqEnd: 50, type: 'square', dur: 0.1, vol: 0.12 });
      },
      select: () => tone({ freq: 600, type: 'square', dur: 0.05, vol: 0.1 }),
    };

    return {
      init,
      resume,
      sfx,
      isMuted: () => muted,
      toggleMute: () => { muted = !muted; return muted; },
      _getCtx: () => ctx,
      _getMaster: () => masterGain,
    };
  })();

  // ===== Background Music (procedural, looping melodies) =====
  // Each track is a sequence of notes: [frequency, durationInBeats]
  // 0 = rest. Duration is in 16th-note units.
  // Tracks are played via scheduled oscillator notes on a timer.

  // Note frequencies (C major + chromatic extras)
  const N = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50, Cs4: 277.18, Ds4: 311.13, Fs4: 369.99, Gs4: 415.30, As4: 466.16,
    Cs5: 554.37, Ds5: 622.25, Fs5: 739.99, Gs5: 830.61, As5: 932.33,
  };

  // Melody tracks — each map theme gets its own vibe
  // Format: { bpm, melody: [[freq, dur]...], bass: [[freq, dur]...] }
  const MUSIC_TRACKS = {
    // Overworld — upbeat, bouncy, SMB-style major key
    overworld: {
      bpm: 140,
      melody: [
        [N.E5, 2], [N.E5, 1], [0, 1], [N.E5, 1], [0, 1], [N.C5, 1], [N.E5, 2],
        [N.G5, 2], [0, 2], [N.G4, 2], [0, 2],
        [N.C5, 2], [0, 1], [N.G4, 1], [0, 1], [N.E4, 2], [0, 1],
        [N.A4, 2], [0, 1], [N.B4, 1], [0, 1], [N.As4, 1], [N.A4, 1], [0, 1],
        [N.G4, 1], [N.E5, 2], [N.G5, 2], [N.A5, 2], [0, 2], [N.F5, 1], [N.G5, 1],
        [N.E5, 2], [N.C5, 1], [N.D5, 1], [N.B4, 2], [0, 2],
      ],
      bass: [
        [N.C3, 4], [N.G3, 4], [N.A3, 4], [N.E3, 4],
        [N.F3, 4], [N.C3, 4], [N.G3, 4], [0, 4],
      ],
    },
    // Underground — slow, spooky, minor key
    underground: {
      bpm: 100,
      melody: [
        [N.C4, 2], [0, 1], [N.Ds4, 1], [N.F4, 2], [0, 1], [N.Gs4, 1],
        [N.C5, 2], [0, 1], [N.Gs4, 1], [N.F4, 2], [0, 1], [N.Ds4, 1],
        [N.C4, 2], [0, 1], [N.Ds4, 1], [N.F4, 2], [0, 1], [N.Gs4, 1],
        [N.As4, 2], [0, 1], [N.Gs4, 1], [N.F4, 4], [0, 4],
      ],
      bass: [
        [N.C3, 4], [N.Gs3, 4], [N.F3, 4], [N.Ds3, 4],
        [N.C3, 4], [N.Gs3, 4], [N.F3, 4], [N.Ds3, 4],
      ],
    },
    // Athletic — fast, cheerful, waltz-ish
    athletic: {
      bpm: 160,
      melody: [
        [N.G5, 1], [N.E5, 1], [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.E5, 1], [N.C5, 1], [N.E5, 1],
        [N.A5, 1], [N.F5, 1], [N.D5, 1], [N.F5, 1], [N.A5, 1], [N.F5, 1], [N.D5, 1], [N.F5, 1],
        [N.B5, 1], [N.G5, 1], [N.D5, 1], [N.G5, 1], [N.B5, 1], [N.G5, 1], [N.D5, 1], [N.G5, 1],
        [N.C6, 2], [N.G5, 2], [N.E5, 2], [N.C5, 2],
        [N.D5, 2], [N.B5, 2], [N.G5, 2], [0, 2],
      ],
      bass: [
        [N.C3, 2], [N.G3, 2], [N.C3, 2], [N.G3, 2],
        [N.F3, 2], [N.C4, 2], [N.F3, 2], [N.C4, 2],
        [N.G3, 2], [N.D3, 2], [N.G3, 2], [N.D3, 2],
        [N.C3, 4], [N.G3, 4],
      ],
    },
    // Castle — ominous, slow, heavy
    castle: {
      bpm: 90,
      melody: [
        [N.D4, 2], [0, 1], [N.Ds4, 1], [N.F4, 2], [0, 1], [N.Gs4, 1],
        [N.D5, 2], [0, 1], [N.Gs4, 1], [N.F4, 2], [0, 1], [N.Ds4, 1],
        [N.D4, 2], [0, 1], [N.Ds4, 1], [N.F4, 2], [0, 1], [N.Gs4, 1],
        [N.As4, 2], [N.D5, 2], [N.As4, 2], [N.Gs4, 4], [0, 2],
      ],
      bass: [
        [N.D3, 2], [N.D3, 2], [N.Ds3, 2], [N.Ds3, 2],
        [N.F3, 2], [N.F3, 2], [N.Gs3, 2], [N.Gs3, 2],
        [N.D3, 2], [N.D3, 2], [N.Ds3, 2], [N.Ds3, 2],
        [N.As3, 2], [N.As3, 2], [N.Gs3, 2], [0, 2],
      ],
    },
    // Desert — mysterious, exotic, Phrygian-flavored
    desert: {
      bpm: 115,
      melody: [
        [N.E5, 2], [N.D5, 1], [N.Cs5, 1], [N.B4, 2], [N.Cs5, 2],
        [N.D5, 2], [N.E5, 2], [0, 1], [N.D5, 1], [N.Cs5, 2],
        [N.B4, 2], [N.A4, 2], [N.B4, 2], [0, 2],
        [N.E5, 2], [N.Fs5, 1], [N.E5, 1], [N.D5, 2], [N.Cs5, 2],
        [N.B4, 2], [N.Cs5, 2], [N.D5, 2], [0, 2],
      ],
      bass: [
        [N.A3, 4], [N.E3, 4],
        [N.A3, 4], [N.E3, 4],
        [N.F3, 4], [N.E3, 4],
        [N.A3, 4], [0, 4],
      ],
    },
    // Snow — gentle, twinkling, bright major key
    snow: {
      bpm: 130,
      melody: [
        [N.G5, 1], [N.E5, 1], [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.C6, 1], [N.G5, 1], [N.E5, 1],
        [N.F5, 1], [N.D5, 1], [N.B4, 1], [N.D5, 1], [N.F5, 1], [N.A5, 1], [N.F5, 1], [N.D5, 1],
        [N.E5, 1], [N.C5, 1], [N.A4, 1], [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.E5, 1], [N.C5, 1],
        [N.D5, 2], [N.F5, 2], [N.E5, 2], [0, 2],
      ],
      bass: [
        [N.C3, 4], [N.G3, 4],
        [N.A3, 4], [N.F3, 4],
        [N.C3, 4], [N.E3, 4],
        [N.D3, 4], [N.G3, 4],
      ],
    },
    // Ocean — flowing, wavy, Dorian mode
    ocean: {
      bpm: 95,
      melody: [
        [N.D5, 3], [N.E5, 1], [N.F5, 2], [N.A5, 2],
        [N.G5, 2], [N.E5, 2], [N.D5, 2], [0, 2],
        [N.F5, 3], [N.E5, 1], [N.D5, 2], [N.C5, 2],
        [N.D5, 2], [N.E5, 2], [N.A5, 2], [0, 2],
        [N.D5, 2], [N.F5, 2], [N.A5, 2], [N.G5, 2],
        [N.E5, 2], [N.D5, 2], [0, 4],
      ],
      bass: [
        [N.D3, 4], [N.A3, 4],
        [N.G3, 4], [N.D3, 4],
        [N.F3, 4], [N.C3, 4],
        [N.D3, 4], [N.A3, 4],
      ],
    },
    // Volcano — intense, driving, aggressive minor
    volcano: {
      bpm: 150,
      melody: [
        [N.D5, 1], [N.D5, 1], [N.F5, 1], [N.D5, 1], [N.As4, 1], [N.D5, 1], [N.F5, 2],
        [N.Gs5, 1], [N.G5, 1], [N.F5, 1], [N.Ds5, 1], [N.D5, 1], [N.As4, 1], [N.A4, 2],
        [N.D5, 1], [N.D5, 1], [N.F5, 1], [N.D5, 1], [N.As4, 1], [N.D5, 1], [N.F5, 2],
        [N.A5, 2], [N.Gs5, 2], [N.G5, 2], [N.F5, 2], [N.D5, 2], [0, 2],
      ],
      bass: [
        [N.D3, 2], [N.D3, 2], [N.D3, 2], [N.D3, 2],
        [N.Ds3, 2], [N.Ds3, 2], [N.Ds3, 2], [N.Ds3, 2],
        [N.D3, 2], [N.D3, 2], [N.D3, 2], [N.D3, 2],
        [N.As3, 2], [N.A3, 2], [N.G3, 2], [N.F3, 2],
      ],
    },
    // DK Ladder — jaunty, bouncy Donkey Kong (NES) style walking theme
    dkLadder: {
      bpm: 152,
      melody: [
        [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.C6, 1], [N.B5, 1], [N.G5, 1],
        [N.A5, 1], [N.F5, 1], [N.A5, 1], [N.G5, 2], [0, 2],
        [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.C6, 1], [N.D6, 1], [N.C6, 1],
        [N.B5, 1], [N.G5, 1], [N.E5, 1], [N.C5, 2], [0, 2],
        [N.F5, 1], [N.A5, 1], [N.C6, 1], [N.A5, 1], [N.F5, 1], [N.D5, 1],
        [N.E5, 2], [N.G5, 2], [N.C5, 2], [0, 2],
      ],
      bass: [
        [N.C3, 2], [N.C3, 2], [N.G3, 2], [N.G3, 2],
        [N.A3, 2], [N.A3, 2], [N.E3, 2], [N.E3, 2],
        [N.F3, 2], [N.F3, 2], [N.C3, 2], [N.C3, 2],
        [N.G3, 2], [N.G3, 2], [N.C3, 2], [N.C3, 2],
      ],
    },
    // DK Platforms — brighter, higher and more frantic scaffold scramble
    dkPlatform: {
      bpm: 168,
      melody: [
        [N.G4, 1], [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.E5, 1], [N.C5, 1],
        [N.D5, 1], [N.F5, 1], [N.A5, 1], [N.F5, 1], [N.D5, 1], [N.C5, 1],
        [N.E5, 1], [N.G5, 1], [N.C6, 1], [N.G5, 1], [N.E5, 1], [N.G5, 1],
        [N.A5, 2], [N.F5, 2], [N.D5, 2], [N.C5, 2],
        [N.G4, 1], [N.C5, 1], [N.E5, 1], [N.G5, 1], [N.C6, 2],
        [N.B5, 1], [N.G5, 1], [N.E5, 1], [N.C5, 1], [N.D5, 1], [N.E5, 1],
        [N.C5, 2], [N.G4, 2],
      ],
      bass: [
        [N.G3, 2], [N.G3, 2], [N.C3, 2], [N.C3, 2],
        [N.D3, 2], [N.D3, 2], [N.G3, 2], [N.G3, 2],
        [N.E3, 2], [N.E3, 2], [N.A3, 2], [N.A3, 2],
        [N.F3, 2], [N.F3, 2], [N.C3, 2], [N.C3, 2],
      ],
    },
    // Menu — light, for start/selection screens
    menu: {
      bpm: 120,
      melody: [
        [N.C5, 2], [N.E5, 2], [N.G5, 2], [N.E5, 2],
        [N.A5, 2], [N.G5, 2], [N.E5, 2], [N.D5, 2],
        [N.C5, 2], [N.E5, 2], [N.G5, 2], [N.C6, 2],
        [N.B5, 2], [N.G5, 2], [N.E5, 2], [0, 2],
      ],
      bass: [
        [N.C3, 4], [N.G3, 4],
        [N.A3, 4], [N.E3, 4],
        [N.C3, 4], [N.G3, 4],
        [N.G3, 4], [0, 4],
      ],
    },
  };

  // Music player state
  let musicTimer = null;
  let musicTrack = null;
  let musicEnabled = true;
  let musicNextNoteTime = 0;   // absolute audioCtx time for the next note
  let musicStepIdx = 0;        // global 16th-note step counter

  // Play a single music note at a precise audioCtx time (lower volume than SFX)
  function playMusicNote(freq, dur, type, startTime) {
    const audioCtx = Sound._getCtx ? Sound._getCtx() : null;
    if (!audioCtx || !musicEnabled || !freq) return;
    if (Sound.isMuted()) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    // Soft attack/release for music notes
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
    g.gain.linearRampToValueAtTime(0.04, startTime + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, startTime + dur);
    osc.connect(g);
    g.connect(Sound._getMaster ? Sound._getMaster() : audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
  }

  // Lookahead scheduler — schedules notes ~100ms ahead using precise audioCtx time
  const MUSIC_LOOKAHEAD = 0.1;   // seconds to look ahead
  const MUSIC_SCHEDULE_INTERVAL = 25; // ms between scheduler ticks

  function scheduleMusicNotes() {
    const audioCtx = Sound._getCtx ? Sound._getCtx() : null;
    if (!audioCtx || !musicEnabled || !musicTrack) return;

    const track = musicTrack;
    const beatDur = (60 / track.bpm) / 4; // 16th-note duration in seconds

    // Schedule all notes that fall within the lookahead window
    while (musicNextNoteTime < audioCtx.currentTime + MUSIC_LOOKAHEAD) {
      const step = musicStepIdx;

      // --- Melody ---
      const melodyTotal = totalSteps(track.melody);
      const melodyPos = step % melodyTotal;
      let melodyStep = 0;
      for (let i = 0; i < track.melody.length; i++) {
        const noteLen = track.melody[i][1];
        if (melodyPos >= melodyStep && melodyPos < melodyStep + noteLen) {
          // Only trigger the note at the start of its duration
          if (melodyPos === melodyStep) {
            const note = track.melody[i];
            if (note && note[0] > 0) {
              playMusicNote(note[0], note[1] * beatDur * 0.9, 'square', musicNextNoteTime);
            }
          }
          break;
        }
        melodyStep += noteLen;
      }

      // --- Bass (half-speed: plays every 2 steps) ---
      if (step % 2 === 0) {
        const halfStep = step / 2;
        const bassTotal = totalSteps(track.bass);
        const bassPos = halfStep % bassTotal;
        let bassStep = 0;
        for (let i = 0; i < track.bass.length; i++) {
          const noteLen = track.bass[i][1];
          if (bassPos >= bassStep && bassPos < bassStep + noteLen) {
            if (bassPos === bassStep) {
              const note = track.bass[i];
              if (note && note[0] > 0) {
                playMusicNote(note[0], note[1] * beatDur * 0.9 * 2, 'triangle', musicNextNoteTime);
              }
            }
            break;
          }
          bassStep += noteLen;
        }
      }

      musicNextNoteTime += beatDur;
      musicStepIdx++;
    }
  }

  // Helper: total steps in a note array
  function totalSteps(notes) {
    let sum = 0;
    for (let i = 0; i < notes.length; i++) sum += notes[i][1];
    return sum;
  }

  function startMusic(trackName) {
    stopMusic();
    const track = MUSIC_TRACKS[trackName] || MUSIC_TRACKS.overworld;
    musicTrack = track;
    const audioCtx = Sound._getCtx ? Sound._getCtx() : null;
    if (!audioCtx) return;

    // Initialize scheduling state
    musicStepIdx = 0;
    musicNextNoteTime = audioCtx.currentTime + 0.05; // small delay before first note

    // Start the lookahead scheduler
    scheduleMusicNotes(); // schedule immediately
    musicTimer = setInterval(scheduleMusicNotes, MUSIC_SCHEDULE_INTERVAL);
  }

  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
    musicTrack = null;
  }

  function isMusicEnabled() { return musicEnabled; }
  function setMusicEnabled(v) { musicEnabled = v; }

  // ===== Game State =====
  let state = {
    running: false,
    coins: 0,
    score: 0,
    time: 300,
    frameCount: 0,
    cameraX: 0,
    levelEnd: 3200,
    currentLevel: 1,     // 1-based level number within the selected map
    maxLevels: 100,      // total levels per map
    playerCount: 1,      // 1 or 2 players
    paused: false,       // game paused state
    // Day/night cycle: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight, 1.0=dawn again
    timeOfDay: 0,
    // Screen shake (decays over time)
    shake: 0,
    shakeX: 0,
    shakeY: 0,
  };

  // Track which levels have been cleared (persists across retries within a session)
  // clearedLevels is a Set of level numbers (1..100)
  const clearedLevels = new Set();
  // The level the player has reached but not yet beaten
  let maxUnlockedLevel = 1;
  // Which level is currently selected on the level map screen
  let levelMapSelectedLevel = 1;

  // ===== LocalStorage Persistence =====
  const STORAGE_KEY = 'galicto_bros_save';
  let highScore = 0;

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        cleared: Array.from(clearedLevels),
        maxUnlocked: maxUnlockedLevel,
        highScore: highScore,
      }));
    } catch (e) { /* localStorage not available */ }
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.cleared)) {
        data.cleared.forEach((lv) => clearedLevels.add(lv));
      }
      if (typeof data.maxUnlocked === 'number') {
        maxUnlockedLevel = Math.max(1, Math.min(state.maxLevels, data.maxUnlocked));
      }
      if (typeof data.highScore === 'number') {
        highScore = data.highScore;
      }
    } catch (e) { /* corrupted data — ignore */ }
  }

  // Load saved progress on startup
  loadProgress();

  // ===== Power-Up Store System =====
  // Currency: coins collected in-game accumulate in a persistent wallet.
  // Items are purchased in the store and consumed during gameplay via hotkeys.
  let storeCoins = 0;

  // Store item definitions
  const STORE_ITEMS = [
    {
      id: 'mushroom',
      name: 'Mushroom',
      icon: '🍄',
      price: 5,
      desc: 'Instantly grow to Super',
    },
    {
      id: 'fireflower',
      name: 'Fire Flower',
      icon: '🔥',
      price: 10,
      desc: 'Shoot fireballs',
    },
    {
      id: 'iceflower',
      name: 'Ice Flower',
      icon: '❄️',
      price: 10,
      desc: 'Shoot ice balls, freeze enemies',
    },
    {
      id: 'star',
      name: 'Star',
      icon: '⭐',
      price: 15,
      desc: '6s invincibility',
    },
    {
      id: 'extralife',
      name: 'Extra Life',
      icon: '❤️',
      price: 20,
      desc: '+1 life immediately',
    },
    {
      id: 'timebonus',
      name: 'Time +50',
      icon: '⏰',
      price: 8,
      desc: '+50 seconds on timer',
    },
  ];

  // Inventory: { itemId: quantity } — purchased items held for use during the game
  let storeInventory = {};

  function saveStoreCoins() {
    try {
      localStorage.setItem('galicto_bros_coins', JSON.stringify(storeCoins));
    } catch (e) { /* ignore */ }
  }

  function loadStoreCoins() {
    try {
      const raw = localStorage.getItem('galicto_bros_coins');
      if (raw) storeCoins = JSON.parse(raw) || 0;
    } catch (e) { storeCoins = 0; }
  }
  loadStoreCoins();

  // Build the store UI
  function renderStore() {
    storeGrid.innerHTML = '';
    storeCoinsEl.textContent = storeCoins;
    STORE_ITEMS.forEach((item, idx) => {
      const owned = storeInventory[item.id] || 0;
      const card = document.createElement('div');
      card.className = 'store-card';
      card.innerHTML = `
        <div class="store-card__icon">${item.icon}</div>
        <div class="store-card__name">${item.name}</div>
        <div class="store-card__price">${item.price}🪙</div>
        <div class="store-card__qty">${owned > 0 ? 'Owned: ' + owned : ''}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'store-card__btn';
      btn.textContent = 'BUY';
      if (storeCoins < item.price) {
        btn.classList.add('store-card__btn--disabled');
        card.classList.add('store-card--disabled');
        btn.disabled = true;
      }
      btn.addEventListener('click', () => {
        if (storeCoins < item.price) return;
        storeCoins -= item.price;
        storeInventory[item.id] = (storeInventory[item.id] || 0) + 1;
        saveStoreCoins();
        Sound.sfx.select();
        renderStore();
      });
      card.appendChild(btn);
      storeGrid.appendChild(card);
    });
  }

  function openStore() {
    levelMapScreen.classList.add('hidden');
    storeScreen.classList.remove('hidden');
    renderStore();
  }

  function closeStore() {
    storeScreen.classList.add('hidden');
    levelMapScreen.classList.remove('hidden');
  }

  // Activate a store item during gameplay (hotkeys 1-3)
  function useStoreItem(slot) {
    if (!state.running || state.paused) return;
    // Slots map to item indices in order: 0=mushroom, 1=fireflower, 2=iceflower
    const slotMap = ['mushroom', 'fireflower', 'iceflower'];
    const itemId = slotMap[slot];
    if (!itemId) return;
    if (!storeInventory[itemId] || storeInventory[itemId] <= 0) return;
    storeInventory[itemId]--;
    const item = STORE_ITEMS.find((i) => i.id === itemId);

    // Apply to the first active player
    const p = players.find((pl) => pl.active && !pl.dead) || players[0];
    if (!p) return;

    if (itemId === 'mushroom') {
      if (p.powerUp === 'small') {
        p.powerUp = 'super';
        p.growTimer = 30;
        applyPlayerSize(p);
      }
      spawnParticles(p.x + p.w / 2, p.y, '#ff4444', 10);
      Sound.sfx.powerup();
    } else if (itemId === 'fireflower') {
      p.powerUp = 'fire';
      p.growTimer = 30;
      applyPlayerSize(p);
      spawnParticles(p.x + p.w / 2, p.y, '#ff8800', 12);
      Sound.sfx.powerup();
    } else if (itemId === 'iceflower') {
      p.powerUp = 'ice';
      p.growTimer = 30;
      applyPlayerSize(p);
      spawnParticles(p.x + p.w / 2, p.y, '#88ddff', 12);
      Sound.sfx.powerup();
    }

    updateHUD();
  }

  // ===== Character Definitions =====
  // Each character has a palette of colors used by drawPlayer.
  // The draw function reads these instead of hardcoded colors.
  const CHARACTERS = [
    {
      id: 'mario',
      name: 'Galicto',
      desc: 'Classic red hero. Balanced stats.',
      colors: { shirt: '#e52521', overalls: '#0040c0', skin: '#ffcc99', hat: '#e52521', hair: '#5c2d0c', shoes: '#5c2d0c' },
      stats: { jumpForce: 13, moveSpeed: 4, accel: 0.8, floatTime: 0 },
    },
    {
      id: 'luigi',
      name: 'Kennith',
      desc: 'Green jumper. Higher jump!',
      colors: { shirt: '#2d9e2d', overalls: '#0040c0', skin: '#ffcc99', hat: '#2d9e2d', hair: '#5c2d0c', shoes: '#5c2d0c' },
      stats: { jumpForce: 15, moveSpeed: 3.6, accel: 0.7, floatTime: 0 },
    },
    {
      id: 'peach',
      name: 'Princess Joy',
      desc: 'Royal pink. Floaty jumps.',
      colors: { shirt: '#e060a0', overalls: '#e060a0', skin: '#ffcc99', hat: '#e060a0', hair: '#fcd000', shoes: '#e060a0' },
      stats: { jumpForce: 12, moveSpeed: 3.8, accel: 0.75, floatTime: 30 },
    },
    {
      id: 'toad',
      name: 'Ken Jr.',
      desc: 'Fast little buddy.',
      colors: { shirt: '#ffffff', overalls: '#0040c0', skin: '#ffcc99', hat: '#e52521', hair: '#ffffff', shoes: '#5c2d0c' },
      stats: { jumpForce: 12, moveSpeed: 5, accel: 1.0, floatTime: 0 },
    },
    {
      id: 'blue',
      name: 'Shadow',
      desc: 'Mystery blue variant.',
      colors: { shirt: '#1a5276', overalls: '#1a5276', skin: '#ffcc99', hat: '#1a5276', hair: '#5c2d0c', shoes: '#1a1a1a' },
      stats: { jumpForce: 13.5, moveSpeed: 4.2, accel: 0.85, floatTime: 10 },
    },
  ];

  // ===== Map Definitions =====
  // Each map mirrors a Super Mario Bros world theme.
  const MAPS = [
    {
      id: 'overworld',
      name: 'Overworld',
      desc: 'Classic grassland — World 1-1',
      skyTop: '#5c94fc',
      skyBottom: '#8ec7fc',
      groundColor: '#c84c0c',    // orange-brown ground tiles
      grassColor: '#3a9d3a',     // green grass top
      platColor: '#e09030',      // brick/block orange
      pipeColor: '#2d9e2d',      // green pipes
      pipeRim: '#1a7a1a',
      stairColor: '#c84c0c',     // solid block stairs
      hillColor: '#3a9d3a',
      bushColor: '#2d7a2d',
    },
    {
      id: 'underground',
      name: 'Underground',
      desc: 'Dark caves — World 1-2',
      skyTop: '#000000',
      skyBottom: '#0a0a20',
      groundColor: '#0a0a30',
      grassColor: '#4a4a8a',
      platColor: '#2a2a5a',
      pipeColor: '#2d9e2d',
      pipeRim: '#1a7a1a',
      stairColor: '#2a2a5a',
      hillColor: '#1a1a3a',
      bushColor: '#1a1a3a',
    },
    {
      id: 'athletic',
      name: 'Athletic',
      desc: 'Sky high platforms — World 1-3',
      skyTop: '#5c94fc',
      skyBottom: '#b0d0ff',
      groundColor: '#2d9e2d',
      grassColor: '#5cd05c',
      platColor: '#e09030',
      pipeColor: '#2d9e2d',
      pipeRim: '#1a7a1a',
      stairColor: '#c84c0c',
      hillColor: '#3a9d3a',
      bushColor: '#2d7a2d',
    },
    {
      id: 'castle',
      name: 'Castle',
      desc: 'Bowser\'s lair — World 1-4',
      skyTop: '#1a0a0a',
      skyBottom: '#2a0a0a',
      groundColor: '#4a4a4a',
      grassColor: '#6a6a6a',
      platColor: '#8a8a8a',
      pipeColor: '#2d9e2d',
      pipeRim: '#1a7a1a',
      stairColor: '#5a5a5a',
      hillColor: '#3a1a1a',
      bushColor: '#3a1a1a',
    },
    {
      id: 'desert',
      name: 'Desert',
      desc: 'Scorching sand dunes — World 2-1',
      skyTop: '#f4a460',
      skyBottom: '#ffd89b',
      groundColor: '#c2a14d',     // sandy ground
      grassColor: '#daa520',      // golden top
      platColor: '#d2691e',       // terracotta blocks
      pipeColor: '#cd853f',       // sandy pipes
      pipeRim: '#a0522d',
      stairColor: '#b8860b',      // dark gold stairs
      hillColor: '#daa520',       // golden dunes
      bushColor: '#b8860b',       // dark gold bushes (palm-like)
    },
    {
      id: 'snow',
      name: 'Snow',
      desc: 'Frozen wonderland — World 3-1',
      skyTop: '#87ceeb',
      skyBottom: '#e0f6ff',
      groundColor: '#f0f8ff',     // icy white ground
      grassColor: '#b0e0e6',      // light blue snow top
      platColor: '#4682b4',       // steel blue ice blocks
      pipeColor: '#5f9ea0',       // cadet blue pipes
      pipeRim: '#3a7a7a',
      stairColor: '#87ceeb',      // light blue stairs
      hillColor: '#f0ffff',       // snowy hills
      bushColor: '#b0c4de',       // light steel blue snow bushes
    },
    {
      id: 'ocean',
      name: 'Ocean',
      desc: 'Underwater adventure — World 4-1',
      skyTop: '#0077be',
      skyBottom: '#40a0d0',
      groundColor: '#2f4f4f',     // dark slate sea floor
      grassColor: '#20b2aa',      // light sea green coral
      platColor: '#48d1cc',       // medium turquoise blocks
      pipeColor: '#008b8b',       // dark cyan pipes
      pipeRim: '#006666',
      stairColor: '#5f9ea0',      // cadet blue stairs
      hillColor: '#2e8b57',       // sea green hills (kelp)
      bushColor: '#3cb371',       // medium sea green bushes (coral)
    },
    {
      id: 'volcano',
      name: 'Volcano',
      desc: 'Inferno of lava and fire — World 5-1',
      skyTop: '#2a0a00',
      skyBottom: '#5c1a00',
      groundColor: '#8b0000',     // dark red volcanic rock
      grassColor: '#ff4500',      // orange-red lava top
      platColor: '#cd5c5c',       // indian red blocks
      pipeColor: '#b22222',       // firebrick pipes
      pipeRim: '#8b0000',
      stairColor: '#a52a2a',      // brown stairs
      hillColor: '#4a0000',       // dark volcano hills
      bushColor: '#ff6347',       // tomato red flames
    },
    {
      // Real Donkey Kong (1981) — Stage 1 "girders": orange/terracotta
      // girder slats, cyan-blue background, green hills, blue sky.
      id: 'dkLadder',
      name: 'DK Girders',
      desc: 'Donkey Kong stage 1 — girders & fireballs',
      skyTop: '#4a6fd4',
      skyBottom: '#8fb4ef',
      groundColor: '#c85a2b',     // terracotta girder brick
      grassColor: '#e8783a',      // orange top edge
      platColor: '#d06028',       // girder slats
      pipeColor: '#e09030',       // oil drums
      pipeRim: '#a8461a',
      stairColor: '#2a52e0',      // blue ladders
      hillColor: '#2f7a2f',       // green hills
      bushColor: '#3f9a3f',       // green bushes
      girderColor: '#d06028',     // DK girder slat
      ladderColor: '#3a6ce8',     // DK ladder rails/rungs
      oilColor: '#c0392b',        // oil drum red
      weather: 'none',            // the arcade game has no weather
    },
    {
      // Real Donkey Kong (1981) — Stage 2/3 "cage": teal/cyan girders
      // against a black void, orange support columns, blue barrels.
      id: 'dkPlatform',
      name: 'DK Barrels',
      desc: 'Donkey Kong stage 2 — barrels & conveyors',
      skyTop: '#000000',
      skyBottom: '#0a1418',
      groundColor: '#2a9aa8',     // teal girder brick
      grassColor: '#3fc4d4',      // cyan top edge
      platColor: '#2a9aa8',       // teal slats
      pipeColor: '#e09030',       // orange support columns
      pipeRim: '#a8461a',
      stairColor: '#1c6a78',      // darker teal ladders
      hillColor: '#0e4a52',       // dark teal beams
      bushColor: '#1c7a88',       // teal accents
      girderColor: '#2a9aa8',     // DK girder slat
      ladderColor: '#3fc4d4',     // cyan ladders
      oilColor: '#4a7fe0',        // blue barrels
      weather: 'none',
    },
  ];

  // Currently selected character and map (defaults)
  let selectedChar = 0;   // P1 character index
  let selectedChar2 = 1;  // P2 character index
  let selectedMap = 0;
  // Currently selected game in the game select screen
  let selectedGame = 'platformer';
  // Which player's character we're picking (1 or 2)
  let charSelectingPlayer = 1;
  // Active palette/theme during gameplay
  let activeChars = [CHARACTERS[0], CHARACTERS[1]];
  let activeMap = MAPS[0];

  // ===== Input =====
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    keys[e.key.toLowerCase()] = true;
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    keys[e.key.toLowerCase()] = false;
  });

  // Shoot fireball on key press (not hold) — P1: F/Shift, P2: O
  window.addEventListener('keydown', (e) => {
    if (!state.running) return;
    if (e.key === 'f' || e.key === 'F' || e.key === 'Shift') {
      shootFireball(players[0]);
    } else if (e.key === 'o' || e.key === 'O') {
      if (state.playerCount === 2) shootFireball(players[1]);
    } else if (e.key === '1') {
      useStoreItem(0);
    } else if (e.key === '2') {
      useStoreItem(1);
    } else if (e.key === '3') {
      useStoreItem(2);
    }
  });

  // Touch controls
  document.querySelectorAll('.touch-btn').forEach((btn) => {
    const key = btn.getAttribute('data-key');
    const press = (e) => { e.preventDefault(); keys[key] = true; };
    const release = (e) => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener('touchstart', press);
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  // Shoot button (touch) — P1
  const shootBtn = document.getElementById('shootBtn');
  if (shootBtn) {
    const shootPress = (e) => { e.preventDefault(); if (state.running) shootFireball(players[0]); };
    shootBtn.addEventListener('touchstart', shootPress);
    shootBtn.addEventListener('mousedown', shootPress);
  }

  // Shoot button (touch) — P2
  const shootBtnP2 = document.getElementById('shootBtnP2');
  if (shootBtnP2) {
    const shootPress = (e) => { e.preventDefault(); if (state.running && state.playerCount === 2) shootFireball(players[1]); };
    shootBtnP2.addEventListener('touchstart', shootPress);
    shootBtnP2.addEventListener('mousedown', shootPress);
  }

  // ===== Gamepad Support =====
  // Maps gamepad inputs to the same keys{} object used by keyboard.
  // P1 → gamepad 0, P2 → gamepad 1 (if connected).
  // Standard mapping: d-pad/left stick = move, A (btn 0) = jump, B/X (btn 1/2) = shoot,
  // Start (btn 9) = pause.
  const GAMEPAD_DEADZONE = 0.4;
  // Track previous button states to detect "just pressed" for shoot & pause
  const gamepadPrevButtons = [{}, {}];
  let gamepadPausePressed = false;
  // Separate gamepad key state, merged into keys{} each frame
  const gamepadKeys = {};

  function pollGamepads() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();

    // Clear previous gamepad contributions
    const allGpKeys = ['arrowleft', 'arrowright', 'arrowup', ' ', 'j', 'l', 'i'];
    allGpKeys.forEach((k) => { gamepadKeys[k] = false; });

    for (let pi = 0; pi < 2; pi++) {
      const gp = pads[pi];
      if (!gp) continue;

      // Only control players that are active
      if (pi === 1 && state.playerCount !== 2) continue;

      const ctrl = CONTROLS[pi];
      const prev = gamepadPrevButtons[pi];

      // --- Movement: left stick X or d-pad ---
      const lx = gp.axes[0] || 0;
      const dxLeft = gp.buttons[14] ? gp.buttons[14].value > 0.5 : false;
      const dxRight = gp.buttons[15] ? gp.buttons[15].value > 0.5 : false;

      if (lx < -GAMEPAD_DEADZONE || dxLeft) gamepadKeys[ctrl.left] = true;
      if (lx > GAMEPAD_DEADZONE || dxRight) gamepadKeys[ctrl.right] = true;

      // --- Jump: A button (btn 0) ---
      const jumpBtn = gp.buttons[0] ? gp.buttons[0].value > 0.5 : false;
      if (jumpBtn) {
        gamepadKeys[ctrl.jump] = true;
        if (ctrl.jumpAlt) gamepadKeys[ctrl.jumpAlt] = true;
      }

      // --- Shoot: B (btn 1) or X (btn 2) — edge-triggered ---
      const shootBtnVal = (gp.buttons[1] && gp.buttons[1].value > 0.5) ||
                          (gp.buttons[2] && gp.buttons[2].value > 0.5);
      if (shootBtnVal && !prev.shoot && state.running) {
        shootFireball(players[pi]);
      }
      prev.shoot = shootBtnVal;

      // --- Pause: Start button (btn 9) — edge-triggered, only P1 ---
      if (pi === 0) {
        const startBtnVal = gp.buttons[9] ? gp.buttons[9].value > 0.5 : false;
        if (startBtnVal && !gamepadPausePressed) {
          togglePause();
        }
        gamepadPausePressed = startBtnVal;
      }
    }

    // Merge gamepad keys into the main keys object
    // (OR with keyboard state — if either is pressed, the key is "down")
    allGpKeys.forEach((k) => {
      if (gamepadKeys[k]) keys[k] = true;
    });
    // Clear keys that the gamepad released (and keyboard isn't holding)
    clearReleasedGamepadKeys();
  }

  // Track gamepad-to-key mapping for proper release handling
  const gamepadKeyMap = {
    arrowleft: ['arrowleft'],
    arrowright: ['arrowright'],
    arrowup: ['arrowup'],
    ' ': [' '],
    j: ['j'],
    l: ['l'],
    i: ['i'],
  };
  const prevGamepadKeys = {};
  function clearReleasedGamepadKeys() {
    Object.keys(gamepadKeyMap).forEach((gk) => {
      const wasPressed = prevGamepadKeys[gk];
      const isPressed = gamepadKeys[gk];
      if (wasPressed && !isPressed) {
        // Gamepad released this key — clear it from keys (unless keyboard still holds it)
        // We can't distinguish, so we clear it; keyboard keydown will re-set it if needed.
        keys[gk] = false;
      }
      prevGamepadKeys[gk] = isPressed;
    });
  }

  // ===== Player =====
  // Power-up levels: 'small' → 'super' → 'fire'
  // 'star' is a temporary invincibility overlay on top of any level

  // Control schemes for each player
  const CONTROLS = [
    { left: 'arrowleft', right: 'arrowright', jump: 'arrowup', jumpAlt: ' ', shoot: 'f' },
    { left: 'j', right: 'l', jump: 'i', jumpAlt: null, shoot: 'o' },
  ];

  function createPlayer(index) {
    const charIdx = index === 0 ? selectedChar : selectedChar2;
    const stats = CHARACTERS[charIdx].stats;
    return {
      index,           // 0 for P1, 1 for P2
      active: true,    // whether this player is in the game
      lives: 3,
      x: 80 + index * 40,
      y: GROUND_Y - 40,
      w: 28, h: 36,
      vx: 0, vy: 0,
      onGround: false,
      facing: 1,
      invincible: 0,
      walkFrame: 0,
      powerUp: 'small',   // 'small' | 'super' | 'fire' | 'ice'
      starTimer: 0,        // star power duration
      growTimer: 0,        // animation timer for growing/shrinking
      fireballCooldown: 0,
      jumps: 0,            // jumps used since last ground touch (for double jump)
      jumpHeld: false,     // debounce: prevent holding jump
      dead: false,         // temporarily dead (waiting respawn or game over)
      deadTimer: 0,
      // Character-specific stats
      stats: { ...stats },
      floatTimer: 0,       // remaining float frames (for floaty characters)
      squashTimer: 0,      // squash-stretch animation on landing
    };
  }

  // Player array: index 0 = P1, index 1 = P2 (may be inactive)
  let players = [createPlayer(0), createPlayer(1)];

  // Sizes for each power-up level
  const PLAYER_SIZES = {
    small: { w: 22, h: 28 },
    super: { w: 28, h: 40 },
    fire:  { w: 28, h: 40 },
    ice:   { w: 28, h: 40 },
  };

  function applyPlayerSize(p) {
    const size = PLAYER_SIZES[p.powerUp] || PLAYER_SIZES.small;
    // Preserve bottom position when resizing
    const bottom = p.y + p.h;
    p.w = size.w;
    p.h = size.h;
    p.y = bottom - p.h;
  }

  function resetPlayer(p) {
    // Respawn at the last checkpoint, or the start if none activated
    p.x = currentCheckpoint !== null ? currentCheckpoint : (80 + p.index * 40);
    p.powerUp = 'small';
    applyPlayerSize(p);
    p.y = GROUND_Y - p.h;
    p.vx = 0;
    p.vy = 0;
    p.onGround = false;
    p.invincible = 90;
    p.starTimer = 0;
    p.fireballCooldown = 0;
    p.jumps = 0;
    p.jumpHeld = false;
    p.dead = false;
    p.deadTimer = 0;
  }

  // Convenience accessor for single-player code paths
  function player() { return players[0]; }

  // ===== Entities =====
  let platforms = [];
  let coins = [];
  let enemies = [];
  let flag = null;
  let particles = [];
  let powerups = [];      // power-up items in the world
  let fireballs = [];     // player-shot fireballs
  let checkpoints = [];   // checkpoint flags in the level
  let currentCheckpoint = null; // x position of the last activated checkpoint

  // ===== Donkey Kong: stage-specific state =====
  // Lava/fire pits (instant death) — used by the DK 1-4 finale stage.
  let lavaZones = [];
  // The current DK stage ('girders' | 'conveyors' | 'cage' | 'summit' | null).
  // Controls which decorative layer DK renders (DK sprite, Pauline, clouds...).
  let dkStage = null;
  // DK's own position (x/y) and state, drawn as the boss sprite.
  let dkBoss = null;
  // Pauline's position, drawn on the upper girder in the finale stage.
  let pauline = null;

  // ===== Atmosphere: Weather & Parallax Layers =====
  // Weather particles (rain, snow, embers, bubbles — themed per map)
  let weatherParticles = [];
  // Current weather type, set when a level builds
  let weatherType = 'none'; // 'rain' | 'snow' | 'embers' | 'bubbles' | 'none'

  // Parallax background objects (mountains, trees, etc.) generated per level
  let parallaxLayers = [];

  function initWeather() {
    weatherParticles = [];
    const mapId = activeMap.id || 'overworld';
    // Pick weather based on map theme
    const weatherMap = {
      overworld: 'rain',    // occasional rain
      underground: 'none',  // enclosed — no weather
      athletic: 'rain',
      castle: 'embers',     // floating embers
      desert: 'embers',     // sand dust
      snow: 'snow',
      ocean: 'bubbles',     // underwater bubbles
      volcano: 'embers',
      dkLadder: 'none',      // the arcade game has no weather
      dkPlatform: 'none',
    };
    // A map may declare its own weather; otherwise fall back to the table.
    weatherType = (activeMap.weather !== undefined)
      ? activeMap.weather
      : (weatherMap[mapId] || 'none');
    if (weatherType === 'none') return;
    // Pre-seed particles
    const count = 60;
    for (let i = 0; i < count; i++) {
      spawnWeatherParticle(true);
    }
  }

  function spawnWeatherParticle(randomY) {
    if (weatherType === 'none') return;
    const p = {
      x: Math.random() * W,
      y: randomY ? Math.random() * H : -10,
      vx: 0,
      vy: 0,
      life: 1,
      size: 1,
      color: '#fff',
    };
    if (weatherType === 'rain') {
      p.vx = -2;
      p.vy = 8 + Math.random() * 4;
      p.size = 1;
      p.color = 'rgba(180,200,255,0.6)';
    } else if (weatherType === 'snow') {
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = 1 + Math.random() * 1.5;
      p.size = 2 + Math.random() * 2;
      p.color = 'rgba(255,255,255,0.8)';
    } else if (weatherType === 'embers') {
      p.vx = (Math.random() - 0.5) * 1;
      p.vy = -1 - Math.random() * 2;
      p.size = 1 + Math.random() * 2;
      p.color = Math.random() > 0.5 ? 'rgba(255,120,0,0.7)' : 'rgba(255,200,0,0.5)';
      p.y = randomY ? Math.random() * H : H + 10;
    } else if (weatherType === 'bubbles') {
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vy = -1 - Math.random() * 1.5;
      p.size = 2 + Math.random() * 4;
      p.color = 'rgba(200,230,255,0.4)';
      p.y = randomY ? Math.random() * H : H + 10;
    }
    weatherParticles.push(p);
  }

  function updateWeather() {
    if (weatherType === 'none') return;
    for (let i = weatherParticles.length - 1; i >= 0; i--) {
      const p = weatherParticles[i];
      p.x += p.vx * dtRatio;
      p.y += p.vy * dtRatio;
      // Recycle particles that go off-screen
      if (weatherType === 'rain' || weatherType === 'snow') {
        if (p.y > H || p.x < -20 || p.x > W + 20) {
          weatherParticles.splice(i, 1);
          spawnWeatherParticle(false);
        }
      } else {
        // Embers/bubbles rise — recycle when they reach the top
        if (p.y < -20) {
          weatherParticles.splice(i, 1);
          spawnWeatherParticle(false);
        }
      }
    }
  }

  function drawWeather() {
    if (weatherType === 'none') return;
    weatherParticles.forEach((p) => {
      ctx.fillStyle = p.color;
      if (weatherType === 'rain') {
        ctx.fillRect(p.x, p.y, 1, p.vy);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Generate parallax background layers for the current level
  function initParallax() {
    parallaxLayers = [];
    // Far layer: large silhouettes (mountains/towers)
    const farCount = Math.ceil(state.levelEnd / 600) + 2;
    for (let i = 0; i < farCount; i++) {
      parallaxLayers.push({
        x: i * 600 + Math.random() * 100,
        y: GROUND_Y,
        w: 200 + Math.random() * 100,
        h: 150 + Math.random() * 100,
        color: activeMap.hillColor,
        parallax: 0.2,
        type: 'mountain',
      });
    }
    // Mid layer: smaller hills/trees
    const midCount = Math.ceil(state.levelEnd / 280) + 2;
    for (let i = 0; i < midCount; i++) {
      parallaxLayers.push({
        x: i * 280 + Math.random() * 60,
        y: GROUND_Y,
        w: 80 + Math.random() * 40,
        h: 60 + Math.random() * 40,
        color: activeMap.bushColor,
        parallax: 0.4,
        type: 'hill',
      });
    }
  }

  function drawParallax() {
    parallaxLayers.forEach((l) => {
      const lx = l.x - state.cameraX * l.parallax;
      if (lx + l.w < -50 || lx > W + 50) return;
      ctx.fillStyle = l.color;
      ctx.globalAlpha = l.parallax < 0.3 ? 0.5 : 0.7;
      ctx.beginPath();
      if (l.type === 'mountain') {
        // Triangular mountain silhouette
        ctx.moveTo(lx, l.y);
        ctx.lineTo(lx + l.w / 2, l.y - l.h);
        ctx.lineTo(lx + l.w, l.y);
      } else {
        // Rounded hill
        ctx.arc(lx + l.w / 2, l.y, l.w / 2, Math.PI, 0);
      }
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ===== Hand-Crafted Level Layouts (Super Mario Bros style) =====
  // Each layout defines: ground segments, floating blocks, pipes, stairs,
  // coins, enemies, power-ups, checkpoints, and the flag position.
  // Layouts are designed to feel like authentic SMB levels.
  const LEVEL_LAYOUTS = [
    // --- Level 1: Overworld (World 1-1 inspired) ---
    {
      length: 3400,
      time: 300,
      ground: [
        { x: 0, w: 688 }, { x: 752, w: 384 }, { x: 1184, w: 320 },
        { x: 1568, w: 512 }, { x: 2144, w: 448 }, { x: 2656, w: 768 },
      ],
      blocks: [
        // First question block + brick row (like SMB 1-1 first area)
        { x: 176, y: 320, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 272, y: 320, w: 32, type: 'brick' },
        { x: 304, y: 320, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 336, y: 320, w: 32, type: 'brick' },
        { x: 368, y: 320, w: 32, type: 'question', powerup: 'star' },
        { x: 400, y: 320, w: 32, type: 'brick' },
        // High block platform (bonus area)
        { x: 528, y: 224, w: 96, type: 'brick' },
        // Pipe area blocks
        { x: 1024, y: 256, w: 64, type: 'brick' },
        { x: 1088, y: 224, w: 32, type: 'question', powerup: 'mushroom' },
        // Mid-level floating platform
        { x: 1328, y: 288, w: 64, type: 'brick' },
        // Staircase before gap (ascending)
        { x: 1500, y: 372, w: 32, type: 'stair' },
        { x: 1532, y: 340, w: 32, type: 'stair' },
        { x: 1564, y: 308, w: 32, type: 'stair' },
        // After gap — descending staircase
        { x: 1620, y: 308, w: 32, type: 'stair' },
        { x: 1652, y: 340, w: 32, type: 'stair' },
        { x: 1684, y: 372, w: 32, type: 'stair' },
        // High platform with coins
        { x: 1800, y: 240, w: 128, type: 'brick' },
        // Before-end staircase up to flag (classic SMB ending)
        { x: 2800, y: 372, w: 32, type: 'stair' },
        { x: 2832, y: 340, w: 32, type: 'stair' },
        { x: 2864, y: 308, w: 32, type: 'stair' },
        { x: 2896, y: 276, w: 32, type: 'stair' },
        { x: 2928, y: 244, w: 32, type: 'stair' },
      ],
      pipes: [
        { x: 810, h: 48 },   // small pipe
        { x: 930, h: 64 },   // medium pipe
        { x: 1060, h: 80 },  // tall pipe
        { x: 2400, h: 64 },  // pipe near end
      ],
      coins: [
        // Coin arc over first gap
        { x: 700, y: 340 }, { x: 720, y: 320 }, { x: 740, y: 310 },
        { x: 730, y: 320 },
        // Coins on high block platform
        { x: 540, y: 192 }, { x: 560, y: 192 }, { x: 580, y: 192 }, { x: 600, y: 192 },
        // Coins near first pipe
        { x: 770, y: 420 }, { x: 1000, y: 420 },
        // Coins above blocks
        { x: 280, y: 288 }, { x: 312, y: 288 }, { x: 376, y: 288 },
        // Mid-level coins
        { x: 1200, y: 420 }, { x: 1340, y: 256 },
        // Coins on high platform
        { x: 1820, y: 208 }, { x: 1840, y: 208 }, { x: 1860, y: 208 }, { x: 1880, y: 208 },
        // Ground coins
        { x: 100, y: 420 }, { x: 140, y: 420 },
        { x: 1120, y: 420 }, { x: 1280, y: 420 },
        { x: 1900, y: 420 }, { x: 2050, y: 420 },
        { x: 2200, y: 420 }, { x: 2400, y: 420 },
        { x: 2600, y: 420 }, { x: 2700, y: 420 }, { x: 2750, y: 420 },
        // Coins over gap before final stairs
        { x: 2100, y: 340 }, { x: 2120, y: 320 }, { x: 2140, y: 340 },
      ],
      enemies: [
        { x: 500, minX: 460, maxX: 680, speed: 1.2 },
        { x: 820, minX: 760, maxX: 1130, speed: 1.2 },
        { x: 1130, minX: 1080, maxX: 1180, speed: 1.2 },
        { x: 1250, minX: 1190, maxX: 1480, speed: 1.2 },
        { x: 1700, minX: 1580, maxX: 2070, speed: 1.3 },
        { x: 1850, minX: 1580, maxX: 2070, speed: 1.3 },
        { x: 2250, minX: 2150, maxX: 2580, speed: 1.4 },
        { x: 2500, minX: 2400, maxX: 2650, speed: 1.4 },
      ],
      powerups: [
        // Remaining power-ups come from question blocks; these are extra pickups
        { x: 1860, y: 208, type: 'star' },
        { x: 2450, y: 400, type: 'mushroom' },
      ],
      checkpoints: [520, 1450, 2400],
      flagX: 3050,
    },
    // --- Level 2: Underground (World 1-2 inspired) ---
    {
      length: 3600,
      time: 260,
      ground: [
        { x: 0, w: 512 }, { x: 576, w: 256 }, { x: 896, w: 384 },
        { x: 1344, w: 320 }, { x: 1728, w: 448 }, { x: 2240, w: 384 },
        { x: 2688, w: 320 }, { x: 3072, w: 528 },
      ],
      blocks: [
        // Ceiling brick rows (underground feel)
        { x: 128, y: 192, w: 160, type: 'brick' },
        { x: 384, y: 160, w: 96, type: 'brick' },
        // Question blocks
        { x: 200, y: 320, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 264, y: 320, w: 32, type: 'question', powerup: 'fireflower' },
        // Floating platform cluster
        { x: 640, y: 288, w: 128, type: 'brick' },
        { x: 672, y: 224, w: 32, type: 'question', powerup: 'star' },
        // Narrow blocks over gap
        { x: 864, y: 256, w: 64, type: 'brick' },
        // Staircase up
        { x: 1280, y: 372, w: 32, type: 'stair' },
        { x: 1312, y: 340, w: 32, type: 'stair' },
        { x: 1344, y: 308, w: 32, type: 'stair' },
        // Staircase down
        { x: 1400, y: 308, w: 32, type: 'stair' },
        { x: 1432, y: 340, w: 32, type: 'stair' },
        { x: 1464, y: 372, w: 32, type: 'stair' },
        // High brick corridor
        { x: 1760, y: 256, w: 192, type: 'brick' },
        { x: 1792, y: 192, w: 32, type: 'question', powerup: 'mushroom' },
        // Block bridge over pit
        { x: 2176, y: 320, w: 96, type: 'brick' },
        // Final staircase
        { x: 3200, y: 372, w: 32, type: 'stair' },
        { x: 3232, y: 340, w: 32, type: 'stair' },
        { x: 3264, y: 308, w: 32, type: 'stair' },
        { x: 3296, y: 276, w: 32, type: 'stair' },
        { x: 3328, y: 244, w: 32, type: 'stair' },
      ],
      pipes: [
        { x: 460, h: 64 },
        { x: 960, h: 80 },
        { x: 1600, h: 48 },
        { x: 2300, h: 64 },
      ],
      coins: [
        // Under ceiling bricks
        { x: 140, y: 288 }, { x: 176, y: 288 }, { x: 212, y: 288 },
        { x: 280, y: 288 }, { x: 316, y: 288 }, { x: 352, y: 288 },
        // On floating platform
        { x: 650, y: 256 }, { x: 670, y: 256 }, { x: 690, y: 256 }, { x: 710, y: 256 },
        // Coin arc over gaps
        { x: 540, y: 340 }, { x: 558, y: 320 }, { x: 576, y: 340 },
        { x: 860, y: 320 }, { x: 878, y: 300 }, { x: 896, y: 320 },
        { x: 1680, y: 340 }, { x: 1698, y: 320 }, { x: 1716, y: 340 },
        // High corridor coins
        { x: 1780, y: 224 }, { x: 1820, y: 224 }, { x: 1860, y: 224 }, { x: 1900, y: 224 },
        // Ground coins
        { x: 60, y: 420 }, { x: 100, y: 420 },
        { x: 920, y: 420 }, { x: 960, y: 420 },
        { x: 1360, y: 420 }, { x: 1500, y: 420 },
        { x: 2000, y: 420 }, { x: 2100, y: 420 },
        { x: 2500, y: 420 }, { x: 2600, y: 420 },
        { x: 2900, y: 420 }, { x: 3000, y: 420 },
        // Bridge coins
        { x: 2200, y: 288 }, { x: 2220, y: 288 }, { x: 2240, y: 288 },
      ],
      enemies: [
        { x: 300, minX: 200, maxX: 500, speed: 1.4 },
        { x: 680, minX: 580, maxX: 880, speed: 1.4 },
        { x: 1000, minX: 900, maxX: 1320, speed: 1.5 },
        { x: 1100, minX: 900, maxX: 1320, speed: 1.5 },
        { x: 1500, minX: 1350, maxX: 1700, speed: 1.5 },
        { x: 1900, minX: 1730, maxX: 2230, speed: 1.6 },
        { x: 2050, minX: 1730, maxX: 2230, speed: 1.6 },
        { x: 2500, minX: 2240, maxX: 2680, speed: 1.6 },
        { x: 2800, minX: 2690, maxX: 3060, speed: 1.7 },
      ],
      powerups: [
        // Power-ups come from question blocks; this is an extra ground pickup
        { x: 2400, y: 400, type: 'mushroom' },
      ],
      checkpoints: [600, 1700, 2700],
      flagX: 3450,
    },
    // --- Level 3: Athletic / Sky (World 1-3 inspired) ---
    {
      length: 3800,
      time: 220,
      ground: [
        { x: 0, w: 384 }, { x: 448, w: 192 }, { x: 704, w: 256 },
        { x: 1024, w: 192 }, { x: 1280, w: 320 }, { x: 1664, w: 192 },
        { x: 1920, w: 256 }, { x: 2240, w: 192 }, { x: 2496, w: 320 },
        { x: 2880, w: 192 }, { x: 3136, w: 464 },
      ],
      blocks: [
        // Tree-like platforms (athletic level uses mushroom platforms)
        { x: 160, y: 336, w: 64, type: 'brick' },
        { x: 200, y: 240, w: 32, type: 'question', powerup: 'mushroom' },
        // Bridges of blocks between gaps
        { x: 400, y: 300, w: 64, type: 'brick' },
        { x: 660, y: 280, w: 64, type: 'brick' },
        { x: 980, y: 260, w: 64, type: 'brick' },
        // High platform sequence
        { x: 1100, y: 224, w: 96, type: 'brick' },
        { x: 1132, y: 160, w: 32, type: 'question', powerup: 'fireflower' },
        // Mid-air brick row
        { x: 1400, y: 288, w: 128, type: 'brick' },
        // Bridge over big gap
        { x: 1600, y: 320, w: 96, type: 'brick' },
        { x: 1880, y: 280, w: 64, type: 'brick' },
        // High challenge platform
        { x: 2100, y: 200, w: 96, type: 'brick' },
        { x: 2132, y: 136, w: 32, type: 'question', powerup: 'star' },
        // Late bridge
        { x: 2440, y: 300, w: 64, type: 'brick' },
        { x: 2800, y: 280, w: 96, type: 'brick' },
        // Final staircase
        { x: 3264, y: 372, w: 32, type: 'stair' },
        { x: 3296, y: 340, w: 32, type: 'stair' },
        { x: 3328, y: 308, w: 32, type: 'stair' },
        { x: 3360, y: 276, w: 32, type: 'stair' },
        { x: 3392, y: 244, w: 32, type: 'stair' },
      ],
      pipes: [
        { x: 320, h: 48 },
        { x: 1250, h: 64 },
      ],
      coins: [
        // Coin arcs over each gap
        { x: 400, y: 340 }, { x: 418, y: 320 }, { x: 436, y: 340 },
        { x: 670, y: 340 }, { x: 688, y: 320 }, { x: 706, y: 340 },
        { x: 970, y: 340 }, { x: 988, y: 320 }, { x: 1006, y: 340 },
        { x: 1600, y: 340 }, { x: 1618, y: 320 }, { x: 1636, y: 340 },
        { x: 1900, y: 340 }, { x: 1918, y: 320 }, { x: 1936, y: 340 },
        { x: 2220, y: 340 }, { x: 2238, y: 320 }, { x: 2256, y: 340 },
        { x: 2840, y: 340 }, { x: 2858, y: 320 }, { x: 2876, y: 340 },
        // High platform coins
        { x: 1110, y: 192 }, { x: 1130, y: 192 }, { x: 1150, y: 192 },
        { x: 1410, y: 256 }, { x: 1430, y: 256 }, { x: 1450, y: 256 },
        { x: 2110, y: 168 }, { x: 2130, y: 168 }, { x: 2150, y: 168 },
        // Ground coins
        { x: 60, y: 420 }, { x: 120, y: 420 },
        { x: 750, y: 420 }, { x: 800, y: 420 },
        { x: 1300, y: 420 }, { x: 1360, y: 420 },
        { x: 1700, y: 420 },
        { x: 2000, y: 420 }, { x: 2050, y: 420 },
        { x: 2560, y: 420 }, { x: 2600, y: 420 },
        { x: 2950, y: 420 }, { x: 3000, y: 420 },
      ],
      enemies: [
        { x: 200, minX: 100, maxX: 380, speed: 1.6 },
        { x: 560, minX: 450, maxX: 700, speed: 1.6 },
        { x: 800, minX: 710, maxX: 1020, speed: 1.7 },
        { x: 1150, minX: 1030, maxX: 1270, speed: 1.7 },
        { x: 1450, minX: 1290, maxX: 1660, speed: 1.8 },
        { x: 1800, minX: 1670, maxX: 1910, speed: 1.8 },
        { x: 2050, minX: 1930, maxX: 2230, speed: 1.9 },
        { x: 2380, minX: 2250, maxX: 2490, speed: 1.9 },
        { x: 2600, minX: 2500, maxX: 2870, speed: 2.0 },
        { x: 2950, minX: 2880, maxX: 3130, speed: 2.0 },
      ],
      powerups: [
        // Power-ups come from question blocks; this is an extra ground pickup
        { x: 2700, y: 400, type: 'fireflower' },
      ],
      checkpoints: [700, 1900, 2900],
      flagX: 3520,
    },
    // --- Level 4: Castle (World 1-4 inspired) ---
    {
      length: 3200,
      time: 180,
      ground: [
        { x: 0, w: 448 }, { x: 512, w: 320 }, { x: 896, w: 256 },
        { x: 1216, w: 384 }, { x: 1664, w: 256 }, { x: 1984, w: 320 },
        { x: 2368, w: 256 }, { x: 2688, w: 512 },
      ],
      blocks: [
        // Castle ceiling bricks
        { x: 96, y: 160, w: 256, type: 'brick' },
        { x: 160, y: 320, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 224, y: 320, w: 32, type: 'question', powerup: 'fireflower' },
        // Lava-gap bridges (brick platforms over fire)
        { x: 480, y: 372, w: 32, type: 'stair' },
        { x: 512, y: 372, w: 96, type: 'brick' },
        // Narrow corridor
        { x: 864, y: 372, w: 32, type: 'stair' },
        { x: 896, y: 372, w: 96, type: 'brick' },
        // Ascending staircase
        { x: 1150, y: 372, w: 32, type: 'stair' },
        { x: 1182, y: 340, w: 32, type: 'stair' },
        { x: 1214, y: 308, w: 32, type: 'stair' },
        // High platform
        { x: 1300, y: 224, w: 128, type: 'brick' },
        { x: 1332, y: 160, w: 32, type: 'question', powerup: 'star' },
        // Bridge over lava
        { x: 1632, y: 372, w: 32, type: 'stair' },
        { x: 1664, y: 372, w: 96, type: 'brick' },
        // Descending
        { x: 1920, y: 372, w: 32, type: 'stair' },
        { x: 1952, y: 340, w: 32, type: 'stair' },
        { x: 1984, y: 308, w: 32, type: 'stair' },
        // Final challenge platform
        { x: 2100, y: 240, w: 96, type: 'brick' },
        { x: 2132, y: 176, w: 32, type: 'question', powerup: 'mushroom' },
        // Final staircase to Bowser's area
        { x: 2300, y: 372, w: 32, type: 'stair' },
        { x: 2332, y: 340, w: 32, type: 'stair' },
        { x: 2364, y: 308, w: 32, type: 'stair' },
        { x: 2396, y: 276, w: 32, type: 'stair' },
        { x: 2428, y: 244, w: 32, type: 'stair' },
        // Bridge to flag
        { x: 2800, y: 372, w: 32, type: 'stair' },
        { x: 2832, y: 340, w: 32, type: 'stair' },
        { x: 2864, y: 308, w: 32, type: 'stair' },
        { x: 2896, y: 276, w: 32, type: 'stair' },
        { x: 2928, y: 244, w: 32, type: 'stair' },
      ],
      pipes: [],
      coins: [
        // Under ceiling
        { x: 120, y: 288 }, { x: 160, y: 288 }, { x: 200, y: 288 }, { x: 240, y: 288 },
        // Over lava gaps
        { x: 500, y: 340 }, { x: 518, y: 320 }, { x: 536, y: 340 },
        { x: 880, y: 340 }, { x: 898, y: 320 }, { x: 916, y: 340 },
        { x: 1620, y: 340 }, { x: 1638, y: 320 }, { x: 1656, y: 340 },
        { x: 1950, y: 340 }, { x: 1968, y: 320 }, { x: 1986, y: 340 },
        // High platform coins
        { x: 1320, y: 192 }, { x: 1340, y: 192 }, { x: 1360, y: 192 }, { x: 1380, y: 192 },
        { x: 2120, y: 208 }, { x: 2140, y: 208 }, { x: 2160, y: 208 },
        // Ground coins
        { x: 60, y: 420 }, { x: 100, y: 420 },
        { x: 300, y: 420 },
        { x: 560, y: 420 }, { x: 600, y: 420 },
        { x: 950, y: 420 }, { x: 1000, y: 420 },
        { x: 1250, y: 420 }, { x: 1300, y: 420 },
        { x: 1720, y: 420 },
        { x: 2050, y: 420 },
        { x: 2450, y: 420 },
        { x: 2750, y: 420 }, { x: 2800, y: 420 },
      ],
      enemies: [
        { x: 250, minX: 100, maxX: 440, speed: 2.0 },
        { x: 600, minX: 520, maxX: 890, speed: 2.0 },
        { x: 750, minX: 520, maxX: 890, speed: 2.0 },
        { x: 1000, minX: 900, maxX: 1200, speed: 2.1 },
        { x: 1100, minX: 900, maxX: 1200, speed: 2.1 },
        { x: 1400, minX: 1220, maxX: 1650, speed: 2.2 },
        { x: 1750, minX: 1670, maxX: 1970, speed: 2.2 },
        { x: 2050, minX: 1990, maxX: 2360, speed: 2.3 },
        { x: 2200, minX: 1990, maxX: 2360, speed: 2.3 },
        { x: 2500, minX: 2370, maxX: 2680, speed: 2.4 },
        { x: 2750, minX: 2690, maxX: 3000, speed: 2.4 },
        { x: 2900, minX: 2690, maxX: 3000, speed: 2.4 },
      ],
      powerups: [
        // All main power-ups come from question blocks; no extra static pickups in castle
      ],
      checkpoints: [500, 1500, 2500],
      flagX: 3050,
    },
  ];

  // ===== Donkey Kong (NES) Inspired Level Layouts =====
  // These are kept in a SEPARATE array from LEVEL_LAYOUTS so that the existing
  // hand-crafted levels (1-4) keep their exact level numbers and contents.
  // They are only used when a Donkey Kong map theme is selected.
  // Visual vocabulary:
  //   'brick' -> horizontal girder / scaffold beams (the long DK platforms)
  //   'stair' -> vertical ladder rungs / solid support columns
  //   'question' -> breakable crates that release a power-up
  const DK_LEVEL_LAYOUTS = [
    // --- DK Map 1: Pink girder field with cyan ladders ---
    {
      length: 3200,
      time: 280,
      ground: [
        { x: 0, w: 3200 },
      ],
      blocks: [
        // Top row — DK platform (long pink beams near the ceiling)
        { x: 96, y: 96, w: 288, type: 'brick' },
        { x: 608, y: 96, w: 288, type: 'brick' },
        { x: 1120, y: 96, w: 288, type: 'brick' },
        { x: 1632, y: 96, w: 288, type: 'brick' },
        { x: 2144, y: 96, w: 288, type: 'brick' },
        { x: 2656, y: 96, w: 288, type: 'brick' },
        // Second row — main playfield beams
        { x: 224, y: 176, w: 320, type: 'brick' },
        { x: 736, y: 176, w: 320, type: 'brick' },
        { x: 1248, y: 176, w: 320, type: 'brick' },
        { x: 1760, y: 176, w: 320, type: 'brick' },
        { x: 2272, y: 176, w: 320, type: 'brick' },
        { x: 2784, y: 176, w: 320, type: 'brick' },
        // Third row
        { x: 96, y: 256, w: 320, type: 'brick' },
        { x: 608, y: 256, w: 320, type: 'brick' },
        { x: 1120, y: 256, w: 320, type: 'brick' },
        { x: 1632, y: 256, w: 320, type: 'brick' },
        { x: 2144, y: 256, w: 320, type: 'brick' },
        { x: 2656, y: 256, w: 320, type: 'brick' },
        // Fourth row
        { x: 224, y: 336, w: 320, type: 'brick' },
        { x: 736, y: 336, w: 320, type: 'brick' },
        { x: 1248, y: 336, w: 320, type: 'brick' },
        { x: 1760, y: 336, w: 320, type: 'brick' },
        { x: 2272, y: 336, w: 320, type: 'brick' },
        { x: 2784, y: 336, w: 320, type: 'brick' },
        // Bottom row (ground level girders)
        { x: 96, y: 416, w: 320, type: 'brick' },
        { x: 608, y: 416, w: 320, type: 'brick' },
        { x: 1120, y: 416, w: 320, type: 'brick' },
        { x: 1632, y: 416, w: 320, type: 'brick' },
        { x: 2144, y: 416, w: 320, type: 'brick' },
        { x: 2656, y: 416, w: 320, type: 'brick' },

        // Cyan ladders connecting the rows (stacked rungs read as ladders)
        { x: 160, y: 112, w: 16, type: 'stair' },
        { x: 160, y: 192, w: 16, type: 'stair' },
        { x: 160, y: 272, w: 16, type: 'stair' },
        { x: 160, y: 352, w: 16, type: 'stair' },
        { x: 672, y: 112, w: 16, type: 'stair' },
        { x: 672, y: 192, w: 16, type: 'stair' },
        { x: 672, y: 272, w: 16, type: 'stair' },
        { x: 672, y: 352, w: 16, type: 'stair' },
        { x: 1184, y: 112, w: 16, type: 'stair' },
        { x: 1184, y: 192, w: 16, type: 'stair' },
        { x: 1184, y: 272, w: 16, type: 'stair' },
        { x: 1184, y: 352, w: 16, type: 'stair' },
        { x: 1696, y: 112, w: 16, type: 'stair' },
        { x: 1696, y: 192, w: 16, type: 'stair' },
        { x: 1696, y: 272, w: 16, type: 'stair' },
        { x: 1696, y: 352, w: 16, type: 'stair' },
        { x: 2208, y: 112, w: 16, type: 'stair' },
        { x: 2208, y: 192, w: 16, type: 'stair' },
        { x: 2208, y: 272, w: 16, type: 'stair' },
        { x: 2208, y: 352, w: 16, type: 'stair' },
        { x: 2720, y: 112, w: 16, type: 'stair' },
        { x: 2720, y: 192, w: 16, type: 'stair' },
        { x: 2720, y: 272, w: 16, type: 'stair' },
        { x: 2720, y: 352, w: 16, type: 'stair' },

        // Breakable crates with power-ups
        { x: 288, y: 176, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 800, y: 256, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 1312, y: 176, w: 32, type: 'question', powerup: 'star' },
        { x: 1824, y: 336, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 2336, y: 176, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 2848, y: 256, w: 32, type: 'question', powerup: 'iceflower' },
      ],
      pipes: [],
      coins: [
        // Coins above each row of beams
        { x: 136, y: 64 }, { x: 160, y: 64 }, { x: 184, y: 64 },
        { x: 648, y: 64 }, { x: 672, y: 64 }, { x: 696, y: 64 },
        { x: 1160, y: 64 }, { x: 1184, y: 64 }, { x: 1208, y: 64 },
        { x: 1672, y: 64 }, { x: 1696, y: 64 }, { x: 1720, y: 64 },
        { x: 2184, y: 64 }, { x: 2208, y: 64 }, { x: 2232, y: 64 },
        { x: 2696, y: 64 }, { x: 2720, y: 64 }, { x: 2744, y: 64 },
        // Coins on the second row
        { x: 264, y: 144 }, { x: 288, y: 144 }, { x: 312, y: 144 },
        { x: 776, y: 144 }, { x: 800, y: 144 }, { x: 824, y: 144 },
        { x: 1288, y: 144 }, { x: 1312, y: 144 }, { x: 1336, y: 144 },
        { x: 1800, y: 144 }, { x: 1824, y: 144 }, { x: 1848, y: 144 },
        { x: 2312, y: 144 }, { x: 2336, y: 144 }, { x: 2360, y: 144 },
        { x: 2824, y: 144 }, { x: 2848, y: 144 }, { x: 2872, y: 144 },
        // Coins on the third row
        { x: 136, y: 224 }, { x: 160, y: 224 }, { x: 184, y: 224 },
        { x: 648, y: 224 }, { x: 672, y: 224 }, { x: 696, y: 224 },
        { x: 1160, y: 224 }, { x: 1184, y: 224 }, { x: 1208, y: 224 },
        { x: 1672, y: 224 }, { x: 1696, y: 224 }, { x: 1720, y: 224 },
        { x: 2184, y: 224 }, { x: 2208, y: 224 }, { x: 2232, y: 224 },
        { x: 2696, y: 224 }, { x: 2720, y: 224 }, { x: 2744, y: 224 },
        // Coins on the fourth row
        { x: 264, y: 304 }, { x: 288, y: 304 }, { x: 312, y: 304 },
        { x: 776, y: 304 }, { x: 800, y: 304 }, { x: 824, y: 304 },
        { x: 1288, y: 304 }, { x: 1312, y: 304 }, { x: 1336, y: 304 },
        { x: 1800, y: 304 }, { x: 1824, y: 304 }, { x: 1848, y: 304 },
        { x: 2312, y: 304 }, { x: 2336, y: 304 }, { x: 2360, y: 304 },
        { x: 2824, y: 304 }, { x: 2848, y: 304 }, { x: 2872, y: 304 },
        // Ground level coins
        { x: 400, y: 424 }, { x: 424, y: 424 },
        { x: 912, y: 424 }, { x: 936, y: 424 },
        { x: 1424, y: 424 }, { x: 1448, y: 424 },
        { x: 1936, y: 424 }, { x: 1960, y: 424 },
        { x: 2448, y: 424 }, { x: 2472, y: 424 },
      ],
      enemies: [
        { x: 500, minX: 420, maxX: 590, speed: 1.6 },
        { x: 900, minX: 820, maxX: 1100, speed: 1.7 },
        { x: 1400, minX: 1300, maxX: 1610, speed: 1.8 },
        { x: 1900, minX: 1800, maxX: 2110, speed: 1.9 },
        { x: 2400, minX: 2300, maxX: 2610, speed: 2.0 },
        { x: 2850, minX: 2750, maxX: 3100, speed: 2.0 },
      ],
      powerups: [
        { x: 500, y: 144, type: 'star' },
        { x: 2400, y: 144, type: 'fireflower' },
      ],
      checkpoints: [800, 1700, 2600],
      flagX: 3080,
    },
    // --- DK Map 2: Pink girders with orange support columns ---
    {
      length: 3200,
      time: 270,
      ground: [
        { x: 0, w: 3200 },
      ],
      blocks: [
        // Top row — DK stands here
        { x: 160, y: 96, w: 352, type: 'brick' },
        { x: 768, y: 96, w: 320, type: 'brick' },
        { x: 1408, y: 96, w: 320, type: 'brick' },
        { x: 2048, y: 96, w: 320, type: 'brick' },
        { x: 2688, y: 96, w: 320, type: 'brick' },
        // Second row — scattered small platforms
        { x: 64, y: 176, w: 96, type: 'brick' },
        { x: 480, y: 176, w: 96, type: 'brick' },
        { x: 1152, y: 176, w: 96, type: 'brick' },
        { x: 1792, y: 176, w: 96, type: 'brick' },
        { x: 2432, y: 176, w: 96, type: 'brick' },
        { x: 3008, y: 176, w: 96, type: 'brick' },
        // Third row
        { x: 320, y: 256, w: 128, type: 'brick' },
        { x: 960, y: 256, w: 128, type: 'brick' },
        { x: 1600, y: 256, w: 128, type: 'brick' },
        { x: 2240, y: 256, w: 128, type: 'brick' },
        { x: 2880, y: 256, w: 128, type: 'brick' },
        // Fourth row
        { x: 64, y: 336, w: 160, type: 'brick' },
        { x: 640, y: 336, w: 160, type: 'brick' },
        { x: 1280, y: 336, w: 160, type: 'brick' },
        { x: 1920, y: 336, w: 160, type: 'brick' },
        { x: 2560, y: 336, w: 160, type: 'brick' },
        // Bottom row
        { x: 320, y: 416, w: 192, type: 'brick' },
        { x: 960, y: 416, w: 192, type: 'brick' },
        { x: 1600, y: 416, w: 192, type: 'brick' },
        { x: 2240, y: 416, w: 192, type: 'brick' },
        { x: 2880, y: 416, w: 192, type: 'brick' },

        // Orange support columns (tall vertical girders)
        { x: 560, y: 112, w: 20, type: 'stair' },
        { x: 560, y: 192, w: 20, type: 'stair' },
        { x: 560, y: 272, w: 20, type: 'stair' },
        { x: 560, y: 352, w: 20, type: 'stair' },
        { x: 1200, y: 112, w: 20, type: 'stair' },
        { x: 1200, y: 192, w: 20, type: 'stair' },
        { x: 1200, y: 272, w: 20, type: 'stair' },
        { x: 1200, y: 352, w: 20, type: 'stair' },
        { x: 1840, y: 112, w: 20, type: 'stair' },
        { x: 1840, y: 192, w: 20, type: 'stair' },
        { x: 1840, y: 272, w: 20, type: 'stair' },
        { x: 1840, y: 352, w: 20, type: 'stair' },
        { x: 2480, y: 112, w: 20, type: 'stair' },
        { x: 2480, y: 192, w: 20, type: 'stair' },
        { x: 2480, y: 272, w: 20, type: 'stair' },
        { x: 2480, y: 352, w: 20, type: 'stair' },

        // Cyan ladders
        { x: 800, y: 112, w: 16, type: 'stair' },
        { x: 800, y: 192, w: 16, type: 'stair' },
        { x: 800, y: 272, w: 16, type: 'stair' },
        { x: 1440, y: 112, w: 16, type: 'stair' },
        { x: 1440, y: 192, w: 16, type: 'stair' },
        { x: 1440, y: 272, w: 16, type: 'stair' },
        { x: 2080, y: 112, w: 16, type: 'stair' },
        { x: 2080, y: 192, w: 16, type: 'stair' },
        { x: 2080, y: 272, w: 16, type: 'stair' },
        { x: 2720, y: 112, w: 16, type: 'stair' },
        { x: 2720, y: 192, w: 16, type: 'stair' },
        { x: 2720, y: 272, w: 16, type: 'stair' },

        // Breakable crates
        { x: 512, y: 176, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1184, y: 176, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 1824, y: 176, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 2464, y: 176, w: 32, type: 'question', powerup: 'star' },
        { x: 992, y: 256, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 2272, y: 256, w: 32, type: 'question', powerup: 'iceflower' },
      ],
      pipes: [],
      coins: [
        // Coin rows along the top
        { x: 200, y: 64 }, { x: 224, y: 64 }, { x: 248, y: 64 }, { x: 272, y: 64 },
        { x: 800, y: 64 }, { x: 824, y: 64 }, { x: 848, y: 64 },
        { x: 1440, y: 64 }, { x: 1464, y: 64 }, { x: 1488, y: 64 },
        { x: 2080, y: 64 }, { x: 2104, y: 64 }, { x: 2128, y: 64 },
        { x: 2720, y: 64 }, { x: 2744, y: 64 }, { x: 2768, y: 64 },
        // Second row
        { x: 96, y: 144 }, { x: 120, y: 144 },
        { x: 512, y: 144 }, { x: 536, y: 144 },
        { x: 1184, y: 144 }, { x: 1208, y: 144 },
        { x: 1824, y: 144 }, { x: 1848, y: 144 },
        { x: 2464, y: 144 }, { x: 2488, y: 144 },
        { x: 3040, y: 144 },
        // Third row
        { x: 352, y: 224 }, { x: 376, y: 224 }, { x: 400, y: 224 },
        { x: 992, y: 224 }, { x: 1016, y: 224 }, { x: 1040, y: 224 },
        { x: 1632, y: 224 }, { x: 1656, y: 224 }, { x: 1680, y: 224 },
        { x: 2272, y: 224 }, { x: 2296, y: 224 }, { x: 2320, y: 224 },
        { x: 2912, y: 224 }, { x: 2936, y: 224 },
        // Fourth row
        { x: 96, y: 304 }, { x: 120, y: 304 }, { x: 144, y: 304 },
        { x: 672, y: 304 }, { x: 696, y: 304 }, { x: 720, y: 304 },
        { x: 1312, y: 304 }, { x: 1336, y: 304 }, { x: 1360, y: 304 },
        { x: 1952, y: 304 }, { x: 1976, y: 304 }, { x: 2000, y: 304 },
        { x: 2592, y: 304 }, { x: 2616, y: 304 },
        // Ground level
        { x: 440, y: 424 }, { x: 464, y: 424 },
        { x: 1080, y: 424 }, { x: 1104, y: 424 },
        { x: 1720, y: 424 }, { x: 1744, y: 424 },
        { x: 2360, y: 424 }, { x: 2384, y: 424 },
        { x: 3000, y: 424 },
      ],
      enemies: [
        { x: 400, minX: 300, maxX: 540, speed: 1.7 },
        { x: 900, minX: 800, maxX: 1180, speed: 1.8 },
        { x: 1500, minX: 1400, maxX: 1820, speed: 1.9 },
        { x: 2100, minX: 2000, maxX: 2460, speed: 2.0 },
        { x: 2700, minX: 2600, maxX: 3000, speed: 2.1 },
        { x: 2940, minX: 2850, maxX: 3080, speed: 2.1, type: 'charger' },
      ],
      powerups: [
        { x: 800, y: 64, type: 'star' },
        { x: 2080, y: 144, type: 'fireflower' },
      ],
      checkpoints: [800, 1700, 2600],
      flagX: 3080,
    },
    // --- DK Map 3: Blue scaffolds with gold ladders ---
    {
      length: 3200,
      time: 260,
      ground: [
        { x: 0, w: 3200 },
      ],
      blocks: [
        // Top row — DK platform
        { x: 1600, y: 96, w: 320, type: 'brick' },
        { x: 1984, y: 96, w: 320, type: 'brick' },
        { x: 2368, y: 96, w: 320, type: 'brick' },
        { x: 2752, y: 96, w: 320, type: 'brick' },
        // Main beams row 1 (long blue scaffolds)
        { x: 96, y: 176, w: 480, type: 'brick' },
        { x: 704, y: 176, w: 480, type: 'brick' },
        { x: 1312, y: 176, w: 480, type: 'brick' },
        { x: 1920, y: 176, w: 480, type: 'brick' },
        { x: 2528, y: 176, w: 480, type: 'brick' },
        // Main beams row 2
        { x: 224, y: 256, w: 448, type: 'brick' },
        { x: 832, y: 256, w: 448, type: 'brick' },
        { x: 1440, y: 256, w: 448, type: 'brick' },
        { x: 2048, y: 256, w: 448, type: 'brick' },
        { x: 2656, y: 256, w: 448, type: 'brick' },
        // Main beams row 3
        { x: 96, y: 336, w: 480, type: 'brick' },
        { x: 704, y: 336, w: 480, type: 'brick' },
        { x: 1312, y: 336, w: 480, type: 'brick' },
        { x: 1920, y: 336, w: 480, type: 'brick' },
        { x: 2528, y: 336, w: 480, type: 'brick' },
        // Bottom row
        { x: 224, y: 416, w: 448, type: 'brick' },
        { x: 832, y: 416, w: 448, type: 'brick' },
        { x: 1440, y: 416, w: 448, type: 'brick' },
        { x: 2048, y: 416, w: 448, type: 'brick' },
        { x: 2656, y: 416, w: 448, type: 'brick' },

        // Gold ladders joining the rows
        { x: 288, y: 112, w: 16, type: 'stair' },
        { x: 288, y: 192, w: 16, type: 'stair' },
        { x: 288, y: 272, w: 16, type: 'stair' },
        { x: 288, y: 352, w: 16, type: 'stair' },
        { x: 896, y: 112, w: 16, type: 'stair' },
        { x: 896, y: 192, w: 16, type: 'stair' },
        { x: 896, y: 272, w: 16, type: 'stair' },
        { x: 896, y: 352, w: 16, type: 'stair' },
        { x: 1504, y: 112, w: 16, type: 'stair' },
        { x: 1504, y: 192, w: 16, type: 'stair' },
        { x: 1504, y: 272, w: 16, type: 'stair' },
        { x: 1504, y: 352, w: 16, type: 'stair' },
        { x: 2112, y: 112, w: 16, type: 'stair' },
        { x: 2112, y: 192, w: 16, type: 'stair' },
        { x: 2112, y: 272, w: 16, type: 'stair' },
        { x: 2112, y: 352, w: 16, type: 'stair' },
        { x: 2720, y: 112, w: 16, type: 'stair' },
        { x: 2720, y: 192, w: 16, type: 'stair' },
        { x: 2720, y: 272, w: 16, type: 'stair' },
        { x: 2720, y: 352, w: 16, type: 'stair' },

        // Breakable crates
        { x: 640, y: 176, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1248, y: 176, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 1856, y: 176, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 2464, y: 176, w: 32, type: 'question', powerup: 'star' },
        { x: 960, y: 256, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 2176, y: 256, w: 32, type: 'question', powerup: 'iceflower' },
      ],
      pipes: [],
      coins: [
        // Top area
        { x: 1632, y: 64 }, { x: 1656, y: 64 }, { x: 1680, y: 64 },
        { x: 2016, y: 64 }, { x: 2040, y: 64 }, { x: 2064, y: 64 },
        { x: 2400, y: 64 }, { x: 2424, y: 64 }, { x: 2448, y: 64 },
        { x: 2784, y: 64 }, { x: 2808, y: 64 }, { x: 2832, y: 64 },
        // Row 1
        { x: 136, y: 144 }, { x: 160, y: 144 }, { x: 184, y: 144 },
        { x: 744, y: 144 }, { x: 768, y: 144 }, { x: 792, y: 144 },
        { x: 1352, y: 144 }, { x: 1376, y: 144 }, { x: 1400, y: 144 },
        { x: 1960, y: 144 }, { x: 1984, y: 144 }, { x: 2008, y: 144 },
        { x: 2568, y: 144 }, { x: 2592, y: 144 }, { x: 2616, y: 144 },
        // Row 2
        { x: 264, y: 224 }, { x: 288, y: 224 }, { x: 312, y: 224 },
        { x: 872, y: 224 }, { x: 896, y: 224 }, { x: 920, y: 224 },
        { x: 1480, y: 224 }, { x: 1504, y: 224 }, { x: 1528, y: 224 },
        { x: 2088, y: 224 }, { x: 2112, y: 224 }, { x: 2136, y: 224 },
        { x: 2696, y: 224 }, { x: 2720, y: 224 }, { x: 2744, y: 224 },
        // Row 3
        { x: 136, y: 304 }, { x: 160, y: 304 }, { x: 184, y: 304 },
        { x: 744, y: 304 }, { x: 768, y: 304 }, { x: 792, y: 304 },
        { x: 1352, y: 304 }, { x: 1376, y: 304 }, { x: 1400, y: 304 },
        { x: 1960, y: 304 }, { x: 1984, y: 304 }, { x: 2008, y: 304 },
        { x: 2568, y: 304 }, { x: 2592, y: 304 }, { x: 2616, y: 304 },
        // Ground level
        { x: 600, y: 424 }, { x: 624, y: 424 },
        { x: 1208, y: 424 }, { x: 1232, y: 424 },
        { x: 1816, y: 424 }, { x: 1840, y: 424 },
        { x: 2424, y: 424 }, { x: 2448, y: 424 },
      ],
      enemies: [
        { x: 400, minX: 200, maxX: 620, speed: 1.9 },
        { x: 1000, minX: 800, maxX: 1290, speed: 2.0 },
        { x: 1600, minX: 1400, maxX: 1900, speed: 2.1 },
        { x: 2200, minX: 2000, maxX: 2500, speed: 2.2 },
        { x: 2800, minX: 2600, maxX: 3050, speed: 2.3 },
        { x: 1200, minX: 1000, maxX: 1400, speed: 1.6, type: 'charger' },
      ],
      powerups: [
        { x: 1632, y: 64, type: 'star' },
        { x: 2400, y: 144, type: 'fireflower' },
      ],
      checkpoints: [800, 1700, 2600],
      flagX: 3080,
    },
    // --- DK Map 4: Elevator zigzag — diagonal pink girders with spring crates ---
    {
      length: 3400,
      time: 250,
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        // Bottom platform stubs (start safe zone)
        { x: 0, y: 416, w: 320, type: 'brick' },
        // Zigzag beam 1 (low-right → mid-left → high-right)
        { x: 480, y: 416, w: 224, type: 'brick' },
        { x: 384, y: 336, w: 224, type: 'brick' },
        { x: 480, y: 256, w: 224, type: 'brick' },
        { x: 576, y: 176, w: 224, type: 'brick' },
        { x: 672, y: 96, w: 224, type: 'brick' },
        // Landing platform + spring crate
        { x: 960, y: 96, w: 160, type: 'brick' },
        // Zigzag beam 2 (high-left → low-right descent)
        { x: 1248, y: 96, w: 224, type: 'brick' },
        { x: 1344, y: 176, w: 224, type: 'brick' },
        { x: 1440, y: 256, w: 224, type: 'brick' },
        { x: 1536, y: 336, w: 224, type: 'brick' },
        { x: 1632, y: 416, w: 224, type: 'brick' },
        // Mid landing
        { x: 1920, y: 416, w: 192, type: 'brick' },
        // Zigzag beam 3 (ascent again, tighter)
        { x: 2208, y: 336, w: 192, type: 'brick' },
        { x: 2272, y: 256, w: 192, type: 'brick' },
        { x: 2336, y: 176, w: 192, type: 'brick' },
        { x: 2400, y: 96, w: 192, type: 'brick' },
        // Top runway to the flag
        { x: 2656, y: 96, w: 544, type: 'brick' },
        // Bottom safety floor under the final descent
        { x: 1920, y: 416, w: 416, type: 'brick' },
        { x: 2848, y: 416, w: 320, type: 'brick' },

        // Support ladders (short connectors between zigzag tiers)
        { x: 416, y: 352, w: 16, type: 'stair' },
        { x: 512, y: 272, w: 16, type: 'stair' },
        { x: 608, y: 192, w: 16, type: 'stair' },
        { x: 1280, y: 112, w: 16, type: 'stair' },
        { x: 1376, y: 192, w: 16, type: 'stair' },
        { x: 1472, y: 272, w: 16, type: 'stair' },
        { x: 2240, y: 352, w: 16, type: 'stair' },
        { x: 2304, y: 272, w: 16, type: 'stair' },
        { x: 2368, y: 192, w: 16, type: 'stair' },

        // Spring crates (give power-ups to help the climbs)
        { x: 528, y: 336, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1056, y: 64, w: 32, type: 'question', powerup: 'star' },
        { x: 1344, y: 256, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 2000, y: 384, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 2320, y: 176, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 2848, y: 64, w: 32, type: 'question', powerup: 'star' },
      ],
      pipes: [],
      coins: [
        // Coins tracing the first zigzag ascent
        { x: 520, y: 384 }, { x: 424, y: 304 }, { x: 520, y: 224 },
        { x: 616, y: 144 }, { x: 712, y: 64 },
        // Landing cluster
        { x: 984, y: 64 }, { x: 1008, y: 64 }, { x: 1032, y: 64 },
        // Second zigzag descent
        { x: 1272, y: 64 }, { x: 1368, y: 144 }, { x: 1464, y: 224 },
        { x: 1560, y: 304 }, { x: 1656, y: 384 },
        // Mid landing
        { x: 1944, y: 384 }, { x: 1968, y: 384 }, { x: 1992, y: 384 },
        // Third zigzag ascent
        { x: 2232, y: 304 }, { x: 2296, y: 224 }, { x: 2360, y: 144 },
        { x: 2424, y: 64 },
        // Top runway coins
        { x: 2680, y: 64 }, { x: 2704, y: 64 }, { x: 2728, y: 64 },
        { x: 2752, y: 64 }, { x: 2776, y: 64 }, { x: 2800, y: 64 },
        { x: 2824, y: 64 }, { x: 2848, y: 64 }, { x: 2872, y: 64 },
        { x: 2896, y: 64 }, { x: 2920, y: 64 }, { x: 2944, y: 64 },
        // Ground-level pickups
        { x: 40, y: 384 }, { x: 64, y: 384 }, { x: 88, y: 384 },
        { x: 112, y: 384 }, { x: 136, y: 384 },
      ],
      enemies: [
        { x: 600, minX: 480, maxX: 700, speed: 2.0 },
        { x: 1000, minX: 960, maxX: 1120, speed: 1.8 },
        { x: 1500, minX: 1340, maxX: 1660, speed: 2.2 },
        { x: 2000, minX: 1920, maxX: 2330, speed: 2.4 },
        { x: 2800, minX: 2650, maxX: 3100, speed: 2.5 },
        { x: 1700, minX: 1530, maxX: 1860, speed: 2.6, type: 'charger' },
      ],
      powerups: [
        { x: 720, y: 64, type: 'star' },
        { x: 2500, y: 64, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3280,
    },
    // --- DK Map 5: Conveyor gauntlet — tight beams, chargers, flying enemies ---
    {
      length: 3600,
      time: 240,
      ground: [
        { x: 0, w: 3600 },
      ],
      blocks: [
        // Start platform
        { x: 0, y: 416, w: 288, type: 'brick' },
        // Gauntlet beam 1 (long, low)
        { x: 384, y: 336, w: 640, type: 'brick' },
        // Gap + stepping stones
        { x: 1120, y: 336, w: 96, type: 'brick' },
        { x: 1280, y: 336, w: 96, type: 'brick' },
        // Gauntlet beam 2 (mid height)
        { x: 1440, y: 256, w: 576, type: 'brick' },
        // Floating island with crate
        { x: 2112, y: 256, w: 128, type: 'brick' },
        // Gauntlet beam 3 (high)
        { x: 2352, y: 176, w: 512, type: 'brick' },
        // Final descent beam
        { x: 2976, y: 256, w: 384, type: 'brick' },
        { x: 2976, y: 416, w: 384, type: 'brick' },
        // Top perches for flyers
        { x: 480, y: 96, w: 160, type: 'brick' },
        { x: 1600, y: 96, w: 160, type: 'brick' },
        { x: 2528, y: 96, w: 160, type: 'brick' },

        // Vertical ladders between tiers
        { x: 416, y: 352, w: 16, type: 'stair' },
        { x: 416, y: 272, w: 16, type: 'stair' },
        { x: 416, y: 192, w: 16, type: 'stair' },
        { x: 1472, y: 272, w: 16, type: 'stair' },
        { x: 1472, y: 192, w: 16, type: 'stair' },
        { x: 2384, y: 192, w: 16, type: 'stair' },
        { x: 3008, y: 272, w: 16, type: 'stair' },

        // Crates with power-ups
        { x: 640, y: 304, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1552, y: 224, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 2144, y: 224, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 2528, y: 144, w: 32, type: 'question', powerup: 'star' },
        { x: 3104, y: 224, w: 32, type: 'question', powerup: 'mushroom' },
      ],
      pipes: [],
      coins: [
        // Beam 1 coins
        { x: 408, y: 304 }, { x: 432, y: 304 }, { x: 456, y: 304 },
        { x: 744, y: 304 }, { x: 768, y: 304 }, { x: 792, y: 304 },
        { x: 936, y: 304 }, { x: 960, y: 304 }, { x: 984, y: 304 },
        // Stepping stones
        { x: 1144, y: 304 }, { x: 1304, y: 304 },
        // Beam 2 coins
        { x: 1464, y: 224 }, { x: 1488, y: 224 }, { x: 1512, y: 224 },
        { x: 1768, y: 224 }, { x: 1792, y: 224 }, { x: 1816, y: 224 },
        // Island
        { x: 2136, y: 224 }, { x: 2160, y: 224 }, { x: 2184, y: 224 },
        // Beam 3 coins
        { x: 2376, y: 144 }, { x: 2400, y: 144 }, { x: 2424, y: 144 },
        { x: 2648, y: 144 }, { x: 2672, y: 144 }, { x: 2696, y: 144 },
        // Descent coins
        { x: 3000, y: 224 }, { x: 3024, y: 224 }, { x: 3048, y: 224 },
        { x: 3072, y: 224 }, { x: 3096, y: 224 },
        // Top perches
        { x: 504, y: 64 }, { x: 528, y: 64 }, { x: 552, y: 64 },
        { x: 1624, y: 64 }, { x: 1648, y: 64 }, { x: 1672, y: 64 },
        { x: 2552, y: 64 }, { x: 2576, y: 64 }, { x: 2600, y: 64 },
        // Start area
        { x: 40, y: 384 }, { x: 64, y: 384 }, { x: 88, y: 384 },
        { x: 112, y: 384 }, { x: 136, y: 384 }, { x: 160, y: 384 },
      ],
      enemies: [
        { x: 600, minX: 384, maxX: 1024, speed: 2.2 },
        { x: 900, minX: 384, maxX: 1024, speed: 2.4, type: 'charger' },
        { x: 1600, minX: 1440, maxX: 2016, speed: 2.5 },
        { x: 1800, minX: 1440, maxX: 2016, speed: 2.6, type: 'charger' },
        { x: 2500, minX: 2352, maxX: 2864, speed: 2.7 },
        { x: 3100, minX: 2976, maxX: 3360, speed: 2.8, type: 'charger' },
        // Flyers patrolling the gauntlet
        { x: 700, minX: 400, maxX: 1000, speed: 1.8, type: 'flyer' },
        { x: 1700, minX: 1440, maxX: 2000, speed: 2.0, type: 'flyer' },
        { x: 2600, minX: 2350, maxX: 2860, speed: 2.2, type: 'flyer' },
      ],
      powerups: [
        { x: 528, y: 64, type: 'star' },
        { x: 2528, y: 64, type: 'fireflower' },
      ],
      checkpoints: [1000, 2200, 3100],
      flagX: 3480,
    },
    // --- DK Map 6: Summit climb — tall vertical gauntlet to DK's perch (blue) ---
    {
      length: 3200,
      time: 230,
      ground: [
        { x: 0, w: 3200 },
      ],
      blocks: [
        // Base camp (wide safe floor)
        { x: 0, y: 416, w: 640, type: 'brick' },
        // Climb tier 1 (rightward shelves)
        { x: 768, y: 416, w: 256, type: 'brick' },
        { x: 768, y: 336, w: 256, type: 'brick' },
        // Climb tier 2 (left shelf)
        { x: 384, y: 256, w: 320, type: 'brick' },
        // Climb tier 3 (right shelf)
        { x: 896, y: 176, w: 320, type: 'brick' },
        // Climb tier 4 (left high shelf)
        { x: 448, y: 96, w: 384, type: 'brick' },
        // Summit runway (DK's perch area)
        { x: 1024, y: 96, w: 480, type: 'brick' },
        // Summit descent to flag
        { x: 1600, y: 176, w: 256, type: 'brick' },
        { x: 1920, y: 256, w: 256, type: 'brick' },
        { x: 2240, y: 336, w: 256, type: 'brick' },
        { x: 2560, y: 416, w: 480, type: 'brick' },

        // Long gold ladders up the central shaft
        { x: 640, y: 352, w: 16, type: 'stair' },
        { x: 640, y: 272, w: 16, type: 'stair' },
        { x: 640, y: 192, w: 16, type: 'stair' },
        { x: 640, y: 112, w: 16, type: 'stair' },
        // Side ladders
        { x: 896, y: 272, w: 16, type: 'stair' },
        { x: 896, y: 192, w: 16, type: 'stair' },
        { x: 416, y: 192, w: 16, type: 'stair' },
        { x: 416, y: 112, w: 16, type: 'stair' },
        { x: 1728, y: 112, w: 16, type: 'stair' },
        { x: 2048, y: 192, w: 16, type: 'stair' },
        { x: 2368, y: 272, w: 16, type: 'stair' },

        // Summit crates (good rewards for the climb)
        { x: 544, y: 64, w: 32, type: 'question', powerup: 'star' },
        { x: 1152, y: 64, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 1344, y: 64, w: 32, type: 'question', powerup: 'iceflower' },
        // Mid-climb crates
        { x: 416, y: 224, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 960, y: 144, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1680, y: 144, w: 32, type: 'question', powerup: 'mushroom' },
        // Descent crate
        { x: 2688, y: 384, w: 32, type: 'question', powerup: 'star' },
      ],
      pipes: [],
      coins: [
        // Base camp
        { x: 40, y: 384 }, { x: 64, y: 384 }, { x: 88, y: 384 },
        { x: 112, y: 384 }, { x: 136, y: 384 }, { x: 160, y: 384 },
        { x: 184, y: 384 }, { x: 208, y: 384 }, { x: 232, y: 384 },
        // Tier 1
        { x: 792, y: 304 }, { x: 816, y: 304 }, { x: 840, y: 304 },
        { x: 864, y: 304 }, { x: 888, y: 304 }, { x: 912, y: 304 },
        // Tier 2
        { x: 408, y: 224 }, { x: 432, y: 224 }, { x: 456, y: 224 },
        { x: 552, y: 224 }, { x: 576, y: 224 }, { x: 600, y: 224 },
        // Tier 3
        { x: 920, y: 144 }, { x: 944, y: 144 }, { x: 968, y: 144 },
        { x: 1056, y: 144 }, { x: 1080, y: 144 }, { x: 1104, y: 144 },
        // Tier 4 / summit runway
        { x: 472, y: 64 }, { x: 496, y: 64 }, { x: 520, y: 64 },
        { x: 720, y: 64 }, { x: 744, y: 64 }, { x: 768, y: 64 },
        // Summit cluster
        { x: 1080, y: 64 }, { x: 1104, y: 64 }, { x: 1128, y: 64 },
        { x: 1224, y: 64 }, { x: 1248, y: 64 }, { x: 1272, y: 64 },
        { x: 1368, y: 64 }, { x: 1392, y: 64 }, { x: 1416, y: 64 },
        // Descent coins
        { x: 1624, y: 144 }, { x: 1648, y: 144 }, { x: 1672, y: 144 },
        { x: 1944, y: 224 }, { x: 1968, y: 224 }, { x: 1992, y: 224 },
        { x: 2264, y: 304 }, { x: 2288, y: 304 }, { x: 2312, y: 304 },
        { x: 2584, y: 384 }, { x: 2608, y: 384 }, { x: 2632, y: 384 },
        { x: 2728, y: 384 }, { x: 2752, y: 384 }, { x: 2776, y: 384 },
      ],
      enemies: [
        // Base guards
        { x: 400, minX: 0, maxX: 640, speed: 2.0 },
        { x: 900, minX: 768, maxX: 1024, speed: 2.2, type: 'charger' },
        // Mid-climb patrollers
        { x: 500, minX: 384, maxX: 704, speed: 2.4 },
        { x: 1000, minX: 896, maxX: 1216, speed: 2.6 },
        // Summit guards (tough)
        { x: 1200, minX: 1024, maxX: 1504, speed: 2.8, type: 'charger' },
        // Descent gauntlet
        { x: 1700, minX: 1600, maxX: 1856, speed: 2.6 },
        { x: 2020, minX: 1920, maxX: 2176, speed: 2.7 },
        { x: 2340, minX: 2240, maxX: 2496, speed: 2.8 },
        { x: 2750, minX: 2560, maxX: 3040, speed: 3.0, type: 'charger' },
        // Flyers guarding the shaft
        { x: 700, minX: 384, maxX: 1000, speed: 2.2, type: 'flyer' },
        { x: 1300, minX: 1024, maxX: 1504, speed: 2.4, type: 'flyer' },
      ],
      powerups: [
        { x: 544, y: 64, type: 'star' },
        { x: 1344, y: 64, type: 'fireflower' },
      ],
      checkpoints: [1000, 1800, 2600],
      flagX: 3080,
    },
  ];

  // ============================================================
  //  DONKEY KONG (1981) — authentic arcade stages
  // ============================================================
  // Rebuilt from the real arcade screens (see reference captures):
  //
  //   Stage 1 "girders"  — 1-1: orange girder slats, green hills, blue sky.
  //   Stage 2 "cage"     — 1-2: teal/cyan girders on a black void.
  //   Stage 3 "climb"    — 1-3: sky scene, tall support column, clouds.
  //   Stage 4 "summit"   — 1-4: grey brick fortress + red lava pit finale.
  //
  // Visual vocabulary used here:
  //   'girder'    -> thin steel slat with cross-bracing (a real DK beam)
  //   'ladder'    -> two rails + rungs (DK's climbable ladders)
  //   'oil_drum'  -> red/blue barrel obstacle to jump over
  //   'question'  -> DK crate that releases a power-up
  //   'brick'     -> the chunky DK brickwork / fortress walls
  //
  // Every stage is longer and taller than a normal Mario screen because DK
  // stages are vertically stacked — you climb a screenful of girders, then
  // the next screen continues above it.
  const DK_GIRDER_STAGES = [
    // ---------------------------------------------------------------
    // STAGE 1 — "25m"  (real DK 1-1: orange girders, green hills, blue sky)
    // Bottom row of girders over a solid floor, an upper tier of slats,
    // the DK barrel conveyor on the right, and DK himself up top.
    // ---------------------------------------------------------------
    {
      length: 3400,
      time: 260,
      stage: 'girders',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        // --- Upper tier: the row DK stands on (top of the screen) ---
        { x: 1420, y: 64, w: 420, type: 'girder' },
        // --- Mid tier: main climbing girders ---
        { x: 180, y: 176, w: 340, type: 'girder' },
        { x: 700, y: 176, w: 300, type: 'girder' },
        { x: 1210, y: 176, w: 300, type: 'girder' },
        { x: 1720, y: 176, w: 300, type: 'girder' },
        { x: 2230, y: 176, w: 300, type: 'girder' },
        { x: 2740, y: 176, w: 340, type: 'girder' },
        // --- Lower tier: the row just above the floor ---
        { x: 60, y: 288, w: 300, type: 'girder' },
        { x: 560, y: 288, w: 300, type: 'girder' },
        { x: 1060, y: 288, w: 300, type: 'girder' },
        { x: 1560, y: 288, w: 300, type: 'girder' },
        { x: 2060, y: 288, w: 300, type: 'girder' },
        { x: 2560, y: 288, w: 300, type: 'girder' },
        { x: 3060, y: 288, w: 260, type: 'girder' },

        // --- Ladders joining the tiers (rails + rungs) ---
        { x: 400, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 900, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1410, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1920, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2430, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2940, y: 176, w: 20, h: 112, type: 'ladder' },
        // Ladder from the mid tier up to DK's platform
        { x: 1540, y: 64, w: 20, h: 112, type: 'ladder' },

        // --- DK's brickwork platform (the little brick alcove in 1-1) ---
        { x: 240, y: 112, w: 140, type: 'brick' },
        { x: 268, y: 80, w: 84, type: 'brick' },
        { x: 1200, y: 224, w: 132, type: 'brick' },

        // --- Breakable DK crates ---
        { x: 296, y: 80, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1232, y: 192, w: 32, type: 'question', powerup: 'star' },
        { x: 2776, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 640, y: 256, w: 32, type: 'question', powerup: 'iceflower' },
        { x: 2124, y: 256, w: 32, type: 'question', powerup: 'mushroom' },

        // --- Oil drums to hop over ---
        { x: 700, y: 248, w: 26, type: 'oil_drum' },
        { x: 1560, y: 248, w: 26, type: 'oil_drum' },
        { x: 2560, y: 248, w: 26, type: 'oil_drum' },
      ],
      pipes: [],
      coins: [
        { x: 210, y: 144 }, { x: 234, y: 144 }, { x: 258, y: 144 },
        { x: 340, y: 144 }, { x: 364, y: 144 },
        { x: 600, y: 256 }, { x: 624, y: 256 }, { x: 648, y: 256 },
        { x: 1000, y: 256 }, { x: 1024, y: 256 }, { x: 1048, y: 256 },
        { x: 1300, y: 256 }, { x: 1324, y: 256 }, { x: 1348, y: 256 },
        { x: 1600, y: 256 }, { x: 1624, y: 256 }, { x: 1648, y: 256 },
        { x: 1900, y: 256 }, { x: 1924, y: 256 }, { x: 1948, y: 256 },
        { x: 2200, y: 256 }, { x: 2224, y: 256 }, { x: 2248, y: 256 },
        { x: 2500, y: 256 }, { x: 2524, y: 256 }, { x: 2548, y: 256 },
        { x: 2800, y: 256 }, { x: 2824, y: 256 }, { x: 2848, y: 256 },
        { x: 3100, y: 256 }, { x: 3124, y: 256 }, { x: 3148, y: 256 },
        // Upper girder coins
        { x: 1460, y: 32 }, { x: 1484, y: 32 }, { x: 1508, y: 32 },
        { x: 1560, y: 32 }, { x: 1584, y: 32 }, { x: 1608, y: 32 },
        { x: 1660, y: 32 }, { x: 1684, y: 32 }, { x: 1708, y: 32 },
      ],
      enemies: [
        // Fireballs rolling along the lower girder (DK's signature hazard)
        { x: 300, y: 256, minX: 80, maxX: 340, speed: 1.7, type: 'barrel' },
        { x: 1200, y: 256, minX: 1080, maxX: 1340, speed: 1.9, type: 'barrel' },
        { x: 1700, y: 256, minX: 1580, maxX: 1840, speed: 2.1, type: 'barrel' },
        { x: 2800, y: 256, minX: 2580, maxX: 2840, speed: 2.3, type: 'barrel' },
        // A barrel on the mid tier
        { x: 2400, y: 144, minX: 2250, maxX: 2720, speed: 2.0, type: 'barrel' },
        // Ground-level walkers
        { x: 1600, minX: 1400, maxX: 3400, speed: 1.4 },
      ],
      powerups: [
        { x: 1300, y: 192, type: 'star' },
        { x: 2760, y: 144, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3260,
      dkBoss: { x: 1500, y: 0, facing: -1 },
    },
    // ---------------------------------------------------------------
    // STAGE 2 — "50m"  (real DK 1-2: teal girders, black void, blue barrels)
    // ---------------------------------------------------------------
    {
      length: 3400,
      time: 250,
      stage: 'cage',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        // Upper tier (the top of the cage)
        { x: 160, y: 64, w: 360, type: 'girder' },
        { x: 900, y: 64, w: 360, type: 'girder' },
        { x: 1640, y: 64, w: 360, type: 'girder' },
        { x: 2380, y: 64, w: 360, type: 'girder' },
        { x: 2960, y: 64, w: 360, type: 'girder' },
        // Mid tier
        { x: 40, y: 176, w: 320, type: 'girder' },
        { x: 520, y: 176, w: 320, type: 'girder' },
        { x: 1000, y: 176, w: 320, type: 'girder' },
        { x: 1480, y: 176, w: 320, type: 'girder' },
        { x: 1960, y: 176, w: 320, type: 'girder' },
        { x: 2440, y: 176, w: 320, type: 'girder' },
        { x: 2920, y: 176, w: 320, type: 'girder' },
        // Lower tier
        { x: 120, y: 288, w: 320, type: 'girder' },
        { x: 600, y: 288, w: 320, type: 'girder' },
        { x: 1080, y: 288, w: 320, type: 'girder' },
        { x: 1560, y: 288, w: 320, type: 'girder' },
        { x: 2040, y: 288, w: 320, type: 'girder' },
        { x: 2520, y: 288, w: 320, type: 'girder' },
        { x: 3000, y: 288, w: 320, type: 'girder' },

        // Vertical ladders
        { x: 300, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 440, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 780, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1040, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 1260, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1520, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1740, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 2000, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2220, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2480, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 2700, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2960, y: 176, w: 20, h: 112, type: 'ladder' },

        // DK's brick alcove
        { x: 280, y: 112, w: 140, type: 'brick' },
        { x: 308, y: 80, w: 84, type: 'brick' },

        // Crates
        { x: 336, y: 80, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1064, y: 144, w: 32, type: 'question', powerup: 'star' },
        { x: 2024, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 664, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        // Oil drums
        { x: 520, y: 248, w: 26, type: 'oil_drum' },
        { x: 1480, y: 248, w: 26, type: 'oil_drum' },
        { x: 2440, y: 248, w: 26, type: 'oil_drum' },
      ],
      pipes: [],
      coins: [
        { x: 200, y: 32 }, { x: 224, y: 32 }, { x: 248, y: 32 },
        { x: 272, y: 32 }, { x: 296, y: 32 },
        { x: 940, y: 32 }, { x: 964, y: 32 }, { x: 988, y: 32 },
        { x: 1012, y: 32 }, { x: 1036, y: 32 },
        { x: 1680, y: 32 }, { x: 1704, y: 32 }, { x: 1728, y: 32 },
        { x: 2420, y: 32 }, { x: 2444, y: 32 }, { x: 2468, y: 32 },
        { x: 3000, y: 32 }, { x: 3024, y: 32 }, { x: 3048, y: 32 },
        { x: 160, y: 256 }, { x: 184, y: 256 }, { x: 208, y: 256 },
        { x: 640, y: 256 }, { x: 664, y: 256 }, { x: 688, y: 256 },
        { x: 1120, y: 256 }, { x: 1144, y: 256 }, { x: 1168, y: 256 },
        { x: 1600, y: 256 }, { x: 1624, y: 256 }, { x: 1648, y: 256 },
        { x: 2080, y: 256 }, { x: 2104, y: 256 }, { x: 2128, y: 256 },
        { x: 2560, y: 256 }, { x: 2584, y: 256 }, { x: 2608, y: 256 },
        { x: 3040, y: 256 }, { x: 3064, y: 256 }, { x: 3088, y: 256 },
      ],
      enemies: [
        // Blue barrels rolling down the cage girders
        { x: 700, y: 144, minX: 540, maxX: 820, speed: 2.0, type: 'barrel' },
        { x: 1700, y: 144, minX: 1500, maxX: 1780, speed: 2.2, type: 'barrel' },
        { x: 2700, y: 144, minX: 2460, maxX: 2740, speed: 2.4, type: 'barrel' },
        { x: 1200, y: 256, minX: 1100, maxX: 1380, speed: 2.1, type: 'barrel' },
        { x: 2200, y: 256, minX: 2060, maxX: 2340, speed: 2.3, type: 'barrel' },
        { x: 800, y: 256, minX: 620, maxX: 900, speed: 1.9, type: 'barrel' },
        { x: 1600, minX: 1400, maxX: 3400, speed: 1.5 },
      ],
      powerups: [
        { x: 1064, y: 112, type: 'star' },
        { x: 2024, y: 112, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3260,
      dkBoss: { x: 2380, y: 0, facing: -1 },
    },
    // ---------------------------------------------------------------
    // STAGE 3 — "75m"  (real DK 1-3: sky scene, tall support column, clouds)
    // The tall brown column with spikes on top is a landmark of 1-3.
    // ---------------------------------------------------------------
    {
      length: 3400,
      time: 240,
      stage: 'climb',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        // DK's high perch
        { x: 1300, y: 48, w: 400, type: 'girder' },
        // The tall wooden support column (1-3 landmark) — stacked bricks
        { x: 2380, y: 48, w: 64, type: 'brick' },
        { x: 2380, y: 80, w: 64, type: 'brick' },
        { x: 2380, y: 112, w: 64, type: 'brick' },
        { x: 2380, y: 144, w: 64, type: 'brick' },
        { x: 2380, y: 176, w: 64, type: 'brick' },
        { x: 2380, y: 208, w: 64, type: 'brick' },
        { x: 2380, y: 240, w: 64, type: 'brick' },
        { x: 2380, y: 272, w: 64, type: 'brick' },
        { x: 2380, y: 304, w: 64, type: 'brick' },
        { x: 2380, y: 336, w: 64, type: 'brick' },
        { x: 2380, y: 368, w: 64, type: 'brick' },
        { x: 2380, y: 400, w: 64, type: 'brick' },
        { x: 2380, y: 432, w: 64, type: 'brick' },
        // The green cap on top of the column
        { x: 2364, y: 32, w: 96, type: 'brick' },
        // Spike crown (the three spikes on 1-3's column)
        { x: 2392, y: 16, w: 12, type: 'oil_drum' },
        { x: 2410, y: 16, w: 12, type: 'oil_drum' },
        { x: 2428, y: 16, w: 12, type: 'oil_drum' },

        // Mid girders
        { x: 120, y: 176, w: 320, type: 'girder' },
        { x: 620, y: 176, w: 320, type: 'girder' },
        { x: 1120, y: 176, w: 320, type: 'girder' },
        { x: 1620, y: 176, w: 320, type: 'girder' },
        { x: 2100, y: 176, w: 320, type: 'girder' },
        { x: 2600, y: 176, w: 320, type: 'girder' },
        { x: 3020, y: 176, w: 320, type: 'girder' },
        // Lower girders
        { x: 240, y: 288, w: 320, type: 'girder' },
        { x: 740, y: 288, w: 320, type: 'girder' },
        { x: 1240, y: 288, w: 320, type: 'girder' },
        { x: 1740, y: 288, w: 320, type: 'girder' },
        { x: 2740, y: 288, w: 320, type: 'girder' },

        // Ladders
        { x: 400, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 900, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1400, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1900, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2300, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2700, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1400, y: 48, w: 20, h: 128, type: 'ladder' },

        // Crates
        { x: 1496, y: 16, w: 32, type: 'question', powerup: 'star' },
        { x: 660, y: 144, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 2140, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 780, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        // Oil drums
        { x: 620, y: 248, w: 26, type: 'oil_drum' },
        { x: 1740, y: 248, w: 26, type: 'oil_drum' },
      ],
      pipes: [],
      coins: [
        { x: 1340, y: 16 }, { x: 1364, y: 16 }, { x: 1388, y: 16 },
        { x: 1420, y: 16 }, { x: 1444, y: 16 }, { x: 1468, y: 16 },
        { x: 160, y: 144 }, { x: 184, y: 144 }, { x: 208, y: 144 },
        { x: 660, y: 144 }, { x: 684, y: 144 }, { x: 708, y: 144 },
        { x: 1160, y: 144 }, { x: 1184, y: 144 }, { x: 1208, y: 144 },
        { x: 1660, y: 144 }, { x: 1684, y: 144 }, { x: 1708, y: 144 },
        { x: 2140, y: 144 }, { x: 2164, y: 144 }, { x: 2188, y: 144 },
        { x: 2640, y: 144 }, { x: 2664, y: 144 }, { x: 2688, y: 144 },
        { x: 280, y: 256 }, { x: 304, y: 256 }, { x: 328, y: 256 },
        { x: 780, y: 256 }, { x: 804, y: 256 }, { x: 828, y: 256 },
        { x: 1280, y: 256 }, { x: 1304, y: 256 }, { x: 1328, y: 256 },
        { x: 1780, y: 256 }, { x: 1804, y: 256 }, { x: 1828, y: 256 },
        { x: 2780, y: 256 }, { x: 2804, y: 256 }, { x: 2828, y: 256 },
        { x: 3100, y: 256 }, { x: 3124, y: 256 }, { x: 3148, y: 256 },
      ],
      enemies: [
        { x: 800, y: 144, minX: 640, maxX: 1100, speed: 2.0, type: 'barrel' },
        { x: 1800, y: 144, minX: 1640, maxX: 2080, speed: 2.2, type: 'barrel' },
        { x: 2900, y: 144, minX: 2620, maxX: 3000, speed: 2.4, type: 'barrel' },
        { x: 1300, y: 256, minX: 1260, maxX: 1540, speed: 2.1, type: 'barrel' },
        { x: 1900, y: 256, minX: 1760, maxX: 2040, speed: 2.3, type: 'barrel' },
        { x: 1600, minX: 1400, maxX: 3400, speed: 1.5 },
      ],
      powerups: [
        { x: 1496, y: 16, type: 'star' },
        { x: 660, y: 144, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3260,
      dkBoss: { x: 1420, y: -16, facing: -1 },
    },
    // ---------------------------------------------------------------
    // STAGE 4 — "100m"  (real DK 1-4: grey brick fortress + LAVA PIT finale)
    // DK and Pauline wait together at the top-left on the fortress wall.
    // The red lava fills the bottom — touch it and you die.
    // ---------------------------------------------------------------
    {
      length: 3400,
      time: 230,
      stage: 'summit',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        // --- Fortress walls (grey brickwork) ---
        { x: 0, y: 32, w: 320, type: 'brick' },
        { x: 0, y: 64, w: 320, type: 'brick' },
        { x: 0, y: 96, w: 320, type: 'brick' },
        { x: 3080, y: 32, w: 320, type: 'brick' },
        { x: 3080, y: 64, w: 320, type: 'brick' },
        { x: 3080, y: 96, w: 320, type: 'brick' },
        // The high ledge DK and Pauline stand on
        { x: 340, y: 112, w: 420, type: 'brick' },
        { x: 340, y: 80, w: 420, type: 'brick' },
        { x: 340, y: 48, w: 420, type: 'brick' },

        // --- Girders inside the fortress ---
        { x: 900, y: 176, w: 340, type: 'girder' },
        { x: 1500, y: 176, w: 340, type: 'girder' },
        { x: 2100, y: 176, w: 340, type: 'girder' },
        { x: 2680, y: 176, w: 340, type: 'girder' },
        { x: 1200, y: 288, w: 340, type: 'girder' },
        { x: 1800, y: 288, w: 340, type: 'girder' },
        { x: 2400, y: 288, w: 340, type: 'girder' },
        { x: 420, y: 288, w: 340, type: 'girder' },

        // --- Ladders ---
        { x: 820, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1420, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2020, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2600, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1120, y: 288, w: 20, h: 112, type: 'ladder' },
        { x: 1720, y: 288, w: 20, h: 112, type: 'ladder' },
        { x: 2320, y: 288, w: 20, h: 112, type: 'ladder' },
        { x: 660, y: 112, w: 20, h: 176, type: 'ladder' },

        // --- The moving elevator platform (1-4's signature) ---
        // (defined in the `elevators` array below)

        // --- Crates ---
        { x: 640, y: 80, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1664, y: 144, w: 32, type: 'question', powerup: 'star' },
        { x: 2264, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 1244, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        // --- Oil drums ---
        { x: 900, y: 248, w: 26, type: 'oil_drum' },
        { x: 2100, y: 248, w: 26, type: 'oil_drum' },
        { x: 1200, y: 360, w: 26, type: 'oil_drum' },
      ],
      // --- The elevator that ferries the player up the fortress ---
      elevators: [
        { x: 1000, y: 176, w: 96, minX: 1000, maxX: 1000, minY: 176, maxY: 320, moveSpeed: 1.1, dirY: 1 },
        { x: 1900, y: 288, w: 96, minX: 1900, maxX: 1900, minY: 176, maxY: 288, moveSpeed: 1.3, dirY: -1 },
        { x: 2760, y: 176, w: 96, minX: 2760, maxX: 2760, minY: 176, maxY: 320, moveSpeed: 1.0, dirY: 1 },
      ],
      // --- The lava pit that fills the bottom of the fortress ---
      lava: [
        { x: 0, y: 424, w: 3400, h: 40 },
      ],
      pipes: [],
      coins: [
        { x: 380, y: 16 }, { x: 404, y: 16 }, { x: 428, y: 16 },
        { x: 452, y: 16 }, { x: 476, y: 16 }, { x: 500, y: 16 },
        { x: 940, y: 144 }, { x: 964, y: 144 }, { x: 988, y: 144 },
        { x: 1540, y: 144 }, { x: 1564, y: 144 }, { x: 1588, y: 144 },
        { x: 2140, y: 144 }, { x: 2164, y: 144 }, { x: 2188, y: 144 },
        { x: 2720, y: 144 }, { x: 2744, y: 144 }, { x: 2768, y: 144 },
        { x: 460, y: 256 }, { x: 484, y: 256 }, { x: 508, y: 256 },
        { x: 1240, y: 256 }, { x: 1264, y: 256 }, { x: 1288, y: 256 },
        { x: 1840, y: 256 }, { x: 1864, y: 256 }, { x: 1888, y: 256 },
        { x: 2440, y: 256 }, { x: 2464, y: 256 }, { x: 2488, y: 256 },
        { x: 200, y: 256 }, { x: 224, y: 256 }, { x: 248, y: 256 },
      ],
      enemies: [
        // Barrels guarding the fortress girders
        { x: 1100, y: 144, minX: 920, maxX: 1220, speed: 2.1, type: 'barrel' },
        { x: 2300, y: 144, minX: 2120, maxX: 2420, speed: 2.3, type: 'barrel' },
        { x: 1400, y: 256, minX: 1220, maxX: 1520, speed: 2.2, type: 'barrel' },
        { x: 2600, y: 256, minX: 2420, maxX: 2720, speed: 2.4, type: 'barrel' },
        { x: 600, y: 256, minX: 440, maxX: 740, speed: 2.0, type: 'barrel' },
        { x: 1600, minX: 1400, maxX: 3400, speed: 1.5 },
      ],
      powerups: [
        { x: 1664, y: 112, type: 'star' },
        { x: 640, y: 48, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3000,
      dkBoss: { x: 500, y: -16, facing: 1 },
      pauline: { x: 620, y: 4 },
    },
  ];

  // ============================================================
  //  DONKEY KONG (1981) — Stage 2/3 "barrel cage" set
  // ============================================================
  // Same four-stage structure, but tuned for the teal/black cage
  // palette with blue barrels and more verticality.
  const DK_BARREL_STAGES = [
    // STAGE 1 — cage girders with blue barrels
    {
      length: 3400,
      time: 255,
      stage: 'cage',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        { x: 180, y: 64, w: 380, type: 'girder' },
        { x: 900, y: 64, w: 380, type: 'girder' },
        { x: 1620, y: 64, w: 380, type: 'girder' },
        { x: 2340, y: 64, w: 380, type: 'girder' },
        { x: 2940, y: 64, w: 380, type: 'girder' },
        { x: 40, y: 176, w: 320, type: 'girder' },
        { x: 520, y: 176, w: 320, type: 'girder' },
        { x: 1000, y: 176, w: 320, type: 'girder' },
        { x: 1480, y: 176, w: 320, type: 'girder' },
        { x: 1960, y: 176, w: 320, type: 'girder' },
        { x: 2440, y: 176, w: 320, type: 'girder' },
        { x: 2920, y: 176, w: 320, type: 'girder' },
        { x: 120, y: 288, w: 320, type: 'girder' },
        { x: 600, y: 288, w: 320, type: 'girder' },
        { x: 1080, y: 288, w: 320, type: 'girder' },
        { x: 1560, y: 288, w: 320, type: 'girder' },
        { x: 2040, y: 288, w: 320, type: 'girder' },
        { x: 2520, y: 288, w: 320, type: 'girder' },
        { x: 3000, y: 288, w: 320, type: 'girder' },

        { x: 320, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 460, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 800, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1060, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 1280, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1540, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1760, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 2020, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2240, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2500, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 2720, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2980, y: 176, w: 20, h: 112, type: 'ladder' },

        { x: 300, y: 112, w: 140, type: 'brick' },
        { x: 328, y: 80, w: 84, type: 'brick' },
        { x: 356, y: 80, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1084, y: 144, w: 32, type: 'question', powerup: 'star' },
        { x: 2044, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 684, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        { x: 520, y: 248, w: 26, type: 'oil_drum' },
        { x: 1480, y: 248, w: 26, type: 'oil_drum' },
        { x: 2440, y: 248, w: 26, type: 'oil_drum' },
      ],
      pipes: [],
      coins: [
        { x: 220, y: 32 }, { x: 244, y: 32 }, { x: 268, y: 32 }, { x: 292, y: 32 },
        { x: 940, y: 32 }, { x: 964, y: 32 }, { x: 988, y: 32 }, { x: 1012, y: 32 },
        { x: 1660, y: 32 }, { x: 1684, y: 32 }, { x: 1708, y: 32 }, { x: 1732, y: 32 },
        { x: 2380, y: 32 }, { x: 2404, y: 32 }, { x: 2428, y: 32 }, { x: 2452, y: 32 },
        { x: 2980, y: 32 }, { x: 3004, y: 32 }, { x: 3028, y: 32 },
        { x: 160, y: 256 }, { x: 184, y: 256 }, { x: 208, y: 256 },
        { x: 640, y: 256 }, { x: 664, y: 256 }, { x: 688, y: 256 },
        { x: 1120, y: 256 }, { x: 1144, y: 256 }, { x: 1168, y: 256 },
        { x: 1600, y: 256 }, { x: 1624, y: 256 }, { x: 1648, y: 256 },
        { x: 2080, y: 256 }, { x: 2104, y: 256 }, { x: 2128, y: 256 },
        { x: 2560, y: 256 }, { x: 2584, y: 256 }, { x: 2608, y: 256 },
        { x: 3040, y: 256 }, { x: 3064, y: 256 }, { x: 3088, y: 256 },
      ],
      enemies: [
        { x: 700, y: 144, minX: 540, maxX: 820, speed: 2.0, type: 'barrel' },
        { x: 1700, y: 144, minX: 1500, maxX: 1780, speed: 2.2, type: 'barrel' },
        { x: 2700, y: 144, minX: 2460, maxX: 2740, speed: 2.4, type: 'barrel' },
        { x: 1200, y: 256, minX: 1100, maxX: 1380, speed: 2.1, type: 'barrel' },
        { x: 2200, y: 256, minX: 2060, maxX: 2340, speed: 2.3, type: 'barrel' },
        { x: 800, y: 256, minX: 620, maxX: 900, speed: 1.9, type: 'barrel' },
        { x: 1600, minX: 1400, maxX: 3400, speed: 1.5 },
      ],
      powerups: [
        { x: 1084, y: 112, type: 'star' },
        { x: 2044, y: 112, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3260,
      dkBoss: { x: 2420, y: 0, facing: -1 },
    },
    // STAGE 2 — conveyor-style climb with elevators
    {
      length: 3400,
      time: 245,
      stage: 'conveyors',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        { x: 140, y: 64, w: 360, type: 'girder' },
        { x: 880, y: 64, w: 360, type: 'girder' },
        { x: 1620, y: 64, w: 360, type: 'girder' },
        { x: 2360, y: 64, w: 360, type: 'girder' },
        { x: 2960, y: 64, w: 360, type: 'girder' },
        { x: 40, y: 176, w: 320, type: 'girder' },
        { x: 520, y: 176, w: 320, type: 'girder' },
        { x: 1000, y: 176, w: 320, type: 'girder' },
        { x: 1480, y: 176, w: 320, type: 'girder' },
        { x: 1960, y: 176, w: 320, type: 'girder' },
        { x: 2440, y: 176, w: 320, type: 'girder' },
        { x: 2920, y: 176, w: 320, type: 'girder' },
        { x: 160, y: 288, w: 320, type: 'girder' },
        { x: 640, y: 288, w: 320, type: 'girder' },
        { x: 1120, y: 288, w: 320, type: 'girder' },
        { x: 1600, y: 288, w: 320, type: 'girder' },
        { x: 2080, y: 288, w: 320, type: 'girder' },
        { x: 2560, y: 288, w: 320, type: 'girder' },
        { x: 3000, y: 288, w: 320, type: 'girder' },

        { x: 340, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 480, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 820, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1080, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 1300, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1560, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1780, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 2040, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2260, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2520, y: 64, w: 20, h: 112, type: 'ladder' },
        { x: 2740, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 3000, y: 176, w: 20, h: 112, type: 'ladder' },

        { x: 260, y: 112, w: 140, type: 'brick' },
        { x: 288, y: 80, w: 84, type: 'brick' },
        { x: 316, y: 80, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1104, y: 144, w: 32, type: 'question', powerup: 'star' },
        { x: 2064, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 704, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        { x: 520, y: 248, w: 26, type: 'oil_drum' },
        { x: 1480, y: 248, w: 26, type: 'oil_drum' },
        { x: 2440, y: 248, w: 26, type: 'oil_drum' },
      ],
      // Elevators ferrying the player between tiers
      elevators: [
        { x: 700, y: 176, w: 96, minX: 700, maxX: 700, minY: 176, maxY: 320, moveSpeed: 1.4, dirY: 1 },
        { x: 1700, y: 288, w: 96, minX: 1700, maxX: 1700, minY: 176, maxY: 288, moveSpeed: 1.2, dirY: -1 },
        { x: 2700, y: 176, w: 96, minX: 2700, maxX: 2700, minY: 176, maxY: 320, moveSpeed: 1.6, dirY: 1 },
      ],
      pipes: [],
      coins: [
        { x: 180, y: 32 }, { x: 204, y: 32 }, { x: 228, y: 32 }, { x: 252, y: 32 },
        { x: 920, y: 32 }, { x: 944, y: 32 }, { x: 968, y: 32 }, { x: 992, y: 32 },
        { x: 1660, y: 32 }, { x: 1684, y: 32 }, { x: 1708, y: 32 }, { x: 1732, y: 32 },
        { x: 2400, y: 32 }, { x: 2424, y: 32 }, { x: 2448, y: 32 }, { x: 2472, y: 32 },
        { x: 3000, y: 32 }, { x: 3024, y: 32 }, { x: 3048, y: 32 },
        { x: 200, y: 256 }, { x: 224, y: 256 }, { x: 248, y: 256 },
        { x: 680, y: 256 }, { x: 704, y: 256 }, { x: 728, y: 256 },
        { x: 1160, y: 256 }, { x: 1184, y: 256 }, { x: 1208, y: 256 },
        { x: 1640, y: 256 }, { x: 1664, y: 256 }, { x: 1688, y: 256 },
        { x: 2120, y: 256 }, { x: 2144, y: 256 }, { x: 2168, y: 256 },
        { x: 2600, y: 256 }, { x: 2624, y: 256 }, { x: 2648, y: 256 },
        { x: 3040, y: 256 }, { x: 3064, y: 256 }, { x: 3088, y: 256 },
      ],
      enemies: [
        { x: 700, y: 144, minX: 540, maxX: 820, speed: 2.1, type: 'barrel' },
        { x: 1700, y: 144, minX: 1500, maxX: 1780, speed: 2.3, type: 'barrel' },
        { x: 2700, y: 144, minX: 2460, maxX: 2740, speed: 2.5, type: 'barrel' },
        { x: 1200, y: 256, minX: 1140, maxX: 1420, speed: 2.2, type: 'barrel' },
        { x: 2200, y: 256, minX: 2100, maxX: 2380, speed: 2.4, type: 'barrel' },
        { x: 800, y: 256, minX: 660, maxX: 940, speed: 2.0, type: 'barrel' },
        { x: 400, minX: 0, maxX: 3400, speed: 1.6 },
      ],
      powerups: [
        { x: 1104, y: 112, type: 'star' },
        { x: 2064, y: 112, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3260,
      dkBoss: { x: 2400, y: 0, facing: -1 },
    },
    // STAGE 3 — the tall column climb
    {
      length: 3400,
      time: 235,
      stage: 'climb',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        { x: 1300, y: 48, w: 400, type: 'girder' },
        // Tall support column (the 1-3 landmark)
        { x: 2360, y: 32, w: 96, type: 'brick' },
        { x: 2380, y: 48, w: 64, type: 'brick' },
        { x: 2380, y: 80, w: 64, type: 'brick' },
        { x: 2380, y: 112, w: 64, type: 'brick' },
        { x: 2380, y: 144, w: 64, type: 'brick' },
        { x: 2380, y: 176, w: 64, type: 'brick' },
        { x: 2380, y: 208, w: 64, type: 'brick' },
        { x: 2380, y: 240, w: 64, type: 'brick' },
        { x: 2380, y: 272, w: 64, type: 'brick' },
        { x: 2380, y: 304, w: 64, type: 'brick' },
        { x: 2380, y: 336, w: 64, type: 'brick' },
        { x: 2380, y: 368, w: 64, type: 'brick' },
        { x: 2380, y: 400, w: 64, type: 'brick' },
        { x: 2380, y: 432, w: 64, type: 'brick' },
        // Spike crown
        { x: 2392, y: 16, w: 12, type: 'oil_drum' },
        { x: 2410, y: 16, w: 12, type: 'oil_drum' },
        { x: 2428, y: 16, w: 12, type: 'oil_drum' },

        { x: 120, y: 176, w: 320, type: 'girder' },
        { x: 620, y: 176, w: 320, type: 'girder' },
        { x: 1120, y: 176, w: 320, type: 'girder' },
        { x: 1620, y: 176, w: 320, type: 'girder' },
        { x: 2100, y: 176, w: 320, type: 'girder' },
        { x: 2600, y: 176, w: 320, type: 'girder' },
        { x: 3020, y: 176, w: 320, type: 'girder' },
        { x: 240, y: 288, w: 320, type: 'girder' },
        { x: 740, y: 288, w: 320, type: 'girder' },
        { x: 1240, y: 288, w: 320, type: 'girder' },
        { x: 1740, y: 288, w: 320, type: 'girder' },
        { x: 2740, y: 288, w: 320, type: 'girder' },

        { x: 400, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 900, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1400, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1900, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2300, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2700, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1400, y: 48, w: 20, h: 128, type: 'ladder' },

        { x: 1496, y: 16, w: 32, type: 'question', powerup: 'star' },
        { x: 660, y: 144, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 2140, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 780, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        { x: 620, y: 248, w: 26, type: 'oil_drum' },
        { x: 1740, y: 248, w: 26, type: 'oil_drum' },
      ],
      pipes: [],
      coins: [
        { x: 1340, y: 16 }, { x: 1364, y: 16 }, { x: 1388, y: 16 },
        { x: 1412, y: 16 }, { x: 1436, y: 16 }, { x: 1460, y: 16 },
        { x: 160, y: 144 }, { x: 184, y: 144 }, { x: 208, y: 144 },
        { x: 660, y: 144 }, { x: 684, y: 144 }, { x: 708, y: 144 },
        { x: 1160, y: 144 }, { x: 1184, y: 144 }, { x: 1208, y: 144 },
        { x: 1660, y: 144 }, { x: 1684, y: 144 }, { x: 1708, y: 144 },
        { x: 2140, y: 144 }, { x: 2164, y: 144 }, { x: 2188, y: 144 },
        { x: 2640, y: 144 }, { x: 2664, y: 144 }, { x: 2688, y: 144 },
        { x: 280, y: 256 }, { x: 304, y: 256 }, { x: 328, y: 256 },
        { x: 780, y: 256 }, { x: 804, y: 256 }, { x: 828, y: 256 },
        { x: 1280, y: 256 }, { x: 1304, y: 256 }, { x: 1328, y: 256 },
        { x: 1780, y: 256 }, { x: 1804, y: 256 }, { x: 1828, y: 256 },
        { x: 2780, y: 256 }, { x: 2804, y: 256 }, { x: 2828, y: 256 },
        { x: 3100, y: 256 }, { x: 3124, y: 256 }, { x: 3148, y: 256 },
      ],
      enemies: [
        { x: 800, y: 144, minX: 640, maxX: 920, speed: 2.1, type: 'barrel' },
        { x: 1800, y: 144, minX: 1640, maxX: 1920, speed: 2.3, type: 'barrel' },
        { x: 2900, y: 144, minX: 2620, maxX: 2900, speed: 2.5, type: 'barrel' },
        { x: 1300, y: 256, minX: 1260, maxX: 1540, speed: 2.2, type: 'barrel' },
        { x: 2900, y: 256, minX: 2760, maxX: 3040, speed: 2.4, type: 'barrel' },
        { x: 500, minX: 0, maxX: 3400, speed: 1.6 },
      ],
      powerups: [
        { x: 1496, y: 16, type: 'star' },
        { x: 660, y: 144, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3260,
      dkBoss: { x: 1420, y: -16, facing: -1 },
    },
    // STAGE 4 — the lava finale
    {
      length: 3400,
      time: 225,
      stage: 'summit',
      ground: [
        { x: 0, w: 3400 },
      ],
      blocks: [
        { x: 0, y: 32, w: 320, type: 'brick' },
        { x: 0, y: 64, w: 320, type: 'brick' },
        { x: 0, y: 96, w: 320, type: 'brick' },
        { x: 3080, y: 32, w: 320, type: 'brick' },
        { x: 3080, y: 64, w: 320, type: 'brick' },
        { x: 3080, y: 96, w: 320, type: 'brick' },
        { x: 340, y: 48, w: 420, type: 'brick' },
        { x: 340, y: 80, w: 420, type: 'brick' },
        { x: 340, y: 112, w: 420, type: 'brick' },

        { x: 900, y: 176, w: 340, type: 'girder' },
        { x: 1500, y: 176, w: 340, type: 'girder' },
        { x: 2100, y: 176, w: 340, type: 'girder' },
        { x: 2680, y: 176, w: 340, type: 'girder' },
        { x: 420, y: 288, w: 340, type: 'girder' },
        { x: 1200, y: 288, w: 340, type: 'girder' },
        { x: 1800, y: 288, w: 340, type: 'girder' },
        { x: 2400, y: 288, w: 340, type: 'girder' },

        { x: 820, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1420, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2020, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 2600, y: 176, w: 20, h: 112, type: 'ladder' },
        { x: 1120, y: 288, w: 20, h: 112, type: 'ladder' },
        { x: 1720, y: 288, w: 20, h: 112, type: 'ladder' },
        { x: 2320, y: 288, w: 20, h: 112, type: 'ladder' },
        { x: 660, y: 112, w: 20, h: 176, type: 'ladder' },

        { x: 640, y: 80, w: 32, type: 'question', powerup: 'mushroom' },
        { x: 1664, y: 144, w: 32, type: 'question', powerup: 'star' },
        { x: 2264, y: 144, w: 32, type: 'question', powerup: 'fireflower' },
        { x: 1244, y: 256, w: 32, type: 'question', powerup: 'iceflower' },

        { x: 900, y: 248, w: 26, type: 'oil_drum' },
        { x: 2100, y: 248, w: 26, type: 'oil_drum' },
        { x: 1200, y: 360, w: 26, type: 'oil_drum' },
      ],
      elevators: [
        { x: 1000, y: 176, w: 96, minX: 1000, maxX: 1000, minY: 176, maxY: 320, moveSpeed: 1.2, dirY: 1 },
        { x: 1900, y: 288, w: 96, minX: 1900, maxX: 1900, minY: 176, maxY: 288, moveSpeed: 1.4, dirY: -1 },
        { x: 2760, y: 176, w: 96, minX: 2760, maxX: 2760, minY: 176, maxY: 320, moveSpeed: 1.1, dirY: 1 },
      ],
      lava: [
        { x: 0, y: 424, w: 3400, h: 40 },
      ],
      pipes: [],
      coins: [
        { x: 380, y: 16 }, { x: 404, y: 16 }, { x: 428, y: 16 },
        { x: 452, y: 16 }, { x: 476, y: 16 }, { x: 500, y: 16 },
        { x: 940, y: 144 }, { x: 964, y: 144 }, { x: 988, y: 144 },
        { x: 1540, y: 144 }, { x: 1564, y: 144 }, { x: 1588, y: 144 },
        { x: 2140, y: 144 }, { x: 2164, y: 144 }, { x: 2188, y: 144 },
        { x: 2720, y: 144 }, { x: 2744, y: 144 }, { x: 2768, y: 144 },
        { x: 460, y: 256 }, { x: 484, y: 256 }, { x: 508, y: 256 },
        { x: 1240, y: 256 }, { x: 1264, y: 256 }, { x: 1288, y: 256 },
        { x: 1840, y: 256 }, { x: 1864, y: 256 }, { x: 1888, y: 256 },
        { x: 2440, y: 256 }, { x: 2464, y: 256 }, { x: 2488, y: 256 },
        { x: 200, y: 256 }, { x: 224, y: 256 }, { x: 248, y: 256 },
      ],
      enemies: [
        { x: 1200, y: 144, minX: 900, maxX: 1500, speed: 2.2, type: 'barrel' },
        { x: 2400, y: 144, minX: 2100, maxX: 2680, speed: 2.4, type: 'barrel' },
        { x: 1600, y: 256, minX: 1200, maxX: 1800, speed: 2.3, type: 'barrel' },
        { x: 2600, y: 256, minX: 2400, maxX: 3020, speed: 2.5, type: 'barrel' },
        { x: 600, y: 256, minX: 420, maxX: 1200, speed: 2.1, type: 'barrel' },
        { x: 400, minX: 0, maxX: 3400, speed: 1.6 },
      ],
      powerups: [
        { x: 1664, y: 112, type: 'star' },
        { x: 640, y: 48, type: 'fireflower' },
      ],
      checkpoints: [900, 1900, 2800],
      flagX: 3000,
      dkBoss: { x: 500, y: -16, facing: 1 },
      pauline: { x: 620, y: 4 },
    },
  ];

  // ===== Procedural Level Generator =====
  // For levels 5+ we generate a fresh layout every time.
  // Difficulty scales smoothly from level 5 up to 100:
  //   - longer levels, tighter gaps, more enemies, faster enemies, less time
  // The 8 map themes cycle so every batch of levels looks different.
  // A seeded RNG keeps each level reproducible for a given level number.

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Map a 1..100 level number onto a 0..7 theme index.
  // Levels 1-4 stay on the selected map (hand-crafted); 5+ cycle through themes.
  // NOTE: The Donkey Kong themes are deliberately EXCLUDED from this rotation
  // so that the original 8-theme cycle for the pre-existing maps is unchanged.
  function themeIndexForLevel(lv) {
    // Index into the non-DK portion of MAPS (the first 8 entries).
    const baseThemes = MAPS.slice(0, 8);
    return (lv - 1) % baseThemes.length;
  }

  function generateLevel(lv) {
    const rng = mulberry32(lv * 99991 + 12345);
    const r = rng;            // shorthand
    const difficulty = (lv - 1) / 99;          // 0 at level 1, 1 at level 100
    const themeIdx = themeIndexForLevel(lv);

    // --- Dimensions scale with difficulty ---
    const length = Math.round(2400 + difficulty * 2600 + r() * 400); // 2400..5400
    const time = Math.round(320 - difficulty * 120);                 // 320..200
    const TILE = 32;

    // --- Ground segments (with gaps that grow wider) ---
    const ground = [];
    let cx = 0;
    const minGap = 48 + difficulty * 64;       // 48..112
    const maxGap = 96 + difficulty * 96;       // 96..192
    const segMin = 320;
    const segMax = 640;
    while (cx < length - 400) {
      const segW = Math.round(segMin + r() * (segMax - segMin));
      ground.push({ x: cx, w: segW });
      cx += segW;
      // Leave a gap (but never on the very first segment)
      if (cx < length - 500 && r() < 0.7) {
        cx += Math.round(minGap + r() * (maxGap - minGap));
      }
    }
    // Always have solid ground at the end for the flag
    ground.push({ x: cx, w: Math.max(400, length - cx) });

    // --- Blocks (question blocks, bricks, stairs) ---
    const blocks = [];
    const blockY = 320;
    const blockCount = Math.round(3 + difficulty * 8 + r() * 4);
    for (let i = 0; i < blockCount; i++) {
      const bx = Math.round(300 + r() * (length - 800));
      // Skip if inside a gap
      if (!isOnGround(ground, bx)) continue;
      const roll = r();
      if (roll < 0.3) {
        // Single question block with a power-up
        const pu = r() < 0.3 ? 'mushroom' : r() < 0.5 ? 'fireflower' : r() < 0.7 ? 'iceflower' : 'star';
        blocks.push({ x: bx, y: blockY, w: TILE, type: 'question', powerup: pu });
      } else if (roll < 0.6) {
        // Row of 3-5 bricks
        const n = 3 + Math.floor(r() * 3);
        for (let j = 0; j < n; j++) {
          blocks.push({ x: bx + j * TILE, y: blockY, w: TILE, type: 'brick' });
        }
        // Sometimes a question block in the middle
        if (r() < 0.5) {
          blocks.push({ x: bx + Math.floor(n / 2) * TILE, y: blockY, w: TILE, type: 'question', powerup: 'mushroom' });
        }
      } else if (roll < 0.8) {
        // High platform
        const pw = 64 + Math.floor(r() * 64);
        blocks.push({ x: bx, y: 224, w: pw, type: 'brick' });
      } else {
        // Staircase (ascending or descending)
        const dir = r() < 0.5 ? 1 : -1;
        const steps = 3 + Math.floor(r() * 3);
        for (let s = 0; s < steps; s++) {
          const sx = bx + s * TILE * dir;
          if (sx > 0 && sx < length - 200 && isOnGround(ground, sx)) {
            blocks.push({ x: sx, y: GROUND_Y - (s + 1) * 32, w: TILE, type: 'stair' });
          }
        }
      }
    }

    // --- Pipes ---
    const pipes = [];
    const pipeCount = Math.round(2 + difficulty * 4 + r() * 2);
    for (let i = 0; i < pipeCount; i++) {
      const px = Math.round(400 + r() * (length - 800));
      if (!isOnGround(ground, px)) continue;
      const h = 32 + Math.floor(r() * 3) * 16;  // 32, 48, 64
      pipes.push({ x: px, h });
    }

    // --- Coins ---
    const coins = [];
    const coinCount = Math.round(12 + difficulty * 20);
    for (let i = 0; i < coinCount; i++) {
      const cxe = Math.round(100 + r() * (length - 200));
      // Place coins on the ground or slightly above
      if (isOnGround(ground, cxe)) {
        const cy = r() < 0.3 ? 220 + r() * 60 : 400 + r() * 30;
        coins.push({ x: cxe, y: cy });
      }
    }
    // Add coin arcs over gaps
    ground.forEach((seg, i) => {
      if (i < ground.length - 1 && r() < 0.5) {
        const gapStart = seg.x + seg.w;
        const nextSeg = ground[i + 1];
        const gapW = nextSeg.x - gapStart;
        if (gapW > 32 && gapW < 160) {
          const mid = gapStart + gapW / 2;
          coins.push({ x: mid - 20, y: 340 });
          coins.push({ x: mid, y: 320 });
          coins.push({ x: mid + 20, y: 340 });
        }
      }
    });

    // --- Enemies ---
    const enemies = [];
    const enemyCount = Math.round(4 + difficulty * 12 + r() * 3);
    const enemySpeed = 1.1 + difficulty * 1.6;     // 1.1..2.7
    for (let i = 0; i < enemyCount; i++) {
      const ex = Math.round(300 + r() * (length - 600));
      const seg = findGroundSegment(ground, ex);
      if (!seg) continue;
      const minX = Math.max(seg.x, ex - 80 - difficulty * 40);
      const maxX = Math.min(seg.x + seg.w, ex + 80 + difficulty * 40);
      const spd = enemySpeed + r() * 0.4;
      // Assign enemy type based on difficulty and randomness
      let type = 'walker';
      const typeRoll = r();
      if (difficulty > 0.2 && typeRoll < 0.2) {
        type = 'flyer';
      } else if (difficulty > 0.3 && typeRoll < 0.35) {
        type = 'charger';
      }
      // Flyers get a y position above ground
      const ey = type === 'flyer' ? GROUND_Y - 80 - r() * 60 : GROUND_Y - 28;
      enemies.push({ x: ex, y: ey, minX, maxX, speed: spd, type });
    }

    // --- Power-ups (static pickups) ---
    const powerups = [];
    const puCount = Math.round(1 + r() * 2);
    for (let i = 0; i < puCount; i++) {
      const px = Math.round(500 + r() * (length - 1000));
      if (isOnGround(ground, px)) {
        const roll = r();
        const type = roll < 0.35 ? 'mushroom' : roll < 0.55 ? 'star' : roll < 0.75 ? 'fireflower' : 'iceflower';
        powerups.push({ x: px, y: 208, type });
      }
    }

    // --- Checkpoints (3 evenly spaced) ---
    const checkpoints = [
      Math.round(length * 0.25),
      Math.round(length * 0.5),
      Math.round(length * 0.75),
    ];

    // --- Flag ---
    const lastSeg = ground[ground.length - 1];
    const flagX = lastSeg.x + lastSeg.w - 200;

    return {
      length, time, ground, blocks, pipes, coins, enemies, powerups,
      checkpoints, flagX, themeIdx, generated: true,
    };
  }

  // Helper: is x on a ground segment?
  function isOnGround(ground, x) {
    return ground.some((g) => x >= g.x && x < g.x + g.w);
  }

  // Helper: find the ground segment that contains x
  function findGroundSegment(ground, x) {
    return ground.find((g) => x >= g.x && x < g.x + g.w) || null;
  }

  // ===== Level Builder (reads hand-crafted or generated layouts) =====
  // Maps whose id is in this list use the Donkey Kong layouts
  const DK_MAP_IDS = ['dkLadder', 'dkPlatform'];

  // Each DK map owns its own set of stages, so "DK Girders" and
  // "DK Barrels" play differently instead of sharing one list.
  const DK_STAGE_SETS = {
    dkLadder: DK_GIRDER_STAGES,
    dkPlatform: DK_BARREL_STAGES,
  };

  // Resolve which layout a level should use.
  // When a Donkey Kong map theme is selected, the early levels use the
  // hand-crafted DK stages and later ones are generated procedurally with
  // the DK theme applied. All other maps keep the exact same behaviour.
  function resolveLayout(lv) {
    const dkMap = DK_MAP_IDS.indexOf(activeMap.id) !== -1;
    if (dkMap) {
      const stageSet = DK_STAGE_SETS[activeMap.id] || DK_LEVEL_LAYOUTS;
      if (lv <= stageSet.length) {
        const dkLayout = stageSet[lv - 1];
        return {
          length: dkLayout.length,
          time: dkLayout.time,
          ground: dkLayout.ground,
          blocks: dkLayout.blocks,
          pipes: dkLayout.pipes,
          coins: dkLayout.coins,
          enemies: dkLayout.enemies,
          powerups: dkLayout.powerups,
          checkpoints: dkLayout.checkpoints,
          flagX: dkLayout.flagX,
          // Donkey Kong extras
          stage: dkLayout.stage || null,
          dkBoss: dkLayout.dkBoss || null,
          pauline: dkLayout.pauline || null,
          elevators: dkLayout.elevators || null,
          lava: dkLayout.lava || null,
          barrels: dkLayout.barrels || null,
          themeIdx: MAPS.indexOf(activeMap),
          generated: false,
          dk: true,
        };
      }
      // Levels beyond the hand-crafted DK ones: generate procedurally but
      // force the DK theme so the palette stays consistent.
      const gen = generateLevel(lv);
      gen.themeIdx = MAPS.indexOf(activeMap);
      return gen;
    }
    // Levels 1-4 use hand-crafted layouts; 5+ are generated procedurally
    return lv <= LEVEL_LAYOUTS.length ? LEVEL_LAYOUTS[lv - 1] : generateLevel(lv);
  }

  function buildLevel() {
    const lv = state.currentLevel; // 1..100
    const layout = resolveLayout(lv);
    platforms = [];
    coins = [];
    enemies = [];
    particles = [];
    powerups = [];
    fireballs = [];
    checkpoints = [];
    currentCheckpoint = null;
    // Reset Donkey Kong stage scenery
    dkStage = null;
    dkBoss = null;
    pauline = null;
    lavaZones = [];
    state.cameraX = 0;
    state.time = layout.time;
    state.levelEnd = layout.length;

    // For generated levels, swap the active map theme to match
    if (layout.generated) {
      activeMap = MAPS[layout.themeIdx];
    }

    // Donkey Kong stage scenery (boss, Pauline, stage tag)
    if (layout.dk) {
      dkStage = layout.stage || null;
      dkBoss = layout.dkBoss ? { ...layout.dkBoss } : null;
      pauline = layout.pauline ? { ...layout.pauline } : null;
    }

    // Initialize atmosphere systems for this level
    // Start timeOfDay at a varied point based on level number so different levels feel different
    state.timeOfDay = ((state.currentLevel * 0.137) % 1.0);
    state.shake = 0; state.shakeX = 0; state.shakeY = 0;
    initWeather();
    initParallax();

    // Ground segments
    layout.ground.forEach((g) => {
      platforms.push({ x: g.x, y: GROUND_Y, w: g.w, h: 40, kind: 'ground' });
    });

    // Floating blocks / bricks / stairs / question blocks
    layout.blocks.forEach((b) => {
      // DK-style kinds have their own heights: girders are thin slats,
      // ladders are tall thin columns (rails + rungs, not solid).
      let h = 16;
      if (b.type === 'stair') h = 32;
      else if (b.type === 'girder') h = 16;
      else if (b.type === 'ladder') h = b.h || 80;
      else if (b.type === 'oil_drum') h = 24;
      platforms.push({
        x: b.x, y: b.y, w: b.w, h,
        kind: b.type,
        used: b.type === 'question' ? false : undefined,
        powerup: b.type === 'question' ? (b.powerup || 'mushroom') : undefined,
        bump: 0,
      });
    });

    // DK elevators — girders that travel between two points.
    // Stored separately so the update loop can move them without
    // disturbing the static platform array.
    if (layout.elevators) {
      layout.elevators.forEach((ev) => {
        platforms.push({
          x: ev.x, y: ev.y, w: ev.w || 96, h: 16,
          kind: 'girder',
          elevator: true,
          // Travel range (absolute) and speed
          baseX: ev.x, baseY: ev.y,
          minX: ev.minX !== undefined ? ev.minX : ev.x,
          maxX: ev.maxX !== undefined ? ev.maxX : ev.x,
          minY: ev.minY !== undefined ? ev.minY : ev.y,
          maxY: ev.maxY !== undefined ? ev.maxY : ev.y,
          moveSpeed: ev.moveSpeed || 1.2,
          // Direction the elevator travels first
          dirX: ev.dirX !== undefined ? ev.dirX : 0,
          dirY: ev.dirY !== undefined ? ev.dirY : 1,
        });
      });
    }

    // DK lava / fire pits — instant death zones at the bottom of the level.
    if (layout.lava) {
      lavaZones = layout.lava.map((l) => ({ x: l.x, y: l.y, w: l.w, h: l.h || 40 }));
    }

    // Pipes
    if (layout.pipes) {
      layout.pipes.forEach((p) => {
        platforms.push({ x: p.x, y: GROUND_Y - p.h, w: 48, h: p.h, kind: 'pipe' });
      });
    }

    // Coins
    layout.coins.forEach((c) => {
      coins.push({ x: c.x, y: c.y, w: 16, h: 16, collected: false, anim: Math.random() * Math.PI * 2 });
    });

    // Enemies
    layout.enemies.forEach((e) => {
      const ey = e.y !== undefined ? e.y : GROUND_Y - 28;
      enemies.push(makeEnemy(e.x, ey, e.minX, e.maxX, e.speed, e.type));
    });

    // Flag
    flag = { x: layout.flagX, y: GROUND_Y - 80, w: 8, h: 80 };

    // Power-ups (static pickups placed directly in the level)
    layout.powerups.forEach((pu) => {
      powerups.push({ x: pu.x, y: pu.y, w: 18, h: 18, type: pu.type, collected: false, anim: 0, static: true });
    });

    // Checkpoints
    layout.checkpoints.forEach((cpx) => {
      checkpoints.push({ x: cpx, y: GROUND_Y - 48, w: 6, h: 48, activated: false });
    });
  }

  function makeEnemy(x, y, minX, maxX, speed, type) {
    type = type || 'walker';
    const base = { x, y, w: 28, h: 28, vx: speed || 1.2, minX, maxX, alive: true, squishTimer: 0, walkFrame: 0, type, freezeTimer: 0, baseY: y };
    if (type === 'flyer') {
      // Flying enemy: floats at a fixed height and bobs in a sine pattern
      base.w = 26; base.h = 22;
      base.bobAmp = 20 + Math.random() * 15;
      base.bobSpeed = 0.05 + Math.random() * 0.03;
      base.bobPhase = Math.random() * Math.PI * 2;
    } else if (type === 'charger') {
      // Charger: stands still until a player is nearby, then rushes
      base.w = 30; base.h = 30;
      base.charging = false;
      base.chargeSpeed = (speed || 1.2) * 2.5;
      base.normalSpeed = speed || 1.2;
    } else if (type === 'barrel') {
      // DK barrel: rolls along a girder and drops down slopes.
      base.w = 24; base.h = 24;
      base.vy = 0;
      base.onGround = true;
      base.barrelColor = base.barrelColor || '#c0392b';
      // Barrels roll faster than walkers and always keep rolling.
      base.vx = speed || 1.6;
      base.rollFrame = 0;
    }
    return base;
  }

  // ===== Particles =====
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 5 - 1,
        life: 30,
        color,
        size: Math.random() * 3 + 2,
      });
    }
  }

  // Dust particles on landing / running — small, low-velocity, short-lived
  function spawnDust(x, y, count, dir) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y,
        vx: (dir || 0) * (0.5 + Math.random()) + (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 0.5,
        life: 18,
        color: 'rgba(200,190,160,0.6)',
        size: 2 + Math.random() * 2,
      });
    }
  }

  // Screen shake — trigger with magnitude, decays over ~15 frames
  function triggerShake(magnitude) {
    state.shake = Math.max(state.shake, magnitude);
  }

  function updateShake() {
    if (state.shake > 0) {
      state.shake -= dtRatio * 0.8;
      if (state.shake < 0) state.shake = 0;
      state.shakeX = (Math.random() - 0.5) * state.shake * 2;
      state.shakeY = (Math.random() - 0.5) * state.shake * 2;
    } else {
      state.shakeX = 0;
      state.shakeY = 0;
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dtRatio;
      p.y += p.vy * dtRatio;
      p.vy += 0.3 * dtRatio;
      p.life -= dtRatio;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles() {
    particles.forEach((p) => {
      ctx.globalAlpha = p.life / 30;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - state.cameraX, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
  }

  // ===== Collision =====
  function rectCollide(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // ===== Update Player =====
  function updatePlayer(p) {
    if (p.dead) {
      // Apply gravity for death animation (fly up then fall)
      p.vy += GRAVITY * dtRatio;
      p.y += p.vy * dtRatio;
      p.deadTimer -= dtRatio;
      if (p.deadTimer <= 0) {
        if (p.lives > 0) {
          resetPlayer(p);
        } else {
          checkGameOver();
        }
      }
      return;
    }

    const ctrl = CONTROLS[p.index];
    const st = p.stats;

    // Horizontal movement (scaled by dtRatio)
    if (keys[ctrl.left]) {
      p.vx -= st.accel * dtRatio;
      p.facing = -1;
    }
    if (keys[ctrl.right]) {
      p.vx += st.accel * dtRatio;
      p.facing = 1;
    }
    p.vx = Math.max(-st.moveSpeed, Math.min(st.moveSpeed, p.vx));
    if (!keys[ctrl.left] && !keys[ctrl.right]) {
      // Framerate-independent friction
      p.vx *= Math.pow(FRICTION, dtRatio);
      if (Math.abs(p.vx) < 0.1) p.vx = 0;
    }

    // Jump (with double jump) — edge-triggered via jumpHeld
    const jumpDown = keys[ctrl.jump] || (ctrl.jumpAlt && keys[ctrl.jumpAlt]);
    if (jumpDown && !p.jumpHeld) {
      if (p.onGround) {
        // First jump
        p.vy = -st.jumpForce;
        p.onGround = false;
        p.jumps = 1;
        p.jumpHeld = true;
        p.floatTimer = st.floatTime;
        Sound.sfx.jump();
      } else if (p.jumps < 2) {
        // Double jump (slightly weaker)
        p.vy = -st.jumpForce * 0.85;
        p.jumps = 2;
        p.jumpHeld = true;
        p.floatTimer = st.floatTime;
        spawnParticles(p.x + p.w / 2, p.y + p.h, '#ffffff', 6);
        Sound.sfx.djump();
      }
    }
    if (!jumpDown) {
      p.jumpHeld = false;
      // Cut float when jump is released
      p.floatTimer = 0;
    }

    // Gravity — reduced while floatTimer is active (holding jump for floaty chars)
    const grav = (p.floatTimer > 0 ? GRAVITY * 0.4 : GRAVITY) * dtRatio;
    p.vy += grav;
    if (p.floatTimer > 0) p.floatTimer -= dtRatio;
    if (p.vy > 15) p.vy = 15;

    // Move X and check collisions
    p.x += p.vx * dtRatio;
    platforms.forEach((plat) => {
      if (rectCollide(p, plat)) {
        if (p.vx > 0) p.x = plat.x - p.w;
        else if (p.vx < 0) p.x = plat.x + plat.w;
        p.vx = 0;
      }
    });

    // Move Y and check collisions
    const wasFalling = p.vy > 4;
    const fallSpeed = p.vy;
    p.y += p.vy * dtRatio;
    p.onGround = false;
    platforms.forEach((plat) => {
      if (rectCollide(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.jumps = 0;
          if (wasFalling) {
            Sound.sfx.land();
            // Dust on landing
            spawnDust(p.x + p.w / 2, p.y + p.h, fallSpeed > 8 ? 8 : 4);
            // Squash-stretch: bigger fall = stronger squash
            p.squashTimer = Math.min(12, fallSpeed * 0.8);
          }
        } else if (p.vy < 0) {
          p.y = plat.y + plat.h;
          p.vy = 0;
          // Hit a block from below — check for question block
          if (plat.kind === 'question' && !plat.used) {
            plat.used = true;
            plat.bump = 10; // visual bump animation frames
            spawnPowerupFromBlock(plat);
            Sound.sfx.bump();
            triggerShake(2);
          }
        }
      }
    });

    // Walk animation + footstep sound (scaled by dtRatio)
    if (Math.abs(p.vx) > 0.5 && p.onGround) {
      const prevFrame = Math.floor(p.walkFrame);
      p.walkFrame += 0.25 * dtRatio;
      // Play footstep when crossing an integer frame boundary
      if (Math.floor(p.walkFrame) !== prevFrame) {
        Sound.sfx.walk();
        // Small dust on running footsteps
        if (Math.random() < 0.3) spawnDust(p.x + p.w / 2, p.y + p.h, 1, -p.facing);
      }
    }

    // Don't fall off left edge
    if (p.x < 0) p.x = 0;

    // Fall in pit = lose life
    if (p.y > H + 50) {
      loseLife(p);
    }

    // DK lava/fire pit = lose life (instant, no pit fall)
    if (!p.dead && lavaZones.length) {
      for (let i = 0; i < lavaZones.length; i++) {
        const lz = lavaZones[i];
        if (p.x + p.w > lz.x && p.x < lz.x + lz.w &&
            p.y + p.h > lz.y && p.y < lz.y + lz.h) {
          loseLife(p);
          break;
        }
      }
    }

    // Timers (scaled by dtRatio)
    if (p.invincible > 0) p.invincible -= dtRatio;
    if (p.starTimer > 0) p.starTimer -= dtRatio;
    if (p.growTimer > 0) p.growTimer -= dtRatio;
    if (p.fireballCooldown > 0) p.fireballCooldown -= dtRatio;
    if (p.squashTimer > 0) p.squashTimer -= dtRatio;
  }

  // ===== Update All Players =====
  function updateAllPlayers() {
    players.forEach((p) => {
      if (!p.active) return;
      updatePlayer(p);
    });

    // Camera follows the leading (rightmost) alive player
    const alive = players.filter((p) => p.active && !p.dead);
    if (alive.length > 0) {
      const lead = alive.reduce((a, b) => (a.x > b.x ? a : b));
      const targetCam = lead.x - W * 0.35;
      state.cameraX += (targetCam - state.cameraX) * (1 - Math.pow(1 - 0.1, dtRatio));
      state.cameraX = Math.max(0, Math.min(state.cameraX, state.levelEnd - W));
    }
  }

  // ===== Update Coins =====
  function updateCoins() {
    coins.forEach((c) => {
      if (c.collected) return;
      c.anim += 0.1 * dtRatio;
      players.forEach((p) => {
        if (p.active && !p.dead && rectCollide(p, c)) {
          c.collected = true;
          state.coins++;
          state.score += 100;
          storeCoins++; // deposit into the persistent wallet
          saveStoreCoins();
          spawnParticles(c.x + c.w / 2, c.y, '#fcd000', 8);
          updateHUD();
          Sound.sfx.coin();
        }
      });
    });
  }

  // ===== Power-up Spawning from Question Blocks =====
  function spawnPowerupFromBlock(block) {
    const type = block.powerup || 'mushroom';
    const pu = {
      x: block.x + (block.w - 18) / 2,
      y: block.y - 18,
      w: 18, h: 18,
      type,
      collected: false,
      anim: 0,
      emerging: true,
      emergingTimer: 30,
      vx: 0,
      vy: -1,
      onGround: false,
      dir: Math.random() > 0.5 ? 1 : -1,
    };
    powerups.push(pu);
  }

  // ===== Update Power-ups =====
  function updatePowerups() {
    powerups.forEach((p) => {
      if (p.collected) return;
      p.anim += 0.08 * dtRatio;

      if (p.emerging) {
        // Slide upward out of the block
        p.y += p.vy * dtRatio;
        p.emergingTimer -= dtRatio;
        if (p.emergingTimer <= 0) {
          p.emerging = false;
          p.vy = 0;
          p.y = Math.floor(p.y); // align once fully out
        }
        // Player can collect once it's partly emerged
        players.forEach((pl) => {
          if (pl.active && !pl.dead && rectCollide(pl, p)) collectPowerup(p, pl);
        });
        return;
      }

      // Static pickups stay where placed (no gravity)
      if (p.static) {
        players.forEach((pl) => {
          if (pl.active && !pl.dead && rectCollide(pl, p)) collectPowerup(p, pl);
        });
        return;
      }

      // Physics once fully emerged
      // Mushroom walks back and forth; fire flower and star stay on spot
      if (p.type === 'mushroom') {
        p.x += p.dir * 1.2 * dtRatio;
      }

      // Gravity
      p.vy += GRAVITY * dtRatio;
      if (p.vy > 10) p.vy = 10;
      p.y += p.vy * dtRatio;
      p.onGround = false;

      // Platform collision (only land on top)
      platforms.forEach((plat) => {
        if (rectCollide(p, plat)) {
          if (p.vy > 0 && p.y + p.h - plat.y < 12) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.onGround = true;
          } else if (p.vy < 0) {
            p.y = plat.y + plat.h;
            p.vy = 0;
          }
        }
      });

      // Star bounces
      if (p.type === 'star' && p.onGround) {
        p.vy = -6;
      }

      // Keep within level bounds
      if (p.x < 0) { p.x = 0; p.dir = 1; }
      if (p.x + p.w > state.levelEnd) { p.x = state.levelEnd - p.w; p.dir = -1; }

      players.forEach((pl) => {
        if (pl.active && !pl.dead && rectCollide(pl, p)) collectPowerup(p, pl);
      });
    });
  }

  function collectPowerup(p, pl) {
    pl = pl || players[0];
    p.collected = true;
    state.score += 1000;
    if (p.type === 'mushroom') {
      if (pl.powerUp === 'small') {
        pl.powerUp = 'super';
        pl.growTimer = 30;
        applyPlayerSize(pl);
      }
      spawnParticles(p.x + p.w / 2, p.y, '#ff4444', 10);
    } else if (p.type === 'fireflower') {
      pl.powerUp = 'fire';
      pl.growTimer = 30;
      applyPlayerSize(pl);
      spawnParticles(p.x + p.w / 2, p.y, '#ff8800', 12);
    } else if (p.type === 'iceflower') {
      pl.powerUp = 'ice';
      pl.growTimer = 30;
      applyPlayerSize(pl);
      spawnParticles(p.x + p.w / 2, p.y, '#88ddff', 12);
    } else if (p.type === 'star') {
      pl.starTimer = 360; // ~6 seconds at 60fps
      spawnParticles(p.x + p.w / 2, p.y, '#ffff00', 15);
    }
    // Sound based on power-up type
    if (p.type === 'star') Sound.sfx.star();
    else Sound.sfx.powerup();
    updateHUD();
  }

  // ===== Fireballs / Iceballs =====
  function shootFireball(pl) {
    pl = pl || players[0];
    if (pl.dead || !pl.active) return;
    if (pl.powerUp !== 'fire' && pl.powerUp !== 'ice') return;
    if (pl.fireballCooldown > 0) return;
    const isIce = pl.powerUp === 'ice';
    fireballs.push({
      x: pl.x + (pl.facing > 0 ? pl.w : -10),
      y: pl.y + pl.h / 2 - 4,
      w: 10, h: 10,
      vx: pl.facing * 7,
      vy: 0,
      bounces: 3,
      alive: true,
      isIce,
    });
    pl.fireballCooldown = 20;
    Sound.sfx.shoot();
  }

  function updateFireballs() {
    for (let i = fireballs.length - 1; i >= 0; i--) {
      const f = fireballs[i];
      if (!f.alive) { fireballs.splice(i, 1); continue; }
      f.x += f.vx * dtRatio;
      f.vy += 0.4 * dtRatio;
      f.y += f.vy * dtRatio;
      // Bounce off ground/platforms
      platforms.forEach((p) => {
        if (rectCollide(f, p)) {
          if (f.vy > 0) {
            f.y = p.y - f.h;
            f.vy = -6;
            f.bounces--;
            Sound.sfx.firebounce();
          }
        }
      });
      if (f.bounces <= 0) { fireballs.splice(i, 1); continue; }
      // Hit enemy
      let hitEnemy = false;
      enemies.forEach((e) => {
        if (e.alive && rectCollide(f, e)) {
          if (f.isIce) {
            // Ice ball freezes the enemy instead of killing it
            e.freezeTimer = 180; // ~3 seconds at 60fps
            state.score += 100;
            spawnParticles(e.x + e.w / 2, e.y, '#88ddff', 10);
            updateHUD();
            hitEnemy = true;
            Sound.sfx.firehit();
          } else {
            e.alive = false;
            e.squishTimer = 30;
            state.score += 200;
            spawnParticles(e.x + e.w / 2, e.y, '#ff8800', 8);
            updateHUD();
            hitEnemy = true;
            Sound.sfx.firehit();
          }
        }
      });
      if (hitEnemy) { fireballs.splice(i, 1); continue; }
      // Off screen
      if (f.x < state.cameraX - 50 || f.x > state.cameraX + W + 50 || f.y > H + 50) {
        fireballs.splice(i, 1);
      }
    }
  }

  // ===== Update Enemies =====
  // DK elevators — moving girders. They travel along their axis and
  // carry whatever is standing on them.
  function updateElevators() {
    platforms.forEach((p) => {
      if (!p.elevator) return;
      const prevX = p.x;
      const prevY = p.y;

      // Travel
      if (p.dirX !== 0) {
        p.x += p.dirX * p.moveSpeed * dtRatio;
        if (p.x <= p.minX) { p.x = p.minX; p.dirX = 1; }
        if (p.x >= p.maxX) { p.x = p.maxX; p.dirX = -1; }
      }
      if (p.dirY !== 0) {
        p.y += p.dirY * p.moveSpeed * dtRatio;
        if (p.y <= p.minY) { p.y = p.minY; p.dirY = 1; }
        if (p.y >= p.maxY) { p.y = p.maxY; p.dirY = -1; }
      }

      // Carry riders (players and barrels) that are resting on this elevator.
      const dx = p.x - prevX;
      const dy = p.y - prevY;
      if (dx !== 0 || dy !== 0) {
        players.forEach((pl) => {
          if (!pl.active || pl.dead) return;
          const standingOn = Math.abs(pl.y + pl.h - prevY) < 6 &&
            pl.x + pl.w > p.x + dx - 4 && pl.x < p.x + dx + p.w + 4;
          if (standingOn) {
            pl.x += dx;
            pl.y += dy;
          }
        });
        enemies.forEach((e) => {
          if (!e.alive || e.type !== 'barrel') return;
          const standingOn = Math.abs(e.y + e.h - prevY) < 6 &&
            e.x + e.w > p.x + dx - 4 && e.x < p.x + dx + p.w + 4;
          if (standingOn) {
            e.x += dx;
            e.y += dy;
          }
        });
      }
    });
  }

  function updateEnemies() {
    enemies.forEach((e) => {
      if (!e.alive) {
        if (e.squishTimer > 0) e.squishTimer -= dtRatio;
        return;
      }
      // Frozen enemies don't move
      if (e.freezeTimer > 0) {
        e.freezeTimer -= dtRatio;
        // Still check collision — frozen enemies are solid and hurt on touch
        players.forEach((p) => {
          if (!p.active || p.dead) return;
          if (rectCollide(p, e) && p.invincible <= 0 && p.starTimer <= 0) {
            if (p.vy > 0 && p.y + p.h - e.y < 16) {
              // Stomp shatters frozen enemy
              e.alive = false;
              e.squishTimer = 30;
              p.vy = -JUMP_FORCE * 0.6;
              state.score += 300;
              spawnParticles(e.x + e.w / 2, e.y, '#88ddff', 10);
              updateHUD();
              Sound.sfx.stomp();
            } else {
              playerHit(p);
            }
          } else if (rectCollide(p, e) && p.starTimer > 0) {
            e.alive = false;
            e.squishTimer = 30;
            state.score += 200;
            spawnParticles(e.x + e.w / 2, e.y, '#ffff00', 8);
            updateHUD();
            Sound.sfx.stomp();
          }
        });
        return;
      }

      // Type-specific movement
      if (e.type === 'barrel') {
        // DK barrel: rolls along the current girder, falls down slopes,
        // and keeps rolling. Gravity pulls it down; it lands on platforms.
        e.vy += GRAVITY * dtRatio;
        if (e.vy > 12) e.vy = 12;

        // Horizontal rolling — always forward, bouncing off its range limits.
        const prevVx = e.vx;
        e.x += e.vx * dtRatio;
        if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.vx); }

        // Vertical — fall and land on platforms (girders).
        e.y += e.vy * dtRatio;
        e.onGround = false;
        platforms.forEach((plat) => {
          if (!rectCollide(e, plat)) return;
          if (e.vy > 0) {
            e.y = plat.y - e.h;
            e.vy = 0;
            e.onGround = true;
            // Barrels that land on a moving elevator roll with it.
          } else if (e.vy < 0) {
            e.y = plat.y + plat.h;
            e.vy = 0;
          }
        });

        // Barrels must not roll off the end of their girder. Check that there
        // is still floor under the leading edge; if not, turn around.
        if (e.onGround && prevVx !== 0) {
          const leadX = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
          const footY = e.y + e.h + 2;
          let hasFloor = false;
          platforms.forEach((plat) => {
            if (leadX >= plat.x && leadX <= plat.x + plat.w &&
                footY >= plat.y - 4 && footY <= plat.y + plat.h + 4) {
              hasFloor = true;
            }
          });
          // The ground plane counts as floor too.
          if (!hasFloor && footY < GROUND_Y - 4) {
            e.vx = -e.vx;
            e.x += e.vx * dtRatio;
          }
        }

        e.rollFrame += Math.abs(e.vx) * 0.25 * dtRatio;
        // Barrels that fall out of the world are gone.
        if (e.y > H + 60) {
          e.alive = false;
          e.squishTimer = 0;
        }
      } else if (e.type === 'flyer') {
        // Fly horizontally and bob vertically
        e.x += e.vx * dtRatio;
        if (e.x <= e.minX) { e.x = e.minX; e.vx *= -1; }
        if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.vx *= -1; }
        e.bobPhase += e.bobSpeed * dtRatio;
        e.y = e.baseY + Math.sin(e.bobPhase) * e.bobAmp;
        e.walkFrame += 0.3 * dtRatio;
      } else if (e.type === 'charger') {
        // Check if any player is nearby and roughly same height
        let nearby = false;
        let nearestDir = 1;
        players.forEach((p) => {
          if (!p.active || p.dead) return;
          const dx = p.x - e.x;
          if (Math.abs(dx) < 150 && Math.abs(p.y - e.y) < 60) {
            nearby = true;
            nearestDir = dx > 0 ? 1 : -1;
          }
        });
        if (nearby) {
          e.charging = true;
          e.vx = nearestDir * e.chargeSpeed;
        } else {
          e.charging = false;
          e.vx = e.normalSpeed * (e.vx > 0 ? 1 : -1);
        }
        e.x += e.vx * dtRatio;
        // Chargers don't respect minX/maxX as tightly — they charge!
        if (e.x <= e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.vx = -Math.abs(e.vx); }
        e.walkFrame += (e.charging ? 0.5 : 0.2) * dtRatio;
      } else {
        // Standard walker
        e.x += e.vx * dtRatio;
        if (e.x <= e.minX) { e.x = e.minX; e.vx *= -1; }
        if (e.x + e.w >= e.maxX) { e.x = e.maxX - e.w; e.vx *= -1; }
        e.walkFrame += 0.2 * dtRatio;
      }

      // Collision with any player
      players.forEach((p) => {
        if (!p.active || p.dead) return;
        if (rectCollide(p, e) && p.invincible <= 0 && p.starTimer <= 0) {
          // Check if player is stomping (falling and above enemy)
          if (p.vy > 0 && p.y + p.h - e.y < 16) {
            // Stomp!
            e.alive = false;
            e.squishTimer = 30;
            p.vy = -JUMP_FORCE * 0.6;
            state.score += 200;
            spawnParticles(e.x + e.w / 2, e.y, '#8b4513', 6);
            triggerShake(3);
            updateHUD();
            Sound.sfx.stomp();
          } else {
            // Player hit — power down or lose life
            playerHit(p);
          }
        } else if (rectCollide(p, e) && p.starTimer > 0) {
          // Star power — destroy enemy on contact
          e.alive = false;
          e.squishTimer = 30;
          state.score += 200;
          spawnParticles(e.x + e.w / 2, e.y, '#ffff00', 8);
          updateHUD();
          Sound.sfx.stomp();
        }
      });
    });
  }

  // ===== Check Flag =====
  function checkFlag() {
    if (!flag) return;
    for (const p of players) {
      if (p.active && !p.dead && rectCollide(p, flag)) {
        winGame();
        return;
      }
    }
  }

  // ===== Check Checkpoints =====
  function checkCheckpoints() {
    checkpoints.forEach((cp) => {
      if (cp.activated) return;
      // Wide hitbox: extends 20px on each side and tall enough to catch jumping players
      const hitbox = {
        x: cp.x - 20,
        y: cp.y - 40,
        w: cp.w + 40,
        h: cp.h + 40,
      };
      players.forEach((p) => {
        if (p.active && !p.dead && rectCollide(p, hitbox)) {
          cp.activated = true;
          currentCheckpoint = cp.x;
          state.score += 500;
          spawnParticles(cp.x + cp.w / 2, cp.y, '#2d9e2d', 12);
          updateHUD();
          Sound.sfx.checkpoint();
        }
      });
    });
  }

  // ===== Player Hit (power-down system) =====
  function playerHit(p) {
    p = p || players[0];
    if (p.powerUp === 'fire' || p.powerUp === 'ice' || p.powerUp === 'super') {
      // Power down to small
      p.powerUp = 'small';
      p.growTimer = 30;
      applyPlayerSize(p);
      p.invincible = 90;
      spawnParticles(p.x + p.w / 2, p.y, '#ffffff', 10);
      Sound.sfx.powerdown();
    } else {
      // Already small — lose a life
      loseLife(p);
    }
  }

  // ===== Lose Life =====
  function loseLife(p) {
    p = p || players[0];
    p.lives--;
    // Mark as dead — will respawn after a short delay
    p.dead = true;
    p.deadTimer = 60;
    p.vx = 0;
    p.vy = -8; // small death hop
    spawnParticles(p.x + p.w / 2, p.y, '#ff4444', 12);
    triggerShake(6);
    updateHUD();
    Sound.sfx.die();
  }

  // ===== Check Game Over =====
  // Returns true if all players are out of lives.
  function checkGameOver() {
    const allDead = players.filter((p) => p.active).every((p) => p.lives <= 0 && p.dead);
    if (allDead) {
      endGame(false);
      return true;
    }
    return false;
  }

  // ===== Win (Level Complete or Final Victory) =====
  function winGame() {
    state.running = false;
    const timeBonus = state.time * 10;
    state.score += timeBonus;
    updateHUD();
    Sound.sfx.win();
    stopMusic();

    // Mark this level as cleared and unlock the next
    clearedLevels.add(state.currentLevel);
    if (state.currentLevel + 1 > maxUnlockedLevel && state.currentLevel < state.maxLevels) {
      maxUnlockedLevel = state.currentLevel + 1;
    }
    // Update high score and persist progress
    if (state.score > highScore) highScore = state.score;
    saveProgress();

    if (state.currentLevel < state.maxLevels) {
      // Show level transition screen
      levelTitle.textContent = `LEVEL ${currentLevelLabel()} COMPLETE!`;
      levelTitle.style.color = '#fcd000';
      const nextLv = state.currentLevel + 1;
      const nextLabel = nextLv <= LEVEL_LAYOUTS.length
        ? `${selectedMap + 1}-${nextLv}`
        : `L${nextLv}`;
      const progress = `${state.currentLevel}/${state.maxLevels}`;
      levelText.innerHTML = `Coins: ${state.coins}<br>Score: ${state.score}<br>Time Bonus: +${timeBonus}<br>Progress: ${progress}<br><br>Next: Level ${nextLabel}`;
      nextLevelBtn.textContent = 'NEXT LEVEL →';
      levelScreen.classList.remove('hidden');
    } else {
      // All levels cleared — final victory!
      levelTitle.textContent = '🏆 YOU BEAT THE GAME!';
      levelTitle.style.color = '#fcd000';
      levelText.innerHTML = `All ${state.maxLevels} levels cleared!<br>Coins: ${state.coins}<br>Score: ${state.score}<br>Time Bonus: +${timeBonus}`;
      nextLevelBtn.textContent = 'PLAY AGAIN ↻';
      levelScreen.classList.remove('hidden');
    }
  }

  // ===== Lose =====
  function endGame(won) {
    state.running = false;
    if (!won) {
      levelScreen.classList.add('hidden');
      gameOverTitle.textContent = 'GAME OVER';
      gameOverTitle.style.color = '#e52521';
      gameOverText.innerHTML = `Coins: ${state.coins}<br>Score: ${state.score}<br>High Score: ${highScore}<br>Reached: Level ${currentLevelLabel()}`;
      gameOverScreen.classList.remove('hidden');
      // Update high score and persist
      if (state.score > highScore) { highScore = state.score; }
      saveProgress();
      Sound.sfx.gameover();
      stopMusic();
    }
  }

  // ===== HUD =====
  const checkpointEl = document.getElementById('checkpoint');

  // Level label: "L1", "L2", ... "L100"
  // For hand-crafted levels 1-4 it also shows the world: "1-1", "1-2", etc.
  function currentLevelLabel() {
    if (state.currentLevel <= LEVEL_LAYOUTS.length) {
      return `${selectedMap + 1}-${state.currentLevel}`;
    }
    return `L${state.currentLevel}`;
  }

  function powerLabel(p) {
    if (p.starTimer > 0) return { text: 'STAR!', color: '#ffff00' };
    if (p.powerUp === 'fire') return { text: 'Fire', color: '#ff8800' };
    if (p.powerUp === 'ice') return { text: 'Ice', color: '#88ddff' };
    if (p.powerUp === 'super') return { text: 'Super', color: '#2d9e2d' };
    return { text: 'Small', color: '#ddd' };
  }

  function updateHUD() {
    coinsEl.textContent = state.coins;
    scoreEl.textContent = state.score;
    timeEl.textContent = state.time;
    levelNumEl.textContent = currentLevelLabel();

    // P1 HUD
    const p1 = players[0];
    p1LivesEl.textContent = p1.dead && p1.lives <= 0 ? '0' : p1.lives;
    const p1Pow = powerLabel(p1);
    p1PowerEl.textContent = p1Pow.text;
    p1PowerEl.style.color = p1Pow.color;

    // P2 HUD
    if (state.playerCount === 2) {
      hudP2.classList.remove('hud__player--hidden');
      const p2 = players[1];
      p2LivesEl.textContent = p2.dead && p2.lives <= 0 ? '0' : p2.lives;
      const p2Pow = powerLabel(p2);
      p2PowerEl.textContent = p2Pow.text;
      p2PowerEl.style.color = p2Pow.color;
    } else {
      hudP2.classList.add('hud__player--hidden');
    }

    // Checkpoint indicator
    const activated = checkpoints.filter((cp) => cp.activated).length;
    checkpointEl.textContent = `${activated}/${checkpoints.length}`;
    checkpointEl.style.color = activated > 0 ? '#2d9e2d' : '#ddd';

    // Store inventory indicator (items available to use with 1/2/3 keys)
    if (storeHud) {
      const slotMap = ['mushroom', 'fireflower', 'iceflower'];
      const parts = [];
      slotMap.forEach((id, i) => {
        const qty = storeInventory[id] || 0;
        if (qty > 0) {
          const item = STORE_ITEMS.find((it) => it.id === id);
          parts.push(`${item.icon}${qty}[${i + 1}]`);
        }
      });
      storeHud.textContent = parts.join(' ');
      storeHud.style.color = '#88ddff';
    }
  }

  // ===== Draw functions =====
  // Day/night sky colors: interpolate between dawn/day/dusk/night
  function getSkyColors(t) {
    // t: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight, 1.0=dawn
    // Define keyframe colors [topColor, bottomColor]
    const keyframes = [
      { t: 0.0,  top: [255,180,120], bot: [255,220,180] }, // dawn — warm orange
      { t: 0.25, top: [100,160,255], bot: [180,220,255] }, // noon — bright blue
      { t: 0.5,  top: [255,100,80],  bot: [255,160,100] }, // dusk — red/orange
      { t: 0.75, top: [10,10,40],    bot: [30,30,70] },    // midnight — deep blue
      { t: 1.0,  top: [255,180,120], bot: [255,220,180] }, // back to dawn
    ];
    // Find surrounding keyframes
    let k0 = keyframes[0], k1 = keyframes[1];
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (t >= keyframes[i].t && t <= keyframes[i + 1].t) {
        k0 = keyframes[i];
        k1 = keyframes[i + 1];
        break;
      }
    }
    const localT = (t - k0.t) / (k1.t - k0.t);
    const lerp = (a, b, f) => Math.round(a + (b - a) * f);
    const top = [lerp(k0.top[0], k1.top[0], localT), lerp(k0.top[1], k1.top[1], localT), lerp(k0.top[2], k1.top[2], localT)];
    const bot = [lerp(k0.bot[0], k1.bot[0], localT), lerp(k0.bot[1], k1.bot[1], localT), lerp(k0.bot[2], k1.bot[2], localT)];
    return { top, bot };
  }

  // Parse a #rrggbb hex string into an [r,g,b] triple.
  function hexToRgb(hex) {
    if (typeof hex !== 'string') return null;
    const m = hex.replace('#', '');
    if (m.length === 3) {
      return [parseInt(m[0] + m[0], 16), parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16)];
    }
    if (m.length >= 6) {
      return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)];
    }
    return null;
  }

  function drawBackground() {
    // Day/night sky gradient. Donkey Kong stages use their own fixed
    // arcade sky instead — the real cabinet never changed the time of day.
    let sky = getSkyColors(state.timeOfDay);
    if (dkStage) {
      const top = hexToRgb(activeMap.skyTop);
      const bot = hexToRgb(activeMap.skyBottom);
      if (top && bot) sky = { top, bot };
    }
    const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    grad.addColorStop(0, `rgb(${sky.top[0]},${sky.top[1]},${sky.top[2]})`);
    grad.addColorStop(1, `rgb(${sky.bot[0]},${sky.bot[1]},${sky.bot[2]})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, GROUND_Y + 40);

    // Stars at night (timeOfDay between 0.6 and 0.9)
    if (!dkStage && state.timeOfDay > 0.6 && state.timeOfDay < 0.9) {
      const nightAlpha = Math.sin((state.timeOfDay - 0.6) / 0.3 * Math.PI);
      ctx.fillStyle = `rgba(255,255,255,${nightAlpha * 0.8})`;
      for (let i = 0; i < 30; i++) {
        const sx = (i * 73 + state.cameraX * 0.1) % W;
        const sy = (i * 41) % (GROUND_Y - 100);
        const twinkle = Math.sin(state.frameCount * 0.05 + i) * 0.5 + 0.5;
        ctx.globalAlpha = nightAlpha * twinkle;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Sun/moon position based on timeOfDay. DK stages use their own flat
    // arcade sky (the fortress stage has no sky at all), so skip it there.
    const celestialAngle = state.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const celestialX = W / 2 + Math.cos(celestialAngle) * W * 0.35;
    const celestialY = GROUND_Y * 0.7 + Math.sin(celestialAngle) * GROUND_Y * 0.5;
    const isNight = state.timeOfDay > 0.5 && state.timeOfDay < 0.95;
    if (!dkStage) {
      if (isNight) {
        // Moon
        ctx.fillStyle = '#e8e8e0';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgb(${sky.top[0]},${sky.top[1]},${sky.top[2]})`;
        ctx.beginPath();
        ctx.arc(celestialX + 8, celestialY - 4, 18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sun
        ctx.fillStyle = 'rgba(255,240,100,0.9)';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,240,100,0.3)';
        ctx.beginPath();
        ctx.arc(celestialX, celestialY, 36, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Parallax background layers (mountains + hills)
    drawParallax();

    // Foreground bushes (original detail, kept for familiarity)
    ctx.fillStyle = activeMap.bushColor;
    for (let i = 0; i < 20; i++) {
      const bx = i * 200 - state.cameraX * 0.5;
      if (bx > -100 && bx < W + 100) {
        ctx.beginPath();
        ctx.arc(bx, GROUND_Y, 20, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx + 15, GROUND_Y, 15, Math.PI, 0);
        ctx.fill();
      }
    }
  }

  // ===== Donkey Kong stage scenery =====

  // Lava / fire pit — the DK 1-4 finale hazard.
  function drawLava() {
    if (!lavaZones.length) return;
    lavaZones.forEach((lz) => {
      const lx = lz.x - state.cameraX;
      if (lx + lz.w < 0 || lx > W) return;
      const t = state.frameCount * 0.06;
      // Base lava body
      const grad = ctx.createLinearGradient(0, lz.y, 0, lz.y + lz.h);
      grad.addColorStop(0, '#ffd24a');
      grad.addColorStop(0.45, '#ff6a1a');
      grad.addColorStop(1, '#b81d00');
      ctx.fillStyle = grad;
      ctx.fillRect(lx, lz.y, lz.w, lz.h);
      // Wavy top surface
      ctx.fillStyle = '#ffe680';
      ctx.beginPath();
      ctx.moveTo(lx, lz.y + 5);
      for (let i = 0; i <= lz.w; i += 12) {
        const wy = lz.y + Math.sin((i + t * 30) * 0.06) * 4;
        ctx.lineTo(lx + i, wy);
      }
      ctx.lineTo(lx + lz.w, lz.y + 9);
      ctx.lineTo(lx, lz.y + 9);
      ctx.closePath();
      ctx.fill();
      // Rising bubbles
      ctx.fillStyle = 'rgba(255,220,120,0.7)';
      for (let i = 0; i < lz.w / 60; i++) {
        const bx = lx + ((i * 67 + state.frameCount * 0.7) % lz.w);
        const by = lz.y + lz.h - ((state.frameCount * 1.4 + i * 40) % (lz.h + 20));
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  // Donkey Kong himself — the boss sprite at the top of the stage.
  function drawDK() {
    if (!dkBoss) return;
    const dx = dkBoss.x - state.cameraX;
    if (dx + 80 < 0 || dx > W) return;
    const y = dkBoss.y;
    const flip = dkBoss.facing === -1;

    ctx.save();
    if (flip) {
      ctx.translate(dx + 44, 0);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(dx, 0);
    }

    const brown = '#8b4513';
    const darkBrown = '#5c2e0c';
    const tan = '#c68642';

    // Torso
    ctx.fillStyle = brown;
    ctx.fillRect(18, 18, 32, 34);
    // Belly / chest lighter patch
    ctx.fillStyle = tan;
    ctx.fillRect(26, 30, 18, 20);
    // Head
    ctx.fillStyle = brown;
    ctx.fillRect(24, 2, 28, 20);
    // Face
    ctx.fillStyle = tan;
    ctx.fillRect(30, 6, 16, 12);
    // Muzzle
    ctx.fillStyle = '#d9a066';
    ctx.fillRect(40, 10, 12, 8);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.fillRect(30, 4, 6, 6);
    ctx.fillRect(42, 4, 6, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(32, 5, 3, 4);
    ctx.fillRect(44, 5, 3, 4);
    // Nostrils
    ctx.fillStyle = '#000';
    ctx.fillRect(44, 11, 2, 2);
    // Ears
    ctx.fillStyle = darkBrown;
    ctx.fillRect(22, 0, 7, 6);
    ctx.fillRect(48, 0, 7, 6);
    // Arms — DK holds a barrel
    ctx.fillStyle = brown;
    ctx.fillRect(8, 22, 12, 9);
    ctx.fillRect(50, 22, 12, 9);
    // Legs
    ctx.fillRect(18, 50, 12, 12);
    ctx.fillRect(40, 50, 12, 12);
    // Feet
    ctx.fillStyle = darkBrown;
    ctx.fillRect(14, 58, 17, 8);
    ctx.fillRect(39, 58, 17, 8);
    // Chest hair tuft
    ctx.fillStyle = darkBrown;
    ctx.fillRect(30, 20, 10, 4);

    // The barrel DK is holding
    if (dkBoss.holdingBarrel !== false) {
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(52, 14, 16, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(52, 18, 16, 2);
      ctx.fillRect(52, 25, 16, 2);
    }

    ctx.restore();
  }

  // Pauline — the one to be rescued, waiting on the upper girder.
  function drawPauline() {
    if (!pauline) return;
    const px = pauline.x - state.cameraX;
    if (px + 40 < 0 || px > W) return;
    const y = pauline.y;
    const pink = '#ff6ec7';
    // Dress
    ctx.fillStyle = pink;
    ctx.beginPath();
    ctx.moveTo(px + 12, y + 18);
    ctx.lineTo(px + 28, y + 18);
    ctx.lineTo(px + 32, y + 44);
    ctx.lineTo(px + 8, y + 44);
    ctx.closePath();
    ctx.fill();
    // Top
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 13, y + 12, 14, 8);
    // Arms
    ctx.fillStyle = '#f0c8a0';
    ctx.fillRect(px + 8, y + 18, 5, 12);
    ctx.fillRect(px + 27, y + 18, 5, 12);
    // Head
    ctx.fillStyle = '#f0c8a0';
    ctx.fillRect(px + 14, y, 12, 13);
    // Hair
    ctx.fillStyle = '#7a3b1e';
    ctx.fillRect(px + 12, y - 2, 16, 7);
    ctx.fillRect(px + 10, y, 4, 12);
    ctx.fillRect(px + 26, y, 4, 12);
    // Legs
    ctx.fillStyle = '#f0c8a0';
    ctx.fillRect(px + 13, y + 42, 5, 7);
    ctx.fillRect(px + 22, y + 42, 5, 7);
  }

  // DK 1-3 style clouds — soft white puffs drifting in the sky.
  function drawDKClouds() {
    if (!dkStage) return;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (let i = 0; i < 8; i++) {
      const seed = i * 137;
      const cx = ((seed * 3 + state.cameraX * 0.35) % (state.levelEnd + 400)) - 200;
      const cy = 40 + ((seed * 7) % 120);
      const r = 16 + ((seed * 3) % 14);
      if (cx < -80 || cx > W + 80) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.8, cy + 3, r * 0.78, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.75, cy + 4, r * 0.62, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlatforms() {
    platforms.forEach((p) => {
      const px = p.x - state.cameraX;
      if (px + p.w < 0 || px > W) return;
      const kind = p.kind || 'ground';

      if (kind === 'ground') {
        // Ground — base color with grass/cap top
        ctx.fillStyle = activeMap.groundColor;
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = activeMap.grassColor;
        ctx.fillRect(px, p.y, p.w, 8);
        // Texture dots
        ctx.fillStyle = activeMap.groundColor;
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < p.w; i += 20) {
          ctx.fillRect(px + i + 5, p.y + 15, 4, 4);
          ctx.fillRect(px + i + 12, p.y + 25, 4, 4);
        }
        ctx.globalAlpha = 1;
      } else if (kind === 'pipe') {
        // Green pipe — body with rim on top
        ctx.fillStyle = activeMap.pipeColor || '#2d9e2d';
        ctx.fillRect(px + 4, p.y + 12, p.w - 8, p.h - 12);
        // Pipe rim (wider top)
        ctx.fillRect(px, p.y, p.w, 12);
        // Highlight stripe
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(px + 4, p.y + 12, 4, p.h - 12);
        ctx.fillRect(px + 2, p.y + 2, 4, 8);
        // Dark outline
        ctx.fillStyle = activeMap.pipeRim || '#1a7a1a';
        ctx.fillRect(px, p.y, 2, 12);
        ctx.fillRect(px + p.w - 2, p.y, 2, p.h);
        ctx.fillRect(px + 4, p.y + p.h - 2, p.w - 8, 2);
      } else if (kind === 'question') {
        // Bump animation offset
        const bumpY = p.bump > 0 ? -Math.sin((p.bump / 10) * Math.PI) * 6 : 0;
        const by = p.y + bumpY;
        if (p.used) {
          // Used empty block — brown, hollow-looking
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(px, by, p.w, p.h);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(px, by, p.w, 2);
          ctx.fillRect(px, by + p.h - 2, p.w, 2);
          ctx.fillRect(px, by, 2, p.h);
          ctx.fillRect(px + p.w - 2, by, 2, p.h);
          // Dark inner panel
          ctx.fillStyle = 'rgba(0,0,0,0.2)';
          ctx.fillRect(px + 4, by + 4, p.w - 8, p.h - 8);
        } else {
          // Question block — orange with "?" and rivets
          ctx.fillStyle = activeMap.platColor || '#e09030';
          ctx.fillRect(px, by, p.w, p.h);
          // Darker border
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(px, by, p.w, 2);
          ctx.fillRect(px, by + p.h - 2, p.w, 2);
          ctx.fillRect(px, by, 2, p.h);
          ctx.fillRect(px + p.w - 2, by, 2, p.h);
          // Rivets in corners
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.fillRect(px + 3, by + 3, 2, 2);
          ctx.fillRect(px + p.w - 5, by + 3, 2, 2);
          ctx.fillRect(px + 3, by + p.h - 5, 2, 2);
          ctx.fillRect(px + p.w - 5, by + p.h - 5, 2, 2);
          // Question mark "?"
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', px + p.w / 2, by + p.h / 2 + 1);
        }
      } else if (kind === 'brick') {
        // Brick block — with mortar lines
        ctx.fillStyle = activeMap.platColor || '#e09030';
        ctx.fillRect(px, p.y, p.w, p.h);
        // Highlight top
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(px, p.y, p.w, 3);
        // Brick mortar lines
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= p.w; i += 16) {
          ctx.beginPath();
          ctx.moveTo(px + i, p.y);
          ctx.lineTo(px + i, p.y + p.h);
          ctx.stroke();
        }
        // Horizontal mortar line (offset rows)
        ctx.beginPath();
        ctx.moveTo(px, p.y + p.h / 2);
        ctx.lineTo(px + p.w, p.y + p.h / 2);
        ctx.stroke();
      } else if (kind === 'girder') {
        // Donkey Kong girder — thin slat with cross-braces and rivets.
        // Drawn as a solid walkable beam: bright body, dark under-rail,
        // plus X cross-bracing so it reads as steel, not brickwork.
        const gy = p.y;
        const gh = p.h;
        // Main beam
        ctx.fillStyle = activeMap.girderColor || activeMap.platColor || '#e0399a';
        ctx.fillRect(px, gy, p.w, gh);
        // Top light rail
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(px, gy, p.w, 2);
        // Bottom dark rail
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(px, gy + gh - 3, p.w, 3);
        // End caps
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(px, gy, 2, gh);
        ctx.fillRect(px + p.w - 2, gy, 2, gh);
        // Cross-bracing (diagonals between rails) every 32px
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 1;
        const braceTop = gy + 3;
        const braceBot = gy + gh - 3;
        for (let i = 0; i < p.w; i += 32) {
          const x0 = px + i;
          const x1 = Math.min(px + i + 32, px + p.w);
          ctx.beginPath();
          ctx.moveTo(x0, braceBot);
          ctx.lineTo(x1, braceTop);
          ctx.stroke();
        }
        // Rivets
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 4; i < p.w - 4; i += 16) {
          ctx.fillRect(px + i, gy + 3, 2, 2);
        }
      } else if (kind === 'ladder') {
        // Donkey Kong ladder — two vertical rails with rungs between.
        // Walkable only from the top (like SMB ladders) but drawn as thin
        // rails + rungs so it reads as a climbable ladder, not a solid column.
        ctx.fillStyle = activeMap.ladderColor || activeMap.stairColor || '#c02a80';
        const railW = 3;
        ctx.fillRect(px, p.y, railW, p.h);
        ctx.fillRect(px + p.w - railW, p.y, railW, p.h);
        // Rungs every 12px
        ctx.fillStyle = activeMap.ladderColor || activeMap.stairColor || '#c02a80';
        for (let y = p.y + 6; y < p.y + p.h - 2; y += 12) {
          ctx.fillRect(px, y, p.w, 3);
        }
        // Rail highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(px, p.y, 1, p.h);
        ctx.fillRect(px + p.w - railW, p.y, 1, p.h);
      } else if (kind === 'oil_drum') {
        // Oil drum — the classic DK hazard you must jump over.
        ctx.fillStyle = activeMap.oilColor || '#c0392b';
        ctx.fillRect(px + 2, p.y, p.w - 4, p.h);
        // Rim bands
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px + 2, p.y + 5, p.w - 4, 2);
        ctx.fillRect(px + 2, p.y + p.h - 9, p.w - 4, 2);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(px + 5, p.y + 2, 3, p.h - 6);
        // Lid
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(px, p.y, p.w, 3);
      } else if (kind === 'stair') {
        // Solid stair block — like SMB hard blocks
        ctx.fillStyle = activeMap.stairColor || '#c84c0c';
        ctx.fillRect(px, p.y, p.w, p.h);
        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px, p.y, p.w, 3);
        ctx.fillRect(px, p.y, 3, p.h);
        // Dark edges
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(px, p.y + p.h - 3, p.w, 3);
        ctx.fillRect(px + p.w - 3, p.y, 3, p.h);
      } else {
        // Generic floating platform fallback
        ctx.fillStyle = activeMap.platColor || '#e09030';
        ctx.fillRect(px, p.y, p.w, p.h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(px, p.y, p.w, 4);
      }
    });
  }

  function drawCoins() {
    coins.forEach((c) => {
      if (c.collected) return;
      const cx = c.x - state.cameraX;
      if (cx + c.w < 0 || cx > W) return;
      const wobble = Math.abs(Math.sin(c.anim)) * c.w;
      const offset = (c.w - wobble) / 2;
      ctx.fillStyle = '#fcd000';
      ctx.beginPath();
      ctx.arc(cx + c.w / 2, c.y + c.h / 2, wobble / 2, 0, Math.PI * 2);
      ctx.fill();
      // Shine
      ctx.fillStyle = '#fff5a0';
      ctx.fillRect(cx + c.w / 2 - 2, c.y + 4, 2, c.h - 8);
    });
  }

  function drawPowerups() {
    powerups.forEach((p) => {
      if (p.collected) return;
      const px = p.x - state.cameraX;
      if (px + p.w < 0 || px > W) return;
      const bob = Math.sin(p.anim) * 3;

      if (p.type === 'mushroom') {
        // Red mushroom with white spots
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(px + 1, p.y + bob, p.w, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + 3, p.y + bob + 1, 3, 3);
        ctx.fillRect(px + 11, p.y + bob + 1, 3, 3);
        // Stem
        ctx.fillStyle = '#ffe0c0';
        ctx.fillRect(px + 3, p.y + bob + 8, p.w - 6, p.h - 8);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(px + 5, p.y + bob + 11, 2, 3);
        ctx.fillRect(px + 11, p.y + bob + 11, 2, 3);
      } else if (p.type === 'fireflower') {
        // Fire flower — orange/red petals with yellow center
        const cx = px + p.w / 2;
        const cy = p.y + bob + 5;
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(px + 2, p.y + bob, p.w - 4, 4);
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(px, p.y + bob + 2, 4, 4);
        ctx.fillRect(px + p.w - 4, p.y + bob + 2, 4, 4);
        ctx.fillStyle = '#fcd000';
        ctx.fillRect(cx - 3, cy - 1, 6, 6);
        // Stem
        ctx.fillStyle = '#2d9e2d';
        ctx.fillRect(cx - 2, p.y + bob + 6, 4, p.h - 6);
        // Leaves
        ctx.fillStyle = '#2d7a2d';
        ctx.fillRect(px + 2, p.y + bob + 10, 4, 3);
        ctx.fillRect(px + p.w - 6, p.y + bob + 12, 4, 3);
      } else if (p.type === 'star') {
        // Star — flashing yellow star
        const flash = Math.floor(p.anim * 3) % 2 === 0;
        ctx.fillStyle = flash ? '#ffff00' : '#ffaa00';
        const cx = px + p.w / 2;
        const cy = p.y + bob + p.h / 2;
        // Simple star shape with rectangles
        ctx.fillRect(cx - 2, p.y + bob, 4, p.h);
        ctx.fillRect(px, cy - 2, p.w, 4);
        ctx.fillRect(px + 2, p.y + bob + 2, p.w - 4, p.h - 4);
        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(cx - 4, p.y + bob + 6, 2, 2);
        ctx.fillRect(cx + 2, p.y + bob + 6, 2, 2);
      } else if (p.type === 'iceflower') {
        // Ice flower — light blue petals with white center
        const cx = px + p.w / 2;
        const cy = p.y + bob + 5;
        ctx.fillStyle = '#4499cc';
        ctx.fillRect(px + 2, p.y + bob, p.w - 4, 4);
        ctx.fillStyle = '#88ddff';
        ctx.fillRect(px, p.y + bob + 2, 4, 4);
        ctx.fillRect(px + p.w - 4, p.y + bob + 2, 4, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, cy - 1, 6, 6);
        // Stem
        ctx.fillStyle = '#2d9e2d';
        ctx.fillRect(cx - 2, p.y + bob + 6, 4, p.h - 6);
        // Leaves
        ctx.fillStyle = '#2d7a2d';
        ctx.fillRect(px + 2, p.y + bob + 10, 4, 3);
        ctx.fillRect(px + p.w - 6, p.y + bob + 12, 4, 3);
      }
    });
  }

  function drawFireballs() {
    fireballs.forEach((f) => {
      const fx = f.x - state.cameraX;
      const spin = Math.floor(state.frameCount / 3) % 2;
      if (f.isIce) {
        // Ice ball — light blue with white core
        ctx.fillStyle = '#4499cc';
        ctx.fillRect(fx, f.y, f.w, f.h);
        ctx.fillStyle = '#88ddff';
        if (spin) {
          ctx.fillRect(fx + 2, f.y + 2, f.w - 4, f.h - 4);
        } else {
          ctx.fillRect(fx, f.y + 3, f.w, 2);
          ctx.fillRect(fx + 3, f.y, 2, f.h);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx + 3, f.y + 3, 3, 3);
      } else {
        ctx.fillStyle = '#ff4400';
        ctx.fillRect(fx, f.y, f.w, f.h);
        ctx.fillStyle = '#ffaa00';
        if (spin) {
          ctx.fillRect(fx + 2, f.y + 2, f.w - 4, f.h - 4);
        } else {
          ctx.fillRect(fx, f.y + 3, f.w, 2);
          ctx.fillRect(fx + 3, f.y, 2, f.h);
        }
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(fx + 3, f.y + 3, 3, 3);
      }
    });
  }

  function drawEnemies() {
    enemies.forEach((e) => {
      const ex = e.x - state.cameraX;
      if (ex + e.w < 0 || ex > W) return;

      // Frozen overlay tint
      const frozen = e.freezeTimer > 0;

      if (!e.alive) {
        if (e.squishTimer > 0) {
          // Squished
          ctx.fillStyle = frozen ? '#88ddff' : '#8b4513';
          ctx.fillRect(ex, e.y + e.h - 8, e.w, 8);
        }
        return;
      }

      // Body color depends on enemy type and freeze state
      let bodyColor = '#8b4513';
      let headColor = '#a0522d';
      if (e.type === 'flyer') {
        bodyColor = '#6a3a8a'; // purple-ish for flying enemies
        headColor = '#8a5aaa';
      } else if (e.type === 'charger') {
        bodyColor = '#8a2a2a'; // red-ish for chargers
        headColor = '#aa3a3a';
      }
      if (frozen) {
        bodyColor = '#88ddff';
        headColor = '#aae8ff';
      }

      if (e.type === 'flyer') {
        // Flying enemy: draw with wings
        // Wings (flap animation)
        ctx.fillStyle = frozen ? 'rgba(180,230,255,0.6)' : 'rgba(200,180,220,0.6)';
        const flap = Math.sin(e.walkFrame * 2) * 3;
        ctx.fillRect(ex - 6, e.y + 4 + flap, 8, 4);
        ctx.fillRect(ex + e.w - 2, e.y + 4 - flap, 8, 4);
        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(ex + 2, e.y + 4, e.w - 4, e.h - 8);
        // Head
        ctx.fillStyle = headColor;
        ctx.fillRect(ex + 4, e.y, e.w - 8, 10);
        // Eyes
        ctx.fillStyle = '#fff';
        const eyeDir = e.vx > 0 ? 2 : 0;
        ctx.fillRect(ex + 6 + eyeDir, e.y + 2, 4, 4);
        ctx.fillRect(ex + e.w - 10 + eyeDir, e.y + 2, 4, 4);
        ctx.fillStyle = '#000';
        ctx.fillRect(ex + 7 + eyeDir, e.y + 3, 2, 2);
        ctx.fillRect(ex + e.w - 9 + eyeDir, e.y + 3, 2, 2);
      } else if (e.type === 'barrel') {
        // DK barrel — a rolling cylinder with rim bands.
        const bc = frozen ? '#88ddff' : (e.barrelColor || '#c0392b');
        // Body
        ctx.fillStyle = bc;
        ctx.fillRect(ex + 1, e.y + 2, e.w - 2, e.h - 2);
        // Dark rim bands top and bottom
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(ex + 1, e.y + 4, e.w - 2, 2);
        ctx.fillRect(ex + 1, e.y + e.h - 7, e.w - 2, 2);
        // Rolling highlight that shifts with the roll animation
        const rollOff = Math.sin(e.rollFrame) * (e.w / 2 - 5);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(ex + 3 + rollOff, e.y + 3, 3, e.h - 8);
        // Side edge shading
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(ex + e.w - 3, e.y + 2, 2, e.h - 2);
      } else if (e.type === 'charger') {
        // Charger: spiky, aggressive look
        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(ex, e.y + 6, e.w, e.h - 6);
        // Spikes on top
        ctx.fillStyle = frozen ? '#bbf0ff' : '#5a1a1a';
        for (let i = 0; i < e.w; i += 6) {
          ctx.beginPath();
          ctx.moveTo(ex + i, e.y + 6);
          ctx.lineTo(ex + i + 3, e.y);
          ctx.lineTo(ex + i + 6, e.y + 6);
          ctx.fill();
        }
        // Head
        ctx.fillStyle = headColor;
        ctx.fillRect(ex + 2, e.y + 6, e.w - 4, 10);
        // Eyes — glowing red when charging
        ctx.fillStyle = e.charging ? '#ff0000' : '#fff';
        ctx.fillRect(ex + 5, e.y + 8, 6, 4);
        ctx.fillRect(ex + e.w - 11, e.y + 8, 6, 4);
        ctx.fillStyle = '#000';
        const eyeDir = e.vx > 0 ? 2 : 0;
        ctx.fillRect(ex + 6 + eyeDir, e.y + 9, 2, 2);
        ctx.fillRect(ex + e.w - 10 + eyeDir, e.y + 9, 2, 2);
        // Feet
        ctx.fillStyle = '#3a0a0a';
        const footOffset = Math.sin(e.walkFrame) > 0 ? 2 : 0;
        ctx.fillRect(ex + 2, e.y + e.h - 4 + footOffset, 10, 4);
        ctx.fillRect(ex + e.w - 12, e.y + e.h - 4 - footOffset, 10, 4);
      } else {
        // Standard walker
        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(ex, e.y + 8, e.w, e.h - 8);
        // Head
        ctx.fillStyle = headColor;
        ctx.fillRect(ex + 2, e.y, e.w - 4, 12);
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(ex + 5, e.y + 3, 6, 5);
        ctx.fillRect(ex + e.w - 11, e.y + 3, 6, 5);
        ctx.fillStyle = '#000';
        const eyeDir = e.vx > 0 ? 3 : 0;
        ctx.fillRect(ex + 5 + eyeDir, e.y + 4, 3, 3);
        ctx.fillRect(ex + e.w - 11 + eyeDir, e.y + 4, 3, 3);
        // Feet
        ctx.fillStyle = '#3a1a0a';
        const footOffset = Math.sin(e.walkFrame) > 0 ? 2 : 0;
        ctx.fillRect(ex + 2, e.y + e.h - 4 + footOffset, 8, 4);
        ctx.fillRect(ex + e.w - 10, e.y + e.h - 4 - footOffset, 8, 4);
      }

      // Ice crystal overlay when frozen
      if (frozen) {
        ctx.fillStyle = 'rgba(170,230,255,0.3)';
        ctx.fillRect(ex, e.y, e.w, e.h);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(ex + 2, e.y + 2, 4, 4);
        ctx.fillRect(ex + e.w - 8, e.y + e.h - 8, 4, 4);
      }
    });
  }

  function drawPlayer(pl) {
    pl = pl || players[0];
    const px = pl.x - state.cameraX;
    // Death animation: draw the player flying up, then off screen
    if (pl.dead) {
      // Draw a simplified body during death
      let c = { ...activeChars[pl.index].colors };
      ctx.fillStyle = c.shirt;
      ctx.fillRect(px + 4, pl.y + 16, pl.w - 8, pl.powerUp === 'small' ? 10 : 14);
      ctx.fillStyle = c.skin;
      ctx.fillRect(px + 6, pl.y, pl.w - 12, 16);
      ctx.fillStyle = c.hat;
      ctx.fillRect(px + 2, pl.y, pl.w - 4, 6);
      return;
    }
    // Blink when invincible (from getting hit)
    if (pl.invincible > 0 && pl.starTimer <= 0 && Math.floor(pl.invincible / 5) % 2 === 0) return;
    // Grow/shrink flash during transition
    if (pl.growTimer > 0 && Math.floor(pl.growTimer / 4) % 2 === 0) return;

    // Start with the character's base colors
    let c = { ...activeChars[pl.index].colors };

    // Fire power: override shirt/overalls to white/red (like Fire Mario)
    if (pl.powerUp === 'fire') {
      c.shirt = '#ffffff';
      c.overalls = '#e52521';
      c.hat = '#ffffff';
    }

    // Ice power: override to light blue/cyan
    if (pl.powerUp === 'ice') {
      c.shirt = '#cce8ff';
      c.overalls = '#2d7a7a';
      c.hat = '#cce8ff';
    }

    // Star power: rainbow flashing effect
    if (pl.starTimer > 0) {
      const colors = ['#ff4444', '#ff8800', '#ffff00', '#2d9e2d', '#4444ff', '#aa00ff'];
      const idx = Math.floor(state.frameCount / 4) % colors.length;
      c.shirt = colors[idx];
      c.overalls = colors[(idx + 2) % colors.length];
      c.hat = colors[(idx + 4) % colors.length];
    }

    // Offset for small player (centered within original width)
    const offX = pl.powerUp === 'small' ? 3 : 0;

    // Squash-stretch on landing: scale Y down and X up based on squashTimer
    if (pl.squashTimer > 0) {
      const sq = pl.squashTimer / 12; // 0..1
      const scaleY = 1 - sq * 0.25;
      const scaleX = 1 + sq * 0.15;
      const cx = px + offX + pl.w / 2;
      const baseY = pl.y + pl.h;
      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-cx, -baseY);
    }

    // Body (shirt)
    ctx.fillStyle = c.shirt;
    ctx.fillRect(px + offX + 4, pl.y + 16, pl.w - 8, pl.powerUp === 'small' ? 10 : 14);
    // Overalls
    ctx.fillStyle = c.overalls;
    ctx.fillRect(px + offX + 6, pl.y + 20, pl.w - 12, pl.powerUp === 'small' ? 8 : 12);
    ctx.fillRect(px + offX + 6, pl.y + 20, 6, pl.powerUp === 'small' ? 8 : 12);
    ctx.fillRect(px + offX + pl.w - 12, pl.y + 20, 6, pl.powerUp === 'small' ? 8 : 12);
    // Head
    ctx.fillStyle = c.skin;
    ctx.fillRect(px + offX + 6, pl.y, pl.w - 12, 16);
    // Hat
    ctx.fillStyle = c.hat;
    ctx.fillRect(px + offX + 2, pl.y, pl.w - 4, 6);
    ctx.fillRect(pl.facing > 0 ? px + offX + pl.w - 10 : px + offX, pl.y + 2, 10, 4);
    // Hair / sideburn
    ctx.fillStyle = c.hair;
    ctx.fillRect(px + offX + 4, pl.y + 6, 4, 8);
    ctx.fillRect(px + offX + pl.w - 8, pl.y + 6, 4, 8);
    // Eye
    ctx.fillStyle = '#000';
    const eyeX = pl.facing > 0 ? px + offX + pl.w - 12 : px + offX + 8;
    ctx.fillRect(eyeX, pl.y + 6, 3, 4);
    // Mustache
    ctx.fillStyle = c.hair;
    ctx.fillRect(px + offX + 6, pl.y + 12, pl.w - 12, 3);
    // Legs / shoes
    ctx.fillStyle = c.shoes;
    const legFrame = Math.floor(pl.walkFrame) % 2;
    if (pl.onGround && Math.abs(pl.vx) > 0.5) {
      if (legFrame === 0) {
        ctx.fillRect(px + offX + 4, pl.y + pl.h - 6, 10, 6);
        ctx.fillRect(px + offX + pl.w - 14, pl.y + pl.h - 4, 10, 4);
      } else {
        ctx.fillRect(px + offX + 4, pl.y + pl.h - 4, 10, 4);
        ctx.fillRect(px + offX + pl.w - 14, pl.y + pl.h - 6, 10, 6);
      }
    } else {
      ctx.fillRect(px + offX + 4, pl.y + pl.h - 5, 10, 5);
      ctx.fillRect(px + offX + pl.w - 14, pl.y + pl.h - 5, 10, 5);
    }

    // Restore squash-stretch transform
    if (pl.squashTimer > 0) ctx.restore();
  }

  function drawFlag() {
    if (!flag) return;
    const fx = flag.x - state.cameraX;
    if (fx + 100 < 0 || fx > W) return;
    // Pole
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(fx, flag.y, flag.w, flag.h);
    // Ball on top
    ctx.fillStyle = '#fcd000';
    ctx.beginPath();
    ctx.arc(fx + flag.w / 2, flag.y, 8, 0, Math.PI * 2);
    ctx.fill();
    // Flag (green triangle waving)
    ctx.fillStyle = '#2d7a2d';
    const wave = Math.sin(state.frameCount * 0.1) * 4;
    ctx.beginPath();
    ctx.moveTo(fx + flag.w, flag.y + 5);
    ctx.lineTo(fx + flag.w + 30 + wave, flag.y + 20);
    ctx.lineTo(fx + flag.w, flag.y + 35);
    ctx.closePath();
    ctx.fill();
  }

  function drawCheckpoints() {
    checkpoints.forEach((cp) => {
      const cx = cp.x - state.cameraX;
      if (cx + 50 < 0 || cx > W) return;
      // Pole
      ctx.fillStyle = cp.activated ? '#2d9e2d' : '#999999';
      ctx.fillRect(cx, cp.y, cp.w, cp.h);
      // Ball on top
      ctx.fillStyle = cp.activated ? '#fcd000' : '#cccccc';
      ctx.beginPath();
      ctx.arc(cx + cp.w / 2, cp.y, 6, 0, Math.PI * 2);
      ctx.fill();
      // Flag on pole — green if activated, white if not
      const wave = Math.sin(state.frameCount * 0.08) * 3;
      ctx.fillStyle = cp.activated ? '#2d9e2d' : '#dddddd';
      ctx.beginPath();
      ctx.moveTo(cx + cp.w, cp.y + 4);
      ctx.lineTo(cx + cp.w + 22 + wave, cp.y + 16);
      ctx.lineTo(cx + cp.w, cp.y + 28);
      ctx.closePath();
      ctx.fill();
      // Checkmark if activated
      if (cp.activated) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx + cp.w + 6, cp.y + 10, 3, 3);
        ctx.fillRect(cx + cp.w + 9, cp.y + 13, 3, 3);
        ctx.fillRect(cx + cp.w + 12, cp.y + 8, 3, 3);
      }
    });
  }

  // ===== Game Loop =====
  function update() {
    // Poll gamepads every frame (even when paused, so Start button can unpause)
    pollGamepads();
    if (!state.running || state.paused) return;
    state.frameCount++;

    // Time countdown (scaled by dtRatio for framerate independence)
    state._timeAccumulator = (state._timeAccumulator || 0) + dtRatio;
    if (state._timeAccumulator >= 40) {
      state.time -= Math.floor(state._timeAccumulator / 40);
      state._timeAccumulator = state._timeAccumulator % 40;
      if (state.time <= 0) {
        state.time = 0;
        endGame(false);
        return;
      }
    }
    // Update HUD every frame for power-up/star display
    updateHUD();

    // Decrement question block bump animation
    platforms.forEach((p) => { if (p.bump > 0) p.bump -= dtRatio; });

    updateAllPlayers();
    updateCoins();
    updatePowerups();
    updateFireballs();
    updateElevators();
    updateEnemies();
    updateParticles();
    updateWeather();
    updateShake();
    // Day/night cycle: full cycle every ~2 minutes (7200 frames at 60fps)
    state.timeOfDay = (state.timeOfDay + dtRatio / 7200) % 1.0;
    checkCheckpoints();
    checkFlag();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Apply screen shake offset
    ctx.save();
    if (state.shakeX || state.shakeY) {
      ctx.translate(state.shakeX, state.shakeY);
    }
    drawBackground();
    drawWeather();
    drawDKClouds();
    drawLava();
    drawPlatforms();
    drawCoins();
    drawPowerups();
    drawEnemies();
    drawFireballs();
    drawCheckpoints();
    drawDK();
    drawPauline();
    drawFlag();
    // Draw all active players
    players.forEach((p) => {
      if (p.active) drawPlayer(p);
    });
    drawParticles();
    ctx.restore();
  }

  function loop(timestamp) {
    // Compute delta-time ratio (1.0 at 60fps, ~2.0 at 30fps, ~0.5 at 120fps)
    if (lastFrameTime > 0) {
      dtRatio = (timestamp - lastFrameTime) / (1000 / 60);
      // Clamp to avoid huge jumps when tab is backgrounded
      dtRatio = Math.max(0.1, Math.min(3, dtRatio));
    }
    lastFrameTime = timestamp;
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Show/hide the on-screen control hints
  function updateControlHints() {
    const inPlatformer = state.running;
    if (p2ControlsHint) {
      p2ControlsHint.style.display = (inPlatformer && state.playerCount === 2) ? '' : 'none';
    }
  }

  // ===== Start / Restart =====

  // ===== Pause =====
  function togglePause() {
    if (!state.running) return;
    // Don't allow pausing during level transition or game over overlays
    if (!levelScreen.classList.contains('hidden')) return;
    if (!gameOverScreen.classList.contains('hidden')) return;
    state.paused = !state.paused;
    if (state.paused) {
      pauseScreen.classList.remove('hidden');
      stopMusic();
    } else {
      pauseScreen.classList.add('hidden');
      startMusic(activeMap.id || 'overworld');
    }
  }

  function quitToMenu() {
    state.paused = false;
    state.running = false;
    pauseScreen.classList.add('hidden');
    stopMusic();
    // Reset to level 1 and go back to game select
    state.currentLevel = 1;
    gameSelectScreen.classList.remove('hidden');
    startMusic('menu');
  }

  // Pause hotkey: P or Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      togglePause();
    }
  });

  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      togglePause();
      Sound.sfx.select();
    });
  }
  if (quitBtn) {
    quitBtn.addEventListener('click', () => {
      quitToMenu();
      Sound.sfx.select();
    });
  }

  function initPlayers() {
    players[0] = createPlayer(0);
    players[0].active = true;
    if (state.playerCount === 2) {
      players[1] = createPlayer(1);
      players[1].active = true;
    } else {
      players[1].active = false;
    }
  }

  function startGame() {
    state.coins = 0;
    state.score = 0;
    // Clear store inventory at the start of a fresh game session
    // (items purchased in the store are consumed during play; leftover ones don't carry to next session)
    storeInventory = {};
    storeScreen.classList.add('hidden');
    // Start from the selected level (set by level map), or level 1
    if (!state.currentLevel || state.currentLevel < 1) state.currentLevel = 1;
    state.frameCount = 0;
    state.running = true;
    state.paused = false;
    // Apply selected characters and map
    activeChars[0] = CHARACTERS[selectedChar];
    activeChars[1] = CHARACTERS[selectedChar2];
    activeMap = MAPS[selectedMap];
    // Initialize players
    initPlayers();
    // Show/hide P2 controls hint and touch buttons
    if (state.playerCount === 2) {
      p2ControlsHint.style.display = '';
      p2TouchGroups.forEach((g) => g.style.display = '');
    } else {
      p2ControlsHint.style.display = 'none';
      p2TouchGroups.forEach((g) => g.style.display = 'none');
    }
    // Restore the platformer touch buttons
    document.querySelectorAll('.touch__group').forEach((g) => {
      if (!g.classList.contains('touch__p2')) g.style.display = '';
    });
    updateControlHints();
    // Update sky background
    const skyEl = document.querySelector('.sky');
    if (skyEl) skyEl.style.background = `linear-gradient(180deg, ${activeMap.skyTop} 0%, ${activeMap.skyBottom} 100%)`;
    buildLevel();
    players.forEach((p) => {
      if (p.active) {
        resetPlayer(p);
        p.invincible = 0;
        p.powerUp = 'small';
        applyPlayerSize(p);
        p.y = GROUND_Y - p.h;
      }
    });
    updateHUD();
    startScreen.classList.add('hidden');
    playerCountScreen.classList.add('hidden');
    charSelectScreen.classList.add('hidden');
    mapSelectScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    // Start background music for the selected map
    startMusic(activeMap.id || 'overworld');
  }

  // ===== Next Level =====
  function nextLevel() {
    if (state.currentLevel < state.maxLevels) {
      state.currentLevel++;
      // Keep score and lives, reset time per level
      state.frameCount = 0;
      state.running = true;
      state.paused = false;
      buildLevel();
      players.forEach((p) => {
        if (p.active) {
          resetPlayer(p);
          p.invincible = 0;
          p.powerUp = 'small';
          applyPlayerSize(p);
          p.y = GROUND_Y - p.h;
        }
      });
      updateHUD();
      levelScreen.classList.add('hidden');
      // Resume background music for the new level
      startMusic(activeMap.id || 'overworld');
    } else {
      // All levels cleared — back to game select, restart from level 1
      state.currentLevel = 1;
      levelScreen.classList.add('hidden');
      gameSelectScreen.classList.remove('hidden');
      // Play menu music on the selection screen
      startMusic('menu');
    }
  }

  // ===== Character / Map Selection Flow =====
  function renderCharPreview(canvasEl, charIdx) {
    const cctx = canvasEl.getContext('2d');
    cctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const c = CHARACTERS[charIdx].colors;
    const bx = canvasEl.width / 2 - 14;
    const by = 4;
    const pw = 28, ph = 36;
    // Body
    cctx.fillStyle = c.shirt;
    cctx.fillRect(bx + 4, by + 16, pw - 8, 14);
    // Overalls
    cctx.fillStyle = c.overalls;
    cctx.fillRect(bx + 6, by + 20, pw - 12, 12);
    cctx.fillRect(bx + 6, by + 20, 6, 12);
    cctx.fillRect(bx + pw - 12, by + 20, 6, 12);
    // Head
    cctx.fillStyle = c.skin;
    cctx.fillRect(bx + 6, by, pw - 12, 16);
    // Hat
    cctx.fillStyle = c.hat;
    cctx.fillRect(bx + 2, by, pw - 4, 6);
    cctx.fillRect(bx + pw - 10, by + 2, 10, 4);
    // Hair
    cctx.fillStyle = c.hair;
    cctx.fillRect(bx + 4, by + 6, 4, 8);
    cctx.fillRect(bx + pw - 8, by + 6, 4, 8);
    // Eye
    cctx.fillStyle = '#000';
    cctx.fillRect(bx + pw - 12, by + 6, 3, 4);
    // Mustache
    cctx.fillStyle = c.hair;
    cctx.fillRect(bx + 6, by + 12, pw - 12, 3);
    // Shoes
    cctx.fillStyle = c.shoes;
    cctx.fillRect(bx + 4, by + ph - 5, 10, 5);
    cctx.fillRect(bx + pw - 14, by + ph - 5, 10, 5);
  }

  function buildCharSelect() {
    charGrid.innerHTML = '';
    const sel = charSelectingPlayer === 1 ? selectedChar : selectedChar2;
    CHARACTERS.forEach((char, idx) => {
      const card = document.createElement('div');
      card.className = 'select-card' + (idx === sel ? ' selected' : '');
      card.innerHTML = `
        <div class="select-card__preview"><canvas width="32" height="44"></canvas></div>
        <div class="select-card__name">${char.name}</div>
        <div class="select-card__desc">${char.desc}</div>
      `;
      card.addEventListener('click', () => {
        if (charSelectingPlayer === 1) {
          selectedChar = idx;
        } else {
          selectedChar2 = idx;
        }
        document.querySelectorAll('#charGrid .select-card').forEach((c, i) => {
          c.classList.toggle('selected', i === idx);
        });
      });
      charGrid.appendChild(card);
      // Draw preview after append
      const cv = card.querySelector('canvas');
      renderCharPreview(cv, idx);
    });
  }

  function buildMapSelect() {
    mapGrid.innerHTML = '';
    MAPS.forEach((map, idx) => {
      const card = document.createElement('div');
      card.className = 'select-card map-card' + (idx === selectedMap ? ' selected' : '');
      // Thumbnail is a gradient div
      card.innerHTML = `
        <div class="map-card__thumb" style="background: linear-gradient(180deg, ${map.skyTop}, ${map.skyBottom}); border-bottom: 8px solid ${map.grassColor};">
          <div style="height: 100%; display: flex; align-items: flex-end;">
            <div style="width: 100%; height: 20px; background: ${map.groundColor}; border-radius: 0 0 4px 4px;"></div>
          </div>
        </div>
        <div class="select-card__name">${map.name}</div>
        <div class="select-card__desc">${map.desc}<br>100 levels — gets harder!</div>
      `;
      card.addEventListener('click', () => {
        selectedMap = idx;
        document.querySelectorAll('#mapGrid .select-card').forEach((c, i) => {
          c.classList.toggle('selected', i === idx);
        });
      });
      mapGrid.appendChild(card);
    });
  }

  // ===== Level Map Builder =====
  // Renders a 10x10 grid of level nodes showing progress.
  // States: cleared (green), current (gold, pulsing), locked (dark).
  function buildLevelMap() {
    levelMapName.textContent = MAPS[selectedMap].name;
    const cleared = clearedLevels.size;
    levelMapStats.innerHTML = `Cleared: <strong style="color:#2d9e2d;">${cleared}/100</strong> &nbsp; Unlocked: <strong style="color:#fcd000;">L${maxUnlockedLevel}</strong>`;
    levelMapGrid.innerHTML = '';

    for (let lv = 1; lv <= state.maxLevels; lv++) {
      const node = document.createElement('div');
      const isCleared = clearedLevels.has(lv);
      const isUnlocked = lv <= maxUnlockedLevel;
      const isCurrent = lv === maxUnlockedLevel && !isCleared;

      let cls = 'level-node';
      if (isCleared) cls += ' level-node--cleared';
      else if (isCurrent) cls += ' level-node--current';
      else if (!isUnlocked) cls += ' level-node--locked';
      node.className = cls;

      // Show level number; use ✓ for cleared
      node.textContent = isCleared ? '✓' : String(lv);

      // Theme color accent (small dot in corner for visual variety)
      const themeIdx = (lv - 1) % 8;
      const theme = MAPS[themeIdx];
      node.style.borderTopColor = isUnlocked ? theme.grassColor : '#333';

      if (isUnlocked) {
        node.addEventListener('click', () => {
          levelMapSelectedLevel = lv;
          // Update selected highlight
          levelMapGrid.querySelectorAll('.level-node').forEach((n) => {
            n.style.outline = '';
          });
          node.style.outline = '3px solid #fff';
          updateLevelMapPlayButton();
        });
      }

      // Pre-select the max unlocked level
      if (lv === levelMapSelectedLevel) {
        node.style.outline = '3px solid #fff';
      }

      levelMapGrid.appendChild(node);
    }
    updateLevelMapPlayButton();
  }

  function updateLevelMapPlayButton() {
    const lv = levelMapSelectedLevel;
    const isUnlocked = lv <= maxUnlockedLevel;
    levelMapPlayBtn.textContent = isUnlocked ? `PLAY L${lv} →` : 'LOCKED';
    levelMapPlayBtn.disabled = !isUnlocked;
    levelMapPlayBtn.style.opacity = isUnlocked ? '1' : '0.5';
  }

  // ===== Player Count Selection Builder =====
  function buildPlayerCountSelect() {
    document.querySelectorAll('.player-count-card').forEach((card) => {
      const count = parseInt(card.getAttribute('data-count'), 10);
      card.classList.toggle('selected', count === state.playerCount);
    });
  }

  // Click handlers for player count cards
  document.querySelectorAll('.player-count-card').forEach((card) => {
    card.addEventListener('click', () => {
      state.playerCount = parseInt(card.getAttribute('data-count'), 10);
      document.querySelectorAll('.player-count-card').forEach((c) => {
        c.classList.toggle('selected', c === card);
      });
    });
  });

  // Navigation: Start -> Game Select -> Player Count -> Char -> Map -> Game
  startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    gameSelectScreen.classList.remove('hidden');
  });

  // Game card selection
  gameCards.forEach((card) => {
    card.addEventListener('click', () => {
      selectedGame = card.getAttribute('data-game');
      gameCards.forEach((c) => c.classList.toggle('selected', c === card));
    });
  });

  gameSelectBackBtn.addEventListener('click', () => {
    gameSelectScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
  });

  gameSelectNextBtn.addEventListener('click', () => {
    // Platformer: continue to player count selection
    gameSelectScreen.classList.add('hidden');
    buildPlayerCountSelect();
    playerCountScreen.classList.remove('hidden');
  });

  playerCountBackBtn.addEventListener('click', () => {
    playerCountScreen.classList.add('hidden');
    gameSelectScreen.classList.remove('hidden');
  });

  playerCountNextBtn.addEventListener('click', () => {
    playerCountScreen.classList.add('hidden');
    charSelectingPlayer = 1;
    charSelectTitle.textContent = state.playerCount === 2 ? 'P1: SELECT YOUR CHARACTER' : 'SELECT YOUR CHARACTER';
    charNextBtn.textContent = state.playerCount === 2 ? 'NEXT →' : 'NEXT →';
    buildCharSelect();
    charSelectScreen.classList.remove('hidden');
  });

  charBackBtn.addEventListener('click', () => {
    if (charSelectingPlayer === 2) {
      // Go back to P1 character select
      charSelectingPlayer = 1;
      charSelectTitle.textContent = state.playerCount === 2 ? 'P1: SELECT YOUR CHARACTER' : 'SELECT YOUR CHARACTER';
      buildCharSelect();
    } else {
      // Go back to player count screen
      charSelectScreen.classList.add('hidden');
      buildPlayerCountSelect();
      playerCountScreen.classList.remove('hidden');
    }
  });

  charNextBtn.addEventListener('click', () => {
    if (state.playerCount === 2 && charSelectingPlayer === 1) {
      // Move to P2 character selection
      charSelectingPlayer = 2;
      charSelectTitle.textContent = 'P2: SELECT YOUR CHARACTER';
      buildCharSelect();
      return;
    }
    charSelectScreen.classList.add('hidden');
    buildMapSelect();
    mapSelectScreen.classList.remove('hidden');
  });

  mapBackBtn.addEventListener('click', () => {
    mapSelectScreen.classList.add('hidden');
    // Go back to the appropriate character select screen
    if (state.playerCount === 2) {
      charSelectingPlayer = 2;
      charSelectTitle.textContent = 'P2: SELECT YOUR CHARACTER';
    } else {
      charSelectingPlayer = 1;
      charSelectTitle.textContent = 'SELECT YOUR CHARACTER';
    }
    buildCharSelect();
    charSelectScreen.classList.remove('hidden');
  });

  mapStartBtn.addEventListener('click', () => {
    // After selecting a map, show the level map
    mapSelectScreen.classList.add('hidden');
    levelMapSelectedLevel = Math.min(levelMapSelectedLevel, maxUnlockedLevel);
    buildLevelMap();
    levelMapScreen.classList.remove('hidden');
  });

  levelMapBackBtn.addEventListener('click', () => {
    levelMapScreen.classList.add('hidden');
    mapSelectScreen.classList.remove('hidden');
  });

  levelMapPlayBtn.addEventListener('click', () => {
    if (levelMapSelectedLevel > maxUnlockedLevel) return;
    state.currentLevel = levelMapSelectedLevel;
    levelMapScreen.classList.add('hidden');
    startGame();
  });

  levelMapStoreBtn.addEventListener('click', openStore);
  storeBackBtn.addEventListener('click', closeStore);
  storePlayBtn.addEventListener('click', () => {
    if (levelMapSelectedLevel > maxUnlockedLevel) return;
    state.currentLevel = levelMapSelectedLevel;
    storeScreen.classList.add('hidden');
    startGame();
  });

  nextLevelBtn.addEventListener('click', nextLevel);

  restartBtn.addEventListener('click', () => {
    // Go back to game select after game over, reset to level 1
    state.currentLevel = 1;
    gameOverScreen.classList.add('hidden');
    gameSelectScreen.classList.remove('hidden');
    startMusic('menu');
  });

  // ===== Audio Init & Mute Toggle =====
  // Audio context must be created/resumed on user interaction (browser autoplay policy)
  let audioInited = false;
  function initAudioOnce() {
    if (audioInited) return;
    audioInited = true;
    Sound.init();
    Sound.resume();
    // Start menu music once audio is initialized
    if (musicEnabled) startMusic('menu');
  }
  // Init on any keypress or click/touch anywhere on the page
  window.addEventListener('keydown', initAudioOnce, { once: true });
  window.addEventListener('click', initAudioOnce, { once: true });
  window.addEventListener('touchstart', initAudioOnce, { once: true });

  // Mute toggle button (toggles both SFX and music)
  if (muteBtn) {
    muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      initAudioOnce();
      const muted = Sound.toggleMute();
      muteBtn.textContent = muted ? '🔇' : '🔊';
      if (muted) {
        stopMusic();
      } else if (musicEnabled) {
        // Resume appropriate music
        if (state.running) {
          startMusic(activeMap.id || 'overworld');
        } else {
          startMusic('menu');
        }
      }
    });
  }

  // Play select sound on UI navigation clicks
  [startBtn, gameSelectNextBtn, gameSelectBackBtn, playerCountNextBtn, playerCountBackBtn, charNextBtn, charBackBtn, mapStartBtn, mapBackBtn, nextLevelBtn, restartBtn].forEach((btn) => {
    if (btn) {
      btn.addEventListener('click', () => {
        initAudioOnce();
        Sound.sfx.select();
      });
    }
  });
  // Play select sound when choosing character/map/player-count/game cards
  document.querySelectorAll('.select-card, .player-count-card, .game-card').forEach((card) => {
    card.addEventListener('click', () => {
      initAudioOnce();
      Sound.sfx.select();
    });
  });

  // ===== Show High Score on Start Screen =====
  const startHighScoreEl = document.getElementById('startHighScore');
  function refreshStartScreen() {
    if (startHighScoreEl) {
      startHighScoreEl.textContent = highScore > 0 ? `🏆 HIGH SCORE: ${highScore}` : '';
    }
  }
  refreshStartScreen();

  // Press Enter on start screen or game over screen to proceed
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!startScreen.classList.contains('hidden')) {
        e.preventDefault();
        startBtn.click();
      } else if (!gameOverScreen.classList.contains('hidden')) {
        e.preventDefault();
        restartBtn.click();
      } else if (!levelScreen.classList.contains('hidden')) {
        e.preventDefault();
        nextLevelBtn.click();
      } else if (!storeScreen.classList.contains('hidden')) {
        e.preventDefault();
        storePlayBtn.click();
      }
    }
    if (e.key === 'Escape' || e.key === 'Backspace') {
      if (!storeScreen.classList.contains('hidden')) {
        e.preventDefault();
        closeStore();
      }
    }
  });

  // ===== Keyboard Navigation for Menu Screens =====
  // Allows arrow keys to move selection and Enter to activate the primary button.
  // Works for: game select, player count, character select, map select, level map.
  const MENU_SCREENS = [
    { overlay: gameSelectScreen, cards: () => document.querySelectorAll('.game-card'), next: gameSelectNextBtn, back: gameSelectBackBtn, onSelect: (card) => card.click() },
    { overlay: playerCountScreen, cards: () => document.querySelectorAll('.player-count-card'), next: playerCountNextBtn, back: playerCountBackBtn, onSelect: (card) => card.click() },
    { overlay: charSelectScreen, cards: () => document.querySelectorAll('#charGrid .select-card'), next: charNextBtn, back: charBackBtn, onSelect: (card) => card.click() },
    { overlay: mapSelectScreen, cards: () => document.querySelectorAll('#mapGrid .select-card'), next: mapStartBtn, back: mapBackBtn, onSelect: (card) => card.click() },
  ];

  let menuNavIndex = 0;

  function getActiveMenuScreen() {
    return MENU_SCREENS.find((s) => !s.overlay.classList.contains('hidden'));
  }

  function getMenuCards(screen) {
    if (!screen) return [];
    return Array.from(screen.cards());
  }

  function highlightMenuCard(screen, idx) {
    const cards = getMenuCards(screen);
    if (cards.length === 0) return;
    menuNavIndex = Math.max(0, Math.min(cards.length - 1, idx));
    cards.forEach((c, i) => {
      c.classList.toggle('selected', i === menuNavIndex);
    });
  }

  // Level map uses a grid, so we handle it separately
  function handleLevelMapNav(e) {
    if (levelMapScreen.classList.contains('hidden')) return false;
    const cols = 10;
    const max = state.maxLevels;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      let idx = levelMapSelectedLevel - 1;
      if (e.key === 'ArrowLeft') idx = Math.max(0, idx - 1);
      else if (e.key === 'ArrowRight') idx = Math.min(max - 1, idx + 1);
      else if (e.key === 'ArrowUp') idx = Math.max(0, idx - cols);
      else if (e.key === 'ArrowDown') idx = Math.min(max - 1, idx + cols);
      levelMapSelectedLevel = idx + 1;
      if (levelMapSelectedLevel > maxUnlockedLevel) return true;
      // Rebuild and highlight
      buildLevelMap();
      // Set the selected node outline
      const nodes = levelMapGrid.querySelectorAll('.level-node');
      if (nodes[idx]) {
        nodes[idx].style.outline = '3px solid #fff';
        nodes[idx].scrollIntoView({ block: 'nearest' });
      }
      return true;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (levelMapSelectedLevel <= maxUnlockedLevel) {
        state.currentLevel = levelMapSelectedLevel;
        levelMapScreen.classList.add('hidden');
        startGame();
      }
      return true;
    }
    return false;
  }

  window.addEventListener('keydown', (e) => {
    // Level map navigation
    if (handleLevelMapNav(e)) return;

    // Standard menu card navigation
    const screen = getActiveMenuScreen();
    if (!screen) return;
    const cards = getMenuCards(screen);

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIdx = cards.findIndex((c) => c.classList.contains('selected'));
      const newIdx = currentIdx <= 0 ? cards.length - 1 : currentIdx - 1;
      highlightMenuCard(screen, newIdx);
      screen.onSelect(cards[newIdx]);
      Sound.sfx.select();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIdx = cards.findIndex((c) => c.classList.contains('selected'));
      const newIdx = currentIdx < 0 || currentIdx >= cards.length - 1 ? 0 : currentIdx + 1;
      highlightMenuCard(screen, newIdx);
      screen.onSelect(cards[newIdx]);
      Sound.sfx.select();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (screen.next) screen.next.click();
    } else if (e.key === 'Backspace' || e.key === 'b' || e.key === 'B') {
      // Back shortcut (only if back button exists)
      if (screen.back) {
        e.preventDefault();
        screen.back.click();
      }
    }
  });

  // Initialize level for the start screen background
  buildLevel();
  requestAnimationFrame(loop);
})();
