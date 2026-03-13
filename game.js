// =============================================================================
// CROSSY HOP — High Quality Crossy Road style mobile game
// Controls: D-Pad buttons | WASD / Arrow Keys
// =============================================================================

const W = 390, H = 844;
const CELL = 64;
const COLS = 7, HALF = 3;
const MID_X = W / 2;
const PLAYER_SCREEN_Y = H * 0.60;

// Lane type weights
const LANE_WEIGHTS = [
  { type: 'grass', weight: 38 },
  { type: 'road',  weight: 36 },
  { type: 'water', weight: 26 },
];

const CHAR_DEFS = [
  { key: 'chicken', name: 'Tavuk',    color: 0xffdd22, eye: 0xffffff, detail: 0xff6600, unlock: 0  },
  { key: 'frog',    name: 'Kurbağa',  color: 0x44bb44, eye: 0xffffff, detail: 0xffdd22, unlock: 10 },
  { key: 'cat',     name: 'Kedi',     color: 0xff8844, eye: 0x44ffff, detail: 0xffffff, unlock: 25 },
  { key: 'penguin', name: 'Penguen',  color: 0x222244, eye: 0xffffff, detail: 0xff6600, unlock: 50 },
];

// =============================================================================
// SFX
// =============================================================================
const SFX = {
  _ctx: null,
  _get() {
    if (!this._ctx) try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
    if (this._ctx?.state === 'suspended') this._ctx.resume();
    return this._ctx;
  },
  _n(freq, vol, dur, type='sine') {
    const ctx = this._get(); if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type; o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.start(t); o.stop(t+dur+0.01);
  },
  hop()   { this._n(520, 0.12, 0.07, 'sine'); this._n(780, 0.06, 0.05, 'sine'); },
  coin()  { this._n(880, 0.10, 0.05); this._n(1100, 0.08, 0.08); },
  splash(){ this._n(180, 0.18, 0.25, 'sawtooth'); this._n(100, 0.14, 0.35, 'sine'); if(navigator.vibrate) navigator.vibrate([30,20,60]); },
  car()   { this._n(90, 0.22, 0.35, 'sawtooth'); if(navigator.vibrate) navigator.vibrate([40,10,80]); },
  score() { this._n(660, 0.10, 0.06); this._n(880, 0.09, 0.09); },
};

