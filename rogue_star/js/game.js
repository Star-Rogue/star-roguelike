const G = {
    canvas: null,
    ctx: null,
    time: 0,
    deltaTime: 0,
    paused: false,
    running: false,
    player: null,
    enemies: [],
    boss: null,
    bossSpawned: false,
    kills: 0,
    difficulty: CONFIG.DIFFICULTY.normal,
    settings: { showDamageNumbers: true, showEnemyHp: true },
    fx: Particles,
    ui: UI,
    weaponSystem: WeaponSystem,
    affixLookup: {},

    // Starfield
    stars: [],
    nebulae: [],

    // Music placeholders
    audio: null,

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', () => this._resize());
        
        // Build affix lookup for easy value retrieval
        for (const [poolKey, pool] of Object.entries(CONFIG.AFFIX_POOLS)) {
            for (const [affixId, def] of Object.entries(pool)) {
                this.affixLookup[affixId] = def;
            }
        }

        Input.init();
        this._initStars();
        this.player = new Player();
        this.fx = Particles;
        this.ui = UI;
        this.weaponSystem = WeaponSystem;

        // Audio placeholder
        this._initAudio();

        // Start game loop
        this.running = true;
        this.lastTime = performance.now();
        this.ui.showWeaponSelect = true;
        this.ui.showStartScreen = true;
        this.paused = true;
        requestAnimationFrame(t => this._loop(t));
    },

    _initAudio() {
        // Audio system placeholder - files to be added by user
        this.audio = {
            bgm: null,
            boss: null,
            bgmPlaying: false,
            bossMusicPlaying: false,
            
            tryLoadBGM() {
                // Try to load bgm files
                const bgmFiles = ['bgm1.mp3', 'bgm2.mp3', 'bgm1.ogg'];
                for (const f of bgmFiles) {
                    const a = new Audio('music/bgm/' + f);
                    a.loop = true;
                    a.volume = 0.4;
                    a.oncanplaythrough = () => { this.bgm = a; };
                    a.load();
                }
            },

            tryLoadBoss() {
                const bossFiles = ['boss1.mp3', 'boss2.mp3', 'boss1.ogg'];
                for (const f of bossFiles) {
                    const a = new Audio('music/boss/' + f);
                    a.loop = true;
                    a.volume = 0.5;
                    a.oncanplaythrough = () => { this.boss = a; };
                    a.load();
                }
            },

            playBGM() {
                if (!this.bgmPlaying && this.bgm) {
                    this.bgm.play().catch(() => {});
                    this.bgmPlaying = true;
                }
                if (this.bossMusicPlaying && this.boss) {
                    this.boss.pause();
                    this.bossMusicPlaying = false;
                }
            },

            playBoss() {
                if (!this.bossMusicPlaying && this.boss) {
                    if (this.bgmPlaying && this.bgm) this.bgm.pause();
                    this.boss.play().catch(() => {});
                    this.bossMusicPlaying = true;
                    this.bgmPlaying = false;
                }
            },

            stopAll() {
                if (this.bgm) { this.bgm.pause(); this.bgmPlaying = false; }
                if (this.boss) { this.boss.pause(); this.bossMusicPlaying = false; }
            }
        };
        this.audio.tryLoadBGM();
        this.audio.tryLoadBoss();
    },

    _resize() {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const scale = Math.min(W / 1024, H / 720);
        this.canvas.width = 1024;
        this.canvas.height = 720;
        this.canvas.style.width = (1024 * scale) + 'px';
        this.canvas.style.height = (720 * scale) + 'px';
        this.canvas.style.left = ((W - 1024 * scale) / 2) + 'px';
        this.canvas.style.top = ((H - 720 * scale) / 2) + 'px';
    },

    _initStars() {
        this.stars = [];
        for (let i = 0; i < 200; i++) {
            this.stars.push({
                x: rand(0, 1024), y: rand(0, 720),
                size: rand(0.5, 2.5),
                speed: rand(0.3, 2.0),
                twinkle: rand(0, Math.PI * 2),
                twinkleSpeed: rand(0.5, 3),
                color: Math.random() < 0.1 ? '#ffddaa' : 
                       Math.random() < 0.2 ? '#aaddff' : 
                       Math.random() < 0.05 ? '#ffaadd' : '#ffffff'
            });
        }
        // Nebula clouds
        this.nebulae = [];
        for (let i = 0; i < 4; i++) {
            this.nebulae.push({
                x: rand(100, 924), y: rand(50, 670),
                rx: rand(100, 250), ry: rand(60, 150),
                angle: rand(0, Math.PI * 2),
                color: ['rgba(20,20,80,0.15)', 'rgba(40,10,60,0.12)', 'rgba(10,30,70,0.1)', 'rgba(30,15,50,0.12)'][i],
                driftX: rand(-5, 5), driftY: rand(-3, 3)
            });
        }
    },

    _loop(timestamp) {
        if (!this.running) return;
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05); // cap at 50ms
        this.lastTime = timestamp;

        if (!this.paused) {
            this.time += this.deltaTime;
            this._update(this.deltaTime);
        }
        
        this.ui.update(this.deltaTime);
        this._render();
        requestAnimationFrame(t => this._loop(t));
    },

    _update(dt) {
        // Audio
        if (this.boss && this.boss.hp > 0) {
            this.audio.playBoss();
        } else {
            this.audio.playBGM();
        }

        // Player
        this.player.update(dt);
        if (this.player.hp <= 0) return;

        // Weapons
        this.weaponSystem.fire(dt);
        this.weaponSystem.update(dt);

        // Enemies
        EnemySystem.update(dt);
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt);
            if (e.dead) {
                if (e.hp <= 0) this.kills++;
                this.enemies.splice(i, 1);
            }
        }

        // Boss
        this._updateBoss(dt);

        // Particles
        this.fx.update(dt);

        // Update star positions
        for (const s of this.stars) {
            s.y += s.speed * dt * 30;
            if (s.y > this.canvas.height) { s.y = 0; s.x = rand(0, this.canvas.width); }
            s.twinkle += s.twinkleSpeed * dt;
        }
        for (const n of this.nebulae) {
            n.x += n.driftX * dt;
            n.y += n.driftY * dt;
            if (n.x > this.canvas.width + n.rx) n.x = -n.rx;
            if (n.x < -n.rx) n.x = this.canvas.width + n.rx;
            if (n.y > this.canvas.height + n.ry) n.y = -n.ry;
            if (n.y < -n.ry) n.y = this.canvas.height + n.ry;
        }
    },

    _updateBoss(dt) {
        const bossInterval = CONFIG.BOSS.spawnInterval;
        const bossCycle = Math.floor(this.time / bossInterval);
        const lastCycle = this.lastBossCycle || -1;

        if (bossCycle > lastCycle && !this.boss) {
            this._spawnBoss();
            this.lastBossCycle = bossCycle;
        }

        if (this.boss && !this.boss.dead) {
            this.boss.update(dt);

            if (this.boss.hp <= 0) {
                if (this.boss.phase < 3) {
                    this.player.addXP(this.boss.xpValue * this.boss.phase);
                    this.boss.changePhase(this.boss.phase + 1);
                } else {
                    this.kills += 1;
                    this.player.addXP(this.boss.xpValue * 4);
                    this.fx.addExplosion(this.boss.x, this.boss.y, 120, '#ffcc00');
                    this.boss.hp = 0;
                }
            }

            if (this.boss.dead) {
                this.boss = null;
                this.audio.playBGM();
            }
        }
    },

    _spawnBoss() {
        this.boss = new Boss();
        this.ui.showNotification('⚠ 真蛰虫降临！', 3);
        this.audio.playBoss();
    },

    _render() {
        const ctx = this.ctx;
        const W = this.canvas.width, H = this.canvas.height;

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#05051a');
        bgGrad.addColorStop(0.5, '#0a0a2e');
        bgGrad.addColorStop(1, '#05051a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Nebulae
        for (const n of this.nebulae) {
            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.rotate(n.angle);
            ctx.fillStyle = n.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, n.rx, n.ry, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Stars
        for (const s of this.stars) {
            const brightness = 0.3 + Math.sin(s.twinkle) * 0.3 + 0.5;
            ctx.globalAlpha = brightness;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Brighter stars get glow
            if (s.size > 1.5) {
                ctx.globalAlpha = brightness * 0.3;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size * 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(30,30,80,0.15)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x < W; x += 100) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 100) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Enemies
        for (const e of this.enemies) e.render(ctx);

        // Boss
        if (this.boss) this.boss.render(ctx);

        // Boss eggs
        if (this.boss && this.boss.eggs) {
            for (const egg of this.boss.eggs) {
                if (egg.hp <= 0) continue;
                ctx.fillStyle = '#ff6622';
                ctx.beginPath();
                ctx.arc(egg.x, egg.y, egg.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(egg.x, egg.y, egg.radius, 0, Math.PI * 2);
                ctx.stroke();
                // Timer indicator
                const pct = egg.timer / CONFIG.BOSS.eggExplosionTime;
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(egg.x, egg.y, egg.radius * 0.6, 0, Math.PI * 2 * pct);
                ctx.fill();
            }
        }

        // Charge warning line
        if (this.boss && this.boss.charging && this.boss.chargeWarningTimer > 0) {
            ctx.save();
            ctx.setLineDash([8, 8]);
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.7 + Math.sin(this.time * 10) * 0.3;
            ctx.beginPath();
            ctx.moveTo(this.boss.x, this.boss.y);
            ctx.lineTo(
                this.boss.x + this.boss.chargeDir.x * 300,
                this.boss.y + this.boss.chargeDir.y * 300
            );
            ctx.stroke();
            ctx.restore();
        }

        // Fire particles (rendered underneath for layer effect but before player)
        this.weaponSystem.renderFlame(ctx);

        // Bullets
        this.weaponSystem.renderBullets(ctx);

        // Beams
        this.weaponSystem.renderBeams(ctx);

        // Explosions
        this.weaponSystem.renderExplosions(ctx);

        // Player (on top of most things)
        this.player.render(ctx);

        // Particles / effects
        this.fx.render(ctx);

        // UI
        this.ui.render(ctx);
    },

    startGame(weaponId) {
        this.player.reset(weaponId);
        this.player.weaponName = CONFIG.WEAPONS[weaponId].name;
        this.enemies = [];
        this.boss = null;
        this.bossSpawned = false;
        this.lastBossCycle = 0;
        this.kills = 0;
        this.time = 0;
        this.paused = false;
        this.fx.reset();
        this.weaponSystem.reset();
        EnemySystem.reset();
        this.ui.reset();
        this.ui.showWeaponSelect = false;
        this.ui.showStartScreen = false;
        this.paused = false;
        this.audio.playBGM();
    },

    restartGame() {
        this.ui.showWeaponSelect = true;
        this.ui.showGameOverScreen = false;
        this.enemies = [];
        this.boss = null;
        this.lastBossCycle = 0;
        this.kills = 0;
        this.time = 0;
        this.paused = false;
        this.fx.reset();
        this.weaponSystem.reset();
        EnemySystem.reset();
        this.player = new Player();
    },

    gameOver() {
        this.paused = true;
        this.ui.showGameOverScreen = true;
        this.audio.stopAll();
        this.fx.addExplosion(this.player.x, this.player.y, 80, '#ff0000');
    }
};

// Start
window.addEventListener('DOMContentLoaded', () => G.init());

// Canvas click handler for UI
document.getElementById('gameCanvas').addEventListener('click', e => {
    const r = e.target.getBoundingClientRect();
    const scaleX = r.width / e.target.width;
    const scaleY = r.height / e.target.height;
    const sx = (e.clientX - r.left) / scaleX;
    const sy = (e.clientY - r.top) / scaleY;
    G.ui.handleTap(sx, sy);
});
