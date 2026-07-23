class Player {
    constructor() {
        const PC = CONFIG.PLAYER;
        this.x = G.canvas ? G.canvas.width / 2 : 400;
        this.y = G.canvas ? G.canvas.height / 2 : 300;
        this.radius = PC.radius;
        this.maxHp = PC.hp;
        this.hp = PC.hp;
        this.speed = PC.speed;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = PC.xpBase;

        this.weaponId = null;
        this.weaponName = '';
        this.baseWeaponId = null; // original weapon type
        this.evolved = false;
        this.fireTimer = 0;
        this.invulnTimer = 0;
        this.hitFlash = 0;

        this.affixes = []; // { id, rarity, value, label }
        this.totalLifesteal = 0;
    }

    reset(weaponId) {
        const PC = CONFIG.PLAYER;
        this.x = G.canvas.width / 2;
        this.y = G.canvas.height / 2;
        this.hp = PC.hp;
        this.maxHp = PC.hp;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = PC.xpBase;
        this.weaponId = weaponId;
        this.baseWeaponId = weaponId;
        this.evolved = false;
        this.fireTimer = 0;
        this.invulnTimer = 0;
        this.hitFlash = 0;
        this.affixes = [];
        this.totalLifesteal = 0;
    }

    takeDamage(dmg) {
        if (this.invulnTimer > 0 || this.hp <= 0) return 0;
        const actual = Math.min(dmg, this.hp);
        this.hp -= actual;
        this.invulnTimer = CONFIG.PLAYER.invulnTime;
        this.hitFlash = 0.1;
        G.fx.addExplosion(this.x, this.y, 30, '#ff4444');
        return actual;
    }

    addXP(amount) {
        if (this.hp <= 0) return;
        this.xp += amount;
        this._processLevelUps();
    }

    _processLevelUps() {
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = Math.floor(CONFIG.PLAYER.xpBase * (1 + this.level * 0.25));

            if (this.level === 30 && !this.evolved) {
                G.ui.showEvolution();
                return;
            }
            G.ui.showLevelUp();
            return; // process one level at a time (UI is modal)
        }
    }

    continueAfterChoice() {
        this._processLevelUps();
    }

    evolve(evoId) {
        const evo = CONFIG.EVOLUTIONS[evoId];
        if (!evo) return;
        
        this.weaponId = evoId;
        this.evolved = true;
        this.baseWeaponId = evo.parentId;
        
        G.fx.addBigEffect(this.x, this.y, '#ffcc00', evo.name + '!');
    
        G.paused = false;
        G.ui.showLevelUp();
    }

    applyAffix(affixId, rarity) {
        const poolKey = this.weaponId;
        const pool = CONFIG.AFFIX_POOLS[poolKey];
        if (!pool || !pool[affixId]) return false;

        const rInfo = CONFIG.RARITY_COLORS[rarity];
        const def = pool[affixId];
        let value = def.base * rInfo.mult;

        // Lifesteal special handling
        if (affixId === 'lifesteal') {
            if (def.cap && this.totalLifesteal >= def.cap) return false;
            value = def.base; // white only (1%)
            if (rarity !== 'white') return false;
            this.totalLifesteal = Math.min((this.totalLifesteal || 0) + value, def.cap);
        }

        this.affixes.push({
            id: affixId,
            rarity,
            value,
            label: def.label,
            icon: def.icon || '',
            pct: def.pct || false,
            global: def.global || false
        });

        return true;
    }

    update(dt) {
        if (this.hp <= 0) return;

        this.invulnTimer = Math.max(0, this.invulnTimer - dt);
        this.hitFlash = Math.max(0, this.hitFlash - dt);

        // Movement
        const dir = Input.getMoveDir();
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;

        // Apply move speed affixes
        let moveMult = 1;
        for (const a of this.affixes) {
            if (a.id === 'moveSpeed') moveMult += a.value;
        }
        this.x += dir.x * this.speed * (moveMult - 1) * dt;
        this.y += dir.y * this.speed * (moveMult - 1) * dt;

        // Clamp
        const W = G.canvas.width, H = G.canvas.height;
        this.x = clamp(this.x, this.radius, W - this.radius);
        this.y = clamp(this.y, this.radius, H - this.radius);

        // Collision with enemies
        for (const e of G.enemies) {
            if (e.hp <= 0) continue;
            if (collides(this, e)) {
                this.takeDamage(e.damage);
            }
        }

        // Collision with boss
        if (G.boss && G.boss.hp > 0 && collides(this, G.boss)) {
            this.takeDamage(G.boss.contactDamage);
        }

        // Death
        if (this.hp <= 0) {
            G.gameOver();
        }
    }

    render(ctx) {
        if (this.hp <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Invulnerability blink
        if (this.invulnTimer > 0 && Math.floor(G.time * 15) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        // Hit flash
        if (this.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 20;
        }

        // Engine glow
        const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        glowGrad.addColorStop(0, 'rgba(0,200,255,0.3)');
        glowGrad.addColorStop(1, 'rgba(0,100,255,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Ship body
        const shipColor = '#00ccff';
        ctx.fillStyle = shipColor;
        ctx.beginPath();
        ctx.moveTo(0, -this.radius * 1.2);           // nose
        ctx.lineTo(-this.radius, this.radius * 0.8);  // left wing
        ctx.lineTo(-this.radius * 0.3, this.radius * 0.4);
        ctx.lineTo(this.radius * 0.3, this.radius * 0.4);
        ctx.lineTo(this.radius, this.radius * 0.8);   // right wing
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#88eeff';
        ctx.beginPath();
        ctx.ellipse(0, -this.radius * 0.15, this.radius * 0.35, this.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        // Engine exhaust
        const exhaustLen = 8 + Math.sin(G.time * 15) * 4;
        ctx.fillStyle = '#44aaff';
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.4, this.radius * 0.7);
        ctx.lineTo(0, this.radius * 0.7 + exhaustLen);
        ctx.lineTo(this.radius * 0.4, this.radius * 0.7);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();

        // HP bar above player
        if (this.hp < this.maxHp) {
            const bw = 36, bh = 4, bx = this.x - bw / 2, by = this.y - this.radius - 14;
            ctx.fillStyle = '#330000';
            ctx.fillRect(bx, by, bw, bh);
            const hpPct = this.hp / this.maxHp;
            ctx.fillStyle = hpPct > 0.5 ? '#44ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff3333';
            ctx.fillRect(bx, by, bw * hpPct, bh);
        }
    }
}