// =============================================================================
// BOOT SCENE
// =============================================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeTiles();
    this.makeCharacters();
    this.makeCars();
    this.makeLog();
    this.makeTrees();
    this.makeCoin();
    this.makeUI();
    this.scene.start('Menu');
  }

  // helper: rounded rect
  rr(g, x, y, w, h, r, color, alpha=1) {
    g.fillStyle(color, alpha); g.fillRoundedRect(x, y, w, h, r);
  }

  makeTiles() {
    // Grass tile
    const gg = this.make.graphics({ add: false });
    gg.fillStyle(0x5cb85c); gg.fillRect(0, 0, CELL, CELL);
    gg.fillStyle(0x4cae4c, 0.6); gg.fillRect(2, 2, CELL-4, CELL-4);
    // subtle texture dots
    for (let i = 0; i < 8; i++) {
      gg.fillStyle(0x66cc66, 0.4);
      gg.fillRect(8+i*7, 12+((i%3)*14), 4, 4);
    }
    gg.lineStyle(1, 0x3d9b3d, 0.5); gg.strokeRect(0, 0, CELL, CELL);
    gg.generateTexture('tile_grass', CELL, CELL); gg.destroy();

    // Safe grass tile (lighter)
    const sg = this.make.graphics({ add: false });
    sg.fillStyle(0x7ec87e); sg.fillRect(0, 0, CELL, CELL);
    sg.fillStyle(0x6dc46d, 0.5); sg.fillRect(2, 2, CELL-4, CELL-4);
    sg.lineStyle(1, 0x5ab05a, 0.4); sg.strokeRect(0, 0, CELL, CELL);
    sg.generateTexture('tile_safe', CELL, CELL); sg.destroy();

    // Road tile
    const rg = this.make.graphics({ add: false });
    rg.fillStyle(0x444455); rg.fillRect(0, 0, CELL, CELL);
    rg.fillStyle(0x3a3a4a, 0.7); rg.fillRect(0, 0, CELL, CELL);
    // Road texture lines
    rg.lineStyle(1, 0x555566, 0.3);
    rg.moveTo(0, CELL/2); rg.lineTo(CELL, CELL/2);
    rg.strokePath();
    rg.generateTexture('tile_road', CELL, CELL); rg.destroy();

    // Road center line
    const rl = this.make.graphics({ add: false });
    rl.fillStyle(0xffd700, 0.8); rl.fillRect(22, 0, 8, CELL);
    rl.generateTexture('road_line', CELL, CELL); rl.destroy();

    // Water tile
    const wg = this.make.graphics({ add: false });
    wg.fillStyle(0x1a6fa8); wg.fillRect(0, 0, CELL, CELL);
    wg.fillStyle(0x2288cc, 0.6); wg.fillRect(4, 6, CELL-8, 12);
    wg.fillStyle(0x2288cc, 0.4); wg.fillRect(8, 28, CELL-16, 10);
    wg.fillStyle(0x2288cc, 0.6); wg.fillRect(2, 44, CELL-8, 10);
    wg.lineStyle(1, 0x1155aa, 0.5); wg.strokeRect(0, 0, CELL, CELL);
    wg.generateTexture('tile_water', CELL, CELL); wg.destroy();

    // Sidewalk/path tile
    const pw = this.make.graphics({ add: false });
    pw.fillStyle(0xbbbbbb); pw.fillRect(0, 0, CELL, CELL);
    pw.fillStyle(0xcccccc, 0.5); pw.fillRect(2, 2, CELL-4, CELL-4);
    pw.lineStyle(1, 0xaaaaaa, 0.6); pw.strokeRect(0, 0, CELL, CELL);
    pw.generateTexture('tile_path', CELL, CELL); pw.destroy();
  }

  makeCharacters() {
    CHAR_DEFS.forEach(def => {
      const g = this.make.graphics({ add: false });
      const s = 28, cx = s, cy = s;

      // Shadow
      g.fillStyle(0x000000, 0.22); g.fillEllipse(cx+2, cy+4, s*1.6, s*0.6);

      // Body
      g.fillStyle(def.color); g.fillCircle(cx, cy, s*0.72);
      g.fillStyle(Phaser.Display.Color.IntegerToColor(def.color).lighten(15).color, 0.5);
      g.fillCircle(cx-4, cy-5, s*0.4);

      // Eyes
      g.fillStyle(def.eye); g.fillCircle(cx-7, cy-6, 6);
      g.fillStyle(def.eye); g.fillCircle(cx+7, cy-6, 6);
      g.fillStyle(0x111111); g.fillCircle(cx-6, cy-7, 3);
      g.fillStyle(0x111111); g.fillCircle(cx+8, cy-7, 3);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(cx-5, cy-8, 1.5);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(cx+9, cy-8, 1.5);

      // Detail (beak/feature)
      g.fillStyle(def.detail);
      if (def.key === 'chicken')  { g.fillTriangle(cx-3, cy+4, cx+3, cy+4, cx, cy-2); }
      else if (def.key === 'frog') { g.fillCircle(cx-9, cy-5, 5); g.fillCircle(cx+9, cy-5, 5); g.fillStyle(def.color); g.fillCircle(cx-9, cy-5, 3); g.fillCircle(cx+9, cy-5, 3); }
      else if (def.key === 'cat')  { g.fillTriangle(cx-12, cy-18, cx-6, cy-10, cx-18, cy-10); g.fillTriangle(cx+12, cy-18, cx+6, cy-10, cx+18, cy-10); }
      else { g.fillRoundedRect(cx-6, cy+6, 12, 5, 2); }

      g.generateTexture(`char_${def.key}`, s*2, s*2);
      g.destroy();
    });
  }

  makeCars() {
    const cars = [
      { key:'car_red',    w:82, h:44, body:0xee2222, roof:0xcc0000, win:0x88ccff },
      { key:'car_blue',   w:82, h:44, body:0x2244ee, roof:0x1133cc, win:0x88ccff },
      { key:'car_yellow', w:82, h:44, body:0xffcc00, roof:0xddaa00, win:0x88ccff },
      { key:'car_green',  w:82, h:44, body:0x22aa44, roof:0x118833, win:0x88ccff },
      { key:'truck',      w:128,h:48, body:0x885533, roof:0x664422, win:0x88ccff },
      { key:'bus',        w:150,h:48, body:0xffaa00, roof:0xdd8800, win:0xaaddff },
    ];
    cars.forEach(c => {
      const g = this.make.graphics({ add: false });
      const { w, h, body, roof, win } = c;
      // Shadow
      g.fillStyle(0x000000, 0.28); g.fillRoundedRect(4, h-2, w-4, 10, 4);
      // Body
      this.rr(g, 0, 4, w, h-8, 6, body);
      // Roof
      const rx = w*0.2, rw = w*0.6, rh = h*0.5;
      this.rr(g, rx, 4, rw, rh, 4, roof);
      // Windows
      this.rr(g, rx+3, 6, rw-6, rh-4, 3, win, 0.85);
      // Windshield divider
      g.lineStyle(2, 0x334455, 0.5);
      g.moveTo(w/2, 6); g.lineTo(w/2, 4+rh-2); g.strokePath();
      // Wheels
      [[4,2],[w-18,2],[4,h-14],[w-18,h-14]].forEach(([wx,wy]) => {
        g.fillStyle(0x222222); g.fillRoundedRect(wx, wy, 16, 12, 3);
        g.fillStyle(0x555555); g.fillCircle(wx+8, wy+6, 4);
      });
      // Headlights
      g.fillStyle(0xffffcc, 0.9); g.fillRoundedRect(w-6, 8, 6, 8, 2);
      g.fillStyle(0xff6622, 0.9); g.fillRoundedRect(0, 8, 6, 8, 2);
      g.generateTexture(c.key, w, h);
      g.destroy();
    });
  }

  makeLog() {
    [{ key:'log_sm', w:120 }, { key:'log_md', w:170 }, { key:'log_lg', w:220 }].forEach(l => {
      const g = this.make.graphics({ add: false });
      const h2 = 42;
      // Shadow
      g.fillStyle(0x000000, 0.2); g.fillRoundedRect(3, h2-4, l.w-2, 10, 4);
      // Log body
      g.fillStyle(0x8B5E3C); g.fillRoundedRect(0, 2, l.w, h2-6, 18);
      // Wood grain
      g.fillStyle(0x7a5230, 0.6); g.fillRoundedRect(2, 8, l.w-4, 6, 3);
      g.fillStyle(0x7a5230, 0.4); g.fillRoundedRect(2, 20, l.w-4, 5, 3);
      g.fillStyle(0x7a5230, 0.3); g.fillRoundedRect(2, 30, l.w-4, 4, 3);
      // Ends (darker rings)
      g.fillStyle(0x5a3a1a); g.fillRoundedRect(0, 2, 18, h2-6, 18);
      g.fillStyle(0x5a3a1a); g.fillRoundedRect(l.w-18, 2, 18, h2-6, 18);
      // Highlight
      g.fillStyle(0xaa7a55, 0.4); g.fillRoundedRect(4, 4, l.w-8, 8, 4);
      g.generateTexture(l.key, l.w, h2);
      g.destroy();
    });
  }

  makeTrees() {
    // Tree (top-down)
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x000000, 0.2); g.fillEllipse(24, 28, 40, 16);
    g.fillStyle(0x1a6b1a); g.fillCircle(22, 20, 18);
    g.fillStyle(0x228822); g.fillCircle(18, 16, 14);
    g.fillStyle(0x33aa33, 0.6); g.fillCircle(14, 12, 9);
    g.fillStyle(0x55cc55, 0.3); g.fillCircle(12, 10, 5);
    g.generateTexture('tree', 46, 46); g.destroy();

    // Bush
    const b = this.make.graphics({ add: false });
    b.fillStyle(0x000000, 0.18); b.fillEllipse(18, 24, 30, 12);
    b.fillStyle(0x2a8a2a); b.fillCircle(14, 16, 12);
    b.fillStyle(0x228822); b.fillCircle(22, 14, 9);
    b.fillStyle(0x44aa44, 0.5); b.fillCircle(10, 12, 6);
    b.generateTexture('bush', 36, 32); b.destroy();

    // Rock
    const r = this.make.graphics({ add: false });
    r.fillStyle(0x000000, 0.15); r.fillEllipse(18, 24, 30, 12);
    r.fillStyle(0x888899); r.fillRoundedRect(2, 6, 28, 16, 8);
    r.fillStyle(0xaaaacc, 0.5); r.fillRoundedRect(4, 8, 14, 8, 4);
    r.generateTexture('rock', 34, 28); r.destroy();
  }

  makeCoin() {
    const g = this.make.graphics({ add: false });
    g.fillStyle(0x000000, 0.18); g.fillEllipse(14, 18, 22, 8);
    g.fillStyle(0xffd700); g.fillCircle(12, 12, 12);
    g.fillStyle(0xffee44, 0.6); g.fillCircle(10, 9, 8);
    g.fillStyle(0xffffff, 0.4); g.fillEllipse(7, 7, 8, 5);
    g.fillStyle(0xcc9900); g.fillCircle(12, 12, 5);
    g.generateTexture('coin', 26, 26); g.destroy();

    // Star
    const s = this.make.graphics({ add: false });
    s.fillStyle(0xffd700); s.fillStar(16, 16, 5, 14, 6);
    s.fillStyle(0xffffff, 0.4); s.fillStar(16, 16, 5, 8, 3);
    s.generateTexture('star', 32, 32); s.destroy();
  }

  makeUI() {
    // D-pad buttons
    [['dpad_up',0,0,50,50],['dpad_down',0,0,50,50],['dpad_left',0,0,50,50],['dpad_right',0,0,50,50]].forEach(([k,...dims]) => {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 0.18); g.fillRoundedRect(0, 0, 50, 50, 10);
      g.lineStyle(2, 0xffffff, 0.45); g.strokeRoundedRect(0, 0, 50, 50, 10);
      g.fillStyle(0xffffff, 0.7);
      if (k==='dpad_up')    g.fillTriangle(25,8, 10,38, 40,38);
      if (k==='dpad_down')  g.fillTriangle(25,42, 10,12, 40,12);
      if (k==='dpad_left')  g.fillTriangle(8,25, 38,10, 38,40);
      if (k==='dpad_right') g.fillTriangle(42,25, 12,10, 12,40);
      g.generateTexture(k, 50, 50); g.destroy();
    });
  }
}

