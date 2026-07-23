class Enemy {
    constructor(x, y, tier) {
        this.x = x;
        this.y = y;
        this.tier = tier || 0;
        this.radius = CONFIG.ENEMY.radius;
        this.speed = rand(CONFIG.ENEMY.speed.min, CONFIG.ENEMY.speed.max) * (1 + tier * 0.1);
        this.maxHp = CONFIG.ENEMY.baseHp * (1 + tier * 0.5) * G.difficulty.enemyHpMult;
        this.hp = this.maxHp;
        this.damage = CONFIG.ENEMY.damage;
        this.xpValue = CONFIG.ENEMY.xpBase + tier * 2;
        this.invuln = false;
        this.hitFlash = 0;
        this.wobble = rand(0, Math.PI * 2);
        this.wobbleSpeed = rand(1, 3);
        this.color = this._getColor();
        this.dead = false;
        this.deathTimer = 0;
    }

    _getColor() {
        if (this.tier >= 4) return '#ff4444';
        if (this.tier >= 2) return '#ff8844';
        if (this.tier >= 1) return '#ffaa66';
        return '#ff7744';
    }

    takeDamage(dmg) {
        if (this.hp <= 0 || this.invuln) return 0;
        const actual = Math.min(dmg, this.hp);
        this.hp -= actual;
        this.hitFlash = 0.08;
        return actual;
    }

    update(dt) {
        if (this.hp <= 0) {
            this.deathTimer += dt;
            if (this.deathTimer > 0.3) this.dead = true;
            return;
        }
        this.hitFlash = Math.max(0, this.hitFlash - dt);
        this.wobble += this.wobbleSpeed * dt;

        const p = G.player;
        const dx = p.x - this.x, dy = p.y - this.y;
        const d = Math.hypot(dx, dy);
        if (d > 0) {
            this.x += dx / d * this.speed * dt;
            this.y += dy / d * this.speed * dt;
        }
    }

    render(ctx) {
        if (this.hp <= 0) {
            // Death animation
            const t = this.deathTimer / 0.3;
            ctx.globalAlpha = 1 - t;
            const s = 1 - t * 0.5;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(s, s);
            this._drawBody(ctx);
            ctx.restore();
            ctx.globalAlpha = 1;
            return;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.hitFlash > 0) ctx.fillStyle = '#ffffff';
        this._drawBody(ctx);
        ctx.restore();

        // HP bar
        if (G.settings.showEnemyHp && this.hp < this.maxHp) {
            const bw = this.radius * 2.5, bh = 4;
            ctx.fillStyle = '#440000';
            ctx.fillRect(this.x - bw/2, this.y - this.radius - 12, bw, bh);
            const hpPct = this.hp / this.maxHp;
            const hpColor = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
            ctx.fillStyle = hpColor;
            ctx.fillRect(this.x - bw/2, this.y - this.radius - 12, bw * hpPct, bh);
        }
    }

    _drawBody(ctx) {
        // Body
        const c = this.color;
        ctx.fillStyle = c;
        ctx.beginPath();
        const r = this.radius;
        // Oval/capsule shape
        ctx.ellipse(0, 0, r * 1.3, r * 0.7, this.wobble * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Darker shell
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.8, r * 0.4, this.wobble * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(-r * 0.4, -r * 0.2, r * 0.2, 0, Math.PI * 2);
        ctx.arc(r * 0.4, -r * 0.2, r * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Legs
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const la = (i / 4) * Math.PI * 2 + Math.sin(G.time * 5 + i) * 0.3;
            const sx = Math.cos(la) * r * 0.8;
            const sy = Math.sin(la) * r * 0.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(la) * r * 0.6, sy + Math.sin(la) * r * 0.6 + r * 0.3);
            ctx.stroke();
        }
    }
}

const EnemySystem = {
    spawnTimer: 0,
    spawnInterval: CONFIG.ENEMY.spawnInterval,

    reset() {
        this.spawnTimer = 0;
        this.spawnInterval = CONFIG.ENEMY.spawnInterval;
    },

    update(dt) {
        this.spawnTimer += dt;
        // Increase spawn rate over time
        const elapsed = G.time;
        this.spawnInterval = Math.max(0.3, CONFIG.ENEMY.spawnInterval - elapsed / 60 * 0.1);

        if (this.spawnTimer >= this.spawnInterval && G.enemies.length < CONFIG.ENEMY.maxOnScreen) {
            this.spawnTimer -= this.spawnInterval;
            this._spawnEnemy();
        }
    },

    _spawnEnemy() {
        const W = G.canvas.width, H = G.canvas.height;
        const p = G.player;
        // Spawn from edges, away from player
        let x, y;
        const side = randInt(0, 3);
        const margin = 40;
        switch (side) {
            case 0: x = rand(-margin, W + margin); y = -margin; break; // top
            case 1: x = rand(-margin, W + margin); y = H + margin; break; // bottom
            case 2: x = -margin; y = rand(-margin, H + margin); break; // left
            case 3: x = W + margin; y = rand(-margin, H + margin); break; // right
        }
        // Ensure not too close to player
        if (Math.hypot(x - p.x, y - p.y) < 200) {
            x = x > W/2 ? x + 200 : x - 200;
            y = y > H/2 ? y + 200 : y - 200;
        }

        // Tier increases with time
        const gameMinutes = G.time / 60;
        const tier = Math.floor(gameMinutes * 0.5); // +1 tier every 2 minutes
        G.enemies.push(new Enemy(x, y, tier));
    },

    spawnAt(x, y, count, hpScale) {
        for (let i = 0; i < count; i++) {
            const ex = x + rand(-50, 50);
            const ey = y + rand(-50, 50);
            const e = new Enemy(ex, ey, 0);
            if (hpScale) {
                e.maxHp *= hpScale;
                e.hp = e.maxHp;
            }
            G.enemies.push(e);
        }
    }
};