// =============================================================================
// MENU SCENE
// =============================================================================
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    // Sky gradient bg
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87ceeb, 0x87ceeb, 0x4cae4c, 0x4cae4c, 1);
    bg.fillRect(0, 0, W, H);

    // Ground stripe
    this.add.rectangle(W/2, H-80, W, 160, 0x4cae4c);
    this.add.rectangle(W/2, H-80, W, 20, 0x5cb85c);

    // Decorative road strip
    this.add.rectangle(W/2, H/2, W, 90, 0x444455);
    this.add.rectangle(W/2, H/2, W, 12, 0xffd700, 0.5).setAlpha(0.4);

    // Animated cars in background
    const carColors = [0xee2222, 0x2244ee, 0xffcc00];
    carColors.forEach((c, i) => {
      const cg = this.add.graphics().setAlpha(0.7);
      cg.fillStyle(c); cg.fillRoundedRect(0, 0, 70, 34, 6);
      cg.fillStyle(0x88ccff, 0.8); cg.fillRoundedRect(12, 3, 46, 18, 4);
      cg.setPosition(-80, H/2 - 28 + i*4);
      this.tweens.add({ targets: cg, x: W+80, duration: 2000 + i*600, repeat: -1, delay: i*700 });
    });

    // Logo
    const logo = this.add.container(W/2, 160);
    const logoBg = this.add.rectangle(0, 0, 300, 100, 0x000000, 0.55);
    logoBg.setStrokeStyle(3, 0xffd700, 0.9);
    const logoTxt = this.add.text(0, -18, 'CROSSY HOP', {
      fontSize: '42px', fontFamily: 'Arial Black', color: '#FFD700',
      stroke: '#664400', strokeThickness: 5,
    }).setOrigin(0.5);
    const subTxt = this.add.text(0, 26, 'YÜKSEK KALİTE', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#aaffaa', letterSpacing: 4,
    }).setOrigin(0.5);
    logo.add([logoBg, logoTxt, subTxt]);
    this.tweens.add({ targets: logo, y: 155, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Character preview
    const best = parseInt(localStorage.getItem('crossyBest') || 0);
    this.add.text(W/2, 280, 'KARAKTERİNİ SEÇ', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#ffffff', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);

    this.selectedChar = localStorage.getItem('crossyChar') || 'chicken';

    CHAR_DEFS.forEach((def, i) => {
      const cx = 55 + i * 72;
      const unlocked = best >= def.unlock;
      const sel = def.key === this.selectedChar;

      const bg2 = this.add.rectangle(cx, 340, 62, 72, unlocked ? (sel ? 0x226622 : 0x112211) : 0x221111, 0.9);
      bg2.setStrokeStyle(sel ? 2 : 1, sel ? 0x44ff44 : (unlocked ? 0x336633 : 0x553333));

      if (unlocked) {
        this.add.image(cx, 332, `char_${def.key}`).setScale(0.9);
        const nTxt = this.add.text(cx, 371, def.name, {
          fontSize: '10px', fontFamily: 'Arial Black', color: '#aaffaa',
        }).setOrigin(0.5);
        bg2.setInteractive({ useHandCursor: true });
        bg2.on('pointerdown', () => {
          this.selectedChar = def.key;
          localStorage.setItem('crossyChar', def.key);
          this.scene.restart();
        });
      } else {
        this.add.image(cx, 332, `char_${def.key}`).setScale(0.9).setTint(0x333333);
        this.add.text(cx, 371, `${def.unlock}+`, {
          fontSize: '11px', fontFamily: 'Arial Black', color: '#aa4444',
        }).setOrigin(0.5);
      }
    });

    // Best score
    if (best > 0) {
      const sBg = this.add.rectangle(W/2, 430, 220, 38, 0x000000, 0.65);
      sBg.setStrokeStyle(1, 0xffd700, 0.8);
      this.add.text(W/2, 430, `🏆  EN İYİ: ${best} ATLIŞ`, {
        fontSize: '17px', fontFamily: 'Arial Black', color: '#FFD700',
      }).setOrigin(0.5);
    }

    // How to play
    const tips = ['👆 Yukarı = İleri', '⬅ ➡ Yana  ⬇ Geri'];
    tips.forEach((t, i) => this.add.text(W/2, 490+i*28, t, {
      fontSize: '14px', fontFamily: 'Arial', color: '#ccffcc', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5));

    // Play button
    const btn = this.add.rectangle(W/2, 600, 240, 68, 0x226622).setInteractive({ useHandCursor: true });
    btn.setStrokeStyle(3, 0x44ff44, 0.9);
    const bTxt = this.add.text(W/2, 600, 'OYNA', {
      fontSize: '34px', fontFamily: 'Arial Black', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.tweens.add({ targets: [btn, bTxt], scaleX: 1.04, scaleY: 1.04, duration: 650, yoyo: true, repeat: -1 });
    btn.on('pointerover', () => btn.setFillColor(0x338833));
    btn.on('pointerout',  () => btn.setFillColor(0x226622));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('Game', { charKey: this.selectedChar }));
    });
    this.cameras.main.fadeIn(400);
  }
}

// =============================================================================
// GAME SCENE
// =============================================================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init(d) { this.charKey = d.charKey || 'chicken'; }

  create() {
    // State
    this.score       = 0;
    this.maxRow      = 0;
    this.isOver      = false;
    this.coinCount   = 0;

    // Player
    this.player = {
      col: 0, row: 0,
      worldX: MID_X, worldY: 0,
      isHopping: false, isAlive: true,
      onLog: null,
    };

    // World data
    this.lanes        = new Map();  // row -> lane object
    this.minGenRow    = -3;
    this.maxGenRow    = 0;

    // Depth layers
    this.groundLayer  = this.add.layer().setDepth(0);
    this.decoLayer    = this.add.layer().setDepth(2);
    this.logLayer     = this.add.layer().setDepth(3);
    this.coinLayer    = this.add.layer().setDepth(4);
    this.playerLayer  = this.add.layer().setDepth(6);
    this.carLayer     = this.add.layer().setDepth(8);
    this.uiLayer      = this.add.layer().setDepth(20);

    // Camera setup
    this.cameras.main.setBackgroundColor('#87ceeb');

    // Build world
    for (let r = -3; r <= 14; r++) this.generateLane(r);

    // Build player
    this.buildPlayer();

    // Build HUD
    this.buildHUD();

    // D-pad controls
    this.buildDpad();

    // Keyboard
    this.keys = this.input.keyboard.addKeys({
      w:'W', s:'S', a:'A', d:'D',
      up:'UP', down:'DOWN', left:'LEFT', right:'RIGHT',
    });

    // Touch swipe
    this.buildSwipe();

    // Water wave animation timer
    this.waveTimer = 0;

    this.cameras.main.fadeIn(250);
  }

  // ── Lane Generation ────────────────────────────────────────────────────────
  generateLane(row) {
    if (this.lanes.has(row)) return;
    const worldY = this.rowToWorldY(row);

    let type = 'grass';
    if (row < 0) type = 'safe';
    else if (row === 0) type = 'safe';
    else if (row <= 2) type = 'grass';
    else {
      // Weighted random, no 3 water in a row
      const prevType  = this.lanes.has(row-1) ? this.lanes.get(row-1).type : 'grass';
      const prev2Type = this.lanes.has(row-2) ? this.lanes.get(row-2).type : 'grass';
      let weights = [...LANE_WEIGHTS];
      if (prevType === 'water') weights = weights.map(w => w.type==='water' ? {...w, weight: 5} : w);
      if (prevType === 'water' && prev2Type === 'water') weights = weights.map(w => w.type==='water' ? {...w, weight: 0} : w);
      if (prevType === 'road'  && prev2Type === 'road')  weights = weights.map(w => w.type==='road'  ? {...w, weight: 8} : w);
      const total = weights.reduce((s,w)=>s+w.weight,0);
      let r = Math.random() * total;
      for (const w of weights) { r -= w.weight; if (r <= 0) { type = w.type; break; } }
    }

    const lane = { row, type, worldY, tiles: [], decos: [], vehicles: [], coins: [], logSpots: [] };
    const tileKey = type === 'road' ? 'tile_road' : type === 'water' ? 'tile_water' : type === 'safe' ? 'tile_safe' : 'tile_grass';

    // Draw tiles
    for (let col = -HALF; col <= HALF; col++) {
      const tx = this.colToWorldX(col);
      const t  = this.add.image(tx, worldY, tileKey).setOrigin(0.5);
      this.groundLayer.add(t);
      lane.tiles.push(t);
    }

    // Road center dashes
    if (type === 'road') {
      for (let col = -HALF; col <= HALF; col++) {
        const dash = this.add.rectangle(this.colToWorldX(col), worldY, 24, 6, 0xffd700, 0.6);
        this.groundLayer.add(dash);
        lane.tiles.push(dash);
      }
      // Sidewalk edges
      const topEdge = this.add.rectangle(MID_X, worldY - CELL/2 + 2, W, 6, 0x888899, 0.7);
      const botEdge = this.add.rectangle(MID_X, worldY + CELL/2 - 2, W, 6, 0x888899, 0.7);
      this.groundLayer.add(topEdge); this.groundLayer.add(botEdge);
      lane.tiles.push(topEdge, botEdge);
    }

    // Grass decorations
    if (type === 'grass' || type === 'safe') {
      const occupiedCols = new Set();
      const numDecos = Math.floor(Math.random() * 3) + (type === 'safe' ? 0 : 0);
      for (let i = 0; i < numDecos; i++) {
        let col;
        do { col = Math.floor(Math.random() * COLS) - HALF; } while (occupiedCols.has(col));
        occupiedCols.add(col);
        const dx   = this.colToWorldX(col) + (Math.random()-0.5)*24;
        const decoR = Math.random();
        let deco;
        if (decoR < 0.45)       deco = this.add.image(dx, worldY, 'tree').setScale(0.85 + Math.random()*0.3);
        else if (decoR < 0.75)  deco = this.add.image(dx, worldY, 'bush').setScale(0.8 + Math.random()*0.3);
        else                    deco = this.add.image(dx, worldY, 'rock').setScale(0.8 + Math.random()*0.2);
        this.decoLayer.add(deco);
        lane.decos.push({ sprite: deco, col, isObstacle: deco.texture.key === 'tree' || deco.texture.key === 'rock' });
      }

      // Coins on grass
      if (type === 'grass' && Math.random() < 0.35) {
        let coinCol;
        do { coinCol = Math.floor(Math.random() * COLS) - HALF; } while (occupiedCols.has(coinCol));
        const coin = this.add.image(this.colToWorldX(coinCol), worldY, 'coin').setScale(0.88);
        this.coinLayer.add(coin);
        lane.coins.push({ sprite: coin, col: coinCol, collected: false });
      }
    }

    // Road vehicles
    if (type === 'road') {
      const dir      = Math.random() < 0.5 ? 1 : -1;
      const diffMod  = Math.min(1 + this.maxRow * 0.012, 3.5);
      const speed    = (1.8 + Math.random() * 2.2) * diffMod * dir;
      const carKeys  = ['car_red','car_blue','car_yellow','car_green','truck','bus'];
      const carKey   = carKeys[Math.floor(Math.random() * carKeys.length)];
      const spacing  = 200 + Math.random() * 220;
      const count    = Math.floor(W * 1.5 / spacing) + 2;
      for (let i = 0; i < count; i++) {
        const startX = dir > 0 ? -W * 0.6 + i * spacing : W * 1.6 - i * spacing;
        const car = this.add.image(startX, worldY, carKey).setFlipX(dir < 0);
        this.carLayer.add(car);
        lane.vehicles.push({ sprite: car, speed, width: car.width });
      }
      lane.dir = dir;
    }

    // Water logs
    if (type === 'water') {
      const dir    = Math.random() < 0.5 ? 1 : -1;
      const diffMod= Math.min(1 + this.maxRow * 0.010, 2.5);
      const speed  = (0.9 + Math.random() * 1.0) * diffMod * dir;
      const logSizes  = ['log_sm','log_md','log_lg'];
      const logKey    = logSizes[Math.floor(Math.random() * logSizes.length)];
      const spacing   = 180 + Math.random() * 140;
      const count     = Math.floor(W * 2 / spacing) + 2;
      for (let i = 0; i < count; i++) {
        const startX = dir > 0 ? -W * 0.8 + i * spacing : W * 1.8 - i * spacing;
        const log = this.add.image(startX, worldY, logKey);
        this.logLayer.add(log);
        lane.vehicles.push({ sprite: log, speed, width: log.width, isLog: true });
      }
      lane.dir = dir;
    }

    this.lanes.set(row, lane);
    if (row > this.maxGenRow) this.maxGenRow = row;
  }

  removeLane(row) {
    const lane = this.lanes.get(row);
    if (!lane) return;
    lane.tiles.forEach(t => t.destroy());
    lane.decos.forEach(d => d.sprite.destroy());
    lane.vehicles.forEach(v => v.sprite.destroy());
    lane.coins.forEach(c => c.sprite.destroy());
    this.lanes.delete(row);
  }

  // ── Player ─────────────────────────────────────────────────────────────────
  buildPlayer() {
    this.shadow = this.add.ellipse(
      this.player.worldX, this.player.worldY + 14, 44, 16, 0x000000, 0.28
    );
    this.playerLayer.add(this.shadow);
    this.pSprite = this.add.image(this.player.worldX, this.player.worldY, `char_${this.charKey}`);
    this.playerLayer.add(this.pSprite);
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  buildHUD() {
    // Fixed HUD (not scrolling with camera)
    this.hudBg = this.add.rectangle(W/2, 34, W, 68, 0x000000, 0.55).setScrollFactor(0);
    this.uiLayer.add(this.hudBg);

    this.scoreTxt = this.add.text(W/2, 24, '0', {
      fontSize: '38px', fontFamily: 'Arial Black', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0);
    this.uiLayer.add(this.scoreTxt);

    this.coinTxt = this.add.text(W-12, 24, '🪙 0', {
      fontSize: '20px', fontFamily: 'Arial Black', color: '#FFD700',
      stroke: '#664400', strokeThickness: 3,
    }).setOrigin(1, 0.5).setScrollFactor(0);
    this.uiLayer.add(this.coinTxt);

    const best = localStorage.getItem('crossyBest') || 0;
    this.bestLine = this.add.text(14, 52, `REKOR: ${best}`, {
      fontSize: '13px', fontFamily: 'Arial', color: '#aaffaa',
    }).setScrollFactor(0);
    this.uiLayer.add(this.bestLine);

    // Distance bar (thin green line showing progress)
    this.distBar = this.add.rectangle(0, 66, 0, 4, 0x44ff44, 0.7).setOrigin(0, 0).setScrollFactor(0);
    this.uiLayer.add(this.distBar);
  }

  // ── D-Pad ──────────────────────────────────────────────────────────────────
  buildDpad() {
    const bx = W - 86, by = H - 110;
    const pads = [
      { key:'dpad_up',    dx:0,  dy:-1, x:bx,    y:by-56 },
      { key:'dpad_down',  dx:0,  dy:1,  x:bx,    y:by+56 },
      { key:'dpad_left',  dx:-1, dy:0,  x:bx-56, y:by    },
      { key:'dpad_right', dx:1,  dy:0,  x:bx+56, y:by    },
    ];
    pads.forEach(p => {
      const btn = this.add.image(p.x, p.y, p.key).setScrollFactor(0).setAlpha(0.72).setInteractive();
      this.uiLayer.add(btn);
      btn.on('pointerdown', () => { this.tryHop(p.dx, p.dy); btn.setAlpha(1); });
      btn.on('pointerup',   () => btn.setAlpha(0.72));
      btn.on('pointerout',  () => btn.setAlpha(0.72));
    });
  }

  // ── Swipe Input ────────────────────────────────────────────────────────────
  buildSwipe() {
    this.swipeStart = null;
    this.input.on('pointerdown', ptr => {
      if (ptr.x > W - 172 && ptr.y > H - 220) return; // skip d-pad area
      this.swipeStart = { x: ptr.x, y: ptr.y, t: this.time.now };
    });
    this.input.on('pointerup', ptr => {
      if (!this.swipeStart) return;
      const dx = ptr.x - this.swipeStart.x;
      const dy = ptr.y - this.swipeStart.y;
      const dist = Math.hypot(dx, dy);
      const dt   = this.time.now - this.swipeStart.t;
      this.swipeStart = null;
      if (dist < 18 && dt < 220) { this.tryHop(0, -1); return; }
      if (dist < 18) return;
      const angle = Math.atan2(dy, dx);
      const deg   = angle * 180 / Math.PI;
      if      (deg > -135 && deg < -45)  this.tryHop(0, -1);
      else if (deg >= -45 && deg < 45)   this.tryHop(1,  0);
      else if (deg >= 45  && deg < 135)  this.tryHop(0,  1);
      else                               this.tryHop(-1, 0);
    });
  }

  // ── Hop Logic ──────────────────────────────────────────────────────────────
  tryHop(dcol, drow) {
    if (this.isOver || this.player.isHopping) return;
    const newCol = this.player.col + dcol;
    const newRow = this.player.row - drow; // drow -1 = forward = row+1

    // Boundary check
    if (newCol < -HALF || newCol > HALF) return;

    const targetLane = this.lanes.get(newRow);

    // Check obstacle (tree/rock on grass)
    if (targetLane) {
      for (const d of targetLane.decos) {
        if (d.isObstacle && d.col === newCol) return; // blocked
      }
    }

    // Can't hop backwards too far
    if (newRow < this.player.row - 2) return;

    SFX.hop();
    this.player.isHopping = true;
    this.player.onLog = null;
    const targetX = this.colToWorldX(newCol);
    const targetY = this.rowToWorldY(newRow);
    const arcH    = -34;

    // Arc tween
    this.tweens.add({
      targets: { t: 0 }, t: 1, duration: 120, ease: 'Quad.easeInOut',
      onUpdate: (tween) => {
        const t  = tween.getValue();
        const cx = Phaser.Math.Linear(this.player.worldX, targetX, t);
        const cy = Phaser.Math.Linear(this.player.worldY, targetY, t) + arcH * Math.sin(t * Math.PI);
        this.pSprite.setPosition(cx, cy);
        this.pSprite.setScale(1 + 0.12 * Math.sin(t * Math.PI), 1 - 0.1 * Math.sin(t * Math.PI));
        this.shadow.setPosition(cx, this.rowToWorldY(newRow < this.player.row ? this.player.row : newRow) + 14);
      },
      onComplete: () => {
        this.player.col   = newCol;
        this.player.row   = newRow;
        this.player.worldX = targetX;
        this.player.worldY = targetY;
        this.pSprite.setPosition(targetX, targetY).setScale(1);
        // Landing squash
        this.tweens.add({ targets: this.pSprite, scaleX: 1.25, scaleY: 0.78, duration: 55, yoyo: true });
        this.player.isHopping = false;

        // Score update
        if (newRow > this.maxRow) {
          this.maxRow = newRow;
          this.score  = this.maxRow;
          this.scoreTxt.setText(this.score.toString());
          this.tweens.add({ targets: this.scoreTxt, scale: 1.35, duration: 80, yoyo: true });
          SFX.score();
          // Progress bar
          this.distBar.setSize(Math.min(this.score * 3, W), 4);
          // Generate more lanes ahead
          for (let r = this.maxGenRow+1; r <= this.maxRow + 16; r++) this.generateLane(r);
          // Remove far-behind lanes
          for (let r = this.maxRow - 10; r >= this.maxRow - 18; r--) this.removeLane(r);
        }

        // Check water
        this.checkWaterLanding();

        // Collect coin
        this.collectCoin();
      },
    });

    // Hop dust particle
    this.spawnDust(this.player.worldX, this.player.worldY);
  }

  spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(x + (Math.random()-0.5)*20, y + (Math.random()-0.5)*12, 3+Math.random()*4, 0xaaaaaa, 0.6);
      this.decoLayer.add(p);
      this.tweens.add({
        targets: p, x: p.x+(Math.random()-0.5)*30, y: p.y-20, alpha: 0, scale: 0, duration: 350,
        onComplete: () => p.destroy(),
      });
    }
  }

  checkWaterLanding() {
    const lane = this.lanes.get(this.player.row);
    if (!lane || lane.type !== 'water') return;
    // Check if any log covers player X
    const found = lane.vehicles.find(v => {
      if (!v.isLog) return false;
      const lx = v.sprite.x;
      const hw = v.width / 2;
      return Math.abs(this.player.worldX - lx) < hw - 4;
    });
    if (found) {
      this.player.onLog = found;
    } else {
      this.time.delayedCall(40, () => {
        const lane2 = this.lanes.get(this.player.row);
        if (!lane2 || lane2.type !== 'water' || this.player.onLog || this.isOver) return;
        this.die('splash');
      });
    }
  }

  collectCoin() {
    const lane = this.lanes.get(this.player.row);
    if (!lane) return;
    for (const c of lane.coins) {
      if (c.collected || c.col !== this.player.col) continue;
      c.collected = true;
      SFX.coin();
      this.coinCount++;
      this.coinTxt.setText(`🪙 ${this.coinCount}`);
      // Float up animation
      this.tweens.add({ targets: c.sprite, y: c.sprite.y - 50, alpha: 0, scale: 1.4, duration: 600, onComplete: () => c.sprite.destroy() });
      // Score bonus
      const popup = this.add.text(this.player.worldX, this.player.worldY - 30, '+5', {
        fontSize: '22px', fontFamily: 'Arial Black', color: '#FFD700', stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5).setScrollFactor(1);
      this.tweens.add({ targets: popup, y: popup.y - 50, alpha: 0, duration: 700, onComplete: () => popup.destroy() });
      this.score += 5;
      this.scoreTxt.setText(this.score.toString());
    }
  }

  // ── Death ──────────────────────────────────────────────────────────────────
  die(reason) {
    if (this.isOver) return;
    this.isOver = true;
    this.player.isAlive = false;

    if (reason === 'splash') { SFX.splash(); }
    else { SFX.car(); }

    this.cameras.main.shake(300, reason === 'car' ? 0.025 : 0.015);

    // Death animation
    this.tweens.add({
      targets: this.pSprite,
      angle: reason === 'car' ? 720 : 0,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 500, ease: 'Cubic.easeIn',
    });

    // Particles burst
    for (let i = 0; i < 12; i++) {
      const ang = (i/12) * Math.PI * 2;
      const p   = this.add.circle(this.player.worldX, this.player.worldY, 5+Math.random()*6,
        reason === 'splash' ? 0x44aaff : [0xffdd44, 0xff4422, 0xff8800][i%3], 0.9);
      this.tweens.add({ targets: p, x: p.x+Math.cos(ang)*60, y: p.y+Math.sin(ang)*60, alpha: 0, scale: 0, duration: 600, onComplete: () => p.destroy() });
    }

    const best = parseInt(localStorage.getItem('crossyBest') || 0);
    if (this.score > best) localStorage.setItem('crossyBest', this.score);

    this.time.delayedCall(900, () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () => this.scene.start('GameOver', { score: this.score, coins: this.coinCount, reason }));
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  update(_, delta) {
    if (this.isOver) return;
    const dt = delta / 16.67;

    // Keyboard
    if (!this.player.isHopping) {
      if (Phaser.Input.Keyboard.JustDown(this.keys.w) || Phaser.Input.Keyboard.JustDown(this.keys.up))    this.tryHop(0, -1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.s) || Phaser.Input.Keyboard.JustDown(this.keys.down))  this.tryHop(0,  1);
      if (Phaser.Input.Keyboard.JustDown(this.keys.a) || Phaser.Input.Keyboard.JustDown(this.keys.left))  this.tryHop(-1, 0);
      if (Phaser.Input.Keyboard.JustDown(this.keys.d) || Phaser.Input.Keyboard.JustDown(this.keys.right)) this.tryHop(1,  0);
    }

    // Move vehicles
    this.lanes.forEach(lane => {
      if (lane.type !== 'road' && lane.type !== 'water') return;
      lane.vehicles.forEach(v => {
        v.sprite.x += v.speed * dt;
        // Wrap around
        if (v.speed > 0 && v.sprite.x > W + v.width)  v.sprite.x = -v.width - 20;
        if (v.speed < 0 && v.sprite.x < -v.width - 20) v.sprite.x = W + v.width;
      });
    });

    // Player rides log
    if (this.player.onLog && !this.player.isHopping) {
      const log = this.player.onLog;
      if (log.sprite.active) {
        const dx = log.speed * dt;
        this.player.worldX += dx;
        this.pSprite.x = this.player.worldX;
        this.shadow.x  = this.player.worldX;

        // Check if log rides player off screen
        if (this.player.worldX < -30 || this.player.worldX > W + 30) {
          this.die('splash');
        }

        // Verify still on log
        const lx = log.sprite.x, hw = log.width / 2;
        if (Math.abs(this.player.worldX - lx) > hw) {
          this.die('splash');
        }
      }
    }

    // Car collision
    const playerLane = this.lanes.get(this.player.row);
    if (playerLane && playerLane.type === 'road' && !this.player.isHopping) {
      for (const v of playerLane.vehicles) {
        const dist = Math.abs(v.sprite.x - this.player.worldX);
        if (dist < (v.width/2 + 14)) {
          this.die('car'); break;
        }
      }
    }

    // Camera follow (smooth lerp)
    const targetScrollY = this.player.worldY - PLAYER_SCREEN_Y;
    this.cameras.main.scrollY = Phaser.Math.Linear(this.cameras.main.scrollY, targetScrollY, 0.12);

    // Camera scrollX stays centered
    this.cameras.main.scrollX = Phaser.Math.Linear(this.cameras.main.scrollX, -(MID_X - this.player.worldX) * 0.1, 0.08);
    if (Math.abs(this.cameras.main.scrollX) < 1) this.cameras.main.scrollX = 0;

    // Fallen too far behind
    const screenY = this.player.worldY - this.cameras.main.scrollY;
    if (screenY > H + 60) this.die('fall');

    // Water wave animation (tint cycle)
    this.waveTimer += delta;
    if (this.waveTimer > 60) {
      this.waveTimer = 0;
      const t = Date.now() * 0.001;
      this.lanes.forEach(lane => {
        if (lane.type !== 'water') return;
        const wave = Math.sin(t + lane.row * 0.4) * 0.08;
        lane.tiles.forEach((tile, i) => {
          if (tile.setTint) {
            const v = Math.floor(230 + Math.sin(t*1.5 + i*0.6) * 18);
            tile.setTint(Phaser.Display.Color.GetColor(30, Math.floor(v*0.5), v));
          }
        });
      });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  rowToWorldY(row) { return -row * CELL; }
  colToWorldX(col) { return MID_X + col * CELL; }
}

// =============================================================================
// GAME OVER SCENE
// =============================================================================
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }
  init(d) { this.finalScore = d.score||0; this.coins = d.coins||0; this.reason = d.reason||'car'; }

  create() {
    // Sky bg
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x112211, 0x112211, 0x0a1a0a, 0x0a1a0a, 1);
    bg.fillRect(0, 0, W, H);

    // Scanlines
    const sl = this.add.graphics().setAlpha(0.08);
    sl.lineStyle(1, 0x00ff00);
    for (let y = 0; y < H; y += 3) { sl.moveTo(0,y); sl.lineTo(W,y); }
    sl.strokePath();

    // Death message
    const msg = this.reason === 'splash' ? '💦 SUYA DÜŞTÜN!' : '🚗 EZILDIN!';
    const card = this.add.rectangle(W/2, 250, 330, 170, 0x0a1a0a, 0.95);
    card.setStrokeStyle(2, 0xee2222, 0.9).setScale(0);
    this.tweens.add({ targets: card, scale: 1, duration: 380, ease: 'Back.easeOut' });

    const dTxt = this.add.text(W/2, 210, msg, {
      fontSize: '32px', fontFamily: 'Arial Black', color: '#ff4444',
      stroke: '#440000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: dTxt, alpha: 1, delay: 150, duration: 280 });

    // Score
    const sBg = this.add.rectangle(W/2, 390, 280, 130, 0x0a1a0a, 0.92);
    sBg.setStrokeStyle(2, 0x226622).setAlpha(0);
    this.tweens.add({ targets: sBg, alpha: 1, delay: 250, duration: 280 });

    this.add.text(W/2, 350, 'SKOR', {
      fontSize: '16px', fontFamily: 'Arial Black', color: '#88cc88',
    }).setOrigin(0.5).setAlpha(0);
    const sTxt = this.add.text(W/2, 400, this.finalScore.toString(), {
      fontSize: '62px', fontFamily: 'Arial Black', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.add.text(W/2, 448, `🪙 ${this.coins} ALTIN`, {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#FFD700',
    }).setOrigin(0.5).setAlpha(0);
    [this.children.getChildren().slice(-3)].flat().forEach(t =>
      this.tweens.add({ targets: t, alpha: 1, delay: 300, duration: 280 }));

    // Best score
    const best = parseInt(localStorage.getItem('crossyBest') || 0);
    if (this.finalScore >= best && this.finalScore > 0) {
      const rec = this.add.text(W/2, 510, '🏆  YENİ REKOR!', {
        fontSize: '26px', fontFamily: 'Arial Black', color: '#ffd700', stroke: '#664400', strokeThickness: 3,
      }).setOrigin(0.5).setAlpha(0);
      this.tweens.add({ targets: rec, alpha: 1, delay: 500, duration: 300 });
      this.tweens.add({ targets: rec, y: rec.y - 6, duration: 800, yoyo: true, repeat: -1, delay: 1000 });
    } else {
      this.add.text(W/2, 510, `EN İYİ: ${best}`, {
        fontSize: '20px', fontFamily: 'Arial', color: '#446644',
      }).setOrigin(0.5).setAlpha(0);
    }

    // Buttons
    const playBtn = this.add.rectangle(W/2, 618, 240, 62, 0x226622).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x44ff44).setAlpha(0);
    const playTxt = this.add.text(W/2, 618, 'YENİDEN', {
      fontSize: '28px', fontFamily: 'Arial Black', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [playBtn, playTxt], alpha: 1, delay: 400, duration: 280 });
    playBtn.on('pointerover', () => playBtn.setFillColor(0x338833));
    playBtn.on('pointerout',  () => playBtn.setFillColor(0x226622));
    playBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('Game', { charKey: localStorage.getItem('crossyChar')||'chicken' }));
    });

    const menuBtn = this.add.rectangle(W/2, 714, 180, 48, 0x0a1a0a).setInteractive({ useHandCursor: true }).setAlpha(0);
    const menuTxt = this.add.text(W/2, 714, 'ANA MENÜ', {
      fontSize: '18px', fontFamily: 'Arial Black', color: '#44ff44',
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: [menuBtn, menuTxt], alpha: 1, delay: 450, duration: 280 });
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200);
      this.time.delayedCall(200, () => this.scene.start('Menu'));
    });

    this.cameras.main.fadeIn(300);
  }
}

// =============================================================================
// PHASER CONFIG
// =============================================================================
new Phaser.Game({
  type: Phaser.WEBGL,
  width: W, height: H,
  backgroundColor: '#87ceeb',
  antialias: true,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  parent: 'game-container',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
});
